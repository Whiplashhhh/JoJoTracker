import type { CatalogResponse, EpisodeView, PartView } from '@jojo/shared';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Db } from '../db/types.js';
import { episodes, parts, seasons, userSettings, watchedEpisodes } from '../db/schema.js';

type EpisodeRow = typeof episodes.$inferSelect;

/** Titre affichable : français officiel en priorité, sinon anglais officiel. */
export function displayTitle(ep: Pick<EpisodeRow, 'titleFr' | 'titleEn'>): string | null {
  return ep.titleFr ?? ep.titleEn;
}

/**
 * Règle anti-spoil centrale : le titre n'est inclus que si l'épisode est vu,
 * ou si l'utilisateur a désactivé le mode anti-spoil.
 */
export function toEpisodeView(
  ep: EpisodeRow,
  watchedAt: Date | null,
  antiSpoil: boolean,
): EpisodeView {
  const watched = watchedAt !== null;
  const reveal = watched || !antiSpoil;
  return {
    id: ep.id,
    partNumber: ep.partNumber,
    season: ep.season,
    numberInPart: ep.numberInPart,
    officialNumber: ep.officialNumber,
    airDate: ep.airDate,
    watched,
    watchedAt: watchedAt ? watchedAt.toISOString() : null,
    title: reveal ? displayTitle(ep) : null,
    titleHidden: !reveal,
  };
}

export async function getAntiSpoil(db: Db, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ antiSpoil: userSettings.antiSpoil })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return row?.antiSpoil ?? true;
}

export async function getEpisodeViews(
  db: Db,
  userId: string,
  antiSpoil: boolean,
  ids?: readonly string[],
): Promise<EpisodeView[]> {
  const rows = await db
    .select({ ep: episodes, watchedAt: watchedEpisodes.watchedAt })
    .from(episodes)
    .leftJoin(
      watchedEpisodes,
      and(eq(watchedEpisodes.episodeId, episodes.id), eq(watchedEpisodes.userId, userId)),
    )
    .where(ids ? inArray(episodes.id, [...ids]) : undefined)
    .orderBy(asc(episodes.partNumber), asc(episodes.numberInPart));
  return rows.map((r) => toEpisodeView(r.ep, r.watchedAt, antiSpoil));
}

export async function getParts(db: Db): Promise<PartView[]> {
  const partRows = await db.select().from(parts).orderBy(asc(parts.number));
  const seasonRows = await db
    .select()
    .from(seasons)
    .orderBy(asc(seasons.partNumber), asc(seasons.position));
  return partRows.map((p) => ({
    number: p.number,
    name: p.name,
    seasons: seasonRows
      .filter((s) => s.partNumber === p.number)
      .map((s) => ({ key: s.key, name: s.name })),
  }));
}

export async function getUserCatalog(
  db: Db,
  userId: string,
  today: string,
): Promise<CatalogResponse> {
  const antiSpoil = await getAntiSpoil(db, userId);
  const [partViews, episodeViews] = await Promise.all([
    getParts(db),
    getEpisodeViews(db, userId, antiSpoil),
  ]);
  return { today, antiSpoil, parts: partViews, episodes: episodeViews };
}
