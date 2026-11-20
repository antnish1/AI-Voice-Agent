# Next.js + Supabase production foundation (development, not deployed)

## Setup
1. Create a NEW Supabase project dedicated to Frontier AI Voice CRM; do NOT use any existing InsureIT database.
2. Review and run `db/production-foundation.sql` against that project in a controlled environment; validate RLS, grants, and tests before real records.
3. Create invited users in Supabase Auth (no public sign-up), then manually assign their UUID and dealership UUID to `memberships` using an administrator-only SQL session. The SQL does not create users or seed passwords.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in local `.env.local`; never commit it. Leave `ENABLE_LIVE_CALLS=false`.
5. Run `npm install`, `npm run lint`, `npm test`, `npm run build`, then `npm run dev`. Resolve lockfile and dependency security updates before deployment. No package installation/build has been completed in the ChatGPT runtime due to unavailable registry network access.
6. Invite a test CRM and Manager account in the same dealership and a CRM user in another dealership; test cross-tenant isolation, CRM draft submission and manager decision. Test that CRM can't approve and nobody can launch.

## Scope delivered
- Next.js App Router, Supabase SSR cookie session refresh, email/password sign-in and sign-out.
- Server-rendered authenticated dealership workspace with real empty states.
- RLS-scoped membership, customer and campaign queries.
- CRM/Manager/Super Admin draft creation and submission; only Manager/Super Admin approve/reject, enforced at both actions and Postgres RLS/column grants.
- SQL schema is conservative: direct API writes to customers are disabled; campaign updates limited to state changes, sensitive tables read-only or inaccessible.

## Critical limits
- No project provisioned or database migrations applied; this is reviewable code, not a running deployment.
- Account onboarding admin flow, full multi-dealership switcher, uploads, actual cohort snapshots, version/hash locks, real Sarvam calls and webhooks are still pending. **Never launch a campaign based solely on this simplified approval status; it is not an immutable approved cohort.**
- Legacy `web/` remains a local-only prototype, separate from the new `src/` production foundation.
