import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: text('username').notNull(),
    passwordHash: text('password_hash').notNull(),
    ...timestamps,
    passwordChangedAt: timestamp('password_changed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('users_username_lower_idx').on(sql`lower(${t.username})`),
    check('users_username_format', sql`${t.username} ~ '^[a-zA-Z0-9_-]{3,24}$'`),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    /** SHA-256 (hex) du jeton envoyé en cookie ; le jeton lui-même n'est jamais stocké. */
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    persistent: boolean('persistent').notNull(),
    ...timestamps,
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('sessions_user_id_idx').on(t.userId),
    index('sessions_expires_at_idx').on(t.expiresAt),
  ],
);

export const parts = pgTable(
  'parts',
  {
    number: integer('number').primaryKey(),
    name: text('name').notNull(),
  },
  (t) => [check('parts_number_positive', sql`${t.number} > 0`)],
);

export const seasons = pgTable(
  'seasons',
  {
    key: text('key').primaryKey(),
    partNumber: integer('part_number')
      .notNull()
      .references(() => parts.number, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    position: integer('position').notNull(),
  },
  (t) => [uniqueIndex('seasons_part_position_idx').on(t.partNumber, t.position)],
);

export const episodes = pgTable(
  'episodes',
  {
    id: text('id').primaryKey(),
    partNumber: integer('part_number')
      .notNull()
      .references(() => parts.number, { onDelete: 'cascade' }),
    season: text('season').references(() => seasons.key, { onDelete: 'set null' }),
    numberInPart: integer('number_in_part').notNull(),
    officialNumber: integer('official_number').notNull(),
    titleFr: text('title_fr'),
    titleEn: text('title_en'),
    airDate: date('air_date', { mode: 'string' }),
  },
  (t) => [
    uniqueIndex('episodes_part_number_idx').on(t.partNumber, t.numberInPart),
    check('episodes_number_positive', sql`${t.numberInPart} > 0 and ${t.officialNumber} > 0`),
  ],
);

export const watchedEpisodes = pgTable(
  'watched_episodes',
  {
    userId: uuid('user_id').notNull(),
    episodeId: text('episode_id').notNull(),
    watchedAt: timestamp('watched_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.episodeId] }),
    foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('cascade'),
    foreignKey({ columns: [t.episodeId], foreignColumns: [episodes.id] }).onDelete('cascade'),
    index('watched_episodes_episode_id_idx').on(t.episodeId),
  ],
);

export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  antiSpoil: boolean('anti_spoil').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
