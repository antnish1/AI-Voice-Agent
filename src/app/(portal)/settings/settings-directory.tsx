"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {createBrowserSupabase} from "@/lib/supabase/browser";
import {SarvamConnectionCard} from "./sarvam-connection-card";
import {useNavigationLayout} from "@/components/navigation-layout-preference";
import {ThemeSwitcher} from "@/components/theme-preference";

type Section="profile"|"organization"|"notifications"|"api"|"security"|"billing"|"advanced";
type Props={userId:string;email:string;role:string;dealership:string;displayName:string;phone:string;avatarPath:string};
const sections:{id:Section;label:string;icon:string}[]=[
 {id:"profile",label:"Profile",icon:"user"},{id:"organization",label:"Organization",icon:"building"},
 {id:"notifications",label:"Notifications",icon:"bell"},{id:"api",label:"API Integration",icon:"code"},
 {id:"security",label:"Security",icon:"shield"},{id:"billing",label:"Billing & Plan",icon:"credit"},
 {id:"advanced",label:"Advanced Settings",icon:"sliders"}];
function Icon({name,size=18}:{name:string;size?:number}){
 const shapes:Record<string,React.ReactNode>={
 gear:<><circle cx="12" cy="12" r="3"/><path d="m10 2-.7 3-2.2 1.2-3-.8-2 3.4 2.2 2.2v2l-2.2 2.2 2 3.4 3-.8 2.2 1.2.7 3h4l.7-3 2.2-1.2 3 .8 2-3.4-2.2-2.2v-2l2.2-2.2-2-3.4-3 .8-2.2-1.2-.7-3z"/></>,
 user:<><circle cx="12" cy="8" r="4"/><path d="M4 21v-2c0-4 3-6 8-6s8 2 8 6v2z"/></>,
 building:<><path d="M4 22V6l8-4 8 4v16M2 22h20M8 9h2m4 0h2M8 13h2m4 0h2M8 17h2m4 0h2"/></>,
 bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
 code:<><path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/></>,
 shield:<><path d="M12 2 21 6v7c0 5-4 8-9 10C7 21 3 18 3 13V6z"/><path d="m9 12 2 2 4-5"/></>,
 credit:<><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></>,
 sliders:<><path d="M3 6h18M3 12h18M3 18h18"/><circle cx="9" cy="6" r="2" fill="white"/><circle cx="16" cy="12" r="2" fill="white"/><circle cx="7" cy="18" r="2" fill="white"/></>,
 edit:<path d="m4 16 12-12 4 4-12 12-5 1zM14 6l4 4"/>,
 save:<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v7h10V3M7 21v-8h10v8"/></>,
 lock:<><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
 key:<><circle cx="8" cy="16" r="4"/><path d="M11 13 21 3m-4 0 4 4m-7 0 4 4"/></>,
 download:<><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/></>,
 trash:<><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/></>,
 arrow:<path d="m9 5 7 7-7 7"/>,
 mail:<><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m3 6 9 7 9-7"/></>,
 phone:<path d="M5 3h4l1 5-2.5 2a15 15 0 0 0 6.5 6.5l2-2.5 5 1v4c0 2-1.5 2.2-3 2C9 20 4 15 3 6c-.2-1.6.1-3 2-3Z"/>,
 check:<><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/></>,
 info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
 refresh:<><path d="M20 8a8 8 0 0 0-14-3L4 7V3m0 4h4M4 16a8 8 0 0 0 14 3l2-2v4m0-4h-4"/></>
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]??shapes.info}</svg>;
}
const settingsPanels:Record<Section,string>={
 profile:"Profile Settings",organization:"Organization",notifications:"Notification Preferences",api:"API Integration",security:"Security Settings",billing:"Billing & Plan",advanced:"Advanced Settings"
};
export function SettingsDirectory({userId,email,role,dealership,displayName,phone,avatarPath}:Props){
 const supabase=useMemo(()=>createBrowserSupabase(),[]),router=useRouter();
 const [navigationLayout,setNavigationLayout]=useNavigationLayout(userId);
 const [section,setSection]=useState<Section>("profile"),[name,setName]=useState(displayName||email.split("@")[0]),[mobile,setMobile]=useState(phone||""),[path,setPath]=useState(avatarPath),[avatarUrl,setAvatarUrl]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [passwordOpen,setPasswordOpen]=useState(false),[newPassword,setNewPassword]=useState(""),[confirmPassword,setConfirmPassword]=useState("");
 const uploadInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{let active=true;if(!path||!path.startsWith(userId+"/")){setAvatarUrl("");return;}void supabase.storage.from("frontier-profile-avatars").createSignedUrl(path,3600).then(({data})=>{if(active)setAvatarUrl(data?.signedUrl??"");});return()=>{active=false;};},[path,userId,supabase]);
 const flash=(text:string)=>{setNotice(text);setError("");};
 const save=async()=>{const clean=name.trim().replace(/\s+/g," "),digits=mobile.trim();
  setError("");setNotice("");
  if(clean.length<2||clean.length>80){setError("Full name must be 2–80 characters.");return;}
  if(digits&&!/^\+?[1-9][0-9\s()-]{7,18}$/.test(digits)){setError("Enter a valid phone number or leave it blank.");return;}
  setBusy(true);
  const {error:e}=await supabase.auth.updateUser({data:{display_name:clean,profile_phone:digits}});
  setBusy(false);if(e){setError(e.message);return;}flash("Profile saved successfully.");router.refresh();
 };
 const upload=async(file?:File)=>{if(!file)return;setError("");setNotice("");
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setError("Choose a JPG, PNG or WebP image.");return;}
  if(file.size>5*1024*1024){setError("Image must be smaller than 5 MB.");return;}setBusy(true);
  try{const bitmap=await createImageBitmap(file),scale=Math.min(1,512/Math.max(bitmap.width,bitmap.height));
   const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   const context=canvas.getContext("2d");if(!context)throw new Error("Unable to process image.");
   context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Image conversion failed.")),"image/jpeg",.85));
   if(blob.size>2097152)throw new Error("Converted image is too large.");
   const next=userId+"/"+crypto.randomUUID()+".jpg";
   const uploaded=await supabase.storage.from("frontier-profile-avatars").upload(next,blob,{contentType:"image/jpeg",upsert:false});
   if(uploaded.error)throw uploaded.error;
   const update=await supabase.auth.updateUser({data:{avatar_path:next}});
   if(update.error){await supabase.storage.from("frontier-profile-avatars").remove([next]);throw update.error;}
   if(path&&path.startsWith(userId+"/"))await supabase.storage.from("frontier-profile-avatars").remove([path]);
   setPath(next);flash("Profile picture updated.");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to upload photo.");}finally{setBusy(false);if(uploadInput.current)uploadInput.current.value="";}
 };
 const changePassword=async()=>{setError("");setNotice("");if(newPassword.length<10){setError("Use at least 10 characters.");return;}if(newPassword!==confirmPassword){setError("Passwords do not match.");return;}setBusy(true);const {error:e}=await supabase.auth.updateUser({password:newPassword});setBusy(false);if(e){setError(e.message);return;}setPasswordOpen(false);setNewPassword("");setConfirmPassword("");flash("Password updated successfully.");};
 const initials=name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"U";
 return <div className="settings-ref">

  <div className="settings-ref-layout">
   <nav className="settings-ref-sidebar" aria-label="Settings sections">{sections.map(item=><button key={item.id} type="button" className={section===item.id?"active":""} aria-current={section===item.id?"page":undefined} onClick={()=>{setSection(item.id);setError("");setNotice("");}}><Icon name={item.icon} size={17}/>{item.label}</button>)}</nav>
   <div className="settings-ref-main">
    {section==="profile"?<>
     <section className="settings-ref-profile-card"><div className="settings-ref-card-heading"><h2>Profile Settings</h2><p>Update your profile information</p></div><div className="settings-ref-profile-content">
      <div className="settings-ref-profile-identity"><div className="settings-ref-avatar-wrap"><span className="settings-ref-avatar">{avatarUrl?<img src={avatarUrl} alt="Profile picture" referrerPolicy="no-referrer"/>:initials}</span><button type="button" className="settings-ref-avatar-edit" title="Change profile picture" aria-label="Change profile picture" disabled={busy} onClick={()=>uploadInput.current?.click()}><Icon name="edit" size={15}/></button><input className="sr-only" type="file" ref={uploadInput} accept="image/png,image/jpeg,image/webp" onChange={e=>void upload(e.target.files?.[0])}/></div><div><strong>{name}</strong><p><Icon name="building" size={13}/>{dealership}</p><span className="settings-ref-plan-indicator"><Icon name="check" size={12}/> Active account</span></div></div>
      <form className="settings-ref-profile-form" onSubmit={e=>{e.preventDefault();void save();}}><label>Full Name <span><Icon name="user" size={15}/><input value={name} maxLength={80} required onChange={e=>setName(e.target.value)}/></span></label><label>Email Address <span><Icon name="mail" size={15}/><input value={email} readOnly title="Account email cannot be changed here"/></span></label><label>Phone Number <span><Icon name="phone" size={15}/><input type="tel" value={mobile} onChange={e=>setMobile(e.target.value)} placeholder="Optional phone number"/></span></label><div className="settings-ref-save-row"><button type="submit" disabled={busy}><Icon name="save" size={15}/>{busy?"Saving…":"Save Changes"}</button></div></form>
     </div></section>
     <section className="frontier-layout-settings frontier-layout-compact" aria-labelledby="frontier-layout-title">
      <div className="frontier-layout-title"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg><h3 id="frontier-layout-title">Appearance &amp; Layout</h3></div>
      <div className="frontier-theme-and-layout"><div className="frontier-theme-control"><span>Theme</span><ThemeSwitcher/></div><div className="frontier-layout-options" role="radiogroup" aria-label="Navigation layout">
       <label className={`frontier-layout-option ${navigationLayout==="sidebar"?"selected":""}`}>
        <input type="radio" name="frontier-navigation-layout" value="sidebar" checked={navigationLayout==="sidebar"} onChange={()=>setNavigationLayout("sidebar")}/>
        <svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2.5" y="3" width="19" height="18" rx="2"/><path d="M9 3v18"/></svg>
        <span><strong>Sidebar (Default)</strong></span>
       </label>
       <label className={`frontier-layout-option ${navigationLayout==="topbar"?"selected":""}`}>
        <input type="radio" name="frontier-navigation-layout" value="topbar" checked={navigationLayout==="topbar"} onChange={()=>setNavigationLayout("topbar")}/>
        <svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2.5" y="3" width="19" height="18" rx="2"/><path d="M2.5 9h19"/></svg>
        <span><strong>Top Menu Bar</strong></span>
       </label>
      </div></div>
     </section>
     <div className="settings-ref-card-grid">
      <section className="settings-ref-card"><h3><Icon name="bell" size={18}/> Notification Preferences</h3><p>Choose how you want to receive notifications</p>{[["Campaign Status Updates","Get notified about campaign progress"],["Call Summary Reports","Receive periodic call reports"],["Approval Requests","Be notified of pending approvals"],["System Updates","Get notified about new features"]].map(([label,desc])=><div className="settings-ref-preference" key={label}><div><strong>{label}</strong><small>{desc}</small></div><span className="settings-ref-switch-disabled" title="Notification delivery is not configured" aria-label={label+" not configured"}><span/></span></div>)}<small className="settings-ref-footnote">Notification delivery and preferences are not connected yet.</small></section>
      <SarvamConnectionCard compact/>
      <section className="settings-ref-card"><h3><Icon name="shield" size={18}/> Security Settings</h3><p>Keep your account secure</p><button className="settings-ref-card-action" type="button" onClick={()=>{setError("");setPasswordOpen(true);}}><Icon name="lock" size={17}/><span><strong>Change Password</strong><small>Update your password regularly</small></span><Icon name="arrow" size={15}/></button><div className="settings-ref-card-action disabled"><Icon name="key" size={17}/><span><strong>Two-Factor Authentication</strong><small>Not configured; requires secure backend setup</small></span><span className="settings-ref-switch-disabled"><span/></span></div></section>
      <section className="settings-ref-card"><h3><Icon name="building" size={18}/> Data &amp; Privacy</h3><p>Manage your data preferences</p><div className="settings-ref-card-action disabled"><Icon name="download" size={17}/><span><strong>Download Your Data</strong><small>Requires a verified secure export workflow</small></span><Icon name="arrow" size={15}/></div><div className="settings-ref-card-action disabled"><Icon name="trash" size={17}/><span><strong>Delete Account</strong><small>Requires identity verification and data-retention controls</small></span><span className="settings-ref-delete-disabled">Unavailable</span></div></section>
     </div>
    </>:<section className="settings-ref-other-panel"><div className="settings-ref-other-heading"><span><Icon name={sections.find(s=>s.id===section)?.icon??"gear"} size={24}/></span><div><h2>{settingsPanels[section]}</h2><p>{section==="organization"?"Your assigned dealership and permissions":section==="notifications"?"Preferences for future alerts and email notifications":section==="api"?"Integration readiness and API security":section==="security"?"Account password and authentication options":section==="billing"?"Plan and billing settings":"Workspace configuration"}</p></div></div>
     {section==="organization"?<dl className="settings-ref-details"><div><dt>Dealership</dt><dd>{dealership}</dd></div><div><dt>Your Role</dt><dd>{role.replaceAll("_"," ")}</dd></div><div><dt>Membership</dt><dd>Authenticated</dd></div></dl>:section==="api"?<SarvamConnectionCard/>:section==="security"?<><button type="button" className="settings-ref-password-button" onClick={()=>setPasswordOpen(true)}><Icon name="lock" size={16}/> Change Password</button><p className="settings-ref-other-note">Two-factor authentication and trusted-device controls are not configured.</p></>:<div className="settings-ref-unavailable"><Icon name="info" size={22}/><strong>This section is ready for future configuration.</strong><p>{section==="notifications"?"Notification channels and delivery permissions are not yet configured.":section==="billing"?"A billing provider and confirmed plan information are not integrated.":"Changes to advanced settings require dedicated permissions and backend validation."}</p></div>}
    </section>}
    {notice&&<p role="status" className="settings-ref-success">{notice}</p>}
    {error&&!passwordOpen&&<p role="alert" className="settings-ref-error">{error}</p>}
   </div>
  </div>
  {passwordOpen&&<div className="settings-ref-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setPasswordOpen(false);}}><section className="settings-ref-modal" role="dialog" aria-modal="true" aria-label="Change password"><header><h2>Change Password</h2><button type="button" aria-label="Close" onClick={()=>{setPasswordOpen(false);setError("");}}>×</button></header><form onSubmit={e=>{e.preventDefault();void changePassword();}}><p>Choose a strong password for your FRONTIER account.</p><label>New Password<input type="password" value={newPassword} autoComplete="new-password" minLength={10} required onChange={e=>setNewPassword(e.target.value)} placeholder="At least 10 characters"/></label><label>Confirm Password<input type="password" value={confirmPassword} autoComplete="new-password" required onChange={e=>setConfirmPassword(e.target.value)} placeholder="Enter password again"/></label>{error&&<p role="alert" className="settings-ref-error">{error}</p>}<div className="settings-ref-modal-buttons"><button type="button" onClick={()=>setPasswordOpen(false)}>Cancel</button><button type="submit" disabled={busy}>{busy?"Updating…":"Update Password"}</button></div></form></section></div>}
 </div>;
}