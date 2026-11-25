import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setPassword } from "./actions";

export default async function SetPassword({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=invalid_link");
  const { error } = await searchParams;
  return <div className="login-page"><div className="login-card">
    <div className="logo"><img src="/autoreach-logo.png" alt="Frontier Voice CRM" width={48} height={48} style={{objectFit:"contain",width:"100%",height:"100%"}}/></div><p className="eyebrow">FRONTIER GROUP</p>
    <h1>Set your password</h1>
    <p className="muted">Complete your secure invitation for {user.email ?? "your account"}.</p>
    {error && <p className="error" role="alert">Passwords must match, contain 12–128 characters, and meet your project's password requirements.</p>}
    <form className="form" action={setPassword}>
      <label>New password<input name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></label>
      <label>Confirm password<input name="confirm_password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></label>
      <button type="submit">Save password</button>
    </form>
    <p className="fine">Never share your password. This page is available only after a valid authenticated invitation or recovery link.</p>
  </div></div>;
}
