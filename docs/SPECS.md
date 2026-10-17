# Spécifications fonctionnelles — JoJo Tracker

Ce document décrit le produit tel qu'il est livré, écran par écran, sans qu'il soit nécessaire de lire le code. Les captures sont dans [`docs/screenshots/`](screenshots/) (préfixe `mobile-` : 375 × 812, `desktop-` : 1280 × 800). Pour qu'elles ne spoilent personne, les titres d'épisodes (même vus) y sont remplacés par « Titre de l'épisode » au moment de la capture.

## 1. Objectif et principes

JoJo Tracker permet de cocher les épisodes de l'anime _JoJo's Bizarre Adventure_ déjà regardés et de savoir où l'on en est, principalement sur téléphone (appli installable). Trois principes guident tout le reste :

1. **Zéro spoil** : on ne voit que ce qu'on a déjà vu (§ 3).
2. **Une interface « page de manga qui prend vie »**, lisible d'une main.
3. **Fiabilité** : actions instantanées (optimistes) mais toujours confirmées par le serveur, annulables.

L'interface est entièrement en français.

## 2. Vocabulaire et données

| Terme       | Définition                                                                                                                                                                                                                             |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Partie**  | Arc de la série (Part 1 à Part 7), avec son nom officiel (_Phantom Blood_…).                                                                                                                                                           |
| **Saison**  | Découpage officiel interne d'une partie : _Stardust Crusaders_ / _Battle in Egypt_ (P3), trois lots Netflix (P6). Les autres parties n'en ont pas.                                                                                     |
| **Épisode** | Identifiant stable `p{partie}-e{n}`, numéro dans la partie (affiché en principal), numéro officiel (affiché en secondaire s'il diffère : P1 = 1–9, P2 = 10–26 de la série 2012), date de diffusion, titres FR/EN (serveur uniquement). |
| **Diffusé** | Date de diffusion passée ou du jour (fuseau Europe/Paris), ou inconnue. Un épisode non diffusé est visible mais non cochable.                                                                                                          |
| **Vu**      | Épisode coché par l'utilisateur, avec la date/heure de cochage.                                                                                                                                                                        |

Catalogue livré : 7 parties, 202 épisodes (9, 17, 48, 39, 39, 38, 12). _Steel Ball Run_ : épisode 1 le 19/03/2026, puis un épisode chaque vendredi du 25/09 au 04/12/2026.

### Statut d'une partie

| Statut      | Règle                                                         | Affichage                        |
| ----------- | ------------------------------------------------------------- | -------------------------------- |
| À commencer | aucun épisode vu                                              | étiquette crème                  |
| En cours    | au moins un vu, et des épisodes diffusés restent à voir       | étiquette jaune                  |
| À jour      | tous les épisodes diffusés sont vus, d'autres restent à venir | étiquette jaune                  |
| Terminée    | tous les épisodes sont vus                                    | tampon « TERMINÉE » double trait |

Pourcentage = vus / total, **arrondi vers le bas** (100 % seulement quand tout est vu).

### Prochaine étape (« Reprendre »)

Premier épisode **diffusé et non vu** dans l'ordre (partie, numéro). S'il n'y en a pas : premier épisode non vu à venir (« Tu es à jour ! », avec sa date). Sinon : « Tout est vu ! ».

## 3. Règles anti-spoil (non négociables)

1. Le serveur n'envoie le titre d'un épisode que s'il est **vu** (ou si le mode anti-spoil est désactivé). Sinon `title: null`, `titleHidden: true`. Le catalogue complet n'existe que côté serveur (`apps/api/src/catalog/episodes.json`) ; il n'est ni dans le bundle, ni dans un cache, ni dans un log, une URL, un `aria-label`, un attribut `title` ou le titre de la page.
2. À la place d'un titre non vu : une **bande d'encre censurée** (trame + « ？？？ »). Aucun flou CSS sur du vrai texte : le texte n'existe pas côté client. La largeur de la bande est pseudo-aléatoire (dérivée de l'identifiant), elle ne trahit pas la longueur du titre.
3. Cocher un épisode révèle **uniquement son** titre (réponse serveur limitée à cet épisode), avec animation. Rien n'est préchargé pour le suivant.
4. **Révélation volontaire** : appui long sur la ligne, ou tap sur la bande censurée → feuille « Révéler le titre ? Ça peut spoiler. » → si confirmé, appel dédié qui renvoie ce seul titre, gardé en mémoire vive (perdu au rechargement, à la déconnexion, au décochage, à la réactivation du mode anti-spoil). Mention « révélé » à côté du titre.
5. Décocher re-masque immédiatement le titre.
6. **Mode anti-spoil** (profil) activé par défaut, enregistré en base par utilisateur ; désactivé, le serveur envoie tous les titres.
7. Seules informations visibles pour un épisode non vu : numéro et nom officiel de la partie, nom officiel de la saison, numéro d'épisode, nombre d'épisodes, date de diffusion. Aucun nom de personnage, de Stand ou de lieu, aucune citation ni image d'épisode nulle part (textes, animations, onomatopées, félicitations, icônes).
8. Fin de session (déconnexion, expiration détectée par n'importe quelle requête, nouveau compte sur le même appareil) et réactivation du mode anti-spoil : le catalogue en cache, les titres révélés et les toasts sont purgés ; les autres onglets ouverts sont prévenus (BroadcastChannel).
9. Ces garanties sont prouvées par des tests automatisés (JSON brut des réponses, scan de tout le build front, DOM/attributs/console en E2E).

Cas particulier : quelques titres sont identiques au nom de leur partie (« Stone Ocean », « Steel Ball Run », « Golden Wind » en VF) ; ces noms étant publics, ils ne constituent pas un spoil.

## 4. Navigation et structure

- **Barre de navigation en bas** (zone du pouce), trois onglets : Accueil, Parties, Profil. L'onglet actif est un aplat oblique à la couleur de la partie courante. Sur grand écran (≥ 1024 px), elle devient un rail vertical à gauche.
- Écrans : `/connexion`, `/` (accueil), `/parties`, `/parties/:n`, `/profil`. Toute autre adresse affiche « Page introuvable ».
- Écrans protégés : sans session valide, redirection vers `/connexion`. Session expirée en cours d'usage : retour automatique à la connexion.
- Transitions : glissement court (< 250 ms) et volet diagonal à la couleur de l'accent (désactivés en mouvement réduit).
- Thème : la palette bascule (transition ~0,45 s) en entrant dans une partie ; la barre de statut du téléphone prend la couleur du fond.

## 5. Écrans

### 5.1 Connexion / Inscription — `/connexion`

Captures : `mobile-connexion.png`, `mobile-inscription.png`, `desktop-connexion.png`.

- **Rôle** : accueil théâtral et accès au compte.
- **Contenu** : lignes de vitesse en rotation lente, bande magenta tramée en diagonale, katakana « ゴ / ド » menaçants, étiquette « Carnet de visionnage », logotype typographique « JOJO / TRACKER », accroche « Coche tes épisodes et garde le fil de _l'aventure_. », case de manga avec deux onglets **Connexion** / **Inscription** (`?mode=inscription`).
- **Connexion** : pseudo, mot de passe (bouton afficher/masquer), case **« Rester connectée (30 jours) »** cochée par défaut, bouton « Entrer ».
- **Inscription** : pseudo (3–24 caractères `a-z A-Z 0-9 _ -`, unique sans tenir compte de la casse), mot de passe (10 caractères minimum) avec **indicateur de robustesse** (4 barres : Faible / Correct / Solide / Redoutable), code d'invitation si le serveur l'exige, « Rester connectée », bouton « Créer mon compte ».
- **États** :
  - erreurs de champ sous chaque champ (messages du serveur) ; erreur globale encadrée ;
  - connexion échouée : toujours « Pseudo ou mot de passe incorrect. » (pas d'indice sur l'existence du pseudo) ;
  - trop d'essais : « Trop de tentatives. Réessaie dans N min. » ;
  - inscriptions fermées (`ALLOW_SIGNUP=false`) : l'onglet Inscription affiche un tampon « FERMÉ », « Les inscriptions sont fermées » et un bouton vers la connexion.
- Déjà connectée : redirection vers l'accueil.

### 5.2 Accueil — `/`

Captures : `mobile-accueil-vide.png`, `mobile-accueil-en-cours.png` (+ `-complet`), `desktop-accueil-en-cours.png`.

- **En-tête** : logotype et « Salut _pseudo_ ».
- **Progression globale** (« Ta progression ») : nombre d'épisodes vus en chiffres géants cernés d'encre, « / 202 épisodes vus », pourcentage dans une **étoile d'impact** jaune en rotation lente, et une **jauge oblique à 7 segments** (un par partie, largeur proportionnelle au nombre d'épisodes, remplie à la couleur de chaque partie). Lecteurs d'écran : phrase complète (« 17 épisodes vus sur 202, soit 8 % » et détail par partie).
- **Carte « Reprendre »** (case noire inclinée, katakana « ゴ » qui palpitent autour) :
  - « Partie 3 · Stardust Crusaders », **« ÉPISODE 14 »**, nom de saison s'il y a lieu, bande censurée, gros bouton jaune **« JE L'AI VU ! »**, lien « Voir la partie 3 → » (ouvre la partie centrée sur l'épisode) ;
  - après « Je l'ai vu ! » : s'il reste des épisodes antérieurs non vus, la feuille « épisodes précédents » s'ouvre (§ 6.2) ; sinon l'épisode est coché, son titre apparaît avec un tampon « VU ! », puis la carte passe au suivant (bouton « Épisode suivant » ou ~3 s) ;
  - « Tu es à jour ! » + « Disponible le 23/10 · dans 7 jours » quand seul l'à-venir reste ;
  - « Tout est vu ! » quand tout est coché.
  - Raccourci d'appli « Reprendre » (`/?reprendre=1`) : la carte est centrée, mise en avant (pulsation) et son bouton reçoit le focus.
- **Bannière d'installation** (§ 7.3) le cas échéant.
- **Les parties** : grille de **couvertures** (2 colonnes mobile, 3 tablette/desktop) : fond et numéro géant aux couleurs de la partie, trame, lignes de vitesse, étiquette « Partie N », statut, nom officiel en cartouche noir, barre de progression et « vus/total ». Toucher une couverture ouvre la partie.
- Desktop : deux colonnes (progression + reprise fixes à gauche, couvertures à droite).

### 5.3 Mes parties — `/parties`

Capture : `mobile-parties.png`, `desktop-parties.png`. Titre « Mes parties », résumé « 17 / 202 épisodes vus · 7 parties », grille de couvertures (jusqu'à 4 colonnes sur desktop). Cible du raccourci d'appli « Mes parties ».

### 5.4 Détail d'une partie — `/parties/:n`

Captures : `mobile-partie-en-cours.png`, `mobile-partie-en-cours-defile.png`, `mobile-partie-terminee.png`, `mobile-partie-3…7.png`, `mobile-partie-7-a-venir.png`, `desktop-partie-en-cours.png`.

- **En-tête** aux couleurs de la partie : bouton retour (vers Mes parties), bouton « ⋯ » (actions), étiquette « Partie N », nom officiel en très grand, nombre d'épisodes et de saisons, numéro géant détouré, lignes de vitesse en rotation lente, « ゴ » flottants.
- **Barre de progression collante** (reste visible en haut pendant le défilement) : barre oblique, « vus/total », pourcentage, statut.
- **Liste des épisodes**, regroupée par saison si la partie en a (bandeau de saison avec « vus/total »). Chaque ligne (case papier) :
  - numéro dans un carré incliné (aux couleurs de la partie une fois vu) ;
  - « ÉPISODE 14 » et, s'il diffère, « n° officiel 38 » ;
  - **titre** si vu (ou mode anti-spoil désactivé, ou révélé), « Titre inconnu » si vu mais absent des sources, sinon **bande censurée** (bouton de révélation) ;
  - méta : « Vu le 16/10/2026 », ou « Diffusé le 05/07/2014 », ou pour l'à-venir une étiquette « Disponible le 23/10 » ;
  - **sceau** à droite (cible 56 px) : cercle pointillé vide → tampon « VU » à la couleur de la partie. Épisode non diffusé : cadenas, ligne hachurée en pointillés, non cochable.
- **Actions (⋯)** : feuille « Partie N » avec « Marquer toute la partie comme vue », « Réinitialiser la partie », « Fermer » ; chaque action demande une confirmation (§ 6.3).
- Astuce en pied : « appui long sur une bande censurée pour révéler un titre (avec confirmation) ».
- Desktop : épisodes sur deux colonnes.
- Partie inexistante : « Partie introuvable ».

### 5.5 Profil — `/profil`

Captures : `mobile-profil.png`, `mobile-profil-complet.png`, `desktop-profil.png`.

Titre = pseudo (taille adaptée à sa longueur), « Membre depuis le … ». Cases :

- **Anti-spoil** : interrupteur ON/OFF (rôle `switch`) avec explication ; le changement est enregistré en base, le catalogue est rechargé, un toast confirme. Réactiver oublie aussi les titres révélés.
- **Appli** : bouton « Installer l'appli » (Android/Chrome), fiche iOS, ou mention « L'appli est installée sur cet appareil » / conseil de navigateur (§ 7.3).
- **Mot de passe** : actuel + nouveau (10 min., indicateur de robustesse). Succès : toast, **toutes les autres sessions sont déconnectées** (cet appareil reste connecté avec un nouveau jeton). Mot de passe actuel faux : erreur sous le champ.
- **Sessions** : « Se déconnecter », « Se déconnecter partout » (toutes les sessions, y compris celle-ci).
- **Mes données** : « Exporter en JSON » — télécharge `jojo-tracker-<pseudo>-<date>.json` (format `jojo-tracker-export` v1 : pseudo, date de création, réglages, liste des épisodes vus avec partie, numéro et date ; **aucun titre**).
- **Zone dangereuse** : « Supprimer mon compte » → feuille de confirmation forte : il faut **retaper son pseudo** pour activer « Supprimer pour toujours ». Suppression définitive en cascade (sessions, réglages, progression), retour à la connexion.
- **À propos** : appli de fan non officielle, aucun visuel officiel, crédits des polices (OFL), version.

### 5.6 Écrans d'état

- **Chargement** : squelettes tramés qui pulsent (forme de l'écran attendu).
- **Hors ligne** (`mobile-hors-ligne.png`) : « Pas de réseau… » avec « ゴゴゴゴ », lignes de vitesse, explication (« le cochage hors ligne n'est pas possible ») et bouton « Réessayer ». Un bandeau jaune « Hors ligne » apparaît aussi si la connexion tombe pendant l'utilisation ; toute tentative de cochage affiche alors un toast d'erreur.
- **Erreur** : « Aïe, un imprévu » + message + « Réessayer ».
- **Introuvable** : « Cette case n'existe pas dans ce manga. » + retour à l'accueil.

## 6. Règles métier du suivi

### 6.1 Cocher / décocher

- Un tap sur le sceau coche (ou décoche) **immédiatement** à l'écran (mise à jour optimiste), puis le serveur confirme. En cas d'échec : retour à l'état précédent pour les seuls épisodes concernés + toast d'erreur.
- Micro-interactions au cochage : tampon qui s'écrase (échelle + rotation), petit tremblement de la ligne, « ドン！ » qui jaillit, onde de trame, vibration courte (si disponible), puis la bande censurée s'efface et le titre apparaît. Au décochage, la bande revient.
- Toast de confirmation (« Partie 2 · Épisode 3 : vu ! ») avec **« Annuler » pendant 5 s** (barre de temps). Annuler un cochage décoche ; annuler un décochage recoche **avec la date d'origine**.
- Les épisodes non diffusés ne peuvent pas être cochés (refus serveur « Cet épisode n'est pas encore disponible. »).
- Recocher un épisode déjà vu conserve sa date d'origine.

### 6.2 Épisodes précédents non vus

Cocher l'épisode N alors que des épisodes **diffusés** antérieurs (même partie ou parties précédentes) ne sont pas cochés ouvre une feuille en bas d'écran (`mobile-bottom-sheet-precedents.png`) : « Marquer aussi les X épisodes précédents comme vus ? » avec « Oui, tout marquer » / « Seulement celui-ci ». Fermer la feuille (fond, Échap) n'enregistre rien.

### 6.3 Actions de masse

- « Marquer toute la partie comme vue » : coche tous les épisodes **diffusés** non vus de la partie (confirmation avec le nombre d'épisodes).
- « Réinitialiser la partie » : décoche tous les épisodes vus de la partie (confirmation).
- Les deux sont annulables via le toast.

### 6.4 Fin de partie

Quand une action fait passer une partie à 100 % : **célébration** (`mobile-celebration.png`) — flash, arrêt sur image de l'écran en **filtre sépia**, lignes de vitesse, « バーン », cartouche « PARTIE N TERMINÉE ! » et nom de la partie, puis une flèche originale **« TO BE CONTINUED »** glisse depuis la droite. Un tap n'importe où (ou Échap, ou le bouton « Toucher pour continuer ») ferme. En mouvement réduit : simples fondus, pas de vibration.

## 7. PWA

### 7.1 Installation et lancement

- Manifest : nom « JoJo Tracker », nom court « JoJo Tracker », `lang: fr`, `display: standalone`, orientation portrait, `start_url`/`scope`/`id` = `/`, fond et thème `#0E0B10` (identiques à l'écran de démarrage : pas de flash blanc), catégories, icônes 192/512 « any » et « maskable », favicon SVG ; `apple-touch-icon` 180 px ; 11 écrans de démarrage iPhone.
- Raccourcis : **Reprendre** (`/?reprendre=1`) et **Mes parties** (`/parties`).
- En appli installée : pas de barre d'adresse, barre de statut intégrée (`black-translucent` + `viewport-fit=cover` + zones de sécurité), pas de zoom au double tap, pas de rebond qui dévoile un fond incohérent.

### 7.2 Service worker

- Précache de l'app shell et des assets (JS, CSS, polices, icônes) : démarrage instantané.
- `/api` **jamais mis en cache** (NetworkOnly, exclu du fallback, `Cache-Control: no-store`).
- Navigation hors ligne : l'app shell s'affiche puis l'écran « Pas de réseau ». Aucun cochage hors ligne.
- Mise à jour : la nouvelle version s'installe en arrière-plan ; un toast persistant « Nouvelle version disponible ! » propose « Recharger » — jamais de rechargement forcé.

### 7.3 Invitations à installer

- **Android / Chrome** : l'évènement d'installation est intercepté ; à partir de la 2e ouverture, une bannière discrète sur l'accueil propose « Installer » (ouvre la boîte native). Fermer la bannière ou refuser l'installation la masque définitivement (mémorisé sur l'appareil). Entrée permanente dans le profil.
- **iOS / Safari** (pas d'invite native) : même bannière ; « Installer » ouvre une fiche illustrée (`mobile-installation-fiche-ios.png`) : 1. Partager, 2. « Sur l'écran d'accueil », 3. Ajouter.
- **Déjà installée** (`display-mode: standalone` ou `navigator.standalone`) : aucune invitation (`mobile-standalone-accueil.png`).
- L'installation nécessite le HTTPS.

## 8. Comptes et sécurité (vu de l'utilisateur)

- Pseudo + mot de passe, sans e-mail. Code d'invitation si configuré. Inscriptions fermables.
- « Rester connectée » : session de 30 jours **glissants** (prolongée à l'usage). Sinon : session de navigateur (et 24 h d'inactivité maximum côté serveur).
- Trop d'essais de connexion ou d'inscription depuis la même adresse : blocage temporaire avec message.
- Changement de mot de passe et « déconnexion partout » invalident les autres appareils.
- Chaque utilisateur ne voit et ne modifie que ses propres données.

## 9. Accessibilité et confort

- Mobile d'abord (375 × 812), adapté jusqu'au desktop (colonnes, rail de navigation).
- Cibles tactiles ≥ 44 px ; actions principales en bas de l'écran.
- Contraste WCAG AA vérifié pour chaque palette ; focus visible (contour contrasté) ; navigation clavier complète (feuilles modales avec focus piégé et Échap, lien d'évitement « Aller au contenu ») ; libellés ARIA explicites et sans titre non vu (« Marquer l'épisode 5 comme vu », « Titre masqué. Révéler le titre de l'épisode 5 ») ; annonces des toasts.
- `prefers-reduced-motion` : animations remplacées par des fondus, pas de tremblement ni de vibration, onomatopées immobiles.

## 10. Hors périmètre

Pas de notes, favoris, réseau social, multi-séries, images officielles ni synopsis.
