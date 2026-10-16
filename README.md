# JoJo Tracker ゴゴゴゴ

Suivi d'avancement **sans spoil** de l'anime _JoJo's Bizarre Adventure_, pensé pour le téléphone et installable comme une appli (PWA).

On coche les épisodes vus, on sait où on en est… et on ne voit **jamais** le titre d'un épisode pas encore regardé : le serveur ne l'envoie tout simplement pas.

<p align="center">
  <img src="docs/screenshots/mobile-connexion.png" width="200" alt="Écran de connexion">
  <img src="docs/screenshots/mobile-accueil-en-cours.png" width="200" alt="Accueil avec progression et carte Reprendre">
  <img src="docs/screenshots/mobile-partie-en-cours.png" width="200" alt="Détail d'une partie">
  <img src="docs/screenshots/mobile-celebration.png" width="200" alt="Célébration de fin de partie">
</p>

## Fonctionnalités

- Comptes pseudo + mot de passe (sans e-mail), code d'invitation optionnel, inscriptions fermables.
- Catalogue des 7 parties (202 épisodes au 16/10/2026, _Steel Ball Run_ en cours de diffusion).
- Cochage en un tap avec mise à jour optimiste, toast « Annuler », proposition de marquer les épisodes précédents, actions de masse par partie, épisodes à venir non cochables.
- **Anti-spoil** : bande censurée à la place des titres non vus, révélation du seul épisode coché, révélation volontaire confirmée et non persistée, mode désactivable.
- Interface manga : palette par partie, trames, onomatopées, tampon « VU », célébration « TO BE CONTINUED » en sépia, `prefers-reduced-motion` respecté.
- PWA : installable sur Android et iOS, hors ligne (écran dédié), mise à jour contrôlée, raccourcis.
- Profil : mot de passe, déconnexion partout, export JSON, suppression du compte.

Documentation détaillée : [`docs/SPECS.md`](docs/SPECS.md) (fonctionnel, écran par écran), [`docs/DECISIONS.md`](docs/DECISIONS.md), [`docs/PLAN.md`](docs/PLAN.md), [`docs/RAPPORT.md`](docs/RAPPORT.md), [`docs/CATALOGUE_SOURCES.md`](docs/CATALOGUE_SOURCES.md).

## Stack

