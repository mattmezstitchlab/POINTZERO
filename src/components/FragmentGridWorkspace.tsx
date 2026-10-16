import {fragmentsHTML} from "../lib/compositionLayout";
import {saveStudioFile} from "./StudioFrame";
import {writeStoredJSON} from "../lib/storageSafety";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ArrowDownToLine, ExternalLink, Lock, LockOpen, Plus, Upload } from "lucide-react";
import { allowedFragmentUrl, demoFragments, readFragments, reorderFragments, updateFragment, type Fragment, type FragmentCollection } from "../lib/fragmentGrid";

const validStoredFragments=(v:unknown)=>{const parsed=readFragments(v);return !!parsed&&!!v&&typeof v==="object"&&(v as {version?:unknown}).version===1&&Array.isArray((v as {fragments?:unknown}).fragments)&&parsed.fragments.length===(v as {fragments:unknown[]}).fragments.length;};
const STORAGE="pointzero:universal-fragments:v1";
const tones=[["#e7d6dc","#654a56"],["#dce6e9","#45606a"],["#dfe5d9","#4c654d"],["#ece1d7","#775a48"],["#e1dfeb","#565375"]];
const inputClass="w-full rounded-[5px] border border-white/20 bg-[#202024] px-2.5 py-2 text-[12px] text-white outline-none focus:border-white/70";
const btn="min-h-9 rounded-[5px] border border-white/20 px-3 text-[11px] text-white/85 hover:bg-white/10 disabled:opacity-35";
type Layout="editorial"|"regular"|"immersive";
function restore():FragmentCollection {
  try{const value=readFragments(JSON.parse(localStorage.getItem(STORAGE)??"null"));if(value)return value;}catch{}
  return demoFragments();
}
export default function FragmentGridWorkspace({incoming}:{incoming?:FragmentCollection|null}={}){
  const [collection,setCollection]=useState<FragmentCollection>(restore);
  const [selected,setSelected]=useState<string|null>(null);
  const [inspectorOpen,setInspectorOpen]=useState(false);
  const [layout,setLayout]=useState<Layout>("editorial");
  const [device,setDevice]=useState<"desktop"|"tablet"|"phone">("desktop");
  const [notice,setNotice]=useState("");
  const chooser=useRef<HTMLInputElement>(null);
  const active=collection.fragments.find(f=>f.id===selected)??null;
  useEffect(()=>{
    if(!incoming)return;
    setCollection(incoming);setSelected(null);setNotice("Analyse intégrée : "+incoming.fragments.length+" fragments disponibles.");
  },[incoming]);
  useEffect(()=>{try{writeStoredJSON(STORAGE,JSON.stringify(collection),validStoredFragments);}catch{setNotice("Stockage local plein : exportez votre JSON.")}},[collection]);
  function patch(id:string,change:Partial<Fragment>){setCollection(c=>updateFragment(c,id,change))}
  function toggleLock(id:string){setCollection(c=>({...c,fragments:c.fragments.map(f=>f.id===id?{...f,locked:!f.locked}:f)}))}
  function add(){
    const id=globalThis.crypto?.randomUUID?.()??String(Date.now());
    setCollection(c=>({...c,fragments:[{id,title:"Nouveau fragment",description:"Fragment libre à composer.",sourceUrl:"",image:"",kind:"Composition",span:1 as const,locked:false,crop:{x:50,y:50,zoom:100},notes:""},...c.fragments].slice(0,120)}));
    setSelected(id);
  }
  async function importJSON(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];e.target.value="";
    if(!file)return;
    if(file.size>1024*1024){setNotice("Fichier limité à 1 Mo.");return}
    try{const doc=readFragments(JSON.parse(await file.text()));if(!doc)throw Error("Le JSON ne contient pas de collection valide.");
      setCollection(doc);setSelected(null);setNotice(doc.fragments.length+" fragments importés, sources conservées.");
    }catch(err){setNotice(err instanceof Error?err.message:"Fichier incompatible.")}
  }
  function exportJSON(){
    const blob=new Blob([JSON.stringify(collection,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="pointzero-fragments.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <>
    <main aria-label="Grille universelle de fragments" className="pz-design-stage min-w-0 flex-1 overflow-y-auto bg-[#f7f6f3] p-4 text-[#222] sm:p-6">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="mb-2 text-[10px] font-semibold tracking-[.14em] text-[#97918d]">MÉTAMORPHOSE / GRILLE UNIVERSELLE</p>
            <h2 className="text-[26px] font-medium tracking-[-.05em]">{collection.name}</h2>
            <p className="mt-1 text-[12px] text-[#85817e]">{collection.fragments.length} fragments · composition non destructive</p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <button className="rounded-[5px] border border-[#ddd] bg-white px-3 py-2" onClick={()=>chooser.current?.click()}><Upload size={13} className="mr-1 inline"/> Importer JSON</button>
            <button className="rounded-[5px] border border-[#ddd] bg-white px-3 py-2" onClick={exportJSON}><ArrowDownToLine size={13} className="mr-1 inline"/> Exporter</button>
            <button className="rounded-[5px] border border-[#ddd] bg-white px-3 py-2" onClick={()=>saveStudioFile("aime-recomposition.html",fragmentsHTML(collection,layout),"text/html;charset=utf-8")}>Exporter HTML responsive</button>
            <button className="rounded-[5px] bg-[#242424] px-3 py-2 text-white" onClick={add}><Plus size={13} className="mr-1 inline"/> Fragment</button>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#e7e4e0] pb-3 text-[11px]">
          <div className="flex gap-1" aria-label="Mise en page">
            {(["editorial","regular","immersive"] as const).map(id=><button key={id} type="button" aria-pressed={layout===id} onClick={()=>setLayout(id)}
              className={"rounded-[4px] px-2.5 py-2 "+(layout===id?"bg-[#242424] text-white":"bg-white text-[#666]")}>
              {({editorial:"Éditoriale",regular:"Régulière",immersive:"Immersive"})[id]}</button>)}
          </div>
          <div className="flex gap-1" aria-label="Aperçu de format">
            {(["desktop","tablet","phone"] as const).map(id=><button key={id} type="button" aria-pressed={device===id} onClick={()=>setDevice(id)}
              className={"rounded-[4px] px-2.5 py-2 "+(device===id?"bg-[#ebe4e3] text-[#333]":"bg-transparent text-[#999]")}>
              {({desktop:"MacBook",tablet:"iPad",phone:"iPhone"})[id]}</button>)}
          </div>
        </div>
        <div className={"mx-auto transition-[max-width] duration-200 "+(device==="phone"?"max-w-[360px]":device==="tablet"?"max-w-[750px]":"max-w-full")}>
          <div className={"grid gap-2 "+(device==="phone"?"grid-cols-2":device==="tablet"?"grid-cols-3":"grid-cols-4")} style={{gridAutoRows:device==="phone"?124:165}}>
            {collection.fragments.map((f,i)=>{
              const span=layout==="regular"?1:layout==="immersive"&&i===0?3:f.span;
              const actual=Math.min(span,device==="phone"?2:device==="tablet"?3:4);
              const selectedHere=selected===f.id,back=tones[i%tones.length];
              return <button key={f.id} type="button" draggable={!f.locked} data-fragment-id={f.id}
                onClick={()=>{setSelected(f.id);setInspectorOpen(true)}} onDragStart={e=>{e.dataTransfer.setData("text/plain",f.id);e.dataTransfer.effectAllowed="move"}}
                onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const from=e.dataTransfer.getData("text/plain");setCollection(c=>reorderFragments(c,from,f.id))}}
                className={"relative flex min-w-0 flex-col justify-between overflow-hidden rounded-[5px] border p-3 text-left transition-shadow hover:shadow-lg "+(selectedHere?"border-[#333] ring-2 ring-[#333]":"border-black/5")}
                style={{gridColumn:"span "+actual,background:back[0],color:back[1],gridRow:layout==="immersive"&&i===0?"span 2":"span 1"}}>
                {f.image&&<img src={f.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-45"
                   style={{objectPosition:f.crop.x+"% "+f.crop.y+"%",transform:"scale("+(f.crop.zoom/100)+")"}}/>}
                <div className="relative flex w-full justify-between gap-2 text-[10px] font-semibold uppercase tracking-[.08em]">
                  <span>{f.kind}</span>{f.locked?<Lock size={13}/>:<span>{String(i+1).padStart(2,"0")}</span>}
                </div>
                <div className="relative font-serif text-[clamp(15px,2vw,30px)] leading-tight">{f.title}</div>
                <p className="relative line-clamp-2 text-[10px] leading-snug opacity-80">{f.description}</p>
              </button>;
            })}
          </div>
        </div>
        <details className="mt-5"><summary>Aperçu responsive exportable — même moteur que le HTML</summary><div style={{overflowX:'auto'}}><iframe title="Recomposition responsive des fragments" sandbox="" srcDoc={fragmentsHTML(collection,layout)} style={{width:device==='phone'?390:device==='tablet'?768:1200,height:600,maxWidth:'none',border:'1px solid #aaa'}}/></div><p>Largeur réelle du document : 390 / 768 / 1200 px. Défilement horizontal possible dans les écrans étroits.</p></details>
        <p className="mt-5 text-[11px] text-[#8c8580]">Sélectionnez une case pour la modifier ; agrandissez-la et la grille se réorganise. Déplacez une case non verrouillée pour changer sa place.</p>
        <input ref={chooser} type="file" accept=".json,application/json" className="sr-only" onChange={e=>void importJSON(e)} aria-label="Importer des fragments JSON"/>
        {notice&&<p role="status" className="mt-3 rounded-[5px] border border-[#e5dfdb] bg-white p-3 text-[12px]">{notice}</p>}
      </div>
    </main>
    <aside aria-label="Propriétés du fragment"
      className={"pz-design-properties shrink-0 overflow-y-auto border-l border-white/10 bg-[#0b0b0d] p-4 text-white "+
        (inspectorOpen?"fixed inset-x-3 bottom-3 z-40 max-h-[65dvh] w-auto rounded-[6px] border xl:static xl:max-h-none xl:w-[245px] xl:rounded-none":"hidden w-[245px] xl:block")}>
      <div className="mb-4 flex items-center justify-between gap-2"><h2 className="text-[13px] font-semibold">Fragment / Propriétés</h2>
        <button type="button" className="min-h-9 rounded-[5px] border border-white/20 px-2 text-xs xl:hidden" onClick={()=>setInspectorOpen(false)}>Fermer</button>
      </div>
      {active ? <>
        <p className="mb-3 text-[11px] text-white/60">Source conservée. La composition ne modifie pas l'original.</p>
        {([["title","Titre"],["description","Description"],["kind","Catégorie"],["sourceUrl","URL source"],["image","URL image"],["notes","Notes"]] as const).map(([key,label])=>
          <label key={key} className="mb-3 block text-[11px] text-white/65">{label}
            <input className={inputClass+" mt-1"} disabled={active.locked} value={active[key]}
              onChange={e=>patch(active.id,{[key]:key==="sourceUrl"||key==="image"?e.target.value.slice(0,2000):e.target.value.slice(0,600)})}/>
          </label>)}
        <div className="mb-3 flex items-center justify-between"><span className="text-[11px] text-white/65">Taille sur la grille</span><b className="text-xs">{active.span} colonnes</b></div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button className={btn} disabled={active.locked||active.span<=1} onClick={()=>patch(active.id,{span:(active.span-1) as Fragment["span"]})}>− Réduire</button>
          <button className={btn} disabled={active.locked||active.span>=4} onClick={()=>patch(active.id,{span:(active.span+1) as Fragment["span"]})}>＋ Agrandir</button>
        </div>
        {(["zoom","x","y"] as const).map(k=><label key={k} className="mb-3 block text-[11px] text-white/65">
          <span>{({zoom:"Zoom",x:"Horizontal",y:"Vertical"})[k]} · {active.crop[k]}{k==="zoom"?"%":""}</span>
          <input type="range" className="mt-2 w-full accent-white" disabled={active.locked} min={k==="zoom"?100:0} max={k==="zoom"?230:100} value={active.crop[k]}
            onChange={e=>patch(active.id,{crop:{...active.crop,[k]:Number(e.target.value)}})}/>
        </label>)}
        <button className={btn+" mb-3 flex w-full items-center justify-center gap-2"} onClick={()=>toggleLock(active.id)}>
          {active.locked?<LockOpen size={14}/>:<Lock size={14}/>} {active.locked?"Déverrouiller":"Verrouiller"}
        </button>
        {allowedFragmentUrl(active.sourceUrl)&&<a target="_blank" rel="noopener noreferrer" href={allowedFragmentUrl(active.sourceUrl)} className={btn+" flex w-full items-center justify-center gap-2"}><ExternalLink size={14}/> Ouvrir la source</a>}
      </> : <p className="text-[12px] leading-relaxed text-white/55">Sélectionnez un fragment pour l'agrandir, le recadrer et le verrouiller. La source et les notes sont sauvegardées dans la collection.</p>}
      <div className="mt-5 border-t border-white/10 pt-4"><p className="text-[10px] leading-relaxed text-white/55">Données stockées sur cet appareil. JSON AIME MÉTAMORPHOSE compatible ; pas de modification distante du site source.</p></div>
    </aside>
  </>;
}
