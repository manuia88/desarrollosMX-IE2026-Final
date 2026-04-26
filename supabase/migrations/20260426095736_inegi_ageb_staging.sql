-- F1.C.C Tier 2 Demographics — INEGI AGEB staging table
--
-- Persists 2,433 AGEB urbanos CDMX from RESAGEBURB CSV + Marco Geoestadístico
-- 09a.shp polygons (EPSG:4326 reprojected via shpjs). Used by SECDEF RPC
-- recompute_zone_demographics_from_ageb (migration .200000) to compute
-- weighted aggregations per colonia via PostGIS ST_Intersects + ST_Area
-- overlay against zones.boundary (F1.D real polygons).
--
-- Composite PK (cve_ent, cve_mun, cve_loc, cve_ageb) — 13-char join key
-- alineado con AGEB hex (e.g., '003A'). Per SA-ITER §1.3: AGEB codes are
-- alphanumeric hex; force string types in CSV parser (papaparse
-- dynamicTyping: false).
--
-- Geometry column EPSG:4326 (post-shpjs reprojection from native EPSG:6372
-- ITRF2008 LCC). GIST index for sub-second spatial joins.
--
-- ageb_total_area_km2 GENERATED column for fast overlay weight computation
-- (denominator in ST_Area(ST_Intersection)/ST_Area(ageb)).
--
-- BIBLIA DECISIÓN 2: zero data loss — staging only, source-of-truth
-- aggregations persisten en inegi_census_zone_stats con data_origin update.
-- ADR-018: backfill logs to ingest_runs (source='inegi_resageburb_overlay').

create table if not exists public.inegi_ageb_staging (
  cve_ent     char(2)  not null,
  cve_mun     char(3)  not null,
  cve_loc     char(4)  not null,
  cve_ageb    char(4)  not null,
  geom_4326   public.geometry(MultiPolygon, 4326) not null,
  pobtot          integer,
  poblacion_12y   integer,
  pob_0_14        integer,
  pob_15_64       integer,
  pob_65_mas      integer,
  tothog          integer,
  graproes        numeric(5,2),
  pea             integer,
  vph_inter       integer,
  vph_pc          integer,
  ageb_total_area_km2 numeric generated always as
    (public.ST_Area(geom_4326::public.geography) / 1e6) stored,
  imported_at timestamptz not null default now(),
  primary key (cve_ent, cve_mun, cve_loc, cve_ageb)
);

create index if not exists ix_ageb_staging_geom
  on public.inegi_ageb_staging using gist(geom_4326);

create index if not exists ix_ageb_staging_pobtot
  on public.inegi_ageb_staging(pobtot)
  where pobtot is not null;

alter table public.inegi_ageb_staging enable row level security;

-- Service-role-only (no public read; RLS-DISABLED would fail audit:rls).
create policy "service_role_full_access" on public.inegi_ageb_staging
  for all
  to service_role
  using (true)
  with check (true);

comment on table public.inegi_ageb_staging is
  'F1.C.C Tier 2: 2433 AGEB urbanos CDMX (RESAGEBURB CSV + MGN 09a.shp). Source for spatial overlay RPC recompute_zone_demographics_from_ageb. Service-role-only (RLS).';

comment on column public.inegi_ageb_staging.geom_4326 is
  'AGEB polygon EPSG:4326 (reprojected from native EPSG:6372 via shpjs proj4). GIST indexed.';

comment on column public.inegi_ageb_staging.ageb_total_area_km2 is
  'Generated column: ST_Area(geom_4326::geography) / 1e6. Used as denominator in spatial overlay fraction.';
