import {requireItSuperUser} from "@/lib/it-access";
import {ProfileEditor} from "./profile-editor";
import "./voice-defaults-reference.css";
export default async function VoiceProfiles(){
 const {supabase,membership}=await requireItSuperUser();
 if(!membership)throw Error("Select an active dealership before editing voice defaults.");
 const [{data:dealerships,error:a},{data:profiles,error:b}]=await Promise.all([
  supabase.from("dealerships").select("id,name").order("name"),
  supabase.from("dealership_voice_profiles").select("dealership_id,agent_id,app_version,connection_id,caller_number,active")
 ]);
 if(a||b)throw Error("Unable to load dealership profile settings. Apply the reviewed migration.");
 const entries=(dealerships??[]).map(d=>({id:d.id,name:d.name,profile:profiles?.find(x=>x.dealership_id===d.id)??null}));
 return <main className="vdp-page">
  <header className="vdp-header"><div className="vdp-heading">
   <span className="vdp-brand-icon" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><path d="M5 32h5m5-8v16m7-24v32m7-18v5m7-27v48m7-34v20m7-15v10m7-7h5" stroke="white" strokeWidth="4" strokeLinecap="round"/></svg></span>
   <div><span className="vdp-kicker">SETTINGS</span><h1>Voice Agent Defaults</h1></div></div>
  <svg className="vdp-header-wave" viewBox="0 0 700 120" fill="none" aria-hidden="true" preserveAspectRatio="none">{Array.from({length:18},(_,i)=><path key={i} d={`M0 70 C90 70 110 ${12+i*4} 190 55 S300 ${115-i*3} 370 40 S500 ${-10+i*5} 565 50 S650 80 700 65`} stroke="#ff354d" strokeWidth="1" opacity={0.08+i*.032}/>)}</svg></header>
  <div className="vdp-body"><ProfileEditor key={membership.dealership_id} dealerships={entries} activeDealershipId={membership.dealership_id}/></div>
 </main>;
}
