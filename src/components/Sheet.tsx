import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { useMedia } from "../lib/useMedia";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  toolbar?: ReactNode;
  guideTarget?: string;
}

/**
 * Panneau coulissant : latéral en paysage (≥ 1024 px), feuille basse en portrait.
 * La feuille basse se ferme en la glissant vers le bas par sa poignée.
 *
 * Portrait : panneau modal — fond assombri, `aria-modal`, et la tabulation reste
 * bouclée à l'intérieur. Paysage : panneau volontairement non modal, l'atelier
 * doit rester utilisable à côté ; boucler le focus ici empêcherait d'atteindre
 * la grille, le dock ou le rail de fils. Fermer rend le focus à l'élément qui
 * l'avait.
 */
export default function Sheet({ open, onClose, title, subtitle, children, toolbar, guideTarget }: Props) {
  const wide = useMedia("(min-width: 1024px)");
  const panel = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [dy, setDy] = useState(0);
  const dragStart = useRef<number | null>(null);
  const dragging = dragStart.current !== null;

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    dragStart.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) return;
    setDy(Math.max(0, e.clientY - dragStart.current));
  };
  const onUp = () => {
    if (dragStart.current === null) return;
    dragStart.current = null;
    if (dy > 110) onClose();
    setDy(0);
  };

  const hidden = wide ? "translateX(calc(100% + 40px))" : "translateY(100%)";
  const shown = wide ? "translateX(0)" : `translateY(${dy}px)`;

  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpen.current = false;
      return;
    }
    // L'effet se rejoue aussi quand la largeur change (le panneau passe de
    // feuille basse à panneau latéral). Dans ce cas il ne faut ni reprendre le
    // focus, ni le rendre en nettoyant : pivoter l'iPad en pleine broderie
    // renvoyait le focus dans le panneau.
    const justOpened = !wasOpen.current;
    wasOpen.current = true;
    const before = document.activeElement as HTMLElement | null;
    const timeout = justOpened
      ? window.setTimeout(() => panel.current?.querySelector<HTMLButtonElement>("button")?.focus(), 50)
      : 0;
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); closeRef.current(); }
      if (e.key === "Tab" && !wide) {
        const list = [...(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input, select, textarea, [tabindex="0"]') ?? [])].filter((el) => el.offsetParent !== null && !el.matches(":disabled"));
        const first = list[0], last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    panel.current?.addEventListener("keydown", keys);
    const el = panel.current;
    return () => {
      window.clearTimeout(timeout);
      el?.removeEventListener("keydown", keys);
      if (justOpened) before?.focus();
    };
  }, [open, wide]);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`sheet-backdrop fixed inset-0 z-40 bg-black/30 lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        ref={panel}
        data-guide={guideTarget}
        role="dialog"
        aria-label={title}
        aria-modal={!wide && open}
        className={`sheet glass-strong fixed z-50 flex flex-col overflow-hidden ${open ? "is-open" : ""}
          inset-x-0 bottom-0 max-h-[84dvh] rounded-t-[30px]
          lg:inset-x-auto lg:top-3 lg:right-3 lg:bottom-3 lg:max-h-none lg:w-[384px] lg:rounded-[28px]
          ${dragging ? "dragging" : ""}`}
        style={{ transform: open ? shown : hidden }}
      >
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="flex shrink-0 touch-none cursor-grab justify-center pt-2.5 pb-1 lg:hidden"
          aria-hidden="true"
        >
          <span className="h-1.5 w-10 rounded-full bg-white/25" />
        </div>

        <header className="flex shrink-0 items-start justify-between gap-3 px-5 pt-2 pb-3 lg:pt-5">
          <div className="min-w-0">
            <h2 className="text-[20px] leading-tight font-semibold tracking-[-0.02em]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-label-2">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="btn-icon h-8 w-8 shrink-0 rounded-full bg-white/10" aria-label="Fermer">
            <X className="h-4 w-4" strokeWidth={2.4} />
          </button>
        </header>

        {toolbar && <div className="shrink-0 px-5 pb-4">{toolbar}</div>}
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(24px,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </aside>
    </>
  );
}
