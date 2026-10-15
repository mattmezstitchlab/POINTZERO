# Génération directe de patrons — V1

Cette branche est basée sur `feat/embroidery-panels-unified` (PR #33). La PR #35 ajoute le parcours de création directement dans la colonne gauche.

## Parcours utilisateur

1. Cliquer sur **Créer** (colonne gauche) de l'atelier Broderie.
2. Décrire le sujet (3 à 300 caractères).
3. Choisir la largeur (60, 80, 120 ou 160 points), 8 à 30 couleurs, style, format, détail et éventuellement la toile.
4. Dans « Connexion au moteur d'images », saisir le **code privé d'accès** convenu avec l'administrateur.
5. Cliquer **Générer dans la grille**. Les états de progression s'affichent à gauche.
6. L'image source est convertie localement et la vraie grille DMC apparaît au centre, avec les symboles, le balayage, le zoom de lecture et le nettoyage prudent. L'éditeur retrouve ensuite son affichage normal.
7. Comparer **Avant** et **Nettoyé** ou demander une variante. L'utilisateur garde la possibilité d'annuler.

## Évolution du moteur

L'ancien pipeline photographique libre (Pollinations ancien endpoint, dithering 24 à 64 couleurs) n'est plus utilisé sur ce parcours. Le pipeline actuel :

- Assemble un prompt centré sur le **sujet original** avec des contraintes visuelles favorables au point de croix.
- Demande une illustration à un modèle d'images externe par une fonction serveur.
- Projette l'image dans une grille de dimensions choisies par un algorithme de quantification CIELAB.
- Limite le nombre de fils et préserve les croix de petites zones en contexte vide.
- Nettoie uniquement les cellules isolées dont au moins deux voisines de même couleur soutiennent un remplacement.
- Conserve les versions avant/après dans la session, sans passer par une seconde modal de composition.

Le moteur image reste probabiliste : **la conformité sémantique exacte au prompt n'est pas garantie**. Il faut réellement tester chaque catégorie de sujets, couleurs et relations.

La « magie en cinq secondes » est une **animation UX après réception de l'image**, non un temps garanti de génération : les modèles externes peuvent prendre plus longtemps ou être indisponibles.

## Configuration privée nécessaire

L'intégration actuelle officielle de Pollinations nécessite une clé. Source : https://gen.pollinations.ai/docs

Le serveur accepte trois variables d'environnement :
- `POLLINATIONS_API_KEY` : clé API privée Pollinations `sk_`, définie dans Vercel ; **jamais intégrée au bundle frontend**.
- `POINTZERO_GENERATION_ACCESS_CODE` : code de protection privé choisi par le propriétaire, différent de la clé API. La colonne gauche demande ce code pour le lancement de la génération.
- `POINTZERO_IMAGE_MODEL` : optionnel, ID du modèle d'image compatible (par défaut `flux`).

La route `api/stitch-image.mjs` est l'adaptateur d'images côté serveur. Elle refuse les configurations absentes, les requêtes sans code, les prompt trop longs, les fichiers excessifs, et tente d'espacer les appels. **Le code d'accès est un garde-fou, pas une authentification multi-utilisateurs.** Ne pas rendre le service public/commercial avant auth complète, limites de coûts globales, quotas persistants et protection anti-abus.

### Développement local

`npm run dev` démarre Vite et le moteur de broderie hors ligne, mais n'exécute pas directement les fonctions serveur Vercel. Pour tester la génération connectée, utiliser un environnement Vercel de test avec ses variables privées ; ne pas injecter de clé privée dans un `.env` Vite exposé via `VITE_`.

## Vérifications requises

- Vérifier les quatre tailles, trois formats et plafonds de couleurs sur de vrais cas.
- Comparer des prompts précis, dont « papillon sur un éléphant ».
- Vérifier qu'une erreur réseau conserve le patron en cours.
- Vérifier « Avant » et « Nettoyé », undo/redo et export JSON/PDF/OXS.
- Vérifier le rendu du balayage sur ordinateur, iPad et mobile ; désactiver l'animation avec Reduced Motion.
- Vérifier le rendu réel d'un symbole DMC après zoom et dézoom.
- Surveiller la taille et les dépenses du modèle image avant ouverture.

## Aucun changement de l'architecture DMC

La représentation native `Pattern`, les palettes DMC, les projets sauvegardés, les calculs de fil et le mode Broder restent inchangés.