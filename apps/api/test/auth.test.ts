import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sessions, users, watchedEpisodes } from '../src/db/schema.js';
import { Client, PASSWORD, setupApp, uniqueName, type TestEnv } from './helpers.js';

let env: TestEnv;
beforeAll(async () => {
  env = await setupApp();
});
afterAll(async () => {
  await env.close();
});

describe('inscription', () => {
  it('crée le compte, ouvre une session (cookie HttpOnly, SameSite=Lax) et renvoie le profil', async () => {
    const client = new Client(env.app);
    const name = uniqueName('Jonathan');
    const res = await client.register(name);
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ user: { username: name }, settings: { antiSpoil: true } });
    const cookie = res.cookies.find((c) => c.name === 'jojo_session');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('Lax');
    expect(cookie?.path).toBe('/');
    expect(cookie?.maxAge).toBe(30 * 24 * 3600);
    const me = await client.get('/api/me');
    expect(me.statusCode).toBe(200);
    expect(me.json().user.username).toBe(name);
  });

  it('refuse un pseudo déjà pris, sans tenir compte de la casse', async () => {
    const name = uniqueName('Joseph');
    expect((await new Client(env.app).register(name)).statusCode).toBe(201);
    const res = await new Client(env.app).register(name.toUpperCase());
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('USERNAME_TAKEN');
  });

  it('valide le pseudo et le mot de passe', async () => {
    const client = new Client(env.app);
    const bad = await client.register('a b');
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error.code).toBe('VALIDATION_ERROR');
    expect(bad.json().error.fields.username).toBeTruthy();
    const short = await client.register(uniqueName(), 'court');
    expect(short.statusCode).toBe(400);
    expect(short.json().error.fields.password).toMatch(/10/);
  });

  it('stocke le mot de passe en Argon2id', async () => {
    const name = uniqueName();
    await new Client(env.app).register(name);
    const [row] = await env.db.select().from(users).where(eq(users.username, name));
    expect(row?.passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(row?.passwordHash).not.toContain(PASSWORD);
  });
});

describe('connexion et sessions', () => {
  it('renvoie le même message générique pour un pseudo inconnu ou un mauvais mot de passe', async () => {
    const name = uniqueName();
    await new Client(env.app).register(name);
    const wrong = await new Client(env.app).login(name, 'mauvais-mot-de-passe');
    const unknown = await new Client(env.app).login(uniqueName('ghost'), 'mauvais-mot-de-passe');
    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(wrong.json()).toEqual(unknown.json());
    expect(wrong.json().error.code).toBe('INVALID_CREDENTIALS');
  });

  it('accepte le pseudo quelle que soit la casse', async () => {
    const name = uniqueName('Caesar');
    await new Client(env.app).register(name);
    expect((await new Client(env.app).login(name.toLowerCase())).statusCode).toBe(200);
  });

  it('stocke le jeton de session hashé en SHA-256', async () => {
    const client = new Client(env.app);
    const name = uniqueName();
    await client.register(name);
    const token = client.cookie?.split('=')[1] ?? '';
    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
    const [user] = await env.db.select().from(users).where(eq(users.username, name));
    const rows = await env.db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, user?.id ?? ''));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(createHash('sha256').update(token).digest('hex'));
    expect(rows[0]?.id).not.toBe(token);
  });

  it('fait tourner le jeton à la connexion', async () => {
    const client = new Client(env.app);
    const name = uniqueName();
    await client.register(name);
    const before = client.cookie;
    await client.login(name);
    expect(client.cookie).not.toBe(before);
    const stale = new Client(env.app);
    stale.cookie = before;
    expect((await stale.get('/api/me')).statusCode).toBe(401);
    expect((await client.get('/api/me')).statusCode).toBe(200);
  });

  it('émet un cookie de session navigateur sans « rester connectée »', async () => {
    const name = uniqueName();
    await new Client(env.app).register(name);
    const res = await new Client(env.app).login(name, PASSWORD, false);
    const cookie = res.cookies.find((c) => c.name === 'jojo_session');
    expect(cookie?.maxAge).toBeUndefined();
    expect(cookie?.expires).toBeUndefined();
  });

  it('expire après 30 jours sans activité et glisse avec l’activité', async () => {
    const client = new Client(env.app);
    await client.register(uniqueName());
    const start = env.clock.now;
    try {
      env.clock.now = new Date(start.getTime() + 20 * 86_400_000);
      expect((await client.get('/api/me')).statusCode).toBe(200);
      env.clock.now = new Date(start.getTime() + 40 * 86_400_000);
      expect((await client.get('/api/me')).statusCode).toBe(200);
      env.clock.now = new Date(start.getTime() + 71 * 86_400_000);
      expect((await client.get('/api/me')).statusCode).toBe(401);
    } finally {
      env.clock.now = start;
    }
  });

  it('déconnecte et invalide la session côté serveur', async () => {
    const client = new Client(env.app);
    await client.register(uniqueName());
    const token = client.cookie;
    expect((await client.post('/api/auth/logout')).statusCode).toBe(204);
    const replay = new Client(env.app);
    replay.cookie = token;
    expect((await replay.get('/api/me')).statusCode).toBe(401);
  });

  it('exige une session sur les routes protégées', async () => {
    const anonymous = new Client(env.app);
    for (const url of ['/api/me', '/api/catalog', '/api/me/export']) {
      const res = await anonymous.get(url);
      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe('UNAUTHENTICATED');
    }
  });
});

