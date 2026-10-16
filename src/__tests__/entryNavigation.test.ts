import { describe, expect, it } from "vitest";
import { entryStudio, isStudioRoute } from "../lib/entryNavigation";

describe("POINTZERO — navigation publique non destructive",()=>{
 it("ouvre directement le Studio Édition sur le domaine racine",()=>{
  expect(entryStudio("","")).toBe("design");
  expect(entryStudio("?utm_source=share","")).toBe("design");
  expect(entryStudio("?page=manifest","")).toBe("manifest");
  expect(entryStudio("","","/pointzero")).toBe("manifest");
  expect(entryStudio("","","/atelier")).toBe("design");
  expect(entryStudio("","","/le-monde-aime")).toBe("aime-landing");
  expect(entryStudio("","","/univers")).toBe("universe-index");
  expect(entryStudio("","","/univers/mariage")).toBe("universe-detail");
  expect(entryStudio("","","/studios/game")).toBe("studio-detail");
  expect(entryStudio("","","/vision")).toBe("vision");
 });
 it("préserve les liens directs historiques et l'Atelier",()=>{
  expect(entryStudio("?site=le-monde-aime","")).toBe("aime-landing");
  expect(entryStudio("?page=atelier","")).toBe("design");
  expect(entryStudio("","#atelier")).toBe("design");
  expect(entryStudio("?studio=embroidery","")).toBe("embroidery");
  expect(entryStudio("?studio=mini-site","")).toBe("mini-site");
  expect(entryStudio("?studio=academy","")).toBe("academy");
  expect(entryStudio("?studio=ripplecircle","")).toBe("ripplecircle");
 });
 it("ne permet pas une navigation par route non reconnue ou par accès direct à l'administration du manifeste",()=>{
  expect(entryStudio("?studio=not-a-real-studio","")).toBe("design");
  expect(entryStudio("?studio=manifest-admin","")).toBe("design");
  expect(isStudioRoute("not-a-real-studio")).toBe(false);
 });
});