# À deux — notes de release v2.1.2

Date : 15 novembre 2026
Tag : `v2.1.2`
APK : https://a-deux-v1-annay-ia.vercel.app/telecharger (build debug)

## Cartes Food et Film alignées sur les activités

- Même **cadre double**, même **arche dorée**, même **numéral romain**.
- Titre et accroche **centrés**.
- En-tête : mode + budget pour Food ; genre + durée et note pour Film.
- Bas de carte : temps ou plateforme, puis un encart **« L’ambiance »** ou
  **« Les genres »**, comme le « petit plus » des activités.
- **Dock extérieur** Passer / Coup de cœur, comme le deck Activité.
- Pile de cartes visible, navigation clavier ← / →.
- Densités **compacte** et **tight** pour les écrans de 320 px.

Le deck Food/Film de l’espace duo utilise la même carte.

## Vérifications

- `tsc`, **134 tests**, `next build`, smoke complet.
- Parcours testés en 320 et 390 px (Food, Film, duo, filtres).
