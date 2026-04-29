-- FASE 17.B — pg_cron schedule para document-jobs-process
-- Authority: ADR-062 + plan FASE_17_DOCUMENT_INTEL.md addendum v3.
-- Memoria 25: Vercel Hobby NO permite crons sub-daily; pg_cron Supabase asume el rol.
-- Frecuencia: cada 1 minuto (loop procesa hasta 5 jobs por invocación).
--
-- Pre-requisito (set una sola vez por DBA):
--   alter database postgres set app.cron_secret = '<CRON_SECRET>';
--   alter database postgres set app.deployment_url = 'https://desarrollos-mx-ie-2026-final.vercel.app';
-- Si esos GUCs no están set, el cron loguea error pero no rompe el resto del pipeline.

do $$
declare
  v_url text := current_setting('app.deployment_url', true);
  v_secret text := current_setting('app.cron_secret', true);
begin
  -- Idempotente: si ya existe un job con este nombre, lo elimina antes de re-crear.
  perform cron.unschedule('document-jobs-process-1min')
  where exists (select 1 from cron.job where jobname = 'document-jobs-process-1min');

  if v_url is null or v_secret is null then
    raise notice 'app.cron_secret or app.deployment_url GUC not set; skipping pg_cron schedule. DBA must set them and re-run this migration.';
    return;
  end if;

  perform cron.schedule(
    'document-jobs-process-1min',
    '*/1 * * * *',
    format(
      $cron$
      select net.http_get(
        url := %L,
        headers := jsonb_build_object('Authorization', 'Bearer ' || %L)
      );
      $cron$,
      v_url || '/api/cron/document-jobs-process',
      v_secret
    )
  );
end
$$;
