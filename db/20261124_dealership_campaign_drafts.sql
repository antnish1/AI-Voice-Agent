-- 2026-11-24: allow authenticated dealership members to prepare ONLY own
-- DRAFT campaigns and consent-screened recipient cohorts.
-- This does NOT permit campaign approval, test calls or live calling.
-- Review/apply before deploying the matching Next.js changes.
begin;

create or replace function public.frontvox_can_create_own_draft(p_dealership_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$
 select public.frontier_password_setup_complete()
 and (
  public.frontier_it_can_write(p_dealership_id)
  or exists (
   select 1 from public.memberships m
    where m.user_id=(select auth.uid())
      and m.dealership_id=p_dealership_id
      and m.role in ('dealership_manager','crm_executive','service_team','management')
  )
 );
$$;
revoke all on function public.frontvox_can_create_own_draft(uuid) from public,anon;
grant execute on function public.frontvox_can_create_own_draft(uuid) to authenticated;

-- Dealership staff need SELECT access to their own active agent defaults
-- to prepare a draft. Writing those defaults stays IT-only.
drop policy if exists frontvox_dealership_voice_profile_read on public.dealership_voice_profiles;
create policy frontvox_dealership_voice_profile_read on public.dealership_voice_profiles
for select to authenticated using (
 public.frontier_password_setup_complete()
 and exists(select 1 from public.memberships m
  where m.user_id=(select auth.uid())
   and m.dealership_id=dealership_voice_profiles.dealership_id)
);

-- The draft-creation RPC is SECURITY INVOKER and needs ordinary INSERT
-- privileges; row-level checks still determine exactly which tenant can write.
grant insert on public.campaigns to authenticated;
drop policy if exists campaign_draft_insert on public.campaigns;
create policy campaign_draft_insert on public.campaigns for insert to authenticated
with check (
 created_by=(select auth.uid())
 and status='DRAFT'
 and approved_by is null and approved_at is null
 and public.frontvox_can_create_own_draft(dealership_id)
);

drop policy if exists campaign_draft_configs_insert on public.campaign_draft_configs;
create policy campaign_draft_configs_insert on public.campaign_draft_configs for insert to authenticated
with check (
 public.frontvox_can_create_own_draft(dealership_id)
 and exists (
  select 1 from public.campaigns c
  where c.id=campaign_id and c.dealership_id=campaign_draft_configs.dealership_id
   and c.created_by=(select auth.uid()) and c.status='DRAFT'
 )
);

-- A recipient batch can be staged only by its campaign creator in their
-- dealership, or by the existing verified IT Super User.
drop policy if exists frontvox_batch_insert on public.campaign_recipient_batches;
create policy frontvox_batch_insert on public.campaign_recipient_batches for insert to authenticated
with check (
 uploaded_by=(select auth.uid())
 and (
  public.frontier_it_can_write(dealership_id)
  or (
   public.frontvox_can_create_own_draft(dealership_id)
   and exists(select 1 from public.campaigns c
     where c.id=campaign_id and c.dealership_id=campaign_recipient_batches.dealership_id
      and c.created_by=(select auth.uid()) and c.status='DRAFT')
  )
 )
);
drop policy if exists frontvox_batch_update on public.campaign_recipient_batches;
create policy frontvox_batch_update on public.campaign_recipient_batches for update to authenticated
using (
 public.frontier_it_can_write(dealership_id)
 or (
  uploaded_by=(select auth.uid())
  and public.frontvox_can_create_own_draft(dealership_id)
  and exists(select 1 from public.campaigns c
    where c.id=campaign_id and c.dealership_id=campaign_recipient_batches.dealership_id
     and c.created_by=(select auth.uid()) and c.status='DRAFT')
 )
)
with check (
 uploaded_by=(select auth.uid())
 and (
  public.frontier_it_can_write(dealership_id)
  or (
   public.frontvox_can_create_own_draft(dealership_id)
   and exists(select 1 from public.campaigns c
     where c.id=campaign_id and c.dealership_id=campaign_recipient_batches.dealership_id
      and c.created_by=(select auth.uid()) and c.status='DRAFT')
  )
 )
);

-- Keep existing IT upload/read policy. Only grant INSERT, not SELECT,
-- for dealership recipient files. Bucket remains PRIVATE.
drop policy if exists frontvox_dealership_cohort_upload on storage.objects;
create policy frontvox_dealership_cohort_upload on storage.objects
for insert to authenticated with check (
 bucket_id='frontvox-campaign-cohorts'
 and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f]{64}\\.csv$'
 and exists(
  select 1 from public.campaigns c
   where c.id::text=split_part(name,'/',2)
    and c.dealership_id::text=split_part(name,'/',1)
    and c.created_by=(select auth.uid())
    and c.status='DRAFT'
    and public.frontvox_can_create_own_draft(c.dealership_id)
 )
);
commit;
