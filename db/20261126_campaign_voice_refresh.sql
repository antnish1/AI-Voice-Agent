begin;
create or replace function private_review_schedule.refresh_voice(p_campaign uuid,p_missing_only boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.campaigns%rowtype; p public.dealership_voice_profiles%rowtype; cfg jsonb; fields jsonb;
begin
 if auth.uid() is distinct from '5bd78ada-44f5-4045-a9fb-75c9dad69893'::uuid or not exists(select 1 from auth.users where id=auth.uid() and lower(email)='it@insureit.in' and coalesce(raw_app_meta_data->>'frontvox_account_state','active')='active' and (banned_until is null or banned_until<=now())) or not exists(select 1 from public.memberships where user_id=auth.uid() and role='super_admin') then raise exception 'Not authorized'; end if;
select * into c from public.campaigns where id=p_campaign for update;
if not found or c.status not in ('DRAFT','PENDING','PENDING_MANAGER_APPROVAL','PAUSED','APPROVED') or exists(select 1 from public.voice_campaign_launches where campaign_id=p_campaign) then raise exception 'Campaign configuration is locked'; end if;
select configuration into cfg from public.campaign_draft_configs where campaign_id=p_campaign and dealership_id=c.dealership_id for update;
if not found then raise exception 'Campaign configuration missing'; end if;
if p_missing_only and coalesce(cfg->>'agent_label','')<>'' and coalesce(cfg->>'agent_version_label','')<>'' and coalesce(cfg->>'telephony_label','')<>'' and coalesce(cfg->>'outgoing_number_label','')<>'' then return cfg; end if;
select * into p from public.dealership_voice_profiles where dealership_id=c.dealership_id and active=true;
if not found or coalesce(p.agent_id,'')='' or coalesce(p.connection_id,'')='' or coalesce(p.caller_number,'')='' or coalesce(p.app_version,0)<1 then raise exception 'Active dealership voice profile unavailable'; end if;
fields:=jsonb_build_object('agent_label',p.agent_id,'agent_version_label',p.app_version::text,'telephony_label',p.connection_id,'outgoing_number_label',p.caller_number);
update public.campaign_draft_configs set configuration=cfg||fields where campaign_id=p_campaign and dealership_id=c.dealership_id;
return cfg||fields;
end $$;
revoke all on function private_review_schedule.refresh_voice(uuid,boolean) from public,anon;
grant execute on function private_review_schedule.refresh_voice(uuid,boolean) to authenticated;
create or replace function public.frontvox_refresh_campaign_voice(p_campaign uuid,p_missing_only boolean default true) returns jsonb language sql security invoker set search_path='' as $$ select private_review_schedule.refresh_voice(p_campaign,p_missing_only); $$;
revoke all on function public.frontvox_refresh_campaign_voice(uuid,boolean) from public,anon;
grant execute on function public.frontvox_refresh_campaign_voice(uuid,boolean) to authenticated;
commit;