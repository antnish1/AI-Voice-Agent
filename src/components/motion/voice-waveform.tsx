"use client";

import {usePremiumMotion} from "./motion-preference";
import { useEffect, useState } from "react";
import type { RefObject } from "react";

/** Audio activity is derived from an actual media element. No synthetic 'live' signal. */
export function VoiceWaveform({mediaRef,label="Audio playback"}:{mediaRef:RefObject<HTMLMediaElement|null>;label?:string}){
 const premium=usePremiumMotion();
 const [playing,setPlaying]=useState(false);
 useEffect(()=>{
   const media=mediaRef.current;
   if(!media)return;
   const sync=()=>setPlaying(!media.paused&&!media.ended);
   sync();
   media.addEventListener("play",sync);
   media.addEventListener("pause",sync);
   media.addEventListener("ended",sync);
   return ()=>{media.removeEventListener("play",sync);media.removeEventListener("pause",sync);media.removeEventListener("ended",sync);};
 },[mediaRef]);
 return <div className={"frontier-voice-waveform "+(playing&&premium?"is-playing":"is-idle")} role="img" aria-label={label+(playing?" playing":" paused")}>
  {Array.from({length:18},(_,i)=><span key={i} style={{"--wave-index":i,"--wave-height":.25+Math.abs(Math.sin(i*.74))*.75} as React.CSSProperties}/>)}
 </div>;
}
