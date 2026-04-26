-- F2.13.E — M04 Búsquedas (matcher buyer_twin × proyectos)
-- Crea tabla `busquedas` con FK lead_id + criteria jsonb + matched_count + RLS por role.
-- Reuse helpers SECDEF existentes (rls_is_admin/asesor/master_broker/owns_lead) — cero SECDEF nueva.
-- 1:1 SECDEF↔allowlist: 0 nuevas → audit_rls_allowlist v30 vigente, NO incrementa.

create table if not exists public.busquedas (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  asesor_id uuid references auth.users(id) on delete set null,
  brokerage_id uuid,
  country_code char(2) not null,
  status text not null default 'activa'
    check (status in ('activa', 'pausada', 'cerrada')),
  criteria jsonb not null default '{}'::jsonb,
  matched_count int not null default 0
    check (matched_count >= 0),
  last_run_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.busquedas is
  'F13.E M04 — Búsquedas asesor (lead + criteria → matcher proyectos+unidades). Una búsqueda por criterio activo del lead.';
comment on column public.busquedas.lead_id is
  'FK leads. ON DELETE CASCADE: eliminar lead arrastra búsquedas (privacidad).';
comment on column public.busquedas.asesor_id is
  'Asesor responsable de la búsqueda. Mismo que leads.assigned_asesor_id en la práctica.';
comment on column public.busquedas.brokerage_id is
  'Placeholder pre-broker_companies aggregation. Mismo patrón que leads.brokerage_id.';
comment on column public.busquedas.criteria is
  'Criterios búsqueda Zod-validated app-layer: tipo / operacion / zone_ids / ciudades / price_min / price_max / currency / recamaras_min / recamaras_max / amenities.';
comment on column public.busquedas.matched_count is
  'Total matches del último runMatcher. Sincronizado UPSERT con last_run_at.';

create index if not exists idx_busquedas_lead on public.busquedas(lead_id);
create index if not exists idx_busquedas_asesor on public.busquedas(asesor_id);
create index if not exists idx_busquedas_brokerage on public.busquedas(brokerage_id);
create index if not exists idx_busquedas_status on public.busquedas(status);
create index if not exists idx_busquedas_country on public.busquedas(country_code);
create index if not exists idx_busquedas_created_by on public.busquedas(created_by);

drop trigger if exists trg_busquedas_updated_at on public.busquedas;
create trigger trg_busquedas_updated_at
  before update on public.busquedas
  for each row execute function public.set_updated_at();

alter table public.busquedas enable row level security;

-- ============================================================
-- RLS policies (reuse helpers rls_is_* SECDEF allowlisted v.previas)
-- ============================================================

drop policy if exists busquedas_select_asesor_owned on public.busquedas;
create policy busquedas_select_asesor_owned on public.busquedas
  for select to authenticated
  using (public.rls_is_asesor() and asesor_id = auth.uid());
comment on policy busquedas_select_asesor_owned on public.busquedas is
  'RATIONALE: asesor ve búsquedas que le pertenecen. Mismo pattern que leads_select_asesor_owned.';

drop policy if exists busquedas_select_masterbroker on public.busquedas;
create policy busquedas_select_masterbroker on public.busquedas
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
comment on policy busquedas_select_masterbroker on public.busquedas is
  'RATIONALE: master broker ve búsquedas cuyo asesor pertenece a su broker_company.';

drop policy if exists busquedas_select_admin on public.busquedas;
create policy busquedas_select_admin on public.busquedas
  for select to authenticated
  using (public.rls_is_admin());
comment on policy busquedas_select_admin on public.busquedas is
  'RATIONALE: superadmin override soporte + auditoría.';

drop policy if exists busquedas_insert_asesor on public.busquedas;
create policy busquedas_insert_asesor on public.busquedas
  for insert to authenticated
  with check (public.rls_is_asesor() and asesor_id = auth.uid() and created_by = auth.uid());
comment on policy busquedas_insert_asesor on public.busquedas is
  'RATIONALE: asesor crea búsqueda asignada a sí mismo. created_by tracking.';

drop policy if exists busquedas_insert_admin on public.busquedas;
create policy busquedas_insert_admin on public.busquedas
  for insert to authenticated
  with check (public.rls_is_admin() or public.rls_is_master_broker());
comment on policy busquedas_insert_admin on public.busquedas is
  'RATIONALE: admin/master broker pueden insertar búsquedas en nombre de cualquier asesor.';

drop policy if exists busquedas_update_asesor on public.busquedas;
create policy busquedas_update_asesor on public.busquedas
  for update to authenticated
  using (public.rls_is_asesor() and asesor_id = auth.uid())
  with check (public.rls_is_asesor() and asesor_id = auth.uid());
comment on policy busquedas_update_asesor on public.busquedas is
  'RATIONALE: asesor actualiza búsquedas propias. Reasignación via RPC dedicada futura.';

drop policy if exists busquedas_update_admin on public.busquedas;
create policy busquedas_update_admin on public.busquedas
  for update to authenticated
  using (public.rls_is_admin() or public.rls_is_master_broker())
  with check (public.rls_is_admin() or public.rls_is_master_broker());
comment on policy busquedas_update_admin on public.busquedas is
  'RATIONALE: admin/master broker pueden actualizar búsquedas dentro del broker.';

drop policy if exists busquedas_delete_admin on public.busquedas;
create policy busquedas_delete_admin on public.busquedas
  for delete to authenticated
  using (public.rls_is_admin() or public.rls_is_master_broker());
comment on policy busquedas_delete_admin on public.busquedas is
  'RATIONALE: solo admin/master broker pueden borrar (asesor pausa/cierra, no borra).';
