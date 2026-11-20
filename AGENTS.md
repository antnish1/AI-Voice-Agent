# AGENTS.md — Frontier AI Voice CRM + Kajal Agent Handoff

> Maintainer instructions for future coding/voice-agent assistants. Current agreed requirements take priority over old experimental drafts. **This repository is PUBLIC**: never commit customer lists, phone numbers, call recordings, transcripts containing private data, API keys or production credentials.

## A. Purpose and confirmed product requirements
Build a new standalone AI Voice CRM exclusively for Frontier Group dealerships. The app is an operational frontend; Sarvam Samvaad continues as the underlying voice/telephony platform. Staff must upload CSV/Excel customer lists, create and schedule campaigns, get Dealership Manager approval, monitor calls, listen to permitted recordings, review transcripts, process callbacks/appointments/pickup-drop/complaints, and export reports without using the Sarvam website. Central admin manages both shared agents and dealership-specific agents. Pilot dealership: **Frontier MG Noida**, dedicated agent: **Kajal**.

## B. Non-negotiable engineering controls
- Never trigger real calls, publish a voice-agent version, deploy a website, create a paid resource or change production credentials without explicit user approval.
- Development branch and PR first; preserve live deployment and existing agent drafts. Current live Sarvam configuration is NOT represented as fully synchronized by this repository.
- Approval: CRM can prepare; Dealership Manager must approve immutable cohort + agent version + schedule before backend launch. Material edits invalidate approval.
- Roles: Super Admin, Dealership Manager, CRM Executive, Service Team, read-only Management. Strict dealership scoping at data and API levels.
- Sarvam keys and Supabase service role key are server-side only. Signed webhooks must be verified, deduplicated and reconciled.
- Real contact imports require consent, applicable calling restrictions, do-not-call suppression, secure storage and audit trail.
- Current static preview is NOT authenticating users; do not use with real customer data.
- Do not invent Sarvam API capabilities: confirm current access, endpoint behavior, campaign scheduling, call logs and recording permissions.
- No secrets or actual customer spreadsheets in GitHub.

## C. Kajal identity and voice
- Outbound dealership service reminder CRM agent. Current dedicated identity: **Kajal**, **Frontier MG Noida**.
- Intro once: "नमस्ते सर, फ्रंटियर एमजी नोएडा से काजल बात कर रही हूँ।" Adapt address (सर/मैम/जी) to context; don't infer gender solely from pitch. Tell the truth if asked whether AI.
- Warm professional Indian female CRM style, short natural Hindi/Hinglish, usually one or two short sentences and ONE question at a time. Avoid robotic scripts, forced filler "hmm/umm", laughter, giggles and repeated acknowledgment.
- **Existing selected Sarvam voice: Simran — AI Companion (Companion). Do not change voice, model, TTS or audio settings without user approval.** Prompt-only control cannot guarantee TTS never giggles.
- English request: answer "Yes, I can speak in English." and immediately continue in English. Hindi request: "जी, मैं हिंदी में बात कर सकती हूँ।" No extra "Should I continue?" or language-switch announcement. Remain in requested language notwithstanding brief incidental words in another language.
- Preserve natural professional voice across languages; test audio (not only text transcripts).

## D. Data contract
Customer import fields (11 original spreadsheet columns): `Customer Name`, `Mobile`, `Model`, `Reg. Number`, `Service Type`, `Service DueDate`, `Last ServiceDate`, `Original CallDate`, `Last Reported Mileage`, `Last Follow up date`, `Last Follow up Remarks`. Stable agent names: `customer_name`, `customer_phone`, `vehicle_model`, `registration_number`, `service_type`, `service_due_date`, `last_service_date`, `original_call_date`, `last_reported_mileage`, `last_followup_date`, `last_followup_remarks`.
- CRM input is historical, may be missing/inaccurate. Never confuse last reported mileage with current reading, or past callback remarks with completed actions.
- Dealership brand/manufacturer/location must come from trusted configuration, not guessing from vehicle model. Keep full registration internally.
- Say only final four registration characters aloud, one by one in English (including leading zero) **after appropriate identity/authorization checks**; no full registration or private record to an unverified participant.
- Two identical vehicle models: ask which vehicle; never guess. Uncertain identity ("हो जाती है", "हाँ बोलिए") is not explicit identity confirmation. Max two attempts; don't repeatedly ask.

