/** Public AIME hierarchy with compatibility for pre-existing POINTZERO query links.
 * This module never reads or clears a user's saved projects.
 */
export const STUDIO_ROUTES=[
 "design","embroidery","photo","fashion","budget","programme","admin",
 "mini-site","pdf","generation","music","art-world","aime-landing",
 "music-production","accessibility","academy","one-space","causal",
 "legal","metamorphose","ripplecircle","game","manifest","manifest-admin",
 "aime-home","universe-index","universe-detail","studio-detail","vision","reference-dossier"
] as const;
export type StudioRoute=(typeof STUDIO_ROUTES)[number];
export function isStudioRoute(value:string|null):value is StudioRoute{
 return STUDIO_ROUTES.some(route=>route===value);
}
export function entryStudio(search:string,hash:string,pathname="/"):StudioRoute{
 const params=new URLSearchParams(search);
 // Historical external links take precedence and remain permanent.
 if(params.get("site")==="le-monde-aime")return "aime-landing";
 if(params.get("page")==="manifest")return "manifest";
 if(params.get("page")==="atelier"||hash==="#atelier")return "design";
 const path=decodeURI(pathname).replace(/\/+$/,"")||"/";
 if(path==="/") {
  const legacy=params.get("studio");
  return isStudioRoute(legacy)&&legacy!=="manifest-admin"?legacy:"aime-home";
 }
 if(path==="/pointzero")return "manifest";
 if(path==="/le-monde-aime")return "aime-landing";
 if(path==="/vision")return "vision";
 if(path==="/dossier")return "reference-dossier";
 if(path==="/univers")return "universe-index";
 if(/^\/univers\/[a-z0-9-]+$/.test(path))return "universe-detail";
 if(/^\/studios\/[a-z0-9-]+$/.test(path))return "studio-detail";
 if(path==="/atelier"){
  const chosen=params.get("studio");
  return isStudioRoute(chosen)&&!["manifest-admin","aime-home","universe-index","universe-detail","studio-detail","vision","reference-dossier","manifest","aime-landing"].includes(chosen)?chosen:"design";
 }
 return "aime-home";
}
export function publicPathFor(mode:StudioRoute){
 if(mode==="aime-home")return "/";
 if(mode==="manifest")return "/pointzero";
 if(mode==="aime-landing")return "/le-monde-aime";
 if(mode==="vision")return "/vision";
 if(mode==="reference-dossier")return "/dossier";
 if(mode==="universe-index")return "/univers";
 if(mode==="design")return "/atelier";
 if(mode==="manifest-admin")return "/pointzero"; // admin remains a stateful protected overlay, not an unguarded link
 return "/atelier?studio="+encodeURIComponent(mode);
}
