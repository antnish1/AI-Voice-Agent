import Link from "next/link";
import {campaignDisplayStatus} from "@/lib/campaign-display-status";
import {CountUp} from "@/components/motion/count-up";
import {CampaignActivityChart} from "@/components/motion/campaign-activity-chart";
import {requireMembership,canCreateCampaign} from "@/lib/auth";
import "./dashboard-crisp.css";

type Campaign={id:string;name:string;status:string;created_at:string};
type ImportBatch={id:string;filename:string;imported_rows:number;rejected_rows:number;created_at:string};
const localDate=(date:string|Date)=>new Date(date).toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"});
const formatted=(date:string)=>new Date(date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric",timeZone:"Asia/Kolkata"});
export default async function Dashboard({searchParams}:{searchParams:Promise<{days?:string}>}){
 const {supabase,user,membership}=await requireMembership();if(!membership)return null;
 const canCreate=canCreateCampaign(membership.role);
 const profileName=typeof user.user_metadata?.display_name==="string"?user.user_metadata.display_name.trim():"";
 const fallbackName=(user.email??"").split("@")[0]?.trim()||"there";
 const userName=(profileName||fallbackName).slice(0,80);
 const id=membership.dealership_id;
 const {days:rangeInput}=await searchParams;
 const days=rangeInput==="30"?30:rangeInput==="14"?14:7;
 const start=new Date();start.setDate(start.getDate()-days+1);start.setHours(0,0,0,0);
 const [customerCount,campaignCount,approvalCount,approvedCount,recentCampaigns,periodCampaigns,recentImports,callCount,answeredCount,activeCount,providerCount,recentLaunches]=await Promise.all([
  supabase.from("customers").select("id",{count:"exact",head:true}).eq("dealership_id",id),
  supabase.from("campaigns").select("id",{count:"exact",head:true}).eq("dealership_id",id),
  supabase.from("campaigns").select("id",{count:"exact",head:true}).eq("dealership_id",id).in("status",["DRAFT","PENDING","PENDING_MANAGER_APPROVAL"]),
  supabase.from("campaigns").select("id",{count:"exact",head:true}).eq("dealership_id",id).eq("status","APPROVED"),
  supabase.from("campaigns").select("id,name,status,created_at").eq("dealership_id",id).order("created_at",{ascending:false}).limit(7),
  supabase.from("campaigns").select("id,created_at").eq("dealership_id",id).gte("created_at",start.toISOString()).order("created_at",{ascending:false}).limit(1000),
  supabase.from("customer_import_batches").select("id,filename,imported_rows,rejected_rows,created_at").eq("dealership_id",id).order("created_at",{ascending:false}).limit(6),
  supabase.from("voice_call_records").select("id",{count:"exact",head:true}).eq("dealership_id",id),
  supabase.from("voice_call_records").select("id",{count:"exact",head:true}).eq("dealership_id",id).eq("status","answered"),
  supabase.from("voice_campaign_launches").select("campaign_id",{count:"exact",head:true}).eq("dealership_id",id).in("provider_status",["active","scheduled","in_progress"]),
  supabase.from("voice_campaign_launches").select("campaign_id",{count:"exact",head:true}).eq("dealership_id",id).in("provider_status",["active","scheduled","in_progress","paused","ended","completed","cancelled","canceled"]),
  supabase.from("voice_campaign_launches").select("campaign_id,provider_status").eq("dealership_id",id)
 ]);
 if([customerCount,campaignCount,approvalCount,approvedCount,recentCampaigns,periodCampaigns,recentImports,callCount,answeredCount,activeCount].some(x=>x.error))throw new Error("Could not load dealership dashboard.");
 const recent=(recentCampaigns.data??[]) as Campaign[];
 const launchMap=new Map((recentLaunches.data??[]).map(l=>[l.campaign_id,l.provider_status]));
 const display=(c:Campaign)=>campaignDisplayStatus(c.status,launchMap.get(c.id));
 const imports=(recentImports.data??[]) as ImportBatch[];
 const daily=Array.from({length:days},(_,i)=>{const date=new Date(start);date.setDate(start.getDate()+i);const key=localDate(date);return {key,label:date.toLocaleDateString("en-IN",{month:"short",day:"numeric",timeZone:"Asia/Kolkata"}),count:(periodCampaigns.data??[]).filter(c=>localDate(c.created_at)===key).length};});
 const activity=[...recent.map(c=>({key:"c-"+c.id,title:"Campaign · "+display(c),detail:c.name,at:c.created_at,icon:"◫",tone:"campaign-"+display(c).toLowerCase()})),...imports.map(x=>({key:"i-"+x.id,title:"Customer list imported",detail:x.filename+" · "+x.imported_rows+" new",at:x.created_at,icon:"⇧",tone:"blue"}))].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,5);
 const hour=Number(new Intl.DateTimeFormat("en-GB",{hour:"numeric",hour12:false,timeZone:"Asia/Kolkata"}).format(new Date()));
 const greeting=hour<12?"Good Morning":hour<17?"Good Afternoon":"Good Evening";
 const metrics=[{name:"Total Customers",value:String(customerCount.count??0),note:"Dealership records",icon:"♙",tone:"blue"},
 {name:"Total Campaigns",value:String(campaignCount.count??0),note:"All campaign states",icon:"◫",tone:"mint"},
 {name:"Ongoing Campaigns",value:String(activeCount.count??0),note:"Scheduled or active",icon:"▶",tone:"violet"},
 {name:"Pending Campaigns",value:String((approvalCount.count??0)+Math.max(0,(approvedCount.count??0)-(providerCount.count??0))),note:"Waiting to start",icon:"◷",tone:"amber"},
 {name:"Total Calls",value:String(callCount.count??0),note:String(answeredCount.count??0)+" answered",icon:"◕",tone:"blue"}];
 return <div className="ref-dashboard">
 <div className="ref-dashboard-heading"><div><h1>{greeting}, {userName}! <span aria-hidden="true">👋</span></h1></div><div className="ref-dashboard-heading-actions"><span className="ref-today-pill">▣ &nbsp; Today</span>{canCreate&&<Link href="/campaigns/new" className="ref-create-button">＋ &nbsp; Create Campaign</Link>}</div></div>
 <div className="ref-kpi-grid ref-kpi-joined" aria-label="Dashboard key metrics">{metrics.map(m=><article key={m.name} className={"ref-kpi-card tone-"+m.tone}><div className={"ref-kpi-icon tone-"+m.tone}>{m.icon}</div><div><span className="ref-kpi-label">{m.name}</span><CountUp className="ref-kpi-value" value={m.value}/><small className="ref-kpi-note">{m.note}</small></div></article>)}</div>
 <div className="ref-dashboard-columns">
 <div className="ref-dashboard-left">
  <section className="ref-dashboard-panel ref-performance"><div className="ref-panel-header"><div><h2><span className="ref-heading-icon">▥</span> Campaign Performance</h2></div><div className="ref-date-filters"><span className="ref-selected-period">Last {days} days</span><div className="ref-range-links"><Link aria-current={days===7?"true":undefined} href="/dashboard?days=7">7D</Link><Link aria-current={days===14?"true":undefined} href="/dashboard?days=14">14D</Link><Link aria-current={days===30?"true":undefined} href="/dashboard?days=30">30D</Link></div></div></div>
   <CampaignActivityChart daily={daily} days={days}/>
   <div className="ref-chart-footer"><span><i/> Campaigns created</span><span>{(periodCampaigns.data??[]).length} records in selected period</span></div>
   {(periodCampaigns.data??[]).length===0&&<p className="ref-chart-empty">No campaigns created in this period. Charts will update with real data.</p>}
  </section>
  <section className="ref-dashboard-panel ref-recent-campaigns"><div className="ref-panel-header"><h2><span className="ref-heading-icon">◫</span> Recent Campaigns</h2><Link href="/campaigns">View All</Link></div>
   <div className="tablewrap"><table className="ref-campaign-table"><thead><tr><th>Campaign Name</th><th>Agent</th><th>Type</th><th>Contacts</th><th>Status</th><th>Calls</th><th>Success Rate</th><th>Actions</th></tr></thead><tbody>{recent.length?recent.map(c=><tr key={c.id}><td><strong>{c.name}</strong><small>{formatted(c.created_at)}</small></td><td>—</td><td>Planned</td><td>—</td><td><span className={"ref-campaign-status campaign-status-badge campaign-status-"+display(c).toLowerCase()}>{display(c)}</span></td><td>—</td><td>—</td><td><Link href="/campaigns" aria-label={"View campaign "+c.name}>•••</Link></td></tr>):<tr><td colSpan={8} className="ref-table-empty">No campaigns yet. Create a campaign to see it here.</td></tr>}</tbody></table></div>
  </section>
 </div>
 <div className="ref-dashboard-right">
  <section className="ref-dashboard-panel ref-activity"><div className="ref-panel-header"><h2><span className="ref-heading-icon">◷</span> Recent Activity</h2><Link href="/campaigns">View All</Link></div><div className="ref-activity-list">{activity.length?activity.map(item=><div className="ref-activity-item" key={item.key}><span className={"ref-activity-icon tone-"+item.tone+(item.tone.startsWith("campaign-")?" campaign-status-"+item.tone.slice(9):"")}>{item.icon}</span><div><strong>{item.title}</strong><p>{item.detail}</p></div><time dateTime={item.at}>{formatted(item.at)}</time></div>):<div className="ref-activity-empty">No recent campaign or import activity.</div>}</div></section>
 </div>
 </div>
 </div>;
}