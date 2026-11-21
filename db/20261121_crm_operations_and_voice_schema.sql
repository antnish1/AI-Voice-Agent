-- Frontier operations foundation. No outbound calling is enabled by this migration.
-- The previously deployed frontier_it_can_write and frontier_password_setup_complete
-- functions remain authoritative for dealership permissions and first-login gating.
create table if not exists public.crm_callbacks (
 id uuid primary key default gen_random_uuid(),
 dealership_id uuid not null references public.dealerships(id) on delete cascade,
 customer_id uuid references public.customers(id) on delete set null,
 customer_name text not null check (char_length(trim(customer_name)) between 2 and 150),
 mobile text not null check (mobile ~ '^\\+?[1-9][0-9]{7,14}$'),
 requested_at timestamptz not null,
 status text not null default 'pending' check (status in ('pending','scheduled','in_progress','completed','missed','cancelled')),
 priority text not null default 'medium' check (priority in ('low','medium','high')),
 notes text not null default '' check (char_length(notes)<=2000),
 source text not null default 'manual' check (source in ('manual','verified_call_result')),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.crm_appointments (
 id uuid primary key default gen_random_uuid(),
 dealership_id uuid not null references public.dealerships(id) on delete cascade,
 customer_id uuid references public.customers(id) on delete set null,
 customer_name text not null check (char_length(trim(customer_name)) between 2 and 150),
 mobile text not null check (mobile ~ '^\\+?[1-9][0-9]{7,14}$'),
 appointment_at timestamptz not null,
 purpose text not null default 'Service visit' check(char_length(purpose) between 2 and 200),
 status text not null default 'requested' check(status in ('requested','pending','confirmed','completed','cancelled')),
 workshop_confirmed boolean not null default false,
 notes text not null default '' check(char_length(notes)<=2000),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint confirmed_only_after_workshop_acceptance check (status not in ('confirmed','completed') or workshop_confirmed)
);
create table if not exists public.crm_pickup_drop (
 id uuid primary key default gen_random_uuid(),
 dealership_id uuid not null references public.dealerships(id) on delete cascade,
 customer_id uuid references public.customers(id) on delete set null,
 customer_name text not null check (char_length(trim(customer_name)) between 2 and 150),
 mobile text not null check (mobile ~ '^\\+?[1-9][0-9]{7,14}$'),
 pickup_address text not null check(char_length(trim(pickup_address)) between 5 and 500),
 drop_address text not null check(char_length(trim(drop_address)) between 5 and 500),
 requested_at timestamptz not null,
 status text not null default 'requested' check(status in ('requested','pending','confirmed','in_progress','completed','cancelled')),
 workshop_confirmed boolean not null default false,
 notes text not null default '' check(char_length(notes)<=2000),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint pickup_verified_before_confirmation check (status not in ('confirmed','in_progress','completed') or workshop_confirmed)
);
create table if not exists public.voice_agent_links (
 id uuid primary key default gen_random_uuid(),
 dealership_id uuid not null references public.dealerships(id) on delete cascade,
 sarvam_agent_id text not null check(char_length(sarvam_agent_id) between 3 and 200),
 display_name text not null check(char_length(display_name) between 2 and 120),
 created_at timestamptz not null default now(),
 unique(dealership_id,sarvam_agent_id)
);
create table if not exists public.voice_call_records (
 id uuid primary key default gen_random_uuid(),
 dealership_id uuid not null references public.dealerships(id) on delete cascade,
 sarvam_attempt_id text not null check(char_length(sarvam_attempt_id) between 3 and 200),
 sarvam_interaction_id text,
 sarvam_campaign_id text,
 agent_id text,
 customer_id uuid references public.customers(id) on delete set null,
 dialed_number text,
 status text not null check(status in ('answered','busy','no_answer','failed','cancelled','other')),
 duration_seconds integer check(duration_seconds between 0 and 86400),
 started_at timestamptz,
 ended_at timestamptz,
 transcript jsonb,
 recording_reference text,
 last_synced_at timestamptz not null default now(),
 unique(dealership_id,sarvam_attempt_id)
);
-- Avoid storing unverified webhook deliveries as genuine calls. Ingestion to
-- voice_call_records must go through a separately verified Sarvam signature handler.
create table if not exists public.voice_webhook_receipts (
 id uuid primary key default gen_random_uuid(),
 dealership_id uuid not null references public.dealerships(id) on delete cascade,
 delivery_id text not null check(char_length(delivery_id) between 4 and 256),
 payload_hash text not null check(char_length(payload_hash)=64),
 verified_at timestamptz not null default now(),
 unique(dealership_id,delivery_id)
);
create or replace function public.frontier_crm_validate_customer_scope()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.customer_id is not null and not exists(
  select 1 from public.customers c where c.id=new.customer_id and c.dealership_id=new.dealership_id
 ) then raise exception 'Customer belongs to another dealership'; end if;
 return new;
end $$;
drop trigger if exists crm_callbacks_customer_scope on public.crm_callbacks;
create trigger crm_callbacks_customer_scope before insert or update on public.crm_callbacks
 for each row execute function public.frontier_crm_validate_customer_scope();
drop trigger if exists crm_appointments_customer_scope on public.crm_appointments;
create trigger crm_appointments_customer_scope before insert or update on public.crm_appointments
 for each row execute function public.frontier_crm_validate_customer_scope();
drop trigger if exists crm_pickup_drop_customer_scope on public.crm_pickup_drop;
create trigger crm_pickup_drop_customer_scope before insert or update on public.crm_pickup_drop
 for each row execute function public.frontier_crm_validate_customer_scope();
drop trigger if exists voice_call_customer_scope on public.voice_call_records;
create trigger voice_call_customer_scope before insert or update on public.voice_call_records
 for each row execute function public.frontier_crm_validate_customer_scope();
create or replace function public.frontier_crm_set_updated_at()
returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
drop trigger if exists crm_callbacks_updated on public.crm_callbacks;
create trigger crm_callbacks_updated before update on public.crm_callbacks for each row execute function public.frontier_crm_set_updated_at();
drop trigger if exists crm_appointments_updated on public.crm_appointments;
create trigger crm_appointments_updated before update on public.crm_appointments for each row execute function public.frontier_crm_set_updated_at();
drop trigger if exists crm_pickup_drop_updated on public.crm_pickup_drop;
create trigger crm_pickup_drop_updated before update on public.crm_pickup_drop for each row execute function public.frontier_crm_set_updated_at();

do $$ declare tab text; begin
 foreach tab in array array['crm_callbacks','crm_appointments','crm_pickup_drop','voice_agent_links','voice_call_records','voice_webhook_receipts'] loop
  execute format('alter table public.%I enable row level security',tab);
  execute format('drop policy if exists %I on public.%I',tab||'_read',tab);
  execute format('create policy %I on public.%I for select to authenticated using (public.frontier_password_setup_complete() and ((select auth.uid()) = ''5bd78ada-44f5-4045-a9fb-75c9dad69893''::uuid or exists (select 1 from public.memberships m where m.user_id=(select auth.uid()) and m.dealership_id=dealership_id)))',tab||'_read',tab);
 end loop; end $$;
do $$ declare tab text; begin
 foreach tab in array array['crm_callbacks','crm_appointments','crm_pickup_drop','voice_agent_links'] loop
  execute format('drop policy if exists %I on public.%I',tab||'_create',tab);
  execute format('create policy %I on public.%I for insert to authenticated with check (public.frontier_it_can_write(dealership_id)%s)',tab||'_create',tab,case when tab like 'crm_%' then ' and created_by=(select auth.uid())' else '' end);
  execute format('drop policy if exists %I on public.%I',tab||'_edit',tab);
  execute format('create policy %I on public.%I for update to authenticated using (public.frontier_it_can_write(dealership_id)) with check (public.frontier_it_can_write(dealership_id))',tab||'_edit',tab);
 end loop; end $$;
-- Call records and webhook receipts are ingestion-only. Never allow the browser
-- (including a super admin session) to fabricate calling analytics.
revoke all on table public.voice_call_records, public.voice_webhook_receipts from anon, authenticated;
grant select on public.voice_call_records to authenticated;
-- Do not expose verified receipts over the Data API.
revoke all on table public.voice_webhook_receipts from authenticated;
grant select,insert,update on public.crm_callbacks,public.crm_appointments,public.crm_pickup_drop,public.voice_agent_links to authenticated;
create index if not exists crm_callbacks_dealer_due on public.crm_callbacks(dealership_id,requested_at desc);
create index if not exists crm_appointments_dealer_due on public.crm_appointments(dealership_id,appointment_at desc);
create index if not exists crm_pickup_drop_dealer_due on public.crm_pickup_drop(dealership_id,requested_at desc);
create index if not exists voice_calls_dealer_started on public.voice_call_records(dealership_id,started_at desc);
