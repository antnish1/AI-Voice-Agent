import Link from "next/link";
import {requireItSuperUser} from "@/lib/it-access";
import {ProfileEditor} from "./profile-editor";
export default async function VoiceProfiles(){
 const {supabase}=await requireItSuperUser();
 const [{data:dealerships,error:a},{data:profiles,error:b}]=await Promise.all([
  supabase.from("dealerships").select("id,name").order("name"),
  supabase.from("dealership_voice_profiles").select("dealership_id,agent_id,app_version,connection_id,caller_number,active")
 ]);
 if(a||b)throw Error("Unable to load dealership profile settings. Apply the reviewed migration.");
 const entries=(dealerships??[]).map(d=>({id:d.id,name:d.name,profile:profiles?.find(x=>x.dealership_id===d.id)??null}));
 return <main><div className="page-head"><div><p className="eyebrow">IT SUPER USER</p><h1>Voice Agent Defaults</h1><p>Manage verified dealership-to-Sarvam mappings.</p></div><Link className="btn-outline small" href="/campaigns">Back to Campaigns</Link></div><ProfileEditor dealerships={entries}/></main>;
}
