/**
 * Serveur de développement : utilise DATABASE_URL si défini, sinon une base PGlite locale
 * (apps/api/.data/), pour pouvoir lancer `pnpm dev` sans PostgreSQL.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app.js';
import { prepareDatabase } from './bootstrap.js';
import { loadConfig } from './config.js';
import { createPglite } from './db/pglite.js';
import { connectPostgres } from './db/postgres.js';
import type { Db } from './db/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const migrations = join(here, '../drizzle');

const usePglite = !process.env.DATABASE_URL;
const config = loadConfig({
  NODE_ENV: 'development',
  APP_ORIGIN: process.env.APP_ORIGIN ?? 'http://localhost:5173',
  COOKIE_SECURE: 'false',
  PORT: process.env.PORT ?? '3000',
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://pglite/local',
});

let db: Db;
if (usePglite) {
  // PGLITE_DIR=memory : base éphémère (tests E2E).
  const dir = process.env.PGLITE_DIR ?? join(here, '../.data/pglite');
  const pg = await createPglite(dir === 'memory' ? undefined : dir);
  await pg.migrate(migrations);
  db = pg.db;
} else {
  const pg = connectPostgres(config.databaseUrl);
  await pg.migrate(migrations);
  db = pg.db;
}

// En développement (et pour les tests E2E / captures), limites de débit relâchées.
const relaxed = { max: 1000, timeWindow: 60_000 };
// FAKE_NOW (tests E2E) : horloge figée pour des résultats indépendants de la date réelle.
const fakeNow = process.env.FAKE_NOW ? new Date(process.env.FAKE_NOW) : null;
const app = await buildApp({
  config,
  db,
  ...(fakeNow ? { now: () => new Date(fakeNow) } : {}),
  logger: { level: config.logLevel, transport: { target: 'pino-pretty' } },
  rateLimits: { login: relaxed, loginPerUsername: relaxed, register: relaxed, sensitive: relaxed },
});
await prepareDatabase(db, app.log);
await app.listen({ host: '127.0.0.1', port: config.port });
