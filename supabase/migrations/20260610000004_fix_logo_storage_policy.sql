-- Fix a correlated-subquery name-shadowing bug in the logo upload policy.
--
-- In 20260610000003 the EXISTS subquery referenced the unqualified `name`, which Postgres
-- resolved to `projects.name` (the inner table) instead of the uploaded object's
-- `storage.objects.name`. The policy therefore evaluated `storage.foldername(projects.name)[2]`,
-- which never matches a project id, so every authenticated logo upload was denied.
--
-- Qualify the column as `storage.objects.name` so the path check works as intended.

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
  and (metadata ->> 'mimetype') like 'image/%'
  and coalesce((metadata ->> 'size')::bigint, 0) < 2097152
);
