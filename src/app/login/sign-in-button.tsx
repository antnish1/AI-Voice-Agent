"use client";
import {useFormStatus} from "react-dom";

export function SignInButton(){
 const {pending}=useFormStatus();
 return <button className="fv-submit" type="submit" disabled={pending} aria-busy={pending}>
  {pending?<><span className="fv-submit-spinner" aria-hidden="true"/>Signing in…</>:<>Sign In <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg></>}
 </button>;
}
