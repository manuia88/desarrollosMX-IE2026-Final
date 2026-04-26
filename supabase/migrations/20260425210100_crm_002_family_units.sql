-- FASE 07.7.A.4 — CRM Foundation: family_units + family_unit_members
-- Unidad presupuestal multi-buyer (couple/family/partnership/single)
-- NOTA: family_units.primary_buyer_twin_id FK pendiente — se agrega ALTER post crm_004_buyer_twins.
-- Día 1: columna sin FK formal hasta buyer_twins exista.

create table public.family_units (
  id uuid primary key default gen_random_uuid(),
  primary_buyer_twin_id uuid not null,
  unit_type text not null
    check (unit_type in ('couple', 'family', 'partnership', 'single')),
  members_count smallint not null default 1
    check (members_count >= 1),
  combined_budget_min numeric(14,2),
  combined_budget_max numeric(14,2),
  combined_budget_currency char(3) references public.currencies(code),
  country_code char(2) not null references public.countries(code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_units_budget_valid check (
    combined_budget_min is null or combined_budget_max is null or combined_budget_max >= combined_budget_min
  ),
  constraint family_units_budget_currency_required check (
    (combined_budget_min is null and combined_budget_max is null) or combined_budget_currency is not null
  ),
  constraint family_units_country_supported check (
    country_code in ('MX','CO','AR','BR','US')
  ),
  constraint family_units_currency_supported check (
    combined_budget_currency is null or combined_budget_currency in ('MXN','COP','ARS','BRL','USD')
  )
);

create index idx_family_units_primary on public.family_units (primary_buyer_twin_id);
create index idx_family_units_country on public.family_units (country_code);
create index idx_family_units_unit_type on public.family_units (unit_type);

create trigger trg_family_units_updated_at
  before update on public.family_units
  for each row execute function public.set_updated_at();

alter table public.family_units enable row level security;
-- RLS policies se definen en migration crm_009 (después de buyer_twins exista para subqueries).

comment on table public.family_units is
  'Unidad presupuestal multi-buyer (couple/family/partnership/single). primary_buyer_twin_id FK formal post crm_004_buyer_twins. RLS policies en crm_009.';

-- ============================================================
-- family_unit_members — link M:N family ↔ buyer_twins
-- ============================================================
create table public.family_unit_members (
  id uuid primary key default gen_random_uuid(),
  family_unit_id uuid not null references public.family_units(id) on delete cascade,
  buyer_twin_id uuid not null,
  relationship text not null
    check (relationship in ('spouse', 'child', 'parent', 'sibling', 'partner', 'other')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint family_unit_members_unique unique (family_unit_id, buyer_twin_id)
);

create index idx_family_unit_members_twin on public.family_unit_members (buyer_twin_id);
create index idx_family_unit_members_unit on public.family_unit_members (family_unit_id);
create unique index idx_family_unit_members_one_primary
  on public.family_unit_members (family_unit_id) where is_primary = true;

alter table public.family_unit_members enable row level security;

comment on table public.family_unit_members is
  'Link M:N family_units ↔ buyer_twins. Partial unique idx garantiza máximo 1 is_primary=true por unit.';
