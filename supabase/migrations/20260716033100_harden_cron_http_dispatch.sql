-- Make scheduled HTTP dispatch truthful and give slow jobs enough time to finish.
--
-- Previously, missing Vault values raised only a NOTICE and returned. pg_cron therefore recorded a
-- successful SQL run even though no HTTP request existed. A missing per-environment deployment
-- setting is an operational failure and must be visible in cron.job_run_details.
--
-- pg_net on staging defaults to a 5-second request timeout. classify-insights performs bounded LLM
-- work and has empirically taken about 150 seconds for a backlog, so it needs a deliberately longer
-- timeout. The cheap presence/cleanup endpoints keep a short bound.
create or replace function private.trigger_cron_endpoint(endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  base       text;
  secret     text;
  timeout_ms integer := case
    when endpoint = '/api/cron/classify-insights' then 600000
    else 30000
  end;
begin
  select decrypted_secret
  into base
  from vault.decrypted_secrets
  where name = 'cron_api_base_url';

  select decrypted_secret
  into secret
  from vault.decrypted_secrets
  where name = 'cron_secret';

  if base is null or secret is null then
    raise exception
      'cron config missing (set Vault secrets cron_api_base_url and cron_secret)'
      using errcode = '22023';
  end if;

  perform net.http_post(
    url                  := base || endpoint,
    headers              := jsonb_build_object(
      'Authorization', 'Bearer ' || secret,
      'Content-Type',  'application/json'
    ),
    body                 := '{}'::jsonb,
    timeout_milliseconds := timeout_ms
  );
end;
$$;

revoke all on function private.trigger_cron_endpoint(text) from public;
