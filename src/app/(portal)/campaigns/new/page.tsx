import {requireMembership,canPrepare} from "@/lib/auth";
import {redirect} from "next/navigation";
import {CampaignWizard} from "../wizard";
export default async function NewCampaign(){const {membership}=await requireMembership();if(!membership||!canPrepare(membership.role))redirect("/campaigns");return <><div className="page-head"><div><p className="eyebrow">CAMPAIGNS / CREATE</p><h1>New campaign</h1><p>Prepare your outbound campaign in four guided steps.</p></div></div><CampaignWizard dealershipId={membership.dealership_id}/></>}