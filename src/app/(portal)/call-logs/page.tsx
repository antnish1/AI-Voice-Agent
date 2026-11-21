import {requireMembership} from "@/lib/auth";
import {CallLogsDirectory} from "./call-logs-directory";
export default async function CallLogs(){const {membership}=await requireMembership();if(!membership)return null;return <CallLogsDirectory/>;}
