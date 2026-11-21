-- Profile pictures are private and scoped to the authenticated owner's user UUID.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('frontier-profile-avatars','frontier-profile-avatars',false,2097152,array['image/jpeg'])
on conflict (id) do update set public=false,file_size_limit=2097152,allowed_mime_types=array['image/jpeg'];
create policy frontier_profile_avatar_read on storage.objects for select to authenticated
 using (bucket_id='frontier-profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy frontier_profile_avatar_create on storage.objects for insert to authenticated
 with check (bucket_id='frontier-profile-avatars'
   and (storage.foldername(name))[1]=(select auth.uid())::text
   and storage.extension(name)='jpg');
create policy frontier_profile_avatar_remove on storage.objects for delete to authenticated
 using (bucket_id='frontier-profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);