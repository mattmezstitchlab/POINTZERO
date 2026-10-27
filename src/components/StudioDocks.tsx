import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowLeft, ChevronDown, Redo2, Search, Undo2 } from "lucide-react";
import type { Tool } from "../lib/stitch";
import type { ViewMode } from "./Canvas";
import { LEVEL_LABELS, type InterfaceLevel } from "../lib/interfaceLevel";

/**
 * Les deux docks du studio (charte UniO du Monde AIME).
 * En haut, blanc : faire. Des mots, pas de pictos ; un outil se déploie en fonctions
 * dans le dock lui-même, le chemin reste affiché dessous.
 * En bas, sombre : se repérer. Mode, affichage, zoom et fil actif.
 */
export type DockPath = null | "creer" | "dessiner" | "dessiner-plus" | "fils" | "broder" | "exporter";

export interface DockActions {
  home: () => void; shop: () => void; library: () => void; settings: () => void; share: () => void;
  newPattern: () => void; importFile: () => void; prompt: () => void; motifs: () => void; compose: () => void;
  exportPanel: () => void; save: () => void; palette: () => void; threadsSettings: () => void; follow: () => void;
  layers: () => void; drawSettings: () => void;
}

interface Props {
  patternName: string;
  saving: string;
  workspace: "create" | "stitch";
  onWorkspace: (mode: "create" | "stitch") => void;
  tool: Tool;
  onTool: (tool: Tool) => void;
  level: InterfaceLevel;
  onLevel: (level: InterfaceLevel) => void;
  view: ViewMode;
  onView: (view: ViewMode) => void;
  symbols: boolean;
  onSymbols: () => void;
  canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void;
  colorHex: string; colorLabel: string;
  path: DockPath; onPath: (path: DockPath) => void;
  inspectorOpen: boolean;
  actions: DockActions;
  zoom: { zoomIn: () => void; zoomOut: () => void; fit: () => void; magnify: () => void };
  readOnly?: boolean;
}

const DRAW: [Tool, string][] = [["hand", "Main"], ["cross", "Croix"], ["erase", "Gomme"], ["fill", "Remplir"], ["pick", "Pipette"], ["select", "Sélection"]];
const DRAW_MORE: [Tool, string][] = [["half", "Demi-point"], ["quarter", "Quart"], ["threeQuarter", "Trois quarts"], ["petite", "Petite croix"], ["bead", "Perle"], ["back", "Point arrière"], ["knot", "Nœud"], ["long", "Point lancé"], ["line", "Ligne"], ["rect", "Rectangle"], ["ellipse", "Ellipse"], ["lasso", "Lasso"], ["move", "Déplacer"]];
const STITCH: [Tool, string][] = [["hand", "Main"], ["mark", "Marquer"], ["block", "Bloc 10 × 10"], ["row", "Ligne"], ["pick", "Pipette"], ["details", "Détails"], ["park", "Parking"], ["unpick", "À défaire"], ["note", "Note"]];
const BEGINNER = new Set<Tool>(["hand", "cross", "erase", "pick", "mark"]);
const VIEWS: [ViewMode, string][] = [["real", "Réaliste"], ["flat", "À plat"], ["pattern", "Patron"]];
const LABELS: Record<Exclude<DockPath, null>, string> = { creer: "Créer", dessiner: "Dessiner", "dessiner-plus": "Plus d’outils", fils: "Fils", broder: "Broder", exporter: "Exporter" };

function Tool_({ children, pressed, onClick, disabled, haspopup, count, id }: { children: ReactNode; pressed?: boolean; onClick: () => void; disabled?: boolean; haspopup?: boolean; count?: number; id?: string }) {
  return <button id={id} type="button" className="pzs-tool" aria-pressed={pressed === undefined ? undefined : pressed} aria-haspopup={haspopup ? "true" : undefined}
    disabled={disabled} onClick={onClick} data-on={pressed ? "1" : undefined}>
    {children}{count !== undefined && <span className="pzs-count" aria-hidden="true">{count}</span>}
  </button>;
}

