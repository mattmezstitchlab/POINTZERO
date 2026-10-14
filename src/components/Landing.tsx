import { useEffect, useMemo, useState } from "react";
import ToileInfinie, { miniDesign, type MotifGrille, type PoseMotif } from "./ToileInfinie";
import HeroPlayground from "./HeroPlayground";
import { genererMotif, promptAmbiance } from "../lib/generation";
import { appliquerZones, couleursZone, type RectZone, type ReglageZone } from "../lib/requant";
import { createPattern, ensurePalette, type Pattern } from "../lib/pattern";
import type { Provenance } from "../lib/pattern";

interface Props {
  onOpen: () => void;
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
export default function Landing({ onOpen, onMotif }: Props) {
  const [promptText, setPromptText] = useState("");
  const [source, setSource] = useState<MotifGrille | null>(null);
  const [reglages, setReglages] = useState<ReglageZone[]>([]);
  const [poses, setPoses] = useState<PoseMotif[]>([]);
  const [pointZero, setPointZero] = useState(false);

  /* Le motif affiché = le source, réglages de zone appliqués. */
  const motif = useMemo<MotifGrille | null>(() => {
    if (!source) return null;
    if (!reglages.length) return source;
    return { ...source, cross: appliquerZones(source.cross, source.w, source.h, reglages) };
  }, [source, reglages]);

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
    const p = createPattern(motif.nom.slice(0, 60) || "Motif de la toile", motif.w, motif.h, 14, 2);
    p.cross = Int16Array.from(motif.cross);
    for (const v of motif.palette) ensurePalette(p, v);
    const prov: Provenance = {
      kind: "demo",
      source: "Motif brodé sur la toile, exporté depuis le hero",
      author: "",
      license: "Démo hors ligne : génération locale ou service tiers selon le réseau",
      personalOnly: false,
    };
    p.provenance = prov;
    p.notes = `Exporté depuis la toile : « ${motif.nom} », ${motif.w} × ${motif.h} cases, ${motif.palette.length} fils DMC.`;
    onMotif(p);
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
    <ToileInfinie
      onOpen={onOpen}
      onMotif={onMotif}
      motif={motif}
      motifsPoses={poses}
      reglages={reglages}
      onReglage={onReglage}
      nbCouleursSource={nbCouleursSource}
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
    </ToileInfinie>
  );
}
