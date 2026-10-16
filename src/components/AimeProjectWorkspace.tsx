import {useEffect,useRef,useState,type PointerEvent as ReactPointerEvent} from "react";
import {ArrowLeft,Download,Eraser,FileText,FolderOpen,Hand,MousePointer2,Type,X,PanelLeft,PanelRight} from "lucide-react";
import {ids,readWorld,writeWorld,type WorldSpace} from "../lib/oneSpaceCore";
import {AIME_WORLD_CHANGED,writableWorld} from "../lib/universalDossier";
import {readProjectDocument,saveProjectDocument,type AimeProjectDocument,type AimePage} from "../lib/aimeProjectDocument";

type Props={projectId:string;onBureau:()=>void};
const surface="rounded-[5px] border border-white/15 bg-[#242427] px-3 py-2 text-[12px] text-white outline-none focus:border-white/70";
const quiet="inline-flex min-h-9 items-center gap-2 rounded-[5px] px-3 text-xs text-white/75 hover:bg-white/10";
const action="inline-flex min-h-9 items-center gap-2 rounded-[5px] border border-white/15 px-3 text-xs text-white/85 hover:bg-white/10";
function downloadJSON(name:string,content:string){
 const url=URL.createObjectURL(new Blob([content],{type:"application/json"}));
 try{
  const link=document.createElement("a");link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
 }finally{window.setTimeout(()=>URL.revokeObjectURL(url),1000)}
}
/** Clean project shell built from Bureau visual language. No legacy Studio or grid is mounted here. */
export default function AimeProjectWorkspace({projectId,onBureau}:Props){
 const [project,setProject]=useState<WorldSpace|null>(()=>readWorld().spaces.find(s=>s.id===projectId)??null);
 const [initial]=useState(()=>readProjectDocument(projectId));
 const [doc,setDoc]=useState<AimeProjectDocument>(initial.value);
 const [blocked]=useState(initial.blocked);
 const [selectedItem,setSelectedItem]=useState<string|null>(null);
 const [inspect,setInspect]=useState<"project"|"page"|"item">("project");
 const [leftVisible,setLeftVisible]=useState(false);
 const [rightVisible,setRightVisible]=useState(false);
 const [notice,setNotice]=useState("");
 const [tool,setTool]=useState<"select"|"hand"|"erase">("select");
 const [addOpen,setAddOpen]=useState(false);
 const [pendingRemove,setPendingRemove]=useState(false);
 const [frame,setFrame]=useState<"Auto"|"Ordinateur"|"Tablette"|"Mobile">("Auto");
 const [zoom,setZoom]=useState(100);
 const viewport=useRef<HTMLElement|null>(null);
 const panOrigin=useRef<{x:number;y:number;scrollLeft:number;scrollTop:number}|null>(null);
 const page=doc.pages.find(p=>p.id===doc.activePageId)??null;
 const item=page?.items.find(v=>v.id===selectedItem)??null;
 useEffect(()=>{
  const update=()=>setProject(readWorld().spaces.find(s=>s.id===projectId)??null);
  window.addEventListener(AIME_WORLD_CHANGED,update);window.addEventListener("storage",update);
  return()=>{window.removeEventListener(AIME_WORLD_CHANGED,update);window.removeEventListener("storage",update);};
 },[projectId]);
 function commit(next:AimeProjectDocument){
  if(blocked){setNotice("Document incompatible conservé : exportez une sauvegarde avant de continuer.");return;}
  try{saveProjectDocument(next);setDoc(next);setNotice("");}
  catch(error){setNotice(error instanceof Error?error.message:"Modification non enregistrée.");}
 }
 function updateProject(change:Partial<Pick<WorldSpace,"title"|"description">>){
  try{
   const world=writableWorld();
   if(!world.spaces.some(s=>s.id===projectId))throw Error("Projet introuvable.");
   writeWorld({...world,spaces:world.spaces.map(s=>s.id===projectId?{...s,...change}:s)});
   setProject(p=>p?{...p,...change}:p);
   window.dispatchEvent(new Event(AIME_WORLD_CHANGED));setNotice("");
  }catch(error){setNotice(error instanceof Error?error.message:"Impossible de modifier le projet.");}
 }
 function addPage(){
  if(blocked)return;
  if(doc.pages.length>=40){setNotice("Limite de 40 pages atteinte.");return;}
  const id=ids(),created=new Date().toISOString();
  const createdPage:AimePage={id,title:"Page "+(doc.pages.length+1),created,items:[]};
  commit({...doc,pages:[...doc.pages,createdPage],activePageId:id});
  setSelectedItem(null);setInspect("page");setLeftVisible(false);setAddOpen(false);
 }
 function setPage(id:string){
  if(!doc.pages.some(p=>p.id===id))return;
  commit({...doc,activePageId:id});setSelectedItem(null);setPendingRemove(false);setInspect("page");setLeftVisible(false);
 }
 function renamePage(title:string){
  if(!page)return;
  commit({...doc,pages:doc.pages.map(p=>p.id===page.id?{...p,title:title.slice(0,150)}:p)});
 }
 function addText(){
  if(!page||blocked)return;
  if(page.items.length>=200){setNotice("Limite d'éléments atteinte.");return;}
  const id=ids();
  commit({...doc,pages:doc.pages.map(p=>p.id===page.id?{...p,items:[...p.items,{id,kind:"text",text:"Votre texte"}]}:p)});
  setSelectedItem(id);setPendingRemove(false);setInspect("item");setLeftVisible(false);setAddOpen(false);
 }
 function changeText(text:string){
  if(!page||!item)return;
  commit({...doc,pages:doc.pages.map(p=>p.id===page.id?{...p,items:p.items.map(e=>e.id===item.id?{...e,text:text.slice(0,3000)}:e)}:p)});
 }
 function removeText(){
  if(!page||!item)return;
  commit({...doc,pages:doc.pages.map(p=>p.id===page.id?{...p,items:p.items.filter(e=>e.id!==item.id)}:p)});
  setSelectedItem(null);setPendingRemove(false);setInspect("page");
 }
 function chooseItem(id:string){
  if(tool==="hand")return;
  setSelectedItem(id);setInspect("item");setRightVisible(true);
  setPendingRemove(tool==="erase");setLeftVisible(false);
 }
 function onPanStart(e:ReactPointerEvent<HTMLElement>){
  if(tool!=="hand"||!viewport.current||e.button!==0)return;
  panOrigin.current={x:e.clientX,y:e.clientY,scrollLeft:viewport.current.scrollLeft,scrollTop:viewport.current.scrollTop};
  e.currentTarget.setPointerCapture(e.pointerId);
 }
 function onPanMove(e:ReactPointerEvent<HTMLElement>){
  const from=panOrigin.current,view=viewport.current;
  if(!from||!view)return;
  view.scrollLeft=from.scrollLeft-(e.clientX-from.x);
  view.scrollTop=from.scrollTop-(e.clientY-from.y);
 }
 function onPanEnd(){panOrigin.current=null;}
 function changeTool(next:"select"|"hand"|"erase"){
  setTool(next);setAddOpen(false);setPendingRemove(false);
 }
 function exportPages(){
  try{downloadJSON("aime-pages-"+projectId+".json",JSON.stringify({projectId,projectTitle:project?.title??"",document:doc},null,2));setNotice("");}
  catch{setNotice("Export impossible dans ce navigateur.");}
 }
 if(!project)return <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#111113] text-white" aria-label="Projet AIME indisponible">
  <h1 className="text-lg font-semibold">Projet introuvable</h1>
  <p className="max-w-sm text-center text-sm text-white/55">Ce dossier n'existe pas sur cet appareil. Aucune nouvelle donnée n'a été créée.</p>
  <button type="button" onClick={onBureau} className={action}>Retour au Bureau</button>
 </div>;
 return <div className="fixed inset-0 flex h-[100dvh] flex-col overflow-hidden bg-[#111113] text-[#efeff1]" aria-label="Atelier AIME — projet">
  <header className="z-30 flex h-[54px] shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#0d0d0f] px-3 sm:px-5">
   <div className="flex min-w-0 items-center gap-2 sm:gap-3">
    <strong className="shrink-0 text-[13px] tracking-[.04em]">AIME</strong><span className="text-white/30">/</span>
    <button type="button" aria-label="Retour au Bureau" onClick={onBureau} className={quiet+" !px-1.5"}><ArrowLeft size={14}/><span className="hidden sm:inline">Bureau</span></button>
    <span className="hidden text-white/30 sm:inline">/</span>
    <button type="button" onClick={()=>{setInspect("project");setRightVisible(true);}} className="min-w-0 truncate rounded-[4px] px-1.5 py-2 text-left text-xs font-medium hover:bg-white/10" title="Informations du projet">{project.title}</button>
   </div>
   <div className="flex shrink-0 items-center gap-1 sm:gap-2">
    <button type="button" aria-label="Afficher la structure" onClick={()=>setLeftVisible(v=>!v)} className={quiet+" lg:hidden"}><PanelLeft size={17}/></button>
    <button type="button" aria-label="Afficher les réglages" onClick={()=>setRightVisible(v=>!v)} className={quiet+" xl:hidden"}><PanelRight size={17}/></button>
    {doc.pages.length>0&&<button type="button" onClick={exportPages} className={action}><Download size={15}/><span className="hidden sm:inline">Exporter les pages</span></button>}
   </div>
  </header>
  <div className="relative flex min-h-0 flex-1">
   {leftVisible&&<button type="button" aria-label="Fermer la structure" onClick={()=>setLeftVisible(false)} className="absolute inset-0 z-10 bg-black/50 lg:hidden"/>}
   <aside aria-label="Structure du projet" className={"absolute inset-y-0 left-0 z-20 flex w-[246px] shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-[#101012] p-3 transition-transform lg:relative lg:translate-x-0 "+(leftVisible?"translate-x-0":"-translate-x-full")}>
    <div className="mb-5 flex items-center justify-between px-2"><h2 className="text-xs font-semibold">Pages</h2><span className="text-[10px] text-white/35">{doc.pages.length}</span></div>
    <nav aria-label="Pages du projet" className="grid gap-1">
     {doc.pages.map((p,i)=><button type="button" key={p.id} aria-label={"Ouvrir la page "+p.title} aria-current={page?.id===p.id?"page":undefined} onClick={()=>setPage(p.id)} className={"flex min-h-10 items-center gap-2 rounded-[5px] px-3 text-left text-xs "+(page?.id===p.id?"bg-[#2b2b2e] text-white":"text-white/60 hover:bg-white/10")}>
       <FileText size={14}/><span className="min-w-0 flex-1 truncate">{p.title||"Sans titre"}</span><span className="text-white/30">{i+1}</span>
     </button>)}
    </nav>
    {!doc.pages.length&&<p className="px-2 py-3 text-[11px] leading-relaxed text-white/40">Aucune page pour l'instant.</p>}
    {page&&<section className="mt-7 border-t border-white/10 pt-4" aria-label="Éléments de la page">
     <div className="mb-3 flex items-center justify-between px-2"><h2 className="text-xs font-semibold">Éléments</h2><span className="text-[10px] text-white/35">{page.items.length}</span></div>
     {page.items.map((element,i)=><button type="button" key={element.id} aria-pressed={selectedItem===element.id} onClick={()=>chooseItem(element.id)} className={"mb-1 flex min-h-10 w-full items-center gap-2 rounded-[5px] px-3 text-left text-xs "+(selectedItem===element.id?"bg-white/15":"text-white/60 hover:bg-white/10")}><Type size={14}/><span className="min-w-0 flex-1 truncate">{element.text.split("\n")[0]||"Texte vide"}</span><span className="text-white/30">{i+1}</span></button>)}
     {!page.items.length&&<p className="px-2 text-[11px] text-white/40">Aucun élément.</p>}
    </section>}
    <div className="mt-auto border-t border-white/10 px-2 pt-4 text-[10px] leading-relaxed text-white/40">Ce projet est enregistré sur cet appareil. Les anciens fichiers restent indépendants.</div>
   </aside>
   <div className="flex min-w-0 flex-1">
    <nav aria-label="Outils universels" className="flex w-[45px] shrink-0 flex-col items-center gap-2 border-r border-white/10 bg-[#18181a] px-1 py-3">
     {([{id:"select",label:"Sélectionner",icon:<MousePointer2 size={17}/>},{id:"hand",label:"Déplacer la vue",icon:<Hand size={17}/>},{id:"erase",label:"Retirer un élément",icon:<Eraser size={17}/>} ] as const).map(t=><button key={t.id} type="button" title={t.label} aria-label={t.label} aria-pressed={tool===t.id} onClick={()=>changeTool(t.id)} className={"flex size-9 items-center justify-center rounded-[5px] "+(tool===t.id?"bg-[#f2f2f3] text-[#111113]":"text-white/60 hover:bg-white/10 hover:text-white")}>{t.icon}</button>)}
    </nav>
    <div className="flex min-w-0 flex-1 flex-col">
     <div className="flex min-h-[43px] shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#18181a] px-3">
      <label className="flex items-center gap-2 text-[11px] text-white/65">Aperçu
       <select aria-label="Format de prévisualisation" value={frame} onChange={e=>setFrame(e.target.value as typeof frame)} className="rounded-[4px] bg-[#252528] px-2 py-1.5 text-[11px] text-white outline-none focus:ring-1 focus:ring-white/60"><option>Auto</option><option>Ordinateur</option><option>Tablette</option><option>Mobile</option></select>
      </label>
      <label className="flex items-center gap-2 text-[11px] text-white/50">Zoom
       <select aria-label="Zoom de l’espace de travail" value={zoom} onChange={e=>setZoom(Number(e.target.value))} className="rounded-[4px] bg-[#252528] px-2 py-1.5 text-[11px] text-white outline-none focus:ring-1 focus:ring-white/60"><option value={75}>75 %</option><option value={100}>100 %</option><option value={125}>125 %</option></select>
      </label>
     </div>
     <main ref={viewport} aria-label="Espace de travail du projet" onPointerDown={onPanStart} onPointerMove={onPanMove} onPointerUp={onPanEnd} onPointerCancel={onPanEnd} className={"min-h-0 min-w-0 flex-1 overflow-auto bg-[#171719] px-4 py-8 sm:px-8 "+(tool==="hand"?"cursor-grab active:cursor-grabbing":"")}>
    {notice&&<p role="alert" className="mx-auto mb-5 max-w-[860px] rounded-[5px] border border-amber-400/40 bg-amber-900/20 p-3 text-xs text-amber-100">{notice}</p>}
    {blocked&&<p role="alert" className="mx-auto mb-5 max-w-[860px] text-xs text-amber-200">Document existant incompatible : modification désactivée. Données conservées.</p>}
    {!page?<div className="flex min-h-full flex-col items-center justify-center gap-3 text-center">
      <FolderOpen size={26} className="text-white/25"/>
      <h1 className="text-base font-medium">{project.title}</h1>
      <p className="max-w-[320px] text-xs leading-relaxed text-white/45">Projet vierge. Utilisez le bouton + pour créer votre première page.</p>
     </div>:
     <div className="mx-auto flex w-full flex-col gap-3 transition-[max-width] duration-150" style={{maxWidth:frame==="Mobile"?390:frame==="Tablette"?768:frame==="Ordinateur"?1120:920,zoom:zoom/100}}>
       <div className="flex items-center justify-between gap-2 text-[11px] text-white/50"><span className="truncate">{page.title||"Sans titre"}</span><span>Page {doc.pages.findIndex(p=>p.id===page.id)+1}</span></div>
       <div className="min-h-[min(70vh,650px)] rounded-[3px] bg-white px-7 py-9 text-[#171719] shadow-[0_12px_40px_#0003] sm:px-12" aria-label="Page active" onClick={()=>{setSelectedItem(null);setInspect("page");}}>
         {page.items.map((e)=><button key={e.id} type="button" onClick={ev=>{ev.stopPropagation();chooseItem(e.id);}}
           className={"mb-3 block max-w-full whitespace-pre-wrap break-words rounded-[3px] px-2 py-1 text-left text-[17px] "+(selectedItem===e.id?"outline outline-2 outline-[#3197ff]":"hover:outline hover:outline-1 hover:outline-black/15")}>{e.text||" "}</button>)}
       </div>
       {!page.items.length&&<p className="text-center text-[11px] text-white/45">Cette page est vide. Utilisez le bouton + pour ajouter du contenu.</p>}
     </div>}
     </main>
     <div className="relative z-10 flex min-h-[66px] shrink-0 items-center justify-center border-t border-white/10 bg-[#151517] px-3" aria-label="Capsule AI + ME">
      {addOpen&&<div aria-label="Ajouter au projet" className="absolute bottom-[calc(100%+8px)] left-1/2 w-[220px] -translate-x-1/2 rounded-[7px] border border-white/15 bg-[#242427] p-2 shadow-[0_15px_38px_#0008]">
       <p className="px-3 py-2 text-[11px] font-semibold text-white/50">Créer</p>
       <button type="button" aria-label="Ajouter une page" disabled={blocked||doc.pages.length>=40} onClick={addPage} className={quiet+" w-full disabled:opacity-30"}>Nouvelle page</button>
       <button type="button" aria-label="Ajouter du texte" disabled={blocked||!page||page.items.length>=200} onClick={addText} className={quiet+" w-full disabled:opacity-30"}>Texte</button>
       {!page&&<p className="px-3 py-2 text-[10px] text-white/40">Créez une page avant d'ajouter du texte.</p>}
      </div>}
      <div className="flex min-h-11 items-center gap-0.5 rounded-full border border-white/20 bg-[#242427] px-2 shadow-lg">
       <span className="px-3 text-[13px] font-semibold tracking-[.04em] text-white/75">AI</span>
       <button type="button" aria-label="Ouvrir le menu de création" aria-expanded={addOpen} onClick={()=>setAddOpen(v=>!v)} className={"grid size-9 place-items-center rounded-full text-lg font-medium "+(addOpen?"bg-[#e8e8eb] text-[#111113]":"bg-[#36363a] text-white hover:bg-[#55555a]")}>+</button>
       <span className="px-3 text-[13px] font-semibold tracking-[.04em] text-white/75">ME</span>
      </div>
     </div>
    </div>
   </div>
   {rightVisible&&<button type="button" aria-label="Fermer le panneau des réglages" onClick={()=>setRightVisible(false)} className="absolute inset-0 z-10 bg-black/50 xl:hidden"/>}
   <aside aria-label="Réglages contextuels" className={"absolute inset-y-0 right-0 z-20 flex w-[250px] shrink-0 flex-col overflow-y-auto border-l border-white/10 bg-[#101012] p-4 transition-transform xl:relative xl:translate-x-0 "+(rightVisible?"translate-x-0":"translate-x-full")}>
     <div className="mb-6 flex items-center justify-between gap-2"><h2 className="text-[13px] font-semibold">Réglages</h2>
       <button type="button" aria-label="Fermer les réglages" onClick={()=>setRightVisible(false)} className="rounded-[5px] p-1.5 text-white/50 hover:bg-white/10 xl:hidden"><X size={15}/></button>
     </div>
     {inspect==="item"&&item?<div className="grid gap-3">
       <p className="text-[11px] text-white/45">Texte sélectionné</p>
       <label className="text-[11px] text-white/65">Contenu<textarea aria-label="Modifier le texte" value={item.text} onChange={e=>changeText(e.target.value)} rows={7} maxLength={3000} className={surface+" mt-2 w-full resize-y"} disabled={blocked}/></label>
       {pendingRemove?<div role="group" aria-label="Confirmer la suppression" className="grid gap-2 rounded-[5px] border border-amber-400/25 bg-amber-950/20 p-3"><p className="text-xs">Retirer cet élément du document ?</p><button type="button" onClick={removeText} disabled={blocked} className={action+" justify-center"}>Confirmer</button><button type="button" onClick={()=>{setPendingRemove(false);changeTool("select");}} className={quiet+" justify-center"}>Annuler</button></div>:<button type="button" onClick={()=>setPendingRemove(true)} disabled={blocked} className={action+" justify-center text-white/65"}>Retirer cet élément</button>}
       <button type="button" onClick={()=>{setSelectedItem(null);setInspect("page");}} className={quiet+" justify-center"}>Réglages de la page</button>
     </div>:inspect==="page"&&page?<div className="grid gap-3">
       <p className="text-[11px] text-white/45">Page active</p>
       <label className="text-[11px] text-white/65">Nom de la page<input aria-label="Nom de la page" value={page.title} maxLength={150} disabled={blocked} onChange={e=>renamePage(e.target.value)} className={surface+" mt-2 w-full"}/></label>
       <p className="text-[11px] text-white/40">{page.items.length} élément(s)</p>
       <button type="button" onClick={()=>setInspect("project")} className={quiet+" justify-center"}>Informations du projet</button>
     </div>:<div className="grid gap-4">
       <p className="text-[11px] text-white/45">Projet</p>
       <label className="text-[11px] text-white/65">Nom du projet<input aria-label="Nom du projet" maxLength={180} value={project.title} onChange={e=>updateProject({title:e.target.value})} className={surface+" mt-2 w-full"}/></label>
       <label className="text-[11px] text-white/65">Description<textarea aria-label="Description du projet" maxLength={1200} rows={4} value={project.description} onChange={e=>updateProject({description:e.target.value})} className={surface+" mt-2 w-full resize-y"}/></label>
       <div className="border-t border-white/10 pt-4 text-[11px] text-white/45">Contexte : {project.kind}</div>
       {page&&<button type="button" className={quiet+" justify-center"} onClick={()=>setInspect("page")}>Réglages de la page</button>}
     </div>}
   </aside>
  </div>
 </div>;
}
