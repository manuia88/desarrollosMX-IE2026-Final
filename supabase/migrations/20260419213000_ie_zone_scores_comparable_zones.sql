-- FASE 08 / BLOQUE 8.B / Upgrade U13 v3 — comparable_zones precalculadas en zone_scores.
-- Refs: docs/02_PLAN_MAESTRO/FASE_08_IE_SCORES_N0.md §BLOQUE 8.B upgrade U13
--       shared/lib/intelligence-engine/calculators/persist.ts
--
-- Agrega columna jsonb comparable_zones en zone_scores. persist.ts la popula
-- post-UPSERT consultando top 3 zonas país + mismo score_type + mismo
-- period_date con valor más cercano (ABS(value - new_value) ASC LIMIT 3).
--
-- Shape canónico: [{"zone_id": uuid, "value": number, "delta": number}].
-- zone_name se resuelve en UI mediante lookup contra el inventario de zonas
-- (pendiente FASE 09) — la jsonb se mantiene extensible para acomodar
-- zone_name cuando exista una zonas canónica sin romper consumidores.
--
-- Vacío [] si <3 zonas disponibles (umbral del plan).
-- Aplica solo a zone_scores — project/user scores no se comparan lateralmente.

alter table public.zone_scores
  add column if not exists comparable_zones jsonb not null default '[]'::jsonb;

comment on column public.zone_scores.comparable_zones is
  'Top 3 zonas mismo score_type + period_date con valor más cercano (delta ASC). '
  'Shape: [{zone_id: uuid, value: number, delta: number}]. '
  'Precalculado por persist.ts#persistZoneScore. Vacío [] si <3 zonas disponibles.';
