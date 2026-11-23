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
 variable_mapping jsonb not null default '{}'::jsonb check(jsonb_typeof(variable_mapping)='object'),
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
 if tg_op='UPDATE' and (old.campaign_id<>new.campaign_id or old.dealership_id<>new.dealership_id or
  not exists(select 1 from public.campaigns c where c.id=old.campaign_id and c.status='DRAFT'))
 then raise exception 'An approved batch is immutable and cannot be moved to another campaign'; end if;
 if not exists (select 1 from public.campaigns c where c.id=new.campaign_id and c.dealership_id=new.dealership_id and c.status='DRAFT')
 then raise exception 'Recipient batches can only be changed for draft campaigns in the same dealership'; end if;
 return new;
end; $$;
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

-- A reservation row exists before every provider side effect. Unknown outcomes are never retried automatically.
create table if not exists public.voice_campaign_launches (
 campaign_id uuid primary key references public.campaigns(id) on delete cascade,
 dealership_id uuid not null references public.dealerships(id),
 recipient_sha256 text not null check(recipient_sha256 ~ '^[a-f0-9]{64}$'),
 config_sha256 text not null check(config_sha256 ~ '^[a-f0-9]{64}$'),
 sarvam_campaign_id text unique,
 sarvam_cohort_id text,
 state text not null check(state in ('creating','campaign_created','cohort_submitting','cohort_submitted','cohort_completed','needs_reconciliation','failed')),
 initiated_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.voice_campaign_launches enable row level security;
drop policy if exists frontvox_launch_read on public.voice_campaign_launches;
create policy frontvox_launch_read on public.voice_campaign_launches for select to authenticated using (
 public.frontier_password_setup_complete() and ((select auth.uid())='5bd78ada-44f5-4045-a9fb-75c9dad69893'::uuid
 or exists(select 1 from public.memberships m where m.user_id=(select auth.uid()) and m.dealership_id=voice_campaign_launches.dealership_id))
);
-- Inserts and updates must use the authenticated IT session under RLS; service role not needed.
drop policy if exists frontvox_launch_create on public.voice_campaign_launches;
create policy frontvox_launch_create on public.voice_campaign_launches for insert to authenticated
 with check(public.frontier_it_can_write(dealership_id) and initiated_by=(select auth.uid()));
drop policy if exists frontvox_launch_edit on public.voice_campaign_launches;
create policy frontvox_launch_edit on public.voice_campaign_launches for update to authenticated
 using(public.frontier_it_can_write(dealership_id))
 with check(public.frontier_it_can_write(dealership_id));
grant select,insert,update on public.voice_campaign_launches to authenticated;

create table if not exists public.voice_test_call_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 phone_hash text not null check(phone_hash ~ '^[a-f0-9]{64}$'),
 phone_last4 text not null check(phone_last4 ~ '^[0-9]{4}$'),
 window_bucket bigint not null,
 agent_id text not null,
 agent_version integer not null check(agent_version > 0),
 connection_id text not null,
 caller_number text not null check(caller_number ~ '^\+[1-9][0-9]{7,14}$'),
 status text not null check(status in ('reserved','submitted','unknown','failed')),
 sarvam_attempt_id text,
 created_at timestamptz not null default now(),
 unique(user_id,phone_hash,window_bucket)
);
alter table public.voice_test_call_requests enable row level security;
drop policy if exists frontvox_test_call_read on public.voice_test_call_requests;
create policy frontvox_test_call_read on public.voice_test_call_requests for select to authenticated
 using(public.frontier_password_setup_complete() and user_id=(select auth.uid())
 and exists(select 1 from public.memberships m where m.user_id=(select auth.uid()) and m.role='super_admin'));
drop policy if exists frontvox_test_call_insert on public.voice_test_call_requests;
create policy frontvox_test_call_insert on public.voice_test_call_requests for insert to authenticated
 with check(user_id=(select auth.uid()) and public.frontier_password_setup_complete()
 and (select auth.uid())='5bd78ada-44f5-4045-a9fb-75c9dad69893'::uuid
 and exists(select 1 from public.memberships m where m.user_id=(select auth.uid()) and m.role='super_admin'));
drop policy if exists frontvox_test_call_update on public.voice_test_call_requests;
create policy frontvox_test_call_update on public.voice_test_call_requests for update to authenticated
 using(user_id=(select auth.uid()) and (select auth.uid())='5bd78ada-44f5-4045-a9fb-75c9dad69893'::uuid)
 with check(user_id=(select auth.uid()) and (select auth.uid())='5bd78ada-44f5-4045-a9fb-75c9dad69893'::uuid);
grant select,insert,update on public.voice_test_call_requests to authenticated;

-- Approved campaign content cannot be edited after being submitted for approval.
create or replace function public.frontvox_lock_submitted_configuration()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from public.campaigns c where c.id=old.campaign_id and c.status<>'DRAFT')
 then raise exception 'Submitted or approved campaign configuration is immutable'; end if;
 return new;
end; $$;
drop trigger if exists frontvox_lock_campaign_draft on public.campaign_draft_configs;
create trigger frontvox_lock_campaign_draft before update or delete on public.campaign_draft_configs
 for each row execute function public.frontvox_lock_submitted_configuration();

-- Atomic test-call reservation: enforce a hard 3/24h cap under concurrent requests.
create or replace function public.frontvox_reserve_test_call(p_phone_hash text,p_phone_last4 text,p_agent_id text,p_agent_version integer,p_connection_id text,p_caller_number text)
returns uuid
language plpgsql security invoker set search_path='' as $$
declare v_id uuid;v_user uuid;
begin
 v_user=(select auth.uid());
 if v_user is null or v_user<>'5bd78ada-44f5-4045-a9fb-75c9dad69893'::uuid
 or not public.frontier_password_setup_complete()
 or not exists(select 1 from public.memberships m where m.user_id=v_user and m.role='super_admin')
 then raise exception 'IT Super User access is required'; end if;
 if p_phone_hash !~ '^[0-9a-f]{64}$' or p_phone_last4 !~ '^[0-9]{4}$'
 or char_length(p_agent_id)<3 or char_length(p_agent_id)>200
 or p_agent_version is null or p_agent_version < 1
 or p_connection_id !~ '^[a-zA-Z0-9_.-]{3,200}$'
 or p_caller_number !~ '^\+[1-9][0-9]{7,14}$'
 then raise exception 'Invalid test call audit parameters'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_user::text)::bigint);
 if (select count(*) from public.voice_test_call_requests where user_id=v_user and created_at>now()-interval '24 hours') >=3
 then raise exception 'Test call limit of 3 per 24 hours reached'; end if;
 insert into public.voice_test_call_requests(user_id,phone_hash,phone_last4,window_bucket,agent_id,agent_version,connection_id,caller_number,status)
 values(v_user,p_phone_hash,p_phone_last4,floor(extract(epoch from now())/600)::bigint,p_agent_id,p_agent_version,p_connection_id,p_caller_number,'reserved')
 returning id into v_id;
 return v_id;
end; $$;
revoke all on function public.frontvox_reserve_test_call(text,text,text,integer,text,text) from public,anon;
grant execute on function public.frontvox_reserve_test_call(text,text,text,integer,text,text) to authenticated;
