import { preparePhotoHandoff } from '../lib/photoHandoff';
import { describe, expect, it } from 'vitest';
import { quantizePixels } from '../lib/quantize';
import { computeStats, fromObject, toObject } from '../lib/pattern';
import { FLOSS } from '../lib/dmc';
import { buildPdf } from '../lib/pdf';
import { shoppingList } from '../lib/library';
import { isSimpleSouvenir, souvenirDimensions, souvenirPattern, souvenirShoppingCsv } from '../lib/photoSouvenir';
import { pageCount, pdfText } from './helpers';

describe('Parcours photo souvenir', () => {
  it('préserve les proportions y compris un portrait, borné sur les deux côtés', () => {
    expect(souvenirDimensions(1200, 1800, 120)).toEqual({w:80,h:120});
    expect(souvenirDimensions(1800, 1200, 120)).toEqual({w:120,h:80});
    expect(() => souvenirDimensions(0, 10, 80)).toThrow();
    expect(() => souvenirDimensions(100, 100, 201)).toThrow();
  });
  it('convertit un raster, conserve les données au réimport et produit PDF et achats cohérents', async () => {
    const w=40,h=60,pixels=new Uint8ClampedArray(w*h*4);
    for(let i=0;i<w*h;i++){ const color=i%w<w/2?[200,40,65]:[30,70,150]; pixels.set([...color,255],i*4); }
    const result=quantizePixels(pixels,w,h,{maxColors:4,dropWhite:false,confetti:false});
    const original=souvenirPattern('Portrait test','portrait-test.png',w,h,14,result.cross,result.palette);
    original.cross[0]=-1; // Correction must reach all outputs.
    const restored=fromObject(JSON.parse(JSON.stringify(toObject(original))));
    expect(restored).not.toBeNull();
    expect(restored!.cross).toEqual(original.cross);
    expect(restored!.palette).toEqual(original.palette);
    expect(restored!.fabric).toEqual(original.fabric);
    expect(restored!.provenance).toEqual(original.provenance);
    expect([restored!.w, restored!.h, restored!.count, restored!.strands]).toEqual([original.w, original.h, original.count, original.strands]);
    expect(computeStats(restored!)).toEqual(computeStats(original));
    const stats=computeStats(restored!);
    expect(stats.totals.cross).toBe(w*h-1);
    const csv=souvenirShoppingCsv(restored!);
    const purchases=shoppingList([restored!],{});
    for(const row of stats.rows){
      expect(csv).toContain(`"${row.code}"`);
      expect(purchases.find(p=>p.code===row.code)?.meters).toBeCloseTo(row.meters,8);
      expect(purchases.find(p=>p.code===row.code)?.buy).toBe(Math.ceil(row.meters/48));
    }
    const text=await pdfText(await buildPdf(restored!,{bw:true,paper:'a4',overlap:true}));
    expect(text).toContain('%PDF'); expect(pageCount(text)).toBeGreaterThan(1);
    for(const index of original.palette) expect(text).toContain(FLOSS[index].code);
    expect(csv).toContain('stock non déduit');
  });
  it('refuse une reprise simplifiée qui ferait disparaître des points avancés', () => {
    const pattern=souvenirPattern('Test','image.png',20,20,14,new Int16Array(400),[0]);
    expect(isSimpleSouvenir(pattern)).toBe(true);
    pattern.fwd[0]=0;
    expect(isSimpleSouvenir(pattern)).toBe(false);
    pattern.fwd[0]=-1; pattern.back.push({x1:0,y1:0,x2:1,y2:1,c:0});
    expect(isSimpleSouvenir(pattern)).toBe(false);
  });
  it('archive avant transfert et bloque le transfert si la sauvegarde échoue', async () => {
    const next=souvenirPattern('Nouveau','image.png',20,20,14,new Int16Array(400),[0]);
    const previous={...next,name:'Ancien'}; const archived:string[]=[];
    const result=await preparePhotoHandoff(next,previous,async p=>{archived.push(p.name);});
    expect(archived).toEqual(['Ancien']); expect(result.cross).toEqual(next.cross);
    expect(result.cross).not.toBe(next.cross);
    await expect(preparePhotoHandoff(next,previous,async()=>{throw Error('Stockage refusé');})).rejects.toThrow('Stockage refusé');
    expect(previous.name).toBe('Ancien');
  });
  it('refuse une image entièrement vide ou une grille incohérente', () => {
    expect(()=>souvenirPattern('','empty.png',20,20,14,new Int16Array(400).fill(-1),[])).toThrow();
    expect(()=>souvenirPattern('','bad.png',20,20,14,new Int16Array(1),[0])).toThrow();
  });
});
