import "./unified-directory.css";
import {notFound} from "next/navigation";
import {requireMembership} from "@/lib/auth";
import {isItSuperUser} from "@/lib/it-access";
import {UserManagement} from "./user-management";
export default async function Users(){
 const {user,memberships}=await requireMembership();
 if(!memberships.some(m=>isItSuperUser(user.id,user.email??"",m.role)))notFound();
 return <UserManagement/>;
}