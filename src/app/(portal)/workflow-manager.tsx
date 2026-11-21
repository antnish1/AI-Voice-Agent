"use client";
import {useMemo,useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {createWorkflow,updateWorkflow,type WorkflowKind} from "./workflow-actions";

export type WorkflowRecord={
 id:string;dealership_id:string;customer_name:string;mobile:string;status:string;
 notes:string;requested_at?:string;appointment_at?:string;priority?:string;purpose?:string;
 pickup_address?:string;drop_address?:string;workshop_confirmed?:boolean;created_at:string
};
const config={
 callbacks:{label:"Callback",description:"Record genuine callback requests. No automatic calls are placed.",date:"Callback date & time",timeField:"requested_at"},
 appointments:{label:"Appointment",description:"Service appointments remain requests until the workshop confirms them.",date:"Appointment date & time",timeField:"appointment_at"},
 "pickup-drop":{label:"Pickup & Drop",description:"Pickup requests require workshop confirmation before becoming bookings.",date:"Requested pickup date & time",timeField:"requested_at"}
} as const;
const choices={
 callbacks:["pending","scheduled","in_progress","completed","missed","cancelled"],
 appointments:["requested","pending","confirmed","completed","cancelled"],
 "pickup-drop":["requested","pending","confirmed","in_progress","completed","cancelled"]
} as const;
function shownTime(v?:string){return v?new Date(v).toLocaleString("en-IN",{timeZone:"Asia/Kolkata",day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):"—";}
export function WorkflowManager({kind,records,dealershipId,canManage}:{kind:WorkflowKind;records:WorkflowRecord[];dealershipId:string;canManage:boolean}){
 const router=useRouter(),cfg=config[kind];
 const [open,setOpen]=useState(false),[busy,start]=useTransition(),[error,setError]=useState(""),[success,setSuccess]=useState(""),[query,setQuery]=useState(""),[filter,setFilter]=useState("all"),[selected,setSelected]=useState<string|null>(null),[nextStatus,setNextStatus]=useState(""),[verified,setVerified]=useState(false);
 const filtered=useMemo(()=>records.filter(r=>(filter==="all"||r.status===filter)&&([r.customer_name,r.mobile,r.purpose,r.pickup_address].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase()))),[records,filter,query]);
 const counts={all:records.length,open:records.filter(r=>!["completed","cancelled"].includes(r.status)).length,completed:records.filter(r=>r.status==="completed").length};
 function submit(form:FormData){setError("");setSuccess("");start(async()=>{const result=await createWorkflow(form);if(result.error)setError(result.error);else{setSuccess(cfg.label+" request saved to your dealership.");setOpen(false);router.refresh();}});}
 function setStatus(form:FormData){setError("");setSuccess("");start(async()=>{const result=await updateWorkflow(form);if(result.error)setError(result.error);else{setSuccess("Status updated.");setSelected(null);setNextStatus("");setVerified(false);router.refresh();}});}
 return <section className="crm-operations" aria-label={cfg.label+" records"}>
  <div className="crm-ops-heading"><div><h2>{cfg.label} Management</h2><p>{cfg.description}</p></div>{canManage?<button type="button" onClick={()=>{setOpen(v=>!v);setError("");}}>{open?"Close form":"+ New "+cfg.label}</button>:<span className="crm-ops-readonly">View only · Your dealership</span>}</div>
  <div className="crm-ops-stats">{[{name:"Total records",value:counts.all},{name:"Open requests",value:counts.open},{name:"Completed",value:counts.completed}].map(x=><div key={x.name}><span>{x.name}</span><strong>{x.value}</strong></div>)}</div>
  {error&&<p className="crm-ops-error" role="alert">{error}</p>}{success&&<p className="crm-ops-success" role="status">{success}</p>}
  {open&&canManage&&<form className="crm-ops-form" action={submit}>
    <input type="hidden" name="kind" value={kind}/><input type="hidden" name="dealership_id" value={dealershipId}/>
    <label>Customer name<input name="customer_name" required minLength={2} maxLength={150} autoComplete="name" placeholder="Customer's full name"/></label>
    <label>Mobile number<input name="mobile" required maxLength={20} inputMode="tel" placeholder="+919876543210"/></label>
    <label>{cfg.date}<input type="datetime-local" name="scheduled_at" required/></label>
    {kind==="callbacks"&&<label>Priority<select name="priority" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>}
    {kind==="appointments"&&<label>Purpose<input name="purpose" minLength={2} maxLength={200} required defaultValue="Service visit"/></label>}
    {kind==="pickup-drop"&&<><label>Pickup address<input name="pickup_address" minLength={5} maxLength={500} required/></label><label>Drop address<input name="drop_address" minLength={5} maxLength={500} required/></label></>}
    <label className="crm-ops-notes">Notes<textarea name="notes" maxLength={2000} rows={2} placeholder="Only confirmed customer-provided details"/></label>
    <p className="crm-ops-form-hint">All requests start unconfirmed. No Sarvam calls or workshop bookings are made automatically.</p>
    <button disabled={busy} type="submit">{busy?"Saving…":"Save request"}</button>
   </form>}
  <div className="crm-ops-toolbar"><input aria-label="Search records" placeholder="Search customer, phone or address..." value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Filter status" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All statuses</option>{choices[kind].map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select><button type="button" onClick={()=>router.refresh()}>Refresh</button></div>
  <div className="tablewrap"><table className="crm-ops-table"><thead><tr><th>Customer</th><th>Due date / time</th><th>Details</th><th>Status</th><th>Actions</th></tr></thead><tbody>
   {filtered.map(r=><tr key={r.id}><td><strong>{r.customer_name}</strong><small>{r.mobile}</small></td><td>{shownTime(r.appointment_at??r.requested_at)}</td><td>{kind==="callbacks"?r.priority:kind==="appointments"?r.purpose:<><div>{r.pickup_address}</div><small>To: {r.drop_address}</small></>}</td><td><span className="crm-ops-status">{r.status.replaceAll("_"," ")}</span></td><td>{canManage?<button type="button" onClick={()=>{setSelected(selected===r.id?null:r.id);setNextStatus(r.status);setVerified(Boolean(r.workshop_confirmed));}}>Update status</button>:<span>View only</span>}</td></tr>)}
   {!filtered.length&&<tr><td colSpan={5} className="crm-ops-empty">No {cfg.label.toLowerCase()} records found. Counts are based on actual dealership data.</td></tr>}
   </tbody></table></div>
  {selected&&canManage&&records.filter(r=>r.id===selected).map(r=><form key={r.id} action={setStatus} className="crm-ops-update">
   <input type="hidden" name="kind" value={kind}/><input type="hidden" name="dealership_id" value={dealershipId}/><input type="hidden" name="id" value={r.id}/><input type="hidden" name="verified" value={verified?"true":"false"}/>
   <div><strong>Update: {r.customer_name}</strong><small>Changes are recorded in the dealership database.</small></div>
   <label>New status<select name="status" value={nextStatus} onChange={e=>setNextStatus(e.target.value)}>{choices[kind].map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></label>
   {kind!=="callbacks"&&<label className="crm-ops-verify"><input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)}/> Workshop has confirmed this booking</label>}
   <button type="submit" disabled={busy}>{busy?"Updating…":"Save status"}</button><button type="button" onClick={()=>setSelected(null)}>Cancel</button>
   </form>)}
  <p className="crm-ops-bottom-note">Only real requests saved to Supabase are shown. Dealer viewers cannot create or edit records. Sarvam voice follow-up sync remains separate.</p>
 </section>;
}
