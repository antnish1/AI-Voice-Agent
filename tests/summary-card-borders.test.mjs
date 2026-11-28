import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import {test} from "node:test";
const css=readFileSync(new URL("../src/app/summary-card-borders.css",import.meta.url),"utf8");
const theme=readFileSync(new URL("../src/app/frontier-premium-theme.css",import.meta.url),"utf8");
test("shared KPI geometry is imported and covers every existing summary family",()=>{
 const layout=readFileSync(new URL("../src/app/layout.tsx",import.meta.url),"utf8");
 assert.match(layout,/import "\.\/summary-card-borders\.css"/);
 for(const family of [".customers-stats>.customers-stat",".agent-stats-grid>.agent-stat-card",".reports-ref-kpis>.reports-ref-kpi",".calllogs-stats>.calllogs-stat",".approvals-stats>.approvals-stat",".docs-stats>.docs-stat",".fc-campaign-stats>.fc-count-card",".it-user-stats>article",".crm-ops-stats>div",".dashboard-separated-kpis>.ref-kpi-card"]) assert.ok(css.includes(family),family);
 for(const label of [".customers-stat>div>span:first-child",".agent-stat-card>div>span:first-child",".reports-ref-kpi>div>span:first-child",".calllogs-stat>div>span:first-child",".approvals-stat>div>span:first-child",".docs-stat>div>span:first-child",".fc-count-card>.fc-count-content>span:first-child",".it-user-stats>article>span",".crm-ops-stats>div>span",".dashboard-separated-kpis>.ref-kpi-card>.ref-kpi-label"]) assert.ok(css.includes(label),label);
 assert.match(css,/@layer kpi-border-geometry/);
 assert.match(css,/border-top-color:transparent!important/);
 assert.match(css,/background:transparent!important/);
 assert.match(css,/::before,[\s\S]*::after\{/);
 assert.match(css,/border-top:var\(--kpi-stroke-width,1px\)/);
});
test("Reports selected theme cannot reintroduce a continuous red top border",()=>{
 assert.doesNotMatch(theme,/border-top-color:\s*#(?:d71920|fb7185)\s*!important/i);
 assert.match(css,/--kpi-top-line:#d71920!important/);
 assert.match(css,/--kpi-top-line:#fb7185!important/);
});
