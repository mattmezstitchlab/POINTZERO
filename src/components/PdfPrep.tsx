import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { ArrowLeft, Check, Grid3x3, Magnet, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { FLOSS } from "../lib/dmc";
import {
  analyzePdf,
  convertBlockAuto,
  convertBlockColor,
  fitGrid,
  SymbolRegistry,
  type PdfAnalysis,
  type PdfBlock,
} from "../lib/pdfAnalysis";
import { readVectorChart, type VectorResult } from "../lib/pdfVector";
import type { PdfHandle } from "../lib/pdfimport";
import { createPattern, ensurePalette, type Pattern } from "../lib/pattern";

const STAGES = ["Analyse", "Calage", "Grille & Montage"] as const;
type Mode = "vecteur" | "auto" | "photo";

interface CachedBlock {
  cells: Int16Array;
  byColor: number;
  byLegend: number;
  unresolved: number;
}
interface Placed {
  b: PdfBlock;
  data: CachedBlock;
}
interface Assembled {
  pattern: Pattern;
  rawW: number;
  rawH: number;
  fitW: number;
  fitH: number;
  scaled: boolean;
  blocks: number;
  byColor: number;
  byLegend: number;
  unresolved: number;
  source: "vecteur" | "image";
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const keyOf = (b: PdfBlock, mode: Mode, colors: number) =>
  `${mode}|${colors}|${b.id}|${b.page}|${b.x0.toFixed(2)},${b.y0.toFixed(2)},${b.x1.toFixed(2)},${b.y1.toFixed(2)}|${b.cols}x${b.rows}`;

export default function PdfPrep({
  file,
  onClose,
  onImport,
  embedded = false,
  echelleMonde = 1,
}: {
  file: File;
  onClose: () => void;
  onImport: (p: Pattern) => void;
  /** Intégré dans la landing : s'affiche dans le flux de la page au lieu d'occuper tout l'écran. */
  embedded?: boolean;
  /** Posé sur la toile zoomée : les deltas de souris arrivent déjà zoomés. */
  echelleMonde?: number;
}) {
  /* En mode intégré, le panneau a une hauteur fixe et défile : sans cela, il
     faut chercher le bouton pour continuer, ce qui ne fait pas professionnel.
     L'action primaire de chaque étape reste donc collée en bas du défilement. */
  const stick = embedded
    ? "sticky bottom-0 z-10 rounded-[14px] bg-[#0e0e11]/95 shadow-[0_-12px_32px_rgba(0,0,0,.55)] backdrop-blur-md"
    : "";
  const [analysis, setAnalysis] = useState<PdfAnalysis | null>(null);
  const [handle, setHandle] = useState<PdfHandle | null>(null);
  const [vector, setVector] = useState<VectorResult | null>(null);
  const [stage, setStage] = useState(0);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [pageN, setPageN] = useState(1);
  const [blocks, setBlocks] = useState<PdfBlock[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [excluded] = useState<Set<string>>(new Set());
  const [perRow, setPerRow] = useState(3);
  const [mode, setMode] = useState<Mode>("auto");
  const [colors, setColors] = useState(24);
  const [assembled, setAssembled] = useState<Assembled | null>(null);
  const [author, setAuthor] = useState("");
  const [authorized, setAuthorized] = useState(false);

  // Vue centrale au stade 2 : Puzzle tactile ou Aperçu broderie unifiée
  const [centerTab, setCenterTab] = useState<"puzzle" | "preview">("puzzle");
  // Puzzle manuel : positions en coordonnées de points de grille (x, y en cases)
  const [manualPositions, setManualPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [uniformSizes, setUniformSizes] = useState(true);
  const [magnet, setMagnet] = useState(true);
  const [zoom, setZoom] = useState(1);

  const handleRef = useRef<PdfHandle | null>(null);
  const registry = useRef(new SymbolRegistry());
  const cache = useRef(new Map<string, CachedBlock>());
  const tableRef = useRef<HTMLDivElement>(null);

  // Drag state sur la grande table de montage
  const dragInfo = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    startTileX: number;
    startTileY: number;
    tileW: number;
    tileH: number;
  } | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [snapGuides, setSnapGuides] = useState<{ x?: number; y?: number } | null>(null);

  /* ------------------------- Chargement et analyse ------------------------- */

  useEffect(() => {
    let live = true;
    setBusy("Analyse du PDF…");
    analyzePdf(file, (m) => {
      if (live) setBusy(m);
    })
      .then(async ({ analysis: a, handle: h }) => {
        if (!live) {
          h.destroy();
          return;
        }
        handleRef.current = h;
        setHandle(h);
        setAnalysis(a);
        setAuthor(a.author);
        a.legend.forEach((e) => registry.current.addKnown(e.bits, e.code));
        const pages = a.pages.filter((p) => p.kind === "chart");
        const chart = pages.flatMap((p) => p.blocks);
        setBlocks(chart);
        setOrder(autoOrder(chart).map((b) => b.id));

        // Détection du nombre de colonnes de la mosaïque (3 colonnes par défaut pour les patrons comme BeeL)
        const suggestedPerRow = a.modelAspect >= 1.2 ? 4 : a.modelAspect <= 0.7 ? 2 : 3;
        setPerRow(Math.min(suggestedPerRow, Math.max(1, chart.length)));

        if (pages[0]) setPageN(pages[0].n);
        const initialBoxes = new Map<number, { x0: number; y0: number; x1: number; y1: number }[]>();
        for (const b of chart) {
          const list = initialBoxes.get(b.page) ?? [];
          list.push({ x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 });
          initialBoxes.set(b.page, list);
        }
        setBusy("Lecture du texte et de la numérotation…");
        const v = await readVectorChart(h, initialBoxes);
        if (!live) return;
        setVector(v);
        setMode(v.ok ? "vecteur" : "auto");
        setBusy("");
      })
      .catch((e) => {
        if (live) {
          setError(e instanceof Error ? e.message : "PDF illisible");
          setBusy("");
        }
      });
    return () => {
      live = false;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, [file]);

  const page = analysis?.pages.find((p) => p.n === pageN);
  const pageBlocks = blocks.filter((b) => b.page === pageN);
  const byId = useMemo(() => new Map(blocks.map((b) => [b.id, b])), [blocks]);
  const effective = useMemo(
    () => order.map((id) => byId.get(id)).filter((b): b is PdfBlock => !!b && !excluded.has(b.id)),
    [order, byId, excluded],
  );

  // Dimensions uniformisées calculées (médianes) pour éviter les décalages de rangées
  const uniformDim = useMemo(() => {
    if (!effective.length) return { cols: 50, rows: 60 };
    const cols = [...effective.map((b) => b.cols)].sort((a, b) => a - b);
    const rows = [...effective.map((b) => b.rows)].sort((a, b) => a - b);
    return {
      cols: cols[cols.length >> 1] || 50,
      rows: rows[rows.length >> 1] || 60,
    };
  }, [effective]);

  // Largeur et hauteur d'un bloc (uniformisées ou réelles)
  const blockW = (b: PdfBlock) => (uniformSizes ? uniformDim.cols : b.cols);
  const blockH = (b: PdfBlock) => (uniformSizes ? uniformDim.rows : b.rows);

  // Mosaïque ordonnée par défaut (pages dans l'ordre numérique, rangées régulières)
  const defaultMosaic = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    let col = 0;
    let row = 0;
    effective.forEach((b, i) => {
      if (i > 0 && i % perRow === 0) {
        col = 0;
        row++;
      }
      const x = col * (uniformSizes ? uniformDim.cols : b.cols);
      const y = row * (uniformSizes ? uniformDim.rows : b.rows);
      map[b.id] = { x, y };
      col++;
    });
    return map;
  }, [effective, perRow, uniformSizes, uniformDim]);

  // Position effective de chaque bloc sur la table de montage
  const tileLayout = useMemo(() => {
    return effective.map((b) => {
      const pos = manualPositions[b.id] ?? defaultMosaic[b.id] ?? { x: 0, y: 0 };
      return {
        b,
        x: pos.x,
        y: pos.y,
        w: blockW(b),
        h: blockH(b),
      };
    });
  }, [effective, manualPositions, defaultMosaic, uniformSizes, uniformDim]);

  // Dimensions totales du plateau en points de broderie
  const boardSize = useMemo(() => {
    if (!tileLayout.length) return { w: 100, h: 100 };
    const maxX = Math.max(...tileLayout.map((t) => t.x + t.w));
    const maxY = Math.max(...tileLayout.map((t) => t.y + t.h));
    return { w: Math.max(10, maxX), h: Math.max(10, maxY) };
  }, [tileLayout]);

  /* ------------------- Drag & Drop Magnétique sur la Table Centrale ------------------- */

  // Échelle d'affichage pixels / point de grille sur le tableau central
  const tableScale = useMemo(() => {
    // Le plateau fait typiquement 600px de haut
    const maxPxW = 780;
    const maxPxH = 560;
    const sX = maxPxW / boardSize.w;
    const sY = maxPxH / boardSize.h;
    return Math.max(0.3, Math.min(2.5, Math.min(sX, sY) * zoom));
  }, [boardSize, zoom]);

  const onPointerDownTile = (e: RPointerEvent, b: PdfBlock) => {
    e.preventDefault();
    e.stopPropagation();
    const t = tileLayout.find((item) => item.b.id === b.id);
    if (!t) return;
    dragInfo.current = {
      id: b.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startTileX: t.x,
      startTileY: t.y,
      tileW: t.w,
      tileH: t.h,
    };
    setActiveDragId(b.id);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMoveTile = (e: RPointerEvent) => {
    const drag = dragInfo.current;
    if (!drag) return;
    e.preventDefault();
    const deltaClientX = e.clientX - drag.startClientX;
    const deltaClientY = e.clientY - drag.startClientY;

    // Déplacement en points de grille
    const deltaGridX = Math.round(deltaClientX / (tableScale * echelleMonde));
    const deltaGridY = Math.round(deltaClientY / (tableScale * echelleMonde));

    let newX = Math.max(0, drag.startTileX + deltaGridX);
    let newY = Math.max(0, drag.startTileY + deltaGridY);

    // Aimantage magnétique aux bords des autres blocs
    if (magnet) {
      const snapDist = Math.max(4, Math.round(14 / (tableScale * echelleMonde))); // ~14px réels d'attraction
      let snappedX: number | undefined;
      let snappedY: number | undefined;

      const otherTiles = tileLayout.filter((t) => t.b.id !== drag.id);
      for (const o of otherTiles) {
        // Aimantage horizontal : bord gauche colle au bord droit d'un voisin
        if (Math.abs(newX - (o.x + o.w)) <= snapDist) {
          newX = o.x + o.w;
          snappedX = newX;
        }
        // Bord droit colle au bord gauche d'un voisin
        else if (Math.abs(newX + drag.tileW - o.x) <= snapDist) {
          newX = o.x - drag.tileW;
          snappedX = o.x;
        }
        // Alignement des bords gauches
        else if (Math.abs(newX - o.x) <= snapDist) {
          newX = o.x;
          snappedX = newX;
        }

        // Aimantage vertical : bord haut colle au bord bas d'un voisin
        if (Math.abs(newY - (o.y + o.h)) <= snapDist) {
          newY = o.y + o.h;
          snappedY = newY;
        }
        // Bord bas colle au bord haut d'un voisin
        else if (Math.abs(newY + drag.tileH - o.y) <= snapDist) {
          newY = o.y - drag.tileH;
          snappedY = o.y;
        }
        // Alignement des bords hauts
        else if (Math.abs(newY - o.y) <= snapDist) {
          newY = o.y;
          snappedY = newY;
        }
      }

      // Aimantage à l'origine (0, 0)
      if (newX <= snapDist) {
        newX = 0;
        snappedX = 0;
      }
      if (newY <= snapDist) {
        newY = 0;
        snappedY = 0;
      }

      setSnapGuides(snappedX !== undefined || snappedY !== undefined ? { x: snappedX, y: snappedY } : null);
    } else {
      setSnapGuides(null);
    }

    setManualPositions((prev) => ({
      ...prev,
      [drag.id]: { x: Math.max(0, newX), y: Math.max(0, newY) },
    }));
  };

  const onPointerUpTile = (e: RPointerEvent) => {
    if (!dragInfo.current) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    dragInfo.current = null;
    setActiveDragId(null);
    setSnapGuides(null);
  };

  const arrangeMosaic = (cols: number) => {
    setPerRow(cols);
    const map: Record<string, { x: number; y: number }> = {};
    let c = 0;
    let r = 0;
    effective.forEach((b, i) => {
      if (i > 0 && i % cols === 0) {
        c = 0;
        r++;
      }
      const x = c * (uniformSizes ? uniformDim.cols : b.cols);
      const y = r * (uniformSizes ? uniformDim.rows : b.rows);
      map[b.id] = { x, y };
      c++;
    });
    setManualPositions(map);
  };

  const resetToDefault = () => {
    setManualPositions({});
  };

  /* ------------------- Assemblage final vers Pattern ------------------- */

  const sig = effective.map((b) => keyOf(b, mode, colors)).join("|");
  const layoutSig = tileLayout.map((t) => `${t.b.id}:${t.x},${t.y},${t.w},${t.h}`).join("|");

  useEffect(() => {
    if (stage !== 2 || !handle || !analysis) return;
    let dead = false;
    (async () => {
      try {
        if (!effective.length) {
          setAssembled(null);
          setError("Aucun bloc inclus.");
          return;
        }
        setError("");
        for (let i = 0; i < effective.length; i++) {
          const b = effective[i];
          const key = keyOf(b, mode, colors);
          if (cache.current.has(key)) continue;
          setBusy(`Lecture du bloc ${i + 1}/${effective.length} · page ${b.page}`);
          await tick();
          const v =
            mode === "auto"
              ? await convertBlockAuto(handle, b.page, b, registry.current)
              : await convertBlockColor(handle, b.page, b, colors);
          if (dead) return;
          cache.current.set(
            key,
            "byColor" in v ? v : { cells: v.cells, byColor: v.cells.filter((x) => x >= 0).length, byLegend: 0, unresolved: 0 },
          );
        }
        if (dead) return;

        // Assemblage des blocs aux coordonnées calculées par la table magnétique
        const placed: Placed[] = effective.map((b) => ({
          b,
          data: cache.current.get(keyOf(b, mode, colors)) as CachedBlock,
        }));

        setAssembled(assembleFromTileLayout(placed, tileLayout, analysis.title));
      } catch (e) {
        if (!dead) setError(e instanceof Error ? e.message : "Assemblage impossible");
      } finally {
        if (!dead) setBusy("");
      }
    })();
    return () => {
      dead = true;
    };
  }, [stage, handle, analysis, sig, layoutSig, mode, colors]);

  const preview = useMemo(() => (assembled ? renderPreview(assembled.pattern) : ""), [assembled]);

  const commit = () => {
    if (!assembled) return;
    const p = assembled.pattern;
    p.provenance = {
      kind: "pdf",
      source: file.name,
      author: author.trim(),
      license: authorized ? "Droits de redistribution déclarés" : "Usage personnel uniquement",
      personalOnly: !authorized,
    };
    p.notes = `PDF reconstitué : ${assembled.blocks} blocs assemblés en mosaïque magnétique (${assembled.fitW} × ${assembled.fitH} pts).`;
    onImport(p);
  };

  return (
    <div
      className={`glass-strong flex flex-col overflow-hidden bg-[#0e0e11] ${
        embedded ? "h-[860px] w-full rounded-[26px] ring-1 ring-white/10" : "fixed inset-0 z-[75]"
      }`}
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3">
        {!embedded && (
          <button className="btn-icon" onClick={onClose} disabled={!!busy} aria-label="Retour">
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-[16px] font-semibold">Préparation du patron PDF</h2>
          <p className="truncate text-[12px] text-label-3">
            {file.name}
            {analysis ? ` · ${analysis.pages.length} pages` : ""}
            {stage === 2 && ` · Plateau ${boardSize.w} × ${boardSize.h} pts`}
          </p>
        </div>
        <ol className="ml-auto hidden gap-1 md:flex">
          {STAGES.map((l, i) => (
            <li key={l}>
              <button
                disabled={i > stage || !!busy}
                onClick={() => i < stage && setStage(i)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] ${
                  i === stage ? "bg-accent text-white" : i < stage ? "text-accent-2" : "text-label-3"
                }`}
              >
                <span className="grid h-4 w-4 place-items-center rounded-full bg-white/10 text-[10px]">
                  {i < stage ? <Check size={10} /> : i + 1}
                </span>
                {l}
              </button>
            </li>
          ))}
        </ol>
      </header>

      <main className="thin-scroll min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        {error && <p role="alert" className="mb-4 rounded-[12px] bg-white/5 px-4 py-3 text-[13px] leading-relaxed text-label-2">{error}</p>}

        {/* Étape 1 : Analyse initiale */}
        {stage === 0 && analysis && (
          <section className="mx-auto max-w-[860px]">
            <h3 className="text-[15px] font-semibold">Pages analysées</h3>
            <p className="mt-1 text-[13px] text-label-2">
              {analysis.pages.filter((p) => p.kind === "chart").length} page(s) de grille · {blocks.length} bloc(s) détecté(s) · modèle couleur au format {analysis.modelAspect.toFixed(2)}
              {vector?.ok ? " · texte vectoriel disponible" : ""}.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {analysis.pages.map((p) => (
                <button
                  key={p.n}
                  className="overflow-hidden rounded-[12px] bg-white/5 text-left transition-transform hover:scale-[1.02]"
                  onClick={() => {
                    setPageN(p.n);
                    setStage(1);
                  }}
                >
                  <img src={p.thumb} className="aspect-[1/1.1] w-full object-cover" alt={`Page ${p.n}`} />
                  <span className="flex justify-between px-2 py-1.5 text-[11px]">
                    Page {p.n}
                    <span className={p.kind === "chart" ? "text-accent-2" : "text-label-3"}>
                      {p.kind === "chart" ? "Grille" : p.kind === "legend" ? "Légende" : p.kind === "cover" ? "Couverture" : "Autre"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <button className={`btn-primary mt-6 w-full ${embedded ? "sticky bottom-0 z-10 shadow-[0_-12px_32px_rgba(0,0,0,.55)]" : ""}`} onClick={() => setStage(1)}>
              Continuer vers le calage
            </button>
          </section>
        )}

        {/* Étape 2 : Calage par page */}
        {stage === 1 && analysis && page && (
          <section className="mx-auto flex max-w-[1100px] flex-col gap-4 lg:flex-row">
            <div className="lg:w-[58%]">
              <div className="mb-2 flex flex-wrap gap-1">
                {analysis.pages.map((p) => (
                  <button
                    key={p.n}
                    onClick={() => setPageN(p.n)}
                    className={`rounded-full px-2.5 py-1 text-[12px] ${p.n === pageN ? "bg-accent text-white" : "bg-white/5 text-label-2"}`}
                  >
                    {p.n}
                    {p.kind === "chart" && " ✓"}
                  </button>
                ))}
              </div>
              <div
                className="relative touch-none select-none overflow-hidden rounded-[14px] bg-white shadow-2xl"
                style={{ aspectRatio: `1 / ${page.aspect}` }}
              >
                <img src={page.thumb} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-fill" draggable={false} />
                {pageBlocks.map((b) => (
                  <div key={b.id}>
                    <div
                      className="pointer-events-none absolute border-2 border-accent bg-accent/15"
                      style={{ left: `${b.x0}%`, top: `${b.y0}%`, width: `${b.x1 - b.x0}%`, height: `${b.y1 - b.y0}%` }}
                    />
                    <span
                      className="pointer-events-none absolute z-10 rounded bg-accent px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white"
                      style={{ left: `${b.x0}%`, top: `calc(${b.y0}% - 18px)` }}
                    >
                      P.{b.page} · {b.cols}×{b.rows}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <aside className="lg:w-[42%]">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[15px] font-semibold">Blocs de la page {pageN}</h3>
              </div>
              <div className="space-y-2">
                {pageBlocks.map((b, i) => (
                  <div key={b.id} className="flex items-center gap-2 rounded-[12px] bg-white/5 px-3 py-2">
                    <span className="text-[12px] font-medium">Bloc {i + 1}</span>
                    <input
                      type="number"
                      className="field ml-auto w-[62px] min-h-[32px] text-[12px]"
                      value={b.cols}
                      onChange={(e) =>
                        setBlocks((all) => all.map((v) => (v.id === b.id ? { ...v, cols: clampInt(e.target.value, 5, 400, v.cols) } : v)))
                      }
                      aria-label="Colonnes"
                    />
                    <span>×</span>
                    <input
                      type="number"
                      className="field w-[62px] min-h-[32px] text-[12px]"
                      value={b.rows}
                      onChange={(e) =>
                        setBlocks((all) => all.map((v) => (v.id === b.id ? { ...v, rows: clampInt(e.target.value, 5, 400, v.rows) } : v)))
                      }
                      aria-label="Rangées"
                    />
                  </div>
                ))}
              </div>
              <div className={`mt-4 flex gap-2 ${stick}`}>
                <button className="btn-quiet flex-1" onClick={() => setStage(0)}>
                  Retour
                </button>
                <button className="btn-primary flex-1" disabled={!effective.length} onClick={() => setStage(2)}>
                  Monter le puzzle →
                </button>
              </div>
            </aside>
          </section>
        )}

        {/* Étape 3 : LE GRAND TABLEAU DE MONTAGE MAGNÉTIQUE AU CENTRE */}
        {stage === 2 && (
          <section className="mx-auto flex h-[calc(100vh-140px)] max-w-[1400px] flex-col gap-4 lg:flex-row">
            {/* Colonne centrale : le puzzle magnétique ou l'aperçu broderie */}
            <div className="flex min-w-0 flex-1 flex-col">
              {/* Barre de commutation de vue centrale */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="seg" role="group" aria-label="Affichage central">
                  <button
                    type="button"
                    aria-pressed={centerTab === "puzzle"}
                    onClick={() => setCenterTab("puzzle")}
                    className="flex items-center gap-1.5 px-3 py-1.5"
                  >
                    <Grid3x3 size={15} />
                    Table de montage magnétique (Puzzle)
                  </button>
                  <button
                    type="button"
                    aria-pressed={centerTab === "preview"}
                    onClick={() => setCenterTab("preview")}
                    className="flex items-center gap-1.5 px-3 py-1.5"
                  >
                    Aperçu broderie unifiée
                  </button>
                </div>

                {centerTab === "puzzle" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="btn-icon h-8 w-8"
                      onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
                      aria-label="Zoom arrière"
                    >
                      <ZoomOut size={15} />
                    </button>
                    <span className="font-mono text-[11px] text-label-3">{Math.round(zoom * 100)}%</span>
                    <button
                      type="button"
                      className="btn-icon h-8 w-8"
                      onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
                      aria-label="Zoom avant"
                    >
                      <ZoomIn size={15} />
                    </button>
                    <span className="mx-1 h-4 w-px bg-white/10" />
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={resetToDefault}
                      title="Réaligner tous les blocs en mosaïque"
                    >
                      <Undo2 size={13} />
                      Réaligner
                    </button>
                  </div>
                )}
              </div>

              {/* Vue 1 : LA TABLE DE MONTAGE MAGNÉTIQUE CENTRALE */}
              {centerTab === "puzzle" && (
                <div
                  ref={tableRef}
                  className="relative flex flex-1 items-center justify-center overflow-auto rounded-[18px] border border-white/10 bg-[#161619] p-4 shadow-2xl"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px), radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)",
                    backgroundSize: "24px 24px, 12px 12px",
                  }}
                  onPointerMove={onPointerMoveTile}
                  onPointerUp={onPointerUpTile}
                  onPointerCancel={onPointerUpTile}
                >
                  {/* Plateau d'assemblage magnétique dimensionné en points de broderie */}
                  <div
                    className="relative rounded-[12px] bg-[#222227] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] ring-1 ring-white/15"
                    style={{
                      width: `${boardSize.w * tableScale}px`,
                      height: `${boardSize.h * tableScale}px`,
                      minWidth: "280px",
                      minHeight: "280px",
                    }}
                  >
                    {/* Grille de repère magnétique en fond */}
                    <div
                      className="pointer-events-none absolute inset-0 opacity-20"
                      style={{
                        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)`,
                        backgroundSize: `${10 * tableScale}px ${10 * tableScale}px`,
                      }}
                    />

                    {/* Guides d'aimantage magnétiques */}
                    {snapGuides?.x !== undefined && (
                      <div
                        className="pointer-events-none absolute top-0 bottom-0 z-30 w-[2px] bg-[#30d158] shadow-[0_0_8px_#30d158]"
                        style={{ left: `${snapGuides.x * tableScale}px` }}
                      />
                    )}
                    {snapGuides?.y !== undefined && (
                      <div
                        className="pointer-events-none absolute right-0 left-0 z-30 h-[2px] bg-[#30d158] shadow-[0_0_8px_#30d158]"
                        style={{ top: `${snapGuides.y * tableScale}px` }}
                      />
                    )}

                    {/* VRAIES PAGES / TILES DE BRODERIE DRAGGABLES */}
                    {tileLayout.map(({ b, x, y, w: tw, h: th }) => {
                      const pageObj = analysis?.pages.find((p) => p.n === b.page);
                      const isDragging = activeDragId === b.id;
                      const cropW = Math.max(1, b.x1 - b.x0);
                      const cropH = Math.max(1, b.y1 - b.y0);

                      return (
                        <div
                          key={b.id}
                          onPointerDown={(e) => onPointerDownTile(e, b)}
                          className={`group absolute select-none rounded-[8px] bg-white text-black transition-shadow ${
                            isDragging
                              ? "z-40 cursor-grabbing shadow-[0_24px_48px_rgba(0,0,0,0.8)] ring-2 ring-accent scale-[1.02]"
                              : "z-20 cursor-grab shadow-md hover:shadow-xl hover:ring-2 hover:ring-white/60"
                          }`}
                          style={{
                            left: `${x * tableScale}px`,
                            top: `${y * tableScale}px`,
                            width: `${tw * tableScale}px`,
                            height: `${th * tableScale}px`,
                            touchAction: "none",
                          }}
                        >
                          {/* L'IMAGE EXACTE DE LA GRILLE DE CETTE PAGE */}
                          <div className="relative h-full w-full overflow-hidden rounded-[7px] bg-white">
                            {pageObj?.thumb && (
                              <img
                                src={pageObj.thumb}
                                alt={`Page ${b.page}`}
                                draggable={false}
                                className="pointer-events-none absolute max-w-none select-none"
                                style={{
                                  left: `-${(b.x0 / cropW) * 100}%`,
                                  top: `-${(b.y0 / cropH) * 100}%`,
                                  width: `${(100 / cropW) * 100}%`,
                                  height: `${(100 / cropH) * 100}%`,
                                  objectFit: "fill",
                                }}
                              />
                            )}

                            {/* Badge titre de page flottant */}
                            <div className="pointer-events-none absolute top-1.5 left-1.5 z-20 flex items-center gap-1 rounded-full bg-black/80 px-2 py-0.5 text-white backdrop-blur">
                              <span className="font-mono text-[10px] font-bold">P.{b.page}</span>
                              <span className="text-[9px] text-white/60">
                                {tw}×{th}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Vue 2 : Aperçu broderie unifiée */}
              {centerTab === "preview" && (
                <div className="grid flex-1 place-items-center overflow-hidden rounded-[18px] bg-white p-4 shadow-2xl">
                  {preview ? (
                    <img src={preview} className="max-h-[68vh] w-full object-contain" alt="Grille reconstituée" />
                  ) : (
                    <p className="text-[13px] text-black/50">{busy || "Génération de l'aperçu…"}</p>
                  )}
                </div>
              )}

              {assembled && (
                <div className="mt-2 flex items-center justify-between px-1 text-[12px] text-label-3">
                  <span className="font-mono">
                    Grille finale : {assembled.fitW} × {assembled.fitH} points · {assembled.pattern.palette.length} couleurs DMC · {assembled.blocks} blocs assemblés
                  </span>
                  {assembled.scaled && <span className="text-accent-2">Adapté pour l'atelier (&lt;1000 pts)</span>}
                </div>
              )}
            </div>

            {/* Sidebar de contrôle droite */}
            <aside className="w-full space-y-4 lg:w-[320px] lg:shrink-0">
              <section className="rounded-[14px] bg-white/5 p-3.5">
                <h3 className="mb-2 text-[13px] font-semibold">Disposition en mosaïque</h3>
                <p className="mb-2.5 text-[11.5px] leading-relaxed text-label-3">
                  Alignez vos pages en un clic selon l'organisation de votre patron (ex. 3 colonnes pour 12 pages) :
                </p>
                <div className="seg mb-3" role="group" aria-label="Colonnes mosaïque">
                  {[2, 3, 4, 6].map((cols) => (
                    <button
                      key={cols}
                      type="button"
                      aria-pressed={perRow === cols}
                      onClick={() => arrangeMosaic(cols)}
                    >
                      {cols} col.
                    </button>
                  ))}
                </div>

                <div className="space-y-2 border-t border-white/10 pt-2.5">
                  <label className="flex items-center justify-between text-[12px] text-label-2">
                    <span>Mosaïque à tailles égales</span>
                    <input
                      type="checkbox"
                      checked={uniformSizes}
                      onChange={(e) => setUniformSizes(e.target.checked)}
                      className="rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between text-[12px] text-label-2">
                    <span className="flex items-center gap-1.5">
                      <Magnet size={13} className="text-[#30d158]" />
                      Aimantage aux bords
                    </span>
                    <input
                      type="checkbox"
                      checked={magnet}
                      onChange={(e) => setMagnet(e.target.checked)}
                      className="rounded"
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-[14px] bg-white/5 p-3.5">
                <h3 className="mb-2 text-[13px] font-semibold">Lecture des points</h3>
                <div className="seg mb-2">
                  <button type="button" aria-pressed={mode === "auto"} onClick={() => setMode("auto")}>
                    Automatique
                  </button>
                  <button type="button" aria-pressed={mode === "photo"} onClick={() => setMode("photo")}>
                    Photo
                  </button>
                </div>
                <p className="text-[11.5px] leading-relaxed text-label-3">
                  Lit chaque case d'après sa vraie couleur de fil DMC. Les symboles noirs/blancs sont reliés à la légende.
                </p>
                {mode === "photo" && (
                  <div className="mt-2.5">
                    <label className="text-[11.5px] text-label-3">
                      Couleurs max ({colors})
                      <input
                        type="range"
                        min={2}
                        max={60}
                        value={colors}
                        onChange={(e) => setColors(Number(e.target.value))}
                        className="mt-1 w-full"
                      />
                    </label>
                  </div>
                )}
              </section>

              <section className="rounded-[14px] bg-white/5 p-3.5">
                <h3 className="mb-2 text-[13px] font-semibold">Auteur et droits</h3>
                <input
                  className="field"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Créateur ou boutique (ex. Light Unicorn Designs)"
                />
                <label className="mt-2.5 flex items-start gap-2 text-[11px] leading-relaxed text-label-3">
                  <input
                    type="checkbox"
                    checked={authorized}
                    onChange={(e) => setAuthorized(e.target.checked)}
                    className="mt-0.5 rounded"
                  />
                  <span>Usage personnel. Conserve la mention de licence et d'auteur dans le patron.</span>
                </label>
              </section>

              <div className={`flex gap-2 pt-1 ${stick}`}>
                <button type="button" className="btn-quiet flex-1" onClick={() => setStage(1)}>
                  Calage
                </button>
                <button
                  type="button"
                  className="btn-primary flex-1"
                  disabled={!assembled || !!busy}
                  onClick={commit}
                >
                  <Check size={16} />
                  Importer
                </button>
              </div>
            </aside>
          </section>
        )}

        {busy && (
          <div className="sticky bottom-3 mt-4 flex justify-center">
            <div className="glass-strong flex items-center gap-3 rounded-full px-5 py-2.5 text-[13px]" role="status">
              <span className="spinner" />
              {busy}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function clampInt(raw: string | number, min: number, max: number, fallback: number) {
  const n = Math.round(Number(raw));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function autoOrder(blocks: PdfBlock[]) {
  return [...blocks].sort((a, b) => a.page - b.page || a.y0 - b.y0 || a.x0 - b.x0);
}

function assembleFromTileLayout(
  list: Placed[],
  layout: { b: PdfBlock; x: number; y: number; w: number; h: number }[],
  name: string,
): Assembled {
  if (!list.length) throw new Error("Aucun bloc à assembler.");
  let maxX = 1;
  let maxY = 1;
  let byColor = 0;
  let byLegend = 0;
  let unresolved = 0;

  for (const t of layout) {
    maxX = Math.max(maxX, t.x + t.w);
    maxY = Math.max(maxY, t.y + t.h);
  }
  for (const p of list) {
    byColor += p.data.byColor;
    byLegend += p.data.byLegend;
    unresolved += p.data.unresolved;
  }

  const W = Math.max(1, Math.min(maxX, 1000));
  const H = Math.max(1, Math.min(maxY, 1000));
  const raw = new Int16Array(W * H).fill(-1);

  for (const p of list) {
    const t = layout.find((item) => item.b.id === p.b.id);
    if (!t) continue;
    for (let r = 0; r < p.b.rows; r++) {
      for (let c = 0; c < p.b.cols; c++) {
        const gx = Math.min(W - 1, Math.max(0, t.x + c));
        const gy = Math.min(H - 1, Math.max(0, t.y + r));
        const v = p.data.cells[r * p.b.cols + c];
        if (v >= 0) raw[gy * W + gx] = v;
      }
    }
  }

  const fit = fitGrid(raw, W, H);
  const pattern = createPattern(name || "Patron PDF", fit.w, fit.h);
  pattern.cross = fit.cells;
  for (const v of new Set(fit.cells)) if (v >= 0) ensurePalette(pattern, v);

  return {
    pattern,
    rawW: maxX,
    rawH: maxY,
    fitW: fit.w,
    fitH: fit.h,
    scaled: fit.scaled,
    blocks: list.length,
    byColor,
    byLegend,
    unresolved,
    source: "image",
  };
}

function renderPreview(p: Pattern) {
  const scale = Math.max(1, Math.min(4, Math.floor(1100 / p.w), Math.floor(850 / p.h)));
  const c = document.createElement("canvas");
  c.width = p.w * scale;
  c.height = p.h * scale;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#f7f2e8";
  ctx.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < p.cross.length; i++) {
    const v = p.cross[i];
    if (v < 0) continue;
    ctx.fillStyle = FLOSS[v]?.hex ?? "#777";
    ctx.fillRect((i % p.w) * scale, Math.floor(i / p.w) * scale, scale, scale);
  }
  return c.toDataURL("image/png");
}
