"use client";
import {createContext,useContext,useEffect,useState,type ReactNode} from "react";
import {useReducedMotion} from "motion/react";
export type MotionPreference="premium"|"minimal"|"off";
const Context=createContext<{preference:MotionPreference;setPreference:(v:MotionPreference)=>void}>({preference:"premium",setPreference:()=>{}});
export function MotionPreferenceProvider({userId,children}:{userId:string;children:ReactNode}){
 const [preference,setValue]=useState<MotionPreference>("premium");
 const key="frontier:motion:"+userId;
 useEffect(()=>{const read=()=>{try{const v=localStorage.getItem(key);setValue(v==="minimal"||v==="off"?v:"premium");}catch{setValue("premium");}};read();const sync=(e:StorageEvent)=>{if(e.key===key)read();};window.addEventListener("storage",sync);return()=>window.removeEventListener("storage",sync);},[key]);
 const setPreference=(v:MotionPreference)=>{setValue(v);try{localStorage.setItem(key,v);}catch{/* device storage unavailable */}};
 useEffect(()=>{document.documentElement.dataset.motionPreference=preference;return()=>{delete document.documentElement.dataset.motionPreference;};},[preference]);
 return <Context.Provider value={{preference,setPreference}}>{children}</Context.Provider>;
}
export function useMotionPreference(){return useContext(Context);}
export function usePremiumMotion(){const {preference}=useMotionPreference();const reduced=useReducedMotion();return preference==="premium"&&!reduced;}
export function MotionPreferences(){const {preference,setPreference}=useMotionPreference();return <section className="settings-ref-card frontier-motion-settings"><h3>Animation Preferences</h3><p>Choose your visual experience on this device. System reduced-motion settings always take priority.</p><fieldset><legend className="sr-only">Animation preferences</legend>{([["premium","Premium","Smooth transitions, charts and subtle visual effects"],["minimal","Minimal","Essential interaction feedback only"],["off","Disabled","No decorative motion"]] as const).map(([value,label,desc])=><label key={value} className="frontier-motion-option"><input type="radio" name="frontier-motion-preference" checked={preference===value} onChange={()=>setPreference(value)}/><span><strong>{label}</strong><small>{desc}</small></span></label>)}</fieldset></section>;}
