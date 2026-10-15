import { FLOSS } from "./dmc";
import { removeConfetti } from "./quantize";
import { createPattern, ensurePalette, type Pattern, type Count } from "./pattern";
import { parseComposition, pollinationsUrl, type FormatId, type StyleId } from "./promptcraft";
import { loadRemoteImage, asyncRasterToCells } from "./convert";

/** Un formulaire bref : la complexité technique reste dans le panneau de droite. */
export interface StitchRequest {
  prompt: string;
  width: 60 | 80 | 120 | 160;
  maxColors: 8 | 12 | 20 | 30;
  detail: "simple" | "equilibre" | "precis";
  style: StyleId;
  format: FormatId;
  count: Count;
  seed: number;
}
export interface StitchResult {
  original: Pattern;
  cleaned: Pattern;
  changed: number;
  prompts: { user: string; generated: string };
}
const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
export const STITCH_DEFAULTS: StitchRequest = {
  prompt:"",width:80,maxColors:12,detail:"equilibre",style:"botanique",format:"carre",count:14,seed:1
};
const ratio: Record<FormatId,number> = {carre:1,portrait:1.4,paysage:0.7};
export function dimensionsFor(req: StitchRequest) {
  const w=clamp(req.width,40,160);
  return {w,h:clamp(Math.round(w*ratio[req.format]/2)*2,30,224)};
}
const STYLE_GUIDANCE:Record<StyleId,string>={
  reeliste:"faithful elegant illustrative realism, but simplified into distinct color regions",
  botanique:"botanical illustration with recognisable petals, leaves, clean contours",
  animalier:"recognisable animal silhouette, distinctive facial features, clear anatomy",
  portrait:"recognisable face, clear facial structure, subtle but limited shading",
  paysage:"recognisable landscape, readable horizon, simplified buildings and plants",
  geometrique:"bold geometric illustration, precise simple contours, flat colors",
  minimal:"minimal icon-like illustration, isolated single subject, large clean shapes"
};
const DETAIL_GUIDANCE={
  simple:"large uninterrupted color areas, very few fine details",
  equilibre:"balanced larger color areas, preserve the defining details",
  precis:"preserve important contours and distinguishing facial or botanical details without small noise"
};
export function stitchImagePrompt(req:StitchRequest):string {
  const user=req.prompt.trim().replace(/\s+/g," ").slice(0,300);
  const relation=parseComposition(user);
  const main=relation.main||user;
  const composition=relation.extra? `Include ${relation.extra} with ${main}; ${relation.relation}.`:"";
  return [
    "STRICT VISUAL BRIEF. Illustrate exactly this requested subject:",JSON.stringify(user)+".",
    "Main subject:",JSON.stringify(main)+".",composition,
    "Craft illustration for cross-stitch pattern conversion, not a photograph.",
    STYLE_GUIDANCE[req.style],DETAIL_GUIDANCE[req.detail]+".",
    `Limited cohesive palette of approximately ${req.maxColors} well-separated colors.`,
    "One centered, fully visible subject. Strong readable silhouette and closed colored shapes.",
    "Pure uniform off-white background, no shadows on the background, no busy scenery, no small scattered marks.",
    "Preserve the precise requested subject and its relationships, do not add unrelated animals, flowers or props.",
    "No words, labels, lettering, watermarks, hands, needles, hoops, stitch texture or pixel grid.",
    "Clean high-resolution digital illustration. Avoid photorealistic noise, grain, gradients and scattered tiny marks."
  ].filter(Boolean).join(" ");
}
export function cleanupCross(source:Int16Array,w:number,h:number,detail:StitchRequest["detail"]){
  const cells=source.slice();
  // L'algorithme existant supprime parfois un œil isolé lorsque ses voisins sont vides.
  // Nous ne touchons ici qu'aux points isolés entourés d'au moins deux cellules d'une même couleur.
  const rounds=detail==="simple"?2:1;
  let changed=0;
  for(let round=0;round<rounds;round++){
    const prev=cells.slice();
    let inRound=0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const pos=y*w+x,val=prev[pos];if(val<0)continue;
      const tally=new Map<number,number>();
      const adjacent:number[]=[];
      for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
        const nx=x+dx,ny=y+dy;if(nx<0||nx>=w||ny<0||ny>=h)continue;
        adjacent.push(prev[ny*w+nx]);
      }
      if(adjacent.includes(val))continue;
      for(const n of adjacent)if(n>=0)tally.set(n,(tally.get(n)||0)+1);
      let top=-1,count=0;
      for(const [n,k] of tally)if(k>count){top=n;count=k;}
      if(count>=2 && top!==val){cells[pos]=top;inRound++;}
    }
    changed+=inRound;if(!inRound)break;
  }
  return {cross:cells,changed};
}
function patternFromCross(req:StitchRequest,cross:Int16Array,w:number,h:number,name:string):Pattern{
  const p=createPattern(name,w,h,req.count,2);
  p.cross=cross.slice();
  for(const c of new Set(Array.from(cross).filter(v=>v>=0)))ensurePalette(p,c);
  p.provenance={kind:"image",source:"Illustration générée à partir d'une description via un service externe",author:"",license:"Création assistée par IA : vérifier les droits avant diffusion",personalOnly:false};
  p.notes=`Description originale : ${req.prompt.trim()}. Grille ${w} × ${h}, palette limitée à ${req.maxColors} fils. Image source produite par un service d'images externe, conversion et optimisation DMC locales. La fidélité du contenu généré doit être vérifiée.`;
  return p;
}
export async function createStitchPattern(req:StitchRequest,onStage?:(step:string)=>void):Promise<StitchResult>{
  if(req.prompt.trim().length<3)throw new Error("Décrivez le motif en quelques mots.");
  const {w,h}=dimensionsFor(req),text=stitchImagePrompt(req);
  onStage?.("Illustration du sujet…");
  const aspect=req.format==="carre"?[768,768]:req.format==="portrait"?[640,896]:[896,640];
  const url=pollinationsUrl(text,aspect[0],aspect[1],Math.max(0,Math.floor(req.seed)));
  const image=await loadRemoteImage(url,120000);
  onStage?.("Conversion vers les fils DMC…");
  // La palette est plafonnée avant le nettoyage. L'image ne devient jamais le patron affiché.
  const result=await asyncRasterToCells(image,w,h,{maxColors:req.maxColors,dropWhite:true,confetti:false,pixelArt:false});
  const original=patternFromCross(req,result.cross,w,h,req.prompt.trim().slice(0,60));
  onStage?.("Contrôle des points isolés…");
  const cleanedCross=cleanupCross(result.cross,w,h,req.detail);
  const cleaned=patternFromCross(req,cleanedCross.cross,w,h,original.name);
  cleaned.notes+=` Optimisation : ${cleanedCross.changed} points recolorés (sans supprimer les détails isolés sur fond vide).`;
  if(!cleaned.cross.some(v=>v>=0))throw Error("Aucun point brodable détecté dans cette illustration. Réessayez avec une variante.");
  return {original,cleaned,changed:cleanedCross.changed,prompts:{user:req.prompt,generated:text}};
}
