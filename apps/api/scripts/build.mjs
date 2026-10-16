// Bundle de production de l'API : seul le code du monorepo (dont @jojo/shared) est embarqué ;
// les dépendances npm restent externes et sont installées par `pnpm deploy --prod`.
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

await build({
  entryPoints: ['src/server.ts'],
  outfile: 'dist/server.mjs',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  external: Object.keys(pkg.dependencies ?? {}),
  logLevel: 'info',
  legalComments: 'none',
});
