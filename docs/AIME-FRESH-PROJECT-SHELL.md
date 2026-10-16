# AIME — Nouveau socle projet, construit depuis le Bureau

## Décision
Le Bureau AIME validé visuellement est la base du logiciel. L'ouverture d'un projet ne monte **aucun** ancien Studio : ni `DesignStudio`, ni `FragmentGridWorkspace`, ni menu Outils, ni motifs floraux. Le projet ouvre `AimeProjectWorkspace`, un composant entièrement neuf partageant les mêmes couleurs, densité et structure que le Bureau.

## Écrans
- `/` : Bureau AIME (projets, recherche, archives).
- `/projet/:id` : nouvel environnement composé de **trois zones persistantes** et d'un header.
  - Header : AIME, retour au Bureau, nom du projet, une seule fonction d'export pour **les pages de ce projet**.
  - Gauche : structure des **Pages**, puis **Éléments** de la page active.
  - Centre : vide tant que la première page n'est pas explicitement créée. Puis surface de page vierge, sans modèle imposé.
  - Droite : propriétés **contextuelles** du projet, de la page ou du texte sélectionné. Pas de seconde liste de calques.
- Nouvelle donnée minimale : pages + élément Texte. Aucune grille ou moteur ne se charge implicitement.
- Les anciennes URLs `/atelier`, `/atelier?studio=...` et `/atelier?legacy=1` restent des parcours historiques, non intégrés au nouveau composant. La route `/atelier?project=<id>` ouvre le nouvel espace pour compatibilité.

## Données et limites
- Une page n'existe qu'après l'action « Ajouter une page ».
- Les nouveaux projets ne préremplissent aucun module métier : le tableau interne `tiles` démarre vide, contrairement au constructeur historique. Les anciens projets gardent leurs modules actuels.
- Les données de ce nouveau socle sont isolées dans `aime:project-document:v1:<id>`, avec validation de schéma et protection contre l'écrasement d'un enregistrement invalide.
- Les vrais projets continuent d'utiliser `WorldSpace.id` dans le stockage existant `pointzero:one-space:v1`.
- Les moteurs, les anciens fragments de démonstration, les travaux graphiques, les exports Broderie et les URL historiques **ne sont pas effacés ni migrés**.
- Le document minimal n'est **pas encore** le contrat commun définitif des moteurs. Les intégrations multi-Studio feront l'objet de changements distincts, une fonction partagée à la fois.
- Le catalogue de fragments existant utilise une disposition « Éditoriale » avec spans inégaux ; cela explique l'une des différences de taille visibles dans la capture. Aucun de ces fragments de démonstration n'apparaît dans le nouvel espace.

## Recette avant fusion
Vérifier le Bureau vide → Nouveau projet → nouvel espace vide ; absence de menu Outils / Broderie / Grille / fleur / faux exemples. Créer une page, ajouter et modifier un texte, revenir au Bureau, rouvrir et vérifier la persistance. Tester deux projets indépendants et la protection des données incompatibles, ainsi que les anciens deep-links. Vérifier manuellement 390, 768 et 1440 px, clavier et zoom à 200 %.

**Statut** : première passe en PR brouillon. Ne pas fusionner en production avant validation visuelle et fonctionnelle.

## Passe UI universelle — première expérimentation

- Conserver les trois panneaux du nouveau Bureau et de l'espace projet. L'ancienne interface DesignStudio n'est pas montée.
- Ajouter une barre latérale unique pour les intentions d'édition : **Sélectionner**, **Déplacer la vue** et **Retirer un élément**. Le mode retrait ne supprime rien sans validation ; le déplacement de vue pilote uniquement le défilement, pas encore les coordonnées métier.
- Placer en bas la capsule **AI + ME** en typographie seule, **sans étoile ni pictogramme**. Seul le bouton central `+` ouvre les actions réelles disponibles : **Nouvelle page** et **Texte**. Il n'exécute pas d'IA.
- Un menu de création unique évite les `+` en doublon dans Pages et Éléments. L'inspecteur de droite se limite à l'objet sélectionné.
- Une barre d'aperçu permet **Auto / Ordinateur / Tablette / Mobile** et un zoom **75 / 100 / 125 %**. Ce sont des tailles de visualisation de la page actuelle : **ce n'est pas encore le moteur responsive MÉTAMORPHOSE**.
- Les moteurs Photo, Broderie, PDF, Calendrier et Décomposition **ne sont pas branchés** ; aucune promesse de réglages, de publication ou d'export PDF fonctionnels ne découle de ce lot. L'export déjà présent reste le JSON des pages.
- La barre permet de tester le langage visuel universel sans inventer de capacité. Le vrai repositionnement de calques, la segmentation photo, la sélection multi-objets, l'undo et les réglages couleur sont des incréments séparés.

Recette : projet vide sans écriture, ouvrir +, ajouter une page et du texte, sélectionner, changer d'outil, tester la gomme avec Annuler et Confirmer, afficher différentes largeurs, zoomer, rouvrir le projet, vérifier les données, vérifier la capsule sans icône. Vérifier le rendu réel sur 390/768/1440 px et au clavier avant toute fusion.
