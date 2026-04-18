-- profiles (espejo de auth.users) + enum user_role
-- FASE 01 / MÓDULO 1.C.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_01_BD_FUNDACION.md §1.C.1

-- ============================================================
-- Enum user_role (8 roles definidos por el plan)
-- ============================================================
create type public.user_role as enum (
  'superadmin',
  'admin_desarrolladora',
  'asesor',
  'broker_manager',
  'mb_admin',
  'mb_coordinator',
  'comprador',
  'vendedor_publico'
);

-- ============================================================
-- Tabla profiles
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  country_code char(2) not null references public.countries(code),
  email text not null,
  first_name text not null,
  last_name text not null,
  full_name text generated always as (first_name || ' ' || last_name) stored,
  phone text,
  rol public.user_role not null default 'comprador',
  avatar_url text,
  preferred_locale text references public.locales(code),
  preferred_timezone text not null default 'America/Mexico_City',
  preferred_currency char(3) references public.currencies(code),
  rfc text,
  tax_id text,
  razon_social text,
  regimen_fiscal text,
  docs_verificacion_urls jsonb,
  is_active boolean not null default true,
  is_approved boolean not null default false,
  desarrolladora_id uuid,
  agency_id uuid,
  broker_company_id uuid,
  slug text unique,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_country_rol on public.profiles (country_code, rol) where is_active;
create index idx_profiles_email on public.profiles (lower(email));
create index idx_profiles_slug on public.profiles (slug) where slug is not null;

-- ============================================================
-- Triggers
-- ============================================================
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Handler on auth.users INSERT: crea profile inicial con defaults.
-- Los campos first_name/last_name/country_code se leen de raw_user_meta_data
-- con fallbacks; FASE 02 refinará la lógica del signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, country_code, preferred_locale)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'country_code', 'MX'),
    coalesce(new.raw_user_meta_data->>'preferred_locale', 'es-MX')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Clona auth.users.email + id al crear profile. FASE 02 agrega lógica completa de signup.';

create trigger trg_profiles_on_insert
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS (policies mínimas: owner SELECT/INSERT; FASE 02 completa el set)
-- ============================================================
alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid());
