import {useEffect,useMemo,useState,type FormEvent} from "react";
import {Archive,ArrowRight,FolderOpen,Grid2X2,Layers3,Plus,Search,Undo2} from "lucide-react";
import {readWorld,writeWorld,newSpace,type SpaceKind,type WorldSpace} from "../lib/oneSpaceCore";
import {AIME_WORLD_CHANGED,writableWorld} from "../lib/universalDossier";
import {emptyUniversalMeta} from "../lib/dossierSchema";

/** POINTZERO's actual home: a project browser, not another promotional landing. */
type Props={onOpenProject:(id:string)=>void;onLegacyEditor:()=>void};
const ARCHIVE_KEY="pointzero:bureau-archived:v1";
const KINDS:{id:SpaceKind;label:string}[]=[
 {id:"personnel",label:"Personnel"},{id:"professionnel",label:"Professionnel"},
 {id:"mariage",label:"Mariage"},{id:"association",label:"Association"},{id:"famille",label:"Famille"}
];
function readArchive():string[]{
 try{const data=JSON.parse(localStorage.getItem(ARCHIVE_KEY)??"[]");
  return Array.isArray(data)?data.filter((x):x is string=>typeof x==="string"&&x.length<=100).slice(0,30):[];
 }catch{return [];}
}
function hasLegacyDocuments(){try{return !!localStorage.getItem("pointzero:design-current:v1")||
  !!localStorage.getItem("pointzero:design-drafts:v1")}catch{return false}}
