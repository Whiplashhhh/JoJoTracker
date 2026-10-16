import { describe, expect, it } from 'vitest';
import {
  computePartProgress,
  computeProgress,
  isAired,
  justCompletedParts,
  nextStep,
  previousUnwatched,
  type ProgressEpisode,
} from '../src/index.js';

const TODAY = '2026-10-16';

function ep(
  partNumber: number,
  numberInPart: number,
  watched = false,
  airDate: string | null = '2012-10-05',
): ProgressEpisode {
  return { id: `p${partNumber}-e${numberInPart}`, partNumber, numberInPart, airDate, watched };
}

describe('isAired', () => {
  it('considère une date passée ou du jour comme diffusée', () => {
    expect(isAired({ airDate: '2026-10-15' }, TODAY)).toBe(true);
    expect(isAired({ airDate: TODAY }, TODAY)).toBe(true);
  });
  it('considère une date future comme non diffusée', () => {
    expect(isAired({ airDate: '2026-10-17' }, TODAY)).toBe(false);
  });
  it('considère une date inconnue comme diffusée', () => {
    expect(isAired({ airDate: null }, TODAY)).toBe(true);
  });
});

describe('computeProgress', () => {
  it('calcule vus / total / pourcentage arrondi vers le bas', () => {
    const eps = [ep(1, 1, true), ep(1, 2, true), ep(1, 3)];
    expect(computeProgress(eps, TODAY)).toEqual({ watched: 2, total: 3, aired: 3, percent: 66 });
  });
  it("n'affiche 100 % que lorsque tout est vu", () => {
    const eps = Array.from({ length: 202 }, (_, i) => ep(1, i + 1, i < 201));
    expect(computeProgress(eps, TODAY).percent).toBe(99);
    expect(computeProgress([ep(1, 1, true)], TODAY).percent).toBe(100);
  });
  it('gère une liste vide', () => {
    expect(computeProgress([], TODAY)).toEqual({ watched: 0, total: 0, aired: 0, percent: 0 });
  });
  it('compte les épisodes diffusés', () => {
    const eps = [ep(7, 1, false, '2026-03-19'), ep(7, 2, false, '2026-12-04')];
    expect(computeProgress(eps, TODAY).aired).toBe(1);
  });
});

describe('computePartProgress', () => {
  it('détermine les états des parties', () => {
    const eps = [
      ep(1, 1, true),
      ep(1, 2, true),
      ep(2, 1, true),
      ep(2, 2),
      ep(3, 1),
      ep(7, 1, true, '2026-03-19'),
      ep(7, 2, false, '2026-12-04'),
    ];
    expect(computePartProgress(eps, 1, TODAY).status).toBe('completed');
    expect(computePartProgress(eps, 2, TODAY).status).toBe('in-progress');
    expect(computePartProgress(eps, 3, TODAY).status).toBe('not-started');
    expect(computePartProgress(eps, 7, TODAY).status).toBe('up-to-date');
  });
});

describe('nextStep', () => {
  it('renvoie le premier épisode diffusé non vu, toutes parties confondues', () => {
    const eps = [ep(2, 1), ep(1, 2), ep(1, 1, true)];
    expect(nextStep(eps, TODAY)).toEqual({ kind: 'episode', episode: ep(1, 2) });
  });
  it('ignore les trous déjà vus plus loin', () => {
    const eps = [ep(1, 1), ep(1, 2, true), ep(1, 3)];
    const step = nextStep(eps, TODAY);
    expect(step.kind === 'episode' && step.episode.id).toBe('p1-e1');
  });
  it('propose un épisode à venir quand tout le diffusé est vu', () => {
    const eps = [ep(7, 1, true, '2026-03-19'), ep(7, 2, false, '2026-12-04')];
    const step = nextStep(eps, TODAY);
    expect(step.kind).toBe('upcoming');
    expect(step.kind !== 'done' && step.episode.id).toBe('p7-e2');
  });
  it('indique la fin quand tout est vu', () => {
    expect(nextStep([ep(1, 1, true)], TODAY)).toEqual({ kind: 'done' });
  });
});

describe('previousUnwatched', () => {
  const eps = [
    ep(1, 1, true),
    ep(1, 2),
    ep(2, 1),
    ep(2, 2, true),
    ep(2, 3),
    ep(2, 4),
    ep(3, 1),
  ];
  it('liste les épisodes non vus précédents, dans la partie et les parties précédentes', () => {
    expect(previousUnwatched(eps, 'p2-e4', TODAY).map((e) => e.id)).toEqual([
      'p1-e2',
      'p2-e1',
      'p2-e3',
    ]);
  });
  it('renvoie une liste vide pour le premier épisode', () => {
    expect(previousUnwatched(eps, 'p1-e1', TODAY)).toEqual([]);
  });
  it('renvoie une liste vide pour un id inconnu', () => {
    expect(previousUnwatched(eps, 'p9-e9', TODAY)).toEqual([]);
  });
  it('exclut les épisodes non diffusés', () => {
    const list = [ep(7, 1, false, '2026-12-01'), ep(7, 2, false, '2026-10-01')];
    expect(previousUnwatched(list, 'p7-e2', TODAY)).toEqual([]);
  });
});

describe('justCompletedParts', () => {
  it('détecte une partie qui vient d’être terminée', () => {
    const before = [ep(1, 1, true), ep(1, 2), ep(2, 1)];
    const after = [ep(1, 1, true), ep(1, 2, true), ep(2, 1)];
    expect(justCompletedParts(before, after, TODAY)).toEqual([1]);
    expect(justCompletedParts(after, after, TODAY)).toEqual([]);
  });
});
