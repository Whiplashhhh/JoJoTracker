import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadCatalog } from '../src/catalog/index.js';
import { Client, setupApp, uniqueName, type TestEnv } from './helpers.js';
import { encodings, spoilerTitles } from './spoilers.js';

let env: TestEnv;
beforeAll(async () => {
  env = await setupApp();
});
afterAll(async () => {
  await env.close();
});

const catalog = loadCatalog();
const titles = spoilerTitles();

function leakedTitles(raw: string, allowedIds: readonly string[] = []): string[] {
  return titles
    .filter((t) => !allowedIds.includes(t.id))
    .filter((t) => encodings(t.title).some((enc) => raw.includes(enc)))
    .map((t) => `${t.id}: ${t.title}`);
}

function titleOf(id: string): string {
  const ep = catalog.episodes.find((e) => e.id === id);
  const title = ep?.titleFr ?? ep?.titleEn;
  if (!title) throw new Error(`pas de titre pour ${id}`);
  return title;
}

async function newUser(): Promise<Client> {
  const client = new Client(env.app);
  await client.register(uniqueName('anti'));
  return client;
}

describe('anti-spoil : le serveur ne divulgue jamais un titre non vu', () => {
  it('a bien des titres à protéger dans le catalogue', () => {
    expect(titles.length).toBeGreaterThan(300);
  });

  it('le catalogue d’un nouvel utilisateur ne contient aucun titre (JSON brut)', async () => {
    const client = await newUser();
    const res = await client.get('/api/catalog');
    expect(res.statusCode).toBe(200);
    expect(leakedTitles(res.body)).toEqual([]);
    const body = res.json();
    expect(body.episodes).toHaveLength(202);
    for (const ep of body.episodes) {
      expect(ep.title).toBeNull();
      expect(ep.titleHidden).toBe(true);
      expect(Object.keys(ep).sort()).toEqual(
        [
          'airDate',
          'id',
          'numberInPart',
          'officialNumber',
          'partNumber',
          'season',
          'title',
          'titleHidden',
          'watched',
          'watchedAt',
        ].sort(),
      );
    }
  });

  it('cocher l’épisode N ne renvoie que le titre de N, jamais celui de N+1', async () => {
    const client = await newUser();
    const res = await client.setWatched(['p3-e14']);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.episodes).toHaveLength(1);
    expect(body.episodes[0]).toMatchObject({ id: 'p3-e14', watched: true, titleHidden: false });
    expect(body.episodes[0].title).toBe(titleOf('p3-e14'));
    expect(leakedTitles(res.body, ['p3-e14'])).toEqual([]);

    const cat = await client.get('/api/catalog');
    expect(leakedTitles(cat.body, ['p3-e14'])).toEqual([]);
    const next = cat.json().episodes.find((e: { id: string }) => e.id === 'p3-e15');
    expect(next).toMatchObject({ title: null, titleHidden: true, watched: false });
  });

  it('décocher un épisode re-masque son titre', async () => {
    const client = await newUser();
    await client.setWatched(['p1-e3']);
    const res = await client.setWatched(['p1-e3'], false);
    expect(res.json().episodes[0]).toMatchObject({ id: 'p1-e3', title: null, titleHidden: true });
    expect(leakedTitles(res.body)).toEqual([]);
    expect(leakedTitles((await client.get('/api/catalog')).body)).toEqual([]);
  });

  it('marquer plusieurs épisodes ne révèle que ceux-là', async () => {
    const client = await newUser();
    const ids = ['p2-e1', 'p2-e2', 'p2-e3'];
    const res = await client.setWatched(ids);
    expect(res.json().episodes.map((e: { id: string }) => e.id)).toEqual(ids);
    expect(leakedTitles(res.body, ids)).toEqual([]);
    expect(leakedTitles((await client.get('/api/catalog')).body, ids)).toEqual([]);
  });

  it('mode anti-spoil désactivé : tous les titres sont renvoyés ; réactivé : de nouveau masqués', async () => {
    const client = await newUser();
    await client.patch('/api/me/settings', { antiSpoil: false });
    const open = await client.get('/api/catalog');
    const openBody = open.json();
    expect(openBody.antiSpoil).toBe(false);
    for (const ep of openBody.episodes) {
      const source = catalog.episodes.find((e) => e.id === ep.id);
      expect(ep.titleHidden).toBe(false);
      expect(ep.title).toBe(source?.titleFr ?? source?.titleEn ?? null);
    }
    await client.patch('/api/me/settings', { antiSpoil: true });
    expect(leakedTitles((await client.get('/api/catalog')).body)).toEqual([]);
  });

  it('la révélation volontaire ne renvoie qu’un titre et n’est pas persistée', async () => {
    const client = await newUser();
    const res = await client.post('/api/episodes/p4-e10/reveal');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: 'p4-e10', title: titleOf('p4-e10') });
    expect(leakedTitles(res.body, ['p4-e10'])).toEqual([]);
    expect(res.headers['cache-control']).toBe('no-store');
    const cat = await client.get('/api/catalog');
    expect(leakedTitles(cat.body)).toEqual([]);
  });

  it('ne divulgue aucun titre dans les messages d’erreur', async () => {
    const client = await newUser();
    const responses = [
      await client.setWatched(['p7-e12']),
      await client.setWatched(['p99-e1']),
      await client.post('/api/episodes/p99-e1/reveal'),
      await client.put('/api/watched', { watched: true, items: [{ episodeId: 'nope' }] }),
    ];
    for (const res of responses) {
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
      expect(leakedTitles(res.body)).toEqual([]);
    }
  });

  it('l’export ne contient aucun titre', async () => {
    const client = await newUser();
    await client.setWatched(['p1-e1']);
    const res = await client.get('/api/me/export');
    expect(leakedTitles(res.body)).toEqual([]);
  });

  it('un utilisateur ne voit pas les titres révélés par un autre', async () => {
    const alice = await newUser();
    const bob = await newUser();
    await alice.setWatched(['p5-e1', 'p5-e2']);
    expect(leakedTitles((await bob.get('/api/catalog')).body)).toEqual([]);
  });
});
