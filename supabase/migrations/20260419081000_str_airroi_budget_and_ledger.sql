-- FASE 07b / UPGRADE U5 — AirROI budget seed + granular per-endpoint ledger.
-- Refs:
--   docs/01_DECISIONES_ARQUITECTONICAS/ADR-019_STR_MODULE_COMPLETE.md §2.6 ($500/mo cap)
--   shared/lib/ingest/str/airroi-pricing.ts (endpoint table con costos validados)
--
-- El cost-tracker genérico (shared/lib/ingest/cost-tracker.ts) maneja el cap
-- monthly agregado vía api_budgets.airroi. Este ledger añade granularidad
-- por endpoint para dashboards, detección de hotspots y reconciliación con
-- el Developer Dashboard de AirROI cuando exponga actual_cost_usd.

insert into public.api_budgets (source, monthly_budget_usd, alert_threshold_pct, hard_limit_pct, meta)
values (
  'airroi',
  500.00,
  80,
  100,
  jsonb_build_object(
    'authority_ref', 'ADR-019 §2.6',
    'provider', 'AirROI',
    'billing_model', 'pay_as_you_go',
    'documented_per_call_usd', 0.10
  )
)
on conflict (source) do update set
  monthly_budget_usd = excluded.monthly_budget_usd,
  meta = public.api_budgets.meta || excluded.meta;

create table public.airroi_spend_ledger (
  id bigint generated always as identity primary key,
  endpoint_key text not null,
  endpoint_path text not null,
  method text not null check (method in ('GET', 'POST', 'MCP')),
  estimated_cost_usd numeric(10, 4) not null,
  actual_cost_usd numeric(10, 4),
  airroi_request_id text,
  http_status smallint,
  run_id uuid,
  country_code char(2),
  market_ref text,
  duration_ms integer,
  ok boolean not null default true,
  error text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_airroi_ledger_endpoint_day
  on public.airroi_spend_ledger (endpoint_key, created_at desc);
create index idx_airroi_ledger_run on public.airroi_spend_ledger (run_id) where run_id is not null;
create index idx_airroi_ledger_created_brin
  on public.airroi_spend_ledger using brin (created_at);

alter table public.airroi_spend_ledger enable row level security;

create policy airroi_ledger_select_admin on public.airroi_spend_ledger
  for select to authenticated
  using (public.is_superadmin() or public.get_user_role() in ('mb_admin'));

comment on table public.airroi_spend_ledger is
  'Ledger granular per-call a endpoints AirROI (REST + MCP). Soporta dashboards '
  'por endpoint, análisis de hotspots y reconciliación con Developer Dashboard. '
  'INSERT desde service role via orchestrator, SELECT mb_admin+.';
comment on column public.airroi_spend_ledger.endpoint_key is
  'AirroiEndpointKey (ver shared/lib/ingest/str/airroi-pricing.ts).';
comment on column public.airroi_spend_ledger.estimated_cost_usd is
  'Costo pre-call según pricing table. Se refina a actual_cost_usd cuando el '
  'Developer Dashboard lo expone (reconciliación nocturna).';

create or replace function public.monthly_airroi_spend_by_endpoint(p_month date default date_trunc('month', now())::date)
returns table (
  endpoint_key text,
  calls bigint,
  estimated_cost_usd numeric,
  actual_cost_usd numeric
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    endpoint_key,
    count(*)::bigint as calls,
    sum(estimated_cost_usd)::numeric as estimated_cost_usd,
    sum(coalesce(actual_cost_usd, estimated_cost_usd))::numeric as actual_cost_usd
  from public.airroi_spend_ledger
  where created_at >= p_month
    and created_at < (p_month + interval '1 month')
  group by endpoint_key
  order by actual_cost_usd desc;
$$;

comment on function public.monthly_airroi_spend_by_endpoint(date) is
  'Aggregación mensual de spend AirROI por endpoint_key — feed al admin dashboard.';
