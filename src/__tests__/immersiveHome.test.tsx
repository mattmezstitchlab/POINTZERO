import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeAll,expect,it,vi} from 'vitest';
import AimeEcosystem from '../components/AimeEcosystem';
beforeAll(()=>{(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();localStorage.clear()});
it('six séquences honnêtes, rendu des moteurs sans écriture et accès manuel',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({config:null})})));
 const write=vi.spyOn(Storage.prototype,'setItem'),navigate=vi.fn();
 const node=document.createElement('div');document.body.append(node);const root=createRoot(node);
 try{
 await act(async()=>root.render(<AimeEcosystem page="aime-home" onNavigate={navigate} onOpenStudio={vi.fn()}/>));
 expect(node.querySelectorAll('[data-aime-sequence]')).toHaveLength(6);
 expect(node.querySelectorAll('h1')).toHaveLength(1);
 expect(node.textContent).toContain('aux personnes ?');
 expect(node.textContent).toContain('PARTAGE SÉCURISÉ NON DISPONIBLE');
 expect(node.textContent).toContain('pas une analyse IA');
 expect(node.querySelector('iframe')?.getAttribute('sandbox')).toBe('');
 expect(node.querySelector('iframe')?.srcdoc).toContain('Camille &amp; Gabriel');
 for(const img of node.querySelectorAll('img')){expect(img.alt.length).toBeGreaterThan(0);expect(img.getAttribute('width')).toBeTruthy();expect(img.getAttribute('height')).toBeTruthy()}
 expect(write).not.toHaveBeenCalled();
 const link=node.querySelector('a[href="/atelier?studio=mini-site"]')!;
 await act(async()=>link.dispatchEvent(new MouseEvent('click',{bubbles:true})));
 expect(navigate).toHaveBeenCalledWith('/atelier?studio=mini-site');
 expect(node.querySelector('details')?.textContent).toContain('Nous avons construit tant de choses');
 }finally{await act(async()=>root.unmount());node.remove()}
});
