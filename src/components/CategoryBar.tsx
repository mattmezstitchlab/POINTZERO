import { Flower2, Palette, PencilRuler, Scissors } from "lucide-react";
export type AtelierCategory = "create" | "compose" | "threads" | "stitch";
const categories = [
  { id: "create", label: "Créer", Icon: Flower2 },
  { id: "compose", label: "Dessiner", Icon: PencilRuler },
  { id: "threads", label: "Fils", Icon: Palette },
  { id: "stitch", label: "Broder", Icon: Scissors },
] as const;
export default function CategoryBar({ active, onChoose }: { active: AtelierCategory; onChoose: (category: AtelierCategory) => void }) {
  return <nav aria-label="Catégories de l'atelier" className="pointer-events-auto fixed top-[64px] left-1/2 z-30 flex max-w-[calc(100vw-16px)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-md border border-white/15 bg-[#0b0b0c]/95 p-1 text-white shadow-[0_12px_36px_#0005] backdrop-blur-xl lg:top-[16px]">
    {categories.map(({ id, label, Icon }) => <button key={id} type="button" aria-pressed={active === id} onClick={() => onChoose(id)}
      className={`flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-[5px] px-3 text-xs font-semibold transition-colors sm:px-4 ${active === id ? "bg-white text-black" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
      <Icon size={15} aria-hidden="true" /><span>{label}</span>
    </button>)}
  </nav>;
}
