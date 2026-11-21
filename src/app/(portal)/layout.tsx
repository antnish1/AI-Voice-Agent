import { requireMembership } from "@/lib/auth";
import { Shell } from "@/components/shell";
export default async function PortalLayout({children}:{children:React.ReactNode}) {
 const {user,membership}=await requireMembership();
 if(!membership)return <main className="no-access"><h1>No dealership access</h1><p>Your account is valid but no dealership role has been assigned. Contact Frontier Group administrator.</p></main>;
 return <Shell membership={membership} userEmail={user.email??"Account"} userId={user.id} displayName={typeof user.user_metadata?.display_name==="string"?user.user_metadata.display_name:""} avatarPath={typeof user.user_metadata?.avatar_path==="string"?user.user_metadata.avatar_path:""}>{children}</Shell>;
}
