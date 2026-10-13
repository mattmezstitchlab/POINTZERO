import { FLOSS } from "./dmc";
import { drawSymbolPdf } from "./symbols";
import { computeStats, effectiveCount, fabricInfo, pitchCm, type Pattern } from "./pattern";
import { downloadBlob, slugify } from "./io";

const BLOCK = 40; // cases par page de grille (grande page, lisible et économique)
const CELL = 4.3; // mm
const LEFT = 22;
const TOP = 30;

export interface PdfOptions {
  /** Grille noir et blanc (symboles seuls), comme les patrons Etsy classiques. */
  bw: boolean;
  paper?: "a4" | "letter";
  /** Chevauchement de 10 cases entre pages (repères grisés), comme les patrons imprimés. */
  overlap?: boolean;
}

const hexRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const isDark = ([r, g, b]: [number, number, number]) => 0.299 * r + 0.587 * g + 0.114 * b < 150;
const fmt = (n: number, d = 1) => n.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const num = (n: number) => n.toLocaleString("fr-FR");

/** Cheveaux de demi-points, dessinés comme sur les grilles imprimées. */
function chevron(doc: jsPDFLike, x: number, y: number, flip: boolean, ink: [number, number, number]) {
  const k = CELL * 0.26;
  doc.setDrawColor(ink[0], ink[1], ink[2]);
  doc.setLineWidth(0.8);
  doc.setLineCap("round");
  doc.line(x + CELL * 0.5, y + CELL * (flip ? 0.78 : 0.22), x + CELL * (flip ? 0.86 : 0.14), y + CELL * 0.5);
  doc.line(x + CELL * (flip ? 0.14 : 0.86), y + CELL * 0.5, x + CELL * 0.5, y + CELL * (flip ? 0.22 : 0.78));
  void k;
}

type jsPDFLike = {
  setFillColor: (r: number, g: number, b: number) => void;
  setDrawColor: (r: number, g: number, b: number) => void;
  setLineWidth: (w: number) => void;
  setLineCap: (c: "round" | "butt") => void;
  setLineJoin: (j: "round" | "bevel" | "miter") => void;
  rect: (x: number, y: number, w: number, h: number, style: "F" | "S" | "FD") => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
};

