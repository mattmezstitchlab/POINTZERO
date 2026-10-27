import { ArrowRight, FileUp, FolderOpen, Grid2X2, Palette, Scissors, UserPlus, Image as ImageIcon, FileJson } from "lucide-react";
import type { ChangeEvent } from "react";
import StudioDemo from "./StudioDemo";
import "./CrossStitchHome.css";

export type StitchEntry = "create" | "library" | "prepare" | "stitch";
interface Props {
  projectName: string;
  onOpen: (entry: StitchEntry) => void;
  onImport: (file: File) => void;
  onShare?: () => void;
  onShop?: () => void;
}

/** Sélecteur de fichier : transmet le fichier une seule fois et permet de le choisir à nouveau. */
function pick(onImport: (file: File) => void) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onImport(file);
  };
}

/** Un écran d'accueil seulement : l'ouvrir ne crée aucun patron et ne réécrit aucun projet. */
export default function CrossStitchHome({ projectName, onOpen, onImport, onShare, onShop }: Props) {
  return <div className="cross-stitch-home">
    <a className="csh-skip" href="#csh-main">Aller au contenu</a>
    <header className="csh-header">
      <a className="csh-brand" href="/" aria-label="Point Zéro, accueil">
        <span className="csh-mark" aria-hidden="true">×</span>
        <span>Point Zéro<small>Studio de point de croix</small></span>
      </a>
      <nav aria-label="Navigation point de croix">
        {onShop && <button className="csh-link" onClick={onShop}>Patrons<span className="csh-hide-sm">&nbsp;& collections</span></button>}
        <button className="csh-link" onClick={() => onOpen("library")}><FolderOpen size={16} aria-hidden="true"/> Mes ouvrages</button>
        {onShare && <button className="csh-link csh-hide-sm" onClick={onShare}><UserPlus size={16} aria-hidden="true"/> Inviter</button>}
        <button className="csh-link" onClick={() => onOpen("stitch")}>Ouvrir le studio <ArrowRight size={16} aria-hidden="true"/></button>
      </nav>
    </header>

    <main id="csh-main">
      <section className="csh-hero" aria-labelledby="csh-title">
        <p className="csh-eyebrow">Votre atelier, du motif à l’ouvrage</p>
        <h1 id="csh-title">Du premier motif<br/>à la <em>dernière croix.</em></h1>
        <p className="csh-lead">Créez votre patron, préparez vos fils et suivez votre broderie dans un seul studio de point de croix.</p>
        <div className="csh-actions">
          <button className="csh-btn csh-btn-primary" onClick={() => onOpen("create")}>Créer mon patron <ArrowRight size={18} aria-hidden="true"/></button>
          <a className="csh-btn csh-btn-secondary" href="#csh-import">Importer une image ou un patron</a>
        </div>
        <p className="csh-fine">Sans compte · Projets conservés sur cet appareil · Utilisable hors ligne après chargement</p>
      </section>

      <figure className="csh-demo">
        <StudioDemo/>
        <figcaption>Reproduction de l’interface du studio — pas une capture d’écran ni un ouvrage brodé.</figcaption>
      </figure>

      <section className="csh-section" aria-labelledby="csh-journey-title">
        <p className="csh-eyebrow">Un projet, trois temps</p>
        <h2 id="csh-journey-title">Tout ce qu’il faut pour aller jusqu’au bout.</h2>
        <div className="csh-grid-3">
          <article className="csh-card">
            <span className="csh-card-icon"><Grid2X2 size={20} aria-hidden="true"/></span>
            <span className="csh-step">01 · Créer</span>
            <h3>Un patron qui vous ressemble</h3>
            <p>Grille vierge, motifs à composer, dessin, points fractionnaires et points arrière. Les outils avancés restent à portée de main.</p>
            <button className="csh-text-btn" onClick={() => onOpen("create")}>Explorer la création <ArrowRight size={16} aria-hidden="true"/></button>
          </article>
          <article className="csh-card">
            <span className="csh-card-icon"><Palette size={20} aria-hidden="true"/></span>
            <span className="csh-step">02 · Préparer</span>
            <h3>La bonne toile, les bons fils</h3>
            <p>Palette DMC, dimensions de l’ouvrage, estimation des quantités et stock de fils. Préparez votre matériel avant la première croix.</p>
            <button className="csh-text-btn" onClick={() => onOpen("prepare")}>Préparer mon ouvrage <ArrowRight size={16} aria-hidden="true"/></button>
          </article>
          <article className="csh-card">
            <span className="csh-card-icon"><Scissors size={20} aria-hidden="true"/></span>
            <span className="csh-step">03 · Broder</span>
            <h3>Retrouver le fil, simplement</h3>
            <p>Suivi par case, ligne ou bloc, fil actif et journal. Marquez votre avancée sans redessiner le patron.</p>
            <button className="csh-text-btn" onClick={() => onOpen("stitch")}>Passer en mode Broder <ArrowRight size={16} aria-hidden="true"/></button>
          </article>
        </div>
      </section>

      <section className="csh-section" id="csh-import" aria-labelledby="csh-import-title">
        <p className="csh-eyebrow">Partez de ce que vous aimez</p>
        <h2 id="csh-import-title">Une photo, un patron, un projet à retrouver.</h2>
        <div className="csh-import">
          <div className="csh-import-ways">
            <label className="csh-way">
              <span className="csh-card-icon"><ImageIcon size={20} aria-hidden="true"/></span>
              <span><strong>Une photo</strong><span>Convertie en couleurs DMC, puis ajustée avant de broder.</span></span>
              <ArrowRight size={16} aria-hidden="true"/>
              <input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Importer une photo pour la convertir en patron" onChange={pick(onImport)}/>
            </label>
            <label className="csh-way">
              <span className="csh-card-icon"><Grid2X2 size={20} aria-hidden="true"/></span>
              <span><strong><span className="csh-step">Le puzzle PDF</span>Un patron en plusieurs pages</strong><span>Recomposez les pages sur le plateau magnétique, contrôlez les raccords et les symboles.</span></span>
              <ArrowRight size={16} aria-hidden="true"/>
              <input type="file" accept=".pdf,application/pdf" aria-label="Importer un patron PDF multipage" onChange={pick(onImport)}/>
            </label>
            <label className="csh-way">
              <span className="csh-card-icon"><FileJson size={20} aria-hidden="true"/></span>
              <span><strong>Un projet existant</strong><span>Rouvrez une sauvegarde JSON ou un fichier OXS.</span></span>
              <ArrowRight size={16} aria-hidden="true"/>
              <input type="file" accept=".json,.oxs,application/json" aria-label="Ouvrir un projet JSON ou OXS" onChange={pick(onImport)}/>
            </label>
          </div>
          <label className="csh-drop">
            <FileUp size={28} aria-hidden="true"/>
            <strong>Choisir mon fichier</strong>
            <span>PNG, JPEG, WebP, PDF, JSON ou OXS</span>
            <input type="file" aria-label="Importer une image, un PDF ou un projet" accept="image/png,image/jpeg,image/webp,.pdf,.json,.oxs" onChange={pick(onImport)}/>
          </label>
        </div>
        <p className="csh-fine">Vérifiez les détails et les couleurs avant de broder. L’import PDF dépend du document ; un calage peut être nécessaire. Respectez les droits de l’auteur.</p>
      </section>

      <section className="csh-section csh-resume" aria-label="Reprendre un ouvrage">
        <div>
          <p className="csh-eyebrow">Projet actif sur cet appareil</p>
          <h2>{projectName}</h2>
          <p>Reprenez là où vous vous êtes arrêtée, ou invitez quelqu’un à suivre votre ouvrage en lecture.</p>
        </div>
        <div className="csh-actions">
          <button className="csh-btn csh-btn-primary" onClick={() => onOpen("stitch")}>Continuer à broder <ArrowRight size={17} aria-hidden="true"/></button>
          {onShare && <button className="csh-btn csh-btn-secondary" onClick={onShare}><UserPlus size={16} aria-hidden="true"/> Inviter à regarder</button>}
        </div>
      </section>

      <aside className="csh-section csh-safety" aria-labelledby="csh-safety-title">
        <h2 id="csh-safety-title">Votre ouvrage mérite une vraie sauvegarde.</h2>
        <p>Le stockage du navigateur n’est pas une sauvegarde permanente : son effacement supprime les projets locaux. Dans le studio, téléchargez régulièrement votre projet JSON depuis Exporter. Les couleurs à l’écran sont indicatives et les quantités de fil estimées.</p>
        <button className="csh-text-btn" onClick={() => onOpen("library")}>Retrouver mes ouvrages <ArrowRight size={16} aria-hidden="true"/></button>
      </aside>
    </main>

    <footer className="csh-footer"><span><span className="csh-mark" aria-hidden="true">×</span> Point Zéro — Studio de point de croix</span><span>Créer · Préparer · Broder</span></footer>
  </div>;
}
