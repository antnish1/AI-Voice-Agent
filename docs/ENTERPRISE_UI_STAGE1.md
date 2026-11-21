# Enterprise UI Stage 1 — implementation status
Date: 2026-11-21

## Implemented on feature branch
- New navy/teal responsive portal shell and navigation.
- Dashboard with actual Supabase customer/campaign metrics and recent campaign list.
- Campaign listing UI and four-step campaign wizard.
- Campaign wizard: browser-only recipient CSV preview, phone-column selection, basic phone-format and duplicate checks.
- Customers page: real CSV imports (up to 500 records per batch), mapped name/mobile fields, backend validation, matched-customer detection, rejected-row history and unverified-consent defaults.
- Campaign-status chart from actual database counts, plus honest disconnected Call Logs, Appointments, Callbacks, Pickup & Drop and Reports screens.
- Draft campaign configuration saved to Supabase via atomic, RLS-guarded RPC.
- UI shells for AI Voice Agents, Documents and Settings.
- No changes to Sarvam voice, TTS, agent settings, or API connection.
- Private Supabase Storage for documents, with create, signed preview, replace and delete controls.
- No call launch, test calls or production deployment.

## Existing Supabase project changes
Migrations: `frontier_crm_stage1_campaign_draft_configs`, `frontier_crm_stage1_private_dealership_documents`, `frontier_crm_stage1_customer_csv_import`, `frontier_crm_stage1_customer_import_tenant_constraint`, `frontier_crm_stage1_customer_import_oversized_row_fix`
New `public.campaign_draft_configs` table, RLS policies and `public.create_campaign_draft_with_config` function.
Storage bucket: `frontier-crm-private`, private, 10 MB per file, policies restricted by authenticated user's dealership membership. Additional `customer_import_batches`, `customer_import_rows` tables and transactional import RPC added. Existing campaign records and manager-approval trigger left intact.

## Known incomplete features
- Campaign-wizard recipients are only previewed in the browser and are **not** saved as an approved call cohort. This is separate from the Customers page CSV importer, which now stores customers and raw import history.
- Excel parsing, campaign recipient persistence/cohort locking, suppression/consent checks and full agent-variable mapping are pending.
- Dealership documents now have a private Supabase Storage bucket, tenant-scoped upload/list/replace/delete policies and a working UI. End-to-end browser auth and Storage tests with multiple dealership accounts are still pending.
- Agent, version, phone and telephony labels are manual draft inputs, not verified Sarvam references.
- Manager approvals still represent draft-state decisions only, not approval of an immutable contact cohort.
- Full Super Admin multi-dealership switching, additional operations modules, and analytics are pending.
- No test-call or launch capabilities until separate API authorization.

## Release gate
Before any merge: typecheck, tests, build, explicit dealership-isolation test and UI review.
Never present the preview as a fully connected Sarvam campaign workflow.
