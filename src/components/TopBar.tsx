import { CheckCircle2, Compass, FileJson, FolderOpen, Layers, Maximize, PencilLine, Redo2, SlidersHorizontal, Sparkles, Type, Undo2 } from "lucide-react";
import type { Pattern } from "../lib/pattern";
import type { ViewMode } from "./Canvas";

interface Props {
  pattern: Pattern;
  onHome: () => void;
  workspace: "create" | "stitch";
  onWorkspace: (mode: "create" | "stitch") => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  symbols: boolean;
  onSymbols: () => void;
  view: ViewMode;
  onView: (v: ViewMode) => void;
  onFit: () => void;
  projectOpen: boolean;
  onProject: () => void;
  onLibrary: () => void;
  /** Importer directement un .pointzero.json depuis la barre supérieure. */
  onImportProject: () => void;
  onCompose: () => void;
  /** Ouvre le guide pas à pas, et le champ de questions. */
  onGuide: () => void;
  guideOpen?: boolean;
  saving: string;
}

const VIEWS: { id: ViewMode; label: string }[] = [
  { id: "real", label: "Toile" },
  { id: "flat", label: "Aplat" },
  { id: "pattern", label: "Patron" },
];

const ON = { color: "#64b5ff", background: "rgba(10,132,255,0.18)" };

/** Barre supérieure : le logo seul à gauche, puis les commandes de l'atelier. */
export default function TopBar(p: Props) {
  const cycle = () => {
    const i = VIEWS.findIndex((v) => v.id === p.view);
    p.onView(VIEWS[(i + 1) % VIEWS.length].id);
  };

  return (
    <header className="pointer-events-none fixed top-3 right-3 left-3 z-30 flex items-center justify-between gap-2 lg:left-4">
      <button
        type="button"
        onClick={p.onHome}
        className="pointer-events-auto grid h-10 w-10 shrink-0 place-items-center transition-transform hover:opacity-80 active:scale-90"
        aria-label="Revenir à la présentation"
        title="Point Zéro"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="#ff453a" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      </button>

      <div
        className="seg pointer-events-auto hidden w-[164px] shrink-0 bg-black/35 p-[3px] md:flex"
        role="group"
        aria-label="Mode de travail"
        data-guide="workspace"
      >
        <button type="button" aria-pressed={p.workspace === "create"} onClick={() => p.onWorkspace("create")}>
          Créer
        </button>
        <button type="button" aria-pressed={p.workspace === "stitch"} onClick={() => p.onWorkspace("stitch")}>
          Broder
        </button>
      </div>

      <div className="glass pointer-events-auto ml-auto flex shrink-0 items-center gap-0.5 rounded-[18px] p-1">
        <button
          type="button"
          className="btn-icon md:hidden"
          onClick={() => p.onWorkspace(p.workspace === "create" ? "stitch" : "create")}
          aria-label={`Mode actuel : ${p.workspace === "create" ? "Créer" : "Broder"}. Toucher pour changer.`}
          title={p.workspace === "create" ? "Passer en mode Broder" : "Passer en mode Créer"}
          style={{ color: p.workspace === "stitch" ? "#30d158" : "#64b5ff" }}
        >
          {p.workspace === "create" ? <PencilLine className="h-[18px] w-[18px]" /> : <CheckCircle2 className="h-[18px] w-[18px]" />}
        </button>
        <button type="button" className="btn-icon" onClick={p.onUndo} disabled={!p.canUndo} aria-label="Annuler (⌘Z)" title="Annuler · ⌘Z">
          <Undo2 className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
        <button type="button" className="btn-icon hidden lg:inline-grid" onClick={p.onRedo} disabled={!p.canRedo} aria-label="Rétablir (⇧⌘Z)" title="Rétablir · ⇧⌘Z">
          <Redo2 className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
        <span className="mx-1 h-5 w-px bg-white/12" aria-hidden="true" />

        <button
          type="button"
          className="btn-icon"
          onClick={cycle}
          aria-label={`Affichage actuel : ${VIEWS.find((v) => v.id === p.view)?.label}. Toucher pour passer au suivant.`}
          title={`Affichage : ${VIEWS.find((v) => v.id === p.view)?.label} · cliquer pour changer`}
          style={ON}
        >
          <Layers className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>

        <button
          type="button"
          className="btn-icon hidden lg:inline-grid"
          aria-pressed={p.symbols}
          aria-label="Afficher les symboles de légende"
          title="Symboles de légende"
          onClick={p.onSymbols}
          disabled={p.view === "pattern"}
          style={p.symbols || p.view === "pattern" ? ON : undefined}
        >
          <Type className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
        <button type="button" className="btn-icon hidden md:inline-grid" onClick={p.onFit} aria-label="Recadrer la grille" title="Recadrer">
          <Maximize className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
        <span className="mx-1 h-5 w-px bg-white/12" aria-hidden="true" />
        <button
          type="button"
          className="btn-icon"
          aria-pressed={p.projectOpen}
          data-guide="project-button"
          aria-label="Projet, réglages et export"
          title="Projet, réglages et export"
          onClick={p.onProject}
          style={p.projectOpen ? ON : undefined}
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
        <button type="button" className="btn-icon" onClick={p.onCompose} aria-label="Composition intelligente" title="Composer le motif : régions, couleurs, détails">
          <Sparkles size={18}/>
        </button>
        <button type="button" className="btn-icon" onClick={p.onImportProject} aria-label="Importer un projet POINTZERO JSON" title="Ouvrir un patron JSON ou OXS">
          <FileJson size={18} />
        </button>
        <button type="button" className="btn-icon" onClick={p.onLibrary} aria-label="Mes projets" title="Mes projets et versions">
          <FolderOpen size={18} />
        </button>
        <button type="button" className="btn-icon hidden sm:inline-grid" onClick={p.onGuide} aria-pressed={!!p.guideOpen} aria-label="Guide de l'atelier" title="Guide pas à pas, et un champ pour poser une question">
          <Compass size={18} />
        </button>
      </div>
      <span className="sr-only" role="status">
        {p.saving}
      </span>
    </header>
  );
}
