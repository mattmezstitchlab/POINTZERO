import { describe, expect, it } from "vitest";
import { runChecks } from "../lib/checks";
import {
  assignedSymbol,
  compositePattern,
  computeStats,
  consumptionCm,
  createPattern,
  effectiveCount,
  ensurePalette,
  skeinsAtCount,
} from "../lib/pattern";
import { FLOSS, flossIndex } from "../lib/dmc";
import { SYMBOL_COUNT } from "../lib/symbols";
import { applySample, type StrokeCtx } from "../lib/stitch";

/**
 * L'auto-vérification du moteur (`lib/checks.ts`) tourne déjà dans l'atelier.
 * La porter ici la rend bloquante : un invariant cassé échoue au build, pas
 * seulement dans un toast que personne ne lit.
 */
const results = runChecks();

describe("Auto-vérification du moteur", () => {
  it("produit au moins les douze contrôles annoncés", () => {
    expect(results.length).toBeGreaterThanOrEqual(12);
  });
  it.each(results.map((r) => [r.name, r] as const))("%s", (_name, result) => {
    expect(result.ok, result.detail).toBe(true);
  });
});

describe("Consommation de fil : une seule formule partout", () => {
  const red = flossIndex("321");

  const filled = (count: 7 | 11 | 14 | 16 | 18 | 20 | 22 | 25 | 28 | 32 | 36 | 40 = 14, size = 10) => {
    const p = createPattern("Fil", size, size, count, 2);
    p.cross.fill(red);
    p.back.push({ x1: 0, y1: 0, x2: size, y2: 0, c: red });
    p.knots.push({ x: size / 2, y: size / 2, c: red });
    ensurePalette(p, red);
    return p;
  };

  it("le total du PDF est celui du moteur", () => {
    const p = filled();
    const { rows, totals } = computeStats(p);
    // La couverture du PDF recalculait autrefois les écheveaux avec ses propres
    // constantes, en oubliant les brins du point arrière, les petites croix,
    // les perles, la marge réglée et les mélanges.
    expect(skeinsAtCount(p, rows, effectiveCount(p))).toBe(totals.skeins);
  });

  it("la marge réglée est prise en compte", () => {
    const p = filled();
    const { rows } = computeStats(p);
    const sobre = skeinsAtCount(p, rows, effectiveCount(p));
    const large = skeinsAtCount({ ...p, waste: 2 }, rows, effectiveCount(p));
    expect(large).toBeGreaterThanOrEqual(sobre);
  });

  it("une toile plus fine demande moins de fil, à nombre de points égal", () => {
    const p = filled();
    const row = computeStats(p).rows.find((r) => r.idx === red)!;
    // Un point sur Aida 18 est plus petit que sur Aida 11 : la longueur cumulée
    // de brin simple diminue quand le comptage augmente.
    expect(consumptionCm(row, p, 18)).toBeLessThan(consumptionCm(row, p, 11));
    // Et cela finit par se voir en écheveaux, sur un motif assez grand pour
    // dépasser les 48 m d'un écheveau.
    const large = filled(14, 60);
    const rows = computeStats(large).rows;
    expect(skeinsAtCount(large, rows, 11)).toBeGreaterThan(skeinsAtCount(large, rows, 18));
  });

  it("les brins du point arrière comptent séparément", () => {
    const p = filled();
    const { rows } = computeStats(p);
    const row = rows.find((r) => r.idx === red)!;
    const un = consumptionCm(row, { ...p, backStrands: 1 }, effectiveCount(p));
    const deux = consumptionCm(row, { ...p, backStrands: 2 }, effectiveCount(p));
    expect(deux).toBeGreaterThan(un);
  });
});

