-- FASE 08 / BLOQUE 8.D / AVM MVP I01 DMX Estimate.
-- Refs: docs/02_PLAN_MAESTRO/FASE_08_IE_SCORES_N0.md §BLOQUE 8.D
--       docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md §I01
--       docs/01_DECISIONES_ARQUITECTONICAS/ADR-013_API_AS_PRODUCT.md
--
-- Upgrades aplicados en la tabla:
--   D4 — MAE tracking + intervalos confianza (mae_estimated_pct, ci_low, ci_high, confidence_score)
--   D5 — Adjustments auditables (jsonb con source/weight/confidence per adjustment)
--   D6 — Counter-estimate (estimate_alternative, spread_pct, flag_uncertain, flag_corroborated)
--   D7 — Cache 24h por fingerprint (valid_until + unique (fingerprint, valid_until))
--   P1 — valid_until default now() + 24h alineado con D7
--   S1 — RLS self-read (auth.uid() = user_id) + service_role all
--   U13 — comparable_zones persistido con provenance market_context
--
-- Tabla append-only por design: cada estimate se persiste con su fingerprint
-- + valid_until, y la cache D7 consulta WHERE fingerprint=X AND valid_until>now().

create table if not exists public.avm_estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  api_key_id uuid null,
  fingerprint text not null,

  request_input jsonb not null,
  estimate numeric not null,
  mae_estimated_pct numeric,
  ci_low numeric,
  ci_high numeric,
  confidence_score int,

  estimate_alternative numeric,
  spread_pct numeric,
  flag_uncertain boolean not null default false,
  flag_corroborated boolean not null default false,

  adjustments jsonb not null default '[]'::jsonb,
  comparables jsonb not null default '[]'::jsonb,
  market_context jsonb not null default '{}'::jsonb,
  provenance jsonb not null default '{}'::jsonb,

  valid_until timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),

  constraint avm_estimates_fingerprint_valid_until_unique
    unique (fingerprint, valid_until)
);

comment on table public.avm_estimates is
  'AVM MVP I01 DMX Estimate — cada fila es un estimate persistido con su '
  'fingerprint (D7 cache 24h) + MAE/CI (D4) + adjustments auditables (D5) + '
  'counter-estimate (D6). valid_until default now()+24h.';

comment on column public.avm_estimates.fingerprint is
  'D7 — sha256(canonicalInput).slice(0,16) determinístico. Lookup cache '
  'pre-compute: WHERE fingerprint=X AND valid_until>now().';
comment on column public.avm_estimates.mae_estimated_pct is
  'D4 — MAE estimado derivado de R² del modelo + variance comparables.';
comment on column public.avm_estimates.ci_low is
  'D4 — estimate × (1 - mae_estimated_pct).';
comment on column public.avm_estimates.ci_high is
  'D4 — estimate × (1 + mae_estimated_pct).';
comment on column public.avm_estimates.confidence_score is
  'D4 — 0-100 mapping inverso de mae (mae 25% → 50, mae 10% → 80).';
comment on column public.avm_estimates.estimate_alternative is
  'D6 — segundo método independiente (comparables median × sup_m2).';
comment on column public.avm_estimates.spread_pct is
  'D6 — ABS(estimate - estimate_alternative) / estimate × 100.';
comment on column public.avm_estimates.flag_uncertain is
  'D6 — true si spread_pct > 15% (recomienda visita en persona).';
comment on column public.avm_estimates.flag_corroborated is
  'D6 — true si spread_pct <= 15%.';
comment on column public.avm_estimates.adjustments is
  'D5 — Array<{feature,value_pct,source,weight,confidence,explanation_i18n_key}>. '
  'source ∈ {regression_coefficient, comparable_overlay, market_context}.';
comment on column public.avm_estimates.valid_until is
  'P1+D7 — default now()+24h. Cache invalidation explícita en BLOQUE 8.F via '
  'cascade market_prices_secondary por zona afectada.';

-- Índices performance + cache lookup D7.
create index if not exists idx_avm_estimates_user
  on public.avm_estimates (user_id, created_at desc)
  where user_id is not null;

create index if not exists idx_avm_estimates_api_key
  on public.avm_estimates (api_key_id, created_at desc)
  where api_key_id is not null;

create index if not exists idx_avm_estimates_fingerprint_valid
  on public.avm_estimates (fingerprint, valid_until desc);

create index if not exists idx_avm_estimates_created_at
  on public.avm_estimates (created_at desc);

-- ============================================================
-- RLS S1 — self-read + service_role all.
-- ============================================================
alter table public.avm_estimates enable row level security;

-- Self-read: authenticated user lee solo sus propias estimates.
create policy avm_estimates_self_select on public.avm_estimates
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_superadmin()
  );

comment on policy avm_estimates_self_select on public.avm_estimates is
  'S1 — authenticated user lee solo sus propias avm_estimates. Superadmin bypass.';

-- Service role: all (bypass natural vía service_role key; policy explícita por convención).
create policy avm_estimates_service_all on public.avm_estimates
  for all to service_role
  using (true)
  with check (true);

comment on policy avm_estimates_service_all on public.avm_estimates is
  'intentional_public: policy FOR ALL TO service_role (bypass RLS natural); '
  'endpoint /api/v1/estimate persiste con admin client. qual=true es convención.';

-- Marcar allowlist para audit-rls v7+ (evitar false positive).
do $$
declare
  pol_oid oid;
begin
  select pol.oid into pol_oid
  from pg_catalog.pg_policy pol
  join pg_catalog.pg_class c on c.oid = pol.polrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'avm_estimates'
    and pol.polname = 'avm_estimates_service_all';

  if pol_oid is not null then
    execute format(
      'comment on policy %I on public.%I is %L',
      'avm_estimates_service_all',
      'avm_estimates',
      'intentional_public: policy FOR ALL TO service_role (bypass RLS natural); qual=true es convención'
    );
  end if;
end$$;
