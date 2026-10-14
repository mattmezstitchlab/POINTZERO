import { Flower2, Music2, Palette, PencilRuler, Scissors } from "lucide-react";
export type AtelierCategory = "create" | "compose" | "threads" | "stitch" | "music";
const categories = [
  { id: "create", label: "Créer", Icon: Flower2 },
  { id: "compose", label: "Composer", Icon: PencilRuler },
  { id: "threads", label: "Fils & toile", Icon: Palette },
  { id: "stitch", label: "Broder", Icon: Scissors },
  { id: "music", label: "Musique & parole", Icon: Music2 },
] as const;
export default function CategoryBar({ active, onChoose }: { active: AtelierCategory; onChoose: (category: AtelierCategory) => void }) {
  return <nav className="pointer-events-auto fixed left-1/2 top-[66px] z-30 flex w-max max-w-[calc(100vw-18px)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-lg border border-black/15 bg-white/95 p-1 text-[#333] shadow-[0_3px_24px_#0002] backdrop-blur-xl" aria-label="Catégories de l'atelier">
    {categories.map(({ id, label, Icon }) => <button key={id} type="button" aria-pressed={active === id} onClick={() => onChoose(id)}
      className={`flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors sm:px-4 ${active === id ? "bg-[#222] text-white" : "hover:bg-black/5"}`}>
      <Icon size={15} aria-hidden="true" /><span>{label}</span>
    </button>)}
  </nav>;
}
