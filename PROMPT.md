# PROMPT — « JoJo Tracker » : suivi d'avancement anti-spoil de JoJo's Bizarre Adventure

Tu travailles **seul, en autonomie complète, pendant toute la nuit**, dans ce dossier vide. Personne ne répondra à tes questions avant demain matin. Demain, je ferai uniquement `git pull` sur mon VPS puis `docker compose up -d --build`, et je m'occuperai moi-même du reverse proxy et du HTTPS. Le résultat doit donc être **fini, testé, buildable et déployable tel quel**.

---

## 0. Contexte et objectif

Ma copine regarde l'anime *JoJo's Bizarre Adventure* et veut une appli simple pour cocher les épisodes qu'elle a déjà vus et savoir où elle en est. Elle l'utilisera surtout **sur son téléphone**.

Trois exigences priment sur tout le reste :

1. **Zéro spoil.** Elle ne doit jamais voir le titre d'un épisode qu'elle n'a pas encore vu, ni en cochant un épisode, ni ailleurs.
2. **Une interface exceptionnelle**, dans l'esprit de JoJo, pensée mobile first. C'est la partie sur laquelle je veux que tu te surpasses : ce n'est pas un CRUD avec un thème, c'est une appli qu'on a envie d'ouvrir.
3. **Un code propre** respectant les bonnes pratiques (sécurité, typage strict, tests, Docker, documentation).

Toute l'interface est **en français**.

---

## 1. Règles de travail en autonomie

