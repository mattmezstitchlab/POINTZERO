import type { ReactNode } from "react";
import { CircleDot, Eraser, Hand, Highlighter, PaintBucket, Pipette, Scissors, ParkingCircle, Rows3, Grid2x2, Scan } from "lucide-react";
import { FLOSS } from "../lib/dmc";
import type { Tool } from "../lib/stitch";

interface ToolDef {
  id: Tool;
  label: string;
  key: string;
  icon: ReactNode;
}

const I = {
  viewBox: "0 0 24 24",
  width: 22,
  height: 22,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

const TOOLS: ToolDef[][] = [
  [{ id: "hand", label: "Déplacer", key: "V", icon: <Hand {...{ width: 21, height: 21, strokeWidth: 1.9 }} aria-hidden /> }],
  [
    {
      id: "cross",
      label: "Point de croix",
      key: "X",
      icon: (
        <svg {...I}>
          <path d="M6 6l12 12M18 6L6 18" strokeWidth={2.1} />
        </svg>
      ),
    },
    {
      id: "half",
      label: "Demi-point",
      key: "D",
      icon: (
        <svg {...I}>
          <path d="M6 18L18 6" strokeWidth={2.1} />
          <path d="M6 6l12 12" strokeDasharray="1.5 3" opacity="0.45" />
        </svg>
      ),
    },
    {
      id: "quarter",
      label: "Quart de point",
      key: "Q",
      icon: (
        <svg {...I}>
          <path d="M5 5l7 7" strokeWidth={2.1} />
          <path d="M12 12L19 19" strokeDasharray="1.5 3" opacity="0.45" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
    {
      id: "back",
      label: "Point arrière",
      key: "R",
      icon: (
        <svg {...I}>
          <path d="M4 15 L10 9 L14 13 L20 7" />
          <circle cx="4" cy="15" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="20" cy="7" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
    { id: "knot", label: "Noeud français", key: "K", icon: <CircleDot {...{ width: 21, height: 21, strokeWidth: 1.9 }} aria-hidden /> },
    {
      id: "long",
      label: "Point lancé",
      key: "L",
      icon: (
        <svg {...I}>
          <path d="M5 19L19 5" strokeWidth={3.2} />
        </svg>
      ),
    },
  ],
  [
    { id: "pick", label: "Pipette", key: "I", icon: <Pipette {...{ width: 20, height: 20, strokeWidth: 1.9 }} aria-hidden /> },
    { id: "fill", label: "Remplissage", key: "G", icon: <PaintBucket {...{ width: 20, height: 20, strokeWidth: 1.9 }} aria-hidden /> },
    { id: "erase", label: "Gomme", key: "E", icon: <Eraser {...{ width: 20, height: 20, strokeWidth: 1.9 }} aria-hidden /> },
    { id: "mark", label: "Surligner l'avancement", key: "M", icon: <Highlighter {...{ width: 20, height: 20, strokeWidth: 1.9 }} aria-hidden /> },
  ],
];

interface Props {
  tool: Tool;
  onTool: (t: Tool) => void;
  color: number;
  workspace: "create" | "stitch";
}

/** Dock flottant : vertical à gauche sur iPad paysage, horizontal en bas en portrait. */
export default function Dock({ tool, onTool, color, workspace }: Props) {
  const hex = FLOSS[color]?.hex ?? "#000";
  const visibleGroups =
    workspace === "create"
      ? [TOOLS[0], [...TOOLS[1], { id: "select" as Tool, label: "Sélection", key: "S", icon: <Scan size={20} /> }], TOOLS[2].filter((t) => t.id !== "mark")]
      : [TOOLS[0], [TOOLS[2][0], TOOLS[2][3], { id: "block" as Tool, label: "Bloc 10 × 10", key: "B", icon: <Grid2x2 size={20} /> }, { id: "row" as Tool, label: "Ligne", key: "H", icon: <Rows3 size={20} /> }, { id: "park" as Tool, label: "Garer un fil", key: "P", icon: <ParkingCircle size={20} /> }, { id: "unpick" as Tool, label: "À défaire", key: "U", icon: <Scissors size={20} /> }]];
  return (
    <nav
      aria-label="Outils de broderie"
      data-guide="tools"
      className="glass no-scrollbar fixed bottom-[92px] left-1/2 z-30 flex max-w-[calc(100vw-20px)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-[22px] p-1.5 lg:top-1/2 lg:bottom-auto lg:left-4 lg:max-h-[calc(100dvh-170px)] lg:max-w-none lg:translate-x-0 lg:-translate-y-1/2 lg:flex-col lg:overflow-y-auto lg:p-2"
    >
      {visibleGroups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-1 lg:flex-col">
          {gi > 0 && <span className="mx-1 h-6 w-px shrink-0 bg-white/12 lg:mx-0 lg:my-1 lg:h-px lg:w-6" aria-hidden="true" />}
          {group.map((t) => (
            <div key={t.id} className="group relative">
              <button
                type="button"
                className="btn-tool"
                aria-pressed={tool === t.id}
                aria-label={`${t.label} (${t.key})`}
                title={`${t.label} · ${t.key}`}
                onClick={() => onTool(t.id)}
              >
                {t.icon}
              </button>
              <span
                aria-hidden="true"
                className="glass pointer-events-none absolute top-1/2 left-full z-40 ml-3 hidden -translate-y-1/2 translate-x-[-4px] items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-[13px] whitespace-nowrap opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 lg:flex"
              >
                {t.label}
                <span className="kbd">{t.key}</span>
              </span>
            </div>
          ))}
        </div>
      ))}

      <span className="mx-1 h-6 w-px shrink-0 bg-white/12 lg:mx-0 lg:my-1 lg:h-px lg:w-6" aria-hidden="true" />
      <span
        className="h-[28px] w-[28px] shrink-0 rounded-[9px] ring-2 ring-white/20"
        style={{ background: hex, boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.4)" }}
        aria-label={`Fil actif ${FLOSS[color]?.code ?? ""}`}
        title={`DMC ${FLOSS[color]?.code ?? ""}`}
      />
    </nav>
  );
}
