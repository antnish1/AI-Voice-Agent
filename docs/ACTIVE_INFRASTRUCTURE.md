# Active development infrastructure — 20 November 2026

## Connected Supabase Free project
- Project: **AI VOICE AGENT**
- Project ref: `kagzuxkeabiuswccxjme`
- URL: `https://kagzuxkeabiuswccxjme.supabase.co`
- Region: `ap-northeast-1` (Tokyo)
- Account connection: **Shahdolho Account / Sankalp (Free)**.
- Existing InsureIT and Parts Connect databases are **not involved**.
- Project status at connection: `ACTIVE_HEALTHY`. The screenshot showed a grace-period/quota banner; check the account's Usage/Billing page before depending on production service.
- Applied migrations: `frontier_voice_crm_initial_roles_and_campaigns`, then `frontier_voice_crm_index_and_policy_refinement`.
- Four application tables: `dealerships`, `memberships`, `customers`, `campaigns`. All have RLS enabled.
- Manager approvals: database trigger validates state transition, user role and dealership membership.
- Tests: temporary, rolled-back fixture users validated read isolation, CRM draft submission and denied CRM approval, manager approval. Test records were rolled back. No actual users provisioned.
- Security advisor: no findings after initial migration. Recheck after refinements.
- Project credentials: only modern **publishable** key used, stored as Vercel environment variable. Do not commit secrets or customer records.

## Connected Vercel project
- Vercel team: `antnish1s-projects` (same as InsureIT)
- Project: `frontier-ai-voice-crm`, project ID `prj_51k5pHkUt6ZRbcaf2kS798fT2KL9`
- Next.js; Node.js `24.x` configured.
- Development + preview environment variables configured: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `ENABLE_LIVE_CALLS=false` set for all three Vercel targets.
- **No Git auto-deployment, site deployment, production URL, or Sarvam calling enabled.**
- InsureIT's existing Vercel project and domains remain unchanged.

## Next tasks
- Create invited/test users and assign dealership membership, without public signup.
- Check account's quota/grace-period warning.
- Test end-to-end sign-in/session cookies and tenant policies against actual Supabase Auth users.
- Generate package lockfile and run Next.js build/tests.
- Finish immutable campaign cohort and version approval before enabling any Sarvam adapter.
- Before running Git auto-deploy, resolve commercial use rights on the Vercel plan and require user authorization.
