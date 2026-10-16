import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadCatalog } from '../src/catalog/index.js';
import { syncCatalog } from '../src/catalog/sync.js';
import { loadConfig } from '../src/config.js';
import type { RateLimits } from '../src/context.js';
import { createPglite } from '../src/db/pglite.js';
import type { Db } from '../src/db/types.js';

const here = dirname(fileURLToPath(import.meta.url));
export const ORIGIN = 'http://jojo.test';
export const PASSWORD = 'ora-ora-ora-42';

export const GENEROUS_LIMITS: RateLimits = {
  login: { max: 1000, timeWindow: 60_000 },
  register: { max: 1000, timeWindow: 60_000 },
  sensitive: { max: 1000, timeWindow: 60_000 },
};

export interface TestEnv {
  app: FastifyInstance;
  db: Db;
  clock: { now: Date };
  close: () => Promise<void>;
}

export async function setupApp(
  options: { env?: Record<string, string>; rateLimits?: RateLimits; now?: Date } = {},
): Promise<TestEnv> {
  const pg = await createPglite();
  await pg.migrate(join(here, '../drizzle'));
  await syncCatalog(pg.db, loadCatalog());
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://test/test',
    APP_ORIGIN: ORIGIN,
    COOKIE_SECURE: 'false',
    LOG_LEVEL: 'silent',
    ...options.env,
  });
  const clock = { now: options.now ?? new Date('2026-10-16T10:00:00Z') };
  const app = await buildApp({
    config,
    db: pg.db,
    logger: false,
    now: () => clock.now,
    rateLimits: options.rateLimits ?? GENEROUS_LIMITS,
    loginFailureMinMs: 0,
  });
  await app.ready();
  return {
    app,
    db: pg.db,
    clock,
    close: async () => {
      await app.close();
      await pg.client.close();
    },
  };
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Petit client HTTP « navigateur » : conserve le cookie de session et envoie l'en-tête Origin. */
export class Client {
  cookie: string | undefined;

  constructor(
    private readonly app: FastifyInstance,
    private readonly origin: string | null = ORIGIN,
  ) {}

  async request(method: Method, url: string, body?: unknown): Promise<LightMyRequestResponse> {
    const headers: Record<string, string> = {};
    if (this.origin) headers.origin = this.origin;
    if (this.cookie) headers.cookie = this.cookie;
    const res = await this.app.inject({
      method,
      url,
      headers,
      ...(body === undefined ? {} : { payload: body as Record<string, unknown> }),
    });
    const setCookie = res.cookies.find((c) => c.name === 'jojo_session');
    if (setCookie) {
      const cleared =
        setCookie.value === '' ||
        (setCookie.expires instanceof Date && setCookie.expires.getTime() < Date.now());
      this.cookie = cleared ? undefined : `jojo_session=${setCookie.value}`;
    }
    return res;
  }

  get = (url: string) => this.request('GET', url);
  post = (url: string, body?: unknown) => this.request('POST', url, body);
  put = (url: string, body?: unknown) => this.request('PUT', url, body);
  patch = (url: string, body?: unknown) => this.request('PATCH', url, body);
  delete = (url: string, body?: unknown) => this.request('DELETE', url, body);

  async register(username: string, password = PASSWORD, extra: Record<string, unknown> = {}) {
    return this.post('/api/auth/register', { username, password, ...extra });
  }

  async login(username: string, password = PASSWORD, remember = true) {
    return this.post('/api/auth/login', { username, password, remember });
  }

  async setWatched(ids: string[], watched = true) {
    return this.put('/api/watched', { watched, items: ids.map((episodeId) => ({ episodeId })) });
  }
}

let counter = 0;
export function uniqueName(prefix = 'user'): string {
  counter += 1;
  return `${prefix}_${counter}_${Math.random().toString(36).slice(2, 7)}`;
}
