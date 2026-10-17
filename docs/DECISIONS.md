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

- **Contexte** : _Dela Gothic One_ japonais pèse ~1 Mo en woff2 ; on n'utilise qu'une poignée de katakana.
- **Décision** : script reproductible (`apps/web/scripts/subset-fonts.mjs`, `subset-font`/HarfBuzz) qui génère un sous-ensemble (katakana, ponctuation japonaise, latin de base) de quelques Ko, versionné. Latin : _Anton_ (titres, condensée et massive), _Archivo_ variable (corps, très lisible). Toutes sous licence OFL, auto-hébergées.
- **Écarté** : charger tout le fichier japonais (lourd, précache du service worker gonflé), polices système (pas le caractère voulu).

## D04 — Collecte du catalogue

- **Contexte** : l'environnement de travail n'accédait ni à Wikipédia ni à JoJo Wiki en direct (connexions refusées), seulement à un moteur de recherche.
- **Décision** : titres et dates reconstitués à partir des extraits de recherche des sources demandées (Wikipédia FR/EN, JoJo Wiki), recoupés entre eux, puis vérifications ciblées (P3 ép. 22, 36–37 ; P2 ép. 26). Toute valeur douteuse ou contradictoire est laissée à `null` (jamais inventée). Détail par partie et liste des URL : `docs/CATALOGUE_SOURCES.md`.
- **Conséquences** : 27 titres français de _Stone Ocean_ et ceux de _Steel Ball Run_ manquent (le titre anglais est alors affiché) ; la typographie fine (apostrophes, tirets) mérite une relecture humaine. Procédure de correction dans le README.
- **Écarté** : inventer/traduire des titres manquants, scraper des sites non fiables.

## D05 — Dates de diffusion

