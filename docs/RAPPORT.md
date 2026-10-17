# Rapport de fin de chantier — JoJo Tracker

_Travail réalisé en autonomie dans la nuit du 16 au 17 octobre 2026._

## TL;DR — ce que tu as à faire ce matin

```bash
# Sur le VPS
git clone https://github.com/Whiplashhhh/JoJoTracker.git jojo-tracker   # ou `git pull` si déjà cloné
cd jojo-tracker
cp .env.example .env
nano .env        # APP_ORIGIN=https://ton-domaine, POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '/+='), INVITE_CODE conseillé
docker compose up -d --build
docker compose ps                                    # app et db « healthy »
./scripts/smoke-test.sh http://127.0.0.1:3000 https://ton-domaine
```

Puis le reverse proxy HTTPS vers `127.0.0.1:3000` (exemples Caddy/Nginx dans le README). Après la création de son compte, tu peux mettre `ALLOW_SIGNUP=false` et refaire `docker compose up -d`.

⚠️ **Point d'attention principal** : `docker compose up --build` n'a **pas pu être exécuté** ici (pas de Docker). Tout ce qu'il fait a été rejoué étape par étape (voir § 3), mais c'est la première vraie exécution : en cas de souci, `docker compose logs app`.

## 1. Ce qui est fait

| Domaine                                                                                                                                                         | État                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Monorepo pnpm (api / web / shared), TypeScript strict, ESLint strict + Prettier, Vitest, Playwright                                                             | ✅                         |
| Catalogue : 7 parties, 202 épisodes, comptes validés par test, dates _Steel Ball Run_                                                                           | ✅ (titres : voir limites) |
| API : config zod, migrations auto, upsert idempotent, Argon2id, sessions hashées, CSRF, rate limiting, CSP, erreurs homogènes, logs propres, `/api/health`      | ✅                         |
| Anti-spoil côté serveur, révélation volontaire, mode anti-spoil                                                                                                 | ✅                         |
| Front : connexion théâtrale, accueil (progression, Reprendre, couvertures), parties, détail, profil complet                                                     | ✅                         |
| Cochage optimiste, annulation 5 s, épisodes précédents, actions de masse, non-diffusés, date de cochage                                                         | ✅                         |
| DA : 8 palettes (AA testé), trames, onomatopées, tampon, ドン！, révélation, TO BE CONTINUED sépia, reduced-motion                                              | ✅                         |
| PWA : manifest, icônes any/maskable/Apple, 11 écrans de démarrage, raccourcis, SW (NetworkOnly /api), hors ligne, toast de mise à jour, invitations Android/iOS | ✅                         |
| 3 passes de revue visuelle, captures finales dans `docs/screenshots/` (49)                                                                                      | ✅                         |
| Docker multi-étapes non-root + HEALTHCHECK, compose (Postgres 18, healthcheck, port non publié), `.env.example`                                                 | ✅ (non exécuté, cf. § 3)  |
| Revues indépendantes sécurité / anti-spoil / code, corrections                                                                                                  | ✅                         |
| README, SPECS, DECISIONS, PLAN, RAPPORT, CATALOGUE_SOURCES                                                                                                      | ✅                         |

## 2. Ce qui a été vérifié, et comment

- `pnpm lint` (0 erreur, 0 avertissement), `pnpm typecheck`, `pnpm build` (aucun avertissement), `pnpm test` : **131 tests** Vitest au vert (12 fichiers) :
  - unitaires : progression (prochain épisode, pourcentages, précédents non vus, non-diffusés), mot de passe, validation du catalogue (comptes du cahier des charges, ids, numérotation, saisons, dates SBR un vendredi), contrastes WCAG des palettes, configuration ;
  - intégration API sur PostgreSQL (PGlite, mêmes migrations) : inscription, code d'invitation, inscriptions fermées, connexion, rotation, sessions hashées, expiration glissante, déconnexion, changement de mot de passe, déconnexion partout, export, suppression en cascade, cochage/décochage, restauration de date, action de masse, non-diffusés, fuseau Europe/Paris, isolation entre utilisateurs, rate limiting (IP, IPv6 /64, par pseudo), CSRF (dont chemins encodés), en-têtes, upsert (idempotence, renommage de saison) ;
  - **anti-spoil** : JSON brut sans aucun titre non vu (y compris erreurs, export, révélation), cocher N ne renvoie que N, mode désactivé = tous les titres, **scan de tout `apps/web/dist`** (FR + EN, échappements, insensible à la casse) ;
  - PWA : manifest (champs, tailles réelles des icônes), balises iOS, écrans de démarrage aux bonnes dimensions, pas d'inline (CSP), service worker (précache, NetworkOnly `/api`, pas de skipWaiting).
