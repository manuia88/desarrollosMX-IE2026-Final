-- FASE 11 XL — DMX Indices schema + moonshots infra.
--
-- Crea 21 tablas nuevas para soportar:
--   - 15 índices DMX (IPV, IAB, IDS, IRE, ICO, MOM, LIV, FAM, YNG, GRN,
--     STR, INV, DEV, GNT, STA) via tabla principal dmx_indices con
--     scope_type ∈ (colonia, alcaldia, city, estado) y explainability
--     ready (components con citation_source + citation_period).
--   - Audit log inmutable B2B (dmx_indices_audit_log).
--   - Changelog metodología S&P-style (dmx_indices_methodology_versions).
--   - Moonshots: migration flows, pulse scores, alpha alerts, influencer
--     heat, colonia DNA vectors (pgvector 64-dim), constellations graph,
--     wiki colectiva, alert subs, causal cache, climate twin, lifepath,
--     widget embed, sticker templates, ghost zones ranking, national
--     scorecard, futures curve, DNA+migration matches, forensics reports.
--
-- Allowlist audit_rls_violations v15 llega en migration separada
-- (20260421101000) — patrón idéntico a v14 post-FASE 10 SESIÓN 3/3.
--
-- Nota numeración: el spec solicita 16 tablas core + auxiliares; este
-- archivo materializa 21 tablas totales (16 core + 5 auxiliares XL
-- moonshots: methodology_versions, dna_migration_matches, forensics,
-- ghost_zones_ranking, scorecard_national_reports). Total declarado
-- en comment final.

-- ============================================================
-- Extensiones requeridas
-- ============================================================
create extension if not exists vector;

-- ============================================================
-- TABLA 1: dmx_indices — core XL (15 códigos × 4 scope_types)
-- ============================================================
create table if not exists public.dmx_indices (
  id uuid primary key default gen_random_uuid(),
  index_code text not null check (index_code in (
    'IPV','IAB','IDS','IRE','ICO','MOM','LIV',
    'FAM','YNG','GRN','STR','INV','DEV','GNT','STA'
  )),
  scope_type text not null check (scope_type in ('colonia','alcaldia','city','estado')),
  scope_id text not null,
  country_code text not null default 'MX',
  period_date date not null,
  period_type text not null check (period_type in ('monthly','quarterly','annual')),
  value numeric(6,2) not null check (value >= 0 and value <= 100),
  components jsonb not null,
  inputs_used jsonb not null,
  confidence text not null check (confidence in ('high','medium','low','insufficient_data')),
  confidence_score integer check (confidence_score between 0 and 100),
  confidence_breakdown jsonb,
  score_band text check (score_band in ('excelente','bueno','regular','bajo')),
  ranking_in_scope integer,
  percentile numeric(5,2),
  trend_vs_previous numeric(6,2),
  trend_direction text check (trend_direction in ('mejorando','estable','empeorando')),
  methodology_version text not null default 'v1.0',
  circuit_breaker_triggered boolean not null default false,
  is_shadow boolean not null default false,
  calculated_at timestamptz not null default now(),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  unique (index_code, scope_type, scope_id, country_code, period_date, period_type, methodology_version, is_shadow)
);

create index if not exists dmx_indices_rank_idx
  on public.dmx_indices (index_code, country_code, period_date desc, ranking_in_scope);
create index if not exists dmx_indices_scope_idx
  on public.dmx_indices (country_code, scope_type, scope_id, period_date desc);
create index if not exists dmx_indices_components_gin
  on public.dmx_indices using gin (components);
create index if not exists dmx_indices_inputs_gin
  on public.dmx_indices using gin (inputs_used);

alter table public.dmx_indices enable row level security;

create policy dmx_indices_public_read_closed on public.dmx_indices
  for select
  using (period_date < date_trunc('month', now())::date and is_shadow = false);

comment on policy dmx_indices_public_read_closed on public.dmx_indices is
  'RATIONALE intentional_public: rankings de período cerrado son producto '
  'licenciable S&P-style visible al público. Shadow rows (is_shadow=true) '
  'quedan ocultos porque representan metodología v(N+1) en A/B test.';

create policy dmx_indices_service_write on public.dmx_indices
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 2: dmx_indices_audit_log — inmutable audit B2B
-- ============================================================
create table if not exists public.dmx_indices_audit_log (
  id uuid primary key default gen_random_uuid(),
  index_id uuid not null references public.dmx_indices(id) on delete restrict,
  run_id uuid not null,
  input_snapshot jsonb not null,
  output_snapshot jsonb not null,
  calculator_version text not null,
  model text,
  triggered_by text not null,
  triggered_at timestamptz not null default now()
);

