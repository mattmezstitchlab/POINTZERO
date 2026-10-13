import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { BASE_FLOSS, FLOSS, flossIndex } from "./lib/dmc";
import { blankPattern, initState, loadStored, reducer, saveStored } from "./lib/store";
import { buildTemplate } from "./lib/convert";
import { clonePattern, compositePattern, computeStats, createPattern, ensurePalette, type Pattern, type Supply } from "./lib/pattern";
import { readProjectFile, saveProjectFile } from "./lib/io";
import { fromOxs } from "./lib/oxs";
import { readInventory, saveLibrary, writeInventory } from "./lib/library";
import { clearSelection, extractSelection, pasteSelection, transformPart, type Selection } from "./lib/editing";
import { useMedia } from "./lib/useMedia";
import type { Tool } from "./lib/stitch";
import type { GuideChapter } from "./lib/guide";
import { runChecks } from "./lib/checks";
import Canvas, { type Insets, type ViewMode } from "./components/Canvas";
import Dock from "./components/Dock";
import TopBar from "./components/TopBar";
import PaletteSheet from "./components/PaletteSheet";
import FlossRail from "./components/FlossRail";
import Landing from "./components/Landing";
import WorkspacePanel, { DEFAULT_PREFS, type Preferences } from "./components/WorkspacePanel";
import LibrarySheet from "./components/LibrarySheet";
import SelectionBar from "./components/SelectionBar";
import ImportStudio from "./components/ImportStudio";
import PdfPrep from "./components/PdfPrep";
import PromptStudio from "./components/PromptStudio";
import ExportStudio from "./components/ExportStudio";
import ErrorBoundary from "./components/ErrorBoundary";
import VideoStudio from "./components/VideoStudio";
import PeerShare from "./components/PeerShare";