/** Export PDF professionnel : couverture, légende, index des pages, grilles. */
export async function buildPdf(input: Pattern, opts: PdfOptions = { bw: false }): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const p = input;
  const doc = new jsPDF({ unit: "mm", format: opts.paper ?? "a4", orientation: "portrait" });
  const { rows, totals } = computeStats(p);
  const fab = fabricInfo(p);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const ov = opts.overlap === false ? 0 : 10;
  const pageCounts = [11, 14, 16, 18];

  const footer = (page: number, total: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`${p.name}`, LEFT, pageH - 11);
    if (p.provenance?.source || p.provenance?.author) {
      doc.setFontSize(6.5);
      const credit = `© ${p.provenance.author || "Auteur non renseigné"}${p.provenance.source ? ` · ${p.provenance.source}` : ""}`;
      doc.text(credit.slice(0, 110), LEFT, pageH - 15.5);
      if (p.provenance.personalOnly) doc.text("Usage personnel uniquement", LEFT, pageH - 19.5);
    }
    doc.setFontSize(8);
    doc.text(`Page ${page} / ${total}`, pageW - LEFT, pageH - 11, { align: "right" });
    doc.setTextColor(0);
  };

  /* --------------------------- Page de couverture --------------------------- */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text(p.name, LEFT, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(115);
  doc.text("Grille de broderie point de croix", LEFT, 43);

  let y = 58;
  const section = (title: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(0);
    doc.text(title, LEFT, y);
    doc.setDrawColor(210);
    doc.line(LEFT, y + 2.5, pageW - LEFT, y + 2.5);
    y += 9;
  };
  const row = (k: string, v: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(115);
    doc.text(k, LEFT + 2, y);
    doc.setTextColor(0);
    doc.text(v, LEFT + 62, y);
    y += 6.6;
  };

  section("Spécifications");
  row("Grille", `${p.w} × ${p.h} cases (point zéro au centre)`);
  row("Toile", `${p.fabric?.type ?? "Aida"} ${p.count} ct, sur ${p.fabric?.over ?? 1} fil(s) → ${effectiveCount(p)} pts/pouce`);
  row("Brins", `${p.strands} brin${p.strands > 1 ? "s" : ""} de fil 6 brins`);
  row("Taille finie", `${fmt(fab.fw)} × ${fmt(fab.fh)} cm`);
  row("Toile minimum", `${fmt(fab.mw, 0)} × ${fmt(fab.mh, 0)} cm (marge ${p.fabric?.margin ?? 7.5} cm / côté)`);

  y += 2;
  section("Taille selon le comptage de toile");
  for (const c of pageCounts) {
    const f = fabricInfo({ ...p, count: c as Pattern["count"] });
    row(`Aida ${c} ct`, `${fmt(f.fw)} × ${fmt(f.fh)} cm`);
  }

  y += 2;
  section("Comptage des points");
  row("Points de croix", num(totals.cross));
  row("Demi-points", num(totals.half));
  row("Quarts de point", num(totals.quarter));
  row("Point arrière", `${fmt(totals.backCm, 0)} cm de tracé`);
  row("Point lancé", `${fmt(totals.longCm, 0)} cm de tracé`);
  row("Noeuds français", num(totals.knots));
  row("Fils différents", num(totals.colors));

  y += 2;
  section("Écheveaux DMC à prévoir (8 m)");
  for (const c of pageCounts) {
    let sk = 0;
    for (const r of rows) {
      const pitch = pitchCm(c as Pattern["count"]);
      const cm =
        r.cross * p.strands * 14 * pitch +
        r.half * p.strands * 7 * pitch +
        r.quarter * p.strands * 4 * pitch +
        r.back * 3 * pitch +
        r.long * 2 * p.strands * pitch +
        r.knots * 2 * p.strands;
      sk += Math.ceil(((cm * 1.15) / 100) / 48);
    }
    row(`Aida ${c} ct`, `${num(sk)} écheveau${sk > 1 ? "x" : ""} au total`);
  }

  doc.setFontSize(8);
  doc.setTextColor(125);
  const note =
    "Symboles : chaque couleur de fil possède un symbole unique. Les demi-points sont indiqués par des chevrons, le point arrière par des lignes entre les trous, les noeuds français par des cercles. Les couleurs DMC affichées sont des approximations numériques : vérifiez sur une carte physique avant d'acheter. La consommation de fil est une estimation (marge de 15 % incluse).";
  doc.text(doc.splitTextToSize(note, pageW - LEFT * 2), LEFT, y + 2);
  doc.setTextColor(0);

  /* --------------------------- Légende des fils --------------------------- */
  doc.addPage();
  y = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Légende des fils", LEFT, y);
  y += 10;

  const legendHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(115);
    doc.text("Couleur", LEFT, y);
    doc.text("Sym.", LEFT + 12, y);
    doc.text("DMC", LEFT + 20, y);
    doc.text("Nom", LEFT + 34, y);
    doc.text("Points", pageW - LEFT - 62, y, { align: "right" });
    doc.text("Échev.", pageW - LEFT, y, { align: "right" });
    doc.setTextColor(0);
    doc.setDrawColor(200);
    doc.line(LEFT, y + 1.5, pageW - LEFT, y + 1.5);
    y += 7;
  };
  legendHeader();

  doc.setFont("helvetica", "normal");
  for (const r of rows) {
    if (y > pageH - 28) {
      doc.addPage();
      y = 20;
      legendHeader();
    }
    const rgb = hexRgb(r.hex);
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.setDrawColor(120);
    doc.rect(LEFT, y - 3.4, 7, 5.4, "FD");
    const sym = p.palette.indexOf(r.idx);
    if (sym >= 0) {
      drawSymbolPdf(doc, sym, LEFT + 14.5, y - 0.8, 2.2, [20, 20, 20]);
    }
    doc.setTextColor(0);
    doc.setFontSize(9.5);
    doc.text(r.code, LEFT + 20, y);
    doc.text(FLOSS[r.idx].name.slice(0, 26), LEFT + 34, y);
    const pts = r.cross + r.half + r.quarter;
    doc.text(num(pts), pageW - LEFT - 62, y, { align: "right" });
    doc.text(String(r.skeins), pageW - LEFT, y, { align: "right" });
    y += 6.4;
  }

  /* --------------------------- Index des pages --------------------------- */
  const cols = Math.ceil(p.w / BLOCK);
  const rowsB = Math.ceil(p.h / BLOCK);
  const total = 2 + cols * rowsB;

  doc.addPage();
  y = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Index des pages de grille", LEFT, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(115);
  doc.text(`${p.w} × ${p.h} cases réparties en ${cols} colonne(s) × ${rowsB} rangée(s). Les axes sont numérotés depuis le point zéro central.`, LEFT, y);
  y += 12;
  doc.setTextColor(0);

  const cellW = (pageW - LEFT * 2) / cols;
  const cellH = Math.min(46, (pageH - y - 40) / rowsB);
  for (let by = 0; by < rowsB; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const x = LEFT + bx * cellW;
      const yy = y + by * cellH;
      doc.setDrawColor(215);
      doc.setLineWidth(0.2);
      doc.rect(x + 1.5, yy + 1.5, cellW - 3, cellH - 3, "S");
      doc.setFontSize(8.5);
      doc.setTextColor(115);
      doc.text(`col. ${bx * BLOCK - p.w / 2}…`, x + 5, yy + 9);
      doc.text(`rang. ${by * BLOCK - p.h / 2}…`, x + 5, yy + 14.5);
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text(`p. ${3 + by * cols + bx}`, x + 5, yy + cellH - 8);
    }
  }

  /* --------------------------- Grilles --------------------------- */
  const symIndex = new Map<number, number>();
  p.palette.forEach((idx, pos) => symIndex.set(idx, pos));
  const cx0 = p.w / 2;
  const cy0 = p.h / 2;
  const qCorner: [number, number][] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];

  for (let by = 0; by < rowsB; by++) {
    for (let bx = 0; bx < cols; bx++) {
      doc.addPage();
      const c0 = bx * BLOCK;
      const r0 = by * BLOCK;
      const c1 = Math.min(p.w, c0 + BLOCK);
      const r1 = Math.min(p.h, r0 + BLOCK);
      const nav = `col. ${c0 - cx0}…${c1 - cx0} · rang. ${r0 - cy0}…${r1 - cy0}`;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`${p.name}`, LEFT, 20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(115);
      doc.text(nav, LEFT, 26);

      // Navigation vers les pages voisines
      const up = by > 0 ? 3 + (by - 1) * cols + bx : null;
      const down = by < rowsB - 1 ? 3 + (by + 1) * cols + bx : null;
      const left = bx > 0 ? 3 + by * cols + bx - 1 : null;
      const right = bx < cols - 1 ? 3 + by * cols + bx + 1 : null;
      doc.setFontSize(8);
      doc.text(`↑ p.${up ?? "—"}  ↓ p.${down ?? "—"}  ← p.${left ?? "—"}  → p.${right ?? "—"}`, pageW - LEFT, 26, { align: "right" });

      const X = (c: number) => LEFT + (c - c0) * CELL;
      const Y = (r: number) => TOP + (r - r0) * CELL;

      for (let r = r0; r < r1; r++) {
        for (let c = c0; c < c1; c++) {
          const i = r * p.w + c;
          const x = X(c);
          const yy = Y(r);
          // Zone de chevauchement (repères grisés)
          const inOv =
            ov > 0 &&
            ((c >= c0 && c < c0 + ov && c0 > 0) ||
              (c >= c1 - ov && c < c1 && c1 < p.w) ||
              (r >= r0 && r < r0 + ov && r0 > 0) ||
              (r >= r1 - ov && r < r1 && r1 < p.h));
          if (inOv) {
            doc.setFillColor(235, 235, 235);
            doc.rect(x, yy, CELL, CELL, "F");
          }

          const cr = p.cross[i];
          if (cr >= 0) {
            const rgb = hexRgb(FLOSS[cr].hex);
            if (!opts.bw) {
              doc.setFillColor(rgb[0], rgb[1], rgb[2]);
              doc.rect(x, yy, CELL, CELL, "F");
            }
            const pos = symIndex.get(cr) ?? 0;
            const ink: [number, number, number] = opts.bw ? [15, 15, 15] : isDark(rgb) ? [255, 255, 255] : [20, 20, 20];
            drawSymbolPdf(doc, pos, x + CELL / 2, yy + CELL / 2, CELL * 0.34, ink);
          }
          for (const [arr, flip] of [
            [p.fwd, false],
            [p.bwd, true],
          ] as const) {
            const f = arr[i];
            if (f < 0) continue;
            if (opts.bw) chevron(doc, x, yy, flip, [40, 40, 40]);
            else {
              const rgb = hexRgb(FLOSS[f].hex);
              doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
              doc.setLineWidth(0.8);
              if (!flip) doc.line(x, yy + CELL, x + CELL, yy);
              else doc.line(x, yy, x + CELL, yy + CELL);
            }
          }
          for (let k = 0; k < 4; k++) {
            const v = p.q[k][i];
            if (v < 0) continue;
            const rgb = hexRgb(FLOSS[v].hex);
            doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
            doc.setLineWidth(0.8);
            const [qx, qy] = qCorner[k];
            doc.line(x + qx * CELL, yy + qy * CELL, x + CELL / 2, yy + CELL / 2);
          }
        }
      }

      // Grille fine puis majeure tous les 10
      doc.setLineWidth(0.12);
      doc.setDrawColor(opts.bw ? 200 : 195);
      for (let c = c0; c <= c1; c++) if (c % 10 !== 0) doc.line(X(c), Y(r0), X(c), Y(r1));
      for (let r = r0; r <= r1; r++) if (r % 10 !== 0) doc.line(X(c0), Y(r), X(c1), Y(r));
      doc.setLineWidth(0.4);
      doc.setDrawColor(70);
      for (let c = c0; c <= c1; c++) if (c % 10 === 0) doc.line(X(c), Y(r0), X(c), Y(r1));
      for (let r = r0; r <= r1; r++) if (r % 10 === 0) doc.line(X(c0), Y(r), X(c1), Y(r));
      doc.setDrawColor(210, 50, 40);
      doc.setLineWidth(0.5);
      if (cx0 >= c0 && cx0 <= c1) doc.line(X(cx0), Y(r0), X(cx0), Y(r1));
      if (cy0 >= r0 && cy0 <= r1) doc.line(X(c0), Y(cy0), X(c1), Y(cy0));

      // Point arrière par-dessus la grille
      doc.setLineCap("round");
      for (const seg of p.back) {
        if (seg.x1 < c0 - 1 && seg.x2 < c0 - 1) continue;
        if (seg.x1 > c1 + 1 && seg.x2 > c1 + 1) continue;
        if (seg.y1 < r0 - 1 && seg.y2 < r0 - 1) continue;
        if (seg.y1 > r1 + 1 && seg.y2 > r1 + 1) continue;
        const rgb = hexRgb(FLOSS[seg.c].hex);
        doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
        doc.setLineWidth(1);
        doc.line(X(seg.x1), Y(seg.y1), X(seg.x2), Y(seg.y2));
      }

      // Repères
      doc.setFontSize(7);
      doc.setTextColor(90);
      for (let c = c0; c <= c1; c++) {
        if (c % 10 !== 0) continue;
        doc.text(String(c - cx0), X(c), TOP - 2, { align: "center" });
      }
      for (let r = r0; r <= r1; r++) {
        if (r % 10 !== 0) continue;
        doc.text(String(r - cy0), LEFT - 2, Y(r) + 1, { align: "right" });
      }
      doc.setTextColor(0);
      footer(3 + by * cols + bx, total);
    }
  }

  const blob = doc.output("blob");
  downloadBlob(blob, `${slugify(p.name)}${opts.bw ? "-nb" : "-couleur"}.pdf`);
  return blob;
}
