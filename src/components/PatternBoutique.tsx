import { useMemo, useState, useRef, useEffect } from "react";
import { ArrowLeft, ArrowRight, Search, ShoppingBag, SlidersHorizontal, Sparkles, ShieldCheck, Layers3, Download, X, LockKeyhole } from "lucide-react";
import "./PatternBoutique.css";

type Collection = "Félins" | "Oiseaux" | "Céleste" | "Objets & Maison" | "Monogrammes" | "Signature";
type Level = "Débutant" | "Intermédiaire" | "Expert";
interface Product { id: string; title: string; collection: Collection; level: Level; width: number; height: number; maxColors: number; price: number; symbol: string; ink: string; description: string; }
const definitions: {collection:Collection; names:string[]; symbol:string; ink:string; level:Level; base:number}[] = [
  {collection:"Félins",names:["Le chat à la fenêtre","Chat noir, nuit claire","Le félin de velours","Deux chats, un dimanche"],symbol:"♧",ink:"#c5b0a0",level:"Intermédiaire",base:690},
  {collection:"Oiseaux",names:["Le rouge-gorge d'hiver","L'hirondelle libre","La mésange du jardin","Les oiseaux du matin"],symbol:"✦",ink:"#b7c9ab",level:"Intermédiaire",base:790},
  {collection:"Céleste",names:["Lune de minuit","Solstice","Constellation intime","Le cercle des étoiles"],symbol:"☾",ink:"#c5b8ed",level:"Débutant",base:590},
  {collection:"Objets & Maison",names:["La machine à écrire","L'atelier du dimanche","La théière en porcelaine","Fenêtre sur la campagne"],symbol:"⌂",ink:"#c8afa0",level:"Intermédiaire",base:790},
  {collection:"Monogrammes",names:["L'initiale botanique","L'alphabet atelier","Les deux initiales","La date précieuse"],symbol:"A",ink:"#c5d0bf",level:"Débutant",base:590},
  {collection:"Signature",names:["Rond noir","Architecture du silence","Le fil invisible","La géométrie des jours"],symbol:"◉",ink:"#d3bd93",level:"Expert",base:990}
];
export const PRODUCT_CATALOG: Product[] = definitions.flatMap((group,g)=>group.names.map((title,i)=>({
  id:"pz-"+(g+1)+"-"+(i+1),title,collection:group.collection,
  level:i===3?"Expert":group.level,width:90+i*20,height:100+i*12,
  maxColors:12+i*6,price:group.base+i*100,
  symbol:group.symbol,ink:group.ink,
  description:"Concept éditorial de la collection "+group.collection.toLowerCase()+". Patron et grille DMC à réaliser et contrôler avant publication."
})));
const euro=(c:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(c/100);
const collections=["Tout",...definitions.map(x=>x.collection)] as const;
function MotifVisual({item}: {item:Product}){
  return <div className="pb-motif" style={{"--motif-ink":item.ink} as React.CSSProperties} aria-hidden="true">
    <span className="pb-symbol">{item.symbol}</span><span className="pb-grid-overlay"/>
    <span className="pb-cross-accent">× × ×</span>
  </div>;
}
export default function PatternBoutique({onBack,onCreate,onGenerate}:{onBack:()=>void;onCreate:()=>void;onGenerate:()=>void}){
 const [query,setQuery]=useState("");const [category,setCategory]=useState<string>("Tout");const [level,setLevel]=useState("Tout");const [selected,setSelected]=useState<Product|null>(null);
 const railRef=useRef<HTMLDivElement>(null);
 const [view,setView]=useState<"mosaic"|"horizontal">("mosaic");
 const [photo,setPhoto]=useState<string|null>(null);
 useEffect(()=>()=>{if(photo)URL.revokeObjectURL(photo)},[photo]);
 const filtered=useMemo(()=>PRODUCT_CATALOG.filter(p=>(category==="Tout"||p.collection===category)&&(level==="Tout"||p.level===level)&&((p.title+" "+p.collection).toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr")))),[category,level,query]);
 return <div className="pattern-boutique">
  <header className="pb-header"><button onClick={onBack} className="pb-back"><ArrowLeft size={17}/> Point Zéro</button><span className="pb-mark">× ÉDITIONS</span><button className="pb-create" onClick={onGenerate}><LockKeyhole size={15}/> Atelier privé</button></header>
  <main><section className="pb-hero"><p className="pb-eyebrow">POINT ZÉRO / ÉDITIONS</p><h1>Des motifs qui<br/><em>ont quelque chose à dire.</em></h1><p>Des collections originales à transformer en patrons de point de croix. Explorez les 24 premières directions éditoriales.</p><div className="pb-actions"><button onClick={onCreate}>Créer mon propre motif <ArrowRight size={16}/></button><a href="#catalogue">Explorer les collections <ArrowRight size={16}/></a></div><p className="pb-disclosure"><ShieldCheck size={15}/> Collection en préparation : visuels conceptuels, aucun patron disponible à l'achat pour le moment.</p></section>
  <section className="pb-catalog" id="catalogue"><div className="pb-section-heading"><div><p className="pb-eyebrow">BIBLIOTHÈQUE ÉDITORIALE</p><h2>Les collections <span>({filtered.length})</span></h2></div><span className="pb-aside-note">24 concepts · 6 univers</span></div>
  <div className="pb-filters"><label className="pb-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un motif…" aria-label="Rechercher un motif"/></label><label className="pb-select"><SlidersHorizontal size={16}/><select aria-label="Difficulté" value={level} onChange={e=>setLevel(e.target.value)}><option>Tout</option><option>Débutant</option><option>Intermédiaire</option><option>Expert</option></select></label></div>
  <nav className="pb-categories" aria-label="Collections">{collections.map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</nav>
  <section className="pb-featured" aria-labelledby="featured-title"><div className="pb-featured-header"><div><p className="pb-eyebrow">À DÉCOUVRIR</p><h2 id="featured-title">Des histoires à broder.</h2></div><div className="pb-rail-controls"><button aria-label="Défiler les patrons vers la gauche" onClick={()=>railRef.current?.scrollBy({left:-370,behavior:"smooth"})}><ArrowLeft size={19}/></button><button aria-label="Défiler les patrons vers la droite" onClick={()=>railRef.current?.scrollBy({left:370,behavior:"smooth"})}><ArrowRight size={19}/></button></div></div><div className="pb-featured-rail" ref={railRef}>{PRODUCT_CATALOG.filter((_,i)=>i%4===0).map(item=><button key={item.id} className="pb-featured-card" onClick={()=>setSelected(item)}><MotifVisual item={item}/><span>{item.collection}</span><strong>{item.title}</strong><small>Concept à développer</small></button>)}</div></section>
  <div className="pb-view-choice" role="group" aria-label="Présentation du catalogue"><span>Explorer les 24 propositions</span><div><button aria-pressed={view==="mosaic"} onClick={()=>setView("mosaic")}>Mosaïque</button><button aria-pressed={view==="horizontal"} onClick={()=>setView("horizontal")}>Défilement</button></div></div>
  <div className={view==="horizontal"?"pb-grid pb-grid-horizontal":"pb-grid"}>{filtered.map(item=><button key={item.id} className="pb-product" onClick={()=>setSelected(item)} aria-label={"Découvrir le concept "+item.title}><MotifVisual item={item}/><div className="pb-product-info"><span>{item.collection} / {item.level}</span><h3>{item.title}</h3><small>Projet éditorial · prix envisagé {euro(item.price)}</small></div></button>)}</div>
  {!filtered.length&&<p>Aucun concept ne correspond à ces filtres.</p>}</section>
  <section className="pb-human" aria-labelledby="pb-human-title"><div className="pb-human-copy"><p className="pb-eyebrow">DERRIÈRE CHAQUE CROIX</p><h2 id="pb-human-title">Et surtout,<br/><em>des mains, des histoires.</em></h2><p>La broderie n'est pas seulement un fichier : c'est du temps, une matière, un geste et une personne. Les prochains portraits et ouvrages seront réalisés avec des brodeuses participantes, avec leur accord.</p><p className="pb-human-note">Prévisualisez votre ouvrage ici, sans publication ni transfert de photo.</p><label className="pb-human-upload">Montrer mon ouvrage<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const file=e.target.files?.[0];e.target.value="";if(!file)return;if(file.size>8*1024*1024){alert("Image limitée à 8 Mo.");return}setPhoto(URL.createObjectURL(file))}}/></label></div><div className="pb-human-frame">{photo?<img src={photo} alt="Photographie de votre ouvrage choisie sur cet appareil"/>:<div className="pb-human-placeholder"><span>×</span><strong>Les ouvrages ont une histoire.</strong><p>Votre photo apparaîtra ici.</p></div>}</div></section>
  <section className="pb-process"><p className="pb-eyebrow">DE L'IDÉE AU PATRON</p><h2>Créer. Vérifier. Éditer.</h2><div>{[["01","Imaginer","Une composition, une intention, un motif."],["02","Composer","Une grille, une palette DMC, des points maîtrisés."],["03","Contrôler","Lisibilité, confettis, tailles et quantité de fils."],["04","Publier","Un PDF testé, une fiche produit et les droits clarifiés."]].map(x=><article key={x[0]}><span>{x[0]}</span><h3>{x[1]}</h3><p>{x[2]}</p></article>)}</div><button onClick={onGenerate}><Sparkles size={17}/> Accéder au générateur réservé</button></section>
  <footer>POINT ZÉRO · ÉDITIONS <span>Catalogue de prépublication — aucun paiement en ligne activé.</span></footer></main>
  {selected&&<div className="pb-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><section className="pb-detail" role="dialog" aria-modal="true" aria-labelledby="pb-detail-title"><button className="pb-close" onClick={()=>setSelected(null)} aria-label="Fermer"><X size={20}/></button><MotifVisual item={selected}/><div><p className="pb-eyebrow">{selected.collection} · {selected.level}</p><h2 id="pb-detail-title">{selected.title}</h2><p>{selected.description}</p><dl><div><dt>Format envisagé</dt><dd>{selected.width} × {selected.height} points</dd></div><div><dt>Palette cible</dt><dd>Jusqu'à {selected.maxColors} fils</dd></div><div><dt>Prix indicatif</dt><dd>{euro(selected.price)}</dd></div><div><dt>Livraison</dt><dd>PDF, grille symboles, liste DMC — à réaliser</dd></div></dl><p className="pb-disclosure"><LockKeyhole size={15}/> Produit non publié : ni achat ni téléchargement disponibles.</p><button onClick={()=>{setSelected(null);onGenerate()}}>Créer un patron dans cet esprit <Sparkles size={16}/></button></div></section></div>}
 </div>
}
