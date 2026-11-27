import {signIn} from "./actions";
import {PasswordField} from "./password-field";
import {SignInButton} from "./sign-in-button";
import "./login-design.css";
import {VehicleCarousel} from "./vehicle-carousel";

export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
 const {error}=await searchParams;
 return <main className="fv-login fv-login-full-background fv-login-left-card fv-login-premium">
  <VehicleCarousel/>
  <section className="fv-left fv-left-login-layout" aria-label="Sign in to Frontier Voice CRM">
   <div className="fv-signin-card">
    <div className="fv-premium-brand"><img src="/autoreach-logo.png" alt="" width={64} height={64}/><div><strong>FRONTIER GROUP</strong><span>VOICE CRM</span></div></div>
    <div className="fv-premium-rule" aria-hidden="true"/>
    <h1>Welcome back.</h1>
    <p className="fv-signin-subtitle">Secure access to your dealership workspace.</p>
    {error&&<p className="fv-error" role="alert">Unable to sign in. Check your email and password.</p>}
    <form action={signIn} className="fv-login-form">
     <label className="fv-premium-label" htmlFor="fv-email">Email Address</label>
     <div className="fv-input-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2" fill="currentColor"/><path d="m4 8 8 6 8-6" fill="none" stroke="#dfe9fa" strokeWidth="1.8" strokeLinejoin="round"/></svg><input id="fv-email" name="email" type="email" placeholder="Email Address" autoComplete="username" required/></div>
     <label className="fv-premium-label" htmlFor="fv-password">Password</label>
     <PasswordField/>
     <SignInButton/>
    </form>
    <p className="fv-access-note"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 9 4v6c0 5.3-3.5 8.6-9 10-5.5-1.4-9-4.7-9-10V6z" fill="currentColor"/><path d="m9 12 2 2 4-5" stroke="white" strokeWidth="2" fill="none"/></svg><span>Accounts are provisioned by Frontier Group administration.<br/>No public sign-up.</span></p>
   </div>
  </section>
 </main>;
}
