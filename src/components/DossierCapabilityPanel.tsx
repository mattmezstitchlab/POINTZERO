import {useState} from 'react';
import {inspectStoredDossierCapability,proposeDossierNeed,type DossierCapabilityReport} from '../lib/dossierCapabilities';
import {readDossier} from '../lib/universalDossier';
import {exportNeeds,type DevelopmentNeed} from '../lib/developmentNeeds';
const labels={immédiat:'Réalisable immédiatement',composition:'Réalisable par composition',développement:'Réalisable après développement','à-vérifier':'À vérifier','non-réalisable':'Non réalisable actuellement'};
export default function DossierCapabilityPanel({dossierId}:{dossierId:string}){
 const [target,setTarget]=useState('academy'),[report,setReport]=useState<DossierCapabilityReport|null>(null);
 const [need,setNeed]=useState<DevelopmentNeed|null>(null),[error,setError]=useState('');
 return <section aria-label="Diagnostic des capacités AIME">
  <h3>Capacités du dossier · prototype local</h3>
  <p>Diagnostic sans sauvegarde ni exécution. Cible structurée à confirmer ; pas une analyse IA.</p>
  <label>Résultat souhaité <input value={target} onChange={e=>{setTarget(e.target.value);setReport(null);setNeed(null);setError('')}}/></label>
  <p>Exemples : academy, formation, dossier-json. Une autre cible peut révéler un besoin à cadrer.</p>
  <button type="button" onClick={()=>{try{setReport(inspectStoredDossierCapability(dossierId,target,true));setNeed(null);setError('')}catch(e){setReport(null);setError(String(e))}}}>Confirmer la cible et diagnostiquer</button>
  {error&&<p role="alert">{error}</p>}
  {report&&<div role="status"><strong>{labels[report.diagnostic.status]}</strong><p>{report.diagnostic.reason}</p>
   <p>{report.diagnostic.path.join(' → ')}</p><p>Support Academy existant : {report.academyHealth}. Préparer un support ne signifie pas le publier.</p>
   {report.limits.map(x=><p key={x}>{x}</p>)}
   {report.diagnostic.status==='développement'&&<button type="button" onClick={()=>{try{const s=readDossier(dossierId);if(!s)throw Error('Dossier introuvable');setNeed(proposeDossierNeed(s,target,'need-'+crypto.randomUUID(),new Date().toISOString()));setError('')}catch(e){setError(String(e))}}}>Préparer une proposition de besoin (sans sauvegarde)</button>}
  </div>}
  {need&&<label>Proposition JSON à copier avant de quitter — non enregistrée<textarea readOnly value={exportNeeds([need])} rows={10}/></label>}
 </section>;
}
