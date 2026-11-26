"use client";
import {EmptyState} from "@/components/empty-state";
import {useCallback,useEffect,useRef,useState,useTransition} from "react";
import {createBrowserSupabase} from "@/lib/supabase/browser";

type Dealer={is_active?:boolean;id:string;name:string;address?:string|null;contact?:string|null;mobile?:string|null;contact_person?:string|null;email?:string|null};
type Account={id:string;email:string;name:string;dealershipId:string;dealership:string;role:string;activated:boolean;mobile?:string;employeeId?:string;post?:string;passwordChangePending?:boolean;accountState?:AccountState;originalEmail?:string};
type AccountState="active"|"disabled"|"archived";
type LifecycleAction="archive-user"|"archive-release-email"|"disable-login"|"enable-login"|"delete-user";
type Dependency={label:string;count:number|null;reason:string};
const lifecyclePhrases:Record<LifecycleAction,string>={"archive-user":"ARCHIVE USER","archive-release-email":"RELEASE EMAIL","disable-login":"DISABLE LOGIN","enable-login":"ENABLE LOGIN","delete-user":"DELETE USER"};
// Manage only dealership viewer/manager accounts; never super-admins.
const isManageableDealershipRole=(role:string)=>role==="management"||role==="dealership_manager";
const accountStatus=(u:Account)=>u.accountState==="archived"?"Archived":u.accountState==="disabled"?"Login disabled":!u.activated?"Not activated":u.passwordChangePending?"IT reset required":"Ready";
type Result={dealerships?:Dealer[];users?:Account[];ok?:boolean;message?:string;error?:string;issuedPassword?:string;dependencies?:Dependency[];accountState?:AccountState};
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
const emptyDealership={name:"",address:"",mobile:"",contactPerson:"",email:""};
const emptyUser={dealershipId:"",mobile:"",email:"",employeeId:"",name:"",post:""};
export function UserManagement(){
 const [dealers,setDealers]=useState<Dealer[]>([]),[users,setUsers]=useState<Account[]>([]);
 const [activeTable,setActiveTable]=useState<"users"|"dealerships">("users");
 const [userSearch,setUserSearch]=useState(""),[dealerSearch,setDealerSearch]=useState("");
 const matchesSearch=(query:string,fields:(string|null|undefined)[])=>{const q=query.trim().toLowerCase();return !q||fields.some(v=>(v??"").toLowerCase().includes(q));};
 const filteredUsers=users.filter(u=>matchesSearch(userSearch,[u.name,u.email,u.dealership,u.mobile,u.employeeId,u.post,u.role]));
 const filteredDealers=dealers.filter(d=>matchesSearch(dealerSearch,[d.name,d.address,d.contact,d.contact_person,d.mobile,d.email]));

 const [dealership,setDealership]=useState(emptyDealership),[employee,setEmployee]=useState(emptyUser);
 const [issuedPassword,setIssuedPassword]=useState(""),[issuedFor,setIssuedFor]=useState(""),[pending,startTransition]=useTransition(),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const dialogRef=useRef<HTMLDialogElement>(null);
 const resetDialogRef=useRef<HTMLDialogElement>(null);
 const [selectedAccount,setSelectedAccount]=useState<Account|null>(null);
 const [accountMode,setAccountMode]=useState<"password"|"edit"|"lifecycle">("password");
 const [edit,setEdit]=useState({name:"",mobile:"",employeeId:"",post:""});
 const [resetPassword,setResetPassword]=useState(""),[resetError,setResetError]=useState(""),[resetNotice,setResetNotice]=useState("");
 const [resetExpanded,setResetExpanded]=useState(false);
 const [customPassword,setCustomPassword]=useState(""),[correctEmail,setCorrectEmail]=useState(""),[resetConfirm,setResetConfirm]=useState("");
 const clearResetFields=()=>{setResetExpanded(false);setCustomPassword("");setCorrectEmail("");setResetConfirm("");};
 const [lifecycleAction,setLifecycleAction]=useState<LifecycleAction>("disable-login");
 const [lifecycleConfirm,setLifecycleConfirm]=useState("");
 const [dependencies,setDependencies]=useState<Dependency[]|null>(null);
 const selectLifecycle=(action:LifecycleAction)=>{setLifecycleAction(action);setLifecycleConfirm("");setResetError("");};
 const openReset=(account:Account,mode:"password"|"edit"|"lifecycle"="password",action:LifecycleAction="disable-login")=>{setAccountMode(mode);setEdit({name:account.name,mobile:account.mobile??"",employeeId:account.employeeId??"",post:account.post??""});clearResetFields();setLifecycleAction(action);setLifecycleConfirm("");setDependencies(null);setSelectedAccount(account);setResetPassword("");setResetError("");setResetNotice("");resetDialogRef.current?.showModal();};
 const clearReset=()=>{clearResetFields();setLifecycleConfirm("");setDependencies(null);setSelectedAccount(null);setResetPassword("");setResetError("");setResetNotice("");};
 const [dealerTarget,setDealerTarget]=useState<Dealer|null>(null),[dealerMode,setDealerMode]=useState<"edit"|"disable"|"enable"|"delete">("edit"),[dealerConfirm,setDealerConfirm]=useState(""),[dealerError,setDealerError]=useState("");
 const dealerActionDialog=useRef<HTMLDialogElement>(null);
 const openDealerAction=(d:Dealer,mode:typeof dealerMode)=>{setDealerTarget(d);setDealerMode(mode);setDealerConfirm("");setDealerError("");dealerActionDialog.current?.showModal();};
 const openDealer=()=>{setError("");dialogRef.current?.showModal();};
 const load=useCallback(async()=>{setLoading(true);try{const result=await call({action:"list"});setDealers(result.dealerships??[]);setUsers(result.users??[]);setError("");}catch(e){setError(e instanceof Error?e.message:"Could not load users.");}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{if(!notice)return;const timer=window.setTimeout(()=>setNotice(""),3500);return ()=>window.clearTimeout(timer);},[notice]);
 const makeDealer=(event:React.FormEvent)=>{event.preventDefault();setError("");setNotice("");startTransition(async()=>{
  try{const result=await call({action:"create-dealership",...dealership});setNotice(result.message??"Dealership created.");setDealership(emptyDealership);dialogRef.current?.close();await load();}
  catch(e){setError(e instanceof Error?e.message:"Unable to create dealership.");}
 });};
 const makeUser=(event:React.FormEvent)=>{event.preventDefault();setError("");setNotice("");startTransition(async()=>{
  try{const result=await call({action:"create-user",...employee});setNotice(result.message??"User created without email invitation.");setIssuedPassword(result.issuedPassword??"");setIssuedFor(employee.name);setEmployee(emptyUser);await load();}
  catch(e){setError(e instanceof Error?e.message:"Unable to create user.");}
 });};
 const reset=(account:Account)=>{
  if(pending||resetPassword||!resetExpanded||resetConfirm!=="RESET")return;
  setResetError("");setResetNotice("");startTransition(async()=>{try{const result=await call({action:"reset",userId:account.id,confirm:resetConfirm,password:customPassword,email:correctEmail.trim()});setResetNotice(result.message??"Password reset.");setResetPassword(result.issuedPassword??"");setSelectedAccount(v=>v?{...v,email:correctEmail.trim().toLowerCase()||v.email,activated:true,passwordChangePending:false}:v);setCustomPassword("");setCorrectEmail("");setResetConfirm("");await load();}
   catch(e){setResetError(e instanceof Error?e.message:"Could not reset password.");}});
 };
 const saveEdit=(event:React.FormEvent)=>{event.preventDefault();if(!selectedAccount||pending)return;setResetError("");startTransition(async()=>{try{const result=await call({action:"edit-user",userId:selectedAccount.id,...edit});setNotice(result.message??"User details updated.");resetDialogRef.current?.close();await load();}catch(e){setResetError(e instanceof Error?e.message:"Could not update user.");}});};
 const inspectDependencies=(account:Account)=>{
  setResetError("");setDependencies(null);startTransition(async()=>{try{const result=await call({action:"account-dependencies",userId:account.id});if(!Array.isArray(result.dependencies))throw new Error("Protected-record checks unavailable.");setDependencies(result.dependencies);}catch(e){setResetError(e instanceof Error?e.message:"Could not check dependencies.");}});
 };
 const changeAccount=(account:Account)=>{
  if(pending||lifecycleConfirm!==lifecyclePhrases[lifecycleAction]||(lifecycleAction==="delete-user"&&(!dependencies||dependencies.length)))return;
  setResetError("");setResetNotice("");startTransition(async()=>{try{const result=await call({action:lifecycleAction,userId:account.id,confirm:lifecycleConfirm});setNotice(result.message??"Account updated.");resetDialogRef.current?.close();await load();}catch(e){setDependencies(null);setResetError(e instanceof Error?e.message:"Account action failed.");}});
 };
 const saveDealerAction=(e:React.FormEvent)=>{e.preventDefault();if(!dealerTarget||pending)return;setDealerError("");startTransition(async()=>{try{const result=await call({action:dealerMode+"-dealership",dealershipId:dealerTarget.id,name:dealerTarget.name,address:dealerTarget.address??"",mobile:dealerTarget.mobile??"",contactPerson:dealerTarget.contact_person??dealerTarget.contact??"",email:dealerTarget.email??"",confirm:dealerConfirm});setNotice(result.message??"Dealership updated.");dealerActionDialog.current?.close();await load();}catch(e){setDealerError(e instanceof Error?e.message:"Unable to update dealership.");}});};
 return <div className="it-user-page">
  <header className="it-user-heading"><div className="calllogs-heading-left it-user-title"><span className="calllogs-main-icon" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span><div><h1>User Management</h1></div></div><button type="button" className="it-create-dealer" onClick={openDealer}>+ Create Dealership</button></header>
  <div className="it-user-stats"><article><svg className="it-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21h18M5 21V5l7-2v18M12 9h7v12M8 8v1m0 3v1m0 3v1m7-4v1m0 3v1"/></svg><span>Dealerships</span><strong>{loading?"—":dealers.length}</strong></article><article><svg className="it-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/></svg><span>Dealer users</span><strong>{loading?"—":users.length}</strong></article><article><svg className="it-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg><span>Active accounts</span><strong>{loading?"—":users.filter(u=>u.activated&&(!u.accountState||u.accountState==="active")).length}</strong></article><article><svg className="it-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></svg><span>System permission</span><strong>Viewer</strong></article></div>
  {error&&<p role="alert" className="it-user-error">{error}</p>}{notice&&<div role="status" aria-live="polite" className="it-user-toast"><span className="it-user-toast-check" aria-hidden="true">✓</span><span>{notice}</span><button type="button" aria-label="Dismiss notification" onClick={()=>setNotice("")}>×</button></div>}
  {issuedPassword&&<div role="status" className="it-user-temporary" style={{margin:"12px 0 18px"}}>
   <strong>New password for {issuedFor} — visible once</strong>
   <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:10,marginTop:8}}>
    <code style={{fontSize:16,overflowWrap:"anywhere"}}>{issuedPassword}</code>
    <button type="button" className="btn-outline small" onClick={()=>void navigator.clipboard.writeText(issuedPassword)}>Copy</button>
    <button type="button" className="btn-outline small" onClick={()=>{setIssuedPassword("");setIssuedFor("");}}>Dismiss</button>
   </div>
   <p>Only IT can reset this password. Share it privately; no email was sent. It will not be available again after you dismiss it.</p>
  </div>}
  <dialog ref={dealerActionDialog} className="it-dealer-dialog" aria-labelledby="dealer-action-title" onClose={()=>setDealerTarget(null)} onCancel={e=>{if(pending)e.preventDefault();}}>
   {dealerTarget&&<section className="it-user-card"><div className="it-user-table-head"><h2 id="dealer-action-title">{dealerMode==="edit"?"Edit Dealership":dealerMode==="disable"?"Disable Dealership":dealerMode==="enable"?"Enable Dealership":"Delete Dealership"}</h2><button type="button" disabled={pending} onClick={()=>dealerActionDialog.current?.close()}>Close ×</button></div>
   <form className="it-user-form" onSubmit={saveDealerAction}>
   {dealerMode==="edit"?<>{([["name","Dealership Name"],["address","Address"],["mobile","Mobile No."],["contact_person","Contact Person"],["email","Email"]] as const).map(([key,label])=><label key={key}>{label}<input required={key==="name"} type={key==="email"?"email":key==="mobile"?"tel":"text"} value={dealerTarget[key]??""} onChange={e=>setDealerTarget(v=>v?{...v,[key]:e.target.value}:v)}/></label>)}</>:<><p>{dealerTarget.name}</p><p>{dealerMode==="delete"?"Permanently delete this unused dealership. Linked records prevent deletion.":dealerMode==="disable"?"Disable this unused dealership. Linked users, records or documents prevent disabling.":"Allow new records and user assignments to this dealership."}</p><label>Type {dealerMode.toUpperCase()} DEALERSHIP to confirm<input value={dealerConfirm} onChange={e=>setDealerConfirm(e.target.value)}/></label></>}
   {dealerError&&<p role="alert" className="it-user-error">{dealerError}</p>}
   <div className="it-dealer-action-buttons"><button type="button" className="btn-outline" disabled={pending} onClick={()=>dealerActionDialog.current?.close()}>Cancel</button><button type="submit" disabled={pending||(dealerMode!=="edit"&&dealerConfirm!==dealerMode.toUpperCase()+" DEALERSHIP")}>{pending?"Saving…":dealerMode==="edit"?"Save changes":"Confirm "+dealerMode}</button></div></form></section>}
  </dialog>
  <dialog ref={dialogRef} className="it-dealer-dialog" aria-labelledby="create-dealer-title" onCancel={e=>{if(pending)e.preventDefault();}}>
   <section className="it-user-card">
    <div className="it-user-table-head"><h2 id="create-dealer-title">Create Dealership</h2><button type="button" aria-label="Close dealership form" disabled={pending} onClick={()=>dialogRef.current?.close()}>×</button></div>
    {error&&<p role="alert" className="it-user-error">{error}</p>}
    <form className="it-user-form" onSubmit={makeDealer}>
     <label>Dealership Name<input required minLength={3} maxLength={100} placeholder="Frontier MG Noida" value={dealership.name} onChange={e=>setDealership(v=>({...v,name:e.target.value}))}/></label>
     <label>Address<input required minLength={3} maxLength={500} autoComplete="street-address" placeholder="Dealership address" value={dealership.address} onChange={e=>setDealership(v=>({...v,address:e.target.value}))}/></label>
     <label>Mobile No.<input required maxLength={20} type="tel" placeholder="10-digit Indian mobile" value={dealership.mobile} onChange={e=>setDealership(v=>({...v,mobile:e.target.value}))}/></label>
     <label>Contact Person<input required minLength={2} maxLength={100} placeholder="Contact person's name" value={dealership.contactPerson} onChange={e=>setDealership(v=>({...v,contactPerson:e.target.value}))}/></label>
     <label>Email<input required type="email" maxLength={254} placeholder="dealership@example.com" value={dealership.email} onChange={e=>setDealership(v=>({...v,email:e.target.value}))}/></label>
     <button type="submit" disabled={loading||pending}>{pending?"Saving…":"Create Dealership"}</button>
    </form>
   </section>
  </dialog>
  <dialog ref={resetDialogRef} className="it-dealer-dialog it-reset-dialog" aria-labelledby="reset-account-title" onClose={clearReset} onCancel={e=>{if(pending)e.preventDefault();}}>
   {selectedAccount&&<section className="it-user-card">
    <div className="it-user-table-head"><div><h2 id="reset-account-title">{selectedAccount.name||"Dealership User"}</h2><p className="it-reset-subtitle">Dealership User / {selectedAccount.post||"Viewer"}</p></div><button type="button" disabled={pending} onClick={()=>resetDialogRef.current?.close()}>Close ×</button></div>
    <dl className="it-reset-details">
     {([["User ID",selectedAccount.id],["Dealership",selectedAccount.dealership],["Login Method","Email"],["Auth Login",selectedAccount.email],["Employee ID",selectedAccount.employeeId||"—"],["Auth Status",selectedAccount.activated?"Confirmed":"Unconfirmed"],["Mobile",selectedAccount.mobile||"—"],["System Permission","Dealership Viewer"],["Role / Post",selectedAccount.post||"—"],["Account Status",accountStatus(selectedAccount)],["Original Login Email",selectedAccount.originalEmail||"—"]] as const).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
    {!selectedAccount.activated&&<div className="it-reset-warning"><strong>Identity warnings</strong><p>Email unconfirmed</p></div>}
    {accountMode==="edit"&&<form className="it-user-form it-edit-form" onSubmit={saveEdit}>
     <h3>Edit User Details</h3><label>Full Name<input required maxLength={100} minLength={2} value={edit.name} onChange={e=>setEdit(v=>({...v,name:e.target.value}))}/></label>
     <label>Mobile No.<input type="tel" maxLength={20} value={edit.mobile} onChange={e=>setEdit(v=>({...v,mobile:e.target.value}))}/></label>
     <label>Employee ID<input maxLength={40} value={edit.employeeId} onChange={e=>setEdit(v=>({...v,employeeId:e.target.value}))}/></label>
     <label>Role / Post<input maxLength={100} value={edit.post} onChange={e=>setEdit(v=>({...v,post:e.target.value}))}/></label>
     <div className="it-edit-form-actions"><button type="button" className="it-edit-cancel" disabled={pending} onClick={()=>resetDialogRef.current?.close()}>Cancel</button><button type="submit" disabled={pending}>{pending?"Saving…":"Save changes"}</button></div>
    </form>}
    {accountMode==="password"&&<section className="it-reset-action it-reset-expandable">
     <div className="it-reset-action-head"><div><strong>IT Super User · Temporary password</strong><p>Reset the password and confirm this account's login email. Optionally correct the email before resetting.</p></div><button type="button" disabled={pending||(!resetExpanded&&Boolean(resetPassword))||Boolean(selectedAccount.accountState&&selectedAccount.accountState!=="active")} onClick={()=>{if(resetExpanded){clearResetFields();}else{setResetExpanded(true);setResetError("");}}}>{resetExpanded?"Close":"Reset password"}</button></div>
     {resetExpanded&&!resetPassword&&<form className="it-reset-fields" onSubmit={e=>{e.preventDefault();reset(selectedAccount);}}>
      <label>New password (optional)<input type="password" autoComplete="new-password" placeholder="Generate if blank" minLength={8} maxLength={72} value={customPassword} onChange={e=>setCustomPassword(e.target.value)} disabled={pending}/></label>
      <label>Correct login email (optional)<input type="email" autoComplete="off" placeholder="Leave blank to keep current" maxLength={254} value={correctEmail} onChange={e=>setCorrectEmail(e.target.value)} disabled={pending}/></label>
      <div className="it-reset-confirm-row"><label>Type RESET to confirm<input autoComplete="off" value={resetConfirm} onChange={e=>setResetConfirm(e.target.value)} disabled={pending}/></label><button type="submit" disabled={pending||resetConfirm!=="RESET"}>{pending?"Issuing…":"Issue temporary password"}</button></div>
     </form>}
    </section>}
    {accountMode==="lifecycle"&&<div className="it-account-removal">
     <div className="it-account-archive"><strong>Archive user / Retire identity (recommended)</strong><p>Disable login and retain the original user identity, dealership membership and business history.</p><button type="button" disabled={pending||selectedAccount.accountState==="archived"} onClick={()=>selectLifecycle("archive-user")}>Archive user</button></div>
     <div className="it-account-archive"><strong>Archive account &amp; release login email</strong><p>Release the original email for a new user while retaining the old identity and linked records. The retired account stays disabled.</p><button type="button" disabled={pending||Boolean(selectedAccount.originalEmail)} onClick={()=>selectLifecycle("archive-release-email")}>Release email for a new user</button></div>
     <h3>Account removal</h3><p>Choose whether to revoke login only or request permanent deletion for {selectedAccount.name||"this user"}.</p>
     <label className="it-removal-radio"><input type="radio" name="account-removal" checked={lifecycleAction==="disable-login"} onChange={()=>selectLifecycle("disable-login")} disabled={pending}/> Login access only — prevent sign-in, preserve profile and business history</label>
     <label className="it-removal-radio"><input type="radio" name="account-removal" checked={lifecycleAction==="delete-user"} onChange={()=>selectLifecycle("delete-user")} disabled={pending}/> Complete identity — permanently delete only if protected-record checks pass</label>
     {selectedAccount.accountState&&selectedAccount.accountState!=="active"&&!selectedAccount.originalEmail&&<button className="it-account-restore" type="button" disabled={pending} onClick={()=>selectLifecycle("enable-login")}>Enable login</button>}
     <p className="it-removal-warning">{lifecycleAction==="delete-user"?"Permanent deletion removes the Auth identity and membership. Protected records must be resolved first.":lifecycleAction==="archive-release-email"?"The original email is released and the retired identity remains disabled. This cannot be undone using the same login email.":"Disabling login or archiving preserves the Auth row and business history."}</p>
     <p>Selected: {selectedAccount.name||"Dealership User"} ({selectedAccount.id})</p>
     <label className="it-removal-confirm">Type {lifecyclePhrases[lifecycleAction]} to confirm<input autoComplete="off" value={lifecycleConfirm} onChange={e=>setLifecycleConfirm(e.target.value)} disabled={pending}/></label>
     <button type="button" className="it-removal-submit" disabled={pending||lifecycleConfirm!==lifecyclePhrases[lifecycleAction]||(lifecycleAction==="delete-user"&&(!dependencies||dependencies.length>0))} onClick={()=>changeAccount(selectedAccount)}>{pending?"Processing…":lifecycleAction==="delete-user"?"Delete identity":lifecycleAction==="archive-user"?"Archive user":lifecycleAction==="archive-release-email"?"Archive and release email":lifecycleAction==="enable-login"?"Enable login":"Disable login"}</button>
     <div className="it-removal-dependencies"><button type="button" disabled={pending} onClick={()=>inspectDependencies(selectedAccount)}>Resolve Dependencies</button>
      {dependencies!==null&&(dependencies.length?<><p>Protected records found. Permanent deletion is blocked. Retain this account or resolve these records through their authorized workflows.</p><ul>{dependencies.map((dep,i)=><li key={i}>{dep.label}{dep.count===null?"":": "+dep.count} — {dep.reason}</li>)}</ul></>:<p>No protected dependencies found. The server will recheck before deletion.</p>)}
     </div>
    </div>}
    {resetError&&<p role="alert" className="it-user-error">{resetError}</p>}
    {resetNotice&&<p role="status" className="it-user-success">{resetNotice}</p>}
    {resetPassword&&<div className="it-user-temporary" role="status"><strong>New password — visible once</strong><div className="it-reset-secret"><code>{resetPassword}</code><button type="button" className="btn-outline small" onClick={async()=>{try{await navigator.clipboard.writeText(resetPassword);setResetNotice("Password copied.");}catch{setResetError("Could not copy. Select the password manually.");}}}>Copy</button></div><p>Share privately. Closing this popup clears the displayed password.</p></div>}
   </section>}
  </dialog>
  <div className="it-user-creation-grid it-user-single">
   <section className="it-user-card">
    <h2>Create Dealership User</h2>
    <form className="it-user-form it-create-user-form" onSubmit={makeUser}>
     <label>Dealership<select required value={employee.dealershipId} onChange={e=>setEmployee(v=>({...v,dealershipId:e.target.value}))}><option value="">Select dealership</option>{dealers.filter(d=>d.is_active!==false).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
     <label>Mobile No.<input required type="tel" maxLength={20} placeholder="10-digit Indian mobile" value={employee.mobile} onChange={e=>setEmployee(v=>({...v,mobile:e.target.value}))}/></label>
     <label>Email<input required type="email" maxLength={254} placeholder="employee@dealership.com" value={employee.email} onChange={e=>setEmployee(v=>({...v,email:e.target.value}))}/></label>
     <label>Employee ID<input required minLength={2} maxLength={40} placeholder="EMP001" value={employee.employeeId} onChange={e=>setEmployee(v=>({...v,employeeId:e.target.value}))}/></label>
     <label>Full Name<input required minLength={2} maxLength={100} placeholder="Employee name" value={employee.name} onChange={e=>setEmployee(v=>({...v,name:e.target.value}))}/></label>
     <label>Role / Post<input required minLength={2} maxLength={100} placeholder="Service Manager, CRM Executive, etc." value={employee.post} onChange={e=>setEmployee(v=>({...v,post:e.target.value}))}/></label>
     <button type="submit" disabled={loading||pending||!employee.dealershipId||!dealers.length}>{pending?"Creating…":"Create User"}</button>
    </form>
   </section>
  </div>
  <section className="it-account-tab-section" aria-label="Account directory navigation">
  <div className="it-account-table-tabs" role="tablist" aria-label="User management tables">
   <button type="button" id="it-tab-users" role="tab" aria-controls="it-panel-users" aria-selected={activeTable==="users"} onClick={()=>setActiveTable("users")}>Dealership User Accounts</button>
   <button type="button" id="it-tab-dealerships" role="tab" aria-controls="it-panel-dealerships" aria-selected={activeTable==="dealerships"} onClick={()=>setActiveTable("dealerships")}>Dealership Accounts</button>
  </div>
  </section>
  {activeTable==="users"&&<section id="it-panel-users" role="tabpanel" aria-labelledby="it-tab-users" className="it-user-card it-user-list it-full-width">
   <div className="it-user-table-head"><h2>Dealership User Accounts</h2><div className="it-directory-search"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input type="search" aria-label="Search dealership users" placeholder="Search users..." value={userSearch} onChange={e=>setUserSearch(e.target.value)}/></div></div>
   <div className="tablewrap"><table><thead><tr><th>User</th><th>Dealership</th><th>Mobile</th><th>Employee ID</th><th>Role / Post</th><th>Account</th><th>Password Set</th><th>Action</th></tr></thead><tbody>
    {filteredUsers.map(u=><tr key={u.id}><td><strong>{u.name||"Dealership User"}</strong><small>{u.email}</small></td><td>{u.dealership}</td><td>{u.mobile||"—"}</td><td>{u.employeeId||"—"}</td><td>{u.post||"—"}</td><td><span className={u.activated&&(!u.accountState||u.accountState==="active")?"it-user-active":"it-user-invited"}>{accountStatus(u)}</span></td><td><button type="button" aria-label={"IT Super User: reset password for "+u.name} title="IT Super User only · Reset temporary password without email" onClick={()=>openReset(u)} disabled={pending}>Reset password</button></td><td><div className="it-row-actions"><button type="button" title="Edit User" aria-label="Edit User" disabled={pending||!isManageableDealershipRole(u.role)||u.accountState==="archived"} onClick={()=>openReset(u,"edit")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 3 5 5L8 21H3v-5L16 3Zm-2 2 5 5"/></svg></button><button type="button" title={u.accountState&&u.accountState!=="active"?"Enable User":"Disable User"} aria-label={u.accountState&&u.accountState!=="active"?"Enable User":"Disable User"} disabled={pending||!isManageableDealershipRole(u.role)||Boolean(u.originalEmail)} onClick={()=>openReset(u,"lifecycle",u.accountState&&u.accountState!=="active"?"enable-login":"disable-login")}>{u.accountState&&u.accountState!=="active"?<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/></svg>}</button><button type="button" className="it-delete-icon" title="Delete User" aria-label="Delete User" disabled={pending||!isManageableDealershipRole(u.role)} onClick={()=>openReset(u,"lifecycle","delete-user")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></svg></button></div></td></tr>)}

    {!filteredUsers.length&&<tr><td colSpan={8} className="it-user-empty">{loading?"Loading users…":error?"User records could not be loaded.":<EmptyState kind="users" title={userSearch.trim()?"No matching users":"No users available"} description={userSearch.trim()?"No user matches your search.":"Create a dealership user using the form above."} action={userSearch.trim()?<button type="button" onClick={()=>setUserSearch("")}>Clear search</button>:undefined}/>}</td></tr>}
   </tbody></table></div>
  </section>}
  {activeTable==="dealerships"&&<section id="it-panel-dealerships" role="tabpanel" aria-labelledby="it-tab-dealerships" className="it-user-card it-user-list it-full-width">
   <div className="it-user-table-head"><h2>Dealership Accounts</h2><div className="it-directory-search"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input type="search" aria-label="Search dealership accounts" placeholder="Search dealerships..." value={dealerSearch} onChange={e=>setDealerSearch(e.target.value)}/></div></div>
   <div className="tablewrap"><table><thead><tr><th>Dealership</th><th>Address</th><th>Contact Person</th><th>Mobile</th><th>Email</th><th>Linked Users</th><th>Action</th></tr></thead><tbody>
    {filteredDealers.map(d=><tr key={d.id}><td><strong>{d.name}</strong></td><td>{d.address||"—"}</td><td>{d.contact_person||d.contact||"—"}</td><td>{d.mobile||"—"}</td><td>{d.email||"—"}</td><td>{users.filter(u=>u.dealershipId===d.id).length}</td><td><div className="it-row-actions">{d.is_active===false&&<small>Disabled</small>}<button type="button" title="Edit Dealership" aria-label={"Edit "+d.name} disabled={pending} onClick={()=>openDealerAction(d,"edit")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m16 3 5 5L8 21H3v-5L16 3Zm-2 2 5 5"/></svg></button><button type="button" title={d.is_active===false?"Enable Dealership":"Disable Dealership"} aria-label={(d.is_active===false?"Enable ":"Disable ")+d.name} disabled={pending||d.is_active===undefined} onClick={()=>openDealerAction(d,d.is_active===false?"enable":"disable")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/>{d.is_active===false?<path d="m8 12 3 3 5-6"/>:<path d="m6 6 12 12"/>}</svg></button><button type="button" className="it-delete-icon" title="Delete Dealership" aria-label={"Delete "+d.name} disabled={pending} onClick={()=>openDealerAction(d,"delete")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></svg></button></div></td></tr>)}
    {!filteredDealers.length&&<tr><td colSpan={7} className="it-user-empty">{loading?"Loading dealerships…":error?"Dealership records could not be loaded.":<EmptyState kind="users" title={dealerSearch.trim()?"No matching dealerships":"No dealerships found"} description={dealerSearch.trim()?"No dealership matches your search.":"Create a dealership to get started."} action={dealerSearch.trim()?<button type="button" onClick={()=>setDealerSearch("")}>Clear search</button>:<button type="button" onClick={openDealer}>Create Dealership</button>}/>}</td></tr>}
   </tbody></table></div>
  </section>}
 </div>;
}
