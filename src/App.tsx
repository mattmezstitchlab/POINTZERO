import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { BASE_FLOSS, FLOSS, flossIndex } from "./lib/dmc";
import { blankPattern, initState, loadStored, reducer, saveStored } from "./lib/store";
import { clonePattern, compositePattern, computeStats, createPattern, ensurePalette, toObject, fromObject, type Pattern, type Supply } from "./lib/pattern";
import { readProjectFile, readTextFile, saveProjectFile } from "./lib/io";
import { fromOxs } from "./lib/oxs";
import { readInventory, saveLibrary, writeInventory } from "./lib/library";
import { clearSelection, extractSelection, pasteSelection, transformPart, type Selection } from "./lib/editing";
import { useMedia } from "./lib/useMedia";
import type { Tool } from "./lib/stitch";
import { runChecks } from "./lib/checks";
import Canvas, { type Insets, type ViewMode } from "./components/Canvas";
import Dock from "./components/Dock";
import TopBar from "./components/TopBar";
import DesignStudio from "./components/DesignStudio";
import PhotoStudio from "./components/PhotoStudio";
import FashionStudio from "./components/FashionStudio";
import AtelierCreate from "./components/AtelierCreate";
import CategoryBar, { type AtelierCategory } from "./components/CategoryBar";
import MotifLibrary from "./components/MotifLibrary";
import CompositionProperties from "./components/CompositionProperties";
import { getMotifPreset } from "./lib/motifPresets";
import { attachSubject, changeSubject, duplicateSubject, recomposeSubjects, removeSubject, reorderSubject, sceneFromPattern, type SubjectScene, type SubjectLayer } from "./lib/subjectEngine";
import Sheet from "./components/Sheet";
import PaletteSheet from "./components/PaletteSheet";
import FlossRail from "./components/FlossRail";
import WorkspacePanel, { DEFAULT_PREFS, type Preferences } from "./components/WorkspacePanel";
import LibrarySheet from "./components/LibrarySheet";
import SelectionBar from "./components/SelectionBar";
import ImportStudio from "./components/ImportStudio";
import PdfPrep from "./components/PdfPrep";
import PromptStudio from "./components/PromptStudio";
import CompositionStudio from "./components/CompositionStudio";
import AutomaticImageImport from "./components/AutomaticImageImport";
import ExportStudio from "./components/ExportStudio";
import ErrorBoundary from "./components/ErrorBoundary";
import PeerShare from "./components/PeerShare";

type Panel = "palette" | "project" | "library" | "share" | "export" | null;
type Workspace = "create" | "stitch";
const STITCH_TOOLS = new Set<Tool>(["hand", "pick", "mark", "details", "block", "row", "park", "unpick", "note"]);
/**
 * Raccourcis d'outils.
 *
 * Les lettres couvrent les outils du dock ; les chiffres, ceux qui n'étaient
 * accessibles que depuis le panneau Projet. T, P et F restent réservés : T cycle
 * l'affichage, P ouvre la palette (ou gare un fil en mode Broder), F ouvre la
 * palette.
 */
const KEYS: Record<string, Tool> = {
  v: "hand", x: "cross", d: "half", q: "quarter", r: "back", k: "knot", l: "long",
  i: "pick", g: "fill", e: "erase", m: "mark", j: "details", b: "block", h: "row",
  u: "unpick", s: "select",
  "1": "threeQuarter", "2": "petite", "3": "bead", "4": "line", "5": "rect",
  "6": "ellipse", "7": "lasso", "8": "move", "9": "note",
};

