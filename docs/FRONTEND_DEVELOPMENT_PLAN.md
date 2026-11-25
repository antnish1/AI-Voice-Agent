# Frontier Voice CRM — Approved Frontend/Backend Development Plan

**Status:** Approved project requirements; implementation phased. **Only Frontier Group dealerships.**

## Product
A new standalone dealership login portal replacing dealership reliance on the Sarvam dashboard for daily campaign operations. Sarvam remains voice and telephony engine. Shared agents and dealership-specific agents; agent publication centrally managed. User approves **manager approval required before any live campaign**. Upload customer lists via CSV/XLSX. Complete initial target: recordings, transcripts, callbacks, appointments, pickup/drop, complaints and reports.

## User roles
**Super Admin:** all dealerships, integrations, agents, user/access setup, group reporting. **Dealership Manager:** own dealership, reviews/approves campaigns and manages work. **CRM Executive:** imports data, drafts campaigns, submits for approval, handles authorized operational follow-ups. **Service Team:** assigned appointments, pickup/drop, complaints and callbacks. **Management:** read-only dashboards/reports with assigned dealership scope. All permissions checked server-side and in RLS; UI visibility is not authorization.

## Primary navigation
Dashboard; Customers; Uploads; Campaigns; Approvals; AI Agents; Call Logs; Appointments; Callbacks; Pickup & Drop; Complaints; Reports; Users/Settings (role-gated).

## End-to-end workflow
1. Authenticate -> resolve exact dealership and role.
2. Upload CSV/XLSX -> map columns -> validate phone, missing data, duplicate customer-vehicle relationship, consent and suppression -> row-level error preview.
3. Create Draft -> select agent/version, dealership, campaign type, immutable contact cohort, date/time window, retry settings and limits.
4. Submit for manager approval -> lock cohort + schedule + agent snapshot -> manager reviews and approves or rejects with reason.
5. Approved backend action only -> Sarvam API creates/schedules/launches campaign; preserve external IDs; never let client call Sarvam using secrets.
6. Signed webhook ingestion -> idempotent call attempts, results, recording metadata/transcript and output variables; reconcile missing events.
7. Translate call outcomes into staff tasks: appointments, callbacks, pickup/drop, complaints. Distinguish REQUESTED from CONFIRMED.
8. Reports/exports -> real metrics only, traceable to calls; dealership isolation and audit logs.

### Campaign states
DRAFT -> PENDING_MANAGER_APPROVAL -> APPROVED -> SCHEDULED/ACTIVE -> PAUSED/COMPLETED/CANCELLED. REJECTED returns for edit and resubmission. Material edits invalidate approval. Deny actual Sarvam creation prior to valid approval because scheduled creation may start dial at scheduled time. Employ approval snapshot hash and transactional server checks.

## Data architecture
Dedicated Supabase project: organizations/dealerships, users, memberships, ai_agents, agent_versions, agent_assignments, customers, vehicles, customer_vehicles, uploads, upload_rows, mapping_templates, campaigns, cohort records, approvals, call_attempts, call_results, output_variables, tasks, appointments, callbacks, pickup_drop_requests, complaints, audit_logs, integration_events. Strong tenant foreign-key consistency, RLS, server-only writes to sensitive tables and encrypted secret references. Phone and registration fields are text to preserve zeroes.

## UI requirements
Compact responsive, desktop-first professional dealership experience. Honest empty states; no fake operational stats. Central dashboard with status totals and filters dealership/date/agent/campaign. Customer records searchable and filtered. Upload mapping wizard and error report. Campaign wizard with approval summary. Call details show audio control, transcript, extracted variables and actions. Assigned task queues support transitions and comments. Management reports export Excel/CSV with underlying outcomes.

## Integration approach
Confirm actual Sarvam account access, workspace topology, caller numbers, agent version metadata, campaign create/modify/pause behavior, signed webhooks, recordings, call transcripts, token lifetimes, rate limits and billing. Keep integration adapter isolated from business domain. Use durable jobs with retry/backoff; verify webhook signature and idempotency. Signed recording access server-side. Live launch gated by default-deny `ENABLE_LIVE_CALLS=false`, approval, eligible contacts, calling window and business authorization. No speculative direct write endpoints.

## Technology
Recommended: Next.js/TypeScript/Tailwind (production web), standalone Supabase Auth/Postgres/RLS/Storage, Vercel deployment after approval, server-side Sarvam API adapter and signed webhook handlers, durable worker/queue, n8n only for optional noncritical automation.

## Security and compliance
Public repository holds no customer data, private recording links, API keys or production configuration. Tenant isolation through role mapping plus database RLS; test cross-dealership data exfiltration. Require logged approvals and immutable snapshots. Contact eligibility, consent, DNC, calling restrictions, recording access and retention controls. Lock down API rate limiting, file parser size, accepted types, malicious formulas/CSV injection, imports and structured logs.

## Roadmap / acceptance
**1 Foundation:** standalone repo, real login, RLS, permissions, audit.
**2 Customer data:** secure Excel/CSV import and mappings, dedup, relationship records.
**3 Campaigns:** verified Sarvam adapter, approved agent listing, drafts, immutable manager approval, schedule/pause/launch.
**4 Call intelligence:** result webhooks, recordings, transcripts, output extraction and reconciliation.
**5 CRM:** appointments, callbacks, pickups, complaints, task assignment, notifications.
**6 Reporting and rollout:** filters, exports, QA, security/regression, Frontier MG Noida pilot then other Frontier Group dealerships.

Acceptance: CRM can upload -> correct -> prepare -> obtain manager approval -> safely launch -> view actual recordings/outcomes -> assign tasks -> export report, without visiting Sarvam. No dealership leakage; no unapproved dialing; no fabricated confirmations.

## Prototype vs production boundary
Initial interactive browser prototype is not Next.js, has simulated roles and uses localStorage. It is **not** safe for real customer lists. Production scope above is the committed target, not a claim of implemented features. No Supabase project or live Sarvam integration is created by documentation alone.
