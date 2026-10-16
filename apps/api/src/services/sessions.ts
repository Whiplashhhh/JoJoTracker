import { and, eq, gt, lt, ne } from 'drizzle-orm';
import type { Db } from '../db/types.js';
import { sessions, users } from '../db/schema.js';
import { DAY_MS } from '../lib/time.js';
import { generateSessionToken, hashToken } from '../lib/tokens.js';

/** Durée d'inactivité maximale d'une session « navigateur » (sans « rester connectée »). */
export const BROWSER_SESSION_IDLE_MS = DAY_MS;
/** Fréquence maximale de mise à jour de la fenêtre glissante. */
const TOUCH_INTERVAL_MS = 10 * 60 * 1000;

export interface SessionPolicy {
  ttlDays: number;
}

export function sessionLifetimeMs(persistent: boolean, policy: SessionPolicy): number {
  return persistent ? policy.ttlDays * DAY_MS : BROWSER_SESSION_IDLE_MS;
}

export async function createSession(
  db: Db,
  userId: string,
  persistent: boolean,
  now: Date,
  policy: SessionPolicy,
): Promise<{ token: string; id: string }> {
  const token = generateSessionToken();
  const id = hashToken(token);
  await db.insert(sessions).values({
    id,
    userId,
    persistent,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + sessionLifetimeMs(persistent, policy)),
  });
  return { token, id };
}

export interface ActiveSession {
  id: string;
  persistent: boolean;
  /** `true` si l'expiration a été repoussée (le cookie doit être réémis). */
  refreshed: boolean;
  user: { id: string; username: string; createdAt: Date };
}

export async function resolveSession(
  db: Db,
  token: string,
  now: Date,
  policy: SessionPolicy,
): Promise<ActiveSession | null> {
  const id = hashToken(token);
  const [row] = await db
    .select({
      id: sessions.id,
      persistent: sessions.persistent,
      lastSeenAt: sessions.lastSeenAt,
      userId: users.id,
      username: users.username,
      createdAt: users.createdAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, now)))
    .limit(1);
  if (!row) return null;

  let refreshed = false;
  if (now.getTime() - row.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db
      .update(sessions)
      .set({
        lastSeenAt: now,
        expiresAt: new Date(now.getTime() + sessionLifetimeMs(row.persistent, policy)),
      })
      .where(eq(sessions.id, row.id));
    refreshed = true;
  }
  return {
    id: row.id,
    persistent: row.persistent,
    refreshed,
    user: { id: row.userId, username: row.username, createdAt: row.createdAt },
  };
}

export async function deleteSessionByToken(db: Db, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

export async function deleteUserSessions(db: Db, userId: string, exceptId?: string): Promise<void> {
  await db
    .delete(sessions)
    .where(
      exceptId === undefined
        ? eq(sessions.userId, userId)
        : and(eq(sessions.userId, userId), ne(sessions.id, exceptId)),
    );
}

export async function purgeExpiredSessions(db: Db, now: Date): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
}
