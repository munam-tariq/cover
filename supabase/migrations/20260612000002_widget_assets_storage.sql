-- Widget Customization (Chatbase gap 6): allow avatar / launcher-icon uploads to the public
-- `assets` bucket under the `widget-assets/<projectId>/` prefix.
--
-- The dashboard uploads these images directly from the browser (authenticated user), the same
-- way public-page logos work (see 20260610000004_fix_logo_storage_policy). Scope inserts to
-- projects the caller owns, images only, max 2 MB. Reads stay public (the bucket is public).
-- Note: storage.objects.name is fully qualified to avoid the projects.name shadowing bug fixed
-- in the logo policy.
--
-- Raster types only — `image/svg+xml` is excluded on purpose: SVGs can embed <script>, so a
-- public, directly-navigable SVG URL is a stored-XSS vector. Avatars/launchers are bitmaps, so
-- there is no reason to allow SVG here.

create policy "Owners can upload widget assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'assets'
  and (storage.foldername(storage.objects.name))[1] = 'widget-assets'
  and exists (
    select 1 from public.projects p
    where p.id::text = (storage.foldername(storage.objects.name))[2]
      and p.user_id = auth.uid()
  )
  and (metadata ->> 'mimetype') in ('image/png', 'image/jpeg', 'image/webp', 'image/gif')
  and coalesce((metadata ->> 'size')::bigint, 0) < 2097152
);
