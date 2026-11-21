import {requireMembership,canPrepare} from "@/lib/auth";
import {redirect} from "next/navigation";
import Campaigns from "../page";
import {CampaignWizard} from "../wizard";
export default async function NewCampaign(){const {membership}=await requireMembership();if(!membership||!canPrepare(membership.role))redirect("/campaigns");return <><Campaigns/><CampaignWizard dealershipId={membership.dealership_id}/></>}