create index if not exists dmx_indices_audit_index_idx
  on public.dmx_indices_audit_log (index_id, triggered_at desc);
create index if not exists dmx_indices_audit_run_idx
  on public.dmx_indices_audit_log (run_id);

alter table public.dmx_indices_audit_log enable row level security;

create policy dmx_indices_audit_service_read on public.dmx_indices_audit_log
  for select to service_role
  using (true);

create policy dmx_indices_audit_service_write on public.dmx_indices_audit_log
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 3: dmx_indices_methodology_versions — changelog S&P-style
-- ============================================================
create table if not exists public.dmx_indices_methodology_versions (
  id uuid primary key default gen_random_uuid(),
  index_code text not null,
  version text not null,
  formula_md text not null,
  weights_jsonb jsonb not null,
  effective_from date not null,
  effective_to date,
  changelog_notes text,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (index_code, version)
);

create index if not exists dmx_methodology_code_idx
  on public.dmx_indices_methodology_versions (index_code, effective_from desc);

alter table public.dmx_indices_methodology_versions enable row level security;

create policy dmx_methodology_public_read on public.dmx_indices_methodology_versions
  for select
  using (true);

comment on policy dmx_methodology_public_read on public.dmx_indices_methodology_versions is
  'RATIONALE intentional_public: metodología DMX es abierta S&P-style — '
  'fórmula + pesos + changelog publicados para B2B trust.';

create policy dmx_methodology_service_write on public.dmx_indices_methodology_versions
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 4: zone_migration_flows — flows origen→destino
-- ============================================================
create table if not exists public.zone_migration_flows (
  id uuid primary key default gen_random_uuid(),
  origin_scope_type text not null check (origin_scope_type in ('colonia','alcaldia','city','estado')),
  origin_scope_id text not null,
  dest_scope_type text not null check (dest_scope_type in ('colonia','alcaldia','city','estado')),
  dest_scope_id text not null,
  country_code text not null default 'MX',
  period_date date not null,
  volume integer not null check (volume >= 0),
  confidence numeric(5,2) check (confidence between 0 and 100),
  source_mix jsonb not null,
  income_decile_origin integer check (income_decile_origin between 1 and 10),
  income_decile_dest integer check (income_decile_dest between 1 and 10),
  calculated_at timestamptz not null default now(),
  unique (origin_scope_type, origin_scope_id, dest_scope_type, dest_scope_id, country_code, period_date)
);

create index if not exists zone_migration_flows_origin_idx
  on public.zone_migration_flows (country_code, origin_scope_type, origin_scope_id, period_date desc);
create index if not exists zone_migration_flows_dest_idx
  on public.zone_migration_flows (country_code, dest_scope_type, dest_scope_id, period_date desc);

alter table public.zone_migration_flows enable row level security;

create policy zone_migration_flows_public_read on public.zone_migration_flows
  for select
  using (period_date < date_trunc('month', now())::date);

comment on policy zone_migration_flows_public_read on public.zone_migration_flows is
  'RATIONALE intentional_public: flows agregados anónimos (volume + decil) '
  'son producto de descubrimiento público post período cerrado.';

create policy zone_migration_flows_service_write on public.zone_migration_flows
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 5: zone_pulse_scores — pulse en vivo por zona
-- ============================================================
create table if not exists public.zone_pulse_scores (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null check (scope_type in ('colonia','alcaldia','city','estado')),
  scope_id text not null,
  country_code text not null default 'MX',
  period_date date not null,
  business_births integer not null default 0,
  business_deaths integer not null default 0,
  foot_traffic_day integer,
  foot_traffic_night integer,
  calls_911_count integer,
  events_count integer,
  pulse_score numeric(6,2) check (pulse_score >= 0 and pulse_score <= 100),
  confidence text check (confidence in ('high','medium','low','insufficient_data')),
  components jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  unique (scope_type, scope_id, country_code, period_date)
);

create index if not exists zone_pulse_scope_idx
  on public.zone_pulse_scores (country_code, scope_type, scope_id, period_date desc);

alter table public.zone_pulse_scores enable row level security;

create policy zone_pulse_public_read_closed on public.zone_pulse_scores
  for select
  using (period_date < date_trunc('month', now())::date);

