import {EmptyState} from "@/components/empty-state";
import Link from "next/link";
import {agentSnapshot} from "@/lib/sarvam/voice-discovery-snapshot";
import {campaignStatuses,campaignDisplayStatus} from "@/lib/campaign-display-status";
import {requireMembership,canCreateCampaign} from "@/lib/auth";
import {isItSuperUser} from "@/lib/it-access";
import "./campaigns-reference.css";
import {CampaignDetailsPopup} from "./campaign-details-popup";
import {CampaignActionToast} from "./campaign-action-toast";
import {AutoCampaignFilters} from "./auto-campaign-filters";
import {CampaignArtwork} from "./campaign-artwork";

type Filters={dealership?:string;q?:string;status?:string;from?:string;to?:string;view?:string};
type Campaign={historical_read_only:boolean;dealership_id:string;id:string;name:string;status:string;created_at:string;approved_at:string|null};

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
function CountsCard({kind,label,value}:{kind:"all"|"draft"|"pending"|"hold"|"reject";label:string;value:number}){
 const icon=<CampaignArtwork kind={kind==="draft"?"ongoing":kind}/>;
 return <div className={`fc-count-card fc-count-${kind}`}><span className="fc-count-icon">{icon}</span><span className="fc-count-content"><span>{label}</span><strong>{value}</strong></span></div>;
}
function normalizeDate(input?:string){return input&&/^\d{4}-\d{2}-\d{2}$/.test(input)?input:"";}
export default async function Campaigns({searchParams}:{searchParams?:Promise<Filters>}={}){
 const {supabase,membership,user,memberships}=await requireMembership();if(!membership)return null;
 const itUser=isItSuperUser(user.id,user.email??"",memberships.some(m=>m.role==="super_admin")?"super_admin":"");
 const params=await (searchParams??Promise.resolve({} as Filters));
 const dealerOptions:{id:string;name:string}[]=[];
 if(itUser){for(let offset=0;;offset+=500){const {data,error}=await supabase.from("dealerships").select("id,name").order("id").range(offset,offset+499);if(error)throw Error("Could not load dealerships.");dealerOptions.push(...(data??[]));if((data??[]).length<500)break;}dealerOptions.sort((a,b)=>a.name.localeCompare(b.name));}
 const selectedDealer=itUser&&dealerOptions.some(d=>d.id===params.dealership)?params.dealership!:"";
 const dealerNames=new Map(dealerOptions.map(d=>[d.id,d.name]));
 const dealershipName=membership.dealerships?.name??"Assigned dealership";
 const nameFor=(id:string)=>itUser?(dealerNames.get(id)??"Dealership unavailable"):dealershipName;
 const scope=itUser?selectedDealer:membership.dealership_id;
 const campaigns:Campaign[]=[];
 for(let offset=0;;offset+=500){
  let query=supabase.from("campaigns").select("id,name,status,created_at,approved_at,dealership_id,historical_read_only");
  if(scope)query=query.eq("dealership_id",scope);
  const {data,error}=await query.order("created_at",{ascending:false}).order("id").range(offset,offset+499);
  if(error)throw Error("Could not read campaigns.");
  campaigns.push(...(data??[]) as Campaign[]);if((data??[]).length<500)break;
 }
 const formatDate=(value:string)=>new Date(value).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric",timeZone:"Asia/Kolkata"});
 const launches:{campaign_id:string;provider_status:string|null;state:string;sarvam_campaign_id:string|null}[]=[];
 for(let offset=0;;offset+=500){
  let query=supabase.from("voice_campaign_launches").select("campaign_id,provider_status,state,sarvam_campaign_id");
  if(scope)query=query.eq("dealership_id",scope);
  const {data,error}=await query.order("campaign_id").range(offset,offset+499);
  if(error)throw Error("Could not load campaign lifecycle status.");
  launches.push(...(data??[]));if((data??[]).length<500)break;
 }
 type Setup={agent_label?:string;agent_version_label?:string;schedule?:{start_mode?:string;start?:string;end?:string;from?:string;to?:string}};
 const configs=new Map<string,Setup>(),batches=new Map<string,number>(),remoteIds=new Map<string,string>();
 const attempts=new Map<string,Set<string>>();
 const ownerByCampaign=new Map(campaigns.map(c=>[c.id,c.dealership_id]));
 const launchByCampaign=new Map(launches.map(l=>[l.campaign_id,l]));
 for(let offset=0;;offset+=500){
  let q=supabase.from("campaign_draft_configs").select("campaign_id,dealership_id,configuration");if(scope)q=q.eq("dealership_id",scope);
  const {data,error}=await q.order("campaign_id").range(offset,offset+499);if(error)throw Error("Could not load campaign schedules.");
  for(const x of data??[])if(ownerByCampaign.get(x.campaign_id)===x.dealership_id)configs.set(x.campaign_id,x.configuration as Setup);
  if((data??[]).length<500)break;
 }
 for(let offset=0;;offset+=500){
  let q=supabase.from("campaign_recipient_batches").select("campaign_id,dealership_id,eligible_records");if(scope)q=q.eq("dealership_id",scope);
  const {data,error}=await q.order("campaign_id").range(offset,offset+499);if(error)throw Error("Could not load campaign recipient counts.");
  for(const x of data??[])if(ownerByCampaign.get(x.campaign_id)===x.dealership_id)batches.set(x.campaign_id,x.eligible_records);
  if((data??[]).length<500)break;
 }
 for(let offset=0;;offset+=500){
  let q=supabase.from("voice_campaign_links").select("campaign_id,dealership_id,sarvam_campaign_id,agent_id");if(scope)q=q.eq("dealership_id",scope);
  const {data,error}=await q.order("id").range(offset,offset+499);if(error)throw Error("Could not load campaign references.");
  for(const x of data??[])if(ownerByCampaign.get(x.campaign_id)===x.dealership_id){remoteIds.set(x.dealership_id+":"+x.sarvam_campaign_id,x.campaign_id);if(!configs.has(x.campaign_id))configs.set(x.campaign_id,{agent_label:x.agent_id});}
  if((data??[]).length<500)break;
 }
 for(let offset=0;;offset+=500){
  let q=supabase.from("voice_call_records").select("dealership_id,sarvam_campaign_id,dialed_number,ended_at,status");if(scope)q=q.eq("dealership_id",scope);
  const {data,error}=await q.order("id").range(offset,offset+499);if(error)throw Error("Could not load recorded campaign progress.");
  for(const x of data??[]){const id=remoteIds.get(x.dealership_id+":"+x.sarvam_campaign_id);if(id&&x.dialed_number&&x.ended_at){const set=attempts.get(id)??new Set<string>();set.add(x.dialed_number);attempts.set(id,set);}}
  if((data??[]).length<500)break;
 }
 const dateTime=(value:string|null|undefined)=>{if(!value||!Number.isFinite(Date.parse(value)))return <span>—</span>;const d=new Date(value);return <time className="fc-created-datetime" dateTime={value} title="Indian Standard Time"><span>{formatDate(value)}</span><span className="fc-created-time">{d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true,timeZone:"Asia/Kolkata"})}</span></time>;};
 const scheduled=(day?:string,hour?:string)=>day&&hour&&/^\\d{4}-\\d{2}-\\d{2}$/.test(day)&&/^\\d{2}:\\d{2}$/.test(hour)?day+"T"+hour+":00+05:30":null;
 const istDay=(v:string)=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(v?new Date(v):new Date());
 const byCampaign=new Map((launches??[]).map(l=>[l.campaign_id,l.provider_status]));
 const display=(c:Campaign)=>campaignDisplayStatus(c.status,c.historical_read_only?"completed":byCampaign.get(c.id));
 const statusCounts=new Map(campaignStatuses.map(status=>[status,campaigns.filter(c=>display(c)===status).length]));
 const total=campaigns.length,drafts=statusCounts.get("Ongoing")??0,pending=statusCounts.get("Pending")??0,hold=statusCounts.get("Hold")??0,rejected=statusCounts.get("Reject")??0;
 const filters=params;const q=(filters.q??"").trim().slice(0,120),status=filters.status??"",from=normalizeDate(filters.from),to=normalizeDate(filters.to);
 const statuses:readonly string[]=campaignStatuses;
 const selectedStatus=statuses.includes(status)?status:"";
 const viewId=typeof filters.view==="string"&&/^[a-f0-9-]{36}$/i.test(filters.view)?filters.view:"";
 const shown=campaigns.filter(c=>(!q||c.name.toLowerCase().includes(q.toLowerCase())||c.id.toLowerCase().includes(q.toLowerCase())||(itUser&&nameFor(c.dealership_id).toLowerCase().includes(q.toLowerCase())))&&(!selectedStatus||display(c)===selectedStatus)&&(!from||istDay(c.created_at)>=from)&&(!to||istDay(c.created_at)<=to));
 const permitted=canCreateCampaign(membership.role);
 const canOperate=itUser;
 const filtered=!!(q||selectedStatus||from||to||selectedDealer);
 return <div className="fc-campaign-page"><CampaignActionToast/>
  <header className="fc-campaign-hero">
   <div className="fc-hero-copy"><h1><CampaignArtwork kind="hero" className="fc-campaign-hero-art"/> <span>Campaigns</span></h1></div>
   <HeaderWave/>
   <div className="fc-hero-actions">{itUser&&<Link href="/settings/voice-profiles" className="fc-voice-button"><CampaignIcon kind="voice"/> Voice Agent Defaults</Link>}{permitted&&<Link href="/campaigns/new" className="fc-primary-button"><span>＋</span> New Campaign</Link>}</div>
  </header>
  <div className="fc-campaign-stats"><CountsCard kind="all" label="Total Campaigns" value={total}/><CountsCard kind="draft" label="Ongoing" value={drafts}/><CountsCard kind="pending" label="Pending" value={pending}/><CountsCard kind="hold" label="Hold" value={hold}/><CountsCard kind="reject" label="Rejected" value={rejected}/></div>
  <section className="fc-campaign-list" aria-label="All campaigns">
   <div className="fc-list-toolbar"><h2><span className="fc-grid-icon"><CampaignIcon kind="grid"/></span> All Campaigns</h2>
    <AutoCampaignFilters>
     <label className="fc-search"><CampaignIcon kind="search"/><input type="search" name="q" aria-label="Search campaigns" placeholder="Search campaigns..." defaultValue={q}/></label>
     <div className="fc-filter-right">
     {itUser&&<label className="fc-status"><select name="dealership" aria-label="Filter by dealership" defaultValue={selectedDealer}><option value="">All Dealerships</option>{dealerOptions.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>}
     <label className="fc-status"><CampaignIcon kind="filter"/><select name="status" aria-label="Filter by status" defaultValue={selectedStatus}><option value="">All Status</option>{statuses.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
     <details className="fc-date-details"><summary><CampaignIcon kind="calendar"/> {from||to?"Date Range Set":"Date Range"}</summary><div className="fc-date-panel"><label>From<input name="from" type="date" defaultValue={from}/></label><label>To<input name="to" type="date" defaultValue={to}/></label></div></details>
     </div>
    </AutoCampaignFilters>
   </div>
   {shown.length?<div className="fc-tablewrap"><table className={"crm-table fc-full-campaign-table"+(!itUser?" fc-dealer-campaign-table":"")}><thead><tr><th>Campaign</th>{itUser&&<th>Dealership</th>}<th>AI Agent</th><th>Status</th><th>Customers</th><th>Progress</th><th>Created At (IST)</th><th>Start Date &amp; Time</th><th>End Date &amp; Time</th><th>Actions</th></tr></thead><tbody>{shown.map(c=>{const config=configs.get(c.id),schedule=config?.schedule,launch=launchByCampaign.get(c.id),needsReview=launch?.state==="needs_reconciliation",count=batches.get(c.id),recorded=attempts.get(c.id)?.size??0,percent=count&&recorded<=count?Math.round(recorded/count*100):null,agent=agentSnapshot.find(a=>a.id===config?.agent_label)?.name??config?.agent_label;const action=needsReview?"Resolve Issue":display(c)==="Ongoing"?"View Progress":display(c)==="Complete"?"View Details":display(c)==="Hold"?"Review / Resume":display(c)==="Reject"?"View Details":"Review / Start";return <tr key={c.id}><td><strong>{c.name}</strong><div className="fc-row-id">#{c.id.slice(0,8)}</div></td>{itUser&&<td>{nameFor(c.dealership_id)}</td>}<td><strong>{agent??"—"}</strong><div className="fc-row-id">{config?.agent_version_label?"Version "+config.agent_version_label:"—"}</div></td><td><span className={needsReview?"fc-needs-review":`status-pill campaign-status-badge campaign-status-${display(c).toLowerCase()}`}>{needsReview?"Needs Review":display(c)}</span></td><td>{count??"—"}</td><td>{percent===null?<span>—</span>:<div className="fc-progress" title="Unique numbers with recorded ended calls / eligible recipients; not provider completion"><span>{recorded}/{count} · {percent}%</span><progress max={100} value={percent}/><small>Recorded calls</small></div>}</td><td>{dateTime(c.created_at)}</td><td>{schedule?.start_mode==="now"?<span>On confirmed launch</span>:dateTime(scheduled(schedule?.start,schedule?.from))}</td><td>{dateTime(scheduled(schedule?.end,schedule?.to))}</td><td>{c.historical_read_only?<div className="fc-row-actions"><Link className="fc-review-start" href="/reports">View Reports</Link></div>:canOperate?<div className="fc-row-actions"><Link className="fc-review-start" href={"/campaigns/"+c.id+"/outbound"}>{needsReview?"View Issue":action}</Link></div>:<CampaignDetailsPopup name={c.name} dealership={membership.dealerships?.name??"Assigned dealership"} status={display(c)} created={formatDate(c.created_at)} approved={c.approved_at?formatDate(c.approved_at):"Not approved"} autoOpen={viewId===c.id}/>}</td></tr>})}</tbody></table><p className="fc-list-count">Showing {shown.length} of {total} campaigns</p></div>:
   <EmptyState kind="campaigns" title={filtered?"No matching campaigns":"No campaigns yet"} description={filtered?"Try another search, status, or date range.":"Your campaigns will appear here once created."} action={filtered?<Link href="/campaigns">Clear filters</Link>:permitted?<Link href="/campaigns/new">Create Campaign</Link>:undefined}/>}
  </section>
 </div>;
}
