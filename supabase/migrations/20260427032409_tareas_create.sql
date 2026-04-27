-- F2.14.A — M06 Tareas (asesor task manager portal)
-- Crea tabla `tareas` con FK asesor_id + entity_id polimórfico + 3 indexes + 2 triggers + 7 RLS policies.
-- Reusa helpers SECDEF existentes (rls_is_admin/asesor/master_broker + set_updated_at) — cero SECDEF nueva.
-- Helper tareas_touch_completed_at es SECURITY INVOKER (mismo patrón captaciones_touch_status_changed).
-- 1:1 SECDEF↔allowlist: 0 SECDEF nuevas → audit_rls_allowlist v30 vigente, NO incrementa.
-- entity_id polimórfico (refiere proyectos|captaciones|busquedas|leads|contactos según `type`); validación en Zod app-layer.

create table if not exists public.tareas (
  id uuid primary key default gen_random_uuid(),
  asesor_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('property', 'capture', 'search', 'client', 'lead', 'general')),
  entity_id uuid,
  title text not null check (char_length(title) between 3 and 200),
  detalle_tipo text not null check (
    detalle_tipo in (
      'contactar_propietario',
      'organizar_visita',
      'organizar_captacion',
      'pedir_devolucion_visita',
      'custom'
    )
  ),
  description text check (char_length(description) <= 2000),
  due_at timestamptz not null,
  priority text not null default 'media'
    check (priority in ('alta', 'media', 'baja')),
  status text not null default 'pending'
    check (status in ('pending', 'expired', 'done')),
  redirect_to text check (char_length(redirect_to) <= 500),
  completed_at timestamptz,
  calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tareas_general_no_entity check (
    type = 'general' or entity_id is not null
  ),
  constraint tareas_done_consistency check (
    (status = 'done') = (completed_at is not null)
  )
);

comment on table public.tareas is
  'F14.A M06 — Tareas asesor (task manager 5 types + general; pipeline pending/expired/done; due_at absolute datetime; redirect_to no typo bugfix Pulppo).';
comment on column public.tareas.asesor_id is
  'Asesor responsable. ON DELETE CASCADE: eliminar asesor arrastra tareas (privacidad LFPDPPP).';
comment on column public.tareas.type is
  'Type interno (5 entity types + general). UI mapping a 3 columnas: propiedades (property+capture) / clientes (search+client) / prospectos (lead). general aparece transversalmente.';
comment on column public.tareas.entity_id is
  'FK polimórfica resuelta app-layer según type. NULL solo si type=general (CHECK tareas_general_no_entity).';
comment on column public.tareas.detalle_tipo is
  '4 tipos fijos + custom para descripción libre.';
comment on column public.tareas.due_at is
  'Datetime absoluto NO solo períodos relativos (mejora vs Pulppo). Cron tareas-mark-expired marca status=expired si pending+overdue.';
comment on column public.tareas.priority is
  'Priority en creación (mejora vs Pulppo que solo tiene como filtro).';
comment on column public.tareas.redirect_to is
  'URL absoluta o relativa al completar (bugfix typo reddirectTo de Pulppo).';
comment on column public.tareas.calendar_event_id is
  'STUB ADR-018: Google/Outlook/Apple sync diferido. Placeholder string para futura integración OAuth.';

create index if not exists idx_tareas_asesor_status_due
  on public.tareas(asesor_id, status, due_at);
create index if not exists idx_tareas_status_due_for_cron
  on public.tareas(status, due_at)
  where status = 'pending';
create index if not exists idx_tareas_entity
  on public.tareas(entity_id)
  where entity_id is not null;

drop trigger if exists trg_tareas_updated_at on public.tareas;
create trigger trg_tareas_updated_at
  before update on public.tareas
  for each row execute function public.set_updated_at();

create or replace function public.tareas_touch_completed_at()
  returns trigger
  language plpgsql
  as $$
begin
  if new.status = 'done' and (old.status is null or old.status <> 'done') then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tareas_touch_completed_at on public.tareas;
create trigger trg_tareas_touch_completed_at
  before update of status on public.tareas
  for each row execute function public.tareas_touch_completed_at();

alter table public.tareas enable row level security;

drop policy if exists tareas_select_asesor_owned on public.tareas;
create policy tareas_select_asesor_owned on public.tareas
  for select to authenticated
  using (public.rls_is_asesor() and asesor_id = auth.uid());
comment on policy tareas_select_asesor_owned on public.tareas is
  'RATIONALE: asesor ve sus propias tareas (default). Mismo pattern que busquedas_select_asesor_owned.';

drop policy if exists tareas_select_admin on public.tareas;
create policy tareas_select_admin on public.tareas
  for select to authenticated
  using (public.rls_is_admin());
comment on policy tareas_select_admin on public.tareas is
  'RATIONALE: superadmin override soporte + auditoría.';

drop policy if exists tareas_select_masterbroker on public.tareas;
create policy tareas_select_masterbroker on public.tareas
  for select to authenticated
  using (
    public.rls_is_master_broker()
    and asesor_id is not null
    and asesor_id in (
      select id from public.profiles
      where broker_company_id = (
        select broker_company_id from public.profiles where id = auth.uid()
      ) and broker_company_id is not null
    )
  );
comment on policy tareas_select_masterbroker on public.tareas is
  'RATIONALE: master broker ve tareas del equipo (asesor pertenece a su broker_company). Sustituye permissions.tasks_view_team de spec — canon repo usa rol-based gating.';

drop policy if exists tareas_insert_asesor on public.tareas;
create policy tareas_insert_asesor on public.tareas
  for insert to authenticated
  with check (public.rls_is_asesor() and asesor_id = auth.uid());
comment on policy tareas_insert_asesor on public.tareas is
  'RATIONALE: asesor crea tarea asignada a sí mismo.';

drop policy if exists tareas_update_asesor on public.tareas;
create policy tareas_update_asesor on public.tareas
  for update to authenticated
  using (public.rls_is_asesor() and asesor_id = auth.uid())
  with check (public.rls_is_asesor() and asesor_id = auth.uid());
comment on policy tareas_update_asesor on public.tareas is
  'RATIONALE: asesor actualiza tareas propias (incluye complete + reassign target).';

drop policy if exists tareas_update_masterbroker on public.tareas;
create policy tareas_update_masterbroker on public.tareas
  for update to authenticated
  using (
    public.rls_is_master_broker()
    and asesor_id in (
      select id from public.profiles
      where broker_company_id = (
        select broker_company_id from public.profiles where id = auth.uid()
      ) and broker_company_id is not null
    )
  )
  with check (
    public.rls_is_master_broker()
    and asesor_id in (
      select id from public.profiles
      where broker_company_id = (
        select broker_company_id from public.profiles where id = auth.uid()
      ) and broker_company_id is not null
    )
  );
comment on policy tareas_update_masterbroker on public.tareas is
  'RATIONALE: master broker reasigna tareas dentro del broker (cambia asesor_id). Sustituye permissions.tasks_reassign de spec.';

drop policy if exists tareas_delete_asesor on public.tareas;
create policy tareas_delete_asesor on public.tareas
  for delete to authenticated
  using (public.rls_is_asesor() and asesor_id = auth.uid());
comment on policy tareas_delete_asesor on public.tareas is
  'RATIONALE: asesor borra tareas propias (ej. duplicadas o creadas por error).';