comment on policy zone_pulse_public_read_closed on public.zone_pulse_scores is
  'RATIONALE intentional_public: pulse cerrado es producto público; pulse '
  'en período abierto es premium y se sirve via backend.';

create policy zone_pulse_service_write on public.zone_pulse_scores
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 6: zone_alpha_alerts — alpha/early-signal zonas
-- ============================================================
create table if not exists public.zone_alpha_alerts (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null,
  scope_type text not null default 'colonia' check (scope_type in ('colonia','alcaldia','city','estado')),
  country_code text not null default 'MX',
  alpha_score numeric(6,2) not null check (alpha_score >= 0 and alpha_score <= 100),
  time_to_mainstream_months integer,
  signals jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now(),
  subscribers_notified integer not null default 0,
  is_active boolean not null default true
);

create index if not exists zone_alpha_alerts_zone_idx
  on public.zone_alpha_alerts (zone_id, detected_at desc) where is_active;
create index if not exists zone_alpha_alerts_country_idx
  on public.zone_alpha_alerts (country_code, detected_at desc) where is_active;

alter table public.zone_alpha_alerts enable row level security;

create policy zone_alpha_alerts_auth_read on public.zone_alpha_alerts
  for select to authenticated
  using (is_active = true);

create policy zone_alpha_alerts_service_write on public.zone_alpha_alerts
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 7: influencer_heat_zones — raw influencer signal (sensitive)
-- ============================================================
create table if not exists public.influencer_heat_zones (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null,
  scope_type text not null default 'colonia' check (scope_type in ('colonia','alcaldia','city','estado')),
  country_code text not null default 'MX',
  period_date date not null,
  chef_count integer not null default 0,
  gallery_count integer not null default 0,
  creator_count integer not null default 0,
  specialty_cafe_count integer not null default 0,
  heat_score numeric(6,2) check (heat_score >= 0 and heat_score <= 100),
  sources jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  unique (zone_id, period_date)
);

create index if not exists influencer_heat_country_idx
  on public.influencer_heat_zones (country_code, period_date desc);

alter table public.influencer_heat_zones enable row level security;

create policy influencer_heat_service_read on public.influencer_heat_zones
  for select to service_role
  using (true);

create policy influencer_heat_service_write on public.influencer_heat_zones
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 8: colonia_dna_vectors — pgvector 64-dim similarity
-- ============================================================
create table if not exists public.colonia_dna_vectors (
  colonia_id uuid primary key,
  country_code text not null default 'MX',
  vector vector(64) not null,
  components jsonb not null,
  computed_at timestamptz not null default now(),
  methodology_version text not null default 'v1.0'
);

create index if not exists colonia_dna_hnsw
  on public.colonia_dna_vectors using hnsw (vector vector_cosine_ops);
create index if not exists colonia_dna_country_idx
  on public.colonia_dna_vectors (country_code);

alter table public.colonia_dna_vectors enable row level security;

create policy colonia_dna_public_read on public.colonia_dna_vectors
  for select
  using (true);

comment on policy colonia_dna_public_read on public.colonia_dna_vectors is
  'RATIONALE intentional_public: similarity search es API pública de '
  'descubrimiento — vector + components sin PII.';

create policy colonia_dna_service_write on public.colonia_dna_vectors
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 9: zone_constellations_edges — graph colonias
-- ============================================================
create table if not exists public.zone_constellations_edges (
  id uuid primary key default gen_random_uuid(),
  source_colonia_id uuid not null,
  target_colonia_id uuid not null,
  edge_weight numeric(6,3) not null check (edge_weight >= 0),
  edge_types jsonb not null default '{}'::jsonb,
  period_date date not null,
  calculated_at timestamptz not null default now(),
  unique (source_colonia_id, target_colonia_id, period_date),
  check (source_colonia_id <> target_colonia_id)
);

create index if not exists constellation_source_idx
  on public.zone_constellations_edges (source_colonia_id, period_date desc);
create index if not exists constellation_target_idx
  on public.zone_constellations_edges (target_colonia_id, period_date desc);

alter table public.zone_constellations_edges enable row level security;

create policy constellations_public_read on public.zone_constellations_edges
  for select
  using (true);

comment on policy constellations_public_read on public.zone_constellations_edges is
  'RATIONALE intentional_public: grafo agregado de relaciones entre '
  'colonias es producto de descubrimiento público.';

