import {
  ArrowLeft, Download, Ellipsis, Eraser, Flower2, FolderOpen, Hand, PaintBucket, Palette, Pencil, PencilRuler,
  Pipette, Plus, Redo2, Scan, Scissors, Search, Settings2, Undo2, Upload, UserPlus, ZoomIn, ZoomOut,
} from "lucide-react";
import { LEVEL_LABELS } from "../lib/interfaceLevel";

/**
 * Réplique statique du studio, pour l'accueil.
 * Elle reprend la vraie disposition (en-tête + capsule de niveau, rail d'outils,
 * inspecteur, bande DMC, capsule d'actions), les mêmes icônes et les mêmes libellés
 * que TopBar, CategoryBar, EmbroideryToolbox, l'inspecteur et StudioActionBar.
 * Si le studio change, cette réplique doit changer avec lui.
 * Purement décorative : aucun bouton n'est actif, rien n'est lu ni écrit.
 */
const LEVELS = Object.values(LEVEL_LABELS);
const CATEGORIES = [["Créer", Flower2], ["Outils", PencilRuler], ["Fils", Palette], ["Broder", Scissors]] as const;
const TOOLS = [["Main", Hand], ["Croix", Pencil], ["Gomme", Eraser], ["Remplir", PaintBucket], ["Pipette", Pipette], ["Sélection", Scan]] as const;
// Teintes DMC réelles (craft-color-codes) — couleurs écran indicatives.
const THREADS = [
  ["3685", "#881531", "●"], ["3350", "#BC4365", "×"], ["3326", "#FBADB4", "■"], ["818", "#FFDFD9", "▲"],
  ["3865", "#F9F7F1", "○"], ["3364", "#83975F", "+"], ["3363", "#728256", "◆"], ["3362", "#5E6B47", "▼"],
] as const;

export default function StudioDemo({ projectName = "Roses anciennes" }: { projectName?: string }) {
  return <div className="pzd" aria-hidden="true">
    <div className="pzd-top">
      <div className="pzd-top-left">
        <span className="pzd-icon pzd-icon-ring"><ArrowLeft size={14}/></span>
        <span className="pzd-brand"><b>×</b> Point Zéro <i>Studio</i></span>
      </div>
      <div className="pzd-levels">{LEVELS.map(l => <span key={l} data-on={l === LEVEL_LABELS.intermediate}>{l}</span>)}</div>
      <div className="pzd-top-right">
        {[Undo2, Redo2, FolderOpen, Settings2, UserPlus, Ellipsis].map((Icon, i) => <span key={i} className="pzd-icon"><Icon size={15}/></span>)}
      </div>
    </div>
    <div className="pzd-body">
      <div className="pzd-left">
        <div className="pzd-cats">{CATEGORIES.map(([label, Icon]) => <span key={label} data-on={label === "Outils"}><Icon size={12}/>{label}</span>)}</div>
        <div className="pzd-toolbox">
          <small>OUTILS DE DESSIN</small>
          <div className="pzd-tools">{TOOLS.map(([label, Icon]) => <span key={label} data-on={label === "Croix"} title={label}><Icon size={15}/></span>)}</div>
          <span className="pzd-more">Afficher tous les outils <Plus size={11}/></span>
        </div>
      </div>
      <div className="pzd-canvas">
        <img src="/images/grille-roses.png" alt="" width="680" height="680" loading="lazy"/>
        <div className="pzd-actions">
          <span><Upload size={14}/></span><span><Download size={14}/></span><i/>
          <span><Search size={14}/></span><span><ZoomOut size={14}/></span><span><ZoomIn size={14}/></span><span><Scan size={14}/></span>
        </div>
      </div>
      <div className="pzd-right">
        <div className="pzd-tabs"><span data-on="true">Calques</span><span>Motifs</span><span>Réglages</span></div>
        <div className="pzd-inspector">
          <small>DOCUMENT</small>
          <p>{projectName}</p>
          <div className="pzd-tiles"><span><small>Grille</small><b>80 × 80</b></span><span><small>Fils DMC</small><b>{THREADS.length}</b></span></div>
          <span className="pzd-active"><i style={{ background: THREADS[1][1] }}/>Fil actif · DMC {THREADS[1][0]}</span>
        </div>
      </div>
    </div>
    <div className="pzd-floss">
      <div className="pzd-floss-head"><b>Fils DMC</b> {THREADS.length}<span data-on="true">Projet</span><span>Utilisés</span><span>En stock</span><span>Manquants</span></div>
      <div className="pzd-floss-row">
        <span className="pzd-add"><Plus size={14}/></span>
        {THREADS.map(([code, hex, symbol]) => <span key={code} className="pzd-thread" data-on={code === THREADS[1][0]}>
          <i style={{ background: hex, color: parseInt(hex.slice(1, 3), 16) > 200 ? "#2a2a2a" : "#fff" }}>{symbol}</i><small>{code}</small>
        </span>)}
      </div>
    </div>
  </div>;
}