describe("Symboles : l'affectation de l'atelier fait foi", () => {
  const a = flossIndex("321");
  const b = flossIndex("3801");

  it("une affectation automatique reste dans la bibliothèque", () => {
    const p = createPattern("S", 4, 4, 14, 2);
    ensurePalette(p, a);
    ensurePalette(p, b);
    expect(assignedSymbol(p, a)).not.toBe(assignedSymbol(p, b));
    expect(assignedSymbol(p, a)).toBeGreaterThanOrEqual(0);
    expect(assignedSymbol(p, b)).toBeLessThan(SYMBOL_COUNT);
  });

  it("réaffecter un symbole change bien la valeur lue", () => {
    const p = createPattern("S", 4, 4, 14, 2);
    ensurePalette(p, a);
    ensurePalette(p, b);
    const before = assignedSymbol(p, a);
    p.symbolMap = { ...p.symbolMap, [FLOSS[a].code]: (before + 40) % SYMBOL_COUNT };
    expect(assignedSymbol(p, a)).not.toBe(before);
    // La position dans la palette, elle, n'a pas bougé : c'est l'écart entre les
    // deux que le PDF imprimait avant le correctif.
    expect(p.palette.indexOf(a)).toBe(0);
  });

  it("l'échange anti-collision ne laisse pas deux fils avec le même symbole", () => {
    const p = createPattern("S", 4, 4, 14, 2);
    ensurePalette(p, a);
    ensurePalette(p, b);
    // Même geste que la fiche fil : on donne à `a` le symbole de `b`, et `b`
    // récupère l'ancien symbole de `a`.
    const target = assignedSymbol(p, b);
    const other = p.palette.find((c) => c !== a && assignedSymbol(p, c) === target);
    const map = { ...p.symbolMap, [FLOSS[a].code]: target };
    if (other !== undefined) map[FLOSS[other].code] = assignedSymbol(p, a);
    p.symbolMap = map;
    const used = p.palette.map((idx) => assignedSymbol(p, idx));
    expect(new Set(used).size).toBe(used.length);
  });
});

describe("Calques", () => {
  const red = flossIndex("321");

  it("un motif sans calque est renvoyé tel quel", () => {
    const p = createPattern("Plat", 6, 6, 14, 2);
    expect(compositePattern(p)).toBe(p);
  });

  it("la fusion est stable quand on la refait", () => {
    const p = createPattern("Plat", 6, 6, 14, 2);
    p.cross[0] = red;
    ensurePalette(p, red);
    const once = compositePattern(p);
    const twice = compositePattern(once);
    expect(Array.from(twice.cross)).toEqual(Array.from(once.cross));
  });
});

describe("Suivi de broderie", () => {
  const red = flossIndex("321");
  const ctx = (tool: StrokeCtx["tool"]): StrokeCtx => ({ tool, color: red, lastNode: null, fillDone: false, markMode: -1 });

  it("poser deux fois le même noeud ne change rien la seconde fois", () => {
    const p = createPattern("Noeuds", 5, 5, 14, 2);
    ensurePalette(p, red);
    expect(applySample(p, ctx("knot"), { x: 2.1, y: 2.1 })).toBe(true);
    // Sans cette garde, chaque re-tap créait une entrée d'historique pour un
    // motif inchangé.
    expect(applySample(p, ctx("knot"), { x: 2.1, y: 2.1 })).toBe(false);
    expect(p.knots).toHaveLength(1);
  });

  it("un noeud d'une autre couleur remplace le précédent sur le même trou", () => {
    const blue = flossIndex("3801");
    const p = createPattern("Noeuds", 5, 5, 14, 2);
    ensurePalette(p, red);
    applySample(p, ctx("knot"), { x: 2.1, y: 2.1 });
    applySample(p, { ...ctx("knot"), color: blue }, { x: 2.1, y: 2.1 });
    expect(p.knots).toHaveLength(1);
    expect(p.knots[0].c).toBe(blue);
  });

  it("garer un fil puis le reprendre au même coin libère la place", () => {
    const p = createPattern("Parking", 5, 5, 14, 2);
    p.cross[0] = red;
    ensurePalette(p, red);
    applySample(p, ctx("park"), { x: 0.1, y: 0.1 });
    expect(p.parked).toHaveLength(1);
    applySample(p, ctx("park"), { x: 0.1, y: 0.1 });
    expect(p.parked).toHaveLength(0);
  });

  it("marquer une case terminée ne touche pas au dessin", () => {
    const p = createPattern("Suivi", 5, 5, 14, 2);
    p.cross[0] = red;
    p.back.push({ x1: 0, y1: 0, x2: 2, y2: 0, c: red });
    ensurePalette(p, red);
    applySample(p, ctx("mark"), { x: 0.5, y: 0.5 });
    expect(p.done[0]).toBe(1);
    expect(p.cross[0]).toBe(red);
    expect(p.back).toHaveLength(1);
  });
});
