import Link from "next/link";
import {campaignDisplayStatus} from "@/lib/campaign-display-status";
import {CountUp} from "@/components/motion/count-up";
import {CampaignActivityChart} from "@/components/motion/campaign-activity-chart";
import {CampaignPeriodFilter} from "@/components/motion/campaign-period-filter";
import {requireMembership,canCreateCampaign} from "@/lib/auth";
import "./dashboard-crisp.css";

type Campaign={id:string;name:string;status:string;created_at:string};
type ImportBatch={id:string;filename:string;imported_rows:number;rejected_rows:number;created_at:string};
const localDate=(date:string|Date)=>new Date(date).toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"});
const formatted=(date:string)=>new Date(date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric",timeZone:"Asia/Kolkata"});
export default async function Dashboard({searchParams}:{searchParams:Promise<{days?:string;period?:string;from?:string;to?:string}>}){
 const {supabase,user,membership}=await requireMembership();if(!membership)return null;
 const canCreate=canCreateCampaign(membership.role);
 const profileName=typeof user.user_metadata?.display_name==="string"?user.user_metadata.display_name.trim():"";
 const fallbackName=(user.email??"").split("@")[0]?.trim()||"there";
 const userName=(profileName||fallbackName).slice(0,80);
 const id=membership.dealership_id;
 const params=await searchParams;
 const today=localDate(new Date());
 const validDate=(v?:string):v is string=>!!v&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+"T00:00:00Z"))&&new Date(v+"T00:00:00Z").toISOString().slice(0,10)===v;
 const addDays=(key:string,n:number)=>new Date(Date.parse(key+"T00:00:00Z")+n*86400000).toISOString().slice(0,10);
 const period=["all","today","7","mtd","custom"].includes(params.period??"")?params.period!:params.days==="7"?"7":"all";
 const customValid=validDate(params.from)&&validDate(params.to)&&params.from<=params.to&&params.to<=today;
 const from=period==="today"?today:period==="7"?addDays(today,-6):period==="mtd"?today.slice(0,7)+"-01":period==="custom"&&customValid?params.from!:null;
 const to=period==="custom"&&customValid?params.to!:today;
 const fetchPeriod=async()=>{
  if(period==="custom"&&!customValid)return {data:[] as {id:string;created_at:string}[],error:null};
  const rows:{id:string;created_at:string}[]=[];
  for(let offset=0;;offset+=500){
   let q=supabase.from("campaigns").select("id,created_at").eq("dealership_id",id).lt("created_at",new Date(addDays(to,1)+"T00:00:00+05:30").toISOString());
   if(from)q=q.gte("created_at",new Date(from+"T00:00:00+05:30").toISOString());
   const result=await q.order("created_at",{ascending:true}).order("id",{ascending:true}).range(offset,offset+499);
   if(result.error)return {data:rows,error:result.error};
   rows.push(...(result.data??[]));
   if((result.data??[]).length<500)return {data:rows,error:null};
  }
 };
 const [customerCount,campaignCount,approvalCount,approvedCount,recentCampaigns,periodCampaigns,recentImports,callCount,answeredCount,activeCount,providerCount,recentLaunches]=await Promise.all([
  supabase.from("customers").select("id",{count:"exact",head:true}).eq("dealership_id",id),
  supabase.from("campaigns").select("id",{count:"exact",head:true}).eq("dealership_id",id),
  supabase.from("campaigns").select("id",{count:"exact",head:true}).eq("dealership_id",id).in("status",["DRAFT","PENDING","PENDING_MANAGER_APPROVAL"]),
  supabase.from("campaigns").select("id",{count:"exact",head:true}).eq("dealership_id",id).eq("status","APPROVED"),
  supabase.from("campaigns").select("id,name,status,created_at").eq("dealership_id",id).order("created_at",{ascending:false}).limit(7),
  fetchPeriod(),
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
 const records=periodCampaigns.data??[];
 const first=from??(records.length?localDate(records[0].created_at):today);
 const days=Math.max(1,Math.round((Date.parse(to+"T00:00:00Z")-Date.parse(first+"T00:00:00Z"))/86400000)+1);
 const bucketSize=Math.max(1,Math.ceil(days/60));
 const counts=new Map<string,number>();
 for(const record of records){const key=localDate(record.created_at);counts.set(key,(counts.get(key)??0)+1);}
 const label=(key:string)=>new Date(key+"T00:00:00Z").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:days>365?"numeric":undefined,timeZone:"UTC"});
 const daily=Array.from({length:Math.ceil(days/bucketSize)},(_,i)=>{
  const key=addDays(first,i*bucketSize),end=addDays(first,Math.min(days-1,(i+1)*bucketSize-1));
  let count=0;for(let j=i*bucketSize;j<Math.min(days,(i+1)*bucketSize);j++)count+=counts.get(addDays(first,j))??0;
  return {key,label:key===end?label(key):label(key)+" – "+label(end),count};
 });
 const activity=[...recent.map(c=>({key:"c-"+c.id,title:"Campaign · "+display(c),detail:c.name,at:c.created_at,icon:"◫",tone:"mint"})),...imports.map(x=>({key:"i-"+x.id,title:"Customer list imported",detail:x.filename+" · "+x.imported_rows+" new",at:x.created_at,icon:"⇧",tone:"blue"}))].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,5);
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
  <section className="ref-dashboard-panel ref-performance"><div className="ref-panel-header"><div><h2><span className="ref-heading-icon">▥</span> Campaign Performance</h2></div><CampaignPeriodFilter period={period} from={params.from??today} to={params.to??today} today={today}/></div>
   <CampaignActivityChart daily={daily} days={days}/>
   <div className="ref-chart-footer"><span><i/> Campaigns created</span><span>{(periodCampaigns.data??[]).length} records in selected period</span></div>
   {period==="custom"&&!customValid&&<p role="alert">Select a valid start and end date up to today (IST).</p>}
   {(periodCampaigns.data??[]).length===0&&<p className="ref-chart-empty">No campaigns created in this period. Charts will update with real data.</p>}
  </section>
  <section className="ref-dashboard-panel ref-recent-campaigns"><div className="ref-panel-header"><h2><span className="ref-heading-icon">◫</span> Recent Campaigns</h2><Link href="/campaigns">View All</Link></div>
   <div className="tablewrap"><table className="ref-campaign-table"><thead><tr><th>Campaign Name</th><th>Agent</th><th>Type</th><th>Contacts</th><th>Status</th><th>Calls</th><th>Success Rate</th><th>Actions</th></tr></thead><tbody>{recent.length?recent.map(c=><tr key={c.id}><td><strong>{c.name}</strong><small>{formatted(c.created_at)}</small></td><td>—</td><td>Planned</td><td>—</td><td><span className={"ref-campaign-status status-"+c.status.toLowerCase()}>{display(c)}</span></td><td>—</td><td>—</td><td><Link href="/campaigns" aria-label={"View campaign "+c.name}>•••</Link></td></tr>):<tr><td colSpan={8} className="ref-table-empty">No campaigns yet. Create a campaign to see it here.</td></tr>}</tbody></table></div>
  </section>
 </div>
 <div className="ref-dashboard-right">
  <section className="ref-dashboard-panel ref-activity"><div className="ref-panel-header"><h2><span className="ref-heading-icon">◷</span> Recent Activity</h2><Link href="/campaigns">View All</Link></div><div className="ref-activity-list">{activity.length?activity.map(item=><div className="ref-activity-item" key={item.key}><span className={"ref-activity-icon tone-"+item.tone}>{item.icon}</span><div><strong>{item.title}</strong><p>{item.detail}</p></div><time dateTime={item.at}>{formatted(item.at)}</time></div>):<div className="ref-activity-empty">No recent campaign or import activity.</div>}</div></section>
 </div>
 </div>
 </div>;
}