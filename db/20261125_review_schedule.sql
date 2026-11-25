begin;
create schema if not exists private_review_schedule;
revoke all on schema private_review_schedule from public;
grant usage on schema private_review_schedule to authenticated;
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
 if v_status is distinct from 'DRAFT' or exists(select 1 from public.voice_campaign_launches where campaign_id=p_campaign) then raise exception 'Schedule is locked'; end if;
 update public.campaign_draft_configs set configuration=jsonb_set(configuration,'{schedule}',jsonb_build_object('start',v_start::text,'end',v_end::text,'days',v_days,'from',p_schedule->>'from','to',p_schedule->>'to','cps',1,'max_retries',0,'retry_interval_minutes',v_interval)) where campaign_id=p_campaign and dealership_id=p_dealership;
 if not found then raise exception 'Missing campaign configuration'; end if;
end $$;
revoke all on function private_review_schedule.save_schedule(uuid,uuid,jsonb) from public,anon;
grant execute on function private_review_schedule.save_schedule(uuid,uuid,jsonb) to authenticated;
create or replace function public.frontvox_save_review_schedule(p_campaign uuid,p_dealership uuid,p_schedule jsonb) returns void language sql security invoker set search_path='' as $$ select private_review_schedule.save_schedule(p_campaign,p_dealership,p_schedule); $$;
revoke all on function public.frontvox_save_review_schedule(uuid,uuid,jsonb) from public,anon;
grant execute on function public.frontvox_save_review_schedule(uuid,uuid,jsonb) to authenticated;
commit;
