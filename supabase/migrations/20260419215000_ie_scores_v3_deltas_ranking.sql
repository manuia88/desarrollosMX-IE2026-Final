-- FASE 08 / BLOQUE 8.C / Upgrades D2 (deltas first-class) + D3 (ranking país).
-- Refs: prompt v5 BLOQUE 8.C upgrades D2+D3.
--       shared/lib/intelligence-engine/calculators/persist.ts
--       shared/lib/intelligence-engine/calculators/base.ts
--
-- D2 — Score deltas first-class (3m/6m/12m)
--   Shape jsonb: { "3m": number|null, "6m": number|null, "12m": number|null }.
--   persist.ts al UPSERT consulta score_history lookback ±15d de T-3m/6m/12m
--   para el mismo (zone_id|project_id, score_type). Delta = currentValue - lookbackValue.
--   null si no hay data en la ventana. Habilita UI time-series + alertas de cambio
--   + L4 watchlist (FASE 20 lateral).
--
-- D3 — Ranking explícito vs todas zonas país
--   Shape jsonb: { "position": number, "total": number, "percentile": number }.
--   persist.ts pre-UPSERT cuenta zonas/proyectos mismo (country_code, score_type,
--   period_date) con value > currentValue — position = count + 1.
--   percentile = (1 − position/total) × 100.
--   Habilita UI "Roma Norte: walkability 88 (puesto 12 de 1,800 colonias CDMX)".

-- ============================================================
-- D2 — deltas jsonb en zone_scores + project_scores
-- ============================================================
alter table public.zone_scores
  add column if not exists deltas jsonb not null default '{}'::jsonb;

alter table public.project_scores
  add column if not exists deltas jsonb not null default '{}'::jsonb;

comment on column public.zone_scores.deltas is
  'D2 — Score deltas vs lookback. Shape {"3m": number|null, "6m": number|null, "12m": number|null}. '
  'persist.ts lo popula consultando score_history con ventana ±15d al T-3m/6m/12m. '
  'Habilita UI time-series + L4 watchlist (FASE 20).';

comment on column public.project_scores.deltas is
  'D2 — Score deltas vs lookback. Ver zone_scores.deltas.';

-- ============================================================
-- D3 — ranking jsonb en zone_scores + project_scores
-- ============================================================
alter table public.zone_scores
  add column if not exists ranking jsonb not null default '{}'::jsonb;

alter table public.project_scores
  add column if not exists ranking jsonb not null default '{}'::jsonb;

comment on column public.zone_scores.ranking is
  'D3 — Ranking vs todas zonas mismo country_code + score_type + period_date. '
  'Shape {"position": number, "total": number, "percentile": number}. '
  'Habilita UI "Roma Norte: walkability 88 (puesto 12 de 1,800 colonias)".';

comment on column public.project_scores.ranking is
  'D3 — Ranking vs todos proyectos mismo country_code + score_type + period_date.';

-- Index para las queries de ranking (COUNT WHERE value > X).
create index if not exists idx_zone_scores_ranking_bucket
  on public.zone_scores (country_code, score_type, period_date, score_value desc);

create index if not exists idx_project_scores_ranking_bucket
  on public.project_scores (country_code, score_type, period_date, score_value desc);
