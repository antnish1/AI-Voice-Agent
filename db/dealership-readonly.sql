-- Frontier CRM: dealerships are read-only; only the verified IT Super User can write.
-- Deploy this migration BEFORE the updated frontend and user-management Edge Function.
-- Dealer SELECT remains dealership-scoped. IT Super User may manage all dealerships.
create or replace function public.frontier_it_can_write(p_dealership_id uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select exists(
  select 1 from public.memberships m
  where m.user_id=(select auth.uid())
    and m.user_id='5bd78ada-44f5-4045-a9fb-75c9dad69893'::uuid
    and m.role='super_admin'
 ) and exists(select 1 from public.dealerships d where d.id=p_dealership_id);
$$;
revoke all on function public.frontier_it_can_write(uuid) from public,anon;
grant execute on function public.frontier_it_can_write(uuid) to authenticated;

alter policy campaign_draft_insert on public.campaigns
 with check (created_by=(select auth.uid()) and status='DRAFT' and approved_by is null and approved_at is null and public.frontier_it_can_write(dealership_id));
alter policy campaign_update_workflow on public.campaigns
 using (public.frontier_it_can_write(dealership_id))
 with check (
  public.frontier_it_can_write(dealership_id) and
  ((status='PENDING_MANAGER_APPROVAL' and approved_by is null and approved_at is null)
   or (status in ('APPROVED','REJECTED') and approved_by=(select auth.uid()) and approved_at is not null))
 );
alter policy campaign_draft_configs_insert on public.campaign_draft_configs
 with check (public.frontier_it_can_write(dealership_id) and exists(
  select 1 from public.campaigns c where c.id=campaign_id and c.dealership_id=campaign_draft_configs.dealership_id and c.created_by=(select auth.uid()) and c.status='DRAFT'
 ));
alter policy customers_staff_import_insert on public.customers with check (public.frontier_it_can_write(dealership_id));
alter policy customer_import_batches_add on public.customer_import_batches
 with check (created_by=(select auth.uid()) and public.frontier_it_can_write(dealership_id));
alter policy customer_import_batches_finish on public.customer_import_batches
 using (created_by=(select auth.uid()) and public.frontier_it_can_write(dealership_id))
 with check (created_by=(select auth.uid()) and public.frontier_it_can_write(dealership_id));
alter policy customer_import_rows_add on public.customer_import_rows
 with check (
   public.frontier_it_can_write(dealership_id)
   and exists(select 1 from public.customer_import_batches b where b.id=batch_id and b.dealership_id=customer_import_rows.dealership_id and b.created_by=(select auth.uid()))
   and (customer_id is null or exists(select 1 from public.customers c where c.id=customer_id and c.dealership_id=customer_import_rows.dealership_id))
 );

-- Private storage: preserve read access for same-dealership users.
alter policy frontier_crm_documents_add on storage.objects
 with check (
  bucket_id='frontier-crm-private' and name like '%/%'
  and exists(select 1 from public.dealerships d
    where d.id::text=split_part(name,'/',1) and public.frontier_it_can_write(d.id))
 );
alter policy frontier_crm_documents_delete on storage.objects
 using (
  bucket_id='frontier-crm-private'
  and exists(select 1 from public.dealerships d
    where d.id::text=split_part(name,'/',1) and public.frontier_it_can_write(d.id))
 );
alter policy frontier_crm_documents_update on storage.objects
 using (
  bucket_id='frontier-crm-private'
  and exists(select 1 from public.dealerships d
    where d.id::text=split_part(name,'/',1) and public.frontier_it_can_write(d.id))
 )
 with check (
  bucket_id='frontier-crm-private'
  and exists(select 1 from public.dealerships d
    where d.id::text=split_part(name,'/',1) and public.frontier_it_can_write(d.id))
 );
-- The existing import_dealership_customers RPC is SECURITY INVOKER and its
-- database INSERT operations remain subject to the above RLS restrictions.


-- Block direct Data API reads until a newly invited user changes their temporary
-- password. This is based on signed app_metadata (never user_metadata).
create or replace function public.frontier_password_setup_complete()
returns boolean language sql stable security invoker set search_path='' as $$
 select coalesce((auth.jwt()->'app_metadata'->>'must_change_password')::boolean,false)=false;
$$;
revoke all on function public.frontier_password_setup_complete() from public,anon;
grant execute on function public.frontier_password_setup_complete() to authenticated;

alter policy memberships_self_read on public.memberships
 using (public.frontier_password_setup_complete() and (user_id=(select auth.uid()) or (select auth.uid())='5bd78ada-44f5-4045-a9fb-75c9dad69893'::uuid));
alter policy dealerships_membership_read on public.dealerships
 using (public.frontier_password_setup_complete() and ((select auth.uid())='5bd78ada-44f5-4045-a9fb-75c9dad69893'::uuid or exists(
  select 1 from public.memberships m where m.dealership_id=dealerships.id and m.user_id=(select auth.uid())
 )));
alter policy customers_membership_read on public.customers
 using (public.frontier_password_setup_complete() and ((select auth.uid())='5bd78ada-44f5-4045-a9fb-75c9dad69893'::uuid or exists(
  select 1 from public.memberships m where m.dealership_id=customers.dealership_id and m.user_id=(select auth.uid())
 )));
alter policy campaigns_membership_read on public.campaigns
 using (public.frontier_password_setup_complete() and ((select auth.uid())='5bd78ada-44f5-4045-a9fb-75c9dad69893'::uuid or exists(
  select 1 from public.memberships m where m.dealership_id=campaigns.dealership_id and m.user_id=(select auth.uid())
 )));
alter policy campaign_draft_configs_read on public.campaign_draft_configs
 using (public.frontier_password_setup_complete() and ((select auth.uid())='5bd78ada-44f5-4045-a9fb-75c9dad69893'::uuid or exists(
  select 1 from public.memberships m where m.dealership_id=campaign_draft_configs.dealership_id and m.user_id=(select auth.uid())
 )));
alter policy customer_import_batches_read on public.customer_import_batches
 using (public.frontier_password_setup_complete() and ((select auth.uid())='5bd78ada-44f5-4045-a9fb-75c9dad69893'::uuid or exists(
  select 1 from public.memberships m where m.dealership_id=customer_import_batches.dealership_id and m.user_id=(select auth.uid())
 )));
alter policy customer_import_rows_read on public.customer_import_rows
 using (public.frontier_password_setup_complete() and ((select auth.uid())='5bd78ada-44f5-4045-a9fb-75c9dad69893'::uuid or exists(
  select 1 from public.memberships m where m.dealership_id=customer_import_rows.dealership_id and m.user_id=(select auth.uid())
 )));
alter policy frontier_crm_documents_read on storage.objects
 using (
  bucket_id='frontier-crm-private' and public.frontier_password_setup_complete()
  and (
   ((select auth.uid())='5bd78ada-44f5-4045-a9fb-75c9dad69893'::uuid and exists(
    select 1 from public.dealerships d where d.id::text=split_part(name,'/',1)))
   or exists(select 1 from public.memberships m
      where m.user_id=(select auth.uid()) and m.dealership_id::text=split_part(name,'/',1))
  )
 );
