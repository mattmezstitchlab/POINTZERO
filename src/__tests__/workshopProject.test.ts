import {afterEach,describe,expect,it} from 'vitest';
import {WORKSHOP_PROJECT_KEY,availableWorkshopDocuments,readWorkshopLinks,safeWorkshopLinks,setProjectLinks,workshopBundle} from '../lib/workshopProject';
import {createDesign} from '../lib/designStudio';
import {blankPattern} from '../lib/store';
import {toObject} from '../lib/pattern';
import {makeProgramme,PROGRAMME_STORAGE} from '../lib/programmeCore';
afterEach(()=>localStorage.clear());
describe('Projet commun : liens explicites sans migration',()=>{
 it('rattache plusieurs types, conserve les sources et exporte les valeurs actuelles',()=>{
  const design=createDesign('affiche'),programme=makeProgramme('Jour J','atelier','project');
  const original=JSON.stringify(design);localStorage.setItem('pointzero:design-current:v1',original);
  localStorage.setItem(PROGRAMME_STORAGE,JSON.stringify({version:1,programmes:[programme]}));
  const pattern=toObject(blankPattern());const docs=availableWorkshopDocuments(pattern);
  expect(docs.map(d=>d.kind)).toEqual(['design','embroidery','programme']);
  setProjectLinks('project',docs.map(({kind,id,name})=>({kind,id,name})));
  expect(localStorage.getItem('pointzero:design-current:v1')).toBe(original);
  localStorage.setItem('pointzero:design-current:v1',JSON.stringify({...design,name:'Affiche modifiée'}));
  const bundle=workshopBundle({id:'project',name:'Mariage'},readWorkshopLinks().projects.project,availableWorkshopDocuments(pattern));
  expect(bundle.documents[0].name).toBe('Affiche modifiée');
  expect(bundle.documents).toHaveLength(3);
  setProjectLinks('project',[]);
  expect(localStorage.getItem('pointzero:design-current:v1')).toContain('Affiche modifiée');
 });
 it('refuse de remplacer les liens corrompus ou futurs',()=>{
  for(const raw of ['invalid',JSON.stringify({version:2,projects:{}})]){
   localStorage.setItem(WORKSHOP_PROJECT_KEY,raw);
   expect(()=>setProjectLinks('project',[])).toThrow();expect(localStorage.getItem(WORKSHOP_PROJECT_KEY)).toBe(raw);
  }
 });
 it('refuse les doublons et les sources absentes, sans exporter silencieusement un dossier partiel',()=>{
  const link={kind:'design' as const,id:'d',name:'Création'};
  expect(safeWorkshopLinks({version:1,projects:{p:[link,link]}})).toBeNull();
  expect(()=>workshopBundle({id:'p',name:'Projet'},[link],[])).toThrow('indisponible');
  localStorage.setItem('pointzero:design-current:v1','invalid');
  expect(()=>availableWorkshopDocuments(null)).toThrow();
  expect(localStorage.getItem('pointzero:design-current:v1')).toBe('invalid');
 });
});
