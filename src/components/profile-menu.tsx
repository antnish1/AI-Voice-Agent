"use client";
import Link from "next/link";
import {useEffect,useMemo,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {createBrowserSupabase} from "@/lib/supabase/browser";
import {signOut} from "@/app/login/actions";

type Props={userId:string;email:string;role:string;dealershipName:string;initialName:string;initialAvatarPath:string};
const bucket="frontier-profile-avatars";
export function ProfileMenu({userId,email,role,dealershipName,initialName,initialAvatarPath}:Props){
 const router=useRouter(),supabase=useMemo(()=>createBrowserSupabase(),[]);
 const [open,setOpen]=useState(false),[detailsExpanded,setDetailsExpanded]=useState(false),[passwordOpen,setPasswordOpen]=useState(false),[editOpen,setEditOpen]=useState(false);
 const [displayName,setDisplayName]=useState(initialName||email.split("@")[0]),[editName,setEditName]=useState(initialName||email.split("@")[0]);
 const [avatarPath,setAvatarPath]=useState(initialAvatarPath),[avatarUrl,setAvatarUrl]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const [password,setPassword]=useState(""),[confirm,setConfirm]=useState("");
 const wrapper=useRef<HTMLDivElement>(null),fileInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{const close=(e:PointerEvent)=>{if(wrapper.current&&!wrapper.current.contains(e.target as Node)){setOpen(false);setDetailsExpanded(false);}};const escape=(e:KeyboardEvent)=>{if(e.key==="Escape"){setOpen(false);setDetailsExpanded(false);setPasswordOpen(false);setEditOpen(false);}};document.addEventListener("pointerdown",close);document.addEventListener("keydown",escape);return()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",escape);};},[]);
 useEffect(()=>{let active=true;if(!avatarPath||!avatarPath.startsWith(userId+"/")){setAvatarUrl("");return;}void supabase.storage.from(bucket).createSignedUrl(avatarPath,3600).then(({data,error})=>{if(active)setAvatarUrl(!error&&data?.signedUrl?data.signedUrl:"");});return()=>{active=false;};},[avatarPath,userId,supabase]);
 const initials=displayName.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase()||"U";
 const showError=(text:string)=>{setError(text);setMessage("");};
 const upload=async(file?:File)=>{
  if(!file)return;setError("");setMessage("");
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)){showError("Choose a JPG, PNG or WebP picture.");return;}
  if(file.size>5*1024*1024){showError("The selected image must be smaller than 5 MB.");return;}
  setBusy(true);
  try{
   const image=await createImageBitmap(file);
   const factor=Math.min(1,512/Math.max(image.width,image.height));
   const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(image.width*factor));canvas.height=Math.max(1,Math.round(image.height*factor));
   const context=canvas.getContext("2d");if(!context)throw new Error("Your browser cannot process this image.");
   context.drawImage(image,0,0,canvas.width,canvas.height);image.close();
   const jpeg=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Cannot convert image.")),"image/jpeg",.85));
   if(jpeg.size>2*1024*1024)throw new Error("Optimized image is too large.");
   const path=userId+"/"+crypto.randomUUID()+".jpg";
   const {error:uploadError}=await supabase.storage.from(bucket).upload(path,jpeg,{contentType:"image/jpeg",upsert:false,cacheControl:"3600"});
   if(uploadError)throw uploadError;
   const {error:updateError}=await supabase.auth.updateUser({data:{avatar_path:path}});
   if(updateError){await supabase.storage.from(bucket).remove([path]);throw updateError;}
   const oldPath=avatarPath;
   setAvatarPath(path);
   if(oldPath&&oldPath.startsWith(userId+"/")&&oldPath!==path)await supabase.storage.from(bucket).remove([oldPath]);
   setMessage("Profile picture updated.");
   router.refresh();
  }catch(e){showError(e instanceof Error?e.message:"Unable to upload photo.");}finally{setBusy(false);if(fileInput.current)fileInput.current.value="";}
 };
 const saveName=async()=>{
  const next=editName.trim().replace(/\s+/g," ");
  if(next.length<2||next.length>80){showError("Display name must be 2–80 characters.");return;}
  setBusy(true);setError("");
  const {error:err}=await supabase.auth.updateUser({data:{display_name:next}});
  setBusy(false);
  if(err){showError(err.message);return;}
  setDisplayName(next);setEditOpen(false);setMessage("Profile name updated.");router.refresh();
 };
 const savePassword=async()=>{
  setError("");setMessage("");
  if(password.length<10){showError("New password must be at least 10 characters.");return;}
  if(password!==confirm){showError("The passwords do not match.");return;}
  setBusy(true);
  const {error:err}=await supabase.auth.updateUser({password});
  setBusy(false);
  if(err){showError(err.message);return;}
  setPassword("");setConfirm("");setPasswordOpen(false);setMessage("Password changed successfully.");
 };
 const avatar=(className:string)=><span className={className}>{avatarUrl?<img src={avatarUrl} alt="Your profile photo" referrerPolicy="no-referrer"/>:initials}</span>;
 return <div className="portal-profile" ref={wrapper} onPointerEnter={e=>{if(e.pointerType==="mouse"&&!(passwordOpen||editOpen))setOpen(true);}} onPointerLeave={e=>{if(e.pointerType==="mouse"&&!(passwordOpen||editOpen)){setOpen(false);setDetailsExpanded(false);}}}>
  <button type="button" className="portal-profile-trigger" aria-label="Open profile menu" title="Profile and account options" aria-haspopup="menu" aria-expanded={open} onClick={()=>{setOpen(true);}} onFocus={()=>setOpen(true)}>
   {avatar("portal-profile-avatar")}
  </button>
  {open&&<div className="portal-profile-panel" role="menu" aria-label="Account menu">
   <div className="portal-profile-identity"><div className="portal-profile-picture">
    {avatar("portal-profile-avatar large")}
    <button type="button" className="portal-profile-camera" title="Upload profile picture" aria-label="Add or change profile photo" disabled={busy} onClick={()=>fileInput.current?.click()}>📷</button>
    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e=>void upload(e.target.files?.[0])}/>
   </div><div className="portal-profile-identity-copy"><strong>{displayName}</strong><button type="button" className="portal-profile-details-toggle" aria-expanded={detailsExpanded} aria-controls="portal-profile-expanded-details" onClick={()=>setDetailsExpanded(v=>!v)}>{detailsExpanded?"Hide user details":"View user details"}</button></div></div>
   {detailsExpanded&&<div id="portal-profile-expanded-details" className="portal-profile-expanded"><dl className="portal-profile-facts"><div><dt>Email</dt><dd title={email}>{email}</dd></div><div><dt>Role</dt><dd>{role.replaceAll("_"," ")}</dd></div><div><dt>Status</dt><dd>Active</dd></div></dl><button type="button" className="portal-profile-edit-details" onClick={()=>{setEditName(displayName);setError("");setEditOpen(true);}}>Edit profile name <span aria-hidden="true">→</span></button></div>}
   {message&&<p role="status" className="portal-profile-success">{message}</p>}
   {error&&!passwordOpen&&!editOpen&&<p role="alert" className="portal-profile-error">{error}</p>}
   <div className="portal-profile-actions"><button role="menuitem" type="button" onClick={()=>{setError("");setPassword("");setConfirm("");setPasswordOpen(true);}}>Reset Password <span>→</span></button><Link role="menuitem" href="/settings" onClick={()=>setOpen(false)}>Account Settings <span>→</span></Link><form action={signOut}><button role="menuitem" type="submit" className="portal-logout">Logout <span>↗</span></button></form></div>
  </div>}
  {(passwordOpen||editOpen)&&<div className="portal-account-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget){setPasswordOpen(false);setEditOpen(false);}}}><section className="portal-account-modal" role="dialog" aria-modal="true" aria-label={passwordOpen?"Reset password":"Edit profile"}>
   <div className="portal-account-modal-head"><h2>{passwordOpen?"Reset Password":"Edit user details"}</h2><button type="button" aria-label="Close" onClick={()=>{setPasswordOpen(false);setEditOpen(false);setError("");}}>×</button></div>
   {passwordOpen?<form onSubmit={e=>{e.preventDefault();void savePassword();}}><p>Choose a new password for your current FRONTIER account.</p><label>New password<input type="password" autoComplete="new-password" minLength={10} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimum 10 characters"/></label><label>Confirm password<input type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Re-enter new password"/></label>{error&&<p role="alert" className="portal-profile-error">{error}</p>}<div className="portal-account-modal-buttons"><button type="button" onClick={()=>setPasswordOpen(false)}>Cancel</button><button type="submit" disabled={busy}>{busy?"Saving…":"Update password"}</button></div></form>:
   <form onSubmit={e=>{e.preventDefault();void saveName();}}><p>Your display name appears on your profile. Permissions are managed separately by administrators.</p><label>Display name<input value={editName} maxLength={80} onChange={e=>setEditName(e.target.value)} required/></label><label>Email<input value={email} readOnly/></label>{error&&<p role="alert" className="portal-profile-error">{error}</p>}<div className="portal-account-modal-buttons"><button type="button" onClick={()=>setEditOpen(false)}>Cancel</button><button type="submit" disabled={busy}>{busy?"Saving…":"Save changes"}</button></div></form>}
  </section></div>}
 </div>;
}
