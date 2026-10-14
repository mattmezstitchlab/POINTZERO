import { describe, expect, it } from "vitest";
import { FLOSS, flossIndex } from "../lib/dmc";
import { createPattern, ensurePalette } from "../lib/pattern";
import { closestDmcAlternatives, patternFromVector, remapImportedPalette } from "../lib/pdfColorImport";
import type { VectorResult } from "../lib/pdfVector";

function fakeVector(): VectorResult {
  const cells = new Map<string, string>();
  for (let y = 20; y < 32; y++) for (let x = 10; x < 22; x++) {
    if (x === 20 && y === 30) continue;
    cells.set(x + "," + y, x % 2 ? "310" : "321");
  }
  return {
    ok: true, reason: "", cells,
    bounds: { minC: 10, maxC: 21, minR: 20, maxR: 31 },
    pages: [], legendChars: 2, legendPairs: 2,
    unmapped: { "?": 1 }, conflicts: 0,
  };
}

describe("Import PDF - rétablissement des références DMC", () => {
  it("transforme réellement les cellules vectorielles DMC en grille native avec leurs couleurs exactes", () => {
    const p = patternFromVector(fakeVector(), "Grille importée");
    expect(p).not.toBeNull();
    expect(p!.w).toBe(12);
    expect(p!.h).toBe(12);
    expect(p!.name).toBe("Grille importée");
    expect(p!.cross[0]).toBe(flossIndex("321"));
    expect(p!.cross[1]).toBe(flossIndex("310"));
    expect(p!.cross[(30 - 20) * 12 + (20 - 10)]).toBe(-1);
    expect(p!.palette.map(idx => FLOSS[idx].code).sort()).toEqual(["310", "321"]);
  });

  it("refuse les résultats incomplets et les dimensions incohérentes", () => {
    expect(patternFromVector({ ...fakeVector(), ok: false }, "x")).toBeNull();
    expect(patternFromVector({ ...fakeVector(), bounds: { minC: 0, minR: 0, maxC: 999999, maxR: 999999 } }, "x")).toBeNull();
  });

  it("propose des couleurs voisines sans remplacer le code source à la place de la personne", () => {
    const red = flossIndex("321");
    const matches = closestDmcAlternatives(red, 3);
    expect(matches).toHaveLength(3);
    expect(matches.every(r => r.idx !== red && r.deltaE >= 0)).toBe(true);
  });

  it("remplace simultanément les couleurs, sans les mélanger ni modifier l'original", () => {
    const p = createPattern("Echange", 3, 2);
    const red = flossIndex("321"), black = flossIndex("310");
    ensurePalette(p, red); ensurePalette(p, black);
    p.cross[0] = red;
    p.cross[1] = black;
    p.fwd[3] = black;
    p.knots.push({ x: 1, y: 1, c: red });
    const revised = remapImportedPalette(p, { "321": "310", "310": "321" });
    expect(revised.cross[0]).toBe(black);
    expect(revised.cross[1]).toBe(red);
    expect(revised.fwd[3]).toBe(red);
    expect(revised.knots[0].c).toBe(black);
    expect(p.cross[0]).toBe(red);
    expect(p.cross[1]).toBe(black);
    const invalid = remapImportedPalette(p, { "321": "XXXX" });
    expect(invalid.cross[0]).toBe(red);
  });
});
