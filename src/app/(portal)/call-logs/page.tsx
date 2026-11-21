import {requireMembership} from "@/lib/auth";
import {CallLogsDirectory,type CallRecord} from "./call-logs-directory";
export default async function CallLogs(){
 const {supabase,membership}=await requireMembership();
 if(!membership)return null;
 const {data,error}=await supabase.from("voice_call_records").select("id,sarvam_attempt_id,sarvam_interaction_id,sarvam_campaign_id,agent_id,dialed_number,status,duration_seconds,started_at,transcript").eq("dealership_id",membership.dealership_id).order("started_at",{ascending:false,nullsFirst:false}).limit(250);
 if(error)throw new Error("Unable to load verified call records.");
 return <CallLogsDirectory calls={(data??[]) as CallRecord[]}/>;
}
