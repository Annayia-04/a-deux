# Comptes, SSO et Postgres : architecture cible

Document de conception. Rien de ce qui suit n’est encore branché : l’application
fonctionne aujourd’hui en session anonyme sur SQLite. Les choix sont figés pour
éviter une demi-migration, et le code sera ajouté dès que les identifiants
Google/Apple et l’URL Postgres seront disponibles.

## 1. Décisions structurantes

| Sujet | Décision | Raison |
| --- | --- | --- |
| Base en production | PostgreSQL managé (Neon ou Supabase) | Sauvegardes, montée en charge, connexions multiples, pas de volume à maintenir. |
| Base en local | SQLite conservé pour le développement et les tests | Démarrage instantané, zéro dépendance externe, parité fonctionnelle via un port de schéma. |
| Accès aux données | Une couche de dépôts (`lib/db/*`) avec deux implémentations | Le reste de l’application ne connaît que les fonctions métier ; pas de SQL éparpillé. |
| Identité | Google + Apple, boutons masqués si non configurés | Pas de dépendance dure à un fournisseur unique ; le mode anonyme reste disponible. |
| Session | Jeton opaque 256 bits, haché en base, cookie `HttpOnly` | Aucun JWT côté client : révocation immédiate possible. |
| Liaison anonyme | La session anonyme devient un compte, jamais l’inverse | On ne perd ni swipes, ni duo, ni souvenirs au moment de la connexion. |
| Autorisation | Toujours recalculée côté serveur à partir de la session | Aucun identifiant d’utilisateur, de couple ou de membre accepté du client. |

Le point clé : **Postgres n’est pas une traduction de SQLite ligne à ligne**. On
profite du changement pour séparer l’identité (`users`) de l’appareil/session
(`auth_sessions`) et pour matérialiser l’appartenance à un duo côté utilisateur,
alors qu’elle est aujourd’hui portée par une session jetable.

## 2. Modèle de données cible

```text
users ──1:n── auth_identities
  │ 1:n
  └── auth_sessions (appareils)
  │
  └──1:1── couple_members ──n:1── couples
                                   │
                                   ├── matches / match_views
                                   ├── souvenirs / souvenir_notes
                                   ├── choice_matches / choice_match_views
                                   └── taps / tap_reads
```

- `users` : la personne, indépendante de tout fournisseur et de tout appareil.
- `auth_identities` : le lien vers Google ou Apple (`provider`, `subject`).
  Un utilisateur peut avoir plusieurs identités ; une identité n’appartient
  qu’à un utilisateur.
- `auth_sessions` : un appareil connecté. Plusieurs sessions par utilisateur,
  révocables individuellement.
- `anonymous_sessions` : l’existant (cookie anonyme). Une session anonyme peut
  être **réclamée** par un utilisateur, elle n’est jamais supprimée avant la
  fin de la transaction de liaison.

### Schéma SQL (idempotent)

```sql
CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE TABLE IF NOT EXISTS auth_identities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider      text NOT NULL CHECK (provider IN ('google', 'apple')),
  subject       text NOT NULL,
  email         text,
  email_verified boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  UNIQUE (provider, subject)
);
CREATE INDEX IF NOT EXISTS auth_identities_user_idx
  ON auth_identities (user_id);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash       bytea PRIMARY KEY,           -- SHA-256 du jeton opaque
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  anonymous_id     text,                        -- session anonyme d’origine
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_seen_at     timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz NOT NULL,
  revoked_at       timestamptz,
  user_agent_hash  bytea,
  ip_hash          bytea
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx
  ON auth_sessions (user_id)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS anonymous_sessions (
  id            text PRIMARY KEY,               -- SHA-256 du cookie anonyme
  prefs         jsonb NOT NULL,
  seed          bigint NOT NULL,
  claimed_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  claimed_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS couples (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at  timestamptz
);

CREATE TABLE IF NOT EXISTS couple_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id  uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES users(id) ON DELETE CASCADE,
  anon_id    text REFERENCES anonymous_sessions(id) ON DELETE CASCADE,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  CHECK ((user_id IS NULL) <> (anon_id IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS couple_members_user_uniq
  ON couple_members (user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS couple_members_anon_uniq
  ON couple_members (anon_id) WHERE anon_id IS NOT NULL;
```

