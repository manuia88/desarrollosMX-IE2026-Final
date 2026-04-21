-- FASE 11 BLOQUE 11.J.4 — Strava Segments streaks por zona (L94).
--
-- Tabla zone_streaks: rankings mensuales de las colonias con más "rachas"
-- consecutivas de pulse > 80. Motivation analogous to Strava Segments —
-- every zone has a continuous leaderboard; long streaks are badge-worthy.
--
-- Consumers:
--   - features/newsletter/lib/streaks-calculator.ts (upsert periódico via cron)
--   - app/[locale]/(public)/indices/streaks/page.tsx (render público)
--   - features/newsletter/templates/monthly-mom.tsx (sección "Las más vivas")
--   - DMX Wrapped cards (racha más larga del año)
--
-- Policies:
--   - zs_select_public: SELECT público (datasets abiertos, no-sensibles)
--   - zs_service_all:   FOR ALL TO service_role (cron writer)

create table if not exists public.zone_streaks (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries(code),
  scope_type text not null check (scope_type in ('colonia','alcaldia','city','estado')),
  scope_id text not null,
  period_date date not null,
  streak_length_months integer not null check (streak_length_months >= 1),
  current_pulse numeric(5,2) not null check (current_pulse >= 0 and current_pulse <= 100),
  rank_in_country integer not null check (rank_in_country >= 1),
  computed_at timestamptz not null default now(),
  unique (country_code, scope_id, period_date)
);

create index if not exists idx_zs_country_rank
  on public.zone_streaks (country_code, period_date desc, rank_in_country);

create index if not exists idx_zs_scope_period
  on public.zone_streaks (scope_type, scope_id, period_date desc);

alter table public.zone_streaks enable row level security;

-- Public read: scores agregados sin datos sensibles (rankings por país).
drop policy if exists zs_select_public on public.zone_streaks;
create policy zs_select_public
  on public.zone_streaks
  for select
  using (true);

comment on policy zs_select_public on public.zone_streaks is
  'intentional_public: rankings agregados de zonas por país (FASE 11 §11.J.4) — pública por diseño';

-- Service role: cron batch writer (mismo patrón que zone_pulse_scores).
drop policy if exists zs_service_all on public.zone_streaks;
create policy zs_service_all
  on public.zone_streaks
  for all
  to service_role
  using (true)
  with check (true);

comment on policy zs_service_all on public.zone_streaks is
  'intentional_public: policy FOR ALL TO service_role (bypass RLS natural); cron writer FASE 11 §11.J.4';

comment on table public.zone_streaks is
  'Rachas consecutivas de pulse > 80 por zona — Strava Segments leaderboard analog (FASE 11 §11.J.4).';
