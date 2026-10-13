# Point Zéro B — analyse et feuille de route

Audit de code réalisé le 13 octobre 2026 sur `7d2982b` (branche `arena/b8d87879-pointzero`).
Tout ce qui est affirmé ici a été vérifié dans le source ; les numéros de ligne sont indiqués.

État mécanique du dépôt :

| Contrôle | Résultat |
| --- | --- |
| `npm install` | 126 paquets, aucun avertissement |
| `npx tsc --noEmit` | 0 erreur (TS `strict` + `noUnusedLocals` + `noUnusedParameters`) |
| `npm run build` | OK, 2 212 modules, 7,8 s |
| Bundle | `dist/index.html` seul, 3 416 ko (1 090 ko gzip) + `conversion.worker.js` 40 ko |
| `npm run dev` | OK, landing HTTP 200 |
| Tests automatisés | Aucun (pas de vitest, pas de `.github/`) |
| README / LICENSE | Absents |

Taille : 9 066 lignes en `src/` (18 composants, 24 modules `lib/`), 664 lignes de CSS.

---

## 1. Ce que c'est

Un **atelier de point de croix complet, 100 % client**, en React 19 + Vite 7 + Tailwind 4,
compilé en un unique fichier HTML autonome (PWA : `sw.js`, manifeste, wake lock).
Cible explicite : **iPad + Apple Pencil**, avec repli clavier/souris.

Le positionnement est le vrai différenciateur. Ce n'est pas un convertisseur photo → grille
de plus : c'est **un seul projet qui traverse deux gestes**, protégés l'un de l'autre.

- **Créer** : dessiner le patron (points, fractions, formes, sélection, calques, alphabet compté).
- **Broder** : suivre l'exécution sans pouvoir abîmer le dessin.
  `App.tsx:33` verrouille l'ensemble : `STITCH_TOOLS` ne contient que
  `hand, pick, mark, details, block, row, park, unpick, note`. Toute autre tentative renvoie
  « Passez en mode Créer pour modifier le dessin ». En lecture partagée, seul `hand` reste.

### Le modèle de données est au niveau d'un logiciel métier

`Pattern` (`lib/pattern.ts:70`) ne stocke pas une matrice de couleurs. Il stocke :

- sur les **cases** : `cross`, `fwd` / `bwd` (les deux demi-points « / » et « \ »),
  `q[0..3]` (les quatre quarts NW/NE/SE/SW → un demi + un quart = un vrai trois-quarts),
  `done` (avancement) ;
- sur les **trous** (0..w × 0..h, pas 0..w-1) : `back`, `long`, `knots`,
  `special` (`petite` | `bead`) ;
- le suivi : `mistakes` (à défaire), `parked` (fils garés **par coin de case**),
  `ornamentDone` (avancement **séparé** des contours et ornements), `annotations`, `sessions` ;
- la structure : `layers` + `activeLayer`, `symbolMap`, `supplies` (écheveaux entiers,
  mètres partiels, lot de teinture), `provenance`, `fabric`, `waste`, `backStrands`.

Tableaux typés + indices de palette : compact, et `toObject`/`fromObject` sérialisent en
tableaux plats. C'est le niveau de détail d'un Pattern Keeper, pas d'un jouet.

### Les dix points vraiment forts

1. **Colorimétrie sérieuse.** `srgbToLab` correct (gamma sRGB, blanc D65),
   `deltaE2000` écrit à la main, et **validé sur la paire de référence Sharma 2005**
   (`checks.ts` : `|ΔE(50;2,6772;−79,7751 / 50;0;−82,7485) − 2,0425| < 1e-4`).
   489 DMC « cross-checked » chargées depuis `craft-color-codes`.

2. **Auto-vérification honnête.** `runChecks()` tourne à l'ouverture de l'atelier
   (`App.tsx`) et est relançable depuis Réglages. Douze assertions métier : unicité de la
   palette, CIEDE2000, 504 symboles structurellement distincts, Aida 14 → 70 pts = 12,7 cm,
   lin 28 sur 2 = Aida 14, écheveau 8 m × 6 brins = 48 m simples, bloc 10 × 10 borné,
   parking et « à défaire » **qui ne modifient pas le patron**, suivi séparé contours/perles,
   conservation JSON par code DMC, sélection + rotation, aller-retour OXS.
   L'UI n'affiche jamais « réussi » avant exécution. C'est rare et c'est la bonne culture.

