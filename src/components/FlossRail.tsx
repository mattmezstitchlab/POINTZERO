import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus, Search, X } from "lucide-react";
import { contrastOn, FLOSS } from "../lib/dmc";
import { assignedSymbol, computeStats, type ColorStat, type Pattern, type Supply } from "../lib/pattern";
import { SYMBOL_COUNT } from "../lib/symbols";
import SymbolIcon from "./SymbolIcon";

interface Props {
  pattern: Pattern;
  active: number;
  onActive: (idx: number) => void;
  onPattern: (pattern: Pattern) => void;
  onBrowse: () => void;
  stitching: boolean;
  hidden?: boolean;
  onSupply?: (code: string, supply: Supply) => void;
}

const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Palette de projet compacte : chaque carré combine couleur, symbole, stock et état.
 * Les 489 DMC ne sont affichés que dans le sélecteur de recherche, sur demande.
 */
export default function FlossRail({ pattern, active, onActive, onPattern, onBrowse, stitching, hidden, onSupply }: Props) {
  const stats = useMemo(() => {
    const used = computeStats(pattern).rows;
    return pattern.palette.map((idx): ColorStat => used.find((r) => r.idx === idx) ?? { idx, code: FLOSS[idx].code, name: FLOSS[idx].name, hex: FLOSS[idx].hex, pos: assignedSymbol(pattern, idx), cross: 0, half: 0, quarter: 0, back: 0, long: 0, knots: 0, cells: 0, done: 0, meters: 0, skeins: 0, owned: pattern.supplies?.[FLOSS[idx].code]?.whole ?? 0, petite: 0, beads: 0 });
  }, [pattern]);
  const [detail, setDetail] = useState<number | null>(null);
  const [choosingSymbol, setChoosingSymbol] = useState(false);
  const row = detail === null ? null : stats.find((r) => r.idx === detail) ?? null;

  useEffect(() => {
    const show = (e: Event) => { const idx = (e as CustomEvent<{ idx: number | null }>).detail.idx; setDetail(idx); setChoosingSymbol(false); };
    window.addEventListener("pointzero:floss", show);
    return () => window.removeEventListener("pointzero:floss", show);
  }, []);

  const supply = (code: string): Supply => pattern.supplies?.[code] ?? { whole: pattern.stock[code] ?? 0, partialMeters: 0, lot: "" };
  const stock = (code: string, value: Supply) => {
    if (onSupply) onSupply(code, value);
    else onPattern({ ...pattern, supplies: { ...pattern.supplies, [code]: value } });
  };

  if (hidden) return null;

  return (
    <>
      <aside
        className="glass no-scrollbar fixed right-3 bottom-[max(12px,env(safe-area-inset-bottom))] left-3 z-30 flex h-[64px] items-center gap-2 overflow-x-auto rounded-[18px] p-2 lg:right-auto lg:bottom-3 lg:left-1/2 lg:max-w-[min(760px,calc(100vw-260px))] lg:-translate-x-1/2"
        aria-label="Fils du motif"
        data-guide="floss"
      >
        <button
          type="button"
          onClick={onBrowse}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-accent text-white transition-transform active:scale-90"
          aria-label="Ajouter ou rechercher un fil DMC"
          title="Ajouter un fil DMC"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        </button>

        <span className="mx-0.5 h-6 w-px shrink-0 bg-white/12" />

        {stats.map((s) => {
          const selected = s.idx === active;
          const enough = s.owned >= s.skeins;
          const progress = s.cells > 0 ? Math.round((s.done / s.cells) * 100) : 0;
          return (
            <button
              key={s.idx}
              type="button"
              onClick={() => {
                onActive(s.idx);
                setDetail((v) => (v === s.idx ? null : s.idx));
              }}
              className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-[10px] transition-all active:scale-90 ${
                selected ? "ring-2 ring-accent ring-offset-2 ring-offset-[#1c1c1e]" : "ring-1 ring-black/25"
              }`}
              style={{ background: s.hex }}
              aria-label={`DMC ${s.code}, ${s.name}, ${s.owned} sur ${s.skeins} écheveaux en stock`}
              title={`DMC ${s.code} · ${s.name}${stitching ? ` · ${s.cells - s.done} éléments restants` : ""}`}
            >
              <SymbolIcon sym={s.pos} size={15} color={contrastOn(s.hex)} />
              <span className="absolute -bottom-2 rounded-[4px] bg-[#1c1c1e] px-1 font-mono text-[8px] text-label-2">{FLOSS[s.idx].blend ? "Mix" : s.code}</span>
              <span
                className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#242426] ${enough ? "bg-ok" : "bg-warn"}`}
                aria-hidden="true"
              />
              {stitching && (
                <span className="absolute right-1 bottom-0.5 left-1 h-[2px] overflow-hidden rounded-full bg-black/25" aria-hidden="true">
                  <span className="block h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
                </span>
              )}
            </button>
          );
        })}

        {stats.length === 0 && (
          <button type="button" onClick={onBrowse} className="mt-1 text-label-3" aria-label="Rechercher un fil">
            <Search className="h-4 w-4" />
          </button>
        )}
      </aside>

      {row && (
        <section
          className="glass-strong thin-scroll fixed right-3 bottom-[160px] z-40 max-h-[calc(100dvh-250px)] w-[300px] overflow-y-auto rounded-[22px] p-4 lg:right-auto lg:bottom-[88px] lg:left-1/2 lg:max-h-[calc(100dvh-180px)] lg:-translate-x-1/2"
          aria-label={`Informations DMC ${row.code}`}
        >
          <button type="button" onClick={() => setDetail(null)} className="btn-icon absolute top-2 right-2 h-8 w-8 rounded-full bg-white/[0.07]" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3 pr-8">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[13px] ring-1 ring-black/30" style={{ background: row.hex }}>
              <SymbolIcon sym={row.pos} size={22} color={contrastOn(row.hex)} />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[15px] font-semibold">{FLOSS[row.idx].blend ? "Mélange de fils" : `DMC ${row.code}`}</p>
              <p className="truncate text-[13px] text-label-2">{row.name}</p>
            </div>
          </div>

          <div className={`mt-4 grid gap-2 text-center ${stitching ? "grid-cols-4" : "grid-cols-3"}`}>
            <Info value={String(row.cells)} label="éléments" />
            {stitching && <Info value={String(Math.max(0, row.cells - row.done))} label="à broder" />}
            <Info value={`${fmt(row.meters)} m`} label="brins simples" />
            <Info value={String(row.skeins)} label="écheveaux" />
          </div>

          {stitching && (
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-label-3">
                <span>Progression de cette couleur</span>
                <span className="font-mono tabular-nums">{row.cells ? Math.round((row.done / row.cells) * 100) : 0} %</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-ok transition-[width] duration-300" style={{ width: `${row.cells ? (row.done / row.cells) * 100 : 0}%` }} />
              </div>
            </div>
          )}

          {(FLOSS[row.idx].blend ?? [{ code: row.code, strands: 1 }]).map((part) => {
            const value = supply(part.code), total = FLOSS[row.idx].blend?.reduce((n, v) => n + v.strands, 0) ?? 1;
            const needed = row.meters * part.strands / total, available = (value.whole * 8 + value.partialMeters) * 6, missing = Math.max(0, Math.ceil((needed - available) / 48));
            return <div key={part.code} className="mt-3 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between"><div><p className="text-[12px] font-medium">Stock DMC {part.code}</p><p className={`text-[10px] ${missing ? "text-warn" : "text-ok"}`}>{missing ? `${missing} écheveau(x) à prévoir` : "Quantité estimée disponible"}</p></div><div className="stepper"><button type="button" onClick={() => stock(part.code, { ...value, whole: Math.max(0, value.whole - 1) })} disabled={!value.whole} aria-label="Retirer un écheveau"><Minus size={13} /></button><span>{value.whole}</span><button type="button" onClick={() => stock(part.code, { ...value, whole: value.whole + 1 })} aria-label="Ajouter un écheveau"><Plus size={13} /></button></div></div>
              <div className="mt-2 grid grid-cols-2 gap-2"><label className="text-[10px] text-label-3">Mètres partiels, 6 brins<input className="field mt-1 h-9 text-[12px]" type="number" min={0} max={800} step={.1} value={value.partialMeters} onChange={(e) => stock(part.code, { ...value, partialMeters: Math.max(0, +e.target.value) })} /></label><label className="text-[10px] text-label-3">Lot de teinture<input className="field mt-1 h-9 text-[12px]" value={value.lot} placeholder="Facultatif" onChange={(e) => stock(part.code, { ...value, lot: e.target.value })} /></label></div>
            </div>;
          })}
          <button className="mt-3 text-[12px] text-accent-2" type="button" onClick={() => setChoosingSymbol(!choosingSymbol)}>Personnaliser le symbole</button>
          {choosingSymbol && <div className="mt-2 grid max-h-[150px] grid-cols-8 gap-1 overflow-auto">{Array.from({ length: SYMBOL_COUNT }, (_, symbol) => <button key={symbol} className={`grid h-7 place-items-center rounded-[5px] ${row.pos === symbol ? "bg-accent" : "bg-white/[.06]"}`} title={`Symbole ${symbol + 1}`} onClick={() => { const other = pattern.palette.find((c) => c !== row.idx && assignedSymbol(pattern, c) === symbol); const map = { ...pattern.symbolMap, [row.code]: symbol }; if (other !== undefined) map[FLOSS[other].code] = row.pos; onPattern({ ...pattern, symbolMap: map }); setChoosingSymbol(false); }}><SymbolIcon sym={symbol} size={13} /></button>)}</div>}

          <button
            type="button"
            onClick={() => onActive(row.idx)}
            className="btn-tinted mt-3 w-full"
            disabled={active === row.idx}
          >
            {active === row.idx && <Check className="h-4 w-4" />}
            {active === row.idx ? "Fil actif" : "Utiliser ce fil"}
          </button>
        </section>
      )}
    </>
  );
}

function Info({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[11px] bg-white/[0.06] px-1 py-2">
      <p className="font-mono text-[13px] font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10px] text-label-3">{label}</p>
    </div>
  );
}