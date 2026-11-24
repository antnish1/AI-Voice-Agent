"use client";
import {useCallback,useEffect,useState,useTransition} from "react";
import {createBrowserSupabase} from "@/lib/supabase/browser";

type Dealer={id:string;name:string;contact?:string|null;mobile?:string|null;contact_person?:string|null;email?:string|null};
type Account={id:string;email:string;name:string;dealershipId:string;dealership:string;role:string;activated:boolean;mobile?:string;employeeId?:string;post?:string;passwordChangePending?:boolean};
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
const emptyDealership={name:"",contact:"",mobile:"",contactPerson:"",email:""};
const emptyUser={dealershipId:"",mobile:"",email:"",employeeId:"",name:"",post:""};
export function UserManagement(){
 const [dealers,setDealers]=useState<Dealer[]>([]),[users,setUsers]=useState<Account[]>([]);
 const [dealership,setDealership]=useState(emptyDealership),[employee,setEmployee]=useState(emptyUser);
 const [search,setSearch]=useState(""),[pending,startTransition]=useTransition(),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const load=useCallback(async()=>{setLoading(true);try{const result=await call({action:"list"});setDealers(result.dealerships??[]);setUsers(result.users??[]);setError("");}catch(e){setError(e instanceof Error?e.message:"Could not load users.");}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 const makeDealer=(event:React.FormEvent)=>{event.preventDefault();setError("");setNotice("");startTransition(async()=>{
  try{const result=await call({action:"create-dealership",...dealership});setNotice(result.message??"Dealership created.");setDealership(emptyDealership);await load();}
  catch(e){setError(e instanceof Error?e.message:"Unable to create dealership.");}
 });};
 const makeUser=(event:React.FormEvent)=>{event.preventDefault();setError("");setNotice("");startTransition(async()=>{
  try{const result=await call({action:"create-user",...employee});setNotice(result.message??"User created without email invitation.");setEmployee(emptyUser);await load();}
  catch(e){setError(e instanceof Error?e.message:"Unable to create user.");}
 });};
 const reset=(account:Account)=>{
  if(!window.confirm("Reset "+account.name+" to the temporary password 12345678? No email will be sent and they must change it after login."))return;
  setError("");setNotice("");startTransition(async()=>{try{const result=await call({action:"reset",userId:account.id});setNotice(result.message??"Temporary password reset.");await load();}
   catch(e){setError(e instanceof Error?e.message:"Could not reset password.");}});
 };
 const visible=users.filter(u=>(u.email+" "+u.name+" "+u.dealership+" "+(u.employeeId??"")+" "+(u.post??"")).toLowerCase().includes(search.toLowerCase()));
 return <div className="it-user-page">
  <header className="it-user-heading"><div><p className="it-user-eyebrow">ACCESS CONTROL / IT SUPER USER</p><h1>User Management</h1><p>Create a dealership first, then add its employees. No invitation emails are sent.</p></div><span className="it-user-admin-tag">IT Super User only</span></header>
  <div className="it-user-stats"><article><span>Dealerships</span><strong>{loading?"—":dealers.length}</strong></article><article><span>Dealer users</span><strong>{loading?"—":users.length}</strong></article><article><span>Ready accounts</span><strong>{loading?"—":users.filter(u=>u.activated&&!u.passwordChangePending).length}</strong></article><article><span>System permission</span><strong>Viewer</strong></article></div>
  {error&&<p role="alert" className="it-user-error">{error}</p>}{notice&&<p role="status" className="it-user-success">{notice}</p>}
  <div className="it-user-creation-grid">
   <section className="it-user-card">
    <h2><span className="it-step">1</span> Create Dealership</h2><p>Create dealership details independently from user accounts.</p>
    <form className="it-user-form" onSubmit={makeDealer}>
     <label>Dealership Name<input required minLength={3} maxLength={100} placeholder="Frontier MG Noida" value={dealership.name} onChange={e=>setDealership(v=>({...v,name:e.target.value}))}/></label>
     <label>Contact (office / landline)<input required maxLength={22} type="tel" placeholder="Office contact number" value={dealership.contact} onChange={e=>setDealership(v=>({...v,contact:e.target.value}))}/></label>
     <label>Mobile No.<input required maxLength={20} type="tel" placeholder="10-digit Indian mobile" value={dealership.mobile} onChange={e=>setDealership(v=>({...v,mobile:e.target.value}))}/></label>
     <label>Contact Person<input required minLength={2} maxLength={100} placeholder="Contact person's name" value={dealership.contactPerson} onChange={e=>setDealership(v=>({...v,contactPerson:e.target.value}))}/></label>
     <label>Email<input required type="email" maxLength={254} placeholder="dealership@example.com" value={dealership.email} onChange={e=>setDealership(v=>({...v,email:e.target.value}))}/></label>
     <button type="submit" disabled={loading||pending}>{pending?"Saving…":"Create Dealership"}</button>
    </form>
   </section>
   <section className="it-user-card">
    <h2><span className="it-step">2</span> Create Dealership User</h2><p>Select an existing dealership. New users receive viewer permissions only.</p>
    <form className="it-user-form" onSubmit={makeUser}>
     <label>Dealership<select required value={employee.dealershipId} onChange={e=>setEmployee(v=>({...v,dealershipId:e.target.value}))}><option value="">Select dealership</option>{dealers.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
     <label>Mobile No.<input required type="tel" maxLength={20} placeholder="10-digit Indian mobile" value={employee.mobile} onChange={e=>setEmployee(v=>({...v,mobile:e.target.value}))}/></label>
     <label>Email<input required type="email" maxLength={254} placeholder="employee@dealership.com" value={employee.email} onChange={e=>setEmployee(v=>({...v,email:e.target.value}))}/></label>
     <label>Employee ID<input required minLength={2} maxLength={40} placeholder="EMP001" value={employee.employeeId} onChange={e=>setEmployee(v=>({...v,employeeId:e.target.value}))}/></label>
     <label>Full Name<input required minLength={2} maxLength={100} placeholder="Employee name" value={employee.name} onChange={e=>setEmployee(v=>({...v,name:e.target.value}))}/></label>
     <label>Role / Post<input required minLength={2} maxLength={100} placeholder="Service Manager, CRM Executive, etc." value={employee.post} onChange={e=>setEmployee(v=>({...v,post:e.target.value}))}/></label>
     <div className="it-user-permission"><strong>System permissions</strong><span>Dealership Viewer</span><p>Role / Post is a job title only; it does not grant campaign creation, approvals, uploads or administration.</p></div>
     <div className="it-user-temporary"><strong>Temporary password: 12345678</strong><p>No activation/invitation email is sent. For security, users must change the temporary password to at least 12 characters on first login before accessing CRM data.</p></div>
     <button type="submit" disabled={loading||pending||!employee.dealershipId||!dealers.length}>{pending?"Creating…":"Create User (No Email)"}</button>
    </form>
   </section>
  </div>
  <section className="it-user-card it-user-list it-full-width">
   <div className="it-user-table-head"><div><h2>Dealership Directory</h2><p>Existing dealerships are retained; missing contact details can be added through a separate edit workflow.</p></div><button type="button" disabled={loading||pending} onClick={()=>void load()}>Refresh</button></div>
   <div className="tablewrap"><table><thead><tr><th>Dealership</th><th>Contact</th><th>Mobile</th><th>Contact Person</th><th>Email</th></tr></thead><tbody>
   {dealers.map(d=><tr key={d.id}><td><strong>{d.name}</strong></td><td>{d.contact??"—"}</td><td>{d.mobile??"—"}</td><td>{d.contact_person??"—"}</td><td>{d.email??"—"}</td></tr>)}
   {!dealers.length&&<tr><td colSpan={5} className="it-user-empty">{loading?"Loading…":"No dealerships found."}</td></tr>}
   </tbody></table></div>
  </section>
  <section className="it-user-card it-user-list it-full-width">
   <div className="it-user-table-head"><div><h2>Dealership User Accounts</h2><p>Accounts are created directly without sending an invitation email.</p></div><button type="button" disabled={loading||pending} onClick={()=>void load()}>Refresh</button></div>
   <input className="it-user-search" aria-label="Search dealership users" placeholder="Search name, email, employee ID or dealership..." value={search} onChange={e=>setSearch(e.target.value)}/>
   <div className="tablewrap"><table><thead><tr><th>User</th><th>Dealership</th><th>Mobile</th><th>Employee ID</th><th>Role / Post</th><th>Account</th><th>Actions</th></tr></thead><tbody>
    {visible.map(u=><tr key={u.id}><td><strong>{u.name||"Dealership User"}</strong><small>{u.email}</small></td><td>{u.dealership}</td><td>{u.mobile||"—"}</td><td>{u.employeeId||"—"}</td><td>{u.post||"—"}</td><td><span className={u.activated&&!u.passwordChangePending?"it-user-active":"it-user-invited"}>{!u.activated?"Pending setup":u.passwordChangePending?"Password change pending":"Ready"}</span></td><td><button type="button" onClick={()=>reset(u)} disabled={pending}>Reset password</button></td></tr>)}
    {!visible.length&&<tr><td colSpan={7} className="it-user-empty">{loading?"Loading users…":"No dealership users found."}</td></tr>}
   </tbody></table></div>
  </section>
  <p className="it-user-footnote">Only IT Super Users can provision accounts. New users are restricted to their assigned dealership. A shared temporary password is less secure than unique passwords; distribute it privately and require immediate change.</p>
 </div>;
}
