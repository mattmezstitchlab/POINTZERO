import {useEffect,useState,type MouseEvent,type ReactNode} from "react";
import {ArrowDownRight,ArrowLeft,ArrowRight,ArrowUpRight,BookOpen,Clock3,Heart,Layers3} from "lucide-react";
import {AIME_EDITORIAL_VERSION,AIME_SIGNATURES,UNIVERSES,UNIVERSE_BY_SLUG,STUDIO_STORIES,STORY_BY_ID, MOTORS,VISION_MILESTONES} from "../lib/aimeEditorial";
import {DEFAULT_LAUNCH,STATUS_LABELS,canEnter,canPreview,validLaunch,type LaunchConfig} from "../lib/launchManifest";
import "./AimeEcosystem.css";

interface Props {page:"aime-home"|"universe-index"|"universe-detail"|"studio-detail"|"vision";onNavigate:(path:string)=>void;onOpenStudio:(route:string)=>void}
function Jump({href,onNavigate,children,className=""}:{href:string;onNavigate:(path:string)=>void;children:ReactNode;className?:string}){
 function click(e:MouseEvent<HTMLAnchorElement>){
  if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  e.preventDefault();onNavigate(href);
 }
 return <a href={href} onClick={click} className={className}>{children}</a>;
}
function SiteHeader({onNavigate}:{onNavigate:(path:string)=>void}){
 return <header className="ae-header">
  <Jump href="/" onNavigate={onNavigate} className="ae-brand" ><span className="ae-symbol" aria-hidden="true">✳</span>AIME<span className="ae-brand-dot">®</span></Jump>
  <nav aria-label="Navigation générale AIME">
   <Jump href="/univers" onNavigate={onNavigate}>Univers</Jump>
   <Jump href="/vision" onNavigate={onNavigate}>La vision</Jump>
   <Jump href="/le-monde-aime" onNavigate={onNavigate}>Le Monde Aime</Jump>
  </nav>
  <Jump href="/pointzero" onNavigate={onNavigate} className="ae-header-cta">POINTZERO <ArrowUpRight size={14}/></Jump>
 </header>;
}
function Signature(){
 const [index,setIndex]=useState(0);
 useEffect(()=>{
  if(typeof matchMedia!=="undefined"&&matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const timer=window.setInterval(()=>setIndex(i=>(i+1)%AIME_SIGNATURES.length),7000);
  return()=>window.clearInterval(timer);
 },[]);
 return <div className="ae-signature" aria-label={AIME_SIGNATURES[0]}>
  <span>Architecture Intelligente</span>
  <span className="ae-signature-variable" aria-hidden="true" key={index}>{AIME_SIGNATURES[index].replace(/^Architecture Intelligente\s*/,"")}</span>
 </div>;
}
function MainHome({onNavigate}:{onNavigate:(path:string)=>void}){
 return <main id="aime" className="ae-home">
  <section className="ae-hero">
   <div className="ae-wrap">
    <div className="ae-hero-intro"><span>LETTRE OUVERTE · UNE ARCHITECTURE EN DEVENIR</span><span>01 / 04</span></div>
    <div className="ae-hero-core">
     <p className="ae-eyebrow">Il était une intention.</p>
     <h1>AIME<span className="ae-hero-star">✳</span></h1>
     <Signature/>
     <p className="ae-hero-lead">Et si ce que nous avons appris, vécu et créé pouvait enfin servir à ce qui vient&nbsp;?</p>
     <a className="ae-scroll-prompt" href="#lettre">Lire la lettre ouverte <ArrowDownRight size={17}/></a>
    </div>
    <div className="ae-hero-base"><span>Une intention. Plusieurs expressions.</span><span>Faites défiler ↓</span></div>
   </div>
  </section>
  <section className="ae-letter" id="lettre" aria-labelledby="ae-letter-title">
   <div className="ae-narrow">
    <p className="ae-kicker">UNE LETTRE À CEUX QUI CRÉENT, VIVENT ET TRANSMETTENT</p>
    <h2 id="ae-letter-title">Nous avons construit tant de choses. Mais elles ne se parlent pas encore.</h2>
    <p>Au fil des années, les idées, les observations, les rencontres et les expériences ont façonné des outils. Chacun a répondu à un besoin. Chacun a créé son propre langage, sa propre mémoire, son propre espace.</p>
    <p>Et pourtant, une question demeure : pourquoi une expérience devrait-elle recommencer à zéro dès qu'elle change de contexte&nbsp;?</p>
    <p>Pourquoi faudrait-il ressaisir ce que nous savons déjà, redécouvrir ce que d'autres ont compris, ou perdre la trace d'une intention lorsqu'elle devient un document, une œuvre, une rencontre ou une action&nbsp;?</p>
    <blockquote>« Il ne s’agit plus de recommencer à zéro. Il s’agit de relier ce qui existe, de comprendre ce qui manque et de rendre visible ce qui devient possible. »</blockquote>
    <p>AIME est le nom donné à cette recherche de continuité. Ce n'est pas un système achevé, ni une promesse que tout est automatisé. C'est une architecture que nous construisons, éprouvons et documentons progressivement.</p>
   </div>
  </section>
  <section className="ae-epochs" aria-labelledby="ae-epochs-title">
   <div className="ae-wrap"><p className="ae-kicker">LE TEMPS COMME FIL CONDUCTEUR</p>
    <h2 id="ae-epochs-title" className="ae-h2">Le passé ne s'efface pas.<br/>Le présent organise.<br/><em>Le futur se prépare.</em></h2>
    <div className="ae-epoch-grid">{[
     ["01","Avant","Des besoins humains, des expériences, des outils séparés. Autant de morceaux précieux qui ne se reconnaissent pas toujours."],
     ["02","Aujourd'hui","Des Univers, des Studios, des prototypes et des moteurs commencent à se relier. Certaines fonctions existent ; d'autres sont encore à démontrer."],
     ["03","Demain","Une personne, une création ou une intention pourrait traverser plusieurs mondes sans perdre son sens, sa provenance et ses autorisations."]
    ].map(([n,title,desc])=><article key={n}><span>{n} / 03</span><h3>{title}</h3><p>{desc}</p></article>)}</div>
   </div>
  </section>
  <section className="ae-architecture" aria-labelledby="ae-architecture-title">
   <div className="ae-wrap"><p className="ae-kicker">L'ARCHITECTURE À TROIS NIVEAUX</p>
    <h2 id="ae-architecture-title" className="ae-h2">Une maison.<br/>Des mondes.<br/>Des instruments.</h2>
    <div className="ae-architecture-rows">
     <Jump onNavigate={onNavigate} href="/vision" className="ae-architecture-row"><span>01</span><div><h3>AIME</h3><p>La maison mère : la vision, les valeurs, l'histoire et la mémoire.</p></div><ArrowUpRight/></Jump>
     <Jump onNavigate={onNavigate} href="/univers" className="ae-architecture-row"><span>02</span><div><h3>Les Univers</h3><p>Les domaines humains : arts, mariage, inclusion, ressources, générations…</p></div><ArrowUpRight/></Jump>
     <Jump onNavigate={onNavigate} href="/pointzero" className="ae-architecture-row"><span>03</span><div><h3>POINTZERO</h3><p>L'atelier de création, ses Studios spécialisés et ses moteurs transversaux.</p></div><ArrowUpRight/></Jump>
    </div>
   </div>
  </section>
  <section className="ae-invitation">
   <div className="ae-narrow">
    <p className="ae-kicker">LA PREMIÈRE PORTE</p>
    <h2>Ce qui compte, ce n'est pas seulement de créer. C'est de pouvoir continuer.</h2>
    <p>En entrant dans AIME, vous découvrirez des intentions documentées, des domaines à explorer et les outils de POINTZERO. Certaines expériences sont déjà utilisables. D'autres appartiennent encore au futur que nous cherchons à construire.</p>
    <Jump href="/univers" onNavigate={onNavigate} className="ae-primary">Entrer dans AIME <ArrowRight size={19}/></Jump>
    <div className="ae-quick"><Jump href="/pointzero" onNavigate={onNavigate}>Découvrir POINTZERO <ArrowUpRight size={15}/></Jump>
     <Jump href="/le-monde-aime" onNavigate={onNavigate}>Rencontrer LE MONDE AIME <ArrowUpRight size={15}/></Jump>
     <Jump href="/atelier" onNavigate={onNavigate}>Retourner à mon Atelier <ArrowUpRight size={15}/></Jump></div>
   </div>
  </section>
 </main>;
}
function PublicLayout({title,kicker,lead,children}:{title:string;kicker:string;lead:string;children:ReactNode}){
 return <main className="ae-content"><div className="ae-wrap">
  <p className="ae-kicker">{kicker}</p><h1 className="ae-page-title">{title}</h1><p className="ae-page-lead">{lead}</p>
  {children}
 </div></main>;
}
function Universes({onNavigate}:{onNavigate:(path:string)=>void}){
 return <PublicLayout title="Des Univers pour la vie réelle." kicker="AIME / NIVEAU 02 — LES UNIVERS"
 lead="Un Univers est un domaine humain. Il accueille des personnes, des projets, des actions et des intentions. Il n'est ni un outil, ni un Studio.">
  <div className="ae-card-grid">{UNIVERSES.map((u,i)=><Jump href={"/univers/"+u.slug} onNavigate={onNavigate} key={u.slug} className="ae-card">
   <span className="ae-card-index">{String(i+1).padStart(2,"0")} / UNIVERS</span><h2>{u.name}</h2><p>{u.intention}</p><span className="ae-card-link">Découvrir <ArrowUpRight size={15}/></span>
  </Jump>)}</div>
  <div className="ae-association"><Heart size={22}/><div><p className="ae-kicker">UNE IDENTITÉ DISTINCTE</p><h2>LE MONDE AIME</h2><p>L'association porte une dimension humaine, culturelle et collective. Sa présentation, ses créations et ses actions disposent d'une place propre, hors du catalogue des Studios.</p></div>
  <Jump href="/le-monde-aime" onNavigate={onNavigate} className="ae-secondary">Découvrir l'association <ArrowUpRight size={16}/></Jump></div>
 </PublicLayout>;
}
function UniverseDetail({slug,onNavigate}:{slug:string;onNavigate:(path:string)=>void}){
 const u=UNIVERSE_BY_SLUG.get(slug);
 if(!u)return <Unknown onNavigate={onNavigate}/>;
 return <PublicLayout kicker="AIME / UNIVERS / INTENTION DOCUMENTÉE" title={u.name} lead={u.intention}>
  <div className="ae-detail-grid"><article><h2>Pourquoi cet Univers existe</h2><p>{u.description}</p>
   <p>Cette page expose un périmètre et une direction, sans présenter ses services futurs comme déjà opérationnels.</p></article>
  <aside><span className="ae-mini-label">ÉTAT</span><p>{u.state}</p><div className="ae-separator"/><span className="ae-mini-label">STUDIOS RELIÉS</span>
   <div className="ae-related">{u.connections.map(id=>{const s=STUDIO_STORIES.find(x=>x.id===id);const base=DEFAULT_LAUNCH.studios.find(x=>x.id===id);return base&&s?<Jump key={id} href={"/studios/"+id} onNavigate={onNavigate}>{base.title} <ArrowUpRight size={14}/></Jump>:null})}</div>
  </aside></div><Jump href="/univers" onNavigate={onNavigate} className="ae-back"><ArrowLeft size={15}/> Tous les Univers</Jump>
 </PublicLayout>;
}
function StudioDetail({slug,config,onNavigate,onOpenStudio}:{slug:string;config:LaunchConfig;onNavigate:(path:string)=>void;onOpenStudio:(route:string)=>void}){
 const story=STORY_BY_ID.get(slug),base=config.studios.find(s=>s.id===slug);
 if(!story||!base)return <Unknown onNavigate={onNavigate}/>;
 const fields=[
 ["01","L'intention",story.intention],["02","Le problème",story.probleme],["03","Le mécanisme",story.mecanisme],
 ["04","L'expérience",story.experience],["05","Les preuves d'avancement",story.proof],["06","La vision future",story.future]
 ];
 const action=canEnter(base)||canPreview(base);
 return <PublicLayout kicker={"POINTZERO / STUDIO "+base.number} title={base.title} lead={base.description}>
  <div className="ae-studio-status"><span>{STATUS_LABELS[base.status]}</span><span>{story.conceptStatus}</span><span>Fiche documentaire · {AIME_EDITORIAL_VERSION}</span></div>
  <div className="ae-studio-sections">{fields.map(([n,label,body])=><article key={n}><span>{n}</span><h2>{label}</h2><p>{body}</p></article>)}</div>
  <div className="ae-detail-grid">
   <article><h2>Connexions dans l'architecture</h2><div className="ae-related">{story.connections.map(id=><Jump key={id} href={"/studios/"+id} onNavigate={onNavigate}>{config.studios.find(s=>s.id===id)?.title||id} <ArrowUpRight size={14}/></Jump>)}</div></article>
   <aside><span className="ae-mini-label">SOURCE TECHNIQUE</span><p>{story.technicalSource}</p>
    <p className="ae-footnote">Référence du code en branche de développement. Cela ne garantit ni un déploiement public ni une certification de conformité.</p>
   </aside>
  </div>
  <div className="ae-studio-actions">
   {action&&base.route?<button className="ae-primary" onClick={()=>onOpenStudio(base.route!)}>{canEnter(base)?"Ouvrir le Studio":"Tester l'aperçu"} <ArrowRight size={17}/></button>:<span className="ae-info">Concept à découvrir · Pas d'accès opérationnel annoncé.</span>}
   <Jump href="/pointzero" onNavigate={onNavigate} className="ae-secondary">POINTZERO et tous ses Studios <ArrowUpRight size={17}/></Jump>
  </div>
 </PublicLayout>;
}
function Vision({config,onNavigate}:{config:LaunchConfig;onNavigate:(path:string)=>void}){
 return <PublicLayout kicker="AIME / DOSSIER VIVANT / ÉDITION 01" title="Une mémoire pour comprendre le chemin." lead="Une chronologie ouverte, des intentions documentées et des sources vérifiables. Un prototype n'est pas une publication ; une date n'est pas une preuve d'exclusivité.">
  <div className="ae-vision-summary"><div><BookOpen/><h2>Documenter les intentions</h2><p>Pourquoi ce concept a-t-il été imaginé ? À quel problème répond-il ?</p></div>
   <div><Clock3/><h2>Distinguer les étapes</h2><p>Conçu, développé, testé et publié sont des états différents.</p></div>
   <div><Layers3/><h2>Conserver la provenance</h2><p>Associer dates, versions, sources, documents et décisions sans dévoiler le privé.</p></div></div>
  <h2 className="ae-section-heading">Premiers repères sourcés</h2>
  <div className="ae-history">{VISION_MILESTONES.slice(1).map(m=><article key={m.title}>
   <time dateTime={m.date}>{m.date}</time><span>{m.status}</span><div><h3>{m.title}</h3><p>{m.source}</p></div>
  </article>)}
  {config.journal.map(m=><article key={m.id}><time dateTime={m.date}>{m.date}</time><span>{m.status}</span><div><h3>{m.title}</h3><p>{m.source}</p></div></article>)}</div>
  <h2 className="ae-section-heading">Les moteurs transversaux</h2>
  <div className="ae-card-grid ae-motors">{MOTORS.map(m=><article className="ae-card" key={m.id}>
   <span className="ae-card-index">MOTEUR / {m.id.toUpperCase()}</span><h3>{m.title}</h3><p>{m.description}</p>
   <div className="ae-related">{m.studioIds.map(id=><Jump href={"/studios/"+id} key={id} onNavigate={onNavigate}>{config.studios.find(s=>s.id===id)?.title||id} <ArrowUpRight size={12}/></Jump>)}</div>
  </article>)}</div>
  <p className="ae-footnote">Le registre public ne contient pas les documents privés ni les données confidentielles. Les liens de code constituent des repères vérifiables, pas une garantie de propriété intellectuelle.</p>
 </PublicLayout>;
}
function Unknown({onNavigate}:{onNavigate:(path:string)=>void}){
 return <PublicLayout kicker="AIME / PAGE NON TROUVÉE" title="Cette intention n'est pas documentée." lead="Aucune fiche n'existe pour cette adresse.">
 <Jump href="/univers" onNavigate={onNavigate} className="ae-primary">Revenir aux Univers <ArrowLeft size={16}/></Jump>
 </PublicLayout>;
}
export default function AimeEcosystem({page,onNavigate,onOpenStudio}:Props){
 const [config,setConfig]=useState<LaunchConfig>(DEFAULT_LAUNCH);
 useEffect(()=>{
  let active=true;
  fetch("/api/pointzero-launch").then(r=>r.ok?r.json():Promise.reject()).then(v=>{
   const parsed=validLaunch(v.config);if(active&&parsed)setConfig(parsed);
  }).catch(()=>undefined);
  return()=>{active=false};
 },[]);
 const slug=(typeof window!=="undefined"?window.location.pathname:"/").split("/")[2]||"";
 return <div className="ae-shell" aria-label="AIME — Architecture mère">
  <SiteHeader onNavigate={onNavigate}/>
  {page==="aime-home"?<MainHome onNavigate={onNavigate}/>:
   page==="universe-index"?<Universes onNavigate={onNavigate}/>:
   page==="universe-detail"?<UniverseDetail slug={slug} onNavigate={onNavigate}/>:
   page==="studio-detail"?<StudioDetail slug={slug} config={config} onNavigate={onNavigate} onOpenStudio={onOpenStudio}/>:
   <Vision config={config} onNavigate={onNavigate}/>}
  <footer className="ae-footer"><div className="ae-wrap"><span>AIME® · Mémoire, intention, transmission</span><span>Version éditoriale {AIME_EDITORIAL_VERSION}</span>
   <div><Jump href="/le-monde-aime" onNavigate={onNavigate}>LE MONDE AIME</Jump><Jump href="/pointzero" onNavigate={onNavigate}>POINTZERO</Jump><Jump href="/vision" onNavigate={onNavigate}>La vision</Jump></div></div>
  </footer>
 </div>;
}
