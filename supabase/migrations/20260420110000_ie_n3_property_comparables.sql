-- FASE 10 SESIÓN 2/3 — D31 property_comparables table.
-- Ref: docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md (N3 block) + CLAUDE.md §10.
--
-- D31 comparable_properties (nivel unidad individual):
-- Separada de zone_scores.comparable_zones porque el scope es unidad × unidad
-- (A08 Comparador Multi-D) y el ciclo de vida per property_id es distinto al
-- per zone_id. UNIQUE (property_id, score_id, period_date).
--
-- property_id no tiene FK aún: la tabla `unidades` / `propiedades` aterriza en
-- FASE 13 (Portal Asesor) y FASE 15 (Portal Dev). Se agregará FK en migration
-- posterior cuando la tabla exista. Mientras tanto property_id es uuid opaco.
--
-- Nada destructivo. IF NOT EXISTS en todo. Safe replay.

-- ============================================================
-- property_comparables — comparables per unidad individual
-- ============================================================
create table if not exists public.property_comparables (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null,
  score_id text not null,
  period_date date not null,
  country_code char(2) not null references public.countries(code),
  comparable_properties jsonb not null default '[]'::jsonb,
  k int not null default 8 check (k >= 1 and k <= 50),
  computed_at timestamptz not null default now(),
  valid_until timestamptz,
  unique (property_id, score_id, period_date)
);

create index if not exists idx_property_comparables_property
  on public.property_comparables (property_id, score_id);

create index if not exists idx_property_comparables_score_period
  on public.property_comparables (score_id, period_date desc);

create index if not exists idx_property_comparables_country
  on public.property_comparables (country_code, period_date desc);

alter table public.property_comparables enable row level security;

create policy property_comparables_select_authenticated on public.property_comparables
  for select to authenticated using (true);

create policy property_comparables_service_all on public.property_comparables
  for all to service_role using (true) with check (true);

comment on table public.property_comparables is
  'D31 FASE 10 SESIÓN 2/3 — top K properties más similares per (property_id, score_id, period_date). '
  'Populate automático al persistir A08 (Comparador Multi-D). K default=8. '
  'property_id sin FK aún: tabla unidades aterriza en FASE 13-15.';

comment on column public.property_comparables.comparable_properties is
  'Array jsonb: [{property_id, similarity, delta, dimensions_matched[]}] ordenado por similarity DESC.';

comment on column public.property_comparables.k is
  'Número de comparables retornados. Default 8 (A08 Comparador 8 dimensiones).';
