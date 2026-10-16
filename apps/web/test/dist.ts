import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DIST = fileURLToPath(new URL('../dist', import.meta.url));

export function requireDist(): void {
  if (!existsSync(join(DIST, 'index.html'))) {
    throw new Error(
      'apps/web/dist absent : lancer `pnpm --filter @jojo/web build` avant les tests.',
    );
  }
}

export function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

export function readDist(path: string): string {
  return readFileSync(join(DIST, path), 'utf8');
}

/** Dimensions d'une image PNG (lecture de l'en-tête IHDR). */
export function pngSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  if (buf.toString('ascii', 1, 4) !== 'PNG') throw new Error(`${path} n'est pas un PNG`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
