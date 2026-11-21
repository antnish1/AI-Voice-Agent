"use server";
import {revalidatePath} from "next/cache";
import {requireMembership,canPrepare} from "@/lib/auth";

export type WorkflowKind="callbacks"|"appointments"|"pickup-drop";
const TABLES={callbacks:"crm_callbacks",appointments:"crm_appointments","pickup-drop":"crm_pickup_drop"} as const;
const PATHS={callbacks:"/callbacks",appointments:"/appointments","pickup-drop":"/pickup-drop"} as const;
const allowed={
 callbacks:["pending","scheduled","in_progress","completed","missed","cancelled"],
 appointments:["requested","pending","confirmed","completed","cancelled"],
 "pickup-drop":["requested","pending","confirmed","in_progress","completed","cancelled"]
} as const;
const value=(data:FormData,key:string,max:number)=>String(data.get(key)??"").trim().slice(0,max+1);
const phone=/^\+?[1-9][0-9]{7,14}$/;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function createWorkflow(data:FormData):Promise<{error?:string;ok?:boolean}>{
 try{
  const kind=String(data.get("kind")) as WorkflowKind;
  if(!(kind in TABLES))return {error:"Invalid workflow."};
  const dealerId=value(data,"dealership_id",36),name=value(data,"customer_name",150),mobile=value(data,"mobile",20);
  const note=value(data,"notes",2000),time=value(data,"scheduled_at",50);
  const timestamp=new Date(time);
  if(!uuid.test(dealerId)||name.length<2||name.length>150||!phone.test(mobile)||note.length>2000||!time||!Number.isFinite(timestamp.getTime()))return {error:"Check customer, phone and date/time."};
  const {supabase,membership,user}=await requireMembership(dealerId);
  if(!membership||!canPrepare(membership.role))return {error:"Only the IT Super User may manage records."};
  const base={dealership_id:dealerId,customer_name:name,mobile,notes:note,created_by:user.id};
  let row:Record<string,string|boolean>={...base};
  if(kind==="callbacks"){
   const priority=value(data,"priority",12);
   if(!["low","medium","high"].includes(priority))return {error:"Invalid priority."};
   row={...base,requested_at:timestamp.toISOString(),priority,status:"pending",source:"manual"};
  }
  if(kind==="appointments"){
   const purpose=value(data,"purpose",200);
   if(purpose.length<2||purpose.length>200)return {error:"Enter the appointment purpose."};
   row={...base,appointment_at:timestamp.toISOString(),purpose,status:"requested",workshop_confirmed:false};
  }
  if(kind==="pickup-drop"){
   const pickup=value(data,"pickup_address",500),drop=value(data,"drop_address",500);
   if(pickup.length<5||pickup.length>500||drop.length<5||drop.length>500)return {error:"Enter complete pickup and drop addresses."};
   row={...base,requested_at:timestamp.toISOString(),pickup_address:pickup,drop_address:drop,status:"requested",workshop_confirmed:false};
  }
  const {error}=await supabase.from(TABLES[kind]).insert(row);
  if(error)return {error:"Unable to save record. Check database permissions and try again."};
  revalidatePath(PATHS[kind]);revalidatePath("/dashboard");return {ok:true};
 }catch{return {error:"Unable to save this record."};}
}
export async function updateWorkflow(data:FormData):Promise<{error?:string;ok?:boolean}>{
 try{
  const kind=String(data.get("kind")) as WorkflowKind;
  if(!(kind in TABLES))return {error:"Invalid workflow."};
  const dealerId=value(data,"dealership_id",36),id=value(data,"id",36),status=value(data,"status",24);
  if(!uuid.test(dealerId)||!uuid.test(id)||!((allowed[kind] as readonly string[]).includes(status)))return {error:"Invalid record or status."};
  const {supabase,membership}=await requireMembership(dealerId);
  if(!membership||!canPrepare(membership.role))return {error:"Only the IT Super User may manage records."};
  const needsVerified=kind!=="callbacks"&&["confirmed","in_progress","completed"].includes(status);
  const verification=data.get("verified")==="true";
  if(needsVerified&&!verification)return {error:"Workshop confirmation is required before marking a request confirmed or completed."};
  const patch:Record<string,string|boolean>={status};
  if(kind!=="callbacks"&&verification)patch.workshop_confirmed=true;
  const {data:updated,error}=await supabase.from(TABLES[kind]).update(patch).eq("id",id).eq("dealership_id",dealerId).select("id");
  if(error||!updated?.length)return {error:"Status could not be updated."};
  revalidatePath(PATHS[kind]);return {ok:true};
 }catch{return {error:"Status update failed."};}
}
