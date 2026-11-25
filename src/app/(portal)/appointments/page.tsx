import {SarvamRequestQueue} from "../sarvam-request-queue";
import {requireMembership,canPrepare} from "@/lib/auth";
import {WorkflowManager,type WorkflowRecord} from "../workflow-manager";
import {AppointmentsDirectory} from "./appointments-directory";
export default async function Appointments(){
 const {supabase,membership}=await requireMembership();
 if(!membership)return null;
 const {data,error}=await supabase.from("crm_appointments").select("*").eq("dealership_id",membership.dealership_id).order("appointment_at",{ascending:false}).limit(200);
 if(error)throw new Error("Unable to load appointments records.");
 return <AppointmentsDirectory><SarvamRequestQueue kind="appointments"/><WorkflowManager kind="appointments" records={(data??[]) as WorkflowRecord[]} dealershipId={membership.dealership_id} canManage={canPrepare(membership.role)}/></AppointmentsDirectory>;
}
