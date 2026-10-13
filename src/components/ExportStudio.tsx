import { useEffect, useRef, useState } from "react";
import { Download, Eye, FileCode2, FileJson, Image, ShoppingBag } from "lucide-react";
import { buildPdf } from "../lib/pdf";
import { compositePattern, computeStats, fabricInfo, type Pattern } from "../lib/pattern";
import { FLOSS } from "../lib/dmc";
import { downloadBlob, saveProjectFile, slugify } from "../lib/io";
import { downloadOxs } from "../lib/oxs";
import { shoppingList } from "../lib/library";
import Sheet from "./Sheet";

export default function ExportStudio({ pattern, onClose }: { pattern: Pattern; onClose: () => void }) {
  const [bw, setBw] = useState(true), [paper, setPaper] = useState<"a4" | "letter">("a4"), [url, setUrl] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const exportChart = async (preview: boolean) => {
    setBusy(true); setError("");
      try { const blob = await buildPdf(pattern, { bw, paper }); if (preview) setUrl(URL.createObjectURL(blob)); else downloadBlob(blob, `${slugify(pattern.name)}-${paper}${bw ? "-symboles" : "-couleur"}.pdf`); } catch (e) { setError(e instanceof Error ? e.message : "Export impossible"); } finally { setBusy(false); }
  };
  const previewCallback = useRef(() => void exportChart(true));
  previewCallback.current = () => void exportChart(true);
  useEffect(() => {
    const preview = () => previewCallback.current();
    window.addEventListener("pointzero:export-preview", preview);
    return () => window.removeEventListener("pointzero:export-preview", preview);
  }, []);
  const png = () => {
    const p = compositePattern(pattern), c = document.createElement("canvas"), scale = Math.min(12, 3000 / Math.max(p.w, p.h));
    c.width = Math.ceil(p.w * scale); c.height = Math.ceil(p.h * scale); const ctx = c.getContext("2d")!;
    ctx.fillStyle = p.fabric?.color ?? "#faf6ed"; ctx.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < p.cross.length; i++) if (p.cross[i] >= 0) { ctx.fillStyle = FLOSS[p.cross[i]].hex; ctx.fillRect((i % p.w) * scale, Math.floor(i / p.w) * scale, scale, scale); }
    ctx.lineCap = "round";
    for (const s of [...p.back, ...p.long]) { ctx.strokeStyle = FLOSS[s.c].hex; ctx.lineWidth = scale * .16; ctx.beginPath(); ctx.moveTo(s.x1 * scale, s.y1 * scale); ctx.lineTo(s.x2 * scale, s.y2 * scale); ctx.stroke(); }
    c.toBlob((blob) => { if (blob) downloadBlob(blob, `${slugify(p.name)}-apercu.png`); });
  };
  const csv = () => {
    const rows = shoppingList([pattern], pattern.supplies ?? {});
    downloadBlob(new Blob(["\uFEFFDMC;Nom;Metres;Echeveaux_a_acheter\n" + rows.map((r) => `${r.code};${r.name};${r.meters.toFixed(2)};${r.buy}`).join("\n")], { type: "text/csv;charset=utf-8" }), `${slugify(pattern.name)}-achats.csv`);
  };
  const fab = fabricInfo(pattern), { totals } = computeStats(pattern);
  return <Sheet open onClose={onClose} guideTarget="project" title="Exporter le patron" subtitle="Contrôler avant de partager ou d’imprimer">
    {pattern.provenance?.personalOnly && <div className="mb-4 border-l-2 border-warn pl-3 text-[13px] leading-relaxed text-warn">Patron tiers : usage personnel. La conversion ne vous transfère pas le droit de redistribuer ou de vendre le motif. Source et auteur restent inscrits au PDF.</div>}
    <p className="mb-4 text-[14px] text-label-2">{pattern.w} × {pattern.h} · {fab.fw.toFixed(1)} × {fab.fh.toFixed(1)} cm · {totals.colors} fils</p>
    <div className="seg mb-3"><button aria-pressed={bw} onClick={() => setBw(true)}>Symboles N&B</button><button aria-pressed={!bw} onClick={() => setBw(false)}>Couleur + symboles</button></div>
    <div className="seg mb-4"><button aria-pressed={paper === "a4"} onClick={() => setPaper("a4")}>A4</button><button aria-pressed={paper === "letter"} onClick={() => setPaper("letter")}>US Letter</button></div>
    <div className="flex gap-2"><button className="btn-primary flex-1" disabled={busy} onClick={() => void exportChart(false)}><Download size={16} />{busy ? "Préparation…" : "PDF"}</button><button className="btn-quiet" disabled={busy} onClick={() => void exportChart(true)}><Eye size={16} />Aperçu</button></div>
    {url && <div className="mt-4"><iframe title="Aperçu du PDF réel" src={url} className="h-[350px] w-full rounded-[12px] bg-white" /><a href={url} target="_blank" rel="noreferrer" className="mt-2 block text-[12px] text-accent-2">Ouvrir le PDF dans un nouvel onglet</a></div>}
    <div className="mt-5 divide-y divide-white/10">{[{ label: "Projet complet JSON", icon: FileJson, fn: () => saveProjectFile(pattern) }, { label: "Format ouvert OXS", icon: FileCode2, fn: () => downloadOxs(pattern) }, { label: "Aperçu couleur PNG", icon: Image, fn: png }, { label: "Liste d’achat CSV", icon: ShoppingBag, fn: csv }].map(({ label, icon: Icon, fn }) => <button key={label} className="flex w-full items-center gap-3 py-4 text-left text-[14px] text-accent-2" onClick={fn}><Icon size={18} />{label}</button>)}</div>
    <p className="mt-4 text-[12px] leading-relaxed text-label-3">Les conventions de fractions et ornements OXS diffèrent selon le lecteur : le cœur croix/arrière est portable, les extensions Point Zéro gardent les détails. Compatibilité avec Pattern Keeper et autres lecteurs à valider sur vos fichiers, sans garantie universelle.</p>
    {error && <p role="alert" className="mt-3 text-[13px] text-danger">{error}</p>}
  </Sheet>;
}