3. **`docs/AUDIT-B.md` a une section « Limites non dissimulées ».** Le dépôt documente
   ce qu'il ne fait pas. C'est le meilleur signal de qualité du repo.

4. **Persistance par codes, pas par indices.** `toObject` écrit
   `flossCodes: FLOSS.map(f => f.code)` ; `fromObject` **refuse** un fichier sans cette table
   au lieu de remapper silencieusement, et sauvegarde l'ancien JSON dans
   `point-zero:legacy-backup`. Décision juste : `registerBlend` pousse dans `FLOSS` à la
   volée (`mix:321/1+Blanc/2`), donc les indices sont instables entre deux sessions.

5. **504 symboles vectoriels générés.** 24 primitives déclaratives en espace unitaire
   [-1,1]² × 20 masques de 5 marqueurs périphériques (`lib/symbols.ts`).
   Une définition, plusieurs rendus (`drawSymbol` canvas, `drawSymbolPdf` jsPDF,
   `SymbolIcon` SVG React). Attribution persistante via `symbolMap` + échange
   anti-collision dans `FlossRail`.

6. **Import PDF à trois étages** — le morceau le plus ambitieux :
   - *vectoriel* : `pdf.js` `rawText` → découpe des runs multi-glyphes en glyphes
     individuels par interpolation d'avance (`splitRuns`), axes validés par variation
     strictement linéaire (`linearAxis`), pas de case déduit des graduations
     (`pitchFromAxis`), légende appariée par votes symbole → code ;
   - *raster de secours* : détection des réseaux de lignes (`detectBlocks`),
     **homographie projective** résolue par pivot de Gauss sur 4 coins calibrés
     (`chartRecognition.ts`), signature 12 × 12 par case, registre de symboles par
     distance de Hamming ≤ 22 / 144, `rectifyBlock` ;
   - *manuel* : mode « puzzle » à tableau magnétique, drag & drop, aimantage 2 × 2 mm,
     positions persistées avec le patron (`PdfPrep.tsx`, 977 lignes).

7. **Génération par prompt, avec l'insight juste.** On demande une **illustration lisse**
   (« photorealistic painterly, rich smooth color gradients ») et on interdit explicitement
   « no cross-stitch texture, no grid » — c'est le Floyd–Steinberg local qui produit le rendu
   point de croix. Plus un parseur de composition FR/EN (« un papillon sur un éléphant » →
   sujet principal / secondaire / relation renforcés), une graine pour varier,
   et `loadRemoteImage` en CORS anonyme avec délai de 120 s.

8. **Export OXS** au cœur portable (`fullstitches`, `backstitches`, `partstitches`) plus une
   extension `<pointzero_extra>` pour les quarts, perles et noeuds. La bonne décision
   d'interopérabilité : ce qui est standard reste standard, ce qui ne l'est pas est isolé
   et son échec de parsing n'abîme pas le cœur.

9. **WebRTC en lecture seule à auteur unique.** Échange SDP copié/collé manuellement,
   data channel chiffré, l'hôte est le seul écrivain. Le refus de promettre une fusion
   automatique non implémentée est documenté — c'est le choix honnête.

10. **L'atelier vidéo intégré.** MediaRecorder + `getDisplayMedia` + voix système ou fichier
    audio importé (durées **décodées** via `OfflineAudioContext` pour ne pas tronquer),
    sous-titres VTT générés depuis un script de 7 chapitres qui **pilote réellement l'UI**
    (`pointzero:canvas`, `pointzero:floss`, `pointzero:export-preview`) sur une **copie**
    de démonstration. Le produit se documente lui-même, sans fichier vidéo fictif.

Accessibilité réelle, pas décorative : annonce de case en `aria-live`, piège à focus des
panneaux avec restauration de l'élément précédent, stylet seul (`pencilOnly`),
mouvement réduit, grand texte, haut contraste, cibles ≥ 44 px.

---

## 2. Ce qui est cassé — 5 bugs vérifiés

Les deux premiers touchent **le patron imprimé**, c'est-à-dire le cœur de la valeur.

