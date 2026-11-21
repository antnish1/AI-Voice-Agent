// Shared server-only IT authorization. Do not use user_metadata for permissions.
import "server-only";
import {requireMembership} from "@/lib/auth";
export const IT_SUPER_USER_ID="5bd78ada-44f5-4045-a9fb-75c9dad69893";
export async function requireItSuperUser(){
 const context=await requireMembership();
 if(!context.memberships.some(m=>m.role==="super_admin")||context.user.id!==IT_SUPER_USER_ID||context.user.email?.toLowerCase()!=="it@insureit.in")throw new Error("IT Super User access required.");
 return context;
}
export function isItSuperUser(userId:string, email:string, role:string){
 return userId===IT_SUPER_USER_ID&&email.toLowerCase()==="it@insureit.in"&&role==="super_admin";
}