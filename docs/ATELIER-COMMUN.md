# Atelier commun — première étape

Accès : `/atelier-unifie`, également proposé sur l’accueil. Les liens existants ne changent pas.

- Une barre persistante donne accès à Composer (design), Broder et Organiser (programme).
- Les autres outils restent accessibles via les espaces existants.
- Le contexte choisi dans la barre est transmis au programme et aux outils acceptant déjà un projet lié. Il reste sélectionné durant les changements d’outil dans cette session React.
- Aucun document n’est déplacé, réécrit ou migré par l’enveloppe. Chaque éditeur garde ses sauvegardes et exports existants. Le motif de broderie reste détenu par App lors des changements de vue.
- Il ne s’agit pas encore d’une fusion de modèles : la sélection d’un projet ne rattache pas automatiquement un patron ou un design. Pas de synchronisation entre comptes ni de mise à jour des fichiers déjà exportés.

## Recette manuelle avant généralisation

1. Sur un navigateur contenant des ouvrages, ouvrir la nouvelle URL ; vérifier leur reprise dans Broder.
2. Modifier un motif, passer à Composer puis revenir : vérifier le motif et l’annulation.
3. Créer un design, passer à Organiser, choisir ce design comme contexte, créer un programme lié ; vérifier le lien puis recharger.
4. Utiliser précédent/suivant et ouvrir un ancien lien `?studio=embroidery`.
5. À 390 px et sur tablette : vérifier les deux barres, le défilement horizontal des outils, les panneaux mobiles, les dialogues et les exports. L’enveloppe forme un bloc contenant pour les éditeurs positionnés en fixed.
6. Vérifier que sans sélection le programme ne prétend pas être lié à un projet.

Étape suivante après les liens explicites : définir les champs partagés et leur propagation contrôlée, avant de parler d’un modèle de données réellement unifié.

## Rattachement explicite et export groupé

Le panneau « Documents et export du projet » ajoute un index versionné `pointzero:workshop-links:v1`, séparé des fichiers métier. Choisir d’abord un projet existant dans le contexte (les projets se créent via « Autres outils et projets »), puis lire l’inventaire et cocher les créations à rattacher.

L’inventaire lit le design courant et les brouillons enregistrés, le patron actuellement ouvert et les programmes locaux. Les liens sont conservés par identifiant ; un document indisponible est signalé et bloque l’export au lieu d’être omis silencieusement. Le regroupement JSON relit les sources au moment de l’export, après confirmation de l’utilisateur. Il contient les valeurs de l’instant, sans déplacer les originaux ni fournir encore d’import groupé. Pour un autre patron, l’ouvrir d’abord depuis la bibliothèque.

Le contexte sélectionné reste temporaire ; les liens sont persistants. Les champs partagés date/personnes et leur propagation entre moteurs ne sont pas encore implémentés. Les exports PDF/SVG restent dans leurs éditeurs respectifs.
