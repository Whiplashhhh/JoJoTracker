# Journal des décisions

Chaque entrée : **contexte → décision → alternatives écartées**.

## D01 — Versions des dépendances
- **Contexte** : le cahier des charges impose des versions stables, récentes, publiées depuis au moins deux semaines (date de travail : 16/10/2026).
- **Décision** : script de sélection interrogeant le registre npm (version stable la plus haute publiée avant le 02/10/2026), versions exactes (`save-exact`). Exceptions volontaires :
  - **TypeScript 6.0.3** et non 7.0.x : `typescript-eslint` 8.71 ne supporte que `<6.1`.
  - **pnpm 10.34.6** (branche 10 maintenue) plutôt que 11/12 : comportement connu de `pnpm deploy`, `onlyBuiltDependencies`, lockfile v9.
  - Images Docker : `node:24.21.0-alpine3.24` (Node 24 LTS « Krypton », dernière publiée avant le 02/10) et `postgres:18-alpine` (majeure épinglée).
- **Écarté** : `latest`, plages `^`.

## D02 — Monorepo et build de l'API
- **Contexte** : `packages/shared` est écrit en TypeScript et partagé par l'API et le front.
- **Décision** : `shared` est consommé en source (`exports: ./src/index.ts`) ; Vite le compile côté front, et l'API est bundlée par **esbuild** (seul `@jojo/shared` est embarqué, les dépendances npm restent externes et sont installées via `pnpm deploy --prod`).
- **Écarté** : compilation `tsc` de chaque paquet avec conditions d'export (plus de configuration, aucun gain ici).

## D03 — Polices
- **Contexte** : *Dela Gothic One* japonais pèse ~1 Mo en woff2 ; on n'utilise qu'une poignée de katakana.
- **Décision** : script reproductible (`apps/web/scripts/subset-fonts.mjs`, `subset-font`/HarfBuzz) qui génère un sous-ensemble (katakana, ponctuation japonaise, latin de base) de quelques Ko, versionné. Latin : *Anton* (titres, condensée et massive), *Archivo* variable (corps, très lisible). Toutes sous licence OFL, auto-hébergées.
- **Écarté** : charger tout le fichier japonais (lourd, précache du service worker gonflé), polices système (pas le caractère voulu).
