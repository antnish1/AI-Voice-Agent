import "server-only";
import { redirect } from "next/navigation";
import {cookies} from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const ROLES = ["super_admin", "dealership_manager", "crm_executive", "service_team", "management"] as const;
export type Role = typeof ROLES[number];
export type Membership = { dealership_id: string; role: Role; dealerships: { name: string } | null };

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  if(user.app_metadata?.frontvox_account_state==="disabled"||user.app_metadata?.frontvox_account_state==="archived") redirect("/login");
  if(user.app_metadata?.must_change_password === true) redirect("/change-password");
  return { supabase, user };
}

export async function requireMembership(dealershipId?: string) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("memberships").select("dealership_id, role, dealerships(name)").eq("user_id", user.id);
  if (error) throw new Error("Unable to load dealership access.");
  const memberships = (data ?? []) as unknown as Membership[];
  const superRole=memberships.some(m=>m.role==="super_admin");
  const isIt=user.id==="5bd78ada-44f5-4045-a9fb-75c9dad69893" && user.email?.toLowerCase()==="it@insureit.in" && superRole;
  const cookieSelected=isIt?((await cookies()).get("frontier_active_dealership")?.value??""):"";
  const requested=dealershipId||cookieSelected;
  let membership=requested?memberships.find(m=>m.dealership_id===requested):memberships[0];
  if(isIt&&requested&&!membership){
    // Global IT access is verified by the account identity AND its super_admin membership.
    // A dealership cookie alone never grants access to an ordinary dealership account.
    const {data:dealer,error:dealerError}=await supabase.from("dealerships").select("id,name").eq("id",requested).maybeSingle();
    if(!dealerError&&dealer)membership={dealership_id:dealer.id,role:"super_admin",dealerships:{name:dealer.name}};
  }
  if (!membership) return { supabase, user, membership: null, memberships };
  return { supabase, user, membership, memberships };
}

export function canPrepare(role: Role) { return role === "super_admin"; }
export function canApprove(role: Role) { return role === "super_admin"; }

/** Dealership members may create drafts only for their assigned dealership. */
export function canCreateCampaign(role:Role){return ROLES.includes(role);}
