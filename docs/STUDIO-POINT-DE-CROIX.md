# Point Zéro — première étape du studio spécialisé

## Livré

- `/` : accueil point de croix, sans chargement automatique de démonstration ni nouveau format de projet.
- Accès à la bibliothèque locale, à la création, aux fils / toile et au suivi du projet actif.
- Import depuis l’accueil par les décodeurs existants (image, PDF, JSON, OXS), sans second moteur de conversion.
- Retour de l’en-tête de broderie vers cet accueil, plutôt que vers le studio multiformat.
- Identité et métadonnées recentrées ; styles d’accueil isolés et disposition mobile.
- Raccourcis de dessin, journal de session et maintien de l’écran actif limités à l’atelier broderie visible.

## Compatibilité

L’accueil AIME reste accessible à `/aime` et `/?studio=aime-home`. Les liens explicites historiques, `/pointzero`, `/atelier` (Design) et `/atelier?studio=embroidery` restent reconnus. Les autres studios ne sont ni supprimés ni migrés ; ils ne figurent plus dans le nouveau parcours d’entrée. Les clés de stockage et formats Pattern / JSON / OXS ne changent pas.

Travail indépendant des PR ouvertes #55 (bureau AIME), #56 (atelier commun), #57 (photo-souvenir). Leur fusion éventuelle demandera une revue des parcours communs, pas une fusion automatique de fonctionnalités concurrentes.

## Ce que cette étape ne prétend pas résoudre

- Pas de synchronisation entre appareils ni de sauvegarde cloud. Les copies JSON restent essentielles.
- Pas de nouvelle garantie de fidélité des PDF importés ni de conversion photo parfaite.
- Pas de boutique avec paiement.
- Pas de réécriture des moteurs DMC, points, exports et suivi.
- La simplification fine des outils essentiels / avancés, les comparatifs photo et la récupération des sauvegardes restent des étapes suivantes.

## Recette avant fusion

1. Racine, profil neuf puis profil avec ouvrage : ouvrir Créer, Mes ouvrages, Préparer et Broder.
2. Broderie → Accueil → Continuer : vérifier nom, cases, palette et progression ; précédent / suivant du navigateur.
3. Importer image, PDF, JSON et OXS ; annuler chaque dialogue sans modifier le projet ; vérifier les exports après un import validé.
4. Vérifier les liens historiques, dont `/aime` et `/atelier`.
5. Tester au clavier, sur téléphone et sur iPad / stylet : focus du champ fichier, scroll, panneaux et absence de débordement.
6. Vérifier une impression PDF à 100 %, sauvegarder puis réimporter le JSON.
7. Exécuter `npm run verify`. Les tests jsdom ne constituent pas une recette visuelle ni tactile.

La livraison se fait en PR, sans fusion ni promotion en production.

## Deuxième étape — parcours unifié

- Image importée : conversion puis ouverture directe en grille couleur, sans traverser la composition.
- PDF : le puzzle magnétique existant reste dans l’import, sous l’en-tête du studio. Assemblage, corrections et validation sont conservés ; le résultat s’ouvre directement en grille.
- Composition / décomposition : outil facultatif de Dessiner, sous le même en-tête, non imposé après import.
- Génération : une action génère l’image et calcule sa grille DMC ; les deux aperçus restent visibles avant validation. Style, taille et fils sont dans les réglages facultatifs. Aucun passage obligatoire par Composition après validation.
- La description intégrale est envoyée, sans décomposition automatique susceptible d’inverser les sujets, sans fond blanc ni sujet unique imposés et sans interdiction systématique des lettres. L’option de réécriture distante `enhance` est désactivée. Le style par défaut respecte la description ; le blanc n’est plus automatiquement supprimé.
- Les nouveaux transferts directs refusent de remplacer le projet actif si son archivage local échoue. Un changement de description invalide les aperçus précédents.

Le puzzle et les moteurs restent les mêmes : intégration ne signifie pas réécriture. Les outils de préparation ont encore leur propre panneau de travail au sein du studio. Les PDF difficiles nécessitent toujours un contrôle humain. Le service de génération externe peut échouer ou mal interpréter une demande ; aucun test avec un modèle distant ni gain de fidélité visuelle mesuré n’est revendiqué. Les tests de génération emploient une image simulée pour vérifier l’enchaînement, pas la qualité artistique. Les tests d’import isolent le transfert ; les algorithmes réels du puzzle restent couverts par `pdfPuzzle.test.ts`.

Recette supplémentaire : importer un PDF multipage réel, déplacer les cartes du puzzle et comparer toutes les limites de pages ; générer une scène avec plusieurs sujets, décor et prénom ; comparer image et grille ; vérifier la conservation de l’ouvrage précédent en cas de quota plein.
