export const REPORT_COLUMNS=["Customer Name","Mobile","Reg. No.","Model","Service Type","Call Status","Disposition","Appointment","Callback","Next Action","Service Due Date","Call Date & Time","Call Duration (seconds)","Current Mileage","Appointment Date & Time","Pickup & Drop","Complaint","Call Summary","AI Call Cost","Last Service Date","Last Reported Mileage","Last Follow up date","Last Follow up Remarks"] as const;
export const REPORT_VISIBLE_COUNT=10;
export const REPORT_TABLE_INDICES=[0,1,2,3,4,5,6,7,8,9,17] as const;
export type OperationalReport={id:string;values:string[];date:string;callId?:string;agentId?:string;agentName?:string;agentVersion?:string;campaignId?:string;dealershipId?:string};
export const textValue=(v:unknown)=>typeof v==="string"||typeof v==="number"||typeof v==="boolean"?String(v):"";
export const phoneKey=(v:unknown)=>textValue(v).replace(/\D/g,"").replace(/^91(?=\d{10}$)/,"");
export function reportValues(input:string[],call:Record<string,unknown>|undefined,prospect:Record<string,unknown>|undefined,ops?:{appointment?:Record<string,unknown>;callback?:Record<string,unknown>;pickup?:Record<string,unknown>}):string[]{
 const p=prospect??{},c=call??{};
 const t=textValue;
 const a=ops?.appointment??{},b=ops?.callback??{},d=ops?.pickup??{};
 const vars=c.output_variables&&typeof c.output_variables==="object"&&!Array.isArray(c.output_variables)?c.output_variables as Record<string,unknown>:{};
 const get=(key:string)=>t(vars[key]);
 const yes=(key:string)=>get(key).toLowerCase()==="true";
 const appointment=get("appointment_confirmation_status")||(yes("appointment_requested")?"Requested":"");
 const callback=get("callback_preferred_datetime")||(yes("callback_required")?"Requested":"");
 const pickupRequested=yes("pickup_drop_requested")||yes("pickup_drop_required")||yes("pickup_required")||["REQUESTED","REQUEST_INCOMPLETE","REQUEST_COMPLETE","CONFIRMED"].includes(get("pickup_drop_request_status").toUpperCase());
 const pickup=pickupRequested?[get("pickup_drop_request_status"),"Requested",get("pickup_preferred_date"),get("pickup_preferred_time"),get("pickup_address"),get("drop_address")].filter(Boolean).join(" | "):"";
 const complaint=[yes("complaint_reported")?"Reported":"",get("complaint_category"),get("complaint_description")].filter(Boolean).join(" | ");
 const cost=[get("usage_cost")&&"Usage: "+get("usage_cost"),get("telephony_cost")&&"Telephony: "+get("telephony_cost")].filter(Boolean).join(" | ");
 return [get("customer_name")||input[0]||"",t(c.dialed_number)||input[1]||get("phone_number"),get("registration_number")||input[3]||"",get("vehicle_model")||input[2]||"",get("service_type")||input[4]||"",t(c.status),get("call_disposition"),t(a.status)||appointment,t(b.requested_at)||callback,get("next_sales_followup_action")||t(p.next_action),get("next_service_due_date")||input[5]||"",t(c.started_at),get("duration_exact_seconds")||t(c.duration_seconds),get("current_mileage"),t(a.appointment_at)||[get("appointment_preferred_date"),get("appointment_preferred_time")].filter(Boolean).join(" "),[t(d.status),t(d.requested_at),t(d.pickup_address),t(d.drop_address)].filter(Boolean).join(" | ")||pickup,complaint,get("call_summary")||t(p.call_summary),cost,get("last_service_date")||input[6]||"",get("last_reported_mileage")||input[8]||"",get("last_followup_date")||input[9]||"",get("last_followup_remarks")||input[10]||""];
}
