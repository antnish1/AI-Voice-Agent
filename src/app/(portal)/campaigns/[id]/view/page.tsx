import {notFound,redirect} from "next/navigation";
import {requireMembership} from "@/lib/auth";
import {isItSuperUser} from "@/lib/it-access";
export default async function ViewCampaign({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const {supabase,user,membership,memberships}=await requireMembership();
 if(!membership)notFound();
 const {data,error}=await supabase.from("campaigns").select("id").eq("id",id).eq("dealership_id",membership.dealership_id).maybeSingle();
 if(error||!data)notFound();
 const isAdmin=isItSuperUser(user.id,user.email??"",memberships.some(m=>m.role==="super_admin")?"super_admin":"");
 redirect(isAdmin?"/campaigns/"+id+"/outbound":"/campaigns?view="+encodeURIComponent(id));
}
