import { ArrowRight, FileUp, FolderOpen, Grid2X2, Palette, Scissors } from "lucide-react";
import "./CrossStitchHome.css";

export type StitchEntry = "create" | "library" | "prepare" | "stitch";
interface Props {
  projectName: string;
  onOpen: (entry: StitchEntry) => void;
  onImport: (file: File) => void;
}

/** A welcome screen only: opening it never creates a pattern or rewrites a project. */
export default function CrossStitchHome({ projectName, onOpen, onImport }: Props) {
  return <div className="cross-stitch-home">
    <a className="csh-skip" href="#csh-main">Aller au contenu</a>
    <header className="csh-header">
      <a className="csh-brand" href="/" aria-label="Point Zéro, accueil"><span aria-hidden="true">×</span> POINT ZÉRO<span className="csh-brand-detail">STUDIO POINT DE CROIX</span></a>
      <nav aria-label="Navigation point de croix">
        <button onClick={() => onOpen("library")}><FolderOpen size={16} aria-hidden="true"/> Mes ouvrages</button>
        <button onClick={() => onOpen("stitch")}>Ouvrir le studio <ArrowRight size={16} aria-hidden="true"/></button>
      </nav>
    </header>
    <main id="csh-main">
      <section className="csh-hero" aria-labelledby="csh-title">
        <div>
          <p className="csh-eyebrow">VOTRE ATELIER, DU MOTIF À L’OUVRAGE</p>
          <h1 id="csh-title">Du premier motif<br/>à la <em>dernière croix.</em></h1>
          <p className="csh-intro">Créez votre patron, préparez vos fils et suivez votre broderie dans un seul studio de point de croix.</p>
          <div className="csh-actions">
            <button className="csh-primary" onClick={() => onOpen("create")}>Créer mon patron <ArrowRight size={18} aria-hidden="true"/></button>
            <a className="csh-secondary" href="#csh-import">Importer une image ou un patron</a>
          </div>
          <p className="csh-local">Sans compte · Projets conservés sur cet appareil · Atelier utilisable hors ligne après chargement</p>
        </div>
        <figure className="csh-preview">
          <div className="csh-preview-heading"><span>LE MOTIF PREND FORME</span><span aria-hidden="true">× × ×</span></div>
          <img src="/images/grille-roses.png" alt="Motif de roses, exemple pour préparer une grille de point de croix" width="480" height="480"/>
          <figcaption>Une image de départ. Une palette DMC. Votre prochain ouvrage.</figcaption>
        </figure>
      </section>
      <section className="csh-immersive" aria-labelledby="csh-immersive-title">
        <div className="csh-immersive-copy">
          <p className="csh-eyebrow">LE GESTE CRÉATIF, EN GRAND</p>
          <h2 id="csh-immersive-title">Moins de fenêtres.<br/><em>Plus de création.</em></h2>
          <p>Une toile pour dessiner. Des fils à portée de main. Les bons outils, au bon endroit.</p>
          <div className="csh-actions"><button className="csh-primary" onClick={()=>onOpen("create")}>Entrer dans le studio <ArrowRight size={18} aria-hidden="true"/></button><button className="csh-secondary" onClick={()=>onOpen("library")}>Reprendre mon ouvrage</button></div>
        </div>
        <figure className="csh-studio-scene">
          <div className="csh-scene-top"><span>× POINT ZÉRO / STUDIO</span><span>Créer · Préparer · Broder</span></div>
          <div className="csh-scene-body"><div className="csh-scene-tools" aria-hidden="true"><span>✥<small>Main</small></span><span>×<small>Croix</small></span><span>◇<small>Gomme</small></span><span>▧<small>Sélection</small></span></div><div className="csh-scene-art"><img src="/images/grille-roses.png" alt="Motif de roses illustrant la place centrale de la grille dans le studio" width="680" height="680" loading="lazy"/><span className="csh-scene-tag">Chaque croix compte.</span></div></div>
          <div className="csh-scene-floss" aria-hidden="true">{["#7f1936","#c84160","#e48691","#ebc2b7","#e7dfc7","#8b9d72","#435f49","#233e35"].map(color=><span key={color} style={{background:color}}/>)}</div>
          <figcaption>Illustration de l’organisation du studio — pas une capture d’écran ni un ouvrage brodé.</figcaption>
        </figure>
        <div className="csh-proof-row"><article><span>01 / IMAGE</span><h3>Votre idée prend forme.</h3><p>Importez une image ou décrivez votre motif. La génération dépend du service configuré.</p></article><article><span>02 / GRILLE</span><h3>La couleur devient fil.</h3><p>Vérifiez les détails, ajustez la palette DMC et composez votre patron.</p></article><article><span>03 / OUVRAGE</span><h3>À vous de broder.</h3><p>Préparez la toile, exportez ou suivez chaque croix dans le même projet.</p></article></div>
      </section>
      <section className="csh-pdf-feature" aria-labelledby="csh-pdf-title"><div><p className="csh-eyebrow">LE PUZZLE PDF</p><h2 id="csh-pdf-title">Les pages se séparent.<br/>Votre patron se retrouve.</h2><p>Importez votre PDF, recomposez les cartes sur le plateau magnétique et retrouvez le patron assemblé dans votre grille. Contrôlez les raccords et les symboles avant de broder.</p><a className="csh-secondary" href="#csh-import">Importer mon patron PDF <ArrowRight size={16} aria-hidden="true"/></a></div><div className="csh-puzzle-visual" aria-hidden="true">{[1,2,3,4].map(n=><div key={n}><span>PAGE {n}</span><b>× × ×<br/>× × ×<br/>× × ×</b></div>)}</div></section>
      <section className="csh-resume" aria-label="Reprendre un ouvrage">
        <div><p className="csh-eyebrow">PROJET ACTIF SUR CET APPAREIL</p><h2>{projectName}</h2><p>Ouvrez le projet actif, ou retrouvez les ouvrages enregistrés dans votre bibliothèque locale.</p></div>
        <button className="csh-secondary" onClick={() => onOpen("stitch")}>Continuer à broder <ArrowRight size={17} aria-hidden="true"/></button>
      </section>
      <section className="csh-journey" aria-labelledby="csh-journey-title">
        <p className="csh-eyebrow">UN PROJET, TROIS TEMPS</p>
        <h2 id="csh-journey-title">Tout ce qu’il faut pour aller jusqu’au bout.</h2>
        <div className="csh-cards">
          <article><Grid2X2 aria-hidden="true"/><span className="csh-step">01 / CRÉER</span><h3>Un patron qui vous ressemble</h3><p>Grille vierge, motifs à composer, dessin, points fractionnaires et points arrière. Les outils avancés restent à portée de main.</p><button onClick={() => onOpen("create")}>Explorer la création <ArrowRight size={16} aria-hidden="true"/></button></article>
          <article><Palette aria-hidden="true"/><span className="csh-step">02 / PRÉPARER</span><h3>La bonne toile, les bons fils</h3><p>Palette DMC, dimensions de l’ouvrage, estimation des quantités et stock de fils. Préparez votre matériel avant la première croix.</p><button onClick={() => onOpen("prepare")}>Préparer mon ouvrage <ArrowRight size={16} aria-hidden="true"/></button></article>
          <article><Scissors aria-hidden="true"/><span className="csh-step">03 / BRODER</span><h3>Retrouver le fil, simplement</h3><p>Suivi par case, ligne ou bloc, fil actif et journal. Marquez votre avancée sans redessiner le patron.</p><button onClick={() => onOpen("stitch")}>Passer en mode Broder <ArrowRight size={16} aria-hidden="true"/></button></article>
        </div>
      </section>
      <section className="csh-import" id="csh-import" aria-labelledby="csh-import-title">
        <div><p className="csh-eyebrow">PARTEZ DE CE QUE VOUS AIMEZ</p><h2 id="csh-import-title">Une photo, un patron,<br/>un projet à retrouver.</h2><p>Convertissez une image en couleurs DMC, recomposez les pages d’un PDF avec le puzzle magnétique ou ouvrez un projet JSON / OXS existant.</p><p className="csh-note">Vérifiez les détails et les couleurs avant de broder. L’import PDF dépend du document ; un calage peut être nécessaire. Respectez les droits de l’auteur.</p></div>
        <label className="csh-upload"><FileUp size={30} aria-hidden="true"/><strong>Choisir mon fichier</strong><span>PNG, JPEG, WebP, PDF, JSON ou OXS</span><input type="file" aria-label="Importer une image, un PDF ou un projet" accept="image/png,image/jpeg,image/webp,.pdf,.json,.oxs" onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onImport(file); }}/></label>
      </section>
      <aside className="csh-safety" aria-labelledby="csh-safety-title"><h2 id="csh-safety-title">Votre ouvrage mérite une vraie sauvegarde.</h2><p>Le stockage du navigateur n’est pas une sauvegarde permanente : son effacement supprime les projets locaux. Dans le studio, téléchargez régulièrement votre projet JSON depuis Exporter. Les couleurs à l’écran sont indicatives et les quantités de fil estimées.</p><button onClick={() => onOpen("library")}>Retrouver mes ouvrages <ArrowRight size={16} aria-hidden="true"/></button></aside>
    </main>
    <footer className="csh-footer"><span>× POINT ZÉRO — Studio de point de croix</span><span>Créer. Préparer. Broder.</span></footer>
  </div>;
}
