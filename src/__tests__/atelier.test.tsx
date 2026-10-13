/**
 * L'atelier monté pour de vrai.
 *
 * Les autres suites testent des composants isolés : elles prouvent que le dock
 * sait animer un outil et que le guide sait afficher une réponse, mais pas que
 * les deux sont branchés l'un sur l'autre. C'est pourtant là que le guide peut
 * échouer sans bruit — un effet qui ne se déclenche jamais, une étape qui ne se
 * valide pas, un pictogramme qui pulse dans un groupe replié. Ces tests montent
 * App entier et suivent le parcours de bout en bout.
 *
 * jsdom n'a ni matchMedia, ni ResizeObserver, ni taille d'écran : les polyfills
 * ci-dessous sont le minimum pour que l'atelier démarre. Ce qui reste non
 * couvert — le rendu du canevas, le stylet, l'animation réelle — est consigné
 * dans docs/INTEGRATION-CONTINUE.md.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "../App";

const saved = { matchMedia: globalThis.matchMedia, ResizeObserver: globalThis.ResizeObserver };

beforeAll(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof globalThis.matchMedia;
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
});

afterAll(() => {
  globalThis.matchMedia = saved.matchMedia;
  globalThis.ResizeObserver = saved.ResizeObserver;
});

let root: Root | null = null;
let container: HTMLElement | null = null;

/** Un clic, et les effets qui en découlent. */
const click = async (el: Element) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const byText = (re: RegExp) =>
  [...(container?.querySelectorAll("button, a") ?? [])].find((b) => re.test(b.textContent || "")) ?? null;

const byLabel = (label: string) => container?.querySelector(`[aria-label="${label}"]`) ?? null;

/** Le mémo flottant. La boussole de la barre du haut porte le même libellé :
 *  on distingue par la balise. */
const hud = () => container?.querySelector(".coach-in") ?? null;
const compass = () => container?.querySelector('button[aria-label="Guide de l\'atelier"]') ?? null;
const lit = () => [...(container?.querySelectorAll('[data-coach="on"]') ?? [])];
const étape = () => (container?.textContent || "").match(/Étape \d+ \/ \d+/)?.[0] ?? "";
const progrès = () => JSON.parse(localStorage.getItem("point-zero:coach") || "null");

/** Monte l'atelier et entre dans l'écran de travail. */
async function openAtelier() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<App />);
  });
  // Les libellés de l'accueil contiennent des espaces insécables.
  const entrer = byText(/Ouvrir l'atelier/);
  expect(entrer, "le hero propose d'entrer dans l'atelier").toBeTruthy();
  await click(entrer!);
  expect(compass(), "la boussole est dans la barre du haut").toBeTruthy();
}

beforeEach(() => {
  localStorage.clear();
  // Entrer dans l'atelier écrit #atelier dans l'URL, et jsdom la conserve d'un
  // test à l'autre : sans ça, le deuxième test démarrerait déjà dans l'atelier.
  window.history.replaceState(null, "", "/");
});
afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  localStorage.clear();
});

