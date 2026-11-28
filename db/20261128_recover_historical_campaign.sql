begin;
-- Recovered campaigns are archival only; never make them launchable.
alter table public.campaigns add column if not exists historical_read_only boolean not null default false;
create schema if not exists private_campaign_history;
revoke all on schema private_campaign_history from public,anon,authenticated;
create or replace function private_campaign_history.protect_archive() returns trigger language plpgsql set search_path='' as $$
begin
 if old.historical_read_only then raise exception 'Historical campaign is read-only'; end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
drop trigger if exists protect_historical_campaign on public.campaigns;
create trigger protect_historical_campaign before update or delete on public.campaigns for each row execute function private_campaign_history.protect_archive();
create or replace function private_campaign_history.prevent_archive_launch() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from public.campaigns c where c.id=new.campaign_id and c.historical_read_only) then raise exception 'Historical campaign cannot launch'; end if;
 return new;
end $$;
drop trigger if exists prevent_archive_launch on public.voice_campaign_launches;
create trigger prevent_archive_launch before insert or update on public.voice_campaign_launches for each row execute function private_campaign_history.prevent_archive_launch();
do $$
declare d uuid:='98468a52-9b19-4647-9ae5-6ac984cc6b57'; ext text:='MG-Remainin-348e8be3-4718'; cid uuid; a text; first_call timestamptz;
begin
 perform pg_advisory_xact_lock(hashtext(ext));
 if not exists(select 1 from public.voice_call_records where sarvam_campaign_id=ext) or exists(select 1 from public.voice_call_records where sarvam_campaign_id=ext and dealership_id<>d) then raise exception 'Historical scope mismatch'; end if;
 if (select count(distinct agent_id) from public.voice_call_records where sarvam_campaign_id=ext)<>1 then raise exception 'Historical agent mismatch'; end if;
 select min(agent_id),min(started_at) into a,first_call from public.voice_call_records where dealership_id=d and sarvam_campaign_id=ext;
 select campaign_id into cid from public.voice_campaign_links where sarvam_campaign_id=ext and dealership_id=d and agent_id=a;
 if cid is null then
  if exists(select 1 from public.voice_campaign_links where sarvam_campaign_id=ext) then raise exception 'Conflicting provider mapping'; end if;
  insert into public.campaigns(dealership_id,name,status,created_by,created_at,historical_read_only) values(d,'MG Remaining November','PAUSED','5bd78ada-44f5-4045-a9fb-75c9dad69893',first_call,true) returning id into cid;
  insert into public.voice_campaign_links(dealership_id,campaign_id,sarvam_campaign_id,agent_id) values(d,cid,ext,a);
 end if;
 if not exists(select 1 from public.campaigns where id=cid and dealership_id=d and historical_read_only) then raise exception 'Existing mapping is not archival'; end if;
 -- Serialize against concurrent master imports during the bounded backfill.
 lock table public.customers in share row exclusive mode;
 insert into public.customers(dealership_id,name,mobile,consent_status,do_not_call)
 select distinct on (right(v.dialed_number,10)) d,trim(v.output_variables->>'customer_name'),'+91'||right(v.dialed_number,10),'unverified',true
 from public.voice_call_records v where v.dealership_id=d and v.sarvam_campaign_id=ext and v.dialed_number ~ '^([+]91|91)?[6-9][0-9]{9}$' and length(trim(v.output_variables->>'customer_name')) between 2 and 150
 and not exists(select 1 from public.voice_test_call_requests t where t.sarvam_attempt_id=v.sarvam_attempt_id)
 and not exists(select 1 from public.customers c where c.dealership_id=d and right(regexp_replace(c.mobile,'[^0-9]','','g'),10)=right(v.dialed_number,10))
 order by right(v.dialed_number,10),v.started_at desc;
 update public.voice_call_records v set customer_id=c.id from public.customers c where v.dealership_id=d and v.sarvam_campaign_id=ext and v.customer_id is null and c.dealership_id=d and v.dialed_number ~ '^([+]91|91)?[6-9][0-9]{9}$' and right(regexp_replace(c.mobile,'[^0-9]','','g'),10)=right(v.dialed_number,10)
 and (select count(*) from public.customers x where x.dealership_id=d and right(regexp_replace(x.mobile,'[^0-9]','','g'),10)=right(v.dialed_number,10))=1;
 insert into public.campaign_prospects(campaign_id,dealership_id,recipient_identifier,mobile,customer_name,registration_number,vehicle_model,service_type,service_due,last_service,customer_source,readiness,queue_state,call_summary)
 select distinct on (right(v.dialed_number,10)) cid,d,'historical:'||right(v.dialed_number,10),'+91'||right(v.dialed_number,10),v.output_variables->>'customer_name',v.output_variables->>'registration_number',v.output_variables->>'vehicle_model',v.output_variables->>'service_type',v.output_variables->>'next_service_due_date',v.output_variables->>'last_service_date','crm','held',case v.status when 'answered' then 'connected' when 'no_answer' then 'no_answer' else 'other' end,left(v.output_variables->>'call_summary',2000)
 from public.voice_call_records v where v.dealership_id=d and v.sarvam_campaign_id=ext and v.customer_id is not null and v.dialed_number ~ '^([+]91|91)?[6-9][0-9]{9}$' order by right(v.dialed_number,10),v.started_at desc
 on conflict(campaign_id,mobile) do nothing;
end $$;
commit;