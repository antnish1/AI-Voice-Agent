"use client";

import { useEffect } from "react";

/**
 * Progressive enhancement for server-rendered pages and existing tables.
 * Preserves semantic HTML, data-fetching, event handlers, and SSR content.
 * DOM is never replaced or re-sorted, and reduced motion disables reveals.
 */
const reveal = [
  ".ref-dashboard-heading", ".ref-kpi-card", ".ref-dashboard-panel",
  ".page-head", ".crm-panel", ".metric-card", ".ref-quick-action",
  ".agent-card", ".agent-hero-banner", ".agent-card-grid",
  ".campaigns-ref-card", ".campaigns-stat", ".approvals-ref-card",
  ".customers-ref-stat", ".customers-ref-card", ".customers-stat", ".customers-list-panel", ".customers-mini-card", ".unified-summary-card",
  ".appointments-stat", ".callbacks-stat", ".pickup-ref-stat",
  ".calllogs-stat", ".calllogs-chart-card", ".reports-ref-chart",
  ".reports-ref-kpi", ".reports-ref-table-card", ".settings-ref-card",
  ".settings-ref-hero", ".documents-ref-card", ".users-ref-card",
  ".ref-recent-campaigns", ".ref-activity-item",
  
  
  ".agent-preview-modal", ".customers-modal", ".settings-ref-modal",
].join(",");

const elevation = [
  ".ref-kpi-card", ".ref-dashboard-panel", ".ref-quick-action",
  ".metric-card", ".agent-card", ".crm-panel", ".calllogs-stat",
  ".reports-ref-kpi", ".settings-ref-card", ".customers-ref-card", ".customers-stat", ".unified-summary-card", ".customers-mini-card"
].join(",");

export function MotionEnhancements({route,enabled}:{route:string;enabled:boolean}){
  useEffect(()=>{
    if(typeof window==="undefined")return;
    const parent=document.querySelector<HTMLElement>(".frontier-motion-route");
    if(!parent)return;
    if(!enabled){parent.querySelectorAll<HTMLElement>("[data-motion-ready]").forEach(el=>{delete el.dataset.motionReady;delete el.dataset.motionVisible;});return;}
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let index=0;
    const observer=reduced||typeof IntersectionObserver==="undefined"?null:new IntersectionObserver(entries=>{
      entries.forEach(e=>{if(e.isIntersecting){const el=e.target as HTMLElement;el.dataset.motionVisible="true";observer?.unobserve(el);}});
    },{threshold:.06,rootMargin:"0px 0px -24px 0px"});
    const register=()=>{
      parent.querySelectorAll<HTMLElement>(reveal).forEach(el=>{
        if(el.dataset.motionReady)return;
        el.dataset.motionReady="true";
        el.style.setProperty("--motion-order",String(index++%8));
        if(reduced||!observer){el.dataset.motionVisible="true";return;}
        // Never hide anything until it is observed and safely available.
        observer.observe(el);
      });
      parent.querySelectorAll<HTMLElement>(elevation).forEach(el=>el.classList.add("frontier-motion-lift"));
    };
    register();
    let frame=0;const mutation=new MutationObserver(()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;register();});});
    mutation.observe(parent,{childList:true,subtree:true});
    return ()=>{observer?.disconnect();mutation.disconnect();if(frame)cancelAnimationFrame(frame);parent.querySelectorAll<HTMLElement>("[data-motion-ready]").forEach(el=>{el.dataset.motionVisible="true";});};
  },[route,enabled]);
  return null;
}
