# À deux — notes de release v2.2.1

Date : 15 novembre 2026
Tag : `v2.2.1`
APK : https://a-deux-v1-annay-ia.vercel.app/telecharger (build debug)

## Affiches des films

- L’arche des cartes Film affiche la **jaquette** du film ou de la série.
- **192 affiches** disponibles : 39 cartes éditoriales et 153 titres IMDb.
- Les cartes sans affiche conservent l’**emoji** en secours ; aucune carte ne
  casse.
- Chargement paresseux, `referrer` neutre, CSP limitée à
  `upload.wikimedia.org`.
- Les affiches viennent des pages Wikipédia (images non libres, usage
  personnel). Pour une distribution publique, préférer TMDb/OMDb avec une clé.

## Technique

- Manifeste `lib/posters.ts`, régénéré par `scripts/build-posters.mjs`.
- Année ajoutée aux cartes IMDb pour fiabiliser la recherche d’affiche.
- Les vignettes compactes (320 px) utilisent aussi l’affiche.

## Vérifications

- `tsc`, **136 tests**, `next build`, smoke complet.
- Parcours testés en 320 et 390 px ; affiche réelle et repli emoji.
