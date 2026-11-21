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
  elsif octet_length(v_source::text)>4096 then v_reason:='Row data exceeds 4 KB';v_source=jsonb_build_object('notice','Oversized import row');end if;
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