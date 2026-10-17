import { afterEach, describe, expect, it } from 'vitest';
import { Client, GENEROUS_LIMITS, ORIGIN, setupApp, uniqueName, type TestEnv } from './helpers.js';

let env: TestEnv | undefined;
afterEach(async () => {
  await env?.close();
  env = undefined;
});

describe('CSRF (vérification de l’en-tête Origin)', () => {
  it('refuse une requête mutante sans Origin ni Referer', async () => {
    env = await setupApp();
    const res = await new Client(env.app, null).register(uniqueName());
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('CSRF');
  });

  it('refuse une origine étrangère', async () => {
    env = await setupApp();
    const res = await new Client(env.app, 'https://evil.example').register(uniqueName());
    expect(res.statusCode).toBe(403);
  });

  it('refuse une requête mutante d’une session valide depuis une autre origine', async () => {
    env = await setupApp();
    const legit = new Client(env.app);
    await legit.register(uniqueName());
    const attacker = new Client(env.app, 'https://evil.example');
    attacker.cookie = legit.cookie;
    expect((await attacker.setWatched(['p1-e1'])).statusCode).toBe(403);
    expect(
      (await attacker.delete('/api/me', { confirmUsername: 'x', password: 'y' })).statusCode,
    ).toBe(403);
  });

  it('ne peut pas être contourné par un chemin encodé (/%61pi/...)', async () => {
    env = await setupApp();
    const legit = new Client(env.app);
    await legit.register(uniqueName());
    for (const url of ['/%61pi/me/settings', '/ap%69/me/settings', '/API/me/settings']) {
      const res = await env.app.inject({
        method: 'PATCH',
        url,
        headers: { origin: 'https://evil.example', cookie: legit.cookie ?? '' },
        payload: { antiSpoil: false },
      });
      expect(res.statusCode, url).toBe(403);
    }
    for (const url of ['/%61pi/me/logout-all', '/%61pi/episodes/p1-e1/reveal']) {
      const res = await env.app.inject({
        method: 'POST',
        url,
        headers: { origin: 'https://evil.example', cookie: legit.cookie ?? '' },
      });
      expect(res.statusCode, url).toBe(403);
    }
    expect((await legit.get('/api/me')).json().settings.antiSpoil).toBe(true);
  });

  it('pose no-store sur les réponses d’API, même via un chemin encodé', async () => {
    env = await setupApp();
    const client = new Client(env.app);
    await client.register(uniqueName());
    for (const url of ['/%61pi/catalog', '/api/catalog', '/api/inconnu']) {
      const res = await env.app.inject({ url, headers: { cookie: client.cookie ?? '' } });
      expect(res.headers['cache-control'], url).toBe('no-store');
    }
  });

  it('accepte un Referer de la bonne origine à défaut d’Origin', async () => {
    env = await setupApp();
    const res = await env.app.inject({
      method: 'POST',
      url: '/api/auth/register',
      headers: { referer: `${ORIGIN}/connexion` },
      payload: { username: uniqueName(), password: 'ora-ora-ora-42' },
    });
    expect(res.statusCode).toBe(201);
  });

  it('laisse passer les requêtes GET', async () => {
    env = await setupApp();
    const res = await env.app.inject({ method: 'GET', url: '/api/auth/config' });
    expect(res.statusCode).toBe(200);
  });
});

