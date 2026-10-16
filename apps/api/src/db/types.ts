import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import type * as schema from './schema.js';

/** Base de données Drizzle indépendante du pilote (postgres.js en prod, PGlite en test/dev). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
