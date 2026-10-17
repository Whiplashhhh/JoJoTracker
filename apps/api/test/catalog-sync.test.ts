import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { loadCatalog, type Catalog } from '../src/catalog/index.js';
import { syncCatalog } from '../src/catalog/sync.js';
import { createPglite } from '../src/db/pglite.js';
import { episodes, seasons, users, watchedEpisodes } from '../src/db/schema.js';

const here = dirname(fileURLToPath(import.meta.url));
let close: (() => Promise<void>) | undefined;
afterEach(async () => {
  await close?.();
  close = undefined;
});

async function freshDb() {
  const pg = await createPglite();
  await pg.migrate(join(here, '../drizzle'));
  close = () => pg.client.close();
  return pg.db;
}

function clone(catalog: Catalog): Catalog {
  return structuredClone(catalog);
}

describe('upsert du catalogue', () => {
  it('est idempotent', async () => {
    const db = await freshDb();
    await syncCatalog(db, loadCatalog());
    await syncCatalog(db, loadCatalog());
    expect(await db.$count(episodes)).toBe(202);
    expect(await db.$count(seasons)).toBe(5);
  });

  it('met à jour un titre sans toucher à la progression', async () => {
    const db = await freshDb();
    await syncCatalog(db, loadCatalog());
    const [user] = await db
      .insert(users)
      .values({ username: 'tester', passwordHash: 'x' })
      .returning();
    await db.insert(watchedEpisodes).values({ userId: user!.id, episodeId: 'p1-e1' });
    const edited = clone(loadCatalog());
    edited.episodes[0]!.titleFr = 'Titre corrigé';
    await syncCatalog(db, edited);
    const [row] = await db.select().from(episodes).where(eq(episodes.id, 'p1-e1'));
    expect(row?.titleFr).toBe('Titre corrigé');
    expect(await db.$count(watchedEpisodes)).toBe(1);
  });

  it('supporte le renommage d’une saison sur plusieurs démarrages successifs', async () => {
    const db = await freshDb();
    await syncCatalog(db, loadCatalog());
    const renamed = clone(loadCatalog());
    const part3 = renamed.parts.find((p) => p.number === 3)!;
    part3.seasons[1]!.key = 'egypte';
    for (const ep of renamed.episodes) if (ep.season === 'battle-in-egypt') ep.season = 'egypte';
    for (let boot = 0; boot < 3; boot++) await syncCatalog(db, renamed);
    const rows = await db.select().from(seasons).where(eq(seasons.partNumber, 3));
    expect(rows.map((r) => [r.key, r.position]).sort()).toEqual([
      ['egypte', 2],
      ['stardust-crusaders', 1],
    ]);
    expect(await db.$count(episodes, eq(episodes.season, 'egypte'))).toBe(24);
  });

  it('ajoute un nouvel épisode', async () => {
    const db = await freshDb();
    await syncCatalog(db, loadCatalog());
    const extended = clone(loadCatalog());
    extended.episodes.push({
      id: 'p7-e13',
      partNumber: 7,
      season: null,
      numberInPart: 13,
      officialNumber: 13,
      titleFr: null,
      titleEn: null,
      airDate: '2027-01-15',
    });
    await syncCatalog(db, extended);
    expect(await db.$count(episodes)).toBe(203);
  });
});
