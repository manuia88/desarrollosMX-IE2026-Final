-- F1.C.B Demographics Real (INEGI Censo 2020 Tier 1) — schema extension
--
-- Adds data_origin flag column to inegi_census_zone_stats so downstream
-- consumers can distinguish:
--   - 'inegi_synthetic_v1'         (legacy synthetic per A.3 reality audit)
--   - 'inegi_municipal_proxy'      (Tier 1 BISE municipal applied to all
--                                   colonias within alcaldía)
--   - 'inegi_ageb_overlay'         (Tier 2 ITER + MGN spatial overlay,
--                                   populated post-F1.C.C with shpjs +
--                                   ITER 174 KB CSV)
--
-- BIBLIA DECISIÓN 2: zero data loss — preserves profession_distribution +
-- age_distribution jsonb columns. Adds typed scalar columns for new canon
-- indicators (poblacion_total, hogares_censales, edad_mediana, poblacion_12_y_mas,
-- densidad_hab_km2).

alter table public.inegi_census_zone_stats
  add column if not exists data_origin text not null default 'inegi_synthetic_v1',
  add column if not exists poblacion_total integer,
  add column if not exists hogares_censales integer,
  add column if not exists edad_mediana_anios numeric(5,2),
  add column if not exists poblacion_12_y_mas integer,
  add column if not exists densidad_hab_km2 numeric(10,2);

create index if not exists ix_inegi_census_data_origin
  on public.inegi_census_zone_stats(data_origin);

comment on column public.inegi_census_zone_stats.data_origin is
  'F1.C.B: source granularity. inegi_synthetic_v1 (legacy A.3) | inegi_municipal_proxy (Tier 1 BISE alcaldía-level applied to colonias) | inegi_ageb_overlay (Tier 2 ITER+MGN spatial overlay post-F1.C.C).';
