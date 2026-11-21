"use client";

import {useCallback,useSyncExternalStore} from "react";

export type NavigationLayout = "sidebar" | "topbar";
const EVENT = "frontier:navigation-layout-changed";
const keyFor = (userId:string) => `frontier:nav-layout:${userId}`;

/** This preference is device-local, scoped to an authenticated user and has no API side effects. */
export function useNavigationLayout(userId:string){
 const subscribe=useCallback((onChange:()=>void)=>{
  window.addEventListener(EVENT,onChange);
  const onStorage=(event:StorageEvent)=>{if(event.key===keyFor(userId))onChange();};
  window.addEventListener("storage",onStorage);
  return ()=>{window.removeEventListener(EVENT,onChange);window.removeEventListener("storage",onStorage);};
 },[userId]);
 const snapshot=useCallback(():NavigationLayout=>{
  try{return window.localStorage.getItem(keyFor(userId))==="topbar"?"topbar":"sidebar";}
  catch{return "sidebar";}
 },[userId]);
 const layout=useSyncExternalStore(subscribe,snapshot,()=> "sidebar" as NavigationLayout);
 const setLayout=useCallback((next:NavigationLayout)=>{
  if(next!=="sidebar"&&next!=="topbar")return;
  try{window.localStorage.setItem(keyFor(userId),next);}
  catch{/* Session-only fallback; storage may be blocked by browser privacy settings. */}
  window.dispatchEvent(new Event(EVENT));
 },[userId]);
 return [layout,setLayout] as const;
}
