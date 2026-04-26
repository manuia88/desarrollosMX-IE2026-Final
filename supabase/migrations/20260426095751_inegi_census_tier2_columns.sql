-- F1.C.C Tier 2 Demographics — ALTER inegi_census_zone_stats + enigh_zone_income
--
-- inegi_census_zone_stats:
--   Adds 7 typed indicators populated by AGEB spatial overlay:
--     - graproes_anios          numeric(5,2) — años promedio escolaridad pob 15+
--     - pea_ratio               numeric(5,4) — PEA / poblacion_12_y_mas
--     - pct_pob_0_14            numeric(5,4) — fracción población 0-14
--     - pct_pob_15_64           numeric(5,4) — fracción población 15-64
--     - pct_pob_65_mas          numeric(5,4) — fracción población 65+
--     - pct_viviendas_internet  numeric(5,4) — VPH_INTER / TOTHOG
--     - pct_viviendas_pc        numeric(5,4) — VPH_PC / TOTHOG
--   Adds metadata column:
--     - per_ageb_aggregations jsonb — n_agebs_intersected + total_area_km2 +
--       overlay_methodology version (per SA-ITER §6 + zero-deuda audit trail).
--
-- enigh_zone_income (post-F1.C.C downscale):
--   Reusa median_salary_mxn existente (legacy synthetic) — UPSERT in-place
--   con downscaled value + data_origin flag. Cero duplicación canon
--   (arquitectura_escalable_desacoplada).
--   Adds 2 typed columns:
--     - data_origin              text default 'enigh_synthetic_v1' — source flag
--     - downscale_proxy_ratio    numeric(8,4) — colonia_graproes / state_graproes
--                                                (clamped 0.30-3.00)
--
-- BIBLIA DECISIÓN 2: zero data loss — preserves all existing columns + JSONBs.
-- F1.C.B reference: data_origin pattern shipped 2026-04-26 PR #70.

-- ============================================================================
-- inegi_census_zone_stats — Tier 2 indicators + metadata
-- ============================================================================

alter table public.inegi_census_zone_stats
  add column if not exists graproes_anios          numeric(5,2),
  add column if not exists pea_ratio               numeric(5,4),
  add column if not exists pct_pob_0_14            numeric(5,4),
  add column if not exists pct_pob_15_64           numeric(5,4),
  add column if not exists pct_pob_65_mas          numeric(5,4),
  add column if not exists pct_viviendas_internet  numeric(5,4),
  add column if not exists pct_viviendas_pc        numeric(5,4),
  add column if not exists per_ageb_aggregations   jsonb;

create index if not exists ix_inegi_census_graproes
  on public.inegi_census_zone_stats(graproes_anios)
  where graproes_anios is not null;

comment on column public.inegi_census_zone_stats.graproes_anios is
  'F1.C.C Tier 2: años promedio escolaridad población 15+ (population-weighted mean from AGEB overlay). Source for ENIGH downscale proxy.';

comment on column public.inegi_census_zone_stats.per_ageb_aggregations is
  'F1.C.C Tier 2 metadata: {n_agebs_intersected, total_area_km2, overlay_methodology, computed_at}. Audit trail for spatial overlay quality gate.';

-- ============================================================================
-- enigh_zone_income — downscale columns
-- ============================================================================

alter table public.enigh_zone_income
  add column if not exists data_origin            text not null default 'enigh_synthetic_v1',
  add column if not exists downscale_proxy_ratio  numeric(8,4);

create index if not exists ix_enigh_zone_income_data_origin
  on public.enigh_zone_income(data_origin);

comment on column public.enigh_zone_income.data_origin is
  'F1.C.C: enigh_synthetic_v1 (legacy A.3) | enigh_2022_state_downscaled_via_censo_2020_proxy (Tier 2 downscale, post-F1.C.C). NOT ground truth para downscaled.';

comment on column public.enigh_zone_income.downscale_proxy_ratio is
  'F1.C.C: ratio used in downscale = colonia_graproes_anios / state_graproes_anios. Clamped to [0.30, 3.00] to avoid absurd extremes. NULL si colonia missing graproes. median_salary_mxn (column existente) recibe valor downscaled directo via UPSERT in-place.';
