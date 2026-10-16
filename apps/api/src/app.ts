import fastifyCookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { sql } from 'drizzle-orm';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import type { Config } from './config.js';
import { AppContext, DEFAULT_RATE_LIMITS, type RateLimits } from './context.js';
import type { Db } from './db/types.js';
import { AppError } from './lib/errors.js';
import { registerErrorHandling } from './plugins/errors.js';
import { registerSecurity } from './plugins/security.js';
import { registerStatic } from './plugins/static.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerMeRoutes } from './routes/me.js';
import { registerTrackingRoutes } from './routes/tracking.js';

export interface BuildAppOptions {
  config: Config;
  db: Db;
  logger?: FastifyServerOptions['logger'];
  now?: () => Date;
  rateLimits?: RateLimits;
  loginFailureMinMs?: number;
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const { config, db } = options;
  const app = Fastify({
    logger: options.logger ?? {
      level: config.logLevel,
      redact: {
        paths: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
        remove: true,
      },
    },
    trustProxy: config.trustProxy,
    bodyLimit: 64 * 1024,
    routerOptions: { ignoreTrailingSlash: true },
  });

  const ctx = new AppContext(
    config,
    db,
    options.now ?? (() => new Date()),
    options.rateLimits ?? DEFAULT_RATE_LIMITS,
    options.loginFailureMinMs ?? 400,
  );

  registerErrorHandling(app);
  await registerSecurity(app, config);
  await app.register(fastifyCookie);
  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder: (_request, context) =>
      new AppError(
        429,
        'RATE_LIMITED',
        `Trop de tentatives. Réessaie dans ${Math.max(1, Math.ceil(context.ttl / 60_000))} min.`,
      ),
  });

  app.get('/api/health', async (_request, reply) => {
    try {
      await db.execute(sql`select 1`);
      return { status: 'ok' };
    } catch (error) {
      app.log.error({ err: error }, 'base de données injoignable');
      return reply.status(503).send({ status: 'error' });
    }
  });

  registerAuthRoutes(app, ctx);
  registerMeRoutes(app, ctx);
  registerTrackingRoutes(app, ctx);
  await registerStatic(app, config.webDist);

  return app;
}
