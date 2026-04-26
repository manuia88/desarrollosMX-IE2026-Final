-- F2.13.C-datasource — unidades (proyecto.units inventory)
-- RLS heredado proyecto_id (cascade pattern: visible si caller puede ver proyecto)

create type public.unidad_status as enum ('disponible', 'apartada', 'vendida', 'reservada', 'bloqueada');
create type public.unidad_tipo as enum ('departamento', 'casa', 'townhouse', 'loft', 'penthouse', 'estudio');

create table public.unidades (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  numero text not null,
  tipo public.unidad_tipo not null default 'departamento',
  recamaras smallint check (recamaras is null or (recamaras >= 0 and recamaras <= 20)),
  banos numeric(3, 1) check (banos is null or (banos >= 0 and banos <= 10)),
  parking smallint check (parking is null or (parking >= 0 and parking <= 20)),
  area_m2 numeric(7, 2) check (area_m2 is null or area_m2 > 0),
  area_terreno_m2 numeric(7, 2) check (area_terreno_m2 is null or area_terreno_m2 > 0),
  price_mxn numeric(14, 2) check (price_mxn is null or price_mxn > 0),
  maintenance_fee_mxn numeric(10, 2) check (maintenance_fee_mxn is null or maintenance_fee_mxn >= 0),
  status public.unidad_status not null default 'disponible',
  floor smallint,
  floor_plan_url text,
  photos text[] not null default '{}',
  features jsonb not null default '{}'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unidades_unique_numero unique (proyecto_id, numero)
);

create index unidades_proyecto_idx on public.unidades (proyecto_id);
create index unidades_status_idx on public.unidades (proyecto_id, status);
create index unidades_price_idx on public.unidades (price_mxn);
create index unidades_area_idx on public.unidades (area_m2);
create index unidades_recamaras_idx on public.unidades (recamaras);

comment on table public.unidades is 'Unidades dentro de un proyecto. RLS hereda visibilidad de proyectos (parent JOIN).';

create trigger unidades_set_updated_at
  before update on public.unidades
  for each row
  execute function public.set_updated_at();

alter table public.unidades enable row level security;

create policy unidades_superadmin_all on public.unidades
  for all
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy unidades_select_via_proyecto on public.unidades
  for select
  to authenticated
  using (
    proyecto_id in (
      select id from public.proyectos
    )
  );

create policy unidades_developer_modify on public.unidades
  for insert
  to authenticated
  with check (
    public.rls_is_developer()
    and proyecto_id in (
      select id from public.proyectos
      where desarrolladora_id = (
        select desarrolladora_id from public.profiles where id = auth.uid()
      )
    )
  );

create policy unidades_developer_update on public.unidades
  for update
  to authenticated
  using (
    public.rls_is_developer()
    and proyecto_id in (
      select id from public.proyectos
      where desarrolladora_id = (
        select desarrolladora_id from public.profiles where id = auth.uid()
      )
    )
  )
  with check (
    public.rls_is_developer()
  );

grant select on public.unidades to authenticated;
grant insert, update on public.unidades to authenticated;
