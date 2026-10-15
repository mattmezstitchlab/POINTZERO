import crypto from "node:crypto";

/**
 * Server-side owner-only image generation adapter.
 * Requires POLLINATIONS_API_KEY and POINTZERO_GENERATION_ACCESS_CODE in Vercel.
 * Do not expose the secret model key or access code in client JavaScript.
 *
 * Prototype hardening: per-instance throttling helps avoid accidents but is
 * not a global rate limit. Keep deployment protected until auth+quotas exist.
 */
export const config = { maxDuration: 60 };
const recent = new Map();
const clean = x=>typeof x==="string"?x.trim():"";
const fail=(res,status,message)=>res.status(status).json({error:message});
const constantTime=(input,expected)=>{
  const a=crypto.createHash("sha256").update(input).digest(),b=crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a,b);
};
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store, max-age=0");
  res.setHeader("X-Content-Type-Options","nosniff");
  if(req.method!=="POST")return fail(res,405,"Méthode non autorisée.");
  const key=process.env.POLLINATIONS_API_KEY;
  const access=process.env.POINTZERO_GENERATION_ACCESS_CODE;
  if(!key||!access)return fail(res,503,"Générateur distant non configuré. Ajouter les variables serveur POLLINATIONS_API_KEY et POINTZERO_GENERATION_ACCESS_CODE.");
  const authorized=clean(req.headers["x-pointzero-access-code"]);
  if(!authorized||!constantTime(authorized,access))return fail(res,401,"Code d’accès au générateur incorrect.");
  const bytes=Number(req.headers["content-length"]||0);
  if(bytes>5000)return fail(res,413,"Requête trop volumineuse.");
  const ip=String(req.headers["x-forwarded-for"]||req.socket?.remoteAddress||"anonymous").split(",")[0].trim().slice(0,80);
  const previous=recent.get(ip)||0,now=Date.now();
  if(now-previous<12_000)return fail(res,429,"Attendez avant de lancer une nouvelle illustration.");
  recent.set(ip,now);
  if(recent.size>2000)recent.clear();
  const prompt=clean(req.body?.prompt);
  const width=Number(req.body?.width),height=Number(req.body?.height),seed=Number(req.body?.seed);
  if(prompt.length<10||prompt.length>2500||!Number.isInteger(width)||width<256||width>1280||!Number.isInteger(height)||height<256||height>1280||!Number.isInteger(seed)||seed<0||seed>100000000) return fail(res,400,"Paramètres de génération incorrects.");
  const model=process.env.POINTZERO_IMAGE_MODEL||"flux";
  if(!/^[a-zA-Z0-9._/-]{1,90}$/.test(model))return fail(res,503,"Identifiant du modèle invalide.");
  const endpoint=new URL("https://gen.pollinations.ai/image/"+encodeURIComponent(prompt));
  endpoint.searchParams.set("model",model);
  endpoint.searchParams.set("width",String(width));
  endpoint.searchParams.set("height",String(height));
  endpoint.searchParams.set("seed",String(seed));
  try{
    const response=await fetch(endpoint,{
      headers:{Authorization:"Bearer "+key,Accept:"image/jpeg,image/png"},
      signal:AbortSignal.timeout(55000)
    });
    if(!response.ok)return fail(res,502,"Le fournisseur d'images est momentanément indisponible (HTTP "+response.status+").");
    const type=String(response.headers.get("content-type")||"");
    if(!/^image\/(png|jpeg|webp)/i.test(type))return fail(res,502,"Le fournisseur n’a pas renvoyé une image exploitable.");
    const max=9*1024*1024,reader=response.body?.getReader();
    if(!reader)return fail(res,502,"Réponse d’image incomplète.");
    let size=0;const chunks=[];
    for(;;){
      const {done,value}=await reader.read();if(done)break;
      size+=value.length;if(size>max){await reader.cancel();return fail(res,502,"Illustration trop volumineuse.");}
      chunks.push(Buffer.from(value));
    }
    res.setHeader("Content-Type",type);
    res.setHeader("Content-Length",String(size));
    return res.status(200).end(Buffer.concat(chunks));
  }catch(err){
    return fail(res,502,err?.name==="TimeoutError"?"Génération trop longue : réessayez.":"Connexion au fournisseur impossible.");
  }
}
