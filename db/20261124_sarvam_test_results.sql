begin;
create table public.voice_test_call_results (
 request_id uuid primary key references public.voice_test_call_requests(id) on delete cascade,
 status text not null check(status in ('answered','busy','no_answer','failed','other')),
 duration_seconds integer check(duration_seconds>=0),
 interaction_id text,
 started_at timestamptz,
 ended_at timestamptz,
 transcript jsonb,
 output_variables jsonb,
 last_synced_at timestamptz not null default now()
);
alter table public.voice_test_call_results enable row level security;
revoke all on public.voice_test_call_results from public,anon,authenticated;
grant select on public.voice_test_call_results to authenticated;
grant all on public.voice_test_call_results to service_role;
create policy test_results_owner on public.voice_test_call_results for select to authenticated using (exists(select 1 from public.voice_test_call_requests t where t.id=request_id and t.user_id=(select auth.uid())));
alter table public.voice_call_records add column if not exists output_variables jsonb;
commit;