create policy constellations_service_write on public.zone_constellations_edges
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 10: colonia_wiki_entries — wiki colectiva moderada
-- ============================================================
create table if not exists public.colonia_wiki_entries (
  id uuid primary key default gen_random_uuid(),
  colonia_id uuid not null,
  version integer not null default 1,
  content_md text not null,
  sections jsonb not null default '{}'::jsonb,
  edited_by uuid,
  edited_at timestamptz not null default now(),
  reviewed boolean not null default false,
  reviewed_by uuid,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (colonia_id, version)
);

create index if not exists colonia_wiki_colonia_idx
  on public.colonia_wiki_entries (colonia_id, version desc);
create index if not exists colonia_wiki_published_idx
  on public.colonia_wiki_entries (colonia_id) where published = true and reviewed = true;

alter table public.colonia_wiki_entries enable row level security;

create policy colonia_wiki_public_read on public.colonia_wiki_entries
  for select
  using (reviewed = true and published = true);

comment on policy colonia_wiki_public_read on public.colonia_wiki_entries is
  'RATIONALE intentional_public: entradas reviewed+published son contenido '
  'abierto tipo Wikipedia. Borradores (reviewed=false) quedan restringidos.';

create policy colonia_wiki_service_write on public.colonia_wiki_entries
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 11: zone_alert_subscriptions — owner-based
-- ============================================================
create table if not exists public.zone_alert_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  zone_id uuid not null,
  country_code text not null default 'MX',
  threshold_pct numeric(6,2) not null check (threshold_pct >= 0),
  channel text not null check (channel in ('whatsapp','email','push')),
  active boolean not null default true,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists zone_alert_subs_user_idx
  on public.zone_alert_subscriptions (user_id, active);
create index if not exists zone_alert_subs_zone_idx
  on public.zone_alert_subscriptions (zone_id) where active;

alter table public.zone_alert_subscriptions enable row level security;

create policy zone_alert_subs_owner_select on public.zone_alert_subscriptions
  for select to authenticated
  using (user_id = auth.uid());

create policy zone_alert_subs_owner_insert on public.zone_alert_subscriptions
  for insert to authenticated
  with check (user_id = auth.uid());

create policy zone_alert_subs_owner_update on public.zone_alert_subscriptions
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy zone_alert_subs_owner_delete on public.zone_alert_subscriptions
  for delete to authenticated
  using (user_id = auth.uid());

create policy zone_alert_subs_service_all on public.zone_alert_subscriptions
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 12: causal_explanations — cache explicaciones LLM
-- ============================================================
create table if not exists public.causal_explanations (
  id uuid primary key default gen_random_uuid(),
  score_id text not null,
  scope_type text not null check (scope_type in ('colonia','alcaldia','city','estado')),
  scope_id text not null,
  period_date date not null,
  explanation_md text not null,
  citations jsonb not null default '[]'::jsonb,
  model text not null,
  prompt_version text not null,
  generated_at timestamptz not null default now(),
  ttl_days integer not null default 30,
  cache_hit_count integer not null default 0,
  unique (score_id, scope_type, scope_id, period_date, prompt_version)
);

create index if not exists causal_explanations_lookup_idx
  on public.causal_explanations (score_id, scope_type, scope_id, period_date desc);

alter table public.causal_explanations enable row level security;

create policy causal_explanations_public_read on public.causal_explanations
  for select
  using (true);

comment on policy causal_explanations_public_read on public.causal_explanations is
  'RATIONALE intentional_public: explicaciones causales son producto '
  'público (parte del descubrimiento). Citations + model + prompt_version '
  'publicados para trust.';

create policy causal_explanations_service_write on public.causal_explanations
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 13: climate_twin_projections — proyecciones 2040/2050
-- ============================================================
create table if not exists public.climate_twin_projections (
  id uuid primary key default gen_random_uuid(),
  colonia_id uuid not null,
  projection_year integer not null check (projection_year between 2025 and 2100),
  temp_celsius numeric(5,2),
  water_availability_pct numeric(5,2) check (water_availability_pct >= 0 and water_availability_pct <= 100),
  air_quality_index numeric(6,2),
  confidence numeric(5,2) check (confidence >= 0 and confidence <= 100),
  methodology_version text not null default 'v1.0',
  sources jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  unique (colonia_id, projection_year, methodology_version)
);

create index if not exists climate_twin_colonia_idx
  on public.climate_twin_projections (colonia_id, projection_year);

alter table public.climate_twin_projections enable row level security;

