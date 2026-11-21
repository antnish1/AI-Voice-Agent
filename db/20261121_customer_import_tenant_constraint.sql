drop policy if exists customer_import_rows_add on public.customer_import_rows;
create policy customer_import_rows_add on public.customer_import_rows for insert to authenticated
 with check(
  exists(select 1 from public.customer_import_batches b where b.id=batch_id
   and b.dealership_id=customer_import_rows.dealership_id and b.created_by=(select auth.uid()))
  and (customer_id is null or exists(select 1 from public.customers c where c.id=customer_id
   and c.dealership_id=customer_import_rows.dealership_id))
  and exists(select 1 from public.memberships m where m.dealership_id=customer_import_rows.dealership_id
   and m.user_id=(select auth.uid()) and m.role in('super_admin','dealership_manager','crm_executive'))
 );