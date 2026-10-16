import config from '../../vercel.json';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import UnifiedWorkshop from '../components/UnifiedWorkshop';
import {entryStudio} from '../lib/entryNavigation';
(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let root:Root|undefined;let host:HTMLDivElement|undefined;
afterEach(()=>{act(()=>root?.unmount());host?.remove();});
describe('Atelier commun non destructif',()=>{
 it('ouvre les outils et refuse les routes privées',()=>{
  expect(config.rewrites).toContainEqual({source:'/atelier-unifie',destination:'/index.html'});
  expect(entryStudio('','','/atelier-unifie')).toBe('design');
  for(const mode of ['design','embroidery','programme','one-space'])expect(entryStudio('?studio='+mode,'','/atelier-unifie')).toBe(mode);
  expect(entryStudio('?studio=manifest-admin','','/atelier-unifie')).toBe('design');
  expect(entryStudio('?studio=unknown','','/atelier-unifie')).toBe('design');
  expect(entryStudio('?studio=embroidery','','/atelier')).toBe('embroidery');
 });
 it('conserve le contexte et expose les actions sans toucher au stockage',()=>{
  localStorage.setItem('pointzero:design-current:v1','existing bytes');
  const choose=vi.fn(),project=vi.fn();host=document.createElement('div');document.body.append(host);root=createRoot(host);
  act(()=>root?.render(<UnifiedWorkshop active="embroidery" onChoose={choose} projects={[{id:'p1',name:'Mariage'}]} projectId="p1" onProject={project} onExit={vi.fn()}><div>Éditeur conservé</div></UnifiedWorkshop>));
  expect(host.querySelector('select')?.value).toBe('p1');
  const buttons=Array.from(host.querySelectorAll('nav button'));
  expect(buttons.filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>b.textContent)).toEqual(['Broder']);
  act(()=>buttons[2].dispatchEvent(new MouseEvent('click',{bubbles:true})));
  expect(choose).toHaveBeenCalledWith('programme');
  const select=host.querySelector('select')!;act(()=>{select.value='';select.dispatchEvent(new Event('change',{bubbles:true}));});
  expect(project).toHaveBeenCalledWith('');
  expect(host.textContent).toContain('Éditeur conservé');
  expect(localStorage.getItem('pointzero:design-current:v1')).toBe('existing bytes');
  localStorage.clear();
 });
});
