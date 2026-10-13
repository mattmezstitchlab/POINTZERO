/**
 * Composeur de prompt pour la génération de motifs de broderie détaillés.
 *
 * La source générée est une ILLUSTRATION riche et lisse (pas un « point de croix »
 * déjà aplati) : c'est ensuite le dithering Floyd–Steinberg qui la transforme en
 * motif de point de croix avec de vrais dégradés. Plus la source est détaillée et
 * lisse, plus le motif final a de « détail réaliste ».
 */

export type StyleId = "reeliste" | "botanique" | "animalier" | "portrait" | "paysage" | "geometrique" | "minimal";
export type DetailId = "delicat" | "equilibre" | "tres";
export type FormatId = "carre" | "portrait" | "paysage";

export const STYLES: { id: StyleId; label: string; desc: string }[] = [
  { id: "reeliste", label: "Réaliste", desc: "photorealistic painterly illustration, highly detailed, lifelike, rich smooth color gradients, fine intricate detail, realistic textures, professional, maximum detail, smooth shading" },
  { id: "botanique", label: "Botanique", desc: "detailed botanical watercolor illustration, delicate detailed botanical art, smooth natural color gradients, rich color, elegant, detailed foliage and petals, smooth painterly" },
  { id: "animalier", label: "Animalier", desc: "detailed wildlife animal illustration, lifelike, fine fur and feather detail, natural rich colors, smooth gradients, professional wildlife art, highly detailed" },
  { id: "portrait", label: "Portrait", desc: "detailed portrait illustration, soft lifelike skin tones, smooth gradients, expressive, professional, fine facial detail, highly detailed, rich skin color" },
  { id: "paysage", label: "Paysage", desc: "detailed scenic landscape, layered depth, atmospheric perspective, smooth sky gradients, rich natural colors, scenic detail, highly detailed" },
  { id: "geometrique", label: "Géométrique", desc: "modern flat geometric illustration, clean bold shapes, harmonious palette, contemporary, crisp clean, smooth flat color" },
  { id: "minimal", label: "Minimal", desc: "minimal flat illustration, clean simple shapes, limited colors, elegant minimal, clean negative space, smooth flat color" },
];

export const DETAILS: { id: DetailId; label: string; desc: string; colors: number }[] = [
  { id: "delicat", label: "Délicat", desc: "clean simple shapes, limited smooth color transitions, elegant and simple, clean", colors: 24 },
  { id: "equilibre", label: "Équilibré", desc: "rich smooth color gradients, balanced fine detail, professional, smooth, clean", colors: 40 },
  { id: "tres", label: "Très détaillé", desc: "extremely detailed, maximum intricate detail, ultra detailed, fine smooth gradients, rich painterly detail, very rich color depth, high fidelity, very detailed, smooth", colors: 64 },
];

export const FORMATS: { id: FormatId; label: string; w: number; h: number }[] = [
  { id: "carre", label: "Carré", w: 1024, h: 1024 },
  { id: "portrait", label: "Portrait", w: 832, h: 1216 },
  { id: "paysage", label: "Paysage", w: 1216, h: 832 },
];

export interface PromptInput {
  subject: string;
  main: string;
  second: string;
  relation: string;
  style: StyleId;
  detail: DetailId;
  format: FormatId;
}

const STOP_WORDS = new Set([
  "un", "une", "des", "de", "du", "sur", "dans", "avec", "et", "au", "aux", "la", "le", "les", "pour",
  "the", "a", "an", "on", "in", "with", "and", "of",
]);

export function parseComposition(source: string) {
  const s = source.trim();
  const fr = /\b(.+?)\s+sur\s+(?:un|une|le|la|l['’])\s+(.+)/i.exec(s);
  const en = /\b(.+?)\s+(?:on top of|on)\s+(?:a|an|the)\s+(.+)/i.exec(s);
  const m = fr ?? en;
  if (!m) return { main: s, extra: "", relation: "" };
  return { main: m[2].trim(), extra: m[1].trim(), relation: "the smaller subject is clearly perched on top of the main subject, both fully visible" };
}

/**
 * Construit un prompt d'ILLUSTRATION source riche et lisse. Le dithering (pas le
 * prompt) transforme ensuite cette illustration en point de croix détaillé.
 */
export function buildPrompt(i: PromptInput): string {
  const style = STYLES.find((s) => s.id === i.style)?.desc ?? STYLES[0].desc;
  const detail = DETAILS.find((d) => d.id === i.detail)?.desc ?? DETAILS[1].desc;
  const main = (i.main || i.subject || "").trim();
  const second = (i.second || "").trim();
  const relation = (i.relation || "").trim();

  let subject: string;
  if (second) subject = `${main}, with ${second}${relation ? `, ${relation}` : ""}`;
  else subject = main;

  const tokens = i.subject
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .match(/[a-z0-9-]{3,}/g) ?? [];
  const focus = [...new Set(tokens.filter((t) => !STOP_WORDS.has(t)))].slice(0, 8);
  const focusLine = focus.length > 1 ? `Make sure these elements are all clearly present: ${focus.join(", ")}.` : "";

  return [
    `A highly detailed ${style} of ${subject},`,
    detail,
    "rich smooth color gradients, rich color depth, crisp clean shapes, crisp fine detail, professional, smooth shading,",
    focusLine,
    "centered single subject, flat front view, plain solid white background, no shading on the background,",
    "no text, no words, no letters, no numbers, no watermark, no signature, no border, no hoop, no hands, no table, no room, no background clutter, no extra objects, no cross-stitch texture, no stitching texture, no grid",
  ]
    .filter(Boolean)
    .join(" ");
}

export function pollinationsUrl(prompt: string, w: number, h: number, seed: number): string {
  const p = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${p}?width=${w}&height=${h}&seed=${seed}&model=flux&nologo=true&enhance=true&safe=true`;
}

/** Hauteur de grille qui conserve l'aspect du format, arrondie à un nombre pair. */
export function gridHeightFor(base: number, format: FormatId): number {
  const f = FORMATS.find((f) => f.id === format) ?? FORMATS[0];
  const h = Math.round((base * f.h) / f.w / 2) * 2;
  return Math.max(20, Math.min(400, h));
}
