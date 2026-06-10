-- Tighten the public-page logo upload policy (security review, Medium).
--
-- The v1 policy let ANY authenticated user insert ANY file under public-page-logos/ with no
-- MIME or size limits (bucket-level limits are not usable: `assets` also hosts the widget JS
-- bundles). Scope uploads to public-page-logos/<projectId>/... for projects the caller owns,
-- images only, max 2 MB.

drop policy if exists "Authenticated can upload public page logos" on storage.objects;

create policy "Owners can upload public page logos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'assets'
  and (storage.foldername(name))[1] = 'public-page-logos'
  and exists (
    select 1 from public.projects p
    where p.id::text = (storage.foldername(name))[2]
      and p.user_id = auth.uid()
  )
  and (metadata ->> 'mimetype') like 'image/%'
  and coalesce((metadata ->> 'size')::bigint, 0) < 2097152
);
