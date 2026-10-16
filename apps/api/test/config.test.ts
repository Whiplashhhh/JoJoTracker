import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../src/config.js';

const BASE = {
  APP_ORIGIN: 'https://jojo.example.com',
  DATABASE_URL: 'postgres://u:p@db:5432/jojo',
};

describe('configuration', () => {
  it('applique des valeurs par défaut sûres en production', () => {
    const config = loadConfig(BASE);
    expect(config).toMatchObject({
      nodeEnv: 'production',
      port: 3000,
      cookieSecure: true,
      allowSignup: true,
      inviteCode: undefined,
      sessionTtlDays: 30,
      appOrigin: 'https://jojo.example.com',
    });
  });

  it('refuse de démarrer avec une configuration invalide, avec un message clair', () => {
    expect(() => loadConfig({ APP_ORIGIN: 'pas-une-url' })).toThrow(ConfigError);
    try {
      loadConfig({ APP_ORIGIN: 'pas-une-url', DATABASE_URL: 'mysql://x' });
    } catch (error) {
      expect(String(error)).toContain('APP_ORIGIN');
      expect(String(error)).toContain('DATABASE_URL');
    }
  });

  it('construit DATABASE_URL depuis POSTGRES_* en encodant le mot de passe', () => {
    const config = loadConfig({
      APP_ORIGIN: 'https://jojo.example.com',
      POSTGRES_HOST: 'db',
      POSTGRES_USER: 'jojo',
      POSTGRES_PASSWORD: 'a/b+c=d@e',
      POSTGRES_DB: 'jojo',
    });
    expect(config.databaseUrl).toBe('postgres://jojo:a%2Fb%2Bc%3Dd%40e@db:5432/jojo');
  });

  it('exige les variables POSTGRES_* sans DATABASE_URL', () => {
    expect(() => loadConfig({ APP_ORIGIN: 'https://jojo.example.com' })).toThrow(
      /POSTGRES_PASSWORD/,
    );
  });

  it('traite une chaîne vide comme non définie et normalise APP_ORIGIN', () => {
    const config = loadConfig({
      ...BASE,
      INVITE_CODE: '',
      COOKIE_SECURE: 'false',
      ALLOW_SIGNUP: 'false',
      APP_ORIGIN: 'https://jojo.example.com/',
    });
    expect(config.inviteCode).toBeUndefined();
    expect(config.cookieSecure).toBe(false);
    expect(config.allowSignup).toBe(false);
    expect(config.appOrigin).toBe('https://jojo.example.com');
  });

  it('refuse un code d’invitation trop court', () => {
    expect(() => loadConfig({ ...BASE, INVITE_CODE: 'abc' })).toThrow(/INVITE_CODE/);
  });
});
