# POINTZERO — Architecture Bureau → Projet → Édition

## Décision de conception

Les landing pages ne sont plus l'interface d'accueil. La racine `/` ouvre un **Bureau** de projets réels, inspiré par la hiérarchie fonctionnelle d'un éditeur professionnel (sans copier l'identité ou les visuels de Framer). Le **Dossier est le projet**, pas un Studio supplémentaire.

## Parcours de la première passe

1. `/` : Bureau sombre ; projets locaux issus de `WorldSpace.id` (clé existante `pointzero:one-space:v1`), recherche, archivage local réversible, création d'un projet nommé et typé, sans modèles pré-remplis.
2. `/atelier` : éditeur réel du projet sélectionné. Le document graphique est vierge (aucune fleur rose ni décoration automatique) et stocké sous une clé propre à ce projet.
3. Colonne gauche : Ajouter (texte, forme, image), Calques (vrais éléments sélectionnables), Fichiers (créations du projet), Grille (moteur de fragments). Inspecteur à droite, canvas au centre.
4. Broderie et autres moteurs restent ouverts depuis le menu Studios existant pour assurer la continuité des travaux, **sans prétendre qu'ils utilisent déjà tous le même document**.
5. Retour Bureau : navigation explicite depuis l'éditeur, sans destruction.
6. Les anciennes routes documentaires (`/vision`, `/univers`, `/pointzero`, `/le-monde-aime`, `/dossier`, `/espace`) restent consultables pour éviter de casser les liens externes et préserver l'association.

## Politique anti-friction

- Ne montrer aucune fleur, grille DMC ou maquette de mariage non demandée dans les nouveaux documents graphiques.
- Ne pas supprimer les presets dans le vrai moteur Broderie : ils font partie de son métier.
- Ne pas réécrire les anciens documents graphiques ; leurs motifs et rendus restent pris en charge par le moteur existant.
- Ne pas modifier ou migrer implicitement les autres clés : `pointzero:design-current:v1` et `pointzero:design-drafts:v1` restent inchangées, avec un accès « Anciennes créations » dans le Bureau.
- Le nouvel éditeur par projet utilise `pointzero:design:project:<id>:current:v1` et `...:drafts:v1`. Il s'agit d'une **première liaison locale**, pas encore d'une véritable synchronisation multi-Studio.

## Feuille de route — encore à implémenter

- **Modèle de document commun** : identifiants canoniques, pages, calques, médias, fragments et références aux sources ; schéma versionné et import/export non destructif.
- **Commandes transversales** : Annuler, rétablir, importer, exporter, zoom, aligner, dupliquer, commentaires et validations ; adaptation métier plutôt que duplications.
- **Moteurs/Plugins** : Broderie, Design, Mini-site, PDF, Accessibilité, Musique, Chronologie et Causalité partagent contexte, fichiers et commandes, mais gardent les formats de sortie spécialisés.
- **Catalogue de capacités** : une fonction apparaît dans l'Atelier selon l'objet sélectionné ; pas de vingt interfaces concurrentes.

## Recette

- `npm run verify` (API + TS + Vitest + Vite + offline) et SHA Vercel.
- Bureau sans projets, nouveau projet, sélection, recherche, archivage/restauration ; vérifier l'absence d'écriture avant confirmation.
- Ouvrir deux projets : les deux documents de l'éditeur restent séparés. Revenir au Bureau puis rouvrir et vérifier les données.
- Vérifier l'absence des presets floraux dans Ajouter et sur les nouveaux canevas, tout en ouvrant de vieux documents avec motifs.
- Tester Broderie, Studios et les anciennes URLs sans redirection destructive.
- Tests manuels de rendu 390/768/1440 px, clavier, zoom 200 %, lecteur d'écran.

**Statut :** prototype structurel en PR Draft ; ne pas fusionner dans `main` ni publier en production sans recette fonctionnelle et visuelle.