describe('limitation de débit', () => {
  it('bloque les tentatives de connexion répétées (429)', async () => {
    env = await setupApp({
      rateLimits: { ...GENEROUS_LIMITS, login: { max: 3, timeWindow: 60_000 } },
    });
    const client = new Client(env.app);
    const codes: number[] = [];
    for (let i = 0; i < 5; i++)
      codes.push((await client.login('inconnu', 'mauvais-mdp')).statusCode);
    expect(codes).toEqual([401, 401, 401, 429, 429]);
    const last = await client.login('inconnu', 'mauvais-mdp');
    expect(last.json().error.code).toBe('RATE_LIMITED');
    expect(last.json().error.message).toMatch(/Réessaie dans/);
  });

  it('bloque les inscriptions répétées (429)', async () => {
    env = await setupApp({
      rateLimits: { ...GENEROUS_LIMITS, register: { max: 2, timeWindow: 60_000 } },
    });
    const client = () => new Client(env!.app);
    expect((await client().register(uniqueName())).statusCode).toBe(201);
    expect((await client().register(uniqueName())).statusCode).toBe(201);
    expect((await client().register(uniqueName())).statusCode).toBe(429);
  });

  it('limite les échecs par pseudo, même depuis des IP différentes', async () => {
    env = await setupApp({
      rateLimits: { ...GENEROUS_LIMITS, loginPerUsername: { max: 3, timeWindow: 60_000 } },
    });
    const name = uniqueName();
    await new Client(env.app).register(name);
    const attempt = (ip: string, password: string) =>
      env!.app.inject({
        method: 'POST',
        url: '/api/auth/login',
        remoteAddress: '127.0.0.1',
        headers: { origin: ORIGIN, 'x-forwarded-for': ip },
        payload: { username: name, password },
      });
    for (let i = 0; i < 3; i++)
      expect((await attempt(`203.0.113.${i}`, 'faux')).statusCode).toBe(401);
    expect((await attempt('203.0.113.50', 'faux')).statusCode).toBe(429);
    // Même le bon mot de passe est refusé pendant le blocage (pas d'oracle).
    expect((await attempt('203.0.113.51', 'ora-ora-ora-42')).statusCode).toBe(429);
    env.clock.now = new Date(env.clock.now.getTime() + 61_000);
    expect((await attempt('203.0.113.52', 'ora-ora-ora-42')).statusCode).toBe(200);
  });

  it('regroupe les adresses IPv6 par /64', async () => {
    const { rateLimitKey } = await import('../src/app.js');
    expect(rateLimitKey({ ip: '2001:db8:1:2:aaaa::1' })).toBe('2001:db8:1:2::/64');
    expect(rateLimitKey({ ip: '2001:db8:1:2:bbbb:cccc:dddd:eeee' })).toBe('2001:db8:1:2::/64');
    expect(rateLimitKey({ ip: '2001:db8::1' })).toBe('2001:db8:0:0::/64');
    expect(rateLimitKey({ ip: '203.0.113.7' })).toBe('203.0.113.7');
    expect(rateLimitKey({ ip: '::ffff:203.0.113.7' })).toBe('::ffff:203.0.113.7');
  });

  it('utilise la vraie IP derrière un proxy de confiance', async () => {
    env = await setupApp({
      rateLimits: { ...GENEROUS_LIMITS, login: { max: 1, timeWindow: 60_000 } },
    });
    const attempt = (ip: string) =>
      env!.app.inject({
        method: 'POST',
        url: '/api/auth/login',
        remoteAddress: '127.0.0.1',
        headers: { origin: ORIGIN, 'x-forwarded-for': ip },
        payload: { username: 'x', password: 'y' },
      });
    expect((await attempt('203.0.113.1')).statusCode).toBe(401);
    expect((await attempt('203.0.113.1')).statusCode).toBe(429);
    expect((await attempt('203.0.113.2')).statusCode).toBe(401);
  });
});

describe('code d’invitation et fermeture des inscriptions', () => {
  it('exige le code d’invitation quand INVITE_CODE est défini', async () => {
    env = await setupApp({ env: { INVITE_CODE: 'menacing-gogogo' } });
    expect((await env.app.inject({ url: '/api/auth/config' })).json()).toEqual({
      signupOpen: true,
      inviteRequired: true,
      sessionDays: 30,
    });
    const without = await new Client(env.app).register(uniqueName());
    expect(without.statusCode).toBe(403);
    expect(without.json().error.code).toBe('INVITE_CODE_INVALID');
    const wrong = await new Client(env.app).register(uniqueName(), undefined, {
      inviteCode: 'menacing',
    });
    expect(wrong.statusCode).toBe(403);
    const ok = await new Client(env.app).register(uniqueName(), undefined, {
      inviteCode: 'menacing-gogogo',
    });
    expect(ok.statusCode).toBe(201);
  });

  it('ferme les inscriptions avec ALLOW_SIGNUP=false', async () => {
    env = await setupApp({ env: { ALLOW_SIGNUP: 'false' } });
    expect((await env.app.inject({ url: '/api/auth/config' })).json()).toEqual({
      signupOpen: false,
      inviteRequired: false,
      sessionDays: 30,
    });
    const res = await new Client(env.app).register(uniqueName());
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('SIGNUP_CLOSED');
  });

  it('pose un cookie __Host- Secure quand COOKIE_SECURE est actif', async () => {
    env = await setupApp({ env: { COOKIE_SECURE: 'true' } });
    const res = await new Client(env.app).register(uniqueName());
    const cookie = res.cookies.find((c) => c.name === '__Host-jojo_session');
    expect(cookie?.secure).toBe(true);
    expect(cookie?.httpOnly).toBe(true);
    expect(String(res.headers['strict-transport-security'])).toContain('max-age');
  });
});
