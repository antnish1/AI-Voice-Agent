export const campaignStatuses=["Pending","Ongoing","Complete","Hold","Reject"] as const;
export type CampaignDisplayStatus=typeof campaignStatuses[number];
export function campaignDisplayStatus(status:string,provider?:string|null):CampaignDisplayStatus{
 if(status==="REJECTED"||provider==="cancelled"||provider==="canceled")return "Reject";
 if(provider==="completed"||status==="COMPLETED")return "Complete";
 if(status==="PAUSED"||provider==="paused")return "Hold";
 if(["active","scheduled","in_progress"].includes(provider??"")||status==="ACTIVE")return "Ongoing";
 return "Pending";
}
