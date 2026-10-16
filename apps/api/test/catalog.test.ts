import { describe, expect, it } from 'vitest';
import { loadCatalog } from '../src/catalog/index.js';

const EXPECTED_COUNTS: Record<number, number> = { 1: 9, 2: 17, 3: 48, 4: 39, 5: 39, 6: 38, 7: 12 };

describe('catalogue des épisodes', () => {
  const catalog = loadCatalog();

  it('passe la validation zod (ids uniques, numérotation continue, saisons cohérentes)', () => {
    expect(catalog.episodes.length).toBeGreaterThan(0);
  });

  it('contient les 7 parties avec les noms officiels', () => {
    expect(catalog.parts.map((p) => [p.number, p.name])).toEqual([
      [1, 'Phantom Blood'],
      [2, 'Battle Tendency'],
      [3, 'Stardust Crusaders'],
      [4, 'Diamond is Unbreakable'],
      [5, 'Golden Wind'],
      [6, 'Stone Ocean'],
      [7, 'Steel Ball Run'],
    ]);
  });

  it.each(Object.entries(EXPECTED_COUNTS))('partie %s : %i épisodes', (part, count) => {
    expect(catalog.episodes.filter((e) => e.partNumber === Number(part))).toHaveLength(count);
  });

  it('totalise 202 épisodes', () => {
    expect(catalog.episodes).toHaveLength(202);
  });

  it('a des identifiants uniques au format pN-eM', () => {
    const ids = catalog.episodes.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of catalog.episodes) expect(e.id).toBe(`p${e.partNumber}-e${e.numberInPart}`);
  });

  it('numérote chaque partie de 1 à n sans trou', () => {
    for (const part of Object.keys(EXPECTED_COUNTS).map(Number)) {
      const numbers = catalog.episodes
        .filter((e) => e.partNumber === part)
        .map((e) => e.numberInPart)
        .sort((a, b) => a - b);
      expect(numbers).toEqual(numbers.map((_, i) => i + 1));
    }
  });

  it('suit la numérotation officielle de la série 2012 pour les parties 1 et 2', () => {
    const official = (part: number) =>
      catalog.episodes.filter((e) => e.partNumber === part).map((e) => e.officialNumber);
    expect(official(1)).toEqual(Array.from({ length: 9 }, (_, i) => i + 1));
    expect(official(2)).toEqual(Array.from({ length: 17 }, (_, i) => i + 10));
  });

  it('découpe la partie 3 en deux saisons de 24 et la partie 6 en trois lots (12/12/14)', () => {
    const bySeason = (key: string) => catalog.episodes.filter((e) => e.season === key).length;
    expect(bySeason('stardust-crusaders')).toBe(24);
    expect(bySeason('battle-in-egypt')).toBe(24);
    expect(['stone-ocean-1', 'stone-ocean-2', 'stone-ocean-3'].map(bySeason)).toEqual([12, 12, 14]);
  });

  it('date Steel Ball Run : 19/03/2026 puis chaque vendredi du 25/09 au 04/12/2026', () => {
    const sbr = catalog.episodes.filter((e) => e.partNumber === 7);
    expect(sbr[0]?.airDate).toBe('2026-03-19');
    const weekly = sbr.slice(1).map((e) => e.airDate);
    expect(weekly[0]).toBe('2026-09-25');
    expect(weekly.at(-1)).toBe('2026-12-04');
    for (const d of weekly) expect(new Date(`${d}T12:00:00Z`).getUTCDay()).toBe(5);
  });

  it("n'a aucun titre vide ou en double espace", () => {
    for (const e of catalog.episodes) {
      for (const t of [e.titleFr, e.titleEn]) {
        if (t !== null) expect(t).toBe(t.trim().replace(/\s{2,}/g, ' '));
      }
    }
  });
});
