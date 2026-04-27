-- F2.14.B M07 — Create operacion_parts (comprador/vendedor/asesores/propietario por operación)
-- Una fila por rol único en la operación (UNIQUE operacion_id+role).
-- contacto_id apunta a leads (M03 contactos pendiente — leads como interim canonical contact).

create table if not exists public.operacion_parts (
  id uuid primary key default gen_random_uuid(),
  operacion_id uuid not null references public.operaciones(id) on delete cascade,
  role text not null check (role in (
    'comprador',
    'vendedor',
    'asesor_comprador',
    'asesor_vendedor',
    'asesor_productor',
    'propietario'
  )),
  asesor_id uuid references public.profiles(id) on delete set null,
  contacto_id uuid references public.leads(id) on delete set null,
  country_code char(2) references public.countries(code),
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  constraint operacion_parts_unique_role unique (operacion_id, role),
  constraint operacion_parts_target_present check (
    asesor_id is not null or contacto_id is not null
  )
);

comment on table public.operacion_parts is
  'F14.B M07 — Partes de operación (comprador/vendedor/asesor_*/propietario). UNIQUE (operacion_id, role). FK contacto_id → leads (M03 contactos pendiente).';
comment on column public.operacion_parts.role is
  '6 roles canonical: comprador, vendedor, asesor_comprador, asesor_vendedor, asesor_productor, propietario.';
comment on column public.operacion_parts.contacto_id is
  'FK leads (interim canonical contact). H2 cuando M03 contactos esté shipped, migración cambia FK target.';

create index if not exists operacion_parts_operacion_role_idx
  on public.operacion_parts(operacion_id, role);
create index if not exists operacion_parts_asesor_idx
  on public.operacion_parts(asesor_id) where asesor_id is not null;

alter table public.operacion_parts enable row level security;

drop policy if exists operacion_parts_select on public.operacion_parts;
create policy operacion_parts_select on public.operacion_parts
  for select to authenticated
  using (
    public.rls_is_admin()
    or asesor_id = auth.uid()
    or exists (
      select 1 from public.operaciones o
      where o.id = operacion_parts.operacion_id
      and (o.asesor_id = auth.uid() or public.rls_is_admin())
    )
  );
comment on policy operacion_parts_select on public.operacion_parts is
  'RATIONALE: visible si admin, parte directa (asesor_id), o owner operación.';

drop policy if exists operacion_parts_insert on public.operacion_parts;
create policy operacion_parts_insert on public.operacion_parts
  for insert to authenticated
  with check (
    public.rls_is_admin()
    or exists (
      select 1 from public.operaciones o
      where o.id = operacion_parts.operacion_id and o.asesor_id = auth.uid()
    )
  );
comment on policy operacion_parts_insert on public.operacion_parts is
  'RATIONALE: insert permitido al owner de operación o admin.';

drop policy if exists operacion_parts_update on public.operacion_parts;
create policy operacion_parts_update on public.operacion_parts
  for update to authenticated
  using (
    public.rls_is_admin()
    or exists (
      select 1 from public.operaciones o
      where o.id = operacion_parts.operacion_id and o.asesor_id = auth.uid()
    )
  )
  with check (
    public.rls_is_admin()
    or exists (
      select 1 from public.operaciones o
      where o.id = operacion_parts.operacion_id and o.asesor_id = auth.uid()
    )
  );

drop policy if exists operacion_parts_delete on public.operacion_parts;
create policy operacion_parts_delete on public.operacion_parts
  for delete to authenticated
  using (
    public.rls_is_admin()
    or exists (
      select 1 from public.operaciones o
      where o.id = operacion_parts.operacion_id and o.asesor_id = auth.uid()
    )
  );

drop policy if exists operaciones_select_asesor_via_parts on public.operaciones;
create policy operaciones_select_asesor_via_parts on public.operaciones
  for select to authenticated
  using (
    public.rls_is_asesor()
    and exists (
      select 1 from public.operacion_parts op
      where op.operacion_id = operaciones.id and op.asesor_id = auth.uid()
    )
  );
comment on policy operaciones_select_asesor_via_parts on public.operaciones is
  'F14.B M07 — asesor ve operación si aparece como parte (operacion_parts.asesor_id). Complementa operaciones_select_asesor_owner.';
