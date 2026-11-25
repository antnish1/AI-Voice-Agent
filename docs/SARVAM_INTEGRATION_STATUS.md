# Frontier Voice CRM — Operational integration status (21 November 2026)

## Implemented now
- Production CRM user/dealership authentication, IT-only user provisioning and view-only dealership roles.
- Real dealership-scoped appointments, callbacks and pickup/drop requests in Supabase with workshop confirmation gates.
- Real call-record data model, verified-call log UI, transcript viewing and export.
- HMAC-SHA256 Sarvam callback endpoint: `POST https://frontier-ai-voice-crm.vercel.app/api/webhooks/sarvam`. It rejects unsigned, stale, unmapped, or unconfigured calls.
- Server-only Sarvam connection check for the authorized IT Super User, on Settings → API Integration.
- Global dealership switcher for the IT Super User only, retaining scoped dealership views.
- **No live dialing**: `ENABLE_LIVE_CALLS=false`. No dummy calls/contacts are inserted.

## Credentials / settings that are still required
Configure these directly as **Vercel production environment variables** (never `NEXT_PUBLIC_`, never commit them):
- `SARVAM_API_KEY`: Sarvam Voice Agents workspace API key.
- `SARVAM_ORG_ID`: Sarvam organization slug/id.
- `SARVAM_WORKSPACE_ID`: corresponding workspace id.
- `SARVAM_WEBHOOK_SIGNING_SECRET`: full `whsec_` value returned when creating a **stored signed webhook config**.
- `SUPABASE_SERVICE_ROLE_KEY`: backend-only Supabase service role credential so the signature-verified webhook can persist rows. This credential must NEVER be passed to a browser or made public.

After updating Vercel environment variables, deploy again so Next.js API routes see the new values. Test Sarvam in Settings → API Integration.

## How the webhook is intentionally protected
1. In Sarvam, create a *stored* webhook config, using the callback URL above. Save the one-time signing secret securely. Inline webhook URLs are unsigned and will be rejected.
2. The receiver checks `Sarvam-Signature`, `Sarvam-Timestamp` (±5 min), HMAC over original request body, identifiers and size.
3. The external `campaign_id` must already be mapped in `public.voice_campaign_links` to an existing CRM campaign and dealership; the `app_id` must match the mapped agent. Never trust a dealership ID sent in webhook metadata.
4. The receiver upserts a call attempt by dealership and attempt ID, so a duplicate webhook does not create a second call.
5. Data remains unavailable to browsers without an authorized, active dealership membership.
6. Incoming webhooks do not automatically create appointments or callbacks. Agent outputs must first be validated as genuine customer requests and workshop availability confirmed separately.

## Still required for complete platform independence
- Read/write Sarvam agent authoring API with real agent IDs, versions, prompts, voice, languages, tools, knowledge base, and test suites.
- Full telephony provider / number configuration, availability and limits.
- Immutable campaign recipient cohort (real CSV/Excel records), mapped variables, customer consent and DNC checks.
- Campaign API create/test/launch/pause/resume/cancel (not merely a draft), idempotency, approval and change invalidation.
- Sarvam analytics reconciliation (retry missing signed webhook deliveries), secure recording retrieval and authorized playback.
- Auto-created follow-up suggestions only after verified outputs, and workshop-confirmed appointment actions.
- End-to-end tests with two real dealership accounts and authorized Sarvam test calls, without exposing customer data.
- Sarvam workspace entitlements, telephony costs, actual keys and connections cannot be inferred from the CRM.

## Verification contract
- Frontend CI: `npm run lint`, `npm test`, `npm run build`.
- Supabase: verify migrations/policies, no public INSERT for `voice_call_records`; test with rolled-back fixtures before real customers.
- With real credentials: test API connection (IT), verify an intentionally generated signed webhook with correct campaign link, observe a single call log, test duplicate event and reject invalid signature / unmapped campaign / wrong tenant.
- Without credentials: the provider connection test must report *not connected* and webhook must return 503; it must never claim calling is operational.

Official Sarvam documentation:
- https://docs.sarvam.ai/voice-agents/api/analytics/overview
- https://docs.sarvam.ai/voice-agents/api/campaigns/webhooks/webhook-payload
- https://docs.sarvam.ai/voice-agents/settings/webhooks
- https://docs.sarvam.ai/voice-agents/deploy/campaigns/create-campaign
