# Consignes de travail

## Branches et releases

- Développer et pousser **uniquement sur `dev`**. C'est la branche par défaut pour tout commit.
- **Ne jamais** fusionner ni pousser vers `staging` ou `main` (production) sans un **feu vert explicite** de la personne propriétaire du dépôt.
- Une fois le feu vert donné, release en fast-forward : `dev` → `staging`, puis `staging` → `main`, avec CI verte à chaque étape.
- Signaler clairement dans la réponse que les changements sont sur `dev` et attendre l'accord avant toute release.

## Qualité avant commit

- `npx tsc --noEmit`, `npm test` et `npx next build` doivent passer.
- Lancer `node scripts/smoke.mjs http://localhost:3100` contre un serveur de production local avant de pousser.
- Vérifier les parcours mobiles (largeurs 320 à 430 px) et les zones tactiles.

## Conventions du projet

- Interface et contenus en **français**, sans compte, sans asset externe.
- Design system : `ink/cream/rose/mint/gold`, `font-display`, animations via `motion/react`.
- Sécurité : session serveur obligatoire, aucun identifiant fourni par le client, Zod strict, texte assaini, pas de `dangerouslySetInnerHTML`, CSRF et rate-limiting conservés.
- Base SQLite : pas d'`ALTER TABLE` ; nouvelles structures via `CREATE TABLE IF NOT EXISTS` / index idempotents.
- Ne pas dégrader l'existant : vérifier les tests de fumée et le rendu des écrans existants.
