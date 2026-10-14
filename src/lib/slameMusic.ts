import { FLOSS } from "./dmc";
import type { Pattern, Seg } from "./pattern";

/** SLÂME v0.1: musical meanings are conventions, never inferred emotions or words. */
export type GridPoint = { x: number; y: number };
export type ScaleName = "pentatonic" | "major" | "minor" | "dorian" | "blues";
export type StitchSound = { x: number; y: number; midi: number | null; color: string; dmc: string | null; kind: string };
export const SCALES: Record<ScaleName, number[]> = {
  pentatonic: [0, 2, 4, 7, 9],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  blues: [0, 3, 5, 6, 7, 10],
};
export const clampPoint = (p: GridPoint, w: number, h: number): GridPoint => ({
  x: Math.max(0, Math.min(Math.max(0, w - 1), Math.floor(p.x))),
  y: Math.max(0, Math.min(Math.max(0, h - 1), Math.floor(p.y))),
});

/** Integer line rasterization; exact endpoints, works for diagonal/back-stitch gestures. */
export function lineCells(a: GridPoint, b: GridPoint): GridPoint[] {
  let x = a.x, y = a.y;
  const dx = Math.abs(b.x - x), dy = Math.abs(b.y - y);
  const sx = x < b.x ? 1 : -1, sy = y < b.y ? 1 : -1;
  let err = dx - dy;
  const points: GridPoint[] = [];
  for (let n = 0; n < dx + dy + 2; n++) {
    points.push({ x, y });
    if (x === b.x && y === b.y) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
  return points;
}

/** Arbitrarily many waypoints, including returns and loops, subject to a safe UI event limit. */
export function traceRoute(points: GridPoint[], w: number, h: number, maxCells = 8192): GridPoint[] {
  if (!points.length) return [];
  const safe = points.map(p => clampPoint(p, w, h));
  const result = [safe[0]];
  for (let i = 1; i < safe.length && result.length < maxCells; i++) {
    for (const p of lineCells(safe[i - 1], safe[i]).slice(1)) {
      result.push(p);
      if (result.length >= maxCells) break;
    }
  }
  return result;
}

export function flossAt(p: Pattern, x: number, y: number): { index: number; kind: string } {
  if (x < 0 || y < 0 || x >= p.w || y >= p.h) return { index: -1, kind: "empty" };
  const n = y * p.w + x;
  for (const [kind, a] of [["cross", p.cross], ["half-fwd", p.fwd], ["half-bwd", p.bwd], ...p.q.map((q, i) => ["quarter-" + i, q] as const)] as const) {
    if (a[n] >= 0) return { index: a[n], kind };
  }
  const knot = p.knots.find(k => Math.floor(k.x) === x && Math.floor(k.y) === y);
  if (knot) return { index: knot.c, kind: "knot" };
  const back = p.back.find(s => onSegment(s, x + .5, y + .5));
  if (back) return { index: back.c, kind: "backstitch" };
  const long = p.long.find(s => onSegment(s, x + .5, y + .5));
  if (long) return { index: long.c, kind: "longstitch" };
  return { index: -1, kind: "empty" };
}
function onSegment(s: Seg, x: number, y: number) {
  const vx = s.x2 - s.x1, vy = s.y2 - s.y1;
  const len = vx * vx + vy * vy;
  if (!len) return Math.hypot(x - s.x1, y - s.y1) <= .71;
  const t = Math.max(0, Math.min(1, ((x - s.x1) * vx + (y - s.y1) * vy) / len));
  return Math.hypot(x - (s.x1 + t * vx), y - (s.y1 + t * vy)) <= .51;
}
function hueOf(hex: string) {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(...rgb), min = Math.min(...rgb), d = max - min;
  if (d < .0001) return 0;
  const h = max === rgb[0] ? ((rgb[1] - rgb[2]) / d) % 6 :
    max === rgb[1] ? (rgb[2] - rgb[0]) / d + 2 : (rgb[0] - rgb[1]) / d + 4;
  return (h * 60 + 360) % 360;
}
export function toSound(p: Pattern, point: GridPoint, scale: ScaleName, baseMidi = 48, fallbackFloss = -1): StitchSound {
  const { index, kind } = flossAt(p, point.x, point.y);
  const idx = index >= 0 ? index : fallbackFloss;
  const floss = FLOSS[idx];
  if (!floss) return { ...point, midi: null, color: "#242933", dmc: null, kind: "rest" };
  const intervals = SCALES[scale];
  const hue = hueOf(floss.hex);
  const degree = (Math.floor(hue / 360 * intervals.length) + point.x + point.y * 2) % intervals.length;
  const octave = floss.lab[0] > 70 ? 12 : floss.lab[0] < 32 ? -12 : 0;
  return { ...point, midi: baseMidi + intervals[degree] + octave, color: floss.hex, dmc: floss.code, kind };
}

/** Converts an imported image/pattern into a bounded, spatially ordered musical score. */
export function motifRoute(p: Pattern, maxNotes = 512): GridPoint[] {
  let count = 0;
  const populated = (x: number, y: number) => flossAtFast(p, y * p.w + x);
  for (let i = 0; i < p.w * p.h; i++) if (populated(i % p.w, Math.floor(i / p.w))) count++;
  const step = Math.max(1, Math.ceil(count / Math.max(1, maxNotes)));
  const route: GridPoint[] = [];
  let seen = 0;
  for (let y = 0; y < p.h; y++) {
    for (let z = 0; z < p.w; z++) {
      const x = y % 2 ? p.w - 1 - z : z;
      if (!populated(x, y)) continue;
      if (seen % step === 0 && route.length < maxNotes) route.push({ x, y });
      seen++;
    }
  }
  // Line / back-stitch gestures are additional musical events, never mutate the embroidery.
  for (const s of [...p.back, ...p.long]) {
    for (const v of lineCells(clampPoint({ x: s.x1, y: s.y1 }, p.w, p.h), clampPoint({ x: s.x2, y: s.y2 }, p.w, p.h))) {
      if (route.length >= maxNotes) break;
      route.push(v);
    }
    if (route.length >= maxNotes) break;
  }
  for (const k of p.knots) if (route.length < maxNotes) route.push(clampPoint(k, p.w, p.h));
  return route;
}
function flossAtFast(p: Pattern, i: number): boolean {
  return p.cross[i] >= 0 || p.fwd[i] >= 0 || p.bwd[i] >= 0 || p.q.some(q => q[i] >= 0);
}
export function noteFrequency(midi: number, tuning = 440): number {
  return tuning * Math.pow(2, (midi - 69) / 12);
}
