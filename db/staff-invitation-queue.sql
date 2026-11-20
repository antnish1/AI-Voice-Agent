-- Private admin-only onboarding requests.
-- Staff email addresses and actual invitations must NOT be checked into this public repository.
create schema if not exists internal;
revoke all on schema internal from public, anon, authenticated;
create table if not exists internal.staff_invitation_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  requested_role text not null check (requested_role in ('super_admin','dealership_manager','crm_executive','service_team','management')),
  dealership_id uuid not null references public.dealerships(id),
  status text not null default 'PENDING_AUTH_INVITE' check(status in ('PENDING_AUTH_INVITE','INVITED','ROLE_ASSIGNED','CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint normalized_email check (email=lower(trim(email)))
);
alter table internal.staff_invitation_requests enable row level security;
revoke all on internal.staff_invitation_requests from public, anon, authenticated;
-- Do not add anon/authenticated policies or grant API access.
-- Insert real addresses only using a privileged DB administrator after explicit authorization.
-- PENDING_AUTH_INVITE does not send an email, create an Auth user, or grant a role.
