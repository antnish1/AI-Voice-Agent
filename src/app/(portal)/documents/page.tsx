import {requireMembership,canPrepare} from "@/lib/auth";
import {DocumentsClient} from "./documents-client";
export default async function Documents(){const {membership}=await requireMembership();if(!membership)return null;return <DocumentsClient dealershipId={membership.dealership_id} canManage={canPrepare(membership.role)}/>;}