|                             |                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| Monorepo                    | pnpm workspaces, TypeScript `strict` partout                                                |
| API (`apps/api`)            | Fastify 5, Drizzle ORM, PostgreSQL 18, zod 4, Argon2id, pino                                |
| Front (`apps/web`)          | React 19, Vite 8, React Router 8, TanStack Query 5, Tailwind CSS 4, Motion, vite-plugin-pwa |
| Partagé (`packages/shared`) | contrats d'API (zod), logique de progression — **sans aucun titre**                         |
| Qualité                     | ESLint (typescript-eslint strict), Prettier, Vitest, Playwright                             |
| Déploiement                 | une image Docker (Fastify sert l'API sous `/api` et le front), Postgres en compose          |

## Développement

Prérequis : Node.js ≥ 22.22 et pnpm 10 (`corepack enable` ou `npm i -g pnpm@10.34.6`).

```bash
pnpm install
pnpm dev          # API sur :3000 (PGlite local, aucun Postgres requis) + Vite sur :5173
```

Ouvrir http://localhost:5173. Pour utiliser un vrai PostgreSQL en dev : `DATABASE_URL=postgres://… pnpm dev`.

| Commande                              | Rôle                                                                                                                                                                              |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`                           | ESLint + Prettier (zéro avertissement)                                                                                                                                            |
| `pnpm typecheck`                      | `tsc` sur les trois paquets                                                                                                                                                       |
| `pnpm test`                           | build du front puis Vitest : unitaires, intégration API (PGlite), anti-spoil (JSON + scan du bundle), PWA                                                                         |
| `pnpm build`                          | front (`apps/web/dist`) puis API (`apps/api/dist/server.mjs`)                                                                                                                     |
| `pnpm test:e2e`                       | Playwright mobile (inscription → cochage → annulation → fin de partie → déconnexion, PWA, hors ligne). Première fois : `pnpm --filter @jojo/web exec playwright install chromium` |
| `pnpm --filter @jojo/web screenshots` | captures de tous les écrans (serveur lancé sur :3000)                                                                                                                             |
| `pnpm --filter @jojo/web icons`       | régénère icônes et écrans de démarrage depuis `apps/web/assets-src/`                                                                                                              |
| `pnpm db:generate`                    | génère une migration Drizzle après modification de `apps/api/src/db/schema.ts`                                                                                                    |

## Déploiement sur un VPS (pas à pas)

Prérequis : Docker + plugin Compose, un nom de domaine pointant vers le VPS, un reverse proxy HTTPS (Caddy, Nginx…). **L'installation en PWA exige le HTTPS** (fourni par le reverse proxy).

```bash
# 1. Récupérer le code
git clone https://github.com/Whiplashhhh/JoJoTracker.git jojo-tracker
cd jojo-tracker

# 2. Configurer
cp .env.example .env
nano .env
#   APP_ORIGIN=https://jojo.mon-domaine.fr     ← l'URL publique exacte
#   POSTGRES_PASSWORD=…                         ← openssl rand -base64 32 | tr -d '/+='
#   INVITE_CODE=…                               ← optionnel (openssl rand -base64 18)

# 3. Lancer (build de l'image, migrations et catalogue appliqués automatiquement)
docker compose up -d --build

# 4. Vérifier
docker compose ps                          # app et db « healthy »
docker compose logs -f app                 # « migrations appliquées », « catalogue synchronisé »
./scripts/smoke-test.sh http://127.0.0.1:3000 https://jojo.mon-domaine.fr
```

L'appli écoute sur `127.0.0.1:3000` (modifiable via `APP_BIND` / `APP_PORT`) ; la base n'est pas exposée. Une fois le compte de ta copine créé, tu peux fermer les inscriptions avec `ALLOW_SIGNUP=false` puis `docker compose up -d`.

### Mise à jour

```bash
git pull && docker compose up -d --build
```

Les migrations s'appliquent au démarrage. Les téléphones affichent « Nouvelle version disponible » et rechargent quand on le demande.

### Sauvegarde et restauration

```bash
# Sauvegarde (format compressé)
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > jojo-$(date +%F).dump

# Restauration (écrase les données)
docker compose stop app
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < jojo-AAAA-MM-JJ.dump
docker compose start app
```

Exemple de sauvegarde quotidienne (crontab) : `0 4 * * * cd /chemin/jojo-tracker && docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > backups/jojo-$(date +\%F).dump`.

### Variables d'environnement

Toutes sont documentées dans [`.env.example`](.env.example). L'API refuse de démarrer si la configuration est invalide et indique pourquoi.

## Ajouter ou corriger des épisodes

Le catalogue (avec les titres) vit **uniquement côté serveur** : `apps/api/src/catalog/episodes.json`, validé par un schéma zod au démarrage et par les tests.

1. Ajouter l'épisode dans `episodes` (même partie, numéro suivant), par exemple :
   ```json
   {
     "id": "p7-e13",
     "partNumber": 7,
     "season": null,
     "numberInPart": 13,
     "officialNumber": 13,
     "titleFr": null,
     "titleEn": null,
     "airDate": "2027-01-15"
   }
   ```
   - `id` = `p{partie}-e{numéro}` (stable, ne jamais le changer : la progression y est rattachée) ;
   - titres : français officiel en priorité, sinon anglais officiel, sinon `null` (l'appli affiche « Titre inconnu » une fois l'épisode vu). Ne jamais inventer ;
   - `airDate` : date de sortie (`AAAA-MM-JJ`) ; avant cette date l'épisode est visible mais non cochable.
2. Pour une nouvelle partie : l'ajouter dans `parts` (avec ses `seasons` éventuelles). Une palette est attribuée automatiquement (cycle), à personnaliser dans `apps/web/src/theme/palettes.ts`.
3. Mettre à jour les comptes attendus dans `apps/api/test/catalog.test.ts`, puis `pnpm test`.
4. Commit, puis sur le VPS : `git pull && docker compose up -d --build`. L'upsert au démarrage ajoute/modifie les épisodes sans toucher à la progression (aucun épisode n'est jamais supprimé automatiquement).

## Annexe : reverse proxy

### Caddy (HTTPS automatique)

```caddyfile
jojo.mon-domaine.fr {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3000
}
```

### Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name jojo.mon-domaine.fr;

    ssl_certificate     /etc/letsencrypt/live/jojo.mon-domaine.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jojo.mon-domaine.fr/privkey.pem;

    gzip on;
    gzip_types text/css application/javascript application/json application/manifest+json image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name jojo.mon-domaine.fr;
    return 301 https://$host$request_uri;
}
```

L'appli fait confiance aux en-têtes `X-Forwarded-*` des proxies locaux/privés uniquement (`TRUST_PROXY`), pour que le rate limiting voie la vraie IP sans être contournable.

## Licence et crédits

Projet de fan, non officiel, sans lien avec les ayants droit de _JoJo's Bizarre Adventure_. Aucun visuel officiel : icônes, illustrations et animations sont originales. Polices sous SIL Open Font License : Anton, Archivo, Dela Gothic One (sous-ensemble katakana).