- **Ne pose aucune question et ne t'arrête pas pour demander une validation.** Quand un choix n'est pas spécifié, prends la décision la plus raisonnable, note-la dans `docs/DECISIONS.md` (contexte → décision → alternatives écartées) et continue.
- Commence par écrire `docs/PLAN.md` (phases, tâches, ordre) et tiens-le à jour en cochant ce qui est fait. Utilise ta liste de tâches interne pour suivre l'avancement.
- `git init` dès le début, branche `main`. Commits atomiques et fréquents au format Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`…), un commit par étape cohérente. Ne commite jamais de `.env` ni de secret.
- À la fin, si un remote `origin` est configuré, fais `git push origin main`. Sinon, ne crée pas de remote et signale-le dans le rapport final.
- Après chaque phase : lint, typecheck et tests doivent passer avant de continuer. Si quelque chose casse, tu le répares avant d'avancer.
- Si un outil n'est pas disponible dans ton environnement (Docker, navigateur Playwright, accès web…), ne bloque pas : contourne proprement, documente la limite dans le rapport final et assure-toi que ce qui ne peut pas être vérifié est au moins correct par construction.
- Épingle des versions **stables et récentes** des dépendances (vérifie-les avec `npm view <pkg> version`), sans prendre de version publiée il y a moins de deux semaines. Pas de version `latest` ni de plage large dans les Dockerfiles.
- Tu peux utiliser des sous-agents pour paralléliser ou pour faire relire ton travail (voir phase de revue).

---

## 2. Périmètre fonctionnel

### 2.1 Comptes et authentification
- Inscription avec **pseudo + mot de passe** (pas d'email, pas de SMTP). Pseudo unique, insensible à la casse, 3 à 24 caractères `[a-zA-Z0-9_-]`. Mot de passe de 10 caractères minimum, avec indicateur de robustesse simple.
- **Code d'invitation optionnel** : si la variable `INVITE_CODE` est définie, elle est exigée à l'inscription (comparaison à temps constant). Si `ALLOW_SIGNUP=false`, l'inscription est fermée et l'écran l'indique joliment.
- Connexion, déconnexion, « rester connectée » (session de 30 jours glissants, sinon session de navigateur).
- Page profil : changer de mot de passe (ancien mot de passe requis, invalide les autres sessions), se déconnecter partout, exporter ses données en JSON, supprimer son compte (confirmation forte : retaper son pseudo).

### 2.2 Suivi des épisodes
- Le catalogue est organisé par **Parties** (Part 1 à Part 7), certaines découpées en saisons (voir §4).
- Cocher / décocher un épisode en un tap, avec **mise à jour optimiste** (rollback + toast d'erreur si l'API échoue).
- **Toast « Annuler »** pendant ~5 s après chaque action.
- Si elle coche l'épisode N alors que des épisodes précédents (dans la même partie ou les parties précédentes) ne sont pas cochés, propose une **bottom sheet** : « Marquer aussi les X épisodes précédents comme vus ? » → *Oui, tout marquer* / *Seulement celui-ci*.
- Action « Marquer toute la partie comme vue » (avec confirmation) et « Réinitialiser la partie ».
- Les épisodes **pas encore diffusés** (date de diffusion future) sont visibles mais non cochables, avec la mention « Disponible le JJ/MM ». Les dates de diffusion ne sont pas des spoils.
- Date à laquelle chaque épisode a été coché (affichée discrètement sur les épisodes vus).

### 2.3 Écrans
1. **Connexion / Inscription** : un vrai écran d'accueil théâtral, pas un simple formulaire centré.
2. **Accueil** :
   - Progression globale (épisodes vus / total, pourcentage) mise en scène, pas une barre HTML basique.
   - Carte **« Reprendre »** : la prochaine étape à regarder (« Partie 3 · Épisode 14 »), **sans titre**, avec un gros bouton « Je l'ai vu ! » qui le coche directement.
   - Grille des Parties sous forme de « couvertures » : numéro, nom de la partie, progression, état (pas commencée / en cours / terminée).
3. **Détail d'une Partie** : en-tête aux couleurs de la partie, progression collante (sticky), liste des épisodes regroupés par saison si besoin, actions de masse dans un menu.
4. **Profil / Réglages** : mode anti-spoil (voir §3), compte, export, suppression, à propos.
- Navigation principale par **barre en bas d'écran** (zone du pouce), en respectant les safe areas iOS/Android.

### 2.4 Installation en PWA (exigence forte)
Elle doit pouvoir **installer l'appli sur l'écran d'accueil de son téléphone** et l'utiliser comme une appli native, sur Android comme sur iOS.
- **Manifest complet** : `name`, `short_name` (« JoJo Tracker » ou mieux), `description`, `lang: "fr"`, `start_url` et `scope` à `/`, `id`, `display: "standalone"`, `orientation: "portrait"`, `background_color` et `theme_color` cohérents avec l'écran de démarrage, `categories`.
- **Icônes originales** : 192 et 512 px en `purpose: "any"`, versions `maskable` avec zone de sécurité respectée, `apple-touch-icon` 180 px, favicon SVG. Génère-les depuis un SVG source versionné (script reproductible dans le repo, par ex. avec `sharp`).
- **iOS** : balises `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` (barre de statut intégrée au design grâce à `viewport-fit=cover`) et `apple-mobile-web-app-title`, plus des images de démarrage (`apple-touch-startup-image`) pour les tailles d'iPhone courantes.
- **Raccourcis du manifest** (`shortcuts`) : « Reprendre » (ouvre directement la carte de l'épisode suivant) et « Mes parties ».
- **Service worker** (par ex. `vite-plugin-pwa` en mode `injectManifest` ou `generateSW` bien configuré) :
  - précache de l'app shell et des assets statiques (JS, CSS, polices, icônes) pour un démarrage instantané ;
  - **aucune mise en cache des réponses `/api`** (`NetworkOnly`), pour la fraîcheur des données et l'anti-spoil ;
  - fallback de navigation vers l'app shell ; hors connexion, un écran dédié dans le style de l'appli (« Pas de réseau… ゴゴゴ ») au lieu de la page d'erreur du navigateur. Pas de cochage hors ligne.
  - **mise à jour maîtrisée** : quand une nouvelle version est déployée, un toast « Nouvelle version disponible » propose de recharger (pas de rechargement forcé en pleine action).
- **Invitation à installer** :
  - Android/Chrome : intercepte `beforeinstallprompt` et propose un bouton « Installer l'appli » soigné (bannière discrète sur l'accueil après la première visite + entrée dans le profil). Masque-le une fois installée ou si elle refuse (mémorisé en `localStorage`).
  - iOS/Safari (pas de `beforeinstallprompt`) : détecte Safari iOS hors mode standalone et affiche une petite fiche illustrée « Partager → Sur l'écran d'accueil ».
  - En mode standalone (`display-mode: standalone` ou `navigator.standalone`), aucune invitation n'apparaît.
- L'expérience installée doit être irréprochable : pas de barre d'adresse, pas de flash blanc au lancement (couleur de fond identique à l'écran de démarrage), safe areas respectées, pas de zoom accidentel au double tap, pas de rebond qui dévoile un fond incohérent (`overscroll-behavior`).
- **Vérification** : un test valide le manifest (champs requis, icônes présentes aux bonnes tailles), et une vérification Playwright/Chromium confirme que le service worker s'enregistre et que l'appli remplit les critères d'installabilité. Rappelle dans le README que l'installation exige le HTTPS (que je fournirai via mon reverse proxy).

### 2.5 Hors périmètre
Pas de notes, de favoris, de réseau social, de multi-séries, d'images officielles ni de synopsis. Garde l'appli simple : l'effort va dans l'anti-spoil, l'interface et la qualité.

---

## 3. Anti-spoil — exigences non négociables

Le principe : **elle ne voit que ce qu'elle a déjà vu.**

1. **Le serveur ne divulgue jamais un titre non vu.** L'API qui renvoie le catalogue d'un utilisateur ne contient le titre que des épisodes cochés. Pour les autres : `title: null` et `titleHidden: true`. Un titre non vu ne doit être présent ni dans le JSON, ni dans le HTML, ni dans le bundle JS, ni dans un `aria-label`, un `title=""`, le `<title>` de la page, une URL, un log navigateur ou un cache de service worker. Le catalogue complet (avec titres) vit **uniquement côté serveur**.
2. Un épisode non vu s'affiche comme « Épisode 14 » avec, à la place du titre, une **bande censurée** stylisée (barre d'encre, motif trame, ou tampon « ??? » façon manga), jamais un flou CSS sur le vrai texte.
3. **Quand elle coche un épisode, seul le titre de CET épisode se révèle** (avec une animation de révélation). Rien sur l'épisode suivant : pas de titre, pas d'aperçu, pas de pré-chargement de son titre.
4. **Révéler volontairement** : un appui long (ou bouton dans un menu) sur un épisode non vu ouvre une confirmation « Révéler le titre ? Ça peut spoiler. » ; si confirmé, appel à un endpoint dédié qui renvoie ce seul titre, affiché pour la session courante uniquement (non persisté).
5. Décocher un épisode re-masque son titre.
6. Réglage **« Mode anti-spoil »** activé par défaut. Désactivé, tous les titres sont visibles (le serveur les envoie alors). Stocké en base, par utilisateur.
7. Les seules informations visibles pour le non-vu : numéro de partie, nom officiel de la partie, nom officiel de la saison, numéro d'épisode, nombre d'épisodes, date de diffusion. **Aucun nom de personnage, de Stand, de lieu, aucune citation, aucune image d'épisode**, nulle part dans l'appli (y compris dans les textes d'interface, animations, onomatopées et messages de félicitations).
8. Écris des **tests automatisés dédiés** qui prouvent ces garanties (voir §8), dont un test qui vérifie qu'aucun titre d'épisode n'apparaît dans les assets du build front.

---

## 4. Données : le catalogue des épisodes

- Le catalogue est un fichier versionné, validé par un schéma zod, embarqué **côté serveur uniquement** (par ex. `apps/api/src/catalog/episodes.json`). Au démarrage, l'API fait un **upsert idempotent** du catalogue en base. Ajouter des épisodes = modifier ce fichier, commit, puis rebuild : documente cette procédure dans le README.
- Chaque épisode : `id` stable (slug du type `p3-e14`), `partNumber`, `season` (pour les parties découpées), `numberInPart` (1..n, affiché en principal), `officialNumber` (numérotation officielle si différente, affichée en secondaire), `titleFr` (nullable), `titleEn`, `airDate` (ISO, nullable).
- **Titres** : récupère-les depuis des sources fiables via le web (Wikipédia FR « Liste des épisodes de JoJo's Bizarre Adventure », Wikipédia EN « List of JoJo's Bizarre Adventure episodes », JoJo Wiki). Priorité aux titres français officiels ; à défaut, titre anglais officiel. Si une source n'est pas accessible, utilise les autres ; **n'invente jamais un titre** : laisse `null` et l'interface affichera « Titre inconnu » (une fois l'épisode vu). Note tes sources dans `docs/DECISIONS.md`.
- Structure attendue (vérifie les comptes, un test doit les valider) :

| Partie | Nom | Saison(s) | Épisodes |
|---|---|---|---|
| 1 | Phantom Blood | série 2012 (n° officiels 1–9) | 9 |
| 2 | Battle Tendency | série 2012 (n° officiels 10–26) | 17 |
| 3 | Stardust Crusaders | Stardust Crusaders (24) + Battle in Egypt (24) | 48 |
| 4 | Diamond is Unbreakable | — | 39 |
| 5 | Golden Wind | — | 39 |
| 6 | Stone Ocean | 3 lots Netflix (12 + 12 + 14) | 38 |
| 7 | Steel Ball Run | en cours de diffusion | 12 connus |

- **Part 7 – Steel Ball Run** est en cours de diffusion sur Netflix : l'épisode 1 (long format) est sorti le 19 mars 2026, puis 11 épisodes hebdomadaires le vendredi du 25 septembre au 4 décembre 2026. Renseigne les `airDate` correspondantes (vérifie la numérotation et les dates en ligne). Les titres des épisodes pas encore sortis restent `null`. Le modèle doit permettre d'ajouter plus tard d'autres épisodes de la Part 7.
- Total attendu à ce jour : 202 épisodes. Si tes sources contredisent ce tableau, les sources fiables l'emportent : documente l'écart.

---

## 5. Direction artistique et UX — surpasse-toi

### 5.1 Intention
Une appli qui ressemble à **une page de manga de JoJo qui prend vie** : contrastes violents, poses dramatiques de la typographie, trames, onomatopées, couleurs qui changent radicalement d'une partie à l'autre comme les couvertures de la série. Théâtral, drôle, généreux, mais **lisible et rapide à utiliser** d'une main dans le métro.

### 5.2 Contraintes de propriété intellectuelle
Aucun asset officiel : pas de logo officiel, pas d'image ou de dessin de personnage, pas de capture d'anime, pas de police propriétaire. Tout est **original et inspiré du style**, jamais copié. Les noms officiels des parties et saisons en texte sont autorisés.

### 5.3 Vocabulaire visuel (à interpréter, pas à appliquer bêtement)
- **Trames de points (halftone / Ben-Day)** en CSS ou SVG généré, lignes de vitesse, cadres de cases de manga aux bords épais et légèrement obliques, découpes diagonales, ombres portées dures décalées (pas de flou), contours noirs épais.
- **Onomatopées en katakana** génériques flottant en arrière-plan avec une animation lente et menaçante : 「ゴゴゴゴ」, 「ドドドド」, 「ドン！」, 「バーン」. Uniquement des onomatopées génériques, **aucune réplique culte de personnage** (spoil + IP).
- **Une palette par Partie**, appliquée par variables CSS (thème qui bascule avec une transition quand on entre dans une partie). Propositions de départ, à affiner :
  - P1 : sépia, bordeaux, or vieilli (victorien).
  - P2 : orange brûlé, turquoise, sable.
  - P3 : bleu nuit, émeraude, or désert.
  - P4 : pastels pop rose, menthe, lilas, jaune.
  - P5 : violet profond, or, touches de rouge.
  - P6 : aigue-marine, gris béton, vert électrique.
  - P7 : ocre western, bleu ciel délavé, brun cuir.
  - Accueil : noir d'encre + papier crème + accent magenta/jaune criard.
- **Typographie** auto-hébergée (via `@fontsource`, licences OFL) : une display japonaise très grasse pour les katakana (par ex. *Dela Gothic One*), une display latine condensée et massive pour les titres, une sans-serif très lisible pour le corps. Tailles généreuses, titres qui « cognent ».

### 5.4 Micro-interactions (le cœur de l'expérience)
- **Cocher un épisode** : un tampon/sceau qui s'écrase sur la case (scale + rotation légère), petit tremblement de la carte, éclat de « ドン！ » qui jaillit, trame qui ondule, vibration courte (`navigator.vibrate`, si dispo), puis **révélation du titre** de l'épisode (la bande censurée se déchire ou s'efface comme de l'encre).
- **Terminer une Partie** : séquence de célébration avec un **arrêt sur image en filtre sépia** de l'écran et une flèche **« TO BE CONTINUED »** originale qui glisse depuis la droite. C'est le moment fort : soigne-le. Elle doit pouvoir la fermer d'un tap.
- **Carte « Reprendre »** : présence menaçante avec 「ゴゴゴゴ」 animés autour.
- Transitions de pages avec lignes de vitesse ou volets diagonaux, courtes (< 400 ms).
- Respecte `prefers-reduced-motion` : animations remplacées par des fondus simples, aucune vibration d'écran.
- Les animations ne doivent jamais bloquer l'interaction ni faire chuter la fluidité : `transform`/`opacity` uniquement, 60 fps visés sur un mobile milieu de gamme.

### 5.5 Exigences mobile first et accessibilité
- Conçu d'abord pour **375 × 812**, puis adapté jusqu'au desktop (sur grand écran : mise en page en colonnes, pas un téléphone étiré).
- Cibles tactiles ≥ 44 px, actions principales dans la zone du pouce, `env(safe-area-inset-*)`, `viewport-fit=cover`, pas de scroll horizontal parasite.
- **PWA installable** : voir §2.4. Les icônes et écrans de démarrage font partie de la direction artistique (par ex. un katakana stylisé dans une case de manga) et passent eux aussi par la boucle d'itération visuelle.
- Contraste WCAG AA sur chaque palette (vérifie-le), focus visible, navigation clavier, libellés ARIA corrects (sans titre non vu), états vides, de chargement (skeletons stylés) et d'erreur soignés eux aussi.
- Mode sombre/clair : la palette de chaque partie doit fonctionner dans les deux, ou choisis délibérément un rendu unique et assume-le dans `DECISIONS.md`.

### 5.6 Boucle d'itération visuelle obligatoire
Le design ne se valide pas en lisant le code. Une fois les écrans en place :
1. Lance l'appli et prends des **captures Playwright** en 375 × 812 de chaque écran et état clé (connexion, accueil vide, accueil en cours, partie en cours, partie terminée, bottom sheet, profil, invitation à installer, écran hors ligne, rendu en mode standalone), puis en 1280 × 800.
2. Regarde-les et critique-les sans complaisance comme un directeur artistique exigeant : hiérarchie, rythme, lisibilité, cohérence, « est-ce que ça a vraiment l'air de JoJo ou d'un template avec une trame ? ».
3. Corrige, refais les captures. **Au moins deux passes complètes.** Conserve les captures finales dans `docs/screenshots/`.

---

## 6. Architecture et stack

Monorepo **pnpm workspaces**, TypeScript `strict` partout.

```
apps/
  api/      Fastify + Drizzle ORM + PostgreSQL + zod
  web/      React + Vite + React Router + TanStack Query + Tailwind CSS + Motion
