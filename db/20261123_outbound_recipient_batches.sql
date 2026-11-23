-- Secure recipient staging: no phone numbers/CSV content in public database or repository.
-- This migration must be applied only after review and before deploying the corresponding code.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('frontvox-campaign-cohorts','frontvox-campaign-cohorts',false,5242880,array['text/csv','application/vnd.ms-excel','application/octet-stream'])
on conflict(id) do nothing;

create table if not exists public.campaign_recipient_batches(
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid not null unique references public.campaigns(id) on delete cascade,
 dealership_id uuid not null references public.dealerships(id) on delete cascade,
 object_path text not null unique,
 csv_sha256 text not null check(csv_sha256 ~ '^[a-f0-9]{64}$'),
 phone_column text not null,
 consent_column text not null,
 dnc_column text not null,
 cohort_name text not null check(char_length(cohort_name) between 1 and 50),
 total_records integer not null check(total_records between 1 and 250),
 eligible_records integer not null check(eligible_records between 1 and 250),
 uploaded_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 constraint campaign_batch_scope check(char_length(object_path) <= 400)
);
create index if not exists campaign_batches_dealership on public.campaign_recipient_batches(dealership_id,campaign_id);
create or replace function public.frontvox_batch_campaign_scope()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if not exists (select 1 from public.campaigns c where c.id=new.campaign_id and c.dealership_id=new.dealership_id and c.status='DRAFT')
 then raise exception 'Recipient batches can only be changed for draft campaigns in the same dealership'; end if;
 return new;
end $$;
drop trigger if exists frontvox_batch_scope on public.campaign_recipient_batches;
create trigger frontvox_batch_scope before insert or update on public.campaign_recipient_batches
 for each row execute function public.frontvox_batch_campaign_scope();
alter table public.campaign_recipient_batches enable row level security;
drop policy if exists frontvox_batch_read on public.campaign_recipient_batches;
create policy frontvox_batch_read on public.campaign_recipient_batches for select to authenticated using (
 public.frontier_password_setup_complete() and
 ((select auth.uid())='5bd78ada-44f5-4045-a9fb-75c9dad69893'::uuid or exists (
 select 1 from public.memberships m where m.user_id=(select auth.uid()) and m.dealership_id=campaign_recipient_batches.dealership_id
 )));
drop policy if exists frontvox_batch_insert on public.campaign_recipient_batches;
create policy frontvox_batch_insert on public.campaign_recipient_batches for insert to authenticated with check (
 public.frontier_it_can_write(dealership_id) and uploaded_by=(select auth.uid()));
drop policy if exists frontvox_batch_update on public.campaign_recipient_batches;
create policy frontvox_batch_update on public.campaign_recipient_batches for update to authenticated using(
 public.frontier_it_can_write(dealership_id)) with check(public.frontier_it_can_write(dealership_id));
grant select,insert,update on public.campaign_recipient_batches to authenticated;

drop policy if exists frontvox_cohort_storage_upload on storage.objects;
create policy frontvox_cohort_storage_upload on storage.objects for insert to authenticated
 with check(bucket_id='frontvox-campaign-cohorts' and public.frontier_password_setup_complete() and
 (select auth.uid())='5bd78ada-44f5-4045-a9fb-75c9dad69893'::uuid
 and exists(select 1 from public.memberships m where m.user_id=(select auth.uid()) and m.role='super_admin'));
drop policy if exists frontvox_cohort_storage_read on storage.objects;
create policy frontvox_cohort_storage_read on storage.objects for select to authenticated
 using(bucket_id='frontvox-campaign-cohorts' and public.frontier_password_setup_complete() and
 (select auth.uid())='5bd78ada-44f5-4045-a9fb-75c9dad69893'::uuid
 and exists(select 1 from public.memberships m where m.user_id=(select auth.uid()) and m.role='super_admin'));
-- No client DELETE/UPDATE storage policies. A reviewed server-side cleanup job may be added later.
