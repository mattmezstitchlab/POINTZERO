/**
 * La landing en modules : ce qui s'y voit doit exister.
 *
 * Ces tests montent la page d'accueil entière et vérifient trois choses que
 * le reste de la suite ne regarde pas : le bandeau défilant porte bien les
 * pictos réels, les neuf modules sont présents avec leur badge d'état, et le
 * jeu de 54 cartes se range dans deux ordres qui veulent chacun dire quelque
 * chose. Le tableau honnête est vérifié lui aussi : c'est lui qui interdit à
 * cette page de promettre plus que le code.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import Landing from "../components/Landing";

vi.mock("../lib/convert", () => ({
  loadRemoteImage: vi.fn(async () => ({ src: "data:image/png;base64,", width: 4, height: 4 })),
}));
vi.mock("../lib/dither", () => ({
  imageToDmc: vi.fn(() => {
    const cross = new Int16Array(44 * 44).fill(-1);
    for (let i = 0; i < 200; i += 1) cross[i] = 0;
    return { cross, palette: [80] };
  }),
}));
import { buildDeck, orderDeck } from "../components/CardDeck";

const saved = { matchMedia: globalThis.matchMedia, RO: globalThis.ResizeObserver };

beforeAll(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.matchMedia = ((query: string) => ({
    matches: query.includes("(pointer: fine)"),
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
  globalThis.ResizeObserver = saved.RO;
});

let root: Root | null = null;
let container: HTMLElement | null = null;

const click = async (el: Element) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};
const byText = (re: RegExp) =>
  [...(container?.querySelectorAll("button") ?? [])].find((b) => re.test(b.textContent || "")) ?? null;

beforeEach(async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<Landing onOpen={vi.fn()} onGuide={vi.fn()} onMotif={vi.fn()} />);
  });
});
afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
});

describe("Landing : le bandeau et les modules", () => {
  it("fait défiler les pictos réels, en grand et en deux copies", () => {
    const pictos = container!.querySelectorAll(".marquee-picto");
    expect(pictos.length).toBeGreaterThan(20);
    expect(pictos.length % 2, "deux copies pour une boucle sans couture").toBe(0);
    expect(container!.querySelector(".marquee-track")).toBeTruthy();
  });

  it("présente neuf modules, et dit lequel est en construction", () => {
    const modules = [...container!.querySelectorAll("[data-module]")].map((m) => m.getAttribute("data-module"));
    expect(modules).toEqual(["atelier", "fil", "lecteur", "imprimeur", "compagnon", "guide", "confort", "lien", "sal"]);
    const sal = container!.querySelector('[data-module="sal"]')!;
    expect(sal.textContent).toContain("en construction");
    expect(container!.querySelector('[data-module="atelier"]')!.textContent).not.toContain("en construction");
  });

  it("montre une légende calculée, pas décorée", () => {
    const legende = container!.querySelector(".live-legend")!;
    expect(legende.querySelectorAll("li").length).toBe(4);
    expect(legende.textContent, "l’atelier écrit ses décimales au point, comme partout").toMatch(/\d+\.\d m/);
    expect(legende.textContent).toContain("321");
  });

  it("laisse exécuter les tests du moteur depuis la page", async () => {
    await click(byText(/Exécuter les tests du moteur/)!);
    expect(container!.textContent).toMatch(/\d+\/\d+ vérifications passent/);
  });

  it("le tableau honnête rattrape le code", () => {
    const texte = container!.textContent || "";
    expect(texte).toContain("504 symboles");
    expect(texte).not.toContain("24 symboles");
    expect(texte).not.toContain("les symboles se répètent");
  });
});

describe("Landing : le jeu de 54 cartes", () => {
  const cartes = () => [...container!.querySelectorAll(".deck-card")].map((c) => c.getAttribute("title") || "");

  it("compte 52 semaines et 2 repos", () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(54);
    expect(deck.filter((c) => c.joker)).toHaveLength(2);
    expect(new Set(deck.filter((c) => !c.joker).map((c) => c.week)).size).toBe(52);
  });

  it("commence mélangé : le désordre est le point de départ", () => {
    expect(container!.querySelector("[data-deck]")!.getAttribute("data-deck")).toBe("melee");
    expect(cartes()).toHaveLength(54);
    expect(cartes()[0], "la première carte n'est pas la semaine 1").not.toBe("Semaine 1 · Hiver · sem. 1");
  });

  it("en un clic, range par saison : l'année de haut en bas", async () => {
    await click(byText(/^Ranger par saison$/)!);
    expect(container!.querySelector("[data-deck]")!.getAttribute("data-deck")).toBe("saison");
    const t = cartes();
    expect(t[0]).toBe("Semaine 1 · Hiver · sem. 1");
    expect(t[13]).toBe("Semaine 14 · Printemps · sem. 1");
    expect(t[52].toLowerCase()).toContain("repos");
  });

  it("en un clic, range par semaine : le rythme, pas le calendrier", async () => {
    await click(byText(/^Ranger par semaine$/)!);
    const t = cartes();
    expect(t[0]).toBe("Semaine 1 · Hiver · sem. 1");
    expect(t[1], "même colonne, même semaine de chaque saison").toBe("Semaine 14 · Printemps · sem. 1");
    expect(t[3]).toBe("Semaine 40 · Automne · sem. 1");
  });

  it("les deux rangements sont des mélanges du même jeu", () => {
    const deck = buildDeck();
    const suite = (o: typeof deck) => o.map((c) => c.id).join(",");
    const trie = (o: typeof deck) => o.map((c) => c.id).sort((a, b) => a - b).join(",");
    // Même jeu dans les trois ordres…
    expect(trie(orderDeck(deck, "saison"))).toBe(trie(orderDeck(deck, "semaine")));
    expect(trie(orderDeck(deck, "melee"))).toBe(trie(orderDeck(deck, "saison")));
    // …mais trois ordres différents : aucun n'est l'autre.
    expect(suite(orderDeck(deck, "saison"))).not.toBe(suite(orderDeck(deck, "semaine")));
    expect(suite(orderDeck(deck, "melee"))).not.toBe(suite(orderDeck(deck, "saison")));
  });
});

describe("Landing : le hero est un terrain de jeu", () => {
  const frames = async (n = 24) => {
    for (let i = 0; i < n; i += 1) {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 40));
      });
    }
  };

  it("propose décrire, déposer un PDF, ou entrer", () => {
    expect(container!.querySelector("#hero-jeu input"), "le champ de description est dans le hero").toBeTruthy();
    expect(byText(/Voir le motif/)).toBeTruthy();
    expect(container!.textContent).toContain("Un PDF");
    expect(byText(/Ouvrir l.atelier/), "la nav reste une porte d'entrée").toBeTruthy();
    expect(container!.textContent).toContain("demande un réseau");
  });

  it("décrit un motif : le visuel s'efface, les pixels chargent, puis hop", async () => {
    const field = container!.querySelector("#hero-jeu input") as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(field, "renard endormi");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      container!.querySelector("#hero-jeu form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await frames();
    expect(container!.querySelector(".hero-stage"), "le visuel d'ouverture a laissé la place").toBeTruthy();
    expect(container!.querySelector('[data-loupe="motif"] canvas'), "le motif arrive en petits pixels").toBeTruthy();
    expect(container!.textContent).toContain("44 × 44 cases");
    expect(byText(/Continuer dans l'atelier/), "puis hop : on continue").toBeTruthy();
  });

  it("sobre : le titre seul, le champ centré, sans les deux boutons", () => {
    const hero = container!.querySelector("#hero-jeu")!;
    expect(hero.textContent).not.toContain("Se laisser guider");
    expect(hero.textContent).not.toContain("Ouvrir l'atelier");
    expect(container!.querySelector(".hero-texture"), "le fond animé est là").toBeTruthy();
    expect(container!.querySelector(".hero-texture-css"), "sans WebGL, la texture CSS prend le relais").toBeTruthy();
    const h1 = container!.querySelector("h1")!;
    expect(h1.textContent).toMatch(/De l.image au dernier point/);
    expect(h1.previousElementSibling, "plus d'eyebrow « Point Zéro » au-dessus du titre").toBeFalsy();
  });

  it("la loupe suit la souris sur les pictos, et change de forme", async () => {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    const picto = container!.querySelector(".marquee-picto")!;
    await act(async () => {
      picto.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 120, clientY: 200 }));
      await new Promise((r) => setTimeout(r, 40));
    });
    const lens = container!.querySelector(".loupe") as HTMLElement;
    expect(lens, "la lentille apparaît sur un picto").toBeTruthy();
    expect(lens.hidden).toBe(false);
    expect(lens.querySelector(".loupe-svg svg"), "elle redessine le picto agrandi").toBeTruthy();
    expect(lens.getAttribute("data-shape")).toBe("ronde");
    await act(async () => {
      container!.querySelector(".loupe-toggle")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect((container!.querySelector(".loupe") as HTMLElement).getAttribute("data-shape")).toBe("carree");
  });
});
