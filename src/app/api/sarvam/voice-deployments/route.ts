import {NextResponse} from "next/server";
import {requireItSuperUser} from "@/lib/it-access";
import {requireProviderConfig} from "@/lib/sarvam/outbound-provider";

export const runtime="nodejs";
export const dynamic="force-dynamic";

type RecordValue=Record<string,unknown>;
const obj=(v:unknown):RecordValue|null=>v&&typeof v==="object"&&!Array.isArray(v)?v as RecordValue:null;
const str=(v:unknown)=>typeof v==="string"?v.trim():"";
const number=(v:unknown)=>typeof v==="number"&&Number.isInteger(v)&&v>0?v:null;
const validId=(v:string)=>/^[A-Za-z0-9_.-]{3,200}$/.test(v);
const validPhone=(v:string)=>/^\+[1-9]\d{7,14}$/.test(v);

async function fetchFromSarvam(path:string,key:string,base:string) {
 const response=await fetch(base+path,{method:"GET",headers:{"X-API-Key":key,"Accept":"application/json"},cache:"no-store",signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error(response.status===401||response.status===403?"AUTH":response.status===404?"WORKSPACE":response.status===429?"LIMIT":"PROVIDER");
 const result:unknown=await response.json();
 if(!obj(result))throw new Error("FORMAT");
 return obj(result)!;
}

export async function GET(request:Request) {
 try{
  const {supabase}=await requireItSuperUser();
  const dealer=new URL(request.url).searchParams.get("dealershipId")??"";
  if(!/^[a-f0-9-]{36}$/i.test(dealer))return NextResponse.json({ok:false,code:"DEALER",message:"Select a dealership first."},{status:400});
  const {data:dealership,error:dealerError}=await supabase.from("dealerships").select("id").eq("id",dealer).maybeSingle();
  if(dealerError||!dealership)return NextResponse.json({ok:false,code:"DEALER",message:"Dealership not found."},{status:404});
  let config:ReturnType<typeof requireProviderConfig>;
  try{config=requireProviderConfig();}
  catch{return NextResponse.json({ok:false,code:"CONFIG",message:"Sarvam workspace API key, organization ID or workspace ID is missing in this Vercel project."},{status:503,headers:{"Cache-Control":"no-store"}});}
  const {key,base,org,workspace}=config;
  const deploymentPath="/api/app-authoring/v1/orgs/"+org+"/workspaces/"+workspace+"/deployments";
  const deployments:RecordValue[]=[];
  let total=0;
  try{
   for(let offset=0;offset<500;offset+=100){
    const page=await fetchFromSarvam(deploymentPath+"?limit=100&offset="+offset,key,base);
    const items=page.items;
    if(!Array.isArray(items))throw new Error("FORMAT");
    const rows=items.map(obj).filter((item):item is RecordValue=>!!item);
    deployments.push(...rows);
    total=typeof page.total==="number"?page.total:deployments.length;
    if(rows.length<100||deployments.length>=total)break;
   }
  }catch(e){
   const code=e instanceof Error?e.message:"PROVIDER";
   const messages:Record<string,string>={
    AUTH:"Sarvam rejected this workspace API key. Check that the key belongs to the intended Sarvam organization and workspace.",
    WORKSPACE:"The configured Sarvam organization/workspace was not found. Verify the IDs in this Vercel environment.",
    LIMIT:"Sarvam rate limit reached. Retry after a short interval.",
    FORMAT:"Sarvam returned an unexpected deployment list. No settings have been changed.",
    PROVIDER:"Unable to read Sarvam deployments. No settings have been changed."
   };
   return NextResponse.json({ok:false,code,message:messages[code]??messages.PROVIDER},{status:503,headers:{"Cache-Control":"no-store"}});
  }
  const outbound=deployments.filter(d=>["outbound","inbound_outbound"].includes(str(d.channel_direction).toLowerCase()));
  const active=outbound.filter(d=>str(d.status).toLowerCase()==="active");
  const candidates=active.slice(0,30);
  const options: Array<{deploymentId:string;label:string;agentId:string;version:number;connectionId:string;callerNumber:string}>=[];
  for(const item of candidates){
   const id=str(item.deployment_id),appId=str(item.app_id),version=number(item.app_version);
   if(!id||!validId(appId)||!version)continue;
   let detail=item;
   try{
    const fetched=await fetchFromSarvam(deploymentPath+"/"+encodeURIComponent(id),key,base);
    detail=fetched;
   }catch{continue;} // Incomplete deployments must never be treated as verified.
   const connections=Array.isArray(detail.connection_configs)?detail.connection_configs.map(obj).filter((v):v is RecordValue=>!!v):[];
   for(const connection of connections){
    const connectionId=str(connection.connection_id);
    const phones=Array.isArray(connection.phone_numbers)?connection.phone_numbers.map(str):[];
    const callerNumber=phones.find(validPhone);
    if(!validId(connectionId)||!callerNumber)continue;
    options.push({
     deploymentId:id,label:str(detail.name)||appId,
     agentId:appId,version,
     connectionId,callerNumber
    });
   }
  }

  // Outbound campaigns do not require an inbound deployment. Read back only
  // previously accepted, linked campaigns belonging to the selected dealership.
  const {data:links,error:linksError}=await supabase.from("voice_campaign_launches").select("campaign_id,sarvam_campaign_id").eq("dealership_id",dealer).eq("state","cohort_completed").not("sarvam_campaign_id","is",null).order("updated_at",{ascending:false}).limit(15);
  const historical:typeof options=[];
  let readFailures=0;
  if(!linksError)for(const link of links??[]){
   const id=str(link.sarvam_campaign_id);
   if(!validId(id))continue;
   try{
    const record=await fetchFromSarvam("/api/scheduling/v1/orgs/"+org+"/workspaces/"+workspace+"/campaigns/"+encodeURIComponent(id),key,base);
    const app=obj(record.app_config);
    if(!app)continue;
    const agentId=str(app.app_id),version=number(app.app_version);
    if(!validId(agentId)||!version)continue;
    const connections=Array.isArray(app.connection_configs)?app.connection_configs.map(obj).filter((v):v is RecordValue=>!!v):[];
    for(const connection of connections){
     const connectionId=str(connection.connection_id);
     if(!validId(connectionId))continue;
     const phones=Array.isArray(connection.phone_numbers)?connection.phone_numbers.map(str).filter(validPhone):[];
     for(const callerNumber of phones){
      if(historical.some(x=>x.agentId===agentId&&x.version===version&&x.connectionId===connectionId&&x.callerNumber===callerNumber))continue;
      historical.push({deploymentId:"campaign:"+id,label:(str(record.name)||"Previous outbound campaign")+" (previously accepted)",agentId,version,connectionId,callerNumber});
     }
    }
   }catch{readFailures++;}
  }
  if(historical.length)return NextResponse.json({ok:true,code:"outbound_history",message:"Found previous outbound calling configurations for this dealership. Select one to reuse; confirm that the agent version and number are still available before activation.",options:historical},{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
  if(!options.length)return NextResponse.json({ok:true,code:"manual_required",message:linksError||readFailures?"Could not read previous outbound settings. Enter the committed agent ID, version, connection ID and caller number manually. No deployment is required.":"No reusable outbound configuration was found for this dealership. Enter the committed agent ID, version, connection ID and caller number manually. No deployment is required.",options:[]},{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
  let code="ready",message="Choose a verified outbound deployment to pre-fill these fields. Check everything before saving.";
  if(!deployments.length){code="no_deployments";message="Sarvam returned no deployments in this workspace. An existing draft agent does not count as a deployment. For outbound campaigns, you can still enter a committed agent version and verified telephony details manually.";}
  else if(!outbound.length){code="no_outbound";message="Sarvam returned "+deployments.length+" deployments, but none are outbound-capable. Outbound campaigns can use a separately committed agent and connected phone number; enter those verified details manually.";}
  else if(!active.length){code="inactive";message="Outbound deployments exist, but none are active. Verify their status in Sarvam; nothing has been activated.";}
  else if(!options.length){code="incomplete";message="Active outbound deployments were found, but no complete verified connection ID and caller number could be read. You can still enter the verified details manually.";}
  return NextResponse.json({
   ok:true,code,message,counts:{total,scanned:deployments.length,outbound:outbound.length,active:active.length,verified:options.length},
   options
  },{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
 }catch{return NextResponse.json({ok:false,code:"ACCESS",message:"Only the authorized IT Super User can import Sarvam settings."},{status:403,headers:{"Cache-Control":"no-store"}});}
}