describe('profil', () => {
  it('change le mot de passe et invalide les autres sessions', async () => {
    const name = uniqueName();
    const phone = new Client(env.app);
    await phone.register(name);
    const laptop = new Client(env.app);
    await laptop.login(name);

    const wrong = await phone.post('/api/me/password', {
      currentPassword: 'pas-le-bon-mdp',
      newPassword: 'nouveau-mot-de-passe',
    });
    expect(wrong.statusCode).toBe(400);

    const ok = await phone.post('/api/me/password', {
      currentPassword: PASSWORD,
      newPassword: 'nouveau-mot-de-passe',
    });
    expect(ok.statusCode).toBe(204);
    expect((await phone.get('/api/me')).statusCode).toBe(200);
    expect((await laptop.get('/api/me')).statusCode).toBe(401);
    expect((await new Client(env.app).login(name)).statusCode).toBe(401);
    expect((await new Client(env.app).login(name, 'nouveau-mot-de-passe')).statusCode).toBe(200);
  });

  it('déconnecte partout', async () => {
    const name = uniqueName();
    const a = new Client(env.app);
    await a.register(name);
    const b = new Client(env.app);
    await b.login(name);
    expect((await a.post('/api/me/logout-all')).statusCode).toBe(204);
    expect((await a.get('/api/me')).statusCode).toBe(401);
    expect((await b.get('/api/me')).statusCode).toBe(401);
  });

  it('exporte les données en JSON', async () => {
    const client = new Client(env.app);
    const name = uniqueName();
    await client.register(name);
    await client.setWatched(['p1-e1', 'p1-e2']);
    const res = await client.get('/api/me/export');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment');
    const data = res.json();
    expect(data).toMatchObject({
      format: 'jojo-tracker-export',
      version: 1,
      user: { username: name },
    });
    expect(data.watched.map((w: { episodeId: string }) => w.episodeId)).toEqual(['p1-e1', 'p1-e2']);
    expect(JSON.stringify(data)).not.toContain('password');
  });

  it('supprime le compte après confirmation du pseudo, en cascade', async () => {
    const client = new Client(env.app);
    const name = uniqueName();
    await client.register(name);
    await client.setWatched(['p1-e1']);
    const [user] = await env.db.select().from(users).where(eq(users.username, name));

    const mismatch = await client.delete('/api/me', { confirmUsername: 'quelqu-un-d-autre' });
    expect(mismatch.statusCode).toBe(400);
    expect(mismatch.json().error.code).toBe('CONFIRMATION_MISMATCH');

    expect((await client.delete('/api/me', { confirmUsername: name })).statusCode).toBe(204);
    expect((await client.get('/api/me')).statusCode).toBe(401);
    expect((await new Client(env.app).login(name)).statusCode).toBe(401);
    const id = user?.id ?? '';
    expect(
      await env.db.select().from(watchedEpisodes).where(eq(watchedEpisodes.userId, id)),
    ).toEqual([]);
    expect(await env.db.select().from(sessions).where(eq(sessions.userId, id))).toEqual([]);
  });

  it('met à jour le réglage anti-spoil', async () => {
    const client = new Client(env.app);
    await client.register(uniqueName());
    const res = await client.patch('/api/me/settings', { antiSpoil: false });
    expect(res.json()).toEqual({ antiSpoil: false });
    expect((await client.get('/api/me')).json().settings.antiSpoil).toBe(false);
    expect((await client.patch('/api/me/settings', { hack: true })).statusCode).toBe(400);
  });
});

describe('santé et en-têtes', () => {
  it('répond sur /api/health', async () => {
    const res = await env.app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('pose une CSP stricte et interdit la mise en cache des réponses API', async () => {
    const res = await env.app.inject({ method: 'GET', url: '/api/auth/config' });
    const csp = String(res.headers['content-security-policy']);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toMatch(/https?:\/\//);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('renvoie des erreurs JSON homogènes pour les routes inconnues', async () => {
    const res = await env.app.inject({ method: 'GET', url: '/api/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'Ressource introuvable.' } });
  });

  it('rejette un JSON malformé sans exposer de détail interne', async () => {
    const res = await env.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { origin: 'http://jojo.test', 'content-type': 'application/json' },
      payload: '{"username":',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: { code: 'BAD_REQUEST', message: 'Requête invalide.' } });
  });
});
