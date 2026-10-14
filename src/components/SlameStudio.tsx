import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { FLOSS } from "../lib/dmc";
import type { Pattern } from "../lib/pattern";
import { appendWaypoint, makeMusicDemo, motifTrail, stepsForTrail, stitchAt, type ExpressionMood, type Point, type ScaleName, type MusicStep } from "../lib/slame";

type Props = { pattern: Pattern; onHome: () => void; onEditor: () => void };
const SIZE = 16;
const moods: {id: ExpressionMood; name: string; color: string}[] = [
  {id:"tender",name:"Tendre",color:"#eb87ad"}, {id:"joy",name:"Joyeux",color:"#eeb354"},
  {id:"calm",name:"Calme",color:"#71c6b4"}, {id:"sad",name:"Triste",color:"#819bea"},
];
const messages = ["Je t'aime","Pardon","Merci","Oui","Non","J'ai besoin d'aide","J'ai mal","Arrêtez, s'il vous plaît","Je suis fatigué","J'ai une idée"];
const button = "rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bda5ff]";
const card = "rounded-xl border border-white/15 bg-[#161b28] p-4";
const clamp = (n:number,a:number,b:number)=>Math.max(a,Math.min(n,b));
const timestamp = ()=>new Date().toISOString();

export default function SlameStudio({pattern,onHome,onEditor}:Props) {
  const demo = useMemo(makeMusicDemo,[]);
  const real = useMemo(()=>motifTrail(pattern,1).length>0,[pattern]);
  const p = real ? pattern : demo;
  const [points,setPoints] = useState<Point[]>([]);
  const [cursor,setCursor] = useState<Point>({x:7,y:7});
  const [ox,setOx] = useState(0),[oy,setOy] = useState(0);
  const [scale,setScale] = useState<ScaleName>("pentatonic");
  const [mood,setMood] = useState<ExpressionMood>("tender");
  const [bpm,setBpm] = useState(96),[tuning,setTuning] = useState(440);
  const [loop,setLoop] = useState(false),[playing,setPlaying] = useState(false);
  const [speech,setSpeech] = useState("Je t'aime"),[help,setHelp] = useState(false);
  const [log,setLog] = useState<{at:string;text:string;emotion:string}[]>([]);
  const [status,setStatus] = useState("Choisissez une case, puis une autre, et prolongez votre chemin.");
  const [scan,setScan] = useState(false),[scanPhase,setScanPhase] = useState<"row"|"column">("row");
  const [scanIndex,setScanIndex] = useState(0),[scanRow,setScanRow] = useState(0);
  const [head,setHead] = useState(false),[breath,setBreath] = useState(false);
  const [threshold,setThreshold] = useState(.17),[micLevel,setMicLevel] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const camera = useRef<MediaStream|null>(null),microphone=useRef<MediaStream|null>(null);
  const micCtx = useRef<AudioContext|null>(null),audio = useRef<AudioContext|null>(null),bus=useRef<GainNode|null>(null);
  const audioTimer=useRef<number|null>(null),cameraTimer=useRef<number|null>(null),breathTimer=useRef<number|null>(null);
  const currentCursor=useRef(cursor),pickCurrent=useRef<(pt:Point)=>void>(()=>{});
  const faceOrigin=useRef<{x:number;y:number}|null>(null),lastMove=useRef(0),lastBreath=useRef(0);
  const w=Math.min(SIZE,p.w),h=Math.min(SIZE,p.h);
  const left=Math.min(ox,Math.max(0,p.w-w)),top=Math.min(oy,Math.max(0,p.h-h));
  const events=useMemo(()=>stepsForTrail(p,points,scale,mood),[p,points,scale,mood]);
  const wave=events.slice(-90);
  useEffect(()=>{currentCursor.current=cursor},[cursor]);
  useEffect(()=>{setPoints([]);setCursor({x:0,y:0});setOx(0);setOy(0)},[p]);

  const pick=useCallback((pt:Point)=>{
    if(pt.x<0||pt.y<0||pt.x>=p.w||pt.y>=p.h)return;
    setCursor(pt);setPoints(old=>appendWaypoint(old,pt));
    setStatus("Trajet prolongé. Vous pouvez continuer autant que souhaité, revenir ou boucler.");
  },[p]);
  pickCurrent.current=pick;
  const stop=useCallback(()=>{
    if(audioTimer.current!==null)clearInterval(audioTimer.current);
    audioTimer.current=null;
    if(bus.current&&audio.current)bus.current.gain.setTargetAtTime(0,audio.current.currentTime,.012);
    bus.current=null;setPlaying(false);
  },[]);
  const play=useCallback(async(items:MusicStep[]=events)=>{
    if(!items.length){setStatus("Sélectionnez des cases ou utilisez Écouter mon ouvrage.");return;}
    stop();
    try{
      const ctx=audio.current??new AudioContext();audio.current=ctx;
      await ctx.resume();
      const out=ctx.createGain();out.gain.value=.17;out.connect(ctx.destination);bus.current=out;
      let i=0,when=ctx.currentTime+.09;
      const tick=()=>{
        while(when<ctx.currentTime+.16){
          if(i>=items.length){
            if(!loop){if(audioTimer.current!==null)clearInterval(audioTimer.current);audioTimer.current=null;setPlaying(false);return;}
            i=0;
          }
          const note=items[i++],duration=60/bpm*note.duration;
          if(note.midi!==null){
            const osc=ctx.createOscillator(),gain=ctx.createGain();
            osc.type=note.kind==="knot"?"square":mood==="sad"?"sine":"triangle";
            osc.frequency.setValueAtTime(tuning*Math.pow(2,(note.midi-69)/12),when);
            gain.gain.setValueAtTime(.0001,when);gain.gain.linearRampToValueAtTime(note.velocity*.7,when+.012);
            gain.gain.exponentialRampToValueAtTime(.0001,when+Math.max(.07,duration*.84));
            osc.connect(gain).connect(out);osc.start(when);osc.stop(when+Math.max(.08,duration*.86));
            osc.onended=()=>{osc.disconnect();gain.disconnect()};
          }
          when+=duration;
        }
      };
      tick();
      audioTimer.current=window.setInterval(tick,60);
      setPlaying(true);setStatus("Lecture en cours. Les cases vides sont des silences.");
    }catch(err){stop();setStatus("Audio indisponible : "+String(err))}
  },[events,loop,bpm,mood,tuning,stop]);
  const listen=()=>{
    const path=motifTrail(p,512);
    if(!path.length){setStatus("Ce motif n'a pas encore de points.");return}
    setPoints(path);void play(stepsForTrail(p,path,scale,mood));
  };
  const say=()=>{
    if(!speech.trim())return;
    stop();
    if(!("speechSynthesis" in window)){setStatus("Synthèse vocale indisponible.");return}
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(speech.trim());u.lang="fr-FR";
    u.rate=mood==="sad"?.86:mood==="joy"?1.07:.96;
    const voices=speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith("fr"));
    u.voice=voices.find(v=>v.localService)??voices[0]??null;
    u.onerror=()=>setStatus("Échec de la voix. Vérifiez les voix françaises du système.");
    speechSynthesis.speak(u);
    setLog(old=>[...old,{at:timestamp(),text:speech.trim(),emotion:mood}]);
    setStatus("Voix demandée. Aucun message envoyé à un contact.");
  };
  const exportScore=()=>{
    const data={version:1,format:"aime-slame",at:timestamp(),pattern:p.name,isDemo:!real,scale,mood,bpm,tuning,loop,path:points,notes:events,expressions:log};
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download="slame-partition.json";a.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1500);
  };
  const validateScan=useCallback(()=>{
    if(scanPhase==="row"){setScanRow(scanIndex);setScanIndex(0);setScanPhase("column")}
    else {pickCurrent.current({x:left+scanIndex,y:top+scanRow});setScanIndex(0);setScanPhase("row")}
  },[scanPhase,scanIndex,scanRow,left,top]);
  useEffect(()=>{
    if(!scan)return;
    const id=window.setInterval(()=>setScanIndex(i=>(i+1)%(scanPhase==="row"?h:w)),1200);
    return()=>window.clearInterval(id);
  },[scan,scanPhase,h,w]);
  useEffect(()=>{
    if(!scan)return;
    const listener=(e:KeyboardEvent)=>{
      if(e.code==="Space"&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLTextAreaElement)){
        e.preventDefault();validateScan();
      }
    };
    window.addEventListener("keydown",listener);
    return()=>window.removeEventListener("keydown",listener);
  },[scan,validateScan]);
  const gridKey=(e:ReactKeyboardEvent<HTMLDivElement>)=>{
    if(scan)return;
    const delta:{[key:string]:[number,number]}={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    if(delta[e.key]){
      e.preventDefault();
      setCursor(pos=>({x:clamp(pos.x+delta[e.key][0],0,p.w-1),y:clamp(pos.y+delta[e.key][1],0,p.h-1)}));
    }else if(e.key==="Enter"||e.key===" "){e.preventDefault();pick(cursor)}
    else if(e.key==="Backspace"){e.preventDefault();setPoints(old=>old.slice(0,-1))}
  };
  const stopCamera=()=>{
    if(cameraTimer.current!==null)clearInterval(cameraTimer.current);cameraTimer.current=null;
    camera.current?.getTracks().forEach(t=>t.stop());camera.current=null;
    if(video.current)video.current.srcObject=null;
    faceOrigin.current=null;setHead(false);
  };
  const startCamera=async()=>{
    if(head){stopCamera();return}
    type Face = {boundingBox:{x:number;y:number;width:number;height:number}};
    type Detector = {detect(source:HTMLVideoElement):Promise<Face[]>};
    const Ctor=(window as Window&{FaceDetector?:new(opts:{fastMode:boolean;maxDetectedFaces:number})=>Detector}).FaceDetector;
    if(!Ctor){setStatus("Suivi tête indisponible dans ce navigateur : détecteur facial local non pris en charge. Le clavier et le contacteur fonctionnent.");return}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:false});
      camera.current=stream;
      if(!video.current){stopCamera();return}
      video.current.srcObject=stream;await video.current.play();
      const detector=new Ctor({fastMode:true,maxDetectedFaces:1});
      let busy=false;setHead(true);setStatus("Webcam locale active ; bougez la tête pour déplacer le curseur, puis validez séparément.");
      cameraTimer.current=window.setInterval(async()=>{
        const v=video.current;
        if(!v||!v.videoWidth||busy)return;
        busy=true;
        try{
          const faces=await detector.detect(v),f=faces[0]?.boundingBox;
          if(f){
            const c={x:(f.x+f.width/2)/v.videoWidth,y:(f.y+f.height/2)/v.videoHeight};
            if(!faceOrigin.current)faceOrigin.current=c;
            const dx=c.x-faceOrigin.current.x,dy=c.y-faceOrigin.current.y;
            if(Date.now()-lastMove.current>550&&(Math.abs(dx)>.04||Math.abs(dy)>.04)){
              setCursor(pos=>({x:clamp(pos.x+(Math.abs(dx)>.04?(dx>0?-1:1):0),0,p.w-1),y:clamp(pos.y+(Math.abs(dy)>.04?(dy>0?1:-1):0),0,p.h-1)}));
              lastMove.current=Date.now();
            }
          }
        }catch{setStatus("Suivi facial impossible dans ce navigateur.");stopCamera()}
        finally{busy=false}
      },220);
    }catch(err){stopCamera();setStatus("Caméra refusée ou absente : "+String(err))}
  };
  const stopMic=()=>{
    if(breathTimer.current!==null)clearInterval(breathTimer.current);breathTimer.current=null;
    microphone.current?.getTracks().forEach(t=>t.stop());microphone.current=null;
    if(micCtx.current){void micCtx.current.close();micCtx.current=null}
    setBreath(false);setMicLevel(0);
  };
  const startMic=async()=>{
    if(breath){stopMic();return}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false},video:false});
      microphone.current=stream;
      const ctx=new AudioContext();micCtx.current=ctx;
      const meter=ctx.createAnalyser();meter.fftSize=1024;ctx.createMediaStreamSource(stream).connect(meter);
      const sample=new Uint8Array(meter.fftSize);
      let since=0;setBreath(true);setStatus("Micro local : souffle ou bruit soutenu ajoute une case, jamais une parole. Calibrez le seuil.");
      breathTimer.current=window.setInterval(()=>{
        meter.getByteTimeDomainData(sample);
        let sum=0;
        for(const n of sample)sum+=Math.pow((n-128)/128,2);
        const rms=Math.sqrt(sum/sample.length);setMicLevel(rms);
        if(rms>=threshold){
          if(!since)since=Date.now();
          if(Date.now()-since>700&&Date.now()-lastBreath.current>1800){
            lastBreath.current=Date.now();pickCurrent.current(currentCursor.current);since=0;
          }
        }else since=0;
      },130);
    }catch(err){stopMic();setStatus("Micro refusé ou absent : "+String(err))}
  };
  useEffect(()=>()=>{if(audioTimer.current!==null)clearInterval(audioTimer.current);
    if(cameraTimer.current!==null)clearInterval(cameraTimer.current);
    if(breathTimer.current!==null)clearInterval(breathTimer.current);
    camera.current?.getTracks().forEach(t=>t.stop());microphone.current?.getTracks().forEach(t=>t.stop());
    if(audio.current)void audio.current.close();
    if(micCtx.current)void micCtx.current.close();
    if("speechSynthesis" in window)speechSynthesis.cancel();
  },[]);
  const cursorStitch=stitchAt(p,cursor);
  const paletteColor=cursorStitch?FLOSS[cursorStitch.idx]:null;
  return <main className="fixed inset-0 z-[70] overflow-auto bg-[#090c13] text-white">
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/15 bg-[#090c13] px-4 py-3">
      <div><strong className="text-xl tracking-tight">SLÂME <span className="text-[#d69eff]">✳</span></strong><div className="text-xs text-[#b8bed1]">POINTZERO × AIME Music · Les mots de l'âme</div></div>
      <nav className="flex flex-wrap gap-2" aria-label="Navigation SLÂME">
        <button className={button} onClick={()=>setHelp(!help)} aria-expanded={help}>Mode d'emploi {help?"−":"+"}</button>
        <button className={button} onClick={onEditor}>Atelier de broderie</button>
        <button className={button} onClick={onHome}>Accueil</button>
      </nav>
    </header>
    {help&&<section className={card+" mx-auto my-3 max-w-5xl space-y-2"} aria-label="Mode d'emploi SLÂME">
      <h2 className="font-semibold">Mode d'emploi · Le fil de la musique</h2>
      <p className="text-sm text-[#bec7d6]">1. Créez ou importez votre motif ou votre photo dans l'Atelier ; SLÂME lit directement le projet. Un motif MUSICBOX est proposé si la grille est vide.</p>
      <p className="text-sm text-[#bec7d6]">2. Choisissez A, puis B, puis C et davantage. Chaque segment passe par les cases intermédiaires ; les retours sont conservés. Flèches : déplacer le curseur ; Entrée : poser un point ; Retour arrière : annuler un point.</p>
      <p className="text-sm text-[#bec7d6]">3. Écoutez le motif entier ou votre parcours, choisissez une gamme, l'émotion et le tempo. Une case vide est un silence ; les couleurs DMC suivent une convention musicale AIME et ne signifient pas objectivement une émotion.</p>
      <p className="text-sm text-[#bec7d6]">4. Pour communiquer, choisissez une phrase ou écrivez vos propres mots et appuyez volontairement sur Prononcer. Aucun message ne part vers un contact ou les secours.</p>
      <p className="text-sm text-[#bec7d6]">5. Accessibilité : balayage à un contacteur (Espace : rangée, puis colonne), webcam pour le déplacement de tête si le navigateur prend en charge la détection locale, ou micro pour sélectionner une case après un son soutenu. Les commandes corporelles sont expérimentales et peuvent faire des erreurs.</p>
      <p className="text-sm text-[#bec7d6]">6. Exportez la partition JSON. Le SAL simultané, l'envoi aux contacts, la reconnaissance des intentions et la météo ne sont pas encore connectés. La voix dépend des voix disponibles sur l'appareil.</p>
    </section>}
    <div className="mx-auto grid max-w-[1700px] grid-cols-1 gap-3 p-3 xl:grid-cols-[255px_minmax(450px,1fr)_310px]">
      <aside className={card+" space-y-5"}>
        <section><h2 className="mb-3 text-sm font-semibold">01 · Gammes et couleurs</h2>
          <label className="block text-xs text-[#abb9d0]" htmlFor="scale-sl">Gamme</label>
          <select id="scale-sl" className="my-2 w-full rounded border border-white/20 bg-[#273046] p-2" value={scale} onChange={e=>setScale(e.target.value as ScaleName)}>
            <option value="pentatonic">Pentatonique</option><option value="major">Majeure</option><option value="minor">Mineure</option><option value="dorian">Dorienne</option>
          </select>
          <label className="block text-xs" htmlFor="tempo-sl">Tempo · {bpm} BPM</label>
          <input id="tempo-sl" type="range" min={45} max={180} value={bpm} onChange={e=>setBpm(Number(e.target.value))} className="w-full" />
          <label className="mt-2 block text-xs" htmlFor="tuning-sl">Accordage</label>
          <select className="my-2 w-full rounded border border-white/20 bg-[#273046] p-2" id="tuning-sl" value={tuning} onChange={e=>setTuning(Number(e.target.value))}><option value={440}>440 Hz</option><option value={432}>432 Hz</option></select>
          <h3 className="my-2 text-xs">Émotion choisie</h3>
          <div className="flex flex-wrap gap-2">{moods.map(m=><button key={m.id} className={button} style={{borderLeft:"4px solid "+m.color,background:mood===m.id?"#3e4769":undefined}} aria-pressed={mood===m.id} onClick={()=>setMood(m.id)}>{m.name}</button>)}</div>
        </section>
        <section className="space-y-2 border-t border-white/15 pt-4"><h2 className="text-sm font-semibold">02 · Écouter et composer</h2>
          <button className={button+" w-full bg-[#6656bc]"} onClick={listen}>♫ Écouter mon ouvrage</button>
          <div className="flex flex-wrap gap-2">
            <button className={button} onClick={()=>void play()} disabled={!points.length}>▶ {playing?"Rejouer":"Jouer le trajet"}</button><button className={button} onClick={stop}>■ Stop</button>
            <button className={button} onClick={()=>setPoints(v=>v.slice(0,-1))} disabled={!points.length}>↶</button>
            <button className={button} onClick={()=>{setPoints([]);stop()}}>Effacer</button>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={loop} onChange={e=>setLoop(e.target.checked)}/> Boucle continue</label>
        </section>
        <section className="space-y-2 border-t border-white/15 pt-4"><h2 className="text-sm font-semibold">03 · Contrôler autrement</h2>
          <button className={button+" w-full"} aria-pressed={scan} onClick={()=>{setScan(!scan);setScanIndex(0);setScanPhase("row")}}>Balayage contacteur · {scan?"ON":"OFF"}</button>
          {scan&&<button className={button+" w-full bg-[#6656bc]"} onClick={validateScan}>Valider la {scanPhase==="row"?"rangée":"colonne"} {scanIndex+1}</button>}
          <div className="flex flex-wrap gap-2"><button className={button} aria-pressed={head} onClick={()=>void startCamera()}>Webcam tête {head?"ON":"test"}</button><button className={button} aria-pressed={breath} onClick={()=>void startMic()}>Souffle {breath?"ON":"test"}</button></div>
          <video ref={video} autoPlay playsInline muted style={{display:head?"block":"none",width:130,transform:"scaleX(-1)",borderRadius:9}}/>
          <button className={button+" w-full"} onClick={()=>pick(currentCursor.current)}>Valider le curseur</button>
          {breath&&<div className="text-xs"><label htmlFor="breath-sl">Seuil micro {Math.round(threshold*100)} % · niveau {Math.round(micLevel*100)} %</label><input id="breath-sl" type="range" min={.03} max={.4} step={.01} value={threshold} onChange={e=>setThreshold(Number(e.target.value))} className="w-full"/></div>}
          <p className="text-xs text-[#a7b7c8]">Clavier, contacteur ou mouvement : jamais d'émission vocale automatique. Caméra locale seulement si prise en charge par le navigateur.</p>
        </section>
      </aside>
      <section className={card}>
        <div className="mb-3 flex flex-wrap justify-between gap-2"><div><h2 className="text-base font-semibold">MUSICBOX · Le disque dans la grille</h2><p className="text-xs text-[#b6bed1]">{real?p.name:"Motif de démonstration. Créez votre propre ouvrage dans l'Atelier."}</p></div><div className="rounded-lg bg-white/10 px-3 py-2 text-sm">{points.length} cases · {events.filter(e=>e.midi!==null).length} notes</div></div>
        <div className="relative mx-auto aspect-square w-full max-w-[640px] overflow-hidden rounded-lg border border-white/30 bg-[#171c2a]">
          <div role="grid" tabIndex={0} onKeyDown={gridKey} aria-label="Grille musicale : flèches pour déplacer le curseur et Entrée pour tracer" className="absolute inset-0 grid grid-cols-16 grid-rows-16">
            {Array.from({length:256},(_,i)=>{
              const x=i%16,y=Math.floor(i/16),pt={x:left+x,y:top+y};
              const inside=x<w&&y<h,stitch=inside?stitchAt(p,pt):null;
              const scanning=scan&&(scanPhase==="row"?scanIndex===y:scanRow===y&&scanIndex===x);
              const current=cursor.x===pt.x&&cursor.y===pt.y;
              return <button key={i} role="gridcell" disabled={!inside} aria-label={"Colonne "+(pt.x+1)+" rangée "+(pt.y+1)+(stitch?" DMC "+FLOSS[stitch.idx].code:" silence")} aria-current={current} onClick={()=>pick(pt)}
                className="min-h-0 min-w-0 border border-black/25 p-0 hover:outline hover:outline-2 hover:outline-white focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-white"
                style={{background:stitch?FLOSS[stitch.idx].hex:"#252a35",boxShadow:scanning?"inset 0 0 0 3px #fff":current?"inset 0 0 0 2px #fff":undefined}}/>;
            })}
          </div>
          <svg viewBox="0 0 160 160" preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
            {[73,55,37,19].map((r,i)=><circle key={r} cx={80} cy={80} r={r} fill="none" stroke={["#ef80ba","#e1b664","#6ba6e7","#a18cf7"][i]} strokeWidth={1.5} strokeOpacity={.7}/>)}
            <polyline points={points.filter(pt=>pt.x>=left&&pt.y>=top&&pt.x<left+w&&pt.y<top+h).slice(-800).map(pt=>(pt.x-left)*10+5+","+(pt.y-top)*10+5).join(" ")} fill="none" stroke="#ffffff" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round"/>
            <rect x={(cursor.x-left)*10+1} y={(cursor.y-top)*10+1} width={8} height={8} stroke="white" strokeWidth={1.5} fill="none"/>
          </svg>
        </div>
        <div className="mx-auto mt-3 grid max-w-[640px] grid-cols-2 gap-3">
          <label className="text-xs">Déplacer la grille horizontalement <input aria-label="Colonne visible" type="range" className="w-full" min={0} max={Math.max(0,p.w-w)} value={left} onChange={e=>setOx(Number(e.target.value))}/></label>
          <label className="text-xs">Déplacer la grille verticalement <input aria-label="Rangée visible" type="range" className="w-full" min={0} max={Math.max(0,p.h-h)} value={top} onChange={e=>setOy(Number(e.target.value))}/></label>
        </div>
        <p className="mt-3 text-xs text-[#b2c1d5]">Curseur : ({cursor.x+1},{cursor.y+1}) · {paletteColor?"DMC "+paletteColor.code+" ("+cursorStitch?.kind+")":"silence"} · tracé A → B → C → … sans fin prédéfinie</p>
        <div className="mt-4 flex h-9 items-center gap-0.5 overflow-hidden" aria-label="Aperçu des événements">
          {wave.map((e,i)=><span key={i} className="min-w-[2px] flex-1 rounded" style={{background:e.hex,height:e.midi===null?3:Math.min(30,6+e.midi/4)}}/>)}
        </div>
        <div role="status" className="mt-3 rounded-lg border border-[#40506a] bg-[#1e2b3c] p-3 text-sm">{status}</div>
      </section>
      <aside className={card+" space-y-4"}>
        <section className="space-y-3"><h2 className="text-sm font-semibold">04 · Les mots de l'âme</h2>
          <p className="text-xs leading-relaxed text-[#a9b7cb]">Vous choisissez les mots. La couleur, le mouvement et la musique ajoutent une expression choisie, jamais une interprétation imposée.</p>
          <div className="flex flex-wrap gap-2">{messages.map(text=><button key={text} className={button+(speech===text?" bg-[#5b4c89]":"")} onClick={()=>setSpeech(text)} aria-pressed={speech===text}>{text}</button>)}</div>
          <label className="block text-xs" htmlFor="message-sl">Écrire ma propre phrase</label>
          <textarea id="message-sl" rows={3} className="w-full rounded-lg border border-white/30 bg-[#283044] p-2 text-white" value={speech} onChange={e=>setSpeech(e.target.value.slice(0,500))}/>
          <button className={button+" w-full bg-[#6958bf] py-3 font-semibold"} onClick={say}>◉ Prononcer avec une voix naturelle disponible</button>
          <button className={button+" w-full"} onClick={()=>{if("speechSynthesis" in window)speechSynthesis.cancel()}}>Couper la voix</button>
          <p className="text-xs text-[#a9b7cb]">« J'ai besoin d'aide », « Non » et « Arrêtez » sont des phrases directes, sans musique obligatoire. Cette application n'appelle pas les secours.</p>
        </section>
        <section className="space-y-2 border-t border-white/15 pt-3"><h2 className="text-sm font-semibold">05 · Le fil de l'histoire</h2>
          <p className="text-xs text-[#acb8ca]">Les expressions prononcées sont horodatées en mémoire pendant cette session, sans envoi automatique à quiconque.</p>
          {log.slice(-3).reverse().map((item,i)=><p className="rounded-lg bg-[#252d40] p-2 text-xs" key={i}>{new Date(item.at).toLocaleTimeString("fr-FR")} · {item.text}</p>)}
          <button className={button+" w-full"} onClick={exportScore}>Exporter la partition JSON</button>
        </section>
        <section className="space-y-2 border-t border-white/15 pt-3"><h2 className="text-sm font-semibold">06 · SAL partagé</h2>
          <p className="text-xs leading-relaxed text-[#a9b7cb]">Objectif : plusieurs brodeuses et participants enrichissent le même motif, chacun avec ses couleurs et sa signature musicale. La version actuelle ne réalise pas encore la synchronisation multipersonne ni l'envoi d'alertes.</p>
        </section>
      </aside>
    </div>
  </main>;
}
