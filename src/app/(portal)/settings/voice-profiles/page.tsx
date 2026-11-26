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
   <div><span className="vdp-kicker">SETTINGS</span><h1>Voice Agent Defaults</h1></div></div>
  </header>
  <div className="vdp-body"><ProfileEditor dealerships={entries}/><div className="vdp-visual" aria-hidden="true">
   <svg viewBox="-12 0 464 500" className="vdp-robot" fill="none">
    <defs>
     <linearGradient id="vdp-body-glow" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#ffffff"/><stop offset=".32" stopColor="#edf8ff"/><stop offset=".65" stopColor="#9ac6ef"/><stop offset="1" stopColor="#3159a8"/></linearGradient>
     <linearGradient id="vdp-head-glow" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#ffffff"/><stop offset=".27" stopColor="#e9f7ff"/><stop offset=".6" stopColor="#8dbcf0"/><stop offset="1" stopColor="#2852a3"/></linearGradient>
     <linearGradient id="vdp-screen" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#0a1a65"/><stop offset="1" stopColor="#00133a"/></linearGradient>
     <linearGradient id="vdp-ribbon" x1="0" x2="1"><stop stopColor="#00d8fc"/><stop offset=".55" stopColor="#0866f4"/><stop offset="1" stopColor="#6a34e3"/></linearGradient>
     <filter id="vdp-eye-glow" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="3" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
     <filter id="vdp-blur"><feGaussianBlur stdDeviation="12"/></filter>
    </defs>
    <circle cx="237" cy="215" r="175" fill="#b6eaff" opacity=".32" filter="url(#vdp-blur)"/>
    <circle cx="237" cy="215" r="161" stroke="#80c8ff" strokeWidth="2" opacity=".4"/>
    <circle cx="237" cy="215" r="133" stroke="#9ad6ff" strokeWidth="1.5" opacity=".45"/>
    <g stroke="#16c5ef" strokeWidth="6" strokeLinecap="round" opacity=".65"><path d="M16 230v25m14-43v59m14-76v92m14-61v34m14-48v64m14-93v109"/></g>
    <g transform="translate(100 86)">
     <path d="M66 238Q20 260 25 341l200 4q11-82-24-106l-52-31H106Z" fill="url(#vdp-body-glow)" stroke="#3971c9" strokeWidth="4"/>
     <path d="M78 231q49 43 114-1l-31-22h-58Z" fill="#eafcff" stroke="#8ad4fa" strokeWidth="4"/>
     <path d="M126 239v32" stroke="#42dffd" strokeWidth="6" strokeLinecap="round"/>
     <circle cx="125" cy="290" r="16" fill="#d6fcff" stroke="#07bfff" strokeWidth="5"/>
     <rect x="36" y="24" width="179" height="177" rx="72" fill="url(#vdp-head-glow)" stroke="#2e5bb0" strokeWidth="5"/>
     <rect x="46" y="49" width="159" height="119" rx="51" fill="url(#vdp-screen)" stroke="#4db9f7" strokeWidth="5"/>
     <rect x="67" y="84" width="23" height="40" rx="11" fill="#11e8fc" filter="url(#vdp-eye-glow)"/><rect x="154" y="84" width="23" height="40" rx="11" fill="#11e8fc"/>
     <path d="M111 139q13 12 27 0" stroke="#2ee6fe" strokeWidth="4" strokeLinecap="round"/>
     <rect x="7" y="81" width="34" height="82" rx="16" fill="url(#vdp-head-glow)" stroke="#285cb4" strokeWidth="5"/>
     <rect x="210" y="81" width="33" height="82" rx="16" fill="url(#vdp-head-glow)" stroke="#285cb4" strokeWidth="5"/>
     <circle cx="21" cy="119" r="12" fill="#0cdaf8"/><circle cx="228" cy="119" r="12" fill="#0cdaf8"/>
     <path d="M104 20Q116 9 130 20" stroke="#0fcafb" strokeWidth="4"/>
     <path d="M32 260Q-26 231-39 282l51 17 35-10" fill="url(#vdp-body-glow)" stroke="#4b85d0" strokeWidth="5"/>
     <path d="M-40 280q-28-7-42-29m42 29q-31 1-43-10m43 10q-17 15-37 12" stroke="#91d5ff" strokeWidth="11" strokeLinecap="round"/>
    </g>
    <g transform="translate(124 367) rotate(5)">
     <rect width="266" height="91" rx="18" fill="#1379ec" fillOpacity=".65" stroke="#a5e4ff" strokeWidth="3"/>
     <rect x="11" y="10" width="244" height="72" rx="13" fill="#ffffff" fillOpacity=".24" stroke="#7ad6ff"/>
     <circle cx="54" cy="45" r="28" fill="#2ecaff" fillOpacity=".38" stroke="#c2fbff" strokeWidth="2"/>
     <path d="M54 26v30m-10-16a10 10 0 0 0 20 0m-10 16v6m-9 0h18" stroke="white" strokeWidth="4" strokeLinecap="round"/>
     <rect x="103" y="30" width="113" height="7" rx="4" fill="#fff" fillOpacity=".9"/><rect x="103" y="49" width="82" height="7" rx="4" fill="#fff" fillOpacity=".72"/><rect x="103" y="67" width="96" height="5" rx="3" fill="#fff" fillOpacity=".55"/>
    </g>
   </svg>
  </div></div>
 </main>;
}