- `pnpm test:e2e` : **10 scénarios Playwright** sur Chromium mobile : parcours complet inscription → cocher → feuille des précédents → annuler → partie terminée (animation visible) → déconnexion, carte Reprendre, non-diffusés, DOM/titre/console sans titre non vu, révélation non persistée, **service worker enregistré + critères d'installabilité Chromium sans erreur**, aucune réponse `/api` en cache, écran hors ligne, **aucune violation CSP**, réactivation de l'anti-spoil et changement de compte avec API ralentie sans aucun titre affiché.
- Bundle de production (`apps/api/dist/server.mjs` + `pnpm deploy --prod`) lancé exactement comme dans l'image, contre un **vrai PostgreSQL 18.4** : migrations, catalogue, redémarrage idempotent, arrêt propre sur SIGTERM, commande HEALTHCHECK, message clair si la config est invalide, `scripts/smoke-test.sh` entièrement vert (mot de passe DB avec `/+=`).
- `pnpm audit` : aucune vulnérabilité (prod et dev).
- Revues indépendantes (sous-agents) : sécurité (aucun critique/élevé ; 1 moyen corrigé : contournement du contrôle d'Origin via `/%61pi/…`), revue de code (7 points majeurs corrigés : courses en cochage rapide, relecture du catalogue pendant une écriture, focus des feuilles sur iOS, toast de mise à jour évincé, plantage de l'upsert sur saison renommée, carte Reprendre, purge des caches), audit anti-spoil (voir § 6).

## 3. Ce qui n'a pas pu être vérifié, et pourquoi

| Point                                  | Raison                                                         | Ce qui a été fait à la place                                                                                                                                                                                             |
| -------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docker compose up -d --build`         | Docker absent de l'environnement                               | Chaque étape du Dockerfile rejouée (install figée, builds, `pnpm deploy --prod --legacy`, arborescence `/app`) ; image runtime simulée contre PostgreSQL 18 réel ; compose relu (variables, healthchecks, volume PG 18). |
| Testcontainers                         | idem                                                           | PGlite (PostgreSQL WebAssembly) pour l'intégration + un vrai PostgreSQL pour le smoke test.                                                                                                                              |
| Installation réelle sur iPhone/Android | pas d'appareil                                                 | Critères d'installabilité Chromium vérifiés en E2E ; balises iOS et écrans de démarrage testés ; rendu iOS émulé (UA + `navigator.standalone`).                                                                          |
| Pages sources du catalogue             | réseau restreint (Wikipédia/JoJo Wiki inaccessibles en direct) | Données issues des extraits de recherche des sources demandées, recoupées ; doutes laissés à `null`.                                                                                                                     |
| Navigateurs Playwright officiels       | CDN bloqué                                                     | Chromium 153 via `@sparticuz/chromium` (npm), `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.                                                                                                                                          |

## 4. Limites connues

- **Titres** : 27 titres français de _Stone Ocean_ (ép. 12–38), ceux de _Steel Ball Run_, le titre FR de SC 22/42–44 et quelques titres EN manquent (l'anglais est affiché s'il existe, sinon « Titre inconnu »). La typographie fine (apostrophes, tirets, espaces insécables) n'a pas pu être relue mot à mot. Détails : `docs/CATALOGUE_SOURCES.md`.
- **Steel Ball Run** : dates des épisodes 6 à 11 déduites du rythme hebdomadaire annoncé (vendredis) ; titres à ajouter au fil des sorties (procédure dans le README).
- Rate limiting en mémoire : suppose une seule instance (c'est le cas avec ce compose).
- Le plafond d'échecs par pseudo (20 / 15 min) peut bloquer temporairement la vraie utilisatrice si quelqu'un s'acharne sur son pseudo : compromis assumé contre la force brute.
- Sessions « rester connectée » glissantes sans durée absolue maximale (conforme au cahier des charges).
- Une erreur de cochage hors ligne est refusée (pas de file d'attente) : voulu par le cahier des charges.

## 5. Pistes d'amélioration

1. Compléter les titres manquants (FR _Stone Ocean_, _Steel Ball Run_) et relire la typographie.
2. Ajouter une CI GitHub Actions (lint, typecheck, test, e2e, build Docker).
3. Notifications push à la sortie d'un épisode de _Steel Ball Run_.
4. Rafraîchissement automatique du catalogue (sans rebuild) via un fichier monté en volume.
5. Statistiques (rythme de visionnage, durée totale vue).

## 6. Audit anti-spoil (sous-agent indépendant, tests en boîte noire)

- **Élevé — corrigé** : une expiration de session détectée par `/api/me` (et non par `/api/catalog`) laissait le catalogue en cache ; un second compte sur le même appareil pouvait voir brièvement les titres du premier. → purge systématique (fin de session, connexion, inscription), test E2E dédié avec catalogue ralenti.
- **Moyen — corrigé** : les captures de la doc montraient des titres d'épisodes vus et des pseudos inspirés de personnages. → titres masqués par le script de capture, pseudos neutres, captures régénérées.
- **Bas — corrigé** : autre onglet ouvert pendant la réactivation de l'anti-spoil → `BroadcastChannel`.
- **Bas — corrigé** : faiblesses des tests (échappement HTML dans le mauvais ordre, apostrophe typographique non recherchée) ; ajout de 2 scénarios E2E (réactivation de l'anti-spoil, changement de compte) sans service worker pour pouvoir ralentir l'API.
- Vérifié sain par l'audit : toutes les réponses d'API (y compris erreurs, export, révélation), journaux serveur, build complet (aucun titre, aucun nom de personnage/Stand/lieu, pas de source maps), icônes et écrans de démarrage, onomatopées, stockage navigateur, Cache Storage, console, `aria-label`, titre de page, URL, largeur de la bande censurée.
