"use client";
import {useState} from "react";

export function PasswordField(){
 const [visible,setVisible]=useState(false);
 return <div className="fv-input-wrap">
  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" fill="currentColor"/><path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M12 14v3" stroke="#dfe9fa" strokeWidth="2" strokeLinecap="round"/></svg>
  <input id="fv-password" name="password" type={visible?"text":"password"} autoComplete="current-password" placeholder="Password" aria-label="Password" required/>
  <button type="button" className="fv-password-eye" aria-label={visible?"Hide password":"Show password"} aria-pressed={visible} onClick={()=>setVisible(v=>!v)}>
   <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8"/>{!visible&&<path d="M3 21 21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>}</svg>
  </button>
 </div>;
}
