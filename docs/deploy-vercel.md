# Déployer sur Vercel (PostgreSQL managé)

L’application est un Next.js SSR + API, sans disque : elle a besoin d’une base
PostgreSQL accessible depuis Vercel. Ce guide part d’un dépôt GitHub et d’un
compte Vercel vides.

> Coût indicatif : Vercel Hobby (gratuit), Neon ou Supabase (offre gratuite
> suffisante pour deux personnes). Un domaine `*.vercel.app` suffit ; un
> domaine personnalisé est facultatif.

## 1. Créer la base PostgreSQL

1. Créer un projet sur [Neon](https://neon.tech) (ou Supabase).
2. Récupérer **deux** chaînes de connexion :
   - la chaîne **pooled** (PgBouncer) → `DATABASE_URL` sur Vercel ;
   - la chaîne **directe** → `DATABASE_URL_DIRECT`, uniquement pour les
     migrations.
3. Vérifier que l’URL contient `sslmode=require` (Neon/Supabase l’ajoutent
   d’eux-mêmes). Le pool de `lib/pg-pool.ts` accepte cette option.

## 2. Appliquer le schéma

Depuis le dépôt, avec la chaîne **directe** (les migrations ne passent pas par
le pooler) :

```bash
DATABASE_URL_DIRECT="postgres://…" npm run db:migrate
DATABASE_URL_DIRECT="postgres://…" npm run db:status
```

Les migrations `001` → `003` créent l’identité, le lien compte → session, puis
toutes les tables de jeu. Elles sont idempotentes et protégées par un checksum.

> Ne pas lancer `npm start` localement contre la base de production pour
> « tester » : le smoke crée de vraies sessions et de vrais duos.

## 3. Importer le dépôt dans Vercel

1. **Add New → Project**, choisir `Annayia-04/a-deux`.
2. Framework détecté : Next.js. Ne rien changer au build (`npm run build`).
3. **Branch de production** : `main`. `staging` servira de préproduction
   (domaine de préversion ou projet distinct).
4. Node.js 22 (par défaut sur Vercel) ; aucune commande d’install spéciale.

## 4. Variables d’environnement

À définir dans **Project → Settings → Environment Variables** (Production et
Preview) :

| Variable | Valeur |
| --- | --- |
| `DATABASE_URL` | chaîne **pooled** Neon/Supabase |
| `APP_ORIGIN` | `https://<projet>.vercel.app` (ou le domaine personnalisé) |
| `COOKIE_SECURE` | `true` |
| `APP_SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `GOOGLE_CLIENT_ID` | identifiant OAuth Web (facultatif) |
| `GOOGLE_CLIENT_SECRET` | secret OAuth Web (facultatif) |

`DATABASE_URL_DIRECT` n’est **pas** nécessaire à l’exécution : garder la chaîne
directe pour les migrations locales. Ne jamais exposer ces valeurs dans le
dépôt ni dans un commentaire.

## 5. Google OAuth (si utilisé)

Dans Google Cloud Console → **APIs & Services → Credentials** → client OAuth
Web → **Authorized redirect URIs**, ajouter :

```text
https://<projet>.vercel.app/api/auth/google/callback
```

Conserver aussi `http://localhost:3000/api/auth/google/callback` pour le
développement. Sans ces deux valeurs, le bouton Google reste masqué et le mode
anonyme fonctionne normalement.

## 6. Déployer et vérifier

1. **Deploy** : Vercel construit et publie.
2. Ouvrir l’URL : créer une sélection, swiper, créer un duo, rejoindre depuis
   un second navigateur, écrire un souvenir, envoyer un tap.
3. Vérifier les cookies : `Secure`, `HttpOnly`, `SameSite=Lax` (onglet
   Application des DevTools).
4. Tester l’album : ajouter une photo à un souvenir, vérifier qu’elle
   n’est visible que depuis les deux sessions du duo, puis changer de thème
   dans **Apparence** et recharger la page.
5. Installer la PWA depuis le téléphone (HTTPS requis) : l’icône « À deux »
   apparaît, avec le raccourci « Mon duo ».
5. Widget Android : recompiler l’APK avec l’URL publique, puis
   `node scripts/render-android-assets.mjs` si les visuels changent.

### Test de fumée contre un déploiement

Le script crée des sessions et des duos réels. Sur une base de préproduction
uniquement :

```bash
node scripts/smoke.mjs https://<projet>-staging.vercel.app
```

Les lignes créées restent en base (sessions anonymes expirées au bout de
30 jours, duos sans membre nettoyés). Ne pas le lancer sur la base utilisée
par le couple.

## 7. Région et performances

- Choisir la région Vercel la plus proche de la base (par défaut `iad1` pour
  Neon US). Pour l’Europe : base Neon `eu-central-1` + Vercel `cdg1`.
- Les photos sont stockées en `bytea` dans PostgreSQL : pas besoin de Vercel
  Blob, et aucune URL publique. La limite Neon free (0,5 Go) couvre largement
  l’album d’un couple (80 photos × ~300 Ko).
- Le pool est créé paresseusement et réutilisé par instance de fonction
  (`max: 5`). La chaîne pooled évite d’épuiser les connexions.
- Les pages dépendant de la session sont dynamiques (`no-store`) : aucune
  fuite de cache entre deux comptes.

## 8. Dépannage

| Symptôme | Cause probable |
| --- | --- |
| `DATABASE_URL absent` au démarrage | variable absente sur l’environnement Vercel choisi |
| `password authentication failed` | chaîne directe utilisée à la place de la pooled, ou mot de passe tronqué |
| `relation "sessions" does not exist` | migrations non appliquées sur cette base |
| Connexion Google : `redirect_uri_mismatch` | URI de redirection absente ou `APP_ORIGIN` erroné |
| Session perdue à chaque visite | `COOKIE_SECURE=true` sans HTTPS, ou `APP_ORIGIN` incohérent |
| Trop de connexions Postgres | chaîne non pooled, ou pool recréé à chaque requête |

## 9. Revenir en arrière

Vercel conserve chaque déploiement : **Deployments → … → Promote to
Production** suffit pour revenir à la version précédente. La base n’est pas
versionnée par Vercel : faire une sauvegarde Neon/Supabase avant une migration
de schéma destructive.