## E. Family member rule — current agreement
If father, mother, sister, brother, wife, husband, adult son/daughter or other family member answers and asks "आप मुझे बता दीजिए", **engage them as a valid service-discussion participant**. Explain general purpose and maintenance information, discuss available service options, and collect preferences. Do not demand the named owner over and over. Don't repeat "रवि जी को बता दीजिएगा" after every answer. Family claim alone does NOT verify permission to disclose private CRM details or complete booking on another person's behalf; follow established authorization checks. Track named-customer identity separately from family-member participation and authorization. If the customer is unavailable and the family member accepts a message, disposition may be MESSAGE_LEFT_WITH_OTHER_PERSON; only mark message accepted if they actually agree.

## F. Call conversation and appointment behavior
- Customer's actual question always takes precedence over script stage. Never loop on same question, repeat long pitch, ask permission again after "हाँ बोलिए" or append automatic advisor/callback offers to every answer.
- Mileage unknown because customer isn't near vehicle: accept immediately, do not repeatedly estimate/re-ask. If customer corrects a reading, store last confirmed correction. A bizarre figure can be clarified ONCE.
- Service type e.g. `60K-P` / `60K-D` in Hindi spoken "आपकी साठ हज़ार किलोमीटर वाली सर्विस"; `80K`→अस्सी हज़ार, `100K`→एक लाख, `150K`→एक लाख पचास हज़ार. Expand every numeric K consistently. Never pronounce raw code suffix P/D. Preserve original code for CRM.
- Service-due date is CRM reminder date, not independently verified manufacturer schedule. If `service_schedule_verified=false`, don't assert manufacturer's mileage threshold was crossed.
- Respect appointment refusal. One relevant soft follow-up may be used for an ordinary tentative postponement, never after a firm no, already serviced, driving, opt-out or serious complaint.
- Already serviced, including third-party/outside workshop: note as customer-reported; do not pressure or imply outside service is inadequate as fact. If customer later requests another service, follow latest intent.
- Offer pickup/drop where verified available and the customer can't bring car; don't use unprofessional pickup staff labels. A caller busy talking right now should be offered a short callback, not automatically pickup.
- Pickup request is NOT confirmed booking. Collect preferred date, optional time (accept "कभी भी"), full address, landmark, drop address or explicit same-as-pickup. City or neighborhood alone is partial detail in remarks, not a confirmed address. If unavailable, mark REQUEST_INCOMPLETE and arrange address confirmation only if requested/appropriate. A later reversal overrides earlier consent.

## G. Callback and turn-taking
- If caller asks "कल कॉल करना", ask ONCE "जी, कल कोई खास समय ठीक रहेगा, या मैं किसी भी समय कॉल कर सकती हूँ?" If a specific date e.g. "23 तारीख" say "जी, 23 तारीख को किस समय बात करना ठीक रहेगा?" If time already provided, do not re-ask. Accept "कभी भी" without further questions; date-only must not be coerced to midnight/9AM. Prefer reliable IST clock for date resolution.
- Never say internal robotic phrases "callback request note कर लेती हूँ", "request डाल दूँ" in customer-facing speech. Do not promise successful callback booking unless action truly succeeded.
- Respect interruptions/barge-in until final speech ends. Wait for actual user. When caller says "वो मेरी आवाज़ नहीं थी", treat disputed background speech as untrusted, retract tentative details, return to last confirmed intent. Voice-source separation may require platform/audio work; prompts alone cannot guarantee it.
- Never treat IVR/hold background or voicemail as customer agreement. Avoid doubled speech after End Conversation.
- Close **once**, in selected language: Hindi "जी, धन्यवाद। आपका दिन शुभ हो।"; English "Thank you. Have a nice day." Never mix both closing templates or continue after actual call ending. No "नमस्कार" closing. Runtime end-call must happen once.

