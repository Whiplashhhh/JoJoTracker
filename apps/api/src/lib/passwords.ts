import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id, paramètres recommandés par l'OWASP (m = 19 Mio, t = 2, p = 1).
 * `Algorithm.Argon2id` vaut 2 (const enum non importable avec isolatedModules).
 */
const ARGON2_OPTIONS = {
  algorithm: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Vérification factice pour les pseudos inconnus : le temps de réponse ne révèle pas
 * l'existence d'un compte.
 */
export async function dummyVerify(password: string): Promise<false> {
  dummyHash ??= hashPassword('jojo-tracker-dummy-password');
  await verifyPassword(await dummyHash, password);
  return false;
}
