import {useState} from 'react';
import {availableWorkshopDocuments,readWorkshopLinks,setProjectLinks,workshopBundle,type DocumentLink,type WorkshopDocument} from '../lib/workshopProject';
import {saveStudioFile} from './StudioFrame';
interface Props {project:{id:string;name:string}|null;pattern:unknown;onClose:()=>void}
export default function WorkshopProjectPanel({project,pattern,onClose}:Props){
 const [links,setLinks]=useState<DocumentLink[]>([]),[documents,setDocuments]=useState<WorkshopDocument[]>([]),[message,setMessage]=useState(''),[ready,setReady]=useState(false);
 const refresh=()=>{try{
  const state=readWorkshopLinks();const docs=availableWorkshopDocuments(typeof pattern==='function'?pattern():pattern);
  setLinks(project?state.projects[project.id]??[]:[]);setDocuments(docs);setReady(true);setMessage('Inventaire relu. Aucun document déplacé.');
 }catch(e){setReady(false);setMessage(e instanceof Error?e.message:'Lecture impossible.');}};
 const update=(next:DocumentLink[])=>{if(!project)return;try{setProjectLinks(project.id,next);setLinks(next);setMessage('Liens enregistrés sur cet appareil.');}catch(e){setMessage(e instanceof Error?e.message:'Sauvegarde impossible.');}};
 return <section className="workshop-project-panel" aria-label="Documents du projet">
  <div><h2>Documents du projet {project?.name??'— choisissez un contexte'}</h2><button onClick={onClose}>Fermer</button></div>
  <p>Rattachez explicitement vos créations. Un lien ne copie ni ne modifie le document source. Le patron disponible est celui actuellement ouvert.</p>
  <button onClick={refresh} disabled={!project}>Lire les documents disponibles</button>
  {ready&&project&&<>
   <ul>{documents.map(doc=>{const linked=links.some(l=>l.kind===doc.kind&&l.id===doc.id);return <li key={doc.kind+doc.id}>
    <label><input type="checkbox" checked={linked} onChange={()=>update(linked?links.filter(l=>!(l.kind===doc.kind&&l.id===doc.id)):[...links,{kind:doc.kind,id:doc.id,name:doc.name}])}/>{doc.name} · {doc.kind}</label>
   </li>;})}</ul>
   {links.filter(l=>!documents.some(d=>d.kind===l.kind&&d.id===l.id)).map(l=><p key={l.kind+l.id}>{l.name} — source non ouverte ou indisponible. <button onClick={()=>update(links.filter(x=>x!==l))}>Retirer le lien</button></p>)}
   <button disabled={!links.length} onClick={()=>{try{
    if(!window.confirm('Exporter les contenus liés, y compris leurs éventuelles données personnelles, dans un fichier JSON local ?'))return;
    const latest=availableWorkshopDocuments(typeof pattern==='function'?pattern():pattern);
    const current=readWorkshopLinks().projects[project.id]??[];
    saveStudioFile('pointzero-projet.json',JSON.stringify(workshopBundle(project,current,latest),null,2));setMessage('Copie JSON exportée. Les exports spécialisés restent dans chaque outil.');
   }catch(e){setMessage(e instanceof Error?e.message:'Export impossible.');}}}>Exporter les documents liés (JSON)</button>
  </>}
  <p role="status">{message}</p>
  <p>Export instantané, sans synchronisation. Ce regroupement JSON ne remplace pas les exports PDF/SVG ni un import de projet complet.</p>
 </section>;
}
