-- Stage 1 dealership CSV import. Never grants call consent or triggers dialing.
create table if not exists public.customer_import_batches(
 id uuid primary key default gen_random_uuid(),
 dealership_id uuid not null references public.dealerships(id),
 created_by uuid not null references auth.users(id),
 filename text not null,
 total_rows integer not null default 0,
 imported_rows integer not null default 0,
 matched_rows integer not null default 0,
 rejected_rows integer not null default 0,
 created_at timestamptz not null default now(),
 constraint batch_filename_length check (char_length(filename) between 1 and 200)
);
create table if not exists public.customer_import_rows(
 id uuid primary key default gen_random_uuid(),
 batch_id uuid not null references public.customer_import_batches(id) on delete cascade,
 dealership_id uuid not null references public.dealerships(id),
 row_number integer not null,
 customer_id uuid references public.customers(id),
 source_data jsonb not null default '{}'::jsonb,
 status text not null check (status in ('IMPORTED','MATCHED','REJECTED')),
 error_reason text,
 unique(batch_id,row_number),
 constraint row_data_object check(jsonb_typeof(source_data)='object'),
 constraint row_data_size check(octet_length(source_data::text)<=4096)
);
create index if not exists customer_import_batches_dealer_idx on public.customer_import_batches(dealership_id,created_at desc);
create index if not exists customer_import_rows_batch_idx on public.customer_import_rows(batch_id);
alter table public.customer_import_batches enable row level security;
alter table public.customer_import_rows enable row level security;
revoke all on public.customer_import_batches,public.customer_import_rows from anon,authenticated;
grant select,insert on public.customer_import_batches,public.customer_import_rows to authenticated;
grant update (total_rows,imported_rows,matched_rows,rejected_rows) on public.customer_import_batches to authenticated;
-- Crucially importers can insert contact identity only, not modify consent or do-not-call flags.
grant insert (dealership_id,name,mobile) on public.customers to authenticated;
create policy customers_staff_import_insert on public.customers for insert to authenticated
 with check(exists(select 1 from public.memberships m where m.dealership_id=customers.dealership_id
  and m.user_id=(select auth.uid()) and m.role in('super_admin','dealership_manager','crm_executive')));
create policy customer_import_batches_read on public.customer_import_batches for select to authenticated
 using(exists(select 1 from public.memberships m where m.dealership_id=customer_import_batches.dealership_id and m.user_id=(select auth.uid()))); 
create policy customer_import_batches_add on public.customer_import_batches for insert to authenticated
 with check(created_by=(select auth.uid()) and exists(select 1 from public.memberships m
  where m.dealership_id=customer_import_batches.dealership_id and m.user_id=(select auth.uid())
  and m.role in('super_admin','dealership_manager','crm_executive')));
create policy customer_import_batches_finish on public.customer_import_batches for update to authenticated
 using(created_by=(select auth.uid()) and exists(select 1 from public.memberships m
  where m.dealership_id=customer_import_batches.dealership_id and m.user_id=(select auth.uid())
  and m.role in('super_admin','dealership_manager','crm_executive')))
 with check(created_by=(select auth.uid()) and exists(select 1 from public.memberships m
  where m.dealership_id=customer_import_batches.dealership_id and m.user_id=(select auth.uid())
  and m.role in('super_admin','dealership_manager','crm_executive')));
create policy customer_import_rows_read on public.customer_import_rows for select to authenticated
 using(exists(select 1 from public.memberships m where m.dealership_id=customer_import_rows.dealership_id and m.user_id=(select auth.uid())));
create policy customer_import_rows_add on public.customer_import_rows for insert to authenticated
 with check(exists(select 1 from public.customer_import_batches b where b.id=batch_id
  and b.dealership_id=customer_import_rows.dealership_id and b.created_by=(select auth.uid()))
  and exists(select 1 from public.memberships m where m.dealership_id=customer_import_rows.dealership_id
  and m.user_id=(select auth.uid()) and m.role in('super_admin','dealership_manager','crm_executive')));
