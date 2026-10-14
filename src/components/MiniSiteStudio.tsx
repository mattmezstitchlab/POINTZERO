import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ArrowDown, ArrowUp, Download, Eye, EyeOff, ImagePlus, Laptop, Save, Smartphone, Trash2, Upload } from "lucide-react";
import { StudioFrame, studioButton, studioInput, saveStudioFile } from "./StudioFrame";
import { createMiniSite, MINI_DRAFTS, MINI_KEY, MINI_KINDS, miniProjectFile, miniSection, miniSiteToHTML, safeMiniSite, type MiniKind, type MiniSection, type MiniSectionKind, type MiniSite } from "../lib/miniSiteCore";
import { loadProjectOptions } from "../lib/budgetCore";
const load=():MiniSite=>{try{return safeMiniSite(JSON.parse(localStorage.getItem(MINI_KEY)??"null"))??createMiniSite();}catch{return createMiniSite();}};
const loadDrafts=():MiniSite[]=>{try {const json=JSON.parse(localStorage.getItem(MINI_DRAFTS)??"[]") as unknown;return Array.isArray(json)?json.map(safeMiniSite).filter((x):x is MiniSite=>!!x).slice(0,12):[];}catch{return [];}};
const slug=(s:string)=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-")||"mini-site";
interface Props {onBack:()=>void;incomingDraft?:MiniSite|null}
export default function MiniSiteStudio({onBack,incomingDraft}:Props) {
  const [doc,setDoc]=useState<MiniSite>(()=>incomingDraft??load);
  const [drafts,setDrafts]=useState<MiniSite[]>(loadDrafts);
  const [selected,setSelected]=useState<string|null>(null);
  const [viewport,setViewport]=useState<"phone"|"desktop">("desktop");
  const [status,setStatus]=useState("");
  const filePicker=useRef<HTMLInputElement>(null);
  const imagePicker=useRef<HTMLInputElement>(null);
  const section=doc.sections.find(s=>s.id===selected)??null;
  const projects=useMemo(loadProjectOptions,[]);
  const update=(patch:Partial<MiniSite>)=>setDoc(d=>({...d,...patch}));
  const updateSection=(id:string,patch:Partial<MiniSection>)=>setDoc(d=>({...d,sections:d.sections.map(s=>s.id===id?{...s,...patch}:s)}));
  useEffect(()=>{try{localStorage.setItem(MINI_KEY,JSON.stringify(doc));}catch{setStatus("Stockage saturé : exportez ce mini-site en HTML ou JSON.");}},[doc]);
  const newSite=(kind:MiniKind)=>{
    if(!window.confirm("Créer un mini-site vierge ? L'actuel reste accessible uniquement si vous l'avez enregistré dans Mes mini-sites."))return;
    const next=createMiniSite(kind);setDoc(next);setSelected(null);
  };
  const store=()=>{
    const next=[doc,...drafts.filter(d=>d.id!==doc.id)].slice(0,12);
    try{localStorage.setItem(MINI_DRAFTS,JSON.stringify(next));setDrafts(next);setStatus("Mini-site conservé dans Mes mini-sites.");}
    catch{setStatus("Stockage saturé : exportez ce mini-site en JSON.");}
  };
  const changeOrder=(id:string,delta:number)=>{
    setDoc(d=>{const items=[...d.sections];const index=items.findIndex(s=>s.id===id),to=index+delta;
      if(index<0||to<0||to>=items.length)return d;
      [items[index],items[to]]=[items[to],items[index]];
      return {...d,sections:items};
    });
  };
  const importJSON=async(e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];e.target.value="";if(!file)return;
    if(file.size>6_000_000){setStatus("Fichier trop volumineux.");return;}
    try{
      const parsed=safeMiniSite(JSON.parse(await file.text()));
      if(!parsed)throw Error("Le mini-site JSON n'est pas valide.");
      setDoc(parsed);setSelected(null);setStatus("Mini-site importé localement.");
    }catch(error){setStatus(error instanceof Error?error.message:"Import impossible.");}
  };
  const importHero=(e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];e.target.value="";if(!file)return;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>3_000_000){setStatus("PNG, JPEG ou WebP de 3 Mo maximum.");return;}
    const reader=new FileReader();
    reader.onerror=()=>setStatus("Lecture de l'image impossible.");
    reader.onload=()=>{
      const data=String(reader.result??"");
      if(data.length>5_500_000){setStatus("Image trop volumineuse.");return;}
      update({heroImage:data});setStatus("Photo de couverture ajoutée.");
    };
    reader.readAsDataURL(file);
  };
  const exportHTML=()=>{saveStudioFile(slug(doc.name)+".html",miniSiteToHTML(doc),"text/html;charset=utf-8");setStatus("Fichier HTML exporté. Sa publication et son hébergement restent à effectuer.");};
  const preview=miniSiteToHTML(doc);
  const actions=<div className="flex gap-1">
    <button type="button" className={studioButton+" !px-2"} onClick={store} title="Enregistrer dans Mes mini-sites" aria-label="Enregistrer le mini-site"><Save size={16}/></button>
    <button type="button" className={studioButton+" !px-2"} onClick={()=>filePicker.current?.click()} title="Importer JSON" aria-label="Importer un mini-site JSON"><Upload size={16}/></button>
    <button type="button" className={studioButton+" !px-2"} onClick={()=>saveStudioFile(slug(doc.name)+".pointzero.json",miniProjectFile(doc))} title="Exporter JSON" aria-label="Exporter le mini-site JSON"><Download size={16}/></button>
    <button type="button" onClick={exportHTML} className="inline-flex min-h-9 items-center gap-1.5 rounded-[5px] bg-white px-3 text-xs font-semibold text-black"><Download size={15}/> HTML</button>
  </div>;
  return <StudioFrame title="Mini-site" subtitle="Une seule page · responsive · export HTML statique" onBack={onBack}
    leftLabel="Bibliothèque de mini-sites" rightLabel="Contenu du mini-site" actions={actions}
    left={<>
      <h2 className="mb-3 text-sm font-semibold">Mes mini-sites</h2>
      <div className="space-y-2">{drafts.map(site=><button type="button" key={site.id} onClick={()=>{setDoc(site);setSelected(null);}} aria-pressed={doc.id===site.id}
        className={"w-full rounded-[5px] border p-3 text-left text-xs "+(doc.id===site.id?"border-white/70 bg-white/15":"border-white/15 hover:bg-white/10")}>
        <span className="block truncate font-semibold">{site.name}</span><span className="mt-1 block text-[11px] text-white/60">{site.kind}</span></button>)}
      </div>
      <div className="mt-5 border-t border-white/15 pt-4">
        <h3 className="mb-2 text-xs font-semibold">Nouveau modèle</h3>
        <div className="grid grid-cols-2 gap-2">{MINI_KINDS.map(k=><button key={k.id} onClick={()=>newSite(k.id)} className={studioButton+" px-2"}>{k.name}</button>)}</div>
      </div>
      <div className="mt-5 border-t border-white/15 pt-4">
        <div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-semibold">Sections</h3><span className="text-[10px] text-white/50">{doc.sections.length}/16</span></div>
        {doc.sections.map((s,i)=><div key={s.id} className={"mb-2 flex items-center gap-1 rounded-[5px] border p-1 "+(selected===s.id?"border-white/70 bg-white/15":"border-white/10")}>
          <button className="min-w-0 flex-1 px-2 py-2 text-left text-xs" onClick={()=>setSelected(s.id)}><span className="block truncate font-medium">{s.title}</span>
            <span className="block text-[10px] text-white/55">{s.kind}</span></button>
          <div className="flex flex-col">
            <button aria-label={"Monter "+s.title} title="Monter" disabled={i===0} onClick={()=>changeOrder(s.id,-1)} className="px-1 text-white/60 disabled:opacity-25"><ArrowUp size={13}/></button>
            <button aria-label={"Descendre "+s.title} title="Descendre" disabled={i===doc.sections.length-1} onClick={()=>changeOrder(s.id,1)} className="px-1 text-white/60 disabled:opacity-25"><ArrowDown size={13}/></button>
          </div>
          <button aria-label={(s.visible?"Masquer ":"Afficher ")+s.title} onClick={()=>updateSection(s.id,{visible:!s.visible})} className="px-1 text-white/70">{s.visible?<Eye size={15}/>:<EyeOff size={15}/>}</button>
        </div>)}
        <label className="mt-3 block text-xs text-white/70">Ajouter une section
          <select className={studioInput+" mt-1"} defaultValue="" onChange={e=>{if(!e.target.value)return;
            const next=miniSection(e.target.value as MiniSectionKind);
            setDoc(d=>({...d,sections:d.sections.length>=16?d.sections:[...d.sections,next]}));
            setSelected(next.id);e.target.value="";
          }}>
            <option value="">Choisir…</option>
            <option value="texte">Texte</option><option value="programme">Programme</option><option value="informations">Informations</option><option value="galerie">Galerie</option><option value="contact">Contact</option>
          </select>
        </label>
      </div>
    </>}
    right={<>
      <h2 className="mb-4 text-sm font-semibold">{section?"Éditer la section":"Personnaliser le site"}</h2>
      {section?<div className="space-y-3">
        <button className={studioButton+" w-full"} onClick={()=>setSelected(null)}>Retour aux paramètres du site</button>
        <label className="block text-xs text-white/75">Titre<input aria-label="Titre de section" className={studioInput+" mt-1"} value={section.title} maxLength={300} onChange={e=>updateSection(section.id,{title:e.target.value})}/></label>
        <label className="block text-xs text-white/75">Contenu<textarea aria-label="Texte de section" className={studioInput+" mt-1"} value={section.body} rows={8} maxLength={5000} onChange={e=>updateSection(section.id,{body:e.target.value})}/></label>
        <p className="text-[11px] text-white/55">Pour une galerie, ajoutez un intitulé par ligne. Le modèle affiche des cartes, pas encore des images indépendantes.</p>
        <button className={studioButton+" w-full"} onClick={()=>{if(!window.confirm("Supprimer cette section ?"))return;setDoc(d=>({...d,sections:d.sections.filter(s=>s.id!==section.id)}));setSelected(null);}}><Trash2 size={14}/> Supprimer la section</button>
      </div>:<div className="space-y-3">
        <label className="block text-xs text-white/75">Nom du projet<input aria-label="Nom du mini-site" className={studioInput+" mt-1"} value={doc.name} maxLength={140} onChange={e=>update({name:e.target.value})}/></label>
        <label className="block text-xs text-white/75">Titre principal<input aria-label="Titre principal" className={studioInput+" mt-1"} value={doc.title} maxLength={300} onChange={e=>update({title:e.target.value})}/></label>
        <label className="block text-xs text-white/75">Accroche<input aria-label="Accroche" className={studioInput+" mt-1"} value={doc.eyebrow} maxLength={200} onChange={e=>update({eyebrow:e.target.value})}/></label>
        <label className="block text-xs text-white/75">Sous-titre<textarea aria-label="Sous-titre" className={studioInput+" mt-1"} rows={3} value={doc.subtitle} maxLength={500} onChange={e=>update({subtitle:e.target.value})}/></label>
        <label className="block text-xs text-white/75">Date<input className={studioInput+" mt-1"} value={doc.date} maxLength={150} onChange={e=>update({date:e.target.value})}/></label>
        <label className="block text-xs text-white/75">Lieu<input className={studioInput+" mt-1"} value={doc.place} maxLength={300} onChange={e=>update({place:e.target.value})}/></label>
        <label className="block text-xs text-white/75">Email de contact<input type="email" className={studioInput+" mt-1"} value={doc.contact} maxLength={254} onChange={e=>update({contact:e.target.value})}/></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[11px] text-white/75">Accent<input aria-label="Couleur d'accent" type="color" className="mt-1 block size-9" value={doc.primaryColor} onChange={e=>update({primaryColor:e.target.value})}/></label>
          <label className="text-[11px] text-white/75">Fond<input aria-label="Couleur de fond" type="color" className="mt-1 block size-9" value={doc.background} onChange={e=>update({background:e.target.value})}/></label>
        </div>
        <button onClick={()=>imagePicker.current?.click()} className={studioButton+" w-full"}><ImagePlus size={16}/> Importer une photo de couverture</button>
        {doc.heroImage&&<button onClick={()=>update({heroImage:""})} className={studioButton+" w-full"}>Retirer la photo</button>}
        <label className="block text-xs text-white/75">Projet graphique associé
          <select className={studioInput+" mt-1"} value={doc.projectId} onChange={e=>update({projectId:e.target.value})}>
            <option value="">Aucun</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      </div>}
      <p className="mt-5 text-[11px] leading-relaxed text-white/55">Aucune publication ni collecte de RSVP côté serveur. Le contact ouvre l'application email du visiteur. Exportez le HTML puis hébergez-le pour partager une URL.</p>
    </>}
  >
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Aperçu en direct</p><h2 className="mt-1 text-lg font-semibold">{doc.name}</h2></div>
        <div className="flex gap-1 rounded-[5px] border border-white/20 bg-[#09090b] p-1">
          <button onClick={()=>setViewport("desktop")} aria-pressed={viewport==="desktop"} aria-label="Aperçu ordinateur" className={(viewport==="desktop"?"bg-white text-black":"text-white")+" rounded-[4px] px-3 py-2"}><Laptop size={16}/></button>
          <button onClick={()=>setViewport("phone")} aria-pressed={viewport==="phone"} aria-label="Aperçu téléphone" className={(viewport==="phone"?"bg-white text-black":"text-white")+" rounded-[4px] px-3 py-2"}><Smartphone size={16}/></button>
        </div>
      </div>
      <div className="flex justify-center rounded-[8px] border border-white/15 bg-[#232326] p-3 sm:p-5">
        <iframe title="Prévisualisation du mini-site" sandbox="" srcDoc={preview} className={"h-[min(78dvh,950px)] min-h-[400px] rounded-[5px] border-0 bg-white shadow-2xl transition-[width] "+(viewport==="phone"?"w-[390px] max-w-full":"w-full")}/>
      </div>
      {status&&<p role="status" className="mt-3 rounded-[5px] bg-[#09090b] p-3 text-xs text-white">{status}</p>}
      <p className="mt-3 text-xs text-white/60">Prévisualisation isolée, responsive. Le fichier HTML exporté est autonome et statique.</p>
    </div>
    <input ref={filePicker} type="file" accept="application/json,.json" className="sr-only" aria-label="Choisir mini-site JSON" onChange={e=>void importJSON(e)}/>
    <input ref={imagePicker} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Choisir photo de couverture" onChange={importHero}/>
  </StudioFrame>;
}
