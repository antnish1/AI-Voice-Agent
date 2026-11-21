/**
 * Shared portal loading state — never displays fabricated operational metrics.
 * Next.js shows this only while a server-rendered route is being resolved.
 */
export default function Loading() {
 return <section className="frontier-page-skeleton" role="status" aria-live="polite" aria-label="Loading page">
   <div className="frontier-skeleton-breadcrumb"/><div className="frontier-skeleton-heading"/>
   <div className="frontier-skeleton-metrics">{Array.from({length:4},(_,i)=><div key={i} className="frontier-skeleton-card"><i/><b/><span/></div>)}</div>
   <div className="frontier-skeleton-panels"><div/><div/></div>
   <span className="sr-only">Loading dealership page</span>
 </section>;
}
