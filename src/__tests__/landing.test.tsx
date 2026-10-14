/**
 * La toile infinie : il n'y a plus de page d'accueil, il y a une grille.
 *
 * Ces tests montent la toile entière et vérifient le nouveau contrat :
 * le hero est une feuille paysage posée sur la grille, on dézoome à l'infini
 * (molette, glisser, recentrer), des voisines brodent en direct autour, et
 * l'on peut s'approprier un motif — paiement simulé, mais motif réel, livré
 * directement dans l'atelier sans fichier ni dossier. La loupe, elle, a
 * disparu : on s'était mal compris sur le curseur.
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
    for (let i = 200; i < 300; i += 1) cross[i] = 1;
    for (let i = 300; i < 360; i += 1) cross[i] = 2;
    return { cross, palette: [80, 81, 82] };
  }),
}));
import { buildDeck, orderDeck } from "../components/CardDeck";
import { miniDesign, VOISINES } from "../components/ToileInfinie";
import { FLOSS } from "../lib/dmc";

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
let openSpy: ReturnType<typeof vi.fn>;
let motifSpy: ReturnType<typeof vi.fn>;

const click = async (el: Element) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};
const byText = (re: RegExp) =>
  [...(container?.querySelectorAll("button") ?? [])].find((b) => re.test(b.textContent || "")) ?? null;
const sleep = async (ms: number) => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
};
const toile = () => container!.querySelector(".toile")!;
const monde = () => container!.querySelector(".toile-monde") as HTMLElement;
const kActuel = () => parseFloat(monde().dataset.k || "0");

beforeEach(async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  openSpy = vi.fn();
  motifSpy = vi.fn();
  await act(async () => {
    root!.render(<Landing onOpen={openSpy} onMotif={motifSpy} />);
  });
});
afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
});

describe("La toile : le site entier est une grille", () => {
  it("pose le hero en feuille paysage sur deux grilles, avec les voisines autour", () => {
    expect(toile(), "la toile prend tout l'écran").toBeTruthy();
    expect(container!.querySelector(".toile-grille.blocs"), "les repères de patron, tous les dix points").toBeTruthy();
    expect(container!.querySelector(".toile-grille.fines"), "la grille fine case par case").toBeTruthy();
    expect(container!.querySelector(".hero-sheet"), "le hero est une feuille posée sur la toile").toBeTruthy();
    expect(container!.querySelectorAll(".motif-vivant").length).toBe(VOISINES.length);
    expect(container!.textContent).toContain("tout est sur la grille");
    expect(container!.textContent, "honnêteté : voisines locales, paiement simulé").toContain("simulées");
  });

  it("dézoome à l'infini : la grille fine s'efface, les repères restent", async () => {
    const avant = kActuel();
    for (let i = 0; i < 16; i += 1) {
      await act(async () => {
        toile().dispatchEvent(
          new WheelEvent("wheel", { deltaY: 120, clientX: 512, clientY: 300, bubbles: true, cancelable: true }),
        );
      });
    }
    const apres = kActuel();
    expect(apres, "on a dézoomé").toBeLessThan(avant * 0.5);
    const fines = container!.querySelector(".toile-grille.fines") as HTMLElement;
    expect(fines.style.opacity, "trop fines au loin : elles disparaissent").toBe("0");
  });

  it("se déplace en glissant, et le glisser n'achète rien", async () => {
    const avant = monde().style.transform;
    await act(async () => {
      toile().dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 400, clientY: 300 }));
      toile().dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 350, clientY: 280 }));
      toile().dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 350, clientY: 280 }));
    });
    expect(monde().style.transform, "la toile a suivi le geste").not.toBe(avant);
    expect(container!.querySelector(".achat-voile"), "glisser n'ouvre aucune feuille d'achat").toBeFalsy();
  });

  it("revient au hero en un clic", async () => {
    const depart = kActuel();
    await act(async () => {
      toile().dispatchEvent(
        new WheelEvent("wheel", { deltaY: 120, clientX: 512, clientY: 300, bubbles: true, cancelable: true }),
      );
    });
    expect(kActuel()).toBeLessThan(depart);
    await click(container!.querySelector('button[aria-label="Revenir au hero"]')!);
    expect(kActuel(), "recentré sur la feuille paysage").toBe(depart);
  });
});

describe("Les voisines brodent en direct", () => {
  it("miniDesign : un vrai petit motif symétrique, pas du bruit", () => {
    const d = miniDesign(7);
    expect(d.palette.length).toBeGreaterThanOrEqual(3);
    expect(d.ordre.length, "des centaines de points à poser").toBeGreaterThan(80);
    for (let y = 0; y < d.h; y += 1) {
      for (let x = 0; x < d.w; x += 1) {
        expect(d.cross[y * d.w + x], "symétrie miroir").toBe(d.cross[y * d.w + (d.w - 1 - x)]);
        expect(d.cross[y * d.w + x]).toBe(d.cross[(d.h - 1 - y) * d.w + x]);
      }
    }
    for (const i of d.ordre) expect(d.cross[i]).toBeGreaterThanOrEqual(0);
  });

  it("la landing vit : les motifs avancent sous nos yeux", async () => {
    const carte = () => container!.querySelector(".motif-vivant [data-progres]") as HTMLElement;
    const avant = parseInt(carte().dataset.progres || "0", 10);
    expect(container!.querySelector(".mv-direct")!.textContent).toContain("en direct");
    expect(container!.querySelector(".motif-vivant canvas"), "chaque voisine a sa toile").toBeTruthy();
    await sleep(2600);
    const apres = parseInt(carte().dataset.progres || "0", 10);
    expect(apres, "ça brode : la progression avance").toBeGreaterThan(avant);
  });

  it("certains motifs sont des SAL à rejoindre", () => {
    expect(container!.textContent).toMatch(/SAL · \d+ brodeuses/);
    expect(
      [...container!.querySelectorAll("[data-cta]")].some((b) => /Rejoindre/.test(b.textContent || "")),
      "les SAL se rejoignent depuis la toile",
    ).toBe(true);
  });

  it("la palette DMC du motif brodé est visible en arrivant", async () => {
    await sleep(200);
    const rail = container!.querySelector(".rail-dmc")!;
    expect(rail).toBeTruthy();
    expect(rail.querySelectorAll("li").length, "trois fils dans le motif mocké").toBe(3);
    expect(rail.textContent).toContain(FLOSS[0].code);
  });

  it("l'outil zone serre les couleurs d'un rectangle de cases", async () => {
    await sleep(200);
    await click(container!.querySelector('button[aria-label^="Outil zone"]')!);
    await act(async () => {
      toile().dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 300, clientY: 40 }));
    });
    await act(async () => {
      toile().dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 500, clientY: 140 }));
    });
    await act(async () => {
      toile().dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 500, clientY: 140 }));
    });
    const panneau = container!.querySelector("[data-zone]");
    expect(panneau, "le panneau de zone apparaît").toBeTruthy();
    expect(panneau!.textContent).toContain("Aida 14");
    const lis = () => parseInt(panneau!.querySelector("[data-couleurs]")!.getAttribute("data-couleurs")!, 10);
    const avant = lis();
    expect(avant, "la zone porte les trois fils du mock").toBe(3);
    await click(panneau!.querySelector('button[aria-label="Moins de couleurs"]')!);
    expect(lis(), "serrer regroupe vers le fil proche").toBe(avant - 1);
    await click(panneau!.querySelector('button[aria-label="Plus de couleurs"]')!);
    expect(lis(), "desserrer restaure les teintes d'origine").toBe(avant);
  });

  it("la table magnétique du PDF et le tableau des 54 cartes sont posés sur la toile", () => {
    expect(container!.querySelector(".toile-monde .ancre-table"), "la table du PDF a sa place sur la toile").toBeTruthy();
    expect(container!.querySelector(".toile-monde [data-deck]"), "les 54 cartes forment un tableau").toBeTruthy();
    expect(container!.querySelectorAll(".deck-card").length).toBe(54);
  });
});

describe("S'approprier un motif : tout est là, pas besoin de fichier", () => {
  it("on regarde, on paie (démo), et le motif réel part dans l'atelier", async () => {
    await click(container!.querySelector(".motif-vivant [data-cta]")!);
    const voile = container!.querySelector(".achat-voile");
    expect(voile, "la feuille d'appropriation s'ouvre").toBeTruthy();
    expect(voile!.textContent).toContain("Renard des bois");
    expect(voile!.textContent).toContain("40 × 40 cases");
    expect(voile!.textContent).toContain("simulé");
    expect(voile!.querySelector("canvas"), "l'aperçu complet du motif").toBeTruthy();

    await click(voile!.querySelector("[data-confirmer]")!);
    expect(motifSpy, "le motif est livré à l'atelier").toHaveBeenCalledTimes(1);
    const p = motifSpy.mock.calls[0][0];
    expect(p.name).toBe("Renard des bois");
    expect(p.w).toBe(40);
    expect(p.h).toBe(40);
    expect(p.palette.length, "une vraie palette DMC").toBeGreaterThanOrEqual(3);
    expect(p.provenance.kind).toBe("demo");
    expect(p.provenance.license).toContain("simulé");
    expect(p.cross.some((v: number) => v >= 0), "des croix réelles, case par case").toBe(true);
    expect(container!.querySelector(".achat-voile"), "la feuille se referme").toBeFalsy();
  });
});

describe("Le hero : sobre, sur la feuille blanche", () => {
  const frames = async (n = 24) => {
    for (let i = 0; i < n; i += 1) {
      await sleep(40);
    }
  };

  it("le titre noir seul, plus aucun fond derrière le champ : le motif se brode dessus", async () => {
    const hero = container!.querySelector("#hero-jeu")!;
    expect(hero.textContent).not.toContain("Se laisser guider");
    expect(hero.textContent).not.toContain("Ouvrir l'atelier");
    expect(container!.querySelector(".hero-texture"), "plus aucun fond derrière le champ").toBeFalsy();
    await sleep(200);
    expect(container!.querySelector(".grille-motif canvas"), "un motif d'ambiance se brode derrière le champ").toBeTruthy();
    expect(container!.querySelector(".grille-motif-tag")!.textContent, "différent à chaque visite").toContain("·");
    const h1 = container!.querySelector("h1")!;
    expect(h1.textContent).toMatch(/De l.image au dernier point/);
    expect(h1.className, "titre noir halé de blanc").toContain("text-black");
    expect(h1.className).toContain("hero-titre");
    expect(container!.textContent).not.toContain("Point Zéro");
    expect(container!.querySelector(".loupe"), "plus de loupe : mal compris sur le curseur").toBeFalsy();
  });

  it("propose décrire, déposer un PDF, ou entrer", () => {
    expect(container!.querySelector("#hero-jeu input"), "le champ de description est dans le hero").toBeTruthy();
    expect(byText(/Voir le motif/)).toBeTruthy();
    expect(container!.textContent).toContain("Un PDF");
    expect(byText(/Ouvrir l.atelier/), "la nav reste une porte d'entrée").toBeTruthy();
    expect(container!.textContent).toContain("demande un réseau");
  });

  it("en arrivant, la grille est brodée : générer attend le point zéro", async () => {
    const field = container!.querySelector("#hero-jeu input") as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(field, "renard endormi");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      container!.querySelector("#hero-jeu form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await sleep(300);
    const gm = container!.querySelector(".grille-motif canvas")!;
    expect(gm.getAttribute("aria-label"), "l'ambiance reste : la grille n'est pas libre").not.toContain("renard endormi");
    expect(container!.textContent).toContain("libérez-la");
  });

  it("décrit un motif : point zéro d'abord, puis les croix chargent, puis hop", async () => {
    await click(byText(/Poser ailleurs sur la toile/)!);
    expect(container!.querySelector(".motif-pose"), "le motif libéré reste sur la toile").toBeTruthy();
    await click(byText(/Faire le point zéro/)!);
    expect(container!.querySelector(".grille-motif"), "la grille du hero est nue").toBeFalsy();

    const field = container!.querySelector("#hero-jeu input") as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(field, "renard endormi");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      container!.querySelector("#hero-jeu form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await frames(40);
    const gm = container!.querySelector(".grille-motif canvas")!;
    expect(gm.getAttribute("aria-label"), "le motif décrit remplace l'ambiance, à même la grille").toContain("renard endormi");
    expect(container!.querySelector(".grille-motif-tag")!.textContent).toContain("renard endormi");
    expect(container!.textContent).toContain("44 × 44 cases");
    expect(container!.textContent).toContain("prêt à broder");
    expect(byText(/Continuer dans l'atelier/), "puis hop : on continue").toBeTruthy();
  });
});

describe("Le jeu de 54 cartes (la logique demeure)", () => {
  it("compte 52 semaines et 2 repos", () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(54);
    expect(deck.filter((c) => c.joker)).toHaveLength(2);
    expect(new Set(deck.filter((c) => !c.joker).map((c) => c.week)).size).toBe(52);
  });

  it("les deux rangements sont des mélanges du même jeu", () => {
    const deck = buildDeck();
    const suite = (o: typeof deck) => o.map((c) => c.id).join(",");
    const trie = (o: typeof deck) => o.map((c) => c.id).sort((a, b) => a - b).join(",");
    expect(trie(orderDeck(deck, "saison"))).toBe(trie(orderDeck(deck, "semaine")));
    expect(trie(orderDeck(deck, "melee"))).toBe(trie(orderDeck(deck, "saison")));
    expect(suite(orderDeck(deck, "saison"))).not.toBe(suite(orderDeck(deck, "semaine")));
    expect(suite(orderDeck(deck, "melee"))).not.toBe(suite(orderDeck(deck, "saison")));
  });
});
