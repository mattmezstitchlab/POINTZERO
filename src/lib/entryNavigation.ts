/** POINTZERO public entry: the homepage is always the manifesto.
 * Previous workspaces remain in localStorage and can be resumed using direct links.
 */
export const STUDIO_ROUTES=[
 "design","embroidery","photo","fashion","budget","programme","admin",
 "mini-site","pdf","generation","music","art-world","aime-landing",
 "music-production","accessibility","academy","one-space","causal",
 "legal","metamorphose","ripplecircle","game","manifest","manifest-admin"
] as const;
export type StudioRoute=(typeof STUDIO_ROUTES)[number];
export function isStudioRoute(value:string|null):value is StudioRoute{
 return STUDIO_ROUTES.some(route=>route===value);
}
export function entryStudio(search:string,hash:string):StudioRoute{
 const params=new URLSearchParams(search);
 // Preserve the historical public LE MONDE AIME presentation deep link.
 if(params.get("site")==="le-monde-aime")return "aime-landing";
 if(params.get("page")==="manifest")return "manifest";
 if(params.get("page")==="atelier"||hash==="#atelier")return "design";
 const requested=params.get("studio");
 if(isStudioRoute(requested)&&requested!=="manifest-admin")return requested;
 return "manifest";
}
