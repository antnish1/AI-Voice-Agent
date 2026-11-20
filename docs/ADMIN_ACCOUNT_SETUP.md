# Account provisioning and real sign-in test plan

The Supabase project has **zero** authentication users. Staff accounts must never be invented or created with shared passwords.

## 1. Provision users in Supabase Auth

Project: `kagzuxkeabiuswccxjme` (AI VOICE AGENT, Shahdolho Account).
Open [Auth > Users](https://supabase.com/dashboard/project/kagzuxkeabiuswccxjme/auth/users) and invite the intended real email addresses using Supabase's supported Auth invite workflow (or an approved server-side admin API).
- At minimum: one **Super Admin** and one **Dealership Manager** account; recommend a third **CRM Executive** test account and another dealership-only account for cross-tenant checks.
- The person should complete the invite flow, set their own password and verify their email. No personal password should be shared with developers or put in code/GitHub.
- Public self-signup is deliberately omitted from the portal.
- For the no-deployment phase, don't enable redirects to an unverified production URL.

## 2. Assign roles (admin SQL only)

Query each account's **UUID** from Auth Users after it exists; never infer UUIDs from email or trust browser-supplied roles.
The existing dealership **Frontier MG Noida** is registered. To grant access, run this template only as an authorized SQL administrator, substituting verified UUIDs, not names or client inputs:

```sql
insert into public.memberships (user_id, dealership_id, role)
select
  '<verified-auth-user-uuid>'::uuid,
  d.id,
  'dealership_manager'
from public.dealerships d
where d.name = 'Frontier MG Noida'
on conflict (user_id, dealership_id)
do update set role = excluded.role;
```

For the Super Admin membership, use `'super_admin'` on at least one dealership and explicitly design cross-dealership privileges before assuming global access. Current RLS scopes all roles to their recorded dealership membership; **super_admin is not yet unrestricted across all dealerships**.

Do not grant roles through `user_metadata`, front-end form parameters, or client-side role switches. The membership table has no authenticated INSERT/UPDATE permission.

## 3. Test login

Run the Next.js portal locally once dependency installation and build pass, with `.env.local` containing the project URL and modern publishable key. Do not paste secrets into chat or commit them. Alternatively deploy only after the user explicitly authorizes deployment and its access controls are verified.

1. A non-invited account cannot sign in; there is no public signup form.
2. Invited users can sign in and sign out with independently set passwords.
3. User with no membership sees **No dealership access**, not another dealership's data.
4. CRM creates/submits a Draft; CRM cannot approve it by submitting server actions or direct database updates.
5. Dealership Manager can approve only pending campaigns from their assigned dealership.
6. A second dealership's customers/campaigns remain invisible, including direct PostgREST calls.
7. Explicit `ENABLE_LIVE_CALLS=false` remains set. No real call or Sarvam campaign may be created.
8. Session cookie survives refresh and expires/revokes appropriately.

## 4. Known implementation limits

- Next.js code is on draft PR #2, not main.
- The new Vercel project is configured with development/preview variables but is intentionally **not deployed**.
- Sarvam APIs, real uploads, contact snapshots, recordings, and immutable production approvals are not implemented.
- The current role assignment approach is admin SQL; build an authenticated Super Admin administration UI later after a hardened role-management API exists.
- Auth redirect URLs must be configured only for known, authorized development or hosting domains.
