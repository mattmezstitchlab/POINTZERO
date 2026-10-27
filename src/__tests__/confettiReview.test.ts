import { describe, expect, it } from "vitest";
import { removeConfetti } from "../lib/quantize";
import { clonePattern, createPattern } from "../lib/pattern";
import { flossIndex } from "../lib/dmc";

describe("Nettoyage anti-confettis contrôlé", () => {
 it("peut analyser une copie sans altérer le patron original", () => {
   const p=createPattern("Chat à broder",3,3);
   const blue=flossIndex("321"),green=flossIndex("699");
   p.cross.fill(green);p.cross[4]=blue;
   const proposal=clonePattern(p);
   const changes=removeConfetti(proposal.cross,3,3);
   expect(changes).toBeGreaterThan(0);
   expect(p.cross[4]).toBe(blue);
   expect(proposal.cross[4]).toBe(green);
 });
 it("ne propose pas de modification pour un motif homogène", () => {
   const p=createPattern("Uniforme",4,4);p.cross.fill(flossIndex("321"));
   const next=clonePattern(p);
   expect(removeConfetti(next.cross,4,4)).toBe(0);
   expect([...next.cross]).toEqual([...p.cross]);
 });
});