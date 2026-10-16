import {
  changePasswordBodySchema,
  deleteAccountBodySchema,
  updateSettingsBodySchema,
  type ExportData,
  type MeResponse,
  type Settings,
} from '@jojo/shared';
import { asc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { episodes, userSettings, users, watchedEpisodes } from '../db/schema.js';
import { AppError } from '../lib/errors.js';
import { hashPassword, verifyPassword } from '../lib/passwords.js';
import { getAntiSpoil } from '../services/catalog.js';
import { createSession, deleteUserSessions } from '../services/sessions.js';

export function registerMeRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { db } = ctx;

  app.get('/api/me', async (request, reply): Promise<MeResponse> => {
    const { user } = await ctx.requireAuth(request, reply);
    return {
      user: { id: user.id, username: user.username, createdAt: user.createdAt.toISOString() },
      settings: { antiSpoil: await getAntiSpoil(db, user.id) },
    };
  });

  app.patch('/api/me/settings', async (request, reply): Promise<Settings> => {
    const { user } = await ctx.requireAuth(request, reply);
    const patch = updateSettingsBodySchema.parse(request.body);
    const now = ctx.now();
    const [row] = await db
      .insert(userSettings)
      .values({ userId: user.id, antiSpoil: patch.antiSpoil ?? true, updatedAt: now })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          ...(patch.antiSpoil === undefined ? {} : { antiSpoil: patch.antiSpoil }),
          updatedAt: now,
        },
      })
      .returning({ antiSpoil: userSettings.antiSpoil });
    return { antiSpoil: row?.antiSpoil ?? true };
  });

  app.post(
    '/api/me/password',
    { config: { rateLimit: ctx.rateLimits.sensitive } },
    async (request, reply) => {
      const session = await ctx.requireAuth(request, reply);
      const input = changePasswordBodySchema.parse(request.body);
      const [row] = await db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, session.user.id));
      if (!row || !(await verifyPassword(row.passwordHash, input.currentPassword))) {
        throw new AppError(400, 'INVALID_CREDENTIALS', 'Mot de passe actuel incorrect.');
      }
      const now = ctx.now();
      await db
        .update(users)
        .set({ passwordHash: await hashPassword(input.newPassword), passwordChangedAt: now })
        .where(eq(users.id, session.user.id));
      // Toutes les sessions sont invalidées ; celle-ci est remplacée par un nouveau jeton.
      await deleteUserSessions(db, session.user.id);
      const { token } = await createSession(
        db,
        session.user.id,
        session.persistent,
        now,
        ctx.sessionPolicy,
      );
      ctx.setSessionCookie(reply, token, session.persistent);
      request.log.info({ userId: session.user.id }, 'mot de passe changé');
      return reply.status(204).send();
    },
  );

  app.post('/api/me/logout-all', async (request, reply) => {
    const { user } = await ctx.requireAuth(request, reply);
    await deleteUserSessions(db, user.id);
    ctx.clearSessionCookie(reply);
    return reply.status(204).send();
  });

  app.get('/api/me/export', async (request, reply): Promise<ExportData> => {
    const { user } = await ctx.requireAuth(request, reply);
    const rows = await db
      .select({
        episodeId: watchedEpisodes.episodeId,
        partNumber: episodes.partNumber,
        numberInPart: episodes.numberInPart,
        watchedAt: watchedEpisodes.watchedAt,
      })
      .from(watchedEpisodes)
      .innerJoin(episodes, eq(episodes.id, watchedEpisodes.episodeId))
      .where(eq(watchedEpisodes.userId, user.id))
      .orderBy(asc(episodes.partNumber), asc(episodes.numberInPart));
    const now = ctx.now();
    reply.header(
      'Content-Disposition',
      `attachment; filename="jojo-tracker-${user.username}-${now.toISOString().slice(0, 10)}.json"`,
    );
    return {
      format: 'jojo-tracker-export',
      version: 1,
      exportedAt: now.toISOString(),
      user: { username: user.username, createdAt: user.createdAt.toISOString() },
      settings: { antiSpoil: await getAntiSpoil(db, user.id) },
      watched: rows.map((r) => ({ ...r, watchedAt: r.watchedAt.toISOString() })),
    };
  });

  app.delete(
    '/api/me',
    { config: { rateLimit: ctx.rateLimits.sensitive } },
    async (request, reply) => {
      const { user } = await ctx.requireAuth(request, reply);
      const input = deleteAccountBodySchema.parse(request.body);
      if (input.confirmUsername.toLowerCase() !== user.username.toLowerCase()) {
        throw new AppError(400, 'CONFIRMATION_MISMATCH', 'Le pseudo saisi ne correspond pas.');
      }
      // ON DELETE CASCADE : sessions, réglages et épisodes vus partent avec le compte.
      await db.delete(users).where(eq(users.id, user.id));
      ctx.clearSessionCookie(reply);
      request.log.info({ userId: user.id }, 'compte supprimé');
      return reply.status(204).send();
    },
  );
}
