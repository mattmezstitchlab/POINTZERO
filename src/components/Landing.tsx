import { useCallback, useEffect, useMemo, useState } from "react";
import ToileInfinie, { miniDesign, type MotifGrille, type PoseMotif } from "./ToileInfinie";
import HeroPlayground from "./HeroPlayground";
import FlossRail from "./FlossRail";
import PaletteSheet from "./PaletteSheet";
import { genererMotif, promptAmbiance } from "../lib/generation";
import { appliquerZones, couleursZone, type RectZone, type ReglageZone } from "../lib/requant";
import { createPattern, ensurePalette, type Pattern } from "../lib/pattern";
import { appendWaypoint, type Point } from "../lib/slame";
import HomeSlamePanel, { type GrilleMode } from "./HomeSlamePanel";

interface Props {
  onOpen: () => void;
  onSlame?: () => void;
  onMotif: (p: Pattern) => void;
}

/** Les emplacements où poser un motif libéré du hero. */
const SLOTS_POSE = [
  { cx: -66, cy: -6 },
  { cx: -8, cy: -36 },
  { cx: -66, cy: 26 },
  { cx: 40, cy: 44 },
];

/**
 * Il n'y a plus de page d'accueil : il y a une toile, et c'est un laboratoire.
 *
 * En arrivant, un motif d'ambiance se brode derrière le champ — différent à
 * chaque visite. Pour générer le sien, on fait le geste qui donne son nom au
 * site : libérer la grille du hero (exporter le motif à l'atelier, ou le
 * poser ailleurs sur la toile), puis FAIRE LE POINT ZÉRO — une grille nue,
 * dans le format paysage seulement. Entre-temps, la palette d'outils et la
 * palette DMC vivent sur la toile, et l'outil zone serre ou desserre les
 * couleurs d'un rectangle de cases, selon la toile qu'on a chez soi.
 */
