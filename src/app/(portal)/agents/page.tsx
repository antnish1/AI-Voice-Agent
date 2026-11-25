import {redirect} from "next/navigation";
import {requireMembership} from "@/lib/auth";
import {isItSuperUser} from "@/lib/it-access";
import {AgentsDirectory} from "./agents-directory";
import {AgentTestCall} from "./agent-test-call";
export default async function Agents(){
 const {supabase,membership,user,memberships}=await requireMembership();if(!membership)return null;
 if(!isItSuperUser(user.id,user.email??"",memberships.some(m=>m.role==="super_admin")?"super_admin":""))redirect("/campaigns");
 const {data,error}=await supabase.from("dealership_voice_profiles").select("dealership_id,agent_id,app_version,connection_id,caller_number").eq("active",true);
 const {data:dealers,error:dealerError}=await supabase.from("dealerships").select("id,name");
 const names=new Map((dealers??[]).map(d=>[d.id,d.name]));
 const profiles=error||dealerError?[]:(data??[]).filter(p=>names.has(p.dealership_id)).map(p=>({...p,name:names.get(p.dealership_id)??""}));
 return <><AgentTestCall profiles={profiles} enabled={process.env.ENABLE_TEST_CALLS==="true"} loadError={!!error||!!dealerError}/><AgentsDirectory/></>;
}
