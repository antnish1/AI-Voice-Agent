-- Dedicated private document bucket, dealership folder isolation.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('frontier-crm-private','frontier-crm-private',false,10485760,
 array['application/pdf','text/csv','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;
create policy frontier_crm_documents_read on storage.objects
 for select to authenticated using (
 bucket_id='frontier-crm-private'
 and exists(select 1 from public.memberships m
   where m.user_id=(select auth.uid())
   and m.dealership_id::text=split_part(name,'/',1))
 );
create policy frontier_crm_documents_add on storage.objects
 for insert to authenticated with check (
 bucket_id='frontier-crm-private'
 and name like '%/%'
 and exists(select 1 from public.memberships m
   where m.user_id=(select auth.uid()) and m.dealership_id::text=split_part(name,'/',1)
   and m.role in ('super_admin','dealership_manager','crm_executive'))
 );
create policy frontier_crm_documents_update on storage.objects
 for update to authenticated
 using (
 bucket_id='frontier-crm-private'
 and exists(select 1 from public.memberships m
   where m.user_id=(select auth.uid()) and m.dealership_id::text=split_part(name,'/',1)
   and m.role in ('super_admin','dealership_manager','crm_executive'))
 )
 with check (
 bucket_id='frontier-crm-private'
 and exists(select 1 from public.memberships m
   where m.user_id=(select auth.uid()) and m.dealership_id::text=split_part(name,'/',1)
   and m.role in ('super_admin','dealership_manager','crm_executive'))
 );
create policy frontier_crm_documents_delete on storage.objects
 for delete to authenticated using (
 bucket_id='frontier-crm-private'
 and exists(select 1 from public.memberships m
   where m.user_id=(select auth.uid()) and m.dealership_id::text=split_part(name,'/',1)
   and m.role in ('super_admin','dealership_manager','crm_executive'))
 );