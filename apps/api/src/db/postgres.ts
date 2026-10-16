import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema.js';
import type { Db } from './types.js';

export interface PostgresHandle {
  db: Db;
  migrate: (migrationsFolder: string) => Promise<void>;
  close: () => Promise<void>;
}

export function connectPostgres(url: string): PostgresHandle {
  const client = postgres(url, { max: 10, onnotice: () => undefined });
  const db = drizzle(client, { schema });
  return {
    db,
    migrate: (migrationsFolder) => migrate(db, { migrationsFolder }),
    close: () => client.end({ timeout: 5 }),
  };
}
