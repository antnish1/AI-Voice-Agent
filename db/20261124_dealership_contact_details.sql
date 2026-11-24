-- Add optional dealership directory details. Existing dealership names and IDs are untouched.
alter table public.dealerships
 add column if not exists contact text,
 add column if not exists mobile text,
 add column if not exists contact_person text,
 add column if not exists email text;
comment on column public.dealerships.contact is 'Dealership office / landline contact';
comment on column public.dealerships.mobile is 'Dealership primary mobile number';
comment on column public.dealerships.contact_person is 'Dealership contact person name';
comment on column public.dealerships.email is 'Dealership contact email';
