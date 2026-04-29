-- FASE 17 sesión 17.A.UI — pg_cron schedule Drive monitor poll (15 min).
-- Authority: ADR-062 + plan FASE_17_DOCUMENT_INTEL.md addendum v3.
-- Memoria 25: Vercel Hobby plan no soporta sub-daily crons; pg_cron Supabase para 15min.
--
-- NOTA seteo manual requerido por superadmin (founder Manu) post-merge:
--   ALTER DATABASE postgres SET app.cron_secret = '<CRON_SECRET value desde Vercel env>';
--   ALTER DATABASE postgres SET app.deploy_origin = 'https://desarrollos-mx-ie-2026-final.vercel.app';
-- Sin esos settings, current_setting() retorna NULL y el cron NO ejecutará HTTP call.
-- Si el cron job ya existe (re-run idempotente), unschedule + reschedule.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'drive-monitor-poll-15min') THEN
    PERFORM cron.unschedule('drive-monitor-poll-15min');
  END IF;
END $$;

SELECT cron.schedule(
  'drive-monitor-poll-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_get(
    url := COALESCE(
      current_setting('app.deploy_origin', true),
      'https://desarrollos-mx-ie-2026-final.vercel.app'
    ) || '/api/cron/drive-monitor-poll',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || COALESCE(current_setting('app.cron_secret', true), '')
    ),
    timeout_milliseconds := 290000
  );
  $$
);

COMMENT ON EXTENSION pg_cron IS
  'F17 sesión 17.A.UI — drive-monitor-poll-15min activo. Requires app.cron_secret + app.deploy_origin DB settings.';
