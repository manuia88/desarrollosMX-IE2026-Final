-- FASE 07b / BLOQUE 7b.A / MÓDULO 7b.A.1 — Schema STR base.
-- Refs:
--   docs/02_PLAN_MAESTRO/FASE_07b_STR_INTELLIGENCE_COMPLETE.md §7b.A.1
--   docs/01_DECISIONES_ARQUITECTONICAS/ADR-019_STR_MODULE_COMPLETE.md §2
--   docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md (RLS misma migration)
--
-- Incorpora upgrades:
--   U2 — str_markets (colonia-level nativo AirROI; FK opcional a zones para bridge futuro).
--   U6 — meta jsonb conventions (source, airroi_request_id, cost_usd, endpoint_path).
--
-- NO ENTREGA en esta migration (bloques propios):
--   str_cost_assumptions (7b.B), str_zone_regulations (7b.C), str_invisible_hotels (7b.E),
--   str_hosts (7b.G; host_id aquí es TEXT sin FK hasta ese bloque),
--   str_host_migrations (7b.J), str_events_calendar (7b.K), str_reports (7b.N),
--   ml_training_snapshots (7b.O).

-- ============================================================
-- str_markets — market catalog AirROI (country/region/locality/district).
-- Feeds 7b.A.3 baseline agregado + STR-COLONIA score (U2).
-- ============================================================
create table public.str_markets (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries(code),
  -- AirROI identifier (OpenStreetMap naming). district nullable para
  -- markets ciudad-level (p.ej. "Mexico City" sin colonia).
  airroi_country text not null,
  airroi_region text not null,
  airroi_locality text not null,
  airroi_district text,
  display_name text not null,
  native_currency char(3) not null references public.currencies(code),
  active_listings_count integer,
  -- Bridge opcional al dominio DMX (zones table viene de FASE 08). Sin FK
  -- dura para evitar ciclos dependencia con fases futuras.
  zone_id uuid,
  first_seen_at timestamptz not null default now(),
  last_refreshed_at timestamptz,
  meta jsonb not null default '{}'::jsonb
);

-- Unicidad del tuple AirROI (district puede ser null → coalesce).
create unique index idx_str_markets_airroi_unique on public.str_markets (
  airroi_country,
  airroi_region,
  airroi_locality,
  coalesce(airroi_district, '')
);
create index idx_str_markets_country on public.str_markets (country_code, active_listings_count desc nulls last);
create index idx_str_markets_zone on public.str_markets (zone_id) where zone_id is not null;

alter table public.str_markets enable row level security;

create policy str_markets_select_public on public.str_markets
  for select to authenticated, anon
  using (true);

create policy str_markets_write_admin on public.str_markets
  for all to authenticated
  using (
    public.is_superadmin()
    or public.get_user_role() in ('mb_admin')
  )
  with check (
    public.is_superadmin()
    or public.get_user_role() in ('mb_admin')
  );

comment on table public.str_markets is
  'Catálogo de markets AirROI (country/region/locality/district OSM naming). '
  'SELECT público, INSERT/UPDATE mb_admin+. Feeds baseline + STR-COLONIA score (U2).';

-- ============================================================
-- str_listings — listings individuales (Airbnb + VRBO + Booking cuando expongan).
-- PK composite (platform, listing_id) para permitir el mismo id en plataformas distintas.
-- NO particionada (registro estático, upserted por ingestor).
-- ============================================================
create table public.str_listings (
  platform text not null check (platform in ('airbnb', 'vrbo', 'booking')),
  listing_id text not null,
  country_code char(2) not null references public.countries(code),
  market_id uuid references public.str_markets(id) on delete set null,
  host_id text, -- FK lógica hacia str_hosts (7b.G); sin constraint hasta esa migration.
  zone_id uuid,
  geom geometry(Point, 4326),
  h3_r8 text,
  bedrooms smallint,
  bathrooms numeric(3, 1),
  capacity smallint,
  property_type text,
  room_type text,
  listing_name text,
  listing_url text,
  superhost boolean,
  professional_management boolean,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'inactive', 'unlisted', 'unknown')),
  fetched_at timestamptz not null default now(),
  run_id uuid,
  meta jsonb not null default '{}'::jsonb, -- provenance U6: source, airroi_request_id, cost_usd, endpoint_path
  primary key (platform, listing_id)
);