Les tables métier (`swipes`, `matches`, `souvenirs`, `taps`, `choices`)
reprennent leur structure actuelle, avec deux changements :

1. La colonne `session_id` devient `owner_id` : soit un `user_id`, soit un
   `anon_id`. Les swipes personnels suivent la personne, plus l’appareil.
2. `couple_id` reste la clé d’autorisation de tous les contenus partagés.

La contrainte « deux membres maximum » reste vérifiée dans la transaction
d’adhésion (verrou `SELECT … FOR UPDATE` sur la ligne `couples`), comme
aujourd’hui en SQLite.

## 3. Liaison anonyme → compte

C’est le parcours le plus sensible : il ne doit rien perdre et ne jamais
fusionner deux personnes.

1. L’utilisateur se connecte depuis une session anonyme qui possède déjà un duo.
2. Le serveur échange le code OAuth, vérifie l’identité, puis ouvre une
   transaction :
   - si `(provider, subject)` existe déjà → utilisateur existant ;
   - sinon → création de `users` + `auth_identities` ;
   - `anonymous_sessions.claimed_by` est renseigné ;
   - les swipes personnels de l’anonyme sont réattachés à l’utilisateur ;
   - l’appartenance au duo passe de `anon_id` à `user_id`, sans changer
     `couple_id` : matchs, souvenirs, choix et pensées restent intacts.
3. Si l’utilisateur possédait déjà un autre compte/duo sur un autre appareil :
   **on ne fusionne pas automatiquement deux duos**. On affiche un choix
   explicite (« garder cet espace », « rejoindre mon espace existant »), et la
   fusion éventuelle reste une opération dédiée et tracée. Une fusion
   silencieuse de souvenirs ou de notes serait irréversible.
4. Le cookie anonyme est remplacé par le cookie de session authentifiée dans la
   même réponse. L’ancien jeton est marqué `claimed_at` puis purgé.

Règle de sécurité : une session anonyme déjà réclamée ne peut plus être
réclamée par un autre compte. Le contrôle se fait sous verrou pour éviter deux
connexions concurrentes sur le même cookie.

### Mise en œuvre actuelle (phase 1, avant la migration complète)

Tant que les données de jeu restent dans SQLite, la liaison est réalisée sans
copie ni fusion :

- `users.app_session_id` (Postgres) désigne la **session canonique** du compte,
  c’est-à-dire le hash SHA-256 de la session SQLite d’origine. Un index unique
  partiel garantit qu’une session n’appartient qu’à un compte.
- Un second appareil qui se connecte reçoit un **alias** : la table SQLite
  `session_aliases (alias_id, session_id, user_id)` associe un nouveau jeton
  opaque à la session canonique. `resolveSessionId()` traduit l’alias avant
  toute lecture, si bien que swipes, duo, matchs et souvenirs sont partagés
  sans duplication.
- La déconnexion révoque le jeton de compte ; si l’appareil utilisait un
  alias, celui-ci est supprimé et le cookie de session effacé, sans toucher à
  la session canonique ni aux données du duo.
- La phase 2 (décrite en section 6) remplacera les alias d’appareils par des
  sessions authentifiées complètes et déplacera les données métier dans
  Postgres ; les identifiants exposés au client resteront opaques.

## 4. Flux OAuth

### Google

- Type : **OpenID Connect Authorization Code + PKCE**.
- `state` aléatoire à usage unique stocké dans un cookie court (10 min),
  `nonce` OIDC vérifié dans l’`id_token`.
- Validation de l’`id_token` : signature via les JWKS Google (cache), `iss`
  `https://accounts.google.com`, `aud` = client ID, `exp`, `nonce`.
- Scopes minimaux : `openid email profile`. Aucun accès Gmail/Drive.
- Le code et les jetons ne transitent jamais par le client : tout l’échange se
  fait dans une route serveur.
- Implémenté dans `lib/auth/google.ts`, `lib/auth/state.ts` et
  `app/api/auth/google/` : URL d’autorisation, cookie `adeux_oauth` signé
  HMAC-SHA256 (10 min), PKCE S256, cache JWKS d’une heure, vérification
  complète de l’`id_token`. Les tests unitaires couvrent signature, `kid`,
  algorithme, `iss`, `aud`, `exp`, `iat` et `nonce`.

### Apple

