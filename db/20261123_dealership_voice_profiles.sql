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
