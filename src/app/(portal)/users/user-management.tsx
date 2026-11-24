"use client";
import {useCallback,useEffect,useRef,useState,useTransition} from "react";
import {createBrowserSupabase} from "@/lib/supabase/browser";

type Dealer={id:string;name:string;contact?:string|null;mobile?:string|null;contact_person?:string|null;email?:string|null};
type Account={id:string;email:string;name:string;dealershipId:string;dealership:string;role:string;activated:boolean;mobile?:string;employeeId?:string;post?:string;passwordChangePending?:boolean};
type Result={dealerships?:Dealer[];users?:Account[];ok?:boolean;message?:string;error?:string;issuedPassword?:string};
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
const emptyDealership={name:"",contact:"",mobile:"",contactPerson:"",email:""};
const emptyUser={dealershipId:"",mobile:"",email:"",employeeId:"",name:"",post:""};
export function UserManagement(){
 const [dealers,setDealers]=useState<Dealer[]>([]),[users,setUsers]=useState<Account[]>([]);
 const [dealership,setDealership]=useState(emptyDealership),[employee,setEmployee]=useState(emptyUser);
 const [issuedPassword,setIssuedPassword]=useState(""),[issuedFor,setIssuedFor]=useState(""),[search,setSearch]=useState(""),[pending,startTransition]=useTransition(),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [directoryView,setDirectoryView]=useState(false);
 const dialogRef=useRef<HTMLDialogElement>(null);
 const openDealer=()=>{setError("");dialogRef.current?.showModal();};
 const load=useCallback(async()=>{setLoading(true);try{const result=await call({action:"list"});setDealers(result.dealerships??[]);setUsers(result.users??[]);setError("");}catch(e){setError(e instanceof Error?e.message:"Could not load users.");}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 const makeDealer=(event:React.FormEvent)=>{event.preventDefault();setError("");setNotice("");startTransition(async()=>{
  try{const result=await call({action:"create-dealership",...dealership});setNotice(result.message??"Dealership created.");setDealership(emptyDealership);dialogRef.current?.close();setDirectoryView(true);await load();}
  catch(e){setError(e instanceof Error?e.message:"Unable to create dealership.");}
 });};
 const makeUser=(event:React.FormEvent)=>{event.preventDefault();setError("");setNotice("");startTransition(async()=>{
  try{const result=await call({action:"create-user",...employee});setNotice(result.message??"User created without email invitation.");setIssuedPassword(result.issuedPassword??"");setIssuedFor(employee.name);setEmployee(emptyUser);setDirectoryView(false);await load();}
  catch(e){setError(e instanceof Error?e.message:"Unable to create user.");}
 });};
 const reset=(account:Account)=>{
  if(!window.confirm("IT-only password reset for "+account.name+"? No email will be sent. A new unique password will be displayed only once."))return;
  setError("");setNotice("");startTransition(async()=>{try{const result=await call({action:"reset",userId:account.id,confirm:"RESET DEALERSHIP PASSWORD"});setNotice(result.message??"Password reset.");setIssuedPassword(result.issuedPassword??"");setIssuedFor(account.name);await load();}
   catch(e){setError(e instanceof Error?e.message:"Could not reset password.");}});
 };
 const visible=users.filter(u=>(u.email+" "+u.name+" "+u.dealership+" "+(u.employeeId??"")+" "+(u.post??"")).toLowerCase().includes(search.toLowerCase()));
 return <div className="it-user-page">
  <header className="it-user-heading"><h1>User Management</h1><button type="button" className="it-create-dealer" onClick={openDealer}>+ Create Dealership</button></header>
  <div className="it-user-stats"><article><span>Dealerships</span><strong>{loading?"—":dealers.length}</strong></article><article><span>Dealer users</span><strong>{loading?"—":users.length}</strong></article><article><span>Active accounts</span><strong>{loading?"—":users.filter(u=>u.activated).length}</strong></article><article><span>System permission</span><strong>Viewer</strong></article></div>
  {error&&<p role="alert" className="it-user-error">{error}</p>}{notice&&<p role="status" className="it-user-success">{notice}</p>}
  {issuedPassword&&<div role="status" className="it-user-temporary" style={{margin:"12px 0 18px"}}>
   <strong>New password for {issuedFor} — visible once</strong>
   <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:10,marginTop:8}}>
    <code style={{fontSize:16,overflowWrap:"anywhere"}}>{issuedPassword}</code>
    <button type="button" className="btn-outline small" onClick={()=>void navigator.clipboard.writeText(issuedPassword)}>Copy</button>
    <button type="button" className="btn-outline small" onClick={()=>{setIssuedPassword("");setIssuedFor("");}}>Dismiss</button>
   </div>
   <p>Only IT can reset this password. Share it privately; no email was sent. It will not be available again after you dismiss it.</p>
  </div>}
  <dialog ref={dialogRef} className="it-dealer-dialog" aria-labelledby="create-dealer-title" onCancel={e=>{if(pending)e.preventDefault();}}>
   <section className="it-user-card">
    <div className="it-user-table-head"><h2 id="create-dealer-title">Create Dealership</h2><button type="button" aria-label="Close dealership form" disabled={pending} onClick={()=>dialogRef.current?.close()}>×</button></div>
    {error&&<p role="alert" className="it-user-error">{error}</p>}
    <form className="it-user-form" onSubmit={makeDealer}>
     <label>Dealership Name<input required minLength={3} maxLength={100} placeholder="Frontier MG Noida" value={dealership.name} onChange={e=>setDealership(v=>({...v,name:e.target.value}))}/></label>
     <label>Contact (office / landline)<input required maxLength={22} type="tel" placeholder="Office contact number" value={dealership.contact} onChange={e=>setDealership(v=>({...v,contact:e.target.value}))}/></label>
     <label>Mobile No.<input required maxLength={20} type="tel" placeholder="10-digit Indian mobile" value={dealership.mobile} onChange={e=>setDealership(v=>({...v,mobile:e.target.value}))}/></label>
     <label>Contact Person<input required minLength={2} maxLength={100} placeholder="Contact person's name" value={dealership.contactPerson} onChange={e=>setDealership(v=>({...v,contactPerson:e.target.value}))}/></label>
     <label>Email<input required type="email" maxLength={254} placeholder="dealership@example.com" value={dealership.email} onChange={e=>setDealership(v=>({...v,email:e.target.value}))}/></label>
     <button type="submit" disabled={loading||pending}>{pending?"Saving…":"Create Dealership"}</button>
    </form>
   </section>
  </dialog>
  <div className="it-user-creation-grid it-user-single">
   <section className="it-user-card">
    <h2>Create Dealership User</h2>
    <form className="it-user-form" onSubmit={makeUser}>
     <label>Dealership<select required value={employee.dealershipId} onChange={e=>setEmployee(v=>({...v,dealershipId:e.target.value}))}><option value="">Select dealership</option>{dealers.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
     <label>Mobile No.<input required type="tel" maxLength={20} placeholder="10-digit Indian mobile" value={employee.mobile} onChange={e=>setEmployee(v=>({...v,mobile:e.target.value}))}/></label>
     <label>Email<input required type="email" maxLength={254} placeholder="employee@dealership.com" value={employee.email} onChange={e=>setEmployee(v=>({...v,email:e.target.value}))}/></label>
     <label>Employee ID<input required minLength={2} maxLength={40} placeholder="EMP001" value={employee.employeeId} onChange={e=>setEmployee(v=>({...v,employeeId:e.target.value}))}/></label>
     <label>Full Name<input required minLength={2} maxLength={100} placeholder="Employee name" value={employee.name} onChange={e=>setEmployee(v=>({...v,name:e.target.value}))}/></label>
     <label>Role / Post<input required minLength={2} maxLength={100} placeholder="Service Manager, CRM Executive, etc." value={employee.post} onChange={e=>setEmployee(v=>({...v,post:e.target.value}))}/></label>
     <div className="it-user-permission"><strong>System permissions</strong><span>Dealership Viewer</span><p>Role / Post is a job title only; it does not grant campaign creation, approvals, uploads or administration.</p></div>
     <div className="it-user-temporary"><strong>IT-controlled login password</strong><p>The IT-configured default password is assigned to new dealership users. No invitation email is sent. Dealership users cannot change their password in FrontVox; only IT can reset it.</p></div>
     <button type="submit" disabled={loading||pending||!employee.dealershipId||!dealers.length}>{pending?"Creating…":"Create User (No Email)"}</button>
    </form>
   </section>
  </div>
  <div className="it-register-tabs" role="group" aria-label="Select register"><button type="button" aria-pressed={!directoryView} onClick={()=>setDirectoryView(false)}>Dealership User Accounts</button><button type="button" aria-pressed={directoryView} onClick={()=>setDirectoryView(true)}>Dealership Directory</button></div>
  {directoryView ? <section className="it-user-card it-user-list it-full-width">
   <div className="it-user-table-head"><div><h2>Dealership Directory</h2></div><button type="button" disabled={loading||pending} onClick={()=>void load()}>Refresh</button></div>
   <div className="tablewrap"><table><thead><tr><th>Dealership</th><th>Contact</th><th>Mobile</th><th>Contact Person</th><th>Email</th></tr></thead><tbody>
   {dealers.map(d=><tr key={d.id}><td><strong>{d.name}</strong></td><td>{d.contact??"—"}</td><td>{d.mobile??"—"}</td><td>{d.contact_person??"—"}</td><td>{d.email??"—"}</td></tr>)}
   {!dealers.length&&<tr><td colSpan={5} className="it-user-empty">{loading?"Loading…":"No dealerships found."}</td></tr>}
   </tbody></table></div>
  </section> : <section className="it-user-card it-user-list it-full-width">
   <div className="it-user-table-head"><div><h2>Dealership User Accounts</h2></div><button type="button" disabled={loading||pending} onClick={()=>void load()}>Refresh</button></div>
   <input className="it-user-search" aria-label="Search dealership users" placeholder="Search name, email, employee ID or dealership..." value={search} onChange={e=>setSearch(e.target.value)}/>
   <div className="tablewrap"><table><thead><tr><th>User</th><th>Dealership</th><th>Mobile</th><th>Employee ID</th><th>Role / Post</th><th>Account</th><th>Actions</th></tr></thead><tbody>
    {visible.map(u=><tr key={u.id}><td><strong>{u.name||"Dealership User"}</strong><small>{u.email}</small></td><td>{u.dealership}</td><td>{u.mobile||"—"}</td><td>{u.employeeId||"—"}</td><td>{u.post||"—"}</td><td><span className={u.activated?"it-user-active":"it-user-invited"}>{!u.activated?"Not activated":u.passwordChangePending?"IT reset required":"Ready"}</span></td><td><button type="button" aria-label={"IT Super User: reset password for "+u.name} title="IT Super User only · Reset temporary password without email" onClick={()=>reset(u)} disabled={pending}>Reset password</button></td></tr>)}
    {!visible.length&&<tr><td colSpan={7} className="it-user-empty">{loading?"Loading users…":"No dealership users found."}</td></tr>}
   </tbody></table></div>
  </section>}
  <p className="it-user-footnote">Only IT Super Users can provision accounts. New users are restricted to their assigned dealership. Only IT can issue and reset passwords. Share credentials privately; no password invitation or reset emails are sent.</p>
 </div>;
}
