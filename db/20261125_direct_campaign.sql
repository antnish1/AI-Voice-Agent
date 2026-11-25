begin;
alter table public.campaigns drop constraint campaigns_status_check, drop constraint approval_consistency;
alter table public.campaigns add constraint campaigns_status_check check(status in ('DRAFT','PENDING_MANAGER_APPROVAL','PENDING','APPROVED','REJECTED','PAUSED')),
 add constraint approval_consistency check ((status in ('APPROVED','REJECTED') and approved_by is not null and approved_at is not null) or (status in ('DRAFT','PENDING_MANAGER_APPROVAL','PENDING','PAUSED') and approved_by is null and approved_at is null));
alter table public.voice_campaign_launches add column if not exists provider_status text;
create or replace function public.enforce_campaign_approval_transition() returns trigger language plpgsql set search_path='' as $$
begin
 if new.dealership_id is distinct from old.dealership_id or new.name is distinct from old.name or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then raise exception 'Campaign immutable fields may not be changed'; end if;
 if old.status='DRAFT' and new.status='PENDING' and new.approved_by is null and new.approved_at is null and old.created_by=auth.uid() and exists(select 1 from public.campaign_recipient_batches b where b.campaign_id=old.id and b.dealership_id=old.dealership_id and b.eligible_records>0) then return new; end if;
 if not exists(select 1 from public.voice_campaign_launches l where l.campaign_id=old.id) and old.status in ('DRAFT','PENDING_MANAGER_APPROVAL','PENDING','PAUSED','APPROVED') and new.status in ('APPROVED','REJECTED','PAUSED') and auth.uid()='5bd78ada-44f5-4045-a9fb-75c9dad69893'::uuid and public.frontier_it_can_write(old.dealership_id) then return new; end if;
 raise exception 'Invalid campaign transition';
end $$;
drop policy campaign_update_workflow on public.campaigns;
create policy campaign_update_workflow on public.campaigns for update to authenticated using (public.frontier_it_can_write(dealership_id) or (created_by=auth.uid() and status='DRAFT' and public.frontvox_can_create_own_draft(dealership_id))) with check (public.frontier_it_can_write(dealership_id) or (created_by=auth.uid() and status='PENDING' and public.frontvox_can_create_own_draft(dealership_id)));
create or replace function public.frontvox_lock_submitted_configuration() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from public.campaigns c where c.id=old.campaign_id and (c.status not in ('DRAFT','PENDING','PENDING_MANAGER_APPROVAL','PAUSED','APPROVED') or exists(select 1 from public.voice_campaign_launches l where l.campaign_id=c.id))) then raise exception 'Launched or rejected configuration is immutable'; end if;
 return new;
end $$;
-- Reserve launch and record IT authorization in one transaction after server validation.
create or replace function public.frontvox_reserve_direct_launch(p_campaign uuid,p_dealer uuid,p_expected_config jsonb,p_recipient_hash text,p_config_hash text) returns uuid language plpgsql security invoker set search_path='' as $$
declare c public.campaigns%rowtype; result uuid;
begin
 if auth.uid() is distinct from '5bd78ada-44f5-4045-a9fb-75c9dad69893'::uuid or not public.frontier_it_can_write(p_dealer) then raise exception 'Not authorized'; end if;
 select * into c from public.campaigns where id=p_campaign and dealership_id=p_dealer for update;
 if not found or c.status not in ('DRAFT','PENDING_MANAGER_APPROVAL','PENDING','PAUSED','APPROVED') or exists(select 1 from public.voice_campaign_launches where campaign_id=p_campaign) then raise exception 'Campaign cannot launch'; end if;
 if not exists(select 1 from public.campaign_draft_configs where campaign_id=p_campaign and dealership_id=p_dealer and configuration=p_expected_config) or not exists(select 1 from public.campaign_recipient_batches where campaign_id=p_campaign and dealership_id=p_dealer and csv_sha256=p_recipient_hash and eligible_records>0) then raise exception 'Configuration changed'; end if;
 if c.status<>'APPROVED' then update public.campaigns set status='APPROVED',approved_by=auth.uid(),approved_at=now() where id=p_campaign; end if;
 insert into public.voice_campaign_launches(campaign_id,dealership_id,recipient_sha256,config_sha256,state,initiated_by) values(p_campaign,p_dealer,p_recipient_hash,p_config_hash,'creating',auth.uid()) returning campaign_id into result;
 return result;
end $$;
revoke all on function public.frontvox_reserve_direct_launch(uuid,uuid,jsonb,text,text) from public,anon;
grant execute on function public.frontvox_reserve_direct_launch(uuid,uuid,jsonb,text,text) to authenticated;
create or replace function private_review_schedule.save_schedule(p_campaign uuid,p_dealership uuid,p_schedule jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare v_status text; v_start date; v_end date; v_from time; v_to time; v_days jsonb; v_interval integer;
begin
 if auth.uid() is distinct from '5bd78ada-44f5-4045-a9fb-75c9dad69893'::uuid or not exists(select 1 from auth.users where id=auth.uid() and lower(email)='it@insureit.in' and coalesce(raw_app_meta_data->>'frontvox_account_state','active')='active' and (banned_until is null or banned_until<=now())) or not exists(select 1 from public.memberships where user_id=auth.uid() and role='super_admin') then raise exception 'Not authorized'; end if;
 if jsonb_typeof(p_schedule) is distinct from 'object' or coalesce(p_schedule->>'start','') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(p_schedule->>'end','') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(p_schedule->>'from','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or coalesce(p_schedule->>'to','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Invalid schedule'; end if;
 v_start:=(p_schedule->>'start')::date; v_end:=(p_schedule->>'end')::date; v_from:=(p_schedule->>'from')::time; v_to:=(p_schedule->>'to')::time; v_days:=p_schedule->'days'; v_interval:=(p_schedule->>'retry_interval_minutes')::integer;
 if v_end<v_start or (v_end+v_to)-(v_start+v_from)>interval '30 days' or v_from>=v_to or (v_start+v_from) at time zone 'Asia/Kolkata'<now()+interval '1 hour' or v_interval is null or v_interval not between 1 and 10080 or p_schedule->>'cps' is distinct from '1' or p_schedule->>'max_retries' is distinct from '0' then raise exception 'Invalid schedule limits'; end if;
 if jsonb_typeof(v_days) is distinct from 'array' then raise exception 'Invalid days'; end if;
 if jsonb_array_length(v_days) not between 1 and 7 or exists(select 1 from jsonb_array_elements_text(v_days) d where d not in ('Mon','Tue','Wed','Thu','Fri','Sat','Sun') or d is null) or (select count(distinct d) from jsonb_array_elements_text(v_days) d)<>jsonb_array_length(v_days) then raise exception 'Invalid days'; end if;
 select status into v_status from public.campaigns where id=p_campaign and dealership_id=p_dealership for update;
 if (v_status is null or v_status not in ('DRAFT','PENDING','PENDING_MANAGER_APPROVAL','PAUSED','APPROVED')) or exists(select 1 from public.voice_campaign_launches where campaign_id=p_campaign) then raise exception 'Schedule is locked'; end if;
 update public.campaign_draft_configs set configuration=jsonb_set(configuration,'{schedule}',jsonb_build_object('start',v_start::text,'end',v_end::text,'days',v_days,'from',p_schedule->>'from','to',p_schedule->>'to','cps',1,'max_retries',0,'retry_interval_minutes',v_interval)) where campaign_id=p_campaign and dealership_id=p_dealership;
 if not found then raise exception 'Missing campaign configuration'; end if;
end $$;

commit;
