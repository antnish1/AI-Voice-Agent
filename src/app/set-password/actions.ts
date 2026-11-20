"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setPassword(formData: FormData) {
  const password = formData.get("password");
  const confirm = formData.get("confirm_password");
  if (typeof password !== "string" || typeof confirm !== "string" || password !== confirm || password.length < 12 || password.length > 128) {
    redirect("/set-password?error=invalid_password");
  }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?error=invalid_link");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/set-password?error=update_failed");
  redirect("/dashboard");
}
