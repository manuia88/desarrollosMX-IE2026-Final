-- Opción D FASE 07.5.0 — Zones master canonical polymorphic table.
--
-- Tabla central canónica para TODAS las entidades geográficas del sistema DMX:
--   country, region, estado/provincia/departamento, city/ciudad,
--   county/municipio/alcaldía/partido, barrio/colonia/bairro/neighborhood,
--   zip, census_tract. Multi-país día 1 (MX/CO/AR/BR/US).
--
-- Referencias:
--   - ADR-030 (creado en este mismo batch) canonical-zones-polymorphic
--   - Memoria feedback_arquitectura_escalable_desacoplada.md ("cimientos ambiciosos día 1")
--   - Audit integral 2026-04-24 §13 (detección de 3 patrones inconsistentes
--     zone_id/colonia_id/scope_type+scope_id en 33+ tablas)
--
-- FKs desde 18+ tablas existentes con zone_id/colonia_id: DIFERIDO a L-NEW13 FASE 08 post-Opción D.
-- Aquí solo creamos zones master. Consistency es enforced a nivel aplicación via
-- UUIDs v5 determinísticos (namespace DMX estable) — ver scripts/ingest/lib/zones-loader.ts.
--
-- Assumptions: PostGIS y uuid-ossp ya instaladas (validadas PRE-0 — postgis 3.3.7, uuid-ossp 1.1).

create table public.zones (
  id uuid primary key default gen_random_uuid(),

  -- Taxonomy polimórfica
  scope_type text not null,
  scope_id text not null,      -- natural key jerárquico (ej: 'MX-CDMX-BJ-del-valle-centro')
  country_code char(2) not null,

  -- Nombres localizados (upgrade U2)
  name_es text not null,
  name_en text not null,
  name_pt text,                -- nullable: países no-lusófonos

  -- Hierarchy parent (natural key, FK enforcement diferido L-NEW13)
  parent_scope_id text,        -- NULL para country; NOT NULL para resto (enforced por CHECK)

  -- Coordenadas centroid
  lat numeric(9, 6),
  lng numeric(9, 6),

  -- U3 PostGIS MultiPolygon boundary (NULL OK H1, populate futuro con INEGI marco geoestadístico)
  boundary geography(MultiPolygon, 4326),

  -- U4 H3 hexagonal index r8 (~460m resolution, NULL OK H1 — compute cuando haya boundary/coords + lib h3)
  h3_r8 text,

  -- Demographics básicos (NULL OK H1, populate futuro en FASE 07.5.A script 04 demographics)
  area_km2 numeric,
  population integer,

  -- U5 metadata con OSM admin_level abstracto
  metadata jsonb not null default '{}'::jsonb,
  -- Expected keys en metadata:
  --   admin_level int (OSM: 2=country, 4=state, 6=county, 8=city, 10=suburb)
  --   data_source text ('inegi'|'dane'|'ibge'|'census'|'osm'|'manual')
  --   seed_version text ('v1_h1_cdmx')

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (country_code, scope_type, scope_id),

  -- U1 CHECK constraints robustos
  constraint zones_scope_type_valid check (scope_type in (
    'country', 'region',
    'estado', 'provincia', 'departamento', 'state', 'territory',
    'city', 'ciudad', 'cidade',
    'county', 'municipio', 'alcaldia', 'partido', 'delegacao',
    'barrio', 'colonia', 'bairro', 'neighborhood', 'suburb',
    'zip', 'census_tract'
  )),
  constraint zones_country_code_valid check (country_code in ('MX', 'CO', 'AR', 'BR', 'US', 'XX')),
  constraint zones_lat_range check (lat is null or (lat >= -90 and lat <= 90)),
  constraint zones_lng_range check (lng is null or (lng >= -180 and lng <= 180)),
  constraint zones_country_no_parent check (
    (scope_type = 'country' and parent_scope_id is null) or
    (scope_type <> 'country' and parent_scope_id is not null)
  ),
  constraint zones_name_non_empty check (length(trim(name_es)) > 0 and length(trim(name_en)) > 0),
  constraint zones_area_km2_positive check (area_km2 is null or area_km2 > 0),
  constraint zones_population_nonneg check (population is null or population >= 0)
);

-- Indexes
create index zones_country_scope_idx on public.zones (country_code, scope_type);
create index zones_parent_idx on public.zones (country_code, parent_scope_id) where parent_scope_id is not null;
create index zones_h3_r8_idx on public.zones (h3_r8) where h3_r8 is not null;
create index zones_boundary_gix on public.zones using gist (boundary) where boundary is not null;
create index zones_admin_level_idx on public.zones ((metadata->>'admin_level'));

-- Trigger updated_at (usa function estándar set_updated_at ya existente)
create trigger trg_zones_set_updated_at
  before update on public.zones
  for each row execute function public.set_updated_at();

-- RLS + policies
alter table public.zones enable row level security;

create policy zones_public_read on public.zones
  for select using (true);
comment on policy zones_public_read on public.zones is
  'RATIONALE intentional_public: zones master canonical global (sin PII). '
  'Consumido por TODAS las features UI públicas (indices, atlas, genoma, climate twin, '
  'constellations, ghost, pulse, futures, lifepath). Tabla geográfica pública equivalente a GeoNames/OSM.';

create policy zones_service_write on public.zones
  for all to service_role using (true) with check (true);
comment on policy zones_service_write on public.zones is
  'RATIONALE intentional_public: seed via scripts/ingest/00_seed-zones-canonical.ts + '
  'future ingest pipelines per-country (INEGI/DANE/IBGE/Census). Service-role only — '
  'mutaciones controladas por pipelines, no por usuarios finales.';

-- Comment table
comment on table public.zones is
  'BLOQUE 07.5.0 — Master canonical polimórfico entidades geográficas '
  '(country/state/city/county/neighborhood/zip). '
  'UUIDs v5 determinísticos (namespace DMX) garantizan idempotencia seed + consistency cross-repo. '
  'Seed H1: content/zones/mx/ CDMX only (~219 rows). Multi-país + bulk via L-NEW14-19 agendados. '
  'FK enforcement en 18+ tablas con zone_id diferido L-NEW13 FASE 08 post-Opción D. '
  'Ver ADR-030 CANONICAL_ZONES_POLYMORPHIC.';
