-- Persistent, private per-recipient campaign state, without exposing customers to other dealerships.
-- No autonomous dialer is installed: provider dispatch still uses the existing approved immutable cohort.
create table if not exists public.campaign_prospects (
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid not null references public.campaigns(id) on delete cascade,
 dealership_id uuid not null references public.dealerships(id) on delete cascade,
 recipient_identifier text not null check(length(recipient_identifier) between 4 and 90),
 mobile text not null check(mobile ~ '^\+[1-9][0-9]{7,14}$'),
 customer_name text,
 registration_number text,
 vehicle_model text,
 service_type text,
 service_due text,
 last_service text,
 customer_source text not null default 'excel' check(customer_source in ('excel','crm')),
 readiness text not null default 'ready' check(readiness in ('ready','held')),
 queue_state text not null default 'pending' check(queue_state in ('pending','submitted','connected','busy','no_answer','failed','cancelled','other')),
 interest text check(interest in ('interested','not_interested','follow_up','human_assistance')),
 call_summary text check(length(call_summary)<=2000),
 follow_up_at timestamptz,
 next_action text check(length(next_action)<=500),
 retry_requested boolean not null default false,
 attempt_number integer not null default 0 check(attempt_number between 0 and 5),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(campaign_id,recipient_identifier),
 unique(campaign_id,mobile)
);
create index if not exists campaign_prospects_scope on public.campaign_prospects(dealership_id,campaign_id);
alter table public.campaign_prospects enable row level security;
drop policy if exists frontvox_prospects_read on public.campaign_prospects;
create policy frontvox_prospects_read on public.campaign_prospects for select to authenticated
 using (public.frontier_it_can_write(dealership_id));
drop policy if exists frontvox_prospects_insert on public.campaign_prospects;
create policy frontvox_prospects_insert on public.campaign_prospects for insert to authenticated
 with check(public.frontier_it_can_write(dealership_id)
 and exists(select 1 from public.campaigns c where c.id=campaign_id and c.dealership_id=campaign_prospects.dealership_id and c.status='DRAFT'));
drop policy if exists frontvox_prospects_update on public.campaign_prospects;
create policy frontvox_prospects_update on public.campaign_prospects for update to authenticated
 using(public.frontier_it_can_write(dealership_id))
 with check(public.frontier_it_can_write(dealership_id));
grant select,insert,update on public.campaign_prospects to authenticated;

-- Guard prevents changing recipient identity or campaign scope once a row exists.
create or replace function public.frontvox_guard_campaign_prospect() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if row(new.campaign_id,new.dealership_id,new.mobile,new.recipient_identifier)
  is distinct from row(old.campaign_id,old.dealership_id,old.mobile,old.recipient_identifier) then
  raise exception 'Campaign recipient identity is immutable';
 end if;
 return new;
end; $$;
drop trigger if exists guard_campaign_prospect on public.campaign_prospects;
create trigger guard_campaign_prospect before update on public.campaign_prospects
 for each row execute function public.frontvox_guard_campaign_prospect();

-- Manual retry requests are audit-only until an individually approved provider retry is implemented.
-- Never requeue automatically based on a button or provider timeout.
create table if not exists public.campaign_retry_requests (
 id uuid primary key default gen_random_uuid(),
 prospect_id uuid not null references public.campaign_prospects(id) on delete cascade,
 campaign_id uuid not null references public.campaigns(id) on delete cascade,
 dealership_id uuid not null references public.dealerships(id),
 requested_by uuid not null references auth.users(id),
 state text not null default 'pending_review' check(state in ('pending_review','cancelled','completed')),
 created_at timestamptz not null default now()
);
create unique index if not exists frontvox_retry_one_pending on public.campaign_retry_requests(prospect_id)
 where state='pending_review';
alter table public.campaign_retry_requests enable row level security;
drop policy if exists frontvox_retry_select on public.campaign_retry_requests;
create policy frontvox_retry_select on public.campaign_retry_requests for select to authenticated
 using(public.frontier_it_can_write(dealership_id));
drop policy if exists frontvox_retry_insert on public.campaign_retry_requests;
create policy frontvox_retry_insert on public.campaign_retry_requests for insert to authenticated
 with check(public.frontier_it_can_write(dealership_id) and requested_by=(select auth.uid()));
grant select,insert on public.campaign_retry_requests to authenticated;
