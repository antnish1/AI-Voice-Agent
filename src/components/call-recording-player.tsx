"use client";
import {VoiceWaveform} from "./motion/voice-waveform";
import {useRef,useState} from "react";
const time=(seconds:number)=>{const n=Math.max(0,Math.floor(seconds));return Math.floor(n/60)+":"+String(n%60).padStart(2,"0");};
export function CallRecordingPlayer({callId,duration}:{callId:string;duration:string|number|null|undefined}){
 const mediaRef=useRef<HTMLAudioElement>(null);
 const [current,setCurrent]=useState(0),[mediaDuration,setMediaDuration]=useState<number|null>(null),[error,setError]=useState(false);
 const stored=duration!==null&&duration!==undefined&&duration!==""&&Number.isFinite(Number(duration))&&Number(duration)>=0?Number(duration):null;
 const total=mediaDuration??stored;
 return <div style={{maxWidth:440}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6,fontVariantNumeric:"tabular-nums"}}><strong>{time(current)} / {total===null?"—":time(total)}</strong><small className="muted">{mediaDuration===null?"Call duration":"Recording duration"}</small></div><VoiceWaveform mediaRef={mediaRef}/><audio ref={mediaRef} controls preload="metadata" style={{width:"100%"}} src={"/api/reports/recording?id="+encodeURIComponent(callId)} onLoadedMetadata={e=>{const d=e.currentTarget.duration;if(Number.isFinite(d)&&d>=0)setMediaDuration(d);setError(false);}} onDurationChange={e=>{const d=e.currentTarget.duration;if(Number.isFinite(d)&&d>=0)setMediaDuration(d);}} onTimeUpdate={e=>setCurrent(e.currentTarget.currentTime)} onError={()=>setError(true)}/>{error&&<p role="alert" className="muted">Recording could not be loaded from Sarvam. The duration above is the stored call duration, not verified audio length.</p>}</div>;
}
