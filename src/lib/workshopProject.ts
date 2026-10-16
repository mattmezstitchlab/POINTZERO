import {safeDesign} from './designStudio';
import {fromObject} from './pattern';
import {safeProgrammeStore,PROGRAMME_STORAGE} from './programmeCore';
import {writeStoredJSON} from './storageSafety';
export const WORKSHOP_PROJECT_KEY='pointzero:workshop-links:v1';
export type DocumentKind='design'|'embroidery'|'programme';
export interface DocumentLink {kind:DocumentKind;id:string;name:string}
export interface WorkshopLinks {version:1;projects:Record<string,DocumentLink[]>}
export function safeWorkshopLinks(value:unknown):WorkshopLinks|null{
 if(!value||typeof value!=='object')return null;
 const v=value as WorkshopLinks;
 if(v.version!==1||!v.projects||typeof v.projects!=='object'||Array.isArray(v.projects)||Object.keys(v.projects).length>100)return null;
 for(const [id,links] of Object.entries(v.projects)){
  if(!id||id.length>120||['__proto__','constructor','prototype'].includes(id)||!Array.isArray(links)||links.length>300)return null;
  const seen=new Set<string>();
  for(const link of links){
   if(!link||!['design','embroidery','programme'].includes(link.kind)||typeof link.id!=='string'||!link.id||link.id.length>120||typeof link.name!=='string'||link.name.length>180)return null;
   const key=link.kind+':'+link.id;if(seen.has(key))return null;seen.add(key);
  }
 }
 return v;
}
export function readWorkshopLinks():WorkshopLinks{
 const raw=localStorage.getItem(WORKSHOP_PROJECT_KEY);
 if(raw===null)return {version:1,projects:{}};
 const value=safeWorkshopLinks(JSON.parse(raw));
 if(!value)throw Error('Liens existants illisibles : aucune modification effectuée.');
 return value;
}
export function setProjectLinks(projectId:string,links:DocumentLink[]){
 const state=readWorkshopLinks();
 const next={...state,projects:{...state.projects,[projectId]:links}};
 writeStoredJSON(WORKSHOP_PROJECT_KEY,JSON.stringify(next),safeWorkshopLinks);
}
export interface WorkshopDocument extends DocumentLink {data:unknown}
/** Read-only inventory: never replaces an editor document or repairs its storage. */
export function availableWorkshopDocuments(pattern:unknown):WorkshopDocument[]{
 const docs:WorkshopDocument[]=[];
 const addDesign=(raw:unknown)=>{const d=safeDesign(raw);if(d&&!docs.some(x=>x.kind==='design'&&x.id===d.id))docs.push({kind:'design',id:d.id,name:d.name,data:d});};
 const current=localStorage.getItem('pointzero:design-current:v1');
 if(current!==null){const parsed=JSON.parse(current);if(!safeDesign(parsed))throw Error('Design courant illisible.');addDesign(parsed);}
 const drafts=localStorage.getItem('pointzero:design-drafts:v1');
 if(drafts!==null){const parsed:unknown=JSON.parse(drafts);if(!Array.isArray(parsed)||!parsed.every(x=>safeDesign(x)))throw Error('Brouillons design illisibles.');parsed.forEach(addDesign);}
 const p=fromObject(pattern);if(p?.id)docs.push({kind:'embroidery',id:p.id,name:p.name,data:pattern});
 const raw=localStorage.getItem(PROGRAMME_STORAGE);
 if(raw!==null){const store=safeProgrammeStore(JSON.parse(raw));if(!store)throw Error('Programmes illisibles.');for(const p of store.programmes)docs.push({kind:'programme',id:p.id,name:p.title,data:p});}
 return docs;
}
export function workshopBundle(project:{id:string;name:string},links:DocumentLink[],documents:WorkshopDocument[]){
 const resolved=links.map(link=>{
  const doc=documents.find(d=>d.kind===link.kind&&d.id===link.id);
  if(!doc)throw Error('Document indisponible : '+link.name+'. Retirez son lien ou ouvrez-le dans son outil.');
  return doc;
 });
 return {version:1,format:'pointzero-workshop-bundle',exportedAt:new Date().toISOString(),project,documents:resolved};
}
