import {requireMembership} from "@/lib/auth";
import {PickupDropDirectory} from "./pickup-drop-directory";
export default async function PickupDrop(){const {membership}=await requireMembership();if(!membership)return null;return <PickupDropDirectory/>;}