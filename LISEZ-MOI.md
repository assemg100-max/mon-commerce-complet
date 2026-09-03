# Mon Commerce Sénégal — Projet complet

Ce dossier contient TOUT le projet, regroupé en un seul endroit :

```
mon-commerce-complet/
├── frontend/     → le site (ce que voient les visiteurs)
├── backend/      → le serveur (gère les comptes, boutiques, produits, commandes)
└── package.json  → permet de lancer les deux EN MÊME TEMPS
```

## Installation (à faire une seule fois)

1. Ouvre ce dossier `mon-commerce-complet` dans VSCode
   (Fichier > Ouvrir le dossier).

2. Ouvre un terminal (Ctrl + `) et tape :

   ```
   npm install
   npm run install-all
   ```

   La première commande installe l'outil qui permet de lancer les deux
   projets ensemble. La deuxième installe les dépendances du site ET
   du serveur en une seule fois.

## Lancer le site (à chaque fois que tu travailles dessus)

Une seule commande, dans le même terminal :

```
npm run dev
```

Tu vas voir dans le MÊME terminal les logs des deux projets, chacun
avec une couleur différente :

- **BACKEND** (en bleu) → doit afficher
  `✅ Serveur Mon Commerce Sénégal lancé sur http://localhost:4000`
- **SITE** (en vert) → doit afficher une adresse du style
  `http://localhost:5173`

Ouvre cette dernière adresse dans ton navigateur : c'est ton site.

Pour tout arrêter, appuie sur `Ctrl + C` dans le terminal.

## Pourquoi deux projets dans un seul dossier ?

- Le **frontend** (dossier `frontend`) est ce que voit un visiteur :
  les pages, boutons, formulaires.
- Le **backend** (dossier `backend`) est le serveur qui garde en
  mémoire toutes les données (comptes, boutiques, produits, commandes)
  et les partage entre tous les visiteurs du site.

Ce sont deux programmes séparés qui communiquent entre eux, mais grâce
à `npm run dev` à la racine, tu n'as plus qu'UNE seule commande à
retenir pour les lancer ensemble.

## En cas de souci

Si le site affiche une erreur du type
"Impossible de contacter le serveur", vérifie dans le terminal que la
ligne BACKEND affiche bien
`✅ Serveur Mon Commerce Sénégal lancé sur http://localhost:4000`.
Si ce n'est pas le cas, il y a une erreur au démarrage du backend —
regarde le message en bleu dans le terminal, il indique le problème.

## Réinitialiser les données

Les données du site sont stockées dans le fichier
`backend/data/db.json`. Si tu veux tout remettre à zéro, supprime ce
fichier et relance `npm run dev` — il sera recréé automatiquement
avec les données de démonstration de départ.

## Nouveautés de cette version

- **Avis et notes clients** sur chaque produit.
- **Favoris** : chaque client peut enregistrer des produits (icône
  cœur), retrouvables dans "Favoris" en haut du site.
- **Upload de vraies photos** pour les produits et le logo de boutique
  (au lieu d'un simple lien URL).
- **Personnalisation de la boutique** : chaque commerçant choisit une
  couleur pour sa page boutique, dans son profil.
- **Filtres avancés** (prix, note minimum) sur la page Catégorie.
- **Commission de la plateforme** : 10 % par défaut, calculée
  automatiquement sur chaque commande. Le commerçant voit clairement
  ce qu'il touche après commission dans ses commandes.

## Devenir administrateur (voir les revenus de la plateforme)

Il n'y a pas de bouton public pour ça — c'est volontaire, pour que
n'importe quel visiteur ne puisse pas voir combien la plateforme
gagne. Pour activer ton propre compte en administrateur :

1. Crée d'abord un compte normal sur le site (inscription classique).
2. Assure-toi d'avoir lancé le site au moins une fois, pour que le
   fichier `backend/data/db.json` soit créé.
3. Arrête le serveur (`Ctrl + C` dans le terminal).
4. Ouvre `backend/data/db.json` dans VSCode.
5. Cherche ton compte dans la liste `"users"` (repère-le grâce à ton
   email), et change la ligne :

   ```
   "role": "client",
   ```

   en :

   ```
   "role": "admin",
   ```

6. Sauvegarde le fichier, relance `npm run dev`, reconnecte-toi sur
   le site avec ce compte. Un lien "📊 Administration" apparaît dans
   le menu du haut, avec les statistiques et le réglage du taux de
   commission.

## Prochaines étapes possibles

- Ajouter le paiement Mobile Money (Orange Money / Wave).
- Héberger le projet en ligne pour que ce soit accessible à tout le
  monde, pas seulement sur ton ordinateur (ex : Render ou Railway
  pour le backend, Vercel ou Netlify pour le frontend).
- Ajouter la messagerie entre client et commerçant.