export default function BureauStudio({onOpenProject,onLegacyEditor}:Props){
 const [world,setWorld]=useState(readWorld);
 const [archived,setArchived]=useState(readArchive);
 const [view,setView]=useState<"all"|"archive">("all");
 const [query,setQuery]=useState("");
 const [showCreate,setShowCreate]=useState(false);
 const [name,setName]=useState("");
 const [kind,setKind]=useState<SpaceKind>("personnel");
 const [error,setError]=useState("");
 const [legacy,setLegacy]=useState(hasLegacyDocuments);
 useEffect(()=>{
  const refresh=()=>{setWorld(readWorld());setLegacy(hasLegacyDocuments());};
  window.addEventListener(AIME_WORLD_CHANGED,refresh);window.addEventListener("storage",refresh);
  return()=>{window.removeEventListener(AIME_WORLD_CHANGED,refresh);window.removeEventListener("storage",refresh);};
 },[]);
 const projects=useMemo(()=>world.spaces.filter(p=>{
  const inArchive=archived.includes(p.id);
  return (view==="archive"?inArchive:!inArchive)&&
   (p.title+" "+p.description).toLocaleLowerCase("fr").includes(query.trim().toLocaleLowerCase("fr"));
 }).sort((a,b)=>b.created.localeCompare(a.created)),[world,archived,view,query]);
 function openProject(project:WorldSpace){
  try{
   const current=writableWorld();
   if(!current.spaces.some(p=>p.id===project.id))throw Error("Projet indisponible sur cet appareil.");
   if(current.selectedSpaceId!==project.id)writeWorld({...current,selectedSpaceId:project.id});
   window.dispatchEvent(new Event(AIME_WORLD_CHANGED));setError("");
   onOpenProject(project.id);
  }catch(e){setError(e instanceof Error?e.message:"Impossible d'ouvrir ce projet.");}
 }
 function create(e:FormEvent){
  e.preventDefault();
  const title=name.trim().slice(0,150);
  if(!title){setError("Donnez un nom au projet.");return}
  try{
   const current=writableWorld();
   if(current.spaces.length>=30)throw Error("Limite de 30 projets locaux atteinte. Exportez vos projets avant d'en créer d'autres.");
   const project=newSpace(kind,title);
   // This is the real Dossier identity; no fictitious intention or template.
   project.dossier=emptyUniversalMeta("",kind);
   writeWorld({...current,spaces:[...current.spaces,project],selectedSpaceId:project.id});
   window.dispatchEvent(new Event(AIME_WORLD_CHANGED));
   setShowCreate(false);setName("");setError("");onOpenProject(project.id);
  }catch(err){setError(err instanceof Error?err.message:"Impossible de créer le projet.");}
 }
 function toggleArchive(id:string){
  try{
   const next=archived.includes(id)?archived.filter(v=>v!==id):[...archived,id];
   localStorage.setItem(ARCHIVE_KEY,JSON.stringify(next));setArchived(next);setError("");
  }catch{setError("Archivage indisponible. Aucun projet n'a été supprimé.");}
 }
 return <div className="fixed inset-0 flex h-[100dvh] flex-col overflow-hidden bg-[#111113] font-sans text-[#ececee]" aria-label="Bureau POINTZERO">
  <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-white/10 bg-[#0c0c0e] px-5">
   <div className="flex items-center gap-3 text-xs"><span className="text-lg font-bold">×</span><strong>POINTZERO</strong><span className="text-white/35">/</span><span className="text-white/60">Bureau</span></div>
   <span className="text-[11px] text-white/45">Projets locaux · aucune publication automatique</span>
  </header>
  <div className="flex min-h-0 flex-1">
   <aside className="flex w-[210px] shrink-0 flex-col border-r border-white/10 bg-[#101012] p-3 max-sm:w-[152px]" aria-label="Navigation du Bureau">
    <div className="mb-5 rounded-[5px] border border-white/10 bg-[#1b1b1e] p-3 text-xs font-semibold">Mon espace de travail</div>
    <label className="mb-5 flex items-center gap-2 rounded-[5px] bg-[#222225] px-2 py-2 text-white/50"><Search size={14}/><input aria-label="Rechercher un projet" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher…" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/35"/></label>
    <p className="mb-2 px-2 text-[11px] font-semibold text-white/55">Projets</p>
    <button className={"mb-1 flex min-h-10 items-center gap-2 rounded-[5px] px-3 text-left text-xs "+(view==="all"?"bg-[#28282b] text-white":"text-white/55 hover:bg-white/10")} onClick={()=>setView("all")} aria-pressed={view==="all"}><Grid2X2 size={15}/> Tous</button>
    <button className={"mb-1 flex min-h-10 items-center gap-2 rounded-[5px] px-3 text-left text-xs "+(view==="archive"?"bg-[#28282b] text-white":"text-white/55 hover:bg-white/10")} onClick={()=>setView("archive")} aria-pressed={view==="archive"}><Archive size={15}/> Archive</button>
    <div className="mt-auto border-t border-white/10 pt-3">{legacy&&<button className="flex min-h-10 w-full items-center gap-2 rounded-[5px] px-2 text-left text-[11px] text-white/70 hover:bg-white/10" onClick={onLegacyEditor}><FolderOpen size={14}/> Anciennes créations</button>}
    <p className="px-2 pt-3 text-[10px] leading-relaxed text-white/35">Les projets restent sur cet appareil. Exportez-les pour les sauvegarder.</p></div>
   </aside>
   <main className="min-w-0 flex-1 overflow-y-auto px-5 py-9 sm:px-10 lg:px-14" aria-label="Liste des projets POINTZERO">
    <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
     <div><p className="mb-2 text-[10px] uppercase tracking-[.16em] text-white/40">POINTZERO / BUREAU</p><h1 className="text-2xl font-semibold tracking-tight">{view==="archive"?"Archive":"Tous les projets"}</h1></div>
     <button type="button" onClick={()=>{setShowCreate(true);setError("");}} className="inline-flex min-h-10 items-center gap-2 rounded-[5px] bg-[#159bff] px-4 text-xs font-semibold text-white hover:bg-[#3dadff]"><Plus size={16}/> Nouveau projet</button>
    </div>
    {error&&<p role="alert" className="mb-5 rounded-[5px] border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</p>}
    {showCreate&&<form onSubmit={create} className="mb-8 max-w-[650px] rounded-[7px] border border-white/15 bg-[#1b1b1d] p-5" aria-label="Créer un nouveau projet">
     <h2 className="mb-4 text-sm font-semibold">Nouveau projet</h2>
     <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
      <label className="text-[11px] text-white/60">Nom du projet<input autoFocus maxLength={150} value={name} onChange={e=>setName(e.target.value)} placeholder="Mon projet" className="mt-2 min-h-10 w-full rounded-[5px] border border-white/20 bg-[#27272a] px-3 text-sm text-white outline-none focus:border-white/70"/></label>
      <label className="text-[11px] text-white/60">Contexte<select value={kind} onChange={e=>setKind(e.target.value as SpaceKind)} className="mt-2 min-h-10 w-full rounded-[5px] border border-white/20 bg-[#27272a] px-3 text-sm text-white">{KINDS.map(t=><option value={t.id} key={t.id}>{t.label}</option>)}</select></label>
     </div>
     <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setShowCreate(false)} className="min-h-9 rounded-[5px] px-4 text-xs text-white/65 hover:bg-white/10">Annuler</button><button type="submit" disabled={!name.trim()} className="min-h-9 rounded-[5px] bg-white px-4 text-xs font-semibold text-black disabled:opacity-40">Créer et ouvrir <ArrowRight size={14} className="ml-1 inline"/></button></div>
    </form>}
    {projects.length?<div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-x-6 gap-y-8">
     {projects.map(project=><article key={project.id} className="group min-w-0">
      <button type="button" onClick={()=>openProject(project)} aria-label={"Ouvrir le projet "+project.title} className="flex h-[215px] w-full flex-col items-center justify-center gap-4 rounded-[7px] border border-white/10 bg-[#1c1c1e] transition-colors hover:border-white/30 hover:bg-[#222225] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#159bff]">
       <Layers3 size={29} className="text-white/25"/><span className="max-w-[85%] truncate text-xs text-white/40">{project.kind}</span>
      </button>
      <div className="mt-3 flex items-start justify-between gap-1">
       <div className="min-w-0"><h2 className="truncate text-[13px] font-medium">{project.title||"Sans titre"}</h2><p className="mt-1 text-[11px] text-white/45">{new Date(project.created).toLocaleDateString("fr-FR",{year:"numeric",month:"short",day:"numeric"})}</p></div>
       <button type="button" aria-label={(archived.includes(project.id)?"Restaurer":"Archiver")+" le projet "+project.title} title={archived.includes(project.id)?"Restaurer":"Archiver"} onClick={()=>toggleArchive(project.id)} className="rounded-[4px] p-1.5 text-white/40 hover:bg-white/10 hover:text-white">{archived.includes(project.id)?<Undo2 size={15}/>:<Archive size={15}/>}</button>
      </div>
     </article>)}
    </div>:<div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-[7px] border border-dashed border-white/10 text-center">
     {view==="archive"?<Archive size={25} className="text-white/30"/>:<FolderOpen size={25} className="text-white/30"/>}
     <p className="text-sm text-white/65">{query?"Aucun projet correspondant.":view==="archive"?"Aucun projet archivé.":"Votre Bureau est prêt."}</p>
     {!query&&view==="all"&&<p className="max-w-[320px] text-xs leading-relaxed text-white/40">Créez un projet pour ouvrir l'Atelier. Aucun modèle ni fleur ne sera ajouté.</p>}
    </div>}
   </main>
  </div>
 </div>;
}
