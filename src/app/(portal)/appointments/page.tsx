import {requireMembership} from "@/lib/auth";
import {AppointmentsDirectory} from "./appointments-directory";
export default async function Appointments(){const {membership}=await requireMembership();if(!membership)return null;return <AppointmentsDirectory/>;}
