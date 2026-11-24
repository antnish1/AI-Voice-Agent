-- Additive account lifecycle protection. Apply BEFORE releasing the lifecycle Edge Function.
-- No account is disabled, archived or deleted by this migration.
begin;

create schema if not exists private_account_security;
revoke all on schema private_account_security from public;
grant usage on schema private_account_security to authenticated;

-- Live lookup, rather than a stale JWT metadata claim: previously issued access
-- tokens must also lose access after archive/disable/delete.
create or replace function private_account_security.login_allowed()
returns boolean
language sql stable security definer
set search_path = ''
as $$
 select exists (
  select 1 from auth.users u
  where u.id = (select auth.uid())
    and coalesce(u.raw_app_meta_data->>'frontvox_account_state','active') = 'active'
    and (u.banned_until is null or u.banned_until <= now())
 );
$$;
revoke all on function private_account_security.login_allowed() from public, anon;
grant execute on function private_account_security.login_allowed() to authenticated;

-- Restrictive policies augment, not replace, existing tenant and role policies.
do $$
declare t record;
begin
 for t in
  select n.nspname as schema_name, c.relname as table_name
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where c.relrowsecurity and c.relkind in ('r','p')
    and (n.nspname='public' or (n.nspname='storage' and c.relname in ('objects','buckets')))
 loop
  execute format('drop policy if exists frontvox_active_account_required on %I.%I',t.schema_name,t.table_name);
  execute format('create policy frontvox_active_account_required on %I.%I as restrictive for all to authenticated using ((select private_account_security.login_allowed())) with check ((select private_account_security.login_allowed()))',t.schema_name,t.table_name);
 end loop;
end $$;

-- Service-role-only RPC. No browser access; the Edge Function independently
-- verifies the exact IT identity, membership and selected viewer account.
create or replace function public.frontvox_account_dependencies(target_user uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
 dep record;
 total bigint;
 result jsonb := '[]'::jsonb;
begin
 if coalesce(auth.jwt()->>'role','') <> 'service_role' then
  raise exception 'Service role required' using errcode='42501';
 end if;
 if target_user is null or not exists(select 1 from auth.users where id=target_user) then
  raise exception 'Account not found';
 end if;
 if not exists(select 1 from public.memberships where user_id=target_user)
    or exists(select 1 from public.memberships where user_id=target_user and role<>'management') then
  raise exception 'Only dealership viewer accounts are eligible';
 end if;

 -- Inspect all direct external foreign keys. Membership is the only intentionally
 -- removed app record. Any additional cascading/unsupported FK blocks deletion
 -- even if empty, until reviewed. NO ACTION/RESTRICT FKs also enforce the
 -- final delete at the database layer if a concurrent reference appears.
 for dep in
  select n.nspname schema_name,c.relname table_name,con.conname constraint_name,
         con.confdeltype delete_action,cardinality(con.conkey) key_count,
         a.attname column_name, a.atttypid column_type,
         f.attname referenced_column
  from pg_catalog.pg_constraint con
  join pg_catalog.pg_class c on c.oid=con.conrelid
  join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  left join pg_catalog.pg_attribute a on a.attrelid=con.conrelid and a.attnum=con.conkey[1]
  left join pg_catalog.pg_attribute f on f.attrelid=con.confrelid and f.attnum=con.confkey[1]
  where con.contype='f' and con.confrelid='auth.users'::regclass
    and n.nspname<>'auth'
 loop
  if dep.schema_name='public' and dep.table_name='memberships' and dep.column_name='user_id' and dep.key_count=1 and dep.delete_action='c' then
   continue;
  end if;
  if dep.key_count<>1 or dep.column_type<>'uuid'::regtype or dep.referenced_column<>'id'
     or dep.delete_action not in ('a','r') then
   result:=result||jsonb_build_array(jsonb_build_object('label',dep.schema_name||'.'||dep.table_name||' / '||dep.constraint_name,'count',null,'reason','Unreviewed foreign-key dependency; permanent deletion blocked.'));
   continue;
  end if;
  execute format('select count(*) from %I.%I where %I=$1',dep.schema_name,dep.table_name,dep.column_name) into total using target_user;
  if total>0 then
   result:=result||jsonb_build_array(jsonb_build_object('label',dep.schema_name||'.'||dep.table_name||'.'||dep.column_name,'count',total,'reason','Protected business records'));
  end if;
 end loop;

 -- Do not permit a new dependent schema to cascade through membership deletion.
 for dep in
  select n.nspname schema_name,c.relname table_name,con.conname constraint_name
  from pg_catalog.pg_constraint con
  join pg_catalog.pg_class c on c.oid=con.conrelid
  join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where con.contype='f' and con.confrelid='public.memberships'::regclass
 loop
  result:=result||jsonb_build_array(jsonb_build_object('label',dep.schema_name||'.'||dep.table_name||' / '||dep.constraint_name,'count',null,'reason','Membership dependency requires review.'));
 end loop;

 select count(*) into total from storage.objects
 where owner=target_user or owner_id=target_user::text
   or (bucket_id='frontier-profile-avatars' and split_part(name,'/',1)=target_user::text);
 if total>0 then result:=result||jsonb_build_array(jsonb_build_object('label','Storage objects','count',total,'reason','File ownership or profile files')); end if;
 select count(*) into total from storage.buckets where owner=target_user or owner_id=target_user::text;
 if total>0 then result:=result||jsonb_build_array(jsonb_build_object('label','Storage buckets','count',total,'reason','Protected storage ownership')); end if;
 select count(*) into total from storage.s3_multipart_uploads where owner_id=target_user::text;
 if total>0 then result:=result||jsonb_build_array(jsonb_build_object('label','Pending storage uploads','count',total,'reason','Protected upload ownership')); end if;
 select count(*) into total from storage.s3_multipart_uploads_parts where owner_id=target_user::text;
 if total>0 then result:=result||jsonb_build_array(jsonb_build_object('label','Pending upload parts','count',total,'reason','Protected upload ownership')); end if;
 select count(*) into total from internal.staff_invitation_requests i
 where exists(select 1 from auth.users u where u.id=target_user and
   (lower(i.email)=lower(u.email) or lower(i.email)=lower(u.raw_app_meta_data->>'frontvox_original_login_email')));
 if total>0 then result:=result||jsonb_build_array(jsonb_build_object('label','Staff invitation history','count',total,'reason','Historical account records')); end if;
 return result;
end;
$$;
revoke all on function public.frontvox_account_dependencies(uuid) from public, anon, authenticated;
grant execute on function public.frontvox_account_dependencies(uuid) to service_role;
commit;
