# À deux — notes de release v2.1.0

Date : 15 novembre 2026
Tag : `v2.1.0`
APK : https://a-deux-v1-annay-ia.vercel.app/telecharger (build debug, hors Play Store)

Cette version complète le cahier des charges v2 après la refonte `v2.0.0`.

## Trois univers dans Découvrir

- Sélecteur **Activité / Food / Film** en haut de l’onglet.
- Food et Film sont les decks partagés du duo (gate explicite si le duo n’est
  pas complet), avec cartes centrées, actions et progression.
- Filtres dédiés en tiroir : envies Food (italien, asiatique, gourmand, healthy,
  végétarien, fromage, convivial) et genres Film (comédie, thriller, romance,
  SF, drame, horreur, classique, musique).
- Les filtres s’appliquent au deck et affichent le nombre de cartes restantes.

## Date Builder et Ticket de Date

- Bloc **« Composez votre soirée »** en haut de **Notre Espace** et de
  **Mes Envies**.
- Trois slots indépendants : Activité, Food, Film. Un seul suffit ; les trois
  fonctionnent ensemble.
- **« Surprends-nous »** tire une combinaison parmi les matchs / envies.
- **Ticket de Date** élégant, daté au prochain samedi 19 h 30.
- **« Envoyer à ma moitié »** : partage natif (ou copie) avec un texte prêt.
- **« Ajouter à notre agenda »** : fichier `.ics` universel de 2 h 30.
- Depuis une célébration de match, **« Ajouter à notre soirée »** ouvre le
  compositeur avec l’élément déjà sélectionné.

## Sécurité et duo

- Codes d’invitation à **8 caractères** (alphabet sans 0/O/1/I), les anciens
  codes à 6 caractères restent acceptés.
- Code valable **24 heures** ; au-delà, la jonction répond explicitement que le
  code a expiré.
- **Duo limité à 2** : un troisième membre est refusé (409).
- Jonction limitée à **5 tentatives / minute / IP**.
- **« Dissoudre notre espace »** supprime la room, les matchs, les souvenirs et
  les choix partagés (cascades PostgreSQL).

## Libellés et micro-interactions

- Onglets **Découvrir / Notre Espace / Mes Envies / Nous & Réglages**.
- Statut de complicité sous le logo : **Duo connecté**, **Invitation en
  attente** ou **Inviter ma moitié**.
- Inclinaison des cartes à **±12°**, sceaux **COUP DE CŒUR** (vert) et
  **PAS CE SOIR** (neutre), vibration 10 ms.
- Célébration : **« Vous êtes sur la même longueur d’onde ! »** avec
  **« Ajouter à notre soirée »**.

## Limites connues

- Les cartes Food/Film n’ont pas encore les champs avancés du cahier des
  charges (mode cuisiner/livraison, budget, durée, note, plateforme) : les
  filtres s’appuient sur les tags existants.
- Le Date Builder en solo propose les activités gardées ; Food et Film
  supposent un duo, car leurs matchs sont partagés.
- Le statut du header reste générique (« Duo connecté ») sans prénom du
  partenaire.
- L’APK distribué est un build **debug** ; le Play Store viendra avec un AAB
  signé.

## Vérifications

- `tsc`, **129 tests**, `next build`, smoke complet.
- Parcours testés en 320, 390 et 844 px.
- Codes : 8 caractères, expiration 24 h, troisième membre refusé, dissolution.
- Date Builder : activité seule, Food + Film, trio complet, surprise.
