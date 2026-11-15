# À deux — notes de release v2.1.1

Date : 15 novembre 2026
Tag : `v2.1.1`
APK : https://a-deux-v1-annay-ia.vercel.app/telecharger (build debug)

## Cartes plus riches

### Food

- **Mode** : à cuisiner, livraison ou restaurant.
- **Budget** : €, €€ ou €€€.
- **Temps** de préparation ou de repas.
- La carte affiche le mode et le budget dans l’en-tête, puis le temps sous
  l’accroche.

### Film

- **Genre**, **durée** réelle, **note** sur 10 et **plateforme** indicative.
- La carte affiche le genre et la durée / note dans l’en-tête, puis la
  plateforme sous l’accroche.

Les **70 cartes** du catalogue (30 plats, 40 films) sont enrichies.

## Filtres avancés

- **Food** : mode, budget et envie (italien, asiatique, gourmand, healthy,
  végétarien, fromage, convivial).
- **Film** : lieu (canapé / cinéma), durée (moins de 1 h 45 / plus de 2 h),
  plateforme (Netflix, Prime Video, Canal+, au cinéma) et genre.
- Le badge du bouton Filtres compte les critères actifs ; les filtres se
  cumulent et s’appliquent au deck courant.

## Précision

Les durées et notes sont des valeurs indicatives ; les plateformes changent
souvent selon les catalogues. L’application l’indique dans le tiroir Film.

## Vérifications

- `tsc`, **134 tests**, `next build`, smoke complet.
- Schéma de catalogue strict : chaque plat a mode/budget/temps, chaque film a
  durée/note/plateforme.
- Parcours testés en 320 et 390 px (Food, Film, filtres).
