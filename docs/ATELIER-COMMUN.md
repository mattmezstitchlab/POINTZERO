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

Prochaine étape : définir des liens explicites entre documents, avec consentement et migration réversible, avant de parler d’un projet de données réellement unifié.
