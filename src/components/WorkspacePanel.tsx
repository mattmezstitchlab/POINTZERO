import { useRef, useState } from "react";
import { Check, Circle, FileDown, FileJson, FileUp, Film, FolderOpen, ImagePlus, Layers, Lock, Plus, Radio, ShieldCheck, Sparkles, Unlock, X } from "lucide-react";
import { COUNTS, ensurePalette, fabricInfo, type Pattern } from "../lib/pattern";
import { addLayer, replaceColor, resizePattern, stampText, switchLayer } from "../lib/editing";
import { BASE_FLOSS, FLOSS, flossIndex, nearestFlossList, registerBlend } from "../lib/dmc";
import { deltaELabel } from "../lib/colorScience";
import { removeConfetti } from "../lib/convert";
import { clonePattern } from "../lib/pattern";
import { runChecks, type CheckResult } from "../lib/checks";
import { SYMBOL_COUNT } from "../lib/symbols";
import { sessionSummary } from "../lib/sessionStats";
import type { Tool } from "../lib/stitch";
import Sheet from "./Sheet";

export interface Preferences {
  highContrast: boolean; largeText: boolean; pencilOnly: boolean; onlyActive: boolean; keepAwake: boolean;
  symmetry: "none" | "x" | "y" | "both"; annotation: string;
  halfDirection: "auto" | "forward" | "backward";
}
export const DEFAULT_PREFS: Preferences = { highContrast: false, largeText: false, pencilOnly: false, onlyActive: true, keepAwake: true, symmetry: "none", annotation: "", halfDirection: "forward" };
export interface PanelActions {
  importFile: (file: File) => void; openFile: (file: File) => void; export: () => void; save: () => void;
  new: (w: number, h: number) => void; library: () => void; studio: () => void; share: () => void; prompt: () => void;
  notify: (msg: string) => void;
}
export default function WorkspacePanel({ open, onClose, pattern: p, onSet, actions, prefs, onPrefs, onTool, tool, color, onColor, workspace }: {
  open: boolean; onClose: () => void; pattern: Pattern; onSet: (p: Pattern) => void; actions: PanelActions;
  prefs: Preferences; onPrefs: (v: Preferences) => void; onTool: (v: Tool) => void; tool: Tool; color: number; onColor: (c: number) => void; workspace: "create" | "stitch";
}) {
  const importRef = useRef<HTMLInputElement>(null), pdfRef = useRef<HTMLInputElement>(null), fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState("prepare"), [w, setW] = useState(80), [h, setH] = useState(80), [text, setText] = useState("BONJOUR"), [scale, setScale] = useState(1), [to, setTo] = useState(""), [mixA, setMixA] = useState("321"), [mixB, setMixB] = useState("Blanc"), [aStrands, setAStrands] = useState(1), [bStrands, setBStrands] = useState(1), [tests, setTests] = useState<CheckResult[] | null>(null);
  const f = p.fabric ?? { type: "aida", over: 1, color: "#f7f2e8", margin: 7.5, units: "cm" };
  const fab = fabricInfo(p), dim = (v: number) => (f.units === "in" ? v / 2.54 : v).toFixed(2) + (f.units === "in" ? " in" : " cm");
  // Le panneau reste monté pendant qu'on brode : `sessionSummary` recompte
  // toutes les cases pour l'estimation de fin, autant ne le faire que quand le
  // journal est réellement affiché, et pas à chaque échantillon de stylet.
  const session = open ? sessionSummary(p) : null;
  // Trois substitutions du fil actif, par écart perceptuel croissant. Le pool
  // par défaut exclut les mélanges : on ne propose pas une recette comme
  // remplacement d'une recette.
  const substituts = open && FLOSS[color]
    ? nearestFlossList(FLOSS[color].lab, 4).filter((s) => s.idx !== color).slice(0, 3)
    : [];
  const change = <K extends keyof Preferences>(key: K, value: Preferences[K]) => onPrefs({ ...prefs, [key]: value });
  const toolButton = (id: Tool, title: string) => <button key={id} className={`flex min-h-11 items-center gap-2 rounded-[10px] px-3 text-left text-[13px] ${tool === id ? "bg-accent/15 text-accent-2" : "hover:bg-white/[.04] text-label-2"}`} aria-pressed={tool === id} onClick={() => onTool(id)}><Circle size={12} />{title}</button>;

  return <Sheet open={open} onClose={onClose} title={workspace === "stitch" ? "Atelier de broderie" : "Projet"} subtitle={p.name}
    guideTarget="project"
    toolbar={<div><div className="grid grid-cols-5 gap-1.5">{[{ label: "Photo", icon: ImagePlus, fn: () => importRef.current?.click() }, { label: "PDF", icon: FileUp, fn: () => pdfRef.current?.click() }, { label: "Idée", icon: Sparkles, fn: actions.prompt }, { label: "Exporter", icon: FileDown, fn: actions.export }, { label: "Sauver", icon: FileJson, fn: actions.save }].map(({ label, icon: Icon, fn }) => <button key={label} onClick={fn} title={label === "Idée" ? "Générer un motif depuis une description" : label} className="flex flex-col items-center gap-1.5 py-2 text-accent-2 transition-transform hover:text-white active:scale-95"><Icon size={21} strokeWidth={1.8} /><span className="text-[11px]">{label}</span></button>)}</div>
      <div className="seg mt-4">{[{ id: "prepare", label: "Préparer" }, { id: "edit", label: "Dessin" }, { id: "follow", label: "Suivre" }, { id: "settings", label: "Réglages" }].map((v) => <button key={v.id} aria-pressed={tab === v.id} onClick={() => setTab(v.id)}>{v.label}</button>)}</div></div>}>
    <input type="file" accept="image/*" className="hidden" ref={importRef} onChange={(e) => { const file = e.target.files?.[0]; if (file) actions.importFile(file); e.target.value = ""; }} />
    <input type="file" accept=".pdf,application/pdf" className="hidden" ref={pdfRef} onChange={(e) => { const file = e.target.files?.[0]; if (file) actions.importFile(file); e.target.value = ""; }} />
    <input type="file" accept=".json,.oxs,application/json,application/xml" className="hidden" ref={fileRef} onChange={(e) => { const file = e.target.files?.[0]; if (file) actions.openFile(file); e.target.value = ""; }} />
    <datalist id="all-floss">{BASE_FLOSS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</datalist>
    <div className="space-y-5">
      {tab === "prepare" && <>
        <Block title="Tissu, comptage et dimensions"><div className="grid grid-cols-2 gap-3"><Label title="Tissu"><select className="field" value={f.type} onChange={(e) => onSet({ ...p, fabric: { ...f, type: e.target.value as typeof f.type, over: e.target.value === "aida" ? 1 : f.over } })}><option value="aida">Aida / Binca</option><option value="linen">Lin</option><option value="evenweave">Evenweave</option></select></Label><Label title="Comptage réel"><select className="field" value={p.count} onChange={(e) => onSet({ ...p, count: +e.target.value as Pattern["count"] })}>{COUNTS.map((c) => <option key={c} value={c}>{c} ct</option>)}</select></Label><Label title="Sur combien de fils"><select className="field" value={f.over} disabled={f.type === "aida"} onChange={(e) => onSet({ ...p, fabric: { ...f, over: +e.target.value as 1 | 2 } })}><option value={1}>Sur 1</option><option value={2}>Sur 2</option></select></Label><Label title="Unités"><select className="field" value={f.units} onChange={(e) => onSet({ ...p, fabric: { ...f, units: e.target.value as "cm" | "in" } })}><option value="cm">Centimètres</option><option value="in">Pouces</option></select></Label><NumberField title="Brins croix (1–6)" value={p.strands} min={1} max={6} onChange={(v) => onSet({ ...p, strands: v })} /><NumberField title="Brins arrière" value={p.backStrands ?? 1} min={1} max={6} onChange={(v) => onSet({ ...p, backStrands: v })} /><NumberField title="Marge par côté (cm)" value={f.margin} min={0} max={30} step={.5} onChange={(v) => onSet({ ...p, fabric: { ...f, margin: v } })} /><Label title="Couleur de toile"><input type="color" className="field p-1" value={f.color} onChange={(e) => onSet({ ...p, fabric: { ...f, color: e.target.value } })} /></Label></div>
          <p className="mt-4 text-[13px] leading-relaxed text-label-2">Grille : {p.w} × {p.h}. Taille finie : {dim(fab.fw)} × {dim(fab.fh)}.<br />Toile minimum : {dim(fab.mw)} × {dim(fab.mh)}. Pas : {fab.pitchMm.toFixed(2)} mm.</p>
          <NumberField title="Marge de fil estimée (%)" min={0} max={100} value={Math.round(((p.waste ?? 1.15) - 1) * 100)} onChange={(v) => onSet({ ...p, waste: 1 + v / 100 })} />
          <p className="mt-2 text-[11px] leading-relaxed text-label-3">Métrage exprimé en équivalent 6 brins. Un écheveau DMC de 8 m fournit 48 m de brin simple. Tension, technique et trajets au dos font varier la consommation.</p>
        </Block>
        <Block title="Nouvelle grille ou redimensionnement"><div className="grid grid-cols-2 gap-3"><NumberField title="Colonnes" value={w} min={1} max={1000} onChange={setW} /><NumberField title="Rangées" value={h} min={1} max={1000} onChange={setH} /></div><div className="mt-3 flex gap-2"><button className="btn-tinted flex-1" onClick={() => actions.new(w, h)}><Plus size={16} />Nouvelle</button><button className="btn-quiet flex-1" onClick={() => { onSet(resizePattern(p, w, h)); actions.notify("Grille redimensionnée, centrée. Les calques sont aplatis sur le calque actif."); }}>Redimensionner</button></div><p className="mt-2 text-[11px] text-label-3">Réduire la grille coupe les points hors limites. Cette opération est annulable.</p></Block>
        <Block title="Auteur, source et droits"><Label title="Auteur"><input className="field" value={p.provenance?.author ?? ""} onChange={(e) => onSet({ ...p, provenance: { kind: "original", source: "", license: "Tous droits réservés", personalOnly: false, ...p.provenance, author: e.target.value } })} /></Label><Label title="Source originale"><input className="field" value={p.provenance?.source ?? ""} onChange={(e) => onSet({ ...p, provenance: { kind: "original", author: "", license: "Tous droits réservés", personalOnly: false, ...p.provenance, source: e.target.value } })} /></Label><p className="mt-2 text-[12px] text-label-3">{p.provenance?.license || "Création originale"}{p.provenance?.personalOnly ? " · Usage personnel uniquement" : ""}. Ces informations accompagnent le PDF et le fichier projet.</p><Label title="Dossier"><input className="field" value={p.folder ?? ""} onChange={(e) => onSet({ ...p, folder: e.target.value })} placeholder="Ex. Botanique" /></Label></Block>
      </>}

      {tab === "edit" && <>
        {workspace === "stitch" && <p className="border-l-2 border-warn pl-3 text-[12px] text-warn">Passez en mode Créer pour modifier le patron. Le suivi reste séparé du dessin.</p>}
        <fieldset disabled={workspace === "stitch"} className="space-y-5 disabled:opacity-50">
        <Label title="Sens du demi-point"><select className="field" value={prefs.halfDirection} onChange={(e) => change("halfDirection", e.target.value as Preferences["halfDirection"])}><option value="forward">Diagonale /</option><option value="backward">Diagonale inverse</option><option value="auto">Selon le côté touché</option></select></Label>
        <Block title="Outils de conception"><div className="grid grid-cols-2 gap-1">{([['select','Sélection rectangle'],['lasso','Lasso'],['move','Déplacer la sélection'],['line','Ligne de croix'],['rect','Rectangle'],['ellipse','Ellipse'],['threeQuarter','Trois-quarts'],['petite','Petite croix'],['bead','Perle']] as [Tool,string][]).map(([id,label]) => toolButton(id,label))}</div><Label title="Symétrie du dessin"><select className="field" value={prefs.symmetry} onChange={(e) => change("symmetry", e.target.value as Preferences["symmetry"])}><option value="none">Aucune</option><option value="x">Miroir horizontal</option><option value="y">Miroir vertical</option><option value="both">Les deux axes</option></select></Label></Block>
        <Block title="Lettrage compté"><Label title="Alphabet 5 × 7, A–Z et chiffres"><input className="field" value={text} maxLength={60} onChange={(e) => setText(e.target.value)} /></Label><NumberField title="Échelle de l’alphabet" value={scale} min={1} max={5} onChange={setScale} /><button className="btn-tinted mt-3 w-full" onClick={() => { onSet(stampText(p, text, Math.max(0, Math.floor(p.w / 2 - text.length * 3 * scale)), Math.floor(p.h / 2), color, scale)); actions.notify("Lettrage posé en croix réelles. Annulable."); }}>Poser le texte au centre</button></Block>
        <Block title="Remplacer le fil actif">
          <p className="text-[12px] text-label-3">Fil actif : DMC {FLOSS[color]?.code ?? "—"}. Remplace tous ses points sur le calque actif.</p>
          <input className="field mt-2" list="all-floss" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Code DMC de remplacement" />
          {substituts.length > 0 && <>
            <p className="mt-3 text-[11px] text-label-3">Substitutions les plus proches, par écart perceptuel :</p>
            <div className="mt-1 grid gap-1">
              {substituts.map((s) => (
                <button
                  key={s.idx}
                  type="button"
                  onClick={() => setTo(FLOSS[s.idx].code)}
                  className="flex items-center gap-2 rounded-[9px] bg-white/[0.04] p-1.5 text-left transition-colors hover:bg-white/[0.09]"
                  aria-label={`Remplacer par DMC ${FLOSS[s.idx].code}, ${FLOSS[s.idx].name}, écart ${s.deltaE.toFixed(1)}, ${deltaELabel(s.deltaE)}`}
                >
                  <span className="h-6 w-6 shrink-0 rounded-[7px] ring-1 ring-black/30" style={{ background: FLOSS[s.idx].hex }} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[11px]">DMC {FLOSS[s.idx].code}</span>
                    <span className="block truncate text-[10px] text-label-3">{FLOSS[s.idx].name}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-[10px] tabular-nums">ΔE {s.deltaE.toFixed(1)}</span>
                    <span className="block text-[9px] text-label-3">{deltaELabel(s.deltaE)}</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-label-3">Une proposition remplit le champ, le remplacement reste à confirmer et il est annulable. Sous 1 ΔE00 l'écart est invisible, au-dessus de 3 il se voit de près : la substitution ne remplace pas une carte physique.</p>
          </>}
          <button className="btn-tinted mt-3 w-full" onClick={() => { const idx = flossIndex(to); if (idx >= 0) { onSet(replaceColor(p, color, idx)); onColor(idx); } else actions.notify("Code DMC introuvable"); }}>Remplacer globalement</button>
        </Block>
        <Block title="Fils mélangés"><div className="grid grid-cols-2 gap-3"><Label title="DMC A"><input className="field" list="all-floss" value={mixA} onChange={(e) => setMixA(e.target.value)} /></Label><Label title="DMC B"><input className="field" list="all-floss" value={mixB} onChange={(e) => setMixB(e.target.value)} /></Label><NumberField title="Brins A" value={aStrands} min={1} max={5} onChange={setAStrands} /><NumberField title="Brins B" value={bStrands} min={1} max={5} onChange={setBStrands} /></div><button className="btn-tinted mt-3 w-full" onClick={() => { const c = registerBlend(mixA, mixB, aStrands, bStrands); if (c < 0) actions.notify("Deux codes valides, de 2 à 6 brins au total, sont nécessaires."); else { const next = clonePattern(p); ensurePalette(next, c); onSet(next); onColor(c); actions.notify("Recette de mélange sélectionnée"); } }}>Créer ce mélange</button><p className="mt-2 text-[11px] text-label-3">La couleur affichée est indicative, pas une mesure du fil mélangé. La liste d’achat répartit les besoins entre les deux références.</p></Block>
        <Block title="Calques"><button className="mb-3 flex items-center gap-2 text-[13px] text-accent-2" onClick={() => onSet(addLayer(p))}><Plus size={15} />Ajouter un calque</button>{(p.layers ?? []).map((l) => <div key={l.id} className="mb-2 flex items-center gap-2"><button className="btn-icon" aria-label={l.visible ? "Masquer le calque" : "Afficher le calque"} onClick={() => onSet({ ...p, layers: p.layers?.map((v) => v.id === l.id ? { ...v, visible: !v.visible } : v) })}><Layers size={15} className={l.visible ? "text-accent-2" : "text-label-3"} /></button><button className={`flex-1 text-left text-[13px] ${p.activeLayer === l.id ? "text-accent-2" : ""}`} onClick={() => onSet(switchLayer(p, l.id))}>{l.name}</button><button className="btn-icon" aria-label={l.locked ? "Déverrouiller" : "Verrouiller"} onClick={() => onSet({ ...p, layers: p.layers?.map((v) => v.id === l.id ? { ...v, locked: !v.locked } : v) })}>{l.locked ? <Lock size={15} /> : <Unlock size={15} />}</button></div>)}<p className="text-[11px] text-label-3">Les exports compositent les calques visibles. Les modifications sont effectuées sur le calque actif.</p></Block>
        <Block title="Nettoyage contrôlé"><button className="btn-quiet w-full" onClick={() => { const next = clonePattern(p), n = removeConfetti(next.cross, next.w, next.h); if (n) onSet(next); actions.notify(`${n} petites modifications, annulables`); }}>Fusionner les croix isolées</button><p className="mt-2 text-[11px] text-label-3">Une croix isolée peut être un détail intentionnel. Inspectez le résultat avant d’exporter.</p></Block>
        </fieldset>
      </>}

      {tab === "follow" && <>
        <Block title="Marquer sans modifier le patron"><div className="grid grid-cols-2 gap-1">{([['mark','Case par case'],['details','Contours / ornements'],['block','Bloc 10 × 10'],['row','Ligne entière'],['park','Garer un fil'],['unpick','À défaire'],['note','Note sur la grille']] as [Tool,string][]).map(([id,label]) => toolButton(id,label))}</div><Toggle title="Uniquement le fil actif" checked={prefs.onlyActive} onChange={() => change("onlyActive", !prefs.onlyActive)} /><p className="mt-2 text-[11px] text-label-3">Les croix et fractions sont suivies par case. Les contours, noeuds, petites croix et perles sont suivis séparément. Les fractions de plusieurs couleurs dans une même case sont marquées ensemble : vérifiez-les visuellement.</p></Block>
        <Block title="Parking et rappels"><p className="text-[12px] leading-relaxed text-label-2">{p.parked?.length ?? 0} fils garés · {p.mistakes?.length ?? 0} cases à défaire. Avec Parking, touchez le coin d’une case. Retouchez le même emplacement pour libérer le fil.</p><Label title="Texte de la prochaine annotation"><textarea className="field min-h-[80px] py-2" value={prefs.annotation} onChange={(e) => change("annotation", e.target.value)} placeholder="Ex. Vérifier les points arrière avant de finir" /></Label>{(p.annotations ?? []).map((a, i) => <div key={i} className="mt-2 flex items-start gap-2 text-[12px]"><span className="flex-1 text-label-2">({a.x},{a.y}) {a.text}</span><button aria-label="Supprimer cette note" onClick={() => onSet({ ...p, annotations: p.annotations?.filter((_, n) => n !== i) })}><X size={14} /></button></div>)}</Block>
        <Block title="Journal du projet"><p className="text-[13px] text-label-2">{Math.round((p.sessions ?? []).reduce((n, s) => n + s.seconds, 0) / 60)} min en mode Broder · {(p.sessions ?? []).reduce((n, s) => n + s.cells, 0)} cases nettes marquées.</p><p className="mt-2 text-[12px] text-label-2">{session?.activeDays ?? 0} jour(s) actifs · meilleure série : {session?.longest ?? 0} jours · {(session?.perMinute ?? 0).toFixed(1)} cases/min enregistrées.</p>{session?.eta && <p className="mt-1 text-[12px] text-label-2">Fin indicative des croix : {session.eta}, au rythme enregistré.</p>}{(p.sessions ?? []).slice(-7).reverse().map((s, i) => <div key={i} className="mt-2 flex justify-between text-[12px] text-label-3"><span>{s.date}</span><span>{Math.round(s.seconds / 60)} min · {s.cells} cases</span></div>)}<p className="mt-2 text-[11px] text-label-3">Le temps est compté quand l’atelier est visible, en mode Broder. Ce n’est pas une mesure de la vitesse réelle de l’aiguille. L’estimation de fin apparaît après trois jours, sans garantie de délai.</p><button className="mt-3 text-[13px] text-accent-2" onClick={() => { if (window.confirm("Réinitialiser le suivi de ce patron ? Le dessin reste intact.")) { const next = clonePattern(p); next.done.fill(0); next.parked = []; next.mistakes = []; next.ornamentDone = []; onSet(next); } }}>Réinitialiser le suivi</button></Block>
      </>}

      {tab === "settings" && <>
        <Block title="Confort et accessibilité"><Toggle title="Grille à contraste élevé" checked={prefs.highContrast} onChange={() => change("highContrast", !prefs.highContrast)} /><Toggle title="Texte plus grand" checked={prefs.largeText} onChange={() => change("largeText", !prefs.largeText)} /><Toggle title="Dessiner au stylet uniquement" checked={prefs.pencilOnly} onChange={() => change("pencilOnly", !prefs.pencilOnly)} /><Toggle title="Garder l’écran éveillé en brodant" checked={prefs.keepAwake} onChange={() => change("keepAwake", !prefs.keepAwake)} /><p className="mt-2 text-[11px] leading-relaxed text-label-3">Clavier : flèches pour parcourir la grille, Entrée pour utiliser l’outil, +/− pour zoomer. Un annonceur décrit la case courante aux lecteurs d’écran. Les mouvements réduits de l’appareil sont respectés.</p></Block>
        <Block title="Bibliothèque et présentation"><button className="menu-row" onClick={actions.library}><FolderOpen size={17} />Mes projets et versions</button><button className="menu-row" onClick={() => fileRef.current?.click()}><FileUp size={17} />Ouvrir un fichier JSON ou OXS</button><button className="menu-row" onClick={actions.studio}><Film size={17} />Présentation guidée et enregistrement</button><button className="menu-row" onClick={actions.share}><Radio size={17} />Lecture partagée en direct</button></Block>
        <Block title="Vérifications locales"><button className="btn-tinted w-full" onClick={() => setTests(runChecks())}><ShieldCheck size={16} />Exécuter les tests du moteur</button>{tests && <div className="mt-3 space-y-2">{tests.map((t) => <p key={t.name} className={`flex items-start gap-2 text-[11px] ${t.ok ? "text-ok" : "text-danger"}`}>{t.ok ? <Check size={13} className="mt-0.5 shrink-0" /> : <X size={13} />}{t.name}{!t.ok && ` : ${t.detail}`}</p>)}</div>}<p className="mt-3 text-[11px] leading-relaxed text-label-3">{BASE_FLOSS.length} références couleur documentées. DMC commercialise 500 teintes ; les références sans valeur fiable ne sont pas inventées. {SYMBOL_COUNT} définitions vectorielles disponibles, mêmes formes dans le PDF et l’écran. La lisibilité des symboles complexes à petite taille doit être testée à l’impression.</p></Block>
        <Block title="Confidentialité et droits"><p className="text-[12px] leading-relaxed text-label-2">Images, patrons, stock et versions sont traités et conservés localement. Pas de compte, d’abonnement ou d’analytique intégré. Effacer les données du navigateur peut supprimer vos projets : exportez vos sauvegardes JSON.</p><p className="mt-3 text-[12px] leading-relaxed text-label-2">Un PDF acheté reste la propriété de son auteur. L’import et le suivi ne transfèrent aucun droit de redistribution. Vérifiez la licence avant de partager, modifier pour diffusion ou vendre un patron. Chaque participant d’un atelier doit disposer de sa propre autorisation. Il ne s’agit pas d’un avis juridique.</p><p className="mt-3 text-[11px] text-label-3">Couleurs : craft-color-codes, MakeBead, CC BY 4.0. Les teintes sont approximatives. Le visuel d’accueil est une illustration de mise en scène, pas une preuve de fonctionnement sur un appareil testé.</p><a className="mt-2 block text-[12px] text-accent-2" href="https://github.com/makebead/craft-color-codes" target="_blank" rel="noreferrer">Source des valeurs DMC</a></Block>
      </>}
      <Block title="Notes et image de référence"><textarea className="field min-h-[90px] py-2" value={p.notes ?? ""} onChange={(e) => onSet({ ...p, notes: e.target.value })} aria-label="Notes du projet" placeholder="Consignes de broderie, références, finitions…" />{p.reference && <details className="mt-3"><summary className="cursor-pointer text-[12px] text-accent-2">Voir l’image source</summary><img src={p.reference} className="mt-2 max-h-[260px] w-full rounded-[12px] object-contain" alt="Image de référence du projet" /></details>}</Block>
    </div>
  </Sheet>;
}

function Label({ title, children }: { title: string; children: React.ReactNode }) { return <label className="mt-2 block text-[12px] text-label-2"><span className="mb-1.5 block">{title}</span>{children}</label>; }
function NumberField({ title, value, onChange, min, max, step = 1 }: { title: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) { return <Label title={title}><input type="number" className="field" value={value} min={min} max={max} step={step} onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, Math.round(n / step) * step))); }} /></Label>; }
function Toggle({ title, checked, onChange }: { title: string; checked: boolean; onChange: () => void }) { return <div className="flex min-h-12 items-center justify-between gap-4"><span className="text-[13px] text-label-2">{title}</span><button type="button" role="switch" className="switch" aria-label={title} aria-checked={checked} onClick={onChange} /></div>; }
function Block({ title, children }: { title: string; children: React.ReactNode }) { return <section className="border-b border-white/[.08] pb-5"><h3 className="mb-3 text-[11px] font-semibold tracking-[.07em] text-label-3 uppercase">{title}</h3>{children}</section>; }