-- FASE 08 / BLOQUE 8.F.4 — market_anomalies table + anomaly flag column.
-- Ref: plan §BLOQUE 8.F prompt v8 U11 + F3 baseline rolling 30d.
--
-- U11 — Anomaly detection en runScore
-- F3 — Baseline rolling 30d desde score_history para detectar outliers (> 3σ)
--
-- runScore compara new_value contra baseline = AVG(score_history últimos 30d
-- para mismo entity + score_type). Si deviation > 3 × stddev_30d → INSERT en
-- market_anomalies + UPDATE zone_scores/project_scores.anomaly = {detected, sigma}.
-- UI ScoreTransparencyPanel (E4) muestra badge si anomaly.detected=true.

create table if not exists public.market_anomalies (
  id uuid primary key default gen_random_uuid(),
  score_id text not null,
  entity_type text not null check (entity_type in ('zone','project','user','market')),
  entity_id uuid not null,
  country_code char(2) not null references public.countries(code),
  period_date date not null,
  value_current numeric(8, 3) not null,
  value_baseline numeric(8, 3) not null,
  deviation_sigma numeric(6, 2) not null,
  baseline_samples_count int not null,
  detected_at timestamptz not null default now(),
  ack boolean not null default false,
  ack_at timestamptz,
  ack_by uuid,
  notes text
);

comment on table public.market_anomalies is
  'U11 — Outliers detectados al persistir un score. baseline = AVG(score_history) '
  'últimos 30d mismo entity+score; anomaly si |current−baseline| > 3×stddev. '
  'ack = admin reconoció y decide si es data bug vs evento real.';

create index if not exists idx_market_anomalies_entity_score_time
  on public.market_anomalies (entity_id, score_id, detected_at desc);

create index if not exists idx_market_anomalies_unack
  on public.market_anomalies (detected_at desc) where ack = false;

alter table public.market_anomalies enable row level security;

drop policy if exists market_anomalies_service_all on public.market_anomalies;
create policy market_anomalies_service_all on public.market_anomalies
  for all to service_role using (true) with check (true);

-- Authenticated puede SELECT solo anomalies de entity_type='zone' (data pública).
-- project/user anomalies son sensibles → service_role only.
drop policy if exists market_anomalies_select_zones on public.market_anomalies;
create policy market_anomalies_select_zones on public.market_anomalies
  for select to authenticated
  using (entity_type = 'zone');

comment on policy market_anomalies_select_zones on public.market_anomalies is
  'Zone anomalies son públicas (zonas son data abierta). '
  'project/user anomalies son sensibles — solo service_role.';

-- Flag jsonb en zone_scores/project_scores para que persist.ts marque anomaly
-- sin requerir JOIN en cada SELECT. UI consume .anomaly directo.
alter table public.zone_scores
  add column if not exists anomaly jsonb;

alter table public.project_scores
  add column if not exists anomaly jsonb;

comment on column public.zone_scores.anomaly is
  'U11 flag: { detected:bool, deviation_sigma:number, baseline:number, samples:int }. '
  'NULL = no anomaly check ejecutado o insuficiente baseline. UI E4 muestra badge.';

comment on column public.project_scores.anomaly is
  'U11 flag — ver zone_scores.anomaly.';
