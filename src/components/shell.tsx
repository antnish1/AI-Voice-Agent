"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useEffect,useRef,useState} from "react";
import type {Membership} from "@/lib/auth";
import {ProfileMenu} from "@/components/profile-menu";
import {PortalBreadcrumbs} from "@/components/portal-breadcrumbs";

const sections: Array<{title:string;items:Array<[string,string,string]>}>=[
 {title:"",items:[["⌂","Dashboard","/dashboard"],["◫","Campaigns","/campaigns"],["◎","AI Voice Agents","/agents"],["♙","Customers","/customers"],["☑","Approvals","/approvals"]]},
 {title:"",items:[["◷","Call Logs","/call-logs"],["▣","Appointments","/appointments"],["↺","Callbacks","/callbacks"],["⇄","Pickup & Drop","/pickup-drop"],["▤","Documents","/documents"],["▥","Reports","/reports"],["⚙","Settings","/settings"]]}
];

const allPages=sections.flatMap(s=>s.items);
export function Shell({children,membership,userEmail,userId,displayName,avatarPath}:{children:React.ReactNode,membership:Membership,userEmail:string,userId:string,displayName:string,avatarPath:string}){
 const path=usePathname(),router=useRouter();
 const searchInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){event.preventDefault();searchInput.current?.focus();}if(event.key==="Escape"){setShowSearch(false);searchInput.current?.blur();}};document.addEventListener("keydown",onKey);return ()=>document.removeEventListener("keydown",onKey);},[]);
 const [collapsed,setCollapsed]=useState(false),[mobile,setMobile]=useState(false),[search,setSearch]=useState(""),[showSearch,setShowSearch]=useState(false);
 const suggestions=search.trim()?allPages.filter(item=>item[1].toLowerCase().includes(search.trim().toLowerCase())).slice(0,5):[];
 const navigate=(href:string)=>{setSearch("");setShowSearch(false);setMobile(false);router.push(href);};
 return <div className={`app crm-app reference-app ${collapsed?"nav-collapsed":""} ${mobile?"nav-open":""}`}>
  <aside className="sidebar crm-sidebar ref-sidebar">
   <div className="brand crm-brand ref-brand"><div className="brand-icon">F</div><span className="brand-words">FRONTIER<small>AI VOICE CRM</small></span><button type="button" className="collapse-control" onClick={()=>setCollapsed(!collapsed)} title={collapsed?"Expand sidebar":"Collapse sidebar"} aria-label="Toggle sidebar">{collapsed?"›":"‹"}</button></div>
   <nav aria-label="Main navigation">{sections.map((section,i)=><div className="nav-section" key={i}>{section.title&&<p className="nav-section-title">{section.title}</p>}{section.items.map(([glyph,label,href])=><Link key={href} href={href} onClick={()=>setMobile(false)} aria-current={path===href||(href==="/campaigns"&&path.startsWith("/campaigns/"))?"page":undefined} title={label} className={path===href||(href==="/campaigns"&&path.startsWith("/campaigns/"))?"active":""}><span className="nav-icon">{glyph}</span><span className="nav-label">{label}</span></Link>)}</div>)}</nav>
   <div className="ref-sidebar-bottom"><div className="ref-sidebar-wave" aria-hidden="true"/><button type="button" onClick={()=>setCollapsed(!collapsed)} aria-label={collapsed?"Expand sidebar":"Collapse sidebar"}><span>«</span><span className="nav-label">{collapsed?"":"Collapse sidebar"}</span></button><p className="nav-label">Live calling disabled</p></div>
  </aside>
  {mobile&&<button className="mobile-backdrop" aria-label="Close menu" onClick={()=>setMobile(false)}/>}
  <div className="workspace crm-workspace">
   <header className="topbar crm-topbar ref-topbar">
    <button type="button" className="ref-menu-toggle" onClick={()=>{if(window.innerWidth<=760)setMobile(!mobile);else setCollapsed(!collapsed);}} aria-label="Toggle navigation">☰</button>
    <div className="ref-global-search">
     <form role="search" onSubmit={e=>{e.preventDefault();if(suggestions.length)navigate(suggestions[0][2]);}}>
      <span aria-hidden="true">⌕</span><input ref={searchInput} aria-label="Search portal pages" value={search} onFocus={()=>setShowSearch(true)} onBlur={()=>setShowSearch(false)} onChange={e=>setSearch(e.target.value)} placeholder="Search portal pages..."/><kbd>Ctrl + K</kbd>
     </form>
     {showSearch&&search.trim()&&<div className="ref-search-suggestions">{suggestions.length?suggestions.map(([glyph,label,href])=><button type="button" key={href} onMouseDown={e=>e.preventDefault()} onClick={()=>navigate(href)}><span>{glyph}</span>{label}</button>):<p>No matching pages. Search matches navigation pages only.</p>}</div>}
    </div>
    <div className="ref-topbar-right">
     <span className="ref-notification" title="Notifications will be enabled when event ingestion is ready" aria-label="Notifications not connected">♧</span>
     <ProfileMenu userId={userId} email={userEmail} role={membership.role} dealershipName={membership.dealerships?.name??"Dealership"} initialName={displayName} initialAvatarPath={avatarPath}/>
    </div>
   </header>
   <PortalBreadcrumbs/>
   <main className="main crm-main ref-main">{children}</main>
  </div>
 </div>;
}