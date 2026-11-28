"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(form: FormData) {
 const email=String(form.get("email")??"").trim(); const password=String(form.get("password")??"");
 if (!email || !password) redirect("/login?error=missing");
 const supabase=await createClient(); const {error}=await supabase.auth.signInWithPassword({email,password});
 if (error) redirect("/login?error=invalid");
 redirect("/dashboard");
}
export async function signOut():Promise<{error:string}|never> {
 try{
  const supabase=await createClient();
  const {error}=await supabase.auth.signOut();
  if(error)return {error:"Unable to sign out. Check your connection and try again."};
 }catch{
  return {error:"Unable to sign out. Check your connection and try again."};
 }
 redirect("/login");
}
