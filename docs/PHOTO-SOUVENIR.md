# Photo → souvenir à broder

## Accès et portée

`/?parcours=photo-souvenir` ouvre une page dédiée, sans remplacer l'accueil, les
ateliers historiques ou les projets sauvegardés. Les PR #55 et #56 sont intactes.
Aucun compte, service IA, paiement, diffusion ou écriture dans les clés de stockage
existantes. Aucun nouveau package ajouté à l'application.

Le parcours réutilise `loadImage` / `asyncRasterToCells` et son worker, `Pattern`,
`computeStats`, `shoppingList`, `buildPdf`, `toObject` / `fromObject`.
1. Photo JPG/PNG/WebP jusqu'à 12 Mo ; limite de 24 mégapixels vérifiée après décodage.
2. Grand côté de 40 à 200 points, ratio conservé sur les deux dimensions, 4–32
   couleurs maximum, toile Aida 11/14/16/18 ct et 2 brins. Pas de détourage ou retouche IA.
3. Aperçu pixelisé, correction d'une case par coordonnées avec palette du motif
   ou effacement. Le choix de réglages prépare une prochaine génération et ne
   modifie pas le motif précédent tant qu'elle n'a pas réussi.
4. PDF A4 noir/blanc à symboles avec recouvrement et règle de contrôle, CSV des
   achats sans déduction de stock et JSON projet réimportable.

Les trois sorties relisent le motif affiché. Les quantités sont des estimations
issues du moteur commun : longueur cumulée des brins simples, marge de chute et
écheveau de 8 m à 6 brins (48 m simples). Pas une mesure fabricant ou une garantie
de consommation. Couleurs écran indicatives ; références et droits selon les
sources existantes du dépôt. Ne pas présenter la sortie comme un programme de
brodeuse : aucun DST/PES n'est produit.

Le JSON peut être repris ici si le projet reste dans le sous-ensemble simple
Aida/croix et 200 × 200, sans mélanges ni calques/ornements/points fractionnaires.
Sinon la page demande l'atelier complet, sans aplatir ou supprimer les données.
Un import invalide ne remplace pas le motif en cours. Aucune sauvegarde automatique :
télécharger le JSON avant de quitter. Les informations d'image/provenance sont
conservées, la photographie originale n'est pas intégrée au fichier projet.

## Vérifications effectuées

Tests dédiés : proportions paysage/portrait, limites, raster → quantification →
modèle, correction, PDF réel avec codes/légende, CSV/quantités cohérentes et
réimport préservant cellules, palette, toile, provenance et statistiques. Les
métadonnées normalisées par fromObject (valeurs par défaut, date updated) ne sont
pas présentées comme identiques octet pour octet.

Deux vrais fichiers du dépôt ont été décodés avec un banc Node Canvas isolé des
dépendances de l'application, puis passés dans les moteurs de quantification,
PDF et réimport :
- `public/images/hero-ipad-broderie.jpg` : grille 80 × 45, 12 couleurs, 3600 croix,
  PDF de 1 560 495 octets.
- `public/images/papillon.png` : grille 80 × 80, 12 couleurs, 6400 croix,
  PDF de 3 217 626 octets.
Pour les deux : cellules/statistiques et CSV identiques après réimport. Le banc
utilise le redimensionnement Canvas natif Node, pas le rendu progressif du navigateur :
ce n'est pas une preuve d'identité pixel par pixel entre runtimes.

La recette Chromium complète a été préparée mais n'a pas pu démarrer : bibliothèque
système libglib-2.0.so.0 absente ; téléchargement des dépendances système bloqué
par résolution réseau des archives Ubuntu. Aucun résultat visuel, test de caméra,
téléchargement UI ou accessibilité complète en navigateur n'est revendiqué.

## Recette restante avant de déclarer le parcours terminé

- Dans l'aperçu : tester portrait, paysage et image à fort détail ; vérifier le
  chargement, la prévisualisation, les corrections, erreurs et tous les téléchargements.
- Vérifier mobile 390 px, tablette, clavier et annonce des états.
- Réimporter le JSON dans cette page et dans l'atelier historique, sans perte.
- Ouvrir le PDF dans un vrai lecteur : couverture, légende, codes, symboles et
  pages de recouvrement.
- **Imprimer à 100 %, sans ajustement** : mesurer la règle de contrôle, les cases
  et comparer à la toile. Contrôle physique non réalisable depuis le sandbox.
- Faire réaliser un petit échantillon pour confronter les estimations de fil au
  geste réel ; l'ajustement des marges relève d'une calibration, pas d'une promesse.

Le statut reste « parcours implémenté et moteurs testés », pas « impression et
fabrication garanties » tant que cette recette n'a pas été effectuée.

Contrôle complet `npm run verify` : tests API (7), TypeScript, Vitest (68 fichiers,
485 tests), build Vite et contrôle du manifeste hors ligne. Les avertissements
jsdom Canvas/navigation et taille de bundle sont signalés ; aucun test n'est
masqué pour les faire disparaître. Le manifeste vérifié ne constitue pas une
recette hors ligne réelle dans un navigateur.
