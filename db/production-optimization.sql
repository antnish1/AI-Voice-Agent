-- Applied on Supabase project kagzuxkeabiuswccxjme after the initial schema.
-- Apply only if the initial production-foundation.sql is already installed.
create index if not exists campaigns_approved_by_idx on public.campaigns(approved_by);
create index if not exists campaigns_created_by_idx on public.campaigns(created_by);
create index if not exists customers_dealership_id_idx on public.customers(dealership_id);
create index if not exists memberships_dealership_id_idx on public.memberships(dealership_id);
drop policy if exists campaign_submit_draft on public.campaigns;
drop policy if exists campaign_manager_decision on public.campaigns;
create policy campaign_update_workflow on public.campaigns
for update to authenticated
using (
 exists (select 1 from public.memberships m
 where m.dealership_id=campaigns.dealership_id and m.user_id=(select auth.uid())
 and m.role in ('super_admin','dealership_manager','crm_executive'))
)
with check (
 (status='PENDING_MANAGER_APPROVAL' and approved_by is null and approved_at is null
  and exists (select 1 from public.memberships m where m.dealership_id=campaigns.dealership_id and m.user_id=(select auth.uid()) and m.role in ('super_admin','dealership_manager','crm_executive')))
 or
 (status in ('APPROVED','REJECTED') and approved_by=(select auth.uid()) and approved_at is not null
  and exists (select 1 from public.memberships m where m.dealership_id=campaigns.dealership_id and m.user_id=(select auth.uid()) and m.role in ('super_admin','dealership_manager')))
);
-- Existing BEFORE UPDATE trigger remains responsible for old->new transition validation.
