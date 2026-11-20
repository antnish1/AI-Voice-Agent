import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const ROLES = ["super_admin", "dealership_manager", "crm_executive", "service_team", "management"] as const;
export type Role = typeof ROLES[number];
export type Membership = { dealership_id: string; role: Role; dealerships: { name: string } | null };

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

export async function requireMembership(dealershipId?: string) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("memberships").select("dealership_id, role, dealerships(name)").eq("user_id", user.id);
  if (error) throw new Error("Unable to load dealership access.");
  const memberships = (data ?? []) as unknown as Membership[];
  const membership = dealershipId ? memberships.find(m => m.dealership_id === dealershipId) : memberships[0];
  if (!membership) return { supabase, user, membership: null, memberships };
  return { supabase, user, membership, memberships };
}

export function canPrepare(role: Role) { return ["super_admin","dealership_manager","crm_executive"].includes(role); }
export function canApprove(role: Role) { return ["super_admin","dealership_manager"].includes(role); }
