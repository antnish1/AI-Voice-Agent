/** Optimized image sprite: four original 3D-style WebP crops embedded into a local SVG.
 * All visuals are decorative to the CRM workflow; no external requests or credentials.
 */
export function CampaignArtwork({kind,className=""}:{kind:"hero"|"all"|"ongoing"|"pending";className?:string}){
 const titles={hero:"Campaign megaphone artwork",all:"Total campaigns artwork",ongoing:"Ongoing campaigns artwork",pending:"Pending campaigns artwork"};
 return <span role="img" aria-label={titles[kind]} className={"fc-3d-art fc-3d-"+kind+" "+className}/>;
}
