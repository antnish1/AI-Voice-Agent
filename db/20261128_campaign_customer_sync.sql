begin;
create schema if not exists private_customer_sync;
revoke all on schema private_customer_sync from public,anon,authenticated;
create or replace function private_customer_sync.phone(v text) returns text language sql immutable set search_path='' as $$
select case when n ~ '^[6-9][0-9]{9}$' then '+91'||n when n ~ '^91[6-9][0-9]{9}$' then '+'||n when n ~ '^[+][1-9][0-9]{7,14}$' then n else null end from (select regexp_replace(coalesce(v,''),'[[:space:]().-]','','g') n) s
$$;
create or replace function public.sync_verified_campaign_customers(p_campaign uuid,p_dealership uuid,p_rows jsonb) returns integer language plpgsql set search_path='' as $$
declare r jsonb; n text; nm text; cid uuid; matches integer; batch uuid; seq integer:=0; added integer:=0; linked integer:=0; source jsonb; uploader uuid;
begin
 if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 250 then raise exception 'Invalid recipient batch';end if;
 select b.uploaded_by into uploader from public.campaign_recipient_batches b join public.campaigns c on c.id=b.campaign_id and c.dealership_id=b.dealership_id where b.campaign_id=p_campaign and b.dealership_id=p_dealership and not c.historical_read_only;
 if not found then raise exception 'Verified campaign batch required';end if;
 lock table public.customers in share row exclusive mode;
 for r in select value from jsonb_array_elements(p_rows) loop
  n:=private_customer_sync.phone(r->>'mobile');nm:=btrim(coalesce(r->>'name',''));source:=coalesce(r->'source_fields','{}'::jsonb);
  if n is null or length(nm) not between 2 and 150 or jsonb_typeof(source)<>'object' or octet_length(source::text)>4096 then continue;end if;
  select count(*),min(id::text)::uuid into matches,cid from public.customers where dealership_id=p_dealership and private_customer_sync.phone(mobile)=n;
  if matches>1 then continue;end if;
  if matches=0 then
   insert into public.customers(dealership_id,name,mobile,consent_status,do_not_call) values(p_dealership,nm,n,'unverified',false) returning id into cid;
   added:=added+1;
  end if;
  if not exists(select 1 from public.customer_import_rows h join public.customer_import_batches b on b.id=h.batch_id where h.customer_id=cid and h.dealership_id=p_dealership and b.filename='campaign-'||p_campaign::text||'.csv') then
   if batch is null then insert into public.customer_import_batches(dealership_id,created_by,filename) values(p_dealership,uploader,'campaign-'||p_campaign::text||'.csv') returning id into batch;end if;
   seq:=seq+1;
   insert into public.customer_import_rows(batch_id,dealership_id,row_number,customer_id,source_data,status) values(batch,p_dealership,seq+1,cid,source,case when matches=0 then 'IMPORTED' else 'MATCHED' end);
  end if;
  update public.voice_call_records v set customer_id=cid where v.dealership_id=p_dealership and v.customer_id is null and private_customer_sync.phone(v.dialed_number)=n and exists(select 1 from public.voice_campaign_links l where l.campaign_id=p_campaign and l.dealership_id=p_dealership and l.sarvam_campaign_id=v.sarvam_campaign_id and l.agent_id=v.agent_id);
 end loop;
 if batch is not null then update public.customer_import_batches set total_rows=seq,imported_rows=added,matched_rows=seq-added,rejected_rows=0 where id=batch;end if;
 return added;
end $$;
revoke all on function public.sync_verified_campaign_customers(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.sync_verified_campaign_customers(uuid,uuid,jsonb) to service_role;
grant usage on schema private_customer_sync to service_role;
create or replace function private_customer_sync.link_call() returns trigger language plpgsql set search_path='' as $$
declare n text; cid uuid; matches integer;
begin
 if new.customer_id is not null then return new;end if;
 n:=private_customer_sync.phone(new.dialed_number);if n is null then return new;end if;
 if not exists(select 1 from public.voice_campaign_links l where l.dealership_id=new.dealership_id and l.sarvam_campaign_id=new.sarvam_campaign_id and l.agent_id=new.agent_id) then return new;end if;
 select count(*),min(id::text)::uuid into matches,cid from public.customers where dealership_id=new.dealership_id and private_customer_sync.phone(mobile)=n;
 if matches=1 then new.customer_id:=cid;end if;
 return new;
end $$;
drop trigger if exists sync_customer_call_link on public.voice_call_records;
create trigger sync_customer_call_link before insert or update on public.voice_call_records for each row execute function private_customer_sync.link_call();
commit;