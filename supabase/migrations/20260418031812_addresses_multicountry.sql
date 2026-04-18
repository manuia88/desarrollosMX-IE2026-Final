-- addresses multi-country flex con PostGIS + validación postal_code
-- FASE 01 / MÓDULO 1.C.3
-- Ref: docs/02_PLAN_MAESTRO/FASE_01_BD_FUNDACION.md §1.C.3

-- ============================================================
-- Validador de postal_code por country
-- ============================================================
create or replace function public.validate_postal_code(
  p_country_code char(2),
  p_postal_code text
) returns boolean
language plpgsql
immutable
as $$
begin
  if p_postal_code is null then
    return false;
  end if;
  return case p_country_code
    when 'MX' then p_postal_code ~ '^\d{5}$'
    when 'CO' then p_postal_code ~ '^\d{6}$'
    when 'AR' then p_postal_code ~ '^([A-Z]\d{4}[A-Z]{3}|\d{4})$'
    when 'BR' then p_postal_code ~ '^\d{5}-?\d{3}$'
    when 'CL' then p_postal_code ~ '^\d{7}$'
    when 'US' then p_postal_code ~ '^\d{5}(-\d{4})?$'
    else false
  end;
end;
$$;

comment on function public.validate_postal_code(char, text) is
  'Valida postal_code con regex per country. Usada en CHECK constraint de addresses y en formularios (espejo Zod).';

-- ============================================================
-- Tabla addresses
-- ============================================================
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries(code),
  owner_type text not null check (owner_type in ('profile','desarrolladora','project','unit','other')),
  owner_id uuid not null,
  label text,
  line1 text not null,
  line2 text,
  neighborhood text,
  municipality text,
  state text not null,
  postal_code text not null,
  country_sub_divisions jsonb not null default '{}'::jsonb,
  lat double precision,
  lng double precision,
  geom geometry(Point, 4326) generated always as (
    case when lat is not null and lng is not null
      then st_setsrid(st_makepoint(lng, lat), 4326)
    end
  ) stored,
  is_primary boolean not null default false,
  is_fiscal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_addresses_postal_code check (public.validate_postal_code(country_code, postal_code))
);

create index idx_addresses_country_owner on public.addresses (country_code, owner_type, owner_id);
create index idx_addresses_postal on public.addresses (country_code, postal_code);
create index idx_addresses_geom on public.addresses using gist (geom);

create trigger trg_addresses_updated_at
  before update on public.addresses
  for each row execute function public.set_updated_at();

alter table public.addresses enable row level security;

-- Policy stub (FASE 02 extiende a otros owner_types y superadmin):
-- un profile ve sólo sus direcciones personales.
create policy addresses_select_own_profile on public.addresses
  for select to authenticated
  using (owner_type = 'profile' and owner_id = auth.uid());
