import { FLOSS } from './dmc';
import { createPattern, computeStats, type Count, type Pattern } from './pattern';
import { shoppingList } from './library';

/** Fit both sides inside the chosen limit, preserving aspect ratio without distortion. */
export function souvenirDimensions(width: number, height: number, limit: number) {
  if (![width, height, limit].every(Number.isFinite) || width <= 0 || height <= 0 || !Number.isInteger(limit) || limit < 20 || limit > 200) throw Error('Dimensions invalides (20 à 200 points sur le grand côté).');
  const scale = limit / Math.max(width, height);
  return { w: Math.max(1, Math.round(width * scale)), h: Math.max(1, Math.round(height * scale)) };
}
export function souvenirPattern(name: string, source: string, w: number, h: number, count: Count, cross: Int16Array, palette: number[]): Pattern {
  if (cross.length !== w * h || !palette.length || !cross.some(value => value >= 0)) throw Error('Aucun point exploitable dans cette image.');
  const pattern = createPattern(name.trim() || 'Mon souvenir', w, h, count, 2);
  pattern.cross = cross.slice(); pattern.palette = [...palette];
  pattern.provenance = { kind: 'image', source, author: '', license: 'Droits à vérifier par le titulaire', personalOnly: true };
  return pattern;
}
export function souvenirShoppingCsv(pattern: Pattern) {
  const rows = [['Code DMC','Nom','Longueur cumulée de brins simples estimée (m)','Écheveaux 8 m / 6 brins à prévoir (stock non déduit)'],
    ...shoppingList([pattern], {}).map(row => [row.code, row.name, row.meters.toFixed(2), String(row.buy)])];
  return '\uFEFF' + rows.map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(';')).join('\r\n');
}
export function hasSouvenirContent(pattern: Pattern) { return computeStats(pattern).totals.units > 0; }

/** This focused viewer must never silently flatten an advanced project. */
export function isSimpleSouvenir(pattern: Pattern): boolean {
  return pattern.w <= 200 && pattern.h <= 200 && (pattern.fabric?.type ?? 'aida') === 'aida' && (pattern.fabric?.over ?? 1) === 1
    && !pattern.palette.some(idx => !!FLOSS[idx].blend)
    && !pattern.back.length && !pattern.long.length && !pattern.knots.length
    && !(pattern.special?.length) && !(pattern.layers?.length)
    && !pattern.fwd.some(value => value >= 0) && !pattern.bwd.some(value => value >= 0)
    && !pattern.q.some(cells => cells.some(value => value >= 0));
}
