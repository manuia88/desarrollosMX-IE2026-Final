-- FX rates cache (base/quote pairs) — fed by cron fx_snapshot (10 min)
-- FASE 05 / MÓDULO 5.D.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_05_I18N_Y_MULTICOUNTRY.md §5.D.1
-- ADR-003 Multi-country desde día 1

create table public.fx_rates (
  base char(3) not null references public.currencies(code),
  quote char(3) not null references public.currencies(code),
  rate numeric(18, 8) not null check (rate > 0),
  source text not null default 'openexchangerates',
  fetched_at timestamptz not null default now(),
  primary key (base, quote, fetched_at)
);

create index idx_fx_pair_recent on public.fx_rates (base, quote, fetched_at desc);

alter table public.fx_rates enable row level security;

create policy fx_rates_select_authenticated on public.fx_rates
  for select to authenticated
  using (true);

comment on table public.fx_rates is
  'FX snapshots — cron fx_snapshot inserta cada 10 min desde OpenExchangeRates. Convertir lee el último fetched_at por par.';
