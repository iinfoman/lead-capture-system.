-- ---------------------------------------------------------------------------
-- Lead Capture System — Storage
--
-- A dedicated bucket keeps this app's files out of the other apps sharing the
-- Ovibe project (the storage *quota* is still shared — watch it).
--
-- Path convention, one folder per tenant:
--   <business_id>/leads/<uuid>.<ext>     lead photos   (anon may upload)
--   <business_id>/branding/<file>        logo          (owner only)
--   <business_id>/work/<file>            portfolio     (owner only)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'leadcapture-photos',
  'leadcapture-photos',
  true,                                   -- public read so <img> just works
  5242880,                                -- 5 MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Read: public, matching the public bucket flag above.
drop policy if exists "leadcapture public read" on storage.objects;
create policy "leadcapture public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'leadcapture-photos');

-- Upload from the public lead form. Deliberately narrow: only into an
-- existing active business's `leads/` folder, so the bucket can't be used as
-- free general-purpose file hosting. Size and MIME type are enforced by the
-- bucket config above, and again client-side and in the Edge Function.
--
-- Every reference to the object path is qualified as `objects.name`. Inside
-- the EXISTS subquery an unqualified `name` binds to `businesses.name` — the
-- inner table shadows the outer one — and the policy then compares a business
-- id against the wrong column and silently rejects every upload.
--
drop policy if exists "leadcapture anon upload lead photo" on storage.objects;
create policy "leadcapture anon upload lead photo" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'leadcapture-photos'
    and (storage.foldername(objects.name))[2] = 'leads'
    and exists (
      select 1 from leadcapture.businesses b
      where b.id::text = (storage.foldername(objects.name))[1] and b.active
    )
  );

-- Owners: full control of their own tenant folder, nothing outside it.
drop policy if exists "leadcapture owners write own folder" on storage.objects;
create policy "leadcapture owners write own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'leadcapture-photos'
    and (storage.foldername(objects.name))[1] in (
      select bid::text from leadcapture.user_business_ids() bid
    )
  );

drop policy if exists "leadcapture owners update own folder" on storage.objects;
create policy "leadcapture owners update own folder" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'leadcapture-photos'
    and (storage.foldername(objects.name))[1] in (
      select bid::text from leadcapture.user_business_ids() bid
    )
  );

drop policy if exists "leadcapture owners delete own folder" on storage.objects;
create policy "leadcapture owners delete own folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'leadcapture-photos'
    and (storage.foldername(objects.name))[1] in (
      select bid::text from leadcapture.user_business_ids() bid
    )
  );