type Panel = "palette" | "project" | "library" | "studio" | "share" | "export" | null;
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
  const [screen, setScreen] = useState<"landing" | "editor">(() => window.location.hash === "#atelier" ? "editor" : "landing");
  const [boot] = useState(loadStored);
  const [store, dispatch] = useReducer(reducer, boot, (v) => initState(v ?? blankPattern()));
  const [demo, setDemo] = useState<Pattern | null>(null), [remote, setRemote] = useState<Pattern | null>(null);
  const P = demo ?? remote ?? store.present;
  const [tool, setTool] = useState<Tool>("cross"), [color, setColor] = useState(Math.max(0, flossIndex("3801"))), [view, setView] = useState<ViewMode>("real"), [workspace, setWorkspace] = useState<Workspace>("create");
  const [symbols, setSymbols] = useState(false), [panel, setPanel] = useState<Panel>(null), [file, setFile] = useState<File | null>(null), [pdfFile, setPdfFile] = useState<File | null>(null), [promptOpen, setPromptOpen] = useState(false), [selection, setSelection] = useState<Selection | null>(null), [clipboard, setClipboard] = useState<Pattern | null>(null);
  const [prefs, setPrefs] = useState(initialPreferences), [inventory, setInventory] = useState(readInventory), [saving, setSaving] = useState("Sauvegarde locale"), [busy, setBusy] = useState(""), [toast, setToast] = useState("");
  const [promptSeed, setPromptSeed] = useState("");
  const [fitKey, setFitKey] = useState(0), desktop = useMedia("(min-width: 1024px)");
  const ready = useRef(!!boot), templatePromise = useRef<Promise<Pattern> | null>(null), prevTool = useRef<Tool>("cross"), lastViews = useRef<{ create: ViewMode; stitch: ViewMode }>({ create: "real", stitch: "pattern" });
  const snapshot = useRef({ P, demo, remote, prefs, workspace, store }); snapshot.current = { P, demo, remote, prefs, workspace, store };
  const guideWorkspace = useRef<Workspace>("create");
  const checked = useRef(false);
  const notify = useCallback((msg: string) => setToast(msg), []);
  const closePanel = useCallback(() => setPanel(null), []);
  const insets: Insets = desktop ? { top: 76, right: 0, bottom: 86, left: 90 } : { top: 72, right: 0, bottom: 158, left: 0 };

  useEffect(() => {
    if ("serviceWorker" in navigator && (window.isSecureContext || window.location.hostname === "localhost")) {
      void navigator.serviceWorker.register(new URL("./sw.js", document.baseURI)).catch(() => undefined);
    }
  }, []);
  useEffect(() => {
    if (screen !== "editor" || checked.current) return;
    checked.current = true;
    const failures = runChecks().filter((v) => !v.ok);
    if (failures.length) notify(`Vérification du moteur : ${failures.length} anomalie(s). Consultez Réglages avant de travailler.`);
  }, [screen, notify]);

  const setPattern = useCallback((p: Pattern, quiet = false) => {
    if (snapshot.current.demo) setDemo(p);
    else if (snapshot.current.remote) notify("Lecture partagée : seul l’hôte modifie ce projet.");
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
    if (["mark", "details", "block", "row", "park", "unpick"].includes(next) && snapshot.current.workspace === "create") { setWorkspace("stitch"); setView("pattern"); }
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
    if (!demo && !remote) { setInventory(values); try { writeInventory(values); } catch { notify("Stock non sauvegardé : exportez votre JSON."); } }
    setPattern({ ...P, supplies: { ...P.supplies, [code]: supply } }, true);
  };
  const loadPattern = async (p: Pattern) => {
    if (!demo && !remote) { try { await saveLibrary(store.present, true); } catch { /* The explicit file backup remains available. */ } }
    const next = { ...p, supplies: { ...p.supplies, ...inventory } };
    if (demo) setDemo(next); else { setRemote(null); dispatch({ type: "load", pattern: next }); ready.current = true; }
    setSelection(null); setFitKey((k) => k + 1); setColor(next.palette[0] ?? flossIndex("3801")); closePanel(); setFile(null);
  };

  useEffect(() => {
    const sync = () => setScreen(window.location.hash === "#atelier" ? "editor" : "landing");
    window.addEventListener("hashchange", sync); window.addEventListener("popstate", sync);
    return () => { window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); };
  }, []);
  useEffect(() => {
    document.title = screen === "landing" ? "Point Zéro | De l’image au dernier point" : `${P.name} | Point Zéro B`;
  }, [P.name, screen]);
  useEffect(() => {
    try { localStorage.setItem("point-zero:preferences", JSON.stringify(prefs)); } catch { /* Optional preferences do not block the editor. */ }
  }, [prefs]);
  useEffect(() => {
    if (screen !== "editor" || ready.current) return;
    let live = true; setBusy("Préparation du modèle…");
    if (!templatePromise.current) templatePromise.current = buildTemplate("roses");
    templatePromise.current.then((p) => {
      if (!live || ready.current) return;
      ready.current = true; p.provenance = { kind: "demo", source: "Illustration originale générée, convertie en points", author: "Point Zéro", license: "Modèle de démonstration", personalOnly: false };
      dispatch({ type: "load", pattern: { ...p, supplies: inventory } }); setColor(p.palette[0] ?? color); setFitKey((k) => k + 1);
    }).catch(() => { if (live) { ready.current = true; notify("Modèle indisponible. Une grille vide reste utilisable."); } }).finally(() => { if (live) setBusy(""); });
    return () => { live = false; };
  }, [screen]);
  useEffect(() => {
    if (!ready.current || demo || remote) return;
    const timer = window.setTimeout(() => {
      setSaving("Sauvegarde en cours…");
      const local = saveStored(store.present);
      saveLibrary(store.present).then(() => setSaving("Sauvegardé sur cet appareil")).catch(() => { setSaving(local ? "Copie locale sauvegardée" : "Sauvegarde indisponible : exporter le JSON"); if (!local) notify("Stockage local indisponible. Sauvegardez le projet en JSON."); });
    }, 650);
    return () => clearTimeout(timer);
  }, [store.present, demo, remote, notify]);
  useEffect(() => {
    const flush = () => { if (!snapshot.current.demo && !snapshot.current.remote) saveStored(snapshot.current.store.present); };
    window.addEventListener("pagehide", flush); return () => window.removeEventListener("pagehide", flush);
  }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 4000); return () => clearTimeout(t); } }, [toast]);

  useEffect(() => {
    if (workspace !== "stitch" || screen !== "editor" || demo || remote) return;
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
  }, [workspace, screen, !!demo, !!remote]);
  useEffect(() => {
    if (workspace !== "stitch" || screen !== "editor" || !prefs.keepAwake || !navigator.wakeLock) return;
    let lock: WakeLockSentinel | null = null, stopped = false;
    const request = async () => { if (document.hidden) return; try { const result = await navigator.wakeLock.request("screen"); if (stopped) void result.release(); else lock = result; } catch { /* Power-saving policies can deny the request. */ } };
    void request(); document.addEventListener("visibilitychange", request);
    return () => { stopped = true; void lock?.release(); document.removeEventListener("visibilitychange", request); };
  }, [workspace, screen, prefs.keepAwake]);

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
      if (screen !== "editor" || (e.target as HTMLElement)?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (!demo && !remote) dispatch({ type: e.shiftKey ? "redo" : "undo" }); return; }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (KEYS[key]) chooseTool(KEYS[key]);
      else if (key === "p") { if (workspace === "stitch") chooseTool("park"); else setPanel("palette"); }
      else if (key === "f") setPanel("palette");
      else if (key === "t") setView((v) => v === "real" ? "flat" : v === "flat" ? "pattern" : "real");
      else if (key === "escape") { closePanel(); setSelection(null); }
    };
    window.addEventListener("keydown", keys); return () => window.removeEventListener("keydown", keys);
  }, [screen, chooseTool, demo, remote, workspace, closePanel]);

  const panelActions = {
    importFile: (f: File) => {
      closePanel();
      if (/\.pdf$/i.test(f.name) || f.type === "application/pdf") setPdfFile(f);
      else setFile(f);
    },
    openFile: async (f: File) => {
      try { const p = /\.oxs$/i.test(f.name) ? fromOxs(await f.text()) : await readProjectFile(f); if (!p) throw new Error("Projet invalide ou ancienne version sans table de codes fiable"); await loadPattern(p); notify(`« ${p.name} » ouvert`); } catch (e) { notify(e instanceof Error ? e.message : "Impossible d’ouvrir ce fichier"); }
    },
    export: () => setPanel("export" as Panel), save: () => { saveProjectFile(P); notify("Fichier projet téléchargé"); },
    new: (w: number, h: number) => { try { const next = createPattern("Nouveau motif", w, h, P.count, P.strands); next.fabric = P.fabric; void loadPattern(next); } catch (e) { notify(e instanceof Error ? e.message : "Dimensions invalides"); } },
    library: () => setPanel("library" as Panel), studio: () => setPanel("studio" as Panel), share: () => setPanel("share" as Panel), prompt: () => { closePanel(); setPromptOpen(true); }, notify,
  };

  const beginGuide = () => {
    guideWorkspace.current = workspace; setDemo({ ...clonePattern(store.present), name: `${store.present.name} · Démonstration` }); setRemote(null); setWorkspace("create"); setView("real"); setTool("cross"); setSelection(null);
  };
  const endGuide = () => { window.dispatchEvent(new CustomEvent("pointzero:floss", { detail: { idx: null } })); setFile(null); setDemo(null); setWorkspace(guideWorkspace.current); setView(guideWorkspace.current === "stitch" ? "pattern" : "real"); setTool(guideWorkspace.current === "stitch" ? "mark" : "cross"); setPanel("studio"); setFitKey((k) => k + 1); };
  const guideChapter = (c: GuideChapter) => {
    window.dispatchEvent(new CustomEvent("pointzero:floss", { detail: { idx: null } }));
    if (c.id === "welcome") { closePanel(); setView("real"); setFitKey((k) => k + 1); }
    if (c.id === "create") {
      closePanel(); setWorkspace("create"); setTool("cross");
      const p = clonePattern(snapshot.current.demo ?? store.present), idx = p.palette[0] ?? flossIndex("321");
      for (let x = 3; x < Math.min(11, p.w); x++) p.cross[3 * p.w + x] = idx;
      ensurePalette(p, idx); setDemo(p);
      window.dispatchEvent(new CustomEvent("pointzero:canvas", { detail: { action: "focus", x: 8, y: 6, scale: 24 } }));
    }
    if (c.id === "floss") { closePanel(); setView("flat"); const idx = snapshot.current.P.palette[0] ?? flossIndex("321"); setColor(idx); window.setTimeout(() => window.dispatchEvent(new CustomEvent("pointzero:floss", { detail: { idx } })), 200); window.dispatchEvent(new CustomEvent("pointzero:canvas", { detail: { action: "fit" } })); }
    if (c.id === "stitch") {
      closePanel(); setWorkspace("stitch"); setView("pattern"); setTool("block");
      const p = clonePattern(snapshot.current.demo ?? store.present), idx = p.palette[0] ?? color;
      let n = 0; for (let i = 0; i < p.cross.length && n < 80; i++) if (p.cross[i] === idx) { p.done[i] = 1; n++; }
      setDemo(p); setColor(idx);
    }
    if (c.id === "prepare") setPanel("project");
    if (c.id === "import") {
      closePanel();
      const source = compositePattern(snapshot.current.demo ?? store.present);
      const excerpt = extractSelection(source, { x: 0, y: 0, w: Math.min(80, source.w), h: Math.min(80, source.h) });
      excerpt.name = "Patron de démonstration";
      void import("./lib/pdf").then(({ buildPdf }) => buildPdf(excerpt, { bw: true })).then((blob) => {
        if (snapshot.current.demo) setFile(new File([blob], "guide--patron-point-zero.pdf", { type: "application/pdf" }));
      }).catch(() => notify("L’aperçu PDF de démonstration est indisponible sur cet appareil."));
    }
    if (c.id === "export") { setFile(null); setPanel("export"); window.setTimeout(() => window.dispatchEvent(new Event("pointzero:export-preview")), 400); }
  };
  const openEditor = () => { window.location.hash = "atelier"; setScreen("editor"); };
  const openLanding = () => { if (demo) { notify("Terminez la visite avant de quitter l’atelier."); return; } window.dispatchEvent(new Event("pointzero:disconnect")); setRemote(null); closePanel(); history.pushState(null, "", window.location.pathname + window.location.search); setScreen("landing"); window.scrollTo(0, 0); };
  const onRemote = useCallback((p: Pattern | null) => { setRemote(p); if (p) { setWorkspace("stitch"); setView("pattern"); setTool("hand"); setColor((c) => p.palette.includes(c) ? c : p.palette[0] ?? 0); } }, []);

  if (screen === "landing")
    return (
      <Landing
        onOpen={openEditor}
        onGuide={() => {
          openEditor();
          setPanel("studio");
        }}
        onPrompt={(text) => {
          openEditor();
          setPromptSeed(text);
          setPromptOpen(true);
        }}
      />
    );
  return <div className={`fixed inset-0 h-[100dvh] w-full overflow-hidden bg-black ${prefs.largeText ? "large-text" : ""} ${prefs.highContrast ? "high-contrast" : ""}`}>
    <Canvas pattern={P} tool={remote ? "hand" : tool} color={color} view={view} symbols={symbols} highlightActive={workspace === "stitch"} insets={insets} fitKey={fitKey} onlyActive={prefs.onlyActive} highContrast={prefs.highContrast} pencilOnly={prefs.pencilOnly} symmetry={prefs.symmetry} annotation={prefs.annotation} readOnly={!!remote} selection={selection} halfDirection={prefs.halfDirection}
      onSelection={setSelection} onBegin={() => { if (!demo && !remote) dispatch({ type: "begin" }); }}
      onLive={(p) => { if (demo) setDemo(p); else if (!remote) dispatch({ type: "live", pattern: p }); }}
      onEnd={(changed) => { if (!demo && !remote) dispatch({ type: "end", changed }); }}
      onPick={(idx) => { setColor(idx); if (tool === "pick") setTool(prevTool.current); }} />
    <TopBar pattern={P} onHome={openLanding} workspace={workspace} onWorkspace={chooseWorkspace} canUndo={!demo && !remote && store.past.length > 0 && !store.pending} canRedo={!demo && !remote && store.future.length > 0 && !store.pending} onUndo={() => dispatch({ type: "undo" })} onRedo={() => dispatch({ type: "redo" })} symbols={symbols} onSymbols={() => setSymbols((v) => !v)} view={view} onView={setView} onFit={() => setFitKey((k) => k + 1)} projectOpen={panel === "project"} onProject={() => setPanel(panel === "project" ? null : "project")} onLibrary={() => setPanel("library")} onStudio={() => setPanel("studio")} saving={saving} />
    <Dock tool={remote ? "hand" : tool} onTool={chooseTool} color={color} workspace={workspace} />
    {selection && workspace === "create" && !remote && <SelectionBar selection={selection} hasClipboard={!!clipboard} onAction={selectionAction} />}
    <FlossRail pattern={P} active={color} onActive={pickColor} onPattern={(p) => setPattern(p)} onSupply={updateSupply} onBrowse={() => setPanel("palette")} stitching={workspace === "stitch"} hidden={panel !== null || !!file} />
    <PaletteSheet open={panel === "palette"} onClose={closePanel} pattern={P} color={color} onPick={pickColor} />
    <WorkspacePanel open={panel === "project"} onClose={closePanel} pattern={P} onSet={setPattern} actions={panelActions} prefs={prefs} onPrefs={setPrefs} onTool={chooseTool} tool={tool} color={color} onColor={(idx) => setColor(idx)} workspace={workspace} />
    <LibrarySheet open={panel === "library"} onClose={closePanel} onLoad={(p) => void loadPattern(p)} onNew={() => panelActions.new(80, 80)} inventory={inventory} />
    {file && <ImportStudio file={file} onClose={() => setFile(null)} onImport={(p) => { void loadPattern(p); setWorkspace("create"); setView("pattern"); notify("Import contrôlé validé. Vérifiez le patron avant de commencer."); }} />}
    {pdfFile && (
      <ErrorBoundary label="La préparation du PDF" onReset={() => setPdfFile(null)}>
        <PdfPrep
          file={pdfFile}
          onClose={() => setPdfFile(null)}
          onImport={(p) => {
            setPdfFile(null);
            void loadPattern(p);
            setWorkspace("create");
            setView("pattern");
            notify("Patron reconstitué en une grille. Vérifiez le calage avant de commencer.");
          }}
        />
      </ErrorBoundary>
    )}
    {promptOpen && <PromptStudio initialPrompt={promptSeed} onClose={() => setPromptOpen(false)} onImport={(p) => { setPromptOpen(false); void loadPattern(p); setWorkspace("create"); setView("pattern"); notify("Motif généré. Vérifiez les couleurs avant de commencer."); }} />}
    {panel === "export" && <ExportStudio pattern={P} onClose={closePanel} />}
    <VideoStudio open={panel === "studio"} onClose={closePanel} onBegin={beginGuide} onEnd={endGuide} onChapter={guideChapter} />
    <PeerShare open={panel === "share"} onClose={closePanel} pattern={store.present} onView={onRemote} />
    {remote && <button onClick={() => { window.dispatchEvent(new Event("pointzero:disconnect")); setRemote(null); }} className="glass fixed left-1/2 top-[78px] z-30 -translate-x-1/2 rounded-full px-4 py-2 text-[12px] text-accent-2">Lecture partagée · revenir à mon projet</button>}
    {toast && <div role="status" aria-live="polite" className="toast-in glass pointer-events-none fixed left-1/2 z-[80] max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-[14px] px-4 py-2.5 text-center text-[13px] font-medium" style={{ bottom: desktop ? 92 : 164 }}>{toast}</div>}
    {busy && <div className="fixed inset-0 z-[90] grid place-items-center bg-black/35" role="status" aria-busy="true"><div className="glass-strong flex items-center gap-3 rounded-[20px] px-5 py-4 text-[15px]"><span className="spinner" />{busy}</div></div>}
    <span className="sr-only">Direction B. {BASE_FLOSS.length} références DMC documentées. {FLOSS[color]?.name}.</span>
  </div>;
}