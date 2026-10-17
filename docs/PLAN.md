# Plan de réalisation — JoJo Tracker

Légende : `[x]` fait · `[ ]` à faire · `[~]` partiel (voir RAPPORT.md)

## Phase 1 — Cadrage

- [x] PLAN.md, DECISIONS.md
- [x] Monorepo pnpm (apps/api, apps/web, packages/shared), TypeScript strict
- [x] Outillage : ESLint, Prettier, Vitest, scripts racine (`lint`, `typecheck`, `test`, `build`, `dev`)

## Phase 2 — Catalogue

- [~] Collecte des titres (Wikipédia FR/EN, JoJo Wiki) et dates de diffusion — via extraits de recherche, voir CATALOGUE_SOURCES.md
- [x] `apps/api/src/catalog/episodes.json` + schéma zod
- [x] Tests de validation (comptes par partie, ids uniques, numérotation continue)

## Phase 3 — Back-end

- [x] Configuration (zod) et logs pino
- [x] Schéma Drizzle, migrations générées, migration automatique au démarrage
- [x] Upsert idempotent du catalogue
- [x] Auth : inscription (code d'invitation, fermeture), connexion, sessions hashées, déconnexion
- [x] Sécurité : helmet/CSP, CSRF par Origin, rate limiting, trustProxy, erreurs homogènes
- [x] Endpoints de suivi (catalogue anti-spoil, cocher/décocher, masse, révélation)
- [x] Profil : mot de passe, déconnexion partout, export, suppression, réglages
- [x] Tests d'intégration (PGlite) et tests anti-spoil

## Phase 4 — Front-end fonctionnel

- [x] Routing, client API typé, auth
- [x] Accueil, Parties, Détail de partie, Profil
- [x] Mises à jour optimistes, toasts « Annuler », bottom sheet des épisodes précédents
- [x] PWA : manifest, icônes, écrans de démarrage iOS, service worker, invitations, hors-ligne, mise à jour

## Phase 5 — Direction artistique

- [x] Tokens, palettes par partie, typographie auto-hébergée, trames
- [x] Micro-interactions (tampon, ドン！, révélation, ゴゴゴ)
- [x] Célébration « TO BE CONTINUED »
- [x] prefers-reduced-motion

## Phase 6 — Itération visuelle

- [x] Passe 1 : captures 375×812 + 1280×800, critique, corrections
- [x] Passe 2 : captures, critique, corrections
- [x] Captures finales dans `docs/screenshots/`

## Phase 7 — Docker

- [x] Dockerfile multi-étapes, .dockerignore, docker-compose.yml, .env.example
- [~] Vérification de bout en bout — Docker indisponible : chaque étape du Dockerfile rejouée localement, bundle de prod validé contre PostgreSQL 18 réel + smoke test

## Phase 8 — Revue finale

- [x] Audit sécurité
- [x] Audit anti-spoil
- [x] Revue de code
- [x] Corrections

## Phase 9 — Documentation

- [x] README, SPECS, DECISIONS, RAPPORT
- [x] Commit final et push

## Passes de revue visuelle (résumé)

- **Passe 1** : censure invisible sur la carte noire, célébration peu lisible, pseudo coupé dans le profil, écran hors ligne bloqué en squelette (requêtes en pause hors ligne), pluriel fautif, libellés de jauge illisibles → corrigés.
- **Passe 2** : écran hors ligne trop plat, en-têtes de partie à enrichir, profil desktop à trous (colonnes), brand tronqué sur desktop, illustration iOS trop pauvre, défilement conservé entre pages → corrigés.
- **Passe 3** (captures finales) : flèche TO BE CONTINUED masquée par le toast « Annuler » → repositionnée.
