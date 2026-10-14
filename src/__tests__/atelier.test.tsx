/**
 * Intégration de l'atelier unique.
 * jsdom ne rend pas le trait Canvas : ici nous vérifions navigation, outils,
 * absence du guide et continuité des parcours. Le rendu réel exige une recette navigateur.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "../App";

const saved = {
  matchMedia: globalThis.matchMedia,
  ResizeObserver: globalThis.ResizeObserver,
  getContext: HTMLCanvasElement.prototype.getContext,
};
beforeAll(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })) as unknown as typeof globalThis.matchMedia;
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});
afterAll(() => {
  globalThis.matchMedia = saved.matchMedia;
  globalThis.ResizeObserver = saved.ResizeObserver;
  HTMLCanvasElement.prototype.getContext = saved.getContext;
});
let root: Root | null = null;
let container: HTMLElement | null = null;
async function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<App />); });
  return container;
}
async function click(el: Element | null | undefined) {
  expect(el, "commande de l'atelier présente").toBeTruthy();
  await act(async () => { el!.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
}
const nav = () => container?.querySelector('nav[aria-label="Catégories de l\'atelier"]');
const category = (name: string) => [...(nav()?.querySelectorAll("button") ?? [])].find((b) => b.textContent?.includes(name));
const dialog = (name: string) => container?.querySelector(`[role="dialog"][aria-label="${name}"]`);
const button = (label: string) => container?.querySelector(`button[aria-label="${label}"]`);
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("pointzero:workspace","embroidery");
  window.history.replaceState(null, "", "/");
});
afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  localStorage.clear();
});
describe("POINTZERO : atelier unique sans assistant", () => {
  it("ouvre Photo et Stylisme depuis les supports sans changer le patron de broderie", async () => {
    localStorage.setItem("pointzero:workspace","design");
    await mount();
    expect(container?.querySelector('[aria-label="Canevas de création universel"]')).toBeTruthy();
    await click(button("Ouvrir le menu des studios"));
    await click(button("Ouvrir le studio Photo"));
    expect(container?.querySelector('[aria-label="Prévisualisation photo"]')).toBeTruthy();
    expect(container?.querySelector('[aria-label="Réglages de retouche"]')).toBeTruthy();
    await click(button("Retour aux supports graphiques"));
    await click(button("Ouvrir le menu des studios"));
    await click(button("Ouvrir le studio Stylisme"));
    expect(container?.querySelector('[aria-label="Maquette de vêtement"]')).toBeTruthy();
    expect(container?.querySelector('[aria-label="Propriétés du vêtement"]')).toBeTruthy();
    await click(button("Retour aux supports graphiques"));
    await click(button("Ouvrir l'atelier broderie"));
    expect(container?.querySelector('canvas[role="application"]')).toBeTruthy();
  });

  it("permet de revenir au Studio multiformat sans altérer la broderie", async () => {
    await mount();
    expect(button("Créer des supports graphiques")).toBeTruthy();
    await click(button("Créer des supports graphiques"));
    expect(container?.querySelector('[aria-label="Canevas de création universel"]')).toBeTruthy();
    expect(localStorage.getItem("pointzero:workspace")).toBe("design");
    await click(button("Ouvrir l'atelier broderie"));
    expect(container?.querySelector('canvas[role="application"]')).toBeTruthy();
    expect(localStorage.getItem("pointzero:workspace")).toBe("embroidery");
  });

  it("ouvre directement la grille et la bibliothèque de motifs, sans écran d'accueil", async () => {
    const view = await mount();
    expect(view.querySelector('canvas[role="application"]')).toBeTruthy();
    expect(view.querySelector('[aria-label="Bibliothèque de motifs"]')).toBeTruthy();
    expect(view.querySelector('button[aria-label="Ajouter Fleur rose"]')).toBeTruthy();
    expect(nav()?.querySelectorAll("button")).toHaveLength(4);
    expect(dialog("Créer")?.classList.contains("is-open")).toBe(false);
  });
  it("ne montre ni guide, ni démarrage automatique, même si l'ancien état subsiste", async () => {
    localStorage.setItem("point-zero:coach", JSON.stringify({ seen: false, dismissed: false }));
    await mount();
    expect(container?.querySelector(".coach-in")).toBeNull();
    expect(button("Guide de l'atelier")).toBeNull();
    expect(container?.querySelector('[data-coach="on"]')).toBeNull();
  });
  it("Dessiner conserve la grille centrale sans ouvrir le grand panneau de réglages", async () => {
    await mount();
    await click(category("Dessiner"));
    expect(dialog("Composer")?.classList.contains("is-open")).toBeFalsy();
    expect(container?.querySelector('canvas[role="application"]')).toBeTruthy();
  });
  it("ajoute un motif DMC par clic et ouvre ses propriétés minimales", async () => {
    await mount();
    await click(container?.querySelector('button[aria-label="Ajouter Fleur rose"]'));
    expect(container?.querySelector('[aria-label="Propriétés du motif"]')).toBeTruthy();
    expect(container?.querySelector('[aria-label="Taille du motif"]')).toBeTruthy();
    expect(container?.querySelector('[aria-label="Calques de composition"]')).toBeTruthy();
    expect(button("Annuler")?.hasAttribute("disabled")).toBe(false);
  });
  it("réunit fils, toile et profil dans le même panneau", async () => {
    await mount();
    await click(category("Fils"));
    expect(dialog("Fils & toile")?.classList.contains("is-open")).toBe(true);
    expect(dialog("Fils & toile")?.textContent).toContain("Mon profil brodeuse");
    expect(dialog("Fils & toile")?.textContent).toContain("Tissu, comptage et dimensions");
  });
  it("donne accès au suivi Broder sans changer de page", async () => {
    await mount();
    await click(category("Broder"));
    expect(dialog("Broder")?.classList.contains("is-open")).toBe(true);
    expect(dialog("Broder")?.textContent).toContain("Journal du projet");
    expect(window.location.hash).toBe("");
  });
  it("garde Bibliothèque, Exporter et Réglages dans l'en-tête", async () => {
    await mount();
    expect(button("Bibliothèque")).toBeTruthy();
    expect(button("Exporter et partager")).toBeTruthy();
    await click(button("Réglages et aide"));
    expect(dialog("Réglages & aide")?.classList.contains("is-open")).toBe(true);
    expect(dialog("Réglages & aide")?.textContent).not.toContain("Guide pas à pas et questions");
  });
  it("ouvre Créer dans un panneau lorsque l'utilisateur le demande", async () => {
    await mount();
    await click(button("POINTZERO : créer un motif"));
    expect(dialog("Créer")?.classList.contains("is-open")).toBe(true);
    expect(dialog("Créer")?.querySelector('textarea[placeholder="Décrivez votre motif…"]')).toBeTruthy();
  });
  it("unifie Créer, Fils et le menu Plus sur une même surface noire", async () => {
    await mount();
    await click(button("POINTZERO : créer un motif"));
    const create = dialog("Créer");
    expect(create?.classList.contains("pz-panel")).toBe(true);
    expect(create?.classList.contains("pz-surface")).toBe(true);
    expect(create?.querySelectorAll("h1")).toHaveLength(0); // Pas de titre répété.
    expect(create?.querySelector("textarea")).toBeTruthy();
    await click(create?.querySelector('button[aria-label="Fermer"]'));
    await click(category("Fils"));
    const threads = dialog("Fils & toile");
    expect(threads?.classList.contains("pz-surface")).toBe(true);
    expect(threads?.classList.contains("pz-panel")).toBe(true);
    expect(threads?.querySelector(".pz-panel-body")).toBeTruthy();
    await click(button("Plus d'options"));
    expect(container?.querySelector('[aria-label="Options d\'affichage"]')?.classList.contains("pz-surface")).toBe(true);
  });
  it("conserve les réglages techniques dans le menu avancé, pas dans la composition", async () => {
    await mount();
    await click(button("Plus d'options"));
    const advanced = [...(container?.querySelectorAll("button") ?? [])].find(b => b.textContent?.includes("Options de composition"));
    await click(advanced);
    const panel = dialog("Composer");
    const blocks = Array.from(panel?.querySelectorAll("details") ?? []);
    expect(panel?.classList.contains("is-open")).toBe(true);
    expect(blocks.length).toBeGreaterThan(4);
    expect(blocks.some(b => b.textContent?.includes("Lettrage compté"))).toBe(true);
  });
  it("autorise un import unique d'images, PDF, JSON et OXS", async () => {
    await mount();
    const picker = container?.querySelector('input[aria-label="Importer image, PDF ou projet JSON/OXS"]') as HTMLInputElement;
    expect(picker).toBeTruthy();
    expect(picker.accept).toContain("application/pdf");
    expect(picker.accept).toContain(".oxs");
    expect(picker.accept).toContain(".json");
    expect(picker.accept).toContain("image/png");
  });
  it("ne propose plus de page ni de catégorie SLÂME", async () => {
    await mount();
    expect(category("Musique & parole")).toBeUndefined();
    expect(container?.textContent).not.toContain("Retour à la grille");
    expect(window.location.hash).toBe("");
  });
  it("redirige les anciens fragments vers la page atelier unique", async () => {
    window.history.replaceState(null, "", "/#slame");
    await mount();
    expect(window.location.hash).toBe("");
    expect(nav()).toBeTruthy();
  });
});
