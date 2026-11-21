import {requireMembership} from "@/lib/auth";
import {CallbacksDirectory} from "./callbacks-directory";
export default async function Callbacks(){const {membership}=await requireMembership();if(!membership)return null;return <CallbacksDirectory/>;}