import { useEffect, useRef, useState, type ChangeEvent } from "react";
import PdfPrep from "./PdfPrep";
import { Wand2, FileUp, ArrowRight, RotateCw, X } from "lucide-react";
import { createPattern, ensurePalette, type Pattern } from "../lib/pattern";
import { pollinationsUrl } from "../lib/promptcraft";
import { loadRemoteImage } from "../lib/convert";
import { imageToDmc } from "../lib/dither";
import { FLOSS } from "../lib/dmc";

/**
 * Le hero est un terrain de jeu.
 *
 * Décrire un motif ou déposer un PDF se fait ici, au premier écran : le visuel
 * d'ouverture s'efface, et le résultat arrive en petits pixels qui se chargent
 * rangée par rangée — puis hop, le motif est là, avec ses fils comptés et un
 * bouton pour continuer dans l'atelier. Rien n'est simulé : la description
 * passe par le même tuyau que l'atelier (service tiers d'image, puis
 * conversion DMC tramée), et le PDF ouvre le vrai puzzle de reconstitution.
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

function drawMotif(canvas: HTMLCanvasElement, p: Pattern, cell: number, upToRow: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const last = Math.min(p.h, upToRow);
  for (let y = 0; y < last; y += 1) {
    for (let x = 0; x < p.w; x += 1) {
      const v = p.cross[y * p.w + x];
      if (v < 0) continue;
      ctx.fillStyle = FLOSS_HEX(v);
      ctx.fillRect(x * cell, y * cell, cell - 1, cell - 1);
    }
  }
}

function FLOSS_HEX(idx: number): string {
  return FLOSS[idx]?.hex ?? "#3a3a3e";
}

export default function HeroPlayground({
  onMotif,
  prompt,
  setPrompt,
}: {
  onMotif: (p: Pattern) => void;
  prompt: string;
  setPrompt: (v: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "repos" });
  const [revealed, setRevealed] = useState(false);
  const [seed, setSeed] = useState(20261013);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const actif = phase.kind !== "repos";

  const generate = async (graine: number) => {
    const text = prompt.trim();
    if (!text) return;
    setPhase({ kind: "image" });
    try {
      const img = await loadRemoteImage(pollinationsUrl(text, 512, 512, graine));
      setPhase({ kind: "grille" });
      const { cross, palette } = imageToDmc(img, 44, 44, { mode: "dither", maxColors: 18, dropWhite: false });
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
      p.notes = `Description : « ${text} ». 44 × 44, ${palette.length} fils, généré depuis la page d'accueil.`;
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

  /* Le motif se charge en petits pixels, rangée par rangée : c'est le load
     lui-même qui montre ce qu'est un patron — une grille qui se remplit. */
  useEffect(() => {
    if (phase.kind !== "motif") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const p = phase.p;
    const cell = 6;
    canvas.width = p.w * cell;
    canvas.height = p.h * cell;
    setRevealed(false);
    let row = 0;
    let raf = 0;
    const step = Math.max(1, Math.round(p.h / 26));
    const tick = () => {
      row = Math.min(p.h, row + step);
      drawMotif(canvas, p, cell, row);
      if (row < p.h) raf = requestAnimationFrame(tick);
      else setRevealed(true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  if (!actif) {
    return (
      <div id="hero-jeu" className="mt-9 scroll-m-24">
        <form
          className="glass-strong mx-auto flex w-full max-w-[680px] flex-col gap-3 rounded-[22px] p-3 sm:flex-row sm:items-center"
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
          <button type="submit" className="btn-primary min-h-12 shrink-0 px-5" disabled={!prompt.trim()}>
            <Wand2 size={16} /> Voir le motif
          </button>
          <label className="btn-quiet min-h-12 shrink-0 cursor-pointer px-5">
            <FileUp size={16} /> Un PDF
            <input type="file" accept="application/pdf" className="sr-only" onChange={onPdf} />
          </label>
        </form>
        <p className="mt-3 text-center text-[11.5px] leading-relaxed text-label-3">
          La génération appelle un service tiers d'images : elle demande un réseau. Le PDF, lui, se
          reconstitue entièrement chez vous — et tout l'atelier fonctionne hors ligne.
        </p>
      </div>
    );
  }

  return (
    <div className="hero-stage absolute inset-0 z-20 overflow-y-auto bg-[#0b0b0d]/[.97] backdrop-blur-xl">
      <div className="mx-auto flex min-h-full max-w-[980px] flex-col items-center justify-center px-5 py-10">
        <button
          type="button"
          onClick={() => setPhase({ kind: "repos" })}
          className="btn-quiet mb-6 flex items-center gap-2 self-end"
        >
          <X size={15} /> Revenir à l'accueil
        </button>

        {(phase.kind === "image" || phase.kind === "grille") && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="grid grid-cols-8 gap-1" aria-hidden="true">
              {Array.from({ length: 64 }, (_, i) => (
                <span key={i} className="hero-load h-3 w-3 rounded-[2px]" style={{ animationDelay: `${i * 22}ms` }} />
              ))}
            </div>
            <p className="text-[15px] text-label-2" role="status">
              {phase.kind === "image" ? "L'image se dessine chez le service tiers…" : "Conversion en grille DMC, case par case…"}
            </p>
          </div>
        )}

        {phase.kind === "erreur" && (
          <div className="max-w-[560px] rounded-[20px] border border-warn/25 bg-warn/[0.07] p-6 text-center">
            <p className="text-[15px] leading-relaxed text-label">{phase.msg}</p>
            <button type="button" className="btn-quiet mt-4" onClick={() => void generate(seed)}>
              <RotateCw size={15} /> Réessayer
            </button>
          </div>
        )}

        {phase.kind === "pdf" && (
          <div className="w-full">
            <PdfPrep
              embedded
              file={phase.file}
              onClose={() => setPhase({ kind: "repos" })}
              onImport={(p) => setPhase({ kind: "motif", p, source: "pdf", file: phase.file })}
            />
          </div>
        )}

        {phase.kind === "motif" && (
          <div className="flex flex-col items-center gap-6">
            <div data-loupe="motif" className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
              <canvas ref={canvasRef} className="max-w-[min(78vw,520px)]" aria-label="Aperçu du motif en petits pixels" />
            </div>
            <p className="text-center text-[14px] text-label-2" role="status">
              {phase.p.w} × {phase.p.h} cases · {phase.p.palette.length} fils DMC
              {revealed ? " · la loupe suit votre souris sur le motif" : " · chargement…"}
            </p>
            <div className={`flex flex-wrap justify-center gap-3 transition-all duration-500 ${revealed ? "hero-hop opacity-100" : "pointer-events-none opacity-0"}`}>
              <button type="button" className="btn-primary min-h-12 px-6" onClick={() => onMotif(phase.p)}>
                Continuer dans l'atelier <ArrowRight size={16} />
              </button>
              {phase.source === "description" ? (
                <button
                  type="button"
                  className="btn-quiet min-h-12 px-5"
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
                  className="btn-quiet min-h-12 px-5"
                  disabled={!phase.file}
                  onClick={() => phase.file && setPhase({ kind: "pdf", file: phase.file })}
                >
                  Revoir le puzzle
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
