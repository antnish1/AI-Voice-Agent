import "server-only";
import {requireProviderConfig,sarvamGet} from "./outbound-provider";
import {normalizeTranscript,originalMessages,preferTranscript} from "./transcript";
export async function recoverTranscript(agent:unknown,interaction:unknown,stored:unknown){
 const previous=normalizeTranscript(stored);
 if(previous.length&&previous.every(t=>t.indic_text))return previous;
 if(typeof agent!=="string"||typeof interaction!=="string"||!agent||!interaction||agent.length>256||interaction.length>256)return previous;
 try{
  const {org,workspace}=requireProviderConfig();
  const response=await sarvamGet("/api/analytics/v1/"+org+"/"+workspace+"/"+encodeURIComponent(agent)+"/transcripts/"+encodeURIComponent(interaction));
  if(response.interaction_id!==interaction)return previous;
  const recovered=originalMessages(response,previous);
  return preferTranscript(previous,recovered);
 }catch{return previous;}
}
