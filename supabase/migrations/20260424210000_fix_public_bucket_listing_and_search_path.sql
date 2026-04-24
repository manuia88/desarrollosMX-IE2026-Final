-- FASE 11 post-audit — BATCH 1 pre-Opción D.
--
-- Fix CRITICAL-009: DROP policies listing en buckets storage públicos
--   (GET por URL directo sigue funcionando vía bucket flag public=true;
--    solo se remueve enumeration/listing — mitigación GDPR/ARCO).
-- Fix CRITICAL-007: ALTER FUNCTION x 6 con SET search_path hardening
--   (previene search_path hijack en funciones NO SECDEF pero invocadas
--    desde triggers/RLS/roles con search_path atacable).
--
-- Referencias:
--   docs/06_AUDITORIAS/AUDIT_FASE_0_A_11S_2026-04-24.md §3 CRITICAL-007, CRITICAL-009.
--   Advisor Supabase: `function_search_path_mutable`, `public_bucket_allows_listing`.
--
-- NO requiere audit_rls_allowlist bump: hardening sobre existing, NO new tables/SECDEF.
-- NO afecta código TS/TSX: funciones mantienen firma + semántica idénticas;
--   storage GET por URL sigue funcionando.

-- ==========================================================
-- CRITICAL-009: DROP policies listing buckets públicos
-- ==========================================================

DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
DROP POLICY IF EXISTS "photos_select_public" ON storage.objects;

-- ==========================================================
-- CRITICAL-007: ALTER FUNCTION search_path hardening (6 functions)
-- ==========================================================

ALTER FUNCTION public.jsonb_diff(a jsonb, b jsonb)
  SET search_path = 'public, pg_temp';

ALTER FUNCTION public.match_ai_memory(p_namespace text, p_embedding vector, p_match_count integer, p_min_similarity real)
  SET search_path = 'public, pg_temp';

ALTER FUNCTION public.match_embeddings(p_embedding vector, p_source_types text[], p_country_code character, p_match_count integer, p_min_similarity real)
  SET search_path = 'public, pg_temp';

ALTER FUNCTION public.ml_deterministic_split(p_listing_id text)
  SET search_path = 'public, pg_temp';

ALTER FUNCTION public.set_updated_at()
  SET search_path = 'public, pg_temp';

ALTER FUNCTION public.validate_postal_code(p_country_code character, p_postal_code text)
  SET search_path = 'public, pg_temp';
