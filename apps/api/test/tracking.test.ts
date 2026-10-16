import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, setupApp, uniqueName, type TestEnv } from './helpers.js';

let env: TestEnv;
beforeAll(async () => {
  env = await setupApp();
});
afterAll(async () => {
  await env.close();
});

interface Ep {
  id: string;
  watched: boolean;
  watchedAt: string | null;
  airDate: string | null;
}

async function newUser(): Promise<Client> {
  const client = new Client(env.app);
  await client.register(uniqueName('track'));
  return client;
}

async function catalogOf(client: Client): Promise<{ today: string; episodes: Ep[] }> {
  return (await client.get('/api/catalog')).json();
}

describe('suivi des épisodes', () => {
  it('renvoie le catalogue complet, trié, avec la date du jour serveur', async () => {
    const client = await newUser();
    const body = await catalogOf(client);
    expect(body.today).toBe('2026-10-16');
    expect(body.episodes).toHaveLength(202);
    expect(body.episodes[0]?.id).toBe('p1-e1');
    expect(body.episodes.at(-1)?.id).toBe('p7-e12');
  });

  it('coche puis décoche un épisode, avec la date de cochage', async () => {
    const client = await newUser();
    const res = await client.setWatched(['p1-e1']);
    expect(res.json().episodes[0]).toMatchObject({
      id: 'p1-e1',
      watched: true,
      watchedAt: '2026-10-16T10:00:00.000Z',
    });
    expect((await catalogOf(client)).episodes.find((e) => e.id === 'p1-e1')?.watched).toBe(true);
    const off = await client.setWatched(['p1-e1'], false);
    expect(off.json().episodes[0]).toMatchObject({ watched: false, watchedAt: null });
  });

  it('est idempotent et conserve la date d’origine lors d’un nouveau cochage', async () => {
    const client = await newUser();
    await client.setWatched(['p1-e2']);
    const start = env.clock.now;
    env.clock.now = new Date(start.getTime() + 3_600_000);
    try {
      const again = await client.setWatched(['p1-e2']);
      expect(again.json().episodes[0].watchedAt).toBe(start.toISOString());
    } finally {
      env.clock.now = start;
    }
  });

  it('restaure une date de cochage d’origine (annulation)', async () => {
    const client = await newUser();
    const res = await client.put('/api/watched', {
      watched: true,
      items: [{ episodeId: 'p1-e4', watchedAt: '2026-01-02T03:04:05.000Z' }],
    });
    expect(res.json().episodes[0].watchedAt).toBe('2026-01-02T03:04:05.000Z');
    const future = await client.put('/api/watched', {
      watched: true,
      items: [{ episodeId: 'p1-e5', watchedAt: '2030-01-01T00:00:00.000Z' }],
    });
    expect(future.json().episodes[0].watchedAt).toBe('2026-10-16T10:00:00.000Z');
  });

  it('marque et réinitialise une partie entière (action de masse)', async () => {
    const client = await newUser();
    const part1 = (await catalogOf(client)).episodes.filter((e) => e.id.startsWith('p1-'));
    const ids = part1.map((e) => e.id);
    const res = await client.setWatched(ids);
    expect(res.json().episodes).toHaveLength(9);
    expect((await catalogOf(client)).episodes.filter((e) => e.watched)).toHaveLength(9);
    await client.setWatched(ids, false);
    expect((await catalogOf(client)).episodes.filter((e) => e.watched)).toHaveLength(0);
  });

  it('refuse de cocher un épisode pas encore diffusé', async () => {
    const client = await newUser();
    const res = await client.setWatched(['p7-e6']);
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('NOT_AIRED');
    expect((await client.setWatched(['p7-e5'])).statusCode).toBe(200);
  });

  it('accepte l’épisode le jour de sa sortie (fuseau Europe/Paris)', async () => {
    const client = await newUser();
    const start = env.clock.now;
    env.clock.now = new Date('2026-10-22T22:30:00Z'); // 23/10 00:30 à Paris
    try {
      expect((await client.setWatched(['p7-e6'])).statusCode).toBe(200);
    } finally {
      env.clock.now = start;
    }
  });

  it('valide les identifiants et rejette les épisodes inconnus', async () => {
    const client = await newUser();
    expect((await client.setWatched(['p99-e1'])).statusCode).toBe(404);
    expect((await client.put('/api/watched', { watched: true, items: [] })).statusCode).toBe(400);
    expect(
      (await client.put('/api/watched', { watched: true, items: [{ episodeId: "p1-e1' or 1=1" }] }))
        .statusCode,
    ).toBe(400);
  });

  it('isole les données entre utilisateurs', async () => {
    const alice = await newUser();
    const bob = await newUser();
    await alice.setWatched(['p3-e1', 'p3-e2']);
    expect((await catalogOf(bob)).episodes.filter((e) => e.watched)).toEqual([]);
    await bob.setWatched(['p3-e1'], false);
    expect((await catalogOf(alice)).episodes.filter((e) => e.watched).map((e) => e.id)).toEqual([
      'p3-e1',
      'p3-e2',
    ]);
    const exported = (await bob.get('/api/me/export')).json();
    expect(exported.watched).toEqual([]);
  });
});
