import { describe, expect, it } from 'vitest';
import { passwordStrength, registerBodySchema, usernameSchema } from '../src/index.js';

describe('passwordStrength', () => {
  it('note les mots de passe de 0 à 4', () => {
    expect(passwordStrength('')).toBe(0);
    expect(passwordStrength('abc')).toBe(1);
    expect(passwordStrength('aaaaaaaaaaaaaaaa')).toBe(1);
    expect(passwordStrength('abcdefghij')).toBe(1);
    expect(passwordStrength('abcdefghi1')).toBe(2);
    expect(passwordStrength('Abcdefghij12')).toBe(3);
    expect(passwordStrength('Correct-Horse-Battery-9')).toBe(4);
  });
});

describe('usernameSchema', () => {
  it('accepte les pseudos valides', () => {
    expect(usernameSchema.parse('Jo_Jo-3')).toBe('Jo_Jo-3');
  });
  it.each(['ab', 'a'.repeat(25), 'jo jo', 'jöjo', 'jo@jo'])('refuse « %s »', (value) => {
    expect(usernameSchema.safeParse(value).success).toBe(false);
  });
});

describe('registerBodySchema', () => {
  it('impose 10 caractères minimum au mot de passe', () => {
    expect(registerBodySchema.safeParse({ username: 'abc', password: '123456789' }).success).toBe(
      false,
    );
    expect(registerBodySchema.parse({ username: 'abc', password: '1234567890' }).remember).toBe(
      true,
    );
  });
});