create index idx_str_listings_market on public.str_listings (market_id, status);
create index idx_str_listings_zone on public.str_listings (zone_id) where zone_id is not null;
create index idx_str_listings_host on public.str_listings (host_id) where host_id is not null;
create index idx_str_listings_geom on public.str_listings using gist (geom);
create index idx_str_listings_h3 on public.str_listings (h3_r8) where h3_r8 is not null;
create index idx_str_listings_country_status on public.str_listings (country_code, status, last_seen_at desc);
create index idx_str_listings_run on public.str_listings (run_id) where run_id is not null;

alter table public.str_listings enable row level security;

create policy str_listings_select_internal on public.str_listings
  for select to authenticated
  using (
    public.is_superadmin()
    or public.get_user_role() in ('asesor', 'mb_admin', 'admin_desarrolladora')
  );

create policy str_listings_write_admin on public.str_listings
  for all to authenticated
  using (
    public.is_superadmin()
    or public.get_user_role() = 'mb_admin'
  )
  with check (
    public.is_superadmin()
    or public.get_user_role() = 'mb_admin'
  );

comment on table public.str_listings is
  'Listings STR individuales (AirROI source). PK (platform, listing_id). '
  'SELECT restringido a asesor+ (datos comerciales sensibles). Agregados zonales '
  'se exponen en view v_str_zone_monthly (SELECT público).';
comment on column public.str_listings.meta is
  'Provenance (U6): source, airroi_request_id (x-amzn-requestid), cost_usd, endpoint_path.';

-- ============================================================
-- str_monthly_snapshots — métricas mensuales por listing × period.
-- Particionada yearly por period. Source primario: AirROI markets/metrics/all
-- (agregado) + listings export (per-listing cuando bulk está disponible).
-- ============================================================
create table public.str_monthly_snapshots (
  id bigint generated always as identity,
  platform text not null check (platform in ('airbnb', 'vrbo', 'booking')),
  listing_id text not null,
  market_id uuid references public.str_markets(id) on delete set null,
  period date not null, -- siempre primer día del mes.
  country_code char(2) not null references public.countries(code),
  currency char(3) not null references public.currencies(code),
  occupancy_rate numeric(5, 4), -- 0.0000..1.0000
  adr_minor bigint, -- daily rate en minor units.
  revpar_minor bigint,
  revenue_minor bigint,
  nights_available smallint,
  nights_booked smallint,
  avg_length_of_stay numeric(6, 2),
  fetched_at timestamptz not null default now(),
  run_id uuid,
  meta jsonb not null default '{}'::jsonb,
  primary key (id, period)
) partition by range (period);

create index idx_str_snap_listing_period
  on public.str_monthly_snapshots (platform, listing_id, period desc);
create index idx_str_snap_market_period
  on public.str_monthly_snapshots (market_id, period desc) where market_id is not null;
create index idx_str_snap_period_brin on public.str_monthly_snapshots using brin (period);
create unique index idx_str_snap_unique
  on public.str_monthly_snapshots (platform, listing_id, period);
create index idx_str_snap_run on public.str_monthly_snapshots (run_id) where run_id is not null;

select public.create_parent(
  p_parent_table := 'public.str_monthly_snapshots',
  p_control      := 'period',
  p_interval     := '1 year'
);

alter table public.str_monthly_snapshots enable row level security;

create policy str_snap_select_internal on public.str_monthly_snapshots
  for select to authenticated
  using (
    public.is_superadmin()
    or public.get_user_role() in ('asesor', 'mb_admin', 'admin_desarrolladora')
  );

create policy str_snap_write_admin on public.str_monthly_snapshots
  for all to authenticated
  using (
    public.is_superadmin()
    or public.get_user_role() = 'mb_admin'
  )
  with check (
    public.is_superadmin()
    or public.get_user_role() = 'mb_admin'
  );

comment on table public.str_monthly_snapshots is
  'Snapshots mensuales por listing × period. Particionada yearly. AirROI source. '
  'Agregados por market expuestos en v_str_zone_monthly.';

-- ============================================================
-- str_reviews — reviews de listings (texto + rating + sentiment).
-- Particionada monthly por posted_at (alto volumen esperado).
-- SELECT restringido (reviews pueden contener PII: nombres, referencias directas).
-- ============================================================
create table public.str_reviews (
  id bigint generated always as identity,
  platform text not null check (platform in ('airbnb', 'vrbo', 'booking')),
  listing_id text not null,
  review_id text not null,
  reviewer_id text,
  reviewer_first_name text, -- primer nombre only (política Airbnb public).
  rating numeric(2, 1) check (rating between 0 and 5),
  language char(2),
  review_text text,
  posted_at date not null,
  sentiment_score numeric(4, 3) check (sentiment_score between -1 and 1),
  sentiment_confidence numeric(4, 3) check (sentiment_confidence between 0 and 1),
  sentiment_source_span text,
  topics jsonb,
  fetched_at timestamptz not null default now(),
  run_id uuid,
  meta jsonb not null default '{}'::jsonb,
  primary key (id, posted_at)
) partition by range (posted_at);

