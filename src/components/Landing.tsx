import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Check, ChevronRight, FileUp, Lock, Sparkles, Wand2, X } from "lucide-react";
import PdfPrep from "./PdfPrep";
import type { Pattern } from "../lib/pattern";

interface Props {
  onOpen: () => void;
  onGuide: () => void;
  onPrompt: (text: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Icônes de points — mêmes formes que l’atelier                     */
/* ------------------------------------------------------------------ */

const S = {
  viewBox: "0 0 48 48",
  className: "h-10 w-10",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

function IconCross() {
  return (
    <svg {...S}>
      <path d="M11 11l26 26M37 11L11 37" data-draw="" />
    </svg>
  );
}
function IconHalf() {
  return (
    <svg {...S}>
      <path d="M11 37L37 11" data-draw="" />
      <path d="M11 11l26 26" strokeDasharray="2 4" opacity=".35" />
    </svg>
  );
}
function IconQuarter() {
  return (
    <svg {...S}>
      <path d="M11 11l13 13" data-draw="" />
      <path d="M24 24l13 13" strokeDasharray="2 4" opacity=".35" />
      <circle cx="24" cy="24" r="2.4" fill="currentColor" stroke="none" data-solid="" />
    </svg>
  );
}
function IconThreeQuarter() {
  return (
    <svg {...S}>
      <path d="M11 11l26 26" data-draw="" />
      <path d="M37 11l-13 13" data-draw="" />
    </svg>
  );
}
function IconBack() {
  return (
    <svg {...S}>
      <path d="M10 33L20 23l5 5L38 15" data-draw="" />
      <circle cx="10" cy="33" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="38" cy="15" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconLong() {
  return (
    <svg {...S}>
      <path d="M12 36L36 12" strokeWidth="3.4" data-draw="" />
    </svg>
  );
}
function IconKnot() {
  return (
    <svg {...S}>
      <circle cx="24" cy="24" r="4.5" fill="currentColor" stroke="none" data-solid="" />
      <circle cx="24" cy="24" r="9" opacity=".4" />
    </svg>
  );
}
function IconBead() {
  return (
    <svg {...S}>
      <ellipse cx="24" cy="24" rx="6.5" ry="8.5" fill="currentColor" stroke="none" data-solid="" transform="rotate(-20 24 24)" />
      <path d="M24 15v-4M24 33v4" opacity=".45" />
    </svg>
  );
}
function IconPetite() {
  return (
    <svg {...S}>
      <path d="M17 17l14 14M31 17L17 31" strokeWidth="1.7" data-draw="" />
    </svg>
  );
}
function IconSelect() {
  return (
    <svg {...S}>
      <rect x="10" y="10" width="28" height="28" rx="4" strokeDasharray="4 4" />
      <path d="M24 12v24M12 24h24" opacity=".35" />
    </svg>
  );
}
function IconMove() {
  return (
    <svg {...S}>
      <path d="M24 8v32M8 24h32" />
      <path d="M14 14l6 6M34 14l-6 6M14 34l6-6M34 34l-6-6" data-draw="" />
    </svg>
  );
}
function IconLine() {
  return (
    <svg {...S}>
      <path d="M8 34L40 14" strokeWidth="3.4" data-draw="" />
      <circle cx="8" cy="34" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="40" cy="14" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconRect() {
  return (
    <svg {...S}>
      <rect x="11" y="11" width="26" height="26" rx="3" strokeDasharray="4 4" />
    </svg>
  );
}
function IconEllipse() {
  return (
    <svg {...S}>
      <ellipse cx="24" cy="24" rx="14" ry="10" strokeDasharray="4 4" />
    </svg>
  );
}
function IconFill() {
  return (
    <svg {...S}>
      <path d="M14 30h20" strokeWidth="3" data-draw="" />
      <path d="M18 22c6-8 14-10 14-10s-2 9-8 12" />
    </svg>
  );
}
function IconPick() {
  return (
    <svg {...S}>
      <path d="M18 30L34 14" data-draw="" />
      <path d="M34 14l3-6 6 6-6 3z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconErase() {
  return (
    <svg {...S}>
      <path d="M12 28l14-14 10 10-8 8H16z" data-draw="" />
      <path d="M14 38h22" opacity=".4" />
    </svg>
  );
}
function IconMark() {
  return (
    <svg {...S}>
      <path d="M14 34l14-14 6 6-14 14H10v-6z" data-draw="" />
      <path d="M34 12l4 4" opacity=".5" />
    </svg>
  );
}
function IconBlock() {
  return (
    <svg {...S}>
      <rect x="10" y="10" width="28" height="28" rx="2" strokeWidth="1.6" />
      <path d="M19.33 10v28M28.67 10v28M10 19.33h28M10 28.67h28" strokeWidth="1.6" opacity=".5" />
      <rect x="19.33" y="19.33" width="9.34" height="9.34" fill="currentColor" stroke="none" data-solid="" />
    </svg>
  );
}
function IconRow() {
  return (
    <svg {...S}>
      <path d="M9 17h30M9 31h30" strokeWidth="3" data-draw="" />
      <circle cx="9" cy="17" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="39" cy="31" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconPark() {
  return (
    <svg {...S}>
      <path d="M24 8v22" data-draw="" />
      <circle cx="24" cy="36" r="4" fill="currentColor" stroke="none" data-solid="" />
    </svg>
  );
}
function IconUnpick() {
  return (
    <svg {...S}>
      <path d="M12 24h24" strokeWidth="3" />
      <path d="M16 16l8 8M24 16l-8 8" data-draw="" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Données des outils                                                */
/* ------------------------------------------------------------------ */

interface Tool {
  icon: ReactNode;
  name: string;
  key: string;
  desc: string;
}

interface Group {
  title: string;
  lead: string;
  tools: Tool[];
}

const GROUPS: Group[] = [
  {
    title: "Les points",
    lead: "Chaque outil reproduit un geste réel de broderie, pas une approximation graphique.",
    tools: [
      { icon: <IconCross />, name: "Point de croix", key: "X", desc: "Deux diagonales complètes sur une case entière. La base de toute grille comptée." },
      { icon: <IconHalf />, name: "Demi-point", key: "D", desc: "Une seule diagonale. Adoucit les contours, crée les dégradés et les volumes." },
      { icon: <IconQuarter />, name: "Quart de point", key: "Q", desc: "Du coin vers le centre de la case. Indispensable aux courbes précises." },
      { icon: <IconThreeQuarter />, name: "Trois-quarts", key: "—", desc: "Un demi-point complété d’un quart. Les formes rondes ne peuvent pas s’en passer." },
      { icon: <IconPetite />, name: "Petite croix", key: "—", desc: "Croix réduite au tiers, pour les détails fins sur lin à haut comptage." },
      { icon: <IconBack />, name: "Point arrière", key: "R", desc: "Trait continu entre les trous. Dessine les contours, les visages, les lettrages." },
      { icon: <IconLong />, name: "Point lancé", key: "L", desc: "Longue passe droite. Remplit vite les grands aplats unis." },
      { icon: <IconKnot />, name: "Noeud français", key: "K", desc: "Relief ponctuel sur un trou. Les yeux, les graines, les centres de fleurs." },
      { icon: <IconBead />, name: "Perle", key: "—", desc: "Fourniture hors fil, posée sur un trou. Comptée séparément dans la liste d’achat." },
    ],
  },
  {
    title: "Dessiner et corriger",
    lead: "La précision d’un logiciel de création, avec la fluidité du tactile.",
    tools: [
      { icon: <IconSelect />, name: "Sélection", key: "S", desc: "Cadre rectangulaire ou lasso pour isoler une zone avant de la transformer." },
      { icon: <IconMove />, name: "Déplacement", key: "—", desc: "Déplace, copie, pivote et retourne une sélection sans perdre la trame." },
      { icon: <IconLine />, name: "Ligne de croix", key: "—", desc: "Trace une ligne de cases droites ou diagonales, nette et régulière." },
      { icon: <IconRect />, name: "Rectangle", key: "—", desc: "Cadre ou bloc plein, calé sur la grille au pixel près." },
      { icon: <IconEllipse />, name: "Ellipse", key: "—", desc: "Formes rondes et ovales pour les rosaces, les cadres et les mandalas." },
      { icon: <IconFill />, name: "Remplissage", key: "G", desc: "Remplit une zone contiguë de même couleur en une seule pression." },
      { icon: <IconPick />, name: "Pipette", key: "I", desc: "Prélève la couleur exacte posée sous le doigt ou le stylet." },
      { icon: <IconErase />, name: "Gomme", key: "E", desc: "Retire le point d’une case, qu’il s’agisse d’une croix ou d’un ornement." },
    ],
  },
  {
    title: "Suivre sa broderie",
    lead: "Les gestes que les brodeuses répètent des milliers de fois, rendus immédiats.",
    tools: [
      { icon: <IconMark />, name: "Surligneur", key: "M", desc: "Marque les cases déjà brodées. Le compteur de progression se met à jour." },
      { icon: <IconBlock />, name: "Bloc 10 × 10", key: "B", desc: "Marque un carré de dix cases d’un coup, la façon réelle de compter." },
      { icon: <IconRow />, name: "Ligne entière", key: "H", desc: "Marque une rangée complète sans déplacer la main." },
      { icon: <IconPark />, name: "Parking de fil", key: "P", desc: "Note où un fil est garé et dans quel coin, pour ne jamais le reperdre." },
      { icon: <IconUnpick />, name: "À défaire", key: "U", desc: "Signale une erreur sans l’effacer, pour la reprendre plus tard." },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Sections                                                           */
/* ------------------------------------------------------------------ */

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("landing-visible");
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("landing-visible");
          io.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`landing-reveal ${className}`}>
      {children}
    </div>
  );
}

function SectionHead({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <Reveal className="mx-auto max-w-[900px] text-center">
      <p className="text-[13px] font-semibold tracking-[0.14em] text-accent-2 uppercase">{eyebrow}</p>
      <h2 className="mt-4 text-[clamp(34px,5.4vw,68px)] leading-[1.02] font-semibold tracking-[-0.04em]">
        {title}
      </h2>
      {lead && <p className="mx-auto mt-5 max-w-[640px] text-[clamp(17px,1.8vw,21px)] leading-[1.5] text-label-2">{lead}</p>}
    </Reveal>
  );
}

function EyebrowLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group inline-flex items-center gap-1 text-[15px] font-medium text-accent-2">
      {children}
      <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Landing({ onOpen, onGuide, onPrompt }: Props) {
  const [promptText, setPromptText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDone, setPdfDone] = useState<{ w: number; h: number; floss: number } | null>(null);
  const pdfInput = useRef<HTMLInputElement>(null);

  return (
    <div className="overflow-x-hidden bg-[#0a0a0b] text-label">
      {/* ---------------- Nav ---------------- */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-black/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center px-5 sm:px-8">
          <span className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#1c1c1e] ring-1 ring-white/12">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="#ff453a" strokeWidth="2.6" strokeLinecap="round" />
              </svg>
            </span>
            <span className="text-[14px] font-semibold tracking-[0.14em]">POINT ZÉRO</span>
          </span>
          <nav className="ml-auto hidden items-center gap-7 text-[13px] text-label-2 md:flex">
            <a href="#outils" className="transition-colors hover:text-label">Outils</a>
            <a href="#moteur" className="transition-colors hover:text-label">Moteur</a>
            <a href="#generer" className="transition-colors hover:text-label">Générer</a>
            <a href="#importer" className="transition-colors hover:text-label">Importer</a>
            <a href="#exporter" className="transition-colors hover:text-label">Exporter</a>
          </nav>
          <button
            type="button"
            onClick={onOpen}
            className="ml-auto rounded-full bg-[#0071e3] px-4 py-2 text-[13px] font-medium text-white transition-all hover:bg-[#0077ed] active:scale-95 md:ml-8"
          >
            Ouvrir l’atelier
          </button>
        </div>
      </header>

      {/* ---------------- Hero ---------------- */}
      <section className="relative min-h-[100svh] overflow-hidden">
        <img
          src="images/hero-ipad-broderie.jpg"
          alt="Une brodeuse utilise Point Zéro sur iPad à côté de son tambour de broderie"
          className="absolute inset-0 h-full w-full object-cover object-[62%_center]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.78)_0%,rgba(0,0,0,.46)_38%,rgba(0,0,0,.04)_72%),linear-gradient(0deg,rgba(0,0,0,.6)_0%,transparent_40%)]" />
        <div className="relative mx-auto flex min-h-[100svh] max-w-[1280px] items-end px-5 pt-24 pb-16 sm:px-8 sm:pb-24 lg:items-center lg:pb-0">
          <div className="max-w-[640px]" style={{ animation: "hero-in 1s cubic-bezier(0.22,1,0.36,1) both" }}>
            <p className="text-[clamp(28px,4vw,54px)] leading-none font-semibold tracking-[-0.045em]">Point Zéro</p>
            <h1 className="mt-4 text-[clamp(40px,6.6vw,86px)] leading-[0.93] font-semibold tracking-[-0.055em]">
              De l’image au dernier point.
            </h1>
            <p className="mt-7 max-w-[540px] text-[clamp(17px,2vw,22px)] leading-[1.45] tracking-[-0.015em] text-white/80">
              Créez le patron, préparez les vrais fils, puis brodez case après case — sans jamais perdre votre place. Un moteur unique, de la description au canevas.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onOpen}
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#0071e3] px-6 text-[16px] font-semibold text-white transition-all hover:bg-[#0077ed] active:scale-[.97]"
              >
                Commencer à créer <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onGuide}
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 text-[16px] font-semibold text-white backdrop-blur-xl transition-all hover:bg-white/16 active:scale-[.97]"
              >
                Voir la visite guidée
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Outils ---------------- */}
      <section id="outils" className="scroll-mt-16 px-5 py-28 sm:px-8 sm:py-40">
        <SectionHead
          eyebrow="Le langage des outils"
          title="Chaque picto est un geste réel."
          lead="Survolez un outil : son geste se dessine. Rien n’est décoratif, chaque outil reproduit un point ou une opération que les brodeuses connaissent."
        />

        <div className="mx-auto mt-20 max-w-[1180px] space-y-20 sm:space-y-28">
          {GROUPS.map((group) => (
            <Reveal key={group.title}>
              <div className="flex flex-col gap-3 border-b border-white/[0.09] pb-5 sm:flex-row sm:items-end sm:justify-between">
                <h3 className="text-[clamp(26px,3vw,40px)] leading-tight font-semibold tracking-[-0.035em]">
                  {group.title}
                </h3>
                <p className="max-w-[440px] text-[15px] leading-relaxed text-label-2">{group.lead}</p>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                {group.tools.map((t) => (
                  <article
                    key={t.name}
                    className="tool-card group cursor-default rounded-[18px] border border-white/[0.07] bg-white/[0.025] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:bg-white/[0.05]"
                  >
                    <div className="tool-demo mb-4 text-accent-2 transition-colors duration-300 group-hover:text-accent">
                      {t.icon}
                    </div>
                    <h4 className="flex items-center gap-2 text-[16px] font-semibold tracking-[-0.015em]">
                      {t.name}
                      {t.key !== "—" && <span className="kbd">{t.key}</span>}
                    </h4>
                    <p className="mt-2 text-[13.5px] leading-[1.55] text-label-2">{t.desc}</p>
                  </article>
                ))}
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mx-auto mt-16 max-w-[1180px] text-center">
          <EyebrowLink onClick={onOpen}>Ouvrir l’atelier et les essayer</EyebrowLink>
        </Reveal>
      </section>

      {/* ---------------- Moteur ---------------- */}
      <section id="moteur" className="scroll-mt-16 border-y border-white/[0.07] bg-[#101013] px-5 py-28 sm:px-8 sm:py-40">
        <SectionHead
          eyebrow="Le moteur de lecture"
          title="Du symbole au fil, sans quitter la grille."
          lead="Un symbole, un code DMC, une couleur, une quantité, un stock, une progression. La même information circule partout, sans ressaisie."
        />

        <Reveal className="mx-auto mt-20 max-w-[1120px]">
          <div className="rounded-[28px] border border-white/[0.08] bg-[#161619] p-6 sm:p-10">
            <svg viewBox="0 0 1000 220" className="h-auto w-full" role="img" aria-label="Schéma : du symbole imprimé jusqu'à l'export du patron">
              <defs>
                <linearGradient id="pz-flow" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0a84ff" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0a84ff" stopOpacity="0.95" />
                </linearGradient>
              </defs>

              <line x1="110" y1="110" x2="890" y2="110" stroke="url(#pz-flow)" strokeWidth="2" className="flow-line" />

              {[
                { x: 110, label: "Symbole", sub: "dans la grille" },
                { x: 300, label: "Code DMC", sub: "489 coloris" },
                { x: 500, label: "Couleur", sub: "rendu écran" },
                { x: 700, label: "Stock", sub: "écheveaux, mètres" },
                { x: 890, label: "Export", sub: "PDF, OXS, PNG" },
              ].map((n) => (
                <g key={n.label}>
                  <circle
                    cx={n.x}
                    cy={110}
                    r="21"
                    fill="#161619"
                    stroke="#0a84ff"
                    strokeWidth="2"
                    className="flow-node"
                    style={{ transformOrigin: `${n.x}px 110px` }}
                  />
                  <text x={n.x} y="115" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="600">
                    {n.label.slice(0, 1)}
                  </text>
                  <text x={n.x} y="164" textAnchor="middle" fill="#f5f5f7" fontSize="15" fontWeight="600">
                    {n.label}
                  </text>
                  <text x={n.x} y="184" textAnchor="middle" fill="rgba(235,235,245,0.5)" fontSize="12">
                    {n.sub}
                  </text>
                </g>
              ))}
            </svg>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { t: "Un seul référentiel", d: "Modifiez la couleur d’un fil : la grille, la légende, la consommation et le stock suivent aussitôt." },
                { t: "Un symbole par fil", d: "Chaque fil du motif reçoit un symbole géométrique unique, stable et imprimable." },
                { t: "Zéro ressaisie", d: "La liste d’achat, le métrage et les écheveaux sont recalculés à chaque modification." },
              ].map((c) => (
                <div key={c.t} className="rounded-[18px] border border-white/[0.07] bg-white/[0.025] p-5">
                  <h4 className="text-[16px] font-semibold">{c.t}</h4>
                  <p className="mt-2 text-[13.5px] leading-[1.55] text-label-2">{c.d}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------------- Générer ---------------- */}
      <section id="generer" className="scroll-mt-16 px-5 py-28 sm:px-8 sm:py-40">
        <SectionHead
          eyebrow="Créer depuis une idée"
          title="Décrivez un motif. Voyez-le apparaître en grille."
          lead="Une image est générée puis convertie en vrai motif de point de croix par diffusion d’erreur vers la palette DMC : les dégradés deviennent des croix réelles."
        />

        <Reveal className="mx-auto mt-16 max-w-[880px]">
          <form
            className="flex flex-col gap-3 rounded-[24px] border border-white/[0.09] bg-[#161619] p-4 sm:flex-row sm:items-center sm:rounded-full sm:p-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              onPrompt(promptText);
            }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2">
              <Sparkles className="h-5 w-5 shrink-0 text-accent-2" aria-hidden="true" />
              <input
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="une girafe dans un jardin de fleurs…"
                aria-label="Décrivez le motif à générer"
                className="min-w-0 flex-1 bg-transparent text-[17px] tracking-[-0.01em] outline-none placeholder:text-label-3"
              />
            </div>
            <button
              type="submit"
              disabled={promptText.trim().length < 3}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#0071e3] px-6 text-[16px] font-semibold text-white transition-all hover:bg-[#0077ed] active:scale-[.97] disabled:opacity-40"
            >
              <Wand2 className="h-4 w-4" aria-hidden="true" />
              Générer
            </button>
          </form>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {["girafe dans un jardin de fleurs", "village pastel", "chat endormi", "pissenlit au vent"].map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setPromptText(ex)}
                className="rounded-full border border-white/12 bg-white/[0.05] px-3.5 py-1.5 text-[13px] text-label-2 transition-colors hover:bg-white/[0.1] hover:text-label"
              >
                {ex}
              </button>
            ))}
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              { n: "1", t: "Décrire", d: "Une phrase suffit. Le moteur comprend le sujet, le style et le niveau de détail." },
              { n: "2", t: "Convertir", d: "Diffusion d’erreur Floyd–Steinberg vers les 489 fils DMC, avec confettis nettoyés." },
              { n: "3", t: "Broder", d: "Le motif s’ouvre dans l’atelier : symboles, légende, métrage et stock sont prêts." },
            ].map((s) => (
              <div key={s.n} className="rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-6">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-accent/20 font-mono text-[14px] font-semibold text-accent-2">
                  {s.n}
                </span>
                <h4 className="mt-4 text-[17px] font-semibold">{s.t}</h4>
                <p className="mt-2 text-[13.5px] leading-[1.55] text-label-2">{s.d}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ---------------- Importer ---------------- */}
      <section id="importer" className="scroll-mt-16 border-y border-white/[0.07] bg-[#101013] px-5 py-28 sm:px-8 sm:py-40">
        <SectionHead
          eyebrow="Reprendre un patron existant"
          title="Vos PDF Etsy deviennent une grille modifiable."
          lead="Les patrons achetés sont souvent découpés en pages désordonnées. Point Zéro les lit, les replace et les recompose en une grille unique et cohérente."
        />

        <Reveal className="mx-auto mt-16 max-w-[1120px]">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: "Ouvrir le PDF", d: "Chaque page est analysée : grilles, légende, axes et symboles sont détectés." },
              { t: "Caler", d: "Les blocs de grille sont repositionnés et redimensionnés au pixel près." },
              { t: "Assembler", d: "Sur la table magnétique, vous choisissez l’ordre des rangées et des colonnes." },
              { t: "Exporter", d: "Une seule grille propre, prête à imprimer ou à réouvrir dans l’atelier." },
            ].map((s, i) => (
              <div key={s.t} className="relative rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-6">
                <span className="font-mono text-[12px] text-label-3">Étape {i + 1}</span>
                <h4 className="mt-3 text-[18px] font-semibold">{s.t}</h4>
                <p className="mt-2 text-[13.5px] leading-[1.55] text-label-2">{s.d}</p>
              </div>
            ))}
          </div>

          {/* Le vrai outil d'import, intégré à la page : pas une capture, pas une maquette. */}
          <div className="mt-8">
            <input
              ref={pdfInput}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setPdfFile(f);
                  setPdfDone(null);
                }
                e.target.value = "";
              }}
            />

            {!pdfFile && (
              <div className="flex flex-col items-center gap-6 rounded-[28px] border border-dashed border-white/18 bg-white/[0.02] px-6 py-14 text-center">
                <div>
                  <h3 className="text-[26px] font-semibold tracking-[-0.03em]">Essayez avec votre propre patron</h3>
                  <p className="mx-auto mt-3 max-w-[560px] text-[15px] leading-[1.6] text-label-2">
                    Ouvrez un PDF acheté sur Etsy et retrouvez ici exactement la même table de montage que dans l’atelier : analyse des
                    pages, calage des blocs, assemblage en puzzle. Rien ne quitte votre appareil.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => pdfInput.current?.click()}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#0071e3] px-6 text-[16px] font-semibold text-white transition-all hover:bg-[#0077ed] active:scale-[.97]"
                >
                  <FileUp className="h-4 w-4" aria-hidden="true" />
                  Importer un patron PDF
                </button>
              </div>
            )}

            {pdfFile && (
              <div className="relative">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="truncate text-[13px] text-label-2">
                    {pdfFile.name}
                    {pdfDone && <span className="text-menthe"> · {pdfDone.w} × {pdfDone.h} cases, {pdfDone.floss} fils DMC</span>}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPdfFile(null);
                      setPdfDone(null);
                    }}
                    className="btn-icon h-8 w-8 shrink-0"
                    aria-label="Fermer le patron"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <PdfPrep
                  embedded
                  file={pdfFile}
                  onClose={() => setPdfFile(null)}
                  onImport={(p: Pattern) => {
                    setPdfDone({ w: p.w, h: p.h, floss: p.palette.length });
                  }}
                />

                {pdfDone && (
                  <div className="mt-4 flex flex-col items-center gap-3 rounded-[20px] border border-menthe/25 bg-menthe/[0.07] px-6 py-5 text-center">
                    <p className="text-[15px] font-medium">
                      Grille reconstituée : {pdfDone.w} × {pdfDone.h} cases avec {pdfDone.floss} fils DMC.
                    </p>
                    <p className="max-w-[560px] text-[13px] leading-relaxed text-label-2">
                      Continuez dans l’atelier pour modifier la grille, préparer les fils et exporter le patron complet.
                    </p>
                    <button
                      type="button"
                      onClick={onOpen}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0071e3] px-5 text-[15px] font-semibold text-white transition-all hover:bg-[#0077ed] active:scale-[.97]"
                    >
                      Ouvrir dans l’atelier <FileUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Reveal>
      </section>

      {/* ---------------- Exporter ---------------- */}
      <section id="exporter" className="scroll-mt-16 px-5 py-28 sm:px-8 sm:py-40">
        <SectionHead
          eyebrow="Partager et vendre"
          title="Un patron que les brodeuses peuvent vraiment utiliser."
          lead="Tout ce qu’un patron professionnel doit contenir, généré automatiquement depuis votre grille."
        />

        <Reveal className="mx-auto mt-16 max-w-[1120px]">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { t: "Page de garde", d: "Titre, tailles finies pour Aida 11, 14, 16 et 18 ct, nombre de couleurs et toile conseillée." },
              { t: "Légende DMC", d: "Symbole, pastille, code, nom du fil, nombre de points et écheveaux nécessaires." },
              { t: "Écheveaux par comptage", d: "La consommation change selon la toile : chaque comptage a son estimation." },
              { t: "Index des pages", d: "Un plan de montage pour retrouver quelle page s’assemble où." },
              { t: "Chevauchement", d: "Dix cases de repère gris entre les pages, pour ne jamais se tromper de raccord." },
              { t: "Deux versions", d: "Couleur avec symboles, ou noir et blanc symboles seuls comme les patrons Etsy classiques." },
            ].map((c) => (
              <div key={c.t} className="rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-6">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-mint/15 text-menthe">
                  <Check className="h-5 w-5" strokeWidth={2.6} aria-hidden="true" />
                </div>
                <h4 className="text-[17px] font-semibold">{c.t}</h4>
                <p className="mt-2 text-[13.5px] leading-[1.55] text-label-2">{c.d}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ---------------- Audit honnête ---------------- */}
      <section className="scroll-mt-16 border-t border-white/[0.07] bg-[#101013] px-5 py-24 sm:px-8 sm:py-32">
        <Reveal className="mx-auto max-w-[1000px]">
          <h2 className="text-[clamp(26px,3.4vw,42px)] leading-tight font-semibold tracking-[-0.035em]">
            Où en est chaque fonctionnalité
          </h2>
          <p className="mt-4 max-w-[680px] text-[15px] leading-[1.6] text-label-2">
            Aucune promesse en l’air : voici l’état réel de ce qui est présenté sur cette page.
          </p>

          <div className="mt-10 overflow-hidden rounded-[20px] border border-white/[0.08]">
            {[
              {
                state: "Fonctionne",
                tone: "ok",
                items: "Éditeur de grille, 489 fils DMC, 24 symboles, import photo avec dithering, génération par description, export PDF, suivi d’avancement, bibliothèque, annuler/rétablir.",
              },
              {
                state: "À valider sur vos fichiers",
                tone: "warn",
                items: "Import de patrons PDF découpés, format OXS vers MacStitch et WinStitch, lecture dans Pattern Keeper, partage direct entre appareils.",
              },
              {
                state: "En construction",
                tone: "warn",
                items: "Fils au-delà de 24 couleurs (les symboles se répètent), marques autres que DMC, alphabets de samplers, route de broderie automatique.",
              },
              {
                state: "Vision",
                tone: "muted",
                items: "Composition par relations et causalité, à la façon d’une régie : le canevas comme langage, pas seulement comme outil.",
              },
            ].map((r) => (
              <div key={r.state} className="grid gap-2 border-b border-white/[0.06] p-5 last:border-b-0 sm:grid-cols-[190px_1fr] sm:gap-5">
                <span
                  className={`inline-flex h-fit w-fit items-center gap-2 rounded-full px-3 py-1 text-[12.5px] font-semibold ${
                    r.tone === "ok"
                      ? "bg-mint/15 text-menthe"
                      : r.tone === "warn"
                        ? "bg-warn/15 text-warn"
                        : "bg-white/8 text-label-2"
                  }`}
                >
                  {r.tone === "ok" ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : <Lock className="h-3 w-3" aria-hidden="true" />}
                  {r.state}
                </span>
                <p className="text-[14px] leading-[1.6] text-label-2">{r.items}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ---------------- Final ---------------- */}
      <section className="px-5 py-32 text-center sm:px-8 sm:py-44">
        <Reveal className="mx-auto max-w-[880px]">
          <h2 className="text-[clamp(38px,6vw,78px)] leading-[0.98] font-semibold tracking-[-0.05em]">
            Un moteur, pas une liste de fonctions.
          </h2>
          <p className="mx-auto mt-6 max-w-[580px] text-[clamp(17px,1.9vw,21px)] leading-[1.45] text-label-2">
            Grille, couleur, symbole, stock, suivi et export ne font qu’un. C’est ce qui rend la création puis la broderie continues.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#0071e3] px-7 text-[16px] font-semibold text-white transition-all hover:bg-[#0077ed] active:scale-[.97]"
            >
              Ouvrir l’atelier <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onGuide}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/20 px-7 text-[16px] font-semibold text-white transition-all hover:bg-white/8 active:scale-[.97]"
            >
              Visite guidée
            </button>
          </div>
        </Reveal>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-white/[0.07] px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-[#1c1c1e] ring-1 ring-white/10">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="#ff453a" strokeWidth="2.8" strokeLinecap="round" />
              </svg>
            </span>
            <span className="text-[13px] font-semibold tracking-[0.14em]">POINT ZÉRO</span>
          </span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-label-3">
            <span>489 coloris DMC documentés · Données MakeBead, CC BY 4.0</span>
            <span>Teintes écran approximatives</span>
            <span>Vos fichiers restent sur votre appareil</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
