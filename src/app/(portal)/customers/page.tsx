import {CustomersDirectory} from "./customers-directory";
import {loadCustomers} from "./customer-data";
export default async function Customers({searchParams}:{searchParams:Promise<{q?:string;page?:string;campaign?:string;dealer?:string}>}){const data=await loadCustomers(await searchParams);return data?<CustomersDirectory {...data}/>:null;}