create policy climate_twin_public_read on public.climate_twin_projections
  for select
  using (true);

comment on policy climate_twin_public_read on public.climate_twin_projections is
  'RATIONALE intentional_public: proyecciones climáticas son producto '
  'narrativo público (diferenciador vs portales tradicionales).';

create policy climate_twin_service_write on public.climate_twin_projections
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 14: lifepath_user_profiles — owner-based matches
-- ============================================================
create table if not exists public.lifepath_user_profiles (
  user_id uuid primary key,
  income_range text,
  family_state text,
  work_mode text,
  preferences jsonb not null default '{}'::jsonb,
  top_3_matches jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.lifepath_user_profiles enable row level security;

create policy lifepath_owner_select on public.lifepath_user_profiles
  for select to authenticated
  using (user_id = auth.uid());

create policy lifepath_owner_insert on public.lifepath_user_profiles
  for insert to authenticated
  with check (user_id = auth.uid());

create policy lifepath_owner_update on public.lifepath_user_profiles
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy lifepath_owner_delete on public.lifepath_user_profiles
  for delete to authenticated
  using (user_id = auth.uid());

create policy lifepath_service_all on public.lifepath_user_profiles
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 15: widget_embed_registry — widgets públicos embebibles
-- ============================================================
create table if not exists public.widget_embed_registry (
  id uuid primary key default gen_random_uuid(),
  embed_id text not null unique,
  owner_user_id uuid,
  scope_type text not null check (scope_type in ('colonia','alcaldia','city','estado')),
  scope_id text not null,
  customization jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  views_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists widget_embed_owner_idx
  on public.widget_embed_registry (owner_user_id) where owner_user_id is not null;
create index if not exists widget_embed_active_idx
  on public.widget_embed_registry (active, scope_type, scope_id);

alter table public.widget_embed_registry enable row level security;

create policy widget_embed_public_read on public.widget_embed_registry
  for select
  using (active = true);

comment on policy widget_embed_public_read on public.widget_embed_registry is
  'RATIONALE intentional_public: widgets embebibles deben servirse a '
  'cualquier sitio que los incruste. Solo se expone metadata de embed '
  'activo (sin PII).';

create policy widget_embed_owner_update on public.widget_embed_registry
  for update to authenticated
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

create policy widget_embed_owner_delete on public.widget_embed_registry
  for delete to authenticated
  using (owner_user_id = auth.uid());

create policy widget_embed_service_all on public.widget_embed_registry
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 16: sticker_templates — templates gratis marketing
-- ============================================================
create table if not exists public.sticker_templates (
  id uuid primary key default gen_random_uuid(),
  template_id text not null unique,
  template_type text not null,
  svg_template text not null,
  customizable_fields jsonb not null default '[]'::jsonb,
  downloads_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sticker_templates_type_idx
  on public.sticker_templates (template_type);

alter table public.sticker_templates enable row level security;

create policy sticker_templates_public_read on public.sticker_templates
  for select
  using (true);

comment on policy sticker_templates_public_read on public.sticker_templates is
  'RATIONALE intentional_public: templates gratis para compartir — '
  'distribución viral parte del producto.';

create policy sticker_templates_service_write on public.sticker_templates
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 17: ghost_zones_ranking — zonas olvidadas (Pro gated)
-- ============================================================
create table if not exists public.ghost_zones_ranking (
  id uuid primary key default gen_random_uuid(),
  colonia_id uuid not null,
  country_code text not null default 'MX',
  period_date date not null,
  score_total numeric(6,2),
  search_volume integer not null default 0,
  press_mentions integer not null default 0,
  ghost_score numeric(6,2) not null check (ghost_score >= 0 and ghost_score <= 100),
  rank integer,
  calculated_at timestamptz not null default now(),
  unique (colonia_id, period_date)
);

create index if not exists ghost_zones_country_idx
  on public.ghost_zones_ranking (country_code, period_date desc, rank);

alter table public.ghost_zones_ranking enable row level security;

create policy ghost_zones_auth_read on public.ghost_zones_ranking
  for select to authenticated
  using (true);

create policy ghost_zones_service_write on public.ghost_zones_ranking
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 18: scorecard_national_reports — reportes trimestre nacionales
-- ============================================================
create table if not exists public.scorecard_national_reports (
  id uuid primary key default gen_random_uuid(),
  report_id text not null unique,
  period_type text not null check (period_type in ('monthly','quarterly','annual')),
  period_date date not null,
  country_code text not null default 'MX',
  pdf_url text,
  narrative_md text,
  data_snapshot jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  hero_insights jsonb not null default '[]'::jsonb,
  press_kit_url text,
  created_at timestamptz not null default now()
);

create index if not exists scorecard_national_published_idx
  on public.scorecard_national_reports (country_code, period_date desc) where published_at is not null;

alter table public.scorecard_national_reports enable row level security;

create policy scorecard_national_public_read on public.scorecard_national_reports
  for select
  using (published_at is not null);

comment on policy scorecard_national_public_read on public.scorecard_national_reports is
  'RATIONALE intentional_public: reportes nacionales publicados son '
  'producto editorial abierto (estrategia prensa/PR).';

create policy scorecard_national_service_write on public.scorecard_national_reports
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 19: futures_curve_projections — forward curve 3/6/12/24m
-- ============================================================
create table if not exists public.futures_curve_projections (
  id uuid primary key default gen_random_uuid(),
  index_code text not null,
  scope_type text not null check (scope_type in ('colonia','alcaldia','city','estado')),
  scope_id text not null,
  country_code text not null default 'MX',
  base_period_date date not null,
  forward_3m numeric(6,2),
  forward_6m numeric(6,2),
  forward_12m numeric(6,2),
  forward_24m numeric(6,2),
  confidence numeric(5,2) check (confidence >= 0 and confidence <= 100),
  methodology text not null default 'heuristic_v1',
  calculated_at timestamptz not null default now(),
  unique (index_code, scope_type, scope_id, base_period_date)
);

create index if not exists futures_curve_lookup_idx
  on public.futures_curve_projections (index_code, country_code, scope_type, scope_id, base_period_date desc);

alter table public.futures_curve_projections enable row level security;

create policy futures_curve_public_read on public.futures_curve_projections
  for select
  using (true);

comment on policy futures_curve_public_read on public.futures_curve_projections is
  'RATIONALE intentional_public: forward curves son producto público '
  '(diferenciador "mercado futuro" estilo Bloomberg).';

create policy futures_curve_service_write on public.futures_curve_projections
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 20: dna_migration_matches — XF-01 (DNA × Migration)
-- ============================================================
create table if not exists public.dna_migration_matches (
  id uuid primary key default gen_random_uuid(),
  origin_colonia_id uuid not null,
  dest_colonia_id uuid not null,
  similarity_score numeric(6,3) not null check (similarity_score >= -1 and similarity_score <= 1),
  migration_volume integer not null default 0 check (migration_volume >= 0),
  combined_score numeric(6,3) not null,
  period_date date not null,
  calculated_at timestamptz not null default now(),
  unique (origin_colonia_id, dest_colonia_id, period_date),
  check (origin_colonia_id <> dest_colonia_id)
);

create index if not exists dna_migration_origin_idx
  on public.dna_migration_matches (origin_colonia_id, period_date desc, combined_score desc);

alter table public.dna_migration_matches enable row level security;

create policy dna_migration_public_read on public.dna_migration_matches
  for select
  using (true);

comment on policy dna_migration_public_read on public.dna_migration_matches is
  'RATIONALE intentional_public: matches DNA×Migración son producto XF-01 '
  'público (descubrimiento agregado anónimo).';

create policy dna_migration_service_write on public.dna_migration_matches
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 21: historical_forensics_reports — XF-08 (forensic narrative)
-- ============================================================
create table if not exists public.historical_forensics_reports (
  id uuid primary key default gen_random_uuid(),
  colonia_id uuid not null,
  period_start date not null,
  period_end date not null,
  events_detected jsonb not null default '[]'::jsonb,
  causal_chain jsonb not null default '[]'::jsonb,
  pdf_url text,
  generated_at timestamptz not null default now(),
  narrative_md text,
  check (period_end >= period_start)
);

create index if not exists forensics_colonia_idx
  on public.historical_forensics_reports (colonia_id, period_start desc);

alter table public.historical_forensics_reports enable row level security;

create policy forensics_public_read on public.historical_forensics_reports
  for select
  using (true);

comment on policy forensics_public_read on public.historical_forensics_reports is
  'RATIONALE intentional_public: reportes forensics son producto narrativo '
  'editorial público (XF-08).';

create policy forensics_service_write on public.historical_forensics_reports
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- Close: schema comment
-- ============================================================
comment on schema public is 'FASE 11 XL — 21 tablas índices + moonshots + seeds';
