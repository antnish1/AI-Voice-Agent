import type {ReactNode} from "react";

/** The callback management workspace starts immediately below the global CRM navigation. */
export function CallbacksDirectory({children}:{children:ReactNode}){
 return <div className="cb-reference">{children}</div>;
}
