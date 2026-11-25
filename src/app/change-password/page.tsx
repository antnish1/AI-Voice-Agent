"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {createBrowserSupabase} from "@/lib/supabase/browser";

export default function ChangePassword(){
 const router=useRouter();
 const [isIt,setIsIt]=useState(false),[loading,setLoading]=useState(true);
 const [password,setPassword]=useState(""),[confirm,setConfirm]=useState(""),[error,setError]=useState(""),[pending,setPending]=useState(false);
 useEffect(()=>{
  let cancelled=false;
  void createBrowserSupabase().auth.getUser().then(({data:{user}})=>{
   if(cancelled)return;
   setIsIt(user?.id==="5bd78ada-44f5-4045-a9fb-75c9dad69893"&&user.email?.toLowerCase()==="it@insureit.in");
   setLoading(false);
  }).catch(()=>{if(!cancelled)setLoading(false);});
  return ()=>{cancelled=true;};
 },[]);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();setError("");
  if(!isIt){setError("Password changes are restricted to the IT Super User.");return;}
  if(password.length<12||password!==confirm){setError("Enter matching passwords of at least 12 characters.");return;}
  setPending(true);
  try{
   const supabase=createBrowserSupabase();
   const {error:changeError}=await supabase.auth.updateUser({password});
   if(changeError)throw changeError;
   router.replace("/dashboard");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to update password.");}finally{setPending(false);}
 }
 if(loading)return <main className="login-page"><section className="login-card"><p>Checking access…</p></section></main>;
 if(!isIt)return <main className="login-page"><section className="login-card"><p className="eyebrow">FRONTIER GROUP</p><h1>Password managed by IT</h1><p className="muted">Dealership users cannot change or reset their own passwords in Frontier Voice CRM. Contact your IT Super User to request a password reset.</p><Link href="/dashboard">Back to dashboard</Link></section></main>;
 return <main className="login-page"><section className="login-card"><p className="eyebrow">IT SUPER USER</p><h1>Change administrator password</h1><form onSubmit={submit} className="form"><label>New password<input type="password" autoComplete="new-password" minLength={12} value={password} onChange={e=>setPassword(e.target.value)} required/></label><label>Confirm password<input type="password" autoComplete="new-password" minLength={12} value={confirm} onChange={e=>setConfirm(e.target.value)} required/></label>{error&&<p role="alert" className="error">{error}</p>}<button type="submit" disabled={pending}>{pending?"Updating…":"Update password"}</button></form></section></main>;
}