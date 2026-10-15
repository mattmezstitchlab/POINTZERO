import { useRef, type FormEvent } from "react";
import { FilePlus2, FolderOpen, Import, Sparkles, RotateCcw } from "lucide-react";
import { STITCH_DEFAULTS, type StitchRequest } from "../lib/stitchGeneration";
import { STYLES, type StyleId } from "../lib/promptcraft";

export default function AtelierCreate({
  prompt, onPrompt, onGenerate, onImport, onBlank, onLibrary, compact = false,
  generation, onGenerationChange, busy = "", error = "", cleanupCount, cleanupVariant, onCleanupVariant, onVariant, accessCode="", onAccessCode,
}: {
  prompt: string;
  onPrompt: (value: string) => void;
  onGenerate: () => void;
  onImport: (file: File) => void;
  onBlank: () => void;
  onLibrary: () => void;
  compact?: boolean;
  generation?: StitchRequest;
  onGenerationChange?: (next: StitchRequest) => void;
  busy?: string;
  error?: string;
  cleanupCount?: number | null;
  cleanupVariant?: "original" | "cleaned";
  onCleanupVariant?: (next:"original"|"cleaned") => void;
  onVariant?: () => void;
  accessCode?:string;
  onAccessCode?: (value:string)=>void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const settings = generation ?? STITCH_DEFAULTS;
  const patch = <K extends keyof StitchRequest>(key:K,value:StitchRequest[K]) => onGenerationChange?.({...settings,[key]:value});
  const inputClass = "mt-1 w-full min-w-0 rounded-[5px] border border-white/20 bg-[#202024] px-2.5 py-2 text-[12px] text-white";
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (prompt.trim().length >= 3) onGenerate();
  };
  return (
    <section
      aria-label="Créer ou reprendre un motif"
      className={compact ? "space-y-3 text-white" : "pz-surface w-[min(460px,calc(100vw-28px))] p-5 text-white sm:p-6"}
    >
      {!compact && <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-white/45">POINTZERO · Atelier</p>}
      {!compact && <h1 className="mt-2 text-[clamp(20px,3vw,28px)] font-semibold tracking-[-.04em] text-white">Que voulez-vous broder ?</h1>}
      <form className="mt-3 space-y-3" onSubmit={submit}>
        <label htmlFor={compact ? "atelier-description-panel" : "atelier-description"} className="sr-only">Description du motif</label>
        <textarea
          id={compact ? "atelier-description-panel" : "atelier-description"}
          rows={2}
          maxLength={300}
          value={prompt}
          onChange={(event) => onPrompt(event.target.value)}
          placeholder="Décrivez votre motif…"
          className="w-full resize-none rounded-[5px] border border-white/30 bg-[#202024] px-3 py-3 text-sm text-white outline-none placeholder:text-[#b3b3bc] focus:border-white/80"
        />
        {onGenerationChange && <div className="space-y-3 border-y border-white/10 py-3" aria-label="Réglages essentiels du patron">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-white/65">Largeur en points
              <select aria-label="Largeur du patron" className={inputClass} value={settings.width} onChange={e=>patch("width",Number(e.target.value) as StitchRequest["width"])}>
                {[60,80,120,160].map(n=><option key={n} value={n}>{n} points</option>)}
              </select>
            </label>
            <label className="text-[11px] text-white/65">Couleurs max.
              <select aria-label="Nombre de fils" className={inputClass} value={settings.maxColors} onChange={e=>patch("maxColors",Number(e.target.value) as StitchRequest["maxColors"])}>
                {[8,12,20,30].map(n=><option key={n} value={n}>{n} fils DMC</option>)}
              </select>
            </label>
            <label className="text-[11px] text-white/65">Sujet / style
              <select aria-label="Style du motif" className={inputClass} value={settings.style} onChange={e=>patch("style",e.target.value as StyleId)}>
                {STYLES.map(style=><option key={style.id} value={style.id}>{style.label}</option>)}
              </select>
            </label>
            <label className="text-[11px] text-white/65">Forme
              <select aria-label="Format du motif" className={inputClass} value={settings.format} onChange={e=>patch("format",e.target.value as StitchRequest["format"])}>
                <option value="carre">Carré</option><option value="portrait">Portrait</option><option value="paysage">Paysage</option>
              </select>
            </label>
          </div>
          <fieldset>
            <legend className="mb-2 text-[11px] text-white/65">Détail</legend>
            <div className="grid grid-cols-3 gap-1">
              {([["simple","Simple"],["equilibre","Équilibré"],["precis","Précis"]] as const).map(([id,label])=>
                <button type="button" key={id} aria-pressed={settings.detail===id} onClick={()=>patch("detail",id)}
                  className={"min-h-9 rounded-[5px] px-1 text-[11px] "+(settings.detail===id?"bg-white text-black":"border border-white/15 text-white/75")}>{label}</button>)}
            </div>
          </fieldset>
          <details className="text-[11px] text-white/65">
            <summary className="cursor-pointer py-1">Toile et variantes avancées</summary>
            <label className="mt-2 block">Comptage de toile
              <select aria-label="Comptage de toile" className={inputClass} value={settings.count} onChange={e=>patch("count",Number(e.target.value) as StitchRequest["count"])}>
                {[11,14,16,18,20,22].map(n=><option key={n} value={n}>{n} ct</option>)}
              </select>
            </label>
          </details>
          {onAccessCode && <details className="rounded-[5px] border border-white/15 p-2 text-[11px] text-white/70">
            <summary className="cursor-pointer py-1">Connexion au moteur d'images</summary>
            <label className="mt-2 block">Code privé d'accès au générateur
              <input aria-label="Code d'accès au générateur" type="password" value={accessCode}
                autoComplete="off" onChange={e=>onAccessCode(e.target.value)}
                placeholder="Code défini sur Vercel" className={inputClass} />
            </label>
            <p className="mt-2 leading-relaxed text-white/55">Le moteur distant doit être configuré sur le serveur. Le code reste en mémoire pendant cette session, sans être sauvegardé dans le patron.</p>
          </details>}
        </div>}
        {busy&&<p role="status" aria-live="polite" className="rounded-[5px] border border-white/15 bg-white/5 p-2 text-[11px] leading-relaxed text-white/75">{busy}</p>}
        {error&&<p role="alert" className="rounded-[5px] border border-red-300/30 bg-red-900/20 p-2 text-[11px] text-red-100">{error}</p>}
        {cleanupCount != null && <div className="rounded-[5px] border border-white/15 p-2 text-[11px] text-white/75">
          <strong className="block text-white">Patron créé · {cleanupCount} point(s) harmonisé(s)</strong>
          <div className="mt-2 grid grid-cols-2 gap-1">
            <button type="button" aria-pressed={cleanupVariant==="original"} onClick={()=>onCleanupVariant?.("original")}
              className={"min-h-9 rounded-[5px] px-1 "+(cleanupVariant==="original"?"bg-white text-black":"border border-white/20")}>Avant</button>
            <button type="button" aria-pressed={cleanupVariant==="cleaned"} onClick={()=>onCleanupVariant?.("cleaned")}
              className={"min-h-9 rounded-[5px] px-1 "+(cleanupVariant==="cleaned"?"bg-white text-black":"border border-white/20")}>Nettoyé</button>
          </div>
          <p className="mt-2 text-white/55">Les détails volontairement isolés sont conservés. Comparez avant de broder.</p>
        </div>}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={prompt.trim().length < 3 || !!busy} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[5px] bg-white px-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"><Sparkles size={16} />{onGenerationChange ? (busy ? "Création en cours…" : "Générer dans la grille") : "Générer"}</button>
          <button type="button" onClick={() => fileInput.current?.click()} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[5px] border border-white/25 bg-white/10 px-3 text-sm font-semibold text-white hover:bg-white/15"><Import size={16} />Importer</button>
        </div>
        {onVariant && <button type="button" onClick={onVariant} disabled={!!busy} className="flex items-center gap-2 text-[11px] text-white/70 hover:text-white"><RotateCcw size={13}/> Variante du même prompt</button>}
      </form>
      <input ref={fileInput} type="file" className="sr-only" aria-label="Importer image, PDF ou projet JSON/OXS" accept="image/png,image/jpeg,image/webp,application/pdf,.pdf,.json,.oxs,application/json" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) onImport(file); }} />
      <div className="flex flex-wrap justify-center gap-5 border-t border-white/10 pt-3">
        <button type="button" onClick={onBlank} className="inline-flex min-h-9 items-center gap-1.5 text-xs text-white/80 hover:text-white"><FilePlus2 size={15} />Grille vierge</button>
        <button type="button" onClick={onLibrary} className="inline-flex min-h-9 items-center gap-1.5 text-xs text-white/60 hover:text-white"><FolderOpen size={15} />Mes projets</button>
      </div>
    </section>
  );
}