### 🔴 B1. Le PDF s'imprime avec les mauvais symboles

`lib/pdf.ts:243` construit `symIndex` depuis la position dans la palette :

```ts
p.palette.forEach((idx, pos) => symIndex.set(idx, pos));
```

et la légende fait pareil (`lib/pdf.ts:190` : `const sym = p.palette.indexOf(r.idx)`).

Mais **tout le reste de l'app** passe par `assignedSymbol(p, idx)`, qui lit `p.symbolMap` :
`Canvas.tsx:289`, `:477`, `:482`, `FlossRail.tsx:28`, `:154`, `PaletteSheet.tsx:34`, `:86`,
`oxs.ts:19`, `pattern.ts:272`.

→ Dès qu'une utilisatrice change un symbole dans la fiche fil (FlossRail a une UI dédiée,
avec échange anti-collision), **la grille imprimée et sa légende affichent un autre symbole
que l'écran et que le fichier OXS**. Sur un patron de 40 pages, c'est inutilisable.

Correctif minuscule : `computeStats` renvoie déjà la bonne valeur —
`pattern.ts:272` met `pos: assignedSymbol(p, idx)` dans chaque `ColorStat`.
Utiliser `r.pos` dans la légende, et construire `symIndex` avec
`p.palette.forEach(idx => symIndex.set(idx, assignedSymbol(p, idx)))`.

### 🔴 B2. Le PDF ignore les calques

`lib/pdf.ts:51` : `const p = input;` — aucun appel à `compositePattern`.
Or Canvas (`:191`), OXS (`oxs.ts:8`), l'export PNG (`ExportStudio.tsx:26`) et
`resizePattern` (`editing.ts:101`) composent tous.

→ Dès qu'un projet a des calques, le PDF exporte **les tableaux bruts du calque actif seul**,
sans fusionner les calques visibles. Export silencieusement faux, sans avertissement.

### 🔴 B3. Double téléchargement du PDF (et téléchargement pendant la démo)

`buildPdf` se termine par `lib/pdf.ts:381` :

```ts
const blob = doc.output("blob");
downloadBlob(blob, `${slugify(p.name)}${opts.bw ? "-nb" : "-couleur"}.pdf`);
return blob;
```

et `ExportStudio.tsx:16` fait `… if (preview) setUrl(…) else downloadBlob(blob, "…-a4-symboles.pdf")`.

→ Un export produit **deux fichiers aux noms différents**.
Pire : le chapitre « export » de la visite guidée (`App.tsx`, `guideChapter`) dispatche
`pointzero:export-preview` → `exportChart(true)` → `buildPdf` → **téléchargement non demandé
en pleine démonstration vidéo**, alors que l'intention est seulement d'afficher l'aperçu.

Correctif : retirer le `downloadBlob` de `buildPdf` (fonction pure qui renvoie le blob)
et laisser l'appelant décider.

### 🟠 B4. Le PDF n'imprime ni noeuds, ni points lancés, ni perles, ni petites croix, ni annotations

Grep sur `lib/pdf.ts` : `knots` n'apparaît **que deux fois** — au comptage de couverture
(`:126`) et dans le calcul d'écheveaux (`:141`). Jamais dans la boucle de dessin des grilles
(`:284-320`). `p.long`, `p.special`, `p.annotations`, `p.parked`, `p.mistakes` :
**zéro occurrence** dans le fichier.

→ La note de bas de page du PDF affirme : « les noeuds français par des cercles ».
C'est faux. Et la couverture annonce `totals.knots` et `totals.longCm` pour des points
qu'aucune page ne montre. Tout l'effort de suivi séparé (`ornamentDone`, `detailsNear`,
`markDetail`) est perdu à l'impression — alors que le tracé des points arrière, lui, existe
(`:352-364`) : il suffit de faire pareil pour `long`, `knots` et `special`.

### 🟠 B5. Grands patrons : clone complet à chaque pointermove

Trois effets cumulés, tous dans le chemin le plus chaud de l'app :

1. `Canvas.tsx:678` (`processSamples`) fait `clonePattern(base)` **à chaque appel**, donc à
   chaque événement pointermove (60–120/s sur iPad). Un 300 × 300 = 7 `Int16Array` +
   1 `Uint8Array` de 90 000 cases ≈ 1,3 Mo par clone → **~150 Mo/s d'allocation**.
   Un 1000 × 1000 (limite haute acceptée par `createPattern`) → ~15 Mo par clone : l'app gèle.
