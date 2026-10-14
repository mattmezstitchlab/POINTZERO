import { ArrowDownToLine, FolderOpen, Layers, Maximize, Redo2, Settings2, Share2, Type, Undo2 } from "lucide-react";
import type { Pattern } from "../lib/pattern";
import type { ViewMode } from "./Canvas";

interface Props {
  pattern: Pattern;
  onCreate: () => void;
  onLibrary: () => void;
  onExport: () => void;
  onSettings: () => void;
  onShare: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  symbols: boolean;
  onSymbols: () => void;
  view: ViewMode;
  onView: (value: ViewMode) => void;
  onFit: () => void;
  saving: string;
}
const views: ViewMode[] = ["real", "flat", "pattern"];
export default function TopBar(p: Props) {
  const cycle = () => p.onView(views[(views.indexOf(p.view) + 1) % views.length]);
  return <header className="pointer-events-none fixed left-3 right-3 top-3 z-30 flex items-center justify-between gap-2" aria-label="En-tête de l'atelier">
    <button type="button" onClick={p.onCreate} className="pointer-events-auto flex min-h-10 items-center gap-2 rounded-md border border-black/10 bg-white/95 px-3 text-sm font-bold tracking-tight text-[#222] shadow-sm" aria-label="POINTZERO : créer un motif">
      <span className="text-lg font-black text-[#e44f47]">×</span> POINTZERO
    </button>
    <div className="pointer-events-auto flex min-w-0 items-center gap-0.5 rounded-lg border border-black/10 bg-white/95 p-1 text-[#303035] shadow-sm">
      <button type="button" className="btn-icon !text-[#303035]" title="Annuler" aria-label="Annuler" disabled={!p.canUndo} onClick={p.onUndo}><Undo2 size={17}/></button>
      <button type="button" className="btn-icon !text-[#303035]" title="Rétablir" aria-label="Rétablir" disabled={!p.canRedo} onClick={p.onRedo}><Redo2 size={17}/></button>
      <button type="button" className="btn-icon !text-[#303035]" title="Mode d'affichage" aria-label="Changer l'affichage de la grille" onClick={cycle}><Layers size={17}/></button>
      <button type="button" className="btn-icon !text-[#303035] hidden sm:inline-grid" title="Symboles" aria-label="Afficher les symboles" aria-pressed={p.symbols} onClick={p.onSymbols}><Type size={17}/></button>
      <button type="button" className="btn-icon !text-[#303035] hidden sm:inline-grid" title="Centrer la grille" aria-label="Centrer la grille" onClick={p.onFit}><Maximize size={17}/></button>
      <span className="mx-1 h-5 w-px bg-black/10" />
      <button type="button" className="btn-icon !text-[#303035]" title="Bibliothèque" aria-label="Bibliothèque" onClick={p.onLibrary}><FolderOpen size={17}/></button>
      <button type="button" className="btn-icon !text-[#303035]" title="Exporter" aria-label="Exporter et partager" onClick={p.onExport}><ArrowDownToLine size={17}/></button>
      <button type="button" className="btn-icon !text-[#303035] hidden sm:inline-grid" title="Lecture partagée" aria-label="Lecture partagée" onClick={p.onShare}><Share2 size={17}/></button>
      <button type="button" className="btn-icon !text-[#303035]" title="Réglages et aide" aria-label="Réglages et aide" onClick={p.onSettings}><Settings2 size={17}/></button>
    </div>
    <span className="sr-only" role="status">{p.pattern.name} · {p.saving}</span>
  </header>;
}
