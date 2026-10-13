import { useEffect, useRef, useState } from "react";
import { Download, Mic, Pause, Play, Square, Video, Volume2 } from "lucide-react";
import { CHAPTERS, guideVtt, type GuideChapter } from "../lib/guide";
import { downloadBlob } from "../lib/io";
import Sheet from "./Sheet";

type VoiceMode = "silent" | "system" | "file" | "mic";
interface Props { open: boolean; onClose: () => void; onBegin: () => void; onEnd: () => void; onChapter: (chapter: GuideChapter) => void }
export default function VideoStudio(props: Props) {
  const latest = useRef(props); latest.current = props;
  const [selected, setSelected] = useState<string[]>(CHAPTERS.map((c) => c.id)), [voiceMode, setVoiceMode] = useState<VoiceMode>("system"), [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]), [voiceURI, setVoiceURI] = useState("");
  const [playing, setPlaying] = useState(false), [paused, setPaused] = useState(false), [recording, setRecording] = useState(false), [chapter, setChapter] = useState<GuideChapter | null>(null), [elapsed, setElapsed] = useState(0), [error, setError] = useState(""), [result, setResult] = useState<{ url: string; blob: Blob; type: string; chapters: GuideChapter[] } | null>(null);
  const [audioDurations, setAudioDurations] = useState<Record<string, number>>({});
  const chosenChapters = () => CHAPTERS.filter((c) => selected.includes(c.id)).map((c) => ({ ...c, duration: voiceMode === "file" && audioDurations[c.id] ? Math.ceil(audioDurations[c.id] + 2) : Math.max(c.duration, Math.ceil(c.narration.split(/\s+/).length * .4 + 2)) }));
  const importVoice = async (id: string, file: File) => {
    try {
      const decoder = new OfflineAudioContext(1, 1, 48000);
      const decoded = await decoder.decodeAudioData(await file.arrayBuffer());
      if (!Number.isFinite(decoded.duration) || decoded.duration <= 0) throw new Error("Durée audio illisible");
      files.current.set(id, file); setAudioDurations((all) => ({ ...all, [id]: decoded.duration })); setError("");
    } catch { files.current.delete(id); setError("Cette narration ne peut pas être décodée. Essayez un fichier WAV, MP3 ou M4A compatible avec votre navigateur."); }
  };
  const tracks = useRef<MediaStreamTrack[]>([]), recorder = useRef<MediaRecorder | null>(null), chunks = useRef<Blob[]>([]), context = useRef<AudioContext | null>(null), destination = useRef<MediaStreamAudioDestinationNode | null>(null);
  const files = useRef(new Map<string, File>()), audio = useRef<HTMLAudioElement | null>(null), run = useRef<{ chapters: GuideChapter[]; i: number; start: number; pauseAt: number; timer: number | null } | null>(null);
  const lastURL = useRef("");
  const speak = (c: GuideChapter) => {
    if (voiceMode === "system" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(c.narration); utterance.lang = "fr-FR";
      utterance.voice = voices.find((v) => v.voiceURI === voiceURI) ?? voices.find((v) => /Amélie|Amelie|Audrey|Virginie|Julie|Denise|Google français/i.test(v.name)) ?? voices[0] ?? null;
      utterance.rate = .98; window.speechSynthesis.speak(utterance);
    }
    if (voiceMode === "file") {
      const file = files.current.get(c.id); if (!file) return;
      audio.current?.pause(); if (lastURL.current) URL.revokeObjectURL(lastURL.current);
      lastURL.current = URL.createObjectURL(file); const element = new Audio(lastURL.current); audio.current = element;
      if (context.current && destination.current) { const source = context.current.createMediaElementSource(element); source.connect(destination.current); source.connect(context.current.destination); }
      void element.play().catch(() => setError("Le navigateur a bloqué la lecture de la voix. Autorisez le son puis relancez."));
    }
  };
  const finish = () => {
    const r = run.current; if (!r) return; if (r.timer) window.clearInterval(r.timer); run.current = null;
    window.speechSynthesis?.cancel(); audio.current?.pause(); setPlaying(false); setPaused(false); setChapter(null);
    document.querySelectorAll(".guide-target").forEach((e) => e.classList.remove("guide-target"));
    latest.current.onEnd();
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
  };
  const visit = (c: GuideChapter) => {
    setChapter(c); latest.current.onChapter(c); speak(c);
    document.querySelectorAll(".guide-target").forEach((e) => e.classList.remove("guide-target"));
    window.setTimeout(() => document.querySelector(`[data-guide="${c.target}"]`)?.classList.add("guide-target"), 250);
  };
  const startPlayback = () => {
    const list = chosenChapters(); if (!list.length) return;
    latest.current.onBegin(); setPlaying(true); setPaused(false); setElapsed(0);
    const r = { chapters: list, i: 0, start: performance.now(), pauseAt: 0, timer: null as number | null }; run.current = r; visit(list[0]);
    r.timer = window.setInterval(() => {
      if (!run.current || run.current.pauseAt) return;
      const seconds = Math.floor((performance.now() - r.start) / 1000); setElapsed(seconds);
      const duration = r.chapters.slice(0, r.i + 1).reduce((n, c) => n + c.duration, 0);
      if (seconds >= duration) { if (r.i + 1 < list.length) { r.i++; visit(list[r.i]); } else finish(); }
    }, 250);
  };
  const record = async () => {
    setError("");
    if (!navigator.mediaDevices?.getDisplayMedia || !window.MediaRecorder) { setError("Cet appareil ne propose pas la capture web. Sur iPad, lancez la visite puis utilisez l’enregistrement d’écran du Centre de contrôle, avec votre micro si nécessaire."); return; }
    if (voiceMode === "system") { setError("La synthèse vocale de l’appareil n’est pas enregistrée de façon fiable avec l’onglet. Pour une vidéo avec une vraie voix, choisissez un fichier audio par chapitre ou le microphone. La visite avec voix système reste disponible sans enregistrement."); return; }
    if (voiceMode === "file" && selected.some((id) => !files.current.has(id))) { setError("Ajoutez un fichier de voix pour chaque chapitre sélectionné avant de filmer."); return; }
    try {
      const recordedChapters = chosenChapters();
      const options = { video: { displaySurface: "browser", frameRate: 30 }, audio: false, preferCurrentTab: true, selfBrowserSurface: "include" };
      const display = await navigator.mediaDevices.getDisplayMedia(options); tracks.current = display.getTracks();
      const mixed = new MediaStream(display.getVideoTracks());
      if (voiceMode === "file" || voiceMode === "mic") {
        context.current = new AudioContext(); await context.current.resume(); destination.current = context.current.createMediaStreamDestination();
        if (voiceMode === "mic") { const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true }, video: false }); tracks.current.push(...mic.getTracks()); context.current.createMediaStreamSource(mic).connect(destination.current); }
        destination.current.stream.getAudioTracks().forEach((track) => mixed.addTrack(track));
      }
      const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/mp4", "video/webm"].find((v) => MediaRecorder.isTypeSupported(v));
      const rec = new MediaRecorder(mixed, mime ? { mimeType: mime, videoBitsPerSecond: 5000000 } : undefined); recorder.current = rec; chunks.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: rec.mimeType });
        setResult({ url: URL.createObjectURL(blob), blob, type: rec.mimeType, chapters: recordedChapters }); setRecording(false);
        tracks.current.forEach((t) => t.stop()); tracks.current = []; void context.current?.close(); context.current = null; destination.current = null;
      };
      display.getVideoTracks()[0].addEventListener("ended", finish, { once: true });
      rec.start(1000); setRecording(true); startPlayback();
    } catch (e) { tracks.current.forEach((t) => t.stop()); tracks.current = []; void context.current?.close(); context.current = null; destination.current = null; setError(e instanceof Error ? e.message : "Capture refusée"); }
  };
  const togglePause = () => {
    const r = run.current; if (!r) return;
    if (!paused) { r.pauseAt = performance.now(); recorder.current?.state === "recording" && recorder.current.pause(); window.speechSynthesis?.pause(); audio.current?.pause(); }
    else { r.start += performance.now() - r.pauseAt; r.pauseAt = 0; recorder.current?.state === "paused" && recorder.current.resume(); window.speechSynthesis?.resume(); if (audio.current) void audio.current.play(); }
    setPaused(!paused);
  };
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const update = () => { const all = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("fr")); setVoices(all); };
    update(); window.speechSynthesis.addEventListener("voiceschanged", update); return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);
  useEffect(() => () => { if (run.current?.timer) window.clearInterval(run.current.timer); tracks.current.forEach((t) => t.stop()); audio.current?.pause(); window.speechSynthesis?.cancel(); if (lastURL.current) URL.revokeObjectURL(lastURL.current); }, []);
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);
  const downloadScript = () => downloadBlob(new Blob([CHAPTERS.filter((c) => selected.includes(c.id)).map((c) => `${c.title} (${c.duration}s)\n${c.narration}`).join("\n\n")], { type: "text/plain;charset=utf-8" }), "point-zero-script-voix-fr.txt");
  return <>
    <Sheet open={props.open && !playing} onClose={props.onClose} title="Studio de présentation" subtitle="La vraie interface. Chapitre par chapitre.">
      <p className="mb-4 text-[13px] leading-relaxed text-label-2">La visite actionne l’atelier réel sur une copie de démonstration. Pour filmer, choisissez cet onglet dans la fenêtre de partage du navigateur. Aucun enregistrement préfabriqué ni fausse capture n’est utilisé.</p>
      <div className="divide-y divide-white/10">{CHAPTERS.map((c, i) => <div key={c.id} className="py-3"><label className="flex items-center gap-3"><input type="checkbox" checked={selected.includes(c.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, c.id] : selected.filter((v) => v !== c.id))} /><span className="flex-1 text-[13px]"><span className="mr-2 font-mono text-label-3">0{i + 1}</span>{c.title}</span><span className="text-[11px] text-label-3">{voiceMode === "file" && audioDurations[c.id] ? Math.ceil(audioDurations[c.id] + 2) : Math.max(c.duration, Math.ceil(c.narration.split(/\s+/).length * .4 + 2))}s</span></label><button type="button" className="ml-6 mt-1 text-[10px] text-accent-2" onClick={() => setSelected([c.id])}>Sélectionner ce chapitre seulement</button>{voiceMode === "file" && <label className="mt-2 block text-[11px] text-label-3">Enregistrement de voix pour ce chapitre<input type="file" accept="audio/*" className="mt-1 block w-full text-[11px]" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importVoice(c.id, f); }} /></label>}</div>)}</div>
      <label className="mt-5 block text-[12px] text-label-2">Narration<select className="field mt-2" value={voiceMode} onChange={(e) => setVoiceMode(e.target.value as VoiceMode)}><option value="system">Voix française de l’appareil (visite)</option><option value="file">Vraie voix : fichiers audio importés</option><option value="mic">Vraie voix : mon microphone</option><option value="silent">Sans voix, avec sous-titres</option></select></label>
      {voiceMode === "system" && <><select className="field mt-2" value={voiceURI} onChange={(e) => setVoiceURI(e.target.value)} aria-label="Voix française"><option value="">Voix française recommandée</option>{voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name}{v.localService ? " · locale" : " · service système"}</option>)}</select><p className="mt-2 text-[11px] text-label-3">Voix féminines possibles selon l’appareil : Amélie, Audrey, Virginie. Disponibilité et naturel ne sont pas garantis. Les voix système restent synthétiques ; certaines utilisent le service vocal de votre appareil.</p><button className="mt-2 flex items-center gap-2 text-[12px] text-accent-2" onClick={() => speak(CHAPTERS[0])}><Volume2 size={15} />Écouter la voix</button></>}
      {voiceMode === "file" && <p className="mt-2 text-[11px] text-label-3">Pour une voix féminine véritablement naturelle, importez une narration enregistrée avec l’accord de la comédienne. Le son est injecté directement dans la vidéo. Adaptez sa durée au chapitre indiqué.</p>}
      <div className="mt-5 flex gap-2"><button className="btn-quiet flex-1" disabled={!selected.length} onClick={startPlayback}><Play size={16} />Visite guidée</button><button className="btn-primary flex-1" disabled={!selected.length} onClick={() => void record()}><Video size={16} />Filmer</button></div>
      <div className="mt-3 flex items-center justify-between"><button className="text-[12px] text-accent-2" onClick={downloadScript}>Script pour la narratrice</button><button className="text-[12px] text-accent-2" onClick={() => downloadBlob(new Blob([guideVtt(result?.chapters ?? chosenChapters())], { type: "text/vtt" }), "point-zero-chapitres.vtt")}>Sous-titres VTT</button></div>
      {result && <div className="mt-5"><video src={result.url} controls className="w-full rounded-[12px] bg-black" /><button className="btn-tinted mt-3 w-full" onClick={() => downloadBlob(result.blob, `point-zero-${result.chapters.length === 1 ? result.chapters[0].id : "presentation-complete"}.${result.type.includes("mp4") ? "mp4" : "webm"}`)}><Download size={16} />Télécharger la vidéo enregistrée</button><p className="mt-2 text-[11px] text-label-3">{result.chapters.length} chapitre(s) · {(result.blob.size / 1048576).toFixed(1)} Mo. Les sous-titres reprennent le script, pas une transcription automatique de la voix.</p></div>}
      {error && <p role="alert" className="mt-4 text-[12px] leading-relaxed text-warn">{error}</p>}
      <p className="mt-4 text-[11px] text-label-3">La capture exige une permission et un navigateur compatible sur ordinateur, en HTTPS. Sur tablette, la visite fonctionne ; utilisez la capture système si l’API n’est pas disponible. Le script ne prétend pas que tous les PDF sont importables.</p>
    </Sheet>
    {playing && chapter && <div className="glass-strong fixed left-1/2 top-[80px] z-[65] w-[min(520px,calc(100vw-24px))] -translate-x-1/2 rounded-[18px] px-4 py-3" role="status">
      <div className="flex items-center gap-3"><span className={`h-2 w-2 rounded-full ${recording ? "bg-danger animate-pulse" : "bg-accent"}`} /><span className="flex-1 text-[13px] font-semibold">{chapter.title}</span><span className="font-mono text-[11px] text-label-3">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span><button className="btn-icon h-8 w-8" onClick={togglePause} aria-label={paused ? "Reprendre" : "Pause"}>{paused ? <Play size={15} /> : <Pause size={15} />}</button><button className="btn-icon h-8 w-8" onClick={finish} aria-label="Terminer"><Square size={14} /></button></div>
      <p className="mt-1 text-[12px] leading-relaxed text-label-2">{chapter.narration}</p>{voiceMode === "mic" && <span className="mt-2 flex items-center gap-1 text-[10px] text-danger"><Mic size={11} />Votre micro est enregistré</span>}
    </div>}
  </>;
}