- **Décision** : date japonaise (souvent le samedi, diffusion après minuit) pour les parties 1 à 5 ; date de mise en ligne Netflix mondiale pour les lots de la partie 6 et pour la partie 7 (19/03/2026 puis chaque vendredi du 25/09 au 04/12/2026). Un épisode est « diffusé » si sa date est passée ou du jour **dans le fuseau Europe/Paris** (`TZ_CATALOG`), ou si sa date est inconnue (`null`).
- **Écarté** : dates françaises (incomplètes et décalées d'un jour selon les sources).

## D06 — Saisons

- _Stardust Crusaders_ : « Stardust Crusaders » (24) et « Battle in Egypt » (24), noms officiels. _Stone Ocean_ : aucun nom officiel pour les trois lots Netflix → « Stone Ocean (épisodes 1–12 / 13–24 / 25–38) ». Parties 1, 2, 4, 5, 7 : pas de saison (numérotation officielle 2012 conservée en secondaire pour P1/P2 : 1–9 et 10–26).

## D07 — Titres identiques à un nom de partie

- **Contexte** : certains titres d'épisode sont exactement le nom officiel de la partie (« Stone Ocean », « Steel Ball Run », « Golden Wind » en VF).
- **Décision** : ces noms sont publics par conception (affichés partout) ; ils sont exclus des scans anti-spoil (bundle, JSON, DOM). Tous les autres titres sont recherchés, y compris sous forme échappée, sans tenir compte de la casse et en mot entier.

## D08 — Upsert du catalogue sans suppression

- **Décision** : au démarrage, parties, saisons et épisodes sont insérés ou mis à jour (`ON CONFLICT DO UPDATE`), jamais supprimés : une faute de frappe dans le JSON ne peut pas effacer la progression des utilisateurs. Retirer un épisode demande une migration explicite (documenté).

## D09 — Rendu unique, sans bascule clair/sombre

- **Contexte** : le cahier des charges autorise un rendu unique assumé.
- **Décision** : chaque écran est un « numéro » de manga : fond de couleur franche (encre pour l'accueil, palette de la partie ailleurs) et cases en papier crème cernées d'encre. Le contraste est garanti par construction (texte encre sur papier, texte clair sur fonds sombres) et vérifié par test WCAG AA pour les 8 palettes (`apps/web/test/contrast.test.ts`). Les variables de palette sont enregistrées en `@property` pour une transition fluide entre parties.
- **Écarté** : un thème clair/sombre par partie (16 palettes à maintenir, aucun bénéfice pour l'usage visé).

## D10 — Sessions

- **Décision** : jeton aléatoire de 32 octets (base64url) en cookie `HttpOnly; SameSite=Lax; Path=/`, préfixé `__Host-` et `Secure` quand `COOKIE_SECURE=true`. En base, seulement son SHA-256. « Rester connectée » (coché par défaut, usage mobile) : cookie persistant et expiration glissante de `SESSION_TTL_DAYS` jours ; sinon cookie de session navigateur et expiration serveur après 24 h d'inactivité. La fenêtre glissante est prolongée au plus toutes les 10 minutes (une écriture par requête serait inutile). Purge horaire des sessions expirées.
- Changement de mot de passe : toutes les sessions sont supprimées, celle de l'appareil courant est réémise avec un nouveau jeton. Connexion : l'éventuelle session précédente du navigateur est détruite (rotation).

## D11 — CSRF

- **Décision** : `SameSite=Lax` + vérification stricte de l'en-tête `Origin` (à défaut `Referer`) sur toute requête mutante vers `/api`. Absence des deux = refus (les navigateurs modernes envoient toujours `Origin` sur un `fetch` non-GET). Le smoke test `curl` envoie donc `Origin`.

## D12 — Proxy de confiance

- **Contexte** : `trustProxy: true` ferait confiance à n'importe quel `X-Forwarded-For`, contournant le rate limiting si le port était exposé.
- **Décision** : `TRUST_PROXY=loopback,linklocal,uniquelocal` par défaut (reverse proxy sur l'hôte via le pont Docker, ou dans un conteneur voisin). Surchargeable (`true`, liste d'IP/CIDR).

## D13 — Limitation de débit et anti-énumération

- Connexion : 10 essais / 15 min / IP ; inscription : 5 / heure / IP ; actions sensibles (changement de mot de passe, suppression, révélation) : 30 / 15 min. Stockage mémoire (instance unique). Réponse d'échec de connexion identique pour pseudo inconnu et mauvais mot de passe, avec vérification Argon2 factice et durée minimale de 400 ms.
- L'inscription révèle forcément qu'un pseudo est pris (409) : risque accepté, limité par le débit.

## D14 — Argon2id

- `@node-rs/argon2` (binaire précompilé, pas de toolchain dans l'image), m = 19 Mio, t = 2, p = 1 (recommandation OWASP).

## D15 — Interaction de cochage

- La feuille « Marquer aussi les X épisodes précédents ? » s'ouvre **avant** de cocher ; la fermer n'enregistre rien. « Annuler » (toast de 5 s) décoche exactement ce qui vient d'être coché, ou recoche en **restaurant la date d'origine** (l'API accepte un `watchedAt` passé, borné à maintenant).
- Mises à jour optimistes ciblées : en cas d'échec, seuls les épisodes concernés sont restaurés (les autres actions en cours ne sont pas écrasées).
- La célébration de fin de partie se déclenche à la confirmation serveur, quand une partie passe à 100 %. Une partie en cours de diffusion entièrement vue jusqu'au dernier épisode sorti est « À jour », pas « Terminée ».
- Carte « Reprendre » : après « Je l'ai vu ! », le titre de l'épisode tout juste vu s'affiche avec un tampon « VU ! » (révélation) avant de passer au suivant (bouton « Épisode suivant » ou au bout de ~3 s).

## D16 — Révélation volontaire

- Appui long sur la ligne **ou** tap sur la bande censurée (bouton accessible au clavier) → confirmation → `POST /api/episodes/:id/reveal`. Le titre est gardé en mémoire vive (module dédié), oublié au rechargement, à la déconnexion, au décochage et à la réactivation du mode anti-spoil.

## D17 — Pas de validation zod côté front

- **Contexte** : importer les schémas zod dans le front ajoutait ~90 Ko au bundle.
- **Décision** : `@jojo/shared/client` expose la logique pure et les **types** des contrats, sans zod ; le serveur (même origine) valide toutes les entrées. Une règle ESLint interdit d'importer `@jojo/shared` (complet) depuis le front. Les bibliothèques sont découpées en chunks (react, router, motion, vendor) : plus aucun chunk ne dépasse 500 Ko.

## D18 — Base de données des tests

- **Contexte** : Docker (Testcontainers) indisponible dans l'environnement de travail.
- **Décision** : tests d'intégration sur **PGlite** (PostgreSQL compilé en WebAssembly) avec les mêmes migrations Drizzle ; E2E sur le serveur de dev (PGlite en mémoire, horloge figée par `FAKE_NOW`). Le bundle de production a en plus été validé contre un **vrai PostgreSQL 18** (binaires `@embedded-postgres`, hors dépôt) avec `scripts/smoke-test.sh`.

## D19 — Navigateur Playwright

- **Contexte** : le CDN de Playwright était bloqué.
- **Décision** : la configuration accepte `PLAYWRIGHT_CHROMIUM_EXECUTABLE` (Chromium fourni par `@sparticuz/chromium`, récupéré via npm, utilisé localement). Sur une machine normale, `npx playwright install chromium` suffit.

## D20 — Service worker et installation

- `vite-plugin-pwa` en `generateSW`, `registerType: 'prompt'` : jamais de `skipWaiting` automatique ; un toast persistant « Nouvelle version disponible » propose de recharger. Vérification de mise à jour toutes les heures. `/api/*` : `NetworkOnly` + exclus du fallback de navigation ; l'API renvoie aussi `Cache-Control: no-store`. Les écrans de démarrage iOS (lourds) ne sont pas précachés.
- Bannière d'installation sur l'accueil à partir de la 2e ouverture, masquée définitivement après refus ou fermeture (`localStorage`), jamais en mode standalone. Entrée permanente dans le profil.
- Raccourci « Reprendre » : `/?reprendre=1` (la carte est mise en avant et son bouton reçoit le focus).

## D21 — Icônes et écrans de démarrage

- Dessin original : un « ゴ » jaune cerné d'encre sur une case magenta à lignes de vitesse. Les glyphes sont vectorisés (`opentype.js`) dans des SVG versionnés (`apps/web/assets-src/`), rendus en PNG par `sharp` (`pnpm --filter @jojo/web icons`). 11 écrans de démarrage iPhone.

## D22 — Docker

- `DATABASE_URL` est construite à partir de `POSTGRES_*` (identifiants encodés : un mot de passe avec `/+=` fonctionne) ; une `DATABASE_URL` explicite reste prioritaire. Conteneur applicatif en lecture seule (`read_only`, `tmpfs /tmp`), `cap_drop: ALL`, `no-new-privileges`. Pas de compression HTTP dans l'appli : c'est le rôle du reverse proxy.
- `postgres:18-alpine` : volume monté sur `/var/lib/postgresql` (nouvelle disposition des images 18+).

## D23 — Fichiers statiques

- `@fastify/static` indexe le build au démarrage (`wildcard: false`) ; assets fingerprintés en cache 1 an `immutable`, `index.html`/`sw.js`/manifest en `no-cache`. Toute URL inconnue hors `/api` qui accepte du HTML renvoie `index.html` (fallback SPA) ; sous `/api`, une 404 JSON.

## D24 — Textes

- Interface au féminin là où le cahier des charges l'emploie (« Rester connectée »), tutoiement complice. Aucune réplique, aucun nom de personnage/Stand/lieu dans l'interface : seulement des onomatopées génériques (ゴゴゴ, ドドド, ドン！, バーン) et des katakana neutres (メニュー, プロフィール, サヨナラ).

## D25 — Purge des caches côté navigateur (issue de l'audit anti-spoil)

- **Contexte** : l'audit a montré qu'une session expirée détectée par `/api/me` laissait le catalogue en mémoire ; un autre compte sur le même appareil pouvait entrevoir des titres.
- **Décision** : toute fin de session, toute connexion/inscription et toute modification du mode anti-spoil purgent catalogue, titres révélés et toasts ; un `BroadcastChannel` prévient les autres onglets. Le catalogue n'est jamais relu pendant une écriture (`write-tracker`). Tests E2E dédiés avec réponses `/api` volontairement ralenties.

## D26 — Captures de la documentation

- Les captures publiées masquent les titres (remplacés à la volée par le script) et utilisent des pseudos neutres : la documentation elle-même ne spoile pas.
