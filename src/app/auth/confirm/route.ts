import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// This server-side callback supports a custom Supabase invitation email template.
// The template must link to /auth/confirm?token_hash={{ .TokenHash }}&type=invite
// rather than relying on localhost or a browser-only URL fragment.
const validTypes = new Set(["invite", "recovery", "signup", "email", "email_change"]);
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (!token_hash || !type || !validTypes.has(type))
    return NextResponse.redirect(new URL("/login?error=invalid_link", origin));
  const client = await createClient();
  const { error } = await client.auth.verifyOtp({
    token_hash,
    type: type as "invite" | "recovery" | "signup" | "email" | "email_change",
  });
  if (error) return NextResponse.redirect(new URL("/login?error=expired_link", origin));
  if (type === "invite" || type === "recovery") return NextResponse.redirect(new URL("/set-password", origin));
  return NextResponse.redirect(new URL("/dashboard", origin));
}
