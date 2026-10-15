import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import AtelierCreate from "../components/AtelierCreate";
import { STITCH_DEFAULTS, cleanupCross, dimensionsFor, stitchImagePrompt } from "../lib/stitchGeneration";
(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let node:HTMLDivElement|null=null;
let root:ReturnType<typeof createRoot>|null=null;
function mount(element:ReactNode){
  node=document.createElement("div");document.body.append(node);root=createRoot(node);
  act(()=>root?.render(element));return node;
}
afterEach(()=>{act(()=>root?.unmount());node?.remove();node=null;root=null});
describe("Génération directe de broderie",()=>{
  it("garde le sujet explicite dans le prompt au lieu d'imposer une photo réaliste",()=>{
    const prompt=stitchImagePrompt({...STITCH_DEFAULTS,prompt:"un papillon sur un éléphant",style:"animalier",maxColors:8});
    expect(prompt).toContain("un papillon sur un éléphant");
    expect(prompt).toContain("éléphant");
    expect(prompt).toContain("papillon");
    expect(prompt).toContain("approximately 8");
    expect(prompt).toContain("not a photograph");
    expect(prompt).toContain("do not add unrelated");
  });
  it("respecte la taille et la géométrie sans produire une grille démesurée",()=>{
    expect(dimensionsFor({...STITCH_DEFAULTS,width:60,format:"carre"})).toEqual({w:60,h:60});
    expect(dimensionsFor({...STITCH_DEFAULTS,width:120,format:"portrait"})).toEqual({w:120,h:168});
    expect(dimensionsFor({...STITCH_DEFAULTS,width:160,format:"paysage"})).toEqual({w:160,h:112});
  });
  it("recolore les confettis cernés mais conserve un œil isolé sur un fond vide",()=>{
    const raw=new Int16Array([4,4,4,4,7,4,4,4,4]);
    const result=cleanupCross(raw,3,3,"simple");
    expect(result.cross[4]).toBe(4);
    expect(result.changed).toBe(1);
    expect(raw[4]).toBe(7);
    const eye=cleanupCross(new Int16Array([-1,-1,-1,-1,7,-1,-1,-1,-1]),3,3,"simple");
    expect(eye.cross[4]).toBe(7);
    expect(eye.changed).toBe(0);
  });
  it("propose les réglages à gauche sans seconde fenêtre et déclenche une seule action",()=>{
    const generate=vi.fn(),update=vi.fn();
    const view=mount(<AtelierCreate compact prompt="un renard botanique" onPrompt={vi.fn()} onGenerate={generate}
      onImport={vi.fn()} onBlank={vi.fn()} onLibrary={vi.fn()} generation={{...STITCH_DEFAULTS,prompt:"un renard botanique"}} onGenerationChange={update}/>);
    expect(view.querySelector('select[aria-label="Largeur du patron"]')).toBeTruthy();
    expect(view.querySelector('select[aria-label="Nombre de fils"]')).toBeTruthy();
    const button=[...view.querySelectorAll("button")].find(x=>x.textContent?.includes("Générer dans la grille"));
    act(()=>button?.dispatchEvent(new MouseEvent("click",{bubbles:true})));
    expect(generate).toHaveBeenCalledTimes(1);
    const field=view.querySelector('select[aria-label="Nombre de fils"]') as HTMLSelectElement;
    act(()=>{field.value="8";field.dispatchEvent(new Event("change",{bubbles:true}))});
    expect(update).toHaveBeenCalledWith(expect.objectContaining({maxColors:8}));
  });
});