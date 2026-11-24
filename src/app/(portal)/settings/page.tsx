import {requireMembership} from "@/lib/auth";
import {SettingsDirectory} from "./settings-directory";
import "./dealership-layout.css";
export default async function Settings(){
 const {membership,user}=await requireMembership();if(!membership)return null;
 return <SettingsDirectory userId={user.id} email={user.email??""} role={membership.role} dealership={membership.dealerships?.name??"Assigned dealership"} displayName={typeof user.user_metadata?.display_name==="string"?user.user_metadata.display_name:""} phone={typeof user.user_metadata?.profile_phone==="string"?user.user_metadata.profile_phone:""} avatarPath={typeof user.user_metadata?.avatar_path==="string"?user.user_metadata.avatar_path:""}/>;
}