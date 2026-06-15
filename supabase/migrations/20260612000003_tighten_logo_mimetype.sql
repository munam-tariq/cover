-- Tighten the public-page logo upload policy to exclude image/svg+xml — stored-XSS parity with
-- the widget-assets policy (20260612000002). SVGs can embed <script>, and the `assets` bucket is
-- public and directly navigable, so a malicious SVG URL is an XSS vector.
--
-- Trade-off: SVG logos are no longer accepted (raster formats only). Everything else matches the
-- prior policy in 20260610000004_fix_logo_storage_policy.

drop policy if exists "Owners can upload public page logos" on storage.objects;

create policy "Owners can upload public page logos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'assets'
  and (storage.foldername(storage.objects.name))[1] = 'public-page-logos'
  and exists (
    select 1 from public.projects p
    where p.id::text = (storage.foldername(storage.objects.name))[2]
      and p.user_id = auth.uid()
  )
  and (metadata ->> 'mimetype') in ('image/png', 'image/jpeg', 'image/webp', 'image/gif')
  and coalesce((metadata ->> 'size')::bigint, 0) < 2097152
);
