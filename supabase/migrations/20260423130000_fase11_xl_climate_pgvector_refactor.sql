-- BLOQUE 11.P FIX — Climate signatures refactor numeric[] → pgvector(12).
--
-- Razón: filosofía escalabilidad (feedback_arquitectura_escalable_desacoplada.md).
-- Tabla climate_annual_summaries tiene 0 rows (SEED no ejecutado aún) → DROP+CREATE
-- con pgvector limpio, zero data loss.
--
-- Cambios:
--   1. DROP+CREATE climate_annual_summaries con composite_climate_signature vector(12)
--      + HNSW cosine index (similarity search O(log N) DB-side).
--   2. Nueva tabla climate_zone_signatures — aggregate per-zone usado para twin matching
--      eficiente (query RPC find_climate_twins).
--   3. RPC find_climate_twins(zone_id, top_n, min_sim) — DB-side cosine similarity
--      retorna top N twins ordenados por similaridad. security definer + set search_path.

-- ============================================================
-- 1. DROP antigua (0 rows garantizados — SEED no ejecutado)
-- ============================================================
drop table if exists public.climate_annual_summaries cascade;

-- ============================================================
-- 2. CREATE climate_annual_summaries con pgvector(12)
-- ============================================================
create table public.climate_annual_summaries (
  zone_id uuid not null,
  year integer not null check (year between 2010 and 2030),
  climate_type text check (climate_type in ('tropical', 'arid', 'temperate', 'cold', 'humid_subtropical')),
  composite_climate_signature vector(12) not null,
  summary jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  unique (zone_id, year)
);

create index climate_annual_zone_idx
  on public.climate_annual_summaries (zone_id, year desc);
create index climate_annual_sig_hnsw
  on public.climate_annual_summaries using hnsw (composite_climate_signature vector_cosine_ops);

alter table public.climate_annual_summaries enable row level security;

create policy climate_annual_public_read on public.climate_annual_summaries
  for select
  using (true);

comment on policy climate_annual_public_read on public.climate_annual_summaries is
  'RATIONALE intentional_public: summaries climáticos anuales son features '
  'públicos del Clima Gemelo (sin PII).';

create policy climate_annual_service_write on public.climate_annual_summaries
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- 3. Nueva tabla zone-level aggregate signature para twin matching eficiente
-- ============================================================
create table public.climate_zone_signatures (
  zone_id uuid primary key,
  signature vector(12) not null,
  years_observed integer not null default 0,
  methodology text not null default 'heuristic_v1',
  computed_at timestamptz not null default now()
);

create index climate_zone_sig_hnsw
  on public.climate_zone_signatures using hnsw (signature vector_cosine_ops);

alter table public.climate_zone_signatures enable row level security;

create policy climate_zone_sig_public_read on public.climate_zone_signatures
  for select
  using (true);

comment on policy climate_zone_sig_public_read on public.climate_zone_signatures is
  'RATIONALE intentional_public: signature agregado del Clima Gemelo es producto '
  'narrativo público (sin PII).';

create policy climate_zone_sig_service_write on public.climate_zone_signatures
  for all to service_role
  using (true) with check (true);

comment on table public.climate_annual_summaries is
  'BLOQUE 11.P (refactor pgvector): summary anual + signature vector(12) con HNSW cosine index.';
comment on table public.climate_zone_signatures is
  'BLOQUE 11.P (nuevo): signature agregado per-zone para twin matching O(log N) DB-side.';

-- ============================================================
-- 4. RPC find_climate_twins — O(log N) twin matching DB-side via HNSW
-- ============================================================
create or replace function public.find_climate_twins(
  p_zone_id uuid,
  p_top_n integer default 10,
  p_min_sim numeric default 0.7
)
returns table (twin_zone_id uuid, similarity numeric)
language sql
stable
security definer
set search_path = ''
as $function$
  -- pgvector extension en este proyecto vive en schema `public`.
  -- Con `search_path = ''` (hardening SECDEF) requiere calificación explícita
  -- del operador cosine vía OPERATOR(public.<=>).
  with target as (
    select signature from public.climate_zone_signatures where zone_id = p_zone_id
  )
  select
    czs.zone_id as twin_zone_id,
    round(
      ((1 - (czs.signature OPERATOR(public.<=>) (select signature from target)))::numeric) * 100,
      2
    ) as similarity
  from public.climate_zone_signatures czs, target
  where czs.zone_id <> p_zone_id
    and (1 - (czs.signature OPERATOR(public.<=>) target.signature)) >= p_min_sim
  order by czs.signature OPERATOR(public.<=>) (select signature from target)
  limit p_top_n;
$function$;

comment on function public.find_climate_twins(uuid, integer, numeric) is
  'BLOQUE 11.P: Climate twin matching O(log N) via HNSW cosine. Retorna top N twins '
  'con similarity 0-100. Stable (no side effects), public read-only.';
