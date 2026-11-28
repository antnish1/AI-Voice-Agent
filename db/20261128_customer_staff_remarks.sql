begin;
create table if not exists public.customer_staff_remarks (
 id uuid primary key default gen_random_uuid(),
 dealership_id uuid not null references public.dealerships(id) on delete cascade,
 customer_id uuid not null references public.customers(id) on delete cascade,
 body text not null check(length(trim(body)) between 1 and 2000),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
alter table public.customer_staff_remarks enable row level security;
revoke all on public.customer_staff_remarks from public,anon,authenticated;
grant select,insert on public.customer_staff_remarks to authenticated;
create index if not exists customer_staff_remarks_lookup on public.customer_staff_remarks(dealership_id,customer_id,created_at desc);
drop policy if exists customer_staff_remarks_read on public.customer_staff_remarks;
create policy customer_staff_remarks_read on public.customer_staff_remarks for select to authenticated using (
 (select private_account_security.login_allowed()) and public.frontier_password_setup_complete()
 and exists(select 1 from public.customers c where c.id=customer_staff_remarks.customer_id and c.dealership_id=customer_staff_remarks.dealership_id)
);
drop policy if exists customer_staff_remarks_insert on public.customer_staff_remarks;
create policy customer_staff_remarks_insert on public.customer_staff_remarks for insert to authenticated with check (
 (select private_account_security.login_allowed()) and public.frontier_it_can_write(dealership_id) and created_by=(select auth.uid())
 and exists(select 1 from public.customers c where c.id=customer_staff_remarks.customer_id and c.dealership_id=customer_staff_remarks.dealership_id)
);
commit;
