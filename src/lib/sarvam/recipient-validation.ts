export type PreparedRecipients={headers:string[];csv:string;total:number;eligible:number;excluded:number;users:Array<{user_phone_number:string;user_identifier:string;app_variables:Record<string,string>}>};
export function normalizePhone(raw:string):string|null{
 const cleaned=raw.trim().replace(/[\s().-]/g,"");
 if(/^[6-9]\d{9}$/.test(cleaned))return "+91"+cleaned;
 if(/^91[6-9]\d{9}$/.test(cleaned))return "+"+cleaned;
 if(/^\+[1-9]\d{7,14}$/.test(cleaned))return cleaned;
 return null;
}
export function parseCSV(value:string):string[][]{
 const rows:string[][]=[];let row:string[]=[],cell="",quoted=false;
 const data=value.replace(/^\uFEFF/,"");
 for(let i=0;i<data.length;i++){
  const c=data[i];
  if(c==='"'){if(quoted&&data[i+1]==='"'){cell+='"';i++;}else if(quoted){quoted=false;}else if(!cell){quoted=true;}else throw Error("Malformed CSV quotation");}
  else if(c===","&&!quoted){row.push(cell);cell="";}
  else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&data[i+1]==="\n")i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell="";}
  else cell+=c;
 }
 if(quoted)throw Error("Unclosed CSV quotation");
 row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
 return rows;
}
export function prepareRecipients(text:string,options:{phoneColumn:string;consentColumn:string;dncColumn:string;variableMapping?:Record<string,string>}):PreparedRecipients{
 const records=parseCSV(text);
 if(records.length<2||records.length>251)throw Error("Supply 1–250 recipient rows with headers.");
 const headers=records[0].map(x=>x.trim());
 if(headers.some(x=>!x||x.length>100)||new Set(headers).size!==headers.length)throw Error("CSV headers must be unique and nonempty.");
 for(const key of [options.phoneColumn,options.consentColumn,options.dncColumn])if(!headers.includes(key))throw Error("Missing required column: "+key);
 const idx=options.phoneColumn,ci=options.consentColumn,di=options.dncColumn;
 const mapping=options.variableMapping??{};
 if(Object.keys(mapping).length>30||Object.entries(mapping).some(([k,v])=>! /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(k)||!headers.includes(v)||[idx,ci,di].includes(v)))throw Error("Agent variable mapping is invalid.");
 const seen=new Set<string>(),users:PreparedRecipients["users"]=[],sanitized:string[][]=[headers];
 const accepted=new Set(["yes","true","1","opted_in","consented"]);
 const denied=new Set(["no","false","0",""]);
 for(let i=1;i<records.length;i++){
  const row=records[i];if(row.length!==headers.length)throw Error("Row "+(i+1)+" has a different number of columns.");
  const values=Object.fromEntries(headers.map((h,j)=>[h,row[j].trim().slice(0,500)]));
  const number=normalizePhone(values[idx]);
  if(!number||seen.has(number)||!accepted.has(values[ci].toLowerCase())||!denied.has(values[di].toLowerCase()))continue;
  seen.add(number);values[idx]=number;
  const app_variables:Record<string,string>={};
  for(const [agentField,column] of Object.entries(mapping))app_variables[agentField]=values[column];
  users.push({user_phone_number:number,user_identifier:"frontvox-"+String(i).padStart(4,"0"),app_variables});
  sanitized.push(headers.map(h=>values[h]));
 }
 if(!users.length)throw Error("No eligible consented recipients remain after validation and DNC suppression.");
 const escape=(s:string)=>/[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
 return {headers,csv:sanitized.map(row=>row.map(escape).join(",")).join("\r\n")+"\r\n",total:records.length-1,eligible:users.length,excluded:records.length-1-users.length,users};
}
