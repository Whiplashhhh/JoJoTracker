# Plan de réalisation — JoJo Tracker

Légende : `[x]` fait · `[ ]` à faire · `[~]` partiel (voir RAPPORT.md)

## Phase 1 — Cadrage
- [ ] PLAN.md, DECISIONS.md
- [ ] Monorepo pnpm (apps/api, apps/web, packages/shared), TypeScript strict
- [ ] Outillage : ESLint, Prettier, Vitest, scripts racine (`lint`, `typecheck`, `test`, `build`, `dev`)

## Phase 2 — Catalogue
- [ ] Collecte des titres (Wikipédia FR/EN, JoJo Wiki) et dates de diffusion
- [ ] `apps/api/src/catalog/episodes.json` + schéma zod
- [ ] Tests de validation (comptes par partie, ids uniques, numérotation continue)

## Phase 3 — Back-end
- [ ] Configuration (zod) et logs pino
- [ ] Schéma Drizzle, migrations générées, migration automatique au démarrage
- [ ] Upsert idempotent du catalogue
- [ ] Auth : inscription (code d'invitation, fermeture), connexion, sessions hashées, déconnexion
- [ ] Sécurité : helmet/CSP, CSRF par Origin, rate limiting, trustProxy, erreurs homogènes
- [ ] Endpoints de suivi (catalogue anti-spoil, cocher/décocher, masse, révélation)
- [ ] Profil : mot de passe, déconnexion partout, export, suppression, réglages
- [ ] Tests d'intégration (PGlite) et tests anti-spoil

## Phase 4 — Front-end fonctionnel
- [ ] Routing, client API typé, auth
- [ ] Accueil, Parties, Détail de partie, Profil
- [ ] Mises à jour optimistes, toasts « Annuler », bottom sheet des épisodes précédents
- [ ] PWA : manifest, icônes, écrans de démarrage iOS, service worker, invitations, hors-ligne, mise à jour

## Phase 5 — Direction artistique
- [ ] Tokens, palettes par partie, typographie auto-hébergée, trames
- [ ] Micro-interactions (tampon, ドン！, révélation, ゴゴゴ)
- [ ] Célébration « TO BE CONTINUED »
- [ ] prefers-reduced-motion

## Phase 6 — Itération visuelle
- [ ] Passe 1 : captures 375×812 + 1280×800, critique, corrections
- [ ] Passe 2 : captures, critique, corrections
- [ ] Captures finales dans `docs/screenshots/`

## Phase 7 — Docker
- [ ] Dockerfile multi-étapes, .dockerignore, docker-compose.yml, .env.example
- [ ] Vérification de bout en bout

## Phase 8 — Revue finale
- [ ] Audit sécurité
- [ ] Audit anti-spoil
- [ ] Revue de code
- [ ] Corrections

## Phase 9 — Documentation
- [ ] README, SPECS, DECISIONS, RAPPORT
- [ ] Commit final et push
