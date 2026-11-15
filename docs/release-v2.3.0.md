# À deux — notes de release v2.3.0

Date : 15 novembre 2026
Tag : `v2.3.0`
APK : https://a-deux-v1-annay-ia.vercel.app/telecharger (build debug)

## 400 affiches TMDb

- **400/400 cartes Film** ont désormais une affiche : 40 cartes éditoriales
  et 360 films/séries IMDb.
- Les affiches sont résolues via **TMDb** (clé fournie par le propriétaire),
  avec les affiches Wikipédia en secours et l’emoji en dernier recours.
- Les visuels sont chargés paresseusement depuis `image.tmdb.org` ; la clé
  TMDb n’est **jamais** envoyée au navigateur ni stockée sur Vercel : elle ne
  sert qu’à générer `lib/posters.ts` (`node --env-file=.env.local
  scripts/build-tmdb-posters.mjs`).
- Attribution affichée dans les filtres Film : « Affiches : TMDb / Wikipédia ».

## Cartes

- L’affiche remplace l’emoji dans l’arche et dans la vignette compacte.
- Le sceau SÉRIE, la durée /ép., la note et les genres restent inchangés.
- Les cartes sans affiche gardent l’emoji, sans jamais casser la mise en page.

## Vérifications

- `tsc`, **136 tests**, `next build`, smoke complet.
- Parcours testés en 320 et 390 px ; affiche TMDb, affiche Wikipédia et repli
  emoji.
- Manifeste : 400 URLs TMDb, CSP limitée à `image.tmdb.org` et
  `upload.wikimedia.org`.
