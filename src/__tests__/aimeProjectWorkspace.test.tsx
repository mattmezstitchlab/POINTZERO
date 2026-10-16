import {act} from "react";
import {createRoot,type Root} from "react-dom/client";
import {afterEach,beforeAll,describe,expect,it,vi} from "vitest";
import AimeProjectWorkspace from "../components/AimeProjectWorkspace";
import {newSpace,writeWorld} from "../lib/oneSpaceCore";
import {projectDocumentKey,readProjectDocument,emptyProjectDocument,saveProjectDocument} from "../lib/aimeProjectDocument";
beforeAll(()=>{(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true});
let node:HTMLDivElement|null=null,root:Root|null=null;
afterEach(async()=>{if(root)await act(async()=>root?.unmount());node?.remove();root=null;node=null;localStorage.clear()});
async function mount(projectId:string){
 node=document.createElement("div");document.body.append(node);root=createRoot(node);
 await act(async()=>root!.render(<AimeProjectWorkspace projectId={projectId} onBureau={vi.fn()}/>));
 return node;
}
async function click(el:Element|null|undefined){
 expect(el).toBeTruthy();
 await act(async()=>el!.dispatchEvent(new MouseEvent("click",{bubbles:true})));
}
describe("AIME — espace projet construit depuis le Bureau",()=>{
 it("ouvre vide, sans grille, sans moteur et sans écriture automatique",async()=>{
  const p=newSpace("personnel","Mon projet");
  writeWorld({version:1,spaces:[p],selectedSpaceId:p.id});
  const view=await mount(p.id);
  expect(view.querySelector('[aria-label="Atelier AIME — projet"]')).toBeTruthy();
  expect(view.querySelector('[aria-label="Espace de travail du projet"]')).toBeTruthy();
  expect(view.querySelector('[aria-label="Structure du projet"]')).toBeTruthy();
  expect(view.querySelector('[aria-label="Réglages contextuels"]')).toBeTruthy();
  expect(view.textContent).toContain("Projet vide");
  expect(view.textContent).not.toContain("POINTZERO");
  expect(view.textContent).not.toContain("Studios");
  expect(view.textContent).not.toContain("Broderie");
  expect(view.textContent).not.toContain("Grille universelle");
  expect(view.querySelector('[aria-label="Grille universelle de fragments"]')).toBeNull();
  expect(localStorage.getItem(projectDocumentKey(p.id))).toBeNull();
  expect(view.querySelector('[aria-label="Outils universels"]')).toBeTruthy();
  expect(view.querySelector('[aria-label="Capsule AI + ME"]')?.textContent).toContain("AI");
  expect(view.querySelector('[aria-label="Capsule AI + ME"]')?.textContent).toContain("ME");
  expect(view.querySelector('[aria-label="Capsule AI + ME"]')?.querySelector("svg")).toBeNull();
  expect(view.querySelector('button[aria-label="Déplacer la vue"]')).toBeTruthy();
  expect(view.querySelector('button[aria-label="Retirer un élément"]')).toBeTruthy();
  expect(view.querySelector('select[aria-label="Format de prévisualisation"]')).toBeTruthy();
  await click(view.querySelector('button[aria-label="Ouvrir le menu de création"]'));
  await click(view.querySelector('button[aria-label="Ajouter une page"]'));
  expect(view.querySelector('[aria-label="Page active"]')).toBeTruthy();
  expect(view.querySelector('[aria-label="Éléments de la page"]')).toBeTruthy();
  expect(readProjectDocument(p.id).value.pages).toHaveLength(1);
  await click(view.querySelector('button[aria-label="Ouvrir le menu de création"]'));
  await click(view.querySelector('button[aria-label="Ajouter du texte"]'));
  expect(readProjectDocument(p.id).value.pages[0].items).toHaveLength(1);
  expect(view.querySelector('[aria-label="Modifier le texte"]')).toBeTruthy();
  await click(view.querySelector('button[aria-label="Retirer un élément"]'));
  await click(view.querySelector('[aria-label="Page active"] button'));
  expect(readProjectDocument(p.id).value.pages[0].items).toHaveLength(1);
  expect(view.querySelector('[aria-label="Confirmer la suppression"]')).toBeTruthy();
  await click([...view.querySelectorAll('button')].find(x=>x.textContent==="Annuler"));
  expect(readProjectDocument(p.id).value.pages[0].items).toHaveLength(1);

 });
 it("ne modifie pas les anciennes données et protège le projet illisible",async()=>{
  const p=newSpace("professionnel","Client");
  const q=newSpace("personnel","Privé");
  writeWorld({version:1,spaces:[p,q],selectedSpaceId:p.id});
  localStorage.setItem("pointzero:design-current:v1","{format ancien conservé}");
  localStorage.setItem(projectDocumentKey(p.id),"{cassé");
  const view=await mount(p.id);
  expect(view.textContent).toContain("Document existant incompatible");
  await click(view.querySelector('button[aria-label="Ouvrir le menu de création"]'));
  await click(view.querySelector('button[aria-label="Ajouter une page"]'));
  expect(localStorage.getItem(projectDocumentKey(p.id))).toBe("{cassé");
  expect(localStorage.getItem("pointzero:design-current:v1")).toBe("{format ancien conservé}");
  const fresh=emptyProjectDocument(q.id);
  saveProjectDocument(fresh);
  expect(readProjectDocument(q.id).value.pages).toHaveLength(0);
 });
 it("ne recrée pas un projet absent via URL",async()=>{
  const view=await mount("unknown-id");
  expect(view.querySelector('[aria-label="Projet AIME indisponible"]')).toBeTruthy();
  expect(localStorage.getItem(projectDocumentKey("unknown-id"))).toBeNull();
 });
});
