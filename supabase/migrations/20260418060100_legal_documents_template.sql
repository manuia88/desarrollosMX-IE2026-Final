-- Legal document templates per country + locale
-- FASE 05 / MÓDULO 5.E.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_05_I18N_Y_MULTICOUNTRY.md §5.E.1

create table public.legal_documents_template (
  id uuid primary key default uuid_generate_v4(),
  country_code char(2) not null references public.countries(code),
  code text not null,
  name text not null,
  version text not null,
  body_md text not null,
  required_fields jsonb not null default '[]'::jsonb,
  locale text not null references public.locales(code),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index idx_ldt_country_code_version
  on public.legal_documents_template (country_code, code, version, locale);

create index idx_ldt_country_active
  on public.legal_documents_template (country_code, is_active);

alter table public.legal_documents_template enable row level security;

create policy ldt_select_authenticated on public.legal_documents_template
  for select to authenticated
  using (is_active = true);

create policy ldt_admin_all on public.legal_documents_template
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

comment on table public.legal_documents_template is
  'Templates de documentos legales por pais + locale. Placeholders markdown {{variable}} llenados por feature legal.';
