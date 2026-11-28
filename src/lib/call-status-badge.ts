/** Shared solid call-outcome badge palette. Chart palettes are independent. */
const badgeColors:Record<string,string>={answered:"#087A54",failed:"#C72C41",busy:"#195BB7",no_answer:"#7840B7",other:"#526477",cancelled:"#785765"};
export function callStatusBadgeColor(status:string):string {
 return badgeColors[status]??badgeColors.other;
}
