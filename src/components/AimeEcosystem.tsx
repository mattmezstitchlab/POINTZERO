import AimeDomainNavigation from "./AimeDomainNavigation";
import AimeSymbol from "./AimeSymbol";
import {DESIGN_SYSTEM,designCSS} from "../lib/designSystem";
import "../design/components.css";
import AimeProductVisual from "./AimeProductVisual";
import {useEffect,useRef,useState,type MouseEvent,type ReactNode} from "react";
import {ArrowLeft,ArrowRight,ArrowUpRight,BookOpen,Clock3,Heart,Layers3} from "lucide-react";
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
  <Jump href="/" onNavigate={onNavigate} className="ae-brand" ><AimeSymbol name="continuite"/>AIME<span className="ae-brand-dot">®</span></Jump>
  <nav aria-label="Navigation générale AIME">
   <Jump href="/univers" onNavigate={onNavigate}>Univers</Jump>
   <Jump href="/vision" onNavigate={onNavigate}>La vision</Jump>
   <Jump href="/dossier" onNavigate={onNavigate}>Dossier</Jump>
   <Jump href="/espace" onNavigate={onNavigate}>Créer</Jump>
   <Jump href="/le-monde-aime" onNavigate={onNavigate}>Le Monde Aime</Jump>
  </nav>
  <Jump href="/pointzero" onNavigate={onNavigate} className="ae-header-cta">POINTZERO <ArrowUpRight size={14}/></Jump>
 </header>;
}
function Signature({signatures}:{signatures:readonly string[]}){
 const [index,setIndex]=useState(0);
 useEffect(()=>{
  if(typeof matchMedia!=="undefined"&&matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const timer=window.setInterval(()=>setIndex(i=>(i+1)%signatures.length),7000);
  return()=>window.clearInterval(timer);
 },[signatures]);
 return <div className="ae-signature" aria-label={signatures[0]}>
  <span>Architecture Intelligente</span>
  <span className="ae-signature-variable" aria-hidden="true" key={index}>{(signatures[index%signatures.length]||signatures[0]).replace(/^Architecture Intelligente\s*/,"")}</span>
 </div>;
}
function MainHome({onNavigate,signatures}:{onNavigate:(path:string)=>void;signatures:readonly string[]}){
 return <main id="aime" className="ai-home">
  <section className="ai-opening" data-aime-sequence="aime" aria-labelledby="ai-opening-title">
   <div className="ai-copy"><p className="ae-kicker">AIME / UN MÊME PROJET. PLUSIEURS USAGES.</p>
    <h1 id="ai-opening-title">Et si les systèmes<br/>s’adaptaient enfin<br/><em>aux personnes ?</em></h1>
    <Signature signatures={signatures}/>
    <p>Une intention pour commencer. Des outils pour créer. Une mémoire pour continuer.</p>
    <div className="ai-actions"><Jump href="/espace" onNavigate={onNavigate} className="ae-primary">Que souhaitez-vous accomplir ? <ArrowRight size={18}/></Jump><Jump href="/atelier" onNavigate={onNavigate} className="ai-text-link">Explorer l’Atelier <ArrowUpRight size={16}/></Jump></div>
   </div>
   <img className="ai-connections" src="/aime-connections.svg" width="1800" height="1000" fetchPriority="high" alt="Composition originale : trois personnes distinctes reliées par des lignes qui se croisent"/>
  </section>
  <section className="ai-transformation" data-aime-sequence="pointzero" aria-labelledby="ai-intention-title">
   <div className="ai-copy"><p className="ae-kicker">01 / POINTZERO</p><h2 id="ai-intention-title">Tout commence<br/>par ce qui vous anime.</h2><p>Décrivez un projet. Relisez les propositions. Préparez votre dossier local, puis choisissez le prochain geste.</p></div>
   <div className="ai-intention-stage" aria-label="Parcours actuel du Dossier Universel">
    <blockquote>« Je souhaite transmettre<br/>l’improvisation à dix débutants. »</blockquote><span className="ai-flow-line" aria-hidden="true"/>
    <div className="ai-dossier-sample"><span>DOSSIER UNIVERSEL / EXEMPLE</span><h3>Un atelier pour transmettre.</h3><dl><div><dt>Public proposé</dt><dd>10 débutants</dd></div><div><dt>Prochaine étape</dt><dd>Relire les objectifs</dd></div><div><dt>Support</dt><dd>Préparer dans Academy</dd></div></dl><p>Heuristique locale à confirmer · pas une analyse IA</p></div>
   </div>
   <Jump href="/espace" onNavigate={onNavigate} className="ai-text-link">Essayer avec mon intention <ArrowUpRight size={16}/></Jump>
  </section>
  <section className="ai-studios" data-aime-sequence="studios" aria-labelledby="ai-studios-title">
   <div className="ai-copy"><p className="ae-kicker">02 / LES STUDIOS</p><h2 id="ai-studios-title">Des instruments.<br/>Pas des silos.</h2><p>Design, mini-site, musique, broderie, chronologie, documents et Métamorphose : des moteurs à explorer, avec leurs limites réelles.</p></div>
   <AimeProductVisual/>
   <nav className="ai-studio-links" aria-label="Explorer les moteurs existants">{[['design','Design'],['mini-site','Mini-site'],['programme','Chronologie'],['admin','Documents'],['music','Musique'],['embroidery','Broderie'],['metamorphose','Métamorphose']].map(([id,label])=><Jump key={id} href={'/atelier?studio='+id} onNavigate={onNavigate}>{label} <ArrowUpRight size={14}/></Jump>)}</nav>
  </section>
  <section className="ai-source" data-aime-sequence="dossier" aria-labelledby="ai-source-title">
   <div className="ai-copy"><p className="ae-kicker">03 / LE DOSSIER UNIVERSEL</p><h2 id="ai-source-title">Une source.<br/>Plusieurs expressions.</h2><p>Le dossier porte l’identité du projet. Formation en propose une lecture ; Academy peut suivre son titre et ses objectifs, ou conserver vos personnalisations.</p></div>
   <div className="ai-source-map" role="img" aria-label="Le dossier canonique alimente la projection Formation, le support Academy et l’export JSON"><div className="ai-source-center">Un même dossier<span>Intention · objectifs · mémoire</span></div><div className="ai-source-rays" aria-hidden="true"><span>Formation<small>Projection</small></span><span>Academy<small>Support spécialisé</small></span><span>JSON<small>Export du dossier</small></span></div></div>
   <p className="ai-note">Prototype local. Le JSON du dossier n’inclut pas automatiquement les contenus de tous les Studios.</p>
  </section>
  <section className="ai-relations" data-aime-sequence="relations" aria-labelledby="ai-relations-title">
   <div className="ai-copy"><p className="ae-kicker">04 / VISION — PARTAGE SÉCURISÉ NON DISPONIBLE</p><h2 id="ai-relations-title">Se relier.<br/>Sans se confondre.</h2><p>Demain, des espaces personnels pourraient coopérer par choix, avec des droits précis et révocables. Aujourd’hui, ces garanties de partage multi-utilisateur ne sont pas implémentées.</p><Jump href="/vision" onNavigate={onNavigate} className="ai-text-link">Voir la feuille de route <ArrowUpRight size={16}/></Jump></div>
   <div className="ai-orbits" aria-hidden="true"><span>Mon espace</span><span>Nos choix</span><span>Votre espace</span></div>
  </section>
  <section className="ai-continuity" data-aime-sequence="temps" aria-labelledby="ai-continuity-title">
   <div className="ai-time-track" aria-hidden="true"><span>Ce qui nous précède</span><i/><span>Ce qui nous rassemble</span><i/><span>Ce qui devient possible</span></div>
   <div className="ai-copy"><p className="ae-kicker">05 / LE TEMPS RETROUVÉ</p><h2 id="ai-continuity-title">Relier ce qui est séparé.<br/>Préserver ce qui compte.<br/><em>Rendre possible ce qui manque.</em></h2><p>AIME est une architecture en construction. Explorez les outils, gardez une copie de vos créations et décidez de la suite.</p><div className="ai-actions"><Jump href="/espace" onNavigate={onNavigate} className="ae-primary">Commencer un projet <ArrowRight size={18}/></Jump><Jump href="/pointzero" onNavigate={onNavigate} className="ai-text-link">Découvrir POINTZERO <ArrowUpRight size={16}/></Jump></div></div>
  </section>
  <AimeDomainNavigation onNavigate={onNavigate}/>
  <details className="ai-letter-details"><summary>LETTRE OUVERTE — Lire les principes fondateurs</summary>  <section className="ae-letter" id="lettre" aria-labelledby="ae-letter-title">
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
</details>
  <div className="ai-reference-links"><Jump href="/univers" onNavigate={onNavigate}>Explorer les Univers</Jump><Jump href="/dossier" onNavigate={onNavigate}>Dossier de référence</Jump><Jump href="/le-monde-aime" onNavigate={onNavigate}>Le Monde Aime</Jump></div>
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
 const scrollRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let active=true;
  fetch("/api/pointzero-launch").then(r=>r.ok?r.json():Promise.reject()).then(v=>{
   const parsed=validLaunch(v.config);if(active&&parsed)setConfig(parsed);
  }).catch(()=>undefined);
  return()=>{active=false};
 },[]);
 const slug=(typeof window!=="undefined"?window.location.pathname:"/").split("/")[2]||"";
 useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=0;
  document.title=(page==="aime-home"?"AIME® — Une architecture de continuité.":page==="vision"?"La vision · AIME®":page==="studio-detail"?((config.studios.find(x=>x.id===slug)?.title||"Studio")+" · AIME®"):page==="universe-detail"?((UNIVERSE_BY_SLUG.get(slug)?.name||"Univers")+" · AIME®"):"Les Univers · AIME®");
 },[page,slug,config.studios]);
 return <div ref={scrollRef} className="ae-shell" data-aime-design={DESIGN_SYSTEM.version} aria-label="AIME — Architecture mère"><style>{designCSS()}</style>
  <SiteHeader onNavigate={onNavigate}/>
  {page==="aime-home"?<MainHome onNavigate={onNavigate} signatures={config.aimeSignatures??AIME_SIGNATURES}/>:
   page==="universe-index"?<Universes onNavigate={onNavigate}/>:
   page==="universe-detail"?<UniverseDetail slug={slug} onNavigate={onNavigate}/>:
   page==="studio-detail"?<StudioDetail slug={slug} config={config} onNavigate={onNavigate} onOpenStudio={onOpenStudio}/>:
   <Vision config={config} onNavigate={onNavigate}/>}
  <footer className="ae-footer"><div className="ae-wrap"><span>AIME® · Mémoire, intention, transmission</span><span>Version éditoriale {AIME_EDITORIAL_VERSION}</span>
   <div><Jump href="/le-monde-aime" onNavigate={onNavigate}>LE MONDE AIME</Jump><Jump href="/pointzero" onNavigate={onNavigate}>POINTZERO</Jump><Jump href="/vision" onNavigate={onNavigate}>La vision</Jump><Jump href="/dossier" onNavigate={onNavigate}>Dossier de référence</Jump><Jump href="/espace" onNavigate={onNavigate}>Dossier Universel</Jump></div></div>
  </footer>
 </div>;
}
