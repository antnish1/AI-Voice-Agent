import { signIn } from "./actions";
export default async function Login({searchParams}: {searchParams: Promise<{error?:string}>}) {
 const {error}=await searchParams;
 return <div className="login-page"><div className="login-card"><div className="logo autoreach-login-logo"><img src="/autoreach-logo.png" alt="AutoReach AI" width={68} height={68}/></div><p className="eyebrow">FRONTIER GROUP</p><h1 title="Frontier Voice Intelligence">FrontVox AI</h1><p className="muted">Secure dealership access</p>{error&&<p className="error" role="alert">Unable to sign in. Check your credentials.</p>}<form action={signIn} className="form"><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label><button type="submit">Sign in</button></form><p className="fine">Accounts are provisioned by Frontier Group administration. No public sign-up.</p></div></div>;
}
