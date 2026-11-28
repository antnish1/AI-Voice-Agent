begin;
create table if not exists public.global_voice_defaults (
 singleton boolean primary key default true check(singleton),
 agent_id text not null check(agent_id ~ '^[A-Za-z0-9_.-]{3,200}$'),
 app_version integer not null check(app_version>0),
 connection_id text not null check(length(connection_id) between 3 and 200),
 caller_number text not null check(caller_number ~ '^[+][1-9][0-9]{7,14}$'),
 active boolean not null default false,
 updated_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now()
);
alter table public.global_voice_defaults enable row level security;
revoke all on public.global_voice_defaults from public,anon,authenticated;
grant select,insert,update on public.global_voice_defaults to authenticated;
drop policy if exists global_voice_read on public.global_voice_defaults;
create policy global_voice_read on public.global_voice_defaults for select to authenticated using(exists(select 1 from public.memberships m where m.user_id=(select auth.uid())));
drop policy if exists global_voice_insert on public.global_voice_defaults;
create policy global_voice_insert on public.global_voice_defaults for insert to authenticated with check(updated_by=(select auth.uid()) and public.frontier_it_can_write('98468a52-9b19-4647-9ae5-6ac984cc6b57'));
drop policy if exists global_voice_update on public.global_voice_defaults;
create policy global_voice_update on public.global_voice_defaults for update to authenticated using(public.frontier_it_can_write('98468a52-9b19-4647-9ae5-6ac984cc6b57')) with check(updated_by=(select auth.uid()) and public.frontier_it_can_write('98468a52-9b19-4647-9ae5-6ac984cc6b57'));
insert into public.global_voice_defaults(singleton,agent_id,app_version,connection_id,caller_number,active,updated_by,updated_at)
select true,agent_id,app_version,connection_id,caller_number,active,updated_by,updated_at from public.dealership_voice_profiles where dealership_id='98468a52-9b19-4647-9ae5-6ac984cc6b57' on conflict(singleton) do nothing;
create or replace function private_review_schedule.refresh_voice(p_campaign uuid,p_missing_only boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.campaigns%rowtype; p public.global_voice_defaults%rowtype; cfg jsonb; fields jsonb;
begin
 if auth.uid() is distinct from '5bd78ada-44f5-4045-a9fb-75c9dad69893'::uuid or not exists(select 1 from auth.users where id=auth.uid() and lower(email)='it@insureit.in' and coalesce(raw_app_meta_data->>'frontvox_account_state','active')='active' and (banned_until is null or banned_until<=now())) or not exists(select 1 from public.memberships where user_id=auth.uid() and role='super_admin') then raise exception 'Not authorized'; end if;
select * into c from public.campaigns where id=p_campaign and not historical_read_only for update;
if not found or c.status not in ('DRAFT','PENDING','PENDING_MANAGER_APPROVAL','PAUSED','APPROVED') or exists(select 1 from public.voice_campaign_launches where campaign_id=p_campaign) then raise exception 'Campaign configuration is locked'; end if;
select configuration into cfg from public.campaign_draft_configs where campaign_id=p_campaign and dealership_id=c.dealership_id for update;
if not found then raise exception 'Campaign configuration missing'; end if;
if p_missing_only and coalesce(cfg->>'agent_label','')<>'' and coalesce(cfg->>'agent_version_label','')<>'' and coalesce(cfg->>'telephony_label','')<>'' and coalesce(cfg->>'outgoing_number_label','')<>'' then return cfg; end if;
select * into p from public.global_voice_defaults where singleton=true and active=true;
if not found or coalesce(p.agent_id,'')='' or coalesce(p.connection_id,'')='' or coalesce(p.caller_number,'')='' or coalesce(p.app_version,0)<1 then raise exception 'Active global voice defaults unavailable'; end if;
fields:=jsonb_build_object('agent_label',p.agent_id,'agent_version_label',p.app_version::text,'telephony_label',p.connection_id,'outgoing_number_label',p.caller_number);
update public.campaign_draft_configs set configuration=cfg||fields where campaign_id=p_campaign and dealership_id=c.dealership_id;
return cfg||fields;
end $$;
revoke all on function private_review_schedule.refresh_voice(uuid,boolean) from public,anon;
grant execute on function private_review_schedule.refresh_voice(uuid,boolean) to authenticated;
create or replace function public.frontvox_refresh_campaign_voice(p_campaign uuid,p_missing_only boolean default true) returns jsonb language sql security invoker set search_path='' as $$ select private_review_schedule.refresh_voice(p_campaign,p_missing_only); $$;
revoke all on function public.frontvox_refresh_campaign_voice(uuid,boolean) from public,anon;
grant execute on function public.frontvox_refresh_campaign_voice(uuid,boolean) to authenticated;

create schema if not exists private_global_voice;
revoke all on schema private_global_voice from public,anon,authenticated;
create or replace function private_global_voice.apply_draft_defaults() returns trigger language plpgsql set search_path='' as $$
declare p public.global_voice_defaults%rowtype;
begin
 if tg_op='UPDATE' and exists(select 1 from public.voice_campaign_launches where campaign_id=new.campaign_id) then return new;end if;
 if exists(select 1 from public.campaigns where id=new.campaign_id and historical_read_only) then return new;end if;
 select * into p from public.global_voice_defaults where singleton=true;
 if found then new.configuration:=new.configuration||jsonb_build_object('agent_label',case when p.active then p.agent_id else '' end,'agent_version_label',case when p.active then p.app_version::text else '' end,'telephony_label',case when p.active then p.connection_id else '' end,'outgoing_number_label',case when p.active then p.caller_number else '' end);end if;
 return new;
end $$;
drop trigger if exists apply_global_voice_defaults on public.campaign_draft_configs;
create trigger apply_global_voice_defaults before insert or update on public.campaign_draft_configs for each row execute function private_global_voice.apply_draft_defaults();
create or replace function private_global_voice.refresh_unlaunched() returns trigger language plpgsql security definer set search_path='' as $$
declare c record;
begin
 if auth.uid() is distinct from '5bd78ada-44f5-4045-a9fb-75c9dad69893'::uuid or not exists(select 1 from auth.users where id=auth.uid() and lower(email)='it@insureit.in' and coalesce(raw_app_meta_data->>'frontvox_account_state','active')='active' and (banned_until is null or banned_until<=now())) or not exists(select 1 from public.memberships where user_id=auth.uid() and role='super_admin') then raise exception 'Not authorized';end if;
 for c in select id from public.campaigns where not historical_read_only and status in ('DRAFT','PENDING','PENDING_MANAGER_APPROVAL','PAUSED','APPROVED') and not exists(select 1 from public.voice_campaign_launches l where l.campaign_id=campaigns.id) order by id for update loop
 if not exists(select 1 from public.voice_campaign_launches where campaign_id=c.id) then
 update public.campaign_draft_configs set configuration=configuration where campaign_id=c.id;
 end if;
 end loop;
 return new;
end $$;
revoke all on function private_global_voice.refresh_unlaunched() from public,anon,authenticated;
drop trigger if exists refresh_global_voice_drafts on public.global_voice_defaults;
create trigger refresh_global_voice_drafts after insert or update on public.global_voice_defaults for each row execute function private_global_voice.refresh_unlaunched();
-- Initial recovery only; never modify previously reserved or launched campaigns.
update public.campaign_draft_configs cfg set configuration=cfg.configuration from public.campaigns c where c.id=cfg.campaign_id and not c.historical_read_only and c.status in ('DRAFT','PENDING','PENDING_MANAGER_APPROVAL','PAUSED','APPROVED') and not exists(select 1 from public.voice_campaign_launches l where l.campaign_id=c.id);
-- Launch reservation must match the current global defaults, even with a stale browser.
create or replace function private_global_voice.guard_launch() returns trigger language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from public.global_voice_defaults p join public.campaign_draft_configs cfg on cfg.campaign_id=new.campaign_id and cfg.dealership_id=new.dealership_id where p.singleton and p.active and cfg.configuration->>'agent_label'=p.agent_id and cfg.configuration->>'agent_version_label'=p.app_version::text and cfg.configuration->>'telephony_label'=p.connection_id and cfg.configuration->>'outgoing_number_label'=p.caller_number) then raise exception 'Global voice defaults changed or inactive';end if;
 return new;
end $$;
drop trigger if exists guard_global_voice_launch on public.voice_campaign_launches;
create trigger guard_global_voice_launch before insert on public.voice_campaign_launches for each row execute function private_global_voice.guard_launch();
commit;