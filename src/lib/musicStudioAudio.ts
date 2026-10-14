import { MUSIC_SECONDS, musicEvents, type MusicScore, type MusicVoice } from "./musicStudioCore";
/** Browser-native pentatonic synthesizer. Audio is started only by a user gesture. */
export class MusicAudio {
  private context:AudioContext|null=null;
  private voices:OscillatorNode[]=[];
  private startedAt=0;
  private from=0;
  private running=false;
  async play(score:MusicScore,from:number):Promise<void>{
    this.pause();
    const NativeAudio=window.AudioContext;
    if(!NativeAudio)throw Error("Lecture audio indisponible sur ce navigateur.");
    const context=this.context??(this.context=new NativeAudio());
    await context.resume();
    this.from=Math.min(MUSIC_SECONDS,Math.max(0,from));
    this.startedAt=context.currentTime+.03;
    this.running=true;
    for(const e of musicEvents(score)){
      const ending=e.time+e.duration;
      if(ending<=this.from)continue;
      const start=this.startedAt+Math.max(0,e.time-this.from);
      const duration=Math.max(.03,ending-Math.max(e.time,this.from));
      this.schedule(context,start,duration,e.midi,e.velocity,e.voice);
    }
  }
  private schedule(context:AudioContext,start:number,duration:number,midi:number,velocity:number,voice:MusicVoice){
    const oscillator=context.createOscillator(),gain=context.createGain();
    oscillator.type=voice==="pad"?"sine":voice==="drum"?"triangle":voice==="pluck"?"triangle":"sine";
    oscillator.frequency.setValueAtTime(440*Math.pow(2,(midi-69)/12),start);
    const amp=Math.min(.13,Math.max(.009,velocity*.11))*(voice==="pad"?.7:1);
    const attack=voice==="pad"?.09:.012;
    const release=Math.min(.3,Math.max(.07,duration*.4));
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.linearRampToValueAtTime(amp,start+Math.min(attack,duration/3));
    gain.gain.setValueAtTime(amp*.65,start+Math.max(.02,duration-release));
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    oscillator.connect(gain);gain.connect(context.destination);
    oscillator.start(start);oscillator.stop(start+duration+.01);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();this.voices=this.voices.filter(v=>v!==oscillator);};
    this.voices.push(oscillator);
  }
  get position():number {
    return this.running&&this.context?Math.min(MUSIC_SECONDS,this.from+Math.max(0,this.context.currentTime-this.startedAt)):this.from;
  }
  pause():number {
    const position=this.position;
    this.running=false;this.from=position;
    for(const node of this.voices){try{node.stop();}catch{/* already stopped */}}
    this.voices=[];
    return position;
  }
  seek(sec:number){this.pause();this.from=Math.max(0,Math.min(MUSIC_SECONDS,sec));}
  dispose(){this.pause();const context=this.context;this.context=null;if(context)void context.close();}
}
