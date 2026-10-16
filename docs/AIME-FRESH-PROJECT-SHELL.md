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
- Les données de ce nouveau socle sont isolées dans `aime:project-document:v1:<id>`, avec validation de schéma et protection contre l'écrasement d'un enregistrement invalide.
- Les vrais projets continuent d'utiliser `WorldSpace.id` dans le stockage existant `pointzero:one-space:v1`.
- Les moteurs, les anciens fragments de démonstration, les travaux graphiques, les exports Broderie et les URL historiques **ne sont pas effacés ni migrés**.
- Le document minimal n'est **pas encore** le contrat commun définitif des moteurs. Les intégrations multi-Studio feront l'objet de changements distincts, une fonction partagée à la fois.
- Le catalogue de fragments existant utilise une disposition « Éditoriale » avec spans inégaux ; cela explique l'une des différences de taille visibles dans la capture. Aucun de ces fragments de démonstration n'apparaît dans le nouvel espace.

## Recette avant fusion
Vérifier le Bureau vide → Nouveau projet → nouvel espace vide ; absence de menu Outils / Broderie / Grille / fleur / faux exemples. Créer une page, ajouter et modifier un texte, revenir au Bureau, rouvrir et vérifier la persistance. Tester deux projets indépendants et la protection des données incompatibles, ainsi que les anciens deep-links. Vérifier manuellement 390, 768 et 1440 px, clavier et zoom à 200 %.

**Statut** : première passe en PR brouillon. Ne pas fusionner en production avant validation visuelle et fonctionnelle.
