/**
 * Logique de progression pure, partagée (testée unitairement).
 * Ne manipule que des métadonnées non sensibles (numéros, dates, état vu).
 */

export interface ProgressEpisode {
  id: string;
  partNumber: number;
  numberInPart: number;
  airDate: string | null;
  watched: boolean;
}

export type PartStatus = 'not-started' | 'in-progress' | 'up-to-date' | 'completed';

export interface Progress {
  watched: number;
  total: number;
  /** Nombre d'épisodes déjà diffusés. */
  aired: number;
  /** Pourcentage entier, arrondi vers le bas (100 % uniquement quand tout est vu). */
  percent: number;
}

export interface PartProgress extends Progress {
  partNumber: number;
  status: PartStatus;
}

/** Un épisode est diffusé si sa date est connue et passée (ou aujourd'hui), ou inconnue. */
export function isAired(episode: Pick<ProgressEpisode, 'airDate'>, today: string): boolean {
  return episode.airDate === null || episode.airDate <= today;
}

export function compareEpisodes(a: ProgressEpisode, b: ProgressEpisode): number {
  return a.partNumber - b.partNumber || a.numberInPart - b.numberInPart;
}

export function sortEpisodes<T extends ProgressEpisode>(episodes: readonly T[]): T[] {
  return [...episodes].sort(compareEpisodes);
}

export function computeProgress(episodes: readonly ProgressEpisode[], today: string): Progress {
  const total = episodes.length;
  const watched = episodes.filter((e) => e.watched).length;
  const aired = episodes.filter((e) => isAired(e, today)).length;
  const percent = total === 0 ? 0 : Math.floor((watched / total) * 100);
  return { watched, total, aired, percent };
}

export function partStatus(progress: Progress): PartStatus {
  if (progress.total > 0 && progress.watched === progress.total) return 'completed';
  if (progress.watched === 0) return 'not-started';
  if (progress.watched >= progress.aired) return 'up-to-date';
  return 'in-progress';
}

export function computePartProgress(
  episodes: readonly ProgressEpisode[],
  partNumber: number,
  today: string,
): PartProgress {
  const progress = computeProgress(
    episodes.filter((e) => e.partNumber === partNumber),
    today,
  );
  return { ...progress, partNumber, status: partStatus(progress) };
}

export type NextStep<T extends ProgressEpisode> =
  { kind: 'episode'; episode: T } | { kind: 'upcoming'; episode: T } | { kind: 'done' };

/**
 * Prochaine étape : le premier épisode diffusé non vu dans l'ordre (partie, numéro).
 * À défaut, le premier épisode pas encore diffusé non vu (« à venir »).
 */
export function nextStep<T extends ProgressEpisode>(
  episodes: readonly T[],
  today: string,
): NextStep<T> {
  const sorted = sortEpisodes(episodes);
  const next = sorted.find((e) => !e.watched && isAired(e, today));
  if (next) return { kind: 'episode', episode: next };
  const upcoming = sorted.find((e) => !e.watched);
  if (upcoming) return { kind: 'upcoming', episode: upcoming };
  return { kind: 'done' };
}

/**
 * Épisodes diffusés, non vus, situés avant `episodeId`
 * (dans la même partie ou dans les parties précédentes).
 */
export function previousUnwatched<T extends ProgressEpisode>(
  episodes: readonly T[],
  episodeId: string,
  today: string,
): T[] {
  const target = episodes.find((e) => e.id === episodeId);
  if (!target) return [];
  return sortEpisodes(episodes).filter(
    (e) => compareEpisodes(e, target) < 0 && !e.watched && isAired(e, today),
  );
}

/**
 * Indique si une partie vient d'être terminée suite à un changement d'état.
 */
export function justCompletedParts(
  before: readonly ProgressEpisode[],
  after: readonly ProgressEpisode[],
  today: string,
): number[] {
  const parts = [...new Set(after.map((e) => e.partNumber))].sort((a, b) => a - b);
  return parts.filter(
    (p) =>
      computePartProgress(before, p, today).status !== 'completed' &&
      computePartProgress(after, p, today).status === 'completed',
  );
}
