-- One-time IT-only dealership calling configuration.
-- This file is reviewed/deployed separately from the UI; no calling is enabled by its presence.
create table if not exists public.dealership_voice_profiles (
 dealership_id uuid primary key references public.dealerships(id) on delete cascade,
 agent_id text not null check (agent_id ~ '^[A-Za-z0-9_.-]{3,200}$'),
 app_version integer not null check (app_version > 0),
 connection_id text not null check (connection_id ~ '^[A-Za-z0-9_.-]{3,200}$'),
 caller_number text not null check (caller_number ~ '^\+[1-9][0-9]{7,14}$'),
 active boolean not null default false,
 updated_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now()
);
alter table public.dealership_voice_profiles enable row level security;
create policy frontier_voice_profiles_read on public.dealership_voice_profiles
 for select to authenticated using(
  public.frontier_it_can_write(dealership_id)
 );
create policy frontier_voice_profiles_insert on public.dealership_voice_profiles
 for insert to authenticated with check(
  public.frontier_it_can_write(dealership_id) and updated_by=(select auth.uid())
 );
create policy frontier_voice_profiles_update on public.dealership_voice_profiles
 for update to authenticated using(
  public.frontier_it_can_write(dealership_id)
 ) with check(
  public.frontier_it_can_write(dealership_id) and updated_by=(select auth.uid())
 );
grant select,insert,update on public.dealership_voice_profiles to authenticated;

-- Audited lifecycle transitions: reserve before provider side effects; never automatically retry unknown outcomes.
create table if not exists public.voice_campaign_control_events (
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid not null references public.campaigns(id) on delete cascade,
 dealership_id uuid not null references public.dealerships(id),
 action text not null check(action in ('pause','resume')),
 status text not null check(status in ('pending','confirmed','unknown','failed')),
 initiated_by uuid not null references auth.users(id),
 provider_status text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists voice_control_one_pending_per_campaign
 on public.voice_campaign_control_events(campaign_id) where status='pending';
alter table public.voice_campaign_control_events enable row level security;
create policy frontier_voice_control_read on public.voice_campaign_control_events
 for select to authenticated using(public.frontier_it_can_write(dealership_id));
create policy frontier_voice_control_insert on public.voice_campaign_control_events
 for insert to authenticated with check(public.frontier_it_can_write(dealership_id) and initiated_by=(select auth.uid()));
create policy frontier_voice_control_update on public.voice_campaign_control_events
 for update to authenticated using(public.frontier_it_can_write(dealership_id) and initiated_by=(select auth.uid()))
 with check(public.frontier_it_can_write(dealership_id) and initiated_by=(select auth.uid()));
grant select,insert,update on public.voice_campaign_control_events to authenticated;
