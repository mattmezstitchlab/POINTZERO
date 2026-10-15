import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, FileSearch, GitBranch, Grid2X2, ShieldAlert } from "lucide-react";
import FragmentGridWorkspace from "./FragmentGridWorkspace";
import { allowedFragmentUrl, readFragments, type FragmentCollection } from "../lib/fragmentGrid";

interface ScanObservation {id:string;title:string;evidence:string;status:string}
interface ScanResult {title:string;url:string;fragments:unknown[];findings:ScanObservation[];limitations:string[]}
const field="w-full rounded-[5px] border border-white/20 bg-[#242427] px-3 py-2 text-xs text-white placeholder:text-white/40 outline-none focus:border-white/60";
export default function MetamorphoseStudio({onBack,onCircle,onGame}:{onBack:()=>void;onCircle:()=>void;onGame:()=>void}){
 const [url,setUrl]=useState("");
 const [code,setCode]=useState("");
 const [consent,setConsent]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [collection,setCollection]=useState<FragmentCollection|null>(null);
 const [report,setReport]=useState<ScanResult|null>(null);
 const [section,setSection]=useState<"source"|"report">("source");
 async function scan(e:FormEvent){
  e.preventDefault();
  if(!allowedFragmentUrl(url)){setError("URL HTTPS publique requise.");return}
  if(!consent){setError("Confirmez votre autorisation d'inspecter ce site.");return}
  if(!code){setError("Le code du scanner privé est nécessaire.");return}
  setBusy(true);setError("");
  try{
   const res=await fetch("/api/metamorphose-scan",{
     method:"POST",headers:{"Content-Type":"application/json","X-Pointzero-Scan-Code":code},
     body:JSON.stringify({url,authorized:true})
   });
   const data=await res.json() as ScanResult & {error?:string};
   if(!res.ok)throw Error(data.error||"Analyse non disponible.");
   const parsed=readFragments({name:data.title,version:1,fragments:data.fragments});
   if(!parsed)throw Error("Le serveur a renvoyé des fragments non reconnus.");
   setCollection(parsed);setReport(data);setSection("report");
  }catch(e){setError(e instanceof Error?e.message:"Scanner indisponible.");}
  finally{setBusy(false)}
 }
 return <div className="fixed inset-0 z-40 flex h-[100dvh] flex-col overflow-hidden bg-[#0b0b0d] text-white">
  <header className="flex h-[58px] shrink-0 items-center justify-between gap-3 border-b border-white/15 px-3">
   <div className="flex min-w-0 items-center gap-2">
    <button aria-label="Retour aux studios" onClick={onBack} className="grid size-9 place-items-center rounded-[5px] border border-white/20"><ArrowLeft size={17}/></button>
    <div className="min-w-0"><h1 className="truncate text-[14px] font-semibold">× POINTZERO / MÉTAMORPHOSE</h1>
     <p className="hidden text-[11px] text-white/50 sm:block">Une URL · Des fragments · Des transformations · Des preuves</p></div>
   </div>
   <div className="flex shrink-0 gap-2">
    <button onClick={onCircle} className="flex min-h-9 items-center gap-1.5 rounded-[5px] border border-white/20 px-3 text-xs"><GitBranch size={14}/> <span className="hidden sm:inline">RippleCircle</span><ArrowRight size={12}/></button>
    <button onClick={onGame} className="min-h-9 rounded-[5px] border border-white/20 px-3 text-xs">Studio Game ↗</button>
   </div>
  </header>
  <div className="flex min-h-0 flex-1">
   <aside aria-label="Point Zéro Métamorphose" className="thin-scroll hidden w-[252px] shrink-0 overflow-y-auto border-r border-white/15 p-3 text-white lg:block">
    <div className="mb-4 flex items-center justify-between"><h2 className="text-[12px] font-semibold">POINT ZÉRO</h2><Grid2X2 size={15} className="text-white/50"/></div>
    <div className="mb-4 flex gap-1">
      <button aria-pressed={section==="source"} onClick={()=>setSection("source")} className={"flex-1 rounded-[4px] px-2 py-2 text-xs "+(section==="source"?"bg-white text-black":"border border-white/20")}>Source</button>
      <button aria-pressed={section==="report"} onClick={()=>setSection("report")} className={"flex-1 rounded-[4px] px-2 py-2 text-xs "+(section==="report"?"bg-white text-black":"border border-white/20")}>Diagnostic</button>
    </div>
    {section==="source"?<form className="space-y-3" onSubmit={e=>void scan(e)}>
      <p className="text-[11px] leading-relaxed text-white/60">Entrez l'adresse de votre site. Les composants HTML reconnus rejoignent directement la grille centrale.</p>
      <label className="block text-[11px] text-white/70">URL du site
        <input aria-label="URL à décomposer" className={field+" mt-1"} type="url" placeholder="https://mon-site.fr" value={url} onChange={e=>setUrl(e.target.value)} required/>
      </label>
      <label className="block text-[11px] text-white/70">Code d'accès au scanner privé
        <input aria-label="Code de scan privé" className={field+" mt-1"} type="password" autoComplete="off" value={code} onChange={e=>setCode(e.target.value)}/>
      </label>
      <label className="flex gap-2 text-[11px] leading-relaxed text-white/70"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Je suis autorisé à inspecter ce site.</label>
      <button type="submit" disabled={busy} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[5px] bg-white px-3 text-xs font-semibold text-black disabled:opacity-50">
        <FileSearch size={15}/>{busy?"Propagation en cours…":"Propager dans la grille"}
      </button>
      {error&&<p role="alert" className="rounded-[5px] bg-red-950/30 p-3 text-xs text-red-100">{error}</p>}
      <p className="text-[10px] leading-relaxed text-white/45">Scanner serveur de laboratoire : HTML statique, une page. Il ne remplace ni un navigateur ni un audit juridique.</p>
    </form>:<div className="space-y-3">
      <p className="text-xs text-white/65">{report?report.findings.length+" point(s) à revoir sur "+report.url:"Analyse non lancée."}</p>
      {report?.findings.map(issue=><div key={issue.id} className="rounded-[5px] border border-white/15 p-2 text-[11px]">
        <strong className="text-white/90">{issue.title}</strong><p className="mt-2 leading-relaxed text-white/55">{issue.evidence}</p>
      </div>)}
      {report?.limitations.map(l=><p key={l} className="text-[10px] leading-relaxed text-white/40">• {l}</p>)}
      <button onClick={()=>setSection("source")} className="w-full rounded-[5px] border border-white/20 p-2 text-xs">Nouvelle source</button>
    </div>}
    <div className="mt-8 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-white/55">
      <ShieldAlert size={16} className="mb-2"/>
      <strong className="block text-white/70">Source ≠ Fragment ≠ Composition</strong>
      Une modification de grille ne modifie jamais le site d'origine. Les JSON restent compatibles avec l'onglet Grille du Studio Design.
    </div>
   </aside>
   <div className="flex min-w-0 flex-1 flex-col">
    <div className="border-b border-white/15 p-2 lg:hidden">
      <details className="rounded-[5px] border border-white/15 p-2"><summary className="cursor-pointer text-xs">Point Zéro · Scanner une URL</summary>
      <form className="mt-3 grid gap-2" onSubmit={e=>void scan(e)}>
       <input aria-label="URL à décomposer" className={field} type="url" placeholder="https://mon-site.fr" value={url} onChange={e=>setUrl(e.target.value)}/>
       <input aria-label="Code de scan privé" className={field} type="password" value={code} onChange={e=>setCode(e.target.value)} placeholder="Code privé"/>
       <label className="flex gap-2 text-xs"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Site autorisé</label>
       <button disabled={busy} className="rounded-[5px] bg-white p-2 text-xs text-black">Propager</button>{error&&<p role="alert" className="text-xs text-red-200">{error}</p>}
      </form></details>
    </div>
    <div className="flex min-h-0 flex-1">
     <FragmentGridWorkspace incoming={collection}/>
    </div>
   </div>
  </div>
 </div>;
}
