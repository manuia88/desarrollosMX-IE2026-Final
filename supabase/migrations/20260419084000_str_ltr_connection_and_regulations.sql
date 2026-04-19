-- FASE 07b / BLOQUE 7b.C — LTR-STR Connection view + regulations seed.

create table public.str_zone_regulations (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries(code),
  zone_id uuid,
  market_id uuid references public.str_markets(id) on delete cascade,
  restriction_type text not null check (restriction_type in (
    'permit_required', 'max_nights_per_year', 'tax_lodging', 'ban', 'registration_required', 'hoa_restriction'
  )),
  source_url text not null,
  effective_date date,
  notes text,
  captured_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

create index idx_str_zone_regs_zone on public.str_zone_regulations (zone_id) where zone_id is not null;
create index idx_str_zone_regs_market on public.str_zone_regulations (market_id) where market_id is not null;
create index idx_str_zone_regs_country_type on public.str_zone_regulations (country_code, restriction_type);

alter table public.str_zone_regulations enable row level security;

create policy str_zone_regs_select_public on public.str_zone_regulations
  for select to authenticated, anon
  using (true);

create policy str_zone_regs_write_admin on public.str_zone_regulations
  for all to authenticated
  using (public.is_superadmin() or public.get_user_role() = 'mb_admin')
  with check (public.is_superadmin() or public.get_user_role() = 'mb_admin');

comment on table public.str_zone_regulations is
  'Regulaciones STR por zona/market. Input regulatorio para reports B2B (7b.N), '
  'scoring opportunity (7b.C), y warnings UI.';

insert into public.str_zone_regulations (country_code, restriction_type, source_url, effective_date, notes)
values (
  'MX',
  'registration_required',
  'https://www.cdmx.gob.mx/normatividad/alojamiento-temporal',
  null,
  'CDMX reglamento alojamiento temporal 2026+ — registro obligatorio, límite 180 noches/año previsto.'
);

create or replace view public.v_ltr_str_connection as
with str_agg as (
  select
    m.zone_id,
    m.country_code,
    mma.currency as str_currency,
    percentile_cont(0.5) within group (order by mma.revenue_minor)
      filter (where mma.revenue_minor is not null) as str_monthly_revenue_median_minor,
    count(mma.*) as str_sample_months
  from public.str_markets m
  join public.str_market_monthly_aggregates mma on mma.market_id = m.id
  where m.zone_id is not null
    and mma.period >= (now() - interval '12 months')::date
  group by m.zone_id, m.country_code, mma.currency
),
ltr_agg as (
  select
    zone_id,
    country_code,
    currency as ltr_currency,
    percentile_cont(0.5) within group (order by price_minor)
      filter (where price_minor is not null) as ltr_monthly_rent_median_minor,
    count(*) as ltr_sample_listings
  from public.market_prices_secondary
  where operation = 'renta'
    and posted_at >= (now() - interval '12 months')::date
    and zone_id is not null
  group by zone_id, country_code, currency
)
select
  coalesce(s.zone_id, l.zone_id) as zone_id,
  coalesce(s.country_code, l.country_code) as country_code,
  coalesce(s.str_currency, l.ltr_currency) as currency,
  l.ltr_monthly_rent_median_minor,
  l.ltr_sample_listings,
  s.str_monthly_revenue_median_minor,
  s.str_sample_months,
  case
    when l.ltr_monthly_rent_median_minor > 0 and s.str_monthly_revenue_median_minor > 0
      then (s.str_monthly_revenue_median_minor::numeric / l.ltr_monthly_rent_median_minor)
    else null
  end as str_ltr_ratio,
  case
    when l.ltr_monthly_rent_median_minor is null or s.str_monthly_revenue_median_minor is null then 'unknown'
    when s.str_monthly_revenue_median_minor::numeric / l.ltr_monthly_rent_median_minor >= 2.0 then 'str_strongly_outperforms'
    when s.str_monthly_revenue_median_minor::numeric / l.ltr_monthly_rent_median_minor >= 1.3 then 'str_outperforms'
    when s.str_monthly_revenue_median_minor::numeric / l.ltr_monthly_rent_median_minor >= 0.8 then 'parity'
    else 'ltr_outperforms'
  end as regime
from str_agg s
full outer join ltr_agg l on l.zone_id = s.zone_id and l.country_code = s.country_code;

comment on view public.v_ltr_str_connection is
  'LTR vs STR medianas por zona (últimos 12 meses). Inputs: market_prices_secondary renta + '
  'str_market_monthly_aggregates. Expone ratio + regime para UI asesor y scoring opportunity.';