2. `Canvas.tsx:191` appelle `compositePattern(...)` **à chaque frame**. Sans calque c'est un
   early-return gratuit (`pattern.ts:189`) ; **avec** calques c'est un clone + fusion complète
   du motif à 60 fps.
3. Chaque `onLive` dispatche → nouvelle identité de `pattern` → le
   `useMemo([pattern])` de `FlossRail.tsx:26` relance `computeStats`, parcours complet des
   cases, **à chaque pointermove**.

→ C'est exactement le « grands patrons » que l'AUDIT-B liste dans « Tests métier encore
nécessaires ». Pistes : cloner une seule fois dans `beginStroke` et muter le draft pendant le
trait ; mémoïser le composite hors du chemin de dessin ; throttler ou rendre incrémental
`computeStats` pendant un trait (le delta de cases touchées est connu).

### 🟡 Plus petits, mais réels

- **`overlap` n'est exposé nulle part.** `ExportStudio` passe `{ bw, paper }` seulement : le
  chevauchement de 10 cases est permanent et non contrôlable. Et il **grise** les cases de la
  zone (`pdf.ts:290-303`) sans redessiner le contenu du bloc voisin : ce n'est donc pas un vrai
  chevauchement de repères, seulement une bande grise.
- **`buildPdf` est entièrement synchrone.** Un 1000 × 1000 = 625 pages × 1600 cellules ×
  primitives jsPDF. UI figée, sans progression ni annulation ; ExportStudio affiche juste
  « Préparation… ». À découper en tranches avec `await tick()` (le motif existe déjà :
  `pdfAnalysis.ts:73` définit `const tick = () => new Promise(r => setTimeout(r, 0))`).
- **L'aperçu PDF est un `<iframe src={blob:}>`** (`ExportStudio.tsx:28`). iOS/iPadOS Safari
  n'affiche pas les PDF en inline : sur la cible principale, l'aperçu est probablement vide.
  Le lien « ouvrir dans un nouvel onglet » sauve la mise, mais l'aperçu est un argument de vente.
