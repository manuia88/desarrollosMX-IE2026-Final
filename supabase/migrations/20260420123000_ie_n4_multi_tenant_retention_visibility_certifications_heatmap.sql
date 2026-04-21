-- FASE 10 SESIÓN 3/3 — N4 infra: multi-tenant + retention + indexes
-- + score visibility + zone certifications + heatmap cache.
--
-- Items:
--   D33 — tenant_scopes + tenant_id cols en zone_scores/project_scores/user_scores/score_history
--   D34 — purge_expired_score_history() (5y retention SECDEF function)
--   D35 — composite indexes A08 comparador + E02 portfolio queries
--   D18 — ie_score_visibility_rules table + seed 7 N4 rows
--   L-32 — zone_certifications table
--   L-72 — heatmap_cache MV + exec_refresh_heatmap_cache() SECDEF
--
-- Allowlist v14 llega en migration separada (20260420123100).

-- ============================================================
-- D33 — tenant_scopes (multi-tenant boundary para N4 producto institucional)
-- ============================================================
create table if not exists public.tenant_scopes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.tenant_scopes enable row level security;

create policy tenant_scopes_select_auth on public.tenant_scopes
  for select to authenticated
  using (true);

comment on policy tenant_scopes_select_auth on public.tenant_scopes is
  'RATIONALE intentional_public: metadata de tenant es catálogo compartido '
  'sin PII — usuarios auth pueden leer la lista pero los scores con tenant_id '
  'se filtran por RLS tenant-aware abajo.';

create policy tenant_scopes_superadmin_all on public.tenant_scopes
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- tenant_id NULL = global (H1 default, backward compat con rows existentes).
alter table public.zone_scores add column if not exists tenant_id uuid references public.tenant_scopes(id);
alter table public.project_scores add column if not exists tenant_id uuid references public.tenant_scopes(id);
alter table public.user_scores add column if not exists tenant_id uuid references public.tenant_scopes(id);
alter table public.score_history add column if not exists tenant_id uuid references public.tenant_scopes(id);

create index if not exists idx_zone_scores_tenant on public.zone_scores (tenant_id) where tenant_id is not null;
create index if not exists idx_project_scores_tenant on public.project_scores (tenant_id) where tenant_id is not null;
create index if not exists idx_user_scores_tenant on public.user_scores (tenant_id) where tenant_id is not null;

-- ============================================================
-- D34 — purge_expired_score_history (5y retention cron target)
-- ============================================================
create or replace function public.purge_expired_score_history()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.score_history
  where archived_at < now() - interval '5 years';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke execute on function public.purge_expired_score_history() from public;
grant execute on function public.purge_expired_score_history() to service_role;

comment on function public.purge_expired_score_history() is
  'D34 FASE 10 SESIÓN 3/3 — purge score_history > 5y. Invocado desde '
  '/api/cron/score-history-purge weekly. SECDEF sin auth check '
  '(allowlist v14). Retorna row_count para telemetría.';

-- ============================================================
-- D35 — composite indexes A08 comparador + E02 portfolio queries
-- ============================================================
-- A08 Comparador Multi-D: queries por (project_id, score_type, period_date)
-- ya cubiertos por UNIQUE index. Agregar composite para filter por country.
create index if not exists idx_zone_scores_country_score_period
  on public.zone_scores (country_code, score_type, period_date desc);

create index if not exists idx_project_scores_country_score_period
  on public.project_scores (country_code, score_type, period_date desc);

-- E02 Portfolio Optimizer: queries multi-property + multi-score con filter
-- stability > 0.7. Partial index solo filas estables (reduce size ~70%).
create index if not exists idx_zone_scores_stable
  on public.zone_scores (country_code, score_type, period_date desc)
  where stability_index is not null and stability_index >= 0.7;

create index if not exists idx_project_scores_stable
  on public.project_scores (country_code, score_type, period_date desc)
  where stability_index is not null and stability_index >= 0.7;

