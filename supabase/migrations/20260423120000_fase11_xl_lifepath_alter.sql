-- BLOQUE 11.O.-1 — LifePath SEED: extensión in-place de lifepath_user_profiles.
--
-- Tabla base ya existe (TABLA 14 del schema XL maestro
-- 20260421100000_fase11_xl_dmx_indices_schema.sql). Por decisión de producto
-- (founder 2026-04-23, Opción B refinada) NO se crea `lifepath_matches`
-- separada — se reusa la tabla existente con ALTER mínimo.
--
-- Cambios:
--   1. Rename `top_3_matches` → `matches` (jsonb, top-20 con score + components inline).
--   2. +column `answers_version text default 'v1'` (versionado del cuestionario).
--   3. +column `methodology text default 'heuristic_v1'` (H1 determinístico;
--      reemplazable FASE 12 N5 por `llm_v1` ADR-022 sin schema change).
--
-- No se tocan policies RLS (ya correctas owner-based + service_role).
-- FASE 12 N5 puede splittear a tabla normalizada si requiere (L137 agendado).

alter table public.lifepath_user_profiles
  rename column top_3_matches to matches;

alter table public.lifepath_user_profiles
  add column if not exists answers_version text not null default 'v1',
  add column if not exists methodology text not null default 'heuristic_v1';

comment on column public.lifepath_user_profiles.matches is
  'BLOQUE 11.O: jsonb array top-20 colonias con { colonia_id, score 0-100, components }. '
  'Inline para H1 SEED. FASE 12 N5 puede splittear a tabla normalizada (L137).';
comment on column public.lifepath_user_profiles.answers_version is
  'BLOQUE 11.O: versión del cuestionario (15 preguntas v1 SEED).';
comment on column public.lifepath_user_profiles.methodology is
  'BLOQUE 11.O: heuristic_v1 (H1 determinístico) → llm_v1 (H2 ADR-022).';