- Type : **Sign in with Apple**, Authorization Code + PKCE.
- Le `client_secret` est un JWT **ES256** signé avec la clé `.p8`, de durée
  6 mois maximum, régénéré à la demande et jamais stocké en clair dans le
  dépôt.
- `Service ID` comme `client_id`, `redirect_uri` déclarée à l’identique.
- Apple ne fournit l’e-mail **qu’à la première autorisation** : on le stocke
  alors, sinon on garde l’identité sans e-mail. Le nom, s’il est fourni, est
  nettoyé comme tout texte libre.
- Validation : signature via les JWKS Apple, `iss` `https://appleid.apple.com`,
  `aud` = Service ID, `exp`, `nonce`.

### Règles communes

- Boutons masqués si `GOOGLE_CLIENT_ID` / `APPLE_CLIENT_ID` sont absents : pas
  de bouton mort, pas d’erreur visible.
- Rate limiting par IP sur les routes `/api/auth/*` (échange de code et
  callback), en plus du limiteur par session.
- Toute erreur OAuth renvoie un message générique et un code court ; aucun
  détail de jeton dans les logs.
- Aucun jeton de fournisseur n’est conservé après la connexion : on ne demande
  pas d’accès hors ligne.

## 5. Sessions et révocation

- Cookie `adeux_session`, `HttpOnly`, `Secure` derrière HTTPS, `SameSite=Lax`,
  `Path=/`, 30 jours glissants.
- Seul le SHA-256 du jeton est stocké (`auth_sessions.token_hash`).
- Chaque requête authentifiée met à jour `last_seen_at` au plus une fois par
  minute, pour éviter une écriture par requête.
- Déconnexion = `revoked_at` sur la session courante. « Déconnecter tous mes
  appareils » = révocation de toutes les sessions de l’utilisateur.
- Un changement d’identité (ajout d’Apple à un compte Google) ne révoque pas
  les sessions existantes ; un changement d’e-mail vérifié, si.

## 6. Migration SQLite → Postgres

Une instance PostgreSQL 18.1 portable tourne déjà en local sur ce poste
(`C:\Users\angel\pgsql`, base `a_deux`, port 5432). Les commandes de démarrage,
d’arrêt et de migration sont dans `docs/postgres-local.md`. Le schéma d’identité
est déjà appliqué par `db/migrations/001_accounts.sql`.

Pas de bascule à chaud : le passage se fait en trois étapes.

1. **Double lecture contrôlée** (optionnelle) : un script `scripts/migrate-pg.ts`
   copie les tables dans l’ordre des dépendances (`users`/anonymes → `couples`
   → membres → swipes → matchs → souvenirs → choix → taps), en conservant les
   identifiants stables (`idea_id`, `choice_id`, `code`).
2. **Bascule** : `DATABASE_URL` défini → l’application utilise Postgres. SQLite
   reste le défaut quand la variable est absente. Aucun `ALTER TABLE` sur
   SQLite : les nouvelles structures Postgres vivent dans `db/migrations/`.
3. **Vérification** : comptages par table, échantillon de duos, hash des codes
   d’invitation, rejeu du smoke sur staging avant `main`.

Types : `bigint` pour les horodatages (millisecondes) ou `timestamptz` pour les
nouvelles colonnes, `jsonb` pour les préférences, `bytea` pour les hachages,
`uuid` pour les identifiants générés côté serveur. Les montants et budgets
restent des entiers (euros), jamais des flottants.

## 7. Exploitation

- **Neon/Supabase** : utiliser la chaîne *pooled* pour l’application (PgBouncer)
  et la chaîne directe pour les migrations.
- **Migrations** : un runner idempotent au démarrage ou en tâche de release,
  avec un verrou consultatif (`pg_advisory_lock`) pour éviter deux exécutions
  concurrentes.
- **Sauvegardes** : rétention 7 jours minimum côté fournisseur, plus un export
  hebdomadaire chiffré.
- **Observabilité** : temps de requête, taux d’erreur OAuth, nombre de sessions
  actives. Aucune donnée personnelle dans les logs.
- **RGPD** : export et suppression du compte en une opération transactionnelle
  (`users.deleted_at` puis purge physique après 30 jours). Les contenus
  partagés d’un duo sont supprimés quand les deux comptes sont supprimés.

## 8. Variables d’environnement à fournir

