-- Public Page feature: allow logo uploads to the public `assets` bucket.
--
-- The dashboard uploads a custom logo directly from the browser (authenticated user) to the
-- public `assets` bucket under the `public-page-logos/` prefix. storage.objects had NO INSERT
-- policy, so with RLS enabled every non-service-role upload was denied (silent failure in the UI).
--
-- This grants INSERT only to authenticated users and only under the public-page-logos/ prefix,
-- so it cannot touch other paths in the bucket (e.g. the widget bundles). Reads stay public
-- because the `assets` bucket is public.

create policy "Authenticated can upload public page logos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'assets'
  and (storage.foldername(name))[1] = 'public-page-logos'
);
