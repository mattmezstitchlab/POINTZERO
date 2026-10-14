# SLÂME — prototype musical et expressif de POINTZERO

**Statut : expérimental, local, sans publication.** Point de départ : POINTZERO (grille, couleurs DMC, photo → motif, points de broderie). Le noyau musical v0.1 est autonome du moteur AIME Music Lab : il se remplace ultérieurement par AudioTransport et InstrumentEngine sans changer la grille.

## Ouvrir
Dans POINTZERO, utilisez le bouton « ♫ SLÂME · La grille musicale » depuis la toile ou « ♫ SLÂME · Écouter / Parler » dans l'atelier. L'URL directe est /#slame. Revenez à la broderie avec « ← POINTZERO ». La branche main de POINTZERO reste inchangée.

## Mode d'emploi
1. **Préparez :** ouvrez ou créez votre motif POINTZERO. Photo → motif DMC, dessin, points arrière et nœuds sont pris en compte.
2. **Composez :** dans « Parcours libre », sélectionnez plusieurs cases. Le chemin A → B → C… suit toutes les cases intermédiaires (Bresenham), peut se croiser et revenir sur lui-même. Sur une grille vide, la démonstration affiche une rosace locale ; elle n'écrase pas le projet.
3. **Écoutez le motif :** « Écouter tout le motif » produit une lecture serpentine des points brodés, sous-échantillonnée à 512 événements pour un grand patron, puis les points arrière/lancés et nœuds. Ce n'est pas une traduction littérale de mots, mais une création musicale déterministe.
4. **Réglez :** gamme pentatonique, majeure, mineure, dorienne ou blues ; tempo 45–170 BPM ; accordage 432 ou 440 Hz ; boucle infinie.
5. **Parlez :** « Faire parler » propose des messages essentiels et affectifs, un texte personnalisé de 500 caractères, une émotion choisie agissant sur la prosodie, et la synthèse vocale native du navigateur. Messages essentiels prononcés immédiatement en les sélectionnant ; aucun message n'est envoyé.
6. **Utilisez le clavier :** focus sur la grille, flèches, Entrée/Espace pour poser un jalon, Retour arrière pour supprimer, Échap pour arrêter le son.
7. **Contacteur :** activez « Balayage » dans Accessibilité. Un premier appui « Sélectionner » choisit la ligne, le suivant choisit la colonne. Vitesse configurable. Pour un contacteur physique, mapper sa commande au bouton via une interface de commande adaptée.

## Ce qui fonctionne en v0.1
- Chargement du patron existant sans mutation, références DMC exactes issues de craft-color-codes (CC BY 4.0).
- Tracé multi-jalons accessible avec bornage, lecture d'un motif photo converti, traits arrière et nœuds.
- Notes musicales synthétisées avec Web Audio, tempo et gamme, silence pour les cases vides en mode motif.
- Messages de communication explicites prononcés avec la voix système disponible.
- Commandes tactiles/clavier, balayage de simulation de contacteur, guide intégré, tests du moteur pur.
- Aucun compte, aucune transmission de photo ou de vidéo par SLÂME, aucune collecte de données médicales.

## À construire ensuite
1. Commande webcam volontaire et calibrée, mouvements de tête, souffle/microphone avec seuils personnalisés : nécessite permissions et essais utilisateurs, ne doit pas déclencher des communications urgentes sur une détection brute.
2. Mode CAA plus complet (pictogrammes, vocabulaire, syntaxe, langues, voix haute qualité et/ou enregistrée, communication alternative évaluée avec orthophonistes et utilisateurs).
3. Liaison des moteurs AudioTransport, HarmonyEngine et InstrumentEngine du Music Lab (6) : polyphonie, instruments et export MIDI/WAV du vrai moteur.
4. SAL multi-participants avec consentements, rôles, horodatages et contrôle explicite de diffusion. POINTZERO propose actuellement un partage WebRTC en lecture ; cela n'est pas de la coédition SAL.
5. Expériences causales liées à des contacts : opt-in explicite, vérification des destinataires, accusés de réception réels, règles pour les urgences. Aucune notification automatique à ce stade.

## Limites techniques / sécurité
- Le système ne déduit jamais des mots ou émotions réelles d'une couleur, d'une trajectoire ou d'une image. L'utilisateur choisit son message.
- La synthèse vocale dépend du navigateur et du système. Une voix naturelle haute qualité n'est pas garantie.
- L'application n'est pas un outil médical, un système d'appel d'urgence ou un moyen unique de communication vitale.
- Le sous-échantillonnage des photos peut omettre des couleurs ou régions. L'algorithme devra être réglable.
- Le chemin accepte de nombreux jalons, mais borne sa liste de cases à 8192 événements pour maîtriser les ressources ; ∞ désigne la boucle répétée, pas une mémoire infinie.
- Les contrôles et cibles devront être testés selon WCAG 2.2 et avec des utilisateurs de CAA. Le balayage est un prototype, non une validation avec un matériel particulier.
- Les couleurs DMC sont approximées à l'écran et leurs données conservent leur attribution CC BY 4.0 dans POINTZERO.
