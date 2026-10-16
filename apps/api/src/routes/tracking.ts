import {
  episodeIdSchema,
  isAired,
  setWatchedBodySchema,
  type CatalogResponse,
  type RevealResponse,
  type SetWatchedResponse,
} from '@jojo/shared';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppContext } from '../context.js';
import { episodes, watchedEpisodes } from '../db/schema.js';
import { AppError, notFound } from '../lib/errors.js';
import {
  displayTitle,
  getAntiSpoil,
  getEpisodeViews,
  getUserCatalog,
} from '../services/catalog.js';

const revealParamsSchema = z.object({ id: episodeIdSchema });

export function registerTrackingRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { db } = ctx;

  app.get('/api/catalog', async (request, reply): Promise<CatalogResponse> => {
    const { user } = await ctx.requireAuth(request, reply);
    return getUserCatalog(db, user.id, ctx.today());
  });

  /** Coche ou décoche un ou plusieurs épisodes. Ne renvoie que les épisodes concernés. */
  app.put('/api/watched', async (request, reply): Promise<SetWatchedResponse> => {
    const { user } = await ctx.requireAuth(request, reply);
    const input = setWatchedBodySchema.parse(request.body);
    const ids = [...new Set(input.items.map((i) => i.episodeId))];

    const found = await db
      .select({ id: episodes.id, airDate: episodes.airDate })
      .from(episodes)
      .where(inArray(episodes.id, ids));
    if (found.length !== ids.length) throw notFound('Épisode introuvable.');

    const now = ctx.now();
    if (input.watched) {
      const today = ctx.today();
      if (found.some((e) => !isAired(e, today))) {
        throw new AppError(409, 'NOT_AIRED', "Cet épisode n'est pas encore disponible.");
      }
      const seen = new Set<string>();
      const fresh: (typeof watchedEpisodes.$inferInsert)[] = [];
      const restored: (typeof watchedEpisodes.$inferInsert)[] = [];
      for (const item of input.items) {
        if (seen.has(item.episodeId)) continue;
        seen.add(item.episodeId);
        if (item.watchedAt === undefined) {
          fresh.push({ userId: user.id, episodeId: item.episodeId, watchedAt: now });
        } else {
          const at = new Date(item.watchedAt);
          restored.push({
            userId: user.id,
            episodeId: item.episodeId,
            watchedAt: at > now ? now : at,
          });
        }
      }
      await db.transaction(async (tx) => {
        if (fresh.length > 0) await tx.insert(watchedEpisodes).values(fresh).onConflictDoNothing();
        if (restored.length > 0) {
          await tx
            .insert(watchedEpisodes)
            .values(restored)
            .onConflictDoUpdate({
              target: [watchedEpisodes.userId, watchedEpisodes.episodeId],
              set: { watchedAt: sql`excluded.watched_at` },
            });
        }
      });
    } else {
      await db
        .delete(watchedEpisodes)
        .where(and(eq(watchedEpisodes.userId, user.id), inArray(watchedEpisodes.episodeId, ids)));
    }

    const antiSpoil = await getAntiSpoil(db, user.id);
    return { episodes: await getEpisodeViews(db, user.id, antiSpoil, ids) };
  });

  /** Révélation volontaire d'un seul titre (non persistée). */
  app.post(
    '/api/episodes/:id/reveal',
    { config: { rateLimit: ctx.rateLimits.sensitive } },
    async (request, reply): Promise<RevealResponse> => {
      await ctx.requireAuth(request, reply);
      const { id } = revealParamsSchema.parse(request.params);
      const [ep] = await db
        .select({ id: episodes.id, titleFr: episodes.titleFr, titleEn: episodes.titleEn })
        .from(episodes)
        .where(eq(episodes.id, id))
        .limit(1);
      if (!ep) throw notFound('Épisode introuvable.');
      return { id: ep.id, title: displayTitle(ep) };
    },
  );
}
