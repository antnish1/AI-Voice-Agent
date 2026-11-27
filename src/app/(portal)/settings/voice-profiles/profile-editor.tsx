"use client";
import {useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {saveVoiceProfile} from "./actions";
import {agentSnapshot,snapshotDate} from "@/lib/sarvam/voice-discovery-snapshot";
type Dealership={id:string;name:string;profile?:{agent_id:string;app_version:number;connection_id:string;caller_number:string;active:boolean}|null};
type DeploymentOption={deploymentId:string;label:string;agentId:string;version:number;connectionId:string;callerNumber:string};
type ImportResult={ok:boolean;code:string;message:string;options?:DeploymentOption[];counts?:{total:number;scanned:number;outbound:number;active:number;verified:number}};

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
 const router=useRouter();
 const [id,setId]=useState(dealerships[0]?.id??""),[busy,start]=useTransition(),[message,setMessage]=useState("");
 const dealer=dealerships.find(d=>d.id===id),p=dealer?.profile;
 const [revision,setRevision]=useState(0);
 const [loadingSarvam,setLoadingSarvam]=useState(false);
 const [importResult,setImportResult]=useState<ImportResult|null>(null);
 const [deploymentId,setDeploymentId]=useState("");
 async function loadSarvam(){
  setLoadingSarvam(true);setImportResult(null);setDeploymentId("");
  try{
   const response=await fetch("/api/sarvam/voice-deployments?dealershipId="+encodeURIComponent(id),{method:"GET",cache:"no-store"});
   const data:ImportResult=await response.json();
   setImportResult(data);
  }catch{setImportResult({ok:false,code:"NETWORK",message:"Could not contact the Frontier Voice CRM Sarvam import endpoint. Verify network access and try again."});}
  finally{setLoadingSarvam(false);}
 }
 function applySarvam(){
  const selected=importResult?.options?.find(x=>x.deploymentId+"|"+x.connectionId+"|"+x.callerNumber===deploymentId);
  if(!selected)return;
  setAgent(selected.agentId);setVersion(String(selected.version));setConnection(selected.connectionId);setCaller(selected.callerNumber);
  setMessage(importResult?.code==="saved_defaults"?"Saved dealership defaults loaded. Live Sarvam availability is not verified by this request. No settings or calls were changed.":"Settings loaded into the form. Review current agent and phone availability before saving; no agent or calls were changed.");
 }

 const [agent,setAgent]=useState(p?.agent_id??""),[version,setVersion]=useState(String(p?.app_version??1)),[connection,setConnection]=useState(p?.connection_id??""),[caller,setCaller]=useState(p?.caller_number??"");
 function changeDealer(value:string){const selected=dealerships.find(d=>d.id===value)?.profile;setId(value);setRevision(v=>v+1);setMessage("");setAgent(selected?.agent_id??"");setVersion(String(selected?.app_version??1));setConnection(selected?.connection_id??"");setCaller(selected?.caller_number??"");setImportResult(null);setDeploymentId("");}
 return <section className="vdp-card" aria-labelledby="vdp-card-title">
  <div className="vdp-card-title"><div className="vdp-gear"><FieldIcon kind="settings"/></div><h2 id="vdp-card-title">Dealership AI Calling Defaults</h2><button type="button" className="vdp-import-btn" onClick={()=>void loadSarvam()} disabled={loadingSarvam||!id||busy}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 15v5h16v-5"/></svg>{loadingSarvam?"Checking workspace…":"Load from Sarvam"}</button></div>
  {importResult&&<div className="vdp-import">
   <div className={importResult.ok&&importResult.code!=="saved_defaults"&&importResult.options?.length?"vdp-import-ok":"vdp-import-notice"} role="status">
    <p>{importResult.message}</p>
    {importResult.counts&&<p>Workspace results: {importResult.counts.scanned} deployments checked · {importResult.counts.outbound} outbound-capable · {importResult.counts.verified} verified calling configurations.</p>}
    {importResult.options?.length? <div className="vdp-import-select"><label htmlFor="vdp-select-deployment">{importResult.code==="saved_defaults"?"Saved dealership configuration":"Available calling configurations"}</label><select id="vdp-select-deployment" value={deploymentId} onChange={e=>setDeploymentId(e.target.value)}><option value="">Select an agent + phone number</option>{importResult.options.map((d,i)=><option key={d.deploymentId+"-"+i} value={d.deploymentId+"|"+d.connectionId+"|"+d.callerNumber}>{d.label} · v{d.version} · {d.callerNumber}</option>)}</select><button type="button" disabled={!deploymentId} onClick={applySarvam}>Use selected settings</button></div>:null}
    {importResult.code==="no_deployments"||importResult.code==="no_outbound"||importResult.code==="incomplete"?<p>Open Sarvam → Build → Agents for the committed version and Deploy → Phone Numbers for the connection ID and caller number. You can complete the fields below manually without creating a deployment.</p>:null}
   </div>
  </div>}
  <div className="vdp-fields">
   <label className="vdp-field vdp-dealer"><span className="vdp-label"><FieldIcon kind="dealer"/> Dealership</span><span className="vdp-control"><select value={id} disabled={loadingSarvam} onChange={e=>changeDealer(e.target.value)}>{dealerships.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></span></label>
   <form id="vdp-save-form" className="vdp-form" key={id+"-"+revision} action={form=>start(async()=>{setMessage("");const r=await saveVoiceProfile(form);setMessage(r.error??(form.get("active")==="yes"?"Saved. Calling defaults are ACTIVE for new campaign drafts. Live calling still requires separate authorization and verified telephony.":"Saved. Calling defaults are INACTIVE for new campaign drafts."));if(r.ok&&/^[6-9]\d{9}$/.test(caller.trim()))setCaller("+91"+caller.trim());})}>
    <input type="hidden" name="dealershipId" value={id}/>
    <p className="vdp-field" role="status">Agent and committed-version catalogue: last verified {snapshotDate}. Phone options come from saved profiles or imported configurations; they are not live discovery.</p>
    <label className="vdp-field vdp-agent"><span className="vdp-label"><FieldIcon kind="agent"/> Sarvam AI Agent</span><span className="vdp-control"><select name="agentId" required value={agent} onChange={e=>{setAgent(e.target.value);setVersion("");}}><option value="">Select agent</option>{agent&&!agentSnapshot.some(a=>a.id===agent)&&<option value={agent}>{agent} (saved/imported)</option>}{agentSnapshot.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><CopyButton value={agent} label="agent ID"/></span></label>
    <label className="vdp-field vdp-version"><span className="vdp-label"><FieldIcon kind="version"/> Committed Agent Version</span><span className="vdp-control"><select name="version" required value={version} onChange={e=>setVersion(e.target.value)}><option value="">Select committed version</option>{version&&!(agentSnapshot.find(a=>a.id===agent)?.versions??[]).includes(Number(version))&&<option value={version}>v{version} (saved/imported; not catalogue verified)</option>}{(agentSnapshot.find(a=>a.id===agent)?.versions??[]).map(v=><option key={v} value={v}>Version {v}</option>)}</select></span></label>
    <label className="vdp-field vdp-connection"><span className="vdp-label"><FieldIcon kind="connection"/> Telephony Connection</span><span className="vdp-control"><select name="connectionId" required value={connection} onChange={e=>{setConnection(e.target.value);setCaller("");}}><option value="">Select connection</option>{Array.from(new Set([connection,...dealerships.flatMap(d=>d.profile?[d.profile.connection_id]:[]),...(importResult?.options??[]).map(o=>o.connectionId)].filter(Boolean))).map(v=><option key={v} value={v}>{v}</option>)}</select><CopyButton value={connection} label="connection ID"/></span></label>
    <label className="vdp-field vdp-caller"><span className="vdp-label"><FieldIcon kind="phone"/> Connected Caller Number</span><span className="vdp-control"><select name="callerNumber" required value={caller} onChange={e=>setCaller(e.target.value)}><option value="">Select caller number</option>{Array.from(new Set([caller,...dealerships.flatMap(d=>d.profile?.connection_id===connection?[d.profile.caller_number]:[]),...(importResult?.options??[]).filter(o=>o.connectionId===connection).map(o=>o.callerNumber)].filter(Boolean))).map(v=><option key={v} value={v}>{v}</option>)}</select><CopyButton value={caller} label="caller number"/></span></label>
    <div className="vdp-checkbox-info"><label className="vdp-check"><input type="checkbox" name="active" value="yes" defaultChecked={p?.active??false}/><span>Use these defaults for newly created drafts</span></label></div>
    {message&&<p className={message.startsWith("Saved.")?"vdp-success":"vdp-error"} role="status">{message}</p>}
    <div className="vdp-footer"><button type="button" className="vdp-cancel" disabled={busy||loadingSarvam} onClick={()=>router.push("/campaigns")}>Cancel</button><button type="submit" className="vdp-save" disabled={busy||loadingSarvam}><FieldIcon kind="save"/><span>{busy?"Saving…":"Save Draft Profile"}</span></button></div>
   </form>
  </div>
 </section>;
}
