-- FASE 10 SESIÓN 2/3 — L-69 zone_demographics_cache materialized view.
-- Ref: docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md (N3 FASE C + L-69) +
-- shared/lib/intelligence-engine/sources/zone-demographics.ts consumer.
--
-- L-69 demand+salary+professions profiling: proyecta una capa agregada por
-- zona desde inegi_census + enigh (tablas que aterrizan en FASE 07b).
-- Mientras esas tablas no existan, la MV se crea empty-friendly con CTE
-- defensivo: si inegi_census está vacía / ausente, la MV retorna 0 filas
-- (el consumer fallback a stub via computeZoneDemographics).
--
-- Refresh cron diario 4am UTC (vercel.json).

-- Placeholder inegi_census + enigh — tablas reales aterrizan en FASE 07b.
-- Creamos stubs IF NOT EXISTS para que la MV compile sin romper el deploy.
create table if not exists public.inegi_census_zone_stats (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null,
  snapshot_date date not null,
  profession_distribution jsonb not null default '[]'::jsonb,
  age_distribution jsonb not null default '[]'::jsonb,
  dominant_profession text,
  unique (zone_id, snapshot_date)
);

create table if not exists public.enigh_zone_income (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null,
  snapshot_date date not null,
  salary_range_distribution jsonb not null default '[]'::jsonb,
  median_salary_mxn numeric(12, 2),
  unique (zone_id, snapshot_date)
);

alter table public.inegi_census_zone_stats enable row level security;
alter table public.enigh_zone_income enable row level security;

drop policy if exists inegi_census_select_authenticated on public.inegi_census_zone_stats;
create policy inegi_census_select_authenticated on public.inegi_census_zone_stats
  for select to authenticated using (true);
drop policy if exists inegi_census_service_all on public.inegi_census_zone_stats;
create policy inegi_census_service_all on public.inegi_census_zone_stats
  for all to service_role using (true) with check (true);

drop policy if exists enigh_select_authenticated on public.enigh_zone_income;
create policy enigh_select_authenticated on public.enigh_zone_income
  for select to authenticated using (true);
drop policy if exists enigh_service_all on public.enigh_zone_income;
create policy enigh_service_all on public.enigh_zone_income
  for all to service_role using (true) with check (true);

comment on table public.inegi_census_zone_stats is
  'L-69 FASE 10 SESIÓN 2/3 — stub placeholder para INEGI Census. Populate real en FASE 07b ingest expandido.';

comment on table public.enigh_zone_income is
  'L-69 FASE 10 SESIÓN 2/3 — stub placeholder para ENIGH. Populate real en FASE 07b ingest expandido.';

-- Materialized view zone_demographics_cache.
-- Consolida último snapshot per zona. Refresh concurrente requiere UNIQUE index.
drop materialized view if exists public.zone_demographics_cache;
create materialized view public.zone_demographics_cache as
select
  coalesce(c.zone_id, i.zone_id) as zone_id,
  greatest(c.snapshot_date, i.snapshot_date) as snapshot_date,
  coalesce(c.profession_distribution, '[]'::jsonb) as profession_distribution,
  coalesce(i.salary_range_distribution, '[]'::jsonb) as salary_range_distribution,
  coalesce(c.age_distribution, '[]'::jsonb) as age_distribution,
  c.dominant_profession,
  i.median_salary_mxn
from (
  select distinct on (zone_id) zone_id, snapshot_date, profession_distribution, age_distribution, dominant_profession
  from public.inegi_census_zone_stats
  order by zone_id, snapshot_date desc
) c
full outer join (
  select distinct on (zone_id) zone_id, snapshot_date, salary_range_distribution, median_salary_mxn
  from public.enigh_zone_income
  order by zone_id, snapshot_date desc
) i using (zone_id);

create unique index if not exists idx_zone_demographics_cache_zone
  on public.zone_demographics_cache (zone_id);

comment on materialized view public.zone_demographics_cache is
  'L-69 FASE 10 SESIÓN 2/3 — agregado zona × profession/salary/age. '
  'Refresh daily 4am UTC via /api/cron/zone-demographics-refresh. '
  'Consumer: shared/lib/intelligence-engine/sources/zone-demographics.ts (H13, C03).';
