# POINTZERO — Atelier d'abord, Dossier comme point d'entrée

## Décision de produit

Une application se présente par son **outil réel**, pas par une succession de landings.
La racine `/` ouvre le **Studio Édition** existant : canevas, éléments, formats, projets, grille et actions d'export. Le bouton **Broderie** et le menu **Studios** restent opérationnels.

## Nouveau parcours canonique

1. `/` — l'Atelier Édition est visible directement, sans hero, introduction ou manifeste préalable.
2. **Dossier** dans l'en-tête — afficher les dossiers locaux existants, sélectionner celui qui est actif, ou choisir **Nouveau dossier**.
3. **Nouveau dossier** / **Gérer le Dossier Universel** — utiliser **le moteur existant** à `/espace`, avec confirmation avant toute création. Retour vers `/`.
4. **Studios** — ouvrir les outils métiers existants (MÉTAMORPHOSE, Mini-site, Broderie, PDF, Accessibilité, etc.). Le Dossier n'apparaît plus en doublon dans ce menu.

## Garanties et limites

- Aucune suppression ni migration du contenu existant. Les anciennes URL éditoriales (`/pointzero`, `/vision`, `/univers`, `/le-monde-aime`, `/dossier`) restent lisibles par liens directs pour ne pas casser les références ni supprimer l'identité associative.
- Ces anciennes pages ne sont **plus le point d'entrée**, ni l'objet d'une nouvelle campagne de landing.
- Dossiers = stockage canonique `pointzero:one-space:v1` avec `WorldSpace.id`; le sélecteur refuse d'écraser un stockage illisible/incompatible. Créations Édition = stockage spécialisé distinct et conservé.
- Choisir un Dossier détermine le contexte courant ; cela ne relie **pas encore** un document Édition, un patron ou un mini-site au Dossier. Cette association doit faire l'objet d'une action explicite dans un prochain chantier.
- Aucun agent n'est automatiquement exécuté, aucune donnée n'est publiée. Les utilisateurs restent responsables de leurs sauvegardes et exports.
- L'Atelier Édition continue de sauvegarder localement son propre document comme auparavant.

## Recette avant fusion

- Vérifier les parcours `/`, `/atelier`, `/?studio=embroidery` et `/espace`.
- Dossier absent : menu vide, clic Nouveau dossier, formulaire existant, aucune création avant confirmation.
- Dossier existant : sélection, conservation des autres dossiers et du document graphique, retour à l'Atelier.
- Vérifier les boutons Broderie, Studios, Projets, Grille et Export, ainsi que les accès historiques.
- Valider visuellement clavier, zoom 200 %, mobile 390px, tablette 768px et desktop 1440px dans une preview Vercel.

Ce changement ne supprime pas physiquement les anciens composants de landing dans Git : ils restent archivables, sans être le parcours par défaut. Leur suppression technique définitive nécessite un inventaire des références et des liens entrants.
