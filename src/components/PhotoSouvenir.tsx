import { useEffect, useRef, useState } from 'react';
import { asyncRasterToCells, loadImage } from '../lib/convert';
import { FLOSS } from '../lib/dmc';
import { clonePattern, computeStats, ensurePalette, fabricInfo, type Count, type Pattern } from '../lib/pattern';
import { downloadBlob, readProjectFile, saveProjectFile, slugify } from '../lib/io';
import { buildPdf, pdfFileName } from '../lib/pdf';
import { hasSouvenirContent, isSimpleSouvenir, souvenirDimensions, souvenirPattern, souvenirShoppingCsv } from '../lib/photoSouvenir';
import './photo-souvenir.css';

export default function PhotoSouvenir() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [source, setSource] = useState('');
  const [name, setName] = useState('Mon souvenir');
  const [limit, setLimit] = useState(80);
  const [colors, setColors] = useState(12);
  const [count, setCount] = useState<Count>(14);
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [row, setRow] = useState(1); const [column, setColumn] = useState(1);
  const [thread, setThread] = useState(-1);
  const sourceCanvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!image || !sourceCanvas.current) return;
    const target=sourceCanvas.current; const scale=Math.min(1,400/Math.max(image.naturalWidth,image.naturalHeight));
    target.width=Math.round(image.naturalWidth*scale);target.height=Math.round(image.naturalHeight*scale);target.getContext('2d')?.drawImage(image,0,0,target.width,target.height);
  },[image]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const run = async (work: () => Promise<void>) => {
    setBusy(true); setError(''); setNotice('');
    try { await work(); } catch (reason) { if (alive.current) setError(reason instanceof Error ? reason.message : 'Opération impossible.'); }
    finally { if (alive.current) setBusy(false); }
  };
  useEffect(() => {
    if (!pattern || !canvas.current) return;
    const target = canvas.current; target.width = pattern.w * 6; target.height = pattern.h * 6;
    const ctx = target.getContext('2d'); if (!ctx) return;
    ctx.fillStyle = pattern.fabric?.color ?? '#f7f2e8'; ctx.fillRect(0, 0, target.width, target.height);
    for (let i = 0; i < pattern.cross.length; i++) if (pattern.cross[i] >= 0) {
      ctx.fillStyle = FLOSS[pattern.cross[i]].hex; ctx.fillRect(i % pattern.w * 6, Math.floor(i / pattern.w) * 6, 6, 6);
    }
  }, [pattern]);
  const stats = pattern ? computeStats(pattern) : null;
  const fabric = pattern ? fabricInfo(pattern) : null;
  return <main className="souvenir-page">
    <header><a href="/">POINTZERO</a><a href="/atelier?studio=embroidery">Atelier complet ↗</a></header>
    <h1>Une photo.<br />Un souvenir à broder.</h1>
    <p>Photo → motif à vérifier → patron PDF, liste des fils et projet réimportable. Aucun compte ni paiement. Cette page n’écrase pas vos projets existants.</p>
    <p className="souvenir-note">La photo est traitée sur cet appareil, sans envoi par ce parcours. Les couleurs écran et les quantités de fil sont indicatives. Utilisez une image dont vous avez les droits ; le rendu doit être vérifié avant fabrication.</p>
    <fieldset disabled={busy}><legend>1 · Choisir la photo et les paramètres</legend>
      <label>Photo JPG, PNG ou WebP — 12 Mo maximum<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
        const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
        void run(async () => {
          if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 12*1024*1024) throw Error('Choisissez un JPG, PNG ou WebP de 12 Mo maximum.');
          const loaded = await loadImage(file);
          if (!alive.current) return;
          if (loaded.naturalWidth * loaded.naturalHeight > 24_000_000) throw Error('Image limitée à 24 millions de pixels. Réduisez-la avant import.');
          setImage(loaded); setSource(file.name); setNotice('Photo chargée. Générer crée un nouveau motif sans modifier le précédent tant que le calcul n’a pas réussi.');
        });
      }} /></label>
      {image && <canvas ref={sourceCanvas} className="souvenir-source" role="img" aria-label="Photo choisie, avant conversion" />}
      <label>Nom du nouveau motif<input value={name} maxLength={100} onChange={e => setName(e.target.value)} /></label>
      <div className="souvenir-settings"><label>Grand côté (points)<select value={limit} onChange={e => setLimit(Number(e.target.value))}>{[40,60,80,120,160,200].map(v => <option key={v}>{v}</option>)}</select></label>
      <label>Couleurs maximum<select value={colors} onChange={e => setColors(Number(e.target.value))}>{[4,8,12,16,24,32].map(v => <option key={v}>{v}</option>)}</select></label>
      <label>Toile Aida (ct)<select value={count} onChange={e => setCount(Number(e.target.value) as Count)}>{[11,14,16,18].map(v => <option key={v}>{v}</option>)}</select></label></div>
      <button type="button" disabled={!image} onClick={() => void run(async () => {
        if (!image) return;
        const {w,h} = souvenirDimensions(image.naturalWidth, image.naturalHeight, limit);
        const result = await asyncRasterToCells(image, w, h, { maxColors: colors, dropWhite: false, confetti: false });
        const next = souvenirPattern(name, source, w, h, count, result.cross, result.palette);
        if (!alive.current) return;
        setPattern(next); setRow(1); setColumn(1); setThread(-1); setNotice('Motif généré. Vérifiez le rendu et corrigez si nécessaire avant de télécharger.');
      })}>Générer le motif</button>
      <p>Les réglages ci-dessus concernent la prochaine génération. Les téléchargements utilisent uniquement le motif affiché ci-dessous. Les proportions sont conservées ; pas de détourage ni retouche IA.</p>
    </fieldset>
    <fieldset disabled={busy}><legend>Ou reprendre un projet sauvegardé</legend><label>Fichier .pointzero.json<input type="file" accept=".json" onChange={e => {
      const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
      void run(async () => { if(file.size > 20*1024*1024) throw Error('Projet limité à 20 Mo sur cette page.'); const next = await readProjectFile(file); if (!next) throw Error('Projet invalide : le motif affiché est conservé.');
        if(!isSimpleSouvenir(next)) throw Error('Ce projet utilise des dimensions ou points avancés. Ouvrez-le dans l’atelier complet, sans le simplifier ici.');
        if (!alive.current) return; setPattern(next); setRow(1); setColumn(1); setThread(-1); setNotice('Projet réimporté, couleurs et paramètres conservés.'); });
    }} /></label></fieldset>
    {pattern && stats && fabric && <>
      <section aria-labelledby="souvenir-preview"><h2 id="souvenir-preview">2 · Vérifier et corriger — {pattern.name}</h2>
      <p>{pattern.w} × {pattern.h} points · {stats.totals.colors} fils · {stats.totals.cross} croix · Aida {pattern.count}, {pattern.strands} brins</p>
      <p>Motif : {fabric.fw.toFixed(1)} × {fabric.fh.toFixed(1)} cm. Toile avec marges : {fabric.mw.toFixed(1)} × {fabric.mh.toFixed(1)} cm.</p>
      <canvas ref={canvas} className="souvenir-grid" role="img" aria-label={`Aperçu du motif ${pattern.w} par ${pattern.h} points. Correction possible avec les coordonnées ci-dessous.`} />
      <fieldset disabled={busy}><legend>Corriger une case (coordonnées à partir de 1)</legend><div className="souvenir-settings"><label>Ligne<input type="number" min={1} max={pattern.h} value={row} onChange={e=>setRow(Number(e.target.value))} /></label><label>Colonne<input type="number" min={1} max={pattern.w} value={column} onChange={e=>setColumn(Number(e.target.value))} /></label><label>Fil<select value={thread} onChange={e=>setThread(Number(e.target.value))}><option value={-1}>Effacer (toile nue)</option>{pattern.palette.map(idx=><option key={idx} value={idx}>{FLOSS[idx].code} · {FLOSS[idx].name}</option>)}</select></label></div><button type="button" onClick={()=>{
        if(!Number.isInteger(row)||!Number.isInteger(column)||row<1||row>pattern.h||column<1||column>pattern.w){setError('Coordonnées hors du motif.');return;}
        const next = clonePattern(pattern); next.cross[(row-1)*pattern.w+column-1]=thread; if(thread>=0)ensurePalette(next,thread); setPattern(next); setError(''); setNotice(`Case ${row}, ${column} modifiée. Les sorties seront recalculées.`);
      }}>Appliquer à la case</button></fieldset></section>
      <section><h2>3 · Télécharger et garder une sauvegarde</h2><p>Les trois fichiers proviennent du même motif. Quantités estimées, sans déduction de votre stock : modèle de consommation avec marge de chute et démarrages, pas une mesure fabricant. La longueur affichée cumule les brins simples ; un écheveau standard fournit 48 m de brins simples (8 m × 6).</p><div className="souvenir-settings">
        <button disabled={busy || !hasSouvenirContent(pattern)} onClick={()=>void run(async()=>{const blob=await buildPdf(pattern,{bw:true,paper:'a4',overlap:true});if(alive.current){downloadBlob(blob,pdfFileName(pattern,{bw:true,paper:'a4',overlap:true}));setNotice('PDF préparé. Imprimez à 100 %, sans ajustement, puis mesurez la règle de contrôle.');}})}>Patron PDF A4</button>
        <button disabled={busy || !hasSouvenirContent(pattern)} onClick={()=>downloadBlob(new Blob([souvenirShoppingCsv(pattern)],{type:'text/csv;charset=utf-8'}),`${slugify(pattern.name)}-fils.csv`)}>Liste des fils CSV</button>
        <button disabled={busy} onClick={()=>saveProjectFile(pattern)}>Projet réimportable JSON</button>
      </div><p>Cette page ne sauvegarde pas automatiquement : téléchargez le JSON avant de partir. Le PDF seul ne remplace pas ce fichier. Aucun export machine DST/PES n’est produit.</p>
      <details><summary>Liste des fils et estimation</summary><table><caption>Stock non déduit · écheveaux standards de 8 m à 6 brins</caption><thead><tr><th>Code</th><th>Fil</th><th>Brins simples estimés (m)</th><th>Écheveaux</th></tr></thead><tbody>{stats.rows.map(r=><tr key={r.idx}><td>{r.code}</td><td>{r.name}</td><td>{r.meters.toFixed(2)}</td><td>{Math.ceil(r.meters/48)}</td></tr>)}</tbody></table></details>
      <p>Contrôle physique restant : taille des cases, lisibilité des symboles et fidélité des couleurs sur votre imprimante et votre toile.</p></section>
    </>}
    {busy && <p role="status">Traitement en cours…</p>}{notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}
  </main>;
}
