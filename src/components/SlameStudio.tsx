import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { createPattern, type Pattern } from "../lib/pattern";
import { FLOSS, flossIndex } from "../lib/dmc";
import { SCALES, clampPoint, flossAt, motifRoute, noteFrequency, toSound, traceRoute, type GridPoint, type ScaleName } from "../lib/slameMusic";
import "../slame.css";

type Tab = "musique" | "parole" | "accessibilite" | "guide";
type Mode = "parcours" | "motif";
type Mood = "neutre" | "tendre" | "joyeux" | "calme" | "grave";
const EMOTIONS: Record<Mood, { label: string; speechRate: number; pitch: number; hint: string }> = {
  neutre: { label: "Neutre", speechRate: 1, pitch: 1, hint: "Sans intention émotionnelle imposée" },
  tendre: { label: "Tendre", speechRate: .88, pitch: 1.04, hint: "Doux et posé" },
  joyeux: { label: "Joyeux", speechRate: 1.1, pitch: 1.13, hint: "Plus vif et lumineux" },
  calme: { label: "Calme", speechRate: .78, pitch: .95, hint: "Lent et régulier" },
  grave: { label: "Grave", speechRate: .82, pitch: .84, hint: "Retenu et sérieux" },
};
const PHRASES = [
  { group: "Essentiel", value: "Oui" }, { group: "Essentiel", value: "Non" },
  { group: "Essentiel", value: "Stop, s'il vous plaît" }, { group: "Essentiel", value: "J'ai besoin d'aide" },
  { group: "Essentiel", value: "J'ai mal" }, { group: "Essentiel", value: "J'ai besoin de boire" },
  { group: "Lien", value: "Je t'aime" }, { group: "Lien", value: "Pardon" },
  { group: "Lien", value: "Merci" }, { group: "Lien", value: "Reste avec moi" },
  { group: "Création", value: "Écoute ma musique" }, { group: "Création", value: "C'est notre histoire" },
];
const VIEW = 24;
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
function demoPattern(): Pattern {
  const p = createPattern("Motif de démonstration SLÂME", 24, 24);
  const codes = ["321", "444", "699", "797", "550", "3801"];
  const ids = codes.map(c => flossIndex(c)).filter(i => i >= 0);
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    const r = Math.hypot(x - 11.5, y - 11.5);
    if (r < 9 && (Math.abs(Math.sin(Math.atan2(y - 11.5, x - 11.5) * 6)) > .36 || r < 3)) {
      p.cross[y * p.w + x] = ids[Math.floor(r / 2.2) % ids.length];
    }
  }
  return p;
}
function freshContext(): AudioContext | null {
  const API = window.AudioContext;
  return API ? new API() : null;
}
export default function SlameStudio({ pattern, onBack }: { pattern: Pattern; onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const tones = useRef(new Set<OscillatorNode>());
  const [tab, setTab] = useState<Tab>("musique");
  const [mode, setMode] = useState<Mode>("parcours");
  const [waypoints, setWaypoints] = useState<GridPoint[]>([]);
  const [offset, setOffset] = useState<GridPoint>({ x: 0, y: 0 });
  const [cursor, setCursor] = useState<GridPoint>({ x: 12, y: 12 });
  const [scale, setScale] = useState<ScaleName>("pentatonic");
  const [tempo, setTempo] = useState(96);
  const [tuning, setTuning] = useState(440);
  const [loop, setLoop] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playingIndex, setPlayingIndex] = useState(-1);
  const [phrase, setPhrase] = useState("Je t'aime");
  const [emotion, setEmotion] = useState<Mood>("tendre");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceUri, setVoiceUri] = useState("");
  const [scan, setScan] = useState(false);
  const [scanStep, setScanStep] = useState<"ligne" | "colonne">("ligne");
  const [scanRow, setScanRow] = useState(0);
  const [scanColumn, setScanColumn] = useState(0);
  const [scanMs, setScanMs] = useState(1500);
  const [announcement, setAnnouncement] = useState("Choisissez une case. Entrée ajoute un point à votre chemin.");
  const [demo] = useState(demoPattern);
  const hasPattern = useMemo(() => motifRoute(pattern, 1).length > 0 || pattern.back.length > 0 || pattern.long.length > 0 || pattern.knots.length > 0, [pattern]);
  const p = hasPattern ? pattern : demo;
  const route = useMemo(() => mode === "motif" ? motifRoute(p, 512) : traceRoute(waypoints, p.w, p.h), [mode, p, waypoints]);
  const fallback = flossIndex("321");
  const events = useMemo(() => route.map(pt => toSound(p, pt, scale, 48, mode === "parcours" ? fallback : -1)), [route, p, scale, mode, fallback]);
  const visibleNotes = useMemo(() => events.slice(-14).map(ev => ev.midi === null ? "silence" : ev.dmc ?? "note").join(" · "), [events]);

  const stop = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    for (const tone of tones.current) { try { tone.stop(); } catch { /* already stopped */ } }
    tones.current.clear();
    setPlaying(false);
    setPlayingIndex(-1);
  }, []);
  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    tones.current.forEach(t => { try { t.stop(); } catch { /* released */ } });
    window.speechSynthesis?.cancel();
    void ctxRef.current?.close();
  }, []);
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const update = () => setVoices(synth.getVoices());
    update();
    synth.addEventListener?.("voiceschanged", update);
    return () => synth.removeEventListener?.("voiceschanged", update);
  }, []);
  useEffect(() => { stop(); }, [mode, scale, tempo, tuning, p, waypoints, stop]);

  const addPoint = useCallback((pt: GridPoint) => {
    const next = clampPoint(pt, p.w, p.h);
    setWaypoints(prev => [...prev, next].slice(-2048));
    setCursor(next);
    setAnnouncement("Point " + (waypoints.length + 1) + " : colonne " + (next.x + 1) + ", ligne " + (next.y + 1));
  }, [p.w, p.h, waypoints.length]);

  const playNote = useCallback((context: AudioContext, midi: number, when: number, seconds: number, style: string) => {
    const gain = context.createGain();
    const length = Math.min(seconds * .88, .7);
    const amp = style === "knot" ? .11 : style === "backstitch" ? .055 : .075;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(amp, when + .018);
    gain.gain.exponentialRampToValueAtTime(.0001, when + length);
    gain.connect(context.destination);
    const tone = context.createOscillator();
    tone.type = style === "knot" ? "square" : style === "backstitch" ? "sine" : "triangle";
    tone.frequency.setValueAtTime(noteFrequency(midi, tuning), when);
    tone.connect(gain);
    tones.current.add(tone);
    tone.onended = () => { tones.current.delete(tone); tone.disconnect(); gain.disconnect(); };
    tone.start(when);
    tone.stop(when + length + .02);
  }, [tuning]);

  const play = async () => {
    if (!events.length) { setAnnouncement("Dessinez un chemin ou choisissez Écouter le motif."); return; }
    stop();
    const context = ctxRef.current ?? freshContext();
    if (!context) { setAnnouncement("Audio Web non disponible dans ce navigateur."); return; }
    ctxRef.current = context;
    try { await context.resume(); } catch { setAnnouncement("Le navigateur a bloqué la lecture audio."); return; }
    const seconds = 60 / tempo / 2;
    let index = 0;
    let next = context.currentTime + .07;
    const tick = () => {
      while (next < context.currentTime + .12 && (index < events.length || loop)) {
        const ev = events[index % events.length];
        if (ev.midi !== null) playNote(context, ev.midi, next, seconds, ev.kind);
        setPlayingIndex(index % events.length);
        index++;
        next += seconds;
      }
      if (!loop && index >= events.length && context.currentTime > next + .12) stop();
    };
    setPlaying(true);
    tick();
    timerRef.current = window.setInterval(tick, 40);
  };

  const speak = (value = phrase) => {
    const synth = window.speechSynthesis;
    if (!synth) { setAnnouncement("Synthèse vocale indisponible dans ce navigateur."); return; }
    stop();
    synth.cancel();
    const u = new SpeechSynthesisUtterance(value);
    const desired = voices.find(v => v.voiceURI === voiceUri) ?? voices.find(v => v.lang.toLowerCase().startsWith("fr"));
    if (desired) u.voice = desired;
    u.lang = desired?.lang ?? "fr-FR";
    u.rate = EMOTIONS[emotion].speechRate;
    u.pitch = EMOTIONS[emotion].pitch;
    synth.speak(u);
    setAnnouncement("Message prononcé : " + value);
  };

  const pointerToPoint = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: offset.x + Math.floor((e.clientX - rect.left) / rect.width * VIEW),
      y: offset.y + Math.floor((e.clientY - rect.top) / rect.height * VIEW),
    };
  };
  const keyMove = (e: KeyboardEvent<HTMLCanvasElement>) => {
    const d: Record<string, GridPoint> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } };
    if (d[e.key]) {
      e.preventDefault();
      const next = clampPoint({ x: cursor.x + d[e.key].x, y: cursor.y + d[e.key].y }, p.w, p.h);
      setCursor(next);
      setOffset(o => ({ x: clamp(next.x < o.x ? next.x : next.x >= o.x + VIEW ? next.x - VIEW + 1 : o.x, 0, Math.max(0, p.w - VIEW)), y: clamp(next.y < o.y ? next.y : next.y >= o.y + VIEW ? next.y - VIEW + 1 : o.y, 0, Math.max(0, p.h - VIEW)) }));
      const picked = flossAt(p, next.x, next.y);
      setAnnouncement("Colonne " + (next.x + 1) + ", ligne " + (next.y + 1) + (picked.index >= 0 ? ", DMC " + FLOSS[picked.index].code : ", case vide"));
    }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setMode("parcours"); addPoint(cursor); }
    if (e.key === "Backspace") { e.preventDefault(); setWaypoints(w => w.slice(0, -1)); }
    if (e.key === "Escape") stop();
  };

  useEffect(() => {
    const canvas = canvasRef.current, g = canvas?.getContext("2d");
    if (!canvas || !g) return;
    const CELL = canvas.width / VIEW;
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = "#171b24"; g.fillRect(0, 0, canvas.width, canvas.height);
    for (let j = 0; j < VIEW; j++) for (let i = 0; i < VIEW; i++) {
      const x = offset.x + i, y = offset.y + j;
      const found = flossAt(p, x, y);
      g.fillStyle = found.index >= 0 ? FLOSS[found.index]?.hex ?? "#343945" : "#272c38";
      g.fillRect(i * CELL + 1, j * CELL + 1, CELL - 2, CELL - 2);
      if (found.kind === "backstitch" || found.kind === "longstitch") {
        g.strokeStyle = "#fff8"; g.beginPath(); g.moveTo(i * CELL + 3, j * CELL + 3); g.lineTo((i + 1) * CELL - 3, (j + 1) * CELL - 3); g.stroke();
      }
    }
    for (const [i, pt] of route.entries()) {
      if (pt.x < offset.x || pt.y < offset.y || pt.x >= offset.x + VIEW || pt.y >= offset.y + VIEW) continue;
      const x = (pt.x - offset.x + .5) * CELL, y = (pt.y - offset.y + .5) * CELL;
      if (i > 0) {
        const prev = route[i - 1];
        if (Math.abs(prev.x - pt.x) <= 1 && Math.abs(prev.y - pt.y) <= 1 && prev.x >= offset.x && prev.y >= offset.y && prev.x < offset.x + VIEW && prev.y < offset.y + VIEW) {
          g.strokeStyle = "#fff"; g.lineWidth = 2; g.globalAlpha = .55;
          g.beginPath(); g.moveTo((prev.x - offset.x + .5) * CELL, (prev.y - offset.y + .5) * CELL); g.lineTo(x, y); g.stroke();
          g.globalAlpha = 1;
        }
      }
      if (i === playingIndex || i === 0 || i === route.length - 1 || waypoints.some(w => w.x === pt.x && w.y === pt.y)) {
        g.fillStyle = i === playingIndex ? "#F7C85C" : "#fff";
        g.beginPath(); g.arc(x, y, i === playingIndex ? CELL * .26 : CELL * .13, 0, Math.PI * 2); g.fill();
      }
    }
    const cx = (cursor.x - offset.x + .5) * CELL, cy = (cursor.y - offset.y + .5) * CELL;
    if (cursor.x >= offset.x && cursor.y >= offset.y && cursor.x < offset.x + VIEW && cursor.y < offset.y + VIEW) {
      g.strokeStyle = "#f7c85c"; g.lineWidth = 3; g.strokeRect(cx - CELL / 2 + 2, cy - CELL / 2 + 2, CELL - 4, CELL - 4);
    }
    if (scan) {
      g.fillStyle = "#f7c85c33";
      if (scanStep === "ligne") g.fillRect(0, scanRow * CELL, canvas.width, CELL);
      else g.fillRect(scanColumn * CELL, scanRow * CELL, CELL, CELL);
    }
  }, [p, route, offset, cursor, waypoints, playingIndex, scan, scanStep, scanRow, scanColumn]);

  useEffect(() => {
    if (!scan) return;
    const id = window.setInterval(() => {
      if (scanStep === "ligne") setScanRow(v => (v + 1) % Math.min(VIEW, Math.max(1, p.h - offset.y)));
      else setScanColumn(v => (v + 1) % Math.min(VIEW, Math.max(1, p.w - offset.x)));
    }, scanMs);
    return () => window.clearInterval(id);
  }, [scan, scanStep, scanMs, p.h, p.w, offset]);

  const scanPick = () => {
    if (scanStep === "ligne") { setScanStep("colonne"); setScanColumn(0); setAnnouncement("Ligne choisie. Attendez la colonne puis appuyez sur Sélectionner."); }
    else { setMode("parcours"); addPoint({ x: offset.x + scanColumn, y: offset.y + scanRow }); setScanStep("ligne"); setAnnouncement("Point ajouté. Balayage de la prochaine ligne."); }
  };
  return <div className="slame">
    <header className="slame-top">
      <button className="slame-quiet" onClick={() => { stop(); onBack(); }}>← POINTZERO</button>
      <div className="slame-brand"><strong>SLÂME</strong><span>Les mots de l'âme · La partition vivante</span></div>
      <div className="slame-top-actions"><span className="slame-proto">PROTOTYPE LOCAL</span><button className="slame-btn" onClick={() => setTab("guide")}>Mode d'emploi</button></div>
    </header>
    <nav className="slame-mobile-nav" aria-label="Sections de SLÂME">
      {([["musique", "Composer"], ["parole", "Parler"], ["accessibilite", "Accès"], ["guide", "Guide"]] as const).map(([id, label]) => <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}
    </nav>
    <div className="slame-layout">
      <aside className="slame-left">
        <p className="slame-eyebrow">ATELIER</p>
        <h2>Le fil de l'histoire</h2>
        <p>Votre broderie reste intacte. Son motif et ses gestes peuvent devenir une partition.</p>
        {([["musique", "◉", "Composer"], ["parole", "✦", "Faire parler"], ["accessibilite", "⌘", "Accessibilité"], ["guide", "?", "Mode d'emploi"]] as const).map(([id, sym, label]) =>
          <button key={id} className={"slame-nav-item " + (tab === id ? "active" : "")} onClick={() => setTab(id)}><span>{sym}</span>{label}</button>)}
        <div className="slame-info">
          <span>Motif actif</span><strong>{p.name}</strong>
          <small>{p.w} × {p.h} cases {hasPattern ? "· projet POINTZERO" : "· démonstration"}</small>
          <p>{hasPattern ? "Les motifs importés depuis une photo, un PDF ou un dessin sont directement utilisables." : "Votre projet est vide : une rosace d'exemple est affichée pour essayer SLÂME."}</p>
        </div>
      </aside>
      <main className="slame-main">
        <div className="slame-stage-heading"><div><p className="slame-eyebrow">MUSICBOX × POINTZERO</p><h1>Une grille. Des chemins. Des voix.</h1></div><span className="slame-ncount">{events.length} événements</span></div>
        <div className="slame-modes">
          <button aria-pressed={mode === "parcours"} onClick={() => setMode("parcours")}>∞ Parcours libre</button>
          <button aria-pressed={mode === "motif"} onClick={() => setMode("motif")}>▦ Écouter tout le motif</button>
        </div>
        <div className="slame-canvas-wrap">
          <canvas ref={canvasRef} width={720} height={720} tabIndex={0} role="grid"
            aria-label="Grille musicale, 24 cases visibles par côté. Flèches pour déplacer le curseur, Entrée pour ajouter un point, Retour arrière pour retirer le dernier."
            onPointerUp={e => { if (mode !== "parcours") setMode("parcours"); addPoint(pointerToPoint(e)); }}
            onKeyDown={keyMove}/>
          <div className="slame-grid-caption"><span>◉ {mode === "parcours" ? "Touchez plusieurs points A → B → C → ∞" : "Lecture des couleurs et des gestes brodés"}</span><span>{cursor.x + 1}:{cursor.y + 1}</span></div>
        </div>
        <div className="slame-navigation">
          <button onClick={() => setOffset(v => ({ ...v, x: clamp(v.x - 12, 0, Math.max(0, p.w - VIEW)) }))}>← Grille</button>
          <button onClick={() => setOffset(v => ({ ...v, y: clamp(v.y - 12, 0, Math.max(0, p.h - VIEW)) }))}>↑</button>
          <button onClick={() => setOffset(v => ({ ...v, y: clamp(v.y + 12, 0, Math.max(0, p.h - VIEW)) }))}>↓</button>
          <button onClick={() => setOffset(v => ({ ...v, x: clamp(v.x + 12, 0, Math.max(0, p.w - VIEW)) }))}>Grille →</button>
          <button onClick={() => { setWaypoints(v => v.slice(0, -1)); setMode("parcours"); }} disabled={!waypoints.length}>↶ Dernier point</button>
          <button onClick={() => { stop(); setWaypoints([]); setMode("parcours"); }}>Effacer le trajet</button>
        </div>
        <div className="slame-transport">
          <button className="slame-play" onClick={() => playing ? stop() : void play()} disabled={!events.length}>{playing ? "■ Arrêter" : "▶ Écouter ma musique"}</button>
          <label>Tempo <input type="range" min={45} max={170} value={tempo} onChange={e => setTempo(+e.target.value)}/><b>{tempo} BPM</b></label>
          <label className="slame-switch"><input type="checkbox" checked={loop} onChange={e => setLoop(e.target.checked)}/> Boucle ∞</label>
        </div>
        <div className="slame-notes"><span>Le fil musical</span><p>{visibleNotes || "Sélectionnez des points ou écoutez le motif entier."}</p></div>
        <p className="slame-status" role="status" aria-live="polite">{announcement}</p>
      </main>
      <aside className="slame-right">
        {tab === "musique" && <section><p className="slame-eyebrow">COMPOSITION</p><h2>Couleurs → Harmonie</h2>
          <p>Chaque référence DMC devient une signature musicale. La position du point fait varier la note dans la gamme choisie.</p>
          <label>Gamme <select value={scale} onChange={e => setScale(e.target.value as ScaleName)}>{Object.keys(SCALES).map(k => <option key={k} value={k}>{({ pentatonic: "Pentatonique", major: "Majeure", minor: "Mineure", dorian: "Dorienne", blues: "Blues" } as Record<string, string>)[k]}</option>)}</select></label>
          <label>Accordage <select value={tuning} onChange={e => setTuning(+e.target.value)}><option value={440}>440 Hz</option><option value={432}>432 Hz</option></select></label>
          <div className="slame-feature"><strong>∞ Pas de trajet imposé</strong><p>Revenez sur vos pas, créez des boucles et dessinez autant de segments que vous voulez. L'écoute en boucle permet de répéter la partition.</p></div>
          <div className="slame-feature"><strong>Une photo peut devenir musique</strong><p>Depuis POINTZERO, convertissez une image en motif DMC, puis ouvrez SLÂME et choisissez « Écouter tout le motif ».</p></div>
        </section>}
        {tab === "parole" && <section><p className="slame-eyebrow">COMMUNICATION</p><h2>Faire parler mon ouvrage</h2>
          <p>Choisissez volontairement les mots. Ni la couleur, ni le visage, ni la trajectoire ne prétendent deviner vos pensées.</p>
          <div className="slame-phrases">{PHRASES.map(v => <button key={v.value} className={phrase === v.value ? "selected" : ""} onClick={() => { setPhrase(v.value); if (v.group === "Essentiel") speak(v.value); }} title={v.group}>{v.value}</button>)}</div>
          <label>Mon message <textarea rows={3} value={phrase} maxLength={500} onChange={e => setPhrase(e.target.value)}/></label>
          <label>Expression choisie <select value={emotion} onChange={e => setEmotion(e.target.value as Mood)}>{Object.entries(EMOTIONS).map(([id, v]) => <option key={id} value={id}>{v.label}</option>)}</select></label>
          <label>Voix du navigateur <select value={voiceUri} onChange={e => setVoiceUri(e.target.value)}><option value="">Voix française disponible</option>{voices.filter(v => v.lang.toLowerCase().startsWith("fr")).map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}</select></label>
          <button className="slame-play slame-speak" onClick={() => speak()} disabled={!phrase.trim()}>◉ Prononcer mon message</button>
          <p className="slame-hint">Les phrases essentielles sont prononcées immédiatement quand vous les sélectionnez. Aucune alerte ni message n'est envoyé à un contact.</p>
        </section>}
        {tab === "accessibilite" && <section><p className="slame-eyebrow">COMMANDES</p><h2>Un geste suffit</h2>
          <p>La grille se pilote au toucher, au clavier ou avec un balayage simulant une commande à contacteur unique.</p>
          <label className="slame-switch"><input type="checkbox" checked={scan} onChange={e => { setScan(e.target.checked); setScanStep("ligne"); }}/> Activer le balayage</label>
          <label>Vitesse du balayage <select value={scanMs} onChange={e => setScanMs(+e.target.value)}><option value={2500}>Lente · 2,5 s</option><option value={1500}>Normale · 1,5 s</option><option value={900}>Rapide · 0,9 s</option></select></label>
          <button className="slame-play" disabled={!scan} onClick={scanPick}>Sélectionner {scanStep === "ligne" ? "cette ligne" : "cette colonne"}</button>
          <p className="slame-hint">Clavier : flèches pour parcourir, Entrée ou Espace pour choisir, Retour arrière pour annuler. Pour un contacteur, associez sa commande au bouton « Sélectionner ».</p>
          <div className="slame-feature"><strong>Webcam, mouvements de tête et souffle</strong><p>Prévus comme entrées facultatives pour une étape suivante, après calibration, consentement explicite et tests avec utilisateurs. Aucune reconnaissance émotionnelle n'est active.</p></div>
          <div className="slame-feature"><strong>Urgences</strong><p>« J'ai besoin d'aide », « Non » et « Stop » sont disponibles dans Faire parler. Un message vocal local ne remplace pas un dispositif d'alerte ou d'appel d'urgence.</p></div>
        </section>}
        {tab === "guide" && <section><p className="slame-eyebrow">MODE D'EMPLOI</p><h2>De la broderie à la voix</h2>
          <ol className="slame-guide"><li><strong>Préparez le motif</strong><p>Dans POINTZERO, dessinez, brodez ou importez une photographie convertie en couleurs DMC.</p></li><li><strong>Ouvrez SLÂME</strong><p>Depuis l'atelier, le projet courant est repris sans être modifié. Si la grille est vide, un exemple apparaît.</p></li><li><strong>Dessinez l'histoire</strong><p>En mode Parcours, choisissez A puis B, C, D et autant de points que voulu. Les lignes traversent aussi les cases intermédiaires.</p></li><li><strong>Écoutez</strong><p>Choisissez une gamme, un tempo, l'accordage et appuyez sur Écouter. Pour un motif déjà brodé, choisissez « Écouter tout le motif ».</p></li><li><strong>Faites parler</strong><p>Dans Faire parler, sélectionnez un besoin, un message affectif ou écrivez une phrase, puis choisissez son expression vocale.</p></li><li><strong>Jouez autrement</strong><p>Utilisez les flèches et Entrée, ou activez le balayage ligne/colonne avec un bouton de sélection.</p></li></ol>
          <p className="slame-hint">Version expérimentale hors ligne : synthèse Web Audio et voix native du navigateur. Pas encore de synchronisation SAL, de vraie analyse émotionnelle, ni d'envoi de contacts.</p>
        </section>}
      </aside>
    </div>
  </div>;
}
