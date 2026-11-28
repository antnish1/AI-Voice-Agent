import {MotionPreferenceProvider} from "@/components/motion/motion-preference";
import { requireMembership } from "@/lib/auth";
import { Shell } from "@/components/shell";
import {isItSuperUser} from "@/lib/it-access";
export default async function PortalLayout({children}:{children:React.ReactNode}) {
 const {supabase,user,membership}=await requireMembership();
 if(!membership)return <main className="no-access"><h1>No dealership access</h1><p>Your account is valid but no dealership role has been assigned. Contact Frontier Group administrator.</p></main>;
 const isItAdmin=isItSuperUser(user.id,user.email??"",membership.role);
 const dealerChoices=isItAdmin?await supabase.from("dealerships").select("id,name").order("name").limit(500):null;
 const availableDealerships=dealerChoices?.error?[]:(dealerChoices?.data??[]);
 const {count:pendingApprovals,error:pendingError}=await supabase.from("campaigns").select("id",{count:"exact",head:true}).eq("dealership_id",membership.dealership_id).eq("status","PENDING_MANAGER_APPROVAL");
 return <MotionPreferenceProvider userId={user.id}><Shell availableDealerships={availableDealerships} isItAdmin={isItAdmin} pendingApprovals={pendingError?0:(pendingApprovals??0)} membership={membership} userEmail={user.email??"Account"} userId={user.id} displayName={typeof user.user_metadata?.display_name==="string"?user.user_metadata.display_name:""} avatarPath={typeof user.user_metadata?.avatar_path==="string"?user.user_metadata.avatar_path:""}>{children}</Shell></MotionPreferenceProvider>;
}
