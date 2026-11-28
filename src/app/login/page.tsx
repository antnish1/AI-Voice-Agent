import {signIn} from "./actions";
import {PasswordField} from "./password-field";
import {SignInButton} from "./sign-in-button";
import "./login-design.css";


export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
 const {error}=await searchParams;
 return <main className="fv-login fv-login-kia-reference">
  <div className="fv-kia-backdrop" aria-hidden="true"><img src="/banners/KIA%20SERVICE.png" alt="" draggable={false} fetchPriority="high"/></div>
  <section className="fv-kia-auth" aria-label="Sign in to Frontier Voice CRM">
   <div className="fv-signin-card">
    <div className="fv-premium-brand"><img src="/autoreach-logo.png" alt="" width={64} height={64}/><div><strong>FRONTIER<br/>GROUP</strong></div></div>
    <h1>Welcome <em>Back!</em></h1>
    <p className="fv-signin-subtitle">Sign in to your Frontier Voice CRM account.</p>
    {error&&<p className="fv-error" role="alert">Unable to sign in. Check your email and password.</p>}
    <form action={signIn} className="fv-login-form">
     <label className="fv-visually-hidden" htmlFor="fv-email">Email Address</label>
     <div className="fv-input-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m3 7 9 7 9-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg><input id="fv-email" name="email" type="email" placeholder="Email Address" autoComplete="username" required/></div>
     <label className="fv-visually-hidden" htmlFor="fv-password">Password</label>
     <PasswordField/>
     <SignInButton/>
    </form>
    <div className="fv-or" aria-hidden="true"><span/>OR<span/></div>
    <p className="fv-access-note"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 9 4v6c0 5.3-3.5 8.6-9 10-5.5-1.4-9-4.7-9-10V6z" fill="currentColor"/><path d="m9 12 2 2 4-5" stroke="white" strokeWidth="2" fill="none"/></svg><span>Accounts are provisioned by Frontier Group administration.<br/>No public sign-up.</span></p>
   </div>
  </section>
 </main>;
}
