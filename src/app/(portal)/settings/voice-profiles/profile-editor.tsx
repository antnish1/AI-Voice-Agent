"use client";
import {useState,useTransition} from "react";
import {saveVoiceProfile} from "./actions";
type SarvamOption={id:string;name:string;direction:string;status:string;version:unknown};
type VerifiedDetails={deploymentId:string;agentId:string;version:number;channelDirection:string;status:string;eligible:boolean;connections:{connectionId:string;callerNumber:string}[];reason:string|null};
type Dealership={id:string;name:string;profile?:{agent_id:string;app_version:number;connection_id:string;caller_number:string;active:boolean}|null};
function FieldIcon({kind}:{kind:"dealer"|"agent"|"version"|"connection"|"phone"|"settings"|"save"|"info"}) {
 const shape={
  dealer:<><rect x="4" y="7" width="16" height="14" rx="1"/><path d="M8 7V3h8v4M8 12h2m4 0h2M8 16h2m4 0h2M11 21v-5h2v5"/></>,
  agent:<><path d="m12 2 8 4v6c0 5-3.3 8-8 10-4.7-2-8-5-8-10V6Z"/><path d="m9 12 2 2 4-5"/></>,
  version:<><path d="M6 6h12v12H6zM9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3"/></>,
  connection:<><rect x="3" y="5" width="18" height="14" rx="5"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></>,
  phone:<><path d="M6 3h4l2 5-3 2c1 2 3 4 5 5l2-3 5 2v4c0 2-2 3-4 3C10 20 4 14 3 7c0-2 1-4 3-4Z"/></>,
  settings:<><path d="M12 2 14 5l3-1 2 3-2 3 1 2-1 3 2 2-2 3-3-1-2 3-3-3-3 1-2-3 2-2-1-3 1-2-2-3 2-3 3 1Z"/><circle cx="12" cy="12" r="3"/></>,
  save:<><path d="M4 3h14l3 3v15H3V3Z"/><rect x="7" y="3" width="9" height="6" rx="1"/><rect x="7" y="13" width="10" height="7" rx="1"/></>,
  info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/></>
 }[kind];
 return <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" aria-hidden="true">{shape}</svg>;
}
function CopyButton({value,label}:{value:string;label:string}) {
 const [copied,setCopied]=useState(false);
 return <button className="vdp-copy" type="button" disabled={!value} title={copied?"Copied":`Copy ${label}`} aria-label={`Copy ${label}`} onClick={async()=>{try{await navigator.clipboard.writeText(value);setCopied(true);}catch{setCopied(false);}}}>{copied?"✓":<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/></svg>}</button>;
}
export function ProfileEditor({dealerships}:{dealerships:Dealership[]}) {
 const [id,setId]=useState(dealerships[0]?.id??""),[busy,start]=useTransition(),[message,setMessage]=useState("");
 const dealer=dealerships.find(d=>d.id===id),p=dealer?.profile;
 const [revision,setRevision]=useState(0);
 const [activateDefaults,setActivateDefaults]=useState(dealerships[0]?.profile?.active??false);
 const [options,setOptions]=useState<SarvamOption[]>([]);
 const [selectedDeployment,setSelectedDeployment]=useState("");
 const [verified,setVerified]=useState<VerifiedDetails|null>(null);
 const [selectedConnection,setSelectedConnection]=useState(0);
 const [loading,setLoading]=useState(false),[lookupError,setLookupError]=useState("");
 const [agent,setAgent]=useState(p?.agent_id??""),[version,setVersion]=useState(String(p?.app_version??1)),[connection,setConnection]=useState(p?.connection_id??""),[caller,setCaller]=useState(p?.caller_number??"");
 function changeDealer(value:string){const selected=dealerships.find(d=>d.id===value)?.profile;setId(value);setRevision(v=>v+1);setMessage("");setAgent(selected?.agent_id??"");setVersion(String(selected?.app_version??1));setConnection(selected?.connection_id??"");setCaller(selected?.caller_number??"");setActivateDefaults(selected?.active??false);setVerified(null);setSelectedDeployment("");setOptions([]);setLookupError("");}
 async function loadDeployments(){
  setLoading(true);setLookupError("");setVerified(null);setSelectedDeployment("");setOptions([]);
  try{
   const response=await fetch("/api/sarvam/verified-profile",{cache:"no-store"});
   const result=await response.json();
   if(!response.ok)throw Error(result.error??"Could not fetch Sarvam deployments.");
   setOptions(result.deployments??[]);
   if(!result.deployments?.length)setLookupError("No outbound Sarvam deployments found in this workspace. Check the workspace or committed agent deployment.");
  }catch(e){setLookupError(e instanceof Error?e.message:"Sarvam lookup failed.");}
  finally{setLoading(false);}
 }
 async function chooseDeployment(deploymentId:string){
  setSelectedDeployment(deploymentId);setVerified(null);setLookupError("");
  if(!deploymentId)return;
  setLoading(true);
  try{
   const response=await fetch("/api/sarvam/verified-profile?deploymentId="+encodeURIComponent(deploymentId),{cache:"no-store"});
   const result=await response.json();
   if(!response.ok)throw Error(result.error??"Cannot verify this Sarvam deployment.");
   if(!result.eligible){setLookupError(result.reason??"The deployment is not eligible for outbound calls.");return;}
   const details=result as VerifiedDetails;
   setVerified(details);setSelectedConnection(0);setAgent(details.agentId);setVersion(String(details.version));
   setConnection(details.connections[0]?.connectionId??"");setCaller(details.connections[0]?.callerNumber??"");setMessage("");
  }catch(e){setLookupError(e instanceof Error?e.message:"Could not verify deployment.");}
  finally{setLoading(false);}
 }
 function selectConnection(index:number){
  setSelectedConnection(index);
  const selected=verified?.connections[index];
  if(selected){setConnection(selected.connectionId);setCaller(selected.callerNumber);}
  setMessage("");
 }
 return <section className="vdp-card" aria-labelledby="vdp-card-title">
  <div className="vdp-card-title"><div className="vdp-gear"><FieldIcon kind="settings"/></div><div><h2 id="vdp-card-title">Dealership AI Calling Defaults</h2><p>Configure default settings for your dealership&apos;s AI calling campaigns. These settings will be applied to new campaigns unless overridden.</p></div></div>
  <div className="vdp-lookup">
   <div className="vdp-lookup-head"><strong>Import verified settings from Sarvam</strong><button type="button" className="vdp-load-button" onClick={()=>void loadDeployments()} disabled={loading||busy}>{loading?"Checking Sarvam…":"Load from Sarvam"}</button></div>
   {options.length>0&&<label className="vdp-lookup-field">Outbound deployment
    <select value={selectedDeployment} disabled={loading||busy} onChange={e=>void chooseDeployment(e.target.value)}>
     <option value="">Select verified deployment</option>
     {options.map(o=><option key={o.id} value={o.id}>{o.name} · v{o.version==null?"?":String(o.version)} · {o.status||"status unknown"}</option>)}
    </select>
   </label>}
   {verified?.eligible&&<div className="vdp-lookup-status">
    {verified.connections.length>1&&<label className="vdp-lookup-field">Connected caller number
     <select value={selectedConnection} onChange={e=>selectConnection(Number(e.target.value))}>
      {verified.connections.map((c,i)=><option key={c.connectionId+"-"+c.callerNumber} value={i}>{c.callerNumber} · {c.connectionId}</option>)}
     </select>
    </label>}
    <span>Verified outbound deployment loaded. Review the fields and save; no calls are placed.</span>
   </div>}
   {lookupError&&<p className="vdp-error" role="alert">{lookupError}</p>}
  </div>
  <div className="vdp-fields">
   <label className="vdp-field vdp-dealer"><span className="vdp-label"><FieldIcon kind="dealer"/> Dealership</span><span className="vdp-control"><select value={id} onChange={e=>changeDealer(e.target.value)}>{dealerships.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></span></label>
   <form id="vdp-save-form" className="vdp-form" key={id+"-"+revision} onChange={()=>setMessage("")} action={form=>start(async()=>{setMessage("");form.set("active",activateDefaults?"yes":"no");const r=await saveVoiceProfile(form);setMessage(r.error??r.message??"Profile saved.");})}>
    <input type="hidden" name="dealershipId" value={id}/>
    <label className="vdp-field vdp-agent"><span className="vdp-label"><FieldIcon kind="agent"/> Sarvam Agent ID</span><span className="vdp-control"><input name="agentId" required value={agent} onChange={e=>{setAgent(e.target.value);setMessage("");}} placeholder="Enter verified Agent ID"/><CopyButton value={agent} label="agent ID"/></span></label>
    <label className="vdp-field vdp-version"><span className="vdp-label"><FieldIcon kind="version"/> Committed Agent Version</span><span className="vdp-control"><input name="version" required type="number" min={1} value={version} onChange={e=>{setVersion(e.target.value);setMessage("");}} placeholder="Committed version number"/></span></label>
    <label className="vdp-field vdp-connection"><span className="vdp-label"><FieldIcon kind="connection"/> Telephony Connection ID or Name</span><span className="vdp-control"><input name="connectionId" required value={connection} onChange={e=>{setConnection(e.target.value);setMessage("");}} placeholder="e.g. Sarvam Managed (Vobiz)"/><CopyButton value={connection} label="connection ID"/></span></label>
    <label className="vdp-field vdp-caller"><span className="vdp-label"><FieldIcon kind="phone"/> Connected Caller Number</span><span className="vdp-control"><input name="callerNumber" required value={caller} onChange={e=>{setCaller(e.target.value);setMessage("");}} type="tel" placeholder="8064272200 or +918064272200"/><CopyButton value={caller} label="caller number"/></span></label>
    <div className="vdp-checkbox-info"><label className="vdp-check"><input type="checkbox" name="active" value="yes" checked={activateDefaults} onChange={e=>{setActivateDefaults(e.target.checked);setMessage("");}}/><span>Use these verified defaults for newly created drafts</span></label><div className="vdp-info"><FieldIcon kind="info"/><span>Connection names can be saved as inactive drafts. Verified telephony IDs, consent checks and approval are required before calling.</span></div></div>
    {message&&<p className={message.startsWith("Profile saved")?"vdp-success":"vdp-error"} role="status">{message}</p>}
    <button type="submit" className="vdp-save" disabled={busy}><FieldIcon kind="save"/><span>{busy?"Saving…":"Save Default Profile"}</span><span className="vdp-save-arrow" aria-hidden="true">➜</span></button>
   </form>
  </div>
 </section>;
}
