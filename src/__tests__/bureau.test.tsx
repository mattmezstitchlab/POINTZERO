import {act} from "react";
import {createRoot,type Root} from "react-dom/client";
import {afterEach,beforeAll,describe,expect,it,vi} from "vitest";
import BureauStudio from "../components/BureauStudio";
import {readWorld} from "../lib/oneSpaceCore";
let host:HTMLDivElement|null=null,root:Root|null=null;
beforeAll(()=>{(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;});
afterEach(async()=>{
 if(root)await act(async()=>root!.unmount());
 root=null;host?.remove();host=null;localStorage.clear();
});
async function mount(onOpenProject=vi.fn()){
 host=document.createElement("div");document.body.append(host);root=createRoot(host);
 await act(async()=>root!.render(<BureauStudio onOpenProject={onOpenProject} onLegacyEditor={vi.fn()}/>));
 return {host,onOpenProject};
}
async function click(el:Element|null){
 expect(el).toBeTruthy();
 await act(async()=>el!.dispatchEvent(new MouseEvent("click",{bubbles:true})));
}
describe("POINTZERO — Bureau des vrais projets",()=>{
 it("n'ajoute aucun modèle et ne crée rien sans confirmation",async()=>{
  const {host:view}=await mount();
  expect(view.querySelector('[aria-label="Bureau AIME"]')).toBeTruthy();
  expect(view.textContent).not.toContain("Fleur rose");
  expect(view.querySelector("header")?.textContent).toContain("AIME");
  expect(readWorld().spaces).toHaveLength(0);
  await click([...view.querySelectorAll("button")].find(b=>b.textContent?.includes("Nouveau projet"))??null);
  expect(view.querySelector('form[aria-label="Créer un nouveau projet"]')).toBeTruthy();
  expect(localStorage.getItem("pointzero:one-space:v1")).toBeNull();
  await click([...view.querySelectorAll("button")].find(b=>b.textContent?.trim()==="Annuler")??null);
  expect(readWorld().spaces).toHaveLength(0);
 });
 it("crée le Dossier comme projet canonique puis l'ouvre par son identifiant",async()=>{
  const onOpenProject=vi.fn(),{host:view}=await mount(onOpenProject);
  await click([...view.querySelectorAll("button")].find(b=>b.textContent?.includes("Nouveau projet"))??null);
  const field=view.querySelector<HTMLInputElement>('input[placeholder="Mon projet"]')!;
  const native=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!;
  await act(async()=>{native.call(field,"Mon site accessible");field.dispatchEvent(new Event("input",{bubbles:true}));field.dispatchEvent(new Event("change",{bubbles:true}));});
  const form=view.querySelector("form")!;
  await act(async()=>form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
  const world=readWorld();
  expect(world.spaces).toHaveLength(1);
  expect(world.spaces[0].title).toBe("Mon site accessible");
  expect(world.spaces[0].dossier?.intent).toBe("");
  expect(world.selectedSpaceId).toBe(world.spaces[0].id);
  expect(onOpenProject).toHaveBeenCalledWith(world.spaces[0].id);
  expect(localStorage.getItem("pointzero:design-current:v1")).toBeNull();
 });
});
