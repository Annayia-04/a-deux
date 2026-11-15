# Widget Android « Petit ping »

Le widget permet d’envoyer une pensée au partenaire **sans ouvrir
l’application**. Il s’appuie sur le wrapper Capacitor et sur un jeton
d’appareil dédié, révocable.

## Fonctionnement

1. Dans l’app native, dès que le duo est complet, `useWidgetPairing` appelle
   `POST /api/widget/devices`. Le serveur renvoie un jeton opaque **une seule
   fois** ; seul son SHA-256 est stocké dans PostgreSQL (`widget_devices`).
2. La WebView transmet le jeton au stockage privé Android via le plugin
   `WidgetBridge` (`SharedPreferences`, fichier privé de l’application).
3. Le widget appelle `POST /api/widget/ping` avec
   `Authorization: Bearer <jeton>`, sans cookie et sans ouvrir l’activité.
4. Le ping suit exactement le chemin d’un tap normal : duo complet requis,
   anti-spam 1 toutes les 8 secondes et 20 par heure, purge après 7 jours.

Au démarrage, l’application vérifie le jeton stocké auprès de
`GET /api/widget/devices/status` (sans envoyer de ping). S’il a été révoqué —
ou si la base a été recréée — l’appareil est réassocié automatiquement au lieu
de laisser un widget muet.

Le jeton ne permet **que** d’envoyer un ping. Il ne lit ni les matchs, ni les
swipes, ni les souvenirs, et il est supprimé avec la session (cascade PostgreSQL).

## Apparence

Le widget suit la palette gothique romantique de l’application : fond
anthracite `#141218`, double filet d’or `#C5A059`, titre parchemin `#EAE4DC`
(serif) et sous-titre cendre `#8E8894`. L’icône est un **cœur** (`widget_heart.xml`),
le titre affiche « Une pensée pour toi » et le sous-titre « Toucher pour
envoyer ». Les icônes de l’application et l’écran
de démarrage sont générés depuis `public/icons/icon.svg` :

```bash
node scripts/render-android-assets.mjs
node scripts/render-icons.mjs
```

## Prérequis de build

- JDK 21 (Temurin) ;
- Android SDK Platform 35, Build-Tools 35.0.0, Platform-Tools ;
- un `android/local.properties` pointant vers le SDK (fichier ignoré par git).

Configuration utilisée en local :

```properties
sdk.dir=C:/Users/<utilisateur>/AppData/Local/Android/Sdk
```

## URL du serveur

La WebView charge le site Next (SSR + API), elle ne peut pas embarquer un
export statique. L’URL est donc fournie à la compilation :

```bash
# Émulateur : 10.0.2.2 = localhost de la machine hôte (repli par défaut)
npx cap sync android

# Téléphone réel sur le même réseau local
CAPACITOR_SERVER_URL=http://192.168.1.203:3000 npx cap sync android

# Production (HTTPS obligatoire pour Google et les cookies)
CAPACITOR_SERVER_URL=https://votre-domaine npx cap sync android
```

Sans `CAPACITOR_SERVER_URL`, la configuration retombe sur
`http://10.0.2.2:3000` et affiche un avertissement. En HTTP local,
`usesCleartextTraffic` est activé dans le manifeste. En production, servir
l’application en HTTPS.

## Compiler et installer

```bash
cd android
./gradlew assembleDebug        # macOS / Linux
gradlew.bat assembleDebug      # Windows

# APK : android/app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Premier lancement :

1. ouvrir l’app, créer ou rejoindre un duo jusqu’à ce qu’il soit complet ;
2. revenir à l’écran d’accueil Android, appui long sur un espace vide →
   **Widgets** → **À deux** → **Petit ping** ;
3. toucher le widget : « Ping envoyé » s’affiche sans ouvrir l’application.

Si le jeton manque, le widget ouvre l’application pour l’association. S’il a
été révoqué, il affiche « Réassociez le widget ».

## Révocation

`DELETE /api/widget/devices` avec le jeton et la session propriétaire. Un autre
membre du duo ne peut pas révoquer le jeton d’un appareil (réponse silencieuse,
sans oracle). La suppression de la session supprime ses appareils par cascade.

## Limites connues

- **iOS** : WidgetKit exige un compte Apple Developer payant (capability App
  Groups) et une machine macOS. Non implémenté à ce stade ; le raccourci PWA
  « Petit ping » reste disponible.
- L’application doit avoir été ouverte au moins une fois avec un duo complet
  pour associer l’appareil.
- Le widget n’affiche pas les pings reçus : il ne fait qu’envoyer.
- En HTTP local, Google OAuth ne fonctionne pas (URI de redirection déclarée en
  HTTPS/localhost) ; le mode anonyme et le duo restent utilisables.

## Dépannage

| Symptôme | Cause probable |
| --- | --- |
| « Ouvrir l’app pour associer » | Aucun jeton : ouvrir l’app avec un duo complet, ou appeler `savePingToken` |
| « Réassociez le widget » | Jeton révoqué ou session supprimée |
| « Complétez votre duo » | L’autre membre n’a pas encore rejoint l’espace |
| « Hors ligne » | Téléphone hors réseau, serveur arrêté, ou `CAPACITOR_SERVER_URL` inaccessible |
| « Patientez un instant » | Anti-spam de 8 secondes entre deux pings |
| Le widget n’apparaît pas | L’APK installé ne contient pas le receiver, ou le lanceur n’a pas rafraîchi ses widgets |
