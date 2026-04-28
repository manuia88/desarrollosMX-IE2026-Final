-- SECURITY CRITICAL fix: enable RLS on all pg_partman child partitions
-- Reference: Supabase advisor alert 2026-04-28 "Table publicly accessible"
--
-- Issue detected: 174 partitions had rowsecurity=false en BD remota
-- (parent tables ya tenían RLS habilitada, pero partitions hijo no heredan
-- automáticamente el flag rowsecurity desde parent en PostgreSQL/pg_partman).
--
-- Fix: ENABLE RLS en cada partition. Queries normales van vía parent table
-- (RLS aplica). Acceso directo a partition individual queda bloqueado por
-- default (deny-all sin policies).
--
-- Excluded:
--   - spatial_ref_sys (PostGIS internal, public catalog read-only by design)
--   - partman_% (pg_partman internal)
--
-- Memoria ADR-009 inviolable + memoria 22 audit_rls strict.

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND NOT rowsecurity
      AND tablename != 'spatial_ref_sys'
      AND tablename NOT LIKE 'partman_%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', rec.tablename);
  END LOOP;
END $$;