create index idx_str_reviews_listing
  on public.str_reviews (platform, listing_id, posted_at desc);
create index idx_str_reviews_sentiment_null
  on public.str_reviews (posted_at desc) where sentiment_score is null;
create index idx_str_reviews_posted_brin on public.str_reviews using brin (posted_at);
create unique index idx_str_reviews_unique
  on public.str_reviews (platform, listing_id, review_id, posted_at);
create index idx_str_reviews_run on public.str_reviews (run_id) where run_id is not null;

select public.create_parent(
  p_parent_table := 'public.str_reviews',
  p_control      := 'posted_at',
  p_interval     := '1 month'
);

alter table public.str_reviews enable row level security;

create policy str_reviews_select_admin on public.str_reviews
  for select to authenticated
  using (
    public.is_superadmin()
    or public.get_user_role() in ('mb_admin', 'admin_desarrolladora')
  );

create policy str_reviews_write_admin on public.str_reviews
  for all to authenticated
  using (
    public.is_superadmin()
    or public.get_user_role() = 'mb_admin'
  )
  with check (
    public.is_superadmin()
    or public.get_user_role() = 'mb_admin'
  );

comment on table public.str_reviews is
  'Reviews STR. Particionada monthly por posted_at. SELECT restringido a admin '
  '(PII potencial). Asesores consumen topics/sentiment agregados vía views.';

-- ============================================================
-- str_photos_metadata — metadata de fotos (URL + CV labels tras 7b.H).
-- NO particionada (moderate volume, heavy mutation en H workers).
-- ============================================================
create table public.str_photos_metadata (
  id bigint generated always as identity,
  platform text not null check (platform in ('airbnb', 'vrbo', 'booking')),
  listing_id text not null,
  photo_url text not null,
  order_index smallint not null default 0,
  width integer,
  height integer,
  cv_labels jsonb,
  cv_quality_score numeric(4, 3) check (cv_quality_score between 0 and 1),
  cv_processed_at timestamptz,
  fetched_at timestamptz not null default now(),
  run_id uuid,
  meta jsonb not null default '{}'::jsonb,
  primary key (id)
);

create index idx_str_photos_listing
  on public.str_photos_metadata (platform, listing_id, order_index);
create index idx_str_photos_cv_null
  on public.str_photos_metadata (platform, listing_id) where cv_labels is null;
create unique index idx_str_photos_unique
  on public.str_photos_metadata (platform, listing_id, photo_url);

alter table public.str_photos_metadata enable row level security;

create policy str_photos_select_internal on public.str_photos_metadata
  for select to authenticated
  using (
    public.is_superadmin()
    or public.get_user_role() in ('mb_admin', 'admin_desarrolladora')
  );

create policy str_photos_write_admin on public.str_photos_metadata
  for all to authenticated
  using (
    public.is_superadmin()
    or public.get_user_role() = 'mb_admin'
  )
  with check (
    public.is_superadmin()
    or public.get_user_role() = 'mb_admin'
  );

comment on table public.str_photos_metadata is
  'Metadata + CV labels de fotos STR. SELECT restringido (URLs externas, CV cost signal). '
  'cv_labels + cv_quality_score poblados por worker 7b.H.';

-- ============================================================
-- v_str_zone_monthly — agregado público por market × period.
-- Expuesto a asesor + anon (vistas del marketplace/portal público).
-- ============================================================
create view public.v_str_zone_monthly as
select
  s.market_id,
  m.country_code,
  m.airroi_district,
  m.airroi_locality,
  s.period,
  s.currency,
  count(*) as snapshots_count,
  avg(s.occupancy_rate) filter (where s.occupancy_rate is not null) as occupancy_rate_avg,
  percentile_cont(0.5) within group (order by s.adr_minor) filter (where s.adr_minor is not null) as adr_median_minor,
  percentile_cont(0.5) within group (order by s.revpar_minor) filter (where s.revpar_minor is not null) as revpar_median_minor,
  percentile_cont(0.5) within group (order by s.revenue_minor) filter (where s.revenue_minor is not null) as revenue_median_minor
from public.str_monthly_snapshots s
join public.str_markets m on m.id = s.market_id
group by s.market_id, m.country_code, m.airroi_district, m.airroi_locality, s.period, s.currency;

comment on view public.v_str_zone_monthly is
  'Agregado STR por market × period (public-safe: medianas no revelan listings individuales).';
