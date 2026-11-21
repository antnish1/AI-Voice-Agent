# Enterprise UI Stage 1 — implementation status
Date: 2026-11-21

## Implemented on feature branch
- New navy/teal responsive portal shell and navigation.
- Dashboard with actual Supabase customer/campaign metrics and recent campaign list.
- Campaign listing UI and four-step campaign wizard.
- Browser-only CSV preview, phone-column selection, basic phone-format and duplicate checks.
- Draft campaign configuration saved to Supabase via atomic, RLS-guarded RPC.
- UI shells for AI Voice Agents, Documents and Settings.
- No changes to Sarvam voice, TTS, agent settings, or API connection.
- Private Supabase Storage for documents, with create, signed preview, replace and delete controls.
- No call launch, test calls or production deployment.

## Existing Supabase project changes
Migrations: `frontier_crm_stage1_campaign_draft_configs` and `frontier_crm_stage1_private_dealership_documents`
New `public.campaign_draft_configs` table, RLS policies and `public.create_campaign_draft_with_config` function.
Storage bucket: `frontier-crm-private`, private, 10 MB per file, policies restricted by authenticated user's dealership membership. Existing customer/campaign records and manager-approval trigger left intact.

## Known incomplete features
- CSV is only previewed in browser. The recipient contents are **not** imported.
- Excel parsing, recipient persistence, suppression/consent checks and detailed mapping are pending.
- Dealership documents now have a private Supabase Storage bucket, tenant-scoped upload/list/replace/delete policies and a working UI. End-to-end browser auth and Storage tests with multiple dealership accounts are still pending.
- Agent, version, phone and telephony labels are manual draft inputs, not verified Sarvam references.
- Manager approvals still represent draft-state decisions only, not approval of an immutable contact cohort.
- Full Super Admin multi-dealership switching, additional operations modules, and analytics are pending.
- No test-call or launch capabilities until separate API authorization.

## Release gate
Before any merge: typecheck, tests, build, explicit dealership-isolation test and UI review.
Never present the preview as a fully connected Sarvam campaign workflow.
