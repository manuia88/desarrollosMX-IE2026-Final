-- F2.13.C-datasource — exclusividad_acuerdos (X-Y-Z agreements asesor↔proyecto↔brokerage)

create type public.exclusividad_scope as enum ('full', 'category', 'territory');

create table public.exclusividad_acuerdos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  brokerage_id uuid,
  asesor_id uuid references auth.users(id) on delete set null,
  meses_exclusividad smallint not null check (meses_exclusividad >= 0),
  meses_contrato smallint not null check (meses_contrato >= 0),
  comision_pct numeric(5, 2) not null check (comision_pct >= 0 and comision_pct <= 100),
  start_date date not null,
  end_date date,
  scope public.exclusividad_scope not null default 'full',
  signed_url text,
  active boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exclusividad_acuerdos_dates_valid check (
    end_date is null or end_date >= start_date
  )
);

create index exclusividad_acuerdos_proyecto_idx on public.exclusividad_acuerdos (proyecto_id) where active;
create index exclusividad_acuerdos_brokerage_idx on public.exclusividad_acuerdos (brokerage_id) where active;
create index exclusividad_acuerdos_asesor_idx on public.exclusividad_acuerdos (asesor_id) where active;
create index exclusividad_acuerdos_dates_idx on public.exclusividad_acuerdos (start_date, end_date) where active;

comment on table public.exclusividad_acuerdos is 'Acuerdos exclusividad X-Y-Z (meses_exclusividad - meses_contrato - comision_pct). Visibility: developer scope + asesor own + master_broker scope.';

create trigger exclusividad_acuerdos_set_updated_at
  before update on public.exclusividad_acuerdos
  for each row
  execute function public.set_updated_at();

alter table public.exclusividad_acuerdos enable row level security;

create policy exclusividad_superadmin_all on public.exclusividad_acuerdos
  for all
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy exclusividad_developer_select on public.exclusividad_acuerdos
  for select
  to authenticated
  using (
    public.rls_is_developer()
    and proyecto_id in (
      select id from public.proyectos
      where desarrolladora_id = (
        select desarrolladora_id from public.profiles where id = auth.uid()
      )
    )
  );

create policy exclusividad_developer_modify on public.exclusividad_acuerdos
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

create policy exclusividad_developer_update on public.exclusividad_acuerdos
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

create policy exclusividad_asesor_own on public.exclusividad_acuerdos
  for select
  to authenticated
  using (
    public.rls_is_asesor()
    and (
      asesor_id = auth.uid()
      or proyecto_id in (
        select proyecto_id from public.project_brokers
        where broker_user_id = auth.uid() and active
      )
    )
  );

create policy exclusividad_master_broker_select on public.exclusividad_acuerdos
  for select
  to authenticated
  using (public.rls_is_master_broker());

grant select on public.exclusividad_acuerdos to authenticated;
grant insert, update on public.exclusividad_acuerdos to authenticated;
