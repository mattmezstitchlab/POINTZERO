import { useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import PdfPrep from "./PdfPrep";
import { Wand2, FileUp, ArrowRight, RotateCw, Eraser, PackageOpen, MapPin, CircleDot } from "lucide-react";
import { createPattern, ensurePalette, type Pattern } from "../lib/pattern";
import { genererMotif } from "../lib/generation";
import { useAncreToile, type MotifGrille } from "./ToileInfinie";

/**
 * Le hero est un terrain de jeu — et la grille est son seul décor.
 *
 * Plus de scène sombre qui recouvre tout : décrire un motif ou déposer un
 * PDF se fait à même la toile. Le motif décrit se brode case par case sur la
 * grille, derrière le champ (c'est la toile qui le porte, pas un calque) ;
 * le PDF pose sa table magnétique sur la toile, avec ses blocs qu'on
 * déplace vraiment. Ici on ne garde que la mécanique : les phases, le tuyau
 * de génération partagé, et les quelques puces d'état sous le champ.
 *
 * La génération demande un réseau : c'est écrit sous le champ, parce que le
 * reste de l'atelier, lui, fonctionne hors ligne.
 */

type Phase =
  | { kind: "repos" }
  | { kind: "image" }
  | { kind: "grille" }
  | { kind: "motif"; p: Pattern; source: "description" | "pdf"; file?: File }
  | { kind: "pdf"; file: File }
  | { kind: "erreur"; msg: string };

export default function HeroPlayground({
  onMotif,
  onGrille,
  etatZone,
  onExporter,
  onPoser,
  onPointZero,
  prompt,
  setPrompt,
}: {
  onMotif: (p: Pattern) => void;
  /** Pose (ou retire, avec null) le motif sur la grille de la toile. */
  onGrille: (m: MotifGrille | null) => void;
  /** occupee : un motif est brodé derrière le champ ; libre : grille nue,
      point zéro possible ; prete : point zéro fait, on peut générer. */
  etatZone: "occupee" | "libre" | "prete";
  onExporter: () => void;
  onPoser: () => void;
  onPointZero: () => void;
  prompt: string;
  setPrompt: (v: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "repos" });
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000000));
  const { table, k, motifPret } = useAncreToile();

  const generate = async (graine: number) => {
    const text = prompt.trim();
    if (!text) return;
    if (etatZone !== "prete") return; // la grille du hero doit être nue
    setPhase({ kind: "image" });
    try {
      setPhase({ kind: "grille" });
      const { cross, palette } = await genererMotif(text, graine);
      const p = createPattern(text.slice(0, 60) || "Motif généré", 44, 44, 14, 2);
      p.cross = cross;
      for (const v of palette) ensurePalette(p, v);
      p.provenance = {
        kind: "image",
        source: "Image générée (Pollinations / Flux), conversion dithering",
        author: "",
        license: "Création assistée par IA : vérifiez l'originalité avant toute diffusion",
        personalOnly: false,
      };
      p.notes = `Description : « ${text} ». 44 × 44, ${palette.length} fils, généré depuis la toile.`;
      onGrille({ cross, palette, w: 44, h: 44, nom: text });
      setPhase({ kind: "motif", p, source: "description" });
    } catch {
      setPhase({
        kind: "erreur",
        msg: "Le service d'images n'a pas répondu. La génération demande un réseau — tout le reste de l'atelier fonctionne hors ligne, et l'import de vos propres images aussi.",
      });
    }
  };

  const onPdf = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setPhase({ kind: "pdf", file: f });
  };

  return (
    <div id="hero-jeu" className="relative mt-6 scroll-m-24">
      <form
        className="hero-form mx-auto flex w-full max-w-[680px] flex-col gap-3 rounded-[22px] p-3 sm:flex-row sm:items-center"
        onSubmit={(e) => {
          e.preventDefault();
          void generate(seed);
        }}
      >
        <input
          className="field min-h-12 flex-1 rounded-full px-5 text-[15px]"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Décrivez un motif : « renard endormi dans les fougères »…"
          aria-label="Décrire un motif à générer"
        />
        <button
          type="submit"
          className="btn-primary min-h-12 shrink-0 px-5"
          disabled={etatZone !== "prete" || !prompt.trim() || phase.kind === "image" || phase.kind === "grille"}
        >
          <Wand2 size={16} /> Voir le motif
        </button>
        <label className="btn-quiet min-h-12 shrink-0 cursor-pointer px-5">
          <FileUp size={16} /> Un PDF
          <input type="file" accept="application/pdf" className="sr-only" onChange={onPdf} />
        </label>
      </form>

      {etatZone === "occupee" && (
        <div className="hero-chips mt-4 flex flex-wrap items-center justify-center gap-3">
          <p className="hero-etat text-[13px] text-black/70">
            La grille du hero est déjà brodée : libérez-la, puis faites le point zéro.
          </p>
          <button type="button" className="btn-quiet min-h-11 px-4" onClick={onExporter}>
            <PackageOpen size={15} /> Exporter à l'atelier
          </button>
          <button type="button" className="btn-quiet min-h-11 px-4" onClick={onPoser}>
            <MapPin size={15} /> Poser ailleurs sur la toile
          </button>
        </div>
      )}

      {etatZone === "libre" && (
        <div className="hero-chips mt-4 flex flex-wrap items-center justify-center gap-3">
          <button type="button" className="btn-primary min-h-11 px-5 hero-hop" onClick={onPointZero}>
            <CircleDot size={16} /> Faire le point zéro
          </button>
          <p className="hero-etat text-[13px] text-black/70">une grille nue, dans le format paysage du hero</p>
        </div>
      )}

      {(phase.kind === "image" || phase.kind === "grille") && (
        <div className="mt-4 flex flex-col items-center gap-3" role="status">
          <div className="grid grid-cols-8 gap-1" aria-hidden="true">
            {Array.from({ length: 64 }, (_, i) => (
              <span key={i} className="hero-load h-3 w-3 rounded-[2px]" style={{ animationDelay: `${i * 22}ms` }} />
            ))}
          </div>
          <p className="hero-etat text-[13px] text-black/60">
            {phase.kind === "image" ? "L'image se dessine chez le service tiers…" : "Conversion en grille DMC, case par case…"}
          </p>
        </div>
      )}

      {phase.kind === "erreur" && (
        <div className="mx-auto mt-4 max-w-[560px] rounded-[16px] border border-warn/40 bg-warn/10 p-4 text-center backdrop-blur-md">
          <p className="text-[13.5px] leading-relaxed text-black/80">{phase.msg}</p>
          <button type="button" className="btn-quiet mt-3" onClick={() => void generate(seed)}>
            <RotateCw size={15} /> Réessayer
          </button>
        </div>
      )}

      {phase.kind === "motif" && (
        <div className={`hero-chips mt-4 flex flex-wrap items-center justify-center gap-3 transition-all duration-500 ${motifPret ? "hero-hop opacity-100" : "pointer-events-none opacity-0"}`}>
          <p className="hero-etat text-[13px] text-black/60" role="status">
            {phase.p.w} × {phase.p.h} cases · {phase.p.palette.length} fils DMC · prêt à broder
          </p>
          <button type="button" className="btn-primary min-h-11 px-5" onClick={() => onMotif(phase.p)}>
            Continuer dans l'atelier <ArrowRight size={16} />
          </button>
          {phase.source === "description" ? (
            <button
              type="button"
              className="btn-quiet min-h-11 px-4"
              onClick={() => {
                const next = Math.floor(Math.random() * 1000000);
                setSeed(next);
                void generate(next);
              }}
            >
              <RotateCw size={15} /> Une autre vision
            </button>
          ) : (
            <button
              type="button"
              className="btn-quiet min-h-11 px-4"
              disabled={!phase.file}
              onClick={() => phase.file && setPhase({ kind: "pdf", file: phase.file })}
            >
              Revoir le puzzle
            </button>
          )}
          <button
            type="button"
            className="btn-quiet min-h-11 px-4"
            onClick={() => {
              onGrille(null);
              setPhase({ kind: "repos" });
            }}
          >
            <Eraser size={15} /> Effacer la grille
          </button>
        </div>
      )}

      <p className="hero-etat hero-note mx-auto mt-3 block w-fit max-w-[560px] text-center text-[11.5px] leading-relaxed text-black/60">
        La génération appelle un service tiers d'images : elle demande un réseau. Le PDF, lui, se
        reconstitue entièrement chez vous — et tout l'atelier fonctionne hors ligne.
      </p>

      {/* La table magnétique du PDF vit sur la toile, pas dans un calque. */}
      {phase.kind === "pdf" &&
        table &&
        createPortal(
          <PdfPrep
            embedded
            echelleMonde={k}
            file={phase.file}
            onClose={() => setPhase({ kind: "repos" })}
            onImport={(p) => {
              onGrille({ cross: p.cross, palette: p.palette, w: p.w, h: p.h, nom: p.name });
              setPhase({ kind: "motif", p, source: "pdf", file: phase.file });
            }}
          />,
          table,
        )}
    </div>
  );
}
