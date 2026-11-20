# Invitation redirect diagnosis and safe fix

## Observed issue (20 Nov 2026)
Clicking **Accept Invitation** on Android opened `http://localhost:3000`, which refused to connect. On an Android device `localhost` refers to that phone, not a remote Vercel app or the developer's computer.

Cause: the invitation was generated with a localhost redirect destination. Supabase's site URL commonly defaults to localhost during initial setup. The application was **not deployed**, and the previous Next.js foundation also lacked an invitation confirmation/password setup route. Neither failure means that the user's email or role membership is missing.

## Before sending more invitations
1. Deploy the approved application to a real HTTPS address only when authorized. The project's Vercel team exists, but it currently has **no deployment**.
2. In [Supabase Auth URL Configuration](https://supabase.com/dashboard/project/kagzuxkeabiuswccxjme/auth/url-configuration), change **Site URL** from localhost to the actual, verified HTTPS deployment origin. Add the exact origin/callback URL to **Redirect URLs**. Do not configure a hypothetical hostname or an InsureIT domain. Do not leave a broad production wildcard allowlist.
3. Use an invitation email template with the safe server-side token-hash callback, for example the intended link structure:
   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">Accept invitation</a>
   ```
   This requires a tested HTTPS deployment, a matching site URL, and a real Supabase template update in Authentication → Email Templates. Supabase's standard `{{ .ConfirmationURL }}` may also work but can redirect with session fragments; the server callback specifically expects `token_hash`.
4. Invite or resend to the affected users **after** fixing the configuration. Existing links with localhost embedded do not get retroactively corrected by editing Site URL.
5. The link verifies the invite and starts a session; `/set-password` requires a logged-in session and calls `auth.updateUser` to set the password. Test on Android as well as desktop.
6. Verify both actual users' confirmation state and RLS-scoped roles, keeping credentials private.

## Safety
- No live Vercel deployment or Sarvam calls should be performed merely to repair a link.
- Do not reuse an InsureIT URL or account secrets.
- Supabase Free warning regarding the quota/grace period is separate from this `ERR_CONNECTION_REFUSED`.
- Never paste invitation access tokens, token hashes, refresh tokens, or reset links into GitHub or ChatGPT.

## Code scope
New routes: `src/app/auth/confirm/route.ts`, `src/app/set-password/page.tsx`, `src/app/set-password/actions.ts`. They are necessary but not sufficient without a real HTTPS app and updated Supabase Site URL/email template.
