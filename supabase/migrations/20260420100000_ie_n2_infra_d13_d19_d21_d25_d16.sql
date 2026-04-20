-- FASE 10 SESIÓN 1/3 — infra N2 compartida (D13+D16+D19+D21+D25).
-- Ref: docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md (N2 block) + CLAUDE.md §10.
--
-- D13 confidence propagation: extiende composeConfidence en TS; sin cambios DB.
-- D14 sensitivity analysis: vive en methodology.sensitivity_analysis; sin DB.
-- D16 score_comparison_matrix: precomputa comparativas por cluster de zonas.
-- D18 public/internal views: score_visibility_rules jsonb en feature_registry;
--   activación layer tRPC queda para sesión 3 cuando aterricen E01/G01.
-- D19 ml_explanations: columna jsonb en zone_scores + project_scores (LIME).
-- D21 score_change_webhooks: subscription + trigger emitter delta >10%.
-- D25 stability_index: columna numeric en zone_scores + project_scores.
--
-- Nada destructivo. IF NOT EXISTS en todo. Safe replay.

-- ============================================================
-- D19 + D25 — ALTER zone_scores + project_scores
-- ============================================================
alter table public.zone_scores
  add column if not exists stability_index numeric(5, 4)
    check (stability_index is null or (stability_index >= 0 and stability_index <= 1));

alter table public.zone_scores
  add column if not exists ml_explanations jsonb not null default '{}'::jsonb;

alter table public.project_scores
  add column if not exists stability_index numeric(5, 4)
    check (stability_index is null or (stability_index >= 0 and stability_index <= 1));

alter table public.project_scores
  add column if not exists ml_explanations jsonb not null default '{}'::jsonb;

comment on column public.zone_scores.stability_index is
  'D25 — stability = 1 − stddev/mean sobre últimos 12m. Null si <3 snapshots. '
  '≥0.85 estable · <0.6 volátil.';

comment on column public.zone_scores.ml_explanations is
  'D19 — LIME-style top contributors para ML scores (H14, E03). '
  'Shape: {top_contributors: [{feature, impact_pts, direction}]}.';

comment on column public.project_scores.stability_index is
  'D25 — ver zone_scores.stability_index.';

comment on column public.project_scores.ml_explanations is
  'D19 — ver zone_scores.ml_explanations.';

-- ============================================================
-- D16 — score_comparison_matrix (cluster cache para A08 Comparador)
-- ============================================================
create table if not exists public.score_comparison_matrix (
  id uuid primary key default gen_random_uuid(),
  cluster_key text not null,
  country_code char(2) not null references public.countries(code),
  score_ids text[] not null,
  zone_ids uuid[] not null,
  matrix jsonb not null,
  computed_at timestamptz not null default now(),
  valid_until timestamptz not null,
  row_count int not null check (row_count >= 0),
  col_count int not null check (col_count >= 0),
  unique (cluster_key, country_code)
);

create index if not exists idx_score_comparison_matrix_country_cluster
  on public.score_comparison_matrix (country_code, cluster_key);

create index if not exists idx_score_comparison_matrix_valid
  on public.score_comparison_matrix (valid_until desc);

alter table public.score_comparison_matrix enable row level security;

create policy score_comparison_matrix_select_authenticated on public.score_comparison_matrix
  for select to authenticated using (true);

create policy score_comparison_matrix_service_all on public.score_comparison_matrix
  for all to service_role using (true) with check (true);

comment on table public.score_comparison_matrix is
  'D16 — matriz precomputada N x M (zones × scores) por cluster geográfico. '
  'Rebuild daily via cron scripts/score-comparison-matrix-rebuild.mjs. '
  'Habilita A08 Comparador Multi-D <200ms.';

-- ============================================================
-- D21 — score_change_webhooks (subscription + emitter)
-- ============================================================
create table if not exists public.score_change_webhooks (
  id uuid primary key default gen_random_uuid(),
  subscription_name text not null,
  url text not null check (url ~ '^https?://'),
  hmac_secret text not null,
  score_ids text[] not null default '{}'::text[],
  entity_types text[] not null default array['zone']::text[]
    check (entity_types <@ array['zone','project','user']::text[]),
  country_codes char(2)[] not null default array['MX']::char(2)[],
  min_delta_pct numeric(5, 2) not null default 10.00
    check (min_delta_pct >= 0 and min_delta_pct <= 100),
  enabled boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_delivery_at timestamptz,
  last_delivery_status text check (last_delivery_status in ('ok','retry','failed')),
  unique (subscription_name)
);

