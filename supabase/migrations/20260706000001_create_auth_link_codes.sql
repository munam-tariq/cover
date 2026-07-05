-- Short-lived relay codes for cross-browser magic-link sign-in.
-- A foreign browser (e.g. Gmail in-app) stashes the PKCE auth code here under a
-- 6-digit display code; the originating browser claims it and completes the
-- exchange locally. Rows are single-use and expire after 5 minutes.

create table if not exists public.auth_link_codes (
  display_code text primary key,
  auth_code text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- Service-role access only: RLS on with no policies denies anon/authenticated,
-- and the explicit revoke removes the default table grants as well.
alter table public.auth_link_codes enable row level security;

revoke all on table public.auth_link_codes from anon, authenticated;
