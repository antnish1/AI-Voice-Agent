import Link from "next/link";
import {requireMembership,canCreateCampaign} from "@/lib/auth";
import {isItSuperUser} from "@/lib/it-access";
import "./campaigns-reference.css";
import {CampaignDetailsPopup} from "./campaign-details-popup";
import {AutoCampaignFilters} from "./auto-campaign-filters";

type Filters={q?:string;status?:string;from?:string;to?:string;view?:string};
type Campaign={dealership_id:string;id:string;name:string;status:string;created_at:string;approved_at:string|null};

function CampaignIcon({kind}:{kind:"all"|"draft"|"pending"|"grid"|"search"|"filter"|"calendar"|"voice"}){
 const shapes:Record<typeof kind,React.ReactNode>={
  all:<><path d="M4 11V7l9-4v18l-9-4v-6ZM13 7l6-2v14l-6-2M4 11H2v6a3 3 0 0 0 3 3h2l2 3" /></>,
  draft:<><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
  pending:<><circle cx="12" cy="12" r="9"/><path d="M12 6v7l5 3"/></>,
  grid:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  filter:<><path d="M3 5h18l-7 8v5l-4 2v-7L3 5Z"/></>,
  calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>,
  voice:<><path d="M2 12h2m2-4v8m3-12v16m3-14v12m3-10v8m3-13v18m3-12v6"/></>
 };
 return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{shapes[kind]}</svg>;
}
function HeaderWave(){
 return <svg className="fc-campaign-wave" viewBox="0 0 490 125" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="fc-wave" x1="0" x2="1"><stop stopColor="#75cafa" stopOpacity=".15"/><stop offset=".65" stopColor="#1d9fe8"/><stop offset="1" stopColor="#2dd8f1" stopOpacity=".45"/></linearGradient></defs>{Array.from({length:47},(_,i)=>{const h=7+Math.abs(Math.sin(i*.44)*Math.cos(i*.19))*(i>9&&i<37?87:30);return <rect key={i} x={i*10+2} y={62-h/2} rx="3" width="4.2" height={h} fill="url(#fc-wave)"/>;})}</svg>;
}
function EmptyArt(){
 return <svg className="fc-empty-art" viewBox="0 0 480 190" role="img" aria-label="Blue megaphone illustration"><defs><linearGradient id="fc-horn" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#38d9ff"/><stop offset=".48" stopColor="#087edf"/><stop offset="1" stopColor="#153eaf"/></linearGradient><linearGradient id="fc-base" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d7f1ff"/><stop offset="1" stopColor="#eff7ff"/></linearGradient><filter id="fc-shadow" x="-40%" y="-70%" width="180%" height="240%"><feGaussianBlur stdDeviation="9"/></filter></defs>
 <ellipse cx="246" cy="165" rx="169" ry="17" fill="#9ccff1" opacity=".22" filter="url(#fc-shadow)"/>
 <path d="M110 148 235 113 376 150 250 185Z" fill="url(#fc-base)" stroke="#cce9fa" strokeWidth="2"/>
 <path d="M151 137 242 113 337 141 247 167Z" fill="#fff" stroke="#e4f3fd"/>
 <g transform="translate(180 27) rotate(-13 67 73)"><path d="M65 97 90 147l-29 4-30-58Z" fill="#1762c9"/><path d="M47 88 70 137l-15 3-29-52Z" fill="#20a4f2"/><path d="M36 62 131 21v98L36 91Z" fill="url(#fc-horn)" stroke="#0946b5" strokeWidth="3"/><ellipse cx="130" cy="70" rx="27" ry="55" fill="#0757bf" stroke="#29d9ff" strokeWidth="5"/><ellipse cx="130" cy="70" rx="16" ry="43" fill="#139af0"/><path d="M24 62h21v28H24q-17-14 0-28Z" fill="#0e65d0" stroke="#1dccff" strokeWidth="2"/></g>
 <g fill="none" stroke="#2aa9ed" strokeWidth="5" strokeLinecap="round"><path d="M96 71v20m11-35v47m11-24v13m11-44v64m11-37v20"/><path d="M367 58l10-8m-1 31 15 1m-30-42 2-13"/></g>
 <g fill="#147bd7"><circle cx="77" cy="111" r="4"/><circle cx="383" cy="116" r="4"/><path d="m68 30 4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" opacity=".6"/><path d="m402 27 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" opacity=".45"/></g>
 </svg>;
}
function CountsCard({kind,label,value}:{kind:"all"|"draft"|"pending";label:string;value:number}){
 return <div className={`fc-count-card fc-count-${kind}`}><span className="fc-count-icon"><CampaignIcon kind={kind}/></span><span className="fc-count-content"><span>{label}</span><strong>{value}</strong></span></div>;
}
function normalizeDate(input?:string){return input&&/^\d{4}-\d{2}-\d{2}$/.test(input)?input:"";}
export default async function Campaigns({searchParams}:{searchParams?:Promise<Filters>}={}){
 const {supabase,membership,user,memberships}=await requireMembership();if(!membership)return null;
 const {data,error}=await supabase.from("campaigns").select("id,name,status,created_at,approved_at,dealership_id").eq("dealership_id",membership.dealership_id).order("created_at",{ascending:false}).limit(100);
 if(error)throw new Error("Could not read campaigns.");
 const campaigns=(data??[]) as Campaign[];
 const dealershipName=membership.dealerships?.name??"Assigned dealership";
 const params=await (searchParams??Promise.resolve({} as Filters));
 const requested=typeof params.view==="string"&&/^[a-f0-9-]{36}$/i.test(params.view)?params.view:"";
 if(requested&&!campaigns.some(c=>c.id===requested)){const {data:extra,error:extraError}=await supabase.from("campaigns").select("id,name,status,created_at,approved_at,dealership_id").eq("dealership_id",membership.dealership_id).eq("id",requested).maybeSingle();if(extraError)throw new Error("Could not read campaign.");if(extra)campaigns.unshift(extra as Campaign); }
 const formatDate=(value:string)=>new Date(value).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric",timeZone:"Asia/Kolkata"});
 const total=campaigns.length,drafts=campaigns.filter(c=>c.status==="DRAFT").length,pending=campaigns.filter(c=>c.status==="PENDING_MANAGER_APPROVAL").length;
 const filters=params;const q=(filters.q??"").trim().slice(0,120),status=filters.status??"",from=normalizeDate(filters.from),to=normalizeDate(filters.to);
 const statuses=["DRAFT","PENDING_MANAGER_APPROVAL","APPROVED","REJECTED","ACTIVE","PAUSED","COMPLETED"];
 const selectedStatus=statuses.includes(status)?status:"";
 const viewId=typeof filters.view==="string"&&/^[a-f0-9-]{36}$/i.test(filters.view)?filters.view:"";
 const shown=campaigns.filter(c=>(!q||c.name.toLowerCase().includes(q.toLowerCase())||c.id.toLowerCase().includes(q.toLowerCase())||dealershipName.toLowerCase().includes(q.toLowerCase()))&&(!selectedStatus||c.status===selectedStatus)&&(!from||c.created_at.slice(0,10)>=from)&&(!to||c.created_at.slice(0,10)<=to));
 const permitted=canCreateCampaign(membership.role);
 const canOperate=isItSuperUser(user.id,user.email??"",memberships.some(m=>m.role==="super_admin")?"super_admin":"");
 const itUser=isItSuperUser(user.id,user.email??"",memberships.some(m=>m.role==="super_admin")?"super_admin":"");
 const filtered=!!(q||selectedStatus||from||to);
 return <div className="fc-campaign-page">
  <header className="fc-campaign-hero">
   <div className="fc-hero-copy"><h1>Campaigns</h1></div>
   <HeaderWave/>
   <div className="fc-hero-actions">{itUser&&<Link href="/settings/voice-profiles" className="fc-voice-button"><CampaignIcon kind="voice"/> Voice Agent Defaults</Link>}{permitted&&<Link href="/campaigns/new" className="fc-primary-button"><span>＋</span> New Campaign</Link>}</div>
  </header>
  <div className="fc-campaign-stats"><CountsCard kind="all" label="Total Campaigns" value={total}/><CountsCard kind="draft" label="Drafts" value={drafts}/><CountsCard kind="pending" label="Awaiting Approval" value={pending}/></div>
  <section className="fc-campaign-list" aria-label="All campaigns">
   <div className="fc-list-toolbar"><h2><span className="fc-grid-icon"><CampaignIcon kind="grid"/></span> All Campaigns</h2>
    <AutoCampaignFilters>
     <label className="fc-search"><CampaignIcon kind="search"/><input type="search" name="q" aria-label="Search campaigns" placeholder="Search campaigns..." defaultValue={q}/></label>
     <label className="fc-status"><CampaignIcon kind="filter"/><select name="status" aria-label="Filter by status" defaultValue={selectedStatus}><option value="">All Status</option>{statuses.map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></label>
     <details className="fc-date-details"><summary><CampaignIcon kind="calendar"/> {from||to?"Date Range Set":"Date Range"}</summary><div className="fc-date-panel"><label>From<input name="from" type="date" defaultValue={from}/></label><label>To<input name="to" type="date" defaultValue={to}/></label></div></details>
    </AutoCampaignFilters>
   </div>
   {shown.length?<div className="fc-tablewrap"><table className="crm-table fc-full-campaign-table"><colgroup><col/><col/><col/><col/><col/></colgroup><thead><tr><th>Campaign</th><th>Dealership</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>{shown.map(c=><tr key={c.id}><td><strong>{c.name}</strong><div className="fc-row-id">#{c.id.slice(0,8)}</div></td><td>{dealershipName}</td><td><span className={`status-pill ${c.status==="APPROVED"?"approved":c.status==="REJECTED"?"rejected":c.status==="PENDING_MANAGER_APPROVAL"?"pending":""}`}>{c.status.replaceAll("_"," ")}</span></td><td>{new Date(c.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</td><td>{canOperate?<div className="fc-row-actions"><Link className="fc-review-start" href={"/campaigns/"+c.id+"/outbound"}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M9 12l3 3 7-8M19 12v7H5V5h10"/></svg> Review / Start <span aria-hidden="true">→</span></Link></div>:<CampaignDetailsPopup name={c.name} dealership={membership.dealerships?.name??"Assigned dealership"} status={c.status} created={formatDate(c.created_at)} approved={c.approved_at?formatDate(c.approved_at):"Not approved"} autoOpen={viewId===c.id}/>}</td></tr>)}</tbody></table><p className="fc-list-count">Showing {shown.length} of the latest {total} campaigns</p></div>:
   <div className="fc-campaign-empty"><EmptyArt/><h3>{filtered?"No matching campaigns":"Start your first campaign"}</h3>{filtered&&<p>Try another search, status, or date range.</p>}{!filtered&&permitted?<Link href="/campaigns/new" className="fc-primary-button">＋ Create Campaign <span aria-hidden="true">→</span></Link>:null}</div>}
  </section>
 </div>;
}
