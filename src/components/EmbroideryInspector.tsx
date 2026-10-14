import { useMemo } from "react";
import { Crosshair, Eraser, Hand, PaintBucket, Pencil, Pipette, Rows3, Scan, Settings2, Maximize, Layers, CheckSquare, FolderOpen } from "lucide-react";
import { FLOSS } from "../lib/dmc";
import { computeStats, type Pattern } from "../lib/pattern";
import type { Tool } from "../lib/stitch";
import type { ViewMode } from "./Canvas";
import CompositionProperties from "./CompositionProperties";
import type { SubjectLayer, SubjectScene } from "../lib/subjectEngine";

interface Props {
  pattern: Pattern;
  tool: Tool;
  onTool: (t: Tool) => void;
  activeColor: number;
  view: ViewMode;
  onView: (view: ViewMode) => void;
  symbols: boolean;
  onSymbols: () => void;
  onFit: () => void;
  onSettings: () => void;
  onBrowse: () => void;
  workspace: "create" | "stitch";
  scene: SubjectScene | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<Pick<SubjectLayer, "x" | "y" | "scale" | "visible" | "tint">>) => void;
  onReorder: (id: string, delta: number) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  readOnly?: boolean;
}
const designTools = [
  { id: "hand", name: "Déplacer", Icon: Hand },
  { id: "cross", name: "Point de croix", Icon: Pencil },
  { id: "erase", name: "Gomme", Icon: Eraser },
  { id: "fill", name: "Remplir", Icon: PaintBucket },
  { id: "pick", name: "Pipette", Icon: Pipette },
  { id: "select", name: "Sélection", Icon: Scan },
] as const;
const stitchTools = [
  { id: "hand", name: "Déplacer", Icon: Hand },
  { id: "mark", name: "Marquer", Icon: CheckSquare },
  { id: "block", name: "Bloc 10 × 10", Icon: Rows3 },
  { id: "pick", name: "Pipette", Icon: Pipette },
] as const;

export default function EmbroideryInspector(props: Props) {
  const stats = useMemo(() => computeStats(props.pattern).totals, [props.pattern]);
  const tools = props.workspace === "stitch" ? stitchTools : designTools;
  return <div className="flex min-h-0 flex-col text-white">
    <header className="flex items-center justify-between border-b border-white/10 px-4 py-4">
      <h2 className="flex items-center gap-2 text-[13px] font-semibold"><Settings2 size={16}/> Réglages</h2>
      <span className="text-[11px] text-white/60">{props.workspace === "stitch" ? "Suivi" : "Création"}</span>
    </header>
    <div className="space-y-5 px-4 py-4">
      <section aria-label="Outils de broderie">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[.08em] text-white/65">Outils</h3>
        <div className="grid grid-cols-3 gap-2">
          {tools.map(({id,name,Icon})=><button type="button" key={id} title={name} aria-label={name} aria-pressed={props.tool===id} disabled={props.readOnly && id!=="hand"}
            onClick={()=>props.onTool(id)} className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[5px] border px-1 text-[10px] transition-colors disabled:opacity-35 ${props.tool===id ? "border-white bg-white text-black" : "border-white/15 bg-white/[.04] text-white/80 hover:bg-white/10"}`}>
            <Icon size={18}/><span className="truncate">{name}</span>
          </button>)}
        </div>
      </section>
      <section aria-label="Affichage de la grille">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[.08em] text-white/65">Affichage</h3>
        <div className="grid grid-cols-3 gap-1 rounded-[5px] bg-[#232326] p-1">
          {([["real","Toile"],["flat","Couleurs"],["pattern","Grille"]] as const).map(([id,name])=>
            <button type="button" key={id} aria-pressed={props.view===id} onClick={()=>props.onView(id)}
              className={`min-h-9 rounded-[4px] px-1 text-[10px] font-medium ${props.view===id?"bg-white text-black":"text-white/75 hover:bg-white/10"}`}>{name}</button>)}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" aria-pressed={props.symbols} onClick={props.onSymbols} className="flex min-h-9 items-center justify-center gap-1 rounded-[5px] border border-white/20 px-2 text-xs text-white/85 hover:bg-white/10"><Layers size={14}/> Symboles</button>
          <button type="button" onClick={props.onFit} className="flex min-h-9 items-center justify-center gap-1 rounded-[5px] border border-white/20 px-2 text-xs text-white/85 hover:bg-white/10"><Maximize size={14}/> Centrer</button>
        </div>
      </section>
      <section aria-label="Informations du patron">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[.08em] text-white/65">Motif</h3>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-[5px] border border-white/10 bg-[#1b1b1e] p-3">
            <span className="block text-white/60">Grille</span><strong className="mt-1 block text-[14px] font-semibold">{props.pattern.w} × {props.pattern.h}</strong>
          </div>
          <div className="rounded-[5px] border border-white/10 bg-[#1b1b1e] p-3">
            <span className="block text-white/60">Fils DMC</span><strong className="mt-1 block text-[14px] font-semibold">{props.pattern.palette.length}</strong>
          </div>
        </div>
        <button type="button" onClick={props.onBrowse} aria-label="Gérer les couleurs DMC" className="mt-3 flex min-h-10 w-full items-center gap-2 rounded-[5px] border border-white/15 px-3 text-left text-xs text-white/85 hover:bg-white/10">
          <span className="size-5 shrink-0 rounded-[4px] border border-white/40" style={{background:FLOSS[props.activeColor]?.hex??"#fff"}}/>
          <span className="min-w-0 flex-1 truncate">DMC {FLOSS[props.activeColor]?.code??"—"}</span><FolderOpen size={14}/>
        </button>
        {props.workspace==="stitch" && <p className="mt-2 text-[11px] text-white/65">Points terminés : {stats.doneCells.toLocaleString("fr-FR")}</p>}
      </section>
    </div>
    <CompositionProperties docked scene={props.scene} selectedId={props.selectedId} onSelect={props.onSelect} onChange={props.onChange}
      onReorder={props.onReorder} onDuplicate={props.onDuplicate} onRemove={props.onRemove} readOnly={props.readOnly}/>
    <div className="border-t border-white/10 p-3">
      <button type="button" onClick={props.onSettings} className="flex min-h-9 w-full items-center justify-center gap-2 rounded-[5px] border border-white/20 text-xs text-white/75 hover:bg-white/10"><Crosshair size={14}/> Tous les réglages</button>
    </div>
  </div>;
}
