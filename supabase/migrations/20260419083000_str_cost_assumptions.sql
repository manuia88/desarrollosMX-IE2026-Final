-- FASE 07b / BLOQUE 7b.B / MÓDULO 7b.B.1 — Costos operativos STR por tier.
-- Alimenta el calculator str-viability (cap_rate + breakeven) con inputs
-- regionales estandarizados. Founder refina valores tras primera ingesta real.

create table public.str_cost_assumptions (
  country_code char(2) not null references public.countries(code),
  zone_tier text not null check (zone_tier in ('cdmx_premium', 'cdmx_standard', 'playa', 'regional')),
  cleaning_pct numeric(5, 4) not null check (cleaning_pct between 0 and 1),
  platform_fee_pct numeric(5, 4) not null check (platform_fee_pct between 0 and 1),
  property_mgmt_pct numeric(5, 4) not null check (property_mgmt_pct between 0 and 1),
  utilities_monthly_minor bigint not null,
  property_tax_annual_pct numeric(5, 4) not null check (property_tax_annual_pct between 0 and 1),
  vacancy_buffer_pct numeric(5, 4) not null check (vacancy_buffer_pct between 0 and 1),
  currency char(3) not null references public.currencies(code),
  notes text,
  last_reviewed_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb,
  primary key (country_code, zone_tier)
);

alter table public.str_cost_assumptions enable row level security;

create policy str_cost_select_public on public.str_cost_assumptions
  for select to authenticated, anon
  using (true);

create policy str_cost_write_admin on public.str_cost_assumptions
  for all to authenticated
  using (public.is_superadmin() or public.get_user_role() = 'mb_admin')
  with check (public.is_superadmin() or public.get_user_role() = 'mb_admin');

comment on table public.str_cost_assumptions is
  'Supuestos de costos operativos STR por tier regional. Founder refresca '
  'trimestralmente (cron breakeven_refresh_params — FASE 07b.L). Feeds calculator '
  'str-viability + breakeven.';

insert into public.str_cost_assumptions
  (country_code, zone_tier, cleaning_pct, platform_fee_pct, property_mgmt_pct,
   utilities_monthly_minor, property_tax_annual_pct, vacancy_buffer_pct, currency, notes)
values
  ('MX', 'cdmx_premium', 0.12, 0.15, 0.20, 350000, 0.003, 0.08, 'MXN',
    'CDMX alcaldías Miguel Hidalgo, Cuauhtémoc centro/Roma/Condesa, Benito Juárez premium.'),
  ('MX', 'cdmx_standard', 0.10, 0.15, 0.18, 250000, 0.0025, 0.12, 'MXN',
    'CDMX zonas estándar: Álvaro Obregón, Coyoacán, Iztacalco, Iztapalapa.'),
  ('MX', 'playa', 0.15, 0.15, 0.25, 450000, 0.002, 0.15, 'MXN',
    'Tulum, Playa del Carmen, Cancún, Puerto Vallarta, Los Cabos — operación más intensiva.'),
  ('MX', 'regional', 0.10, 0.15, 0.20, 200000, 0.003, 0.18, 'MXN',
    'Guadalajara, Monterrey, Mérida, Querétaro — mercado más estacional y local.');