## H. Call output accuracy
Store outcome truthfully, distinguishing customer preference vs request vs actual confirmation. Representative fields:
`call_disposition`, `customer_identity_confirmed`, `permission_to_speak`, `current_mileage`, `current_mileage_confirmed`, `service_schedule_verified`, `service_due_condition`, `appointment_requested`, `appointment_confirmation_status`, `appointment_preferred_date`, `appointment_preferred_time`, `callback_required`, `callback_preferred_datetime`, `followup_requested`, `followup_preferred_datetime`, `advisor_followup_required`, `next_sales_followup_action`, `pickup_drop_requested`, `pickup_drop_required`, `pickup_drop_request_status`, `pickup_preferred_date`, `pickup_preferred_time`, `pickup_address`, `pickup_address_confirmed`, `pickup_landmark`, `drop_address`, `drop_same_as_pickup`, `customer_remarks`, `call_summary`, `script_completion_status`.
- Do not set `drop_same_as_pickup=true` without explicit instruction.
- If customer explicitly requests a service team call for pickup address confirmation, record operational follow-up and callback as required (without inventing callback datetime).
- `appointment_requested` never implies appointment confirmed; incomplete pickup address must remain `REQUEST_INCOMPLETE`. No fabricated technical facts, promises, pricing, offers, statuses, timings.
- Maintain accurate disposition for family message and busy endings, separate from `customer_identity_confirmed`.

## I. Known regression tests (must validate before live use)
1. Wrong/ambiguous identity; no private data leakage.
2. Family answers and requests service information; naturally engage, don't loop.
3. Customer owns two MG Hectors; confirm permitted vehicle suffix and never guess.
4. Mileage unknown, corrected, or unrealistic; stop re-asking.
5. Relative or explicit callback dates and anytime preference; one timing question at most.
6. Appointment tentatively declined versus firm refusal and already serviced elsewhere.
7. Pickup only partial location "Jabalpur / Vijayanagar"; don't falsely confirm address, booking or drop location.
8. Background speaker disputed by primary user; retract disputed manager callback.
9. Language switch English/Hindi and stable voice.
10. Interruption at closing, exactly one farewell and one actual call-end event.
11. CRM variables reflect actual latest customer decision, not template predictions.
12. Never add advisor callback pitch after simple due-date answer.

## J. Historical material / conflict precedence
Earlier training drafts described spelling full registrations and speaking ALL numerals in English, but **current user-approved behavior overrides these**: only final four digits, and Hindi natural service kilometre values. Older V10/V11 descriptions and experimental draft version numbers are historical, **not evidence of current production version**. Last known draft described as v28; re-verify in Sarvam before changes. Uploaded sample Excel/CSV data is NOT committed here.

## K. Dev workflow
- Read `docs/FRONTEND_DEVELOPMENT_PLAN.md` and `README.md` before implementation.
- Introduce typed source contracts; real Supabase Auth and tenant RLS; manager approval enforced transactionally server-side.
- Safe retries, idempotent Sarvam webhook ingestion, no cross-tenant leaks, audit log for each relevant state transition.
- Verify build/test/security before opening PR. Stop before merge/deploy unless separately approved.


## L. Verified implementation status — 20 November 2026

These are operational reference points, not blanket permission to deploy, call customers, or change external services.

