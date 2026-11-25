-- Preserve existing office phone values; addresses are separate, nullable for legacy records.
alter table public.dealerships add column if not exists address text;
