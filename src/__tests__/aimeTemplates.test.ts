import {describe,expect,it} from "vitest";
import {createWeddingSiteTemplate} from "../lib/aimeTemplates";
import {interpolateAime,safeProjectDocument} from "../lib/aimeProjectDocument";

describe("AIME — modèle socle éditable et données partagées",()=>{
 it("crée une structure originale de pages et sections sans écraser le projet",()=>{
  let n=0;const doc=createWeddingSiteTemplate("prj-demo",()=>String(++n));
  expect(doc.pages).toHaveLength(2);
  expect(doc.pages.flatMap(p=>p.items)).toHaveLength(8);
  expect(doc.pages.flatMap(p=>p.items).every(e=>e.kind==="section")).toBe(true);
  expect(safeProjectDocument(doc,"prj-demo")).toBeTruthy();
  expect(safeProjectDocument(doc,"autre-projet")).toBeNull();
 });
 it("une valeur ME actualise toutes les sections sans réécrire leurs contenus",()=>{
  let n=0;const doc=createWeddingSiteTemplate("prj-2",()=>String(++n));
  const first=doc.pages[0].items[0];
  if(first.kind!=="section")throw new Error("L'en-tête doit être une section");
  expect(interpolateAime(first.title,doc.variables)).toBe("Camille & Gabriel");
  const newVariables={...doc.variables,couple:"Léa & Sam"};
  expect(interpolateAime(first.title,newVariables)).toBe("Léa & Sam");
  expect(first.title).toBe("{{couple}}");
  expect(safeProjectDocument({...doc,variables:newVariables},"prj-2")).toBeTruthy();
 });
 it("refuse les valeurs non conformes sans rendre de HTML actif",()=>{
  let n=0;const doc=createWeddingSiteTemplate("prj-3",()=>String(++n));
  expect(safeProjectDocument({...doc,variables:{"__proto__":"x",long:"x".repeat(301)}},"prj-3")).toBeNull();
  expect(interpolateAime("{{inconnue}}",doc.variables)).toBe("À renseigner");
 });
});
