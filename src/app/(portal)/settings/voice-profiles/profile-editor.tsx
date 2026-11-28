"use client";
import {useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {saveVoiceProfile} from "./actions";
type VoiceProfile={agent_id:string;app_version:number;connection_id:string;caller_number:string;active:boolean};

function FieldIcon({kind}:{kind:"dealer"|"agent"|"version"|"connection"|"phone"|"settings"|"save"|"info"|"edit"|"close"}) {
 const shape={
  dealer:<><rect x="4" y="7" width="16" height="14" rx="1"/><path d="M8 7V3h8v4M8 12h2m4 0h2M8 16h2m4 0h2M11 21v-5h2v5"/></>,
  agent:<><path d="m12 2 8 4v6c0 5-3.3 8-8 10-4.7-2-8-5-8-10V6Z"/><path d="m9 12 2 2 4-5"/></>,
  version:<><path d="M6 6h12v12H6zM9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3"/></>,
  connection:<><rect x="3" y="5" width="18" height="14" rx="5"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></>,
  phone:<><path d="M6 3h4l2 5-3 2c1 2 3 4 5 5l2-3 5 2v4c0 2-2 3-4 3C10 20 4 14 3 7c0-2 1-4 3-4Z"/></>,
  settings:<><path d="M12 2 14 5l3-1 2 3-2 3 1 2-1 3 2 2-2 3-3-1-2 3-3-3-3 1-2-3 2-2-1-3 1-2-2-3 2-3 3 1Z"/><circle cx="12" cy="12" r="3"/></>,
  edit:<path d="m4 16 12-12 4 4-12 12-5 1zM14 6l4 4"/>,
  close:<path d="M5 5l14 14M19 5 5 19"/>,
  save:<><path d="M4 3h14l3 3v15H3V3Z"/><rect x="7" y="3" width="9" height="6" rx="1"/><rect x="7" y="13" width="10" height="7" rx="1"/></>,
  info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/></>
 }[kind];
 return <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" aria-hidden="true">{shape}</svg>;
}
function CopyButton({value,label}:{value:string;label:string}) {
 const [copied,setCopied]=useState(false);
 return <button className="vdp-copy" type="button" disabled={!value} title={copied?"Copied":`Copy ${label}`} aria-label={`Copy ${label}`} onClick={async()=>{try{await navigator.clipboard.writeText(value);setCopied(true);}catch{setCopied(false);}}}>{copied?"✓":<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/></svg>}</button>;
}
export function ProfileEditor({profile:p}:{profile:VoiceProfile|null}) {
 const router=useRouter();
 const [busy,start]=useTransition(),[message,setMessage]=useState("");
 const initial={agent:p?.agent_id??"",version:p?String(p.app_version):"",connection:p?.connection_id??"",caller:p?.caller_number??"",active:p?.active??false};
 const [saved,setSaved]=useState(initial);
 const [agent,setAgent]=useState(initial.agent),[version,setVersion]=useState(initial.version),[connection,setConnection]=useState(initial.connection),[caller,setCaller]=useState(initial.caller),[active,setActive]=useState(initial.active);
 const [editing,setEditing]=useState(false);
 const changed=agent!==saved.agent||version!==saved.version||connection!==saved.connection||caller!==saved.caller||active!==saved.active;
 const cancelEdit=()=>{setAgent(saved.agent);setVersion(saved.version);setConnection(saved.connection);setCaller(saved.caller);setActive(saved.active);setMessage("");setEditing(false);};
 const save=async(form:FormData)=>{
  if(!editing||!changed)return;
  setMessage("");
  const r=await saveVoiceProfile(form);
  if(!r.ok){setMessage(r.error??"Could not save voice defaults.");return;}
  const normalizedCaller=/^[6-9]\d{9}$/.test(caller.trim())?"+91"+caller.trim():caller;
  setCaller(normalizedCaller);
  setSaved({agent,version,connection,caller:normalizedCaller,active});
  setEditing(false);
  setMessage(active?"Saved. Global calling defaults saved and applied to unlaunched campaigns. Live calling still requires separate authorization and verified telephony.":"Saved. Global calling defaults are inactive.");
 };
 return <section className="vdp-card" aria-labelledby="vdp-card-title">
  <div className="vdp-card-title"><div className="vdp-gear"><FieldIcon kind="settings"/></div><h2 id="vdp-card-title">Global AI Calling Defaults</h2><button type="button" className="vdp-edit-toggle" disabled={busy} aria-label={editing?"Cancel editing voice agent defaults":"Edit voice agent defaults"} title={editing?"Cancel editing":"Edit defaults"} aria-pressed={editing} onClick={()=>{if(editing)cancelEdit();else{setMessage("");setEditing(true);}}}><FieldIcon kind={editing?"close":"edit"}/></button></div>
  <p className="vdp-active-context">Applies to all dealerships and unlaunched campaigns.</p>
  <div className="vdp-fields">
   <form id="vdp-save-form" className="vdp-form" data-editing={editing?"true":"false"} action={form=>start(()=>save(form))}>
    
    <label className="vdp-field vdp-agent"><span className="vdp-label"><FieldIcon kind="agent"/> Sarvam Agent ID</span><span className="vdp-control"><input name="agentId" readOnly={!editing} required value={agent} placeholder="Enter Sarvam Agent ID" autoComplete="off" onChange={e=>setAgent(e.target.value)}/><CopyButton value={agent} label="agent ID"/></span></label>
    <label className="vdp-field vdp-version"><span className="vdp-label"><FieldIcon kind="version"/> Committed Agent Version</span><span className="vdp-control"><input name="version" readOnly={!editing} type="text" inputMode="numeric" pattern="[1-9][0-9]*" required placeholder="Enter committed version (e.g. 57)" value={version} autoComplete="off" onChange={e=>setVersion(e.target.value.replace(/[^0-9]/g,""))}/></span></label>
    <label className="vdp-field vdp-connection"><span className="vdp-label"><FieldIcon kind="connection"/> Telephony Connection ID / Name</span><span className="vdp-control"><input name="connectionId" readOnly={!editing} required value={connection} placeholder="Enter telephony connection ID / name" autoComplete="off" onChange={e=>setConnection(e.target.value)}/><CopyButton value={connection} label="connection ID"/></span></label>
    <label className="vdp-field vdp-caller"><span className="vdp-label"><FieldIcon kind="phone"/> Connected Caller Number</span><span className="vdp-control"><input name="callerNumber" readOnly={!editing} type="tel" required value={caller} placeholder="Enter connected caller number" autoComplete="off" onChange={e=>setCaller(e.target.value)}/><CopyButton value={caller} label="caller number"/></span></label>
    <div className="vdp-checkbox-info"><label className="vdp-check"><input type="checkbox" name="active" value="yes" checked={active} disabled={!editing} onChange={e=>setActive(e.target.checked)}/><span>Use these defaults for all dealerships</span></label></div>
    {message&&<p className={message.startsWith("Saved.")?"vdp-success":"vdp-error"} role="status">{message}</p>}
    <div className="vdp-footer"><button type="button" className="vdp-cancel" disabled={busy} onClick={()=>editing?cancelEdit():router.push("/campaigns")}>{editing?"Cancel Edit":"Cancel"}</button><button type="submit" className="vdp-save" disabled={busy||!editing||!changed}><FieldIcon kind="save"/><span>{busy?"Saving…":"Save Draft Profile"}</span></button></div>
   </form>
  </div>
 </section>;
}
