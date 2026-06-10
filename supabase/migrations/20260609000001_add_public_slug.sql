-- Public Page feature: add a cosmetic URL slug to projects.
--
-- The public page lives at /c/<slug>-<project_uuid>. The trailing project UUID is the
-- real, unique lookup key; `public_slug` is a human-readable, SEO-friendly label only.
-- It is intentionally NOT UNIQUE: many tenants may share the same slug (e.g. two dental
-- practices both using "maplewood-dental") because the UUID disambiguates them.
--
-- The rest of the public-page configuration is stored in projects.settings -> 'public_page'
-- (JSONB), consistent with existing settings keys (onboarding, lead_capture_v2, widget_enabled).

alter table public.projects
  add column if not exists public_slug text;

comment on column public.projects.public_slug is
  'Cosmetic, NON-unique URL slug for the public page (/c/<slug>-<id>). Uniqueness comes from the project id, not this column.';