create or replace function public.import_dealership_customers(
 p_dealership_id uuid, p_filename text, p_records jsonb
) returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v_user uuid;v_batch uuid;v_item jsonb;v_name text;v_mobile text;v_source jsonb;v_customer uuid;
        v_total integer:=0;v_imported integer:=0;v_matched integer:=0;v_rejected integer:=0;
        v_reason text;v_row integer:=1;v_seen text[]:=array[]::text[];v_key text;
begin
 v_user:=(select auth.uid());
 if v_user is null or not exists(select 1 from public.memberships m where m.user_id=v_user
    and m.dealership_id=p_dealership_id and m.role in ('super_admin','dealership_manager','crm_executive'))
 then raise exception 'Not authorized for this dealership';end if;
 if p_filename is null or char_length(btrim(p_filename)) not between 1 and 200 then raise exception 'Invalid filename';end if;
 if p_records is null or jsonb_typeof(p_records)<>'array' or jsonb_array_length(p_records)<1
    or jsonb_array_length(p_records)>500 or octet_length(p_records::text)>300000
 then raise exception 'Upload must contain between 1 and 500 records, maximum 300 KB';end if;
 insert into public.customer_import_batches(dealership_id,created_by,filename)
 values(p_dealership_id,v_user,p_filename) returning id into v_batch;
 for v_item in select value from jsonb_array_elements(p_records) loop
  v_row:=v_row+1;v_total:=v_total+1;v_customer:=null;v_reason:=null;
  v_name:=btrim(coalesce(v_item->>'name',''));
  v_mobile:=regexp_replace(coalesce(v_item->>'mobile',''),'[(). -]','','g');
  v_source:=case when jsonb_typeof(v_item->'source_fields')='object' then v_item->'source_fields' else '{}'::jsonb end;
  if jsonb_typeof(v_item)<>'object' then v_reason:='Malformed row';
  elsif char_length(v_name) not between 2 and 150 then v_reason:='Invalid customer name';
  elsif v_mobile !~ '^\+?[1-9][0-9]{7,14}$' then v_reason:='Invalid mobile number';
  elsif octet_length(v_source::text)>4096 then v_reason:='Row data exceeds 4 KB';end if;
  v_key:=lower(v_name)||'|'||v_mobile;
  if v_reason is null and v_key=any(v_seen) then v_reason:='Duplicate record in this file';end if;
  if v_reason is null then
   v_seen:=array_append(v_seen,v_key);
   select c.id into v_customer from public.customers c where c.dealership_id=p_dealership_id
     and lower(c.name)=lower(v_name) and c.mobile=v_mobile limit 1;
   if v_customer is not null then
    v_matched:=v_matched+1;
    insert into public.customer_import_rows(batch_id,dealership_id,row_number,customer_id,source_data,status)
    values(v_batch,p_dealership_id,v_row,v_customer,v_source,'MATCHED');
   else
    insert into public.customers(dealership_id,name,mobile) values(p_dealership_id,v_name,v_mobile)
      returning id into v_customer;
    v_imported:=v_imported+1;
    insert into public.customer_import_rows(batch_id,dealership_id,row_number,customer_id,source_data,status)
    values(v_batch,p_dealership_id,v_row,v_customer,v_source,'IMPORTED');
   end if;
  else
   v_rejected:=v_rejected+1;
   insert into public.customer_import_rows(batch_id,dealership_id,row_number,source_data,status,error_reason)
   values(v_batch,p_dealership_id,v_row,v_source,'REJECTED',v_reason);
  end if;
 end loop;
 update public.customer_import_batches set total_rows=v_total,imported_rows=v_imported,
 matched_rows=v_matched,rejected_rows=v_rejected where id=v_batch;
 return jsonb_build_object('batch_id',v_batch,'total_rows',v_total,'imported_rows',v_imported,
  'matched_rows',v_matched,'rejected_rows',v_rejected);
end $$;
revoke all on function public.import_dealership_customers(uuid,text,jsonb) from public,anon;
grant execute on function public.import_dealership_customers(uuid,text,jsonb) to authenticated;