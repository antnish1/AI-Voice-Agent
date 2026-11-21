-- Stage 1: draft-only campaign configuration; never launches live calls.
-- Additive migration. Existing campaigns, customer data and approval trigger remain unchanged.
create table if not exists public.campaign_draft_configs (
 campaign_id uuid primary key references public.campaigns(id) on delete cascade,
 dealership_id uuid not null references public.dealerships(id),
 configuration jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 constraint campaign_draft_configs_object check (jsonb_typeof(configuration)='object'),
 constraint campaign_draft_configs_size check (octet_length(configuration::text)<=16000)
);
create index if not exists campaign_draft_configs_dealership_idx on public.campaign_draft_configs(dealership_id);
alter table public.campaign_draft_configs enable row level security;
revoke all on public.campaign_draft_configs from anon,authenticated;
grant select,insert on public.campaign_draft_configs to authenticated;
create policy campaign_draft_configs_read on public.campaign_draft_configs
 for select to authenticated using (exists(
  select 1 from public.memberships m
  where m.dealership_id=campaign_draft_configs.dealership_id and m.user_id=(select auth.uid())
 ));
create policy campaign_draft_configs_insert on public.campaign_draft_configs
 for insert to authenticated with check(
  exists(select 1 from public.campaigns c
    where c.id=campaign_id and c.dealership_id=campaign_draft_configs.dealership_id
    and c.created_by=(select auth.uid()) and c.status='DRAFT')
  and exists(select 1 from public.memberships m
    where m.dealership_id=campaign_draft_configs.dealership_id and m.user_id=(select auth.uid())
    and m.role in ('super_admin','dealership_manager','crm_executive'))
 );
-- The RPC inserts both rows in one transaction, avoiding partial draft saves.
create or replace function public.create_campaign_draft_with_config(
 p_dealership_id uuid, p_name text, p_configuration jsonb
) returns uuid language plpgsql security invoker set search_path=''
as $$
declare v_id uuid;
begin
 if p_name is null or char_length(btrim(p_name)) not between 3 and 120 then
  raise exception 'Invalid campaign name';
 end if;
 if p_configuration is null or jsonb_typeof(p_configuration)<>'object'
    or octet_length(p_configuration::text)>16000 then
  raise exception 'Invalid draft configuration';
 end if;
 insert into public.campaigns(dealership_id,name,status,created_by)
 values(p_dealership_id,btrim(p_name),'DRAFT',(select auth.uid())) returning id into v_id;
 insert into public.campaign_draft_configs(campaign_id,dealership_id,configuration)
 values(v_id,p_dealership_id,p_configuration);
 return v_id;
end $$;
revoke all on function public.create_campaign_draft_with_config(uuid,text,jsonb) from public,anon;
grant execute on function public.create_campaign_draft_with_config(uuid,text,jsonb) to authenticated;
