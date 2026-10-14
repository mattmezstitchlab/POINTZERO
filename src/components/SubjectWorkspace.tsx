import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { ArrowDown, ArrowUp, Check, Copy, Download, Eye, EyeOff, FileJson, GitMerge, Lock, LockOpen, Scissors, Save, Trash2, X } from "lucide-react";
import { FLOSS, flossIndex } from "../lib/dmc";
import { downloadBlob, saveProjectFile } from "../lib/io";
import { buildPdf, pdfFileName } from "../lib/pdf";
import { type Pattern } from "../lib/pattern";
import {
  attachSubject, changeSubject, detectSubjects, duplicateSubject, mergeSubjects,
  recomposeSubjects, reorderSubject, sceneFromPattern, splitSubject, spriteForExport,
  type SubjectLayer, type SubjectScene,
} from "../lib/subjectEngine";
import { multiSubjectDemo } from "../lib/subjectDemo";
import { deleteLibrarySubject, loadSubjectLibrary, openLibrarySubject, storeSubject } from "../lib/subjectLibrary";

const inkColor=(idx:number)=>FLOSS[idx]?.hex??"#555";
function SubjectPreview({pattern,scene,selected,onChoose,onMove}:{
  pattern:Pattern;scene:SubjectScene;selected:string|null;
  onChoose:(id:string)=>void;onMove:(id:string,x:number,y:number)=>void;
}) {
  const canvas=useRef<HTMLCanvasElement>(null);
  const dragging=useRef<{id:string;startX:number;startY:number;x:number;y:number}|null>(null);
  useEffect(()=>{
    const c=canvas.current,ctx=c?.getContext("2d");
    if(!c||!ctx)return;
    const scale=Math.max(2,Math.min(9,720/Math.max(pattern.w,pattern.h)));
    c.width=Math.ceil(pattern.w*scale);c.height=Math.ceil(pattern.h*scale);
    ctx.fillStyle=pattern.fabric?.color??"#f7f2e8";
    ctx.fillRect(0,0,c.width,c.height);
    for(let i=0;i<pattern.cross.length;i++) {
      const color=pattern.cross[i];if(color<0)continue;
      ctx.fillStyle=inkColor(color);
      ctx.fillRect(i%pattern.w*scale,Math.floor(i/pattern.w)*scale,scale,scale);
    }
    for(const [array,reverse] of [[pattern.fwd,false],[pattern.bwd,true]] as const)
      for(let i=0;i<array.length;i++){if(array[i]<0)continue;
        const x=i%pattern.w*scale,y=Math.floor(i/pattern.w)*scale;
        ctx.strokeStyle=inkColor(array[i]);ctx.lineWidth=Math.max(1,scale*.2);ctx.beginPath();
        if(reverse){ctx.moveTo(x,y);ctx.lineTo(x+scale,y+scale);}
        else{ctx.moveTo(x,y+scale);ctx.lineTo(x+scale,y);}
        ctx.stroke();
      }
    for(let k=0;k<4;k++)for(let i=0;i<pattern.q[k].length;i++){
      const color=pattern.q[k][i];if(color<0)continue;
      const x=(i%pattern.w+(k===1||k===2?1:0))*scale;
      const y=(Math.floor(i/pattern.w)+(k>=2?1:0))*scale;
      ctx.strokeStyle=inkColor(color);ctx.lineWidth=Math.max(1,scale*.25);ctx.beginPath();
      ctx.moveTo(x,y);ctx.lineTo((i%pattern.w+.5)*scale,(Math.floor(i/pattern.w)+.5)*scale);ctx.stroke();
    }
    for(const seg of pattern.back){
      ctx.strokeStyle=inkColor(seg.c);ctx.lineWidth=Math.max(1,scale*.22);ctx.beginPath();
      ctx.moveTo(seg.x1*scale,seg.y1*scale);ctx.lineTo(seg.x2*scale,seg.y2*scale);ctx.stroke();
    }
    // Bounded regions help selection, without modifying the actual motif.
    for(const layer of scene.layers){
      const sprite=JSON.parse(layer.sprite) as {w:number;h:number};
      const w=sprite.w*layer.scale,h=sprite.h*layer.scale;
      ctx.strokeStyle=selected===layer.id?"#007aff":"rgba(30,30,30,.28)";
      ctx.lineWidth=selected===layer.id?2:1;ctx.setLineDash(selected===layer.id?[]:[5,4]);
      ctx.strokeRect(layer.x*scale,layer.y*scale,w*scale,h*scale);
    }
    ctx.setLineDash([]);
  },[pattern,scene,selected]);
  const point=(e:PointerEvent<HTMLCanvasElement>)=>{
    const box=e.currentTarget.getBoundingClientRect();
    return {
      x:(e.clientX-box.left)/Math.max(1,box.width)*pattern.w,
      y:(e.clientY-box.top)/Math.max(1,box.height)*pattern.h,
    };
  };
  return <canvas ref={canvas} role="img" aria-label="Grille de sujets : cliquer ou faire glisser pour sélectionner et déplacer"
    className="mx-auto block w-full max-w-[720px] cursor-move touch-none rounded-md border border-black/15 bg-white"
    style={{aspectRatio:pattern.w+"/"+pattern.h,imageRendering:"pixelated"}}
    onPointerDown={e=>{
      const p=point(e);
      const target=[...scene.layers].reverse().find(l=>{
        const sprite=JSON.parse(l.sprite) as {w:number;h:number};
        return l.visible&&p.x>=l.x&&p.y>=l.y&&p.x<l.x+sprite.w*l.scale&&p.y<l.y+sprite.h*l.scale;
      });
      if(!target)return;
      onChoose(target.id);
      if(target.locked)return;
      dragging.current={id:target.id,startX:p.x,startY:p.y,x:target.x,y:target.y};
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }}
    onPointerMove={e=>{
      const d=dragging.current;if(!d)return;
      const p=point(e);
      onMove(d.id,d.x+Math.round(p.x-d.startX),d.y+Math.round(p.y-d.startY));
    }}
    onPointerUp={()=>{dragging.current=null;}}
    onPointerCancel={()=>{dragging.current=null;}}/>;
}

