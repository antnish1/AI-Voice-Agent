-- Frontier AI Voice CRM: NEW, dedicated Supabase project ONLY.
-- Review before applying. Nothing in this repository applies this SQL automatically.
create extension if not exists pgcrypto;

create table if not exists public.dealerships (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dealership_id uuid not null references public.dealerships(id) on delete cascade,
  role text not null check (role in ('super_admin','dealership_manager','crm_executive','service_team','management')),
  unique(user_id,dealership_id)
);
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references public.dealerships(id),
  name text not null,
  mobile text,
  consent_status text not null default 'unverified',
  do_not_call boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references public.dealerships(id),
  name text not null check (char_length(name) between 3 and 120),
  status text not null default 'DRAFT' check (status in ('DRAFT','PENDING_MANAGER_APPROVAL','APPROVED','REJECTED')),
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint approval_consistency check (
    (status in ('APPROVED','REJECTED') and approved_by is not null and approved_at is not null)
    or (status in ('DRAFT','PENDING_MANAGER_APPROVAL') and approved_by is null and approved_at is null)
  )
);
create index if not exists campaigns_dealership_created_idx on public.campaigns(dealership_id,created_at desc);
create index if not exists memberships_user_id_idx on public.memberships(user_id);

alter table public.dealerships enable row level security;
alter table public.memberships enable row level security;
alter table public.customers enable row level security;
alter table public.campaigns enable row level security;

revoke all on public.dealerships, public.memberships, public.customers, public.campaigns from anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.dealerships, public.memberships, public.customers, public.campaigns to authenticated;
grant insert (dealership_id,name,status,created_by) on public.campaigns to authenticated;
grant update (status,approved_by,approved_at) on public.campaigns to authenticated;
-- Avoid granting direct write rights to customer records or memberships.

create policy memberships_self_read on public.memberships
 for select to authenticated
 using (user_id=(select auth.uid()));

create policy dealerships_membership_read on public.dealerships
 for select to authenticated
 using (exists (select 1 from public.memberships m where m.dealership_id=id and m.user_id=(select auth.uid())));

create policy customers_membership_read on public.customers
 for select to authenticated
 using (exists (select 1 from public.memberships m where m.dealership_id=customers.dealership_id and m.user_id=(select auth.uid())));

create policy campaigns_membership_read on public.campaigns
 for select to authenticated
 using (exists (select 1 from public.memberships m where m.dealership_id=campaigns.dealership_id and m.user_id=(select auth.uid())));

create policy campaign_draft_insert on public.campaigns
 for insert to authenticated with check (
   created_by=(select auth.uid()) and status='DRAFT' and approved_by is null and approved_at is null
   and exists (select 1 from public.memberships m where m.dealership_id=campaigns.dealership_id and m.user_id=(select auth.uid()) and m.role in ('super_admin','dealership_manager','crm_executive'))
 );

-- For updates Postgres evaluates USING against old row and WITH CHECK against new row.
-- CRM may only submit DRAFT -> PENDING_MANAGER_APPROVAL.
create policy campaign_submit_draft on public.campaigns
 for update to authenticated
 using (status='DRAFT' and exists (
   select 1 from public.memberships m where m.dealership_id=campaigns.dealership_id and m.user_id=(select auth.uid()) and m.role in ('super_admin','dealership_manager','crm_executive')
 ))
 with check (status='PENDING_MANAGER_APPROVAL' and approved_by is null and approved_at is null
  and exists (select 1 from public.memberships m where m.dealership_id=campaigns.dealership_id and m.user_id=(select auth.uid()) and m.role in ('super_admin','dealership_manager','crm_executive'))
 );

-- Caution: permissive RLS policies are OR'ed. A single generic UPDATE policy
-- would be unsafe; approval must also validate old status and manager identity.
create policy campaign_manager_decision on public.campaigns
 for update to authenticated
 using (status='PENDING_MANAGER_APPROVAL' and exists (
   select 1 from public.memberships m where m.dealership_id=campaigns.dealership_id and m.user_id=(select auth.uid()) and m.role in ('super_admin','dealership_manager')
 ))
 with check (status in ('APPROVED','REJECTED') and approved_by=(select auth.uid()) and approved_at is not null
  and exists (select 1 from public.memberships m where m.dealership_id=campaigns.dealership_id and m.user_id=(select auth.uid()) and m.role in ('super_admin','dealership_manager'))
 );
-- Important: approvals here are of EMPTY campaign drafts only.
-- Do NOT add a launch integration until immutable contact cohorts and agent-version hashes exist.

-- Enforce exact old->new state transitions independently of permissive RLS policy OR semantics.
-- Only approved users can make a transition; all other status changes are rejected.
create or replace function public.enforce_campaign_approval_transition()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
 if new.dealership_id is distinct from old.dealership_id
    or new.name is distinct from old.name
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
   raise exception 'Campaign immutable fields may not be changed';
 end if;
 if old.status='DRAFT' and new.status='PENDING_MANAGER_APPROVAL'
    and new.approved_by is null and new.approved_at is null then
   if not exists (select 1 from public.memberships m where m.dealership_id=old.dealership_id
     and m.user_id=(select auth.uid()) and m.role in ('super_admin','dealership_manager','crm_executive')) then
      raise exception 'Not allowed to submit campaign';
   end if;
 elsif old.status='PENDING_MANAGER_APPROVAL'
    and new.status in ('APPROVED','REJECTED')
    and new.approved_by=(select auth.uid()) and new.approved_at is not null then
   if not exists (select 1 from public.memberships m where m.dealership_id=old.dealership_id
     and m.user_id=(select auth.uid()) and m.role in ('super_admin','dealership_manager')) then
      raise exception 'Only a dealership manager may decide';
   end if;
 else
   raise exception 'Invalid campaign transition';
 end if;
 return new;
end $$;
revoke all on function public.enforce_campaign_approval_transition() from public, anon, authenticated;
drop trigger if exists enforce_campaign_approval_transition on public.campaigns;
create trigger enforce_campaign_approval_transition before update on public.campaigns
for each row execute function public.enforce_campaign_approval_transition();
