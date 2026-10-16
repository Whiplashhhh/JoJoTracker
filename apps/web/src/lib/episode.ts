import type { EpisodeView, PartView } from '@jojo/shared/client';

/** Libellé court sans titre : « Partie 3 · Épisode 14 ». */
export function episodeLabel(ep: Pick<EpisodeView, 'partNumber' | 'numberInPart'>): string {
  return `Partie ${ep.partNumber} · Épisode ${ep.numberInPart}`;
}

export function seasonName(part: PartView | undefined, key: string | null): string | null {
  if (!part || key === null) return null;
  return part.seasons.find((s) => s.key === key)?.name ?? null;
}

/** Largeur pseudo-aléatoire stable de la bande censurée (indépendante du titre : aucune fuite de longueur). */
export function censorWidth(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 58 + (h % 34);
}
