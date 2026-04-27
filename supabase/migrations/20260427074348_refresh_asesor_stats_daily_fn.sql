-- M09 Estadísticas — refresh_asesor_stats_daily SECDEF helper
-- Service-role-only invocation desde cron asesor-stats-refresh.
-- REFRESH MATERIALIZED VIEW CONCURRENTLY cuando matview ya está populated;
-- fallback a REFRESH non-concurrent en primer run (matview empty).

CREATE OR REPLACE FUNCTION public.refresh_asesor_stats_daily()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_catalog'
AS $function$
DECLARE
  v_caller_role text;
  v_has_data boolean;
BEGIN
  v_caller_role := COALESCE(auth.jwt() ->> 'role', current_setting('role', true));

  IF v_caller_role IS DISTINCT FROM 'service_role'
     AND NOT public.is_superadmin()
  THEN
    RAISE EXCEPTION 'refresh_asesor_stats_daily: service_role required (got %)', v_caller_role;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.asesor_stats_daily LIMIT 1) INTO v_has_data;

  IF v_has_data THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.asesor_stats_daily;
  ELSE
    REFRESH MATERIALIZED VIEW public.asesor_stats_daily;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.refresh_asesor_stats_daily() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_asesor_stats_daily() TO service_role;

COMMENT ON FUNCTION public.refresh_asesor_stats_daily() IS
  'M09 Estadísticas SECDEF helper. Service-role-only via cron asesor-stats-refresh hourly. Fail-fast role check (auth.jwt().role) + REFRESH MATERIALIZED VIEW CONCURRENTLY when populated, non-concurrent fallback en primer run.';
