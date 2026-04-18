-- feature_registry + role_features + profile_feature_overrides
-- FASE 01 / MÓDULO 1.C.5
-- Ref: docs/02_PLAN_MAESTRO/FASE_01_BD_FUNDACION.md §1.C.5
-- Fuente de verdad del feature-gating runtime (ADR-008).

-- ============================================================
-- feature_registry
-- ============================================================
create table public.feature_registry (
  code text primary key,
  category text not null,
  module text not null,
  name_en text not null,
  name_es text not null,
  description_es text,
  is_premium boolean not null default false,
  min_plan text references public.plans(code),
  is_beta boolean not null default false,
  is_enabled boolean not null default true,
  h_phase smallint not null default 1,
  created_at timestamptz not null default now()
);

alter table public.feature_registry enable row level security;

-- Catálogo público read-only (consumido por resolve_features + UI feature-flags).
create policy feature_registry_select_public on public.feature_registry
  for select to authenticated, anon
  using (is_enabled = true);

-- ============================================================
-- role_features (defaults por rol)
-- ============================================================
create table public.role_features (
  rol public.user_role not null,
  feature_code text not null references public.feature_registry(code) on delete cascade,
  is_enabled boolean not null default true,
  primary key (rol, feature_code)
);

alter table public.role_features enable row level security;

create policy role_features_select_public on public.role_features
  for select to authenticated
  using (true);

comment on policy role_features_select_public on public.role_features is
  'RATIONALE: defaults rol→feature son metadata necesaria para que UI resuelva permisos sin leaks de PII.';

-- ============================================================
-- profile_feature_overrides (override por usuario con expiración opcional)
-- ============================================================
create table public.profile_feature_overrides (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  feature_code text not null references public.feature_registry(code) on delete cascade,
  is_enabled boolean not null,
  reason text,
  granted_by uuid references public.profiles(id),
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (profile_id, feature_code)
);

-- Índice compuesto (profile_id, expires_at) — cubre tanto permanentes (expires_at NULL)
-- como temporales. Se prefiere sobre partial index WHERE expires_at > now() porque now()
-- no es IMMUTABLE y Postgres rechaza esa forma.
create index idx_pfo_profile_expires on public.profile_feature_overrides (profile_id, expires_at);

alter table public.profile_feature_overrides enable row level security;

create policy pfo_select_own on public.profile_feature_overrides
  for select to authenticated
  using (profile_id = auth.uid());
