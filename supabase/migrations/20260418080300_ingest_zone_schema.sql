-- Ingesta ZONE: zone_price_index (AVM derivado) + zona_snapshots (consolidado multi-fuente).
-- FASE 07 / BLOQUE 7.A / MÓDULO 7.A.1
-- Refs:
--   docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.A.1
--   docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2/D3
--   docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md (RLS misma migration)

-- ============================================================
-- zone_price_index — índice de precios por zona (calculado)
-- ============================================================
create table public.zone_price_index (
  id bigint generated always as identity,
  country_code char(2) not null references public.countries(code),
  zone_id uuid not null,
  operation text not null check (operation in ('venta', 'renta')),
  property_type text,
  price_per_m2_minor bigint not null,
  currency char(3) not null references public.currencies(code),
  yoy_pct numeric(8, 4),
  mom_pct numeric(8, 4),
  sample_size integer not null,
  confidence text not null default 'low' check (confidence in ('high', 'medium', 'low', 'insufficient_data')),
  period_start date not null,
  period_end date not null,
  computed_at timestamptz not null default now(),
  run_id uuid,
  meta jsonb not null default '{}'::jsonb,
  primary key (id, period_start)
) partition by range (period_start);

create unique index idx_zpi_zone_op_type
  on public.zone_price_index (country_code, zone_id, operation, coalesce(property_type, 'all'), period_start);
create index idx_zpi_period_brin on public.zone_price_index using brin (period_start);
create index idx_zpi_run on public.zone_price_index (run_id) where run_id is not null;

select public.create_parent(
  p_parent_table := 'public.zone_price_index',
  p_control      := 'period_start',
  p_interval     := '1 year'
);

alter table public.zone_price_index enable row level security;

create policy zpi_select_public on public.zone_price_index
  for select to authenticated, anon
  using (true);

comment on table public.zone_price_index is
  'Índice de precios por zona, derivado de market_prices_secondary + market_pulse. '
  'SELECT público. Particionada yearly. AVM v1 vive aquí.';

-- ============================================================
-- zona_snapshots — payload consolidado multi-fuente por zona × periodo (NO partitioned)
-- ============================================================
create table public.zona_snapshots (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries(code),
  zone_id uuid not null,
  period date not null,
  payload jsonb not null,
  computed_at timestamptz not null default now(),
  run_id uuid
);

create unique index idx_zs_zone_period
  on public.zona_snapshots (country_code, zone_id, period);
create index idx_zs_period on public.zona_snapshots (period desc);
create index idx_zs_run on public.zona_snapshots (run_id) where run_id is not null;

alter table public.zona_snapshots enable row level security;

create policy zs_select_public on public.zona_snapshots
  for select to authenticated, anon
  using (true);

comment on table public.zona_snapshots is
  'Snapshot consolidado por zona × periodo con todos los indicadores. SELECT público. '
  'NO particionada — payload jsonb explícito. Última snapshot por zona via subquery.';
