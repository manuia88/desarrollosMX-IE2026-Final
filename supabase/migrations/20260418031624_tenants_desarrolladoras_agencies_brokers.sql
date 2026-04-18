-- Tenants B2B: desarrolladoras, agencies, broker_companies + FKs a profiles
-- FASE 01 / MÓDULO 1.C.2
-- Ref: docs/02_PLAN_MAESTRO/FASE_01_BD_FUNDACION.md §1.C.2

-- ============================================================
-- desarrolladoras
-- ============================================================
create table public.desarrolladoras (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries(code),
  name text not null,
  legal_name text not null,
  tax_id text not null,
  tax_id_encrypted bytea,
  contact_email text,
  contact_phone text,
  website text,
  logo_url text,
  slug text unique,
  is_verified boolean not null default false,
  is_active boolean not null default true,
  verification_docs_urls jsonb,
  holding_parent_id uuid references public.desarrolladoras(id),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_desarrolladoras_country_active on public.desarrolladoras (country_code, is_active);
create index idx_desarrolladoras_tax_id on public.desarrolladoras (country_code, tax_id);

create trigger trg_desarrolladoras_updated_at
  before update on public.desarrolladoras
  for each row execute function public.set_updated_at();

alter table public.desarrolladoras enable row level security;

-- Policy mínima (FASE 02 agrega superadmin + admin_desarrolladora + VIEW pública sin PII):
-- un profile solo ve su desarrolladora (la que tiene en profiles.desarrolladora_id).
create policy desarrolladoras_select_own_tenant on public.desarrolladoras
  for select to authenticated
  using (id = (select desarrolladora_id from public.profiles where id = auth.uid()));

-- ============================================================
-- agencies
-- ============================================================
create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries(code),
  name text not null,
  legal_name text,
  tax_id text,
  contact_email text,
  contact_phone text,
  logo_url text,
  slug text unique,
  is_verified boolean not null default false,
  is_active boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_agencies_country_active on public.agencies (country_code, is_active);

create trigger trg_agencies_updated_at
  before update on public.agencies
  for each row execute function public.set_updated_at();

alter table public.agencies enable row level security;

create policy agencies_select_own_tenant on public.agencies
  for select to authenticated
  using (id = (select agency_id from public.profiles where id = auth.uid()));

-- ============================================================
-- broker_companies
-- ============================================================
create table public.broker_companies (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries(code),
  name text not null,
  legal_name text,
  tax_id text,
  contact_email text,
  contact_phone text,
  logo_url text,
  slug text unique,
  is_authorized_broker boolean not null default false,
  is_active boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_broker_country_authorized on public.broker_companies (country_code, is_authorized_broker);

create trigger trg_broker_companies_updated_at
  before update on public.broker_companies
  for each row execute function public.set_updated_at();

alter table public.broker_companies enable row level security;

create policy broker_companies_select_own_tenant on public.broker_companies
  for select to authenticated
  using (id = (select broker_company_id from public.profiles where id = auth.uid()));

-- ============================================================
-- FKs en profiles (quedaron declaradas sin FK en 1.C.1)
-- ============================================================
alter table public.profiles
  add constraint fk_profiles_desarrolladora
    foreign key (desarrolladora_id) references public.desarrolladoras(id) on delete set null,
  add constraint fk_profiles_agency
    foreign key (agency_id) references public.agencies(id) on delete set null,
  add constraint fk_profiles_broker
    foreign key (broker_company_id) references public.broker_companies(id) on delete set null;
