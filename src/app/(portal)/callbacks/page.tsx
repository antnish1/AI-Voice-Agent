import {SarvamRequestQueue} from "../sarvam-request-queue";
import {requireMembership,canPrepare} from "@/lib/auth";
import {WorkflowManager,type WorkflowRecord} from "../workflow-manager";
import {CallbacksDirectory} from "./callbacks-directory";
export default async function Callbacks(){
 const {supabase,membership}=await requireMembership();
 if(!membership)return null;
 const {data,error}=await supabase.from("crm_callbacks").select("*").eq("dealership_id",membership.dealership_id).order("requested_at",{ascending:false}).limit(200);
 if(error)throw new Error("Unable to load callbacks records.");
 return <CallbacksDirectory><SarvamRequestQueue kind="callbacks"/><WorkflowManager kind="callbacks" records={(data??[]) as WorkflowRecord[]} dealershipId={membership.dealership_id} canManage={canPrepare(membership.role)}/></CallbacksDirectory>;
}
