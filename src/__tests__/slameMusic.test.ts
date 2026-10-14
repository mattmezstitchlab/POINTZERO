import { describe, expect, it } from "vitest";
import { createPattern } from "../lib/pattern";
import { flossIndex } from "../lib/dmc";
import { clampPoint, flossAt, lineCells, motifRoute, noteFrequency, toSound, traceRoute } from "../lib/slameMusic";

describe("SLÂME — composition accessible et non destructive", () => {
  it("conserve les deux extrémités d'un trait en diagonale", () => {
    expect(lineCells({ x: 0, y: 0 }, { x: 3, y: 3 })).toEqual([
      { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 },
    ]);
  });
  it("accepte autant de jalons qu'on souhaite et préserve les retours", () => {
    const path = traceRoute([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 0 }], 5, 5);
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path.at(-1)).toEqual({ x: 0, y: 0 });
    expect(path.length).toBeGreaterThan(10);
    expect(path.filter(p => p.x === 4 && p.y === 0)).toHaveLength(1);
  });
  it("borne les points et la taille de la partition, pour des motifs immenses", () => {
    expect(clampPoint({ x: -10, y: 500 }, 6, 6)).toEqual({ x: 0, y: 5 });
    const path = traceRoute([{ x: -1, y: 0 }, { x: 99, y: 99 }], 100, 100, 20);
    expect(path).toHaveLength(20);
    expect(path[0]).toEqual({ x: 0, y: 0 });
  });
  it("traduit une vraie couleur DMC en note déterministe, sans en déduire une parole", () => {
    const p = createPattern("SLÂME", 4, 4);
    const red = flossIndex("321");
    p.cross[5] = red;
    expect(flossAt(p, 1, 1)).toEqual({ index: red, kind: "cross" });
    const one = toSound(p, { x: 1, y: 1 }, "pentatonic");
    expect(one.dmc).toBe("321");
    expect(one.midi).toBeGreaterThan(20);
    expect(toSound(p, { x: 1, y: 1 }, "pentatonic")).toEqual(one);
    expect(toSound(p, { x: 0, y: 0 }, "pentatonic").midi).toBeNull();
  });
  it("peut lire une image convertie en motif et son point arrière sans modifier le projet", () => {
    const p = createPattern("Photo", 8, 8);
    const red = flossIndex("321");
    p.cross[0] = red;
    p.cross[9] = red;
    p.back.push({ x1: 0, y1: 2, x2: 7, y2: 2, c: red });
    const original = Array.from(p.cross);
    const route = motifRoute(p);
    expect(route).toContainEqual({ x: 0, y: 0 });
    expect(route).toContainEqual({ x: 1, y: 1 });
    expect(route).toContainEqual({ x: 7, y: 2 });
    expect(Array.from(p.cross)).toEqual(original);
  });
  it("respecte 432 et 440 Hz sans modifier la note MIDI", () => {
    expect(noteFrequency(69, 440)).toBe(440);
    expect(noteFrequency(69, 432)).toBe(432);
  });
});
