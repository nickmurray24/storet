-- Storet Backend Phase 7
-- Supabase Storage bucket and policies for listing photos.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Recreate policies so this script is safe to rerun during development.
drop policy if exists "Public can read listing images" on storage.objects;
drop policy if exists "Authenticated users can upload own listing images" on storage.objects;
drop policy if exists "Authenticated users can update own listing images" on storage.objects;
drop policy if exists "Authenticated users can delete own listing images" on storage.objects;

create policy "Public can read listing images"
on storage.objects
for select
using (bucket_id = 'listing-images');

create policy "Authenticated users can upload own listing images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Authenticated users can update own listing images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Authenticated users can delete own listing images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
