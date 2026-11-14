# PostgreSQL local (Windows, sans droits administrateur)

Une instance PostgreSQL **18.1** portable est installée dans
`C:\Users\angel\pgsql`. Elle ne touche pas au système : ni service Windows,
ni dossier `Program Files`, ni droits administrateur.

| Élément | Valeur |
| --- | --- |
| Binaires | `C:\Users\angel\pgsql\pgsql\bin` |
| Données | `C:\Users\angel\pgsql\data` |
| Port | `5432` (localhost uniquement) |
| Utilisateur | `postgres` (authentification `trust` en local) |
| Base applicative | `a_deux` |
| Journal | `C:\Users\angel\pgsql\pg.log` |

`trust` sur une instance liée à `127.0.0.1`/`::1` est acceptable pour du
développement local. Ne jamais exposer cette instance sur le réseau ni la
réutiliser en production.

## Démarrer

```bash
"C:/Users/angel/pgsql/pgsql/bin/postgres.exe" -D "C:/Users/angel/pgsql/data" -p 5432
```

Laisser cette fenêtre ouverte, ou lancer en arrière-plan :

```bash
START /B "" "C:\Users\angel\pgsql\pgsql\bin\pg_ctl.exe" -D "C:\Users\angel\pgsql\data" -l "C:\Users\angel\pgsql\pg.log" start
```

## Vérifier

```bash
"C:/Users/angel/pgsql/pgsql/bin/psql.exe" -h 127.0.0.1 -U postgres -d a_deux -c "select version();"
```

## Arrêter

```bash
"C:/Users/angel/pgsql/pgsql/bin/pg_ctl.exe" -D "C:/Users/angel/pgsql/data" stop
```

## Appliquer les migrations

`.env.local` contient déjà :

```dotenv
DATABASE_URL=postgres://postgres@127.0.0.1:5432/a_deux
DATABASE_URL_DIRECT=postgres://postgres@127.0.0.1:5432/a_deux
```

```bash
npm run db:migrate   # applique les migrations manquantes
npm run db:status    # affiche l'état, sans rien modifier
```

Le runner (`scripts/db-migrate.mjs`) :

- charge `.env.local` avec le même mécanisme que Next ;
- prend un verrou consultatif PostgreSQL pour éviter deux exécutions
  simultanées ;
- exécute chaque fichier dans une transaction ;
- enregistre un **checksum** : une migration déjà appliquée ne peut plus être
  modifiée, il faut en créer une nouvelle.

## Repartir de zéro

```bash
"C:/Users/angel/pgsql/pgsql/bin/dropdb.exe" -h 127.0.0.1 -U postgres a_deux
"C:/Users/angel/pgsql/pgsql/bin/createdb.exe" -h 127.0.0.1 -U postgres a_deux
npm run db:migrate
```

## Passer à Neon ou Supabase

1. Créer le projet, récupérer la chaîne **pooled** et la chaîne **directe**.
2. Les mettre dans `.env.local` :

   ```dotenv
   DATABASE_URL=postgres://...pooler.../a_deux?sslmode=require
   DATABASE_URL_DIRECT=postgres://...direct.../a_deux?sslmode=require
   ```

3. `npm run db:migrate` avec la chaîne directe.
4. Vérifier `npm run db:status`.

Le code de migration est identique : seule l’URL change.
