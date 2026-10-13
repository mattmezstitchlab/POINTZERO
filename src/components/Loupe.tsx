import { useEffect, useRef, useState } from "react";

/**
 * La loupe de la brodeuse.
 *
 * Sur les zones marquées `[data-loupe]`, une lentille suit le pointeur et
 * montre ce qu'elle couvre — mais elle ne le photographie pas : elle le
 * RELIT. Un picto survolé est redessiné agrandi dans la lentille ; un motif
 * en pixels est relu depuis sa matrice, à quatre fois l'échelle, comme on
 * approche un tambour de la fenêtre. C'est la différence entre un zoom et
 * une loupe : le zoom agrandit des pixels, la loupe recommence le dessin.
 *
 * Deux formes, comme les loupes de comptage : ronde d'abord, carrée d'un
 * clic sur le petit bouton. Sur écran tactile, pas de loupe : il n'y a pas
 * de pointeur à suivre, et le doigt fait déjà office de lentille en cachant
 * ce qu'il touche.
 */
export default function Loupe() {
  const lens = useRef<HTMLDivElement>(null);
  const [shape, setShape] = useState<"ronde" | "carree">("ronde");
  const [fine, setFine] = useState(false);
  const lastItem = useRef<Element | null>(null);

  useEffect(() => {
    setFine(typeof window.matchMedia === "function" && window.matchMedia("(pointer: fine)").matches);
  }, []);

  useEffect(() => {
    if (!fine) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      const el = lens.current;
      if (!el) return;
      const target = e.target as Element | null;
      const zone = target?.closest?.("[data-loupe]") as HTMLElement | null;
      if (!zone) {
        el.hidden = true;
        lastItem.current = null;
        return;
      }
      el.hidden = false;
      if (frame) return; // un seul repositionnement par image
      frame = requestAnimationFrame(() => {
        frame = 0;
        const el2 = lens.current;
        if (!el2) return;
        el2.style.left = `${e.clientX}px`;
        el2.style.top = `${e.clientY}px`;
        const kind = zone.dataset.loupe;
        if (kind === "motif") {
          const src = zone.querySelector("canvas") as HTMLCanvasElement | null;
          const out = el2.querySelector("canvas") as HTMLCanvasElement | null;
          if (!src || !out) return;
          const rect = src.getBoundingClientRect();
          const zoom = 4;
          const sw = out.width / zoom;
          const sh = out.height / zoom;
          const sx = ((e.clientX - rect.left) / rect.width) * src.width - sw / 2;
          const sy = ((e.clientY - rect.top) / rect.height) * src.height - sh / 2;
          const ctx = out.getContext("2d");
          if (!ctx) return;
          ctx.clearRect(0, 0, out.width, out.height);
          const holder0 = el2.querySelector(".loupe-svg");
          if (holder0) holder0.innerHTML = "";
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(src, sx, sy, sw, sh, 0, 0, out.width, out.height);
        } else {
          const out2 = el2.querySelector("canvas") as HTMLCanvasElement | null;
          out2?.getContext("2d")?.clearRect(0, 0, out2.width, out2.height);
          const item = (target?.closest?.("[data-loupe-item]") ?? zone) as Element;
          if (item !== lastItem.current) {
            lastItem.current = item;
            const svg = item.querySelector("svg");
            const holder = el2.querySelector(".loupe-svg");
            if (holder) {
              holder.innerHTML = "";
              if (svg) holder.appendChild(svg.cloneNode(true));
            }
          }
        }
      });
    };
    const out = () => {
      if (lens.current) lens.current.hidden = true;
      lastItem.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerleave", out);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerleave", out);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [fine]);

  if (!fine) return null;

  return (
    <>
      <div
        ref={lens}
        className="loupe"
        data-shape={shape}
        hidden
        aria-hidden="true"
      >
        <canvas width={132} height={132} className="loupe-canvas" />
        <span className="loupe-svg" />
      </div>
      <button
        type="button"
        onClick={() => setShape((s) => (s === "ronde" ? "carree" : "ronde"))}
        className="loupe-toggle"
        aria-label={shape === "ronde" ? "Passer la loupe au carré" : "Passer la loupe en rond"}
        title="La loupe : ronde ou carrée"
      >
        {shape === "ronde" ? "◯" : "▢"}
      </button>
    </>
  );
}
