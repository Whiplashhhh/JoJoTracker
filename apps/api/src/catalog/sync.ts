import { notInArray, sql } from 'drizzle-orm';
import type { Db } from '../db/types.js';
import { episodes, parts, seasons } from '../db/schema.js';
import type { Catalog } from './schema.js';

/**
 * Upsert idempotent du catalogue en base (parties, saisons, épisodes).
 * Aucun épisode n'est supprimé : un id retiré du fichier reste en base (voir README).
 * Les saisons, simples libellés, suivent exactement le fichier.
 */
export async function syncCatalog(db: Db, catalog: Catalog): Promise<{ episodes: number }> {
  await db.transaction(async (tx) => {
    await tx
      .insert(parts)
      .values(catalog.parts.map((p) => ({ number: p.number, name: p.name })))
      .onConflictDoUpdate({ target: parts.number, set: { name: sql`excluded.name` } });

    const seasonRows = catalog.parts.flatMap((p) =>
      p.seasons.map((s, i) => ({
        key: s.key,
        partNumber: p.number,
        name: s.name,
        position: i + 1,
      })),
    );
    // Les saisons retirées du fichier sont supprimées (les épisodes concernés repassent à
    // `season = NULL` puis sont réaffectés juste après) : sinon leurs positions entreraient
    // en conflit avec celles du fichier au démarrage suivant.
    const keys = seasonRows.map((s) => s.key);
    await (keys.length > 0
      ? tx.delete(seasons).where(notInArray(seasons.key, keys))
      : tx.delete(seasons));
    if (seasonRows.length > 0) {
      // Libère temporairement les positions pour éviter les conflits d'unicité lors d'un réordonnancement.
      await tx.update(seasons).set({ position: sql`-${seasons.position}` });
      await tx
        .insert(seasons)
        .values(seasonRows)
        .onConflictDoUpdate({
          target: seasons.key,
          set: {
            partNumber: sql`excluded.part_number`,
            name: sql`excluded.name`,
            position: sql`excluded.position`,
          },
        });
    }

    await tx
      .insert(episodes)
      .values(catalog.episodes)
      .onConflictDoUpdate({
        target: episodes.id,
        set: {
          partNumber: sql`excluded.part_number`,
          season: sql`excluded.season`,
          numberInPart: sql`excluded.number_in_part`,
          officialNumber: sql`excluded.official_number`,
          titleFr: sql`excluded.title_fr`,
          titleEn: sql`excluded.title_en`,
          airDate: sql`excluded.air_date`,
        },
      });
  });
  return { episodes: catalog.episodes.length };
}
