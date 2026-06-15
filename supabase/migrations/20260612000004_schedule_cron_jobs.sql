-- Schedule the active cron jobs via pg_cron + pg_net.
-- Postgres POSTs to the API's /api/cron/* endpoints on a schedule (the endpoints verify
-- CRON_SECRET). Replaces relying on an external scheduler.
--
-- Jobs (audited 2026-06-12 — only the ones actually used today are scheduled):
--   agent-presence       every 5 min  — flip stale agents away/offline (agent_availability)
--   conversation-cleanup hourly       — close conversations abandoned >24h
--   classify-insights    nightly 03:00 UTC — topic/sentiment/answer-gap classification
-- (lead-digest was retired — V1, superseded by answer-gaps.)
--
-- ENV-AGNOSTIC: the API base URL and CRON_SECRET are read from Supabase Vault at run time,
-- so this same migration is correct on dev and prod. Set the two secrets per-environment
-- OUTSIDE version control (values differ, and the secret must never be committed):
--   select vault.create_secret('https://api.frontface.app', 'cron_api_base_url');  -- prod
--   select vault.create_secret('<CRON_SECRET>',             'cron_secret');
-- Until BOTH secrets exist the jobs run but no-op, so applying this migration is always safe.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create schema if not exists private;

-- Reads the per-env base URL + secret from Vault and fires the POST. SECURITY DEFINER so the
-- scheduled job can read Vault + call net; search_path pinned for safety.
create or replace function private.trigger_cron_endpoint(endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  base   text;
  secret text;
begin
  select decrypted_secret into base   from vault.decrypted_secrets where name = 'cron_api_base_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'cron_secret';

  if base is null or secret is null then
    raise notice 'cron config missing (set vault secrets cron_api_base_url + cron_secret); skipping %', endpoint;
    return;
  end if;

  perform net.http_post(
    url     := base || endpoint,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || secret,
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
end;
$$;

revoke all on function private.trigger_cron_endpoint(text) from public;

-- (Re)schedule. cron.schedule upserts by job name, so re-running this migration is idempotent.
select cron.schedule('agent-presence',       '*/5 * * * *', $$select private.trigger_cron_endpoint('/api/cron/agent-presence')$$);
select cron.schedule('conversation-cleanup', '0 * * * *',   $$select private.trigger_cron_endpoint('/api/cron/conversation-cleanup')$$);
select cron.schedule('classify-insights',    '0 3 * * *',   $$select private.trigger_cron_endpoint('/api/cron/classify-insights')$$);
