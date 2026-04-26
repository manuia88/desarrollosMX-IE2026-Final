-- F2.13.C-datasource — project_brokers (asesor↔proyecto assignments)
-- Forward-add asesor SELECT policy on proyectos referencing project_brokers.

create type public.project_broker_role as enum ('lead_broker', 'associate', 'coordinator');

create table public.project_brokers (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  broker_user_id uuid not null references auth.users(id) on delete cascade,
  role public.project_broker_role not null default 'associate',
  commission_pct numeric(5, 2) check (commission_pct is null or (commission_pct >= 0 and commission_pct <= 100)),
  meses_exclusividad smallint check (meses_exclusividad is null or meses_exclusividad >= 0),
  meses_contrato smallint check (meses_contrato is null or meses_contrato >= 0),
  assigned_at timestamptz not null default now(),
  expires_at timestamptz,
  active boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_brokers_unique_assignment unique (proyecto_id, broker_user_id)
);

create index project_brokers_proyecto_idx on public.project_brokers (proyecto_id) where active;
create index project_brokers_broker_idx on public.project_brokers (broker_user_id) where active;
create index project_brokers_role_idx on public.project_brokers (role) where active;

comment on table public.project_brokers is 'Asignaciones asesor↔proyecto con role + commission_pct + ventana exclusividad. RLS asesor SELECT own + admin_desarrolladora full scope.';

create trigger project_brokers_set_updated_at
  before update on public.project_brokers
  for each row
  execute function public.set_updated_at();

alter table public.project_brokers enable row level security;

create policy project_brokers_superadmin_all on public.project_brokers
  for all
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy project_brokers_asesor_own on public.project_brokers
  for select
  to authenticated
  using (
    public.rls_is_asesor()
    and broker_user_id = auth.uid()
  );

create policy project_brokers_developer_scope on public.project_brokers
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

create policy project_brokers_developer_modify on public.project_brokers
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

create policy project_brokers_developer_update on public.project_brokers
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

create policy project_brokers_master_broker_select on public.project_brokers
  for select
  to authenticated
  using (public.rls_is_master_broker());

grant select on public.project_brokers to authenticated;
grant insert, update on public.project_brokers to authenticated;

-- Forward-extend proyectos RLS now that project_brokers exists
create policy proyectos_asesor_assigned on public.proyectos
  for select
  to authenticated
  using (
    public.rls_is_asesor()
    and is_active
    and id in (
      select proyecto_id from public.project_brokers
      where broker_user_id = auth.uid() and active
    )
  );
