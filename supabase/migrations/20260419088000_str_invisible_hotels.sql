-- FASE 07b / BLOQUE 7b.E — Invisible Hotel Detection.
-- Refs:
--   docs/02_PLAN_MAESTRO/FASE_07b_STR_INTELLIGENCE_COMPLETE.md §7b.E
--   docs/01_DECISIONES_ARQUITECTONICAS/ADR-019_STR_MODULE_COMPLETE.md
--
-- Detecta clusters de ≥5 listings del mismo host en radio 200m. Output
-- alimenta:
--   - dashboard admin (/admin/str/invisible-hotels) — UI diferida.
--   - export CSV para gobierno (input regulatorio).
--   - Knowledge Graph B2B (GC-18) edge host→operates→cluster.

create table public.str_invisible_hotels (
  cluster_id uuid primary key default gen_random_uuid(),
  host_id text not null,
  country_code char(2) not null references public.countries(code),
  market_id uuid references public.str_markets(id) on delete set null,
  zone_id uuid,
  listings_count smallint not null check (listings_count >= 5),
  center_geom geometry(Point, 4326) not null,
  bounding_radius_m integer not null check (bounding_radius_m > 0),
  detection_method text not null check (
    detection_method in (
      'host_id_proximity',
      'name_prefix_match',
      'photo_pattern_match',
      'composite'
    )
  ),
  confidence numeric(4, 3) not null check (confidence between 0 and 1),
  manual_review_status text not null
    default 'pending'
    check (manual_review_status in ('pending', 'confirmed', 'false_positive', 'unknown')),
  manual_review_notes text,
  manual_reviewed_by uuid references public.profiles(id),
  manual_reviewed_at timestamptz,
  first_detected_at timestamptz not null default now(),
  last_verified_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

create unique index idx_str_invisible_hotels_host_market_unique
  on public.str_invisible_hotels (host_id, market_id)
  where manual_review_status <> 'false_positive';
create index idx_str_invisible_hotels_country
  on public.str_invisible_hotels (country_code, listings_count desc);
create index idx_str_invisible_hotels_market
  on public.str_invisible_hotels (market_id) where market_id is not null;
create index idx_str_invisible_hotels_geom
  on public.str_invisible_hotels using gist (center_geom);
create index idx_str_invisible_hotels_review
  on public.str_invisible_hotels (manual_review_status, first_detected_at desc);

alter table public.str_invisible_hotels enable row level security;

create policy str_invisible_hotels_select_admin on public.str_invisible_hotels
  for select to authenticated
  using (public.is_superadmin() or public.get_user_role() = 'mb_admin');

create policy str_invisible_hotels_write_admin on public.str_invisible_hotels
  for all to authenticated
  using (public.is_superadmin() or public.get_user_role() = 'mb_admin')
  with check (public.is_superadmin() or public.get_user_role() = 'mb_admin');

comment on table public.str_invisible_hotels is
  'Clusters detectados de ≥5 listings/mismo host en proximidad <200m. Input '
  'compliance + producto B2B gobierno. Manual review queue obligatorio antes '
  'de export externo (riesgo falsos positivos: property managers legítimos).';

-- Detección via función SQL (set-based, evita N+1 round-trips).
-- Returns candidate clusters: (host_id, listings_count, center_geom).
create or replace function public.detect_invisible_hotel_candidates(
  p_country_code char(2),
  p_min_listings integer default 5,
  p_max_radius_m integer default 200
)
returns table (
  host_id text,
  market_id uuid,
  listings_count integer,
  center_lon double precision,
  center_lat double precision,
  bounding_radius_m integer,
  listing_ids text[]
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with active_listings as (
    select host_id, market_id, geom, listing_id
    from public.str_listings
    where country_code = p_country_code
      and host_id is not null
      and geom is not null
      and status = 'active'
  ),
  by_host as (
    select
      host_id,
      market_id,
      count(*) as listings_count,
      st_centroid(st_collect(geom)) as centroid,
      array_agg(listing_id) as listing_ids,
      coalesce(
        max(st_distance(geom::geography, st_centroid(st_collect(geom)) over (partition by host_id, market_id)::geography))::int,
        0
      ) as max_radius_m
    from active_listings
    group by host_id, market_id
  )
  select
    by_host.host_id,
    by_host.market_id,
    by_host.listings_count::int,
    st_x(by_host.centroid) as center_lon,
    st_y(by_host.centroid) as center_lat,
    by_host.max_radius_m,
    by_host.listing_ids
  from by_host
  where by_host.listings_count >= p_min_listings
    and by_host.max_radius_m <= p_max_radius_m;
$$;

comment on function public.detect_invisible_hotel_candidates(char, integer, integer) is
  'Set-based candidate detection. NO inserta — el worker invisible-hotel-detector '
  'consume el resultado, aplica heurísticas adicionales (nombres, fotos) y persiste '
  'en str_invisible_hotels con manual_review_status=pending.';
