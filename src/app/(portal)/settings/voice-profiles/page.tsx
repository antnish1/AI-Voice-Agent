import Link from "next/link";
import {requireItSuperUser} from "@/lib/it-access";
import {ProfileEditor} from "./profile-editor";
import "./voice-defaults-reference.css";
export default async function VoiceProfiles(){
 const {supabase}=await requireItSuperUser();
 const [{data:dealerships,error:a},{data:profiles,error:b}]=await Promise.all([
  supabase.from("dealerships").select("id,name").order("name"),
  supabase.from("dealership_voice_profiles").select("dealership_id,agent_id,app_version,connection_id,caller_number,active")
 ]);
 if(a||b)throw Error("Unable to load dealership profile settings. Apply the reviewed migration.");
 const entries=(dealerships??[]).map(d=>({id:d.id,name:d.name,profile:profiles?.find(x=>x.dealership_id===d.id)??null}));
 return <main className="vdp-page">
  <header className="vdp-header"><div className="vdp-heading">
   <span className="vdp-brand-icon" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><path d="M5 32h5m5-8v16m7-24v32m7-18v5m7-27v48m7-34v20m7-15v10m7-7h5" stroke="white" strokeWidth="4" strokeLinecap="round"/></svg></span>
   <div><span className="vdp-kicker">SETTINGS</span><h1>Voice Agent Defaults</h1><p>Manage default settings for all your voice agents.</p></div></div>
   <Link href="/campaigns" className="vdp-back"><span aria-hidden="true">←</span> Back to Campaigns</Link>
  </header>
  <div className="vdp-body"><ProfileEditor dealerships={entries}/></div>
 </main>;
}
