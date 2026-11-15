# Notifications push (Firebase Cloud Messaging)

L’application native reçoit les pensées du partenaire **même fermée**, via
Firebase Cloud Messaging (FCM). La PWA n’est pas encore concernée (Web Push
viendra ensuite).

## Ce qui est déjà en place

| Élément | Rôle |
| --- | --- |
| `db/migrations/006_push_devices.sql` | table `push_devices` : jeton FCM opaque, session, plateforme |
| `app/api/push/devices/route.ts` | enregistrement (`POST`) et retrait (`DELETE`) du jeton de l’appareil |
| `lib/push-notifications.ts` | permission Android, canal `a_deux_ping`, enregistrement FCM, ouverture sur notification |
| `lib/push.ts` | envoi FCM aux autres membres du duo, purge des jetons invalides |
| `lib/taps.ts` | `notifyPartnerOfTap()` après chaque ping (widget ou tuile) |
| `components/push-status-card.tsx` | carte « Notifications » dans les réglages de l’app native |

Sans configuration Firebase, l’envoi est **silencieusement ignoré** : les pings
continuent d’arriver dans l’application, rien ne casse.

## 1. Créer le projet Firebase

1. Ouvrir [console.firebase.google.com](https://console.firebase.google.com)
   et créer un projet (offre **Spark**, gratuite).
2. Dans le projet : **Ajouter une application → Android**.
3. Nom du package : `fr.adeux.app` — exactement, sinon le build échoue.
4. Télécharger `google-services.json`.

## 2. Déposer les deux fichiers (jamais commités)

```text
android/app/google-services.json          ← configuration Android
.secrets/firebase-service-account.json    ← clé serveur (Administration Firebase)
```

Pour la clé serveur : **Paramètres du projet → Comptes de service → Générer une
nouvelle clé privée**. Le fichier JSON téléchargé va dans `.secrets/`.

Les deux chemins sont déjà dans `.gitignore` (`google-services.json`) et
`.gitignore` (`.secrets/`). Ne jamais les coller dans le chat ni dans un
commit.

## 3. Configurer Vercel

La clé de service doit être disponible côté serveur, en **une seule variable**
contenant le JSON complet (les retours à la ligne de `private_key` sont
acceptés tels quels ou échappés en `\n`) :

```bash
vercel env add FIREBASE_SERVICE_ACCOUNT production,preview < .secrets/firebase-service-account.json
```

Vérifier ensuite que l’envoi est actif : sans cette variable, `isPushConfigured()`
renvoie `false` et aucun envoi n’est tenté.

## 4. Appliquer la migration

```bash
npm run db:migrate            # local
# production : avec la chaîne directe Neon
DATABASE_URL_DIRECT="postgres://…" npm run db:migrate
```

La migration `006` est idempotente (`CREATE TABLE IF NOT EXISTS`).

## 5. Reconstruire l’APK

Le plugin Google Services n’est appliqué **que** si `google-services.json`
existe (`android/app/build.gradle`). Une fois le fichier déposé :

```bash
npx cap sync android
cd android && ./gradlew assembleDebug
```

Sans le fichier, le build passe mais `PushNotifications.register()` échoue et
la carte « Notifications » affiche une erreur.

## 6. Tester

1. Installer l’APK sur les deux téléphones, avec **deux comptes Google
   différents** (sinon une seule session, donc un seul membre du duo).
2. Dans chaque app : **Réglages → Notifications → Activer les notifications**,
   puis accepter la demande Android.
3. Vérifier l’enregistrement :

   ```sql
   SELECT platform, count(*) FROM push_devices GROUP BY platform;
   ```

4. Fermer complètement l’app du partenaire, puis toucher le widget (ou la
   tuile) depuis l’autre téléphone : la notification « Une pensée pour toi »
   doit apparaître en quelques secondes.

## Comportement et sécurité

- Le jeton FCM est opaque et ne donne accès à **aucune** donnée ; il est
  rattaché à la session et supprimé en cascade avec elle.
- L’enregistrement exige une session serveur, la même origine (CSRF) et est
  limité en débit.
- Les jetons refusés par FCM (`not-registered`, `invalid-argument`) sont
  supprimés automatiquement.
- L’envoi est borné à 4 secondes dans `POST /api/taps` : un incident FCM ne
  bloque jamais le ping.
- Aucun jeton, aucune clé et aucun contenu de message n’est journalisé.
