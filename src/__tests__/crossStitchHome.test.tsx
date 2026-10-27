import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import CrossStitchHome from "../components/CrossStitchHome";
import { entryStudio, publicPathFor } from "../lib/entryNavigation";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
let host: HTMLDivElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = undefined;
  localStorage.clear();
  vi.restoreAllMocks();
});
function mount() {
  const onOpen = vi.fn(), onImport = vi.fn();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root!.render(<CrossStitchHome projectName="Roses de famille" onOpen={onOpen} onImport={onImport}/>));
  return { view: host, onOpen, onImport };
}
describe("Point Zéro spécialisé", () => {
  it("ouvre la racine spécialisée et conserve les destinations historiques", () => {
    expect(entryStudio("", "", "/")).toBe("stitch-home");
    expect(publicPathFor("stitch-home")).toBe("/");
    expect(entryStudio("", "", publicPathFor("aime-home"))).toBe("aime-home");
    expect(entryStudio("?studio=embroidery", "", "/atelier")).toBe("embroidery");
    expect(entryStudio("", "", "/atelier")).toBe("design");
  });
  it("ne crée ni ne remplace de données à l’ouverture", () => {
    localStorage.setItem("ouvrage", "données existantes");
    const write = vi.spyOn(Storage.prototype, "setItem");
    const { view, onOpen } = mount();
    expect(view.querySelectorAll("h1")).toHaveLength(1);
    expect(view.textContent).toContain("Roses de famille");
    expect(view.textContent).toContain("son effacement supprime les projets locaux");
    expect(view.querySelector("iframe")).toBeNull();
    expect(view.textContent).toContain("LE PUZZLE PDF");
    expect(view.textContent).toContain("pas une capture d’écran");
    expect(view.querySelectorAll("h1")).toHaveLength(1);
    expect(write).not.toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
    expect(localStorage.getItem("ouvrage")).toBe("données existantes");
  });
  it("relie chaque action à son intention, sans catalogue d’univers généralistes", () => {
    const { view, onOpen } = mount();
    const actions = [
      ["Mes ouvrages", "library"], ["Créer mon patron", "create"],
      ["Préparer mon ouvrage", "prepare"], ["Continuer à broder", "stitch"],
    ];
    for (const [label, intent] of actions) {
      const button = [...view.querySelectorAll("button")].find(b => b.textContent?.includes(label))!;
      act(() => button.click());
      expect(onOpen).toHaveBeenLastCalledWith(intent);
    }
    expect(view.querySelector('a[href="/aime"]')).toBeNull();
    expect(view.textContent).not.toContain("Architecture mère");
    expect(view.querySelector('a[href="#csh-import"]')).not.toBeNull();
  });
  it("transmet le fichier choisi une seule fois et accepte de le sélectionner à nouveau", () => {
    const { view, onImport } = mount();
    const input = [...view.querySelectorAll<HTMLInputElement>('input[type="file"]')].find(el=>el.accept.includes('.oxs'))!;
    expect(input.accept).toContain(".oxs");
    expect(input.accept).toContain(".pdf");
    const file = new File(["image"], "souvenir.png", { type: "image/png" });
    Object.defineProperty(input, "files", { configurable: true, value: [file] });
    act(() => input.dispatchEvent(new Event("change", { bubbles: true })));
    expect(onImport).toHaveBeenCalledExactlyOnceWith(file);
    expect(input.value).toBe("");
    Object.defineProperty(input, "files", { configurable: true, value: [] });
    act(() => input.dispatchEvent(new Event("change", { bubbles: true })));
    expect(onImport).toHaveBeenCalledTimes(1);
  });
});
