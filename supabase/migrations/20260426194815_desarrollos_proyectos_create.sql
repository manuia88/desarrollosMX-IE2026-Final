-- F2.13.C-datasource — proyectos table (M02 Desarrollos canonical schema)
-- Asesor SELECT policy se agrega en migration project_brokers_create (forward dependency).

create type public.proyecto_status as enum ('preventa', 'construccion', 'terminado', 'entregado');
create type public.proyecto_privacy as enum ('public', 'broker_only', 'assigned_only');
create type public.proyecto_operacion as enum ('venta', 'renta');
create type public.proyecto_tipo as enum ('departamento', 'casa', 'townhouse', 'loft', 'penthouse', 'oficina', 'local', 'terreno');

create table public.proyectos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null,
  desarrolladora_id uuid not null references public.desarrolladoras(id) on delete restrict,
  zone_id uuid references public.zones(id) on delete set null,
  country_code char(2) not null default 'MX',
  ciudad text,
  colonia text,
  direccion text,
  lat numeric(10, 7),
  lng numeric(10, 7),
  status public.proyecto_status not null default 'preventa',
  tipo public.proyecto_tipo not null default 'departamento',
  operacion public.proyecto_operacion not null default 'venta',
  units_total integer check (units_total is null or units_total >= 0),
  units_available integer check (units_available is null or units_available >= 0),
  price_min_mxn numeric(14, 2) check (price_min_mxn is null or price_min_mxn > 0),
  price_max_mxn numeric(14, 2) check (price_max_mxn is null or price_max_mxn > 0),
  currency char(3) not null default 'MXN',
  bedrooms_range integer[] check (bedrooms_range is null or array_length(bedrooms_range, 1) <= 2),
  amenities jsonb not null default '[]'::jsonb,
  description text,
  cover_photo_url text,
  brochure_url text,
  privacy_level public.proyecto_privacy not null default 'broker_only',
  is_active boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proyectos_slug_unique unique (slug),
  constraint proyectos_price_range_valid check (
    price_min_mxn is null
    or price_max_mxn is null
    or price_min_mxn <= price_max_mxn
  )
);

create index proyectos_desarrolladora_idx on public.proyectos (desarrolladora_id) where is_active;
create index proyectos_zone_idx on public.proyectos (zone_id) where is_active;
create index proyectos_status_idx on public.proyectos (status) where is_active;
create index proyectos_country_idx on public.proyectos (country_code) where is_active;
create index proyectos_price_idx on public.proyectos (price_min_mxn, price_max_mxn) where is_active;

comment on table public.proyectos is 'M02 Desarrollos: catalogo de proyectos inmobiliarios. RLS por rol via JOIN project_brokers + desarrolladora_id.';
comment on column public.proyectos.privacy_level is 'public=visible all asesores | broker_only=via project_brokers | assigned_only=lead_broker scope.';
comment on column public.proyectos.amenities is 'Array JSON canonico amenities: ["alberca","gym","seguridad",...]. Validate via Zod en routes.';

create trigger proyectos_set_updated_at
  before update on public.proyectos
  for each row
  execute function public.set_updated_at();

alter table public.proyectos enable row level security;

create policy proyectos_superadmin_all on public.proyectos
  for all
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy proyectos_developer_select on public.proyectos
  for select
  to authenticated
  using (
    public.rls_is_developer()
    and desarrolladora_id = (
      select desarrolladora_id from public.profiles where id = auth.uid()
    )
  );

create policy proyectos_developer_update on public.proyectos
  for update
  to authenticated
  using (
    public.rls_is_developer()
    and desarrolladora_id = (
      select desarrolladora_id from public.profiles where id = auth.uid()
    )
  )
  with check (
    public.rls_is_developer()
    and desarrolladora_id = (
      select desarrolladora_id from public.profiles where id = auth.uid()
    )
  );

create policy proyectos_developer_insert on public.proyectos
  for insert
  to authenticated
  with check (
    public.rls_is_developer()
    and desarrolladora_id = (
      select desarrolladora_id from public.profiles where id = auth.uid()
    )
  );

create policy proyectos_master_broker_select on public.proyectos
  for select
  to authenticated
  using (
    public.rls_is_master_broker()
    and is_active
  );

create policy proyectos_asesor_public on public.proyectos
  for select
  to authenticated
  using (
    public.rls_is_asesor()
    and is_active
    and privacy_level = 'public'
  );

grant select on public.proyectos to authenticated;
grant insert, update on public.proyectos to authenticated;