describe("Atelier : le guide est branché sur les vrais outils", () => {
  it("démarre seul à la première ouverture, sur une seule étape", async () => {
    await openAtelier();
    expect(hud(), "le guide s'est ouvert tout seul").toBeTruthy();
    expect(étape()).toBe("Étape 1 / 7");
    expect(container!.textContent).toContain("Deux gestes, un seul projet");
    // Une étape, une cible : la première vise la barre des modes, pas un outil.
    expect(lit()).toHaveLength(0);
    expect(document.querySelector('[data-guide="workspace"].coach-zone'), "la zone est marquée").toBeTruthy();
  });

  it("n'insiste pas quand l'atelier a déjà été visité", async () => {
    localStorage.setItem(
      "point-zero:coach",
      JSON.stringify({ track: "create", stepId: null, done: [], seen: true, dismissed: true }),
    );
    await openAtelier();
    expect(hud(), "un atelier déjà visité s'ouvre sans guide").toBeFalsy();
    expect(compass(), "mais le guide reste à un toucher").toBeTruthy();
  });

  it("anime le pictogramme visé par l'étape", async () => {
    await openAtelier();
    await click(byText(/^Suivant$/)!);
    expect(étape()).toBe("Étape 2 / 7");
    expect(lit()).toHaveLength(1);
    expect(lit()[0].getAttribute("data-tool")).toBe("cross");
  });

  it("ouvre le groupe « plus » quand l'étape vise un outil qui y est caché", async () => {
    await openAtelier();
    await click(byText(/^Suivant$/)!);
    await click(byText(/^Suivant$/)!);
    await click(byText(/^Suivant$/)!);
    expect(étape()).toBe("Étape 4 / 7");
    expect(byLabel("Masquer les outils moins fréquents"), "le groupe s'est ouvert").toBeTruthy();
    expect(lit()[0].getAttribute("data-tool")).toBe("threeQuarter");
  });

  it("valide l'étape quand l'outil montré est touché, même s'il était déjà pris", async () => {
    await openAtelier();
    await click(byText(/^Suivant$/)!); // → étape 2, qui attend l'outil croix
    expect(étape()).toBe("Étape 2 / 7");
    // Le point de croix est l'outil par défaut : attendre un changement d'état
    // ferait patienter cette étape pour rien. C'est le geste qui compte.
    await click(byLabel("Point de croix (X)")!);
    expect(étape(), "le geste a validé l'étape").toBe("Étape 3 / 7");
    expect(progrès().done).toContain("c-cross");
    expect(progrès().stepId).toBe("c-first");
  });

  it("valide l'étape quand un panneau est ouvert pour de vrai", async () => {
    await openAtelier();
    for (let i = 0; i < 4; i += 1) await click(byText(/^Suivant$/)!); // → étape 5, le rail des fils
    expect(étape()).toBe("Étape 5 / 7");
    await click(byText(/^Suivant$/)!); // → étape 6, le panneau Projet
    expect(étape()).toBe("Étape 6 / 7");
    await click(byLabel("Projet, réglages et export")!);
    expect(étape(), "ouvrir le panneau valide l'étape").toBe("Étape 7 / 7");
    expect(progrès().done).toContain("c-project");
  });

  it("n'avance pas tout seul quand rien n'a bougé", async () => {
    await openAtelier();
    await click(byText(/^Suivant$/)!);
    const avant = étape();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(étape()).toBe(avant);
    // « Suivant » marque l'étape passée — c'est ce qui permet de reprendre plus
    // tard là où l'on s'est arrêté — mais rien d'autre ne bouge tout seul.
    expect(progrès().done).toEqual(["c-workspace"]);
  });

  it("répond à une question posée dans le champ, sans quitter l'atelier", async () => {
    await openAtelier();
    const field = hud()!.querySelector("input") as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(field, "comment activer la symétrie");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      hud()!.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(container!.textContent).toContain("L'atelier répond");
    expect(container!.textContent).toContain("symétrie");
    expect(étape(), "une réponse remplace le pas à pas, une chose à la fois").toBe("");
    expect(hud(), "et l'atelier reste ouvert autour").toBeTruthy();
  });

  it("Échappe masque le mémo sans rien effacer, la boussole le rouvre", async () => {
    await openAtelier();
    await act(async () => {
      document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(hud()).toBeFalsy();
    expect(progrès().stepId, "Échappe masque, il ne réinitialise rien").toBe("c-workspace");
    expect(progrès().dismissed).toBe(false);
    await click(compass()!);
    expect(hud()).toBeTruthy();
    expect(étape()).toBe("Étape 1 / 7");
  });

  it("suit le mode : passer en Broderie change le parcours, sans l'imposer", async () => {
    await openAtelier();
    expect(étape()).toBe("Étape 1 / 7");
    await click(container!.querySelector('button[aria-label^="Mode actuel"]')!);
    expect(étape(), "le guide suit le geste").toBe("Étape 1 / 8");
    expect(container!.textContent).toContain("Passer en mode Broder");
    expect(container!.textContent).toContain("Broder");
  });

  it("rejoue une étape précise depuis le début du parcours", async () => {
    localStorage.setItem(
      "point-zero:coach",
      JSON.stringify({ track: "create", stepId: null, done: ["c-workspace", "c-cross", "c-first", "c-fractions", "c-floss", "c-project", "c-export"], seen: true, dismissed: false }),
    );
    await openAtelier();
    await click(compass()!);
    // Un parcours terminé repart de la première étape, et rend la main.
    expect(étape()).toBe("Étape 1 / 7");
    expect(progrès().done).toEqual([]);
    expect(container!.textContent).toContain("Suivant");
  });
});
