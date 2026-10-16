/** First, intentionally small AIME project document. Does not touch POINTZERO studio records. */
export type AimeItem={id:string;kind:"text";text:string}|{id:string;kind:"section";title:string;text:string;layout:"hero"|"split"|"cards"|"simple"|"cta"};
export type AimePage={id:string;title:string;created:string;items:AimeItem[]};
export type AimeProjectDocument={version:1;projectId:string;pages:AimePage[];activePageId:string;variables?:Record<string,string>};
export function interpolateAime(text:string,variables:Record<string,string>={}):string{
 return text.replace(/\{\{([a-z][a-z0-9_]{0,31})\}\}/g,(_,key:string)=>variables[key]??"À renseigner");
}
const KEY="aime:project-document:v1:";
const idOK=(s:unknown)=>typeof s==="string"&&s.length>0&&s.length<=100;
const short=(v:unknown,n:number)=>typeof v==="string"&&v.length<=n;
export const projectDocumentKey=(projectId:string)=>KEY+projectId;
export function emptyProjectDocument(projectId:string):AimeProjectDocument{
 return {version:1,projectId,pages:[],activePageId:""};
}
export function safeProjectDocument(raw:unknown,projectId:string):AimeProjectDocument|null{
 if(!raw||typeof raw!=="object")return null;
 const x=raw as Partial<AimeProjectDocument>;
 if(x.version!==1||x.projectId!==projectId||!Array.isArray(x.pages)||x.pages.length>40||!short(x.activePageId,100))return null;
 if(x.variables!==undefined){
  if(!x.variables||typeof x.variables!=="object"||Array.isArray(x.variables)||Object.keys(x.variables).length>20)return null;
  for(const [key,value] of Object.entries(x.variables))if(!/^[a-z][a-z0-9_]{0,31}$/.test(key)||!short(value,300))return null;
 }
 const ids=new Set<string>();
 for(const page of x.pages){
  if(!page||!idOK(page.id)||ids.has(page.id)||!short(page.title,150)||!short(page.created,40)||!Array.isArray(page.items)||page.items.length>200)return null;
  ids.add(page.id);const children=new Set<string>();
  for(const item of page.items){
   if(!item||!idOK(item.id)||children.has(item.id)||!short(item.text,3000))return null;
   if(item.kind==="section"){
    if(!short(item.title,150)||!["hero","split","cards","simple","cta"].includes(item.layout))return null;
   }else if(item.kind!=="text")return null;
   children.add(item.id);
  }
 }
 if(x.activePageId!==""&&!ids.has(x.activePageId!))return null;
 return x as AimeProjectDocument;
}
export function readProjectDocument(projectId:string):{value:AimeProjectDocument;blocked:boolean}{
 const key=projectDocumentKey(projectId);
 try{
  const original=localStorage.getItem(key);
  if(original===null)return {value:emptyProjectDocument(projectId),blocked:false};
  const value=safeProjectDocument(JSON.parse(original),projectId);
  return value?{value,blocked:false}:{value:emptyProjectDocument(projectId),blocked:true};
 }catch{return {value:emptyProjectDocument(projectId),blocked:true};}
}
export function saveProjectDocument(next:AimeProjectDocument){
 if(!safeProjectDocument(next,next.projectId))throw Error("Document AIME invalide.");
 // Fail closed: invalid existing storage must never be silently overwritten.
 if(readProjectDocument(next.projectId).blocked)throw Error("Un document existant est illisible. Il a été conservé sans modification.");
 localStorage.setItem(projectDocumentKey(next.projectId),JSON.stringify(next));
}