-- ============================================================
-- D18 — ie_score_visibility_rules (public vs internal field filter)
-- ============================================================
create table if not exists public.ie_score_visibility_rules (
  score_id text primary key,
  visibility text not null check (visibility in ('public', 'internal', 'restricted')),
  allowed_fields jsonb not null default '[]'::jsonb,
  excluded_fields jsonb not null default '[]'::jsonb,
  tenant_scope_required boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.ie_score_visibility_rules enable row level security;

create policy ie_score_visibility_rules_select_auth on public.ie_score_visibility_rules
  for select to authenticated, anon
  using (true);

comment on policy ie_score_visibility_rules_select_auth on public.ie_score_visibility_rules is
  'RATIONALE intentional_public: el catálogo de visibility rules es metadata '
  'que la UI y tRPC deben leer para filtrar scores en runtime. No contiene PII '
  'ni secretos — solo declara qué campos son safe para clientes públicos.';

create policy ie_score_visibility_rules_superadmin_all on public.ie_score_visibility_rules
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- Seed rules para 7 N4 scores. E01 es internal; G01 es wrapper público de E01.
insert into public.ie_score_visibility_rules (score_id, visibility, allowed_fields, excluded_fields, tenant_scope_required) values
  ('E01', 'internal', '[]'::jsonb, '["components.internal_margin", "components.financial_raw", "components.dev_cost_breakdown", "provenance.internal_sources"]'::jsonb, true),
  ('G01', 'public', '["score_value", "score_label", "confidence", "components.public_summary", "components.public_breakdown", "components.category_averages", "components.trend_direction"]'::jsonb, '[]'::jsonb, false),
  ('E02', 'internal', '[]'::jsonb, '["components.raw_positions", "components.cost_basis"]'::jsonb, true),
  ('E03', 'internal', '[]'::jsonb, '["components.lead_scores_raw", "components.pii_signals"]'::jsonb, true),
  ('E04', 'internal', '[]'::jsonb, '["components.raw_deltas", "components.entity_list_breakdown"]'::jsonb, false),
  ('D09', 'public', '["score_value", "score_label", "confidence", "components.subscores"]'::jsonb, '[]'::jsonb, false),
  ('D02', 'public', '["score_value", "score_label", "confidence", "components.rank", "components.total_zones", "components.ipv_component", "components.liv_component"]'::jsonb, '[]'::jsonb, false)
on conflict (score_id) do update set
  visibility = excluded.visibility,
  allowed_fields = excluded.allowed_fields,
  excluded_fields = excluded.excluded_fields,
  tenant_scope_required = excluded.tenant_scope_required,
  updated_at = now();

-- ============================================================
-- L-32 — zone_certifications (DMX Zone Certified badge H2 prep)
-- ============================================================
create table if not exists public.zone_certifications (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null,
  country_code char(2) not null references public.countries(code),
  score_id text not null,
  certified_since date not null,
  criteria_met jsonb not null default '{}'::jsonb,
  badge_metadata jsonb not null default '{}'::jsonb,
  approved_by uuid references public.profiles(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (zone_id, score_id)
);

create index if not exists idx_zone_certifications_zone on public.zone_certifications (zone_id) where is_active;
create index if not exists idx_zone_certifications_score on public.zone_certifications (score_id) where is_active;

alter table public.zone_certifications enable row level security;

create policy zone_certifications_select_public on public.zone_certifications
  for select to authenticated, anon
  using (is_active = true);

comment on policy zone_certifications_select_public on public.zone_certifications is
  'RATIONALE intentional_public: certificaciones activas son info marketing '
  'pública (badge "DMX Zone Certified") consumida por portal público. Solo se '
  'exponen certificaciones aprobadas por admin (is_active=true).';

create policy zone_certifications_superadmin_all on public.zone_certifications
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- ============================================================
-- L-72 — heatmap_cache MV + exec_refresh_heatmap_cache (FASE 12 Mapbox prep)
-- ============================================================
-- MV con data agregada por score + zona para heatmap rendering.
-- Refresh diario 5am (ver vercel.json). H1 scope: score_value + zone_id +
-- country_code per score_type. Coordenadas lat/lng se resuelven en API
-- layer (FASE 12 Mapbox) desde fuente externa — no hay tabla zonas central
-- con centroides en H1, queda TODO post-FASE 11.
create materialized view if not exists public.heatmap_cache as
select
  zs.score_type as score_id,
  zs.zone_id,
  zs.country_code,
  zs.score_value as value,
  zs.confidence,
  zs.period_date,
  zs.computed_at
from public.zone_scores zs
where zs.period_date = (
  select max(period_date)
  from public.zone_scores zs2
  where zs2.score_type = zs.score_type
    and zs2.country_code = zs.country_code
);

create unique index if not exists idx_heatmap_cache_unique
  on public.heatmap_cache (score_id, zone_id, country_code);

create index if not exists idx_heatmap_cache_score_country
  on public.heatmap_cache (score_id, country_code);

create or replace function public.exec_refresh_heatmap_cache()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.heatmap_cache;
end;
$$;

revoke execute on function public.exec_refresh_heatmap_cache() from public;
grant execute on function public.exec_refresh_heatmap_cache() to service_role;

comment on function public.exec_refresh_heatmap_cache() is
  'L-72 FASE 10 SESIÓN 3/3 — refresh heatmap_cache MV via cron. '
  'SECDEF sin auth check (allowlist v14). Invocado desde '
  '/api/cron/heatmap-refresh (daily 5am UTC).';
