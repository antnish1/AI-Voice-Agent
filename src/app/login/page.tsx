import {signIn} from "./actions";
import {PasswordField} from "./password-field";
import {SignInButton} from "./sign-in-button";
import "./login-design.css";

function SoundWave(){
 const heights=[6,16,9,26,50,23,13,9,15,38,66,24,13,9,17,11,22,12,31,16,9,21,51,100,42,19,15,11,25,46,26,13,30,12,22,14,13,36,76,35,17,10,15,30,57,24,9,18,26,10,13,8,16,9,5];
 return <svg className="fv-sound-wave" viewBox="0 0 950 150" preserveAspectRatio="none" aria-hidden="true">
  <defs><linearGradient id="fv-wave-glow"><stop stopColor="#4c7aff"/><stop offset=".45" stopColor="#31deff"/><stop offset="1" stopColor="#6cf5fb" stopOpacity=".18"/></linearGradient></defs>
  <path d="M0 75 H950" fill="none" stroke="#4fd9fc" strokeWidth="2" strokeOpacity=".6"/>
  {heights.map((height,i)=><rect key={i} x={i*17+4} y={75-height/2} width={i%7===0?5:3.3} height={height} rx="3" fill="url(#fv-wave-glow)" opacity={i<37?1:.7}/>)}
 </svg>;
}
function VoiceBadge({type}:{type:"voice"|"performance"|"shield"}){
 if(type==="voice")return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12h2m2-4v8m3-12v16m3-12v8m3-12v16m3-13v10m3-7v4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none"/></svg>;
 if(type==="performance")return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="13" width="4" height="9" rx="1" fill="currentColor"/><rect x="10" y="8" width="4" height="14" rx="1" fill="currentColor"/><rect x="18" y="2" width="4" height="20" rx="1" fill="currentColor"/></svg>;
 return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 9 4v6c0 5.3-3.5 8.6-9 10-5.5-1.4-9-4.7-9-10V6z" fill="currentColor"/><path d="m8 12 3 3 5-6" stroke="#054b68" strokeWidth="2.5" fill="none" strokeLinecap="round"/></svg>;
}
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
 const {error}=await searchParams;
 return <main className="fv-login">
  <section className="fv-left" aria-label="Frontier Voice CRM introduction">
   <div className="fv-left-glow" aria-hidden="true"/>
   <div className="fv-left-top" title="Frontier Voice CRM">
    <img src="/autoreach-logo.png" alt="Frontier Voice CRM" width={88} height={88}/>
    <span className="fv-brand-separator" aria-hidden="true"/>
    <strong>FRONTIER<br/>GROUP</strong>
   </div>
   <div className="fv-left-content">
    <h1 title="Frontier Voice CRM">Frontier <em>Voice CRM</em></h1>
    <h2>Secure dealership access</h2>
    <p>Smarter Conversations. Stronger Connections.</p>
    <div className="fv-pills">
     <span><VoiceBadge type="voice"/>AI Voice CRM</span>
     <span><VoiceBadge type="performance"/>Track Performance</span>
     <span><VoiceBadge type="shield"/>Manage Your Business</span>
    </div>
   </div>
   <div className="fv-audio-art" aria-hidden="true">
    <SoundWave/>
    <div className="fv-mic-ring"><div className="fv-mic-center"><svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="13" rx="3" fill="white"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4m-4 0h8" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round"/></svg></div></div>
   </div>
   <div className="fv-left-wave-bottom" aria-hidden="true"/>
  </section>
  <section className="fv-right" aria-label="Sign in to Frontier Voice CRM">
   <div className="fv-right-dots" aria-hidden="true"/>
   <div className="fv-right-ribbon" aria-hidden="true"/>
   <div className="fv-signin-card">
    <div className="fv-login-icon" title="Frontier Voice CRM"><img src="/autoreach-logo.png" alt="Frontier Voice CRM logo" width={104} height={104}/></div>
    <p className="fv-overline">FRONTIER GROUP</p>
    <h2>Welcome Back!</h2>
    <p className="fv-signin-subtitle">Sign in to your Frontier Voice CRM account</p>
    {error&&<p className="fv-error" role="alert">Unable to sign in. Check your email and password.</p>}
    <form action={signIn} className="fv-login-form">
     <label className="fv-visually-hidden" htmlFor="fv-email">Email Address</label>
     <div className="fv-input-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2" fill="currentColor"/><path d="m4 8 8 6 8-6" fill="none" stroke="#dfe9fa" strokeWidth="1.8" strokeLinejoin="round"/></svg><input id="fv-email" name="email" type="email" placeholder="Email Address" autoComplete="username" required/></div>
     <label className="fv-visually-hidden" htmlFor="fv-password">Password</label>
     <PasswordField/>
     <SignInButton/>
    </form>
    <div className="fv-or"><span/>OR<span/></div>
    <p className="fv-access-note"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 9 4v6c0 5.3-3.5 8.6-9 10-5.5-1.4-9-4.7-9-10V6z" fill="currentColor"/><path d="m9 12 2 2 4-5" stroke="white" strokeWidth="2" fill="none"/></svg><span>Accounts are provisioned by Frontier Group administration.<br/>No public sign-up.</span></p>
   </div>
  </section>
 </main>;
}
