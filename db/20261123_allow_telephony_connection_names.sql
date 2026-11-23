-- Permit Sarvam connection display names to be saved without confusing them with verified IDs.
-- The server action refuses to activate profiles containing a display name.
alter table public.dealership_voice_profiles
 drop constraint if exists dealership_voice_profiles_connection_id_check;
alter table public.dealership_voice_profiles
 add constraint dealership_voice_profiles_connection_id_check
 check (connection_id ~ '^[A-Za-z0-9][A-Za-z0-9 _().-]{2,199}$');
-- Caller numbers remain strictly international E.164 in storage; the website
-- normalizes Indian local numbers before sending them to the database.
