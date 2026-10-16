/** Point d'entrée de production : migrations → catalogue → écoute. */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app.js';
import { prepareDatabase, schedulePurge } from './bootstrap.js';
import { ConfigError, loadConfig, type Config } from './config.js';
import { connectPostgres } from './db/postgres.js';

const here = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  let config: Config;
  try {
    config = loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }

  const pg = connectPostgres(config.databaseUrl);
  const app = await buildApp({
    config: { ...config, webDist: config.webDist ?? join(here, '../../web/dist') },
    db: pg.db,
  });

  try {
    await pg.migrate(process.env.MIGRATIONS_DIR ?? join(here, '../drizzle'));
    app.log.info('migrations appliquées');
    await prepareDatabase(pg.db, app.log);
  } catch (error) {
    app.log.fatal({ err: error }, 'initialisation de la base impossible');
    await pg.close();
    process.exit(1);
  }

  const purge = schedulePurge(pg.db, app.log);
  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'arrêt en cours');
    clearInterval(purge);
    await app.close();
    await pg.close();
    process.exit(0);
  };
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));

  await app.listen({ host: config.host, port: config.port });
}

void main();
