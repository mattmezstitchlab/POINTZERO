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
import { buildDeck, orderDeck } from "../components/CardDeck";

const saved = { matchMedia: globalThis.matchMedia, RO: globalThis.ResizeObserver };

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
    root!.render(<Landing onOpen={vi.fn()} onGuide={vi.fn()} onPrompt={vi.fn()} />);
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