### Repository and deployments
- GitHub repository: `antnish1/AI-Voice-Agent`.
- Main currently contains the original static demonstration and this instruction file. The Next.js production foundation is on draft PR #2, branch `feature/nextjs-auth-dealership-foundation`; do not assume it has been merged.
- A **production Vercel deployment has already been explicitly authorized and created** for the login foundation, separate from InsureIT. Canonical login URL: `https://frontier-ai-voice-crm.vercel.app/login`. Vercel project ID: `prj_51k5pHkUt6ZRbcaf2kS798fT2KL9`, team `antnish1s-projects` (Pro). Last verified deployment: `dpl_CF7NftbPGmJ5L43artLkDwGFGhEN`, READY, from commit `41b927c3cee7213c31b530793bc61c65fdb308c4` on the feature branch.
- Next.js 15.5.0 was rejected by Vercel as vulnerable; patched 15.5.29 was deployed after CI passed. Recheck security advisories before subsequent releases; don't downgrade.
- Production `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` were set using Vercel project environment variables. `ENABLE_LIVE_CALLS=false` was set for production, preview and development. **Do not enable live calling without new explicit permission.**
- Vercel production deployment does **not** mean the website's full CRM workflows, invitation redirects or end-to-end login have been tested with real passwords. Initial `/login` HTTP 200 and unauthenticated dashboard-to-login behavior were verified.
- The stable public login route is `/login`; it must authenticate staff through Supabase, with no public registration. The project exposes a login page, not an unrestricted customer-data portal.

### Separate Supabase environment
- Supabase project: **AI VOICE AGENT**, reference `kagzuxkeabiuswccxjme`, URL `https://kagzuxkeabiuswccxjme.supabase.co`, **Shahdolho Account** connection. This is a distinct Free-plan database and is **not** the InsureIT or Parts Connect production database.
- Initial production tables: `public.dealerships`, `public.memberships`, `public.customers`, `public.campaigns`; all RLS-enabled. `Frontier MG Noida` dealership is registered. Private `internal.staff_invitation_requests` tracks onboarding requests; do not expose that schema to `anon` or `authenticated`.
- Database campaign transition trigger validates the manager approval workflow; policy and tenant tests passed using temporary rolled-back fixtures. Currently only the foundation schema exists; real calling, uploads, callbacks, recording storage and complete workflow implementation remain future work.
- Two invited staff accounts have had their **current Auth IDs** matched and membership roles restored: one `super_admin` and one `dealership_manager`, both scoped to Frontier MG Noida. Auth users can be deleted and recreated; reassociate membership to the **new verified Auth ID** rather than relying on stale role-request status. Avoid committing or logging staff email addresses or password material to public GitHub.
- `super_admin` currently has a dealership membership, not automatically global rights; design and test all-dealership access separately before promising it.
- Supabase security advisor previously warned that **leaked-password protection was disabled**; it may be a plan-restricted feature. Do not upgrade a plan or incur paid charges without explicit permission. Recheck current advisor findings rather than assuming they remain unchanged.

### Invitation and authentication
- Earlier invitation links redirected to `localhost:3000` on the user's device, which failed. The project now includes `/auth/confirm` and `/set-password` routes in the feature branch, but this alone does not repair existing email links or Supabase Auth URL configuration.
- The Supabase Site URL and allowed redirects must point to the verified HTTPS Vercel site and appropriate callbacks, and the email template/token flow must be tested before claiming mobile invitation onboarding is fixed. Do not modify the shared InsureIT domain.
- Do not claim real sign-in or password-reset flow passes without testing via the authenticated app and actual user-controlled credentials. Never ask users to share passwords.

### Delivery safeguards
- Review `docs/ACTIVE_INFRASTRUCTURE.md`, `docs/AUTH_INVITATION_REDIRECT.md`, and `docs/ADMIN_ACCOUNT_SETUP.md` alongside this file. Some notes were written before deployment and may be outdated; the current verified state and newer documentation win.
- All changes must be reviewed against strict multi-tenancy, least-privilege RLS, stable agent-version approvals, data privacy and explicit calling consent. Do not commit production secrets, recordings or identifiable customer data.
- The connected Vercel account is shared with InsureIT, but the Frontier project must remain isolated. Never modify InsureIT settings, deployments or domains while working on Frontier.
