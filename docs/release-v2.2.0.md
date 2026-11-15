# À deux — notes de release v2.2.0

Date : 15 novembre 2026
Tag : `v2.2.0`
APK : https://a-deux-v1-annay-ia.vercel.app/telecharger (build debug)

## Catalogue Film élargi à 400 cartes

- **40 cartes éditoriales** conservées (titres français, plateformes).
- **240 films IMDb** et **120 séries IMDb** ajoutés.
- Source : datasets publics IMDb (`title.basics`, `title.ratings`), usage
  personnel non commercial. Le script de génération est versionné :
  `scripts/build-imdb-catalog.mjs`.
- Métadonnées : titre original, année, genres, durée (par épisode pour les
  séries), note IMDb et type film/série.
- Les cartes IMDb affichent **IMDb** à la place d’une plateforme ; les
  plateformes restent celles de la sélection éditoriale.

## Pagination

- Le deck se présente par **pages de 40**.
- Une fois les 40 cartes de la page parcourues, les 40 suivantes sont déjà
  disponibles : le deck continue, sans mur ni bouton.
- Le compteur affiche `X / 400 cartes · 40 par page`.

## Cartes et filtres

- Cartes Film/Série dans la même coque tarot que les activités.
- Les séries portent le sceau **SÉRIE** et une durée **/ép.**
- Filtres Film enrichis : **Type** (films / séries), lieu, durée, plateforme
  et genres (action, aventure, animation, famille, polar, fantastique,
  mystère, documentaire…).

## Vérifications

- `tsc`, **135 tests**, `next build`, smoke complet.
- Catalogue : 400 cartes Film, schéma strict, séries incluses.
- Parcours testés en 320 et 390 px.
