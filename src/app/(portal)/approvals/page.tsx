import {requireMembership,canApprove} from "@/lib/auth";
import {ApprovalsDirectory,type ApprovalRow} from "./approvals-directory";
const PAGE_SIZE=10;
export default async function Approvals({searchParams}:{searchParams:Promise<{tab?:string;q?:string;range?:string;page?:string}>}){
 const {supabase,membership}=await requireMembership();if(!membership)return null;
 const params=await searchParams;
 const id=membership.dealership_id;
 const tab=["approved","rejected"].includes(String(params.tab))?String(params.tab):"pending";
 const status=tab==="approved"?"APPROVED":tab==="rejected"?"REJECTED":"PENDING_MANAGER_APPROVAL";
 const query=String(params.q??"").trim().replace(/[%,()"'\\]/g,"").slice(0,80);
 const range=["7","30","90"].includes(String(params.range))?String(params.range):"all";
 const requested=Math.max(1,Math.min(100000,parseInt(String(params.page??"1"),10)||1));
 const dayStart=new Date(new Date().toLocaleString("en-US",{timeZone:"Asia/Kolkata"}));
 dayStart.setHours(0,0,0,0);
 const now=new Date();
 const indiaDate=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
 const todayStart=new Date(indiaDate+"T00:00:00+05:30").toISOString();
 const tomorrowStart=new Date(new Date(indiaDate+"T00:00:00+05:30").getTime()+86400000).toISOString();
 const base=(target?:string)=>{let q=supabase.from("campaigns").select("id",{count:"exact",head:true}).eq("dealership_id",id);if(target)q=q.eq("status",target);return q;};
 const [pending,approved,rejected,approvedToday,rejectedToday]=await Promise.all([
  base("PENDING_MANAGER_APPROVAL"),base("APPROVED"),base("REJECTED"),
  base("APPROVED").gte("approved_at",todayStart).lt("approved_at",tomorrowStart),
  base("REJECTED").gte("approved_at",todayStart).lt("approved_at",tomorrowStart)
 ]);
 if([pending,approved,rejected,approvedToday,rejectedToday].some(x=>x.error))throw new Error("Unable to load approval totals.");
 const counts={pending:pending.count??0,approved:approved.count??0,rejected:rejected.count??0,approvedToday:approvedToday.count??0,rejectedToday:rejectedToday.count??0,total:(pending.count??0)+(approved.count??0)+(rejected.count??0)};
 const makeQuery=()=>{let q=supabase.from("campaigns").select("id,name,status,created_at,approved_at",{count:"exact"}).eq("dealership_id",id).eq("status",status);if(query)q=q.ilike("name",`%${query}%`);if(range!=="all"){const since=new Date();since.setUTCDate(since.getUTCDate()-Number(range));q=q.gte("created_at",since.toISOString());}return q;};
 const summary=await makeQuery().range(0,0);
 if(summary.error)throw new Error("Unable to load approval requests.");
 const total=summary.count??0;
 const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
 const page=Math.min(requested,pages);
 const {data,error}=await makeQuery().order("created_at",{ascending:false}).range((page-1)*PAGE_SIZE,page*PAGE_SIZE-1);
 if(error)throw new Error("Unable to load approval requests.");
 const rows:ApprovalRow[]=(data??[]).map(c=>({...c}));
 if(rows.length){
  const {data:configs,error:configError}=await supabase.from("campaign_draft_configs").select("campaign_id,configuration").eq("dealership_id",id).in("campaign_id",rows.map(c=>c.id));
  if(configError)throw new Error("Unable to load draft campaign details.");
  const {data:batches,error:batchError}=await supabase.from("campaign_recipient_batches").select("campaign_id,eligible_records").eq("dealership_id",id).in("campaign_id",rows.map(c=>c.id));
  if(batchError)throw new Error("Unable to verify staged recipient batches.");
  const map=new Map((configs??[]).map(c=>[c.campaign_id,c.configuration as {agent_label?:string;outgoing_number_label?:string;recipient_preview?:{preview_only?:boolean;total_rows?:number}}]));
  const countsByCampaign=new Map((batches??[]).map(c=>[c.campaign_id,c.eligible_records]));
  for(const row of rows){const config=map.get(row.id);row.agent_label=config?.agent_label??"";row.outgoing_label=config?.outgoing_number_label??"";row.recipient_count=countsByCampaign.get(row.id)??null;row.preview_only=row.recipient_count===null?config?.recipient_preview?.preview_only??true:false;}
 }
 return <ApprovalsDirectory rows={rows} dealershipName={membership.dealerships?.name??"Dealership"} dealershipId={id} canApprove={canApprove(membership.role)} counts={counts} tab={tab} query={query} range={range} page={page} pages={pages} totalShown={total} pageSize={PAGE_SIZE}/>;
}
