"use client";
import {useEffect,useState} from "react";
const key="frontvox-campaign-action-toast";
export function CampaignActionToast(){
 const [action,setAction]=useState<"hold"|"reject"|null>(null);
 useEffect(()=>{
  let raw:string|null=null;
  try{raw=sessionStorage.getItem(key);sessionStorage.removeItem(key);}catch{return;}
  if(!raw)return;
  try{const value=JSON.parse(raw);if(!["hold","reject"].includes(value.action)||typeof value.at!=="number"||Date.now()-value.at>60000||value.at>Date.now())return;setAction(value.action);const timer=window.setTimeout(()=>setAction(null),3500);return ()=>window.clearTimeout(timer);}catch{return;}
 },[]);
 if(!action)return null;
 return <div role="status" className={"fc-action-toast fc-action-toast-"+action}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/>{action==="hold"?<path d="M10 8v8m4-8v8"/>:<path d="m9 9 6 6m0-6-6 6"/>}</svg><strong>{action==="hold"?"Campaign on hold":"Campaign rejected"}</strong></div>;
}
