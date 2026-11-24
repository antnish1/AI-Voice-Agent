"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useState,useEffect} from "react";
import {AnimatePresence,motion, useReducedMotion} from "motion/react";
import {createPortal} from "react-dom";
import type {FocusEvent,MouseEvent} from "react";
import {MotionRoute} from "@/components/motion/motion-route";
import {motionTokens} from "@/components/motion/motion-tokens";
import type {Membership} from "@/lib/auth";
import {ProfileMenu} from "@/components/profile-menu";
import {PortalBreadcrumbs} from "@/components/portal-breadcrumbs";
import {SidebarIcon,type SidebarIconName} from "@/components/sidebar-icons";
import {useNavigationLayout} from "@/components/navigation-layout-preference";
import {TopMenuNavigation} from "@/components/top-menu-navigation";

const dealershipHiddenRoutes=new Set(["/appointments","/call-logs","/callbacks","/pickup-drop","/documents"]);
const navigation:Array<{name:string;url:string;icon:SidebarIconName}>=[
 {name:"Dashboard",url:"/dashboard",icon:"home"},
 {name:"Campaigns",url:"/campaigns",icon:"megaphone"},
 {name:"AI Voice Agents",url:"/agents",icon:"wave"},
 {name:"Customers",url:"/customers",icon:"user-square"},
 {name:"Approvals",url:"/approvals",icon:"check-square"},
 {name:"Call Logs",url:"/call-logs",icon:"phone"},
 {name:"Appointments",url:"/appointments",icon:"calendar"},
 {name:"Callbacks",url:"/callbacks",icon:"callback"},
 {name:"Pickup & Drop",url:"/pickup-drop",icon:"truck"},
 {name:"Documents",url:"/documents",icon:"documents"},
 {name:"Reports",url:"/reports",icon:"chart"},
 {name:"Settings",url:"/settings",icon:"settings"}
];
export function Shell({children,membership,userEmail,userId,displayName,avatarPath,pendingApprovals=0,isItAdmin=false,availableDealerships=[]}:{children:React.ReactNode;membership:Membership;userEmail:string;userId:string;displayName:string;avatarPath:string;pendingApprovals?:number;isItAdmin?:boolean;availableDealerships?:Array<{id:string;name:string}>}){
 const path=usePathname();
 const [navigationLayout]=useNavigationLayout(userId);
 const isTopMenu=navigationLayout==="topbar";
 const reducedMotion=useReducedMotion();
 const [narrowScreen,setNarrowScreen]=useState(false);
 useEffect(()=>{const query=window.matchMedia("(max-width:760px)");const update=()=>setNarrowScreen(query.matches);update();query.addEventListener("change",update);return ()=>query.removeEventListener("change",update);},[]);
 const [collapsed,setCollapsed]=useState(false),[mobile,setMobile]=useState(false),[campaignsExpanded,setCampaignsExpanded]=useState(false),[helpOpen,setHelpOpen]=useState(false);
 const [tooltip,setTooltip]=useState<{name:string;left:number;top:number}|null>(null);
 const [hasMounted,setHasMounted]=useState(false);
 useEffect(()=>{setHasMounted(true);},[]);
 const showTooltip=(name:string,element:HTMLElement)=>{
  if(!collapsed||narrowScreen)return;
  const rect=element.getBoundingClientRect();
  setTooltip({name,left:rect.right+12,top:rect.top+2});
 };
 const hideTooltip=()=>setTooltip(null);
 useEffect(()=>{hideTooltip();},[collapsed,narrowScreen,path]);
 const campaignActive=path==="/campaigns"||path.startsWith("/campaigns/");
 const closeMobile=()=>setMobile(false);
 useEffect(()=>{setCampaignsExpanded(false);setMobile(false);},[path,navigationLayout]);
 return <div className={`app crm-app reference-app ${collapsed?"nav-collapsed":""} ${mobile?"nav-open":""} ${isTopMenu?"frontier-top-layout":""}`}>
  {!isTopMenu&&<motion.aside className="sidebar crm-sidebar ref-sidebar frontier-reference-sidebar" animate={{width:narrowScreen?224:collapsed?68:224}} transition={reducedMotion?{duration:0}:motionTokens.spring}>
   <div className="brand crm-brand ref-brand frontier-sidebar-brand" title="Frontier Voice Intelligence">
    {collapsed&&!narrowScreen?
     <button type="button" className="brand-icon frontier-sidebar-logo frontier-logo-expand" onClick={()=>setCollapsed(false)} title="Expand sidebar" aria-label="Expand sidebar"><img src="/autoreach-logo.png" alt="" width={42} height={42}/></button>:
     <div className="brand-icon frontier-sidebar-logo" aria-label="FrontVox AI logo"><img src="/autoreach-logo.png" alt="" width={42} height={42}/></div>}
    <span className="brand-words frontier-brand-text">FrontVox<small>AI</small></span>
    {!collapsed&&!narrowScreen&&<button type="button" className="collapse-control frontier-sidebar-collapse" onClick={()=>setCollapsed(true)} title="Collapse sidebar" aria-label="Collapse sidebar"><SidebarIcon name="chevrons-left" size={19}/></button>}
   </div>
   <nav className="frontier-sidebar-nav" aria-label="Main navigation">
    {[...navigation.filter(item=>isItAdmin||(!dealershipHiddenRoutes.has(item.url)&&!["/approvals","/agents"].includes(item.url))),...(isItAdmin?[{name:"User Management",url:"/users",icon:"users" as SidebarIconName}]:[])].map(item=>{
     const active=path===item.url||(item.url==="/campaigns"&&campaignActive);
     return <div className="frontier-nav-entry" key={item.url}>
       <div className={`frontier-nav-row ${active?"selected":""} ${item.url==="/campaigns"?"frontier-campaign-row":""}`}>{active&&<motion.span layoutId="frontier-active-nav" className="frontier-motion-active-nav" transition={reducedMotion?{duration:0}:motionTokens.spring} aria-hidden="true"/>}
        <Link href={item.url} onClick={()=>{hideTooltip();closeMobile();}} title={!collapsed||narrowScreen?item.name:undefined} aria-label={item.name}
         onMouseEnter={(e:MouseEvent<HTMLAnchorElement>)=>showTooltip(item.name,e.currentTarget)}
         onMouseLeave={hideTooltip}
         onFocus={(e:FocusEvent<HTMLAnchorElement>)=>showTooltip(item.name,e.currentTarget)}
         onBlur={hideTooltip}
         aria-current={active?"page":undefined} className={`frontier-nav-link ${active?"active":""}`}>
         <span className="nav-icon"><SidebarIcon name={item.icon} size={21}/></span>
         <span className="nav-label">{item.name}</span>
         {item.url==="/approvals"&&pendingApprovals>0&&<span className="frontier-approval-badge" title={`${pendingApprovals} campaigns awaiting approval`}>{pendingApprovals>99?"99+":pendingApprovals}</span>}
        </Link>
        {item.url==="/campaigns"&&<button type="button" className="frontier-campaign-toggle" aria-label={campaignsExpanded?"Collapse Campaigns submenu":"Expand Campaigns submenu"} aria-expanded={campaignsExpanded} onClick={()=>setCampaignsExpanded(s=>!s)}><SidebarIcon name="chevron-down" size={16}/></button>}
       </div>
       {item.url==="/campaigns"&&campaignsExpanded&&!collapsed&&<div className="frontier-campaign-subnav"><Link href="/campaigns" onClick={closeMobile}>All Campaigns</Link>{isItAdmin&&<Link href="/campaigns/new" onClick={closeMobile}>Create Campaign</Link>}</div>}
      </div>;
    })}
   </nav>
   <div className="frontier-sidebar-bottom">
    <svg className="frontier-sidebar-wave" viewBox="0 0 230 190" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sidebarWaveFill" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#073a5c"/><stop offset=".62" stopColor="#087f91"/><stop offset="1" stopColor="#0cacc0"/></linearGradient></defs><path d="M-30 180C25 88 92 135 143 95S210 44 260 57V200H-30Z" fill="url(#sidebarWaveFill)" opacity=".5"/><path d="M-15 161C70 106 124 169 186 92S229 75 270 80" fill="none" stroke="#1bacc5" strokeWidth="1.3" opacity=".40"/><path d="M-25 173C30 123 107 154 155 115S220 85 265 110" fill="none" stroke="#22c7d5" strokeWidth=".75" opacity=".25"/></svg>
    <button type="button" className="frontier-help-card" onClick={()=>setHelpOpen(v=>!v)} aria-expanded={helpOpen} title="Contact Support">
     <span className="frontier-help-icon"><SidebarIcon name="headset" size={21}/></span><span className="frontier-help-text"><strong>Need Help?</strong><small>Contact Support</small></span><SidebarIcon name="arrow-right" size={17}/>
    </button>
    {helpOpen&&!collapsed&&<div className="frontier-help-details" role="status">For support, contact your Frontier Group administrator.</div>}
   </div>
  </motion.aside>}
  {hasMounted&&createPortal(<AnimatePresence>
   {tooltip&&collapsed&&!narrowScreen&&!isTopMenu&&<motion.div
    key={tooltip.name}
    className="frontier-nav-tooltip" role="tooltip"
    style={{left:tooltip.left,top:tooltip.top}}
    initial={reducedMotion?false:{opacity:0,x:-7,scale:.96}}
    animate={{opacity:1,x:0,scale:1}}
    exit={reducedMotion?{opacity:0}:{opacity:0,x:-5,scale:.97}}
    transition={{duration:reducedMotion?0:.16,ease:motionTokens.ease}}>
     {tooltip.name}
    </motion.div>}
   </AnimatePresence>,document.body)}
  {!isTopMenu&&mobile&&<button className="mobile-backdrop" aria-label="Close menu" onClick={closeMobile}/>}
  <div className="workspace crm-workspace">
   <header className="topbar crm-topbar ref-topbar">
    {!isTopMenu&&<button type="button" className="ref-menu-toggle" onClick={()=>{if(window.innerWidth<=760)setMobile(!mobile);else setCollapsed(!collapsed);}} aria-label="Toggle navigation">☰</button>}
    {isTopMenu&&<span className="frontier-topbar-brand" aria-label="FrontVox AI" title="Frontier Voice Intelligence"><span className="frontier-topbar-brand-mark"><img src="/autoreach-logo.png" alt="" width={34} height={34}/></span><span>FrontVox<small>AI</small></span></span>}
    <div className="ref-header-breadcrumbs"><PortalBreadcrumbs/></div>
    <div className="ref-topbar-right">

     <span className="ref-notification" title="Notifications will be enabled when event ingestion is ready" aria-label="Notifications not connected">♧</span>
     <ProfileMenu userId={userId} email={userEmail} role={membership.role} dealershipName={membership.dealerships?.name??"Dealership"} initialName={displayName} initialAvatarPath={avatarPath}/>
    </div>
   </header>

   {isTopMenu&&<TopMenuNavigation
    items={[...navigation.filter(item=>isItAdmin||(!dealershipHiddenRoutes.has(item.url)&&!["/approvals","/agents"].includes(item.url))),...(isItAdmin?[{name:"User Management",url:"/users",icon:"users" as SidebarIconName}]:[])]}
    pendingApprovals={pendingApprovals} isItAdmin={isItAdmin}/>}
   <main className="main crm-main ref-main"><MotionRoute>{children}</MotionRoute></main>
  </div>
 </div>;
}