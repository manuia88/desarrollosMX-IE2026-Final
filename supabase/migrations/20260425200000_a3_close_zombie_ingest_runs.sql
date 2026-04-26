-- FASE 07.7.A.3 — Close zombie ingest_runs detected via SA-Macro audit.
--
-- Reality finding (docs/08_PRODUCT_AUDIT/10_DATA_REALITY_AUDIT.md §2.1):
-- 1 banxico ingest_run (id=26ebb342-5f3e-4255-be93-eb26e4804eea) en status='running'
-- desde 2026-04-24 06:05 sin completed_at — orphan/zombie. 3h antes corrió un run
-- success (43f53186-...) que sí cerró completed_at. El primer run quedó huérfano
-- sin cerrar (probable proceso interrumpido o crash sin handler).
--
-- Esta migration aplica close idempotente: solo afecta runs 'running' >1h.
-- Memory canon feedback_cron_observability_obligatorio: ingest_runs INSERT
-- fail-fast es obligatorio en orchestrator. Detection recurring de zombies se
-- agenda L-NEW-OBS-INGEST-RUNS-QG-01 (FASE 11.A).
--
-- Aplicación inmediata (paralela a esta migration): UPDATE via Supabase MCP
-- 2026-04-25 con error='orphan_no_completion_3h_pre_success_run_recovered_a3_2026_04_25'.
-- Esta migration garantiza que el fix sea persistido en migration history para
-- auditoría futura aunque el UPDATE ya esté aplicado.
--
-- Idempotente: WHERE status='running' AND started_at < now()-interval '1 hour'
-- skip rows que ya estén failed/success o que sean nuevos runs en progreso.

DO $$
BEGIN
  UPDATE ingest_runs
  SET status = 'failed',
      completed_at = COALESCE(completed_at, NOW()),
      error = COALESCE(error, 'orphan_no_completion_recovered_a3_migration')
  WHERE status = 'running'
    AND started_at < (NOW() - INTERVAL '1 hour')
    AND completed_at IS NULL;
END $$;
