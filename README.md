# À deux

**Trouvez votre prochain rendez-vous, sans l’indécision.**

[![CI](https://github.com/Annayia-04/a-deux/actions/workflows/ci.yml/badge.svg)](https://github.com/Annayia-04/a-deux/actions/workflows/ci.yml)

Une application fullstack de cartes à swiper : on choisit d’abord son budget, le lieu, le moment, l’ambiance et ses thèmes, puis on garde les idées de rendez-vous qui ressemblent au couple. Chacun peut swiper de son côté et être prévenu dès que les deux partenaires aiment la même idée. Pas de compte, pas d’asset externe, pas de donnée personnelle demandée.

## Fonctionnalités

- **Écran de préférences obligatoire** : budget par personne, intérieur/extérieur, moment de la journée, ambiance, jusqu’à trois thèmes.
- **Aperçu en direct** du nombre d’idées compatibles, calculé côté serveur et débouncé.
- **Deck personnalisé** : filtrage et classement déterministes, stables pendant toute la session.
- **Swipe complet** : glissement à la souris ou au doigt, boutons, flèches du clavier (`←` passer, `→` garder, `Z` annuler).
- **Synchronisation résiliente** : file d’attente séquentielle, reprise après coupure réseau, annulation transactionnelle.
- **Résultats** : liste des envies, copie dans le presse-papiers, reprise du swipe, effacement complet de la session.
- **Responsive** : mobile, tablette et desktop ; animations désactivables via `prefers-reduced-motion`.
- **Mode duo** : un espace à deux se crée en un clic, le partenaire rejoint avec un code à 6 caractères. Chacun swipe sur son propre téléphone ; les idées aimées en commun deviennent des matchs.
- **Notification de match** : célébration plein écran pour celui qui vient de swiper, badge et panneau pour l’autre, rafraîchis par un polling léger (8 s) tant que l’app est ouverte.
- **Panneau duo en feuille** : un tiroir glissable, extensible vers le haut pour lire les souvenirs et swiper les cartes à l’aise ; l’onglet Choix s’ouvre agrandi et reste accessible en un tap depuis l’en-tête.
- **Journal de souvenirs** : après un date, chaque partenaire raconte son moment préféré. Les deux versions se retrouvent dans une timeline groupée par mois, avec un état « 2/2 » quand le souvenir est complet. Un seul souvenir existe par idée : le second membre rejoint automatiquement celui du premier.
- **Choix Nourriture / Films** : un deck de 30 plats et 40 films, swipé séparément par chaque membre. Un match mutuel est signalé et conservé dans l’espace à deux. Un bouton dédié dans l’en-tête ouvre directement le deck.
- **Pensée rapide (tap)** : un bouton dans l’en-tête envoie un halo, un petit carillon et une vibration au partenaire quand le navigateur le permet. Sur iOS, où la Vibration API n’existe pas, le halo et le son prennent le relais ; le son se coupe depuis le panneau duo.
- **240 idées de rendez-vous** dans un catalogue typé, avec visuels CSS/emoji (aucune image distante), dont 81 gratuites.
- **Installable sur mobile et desktop (PWA)** : manifeste, icônes locales, service worker limité aux assets statiques, page hors ligne et invitation contextuelle à installer depuis Safari ou Chrome.

## Stack

| Outil | Version |
| --- | --- |
| Next.js (App Router) | 15.5.29 |
| React | 19.2.9 |
| TypeScript | 5.9.3 |
| Tailwind CSS | 4.3.5 |
| motion | 12.43.0 |
| Zod | 3.25.76 |
| better-sqlite3 | 12.11.1 |
| Vitest | 3.2.7 |

Node.js **≥ 20.9** est requis.

## Démarrage

```bash
npm install
npm run dev
```

Ouvrir <http://localhost:3000>.

Production :

```bash
npm run build
npm start            # port 3000 par défaut
npm start -- -p 3100 # autre port
```

### Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm start` | Serveur de production |
| `npm run typecheck` | Vérification TypeScript (`tsc --noEmit`) |
| `npm test` | Tests unitaires Vitest |
| `npm run test:watch` | Tests en mode watch |
| `npm run smoke` | Test de fumée HTTP contre un serveur déjà démarré |
| `npm run db:migrate` | Applique les migrations Postgres (nécessite `DATABASE_URL`) |
| `npm run db:status` | État des migrations Postgres |

## Application installable (PWA)

L’application est une PWA complète : elle peut s’installer sur l’écran d’accueil d’un téléphone ou dans un navigateur de bureau, s’ouvrir en plein écran et afficher une page de secours quand le réseau disparaît.

- **Android / Chrome / Edge / desktop** : bouton « Installer » dans l’encart de l’écran de préférences, alimenté par `beforeinstallprompt`.
- **iPhone / iPad** : Safari → bouton **Partager** → **Sur l’écran d’accueil**. L’encart explique les trois étapes.
- **Refus mémorisé** 14 jours pour ne pas harceler.
- **Service worker** enregistré uniquement en production : il ne met en cache que `/_next/static/*`, `/icons/*`, le manifeste et la page hors ligne. Les pages SSR et les API ne sont **jamais** mises en cache, car elles dépendent de la session et du nonce CSP.
- **HTTPS requis** hors `localhost` : c’est la condition posée par les navigateurs pour installer une PWA et enregistrer un service worker.
- **Raccourcis de l’icône installée** : appui long sur l’icône → **Petit ping** (ouvre l’app et envoie aussitôt une pensée au partenaire) ou **Mon duo** (ouvre l’espace à deux). Le paramètre `?ping=1` / `?duo=1` est lu une seule fois puis retiré de l’URL, pour qu’un rechargement ne rejoue jamais l’envoi.
  - Un vrai widget d’écran d’accueil, utilisable **sans ouvrir l’app**, n’est pas possible en PWA : il demande le wrapper natif Capacitor (App Widget Android, WidgetKit iOS). La conception est décrite dans `docs/architecture-comptes-postgres.md`.

Fichiers concernés : `app/manifest.ts` (manifeste généré), `lib/launch-action.ts` (raccourcis), `public/sw.js`, `public/offline.html`, `public/icons/` (192, 512, 1024, maskable, icône Apple), `components/service-worker-register.tsx` et `components/install-card.tsx`.

Pour aller plus loin, un wrapper natif Capacitor (App Store / Play Store) est décrit dans `docs/architecture-comptes-postgres.md`.

### Branches et intégration continue

| Branche | Usage |
| --- | --- |
| `main` | Production — mise à jour uniquement après feu vert |
| `staging` | Pré-production — mise à jour uniquement après feu vert |
| `dev` | Développement courant — branche par défaut des push |

Le workflow `.github/workflows/ci.yml` s’exécute sur chaque push et pull request vers ces trois branches : installation reproductible (`npm ci`), vérification TypeScript, tests unitaires, build de production, puis test de fumée HTTP contre un serveur `next start` temporaire. Les exécutions obsolètes d’une même branche sont annulées automatiquement.

### Flux de release

- Le développement se fait sur `dev` : commits et push uniquement sur cette branche.
- `staging` et `main` (production) ne sont mises à jour **qu’après validation explicite** (feu vert). Aucune fusion ni aucun push automatique vers ces branches.
- Une release est un fast-forward de `dev` vers `staging`, puis de `staging` vers `main`, après accord ; la CI doit être verte sur chaque branche.

## Variables d’environnement

Copier `.env.example` vers `.env.local` (ou définir les variables dans l’environnement d’exécution).

| Variable | Défaut | Description |
| --- | --- | --- |
| `DATA_DIR` | `./.data` | Répertoire du fichier SQLite `date-swipe.db`. Créé automatiquement. |
| `COOKIE_SECURE` | auto | `true` force le drapeau `Secure` du cookie, `false` le désactive. Absent, il est déduit de `X-Forwarded-Proto` puis de l’URL de la requête. |
| `DATABASE_URL` | vide | URL PostgreSQL applicative. Absente → SQLite. Locale : `postgres://postgres@127.0.0.1:5432/a_deux`. En production : chaîne *pooled* Neon/Supabase. |
| `DATABASE_URL_DIRECT` | `DATABASE_URL` | Chaîne directe (sans pooler) utilisée par `npm run db:migrate`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | vide | OAuth Google. Le bouton est masqué tant que les deux manquent. Voir `docs/google-oauth-setup.md`. |
| `APPLE_CLIENT_ID` / `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY` | vide | Sign in with Apple (Service ID + clé `.p8`). Bouton masqué si incomplet. |
| `APP_SESSION_SECRET` | vide | Secret de signature des cookies OAuth (`state`, `nonce`). Sans lui, les boutons de connexion sont masqués et `/api/auth/*` renvoie 503. Générer avec `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. |
| `APP_ORIGIN` | auto | Origine publique forcée pour construire l’URI de redirection OAuth (ex. `http://localhost:3000` si le serveur écoute ailleurs). Sinon `x-forwarded-proto`/`x-forwarded-host`, puis l’URL de la requête. |

En production derrière un reverse proxy TLS, transmettre `X-Forwarded-Proto: https` (ou définir `COOKIE_SECURE=true`) pour que le cookie soit marqué `Secure`.

### Base de données

SQLite reste le moteur par défaut, sans configuration. Une instance PostgreSQL 18.1 portable est installée localement pour développer la couche de comptes : voir `docs/postgres-local.md` (démarrage, arrêt, migrations, passage à Neon/Supabase).

```bash
npm run db:migrate   # applique db/migrations/*.sql
npm run db:status    # état des migrations, sans modification
```

Les migrations sont transactionnelles, verrouillées par un advisory lock et protégées par un checksum : une migration déjà appliquée ne peut pas être réécrite.

### Compte Google (facultatif)

Le mode anonyme reste le défaut : aucun bouton n’apparaît tant que Google et `APP_SESSION_SECRET` ne sont pas configurés. Une fois configuré :

1. la carte « Retrouvez votre duo partout » propose **Continuer avec Google** sur l’écran de préférences ;
2. l’identité (nom, e-mail) est stockée dans Postgres (`users`, `auth_identities`), les données de jeu restent dans SQLite ;
3. le compte est rattaché à une **session canonique** ; un autre appareil reçoit un alias opaque (`session_aliases`) qui pointe vers la même session, donc vers le même duo et les mêmes souvenirs ;
4. **Se déconnecter** révoque le jeton de compte et, sur un appareil secondaire, supprime l’alias — la session d’origine et le duo sont conservés.

L’URI de redirection déclarée dans Google Cloud doit correspondre exactement à l’origine utilisée : pour tester en local, lancer le serveur sur le port 3000 (`npm start -- -p 3000`) ou définir `APP_ORIGIN`. Procédure détaillée : `docs/google-oauth-setup.md`. Apple reste masqué tant qu’un compte Apple Developer payant n’est pas disponible.

## Architecture

```text
app/
  layout.tsx              Métadonnées, viewport, thème sombre, enregistrement du SW
  manifest.ts             Manifeste PWA (nom, icônes, affichage plein écran)
  page.tsx                Page unique : charge la session côté serveur (SSR)
  globals.css             Thème Tailwind, dégradés, animations
  api/
    session/route.ts        POST création / reset en place / DELETE effacement
    preview/route.ts        POST aperçu du nombre d’idées
    swipes/route.ts         POST enregistrement d’un swipe (+ match éventuel)
    swipes/undo/route.ts    POST annulation du dernier swipe
    couple/route.ts         GET état, POST création, DELETE sortie du duo
    couple/join/route.ts    POST rejoindre avec un code
    couple/seen/route.ts    POST marquer les matchs comme vus
    souvenirs/route.ts      GET timeline, POST création d’un souvenir
    souvenirs/[id]/note/route.ts  PUT moment préféré de la session
    choices/route.ts        GET deck, likes et matchs d’une catégorie
    choices/swipe/route.ts  POST like/pass sur une carte
    choices/seen/route.ts   POST marquer les matchs d’une catégorie vus
    taps/route.ts           GET dernier tap reçu, POST envoi d’une pensée
    taps/seen/route.ts      POST avancer le curseur de lecture
components/
  date-swipe-app.tsx      Orchestration setup / swipe / résultats, toasts, duo
  setup-screen.tsx        Introduction + écran de préférences + installation PWA
  preference-form.tsx     Formulaire de filtres, aperçu, invitation duo
  install-card.tsx        Invitation à installer la PWA (Android, iOS, refus 14 j)
  service-worker-register.tsx  Enregistrement du service worker en production
  swipe-screen.tsx        Pile de cartes, drag, clavier, progression, badge duo
  date-card.tsx           Carte d’une idée (présentation pure)
  results-view.tsx        Liste des envies, copie, reprise, résumé du duo
  duo-dialog.tsx          Panneau duo à onglets : matchs, souvenirs, choix
  duo-invite.tsx          Création / jonction depuis l’écran de préférences
  souvenir-timeline.tsx   Timeline groupée par mois
  souvenir-dialog.tsx     Création d’un souvenir et édition de son moment
  choice-deck.tsx         Deck swipe Nourriture / Films et matchs
  tap-button.tsx          Bouton de pensée rapide avec cooldown
  tap-pulse.tsx           Halo visuel et vibration à la réception
  match-celebration.tsx   Célébration générique (idées, plats, films)
  brand.tsx, icons.tsx    Identité et icônes SVG inline
lib/
  config.ts               Lecture des variables serveur, drapeaux SSO/Postgres
  account-db.ts           Postgres : utilisateurs, identités Google, sessions de compte, session canonique
  auth/provider.ts        Fournisseurs d’identité (types partagés, sans secret)
  auth/state.ts           Cookie d’état OAuth signé HMAC, nonce, PKCE S256
  auth/google.ts          URL d’autorisation, échange du code, vérification JWKS de l’id_token
  auth/account.ts         Cookie `adeux_account`, compte courant, instantané d’identité
  auth/origin.ts          Origine publique (proxy, APP_ORIGIN) pour l’URI de redirection
  ideas.ts                Catalogue : base historique (120) + extension
  ideas-extra.ts          Extension thématique du catalogue (120 idées)
  choices.ts              Catalogue de 30 plats et 40 films, ordre du deck
  preferences.ts          Métadonnées des filtres, résumés lisibles
  recommend.ts            Filtrage, score et ordre déterministe du deck
  text.ts                 Nettoyage du texte libre (NFC, contrôles, espaces)
  seeded.ts               PRNG déterministe partagé
  schemas.ts              Schémas Zod stricts (préférences, swipes, duo, souvenirs, choix, tap)
  db.ts                   SQLite : sessions, alias d’appareils, swipes, couples, matchs, souvenirs, choix, taps
  couple.ts               Helpers serveur du duo, autorisations et réconciliation
  souvenirs.ts            Création, timeline et notes de souvenirs
  choice-service.ts       Deck, swipe et matchs Nourriture / Films
  taps.ts                 Envoi, lecture et curseur des pensées rapides
  couple-code.ts          Génération et normalisation du code d’invitation
  session.ts              Cookie, session active, détection HTTPS
  session-token.ts        Jeton opaque 256 bits + hachage SHA-256
  http.ts                 JSON borné, CSRF, rate limit, erreurs génériques
  rate-limit.ts           Limiteur en mémoire (fenêtre glissante)
  api-client.ts           Client API typé côté navigateur
  use-swipe-sync.ts       File d’attente de synchronisation des swipes
  use-couple-sync.ts      Polling du duo, dédoublonnage des notifications
  use-souvenirs.ts        Chargement et rafraîchissement du journal
  use-choices.ts          Deck optimiste et matchs de choix
  use-taps.ts             Polling des pensées et vibration
  share.ts                Texte de partage de la liste
  launch-action.ts        Raccourcis de l’icône PWA (petit ping, duo)
  snapshot.ts             Chargement SSR de la session
  types.ts                Types partagés client/serveur
middleware.ts             CSP à nonce par requête (worker-src, manifest-src)
public/
  sw.js                   Service worker : assets statiques + page hors ligne
  offline.html            Page de secours autonome, sans requête réseau
  icons/                  Icônes PWA locales (192, 512, 1024, maskable, Apple)
db/
  migrations/001_accounts.sql  Comptes, identités, sessions, duos (Postgres)
  migrations/002_account_app_session.sql  Session canonique et e-mail du compte
scripts/
  smoke.mjs               Test de fumée HTTP de bout en bout
  db-migrate.mjs          Runner de migrations Postgres (verrou + checksum)
docs/architecture-comptes-postgres.md  Conception SSO, Postgres et wrapper natif
docs/postgres-local.md                 Instance locale, démarrage et migrations
docs/google-oauth-setup.md             Procédure Google Cloud pas à pas
```

### Données

SQLite, mode WAL, base locale dans `DATA_DIR/date-swipe.db` :

- `sessions` : `id` (SHA-256 du jeton), préférences JSON, seed, `created_at`, `last_seen_at`.
- `session_aliases` : `alias_id` (hash du jeton d’un appareil secondaire), `session_id` canonique, `user_id`, `created_at`. Supprimés avec la session.
- `swipes` : `session_id`, `idea_id`, `direction`, `created_at`, clé primaire composite, suppression en cascade avec la session.
- `couples` : `id`, `code` unique à 6 caractères, `created_at`.
- `couple_members` : `couple_id`, `session_id` unique (une session dans au plus un duo), `joined_at`. Le maximum de deux membres est vérifié dans la transaction d’adhésion.
- `matches` : matchs mutuels matérialisés (`couple_id`, `idea_id`, `created_at`), pour conserver une date et un état de lecture.
- `match_views` : état « vu » par membre (`couple_id`, `idea_id`, `session_id`, `viewed_at`).
- `souvenirs` : date vécu (`id`, `couple_id`, `idea_id` facultatif, `title`, `emoji`, `happened_at`, `created_by`, `created_at`). Le titre et l’emoji sont figés à la création pour rester lisibles même si le catalogue change. Un index unique partiel sur `(couple_id, idea_id)` garantit un seul souvenir par idée ; les doublons historiques sont fusionnés au démarrage en conservant les notes des deux membres.
- `souvenir_notes` : un moment par membre et par souvenir (`souvenir_id`, `session_id`, `body`, `created_at`, `updated_at`), clé primaire composite.
- `choice_swipes` : like/pass personnel sur une carte (`session_id`, `category`, `choice_id`, `direction`, `created_at`).
- `choice_matches` : matchs mutuels Nourriture / Films (`couple_id`, `category`, `choice_id`, `created_at`).
- `choice_match_views` : état « vu » par membre (`couple_id`, `category`, `choice_id`, `session_id`, `viewed_at`).
- `taps` : pensées rapides (`id` auto-incrémenté, `couple_id`, `from_session`, `created_at`), purgées après 7 jours.
- `tap_reads` : curseur de lecture par membre (`couple_id`, `session_id`, `last_tap_id`).

Les requêtes utilisent des statements préparés mis en cache. L’annulation du dernier swipe, la création/adhésion/sortie d’un duo, la réconciliation des matchs, la création d’un souvenir et l’enregistrement d’un choix sont transactionnels. Les tables sont créées avec `CREATE TABLE IF NOT EXISTS` : une base existante est migrée au démarrage.

## API

Toutes les routes sont dynamiques, `no-store`, et exigent une origine de même hôte pour les mutations.

### `POST /api/session`

```json
{
  "prefs": {
    "budget": 80,
    "setting": "any",
    "time": "any",
    "energy": "any",
    "themes": ["nature"]
  }
}
```

- `budget` : `0`, `30`, `80` ou `null` (sans limite).
- `setting` : `indoor`, `outdoor`, `any`.
- `time` : `day`, `evening`, `any`.
- `energy` : `calm`, `active`, `any`.
- `themes` : 0 à 3 valeurs parmi `culture`, `gastronomie`, `nature`, `aventure`, `creatif`, `detente`, `sport`, `nocturne`, sans doublon.

Réponse `201` : `{ prefs, ideas, likedIdeas, total, swiped, couple }` + cookie `date_swipe_session`. `422` si aucun résultat, `400` si le schéma est invalide.

Si la requête porte déjà un cookie valide, la session est **réinitialisée en place** : même identifiant, même appartenance à un duo et mêmes matchs, mais swipes effacés et deck recalculé. On ne perd donc pas son espace à deux en changeant de sélection.

### `DELETE /api/session`

Supprime la session et ses swipes, puis vide le cookie. Réponse `{ "ok": true }`.

### `POST /api/preview`

Même corps que la création. Réponse `{ "count": number }`. Endpoint sans effet de bord.

### `POST /api/swipes`

```json
{ "ideaId": "pique-nique-coucher-soleil", "direction": "like" }
```

Réponse `{ "ok": true, "swiped": number, "match"?: Idea }`. Le champ `match` n’apparaît que si ce like forme un match mutuel avec le partenaire ; le serveur marque alors le match comme vu pour la personne qui vient de swiper. `401` sans session, `404` idée inconnue, `422` idée hors sélection.

### `POST /api/swipes/undo`

Annule le dernier swipe. Réponse `{ "ok": true, "ideaId": "..." }`, ou `409` s’il n’y a rien à annuler. Si le swipe annulé avait créé un match, celui-ci est supprimé (sauf si les deux likes subsistent).

### `GET /api/couple`

État du duo de la session : `{ "couple": CoupleSnapshot | null }`, où `CoupleSnapshot` contient `code`, `memberCount`, `complete`, `matches` (`idea`, `matchedAt`, `seen`), `unread`, `choiceMatches` (`category`, `choiceId`, `matchedAt`, `seen`) et `choiceUnread`. `401` sans session. Aucune donnée d’un duo n’est accessible sans en être membre.

### `POST /api/couple`

Crée un espace à deux et y rattache la session. Idempotent si la session appartient déjà à un duo. `201` avec `{ "couple": ... }`.

### `POST /api/couple/join`

```json
{ "code": "ABC234" }
```

Le code est normalisé (majuscules, espaces et tirets retirés). Réponse `{ "couple": ... }`. `400` format invalide, `404` code inconnu, `409` duo complet ou session déjà membre d’un autre duo. Les matchs mutuels déjà possibles sont recalculés à l’arrivée et marqués vus pour la personne qui rejoint.

### `POST /api/couple/seen`

Marque tous les matchs du duo comme vus pour la session courante. Réponse `{ "couple": ... }`, `409` si la session n’est dans aucun duo.

### `DELETE /api/couple`

Quitte le duo. Les matchs, souvenirs, choix et pensées partagés sont supprimés ; l’espace est fermé quand son dernier membre part. Réponse `{ "ok": true }`, `409` si la session n’est dans aucun duo.

### `GET /api/souvenirs`

Timeline du duo : `{ "souvenirs": SouvenirSnapshot[] }`, du plus récent au plus ancien. Chaque élément contient `title`, `emoji`, `ideaId`, `happenedAt`, `mine`, `partner` et `complete` (les deux membres ont écrit leur moment). `409` si la session n’est dans aucun duo.

### `POST /api/souvenirs`

```json
{
  "ideaId": "pique-nique-sunset",
  "body": "Le coucher de soleil et les sandwiches."
}
```

Ou un souvenir manuel : `{ "title": "Dîner sur les toits", "emoji": "🌙", "happenedAt": 1776000000000, "body": "..." }`. Le corps est facultatif (1 à 500 caractères après nettoyage), `happenedAt` doit être une date valide et non future de plus de 24 h. Réponse `201` `{ "souvenir": ... }`, `400` données invalides, `409` tant que le partenaire n’a pas rejoint le duo. Avec `ideaId`, l’opération est idempotente : si le partenaire a déjà créé le souvenir de cette idée, le corps est ajouté au même souvenir au lieu d’en créer un second.

### `PUT /api/souvenirs/[id]/note`

Enregistre ou remplace **son propre** moment : `{ "body": "La lumière sur l’eau." }`. Le souvenir doit appartenir au duo de la session, sinon `404`. Réponse `{ "souvenir": ... }`.

### `GET /api/choices?category=food|movie`

Deck restant, likes et matchs d’une catégorie : `{ category, deck, matches, liked, swiped, total, unread }`. `400` catégorie invalide, `409` sans duo.

### `POST /api/choices/swipe`

```json
{ "category": "food", "choiceId": "pizza-maison", "direction": "like" }
```

Réponse `{ "ok": true, "match": Choice | null }`. `match` n’est renseigné que si ce like crée un match mutuel ; le serveur marque alors le match comme vu pour la personne qui vient de swiper. `400` carte inconnue ou hors catégorie (allowlist du catalogue), `409` tant que le duo n’est pas complet.

### `POST /api/choices/seen`

Marque les matchs d’une catégorie comme vus : `{ "category": "food" }`. Réponse `{ "ok": true, "unread": number }`. Indépendant de `POST /api/couple/seen`, qui ne concerne que les matchs d’activités.

### `GET /api/taps`

Dernier tap non lu envoyé par le partenaire : `{ "tap": { "id", "createdAt" } | null, "unread": number }`. `409` sans duo.

### `POST /api/taps`

Envoie une pensée. Réponse `201` `{ "tap": { "id", "createdAt" } }`, `409` tant que le duo n’est pas complet, `429` avec `Retry-After` si une pensée a été envoyée il y a moins de 8 secondes (et au-delà de 20 par heure).

### `POST /api/taps/seen`

Avance le curseur de lecture : `{ "tapId": 42 }`. Le serveur borne l’identifiant aux taps réellement reçus ; un client ne peut donc pas masquer des pensées futures. Réponse `{ "ok": true }`.

### Limites de débit

| Route | Limite | Clé |
| --- | --- | --- |
| `POST /api/session` | 12 / min | IP |
| `DELETE /api/session` | 20 / min | IP |
| `POST /api/preview` | 60 / min | IP |
| `POST /api/swipes` | 180 / min | session |
| `POST /api/swipes/undo` | 60 / min | session |
| `GET /api/couple` | 120 / min | session |
| `POST /api/couple` | 8 / min | session |
| `DELETE /api/couple` | 20 / min | session |
| `POST /api/couple/join` | 12 / min | session |
| `POST /api/couple/join` | 30 / min | IP |
| `POST /api/couple/seen` | 60 / min | session |
| `GET /api/souvenirs` | 60 / min | session |
| `POST /api/souvenirs` | 20 / min | session |
| `PUT /api/souvenirs/[id]/note` | 20 / min | session |
| `GET /api/choices` | 120 / min | session |
| `POST /api/choices/swipe` | 60 / min | session |
| `POST /api/choices/seen` | 30 / min | session |
| `GET /api/taps` | 120 / min | session |
| `POST /api/taps` | 1 / 8 s + 20 / h | session |
| `POST /api/taps/seen` | 60 / min | session |

Les corps JSON sont limités à **8 Ko** et le `Content-Type` doit être `application/json`.

## Sécurité et vie privée

- **Session anonyme** : jeton aléatoire de 256 bits (`base64url`) dans un cookie `HttpOnly`, `SameSite=Lax`, `Path=/`, durée 30 jours. Seul son **SHA-256** est stocké en base : une fuite de la base ne permet pas de rejouer les sessions.
- **Aucune donnée personnelle** : ni nom, ni e-mail, ni compte. Les préférences, les swipes et l’appartenance à un duo sont les seules données, liées à la session.
- **Mode duo privé** : le code d’invitation fait 6 caractères (alphabet sans `0/O/1/I`) et n’est renvoyé qu’aux deux membres du duo. La jonction est limitée par session et par IP pour freiner les essais. Un duo accepte au plus deux membres, et une session ne peut appartenir qu’à un seul duo.
- **Minimisation du duo** : les swipes individuels ne sont jamais exposés au partenaire ; seuls les matchs mutuels (deux likes sur la même idée ou la même carte) remontent dans l’espace partagé. Quitter le duo supprime les matchs, souvenirs, choix et pensées partagés.
- **Autorisation systématique** : chaque lecture ou écriture partagée repart de la session serveur pour retrouver le duo, puis filtre en SQL par `couple_id`. Aucun identifiant de duo, de session ou de membre n’est accepté depuis le client. Un souvenir ou un match d’un autre duo est traité comme inexistant.
- **Texte libre maîtrisé** : les souvenirs passent par `sanitizePlainText` (normalisation NFC, suppression des contrôles, caractères invisibles et bidi, compactage des espaces), avec une longueur maximale de 500 caractères. Le stockage reste du texte brut et le rendu se fait exclusivement via React, sans `dangerouslySetInnerHTML` : aucune injection HTML ou XSS.
- **Pensées rapides limitées** : un tap par 8 secondes et 20 par heure et par session, avec `Retry-After` sur les 429. Le curseur de lecture ne peut avancer qu’au plus loin des taps réellement reçus, et les taps de plus de 7 jours sont purgés à l’envoi suivant.
- **CSRF** : vérification de `Origin` / `Host` et de `Sec-Fetch-Site` sur toutes les mutations.
- **Validation stricte** : Zod avec objets `.strict()` (toute clé inconnue est rejetée), énumérations fermées, identifiants d’idées et de cartes contraints. Le serveur revérifie qu’une carte swipée appartient bien à la sélection ou au catalogue statique.
- **CSP à nonce** par requête, `strict-dynamic`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`. La directive `upgrade-insecure-requests` n’est ajoutée que si la requête arrive en HTTPS, pour ne pas casser les assets lors d’un test HTTP sur une IP locale.
- **En-têtes** : HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP, `X-Powered-By` désactivé.
- **Erreurs génériques** : aucune stack, requête SQL ou chemin interne renvoyé au client.
- **Minimisation** : aucune adresse IP persistée ; elle ne sert qu’au rate limiting en mémoire. Aucun analytics, aucune police, aucune image distante.

## Optimisation

- Deck filtré, scoré et ordonné **côté serveur**, avec un seed par session pour un ordre stable.
- Snapshot rendu en SSR ; le client n’a pas à recharger le catalogue pour afficher la première carte.
- Catalogue statique et visuels 100 % CSS/emoji : aucun asset réseau, pas de layout shift.
- SQLite WAL, statements préparés en cache, une seule connexion par processus.
- Aperçu des filtres débouncé (280 ms) et annulable via `AbortController`.
- Swipes optimistes côté client, file séquentielle et reprise réseau ; l’UI ne bloque jamais sur le réseau.
- **Synchronisation du duo** : polling de 8 s uniquement quand un duo existe, suspendu quand l’onglet est en arrière-plan. Le membre qui swipe reçoit le match immédiatement dans la réponse du swipe ; l’autre le découvre au prochain polling.
- **Journal et choix** : la timeline se rafraîchit silencieusement toutes les 10 s quand elle est ouverte ; les swipes de choix sont optimistes (la carte part immédiatement, retour arrière et toast si le serveur refuse).
- **Pensées rapides** : polling dédié de 3 s, uniquement quand le duo est complet et l’onglet visible. Vibration via `navigator.vibrate` sur Android, halo visuel et carillon Web Audio ailleurs (iOS, desktop). Le carillon est débloqué au premier geste et se coupe depuis l’en-tête du panneau duo.
- Première page : ~182 Ko de JS au premier chargement (build de production).

## Tests

```bash
npm run typecheck
npm test
```

99 tests unitaires couvrent le catalogue d’idées et de choix, le filtrage/classement, les schémas Zod (préférences, duo, souvenirs, choix, tap), le nettoyage du texte libre, les codes d’invitation, les jetons de session, le rate limiter, la configuration SSO, les raccourcis de lancement PWA, ainsi que la signature des cookies OAuth et la vérification complète des `id_token` Google (signature RSA, `iss`, `aud`, `exp`, `iat`, `nonce`, algorithme, `kid`).

Test de fumée complet (serveur de production requis) :

```bash
npm run build
npm start -- -p 3100
npm run smoke -- http://localhost:3100
```

Il vérifie la création de session et le cookie, le respect des préférences, le SSR et la CSP à nonce, l’enregistrement d’un swipe, l’état rechargé, l’undo, le refus sans session, le CSRF, la validation, le type de contenu, l’aperçu, le rate limiting et l’effacement de session. Le manifeste est contrôlé jusqu’aux raccourcis « Petit ping » et « Mon duo ». Il couvre aussi le compte : état anonyme, fournisseurs réellement annoncés, redirection Google signée (ou 503 explicite sans configuration), refus d’un callback sans état valide et CSRF sur la déconnexion. Un second parcours couvre le duo avec deux sessions indépendantes : création, adhésion, refus d’un troisième membre, codes invalides, match mutuel, état non lu, marquage vu, annulation du match, conservation du duo lors d’un changement de sélection, match Nourriture et match Film, compteurs séparés, souvenirs écrits par A puis B, création idempotente d’un même souvenir par les deux membres, validation et accès refusé à une session tierce, tap reçu, anti-spam 429 avec `Retry-After`, curseur borné, puis sortie qui efface les contenus partagés.

## Limites connues et passage à l’échelle

- **Rate limiting en mémoire** : propre à chaque processus, non partagé entre instances. Pour un déploiement multi-instances, remplacer `lib/rate-limit.ts` par Redis (même interface).
- **SQLite** : adapté à une instance unique avec un volume persistant. Pour du multi-instances, migrer vers une base partagée (PostgreSQL) et un stockage de sessions distribué.
- **Purge des sessions** : les sessions expirées sont supprimées lors de la création d’une nouvelle session. Ajouter un cron si le volume devient important.
- **`X-Forwarded-For`** : doit être posé par un reverse proxy de confiance, sinon la clé de rate limiting peut être usurpée.
- **Compte facultatif** : la session anonyme et le duo reposent sur le cookie, sans aucune configuration. Effacer les cookies perd l’accès à cet appareil ; une fois la connexion Google activée, un nouvel appareil retrouve le duo en se connectant au même compte. Apple n’est pas encore proposé (compte Apple Developer payant requis) et le déplacement complet des données vers Postgres reste la phase 2 décrite dans `docs/architecture-comptes-postgres.md`.
- **Sélection modifiable** : changer ses envies réinitialise le deck en place (même session, même duo, matchs réconciliés). Le deck reste stable tant que la sélection ne change pas.
- **Annulation** : une carte à la fois, uniquement lorsque la file de synchronisation est vide.
- **Notifications in-app** : le match est visible quand l’app est ouverte (célébration, toast, badge). Pas de push ni de WebSocket ; le partenaire est prévenu au plus tard au polling suivant (8 s, 3 s pour les pensées).
- **Vibration** : `navigator.vibrate` n’existe pas sur iOS ni sur la plupart des desktop ; le halo visuel et le toast servent toujours de secours. `prefers-reduced-motion` est respecté.
- **Souvenirs et choix après une sortie** : les deux membres perdent immédiatement les contenus partagés (souvenirs, matchs de choix, pensées). Les swipes de choix personnels restent liés à la session, comme les swipes d’idées, et ne sont jamais exposés au partenaire.
- **Catalogue de choix** : 30 plats et 40 films statiques dans `lib/choices.ts`. Le deck s’épuise ; les matchs restent consultables dans le panneau duo.
- **Catalogue** : 240 idées statiques réparties entre `lib/ideas.ts` (base historique) et `lib/ideas-extra.ts` (extension), dont 81 gratuites. Le budget par défaut (`80 €`) en rend 236 compatibles ; passer à « Sans limite » les affiche toutes. Chaque combinaison budget / lieu / moment / ambiance propose plusieurs idées (y compris gratuit + intérieur).
- **HTTPS** : indispensable en production pour un cookie `Secure`. Derrière un proxy TLS, transmettre `X-Forwarded-Proto: https` ou définir `COOKIE_SECURE=true`.

## Personnaliser le catalogue

Ajouter ou modifier une idée dans `lib/ideas.ts` (base historique) ou `lib/ideas-extra.ts` (extension) en respectant le type `Idea`. Les tests `lib/catalog.test.ts` valident l’unicité des identifiants, les thèmes, les budgets et la cohérence des textes. Aucun autre fichier n’est à toucher : filtres, classement, carte et partage s’adaptent automatiquement.
