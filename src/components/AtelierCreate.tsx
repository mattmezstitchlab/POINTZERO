import { useRef, type FormEvent } from "react";
import { FilePlus2, FolderOpen, Import, Sparkles } from "lucide-react";

/** Un seul point d'entrée, sur la véritable grille et dans la catégorie Créer. */
export default function AtelierCreate({
  prompt, onPrompt, onGenerate, onImport, onBlank, onLibrary, compact = false,
}: {
  prompt: string;
  onPrompt: (value: string) => void;
  onGenerate: () => void;
  onImport: (file: File) => void;
  onBlank: () => void;
  onLibrary: () => void;
  compact?: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (prompt.trim().length >= 3) onGenerate();
  };
  return (
    <section
      aria-label="Créer ou reprendre un motif"
      className={compact ? "space-y-4 text-[#222]" : "w-[min(580px,calc(100vw-28px))] rounded-lg border border-black/10 bg-white/95 p-5 text-[#202024] shadow-[0_18px_65px_#00000020] backdrop-blur-xl sm:p-7"}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#777]">POINTZERO · Atelier</p>
      <h1 className="mt-2 text-[clamp(22px,3vw,34px)] font-semibold tracking-[-.045em]">De l'idée au dernier point.</h1>
      <p className="mt-1 text-sm text-[#666]">Décrivez, importez ou reprenez. Votre motif s'ouvre ici, dans la grille.</p>
      <form className="mt-5 space-y-3" onSubmit={submit}>
        <label htmlFor={compact ? "atelier-description-panel" : "atelier-description"} className="block text-xs font-medium text-[#4b4b4b]">Description du motif</label>
        <textarea
          id={compact ? "atelier-description-panel" : "atelier-description"}
          rows={compact ? 3 : 2}
          maxLength={300}
          value={prompt}
          onChange={(event) => onPrompt(event.target.value)}
          placeholder="Décrivez votre motif…"
          className="w-full resize-y rounded-md border border-[#bcbcbc] bg-white px-3 py-3 text-sm text-[#171717] outline-none focus:border-[#222] focus:ring-2 focus:ring-black/10"
        />
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={prompt.trim().length < 3} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-[#202024] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Sparkles size={16} />Générer</button>
          <button type="button" onClick={() => fileInput.current?.click()} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-black/20 bg-white px-4 text-sm font-semibold text-[#222] hover:bg-black/5"><Import size={16} />Importer</button>
        </div>
      </form>
      <input ref={fileInput} type="file" className="sr-only" aria-label="Importer image, PDF ou projet JSON/OXS" accept="image/png,image/jpeg,image/webp,application/pdf,.pdf,.json,.oxs,application/json" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onImport(f); }} />
      <div className="mt-4 flex flex-wrap justify-center gap-3 border-t border-black/10 pt-4">
        <button type="button" onClick={onBlank} className="inline-flex min-h-9 items-center gap-1.5 text-xs text-[#555] hover:text-black"><FilePlus2 size={15} />Grille vierge</button>
        <button type="button" onClick={onLibrary} className="inline-flex min-h-9 items-center gap-1.5 text-xs text-[#555] hover:text-black"><FolderOpen size={15} />Reprendre un projet</button>
      </div>
    </section>
  );
}
