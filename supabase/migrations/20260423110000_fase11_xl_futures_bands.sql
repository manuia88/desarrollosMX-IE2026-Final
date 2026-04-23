-- BLOQUE 11.N.-1.1 — Futures curve banda CI explícita.
--
-- ALTER retrocompatible: todas las columnas nuevas son NULL default.
-- Rows existentes futures_curve_projections siguen válidas (forward_*_lower/upper
-- quedan NULL; UI y calculator manejan graceful-degrade cuando faltan).
--
-- Banda: ±1.96 × stddev residuos regression (95% CI aprox).
-- methodology_version se mantiene 'heuristic_v1' hasta FASE 12 N5 (ML real).

alter table public.futures_curve_projections
  add column if not exists forward_3m_lower numeric(6,2),
  add column if not exists forward_3m_upper numeric(6,2),
  add column if not exists forward_6m_lower numeric(6,2),
  add column if not exists forward_6m_upper numeric(6,2),
  add column if not exists forward_12m_lower numeric(6,2),
  add column if not exists forward_12m_upper numeric(6,2),
  add column if not exists forward_24m_lower numeric(6,2),
  add column if not exists forward_24m_upper numeric(6,2);

comment on column public.futures_curve_projections.forward_3m_lower is
  'BLOQUE 11.N: CI banda inferior 95% para forward 3m (heuristic_v1 = central ± 1.96σ).';
comment on column public.futures_curve_projections.forward_3m_upper is
  'BLOQUE 11.N: CI banda superior 95% para forward 3m.';
comment on column public.futures_curve_projections.forward_6m_lower is
  'BLOQUE 11.N: CI banda inferior 95% para forward 6m.';
comment on column public.futures_curve_projections.forward_6m_upper is
  'BLOQUE 11.N: CI banda superior 95% para forward 6m.';
comment on column public.futures_curve_projections.forward_12m_lower is
  'BLOQUE 11.N: CI banda inferior 95% para forward 12m.';
comment on column public.futures_curve_projections.forward_12m_upper is
  'BLOQUE 11.N: CI banda superior 95% para forward 12m.';
comment on column public.futures_curve_projections.forward_24m_lower is
  'BLOQUE 11.N: CI banda inferior 95% para forward 24m.';
comment on column public.futures_curve_projections.forward_24m_upper is
  'BLOQUE 11.N: CI banda superior 95% para forward 24m.';
