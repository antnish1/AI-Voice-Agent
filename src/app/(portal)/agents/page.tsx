import {redirect} from "next/navigation";
import {requireMembership} from "@/lib/auth";
import {isItSuperUser} from "@/lib/it-access";
import {AgentsDirectory} from "./agents-directory";
import {AgentTestCall} from "./agent-test-call";
export default async function Agents(){
 const {supabase,membership,user,memberships}=await requireMembership();if(!membership)return null;
 if(!isItSuperUser(user.id,user.email??"",memberships.some(m=>m.role==="super_admin")?"super_admin":""))redirect("/campaigns");
 const {data,error}=await supabase.from("dealership_voice_profiles").select("dealership_id,agent_id,app_version,connection_id,caller_number,active");
 const {data:dealers,error:dealerError}=await supabase.from("dealerships").select("id,name");
 const names=new Map((dealers??[]).map(d=>[d.id,d.name]));
 const configured=error||dealerError?[]:(data??[]).filter(p=>names.has(p.dealership_id)).map(p=>({...p,name:names.get(p.dealership_id)??""}));
 const defaults=configured.filter(p=>p.active).map(({active,...p})=>p);
 const saved:{id:string;name:string;dealership_id:string;profile:typeof defaults[number]|null}[]=[];
 let savedError=false;
 for(let offset=0;;offset+=200){
  const {data:campaigns,error:ce}=await supabase.from("campaigns").select("id,name,dealership_id").in("status",["DRAFT","PENDING_MANAGER_APPROVAL","APPROVED"]).order("id").range(offset,offset+199);
  if(ce){savedError=true;break;}
  if(!campaigns?.length)break;
  const {data:configs,error:cfgError}=await supabase.from("campaign_draft_configs").select("campaign_id,dealership_id,configuration").in("campaign_id",campaigns.map(c=>c.id));
  if(cfgError){savedError=true;break;}
  for(const campaign of campaigns){
   const cfg=configs?.find(c=>c.campaign_id===campaign.id&&c.dealership_id===campaign.dealership_id)?.configuration as {agent_label?:string;agent_version_label?:string;telephony_label?:string;outgoing_number_label?:string}|undefined;
   const version=Number(cfg?.agent_version_label);
   if(!names.has(campaign.dealership_id))continue;
   const profile=cfg?.agent_label&&cfg.telephony_label&&cfg.outgoing_number_label&&Number.isInteger(version)&&version>=1?{dealership_id:campaign.dealership_id,name:names.get(campaign.dealership_id)??"",agent_id:cfg.agent_label,app_version:version,connection_id:cfg.telephony_label,caller_number:cfg.outgoing_number_label}:null;
   saved.push({id:campaign.id,name:campaign.name,dealership_id:campaign.dealership_id,profile});
  }
  if(campaigns.length<200)break;
 }
 return <AgentsDirectory profiles={configured} loadError={!!error||!!dealerError} headerAction={<AgentTestCall dealerships={(dealers??[]).map(d=>({id:d.id,name:d.name})).sort((a,b)=>a.name.localeCompare(b.name))} profiles={defaults} campaigns={saved} enabled={process.env.ENABLE_TEST_CALLS==="true"} loadError={!!error||!!dealerError||savedError}/>}/>;
}
