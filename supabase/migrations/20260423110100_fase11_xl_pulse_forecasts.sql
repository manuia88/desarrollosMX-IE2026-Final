-- BLOQUE 11.N.-1.2 — Pulse Pronóstico 30d daily (L93).
--
-- Tabla pulse_forecasts: serie daily con banda CI 95% por (zone_id × forecast_date
-- × methodology). Persiste 30 puntos por zona por corrida.
-- Heurística H1: trend lineal 12m + weekly seasonality + banda ±1.96σ rolling.
-- Reemplazable ARIMA/LSTM real en FASE 12 N5 sin migración de schema (cambia
-- methodology label).

create table if not exists public.pulse_forecasts (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null,
  country_code text not null default 'MX',
  forecast_date date not null,
  value numeric(5,2) not null check (value >= 0 and value <= 100),
  value_lower numeric(5,2) check (value_lower >= 0 and value_lower <= 100),
  value_upper numeric(5,2) check (value_upper >= 0 and value_upper <= 100),
  methodology text not null default 'heuristic_v1',
  generated_at timestamptz not null default now(),
  unique (zone_id, forecast_date, methodology)
);

create index if not exists pulse_forecasts_zone_date_idx
  on public.pulse_forecasts (zone_id, forecast_date desc);
create index if not exists pulse_forecasts_country_idx
  on public.pulse_forecasts (country_code, forecast_date desc);

alter table public.pulse_forecasts enable row level security;

create policy pulse_forecasts_public_read on public.pulse_forecasts
  for select
  using (true);

comment on policy pulse_forecasts_public_read on public.pulse_forecasts is
  'RATIONALE intentional_public: forecast Pulse 30d es producto público '
  '(diferenciador L93 — "signos vitales futuros").';

create policy pulse_forecasts_service_write on public.pulse_forecasts
  for all to service_role
  using (true) with check (true);

comment on table public.pulse_forecasts is
  'BLOQUE 11.N: forecast daily Pulse Score por zona, serie 30 puntos, banda CI 95%.';