const fieldClass="w-full rounded-md border border-white/20 bg-[#27272b] px-2 py-2 text-sm text-white";
export default function SubjectWorkspace({pattern,onCancel,onUse}:{
  pattern:Pattern;onCancel:()=>void;onUse:(p:Pattern)=>void;
}) {
  const [scene,setScene]=useState<SubjectScene>(()=>sceneFromPattern(pattern)??detectSubjects(pattern).scene);
  const [selectedId,setSelectedId]=useState<string|null>(()=>scene.layers[0]?.id??null);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [library,setLibrary]=useState(loadSubjectLibrary);
  const [split,setSplit]=useState({x:0,y:0,w:10,h:10});
  const [mergeId,setMergeId]=useState("");
  const [showSource,setShowSource]=useState(false);
  const [confirmed,setConfirmed]=useState(false);
  const selected=scene.layers.find(l=>l.id===selectedId)??null;
  const result=useMemo(()=>{
    try{return {pattern:recomposeSubjects(scene),error:""};}
    catch(e){return {pattern:null,error:e instanceof Error?e.message:"Recomposition impossible."};}
  },[scene]);
  const composed=result.pattern;
  const adjust=(id:string,patch:Partial<Pick<SubjectLayer,"name"|"x"|"y"|"scale"|"visible"|"locked"|"tint">>)=>{
    setScene(old=>changeSubject(old,id,patch));setConfirmed(false);
  };
  const operation=(fn:()=>void)=>{try{fn();setMessage("");setConfirmed(false);}catch(e){setMessage(e instanceof Error?e.message:"Modification impossible.");}};
  const resetDemo=()=>{
    const p=multiSubjectDemo(),next=detectSubjects(p).scene;
    const names=["Oiseau","Fleur","Maisonnette"];
    next.layers=next.layers.map((l,i)=>({...l,name:names[i]??l.name}));
    setScene(next);setSelectedId(next.layers[0]?.id??null);setMessage("Démo originale : les noms sont fournis par le scénario, non détectés par une IA.");setConfirmed(false);
  };
  const saveSelected=()=>{
    if(!selected)return;
    operation(()=>{setLibrary(storeSubject(spriteForExport(selected)));setMessage("Sujet enregistré localement (pas publié en boutique).");});
  };
  const exportSelected=()=>{
    if(selected)saveProjectFile(spriteForExport(selected));
  };
  const currentCount=composed?.cross.reduce((n,c)=>n+Number(c>=0),0)??0;
  const offscreen=composed?.subjectScene?.warnings.some(w=>w.includes("hors de la grille"))??false;
  const hiddenCount=scene.layers.filter(l=>!l.visible).length;
  const finish=()=>{
    if(!composed)return;
    if((offscreen||hiddenCount>0)&&!confirmed){setMessage("Confirmez les points cachés ou hors-grille avant de remplacer l'atelier.");return;}
    onUse(composed);
  };
  const exportPdf=async()=>{
    if(!composed||busy)return;
    setBusy(true);
    try{
      const opts={bw:false,paper:"a4" as const};
      downloadBlob(await buildPdf(composed,opts),pdfFileName(composed,opts));
      setMessage("PDF calculé à partir du même Pattern recomposé que la grille.");
    }catch(e){setMessage(e instanceof Error?e.message:"Erreur PDF.");}
    finally{setBusy(false);}
  };
  const useLibrary=(itemId:string)=>{
    const item=library.find(x=>x.id===itemId);if(!item)return;
    operation(()=>{
      const next=attachSubject(scene,openLibrarySubject(item),Math.floor((composed?.w??120)*.3),Math.floor((composed?.h??75)*.3));
      setScene(next);setSelectedId(next.layers.at(-1)!.id);
    });
  };
  return <div className="fixed inset-0 z-[79] flex flex-col bg-[#111114] text-white" role="dialog" aria-modal="true" aria-label="Décomposer et recomposer les sujets">
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
      <div><p className="text-[10px] uppercase tracking-[.16em] text-[#b0a7d9]">POINTZERO · Atelier · Moteur de sujets</p>
        <h2 className="text-lg font-semibold">Décomposer → Composer</h2></div>
      <div className="flex items-center gap-2">
        <button className="rounded-md border border-white/20 px-3 py-2 text-xs" onClick={onCancel}><X size={14} className="mr-1 inline"/> Fermer</button>
        <button className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40" disabled={!composed||busy||((offscreen||hiddenCount>0)&&!confirmed)} onClick={finish}>
          <Check size={15} className="mr-1 inline"/> Utiliser dans l'atelier
        </button>
      </div>
    </header>
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[220px_minmax(320px,1fr)_300px] lg:overflow-hidden">
      <aside className="space-y-4 border-b border-white/10 p-4 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <h3 className="text-sm font-semibold">Détection et extraction</h3>
        <p className="text-xs leading-relaxed text-white/55">Segmentation géométrique des groupes colorés. La reconnaissance sémantique des objets par IA n'est pas encore activée.</p>
        <button className="w-full rounded-md border border-white/30 px-3 py-3 text-left text-sm" onClick={resetDemo}>Tester avec 3 sujets : oiseau, fleur, maison</button>
        <button className="w-full rounded-md border border-white/20 px-3 py-2 text-sm" onClick={()=>operation(()=>{
          const next=detectSubjects(composed??pattern).scene;
          setScene(next);setSelectedId(next.layers[0]?.id??null);
        })}>Décomposer ce motif</button>
        <div className="border-t border-white/10 pt-3">
          <h4 className="mb-2 text-sm font-medium">Bibliothèque personnelle</h4>
          <p className="mb-2 text-xs text-white/50">Composants enregistrés sur cet appareil. Les droits d'auteur de chaque source restent applicables.</p>
          <button className="w-full rounded-md border border-white/20 px-3 py-2 text-xs" onClick={saveSelected} disabled={!selected}><Save size={13} className="mr-1 inline"/> Enregistrer le sujet choisi</button>
          {library.slice(0,12).map(item=><div key={item.id} className="mt-2 flex items-center gap-2 text-xs">
            <button className="min-w-0 flex-1 truncate text-left text-white/80 underline underline-offset-2" onClick={()=>useLibrary(item.id)} title={item.name}>+ {item.name}</button>
            <button aria-label={"Supprimer "+item.name} onClick={()=>operation(()=>setLibrary(deleteLibrarySubject(item.id)))}><Trash2 size={13}/></button>
          </div>)}
          {library.length===0&&<p className="mt-2 text-xs text-white/35">Bibliothèque vide</p>}
        </div>
      </aside>
      <main className="min-h-[450px] space-y-4 overflow-y-auto bg-[#1d1c20] p-4" aria-label="Grille de composition des sujets">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><p className="text-[11px] uppercase tracking-[.12em] text-white/45">Composition interactive</p><h3 className="text-base font-semibold">{composed?.name??"Motif"}</h3></div>
          <span className="text-xs text-white/65">{composed?.w} × {composed?.h} points · {scene.layers.length} sujets · {currentCount} croix</span>
        </div>
        <div className="rounded-md bg-[#faf7f0] p-3">
          {composed&&<SubjectPreview pattern={composed} scene={scene} selected={selectedId} onChoose={setSelectedId} onMove={(id,x,y)=>adjust(id,{x,y})}/>}
        </div>
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          <button className="rounded-md border border-white/20 px-3 py-2" onClick={()=>setShowSource(v=>!v)}>{showSource?"Masquer":"Voir"} la source originale</button>
          <button className="rounded-md border border-white/20 px-3 py-2" onClick={()=>composed&&saveProjectFile(composed)} disabled={!composed}><FileJson size={14} className="mr-1 inline"/> Exporter JSON</button>
          <button className="rounded-md border border-white/20 px-3 py-2" onClick={()=>void exportPdf()} disabled={!composed||busy}><Download size={14} className="mr-1 inline"/> Exporter PDF</button>
        </div>
        {showSource&&<div className="rounded-md bg-[#f7f2e8] p-2 text-xs text-black">Source immuable conservée dans le projet. <span className="font-semibold">{scene.layers.length} composants indépendants</span> reposent sur cette référence. L'aperçu initial est accessible en rouvrant le fichier de projet.</div>}
        {scene.warnings.map((w,i)=><p key={i} className="rounded-md border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">{w}</p>)}
        {composed?.subjectScene?.warnings.filter(w=>!scene.warnings.includes(w)).map((w,i)=><p key={i} className="rounded-md border border-red-300/25 p-2 text-xs text-red-200">{w}</p>)}
        {(hiddenCount>0||offscreen)&&<label className="flex items-center gap-2 text-xs text-amber-200">
          <input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>
          Je confirme les éléments cachés ou les points hors-grille.
        </label>}
        {result.error&&<p role="alert" className="text-sm text-red-200">{result.error}</p>}
        {message&&<p role="status" className="text-xs text-white/70">{message}</p>}
      </main>
      <aside className="space-y-3 border-t border-white/10 p-4 lg:overflow-y-auto lg:border-l lg:border-t-0">
        <h3 className="text-sm font-semibold">Sujets indépendants</h3>
        <p className="text-xs text-white/50">Cliquez sur une zone de la grille, puis déplacez-la. L'ordre des sujets contrôle les chevauchements.</p>
        <div className="space-y-1.5">
          {scene.layers.map((layer,i)=><div key={layer.id} className={"flex items-center gap-2 rounded-md border p-2 text-xs "+(selectedId===layer.id?"border-[#9a8af5] bg-white/10":"border-white/10")}>
            <button className="min-w-0 flex-1 truncate text-left" onClick={()=>setSelectedId(layer.id)}>{i+1}. {layer.name}</button>
            <button aria-label={"Monter "+layer.name} disabled={i===0} className="disabled:opacity-20" onClick={()=>setScene(s=>reorderSubject(s,layer.id,-1))}><ArrowUp size={14}/></button>
            <button aria-label={"Descendre "+layer.name} disabled={i===scene.layers.length-1} className="disabled:opacity-20" onClick={()=>setScene(s=>reorderSubject(s,layer.id,1))}><ArrowDown size={14}/></button>
            <button aria-label={layer.visible?"Masquer "+layer.name:"Afficher "+layer.name} onClick={()=>adjust(layer.id,{visible:!layer.visible})}>{layer.visible?<Eye size={15}/>:<EyeOff size={15}/>}</button>
          </div>)}
        </div>
        {selected&&<div className="space-y-3 border-t border-white/15 pt-3">
          <label className="block text-xs text-white/65">Nom du sujet<input className={"mt-1 "+fieldClass} value={selected.name} maxLength={80} onChange={e=>adjust(selected.id,{name:e.target.value})}/></label>
          <div className="grid grid-cols-2 gap-2">
            {(["x","y"] as const).map(k=><label key={k} className="text-xs text-white/60">{k==="x"?"Colonne":"Rangée"}
              <input type="number" className={"mt-1 "+fieldClass} value={selected[k]} disabled={selected.locked} onChange={e=>adjust(selected.id,{[k]:+e.target.value||0})}/>
            </label>)}
          </div>
          <label className="block text-xs text-white/65">Taille du sujet ({Math.round(selected.scale*100)} %)
            <input type="range" min={50} max={200} step={10} value={selected.scale*100} disabled={selected.locked} className="mt-2 w-full" onChange={e=>adjust(selected.id,{scale:+e.target.value/100})}/>
          </label>
          <label className="block text-xs text-white/65">Teinte DMC (facultatif)
            <input className={"mt-1 "+fieldClass} list="subject-dmc" value={selected.tint??""} placeholder="ex. 321" disabled={selected.locked} onChange={e=>adjust(selected.id,{tint:e.target.value.trim().toUpperCase()})}/>
            <datalist id="subject-dmc">{FLOSS.slice(0,489).map(f=><option key={f.code} value={f.code}/>)}</datalist>
          </label>
          {!!selected.tint&&flossIndex(selected.tint)<0&&<p className="text-xs text-amber-200">Code DMC inconnu : teintes d'origine conservées.</p>}
          <div className="grid grid-cols-2 gap-2">
            <button className="rounded-md border border-white/20 px-2 py-2 text-xs" onClick={()=>adjust(selected.id,{locked:!selected.locked})}>{selected.locked?<LockOpen size={14} className="mr-1 inline"/>:<Lock size={14} className="mr-1 inline"/>}{selected.locked?"Déverrouiller":"Verrouiller"}</button>
            <button className="rounded-md border border-white/20 px-2 py-2 text-xs" onClick={()=>operation(()=>setScene(s=>duplicateSubject(s,selected.id)))}><Copy size={14} className="mr-1 inline"/> Dupliquer</button>
          </div>
          <button className="w-full rounded-md border border-white/20 px-3 py-2 text-xs" onClick={exportSelected}><FileJson size={14} className="mr-1 inline"/> Exporter ce sujet seul</button>
          <div className="border-t border-white/10 pt-3 text-xs">
            <h4 className="mb-2 font-medium">Fusionner avec un autre sujet</h4>
            <select className={fieldClass} value={mergeId} onChange={e=>setMergeId(e.target.value)}>
              <option value="">Choisir un autre sujet</option>
              {scene.layers.filter(l=>l.id!==selected.id).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <button className="mt-2 w-full rounded-md border border-white/20 p-2" disabled={!mergeId} onClick={()=>operation(()=>{
              const next=mergeSubjects(scene,selected.id,mergeId);
              setScene(next);setSelectedId(next.layers.find(l=>l.name.includes("+"))?.id??next.layers[0]?.id??null);setMergeId("");
            })}><GitMerge size={14} className="mr-1 inline"/> Fusionner</button>
          </div>
          <details className="border-t border-white/10 pt-3 text-xs">
            <summary className="cursor-pointer font-medium">Séparer une zone rectangulaire</summary>
            <p className="mt-2 text-white/50">Coordonnées internes au sujet, en cases. Les fractions/contours à la frontière doivent être vérifiés.</p>
            <div className="mt-2 grid grid-cols-4 gap-1">
              {(["x","y","w","h"] as const).map(k=><label key={k} className="text-[10px] text-white/60">{k}<input type="number" className={"mt-1 "+fieldClass} min={0} value={split[k]} onChange={e=>setSplit(s=>({...s,[k]:+e.target.value||0}))}/></label>)}
            </div>
            <button className="mt-2 w-full rounded-md border border-white/20 p-2" onClick={()=>operation(()=>{
              const next=splitSubject(scene,selected.id,split);setScene(next);setSelectedId(next.layers.find(l=>l.name.endsWith("· extrait"))?.id??selected.id);
            })}><Scissors size={14} className="mr-1 inline"/> Séparer</button>
          </details>
        </div>}
        <p className="border-t border-white/10 pt-3 text-[11px] leading-relaxed text-white/45">Aucune vente en ligne n'est activée. Extraction géométrique réelle, classification sémantique IA à ajouter et valider séparément. Tous les fichiers natifs restent soumis à leurs licences.</p>
      </aside>
    </div>
  </div>;
}
