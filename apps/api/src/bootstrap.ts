import type { FastifyInstance } from 'fastify';
import { syncCatalog } from './catalog/sync.js';
import { loadCatalog } from './catalog/index.js';
import type { Db } from './db/types.js';
import { purgeExpiredSessions } from './services/sessions.js';

/** Tâches de démarrage communes : upsert du catalogue et purge des sessions expirées. */
export async function prepareDatabase(db: Db, log: FastifyInstance['log']): Promise<void> {
  const { episodes } = await syncCatalog(db, loadCatalog());
  log.info({ episodes }, 'catalogue synchronisé');
  await purgeExpiredSessions(db, new Date());
}

export function schedulePurge(db: Db, log: FastifyInstance['log']): NodeJS.Timeout {
  const timer = setInterval(
    () => {
      purgeExpiredSessions(db, new Date()).catch((err: unknown) => {
        log.error({ err }, 'purge des sessions échouée');
      });
    },
    60 * 60 * 1000,
  );
  timer.unref();
  return timer;
}
