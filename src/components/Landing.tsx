import { useState } from "react";
import ToileInfinie from "./ToileInfinie";
import HeroPlayground from "./HeroPlayground";
import HeroTexture from "./HeroTexture";
import type { Pattern } from "../lib/pattern";

interface Props {
  onOpen: () => void;
  onMotif: (p: Pattern) => void;
}

/**
 * Il n'y a plus de page d'accueil : il y a une toile.
 *
 * Le hero est un format paysage posé sur la grille — le titre noir sur le
 * dithering blanc, le champ pour décrire un motif, c'est tout. Autour, en
 * dézoomant, on découvre que tout le site est une grille : des voisines
 * brodent en direct, on regarde, on s'approprie, on rejoint un SAL. On
 * essaie en manipulant, on ne lit pas.
 */
export default function Landing({ onOpen, onMotif }: Props) {
  const [promptText, setPromptText] = useState("");

  return (
    <ToileInfinie onOpen={onOpen} onMotif={onMotif}>
      <HeroTexture />
      <h1
        className="relative text-[clamp(34px,4.6vw,64px)] leading-[0.98] font-semibold tracking-[-0.05em] text-black"
        style={{ animation: "hero-in 1s cubic-bezier(0.22,1,0.36,1) both" }}
      >
        De l’image au dernier point.
      </h1>
      <HeroPlayground onMotif={onMotif} prompt={promptText} setPrompt={setPromptText} />
    </ToileInfinie>
  );
}