export default function Landing({ onOpen, onMotif, onSlame = onOpen }: Props) {
  const [promptText, setPromptText] = useState("");
  const [source, setSource] = useState<MotifGrille | null>(null);
  const [reglages, setReglages] = useState<ReglageZone[]>([]);
  const [poses, setPoses] = useState<PoseMotif[]>([]);
  const [pointZero, setPointZero] = useState(false);
  const [railActif, setRailActif] = useState(-1);
  const [railEdits, setRailEdits] = useState<Pattern | null>(null);
  const [nuancier, setNuancier] = useState(false);
  const [modeGrille, setModeGrille] = useState<GrilleMode>("toile");
  const [musicTrail, setMusicTrail] = useState<Point[]>([]);
  const addMusicPoint = useCallback((point: Point) => {
    setMusicTrail(trail => appendWaypoint(trail, point));
  }, []);

  /* Le motif affiché = le source, réglages de zone appliqués. */
  const motif = useMemo<MotifGrille | null>(() => {
    if (!source) return null;
    if (!reglages.length) return source;
    return { ...source, cross: appliquerZones(source.cross, source.w, source.h, reglages) };
  }, [source, reglages]);

  /* Le motif de la grille, en vrai Pattern : le rail de fils de l'atelier
     (computeStats, symboles, écheveaux) officie ici, pas un rail parallèle. */
  const motifVersPattern = (m: MotifGrille): Pattern => {
    const p = createPattern(m.nom.slice(0, 60) || "Motif de la toile", m.w, m.h, 14, 2);
    p.cross = Int16Array.from(m.cross);
    for (const v of m.palette) ensurePalette(p, v);
    p.provenance = {
      kind: "demo",
      source: "Motif brodé sur la toile",
      author: "",
      license: "Démo hors ligne : génération locale ou service tiers selon le réseau",
      personalOnly: false,
    };
    p.notes = `« ${m.nom} », ${m.w} × ${m.h} cases, brodé sur la toile.`;
    return p;
  };

  const patternRail = useMemo(() => (motif ? (railEdits ?? motifVersPattern(motif)) : null), [motif, railEdits]);
  useEffect(() => setRailEdits(null), [motif]);

  /* Le motif d'ambiance : toujours une génération différente. */
  useEffect(() => {
    let vivant = true;
    const { texte, seed } = promptAmbiance();
    genererMotif(texte, seed)
      .then((m) => {
        if (vivant) setSource({ ...m, w: 44, h: 44, nom: texte });
      })
      .catch(() => {
        if (!vivant) return;
        const d = miniDesign(seed % 997, 40, 40);
        setSource({ cross: d.cross, palette: d.palette, w: d.w, h: d.h, nom: texte });
      });
    return () => {
      vivant = false;
    };
  }, []);

  const etatZone: "occupee" | "libre" | "prete" = source ? "occupee" : pointZero ? "prete" : "libre";

  const exporter = () => {
    if (!motif) return;
    onMotif(motifVersPattern(motif));
  };

  const poserAilleurs = () => {
    if (!motif) return;
    const slot = SLOTS_POSE[poses.length % SLOTS_POSE.length];
    setPoses((ps) => [...ps, { id: `pose-${ps.length}-${Date.now()}`, motif, cx: slot.cx, cy: slot.cy }]);
    setSource(null);
    setReglages([]);
  };

  const fairePointZero = () => {
    setSource(null);
    setReglages([]);
    setPointZero(true);
  };

  const onReglage = (rect: RectZone, n: number) => {
    setReglages((rs) => {
      const autres = rs.filter((r) => !(r.rect.x === rect.x && r.rect.y === rect.y && r.rect.w === rect.w && r.rect.h === rect.h));
      return [...autres, { rect, n: Math.max(2, n) }];
    });
  };

  const nbCouleursSource = (rect: RectZone) => (source ? couleursZone(source.cross, source.w, source.h, rect).length : 0);

  return (
    <>
    <ToileInfinie
      musicMode={modeGrille === "musique"}
      musicTrail={musicTrail}
      onMusicCell={addMusicPoint}
      onOpen={onOpen}
      onMotif={onMotif}
      motif={motif}
      motifsPoses={poses}
      reglages={reglages}
      onReglage={onReglage}
      nbCouleursSource={nbCouleursSource}
    >
      <div
        className={"hero-cadre" + (etatZone === "libre" ? " libre" : "") + (modeGrille !== "toile" ? " pointer-events-none opacity-0" : "")}
        data-tag={
          etatZone === "occupee"
            ? "zone de lecture — le motif se brode autour"
            : etatZone === "libre"
              ? "point zéro : la grille attend ici"
              : "grille nue : décrivez votre motif"
        }
      >
      <h1
        className="hero-titre relative text-[clamp(34px,4.6vw,64px)] leading-[0.98] font-semibold tracking-[-0.05em] text-black"
        style={{ animation: "hero-in 1s cubic-bezier(0.22,1,0.36,1) both" }}
      >
        De l’image au dernier point.
      </h1>
      <HeroPlayground
        onMotif={onMotif}
        onGrille={(m) => {
          setSource(m);
          setMusicTrail([]);
          setReglages([]);
          if (m) setPointZero(false);
        }}
        etatZone={etatZone}
        onExporter={exporter}
        onPoser={poserAilleurs}
        onPointZero={fairePointZero}
        prompt={promptText}
        setPrompt={setPromptText}
      />
      </div>
    </ToileInfinie>
    <nav className="fixed bottom-4 left-1/2 z-[75] flex max-w-[calc(100vw-24px)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-lg border border-black/15 bg-white/95 p-1.5 text-black shadow-[0_7px_35px_#0002] backdrop-blur-xl" aria-label="Outils de la grille">
      <button type="button" onClick={() => setModeGrille("toile")} aria-pressed={modeGrille === "toile"} className={modeGrille === "toile" ? "rounded-md bg-[#1d1d21] px-4 py-2.5 text-sm font-semibold text-white" : "rounded-md px-4 py-2.5 text-sm hover:bg-black/5"}>Créer</button>
      <button type="button" onClick={() => setModeGrille("musique")} aria-pressed={modeGrille === "musique"} className={modeGrille === "musique" ? "rounded-md bg-[#1d1d21] px-4 py-2.5 text-sm font-semibold text-white" : "rounded-md px-4 py-2.5 text-sm hover:bg-black/5"}>♫ Musique</button>
      <button type="button" onClick={() => setModeGrille("parole")} aria-pressed={modeGrille === "parole"} className={modeGrille === "parole" ? "rounded-md bg-[#1d1d21] px-4 py-2.5 text-sm font-semibold text-white" : "rounded-md px-4 py-2.5 text-sm hover:bg-black/5"}>Parole</button>
      <button type="button" onClick={onOpen} className="rounded-md px-4 py-2.5 text-sm hover:bg-black/5">Broder · outils précis ↗</button>
    </nav>
    <HomeSlamePanel
      mode={modeGrille}
      pattern={patternRail}
      trail={musicTrail}
      onPoint={addMusicPoint}
      onTrail={setMusicTrail}
      onMode={setModeGrille}
      onAdvanced={onSlame}
    />
    {patternRail && (
      <>
        <FlossRail
          pattern={patternRail}
          active={railActif}
          onActive={setRailActif}
          onPattern={setRailEdits}
          onBrowse={() => setNuancier(true)}
          stitching={false}
        />
        <PaletteSheet
          open={nuancier}
          onClose={() => setNuancier(false)}
          pattern={patternRail}
          color={railActif}
          onPick={(idx) => {
            const p = patternRail;
            ensurePalette(p, idx);
            setRailEdits({ ...p });
            setNuancier(false);
          }}
        />
      </>
    )}
    </>
  );
}
