import {normalizePhone} from "./recipient-validation";
import {RECIPIENT_TEMPLATE_HEADERS,LEGACY_RECIPIENT_HEADERS,RECIPIENT_BOOLEAN_HEADERS} from "./recipient-template";
export const SERVICE_INPUT_HEADERS=LEGACY_RECIPIENT_HEADERS;
const generated=["dealership_brand","vehicle_manufacturer","dealership_location","service_schedule_verified","free_service_eligible","free_service_expiry_date","free_service_terms_verified","warranty_terms_verified","customer_address","service_due_km","warranty_active","time_due_verified","authorized_contact_for_crm","free_expiry_wording_approved","approved_price_range","call_plus_3_date","call_plus_7_date"];
const brands=["Volkswagen","Skoda","Škoda","Honda","Kia","MG","Tata","JCB","Hyundai","Mahindra","Toyota","Maruti Suzuki"];
export function enrichServiceRecipients(rows:string[][],dealerName:string,blocked:Set<string>){
 const input=rows[0]?.map(x=>x.trim())??[];
 const full=input.includes("user_phone_number");
 const required=full?RECIPIENT_TEMPLATE_HEADERS:LEGACY_RECIPIENT_HEADERS;
 if(rows.length<2||rows.length>251||new Set(input).size!==input.length||required.some(h=>!input.includes(h)))throw Error("Recipient CSV must contain the 27-column template (or legacy 10-column template) and 1–250 rows.");
 const manufacturer=brands.find(b=>new RegExp("\\b"+b+"\\b","i").test(dealerName))??"";
 const brand=/^Frontier\b/i.test(dealerName)?"Frontier":"";
 const location=brand&&manufacturer?dealerName.replace(/^Frontier\s+/i,"").replace(manufacturer,"").trim():"";
 const headers=[...SERVICE_INPUT_HEADERS,...generated,"consent","do_not_call"];
 const values=rows.slice(1).map(row=>{
  if(row.length!==input.length)throw Error("Recipient CSV row has incorrect column count.");
  const v:Record<string,string>=Object.fromEntries(RECIPIENT_TEMPLATE_HEADERS.map(h=>[h,row[input.indexOf(h)]?.trim()??""]));
  v.phone_number=row[input.indexOf(full?"user_phone_number":"phone_number")]?.trim()??"";
  for(const h of RECIPIENT_BOOLEAN_HEADERS){if(v[h]){const flag=v[h].toUpperCase();if(flag!=="TRUE"&&flag!=="FALSE")throw Error("Invalid recipient column "+h+": select TRUE or FALSE only.");v[h]=flag;}}
  const number=normalizePhone(v.phone_number);
  const allowed=!!number&&!blocked.has(number);
  const fields:Record<string,string>={...v,dealership_brand:brand,vehicle_manufacturer:manufacturer,dealership_location:location,service_schedule_verified:"FALSE",free_service_eligible:"FALSE",free_service_expiry_date:"",free_service_terms_verified:"FALSE",warranty_terms_verified:"FALSE",customer_address:"",service_due_km:"",warranty_active:"FALSE",time_due_verified:"FALSE",authorized_contact_for_crm:allowed?"TRUE":"FALSE",free_expiry_wording_approved:"FALSE",approved_price_range:"",call_plus_3_date:"",call_plus_7_date:"",consent:allowed?"TRUE":"FALSE",do_not_call:allowed?"FALSE":"TRUE"};
  // Only preserve uploaded verified CRM inputs; dealership identity, consent and date offsets remain server-controlled.
  if(full){for(const h of RECIPIENT_TEMPLATE_HEADERS){if(["user_phone_number","dealership_brand","vehicle_manufacturer","dealership_location","authorized_contact_for_crm","call_plus_3_date","call_plus_7_date"].includes(h))continue;if(v[h])fields[h]=v[h];}}
  return headers.map(h=>fields[h]??"");
 });
 const escape=(s:string)=>/[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
 return {csv:[headers,...values].map(row=>row.map(escape).join(",")).join("\r\n")+"\r\n",mapping:Object.fromEntries(headers.filter(h=>!["phone_number","consent","do_not_call"].includes(h)).map(h=>[h,h]))};
}
export function followUpDate(iso:string,days:number){
 const value=new Date(iso+"T00:00:00Z");
 if(!Number.isFinite(value.getTime()))throw Error("Invalid recipient schedule date.");
 value.setUTCDate(value.getUTCDate()+days);
 return value.toISOString().slice(0,10);
}
