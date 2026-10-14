import { useState } from "react";
import { ArrowDownToLine, Ellipsis, FolderOpen, Layers, Maximize, Redo2, Settings2, Share2, Type, Undo2 } from "lucide-react";
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
const iconButton = "grid size-10 shrink-0 place-items-center rounded-[5px] text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-25";
export default function TopBar(p: Props) {
  const [more, setMore] = useState(false);
  const cycle = () => p.onView(views[(views.indexOf(p.view) + 1) % views.length]);
  return <header className="pointer-events-none fixed left-3 right-3 top-3 z-30 flex items-center justify-between gap-2" aria-label="En-tête de l'atelier">
    <button type="button" onClick={p.onCreate}
      className="pointer-events-auto flex h-11 shrink-0 items-center gap-2 rounded-md border border-white/15 bg-[#09090b]/95 px-3 text-[13px] font-bold tracking-[-.01em] text-white shadow-lg"
      aria-label="POINTZERO : créer un motif">
      <span className="text-xl font-light text-white">×</span><span className="hidden min-[360px]:inline">POINTZERO</span>
    </button>
    <div className="pointer-events-auto relative flex min-w-0 items-center gap-0.5 rounded-md border border-white/15 bg-[#09090b]/95 p-0.5 text-white shadow-lg backdrop-blur-xl">
      <button type="button" className={iconButton} aria-label="Annuler" title="Annuler" disabled={!p.canUndo} onClick={p.onUndo}><Undo2 size={17}/></button>
      <button type="button" className={iconButton+" hidden sm:grid"} aria-label="Rétablir" title="Rétablir" disabled={!p.canRedo} onClick={p.onRedo}><Redo2 size={17}/></button>
      <button type="button" className={iconButton} aria-label="Bibliothèque" title="Bibliothèque" onClick={p.onLibrary}><FolderOpen size={17}/></button>
      <button type="button" className={iconButton} aria-label="Exporter et partager" title="Exporter" onClick={p.onExport}><ArrowDownToLine size={17}/></button>
      <button type="button" className={iconButton} aria-label="Réglages et aide" title="Réglages" onClick={p.onSettings}><Settings2 size={17}/></button>
      <button type="button" className={iconButton} aria-label="Plus d'options" aria-expanded={more} onClick={() => setMore(v => !v)}><Ellipsis size={19}/></button>
      {more && <div className="absolute right-0 top-[calc(100%+8px)] grid w-[205px] gap-1 rounded-md border border-white/15 bg-[#09090b] p-2 text-sm text-white shadow-xl" aria-label="Options d'affichage">
        <button className="flex min-h-10 items-center gap-2 rounded-sm px-2 text-left hover:bg-white/10" onClick={() => { cycle(); setMore(false); }}><Layers size={16}/> Affichage · {p.view}</button>
        <button className="flex min-h-10 items-center gap-2 rounded-sm px-2 text-left hover:bg-white/10" onClick={() => { p.onSymbols(); setMore(false); }} aria-pressed={p.symbols}><Type size={16}/> Symboles</button>
        <button className="flex min-h-10 items-center gap-2 rounded-sm px-2 text-left hover:bg-white/10" onClick={() => { p.onFit(); setMore(false); }}><Maximize size={16}/> Recentrer</button>
        <button className="flex min-h-10 items-center gap-2 rounded-sm px-2 text-left hover:bg-white/10" onClick={() => { p.onShare(); setMore(false); }}><Share2 size={16}/> Partager</button>
      </div>}
    </div>
    <span className="sr-only" role="status">{p.pattern.name} · {p.saving}</span>
  </header>;
}
