import {requireMembership,canCreateCampaign} from "@/lib/auth";
import {isItSuperUser} from "@/lib/it-access";
import {redirect} from "next/navigation";
import Campaigns from "../page";
import {CampaignWizard} from "../wizard";

export default async function NewCampaign(){
 const {supabase,user,membership,memberships}=await requireMembership();
 if(!membership||!canCreateCampaign(membership.role))redirect("/campaigns");
 const it=isItSuperUser(user.id,user.email??"",memberships.some(x=>x.role==="super_admin")?"super_admin":"");
 // Non-IT users must never receive the cross-dealership list or profile status.
 const id=membership.dealership_id;
 const [{data:dealers,error},{data:profiles,error:profileError}]=await Promise.all([
  it?supabase.from("dealerships").select("id,name").order("name"):
     supabase.from("dealerships").select("id,name").eq("id",id),
  it?supabase.from("dealership_voice_profiles").select("dealership_id,active"):
     supabase.from("dealership_voice_profiles").select("dealership_id,active").eq("dealership_id",id)
 ]);
 if(error||profileError||!dealers?.length)throw Error("Could not load your dealership profile.");
 const options=dealers.map(d=>({...d,configured:profiles?.some(p=>p.dealership_id===d.id&&p.active)??false}));
 return <><Campaigns/><CampaignWizard dealerships={options} initialDealershipId={id} canOpenOutbound={it}/></>;
}
