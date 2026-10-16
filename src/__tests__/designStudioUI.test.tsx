import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeAll, afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DesignStudio from "../components/DesignStudio";
import {createUniversalDossier} from "../lib/universalDossier";

let root: Root | null = null;
let host: HTMLDivElement | null = null;
const oldObserver = globalThis.ResizeObserver;
const oldCtx = HTMLCanvasElement.prototype.getContext;
beforeAll(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} } as typeof ResizeObserver;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});
afterAll(() => {
  globalThis.ResizeObserver = oldObserver;
  HTMLCanvasElement.prototype.getContext = oldCtx;
});
beforeEach(() => localStorage.clear());
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();host=null;root=null;
  localStorage.clear();
});
function mount(props?:{projectId?:string;incomingPhoto?:{id:string;dataUrl:string};onPhotoConsumed?:()=>void}) {
  host=document.createElement("div");document.body.appendChild(host);
  root=createRoot(host);
  act(()=>root?.render(<DesignStudio onEmbroidery={vi.fn()} {...props}/>));
  return host;
}
function click(el: Element | null | undefined) {
  expect(el).toBeTruthy();
  act(()=>el?.dispatchEvent(new MouseEvent("click",{bubbles:true})));
}
const buttonNamed = (host:Element,label:string) => Array.from(host.querySelectorAll("button")).find(b=>b.textContent?.trim().includes(label));
describe("POINTZERO — studio universel", () => {
  it("isole le canevas par projet et préserve les anciennes créations",()=>{
    const project=createUniversalDossier("Créer un programme de cérémonie");
    localStorage.setItem("pointzero:design-current:v1","ancien document intact");
    const view=mount({projectId:project.id});
    expect(view.querySelectorAll("[data-element-id]")).toHaveLength(0);
    expect(view.textContent).not.toContain("Fleur rose");
    click(buttonNamed(view,"Texte"));
    const scoped=localStorage.getItem("pointzero:design:project:"+project.id+":current:v1");
    expect(scoped).toContain("Votre texte");
    expect(localStorage.getItem("pointzero:design-current:v1")).toBe("ancien document intact");
  });
  it("ouvre la grille de fragments dans le même atelier sans modifier le document graphique", () => {
    const view=mount();
    expect(view.querySelector('[aria-label="Canevas de création universel"]')).toBeTruthy();
    click(buttonNamed(view,"Grille"));
    const board=view.querySelector('[aria-label="Grille universelle de fragments"]');
    expect(board).toBeTruthy();
    expect(board?.querySelectorAll("[data-fragment-id]").length).toBeGreaterThan(3);
    const select=board?.querySelector("[data-fragment-id]") as HTMLButtonElement;
    click(select);
    expect(view.querySelector('[aria-label="Propriétés du fragment"]')).toBeTruthy();
    click(buttonNamed(view,"Ajouter"));
    expect(view.querySelector('[aria-label="Canevas de création universel"]')).toBeTruthy();
  });
  it("réintègre une photo ou un vêtement retouché dans la composition sans écraser l'original", () => {
    const onPhotoConsumed=vi.fn();
    const input={id:"picture-1",dataUrl:"data:image/png;base64,iVBORw0KGgo="};
    const host=mount({incomingPhoto:input,onPhotoConsumed});
    expect(onPhotoConsumed).toHaveBeenCalledOnce();
    expect(host.querySelectorAll("[data-element-id]")).toHaveLength(1);
    expect(host.textContent).toContain("Photo retouchée ajoutée");
    const doc=JSON.parse(localStorage.getItem("pointzero:design-current:v1")??"{}") as {elements:Array<{kind:string}>};
    expect(doc.elements.some(e=>e.kind==="image")).toBe(true);
    expect(doc.elements.every(e=>e.kind==="image")).toBe(true);
  });

  it("ouvre l'éditeur vierge et permet d'ajouter du texte sans motif imposé", () => {
    const host=mount();
    expect(host.querySelector('[aria-label="Canevas de création universel"]')).toBeTruthy();
    expect(host.querySelector('[aria-label="Ressources et formats"]')).toBeTruthy();
    const before=host.querySelectorAll("[data-element-id]").length;
    expect(host.textContent).not.toContain("Bibliothèque florale et graphique");
    click(buttonNamed(host,"Texte"));
    expect(host.querySelectorAll("[data-element-id]").length).toBe(before+1);
    expect(host.querySelector('[aria-label="Propriétés de la création"]')).toBeTruthy();
  });
  it("la commande Décliner conserve l'original dans Mes créations", () => {
    const host=mount();
    click(buttonNamed(host,"Décliner"));
    click(buttonNamed(host,"Story"));
    expect(host.textContent).toContain("Story · 540 × 960 px");
    const saved=JSON.parse(localStorage.getItem("pointzero:design-drafts:v1")??"[]") as Array<{format:string}>;
    expect(saved.length).toBeGreaterThan(0);
    expect(saved[0].format).toBe("maquette");
  });
  it("autorise la sauvegarde locale et les sept formats prédéfinis", () => {
    const host=mount();
    click(host.querySelector('button[aria-label="Enregistrer dans Mes créations"]'));
    const projects=JSON.parse(localStorage.getItem("pointzero:design-drafts:v1")??"[]") as unknown[];
    expect(projects.length).toBe(1);
    click(buttonNamed(host,"Décliner"));
    expect(buttonNamed(host,"Faire-part")).toBeTruthy();
    expect(buttonNamed(host,"Mini-site")).toBeTruthy();
  });
});
