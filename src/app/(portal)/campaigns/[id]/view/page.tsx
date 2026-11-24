import Link from "next/link";
import {notFound} from "next/navigation";
import {requireMembership} from "@/lib/auth";
import {isItSuperUser} from "@/lib/it-access";

// Deliberately read-only. All queries are scoped to the signed-in user's
// assigned dealership, never to a dealership ID from the browser.
export default async function ViewCampaign({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const {supabase,user,membership,memberships}=await requireMembership();
 if(!membership)notFound();
 const isAdmin=isItSuperUser(user.id,user.email??"",memberships.some(m=>m.role==="super_admin")?"super_admin":"");
 const scope=membership.dealership_id;
 const {data:campaign,error}=await supabase.from("campaigns")
  .select("id,name,status,created_at,approved_at,dealership_id")
  .eq("id",id).eq("dealership_id",scope).maybeSingle();
 if(error||!campaign)notFound();
 const {data:batch,error:batchError}=await supabase.from("campaign_recipient_batches")
  .select("total_records,eligible_records,excluded_records,cohort_name")
  .eq("campaign_id",id).eq("dealership_id",scope).maybeSingle();
 if(batchError)throw new Error("Could not read campaign recipient summary.");
 const format=(date:string)=>new Date(date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric",timeZone:"Asia/Kolkata"});
 return <div className="fc-campaign-view">
  <header className="page-head"><div><p className="eyebrow">DEALERSHIP CAMPAIGN · VIEW ONLY</p><h1>{campaign.name}</h1>
   <p>Campaign information for your assigned dealership. You cannot modify or launch campaigns.</p></div>
   <Link className="btn-outline small" href="/campaigns">Back to Campaigns</Link></header>
  <section className="crm-panel" style={{maxWidth:920}}>
   <div className="panel-title"><h2>Campaign Details</h2><span className="status-pill">{campaign.status.replaceAll("_"," ")}</span></div>
   <dl style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(185px,1fr))",gap:18,margin:0}}>
    <div><dt className="muted">Campaign name</dt><dd style={{margin:"4px 0 0",fontWeight:700}}>{campaign.name}</dd></div>
    <div><dt className="muted">Dealership</dt><dd style={{margin:"4px 0 0",fontWeight:700}}>{membership.dealerships?.name??"Assigned dealership"}</dd></div>
    <div><dt className="muted">Created</dt><dd style={{margin:"4px 0 0",fontWeight:700}}>{format(campaign.created_at)}</dd></div>
    <div><dt className="muted">Approved</dt><dd style={{margin:"4px 0 0",fontWeight:700}}>{campaign.approved_at?format(campaign.approved_at):"Not approved"}</dd></div>
    <div><dt className="muted">Uploaded recipients</dt><dd style={{margin:"4px 0 0",fontWeight:700}}>{batch?.total_records??"Not staged"}</dd></div>
    <div><dt className="muted">Eligible recipients</dt><dd style={{margin:"4px 0 0",fontWeight:700}}>{batch?.eligible_records??"Not staged"}</dd></div>
   </dl>
   <p className="muted" style={{marginTop:20}}>This view does not expose recipient phone numbers, API credentials, editable campaign settings, or launch controls.</p>
   {isAdmin&&<Link className="btn-outline small" href={"/campaigns/"+id+"/outbound"}>Open IT campaign controls</Link>}
  </section>
 </div>;
}
