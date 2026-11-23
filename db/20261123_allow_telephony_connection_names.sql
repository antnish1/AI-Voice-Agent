-- Permit Sarvam connection display names to be saved without confusing them with verified IDs.
-- The server action refuses to activate profiles containing a display name.
alter table public.dealership_voice_profiles
 drop constraint if exists dealership_voice_profiles_connection_id_check;
alter table public.dealership_voice_profiles
 add constraint dealership_voice_profiles_connection_id_check
 check (connection_id ~ '^[A-Za-z0-9][A-Za-z0-9 _().-]{2,199}$');
-- Prevent accidentally making a display label an active provider connection ID.
alter table public.dealership_voice_profiles
 drop constraint if exists dealership_voice_profiles_active_connection_id_check;
alter table public.dealership_voice_profiles
 add constraint dealership_voice_profiles_active_connection_id_check
 check (not active or connection_id ~ '^[A-Za-z0-9_.-]{3,200} international E.164 in storage; the website
-- normalizes Indian local numbers before sending them to the database.
);
-- Caller numbers remain strictly international E.164 in storage; the website
-- normalizes Indian local numbers before sending them to the database.
