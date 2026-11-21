import {requireMembership} from "@/lib/auth";
import {ReportsDirectory} from "./reports-directory";
export default async function Reports(){
 const {supabase,membership}=await requireMembership();if(!membership)return null;
 const id=membership.dealership_id;
 const [customers,campaigns,imports,pending,listed]=await Promise.all([
  supabase.from("customers").select("id",{count:"exact",head:true}).eq("dealership_id",id),
  supabase.from("campaigns").select("id",{count:"exact",head:true}).eq("dealership_id",id),
  supabase.from("customer_import_batches").select("id",{count:"exact",head:true}).eq("dealership_id",id),
  supabase.from("campaigns").select("id",{count:"exact",head:true}).eq("dealership_id",id).eq("status","PENDING_MANAGER_APPROVAL"),
  supabase.from("campaigns").select("id,name,status,created_at").eq("dealership_id",id).order("created_at",{ascending:false}).limit(250)
 ]);
 if([customers,campaigns,imports,pending,listed].some(x=>x.error))throw new Error("Could not load dealership report records.");
 return <ReportsDirectory metrics={{customers:customers.count??0,campaigns:campaigns.count??0,imports:imports.count??0,pending:pending.count??0}} campaigns={listed.data??[]}/>;
}