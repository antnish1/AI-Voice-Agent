"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {createBrowserSupabase} from "@/lib/supabase/browser";

export default function ChangePassword(){
 const router=useRouter();
 const [password,setPassword]=useState(""),[confirm,setConfirm]=useState(""),[error,setError]=useState(""),[pending,setPending]=useState(false);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();setError("");
  if(password.length<12||password==="12345678"){setError("Choose a new password with at least 12 characters; do not reuse the temporary password.");return;}
  if(password!==confirm){setError("Passwords do not match.");return;}
  setPending(true);
  try{
   const supabase=createBrowserSupabase();
   const {data:{session}}=await supabase.auth.getSession();
   if(!session)throw Error("Your activation link has expired. Sign in or request a new activation email.");
   const user=await supabase.auth.getUser();
   if(user.error||!user.data.user)throw Error("Unable to verify your session.");
   if(user.data.user.app_metadata?.must_change_password===true){
    const endpoint=process.env.NEXT_PUBLIC_SUPABASE_URL+"/functions/v1/it-user-management";
    const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json",apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"",Authorization:"Bearer "+session.access_token},body:JSON.stringify({action:"set-own-password",password})});
    const result=await response.json();
    if(!response.ok)throw Error(result.error??"Password update failed.");
   }else{
    const {error:updateError}=await supabase.auth.updateUser({password});
    if(updateError)throw updateError;
   }
   const refreshed=await supabase.auth.refreshSession();
   if(refreshed.error)throw Error("Password updated. Please sign in again.");
   router.replace("/dashboard");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to update password.");}finally{setPending(false);}
 }
 return <main className="login-page"><section className="login-card"><div className="logo">F</div><p className="eyebrow">FRONTIER GROUP</p><h1>Set your password</h1><p className="muted">Activate your dealership account by choosing your own password. Your temporary password cannot be reused.</p><form onSubmit={submit} className="form"><label>New password<input type="password" autoComplete="new-password" minLength={12} value={password} onChange={e=>setPassword(e.target.value)} required/></label><label>Confirm new password<input type="password" autoComplete="new-password" minLength={12} value={confirm} onChange={e=>setConfirm(e.target.value)} required/></label>{error&&<p role="alert" className="error">{error}</p>}<button type="submit" disabled={pending}>{pending?"Activating…":"Activate account & continue"}</button></form></section></main>;
}