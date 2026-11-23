import {requireMembership} from "@/lib/auth";
import {isItSuperUser} from "@/lib/it-access";
import {redirect} from "next/navigation";
import Campaigns from "../page";
import {CampaignWizard} from "../wizard";

export default async function NewCampaign(){
 const {supabase,user,membership,memberships}=await requireMembership();
 if(!membership||!isItSuperUser(user.id,user.email??"",memberships.some(x=>x.role==="super_admin")?"super_admin":""))redirect("/campaigns");
 const [{data,error},{data:profiles,error:profileError}]=await Promise.all([supabase.from("dealerships").select("id,name").order("name"),supabase.from("dealership_voice_profiles").select("dealership_id,active")]);
 if(error||profileError||!data?.length)throw Error("Could not load dealership profiles. Check the reviewed migration.");
 const options=data.map(d=>({...d,configured:profiles?.some(p=>p.dealership_id===d.id&&p.active)??false}));
 return <><Campaigns/><CampaignWizard dealerships={options} initialDealershipId={data.some(d=>d.id===membership.dealership_id)?membership.dealership_id:data[0].id}/></>;
}