- **9 outils sur 26 ne sont accessibles que par la feuille « Projet »** :
  `threeQuarter, petite, bead, lasso, move, line, rect, ellipse, note` (+ `details`)
  n'apparaissent ni dans le Dock (`Dock.tsx` n'expose que 16 outils) ni dans
  `KEYS` (`App.tsx:34`). `stampText` (l'alphabet compté) n'a aucun raccourci non plus.
- **La symétrie est partielle.** `Canvas.tsx:682` ne l'applique qu'à
  `cross, half, quarter, threeQuarter, petite, bead, erase`. Pas au remplissage, ni aux formes
  (`line/rect/ellipse`), ni au texte, ni aux points arrière / lancés / noeuds. Un motif
  symétrique avec contours doit être repris à la main.
- **`addKnotTo` écrase un noeud d'une autre couleur** posé au même demi-point :
  le filtre porte sur `x`/`y` seulement, pas sur `c` (`stitch.ts`).
- **Un seul projet « courant » en localStorage** (`point-zero:motif:v1`). Le multi-projet vit
  dans IndexedDB ; si IndexedDB est indisponible (navigation privée iOS), tout repose sur cette
  clé unique + l'export manuel. L'avertissement existe, le repli multi-projet non.
- **Aucun test automatisé.** `checks.ts` est un auto-diagnostic runtime, pas une suite :
  il ne tourne pas au build, ne bloque rien, et ne couvre ni `buildPdf`, ni `readVectorChart`,
  ni `analyzePdf`, ni `quantizePixels`. Pas de vitest, pas de `.github/`.
- **Pas de README, pas de LICENSE.** Or les données DMC sont **CC BY 4.0** et la licence
  exige un crédit (« Color data: craft-color-codes by MakeBead »). Le crédit est dans
  `dmc.ts` et l'AUDIT, mais ni à la racine du dépôt ni dans le PDF exporté.
  À régler **avant** toute publication.
- `package.json` s'appelle encore `react-vite-tailwind`, version `0.0.0`.
- **Aucun i18n** : tout est en dur en français, y compris les textes d'erreur — alors que les
  prompts IA générés sont en anglais. Le marché du point de croix est très anglophone
  (Etsy, Pattern Keeper).

---

## 3. Ce qu'on peut ajouter gratuitement avec ce qu'on a déjà

### La trouvaille : `craft-color-codes` est déjà installé et l'app n'utilise qu'un fichier sur 15

`lib/dmc.ts:1` importe **uniquement** `craft-color-codes/data/json/dmc-floss.json` (489 couleurs).
Le paquet contient **15 palettes et 3 689 couleurs**, plus une API JS typée
(`src/index.d.ts`) : `nearest`, `nearestAcross`, `convert`, `search`, `getColor`,
`ciede2000`, `deltaE`, `rgbToLab`. Code MIT, données CC BY 4.0.

**Zéro nouvelle dépendance. Zéro nouveau build.** Tout est déjà dans `node_modules`.

| Palette | Couleurs | Statut | Champ utile |
| --- | ---: | --- | --- |
| Miyuki Delica 11/0 | **1 288** | `measured` | `glass`, `discontinued` |
| DMC Mouliné Spécial | 489 | `cross-checked` | — (déjà utilisé) |
| Pixel art 256 | 256 | `generated` | — |
| Minecraft map | 244 | `official` | `base`, `shade`, `buildable`, `caveat` |
| MARD 291 / 221 / 185 | 291 | `community` | — |
| Artkal S | 199 | `community` | `sku` |
| DMC diamond painting | 154 | `cross-checked` | — |
| Perler Midi | 103 | `community` | `sku` |
| Hama Midi | 92 | `community` | — |
| Minecraft blocks | 53 | `approximate` | `block`, `group`, `survival` |
| Red Heart Super Saver | 44 | `approximate` | — |
| LEGO | 40 | `approximate` | — |
| Nabbi BioBeads | 30 | `community` | — |

### 1. 🔥 Les perles ont enfin une référence fabricant

`docs/AUDIT-B.md` avoue : « Les perles sont dessinées, mais leur reference fabricant doit
etre documentee dans les notes. »

Le paquet contient **Miyuki Delica 11/0 : 1 288 couleurs au statut `measured`**
— mesurées sur le matériel du fabricant lui-même, avec le type de verre
(`opaque`, `transparent`, `alabaster`, `silk`) et un flag `discontinued` (76 références).

L'app a **déjà tout le reste** : l'outil `bead`, le tableau `special[]` avec positions
demi-case, le comptage `beads` dans `computeStats`, le suivi `ornamentDone`, le rendu
canvas et PDF. Il ne manque que la table de références.

→ `convert('dmc', code, 'delica')` donne, pour chaque fil du motif, la perle la plus proche
avec son ΔE. On obtient : une vraie nomenclature de perles dans la fiche fil et dans le PDF,
un rendu qui tient compte du type de verre, et un avertissement sur les perles discontinuées.
**C'est le trou n° 1 du stock, et il est déjà comblé dans `node_modules`.**

### 2. Un sélecteur de marque — la couche couleur est déjà isolée

`lib/dmc.ts` est la seule couche couleur ; tout le reste consomme `FLOSS[idx]` et
`nearestFloss(lab)`. En la remplaçant par un objet `Palette`
(`{ id, colors, status, sources, license }`), on obtient le multi-marque.

Le format projet **n'a pas à changer** : ce sont toujours des indices + une table de codes,
et `toObject` écrit déjà `flossCodes` → la portabilité d'un fichier entre palettes est
acquise par construction. Il suffira d'y ajouter `paletteId`.

Attention à l'honnêteté des statuts, que l'app pratique déjà pour DMC : Delica est `measured`,
DMC `cross-checked`, mais Artkal / Perler / Hama / Nabbi / MARD sont `community`
(échantillonnés par des hobbyistes) et LEGO / Minecraft / Red Heart `approximate`.
À afficher comme tel — c'est exactement l'esprit de la section « Limites non dissimulées ».

### 3. Le même moteur, cinq marchés adjacents

Le rendu, la grille, la quantification, l'export PDF, le mode Broder : **rien à réécrire**.

- **Perles à repasser** (Perler / Hama / Artkal / MARD) : le même produit avec une autre
  palette et une autre marque en couverture. Le `craft` du fichier JSON dit littéralement
  `fuse-beads`. Ajouter la taille de plaque (carré 29 × 29, hexagone) et le gabarit de
  repassage au PDF.
- **Diamond painting** (154 drills DMC-codés, `cross-checked`) : le mode Broder devient
  « poser », avec le stylet, le parking par coin et le suivi par bloc **déjà écrits**.
  Les drills étant codés DMC, la conversion depuis un motif existant est triviale.
- **Minecraft map art** (244 couleurs `official`) : la grille devient une liste de blocs à
  récolter, avec `block` namespacé (`minecraft:white_wool`), `shade` (0/1/2/3 pour le relief),
  `buildable` et `caveat`. Le flag `survival: false` permet de filtrer les minerais
  irréalisables en mode survie. Personne ne fait ça sérieusement en français.
- **LEGO mosaic** (40 couleurs) : même export, liste de pièces.
- **Crochet / tricot** (Red Heart 44) : le calcul de métrage existe déjà, il faut le convertir
  en pelotes. MakeBead a un crochet pattern maker ; la palette est là.

### 4. `nearest(hex, 'dmc', { limit: 3 })` = la substitution de fil intelligente

L'app a déjà `replaceColor(p, from, to)` (`editing.ts`) et un bloc « Remplacer le fil actif »
(`WorkspacePanel.tsx:62`) qui **exige un code DMC exact** — sinon « Code DMC introuvable ».

L'API documente l'échelle : « Under ~1 looks identical, under ~3 is close, over ~10 is a
different color. »

→ « Le DMC 321 est épuisé à la mercerie ? Voici les 3 plus proches : ΔE 1,2 / 2,8 / 4,1. »
C'est **le** cas d'usage réel d'une brodeuse devant son rayon, et tout est déjà en place :
le Lab, le CIEDE2000, la palette, le remplacement global.

### 5. `convert()` et `nearestAcross()` pour les créatrices qui vendent

Un patron vendu en plusieurs gammes doit publier ses équivalences :
« DMC 3801 ≈ Delica DB0361 ≈ Perler P23 ». `convert(from, code, to)` renvoie les
correspondances classées avec leur ΔE. Une page « Équivalences » dans l'export PDF est
un argument commercial direct, et elle ne coûte qu'une boucle.

### 6. Les mélanges de fils existent déjà — il manque l'exploration

`registerBlend('321', 'Blanc', 1, 2)` crée le code `mix:321/1+Blanc/2` avec son RGB pondéré
et son Lab, et `computeStats` lit `f.blend` pour compter les brins réels de chaque composant.
C'est un vrai moteur de fils tweed/ombrés. `WorkspacePanel` expose `mixA`, `mixB`,
`aStrands`, `bStrands` — mais rien pour **explorer** : pas d'aperçu de dégradé, pas de
suggestion, pas de « tweed automatique entre ces deux DMC sur 5 paliers ».

### 7. Les 489 → 500

L'AUDIT documente le trou. `SOURCES.md` du paquet explique la provenance des 489 et les
11 conflits réglés (dont DMC 309, gris-brun en amont, rouge ici). À faire :
un avertissement explicite quand `flossIndex` renvoie `-1` — aujourd'hui c'est silencieux,
`nearestFloss` n'étant appelé en repli que dans `fromOxs`.

### 8. Le moteur permet encore, sans nouvelle technologie

- **Export SVG natif.** `lib/symbols.ts` est déclaratif en espace unitaire et l'AUDIT annonce
  déjà « un seul dessin, trois rendus (canvas, PDF, SVG) ». Il existe `drawSymbol` (canvas),
  `drawSymbolPdf` (jsPDF) et `SymbolIcon` (SVG React, un symbole à la fois) — mais **pas** de
  rendu SVG du patron entier. Un `drawSymbolSvg` + un parcours de grille donne un export SVG
  vectoriel, gratuit et très demandé (découpe, broderie machine, revente).
- **Grille « point zéro » configurable.** Tout est déjà centré sur `w/2`, `h/2` (axes rouges
  canvas `:275-285` et PDF `:345-348`). Permettre de déplacer l'origine, ou de numéroter en
  absolu / relatif.
- **Découpe en tuiles à imprimer.** `PdfPrep` sait déjà **assembler** des blocs en une grille
  (`assembleFromTileLayout`). L'opération inverse — découper un grand patron en tuiles
  numérotées avec repères de collage — est le même calcul, et c'est ce que veulent les
  brodeuses de grands formats.
- **Visualisation des statistiques de session.** `sessionSummary` calcule déjà
  `perMinute`, `longest` (chaîne de jours consécutifs), `activeDays` et une **ETA** datée.
  Rien ne l'affiche sous forme de calendrier de chaleur ou de courbe. Zéro dépendance.
- **Recherche par nom de couleur.** `search('dusty rose')` du paquet cherche dans les noms
  anglais ; `PaletteSheet` a déjà un champ code/nom local. Les deux se combinent.

### 9. Plus ambitieux, mais cohérent avec l'existant

- **PAT / XSD.** L'AUDIT dit explicitement que ce n'est pas revendiqué. XSD est documenté
  publiquement et le socle import/export multi-format existe déjà avec OXS.
- **Relais TURN optionnel** pour le partage WebRTC : le mode auteur unique est un choix
  assumé, mais un relais ferait passer le taux de connexion (l'AUDIT note que certains
  réseaux bloquent).
- **Reconnaissance vocale** pour les sous-titres de l'atelier vidéo (aujourd'hui : script
  fourni, pas d'ASR).
- **Co-édition multi-auteurs (CRDT)** — seulement si le positionnement change.
  L'AUDIT a raison de ne pas le promettre aujourd'hui.
- **Étalonnage écran → carte physique.** L'app répète à juste titre que les couleurs écran
  sont des approximations. Un mode « imprimer une mire de 24 DMC, photographier sa carte
  physique à côté, corriger le profil » transformerait la limite assumée en fonctionnalité.
  C'est le seul moyen honnête de tenir la promesse couleur.

---

## 4. Ordre proposé

**P0 — correctifs, moins d'un jour, touchent le produit imprimé**
- B1 : symboles PDF alignés sur `assignedSymbol` (utiliser `r.pos`).
- B2 : `compositePattern` dans `buildPdf`.
- B3 : retirer `downloadBlob` de `buildPdf`.
- B4 : dessiner `long`, `knots`, `special` (et `annotations`) sur les pages de grille.

**P0 bis — légal, avant toute publication**
- README, LICENSE, et attribution CC BY 4.0 des données couleur (dépôt **et** PDF exporté).
- Renommer le paquet (`react-vite-tailwind` → `point-zero`).

**P1 — crédibilité technique**
- B5 : perf grands patrons. C'est le seul vrai risque sur la cible iPad.
- Porter `checks.ts` en suite vitest / `node --test` + CI GitHub Actions
  (`tsc --noEmit && build && test`). Les 12 assertions existent déjà : il manque le harnais.
  Ajouter des cas pour `buildPdf`, `quantizePixels` et `readVectorChart`.

**P2 — valeur produit immédiate, zéro dépendance**
- Delica pour les perles (le trou avoué de l'AUDIT).
- `nearest(limit: 3)` dans « Remplacer le fil actif ».

**P3 — croissance**
- Sélecteur de palette → perles à repasser, puis diamond painting.
- Exposer les 9 outils manquants dans le Dock + raccourcis clavier.
- Symétrie étendue aux formes, au remplissage et aux points arrière.

**P4 — différenciation**
- Export SVG du patron.
- Découpe en tuiles à imprimer.
- Visualisation des sessions (calendrier, courbe, ETA).
- Statut des palettes affiché honnêtement ; équivalences multi-marques dans le PDF.
- XSD ; étalonnage écran → carte physique.

---

## 5. Sources

- craft-color-codes (15 palettes, 3 689 couleurs, API) : https://github.com/makebead/craft-color-codes
- DMC Mouliné Spécial art. 117 : https://www.dmc.com/US/en/products/mouline-special
- Spécification OXS : https://www.ursasoftware.com/OXSFormat/
- CIEDE2000, paires de référence Sharma 2005 : https://www2.ece.rochester.edu/~gsharma/ciede2000/
- WebRTC data channels : https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels
- Screen Wake Lock : https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
