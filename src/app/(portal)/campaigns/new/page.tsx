import {requireMembership} from "@/lib/auth";
import {isItSuperUser} from "@/lib/it-access";
import {redirect} from "next/navigation";
import Campaigns from "../page";
import {CampaignWizard} from "../wizard";

export default async function NewCampaign(){
 const {supabase,user,membership,memberships}=await requireMembership();
 if(!membership||!isItSuperUser(user.id,user.email??"",memberships.some(x=>x.role==="super_admin")?"super_admin":""))redirect("/campaigns");
 const {data,error}=await supabase.from("dealerships").select("id,name").order("name");
 if(error||!data?.length)throw Error("Could not load authorized dealerships.");
 return <><Campaigns/><CampaignWizard dealerships={data} initialDealershipId={data.some(d=>d.id===membership.dealership_id)?membership.dealership_id:data[0].id}/></>;
}