| Variable | Origine | Usage |
| --- | --- | --- |
| `DATABASE_URL` | Neon/Supabase (chaîne *pooled*) | Connexion applicative Postgres |
| `DATABASE_URL_DIRECT` | Neon/Supabase (chaîne directe) | Migrations et scripts |
| `GOOGLE_CLIENT_ID` | Google Cloud Console | Identifiant OAuth |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | Secret OAuth |
| `APPLE_CLIENT_ID` | Apple Developer (Service ID) | Identifiant OAuth |
| `APPLE_TEAM_ID` | Apple Developer | Équipe pour le JWT |
| `APPLE_KEY_ID` | Apple Developer | Clé du JWT |
| `APPLE_PRIVATE_KEY` | Fichier `.p8` | Signature ES256 (retours à la ligne échappés) |
| `APP_SESSION_SECRET` | généré (32 octets) | Signature des cookies `state`/`nonce` |

Les URL de redirection à déclarer chez les fournisseurs :

```text
https://<domaine>/api/auth/google/callback
https://<domaine>/api/auth/apple/callback
```

En local, `http://localhost:3000/api/auth/<provider>/callback` suffit pour
Google ; Apple exige un domaine HTTPS, même en test (tunnel ou staging).

## 9. Wrapper natif (Capacitor)

La PWA est la première étape ; le passage aux stores ne change pas le backend.

- **Capacitor** enveloppe l’URL de production dans une WebView et ajoute les
  capacités natives (partage, notifications, stockage sécurisé).
- **OAuth natif** : `@capacitor/browser` (ASWebAuthenticationSession sur iOS,
  Custom Tabs sur Android) avec retour par *deep link* (`adeux://auth/callback`)
  ou *universal link* (`https://<domaine>/auth/callback`).
- **Cookies** : conserver la session côté serveur ; sur mobile, le cookie est
  géré par la WebView. Ne jamais stocker de jeton de fournisseur dans le
  `localStorage`.
- **Publication** : compte Apple Developer (99 $/an) et Google Play (25 $ une
  fois), revue de quelques jours. La PWA reste installable en parallèle, sans
  store.

### Widget « Petit ping »

Objectif : un widget cliquable sur l’écran d’accueil qui envoie une pensée
**sans ouvrir l’application**. Impossible en PWA pure : cela exige le wrapper
natif. Étapes prévues :

1. **Raccourci PWA (livré)** : appui long sur l’icône → « Petit ping » ; l’app
   s’ouvre et envoie le tap immédiatement (`/?ping=1`).
2. **Jeton d’appareil** : quand un duo est complet, l’app enregistre un appareil
   (`POST /api/widget/devices`) et reçoit un jeton opaque, stocké haché côté
   serveur (`widget_devices`, lié à `session_id`, révocable). Le jeton natif est
   conservé dans le stockage sécurisé du téléphone, jamais dans le `localStorage`
   du WebView.
3. **Endpoint dédié** : `POST /api/widget/ping` avec `Authorization: Bearer`,
   sans cookie ni CSRF (requête native), rate-limité par appareil (1 / 8 s,
   20 / h) et limité aux duos complets.
4. **Android** : `AppWidgetProvider` + `PendingIntent` qui déclenche l’appel
   réseau en arrière-plan, puis met à jour le widget (envoyé / trop tôt /
   hors ligne). Aucune ouverture d’activité.
5. **iOS** : WidgetKit + App Intents (iOS 17+). Nécessite un compte Apple
   Developer payant (capability App Groups) et une machine macOS pour compiler :
   à reporter tant que ce compte n’existe pas.

Le jeton ne donne accès qu’à l’envoi d’un tap : il ne permet ni de lire les
matchs, ni de modifier les swipes, et il est révoqué à la déconnexion ou depuis
l’écran Compte.

## 10. Ordre d’implémentation recommandé

1. Extraire la couche de dépôts et faire passer les tests existants dessus.
2. Ajouter le schéma Postgres et le script de migration ; vérifier la parité
   SQLite/Postgres en local avec Docker.
3. Brancher Google (le plus simple à tester), puis Apple.
4. Implémenter la liaison anonyme → compte et la déconnexion.
5. Ajouter l’écran « Compte » (identités liées, appareils, suppression).
6. Enfin, le wrapper Capacitor et la soumission aux stores.
