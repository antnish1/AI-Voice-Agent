"use client";
import {useEffect,useState} from "react";

export type ThemeChoice="light"|"dark"|"system";
const KEY="frontvox-theme-preference";
function parse(value:string|null):ThemeChoice {return value==="light"||value==="dark"||value==="system"?value:"system";}
function apply(choice:ThemeChoice,systemDark:boolean){
 const isDark=choice==="dark"||(choice==="system"&&systemDark);
 document.documentElement.dataset.theme=isDark?"dark":"light";
 document.documentElement.dataset.themePreference=choice;
 document.documentElement.style.colorScheme=isDark?"dark":"light";
}
export function ThemeController(){
 useEffect(()=>{
  const media=window.matchMedia("(prefers-color-scheme: dark)");
  const update=()=>apply(parse(window.localStorage.getItem(KEY)),media.matches);
  update();
  const storage=(e:StorageEvent)=>{if(e.key===KEY)update();};
  const change=()=>update();
  window.addEventListener("storage",storage);
  window.addEventListener("frontvox-theme-change",change);
  media.addEventListener("change",change);
  return()=>{window.removeEventListener("storage",storage);window.removeEventListener("frontvox-theme-change",change);media.removeEventListener("change",change);};
 },[]);
 return null;
}
export function ThemeSwitcher(){
 const [choice,setChoice]=useState<ThemeChoice>("system");
 useEffect(()=>{
  const read=()=>setChoice(parse(window.localStorage.getItem(KEY)));
  read();window.addEventListener("storage",read);
  return()=>window.removeEventListener("storage",read);
 },[]);
 const choose=(next:ThemeChoice)=>{
  window.localStorage.setItem(KEY,next);
  setChoice(next);
  window.dispatchEvent(new Event("frontvox-theme-change"));
 };
 return <fieldset className="frontvox-theme-fieldset">
  <legend className="sr-only">Color theme</legend>
  <div className="frontvox-theme-switch" role="radiogroup" aria-label="Color theme">
   {(["system","light","dark"] as const).map(kind=><label key={kind} title={kind==="system"?"System (follow device)":kind==="light"?"Light theme":"Dark theme"} className={choice===kind?"selected":""}>
    <input type="radio" name="frontvox-theme" checked={choice===kind} onChange={()=>choose(kind)} value={kind}/>
    {kind==="system"?<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="15" rx="2"/><path d="M8 22h8M12 19v3M7 8h10v7H7z"/></svg>:kind==="light"?<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>:<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.3 15.9A9 9 0 0 1 8.1 3.7 9 9 0 1 0 20.3 15.9Z"/><path d="M19 3v5m-2.5-2.5h5"/></svg>}
    <span>{kind==="system"?"System":kind==="light"?"Light":"Dark"}</span>
   </label>)}
  </div>
 </fieldset>;
}
