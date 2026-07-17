-- Retune the cron cadences to match what the jobs now do.
--
-- conversation-cleanup: hourly -> every 5 minutes.
--   The warn/close timings are per-project and default to 10 minutes then 5 more. At an hourly tick
--   the timer's resolution is 60 minutes, so a 10/5 rule is simply not expressible. Every 5 minutes
--   bounds the slop at 5 minutes on each transition and matches agent-presence's existing cadence.
--
-- classify-insights: daily at 03:00 -> hourly.
--   Selection is now terminal-state (status IN ('resolved','closed') AND no insight row yet), which
--   is exactly-once by construction, so a higher frequency does not re-bill the same conversation.
--   It also means insights land within ~1h of a chat closing instead of up to 24h later.
--
-- Applied AFTER the app code that calls the new RPCs, so a 5-minute cadence never runs against the
-- old logic.
--
-- NOTE (staging): private.trigger_cron_endpoint returns early unless the `cron_api_base_url` and
-- `cron_secret` Vault secrets exist. Staging's vault is empty, so these jobs have logged "succeeded"
-- while doing nothing for 33 days. cron.job_run_details cannot show that -- only net._http_response
-- can. Set the secrets on staging or the retune below changes nothing there.

select cron.alter_job(
  (select jobid from cron.job where jobname = 'conversation-cleanup'),
  schedule => '*/5 * * * *'
);

select cron.alter_job(
  (select jobid from cron.job where jobname = 'classify-insights'),
  schedule => '0 * * * *'
);
