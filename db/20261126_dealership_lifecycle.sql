-- Dealership lifecycle: no cascading removal or disruption of linked business data.
begin;
alter table public.dealerships add column if not exists is_active boolean not null default true;
create or replace function public.frontvox_dealership_lifecycle(target uuid, operation text)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare ref record; linked boolean; current_active boolean;
begin
 if operation not in ('disable','enable','delete') then raise exception 'Invalid operation'; end if;
 select is_active into current_active from public.dealerships where id=target for update;
 if not found then raise exception 'Dealership not found'; end if;
 if operation='enable' then update public.dealerships set is_active=true where id=target; return; end if;
 -- Fail closed for all foreign keys, including cascade and private schema references.
 for ref in select con.conrelid, a.attname, cardinality(con.conkey) as keys, con.confkey[1] as referenced
 from pg_constraint con join pg_attribute a on a.attrelid=con.conrelid and a.attnum=con.conkey[1]
 where con.contype='f' and con.confrelid='public.dealerships'::regclass
 loop
 if ref.keys<>1 or ref.referenced<>(select attnum from pg_attribute where attrelid='public.dealerships'::regclass and attname='id') then raise exception 'Unsupported dependency'; end if;
 execute format('select exists(select 1 from %s where %I=$1)',ref.conrelid::regclass,ref.attname) into linked using target;
 if linked then raise exception 'Linked records prevent this operation'; end if;
 end loop;
 -- Private storage may contain dealership documents without a foreign key.
 if exists(select 1 from storage.objects where name like '%'||target::text||'%') then raise exception 'Linked documents prevent this operation'; end if;
 if operation='delete' then delete from public.dealerships where id=target;
 else update public.dealerships set is_active=false where id=target; end if;
end $$;
revoke all on function public.frontvox_dealership_lifecycle(uuid,text) from public,anon,authenticated;
grant execute on function public.frontvox_dealership_lifecycle(uuid,text) to service_role;
-- Prevent provisioning or attaching new records to disabled dealerships at database level.
create or replace function public.frontvox_require_active_dealership() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare target uuid; enabled boolean;
begin
 target := (to_jsonb(new)->>TG_ARGV[0])::uuid;
 if target is null then return new; end if;
 select is_active into enabled from public.dealerships where id=target for key share;
 if enabled is distinct from true then raise exception 'Dealership is disabled or unavailable'; end if;
 return new;
end $$;
revoke all on function public.frontvox_require_active_dealership() from public,anon,authenticated;
do $$ declare ref record; begin
 for ref in select distinct con.conrelid,a.attname from pg_constraint con join pg_attribute a on a.attrelid=con.conrelid and a.attnum=con.conkey[1] where con.contype='f' and con.confrelid='public.dealerships'::regclass and cardinality(con.conkey)=1 loop
 execute format('drop trigger if exists frontvox_active_dealership on %s',ref.conrelid::regclass);
 execute format('create trigger frontvox_active_dealership before insert or update of %I on %s for each row execute function public.frontvox_require_active_dealership(%L)',ref.attname,ref.conrelid::regclass,ref.attname);
 end loop;
end $$;
commit;