packages/
  shared/   schémas zod et types partagés (contrats d'API), SANS les titres d'épisodes
docs/
docker-compose.yml
Dockerfile
```

- **Une seule image de production** : build multi-étapes ; Fastify sert l'API sous `/api` et le front buildé en statique (fallback SPA vers `index.html`). Même origine, donc pas de CORS.
- **Base de données** : PostgreSQL. Tables au minimum `users`, `sessions`, `episodes`, `watched_episodes (user_id, episode_id, watched_at, PK composite)`, `user_settings`. Contraintes d'intégrité et clés étrangères avec `ON DELETE CASCADE` là où c'est pertinent, index utiles.
- **Migrations Drizzle** générées et commitées, appliquées automatiquement au démarrage du conteneur avant l'écoute du serveur.
- Validation zod de toutes les entrées et des variables d'environnement au démarrage (le serveur refuse de démarrer si la config est invalide, avec un message clair).
- Logs structurés (pino) sans données sensibles. Endpoint `GET /api/health` (vérifie la connexion DB).
- Gestion d'erreurs centralisée avec un format d'erreur JSON homogène, aucun détail interne exposé en production.
- Côté front : séparation claire composants / hooks / appels API ; contrats typés depuis `packages/shared`.
- Les choix précis de bibliothèques secondaires sont libres tant qu'ils sont justifiés dans `DECISIONS.md`.

---

## 7. Sécurité

- Hash des mots de passe en **Argon2id** (par ex. `@node-rs/argon2`, paramètres recommandés OWASP).
- Sessions côté serveur : jeton aléatoire de 32 octets, **stocké hashé (SHA-256) en base**, envoyé en cookie `HttpOnly`, `SameSite=Lax`, `Secure` piloté par la variable `COOKIE_SECURE` (vrai par défaut en production). Rotation du jeton à la connexion, invalidation à la déconnexion et au changement de mot de passe.
- Protection CSRF : `SameSite` + vérification de l'en-tête `Origin` sur toutes les requêtes mutantes (origine attendue dans `APP_ORIGIN`).
- `trustProxy` activé (l'appli sera derrière mon reverse proxy) pour que le rate limiting voie la vraie IP.
- **Rate limiting** sur connexion et inscription ; messages d'erreur de connexion génériques (pas d'énumération de pseudos) ; délai constant raisonnable.
- En-têtes de sécurité (`@fastify/helmet`) avec une **CSP stricte** (aucune ressource externe : polices et assets auto-hébergés).
- Toutes les routes `/api` hors auth exigent une session ; un utilisateur ne peut accéder qu'à ses propres données.
- `pnpm audit` sans vulnérabilité haute ou critique en production.

---

## 8. Qualité et tests

- ESLint + Prettier (ou Biome) configurés, scripts racine : `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm dev`.
- **Tests unitaires (Vitest)** : logique de progression (prochain épisode, pourcentages, épisodes précédents non vus, épisodes non diffusés), validation du catalogue (comptes du §4, ids uniques, numérotation continue).
- **Tests d'intégration API** contre un vrai PostgreSQL (Testcontainers si Docker est disponible, sinon **PGlite** avec Drizzle) : inscription, code d'invitation, connexion, déconnexion, changement de mot de passe, suppression de compte, cocher/décocher, action de masse, isolation entre utilisateurs, rate limiting, CSRF.
- **Tests anti-spoil** :
  - la réponse du catalogue ne contient aucun titre d'épisode non vu (vérification sur le JSON brut sérialisé) ;
  - cocher l'épisode N ne renvoie que le titre de N ;
  - mode anti-spoil désactivé → tous les titres renvoyés ;
  - **scan du dossier `dist` du front** : aucun titre du catalogue (FR ou EN) n'y figure.
- **Tests end-to-end Playwright** en viewport mobile : parcours inscription → cocher un épisode → bottom sheet des épisodes précédents → annuler → terminer une partie (animation visible) → déconnexion. Si les navigateurs Playwright ne peuvent pas être installés, documente-le et garde les tests prêts à tourner.

---

## 9. Docker et déploiement

- `Dockerfile` multi-étapes basé sur une image Node LTS `-alpine` (ou `-slim`) épinglée, installation avec `pnpm install --frozen-lockfile`, image finale minimale, **utilisateur non-root**, `NODE_ENV=production`, `HEALTHCHECK`.
- `.dockerignore` complet.
- `docker-compose.yml` :
  - service `app` : build local, `restart: unless-stopped`, `depends_on` avec `condition: service_healthy`, port publié en `"${APP_BIND:-127.0.0.1}:${APP_PORT:-3000}:3000"` (je mets mon reverse proxy devant).
  - service `db` : `postgres` en version majeure épinglée (`-alpine`), volume nommé persistant, healthcheck `pg_isready`, **port non publié** sur l'hôte.
  - toutes les valeurs viennent du fichier `.env`.
- `.env.example` exhaustif et commenté : `APP_ORIGIN`, `APP_PORT`, `APP_BIND`, `COOKIE_SECURE`, `ALLOW_SIGNUP`, `INVITE_CODE`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL`, `SESSION_TTL_DAYS`, `LOG_LEVEL`… avec la commande pour générer les secrets (`openssl rand -base64 32`).
- **Vérification finale obligatoire si Docker est disponible** : `docker compose up -d --build` avec un `.env` de test, attends le healthcheck, puis smoke test en `curl` (health, inscription, connexion, récupération du catalogue, cochage), puis `docker compose down -v`. Corrige jusqu'à ce que ça passe. Si Docker n'est pas disponible, fais tourner l'image de prod équivalente localement (build + `node` sur le bundle de prod contre un Postgres ou PGlite) et documente la limite.

---

## 10. Documentation

- `README.md` : présentation, captures, stack, lancement en dev, **déploiement sur VPS pas à pas** (cloner, `cp .env.example .env`, remplir les secrets, `docker compose up -d --build`, exemple de config reverse proxy Nginx et Caddy en annexe), mise à jour (`git pull && docker compose up -d --build`), sauvegarde/restauration de la base (`pg_dump`), **ajout de nouveaux épisodes** au catalogue.
- `docs/SPECS.md` : spécifications fonctionnelles complètes, écran par écran (rôle, contenu, actions, états, règles anti-spoil, règles métier), suffisamment complètes pour qu'une personne comprenne tout le fonctionnement du produit sans lire le code. Intègre les captures finales.
- `docs/DECISIONS.md` : toutes les décisions prises en autonomie.
- `docs/PLAN.md` : plan et état d'avancement.
- `docs/RAPPORT.md` (à écrire en dernier) : ce qui est fait, ce qui a été vérifié et comment, ce qui n'a pas pu l'être et pourquoi, limites connues, pistes d'amélioration, et les commandes exactes que je dois lancer demain matin.

---

## 11. Ordre des phases

1. **Cadrage** : `PLAN.md`, structure du monorepo, outillage (lint, format, typecheck, tests), git.
2. **Catalogue** : récupération et vérification des données, schéma, tests de validation.
3. **Back-end** : config, DB, migrations, upsert du catalogue, auth, sessions, sécurité, endpoints de suivi, tests d'intégration et anti-spoil.
4. **Front-end fonctionnel** : routing, auth, écrans, mises à jour optimistes, bottom sheet, toasts, PWA.
5. **Direction artistique** : système de design (tokens, palettes par partie, typographie, trames, composants), micro-interactions, célébration de fin de partie.
6. **Boucle d'itération visuelle** (§5.6), au moins deux passes.
7. **Docker** et vérification de bout en bout (§9).
8. **Revue finale** : lance des sous-agents relecteurs indépendants avec trois missions distinctes : (a) audit sécurité, (b) **audit anti-spoil** qui cherche activement toute fuite de titre, (c) revue de code et de cohérence. Corrige tout ce qui est pertinent.
9. **Documentation** et `RAPPORT.md`, dernier commit, push si `origin` existe.

---

## 12. Definition of Done

Ne considère le travail terminé que lorsque **tout** ceci est vrai :

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` et `pnpm build` passent sans erreur ni avertissement ignoré.
- [ ] Le catalogue contient les 7 parties avec les comptes attendus, les titres sourcés, et les dates de Steel Ball Run.
- [ ] Les tests anti-spoil passent, y compris le scan du bundle front.
- [ ] Inscription (avec et sans code d'invitation), connexion, déconnexion, changement de mot de passe, export et suppression de compte fonctionnent.
- [ ] Cocher, décocher, annuler, marquer les précédents, marquer/réinitialiser une partie fonctionnent avec mise à jour optimiste.
- [ ] Les écrans ont passé au moins deux itérations visuelles sur captures mobiles, et les captures finales sont dans `docs/screenshots/`.
- [ ] La célébration « TO BE CONTINUED » de fin de partie fonctionne et `prefers-reduced-motion` est respecté.
- [ ] L'appli est installable en PWA (manifest valide, icônes any + maskable + Apple, service worker enregistré, invitations Android et iOS, écran hors ligne, toast de mise à jour), et `/api` n'est jamais mis en cache.
- [ ] `docker compose up -d --build` démarre une appli saine à partir d'un `.env` rempli depuis `.env.example` (vérifié, ou limite documentée).
- [ ] README, SPECS, DECISIONS, PLAN et RAPPORT sont à jour.
- [ ] Tout est commité proprement sur `main` (et poussé si `origin` existe), aucun secret dans l'historique.

Au travail. Fais en sorte que demain matin, la seule chose à faire soit de déployer, et qu'elle ait envie d'ouvrir l'appli rien que pour l'interface.
