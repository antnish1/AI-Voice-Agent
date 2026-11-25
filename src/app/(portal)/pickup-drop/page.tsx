import {SarvamRequestQueue} from "../sarvam-request-queue";
import {requireMembership,canPrepare} from "@/lib/auth";
import {WorkflowManager,type WorkflowRecord} from "../workflow-manager";
import {PickupDropDirectory} from "./pickup-drop-directory";
export default async function PickupDrop(){
 const {supabase,membership}=await requireMembership();
 if(!membership)return null;
 const {data,error}=await supabase.from("crm_pickup_drop").select("*").eq("dealership_id",membership.dealership_id).order("requested_at",{ascending:false}).limit(200);
 if(error)throw new Error("Unable to load pickup-drop records.");
 return <PickupDropDirectory><SarvamRequestQueue kind="pickup-drop"/><WorkflowManager kind="pickup-drop" records={(data??[]) as WorkflowRecord[]} dealershipId={membership.dealership_id} canManage={canPrepare(membership.role)}/></PickupDropDirectory>;
}
