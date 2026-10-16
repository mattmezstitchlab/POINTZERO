import WorkshopProjectPanel from "./WorkshopProjectPanel";
import { useState, type ReactNode } from 'react';
import type { StudioRoute } from '../lib/entryNavigation';
import './unified-workshop.css';

export const WORKSHOP_TOOLS = [
  {id:'design',label:'Composer',detail:'Mise en page et créations'},
  {id:'embroidery',label:'Broder',detail:'Patron, fils et réalisation'},
  {id:'programme',label:'Organiser',detail:'Programme et séances'},
] as const;
interface Props {
  active:StudioRoute;
  onChoose:(route:StudioRoute)=>void;
  projects:{id:string;name:string}[];
  projectId:string;
  onProject:(id:string)=>void;
  onExit:()=>void;
  pattern?:unknown;
  children:ReactNode;
}
/** One persistent shell; existing editors retain ownership of their saved documents. */
export default function UnifiedWorkshop({active,onChoose,projects,projectId,onProject,onExit,pattern,children}:Props){
  const [projectOpen,setProjectOpen]=useState(false);
  return <div className="unified-workshop">
    <header className="unified-workshop-header">
      <div className="unified-workshop-brand"><strong>POINT ZÉRO <span>/ Atelier commun</span></strong>
        <button type="button" onClick={onExit}>Accueil</button></div>
      <label className="unified-workshop-project">Projet commun
        <select value={projectId} onChange={e=>onProject(e.target.value)}>
          <option value="">Sans projet lié</option>
          {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <button type="button" onClick={()=>setProjectOpen(v=>!v)} aria-expanded={projectOpen}>Documents et export du projet</button>
      <nav aria-label="Outils de l’atelier commun">
        {WORKSHOP_TOOLS.map(tool=><button key={tool.id} type="button" aria-pressed={active===tool.id}
          title={tool.detail} onClick={()=>onChoose(tool.id)}>{tool.label}</button>)}
        {!WORKSHOP_TOOLS.some(tool=>tool.id===active)&&<span className="unified-workshop-current">Outil complémentaire</span>}
        <button type="button" onClick={()=>onChoose('one-space')}>Autres outils et projets</button>
      </nav>
      <p>Travail local · Rattachement explicite des créations, sans migration des originaux.</p>
    </header>
    {projectOpen&&<WorkshopProjectPanel key={projectId} project={projects.find(p=>p.id===projectId)??null} pattern={pattern} onClose={()=>setProjectOpen(false)}/>}
    <div className="unified-workshop-editor">{children}</div>
  </div>;
}
