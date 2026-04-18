-- Schemas core multi-country: countries, currencies, locales
-- FASE 01 / MÓDULO 1.B.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_01_BD_FUNDACION.md §1.B.1
-- ADR-003 Multi-country desde día 1

-- ============================================================
-- currencies (ISO 4217)
-- ============================================================
create table public.currencies (
  code char(3) primary key,
  name_en text not null,
  name_es text not null,
  symbol text not null,
  decimals smallint not null default 2,
  is_crypto boolean not null default false,
  is_active boolean not null default true
);

alter table public.currencies enable row level security;

create policy currencies_select_public on public.currencies
  for select to authenticated, anon
  using (is_active = true);

-- ============================================================
-- countries (ISO 3166-1 alpha-2)
-- ============================================================
create table public.countries (
  code char(2) primary key,
  name_en text not null,
  name_es text not null,
  name_pt text,
  default_currency char(3) not null
    references public.currencies(code) deferrable initially deferred,
  default_locale text not null,
  default_timezone text not null,
  phone_prefix text not null,
  address_format jsonb not null default '{}'::jsonb,
  fiscal_regime_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.countries enable row level security;

create policy countries_select_public on public.countries
  for select to authenticated, anon
  using (is_active = true);

-- ============================================================
-- locales (BCP 47 subset: language[-script]-region)
-- ============================================================
create table public.locales (
  code text primary key,
  country_code char(2) not null references public.countries(code),
  language text not null,
  script text,
  name_native text not null,
  is_rtl boolean not null default false,
  is_active boolean not null default true
);

alter table public.locales enable row level security;

create policy locales_select_public on public.locales
  for select to authenticated, anon
  using (is_active = true);
