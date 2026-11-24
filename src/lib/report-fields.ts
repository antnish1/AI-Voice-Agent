export const REPORT_COLUMNS=["Customer Name","Mobile","Reg. No.","Model","Service Type","Call Status","Disposition","Appointment","Callback","Next Action","Service Due Date","Call Date & Time","Call Duration (seconds)","Current Mileage","Appointment Date & Time","Pickup & Drop","Complaint","Call Summary","AI Call Cost","Last Service Date","Last Reported Mileage","Last Follow up date","Last Follow up Remarks"] as const;
export const REPORT_VISIBLE_COUNT=10;
export type OperationalReport={id:string;values:string[];date:string;callId?:string;campaignId?:string};
export const textValue=(v:unknown)=>typeof v==="string"||typeof v==="number"?String(v):"";
export const phoneKey=(v:unknown)=>textValue(v).replace(/\D/g,"").replace(/^91(?=\d{10}$)/,"");
export function reportValues(input:string[],call:Record<string,unknown>|undefined,prospect:Record<string,unknown>|undefined,ops?:{appointment?:Record<string,unknown>;callback?:Record<string,unknown>;pickup?:Record<string,unknown>}):string[]{
 const p=prospect??{},c=call??{};
 const t=textValue;
 const a=ops?.appointment??{},b=ops?.callback??{},d=ops?.pickup??{};
 return [input[0]??"",input[1]||t(c.dialed_number),input[3]??"",input[2]??"",input[4]??"",t(c.status), "", t(a.status), t(b.requested_at),t(p.next_action),input[5]??"",t(c.started_at),t(c.duration_seconds),"",t(a.appointment_at),[t(d.status),t(d.requested_at),t(d.pickup_address),t(d.drop_address)].filter(Boolean).join(" | "),"",t(p.call_summary),"",input[6]??"",input[8]??"",input[9]??"",input[10]??""];
}
