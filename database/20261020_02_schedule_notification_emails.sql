-- Run AFTER migration 01, deploying the function, and creating the two Vault secrets in README.
-- Supabase SQL Editor (postgres role). Safe to re-run.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name='storet_notification_worker_url')
     or not exists (select 1 from vault.decrypted_secrets where name='storet_notification_worker_secret') then
    raise exception 'Create storet_notification_worker_url and storet_notification_worker_secret in Vault first (see README).';
  end if;
end;
$$;

select cron.schedule(
  'storet-notification-emails',
  '* * * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name='storet_notification_worker_url' limit 1),
      headers := jsonb_build_object('Content-Type','application/json','x-storet-email-secret',
        (select decrypted_secret from vault.decrypted_secrets where name='storet_notification_worker_secret' limit 1)),
      body := '{}'::jsonb,
      timeout_milliseconds := 110000
    );
  $job$
);
