"use client";
import {useCallback,useEffect,useState,useTransition} from "react";
import {createBrowserSupabase} from "@/lib/supabase/browser";

type Dealer={id:string;name:string};
type Account={id:string;email:string;name:string;dealershipId:string;dealership:string;role:string;activated:boolean};
type Result={dealerships?:Dealer[];users?:Account[];ok?:boolean;message?:string;error?:string};
const endpoint=(process.env.NEXT_PUBLIC_SUPABASE_URL??"")+"/functions/v1/it-user-management";
async function call(action:Record<string,unknown>):Promise<Result>{
 const supabase=createBrowserSupabase();
 const {data:{session},error}=await supabase.auth.getSession();
 if(error||!session)throw new Error("Your session expired. Sign in again.");
 const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token,apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??""},body:JSON.stringify(action)});
 const body=await response.json().catch(()=>({error:"Unexpected server response"}));
 if(!response.ok)throw new Error(body.error??"Request failed.");
 return body;
}
export function UserManagement(){
 const [dealers,setDealers]=useState<Dealer[]>([]),[users,setUsers]=useState<Account[]>([]),[name,setName]=useState(""),[email,setEmail]=useState(""),[dealershipId,setDealershipId]=useState(""),[newDealer,setNewDealer]=useState(""),[createDealer,setCreateDealer]=useState(false);
 const [search,setSearch]=useState(""),[pending,startTransition]=useTransition(),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const load=useCallback(async()=>{setLoading(true);try{const result=await call({action:"list"});setDealers(result.dealerships??[]);setUsers(result.users??[]);setError("");}catch(e){setError(e instanceof Error?e.message:"Could not load users.");}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 const submit=(event:React.FormEvent)=>{event.preventDefault();setError("");setNotice("");startTransition(async()=>{try{const r=await call({action:"create",name,email,dealershipId:createDealer?undefined:dealershipId,newDealership:createDealer?newDealer:undefined});setNotice(r.message??"Activation email requested.");setName("");setEmail("");setNewDealer("");await load();}catch(e){setError(e instanceof Error?e.message:"Unable to create account.");}});};
 const reset=(account:Account)=>{if(!window.confirm("Send a password reset email to "+account.email+"?"))return;setError("");setNotice("");startTransition(async()=>{try{const result=await call({action:"reset",userId:account.id});setNotice(result.message??"Password reset email requested.");}catch(e){setError(e instanceof Error?e.message:"Could not reset password.");}});};
 const visible=users.filter(u=>(u.email+" "+u.name+" "+u.dealership).toLowerCase().includes(search.toLowerCase()));
 return <div className="it-user-page">
  <header className="it-user-heading"><div><p className="it-user-eyebrow">ACCESS CONTROL / IT SUPER USER</p><h1>User Management</h1><p>Create dealership accounts and manage access to dealership-specific CRM information.</p></div><span className="it-user-admin-tag">Restricted to IT Super User</span></header>
  <div className="it-user-stats"><article><span>Dealerships</span><strong>{loading?"—":dealers.length}</strong></article><article><span>Dealer users</span><strong>{loading?"—":users.length}</strong></article><article><span>Activated accounts</span><strong>{loading?"—":users.filter(u=>u.activated).length}</strong></article><article><span>Permission level</span><strong>View only</strong></article></div>
  {error&&<p role="alert" className="it-user-error">{error}</p>}{notice&&<p role="status" className="it-user-success">{notice}</p>}
  <div className="it-user-grid"><section className="it-user-card"><h2>Create dealership user</h2><p>Each user can see only records belonging to their assigned dealership.</p>
   <form onSubmit={submit} className="it-user-form"><label>Full Name<input value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={100} placeholder="Enter user's full name" autoComplete="off"/></label><label>Email Address<input value={email} onChange={e=>setEmail(e.target.value)} type="email" required maxLength={254} placeholder="employee@dealership.com" autoComplete="off"/></label>
    <label>Dealership
     <select value={createDealer?"new":dealershipId} required onChange={e=>{setCreateDealer(e.target.value==="new");if(e.target.value!=="new")setDealershipId(e.target.value);}}>
      <option value="">Select dealership</option>{dealers.map(d=><option value={d.id} key={d.id}>{d.name}</option>)}<option value="new">+ Create new dealership</option>
     </select>
    </label>
    {createDealer&&<label>New Dealership Name<input value={newDealer} onChange={e=>setNewDealer(e.target.value)} required minLength={3} maxLength={100} placeholder="e.g. Frontier Motors Jabalpur"/></label>}
    <div className="it-user-permission"><strong>Assigned permissions</strong><span>Dealership Viewer</span><p>View own dealership records only. No user creation, password administration, campaign edits, approvals, uploads, or deletion.</p></div>
    <div className="it-user-temporary"><strong>Initial password: 12345678 (temporary)</strong><p>Supabase sends an activation link to the email provided. After activation, a new password of at least 12 characters is required before CRM access.</p></div>
    <button type="submit" disabled={pending||loading||(!createDealer&&!dealershipId)}>{pending?"Creating account…":"Create User & Send Activation"}</button>
   </form>
  </section>
  <section className="it-user-card it-user-list"><div className="it-user-table-head"><div><h2>Dealership accounts</h2><p>Manage existing dealership viewers and account activation.</p></div><button type="button" onClick={()=>void load()} disabled={pending||loading}>Refresh</button></div><input aria-label="Search users" className="it-user-search" placeholder="Search name, email or dealership..." value={search} onChange={e=>setSearch(e.target.value)}/>
   <div className="tablewrap"><table><thead><tr><th>User</th><th>Dealership</th><th>Role</th><th>Account</th><th>Actions</th></tr></thead><tbody>{visible.map(u=><tr key={u.id}><td><strong>{u.name||"Dealership User"}</strong><small>{u.email}</small></td><td>{u.dealership}</td><td><span className="it-user-viewer-pill">Viewer</span></td><td><span className={u.activated?"it-user-active":"it-user-invited"}>{u.activated?"Activated":"Invitation pending"}</span></td><td><button type="button" disabled={pending} onClick={()=>reset(u)}>Reset password</button></td></tr>)}{!visible.length&&<tr><td colSpan={5} className="it-user-empty">{loading?"Loading users…":"No dealership users found."}</td></tr>}</tbody></table></div>
  </section></div>
  <p className="it-user-footnote">All account creation and password administration is performed through a protected Supabase Edge Function. No privileged API credential is exposed to dealership browsers.</p>
 </div>;
}