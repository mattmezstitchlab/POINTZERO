# POINTZERO — Revue UI et parcours (27 octobre 2026)

## Vérifié dans le code de la branche de correction
- Barre de niveau : remplacer la bande haute par trois choix segmentés, garder la sélection active et la mémorisation.
- Rail DMC : fixer au bas de la fenêtre ; dock d'outils au-dessus (sans toile apparente sous le rail).
- Espace de travail : réserver 58 px à l'en-tête, 94 px au rail et 354 px à gauche quand le générateur est visible ; le panneau est non modal.
- Générateur : la conversion DMC locale peut être réappliquée à l'image déjà générée sans nouvelle requête IA.
- Boutique : fermeture du dialogue par Échap, confinement du focus clavier et retour à l'élément précédent.
- Accueil : retirer les appels à l'action répétés, garder les fonctionnalités importantes (nouveau motif, bibliothèque, photo, PDF, partage).
- PDF multipages : **fonction déjà existante** dans PdfPrep.tsx avec assemblage/puzzle, étapes et déplacements ; ne pas ajouter de second moteur.

## Points observés qui méritent une recette réelle
- Tester toutes les fenêtres à 1440, 1024, 768, 390 px ; vérifier que la capsule de niveau ne recouvre pas le titre ou les actions sur écrans compacts.
- Vérifier les quatre modes Créer / Outils / Fils / Broder, le calage du centre au zoom et le retour depuis le générateur.
- Tester de vrais PDF multipages de formats différents : rotation, recouvrement, extraction, symboles et raccords.
- Tester une conversion de photo puis l'export JSON/PDF et la reprise après rechargement.
- Tester les raccourcis icônes seules : nom accessible, focus, infobulle, état activé/désactivé et contraste.
- Tester la boutique au clavier, filtres, fermeture de fiche, restauration du focus, navigation vers générateur.
- Les visuels de roses et vignettes boutique sont encore des exemples/concepts ; ils ne sont pas des patrons commerçables.
- Protéger le projet courant lors d'une nouvelle génération et contrôler sauvegardes avant remplacement.

## État qualité
Les workflows GitHub assurent la compilation et la suite de tests automatisés. Ils ne garantissent pas, à eux seuls, le rendu effectif sur iPad et navigateur. **Pas de fusion sans dernier feu vert CI et recette visuelle.**

## Décision de produit
Gauche : commencer ; centre : ouvrage ; bas : geste immédiat ; droite : inspection, fils et sorties ; haut : projet, niveau et actions transversales. Supprimer les **doublons de chemins**, pas les capacités métier.
