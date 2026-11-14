# Configurer Google Sign-In pas à pas

Objectif : obtenir `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`, puis vérifier
que la connexion fonctionne. Durée : 5 à 10 minutes. Aucun paiement.

> Les libellés de la console Google évoluent régulièrement. Si un intitulé
> diffère légèrement, cherche l’équivalent : « OAuth consent screen » =
> « Écran de consentement OAuth », « Credentials » = « Identifiants ».

## 1. Créer un projet

1. Ouvrir <https://console.cloud.google.com/> avec le compte Google qui doit
   posséder l’application (pas un compte personnel jetable : le projet lui
   restera rattaché).
2. En haut, sélecteur de projet → **Nouveau projet**.
3. Nom : `A deux` (ou `a-deux`). Emplacement : *Aucune organisation*.
4. **Créer**, puis sélectionner le projet dans le sélecteur.

## 2. Configurer l’écran de consentement

1. Menu → **APIs & Services** → **OAuth consent screen**.
2. Type d’utilisateur : **External** (l’app est publique), puis **Créer**.
3. Renseigner :
   - **App name** : `À deux`
   - **User support email** : ton adresse
   - **Developer contact email** : la même
   - Logo, domaine, liens : laisser vide pour l’instant
4. **Save and continue**.
5. **Scopes** → **Add or remove scopes** → cocher uniquement :
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`

   Ce sont des scopes **non sensibles** : aucune vérification Google n’est
   nécessaire pour passer en production.
6. **Save and continue**.
7. **Test users** : ajouter l’adresse Google avec laquelle tu vas tester.
   Tant que l’app est en mode *Testing*, seuls ces comptes peuvent se
   connecter. C’est suffisant pour développer.
8. **Save and continue** → **Back to dashboard**.

## 3. Créer le client OAuth

1. **APIs & Services** → **Credentials** → **Create credentials** →
   **OAuth client ID**.
2. Application type : **Web application**.
3. Name : `À deux — Web`.
4. **Authorized JavaScript origins** :
   ```text
   http://localhost:3000
   https://<ton-domaine>
   ```
5. **Authorized redirect URIs** — attention, ce sont des **URI de
   redirection**, pas des origines, et elles doivent correspondre **au
   caractère près** :
   ```text
   http://localhost:3000/api/auth/google/callback
   https://<ton-domaine>/api/auth/google/callback
   ```
   Pas de slash final, pas d’espace, `https` obligatoire hors localhost.
6. **Create**. La console affiche :
   - **Client ID** : se termine par `.apps.googleusercontent.com`
   - **Client secret** : commence par `GOCSPX-`

## 4. Renseigner les variables

Dans `.env.local` (déjà ignoré par git) :

```dotenv
GOOGLE_CLIENT_ID=1234567890-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
```

Puis redémarrer le serveur (`npm run dev` ou `npm run build && npm start`)
pour que Next recharge l’environnement.

Règle : ces deux valeurs ne vont **jamais** dans le code, un ticket, une
capture d’écran ou un message. Si le secret fuite : **Credentials** → cliquer
sur le client → **Reset secret**, puis mettre à jour `.env.local`.

## 5. Vérifier

Une fois le code OAuth branché (routes `/api/auth/google` et
`/api/auth/google/callback`), le bouton **Continuer avec Google** apparaît
automatiquement dans l’écran de compte. Le module `lib/config.ts` masque le
bouton tant que `GOOGLE_CLIENT_ID` ou `GOOGLE_CLIENT_SECRET` manque : aucun
bouton mort n’est affiché.

Parcours de test :

1. Ouvrir l’app en navigation privée, créer un duo et un souvenir.
2. Se connecter avec Google.
3. Vérifier que le duo, les swipes et les souvenirs sont toujours là.
4. Se déconnecter, se reconnecter : les données suivent le compte.
5. Ouvrir l’app sur un second navigateur, se connecter : mêmes données.

## 6. Passer en production

- Ajouter l’URI de redirection HTTPS du domaine réel (section 3).
- Dans **OAuth consent screen**, passer le statut de *Testing* à
  **In production** : pas de revue nécessaire avec `openid`/`email`/`profile`.
- Vérifier que le domaine est bien déclaré dans **Authorized domains**.
- Conserver `http://localhost:3000` pendant le développement ; le retirer plus
  tard si l’on veut verrouiller la production.

## En cas d’erreur

| Message | Cause probable |
| --- | --- |
| `redirect_uri_mismatch` | URI absente ou différente (slash final, `http` au lieu de `https`, port). |
| `access_denied` | Compte non ajouté aux *Test users* alors que l’app est en *Testing*. |
| `invalid_client` | Client ID/secret erronés ou secret réinitialisé. |
| `invalid_grant` | Code déjà utilisé ou expiré (durée de vie très courte) : recommencer la connexion. |

## Apple

Sign in with Apple exige un compte **Apple Developer payant** (99 $/an) :
Service ID, Team ID, Key ID et clé `.p8`. Le bouton Apple reste masqué tant que
ces valeurs manquent. La procédure est décrite dans
`docs/architecture-comptes-postgres.md` (section 4).