export default function StudioDocks(p: Props) {
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const upRef = useRef<HTMLButtonElement>(null);
  const wasPath = useRef<DockPath>(p.path);
  useEffect(() => {
    if (p.path && !wasPath.current) upRef.current?.focus();
    wasPath.current = p.path;
  }, [p.path]);
  useEffect(() => { if (menu) menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus(); }, [menu]);

  const parent = (path: DockPath): DockPath => path === "dessiner-plus" ? "dessiner" : null;
  const up = () => p.onPath(parent(p.path));
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    if (menu) { e.preventDefault(); setMenu(false); document.getElementById("pzs-brand")?.focus(); return; }
    if (p.path) { e.preventDefault(); up(); }
  };
  const goTool = (t: Tool) => p.onTool(t);
  const level = (list: [Tool, string][]) => p.level === "beginner" ? list.filter(([id]) => BEGINNER.has(id) || id === p.tool) : list;

  let items: ReactNode = null;
  if (p.path === "creer") items = <>
    <Tool_ onClick={p.actions.newPattern} disabled={p.readOnly}>Nouveau</Tool_>
    <Tool_ onClick={p.actions.library}>Ouvrir</Tool_>
    <Tool_ onClick={p.actions.importFile} disabled={p.readOnly}>Importer</Tool_>
    <Tool_ onClick={p.actions.prompt} disabled={p.readOnly}>Générer</Tool_>
    <Tool_ onClick={p.actions.motifs} disabled={p.readOnly}>Motifs</Tool_>
    <Tool_ onClick={p.actions.compose} disabled={p.readOnly}>Composer</Tool_>
  </>;
  else if (p.path === "dessiner") items = <>
    {level(DRAW).map(([id, name]) => <Tool_ key={id} pressed={p.tool === id} disabled={p.readOnly && id !== "hand"} onClick={() => goTool(id)}>{name}</Tool_>)}
    <Tool_ haspopup count={DRAW_MORE.length} onClick={() => p.onPath("dessiner-plus")} disabled={p.readOnly}>Plus d’outils</Tool_>
    <Tool_ onClick={p.actions.drawSettings}>Réglages du dessin</Tool_>
  </>;
  else if (p.path === "dessiner-plus") items = <>
    {DRAW_MORE.map(([id, name]) => <Tool_ key={id} pressed={p.tool === id} disabled={p.readOnly} onClick={() => goTool(id)}>{name}</Tool_>)}
  </>;
  else if (p.path === "fils") items = <>
    <span className="pzs-chip"><span className="pzs-swatch" style={{ background: p.colorHex }} aria-hidden="true" />Fil actif · {p.colorLabel}</span>
    <Tool_ onClick={p.actions.palette}>Palette DMC</Tool_>
    <Tool_ onClick={p.actions.threadsSettings}>Fils et toile</Tool_>
  </>;
  else if (p.path === "broder") items = <>
    {level(STITCH).map(([id, name]) => <Tool_ key={id} pressed={p.tool === id} disabled={p.readOnly && id !== "hand"} onClick={() => goTool(id)}>{name}</Tool_>)}
    <Tool_ onClick={p.actions.follow}>Suivi</Tool_>
  </>;
  else if (p.path === "exporter") items = <>
    <Tool_ onClick={p.actions.exportPanel}>PDF, SVG, OXS</Tool_>
    <Tool_ onClick={p.actions.save}>Enregistrer le projet</Tool_>
    <Tool_ onClick={p.actions.share}>Inviter à voir</Tool_>
  </>;
  else items = <>
    <Tool_ haspopup count={6} onClick={() => p.onPath("creer")}>Créer</Tool_>
    <Tool_ haspopup count={DRAW.length + 2} onClick={() => { p.onWorkspace("create"); p.onPath("dessiner"); }}>Dessiner</Tool_>
    <Tool_ haspopup count={3} onClick={() => p.onPath("fils")}>Fils</Tool_>
    <Tool_ haspopup count={STITCH.length + 1} onClick={() => { p.onWorkspace("stitch"); p.onPath("broder"); }}>Broder</Tool_>
    <Tool_ pressed={p.inspectorOpen} onClick={p.actions.layers}>Calques</Tool_>
    <Tool_ haspopup count={3} onClick={() => p.onPath("exporter")}>Exporter</Tool_>
  </>;

  const toolName = [...DRAW, ...DRAW_MORE, ...STITCH].find(([id]) => id === p.tool)?.[1];
  const crumbs = ["Point Zéro", p.patternName];
  if (p.path === "dessiner-plus") crumbs.push("Dessiner", "Plus d’outils"); else if (p.path) crumbs.push(LABELS[p.path]);
  if ((p.path === "dessiner" || p.path === "dessiner-plus" || p.path === "broder") && toolName) crumbs.push(toolName);

  return <>
    <header className="pzs-head" aria-label="En-tête du studio">
      <nav className="pzs-top" aria-label="Dock des outils du studio de broderie" onKeyDown={onKey}>
        <div className="pzs-brandwrap">
          <button id="pzs-brand" type="button" className="pzs-tool pzs-brand" aria-label="Menu Point Zéro" aria-expanded={menu} aria-controls="pzs-menu" onClick={() => setMenu(v => !v)}>
            <span className="pzs-x" aria-hidden="true">×</span><span className="pzs-brandtxt"> Point Zéro</span> <ChevronDown size={13} aria-hidden="true" style={{ transform: menu ? "rotate(180deg)" : undefined }} />
          </button>
          {menu && <>
            <div className="pzs-veil" aria-hidden="true" onClick={() => setMenu(false)} />
            <div id="pzs-menu" ref={menuRef} className="pzs-menu">
              <ul>
                <li><button type="button" onClick={() => { setMenu(false); p.actions.home(); }}>Accueil Point Zéro</button></li>
                <li><button type="button" onClick={() => { setMenu(false); p.actions.library(); }}>Bibliothèque</button></li>
                <li><button type="button" onClick={() => { setMenu(false); p.actions.shop(); }}>Boutique de patrons</button></li>
                <li><button type="button" onClick={() => { setMenu(false); p.actions.settings(); }}>Réglages et aide</button></li>
              </ul>
              <div className="pzs-levels" role="group" aria-label="Affichage du studio">
                <span>Affichage</span>
                {(Object.keys(LEVEL_LABELS) as InterfaceLevel[]).map(id =>
                  <button key={id} type="button" aria-pressed={p.level === id} onClick={() => p.onLevel(id)}>{LEVEL_LABELS[id]}</button>)}
              </div>
            </div>
          </>}
        </div>
        <span className="pzs-sep" aria-hidden="true" />
        <div className="pzs-row">
          {p.path && <>
            <button ref={upRef} type="button" className="pzs-tool pzs-up" aria-label="Remonter d’un niveau" onClick={up}><ArrowLeft size={18} aria-hidden="true" /></button>
            <span className="pzs-parent">{LABELS[p.path]}</span>
            <span className="pzs-sep" aria-hidden="true" />
          </>}
          {items}
        </div>
        <span className="pzs-sep" aria-hidden="true" />
        <button type="button" className="pzs-tool pzs-icon" aria-label="Annuler" title="Annuler" disabled={!p.canUndo} onClick={p.onUndo}><Undo2 size={17} aria-hidden="true" /></button>
        <button type="button" className="pzs-tool pzs-icon pzs-redo" aria-label="Rétablir" title="Rétablir" disabled={!p.canRedo} onClick={p.onRedo}><Redo2 size={17} aria-hidden="true" /></button>
      </nav>
      <span className="sr-only" role="status">{p.patternName} · {p.saving}</span>
      <p className="pzs-crumbs">{crumbs.map((c, i) => <span key={i}>{i > 0 && <span aria-hidden="true"> › </span>}{i === crumbs.length - 1 ? <strong>{c}</strong> : c}</span>)}</p>
    </header>

    <nav className="pzs-bottom" aria-label="Se repérer dans le studio">
      <div className="pzs-seg" role="group" aria-label="Mode">
        <button type="button" aria-pressed={p.workspace === "create"} onClick={() => { p.onWorkspace("create"); if (p.path === "broder") p.onPath("dessiner"); }}>Créer</button>
        <button type="button" aria-pressed={p.workspace === "stitch"} onClick={() => { p.onWorkspace("stitch"); if (p.path === "dessiner" || p.path === "dessiner-plus") p.onPath("broder"); }}>Broder</button>
      </div>
      <span className="pzs-sep" aria-hidden="true" />
      <div className="pzs-seg" role="group" aria-label="Affichage de la grille">
        {VIEWS.map(([id, name]) => <button key={id} type="button" aria-pressed={p.view === id} onClick={() => p.onView(id)}>{name}</button>)}
      </div>
      <button type="button" className="pzs-btm" aria-pressed={p.symbols} onClick={p.onSymbols}>Symboles</button>
      <span className="pzs-sep" aria-hidden="true" />
      <button type="button" className="pzs-btm pzs-sq" aria-label="Loupe : doubler le zoom de la zone visible" title="Loupe" onClick={p.zoom.magnify}><Search size={17} aria-hidden="true" /></button>
      <button type="button" className="pzs-btm pzs-sq" aria-label="Dézoomer" onClick={p.zoom.zoomOut}>−</button>
      <button type="button" className="pzs-btm pzs-sq" aria-label="Zoomer" onClick={p.zoom.zoomIn}>+</button>
      <button type="button" className="pzs-btm pzs-light" onClick={p.zoom.fit}>Tout voir</button>
      <span className="pzs-sep" aria-hidden="true" />
      <button type="button" className="pzs-btm pzs-thread" aria-pressed={p.path === "fils"} aria-label={`Fil actif ${p.colorLabel}, ouvrir les fils`} onClick={() => p.onPath(p.path === "fils" ? null : "fils")}>
        <span className="pzs-swatch" style={{ background: p.colorHex }} aria-hidden="true" />{p.colorLabel}
      </button>
    </nav>
  </>;
}