create index if not exists idx_score_change_webhooks_enabled
  on public.score_change_webhooks (enabled) where enabled = true;

alter table public.score_change_webhooks enable row level security;

create policy score_change_webhooks_service_all on public.score_change_webhooks
  for all to service_role using (true) with check (true);

comment on table public.score_change_webhooks is
  'D21 — subscriptions webhook. HMAC signature + 3-retry backoff. '
  'Managed vía POST/GET/DELETE /api/admin/webhooks/score-changes (superadmin).';

-- ============================================================
-- D21 — score_change_deliveries (ledger entregas webhook para retry)
-- ============================================================
create table if not exists public.score_change_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_id uuid not null references public.score_change_webhooks(id) on delete cascade,
  score_id text not null,
  entity_type text not null check (entity_type in ('zone','project','user')),
  entity_id uuid not null,
  country_code char(2) not null,
  period_date date not null,
  delta_pct numeric(6, 2) not null,
  prev_value numeric(6, 2),
  new_value numeric(6, 2) not null,
  payload jsonb not null,
  attempt int not null default 0,
  status text not null default 'pending'
    check (status in ('pending','ok','retry','failed')),
  enqueued_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  next_attempt_at timestamptz
);

create index if not exists idx_score_change_deliveries_pending
  on public.score_change_deliveries (status, next_attempt_at)
  where status in ('pending','retry');

alter table public.score_change_deliveries enable row level security;

create policy score_change_deliveries_service_all on public.score_change_deliveries
  for all to service_role using (true) with check (true);

comment on table public.score_change_deliveries is
  'D21 — ledger de entregas webhook. Retry backoff exponential 1m/5m/30m. '
  'Worker score-change-webhook-worker (sesión 2/3 wire).';

-- ============================================================
-- D21 — fn_emit_score_change_webhook (trigger AFTER UPDATE zone_scores)
-- Lee webhooks activos, valida delta, encola delivery.
-- ============================================================
create or replace function public.fn_emit_score_change_webhook()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta_pct numeric;
  v_abs_delta_pct numeric;
  v_prev numeric;
  v_new numeric;
  w record;
  v_payload jsonb;
begin
  v_prev := old.score_value;
  v_new := new.score_value;
  if v_prev is null or v_prev = 0 or v_new is null then
    return new;
  end if;

  v_delta_pct := ((v_new - v_prev) / nullif(v_prev, 0)) * 100;
  v_abs_delta_pct := abs(v_delta_pct);

  for w in
    select id, score_ids, entity_types, country_codes, min_delta_pct
    from public.score_change_webhooks
    where enabled = true
  loop
    if array_length(w.score_ids, 1) > 0 and not (new.score_type = any(w.score_ids)) then
      continue;
    end if;
    if not ('zone' = any(w.entity_types)) then
      continue;
    end if;
    if not (new.country_code = any(w.country_codes)) then
      continue;
    end if;
    if v_abs_delta_pct < w.min_delta_pct then
      continue;
    end if;

    v_payload := jsonb_build_object(
      'event', 'score.changed',
      'score_id', new.score_type,
      'entity_type', 'zone',
      'entity_id', new.zone_id,
      'country_code', new.country_code,
      'period_date', new.period_date,
      'prev_value', v_prev,
      'new_value', v_new,
      'delta_pct', round(v_delta_pct, 2),
      'confidence', new.confidence,
      'computed_at', new.computed_at
    );

    insert into public.score_change_deliveries (
      webhook_id, score_id, entity_type, entity_id, country_code,
      period_date, delta_pct, prev_value, new_value, payload,
      status, next_attempt_at
    ) values (
      w.id, new.score_type, 'zone', new.zone_id, new.country_code,
      new.period_date, round(v_delta_pct, 2), v_prev, v_new, v_payload,
      'pending', now()
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_zone_scores_webhook_emit on public.zone_scores;
create trigger trg_zone_scores_webhook_emit
  after update of score_value on public.zone_scores
  for each row
  when (old.score_value is distinct from new.score_value)
  execute function public.fn_emit_score_change_webhook();

comment on trigger trg_zone_scores_webhook_emit on public.zone_scores is
  'D21 — emite webhook deliveries cuando delta score > min_delta_pct subscripción.';

grant execute on function public.fn_emit_score_change_webhook to service_role;
