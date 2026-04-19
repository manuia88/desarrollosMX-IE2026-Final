-- Ingesta MERCADO: precios secundarios (Chrome Extension GC-27 + admin upload),
-- search trends (Google Trends), market pulse (AirDNA, ocupación STR).
-- FASE 07 / BLOQUE 7.A / MÓDULO 7.A.1
-- Refs:
--   docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.A.1 + §7.E
--   docs/01_DECISIONES_ARQUITECTONICAS/ADR-012_SCRAPING_POLICY.md §Decision (Vía 1 Chrome Ext)
--   docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md (RLS misma migration)

-- ============================================================
-- captured_via enum — pivot scraping policy ADR-012
-- ============================================================
create type public.market_capture_source as enum (
  'chrome_extension',
  'admin_upload',
  'partnership_feed',
  'api_official'
);

-- ============================================================
-- market_prices_secondary — listings individuales del mercado secundario
-- (capturados via Chrome Extension GC-27 o admin upload).
-- Particionada monthly por posted_at.
-- ============================================================
create table public.market_prices_secondary (
  id bigint generated always as identity,
  country_code char(2) not null references public.countries(code),
  source text not null,
  listing_id text not null,
  zone_id uuid,
  property_type text,
  operation text not null check (operation in ('venta', 'renta')),
  price_minor bigint not null,
  currency char(3) not null references public.currencies(code),
  area_built_m2 numeric(10, 2),
  area_terrain_m2 numeric(10, 2),
  bedrooms smallint,
  bathrooms numeric(3, 1),
  parking smallint,
  amenities jsonb,
  address_raw text,
  geom geometry(Point, 4326),
  h3_r8 text,
  seller_type text check (seller_type in ('particular', 'inmobiliaria', 'desconocido')),
  days_on_market integer,
  raw_html_hash text,
  captured_via public.market_capture_source not null default 'chrome_extension',
  captured_by_user_id uuid references public.profiles(id),
  posted_at date not null,
  fetched_at timestamptz not null default now(),
  run_id uuid,
  meta jsonb not null default '{}'::jsonb,
  primary key (id, posted_at)
) partition by range (posted_at);

create index idx_mps_zone_op_type
  on public.market_prices_secondary (country_code, zone_id, operation, property_type, posted_at desc);
create index idx_mps_geom on public.market_prices_secondary using gist (geom);
create index idx_mps_h3 on public.market_prices_secondary (h3_r8) where h3_r8 is not null;
create index idx_mps_capturer
  on public.market_prices_secondary (captured_by_user_id, posted_at desc)
  where captured_by_user_id is not null;
create index idx_mps_posted_brin on public.market_prices_secondary using brin (posted_at);
create index idx_mps_run on public.market_prices_secondary (run_id) where run_id is not null;
create unique index idx_mps_source_listing
  on public.market_prices_secondary (source, listing_id, posted_at);

select public.create_parent(
  p_parent_table := 'public.market_prices_secondary',
  p_control      := 'posted_at',
  p_interval     := '1 month'
);

-- ============================================================
-- RLS — restringido a internos (asesores, mb_admin, desarrolladora_admin, superadmin).
-- Datos individuales sensibles (precios, vendedor) no se exponen al público.
-- Asesor además solo ve lo que él mismo capturó (gating Chrome Extension).
-- ============================================================
alter table public.market_prices_secondary enable row level security;

create policy mps_select_owner_or_admin on public.market_prices_secondary
  for select to authenticated
  using (
    public.is_superadmin()
    or public.get_user_role() in ('mb_admin', 'admin_desarrolladora')
    or (
      public.get_user_role() = 'asesor'
      and captured_by_user_id = (select auth.uid())
    )
  );

comment on table public.market_prices_secondary is
  'Listings individuales mercado secundario capturados via Chrome Extension (GC-27) o admin upload. '
  'Particionada monthly por posted_at. Acceso restringido — agregados van a zone_price_index.';
comment on column public.market_prices_secondary.captured_via is
  'Origen del capture per ADR-012: chrome_extension (asesor con extensión), admin_upload (XLSX/CSV), '
  'partnership_feed (H2+), api_official (Cushman/CBRE/etc API si existiese).';

-- ============================================================
-- search_trends — Google Trends por zona × keyword
-- ============================================================
create table public.search_trends (
  id bigint generated always as identity,
  country_code char(2) not null references public.countries(code),
  zone_id uuid,
  keyword text not null,
  interest_score smallint not null check (interest_score between 0 and 100),
  period_start date not null,
  period_end date not null,
  run_id uuid,
  fetched_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb,
  primary key (id, period_start)
) partition by range (period_start);

create index idx_st_zone_kw
  on public.search_trends (country_code, zone_id, keyword, period_start desc);
create unique index idx_st_unique
  on public.search_trends (country_code, coalesce(zone_id, '00000000-0000-0000-0000-000000000000'::uuid), keyword, period_start);
create index idx_st_period_brin on public.search_trends using brin (period_start);

select public.create_parent(
  p_parent_table := 'public.search_trends',
  p_control      := 'period_start',
  p_interval     := '1 year'
);

alter table public.search_trends enable row level security;

create policy search_trends_select_public on public.search_trends
  for select to authenticated, anon
  using (true);

comment on table public.search_trends is
  'Google Trends por zona × keyword. SELECT público. Particionada yearly.';

-- ============================================================
-- market_pulse — métricas STR (AirDNA: occupancy, ADR, RevPAR)
-- ============================================================
create table public.market_pulse (
  id bigint generated always as identity,
  country_code char(2) not null references public.countries(code),
  zone_id uuid,
  source text not null,
  metric text not null,
  value numeric(20, 6) not null,
  period_start date not null,
  period_end date not null,
  run_id uuid,
  fetched_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb,
  primary key (id, period_start)
) partition by range (period_start);

create index idx_mp_zone_metric
  on public.market_pulse (country_code, zone_id, source, metric, period_start desc);
create unique index idx_mp_unique
  on public.market_pulse (country_code, coalesce(zone_id, '00000000-0000-0000-0000-000000000000'::uuid), source, metric, period_start);
create index idx_mp_period_brin on public.market_pulse using brin (period_start);

select public.create_parent(
  p_parent_table := 'public.market_pulse',
  p_control      := 'period_start',
  p_interval     := '1 year'
);

alter table public.market_pulse enable row level security;

create policy market_pulse_select_public on public.market_pulse
  for select to authenticated, anon
  using (true);

comment on table public.market_pulse is
  'Métricas STR (Airbnb/AirDNA): occupancy_rate, adr, revpar, listings_count. SELECT público.';
