import { z } from 'zod';

const titleSchema = z.string().trim().min(1).max(300).nullable();

export const catalogEpisodeSchema = z
  .object({
    id: z.string().regex(/^p\d+-e\d+$/),
    partNumber: z.number().int().positive(),
    season: z.string().min(1).nullable(),
    numberInPart: z.number().int().positive(),
    officialNumber: z.number().int().positive(),
    titleFr: titleSchema,
    titleEn: titleSchema,
    airDate: z.iso.date().nullable(),
  })
  .strict();
export type CatalogEpisode = z.infer<typeof catalogEpisodeSchema>;

export const catalogPartSchema = z
  .object({
    number: z.number().int().positive(),
    name: z.string().min(1),
    seasons: z.array(
      z.object({ key: z.string().regex(/^[a-z0-9-]+$/), name: z.string().min(1) }).strict(),
    ),
  })
  .strict();
export type CatalogPart = z.infer<typeof catalogPartSchema>;

export const catalogSchema = z
  .object({
    parts: z.array(catalogPartSchema).min(1),
    episodes: z.array(catalogEpisodeSchema).min(1),
  })
  .strict()
  .superRefine((catalog, ctx) => {
    const issue = (message: string) => {
      ctx.addIssue({ code: 'custom', message });
    };

    const partNumbers = new Set<number>();
    const seasonKeys = new Map<string, number>();
    for (const part of catalog.parts) {
      if (partNumbers.has(part.number)) issue(`Partie ${part.number} en double.`);
      partNumbers.add(part.number);
      for (const season of part.seasons) {
        if (seasonKeys.has(season.key)) issue(`Saison « ${season.key} » en double.`);
        seasonKeys.set(season.key, part.number);
      }
    }

    const ids = new Set<string>();
    const byPart = new Map<number, number[]>();
    for (const ep of catalog.episodes) {
      if (ids.has(ep.id)) issue(`Identifiant en double : ${ep.id}.`);
      ids.add(ep.id);
      if (ep.id !== `p${ep.partNumber}-e${ep.numberInPart}`) {
        issue(`Identifiant ${ep.id} incohérent avec partie/numéro.`);
      }
      if (!partNumbers.has(ep.partNumber)) issue(`${ep.id} : partie inconnue.`);
      if (ep.season !== null && seasonKeys.get(ep.season) !== ep.partNumber) {
        issue(`${ep.id} : saison « ${ep.season} » inconnue pour cette partie.`);
      }
      const list = byPart.get(ep.partNumber) ?? [];
      list.push(ep.numberInPart);
      byPart.set(ep.partNumber, list);
    }

    for (const [part, numbers] of byPart) {
      const sorted = [...numbers].sort((a, b) => a - b);
      sorted.forEach((n, i) => {
        if (n !== i + 1) issue(`Partie ${part} : numérotation non continue autour de ${n}.`);
      });
    }
    for (const part of catalog.parts) {
      if (!byPart.has(part.number)) issue(`Partie ${part.number} sans épisode.`);
      const hasSeasons = part.seasons.length > 0;
      for (const ep of catalog.episodes.filter((e) => e.partNumber === part.number)) {
        if (hasSeasons && ep.season === null) issue(`${ep.id} : saison manquante.`);
      }
    }
  });
export type Catalog = z.infer<typeof catalogSchema>;
