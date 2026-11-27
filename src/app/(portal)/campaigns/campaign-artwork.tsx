/** Original artwork extracted from the checked-in archive during build. */
export function CampaignArtwork({kind,className=""}:{kind:"hero"|"all"|"ongoing"|"pending"|"hold"|"reject";className?:string}){
 const assets={hero:"dashboard-hero",all:"campaigns-megaphone",ongoing:"active-campaigns-play",pending:"scheduled-campaigns-calendar",hold:"campaign-hold",reject:"campaign-rejected"};
 return <span aria-hidden="true" className={"fc-3d-art fc-3d-"+kind+" "+className}><img src={"/assets/artwork/"+assets[kind]+".webp"} alt="" width={80} height={80}/></span>;
}
