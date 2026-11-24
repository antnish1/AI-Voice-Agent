import {redirect} from "next/navigation";
import {requireMembership} from "@/lib/auth";
import {isItSuperUser} from "@/lib/it-access";
import {AgentsDirectory} from "./agents-directory";
export default async function Agents(){
 const {membership,user,memberships}=await requireMembership();if(!membership)return null;
 if(!isItSuperUser(user.id,user.email??"",memberships.some(m=>m.role==="super_admin")?"super_admin":""))redirect("/campaigns");
 return <AgentsDirectory/>;
}
