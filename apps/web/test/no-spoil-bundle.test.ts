import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { DIST, listFiles, requireDist } from './dist.js';

interface Catalog {
  parts: { name: string; seasons: { name: string }[] }[];
  episodes: { id: string; titleFr: string | null; titleEn: string | null }[];
}

/** Catalogue serveur (lu directement sur disque : il n'est jamais importé par le front). */
const catalog = JSON.parse(
  readFileSync(new URL('../../api/src/catalog/episodes.json', import.meta.url), 'utf8'),
) as Catalog;

/**
 * Les titres identiques à un nom officiel de partie/saison (ex. « Stone Ocean ») sont publics
 * par conception et peuvent légitimement apparaître : ils sont exclus du scan.
 */
const publicNames = new Set(
  catalog.parts
    .flatMap((p) => [p.name, ...p.seasons.map((s) => s.name)])
    .map((n) => n.toLowerCase()),
);
const titles = catalog.episodes.flatMap((e) =>
  [e.titleFr, e.titleEn]
    .filter((t): t is string => t !== null && !publicNames.has(t.toLowerCase()))
    .map((title) => ({ id: e.id, title })),
);

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Recherche « mot entier » (insensible à la casse) d'un titre et de ses variantes encodées. */
function patterns(title: string): RegExp[] {
  const variants = new Set([
    title,
    JSON.stringify(title).slice(1, -1),
    title.replace(/'/g, '&#39;').replace(/&/g, '&amp;'),
    title.replace(/[^\x20-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`),
  ]);
  return [...variants].map(
    (v) => new RegExp(`(?<![\\p{L}\\p{N}])${escape(v)}(?![\\p{L}\\p{N}])`, 'iu'),
  );
}

beforeAll(() => {
  requireDist();
});

describe('anti-spoil : aucun titre d’épisode dans le build du front', () => {
  it('a des titres à rechercher', () => {
    expect(titles.length).toBeGreaterThan(300);
  });

  it('ne contient aucun titre (FR ou EN) dans les fichiers de dist/', () => {
    const files = listFiles(DIST).filter((f) =>
      /\.(js|css|html|json|webmanifest|svg|txt|map)$/.test(f),
    );
    expect(files.length).toBeGreaterThan(5);
    const leaks: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      for (const { id, title } of titles) {
        if (patterns(title).some((re) => re.test(content))) {
          leaks.push(`${relative(DIST, file)} → ${id} « ${title} »`);
        }
      }
    }
    expect(leaks).toEqual([]);
  });

  it('ne contient pas le fichier de catalogue serveur', () => {
    for (const file of listFiles(DIST)) {
      const content = readFileSync(file);
      expect(content.includes('"titleFr"'), relative(DIST, file)).toBe(false);
      expect(content.includes('"titleEn"'), relative(DIST, file)).toBe(false);
    }
  });
});
