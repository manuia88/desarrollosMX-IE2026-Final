-- FASE 07b / BLOQUE 7b.A / MÓDULO 7b.A.2 — Agregados mensuales por market.
-- Complementa str_monthly_snapshots (per-listing): cuando solo tenemos
-- datos market-aggregated de AirROI markets/metrics/all, van aquí.
-- Feeds v_str_zone_monthly + STR-BASELINE score.

create table public.str_market_monthly_aggregates (
  id bigint generated always as identity,
  market_id uuid not null references public.str_markets(id) on delete cascade,
  country_code char(2) not null references public.countries(code),
  currency char(3) not null references public.currencies(code),
  period date not null,
  occupancy_rate numeric(5, 4),
  adjusted_occupancy_rate numeric(5, 4),
  adr_minor bigint,
  revpar_minor bigint,
  adjusted_revpar_minor bigint,
  revenue_minor bigint,
  active_listings smallint,
  avg_length_of_stay numeric(6, 2),
  booking_lead_time_days numeric(6, 2),
  fetched_at timestamptz not null default now(),
  run_id uuid,
  meta jsonb not null default '{}'::jsonb,
  primary key (id, period)
) partition by range (period);

create unique index idx_str_mma_unique
  on public.str_market_monthly_aggregates (market_id, period);
create index idx_str_mma_market_period
  on public.str_market_monthly_aggregates (market_id, period desc);
create index idx_str_mma_period_brin on public.str_market_monthly_aggregates using brin (period);
create index idx_str_mma_run on public.str_market_monthly_aggregates (run_id) where run_id is not null;

select public.create_parent(
  p_parent_table := 'public.str_market_monthly_aggregates',
  p_control      := 'period',
  p_interval     := '1 year'
);

alter table public.str_market_monthly_aggregates enable row level security;

create policy str_mma_select_public on public.str_market_monthly_aggregates
  for select to authenticated, anon
  using (true);

create policy str_mma_write_admin on public.str_market_monthly_aggregates
  for all to authenticated
  using (public.is_superadmin() or public.get_user_role() = 'mb_admin')
  with check (public.is_superadmin() or public.get_user_role() = 'mb_admin');

comment on table public.str_market_monthly_aggregates is
  'Agregados mensuales por market (AirROI markets/metrics/all). Particionada yearly. SELECT público.';

create or replace view public.v_str_market_monthly as
select
  m.id as market_id,
  m.country_code,
  m.airroi_district,
  m.airroi_locality,
  mma.period,
  mma.currency,
  mma.occupancy_rate,
  mma.adjusted_occupancy_rate,
  mma.adr_minor,
  mma.revpar_minor,
  mma.adjusted_revpar_minor,
  mma.revenue_minor,
  mma.active_listings,
  mma.avg_length_of_stay,
  mma.booking_lead_time_days,
  'airroi_markets_metrics_all'::text as source
from public.str_markets m
join public.str_market_monthly_aggregates mma on mma.market_id = m.id;

comment on view public.v_str_market_monthly is
  'Vista market-level unificada para consumo desde scoring + tRPC strScores.getZoneStats.';
