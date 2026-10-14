import { useEffect, useState } from "react";
import ToileInfinie, { miniDesign, type MotifGrille } from "./ToileInfinie";
import HeroPlayground from "./HeroPlayground";
import { genererMotif, promptAmbiance } from "../lib/generation";
import type { Pattern } from "../lib/pattern";

interface Props {
  onOpen: () => void;
  onMotif: (p: Pattern) => void;
}

/**
 * Il n'y a plus de page d'accueil : il y a une toile, et elle brode.
 *
 * Dès l'arrivée, un motif d'ambiance se brode case par case sur la grille,
 * derrière le champ — choisi au hasard, donc différent à chaque visite. Si
 * le réseau manque, un motif local prend le relais : la toile n'est jamais
 * nue. Décrivez le vôtre et il remplace l'ambiance, à même la grille.
 */
export default function Landing({ onOpen, onMotif }: Props) {
  const [promptText, setPromptText] = useState("");
  const [motifGrille, setMotifGrille] = useState<MotifGrille | null>(null);

  /* Le motif d'ambiance : toujours une génération différente. */
  useEffect(() => {
    let vivant = true;
    const { texte, seed } = promptAmbiance();
    genererMotif(texte, seed)
      .then((m) => {
        if (vivant) setMotifGrille({ ...m, w: 44, h: 44, nom: texte });
      })
      .catch(() => {
        if (!vivant) return;
        const d = miniDesign(seed % 997, 40, 40);
        setMotifGrille({ cross: d.cross, palette: d.palette, w: d.w, h: d.h, nom: texte });
      });
    return () => {
      vivant = false;
    };
  }, []);

  return (
    <ToileInfinie onOpen={onOpen} onMotif={onMotif} motif={motifGrille}>
      <h1
        className="hero-titre relative text-[clamp(34px,4.6vw,64px)] leading-[0.98] font-semibold tracking-[-0.05em] text-black"
        style={{ animation: "hero-in 1s cubic-bezier(0.22,1,0.36,1) both" }}
      >
        De l’image au dernier point.
      </h1>
      <HeroPlayground onMotif={onMotif} onGrille={setMotifGrille} prompt={promptText} setPrompt={setPromptText} />
    </ToileInfinie>
  );
}
