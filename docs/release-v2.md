# À deux — notes de release v2.0.0

Date : 15 novembre 2026
Tag : `v2.0.0`
APK : `/telecharger` (build debug, hors Play Store)

## La refonte mobile-first

- Coque `100dvh` : en-tête 56 px, contenu dynamique, barre d’onglets 64 px.
- **Découvrir** : deck plein écran, gestes, tampons, seuil à 35 %, vibration,
  dock d’actions, filtres en tiroir avec aperçu du nombre d’idées.
- **À deux** : duo, invitation par lien `?code=`, matchs, pensée rapide,
  accès aux souvenirs et aux choix.
- **Mes envies** : liste, copie, suppression, fiche détaillée.
- **Profil** : compte, session 30 jours, apparence, installation, widget, push.
- Cartes façon tarot : numéral romain, cadre double, arche et sceau.
- **Huit thèmes** et **huit gravures d’arcane** originales (WebP local).
- Fiches détaillées pour les **matchs** et les **envies**.

## Couverture du cahier des charges v2

| Point | État |
| --- | --- |
| Coque 100dvh, zéro scroll sur Découvrir | Fait |
| Confidentialité des swipes négatifs | Fait (seuls les likes mutuels sortent) |
| Sessions anonymes 30 jours, cookie HttpOnly | Fait |
| CSP, en-têtes de sécurité, rate-limiting | Fait |
| Swipe, tampons, vibration, célébration de match | Fait |
| 4 onglets | Fait, libellés `À deux` / `Profil` (au lieu de `Notre Espace` / `Nous & Réglages`) |
| 3 decks Activité / Food / Film dans Découvrir | Partiel : Food et Film existent dans l’espace duo, pas encore comme decks principaux |
| Filtres dédiés par univers | Partiel : les filtres actuels couvrent les activités |
| Date Builder (3 slots, « Surprends-nous ») | À venir |
| Ticket de Date partageable + `.ics` | À venir |
| Code duo 8 caractères, expiration 24 h | À venir : 6 caractères, sans expiration |
| Dissolution complète de la room | Partiel : quitter l’espace supprime les matchs partagés |
| Accessibilité 48 px, WCAG AA, clavier | Fait pour les parcours principaux (44 px minimum, 48 px sur les actions clés) |

## Vérifications

- `tsc`, 125 tests, `next build`, smoke complet.
- Parcours testés en 320, 390 et 430 px.
- CI verte, production Vercel alignée sur `main`.

## Prochaines étapes (v2.1)

1. Intégrer Food et Film comme decks dans Découvrir, avec leurs filtres.
2. Date Builder et Ticket de Date (partage + agenda `.ics`).
3. Code duo à 8 caractères avec expiration à 24 h.
4. Dissolution explicite de la room et purge associée.
5. Recette performance (LCP) sur mobile réel.
