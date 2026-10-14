import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Minus, Plus, Home, X, Users, Heart } from "lucide-react";
import { createPattern, ensurePalette, type Pattern } from "../lib/pattern";
import { FLOSS } from "../lib/dmc";

/**
 * La toile infinie : il n'y a plus de page d'accueil, il y a un tissu.
 *
 * Le hero est un format paysage posé sur la grille — comme une feuille de
 * patron sur la toile. On dézoome (molette, pincement, boutons) et on
 * s'aperçoit que tout le site est une grille de point de croix : autour du
 * hero, des voisines brodent en direct. Leurs motifs avancent case par case,
 * on regarde, on choisit, on paie (démo) et le motif est à nous : il s'ouvre
 * directement dans l'atelier, sans fichier ni dossier à gérer.
 *
 * Honnêteté : pas de serveur pour l'instant — les voisines sont simulées en
 * local et le paiement est une démo. C'est écrit sur la toile, en petit.
 */

const CELL = 26; // une case de la toile, en pixels monde, à zoom 1
const BLOC = 10; // un repère épais tous les dix points, comme sur un patron
const SHEET = { w: 1280, h: 780 }; // le format paysage du hero
const K_MIN = 0.08;
const K_MAX = 1.8;

interface Vue {
  x: number;
  y: number;
  k: number;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function flossIdx(code: string): number {
  const i = FLOSS.findIndex((f) => f.code === code);
  return i >= 0 ? i : 0;
}

/* ------------------------------------------------------------------ */
/*  Les mini-motifs des voisines — déterministes, symétriques, réels   */
/* ------------------------------------------------------------------ */

export interface MiniDesign {
  w: number;
  h: number;
  cross: Int16Array; // indices FLOSS, -1 = toile nue
  palette: number[];
  ordre: number[]; // l'ordre de broderie : rangée par rangée
}

const FILS_DESIGN = ["321", "815", "703", "798", "963", "3865", "434", "907", "517", "739"];

export function miniDesign(seed: number, w = 20, h = 20): MiniDesign {
  const rng = mulberry32(seed * 2654435761);
  const nFils = 3 + Math.floor(rng() * 3);
  const pool = [...FILS_DESIGN];
  const palette: number[] = [];
  for (let i = 0; i < nFils && pool.length; i += 1) {
    palette.push(flossIdx(pool.splice(Math.floor(rng() * pool.length), 1)[0]));
  }
  const cross = new Int16Array(w * h).fill(-1);
  for (let y = 0; y < Math.ceil(h / 2); y += 1) {
    for (let x = 0; x < Math.ceil(w / 2); x += 1) {
      const r = rng();
      // Un cœur plus dense au centre, plus aéré sur les bords : ça ressemble
      // à un vrai petit motif, pas à du bruit.
      const dx = Math.abs(x - (w - 1) / 2) / (w / 2);
      const dy = Math.abs(y - (h - 1) / 2) / (h / 2);
      const densite = 0.82 - 0.45 * Math.max(dx, dy);
      if (r > densite) continue;
      const v = palette[Math.floor(rng() * palette.length)];
      cross[y * w + x] = v;
      cross[y * w + (w - 1 - x)] = v;
      cross[(h - 1 - y) * w + x] = v;
      cross[(h - 1 - y) * w + (w - 1 - x)] = v;
    }
  }
  const ordre: number[] = [];
  for (let i = 0; i < cross.length; i += 1) if (cross[i] >= 0) ordre.push(i);
  return { w, h, cross, palette, ordre };
}

/** Le motif tel qu'il sera livré : chaque case du dessin devient 2 × 2. */
function livrer(d: MiniDesign, titre: string, voisine: Voisine): Pattern {
  const w = d.w * 2;
  const h = d.h * 2;
  const p = createPattern(titre, w, h, 14, 2);
  for (let y = 0; y < d.h; y += 1) {
    for (let x = 0; x < d.w; x += 1) {
      const v = d.cross[y * d.w + x];
      if (v < 0) continue;
      p.cross[(y * 2) * w + x * 2] = v;
      p.cross[(y * 2) * w + x * 2 + 1] = v;
      p.cross[(y * 2 + 1) * w + x * 2] = v;
      p.cross[(y * 2 + 1) * w + x * 2 + 1] = v;
    }
  }
  for (const v of d.palette) ensurePalette(p, v);
  p.provenance = {
    kind: "demo",
    source: voisine.sal ? `SAL « ${titre} » rejoint sur la toile` : `Motif de ${voisine.brodeuse}, acheté sur la toile`,
    author: voisine.brodeuse,
    license: "Démo : paiement simulé, motif libre de droits pour vous",
    personalOnly: false,
  };
  p.notes = voisine.sal
    ? `Vous avez rejoint le SAL « ${titre} » animé par ${voisine.brodeuse}. ${p.w} × ${p.h} cases, ${p.palette.length} fils DMC.`
    : `« ${titre} » de ${voisine.brodeuse}, approprié depuis la toile. ${p.w} × ${p.h} cases, ${p.palette.length} fils DMC.`;
  return p;
}

/* ------------------------------------------------------------------ */
/*  Les voisines                                                       */
/* ------------------------------------------------------------------ */

export interface Voisine {
  id: string;
  titre: string;
  brodeuse: string;
  prix: number;
  sal: boolean;
  brodeuses?: number;
  x: number;
  y: number;
  seed: number;
}

export const VOISINES: Voisine[] = [
  { id: "renard", titre: "Renard des bois", brodeuse: "Camille", prix: 4.9, sal: false, x: -780, y: -140, seed: 7 },
  { id: "bleets", titre: "Bleuets de juin", brodeuse: "Inès", prix: 3.5, sal: false, x: 1580, y: -220, seed: 21 },
  { id: "maison", titre: "Maison sous la neige", brodeuse: "Margot", prix: 6, sal: true, brodeuses: 12, x: -860, y: 780, seed: 35 },
  { id: "rosace", titre: "Rosace de grand-mère", brodeuse: "Léonie", prix: 5.2, sal: false, x: 1640, y: 860, seed: 49 },
  { id: "baleine", titre: "Baleine douce", brodeuse: "Alma", prix: 6, sal: true, brodeuses: 8, x: 430, y: -640, seed: 63 },
  { id: "citron", titre: "Citronnade", brodeuse: "Thaïs", prix: 2.9, sal: false, x: 340, y: 1140, seed: 77 },
];

const CARD = { w: 380, h: 470 };
const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

/* ------------------------------------------------------------------ */
/*  Une carte vivante : la voisine brode, case par case                */
/* ------------------------------------------------------------------ */

function dessinerCroix(ctx: CanvasRenderingContext2D, cx: number, cy: number, c: number, hex: string) {
  ctx.strokeStyle = hex;
  ctx.lineWidth = Math.max(1.4, c * 0.24);
  ctx.lineCap = "round";
  const p = c * 0.16;
  ctx.beginPath();
  ctx.moveTo(cx + p, cy + p);
  ctx.lineTo(cx + c - p, cy + c - p);
  ctx.moveTo(cx + c - p, cy + p);
  ctx.lineTo(cx + p, cy + c - p);
  ctx.stroke();
}

function Vivante({
  voisine,
  design,
  fait,
  total,
  onChoisir,
}: {
  voisine: Voisine;
  design: MiniDesign;
  fait: number;
  total: number;
  onChoisir: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cell = 8;
  const fini = fait >= total;
  const pct = Math.round((fait / total) * 100);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    cv.width = design.w * cell;
    cv.height = design.h * cell;
    ctx.clearRect(0, 0, cv.width, cv.height);
    // La toile nue, puis les croix déjà posées.
    ctx.strokeStyle = "rgba(17,17,20,0.14)";
    ctx.lineWidth = 1;
    for (let i = 1; i < design.w; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, cv.height);
      ctx.stroke();
    }
    for (let j = 1; j < design.h; j += 1) {
      ctx.beginPath();
      ctx.moveTo(0, j * cell);
      ctx.lineTo(cv.width, j * cell);
      ctx.stroke();
    }
    for (let n = 0; n < fait; n += 1) {
      const i = design.ordre[n];
      const v = design.cross[i];
      if (v < 0) continue;
      const x = i % design.w;
      const y = Math.floor(i / design.w);
      dessinerCroix(ctx, x * cell, y * cell, cell, FLOSS[v]?.hex ?? "#888");
    }
  }, [design, fait]);

  return (
    <article
      className="motif-vivant"
      style={{ left: voisine.x, top: voisine.y, width: CARD.w }}
      aria-label={`${voisine.titre}, brodé en direct par ${voisine.brodeuse}`}
    >
      <div className="mv-haut">
        <canvas ref={ref} className="mv-canvas" aria-hidden="true" />
        <span className={`mv-direct${fini ? " fini" : ""}`}>
          {fini ? "terminé" : "en direct"}
        </span>
      </div>
      <h3 className="mv-titre">{voisine.titre}</h3>
      <p className="mv-qui">
        {voisine.brodeuse}
        {voisine.sal ? ` · SAL · ${voisine.brodeuses} brodeuses` : ""}
      </p>
      <div className="mv-bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="mv-pct" data-progres={pct}>
        {pct} % {fini ? "· motif complet, à s'approprier" : "· brode…"}
      </p>
      <button type="button" className="mv-cta" data-cta onClick={onChoisir}>
        {voisine.sal ? <Users size={15} aria-hidden="true" /> : <Heart size={15} aria-hidden="true" />}
        {voisine.sal ? `Rejoindre le SAL · ${eur(voisine.prix)}` : `S'approprier · ${eur(voisine.prix)}`}
      </button>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  La feuille d'appropriation : on regarde, on paie (démo), c'est à nous */
/* ------------------------------------------------------------------ */

interface Achat {
  voisine: Voisine;
  design: MiniDesign;
  etat: "vue" | "paiement";
}

function FeuilleAchat({
  achat,
  onFermer,
  onMotif,
}: {
  achat: Achat;
  onFermer: () => void;
  onMotif: (p: Pattern) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { voisine, design } = achat;

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const cell = 13;
    cv.width = design.w * cell;
    cv.height = design.h * cell;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = "rgba(17,17,20,0.1)";
    ctx.lineWidth = 1;
    for (let i = 1; i < design.w; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, cv.height);
      ctx.stroke();
    }
    for (let j = 1; j < design.h; j += 1) {
      ctx.beginPath();
      ctx.moveTo(0, j * cell);
      ctx.lineTo(cv.width, j * cell);
      ctx.stroke();
    }
    for (let y = 0; y < design.h; y += 1) {
      for (let x = 0; x < design.w; x += 1) {
        const v = design.cross[y * design.w + x];
        if (v < 0) continue;
        dessinerCroix(ctx, x * cell, y * cell, cell, FLOSS[v]?.hex ?? "#888");
      }
    }
  }, [design]);

  const confirmer = () => {
    onMotif(livrer(design, voisine.titre, voisine));
    onFermer();
  };

  return (
    <div className="achat-voile" role="dialog" aria-label={`${voisine.titre} — s'approprier le motif`}>
      <div className="achat-feuille">
        <button type="button" className="achat-x" onClick={onFermer} aria-label="Fermer">
          <X size={16} />
        </button>
        <div className="achat-corps">
          <div className="achat-apercu">
            <canvas ref={ref} aria-label={`Aperçu complet de « ${voisine.titre} »`} />
          </div>
          <div className="achat-texte">
            <p className="achat-oeil">{voisine.sal ? "Stitch-along en cours" : "Brode en direct sur la toile"}</p>
            <h2>{voisine.titre}</h2>
            <p className="achat-qui">
              par {voisine.brodeuse}
              {voisine.sal ? ` · ${voisine.brodeuses} brodeuses inscrites` : ""} · {design.w * 2} × {design.h * 2} cases ·{" "}
              {design.palette.length} fils DMC
            </p>
            <p className="achat-prix">{eur(voisine.prix)}</p>
            {achat.etat === "vue" ? (
              <button type="button" className="mv-cta achat-cta" data-confirmer onClick={confirmer}>
                {voisine.sal ? `Rejoindre le SAL · ${eur(voisine.prix)}` : `Payer ${eur(voisine.prix)} · le motif est à moi`}
              </button>
            ) : (
              <p className="achat-encours" role="status">
                Paiement en cours…
              </p>
            )}
            <p className="achat-honnete">
              Démo : le paiement est simulé — aucun argent ne circule. Le motif, lui, est bien réel :
              il s'ouvre directement dans l'atelier, sans fichier ni dossier.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  La toile                                                           */
/* ------------------------------------------------------------------ */

export default function ToileInfinie({
  onOpen,
  onMotif,
  children,
}: {
  onOpen: () => void;
  onMotif: (p: Pattern) => void;
  children: ReactNode;
}) {
  const monde = useRef<HTMLDivElement>(null);

  const fit = (): Vue => {
    const vw = typeof window === "undefined" ? 1280 : window.innerWidth;
    const vh = typeof window === "undefined" ? 800 : window.innerHeight;
    const k = clamp(Math.min(vw / (SHEET.w + 160), vh / (SHEET.h + 140)), 0.4, 1.15);
    return { k, x: (vw - SHEET.w * k) / 2, y: (vh - SHEET.h * k) / 2 };
  };

  const [vue, setVue] = useState<Vue>(fit);
  const [achat, setAchat] = useState<Achat | null>(null);

  /* Les voisines avancent ensemble : un seul battement pour toute la toile. */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 800);
    return () => window.clearInterval(id);
  }, []);

  const designs = useMemo(() => {
    const m = new Map<string, MiniDesign[]>();
    for (const v of VOISINES) {
      m.set(v.id, [miniDesign(v.seed), miniDesign(v.seed + 101), miniDesign(v.seed + 202)]);
    }
    return m;
  }, []);

  const zoomAt = (cx: number, cy: number, facteur: number) => {
    setVue((v) => {
      const k = clamp(v.k * facteur, K_MIN, K_MAX);
      if (k === v.k) return v;
      const r = k / v.k;
      return { k, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r };
    });
  };

  /* Molette : non-passive, pour zoomer sans faire défiler la page. */
  useEffect(() => {
    const el = monde.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY > 0 ? 0.9 : 1.1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Glisser pour se déplacer, pincer pour zoomer. */
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const dernier = useRef<{ x: number; y: number } | null>(null);
  const dist = useRef(0);
  const bouge = useRef(false);

  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dernier.current = { x: e.clientX, y: e.clientY };
    bouge.current = false;
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      dist.current = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    }
  };
  const onMove = (e: React.PointerEvent) => {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size >= 2) {
      const [a, b] = [...pts.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const r = monde.current?.getBoundingClientRect();
      if (d && dist.current && r) zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, d / dist.current);
      dist.current = d || dist.current;
      return;
    }
    if (dernier.current) {
      const dx = e.clientX - dernier.current.x;
      const dy = e.clientY - dernier.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) bouge.current = true;
      setVue((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
    }
    dernier.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: React.PointerEvent) => {
    pts.current.delete(e.pointerId);
    dernier.current = null;
  };

  /* Après un glisser, le relâchement ne doit pas acheter un motif. */
  const clicFiable = () => {
    if (bouge.current) {
      bouge.current = false;
      return false;
    }
    return true;
  };

  const ouvrir = (v: Voisine) => {
    if (!clicFiable()) return;
    const liste = designs.get(v.id) ?? [miniDesign(v.seed)];
    const cycle = liste[0].ordre.length + 6;
    const idx = Math.floor(((v.seed * 7 + tick) % (cycle * liste.length)) / cycle) % liste.length;
    setAchat({ voisine: v, design: liste[idx], etat: "vue" });
  };

  return (
    <div
      ref={monde}
      className="toile"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {/* Le tissu : deux grilles superposées, fines et repères de patron. */}
      <div
        className="toile-grille blocs"
        style={{
          backgroundSize: `${CELL * BLOC * vue.k}px ${CELL * BLOC * vue.k}px`,
          backgroundPosition: `${vue.x}px ${vue.y}px`,
        }}
        aria-hidden="true"
      />
      <div
        className="toile-grille fines"
        style={{
          backgroundSize: `${CELL * vue.k}px ${CELL * vue.k}px`,
          backgroundPosition: `${vue.x}px ${vue.y}px`,
          opacity: clamp((vue.k - 0.28) / 0.3, 0, 1),
        }}
        aria-hidden="true"
      />

      {/* Le monde : tout ce qui est posé sur la toile, hero compris. */}
      <div
        className="toile-monde"
        data-k={vue.k.toFixed(3)}
        style={{ transform: `translate(${vue.x}px, ${vue.y}px) scale(${vue.k})` }}
      >
        <div className="hero-sheet" style={{ width: SHEET.w, height: SHEET.h }}>
          <span className="sheet-marque tl" aria-hidden="true" />
          <span className="sheet-marque tr" aria-hidden="true" />
          <span className="sheet-marque bl" aria-hidden="true" />
          <span className="sheet-marque br" aria-hidden="true" />
          <div className="hero-contenu">{children}</div>
        </div>

        {VOISINES.map((v) => {
          const liste = designs.get(v.id) ?? [miniDesign(v.seed)];
          const depart = (v.seed * 7) % 9;
          const cycle = liste[0].ordre.length + 6; // terminé, puis on repart
          const brut = depart + tick;
          const tour = Math.floor(brut / cycle) % liste.length;
          const design = liste[tour];
          const fait = Math.min(brut % cycle, design.ordre.length);
          return (
            <Vivante
              key={v.id}
              voisine={v}
              design={design}
              fait={fait}
              total={design.ordre.length}
              onChoisir={() => ouvrir(v)}
            />
          );
        })}
      </div>

      {/* Le strict minimum d'interface, posé sur la toile. */}
      <header className="toile-nav">
        <span className="toile-logo" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="17" height="17">
            <path d="M6 6l12 12M18 6L6 18" stroke="#ff453a" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </span>
        <span className="toile-nom">POINT ZÉRO</span>
        <button type="button" className="toile-atelier" onClick={onOpen}>
          Ouvrir l’atelier
        </button>
      </header>

      <div className="toile-zoom" role="group" aria-label="Zoom de la toile">
        <button type="button" aria-label="Zoomer" onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.25)}>
          <Plus size={16} />
        </button>
        <button type="button" aria-label="Dézoomer" onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 0.8)}>
          <Minus size={16} />
        </button>
        <button type="button" aria-label="Revenir au hero" onClick={() => setVue(fit())}>
          <Home size={15} />
        </button>
      </div>

      <div className="toile-chips">
        <p className="toile-chip geste">Molette : zoomer · Glisser : se déplacer · Dézoomez : vous êtes dans la grille</p>
        <p className="toile-chip honnete">
          Démo hors ligne : les voisines sont simulées en local (pas encore de serveur) et le paiement est simulé
        </p>
      </div>

      {achat && <FeuilleAchat achat={achat} onFermer={() => setAchat(null)} onMotif={onMotif} />}
    </div>
  );
}