function initialPreferences(): Preferences {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem("point-zero:preferences") ?? "{}") }; } catch { return DEFAULT_PREFS; }
}
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export default function App() {
  const [boot] = useState(loadStored);
  // Existing embroidery projects resume untouched; newcomers open the multiformat studio.
  const [studioMode, setStudioMode] = useState<"design" | "embroidery" | "photo" | "fashion">(() => {
    try {
      const chosen = localStorage.getItem("pointzero:workspace");
      return chosen === "design" || chosen === "photo" || chosen === "fashion" || chosen === "embroidery" ? chosen : boot ? "embroidery" : "design";
    } catch { return "embroidery"; }
  });
  const [photoHandoff, setPhotoHandoff] = useState<{id:string;dataUrl:string}|null>(null);
  const switchStudio = (mode: "design" | "embroidery" | "photo" | "fashion") => {
    setStudioMode(mode);
    try { localStorage.setItem("pointzero:workspace", mode); } catch { /* Local storage may be restricted. */ }
  };
  const [store, dispatch] = useReducer(reducer, boot, (v) => initState(v ?? blankPattern()));
  const [remote, setRemote] = useState<Pattern | null>(null);
  const [activeCategory, setActiveCategory] = useState<AtelierCategory>("compose");
  const [categoryPanel, setCategoryPanel] = useState<AtelierCategory | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const subjectMove = useRef<{ scene: SubjectScene; base: Pattern; id: string; x: number; y: number } | null>(null);
  const [showDrawingTools, setShowDrawingTools] = useState(false);
  const [compositionInput, setCompositionInput] = useState<Pattern | null>(null);
  const [autoImage, setAutoImage] = useState<File | null>(null);
  const P = remote ?? store.present;
  const [tool, setTool] = useState<Tool>("cross"), [color, setColor] = useState(Math.max(0, flossIndex("3801"))), [view, setView] = useState<ViewMode>("real"), [workspace, setWorkspace] = useState<Workspace>("create");
  const [symbols, setSymbols] = useState(false), [panel, setPanel] = useState<Panel>(null), [file, setFile] = useState<File | null>(null), [pdfFile, setPdfFile] = useState<File | null>(null), [promptOpen, setPromptOpen] = useState(false), [selection, setSelection] = useState<Selection | null>(null), [clipboard, setClipboard] = useState<Pattern | null>(null);
  const [prefs, setPrefs] = useState(initialPreferences), [inventory, setInventory] = useState(readInventory), [saving, setSaving] = useState("Sauvegarde locale"), [toast, setToast] = useState("");
  const [fitKey, setFitKey] = useState(0), desktop = useMedia("(min-width: 1024px)");
  const ready = useRef(true), prevTool = useRef<Tool>("cross"), lastViews = useRef<{ create: ViewMode; stitch: ViewMode }>({ create: "real", stitch: "pattern" });
  const snapshot = useRef({ P, remote, prefs, workspace, store }); snapshot.current = { P, remote, prefs, workspace, store };
  const checked = useRef(false);
  const notify = useCallback((msg: string) => setToast(msg), []);
  const closePanel = useCallback(() => setPanel(null), []);
  // La grille est véritablement bord à bord : aucun espace réservé aux palettes flottantes.
  const insets: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

  useEffect(() => {
    if ("serviceWorker" in navigator && (window.isSecureContext || window.location.hostname === "localhost")) {
      void navigator.serviceWorker.register(new URL("./sw.js", document.baseURI)).catch(() => undefined);
    }
  }, []);
  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    const failures = runChecks().filter((v) => !v.ok);
    if (failures.length) notify(`Vérification du moteur : ${failures.length} anomalie(s). Consultez Réglages avant de travailler.`);
  }, [notify]);

  const setPattern = useCallback((p: Pattern, quiet = false) => {
    if (snapshot.current.remote) notify("Lecture partagée : seul l’hôte modifie ce projet.");
    else dispatch({ type: quiet ? "quiet" : "set", pattern: p });
  }, [notify]);
  const chooseWorkspace = useCallback((mode: Workspace) => {
    const current = snapshot.current.workspace;
    if (mode === current) return;
    lastViews.current[current] = view;
    setWorkspace(mode); setView(lastViews.current[mode]); setTool(mode === "stitch" ? "mark" : "cross"); setSelection(null);
    window.dispatchEvent(new CustomEvent("pointzero:canvas", { detail: { action: "clearSelection" } }));
  }, [view]);
  const chooseTool = useCallback((next: Tool) => {
    if (snapshot.current.remote && next !== "hand") { notify("Le patron partagé est en lecture seule."); return; }
    if (snapshot.current.workspace === "stitch" && !STITCH_TOOLS.has(next)) { notify("Passez en mode Créer pour modifier le dessin."); return; }
    if (["mark", "details", "block", "row", "park", "unpick"].includes(next) && snapshot.current.workspace === "create") { setWorkspace("stitch"); setView("pattern"); setActiveCategory("stitch"); }
    if (next !== "pick") prevTool.current = next;
    setTool(next);
  }, [notify]);
  const pickColor = (idx: number) => {
    setColor(idx);
    if (!P.palette.includes(idx) && !remote) { const next = clonePattern(P); ensurePalette(next, idx); setPattern(next); }
    if (workspace === "stitch") setTool(remote ? "hand" : "mark");
    else if (["erase", "hand", "pick", "mark"].includes(tool)) setTool("cross");
    if (panel === "palette") closePanel();
  };
  const updateSupply = (code: string, supply: Supply) => {
    const values = { ...inventory, [code]: supply };
    if (!remote) { setInventory(values); try { writeInventory(values); } catch { notify("Stock non sauvegardé : exportez votre JSON."); } }
    setPattern({ ...P, supplies: { ...P.supplies, [code]: supply } }, true);
  };
  const loadPattern = async (p: Pattern) => {
    if (!remote) { try { await saveLibrary(store.present, true); } catch { /* The explicit file backup remains available. */ } }
    const next = { ...p, supplies: { ...p.supplies, ...inventory } };
    setRemote(null); dispatch({ type: "load", pattern: next }); ready.current = true;
    setSelection(null); setSelectedSubjectId(null); setFitKey((k) => k + 1); setColor(next.palette[0] ?? flossIndex("3801")); closePanel(); setFile(null); setCategoryPanel(null); setShowWelcome(false);
  };

  useEffect(() => {
    // Les anciens liens #atelier / #slame pointent désormais vers l'unique atelier.
    if (window.location.hash === "#atelier" || window.location.hash === "#slame") {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    document.title = `${P.name} | POINTZERO · Atelier`;
  }, [P.name]);
  useEffect(() => {
    try { localStorage.setItem("point-zero:preferences", JSON.stringify(prefs)); } catch { /* Optional preferences do not block the editor. */ }
  }, [prefs]);
  // Aucun motif de démonstration n'est chargé sur la grille initiale.
  // La véritable toile Canvas est visible sous la saisie de création.
  useEffect(() => {
    if (!ready.current || remote) return;
    const timer = window.setTimeout(() => {
      setSaving("Sauvegarde en cours…");
      const local = saveStored(store.present);
      saveLibrary(store.present).then(() => setSaving("Sauvegardé sur cet appareil")).catch(() => { setSaving(local ? "Copie locale sauvegardée" : "Sauvegarde indisponible : exporter le JSON"); if (!local) notify("Stockage local indisponible. Sauvegardez le projet en JSON."); });
    }, 650);
    return () => clearTimeout(timer);
  }, [store.present, remote, notify]);
  useEffect(() => {
    const flush = () => { if (!snapshot.current.remote) saveStored(snapshot.current.store.present); };
    window.addEventListener("pagehide", flush); return () => window.removeEventListener("pagehide", flush);
  }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 4000); return () => clearTimeout(t); } }, [toast]);
  useEffect(() => {
    const syncInventory = () => setInventory(readInventory());
    window.addEventListener("pointzero:inventory-changed", syncInventory);
    return () => window.removeEventListener("pointzero:inventory-changed", syncInventory);
  }, []);

  useEffect(() => {
    if (workspace !== "stitch" || remote) return;
    let start = performance.now(), lastDone = computeStats(snapshot.current.P).totals.doneCells;
    const accrue = () => {
      if (document.hidden) { start = performance.now(); return; }
      const seconds = Math.floor((performance.now() - start) / 1000); start = performance.now();
      if (seconds < 1) return;
      const p = snapshot.current.P, currentDone = computeStats(p).totals.doneCells, date = today(), sessions = [...(p.sessions ?? [])];
      const found = sessions.findIndex((v) => v.date === date), delta = currentDone - lastDone; lastDone = currentDone;
      if (found >= 0) sessions[found] = { ...sessions[found], seconds: sessions[found].seconds + seconds, cells: Math.max(0, sessions[found].cells + delta) };
      else sessions.push({ date, seconds, cells: Math.max(0, delta) });
      dispatch({ type: "quiet", pattern: { ...p, sessions } });
    };
    const timer = setInterval(accrue, 30000); const visible = () => { if (!document.hidden) start = performance.now(); };
    document.addEventListener("visibilitychange", visible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [workspace, !!remote]);
  useEffect(() => {
    if (workspace !== "stitch" || !prefs.keepAwake || !navigator.wakeLock) return;
    let lock: WakeLockSentinel | null = null, stopped = false;
    const request = async () => { if (document.hidden) return; try { const result = await navigator.wakeLock.request("screen"); if (stopped) void result.release(); else lock = result; } catch { /* Power-saving policies can deny the request. */ } };
    void request(); document.addEventListener("visibilitychange", request);
    return () => { stopped = true; void lock?.release(); document.removeEventListener("visibilitychange", request); };
  }, [workspace, prefs.keepAwake]);

  const selectionAction = (action: string) => {
    if (!selection) return;
    const d = compositePattern(P);
    if (action === "close") { setSelection(null); window.dispatchEvent(new CustomEvent("pointzero:canvas", { detail: { action: "clearSelection" } })); return; }
    if (action === "copy") { setClipboard(extractSelection(d, selection)); notify("Sélection copiée dans le presse-papiers de l’atelier"); return; }
    if (action === "move") { chooseTool("move"); notify("Glissez la sélection vers sa nouvelle position"); return; }
    if (action === "paste" && clipboard) setPattern(pasteSelection(P, clipboard, selection.x, selection.y));
    if (action === "delete") setPattern(clearSelection(P, selection));
    if (["rotate", "flipX", "flipY"].includes(action)) {
      const part = transformPart(extractSelection(P, selection), action as "rotate" | "flipX" | "flipY");
      setPattern(pasteSelection(clearSelection(P, selection), part, selection.x, selection.y)); setSelection({ ...selection, w: part.w, h: part.h });
    }
  };
  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      // Rien ne doit passer pendant qu'on écrit : un raccourci déclenché dans un
      // champ mange des lettres. La cible peut ne pas être un Element.
      const cible = e.target;
      if (cible instanceof Element && cible.closest('input, textarea, select, [contenteditable="true"]')) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (!remote) dispatch({ type: e.shiftKey ? "redo" : "undo" }); return; }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (KEYS[key]) chooseTool(KEYS[key]);
      else if (key === "p") { if (workspace === "stitch") chooseTool("park"); else setPanel("palette"); }
      else if (key === "f") setPanel("palette");
      else if (key === "t") setView((v) => v === "real" ? "flat" : v === "flat" ? "pattern" : "real");
      else if (key === "escape") { closePanel(); setSelection(null); setCategoryPanel(null); }
    };
    window.addEventListener("keydown", keys); return () => window.removeEventListener("keydown", keys);
  }, [chooseTool, remote, workspace, closePanel]);

  /** Même décodeur pour tous les fichiers de projet, depuis le même atelier. */
  const openProjectFromFile = async (f: File): Promise<string | null> => {
    try {
      if (!/\.(json|oxs)$/i.test(f.name)) throw new Error("Choisissez un fichier .pointzero.json, .json ou .oxs.");
      if (f.size > 25 * 1024 * 1024) throw new Error("Ce projet dépasse 25 Mo.");
      const p = /\.oxs$/i.test(f.name) ? fromOxs(await readTextFile(f)) : await readProjectFile(f);
      if (!p) throw new Error("Projet invalide ou format JSON incompatible. Le fichier original reste intact.");
      await loadPattern(p);
      setWorkspace("create");
      setView("pattern");
      setTool("cross");
      notify(`« ${p.name} » ouvert · ${p.w} × ${p.h} points · ${p.palette.length} couleurs DMC`);
      return null;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Impossible d’ouvrir ce projet.";
      notify(message);
      return message;
    }
  };

  const panelActions = {
    importFile: (f: File) => {
      closePanel();
      if (/\.pdf$/i.test(f.name) || f.type === "application/pdf") setPdfFile(f);
      else setAutoImage(f);
    },
    importAdvanced: (f: File) => { closePanel(); setFile(f); },
    openFile: (f: File) => { void openProjectFromFile(f); },
    export: () => setPanel("export" as Panel), save: () => { saveProjectFile(P); notify("Fichier projet téléchargé"); },
    new: (w: number, h: number) => { try { const next = createPattern("Nouveau motif", w, h, P.count, P.strands); next.fabric = P.fabric; void loadPattern(next); } catch (e) { notify(e instanceof Error ? e.message : "Dimensions invalides"); } },
    library: () => setPanel("library" as Panel), share: () => setPanel("share" as Panel), prompt: () => { closePanel(); setPromptOpen(true); }, notify,
  };

  const projectInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const openComposition = () => { if (!remote) { closePanel(); setCategoryPanel(null); setCompositionInput(P); } };
  const onRemote = useCallback((p: Pattern | null) => {
    setRemote(p);
    if (p) { setShowWelcome(false); setCategoryPanel(null); setActiveCategory("stitch"); setWorkspace("stitch"); setView("pattern"); setTool("hand"); setColor((c) => p.palette.includes(c) ? c : p.palette[0] ?? 0); }
  }, []);
  const importAnyFile = (chosen: File) => {
    if (/\.(json|oxs)$/i.test(chosen.name)) { void openProjectFromFile(chosen); }
    else if (/\.pdf$/i.test(chosen.name) || chosen.type === "application/pdf") { setPdfFile(chosen); }
    else if (chosen.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(chosen.name)) { setAutoImage(chosen); }
    else { notify("Format non reconnu : image, PDF, JSON ou OXS."); return; }
    setShowWelcome(false); setCategoryPanel(null);
  };
  // Snapshots are native POINTZERO projects, never flat decorative images.
  const sceneOf = (p: Pattern): SubjectScene => {
    const saved = sceneFromPattern(p);
    if (saved) return saved;
    const base = compositePattern({ ...p, subjectScene: undefined });
    const snapshot = JSON.stringify(toObject({ ...base, subjectScene: undefined, composition: undefined, layers: [], activeLayer: undefined }));
    return { version: 1, source: snapshot, backdrop: snapshot, layers: [], warnings: [] };
  };
  const addStitchedPattern = (sprite: Pattern, position?: { x: number; y: number }) => {
    if (remote) { notify("Le projet partagé est en lecture seule."); return; }
    try {
      const scene = sceneOf(P);
      const offset = Math.min(6, scene.layers.length) * 3;
      const x = position ? Math.round(position.x - sprite.w / 2) : Math.round((P.w - sprite.w) / 2) + offset;
      const y = position ? Math.round(position.y - sprite.h / 2) : Math.round((P.h - sprite.h) / 2) + offset;
      const next = attachSubject(scene, sprite,
        Math.max(0, Math.min(P.w - 1, x)), Math.max(0, Math.min(P.h - 1, y)));
      setPattern(recomposeSubjects(next));
      setSelectedSubjectId(next.layers[next.layers.length - 1]?.id ?? null);
      setTool("hand"); setWorkspace("create"); setView("flat");
      setActiveCategory("compose"); setShowWelcome(false); setCategoryPanel(null); closePanel();
    } catch (error) { notify(error instanceof Error ? error.message : "Impossible d’ajouter ce motif."); }
  };
  const updateScene = (change: (scene: SubjectScene) => SubjectScene) => {
    if (remote) return;
    try { setPattern(recomposeSubjects(change(sceneOf(P)))); }
    catch (error) { notify(error instanceof Error ? error.message : "Recomposition impossible."); }
  };
  const subjectStart = (x: number, y: number): boolean => {
    if (remote || activeCategory !== "compose") return false;
    const scene = sceneFromPattern(P);
    if (!scene?.layers.length) return false;
    const hit = [...scene.layers].reverse().find(layer => {
      if (!layer.visible) return false;
      const sprite = fromObject(JSON.parse(layer.sprite));
      return sprite && x >= layer.x && y >= layer.y &&
        x < layer.x + sprite.w * layer.scale && y < layer.y + sprite.h * layer.scale;
    });
    if (!hit) { setSelectedSubjectId(null); return false; }
    setSelectedSubjectId(hit.id);
    if (!hit.locked) {
      subjectMove.current = { scene, base: P, id: hit.id, x: hit.x, y: hit.y };
      dispatch({ type: "begin" });
    }
    return true;
  };
  const subjectMoveTo = (dx: number, dy: number) => {
    const drag = subjectMove.current;
    if (!drag || remote) return;
    try {
      const scene = changeSubject(drag.scene, drag.id, { x: drag.x + dx, y: drag.y + dy });
      dispatch({ type: "live", pattern: recomposeSubjects(scene) });
    } catch (error) { notify(error instanceof Error ? error.message : "Déplacement impossible."); }
  };
  const subjectEnd = (changed: boolean) => {
    if (!subjectMove.current) return;
    const drag = subjectMove.current;
    subjectMove.current = null;
    if (!changed) dispatch({ type: "live", pattern: drag.base });
    dispatch({ type: "end", changed });
  };
  const changeSelectedSubject = (id: string, patch: Partial<Pick<SubjectLayer, "x" | "y" | "scale" | "visible" | "tint">>) =>
    updateScene(scene => changeSubject(scene, id, patch));
  const duplicateSelectedSubject = (id: string) => updateScene(scene => {
    const next = duplicateSubject(scene, id);
    const added = next.layers.find(layer => !scene.layers.some(old => old.id === layer.id));
    if (added) setSelectedSubjectId(added.id);
    return next;
  });
  const removeSelectedSubject = (id: string) => updateScene(scene => {
    const next = removeSubject(scene, id);
    setSelectedSubjectId(next.layers[next.layers.length - 1]?.id ?? null);
    return next;
  });
  const openCategory = (next: AtelierCategory) => {
    setActiveCategory(next);
    setPanel(null);
    if (next === "stitch") chooseWorkspace("stitch");
    else if (next === "compose" || next === "threads") chooseWorkspace("create");
    if (next === "compose") { setTool("hand"); setCategoryPanel(null); setShowWelcome(false); return; }
    if (next === "create" && showWelcome) { setCategoryPanel(null); return; }
    setShowWelcome(false);
    setCategoryPanel((v) => v === next ? null : next);
  };
  const createActions = {
    prompt: promptText, onPrompt: setPromptText,
    onGenerate: () => setPromptOpen(true),
    onImport: importAnyFile,
    onBlank: () => { panelActions.new(80, 80); setActiveCategory("compose"); setShowDrawingTools(false); },
    onLibrary: () => { setShowWelcome(false); setCategoryPanel(null); setPanel("library"); },
  };
  const contextSection: "prepare" | "edit" | "follow" | "settings" =
    panel === "project" ? "settings" : categoryPanel === "compose" ? "edit" :
    categoryPanel === "threads" ? "prepare" : categoryPanel === "stitch" ? "follow" : "settings";
  return studioMode === "design"
    ? <DesignStudio onEmbroidery={() => switchStudio("embroidery")}
        onPhoto={() => switchStudio("photo")} onFashion={() => switchStudio("fashion")}
        incomingPhoto={photoHandoff} onPhotoConsumed={() => setPhotoHandoff(null)} />
    : studioMode === "photo"
    ? <PhotoStudio onBack={() => switchStudio("design")} onUse={dataUrl => {
        setPhotoHandoff({id:crypto.randomUUID?.()??String(Date.now()),dataUrl});
        switchStudio("design");
      }} />
    : studioMode === "fashion"
    ? <FashionStudio onBack={() => switchStudio("design")} />
    : <div className={`pz-atelier fixed inset-0 h-[100dvh] w-full overflow-hidden bg-[#faf9f7] ${prefs.largeText ? "large-text" : ""} ${prefs.highContrast ? "high-contrast" : ""}`}>
    <input
      ref={imageInputRef}
      type="file"
      accept="image/png,image/jpeg,image/webp"
      className="sr-only"
      aria-label="Choisir une image à composer"
      onChange={e=>{const selected=e.target.files?.[0];e.target.value="";if(selected)setAutoImage(selected);}}
    />
    <input
      ref={projectInputRef}
      type="file"
      accept=".json,.oxs,application/json"
      aria-label="Sélectionner un projet POINTZERO JSON"
      className="sr-only"
      onChange={e => {
        const chosen = e.target.files?.[0];
        e.target.value = "";
        if (chosen) void openProjectFromFile(chosen);
      }}
    />
    <Canvas pattern={P} tool={remote ? "hand" : tool} color={color} view={view} symbols={symbols} highlightActive={workspace === "stitch"} insets={insets} fitKey={fitKey} onlyActive={prefs.onlyActive} highContrast={prefs.highContrast} pencilOnly={prefs.pencilOnly} symmetry={prefs.symmetry} annotation={prefs.annotation} readOnly={!!remote} selection={selection} halfDirection={prefs.halfDirection}
      onSelection={setSelection} onBegin={() => { if (!remote) dispatch({ type: "begin" }); }}
      onLive={(p) => { if (!remote) dispatch({ type: "live", pattern: p }); }}
      onEnd={(changed) => { if (!remote) dispatch({ type: "end", changed }); }}
      onPick={(idx) => { setColor(idx); if (tool === "pick") setTool(prevTool.current); }}
      onSubjectStart={subjectStart} onSubjectMove={subjectMoveTo} onSubjectEnd={subjectEnd}
      onMotifDrop={(id,x,y) => { const preset = getMotifPreset(id); if (preset) addStitchedPattern(preset,{x,y}); }} />
    <TopBar pattern={P} onDesign={() => switchStudio("design")} onCreate={() => { setPanel(null); setActiveCategory("create"); setCategoryPanel("create"); setShowWelcome(false); }}
      canUndo={!remote && store.past.length > 0 && !store.pending}
      canRedo={!remote && store.future.length > 0 && !store.pending}
      onUndo={() => dispatch({ type: "undo" })} onRedo={() => dispatch({ type: "redo" })}
      symbols={symbols} onSymbols={() => setSymbols((v) => !v)}
      view={view} onView={setView} onFit={() => setFitKey((k) => k + 1)}
      onLibrary={() => { setCategoryPanel(null); setPanel("library"); }}
      onExport={() => { setCategoryPanel(null); setPanel("export"); }}
      onSettings={() => { setCategoryPanel(null); setPanel("project"); }}
      onShare={() => { setCategoryPanel(null); setPanel("share"); }}
      saving={saving} drawing={showDrawingTools}
      onAdvanced={() => { setPanel(null); setCategoryPanel("compose"); setShowWelcome(false); }}
      onDrawing={() => { setTool(showDrawingTools ? "hand" : "cross"); setShowDrawingTools(!showDrawingTools); setActiveCategory("compose"); }} />
    <CategoryBar active={activeCategory} onChoose={openCategory} />
    <MotifLibrary readOnly={!!remote}
      onAdd={id => { const preset = getMotifPreset(id); if (preset) addStitchedPattern(preset); }}
      onAddSaved={sprite => addStitchedPattern(sprite)}
      onOpenProject={p => { void loadPattern(p); setTool("hand"); }}
      onBlank={() => { panelActions.new(80,80); setTool("hand"); setActiveCategory("compose"); }}
      onOpenLibrary={() => { setCategoryPanel(null); setPanel("library"); }} />
    <CompositionProperties scene={sceneFromPattern(P)} selectedId={selectedSubjectId}
      onSelect={id => { setSelectedSubjectId(id); setActiveCategory("compose"); setTool("hand"); }}
      onChange={changeSelectedSubject} onReorder={(id,delta) => updateScene(scene => reorderSubject(scene,id,delta))}
      onDuplicate={duplicateSelectedSubject} onRemove={removeSelectedSubject} readOnly={!!remote} />
    {showWelcome && !remote && <div className="pointer-events-none fixed inset-0 z-[28] flex items-center justify-center px-3 pb-12 pt-12"><div className="pointer-events-auto"><AtelierCreate {...createActions} /></div></div>}
    <Sheet open={categoryPanel === "create"} onClose={() => setCategoryPanel(null)} title="Créer" subtitle="Une seule création, directement dans la grille"><AtelierCreate {...createActions} compact /></Sheet>
    {!showWelcome && (showDrawingTools || activeCategory === "stitch") && <Dock tool={remote ? "hand" : tool} onTool={chooseTool} color={color} workspace={workspace} />}
    {!showWelcome && selection && workspace === "create" && !remote && <SelectionBar selection={selection} hasClipboard={!!clipboard} onAction={selectionAction} />}
    <FlossRail pattern={P} active={color} onActive={pickColor} onPattern={(p) => setPattern(p)} onSupply={updateSupply} onBrowse={() => setPanel("palette")} stitching={workspace === "stitch"} hidden={(!showDrawingTools && activeCategory !== "stitch") || panel !== null || categoryPanel !== null || showWelcome || !!file} />
    <PaletteSheet open={panel === "palette"} onClose={closePanel} pattern={P} color={color} onPick={pickColor} />
    <WorkspacePanel open={panel === "project" || categoryPanel === "compose" || categoryPanel === "threads" || categoryPanel === "stitch"}
      onClose={() => { setCategoryPanel(null); closePanel(); }} pattern={P} onSet={setPattern}
      actions={panelActions} prefs={prefs} onPrefs={setPrefs} onTool={chooseTool} tool={tool} color={color}
      onColor={setColor} workspace={workspace} section={contextSection}
      extraActions={categoryPanel === "compose" ? <button className="btn-tinted" onClick={openComposition}>Composition intelligente · aperçu</button> :
      categoryPanel === "threads" ? <button className="btn-tinted" onClick={() => { setCategoryPanel(null); setPanel("palette"); }}>Palette et stock DMC</button> : undefined} />
    <LibrarySheet open={panel === "library"} onClose={closePanel} onLoad={(p) => void loadPattern(p)} onNew={() => panelActions.new(80, 80)} inventory={inventory} />
    {autoImage && <AutomaticImageImport file={autoImage}
      onCancel={() => setAutoImage(null)}
      onReady={p => { setAutoImage(null); setCompositionInput(p); setWorkspace("create"); setView("pattern"); }}/> }
    {file && <ImportStudio file={file} onClose={() => setFile(null)} onImport={(p) => {
      setFile(null); setWorkspace("create"); setView("pattern");
      setCompositionInput(p);
      notify("Source image analysée. Vérifiez les propositions de composition avant validation.");
    }} />}
    {pdfFile && (
      <ErrorBoundary label="La préparation du PDF" onReset={() => setPdfFile(null)}>
        <PdfPrep
          file={pdfFile}
          onClose={() => setPdfFile(null)}
          onImport={(p) => {
            setPdfFile(null);
            setWorkspace("create");
            setView("pattern");
            void loadPattern(p);
            notify("Patron PDF ouvert directement dans la grille. La composition reste facultative.");
          }}
        />
      </ErrorBoundary>
    )}
    {promptOpen && <PromptStudio initialPrompt={promptText} onClose={() => setPromptOpen(false)} onImport={(p) => {
      setPromptOpen(false); setWorkspace("create"); setView("pattern");
      setCompositionInput(p);
      notify("Image générée. Choisissez le niveau de composition avant d'utiliser le motif.");
    }} />}
    {compositionInput && (
      <ErrorBoundary label="Le moteur de composition" onReset={() => setCompositionInput(null)}>
        <CompositionStudio
          pattern={compositionInput}
          onCancel={() => setCompositionInput(null)}
          onUse={p => {
            setCompositionInput(null);
            setWorkspace("create"); setView("pattern");
            void loadPattern(p);
            notify("Motif composé. La source reste dans le JSON ; contrôlez les détails avant de broder.");
          }}
        />
      </ErrorBoundary>
    )}
    {panel === "export" && <ExportStudio pattern={P} onClose={closePanel} />}
    <PeerShare open={panel === "share"} onClose={closePanel} pattern={store.present} onView={onRemote} />
    {remote && <button onClick={() => { window.dispatchEvent(new Event("pointzero:disconnect")); setRemote(null); }} className="glass fixed left-1/2 top-[78px] z-30 -translate-x-1/2 rounded-full px-4 py-2 text-[12px] text-accent-2">Lecture partagée · revenir à mon projet</button>}
    {toast && <div role="status" aria-live="polite" className="toast-in glass pointer-events-none fixed left-1/2 z-[80] max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-[14px] px-4 py-2.5 text-center text-[13px] font-medium" style={{ bottom: desktop ? 92 : 164 }}>{toast}</div>}
    <span className="sr-only">Direction B. {BASE_FLOSS.length} références DMC documentées. {FLOSS[color]?.name}.</span>
  </div>;
}