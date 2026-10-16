import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from './schema.js';
import type { Db } from './types.js';

/** Base PGlite (PostgreSQL en WebAssembly) pour les tests et le développement sans Docker. */
export async function createPglite(
  dataDir?: string,
): Promise<{ db: Db; client: PGlite; migrate: (folder: string) => Promise<void> }> {
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  await client.waitReady;
  const db = drizzle(client, { schema });
  return { db, client, migrate: (migrationsFolder) => migrate(db, { migrationsFolder }) };
}
