import {requireMembership} from "@/lib/auth";
import {AgentsDirectory} from "./agents-directory";
export default async function Agents(){
 const {membership}=await requireMembership();if(!membership)return null;
 return <AgentsDirectory/>;
}
