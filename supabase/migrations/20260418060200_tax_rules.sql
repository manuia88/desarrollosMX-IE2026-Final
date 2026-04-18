-- Tax rules override per country/developer/item
-- FASE 05 / MÓDULO 5.G.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_05_I18N_Y_MULTICOUNTRY.md §5.G.1

create table public.tax_rules (
  id uuid primary key default uuid_generate_v4(),
  country_code char(2) not null references public.countries(code),
  scope text not null check (scope in ('global','desarrolladora','item')),
  scope_id uuid,
  tax_type text not null check (tax_type in ('vat','iibb','iss','icms','retencion','sales_tax','pis','cofins','ica')),
  rate numeric(6, 4) not null check (rate >= 0 and rate <= 1),
  applies_from timestamptz not null default now(),
  applies_to timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_tax_rules_country_scope
  on public.tax_rules (country_code, scope, scope_id, tax_type);

create index idx_tax_rules_validity
  on public.tax_rules (applies_from, applies_to);

alter table public.tax_rules enable row level security;

create policy tax_rules_select_authenticated on public.tax_rules
  for select to authenticated
  using (true);

create policy tax_rules_admin_all on public.tax_rules
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

comment on table public.tax_rules is
  'Overrides de impuestos por pais/desarrolladora/item. calculateTax() consulta primero tax_rules, luego TAX_CONFIG default.';
