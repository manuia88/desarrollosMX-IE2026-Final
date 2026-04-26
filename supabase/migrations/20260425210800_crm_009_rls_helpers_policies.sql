-- FASE 07.7.A.4 — CRM Foundation: 7 SECDEF helpers RLS + policies cross-table
-- Pattern: SECDEF + STABLE + search_path="" + auth.uid() check (ADR-009 D3).

-- ============================================================
-- 7 SECDEF helpers RLS
-- ============================================================

create or replace function public.rls_is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select public.is_superadmin();
$$;

create or replace function public.rls_is_asesor()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and rol = 'asesor' and is_active
  );
$$;

create or replace function public.rls_is_master_broker()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid()
      and rol in ('mb_admin', 'mb_coordinator')
      and is_active
  );
$$;

create or replace function public.rls_is_developer()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and rol = 'admin_desarrolladora' and is_active
  );
$$;

create or replace function public.rls_owns_lead(p_lead_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists(
    select 1 from public.leads
    where id = p_lead_id and user_id = auth.uid()
  );
$$;

create or replace function public.rls_is_assigned_lead(p_lead_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists(
    select 1 from public.leads
    where id = p_lead_id and assigned_asesor_id = auth.uid()
  );
$$;

create or replace function public.rls_is_brokerage_member(p_brokerage_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  -- STUB FASE 07.7.A.4 — pre-FASE 13 brokerages tabla. Retorna rls_is_master_broker().
  -- FASE 13 reemplaza con JOIN brokerages + brokerage_members.
  return public.rls_is_master_broker();
end;
$$;

comment on function public.rls_is_admin() is 'Alias semántico is_superadmin() para policies CRM.';
comment on function public.rls_is_asesor() is 'True si caller is_active asesor. SECDEF + search_path="".';
comment on function public.rls_is_master_broker() is 'True si caller mb_admin OR mb_coordinator activo.';
comment on function public.rls_is_developer() is 'True si caller admin_desarrolladora activo.';
comment on function public.rls_owns_lead(uuid) is 'True si caller user_id = leads.user_id (comprador).';
comment on function public.rls_is_assigned_lead(uuid) is 'True si caller = leads.assigned_asesor_id.';
comment on function public.rls_is_brokerage_member(uuid) is 'STUB FASE 13 brokerages tabla. Retorna rls_is_master_broker() H1.';

revoke execute on function public.rls_is_admin() from public, anon;
revoke execute on function public.rls_is_asesor() from public, anon;
revoke execute on function public.rls_is_master_broker() from public, anon;
revoke execute on function public.rls_is_developer() from public, anon;
revoke execute on function public.rls_owns_lead(uuid) from public, anon;
revoke execute on function public.rls_is_assigned_lead(uuid) from public, anon;
revoke execute on function public.rls_is_brokerage_member(uuid) from public, anon;

grant execute on function public.rls_is_admin() to authenticated, service_role;
grant execute on function public.rls_is_asesor() to authenticated, service_role;
grant execute on function public.rls_is_master_broker() to authenticated, service_role;
grant execute on function public.rls_is_developer() to authenticated, service_role;
grant execute on function public.rls_owns_lead(uuid) to authenticated, service_role;
grant execute on function public.rls_is_assigned_lead(uuid) to authenticated, service_role;
grant execute on function public.rls_is_brokerage_member(uuid) to authenticated, service_role;

-- ============================================================
-- RLS policies — leads
-- ============================================================
create policy leads_select_asesor_owned on public.leads
  for select to authenticated
  using (public.rls_is_asesor() and assigned_asesor_id = auth.uid());
comment on policy leads_select_asesor_owned on public.leads is
  'RATIONALE: asesor ve solo leads asignados (privacidad cross-asesor SEC-01).';

create policy leads_select_masterbroker on public.leads
  for select to authenticated
  using (
    public.rls_is_master_broker()
    and assigned_asesor_id is not null
    and assigned_asesor_id in (
      select id from public.profiles
      where broker_company_id = (
        select broker_company_id from public.profiles where id = auth.uid()
      ) and broker_company_id is not null
    )
  );
comment on policy leads_select_masterbroker on public.leads is
  'RATIONALE: master broker ve leads cuyo asesor pertenece a su broker_company.';

create policy leads_select_comprador_self on public.leads
  for select to authenticated
  using (user_id is not null and user_id = auth.uid());
comment on policy leads_select_comprador_self on public.leads is
  'RATIONALE: comprador ve sus propios leads (post-registration linking).';

create policy leads_select_admin on public.leads
  for select to authenticated
  using (public.rls_is_admin());
comment on policy leads_select_admin on public.leads is
  'RATIONALE: superadmin override soporte + auditoría.';

create policy leads_insert_asesor on public.leads
  for insert to authenticated
  with check (public.rls_is_asesor() and assigned_asesor_id = auth.uid());
comment on policy leads_insert_asesor on public.leads is
  'RATIONALE: asesor crea lead asignado a sí mismo. Cross-asesor via RPC.';

create policy leads_insert_admin on public.leads
  for insert to authenticated
  with check (public.rls_is_admin() or public.rls_is_master_broker() or public.rls_is_developer());
comment on policy leads_insert_admin on public.leads is
  'RATIONALE: admin/manager pueden insertar y asignar a cualquier asesor visible.';

create policy leads_update_asesor on public.leads
  for update to authenticated
  using (public.rls_is_asesor() and assigned_asesor_id = auth.uid())
  with check (public.rls_is_asesor() and assigned_asesor_id = auth.uid());
comment on policy leads_update_asesor on public.leads is
  'RATIONALE: asesor actualiza leads asignados, NO transfiere a otro asesor (RPC dedicada).';

create policy leads_update_admin on public.leads
  for update to authenticated
  using (public.rls_is_admin() or public.rls_is_master_broker())
  with check (public.rls_is_admin() or public.rls_is_master_broker());
comment on policy leads_update_admin on public.leads is
  'RATIONALE: master broker / superadmin pueden reasignar leads dentro del broker.';

create policy leads_delete_admin on public.leads
  for delete to authenticated
  using (public.rls_is_admin());
comment on policy leads_delete_admin on public.leads is
  'RATIONALE: ADR-009 D7 LFPDPPP/ARCO casos especiales solo superadmin con audit trail.';

-- ============================================================
-- RLS policies — deals
-- ============================================================
create policy deals_select_asesor on public.deals
  for select to authenticated
  using (public.rls_is_asesor() and asesor_id = auth.uid());
comment on policy deals_select_asesor on public.deals is
  'RATIONALE: asesor ve solo sus deals.';

create policy deals_select_masterbroker on public.deals
  for select to authenticated
  using (
    public.rls_is_master_broker()
    and asesor_id in (
      select id from public.profiles
      where broker_company_id = (
        select broker_company_id from public.profiles where id = auth.uid()
      ) and broker_company_id is not null
    )
  );
comment on policy deals_select_masterbroker on public.deals is
  'RATIONALE: master broker visibilidad agregada deals broker_company.';

create policy deals_select_developer on public.deals
  for select to authenticated
  using (public.rls_is_developer());
comment on policy deals_select_developer on public.deals is
  'RATIONALE: placeholder pre-FASE 11.X — developer ve deals (filtro property→desarrollo cierra cuando properties polimórficas se canonicen).';

create policy deals_select_comprador on public.deals
  for select to authenticated
  using (
    lead_id in (select id from public.leads where user_id = auth.uid())
  );
comment on policy deals_select_comprador on public.deals is
  'RATIONALE: comprador ve deals derivados de sus leads (transparencia pipeline buyer-side).';

create policy deals_select_admin on public.deals
  for select to authenticated
  using (public.rls_is_admin());

create policy deals_insert_asesor on public.deals
  for insert to authenticated
  with check (public.rls_is_asesor() and asesor_id = auth.uid());

create policy deals_insert_admin on public.deals
  for insert to authenticated
  with check (public.rls_is_admin() or public.rls_is_master_broker());

create policy deals_update_asesor on public.deals
  for update to authenticated
  using (public.rls_is_asesor() and asesor_id = auth.uid())
  with check (public.rls_is_asesor() and asesor_id = auth.uid());
comment on policy deals_update_asesor on public.deals is
  'RATIONALE: asesor controla stage transitions de sus deals. Trigger valida cascadas.';

create policy deals_update_admin on public.deals
  for update to authenticated
  using (public.rls_is_admin() or public.rls_is_master_broker())
  with check (public.rls_is_admin() or public.rls_is_master_broker());

create policy deals_delete_admin on public.deals
  for delete to authenticated
  using (public.rls_is_admin());
comment on policy deals_delete_admin on public.deals is
  'RATIONALE: ADR-009 D7 deals histórico comercial. DELETE solo superadmin.';

-- ============================================================
-- RLS policies — operaciones
-- ============================================================
create policy operaciones_select_asesor on public.operaciones
  for select to authenticated
  using (
    public.rls_is_asesor()
    and deal_id in (select id from public.deals where asesor_id = auth.uid())
  );

create policy operaciones_select_masterbroker on public.operaciones
  for select to authenticated
  using (
    public.rls_is_master_broker()
    and deal_id in (
      select d.id from public.deals d
      where d.asesor_id in (
        select id from public.profiles
        where broker_company_id = (
          select broker_company_id from public.profiles where id = auth.uid()
        ) and broker_company_id is not null
      )
    )
  );

create policy operaciones_select_developer on public.operaciones
  for select to authenticated
  using (public.rls_is_developer());

create policy operaciones_select_comprador on public.operaciones
  for select to authenticated
  using (
    deal_id in (
      select d.id from public.deals d
      join public.leads l on l.id = d.lead_id
      where l.user_id = auth.uid()
    )
  );

create policy operaciones_select_admin on public.operaciones
  for select to authenticated
  using (public.rls_is_admin());

create policy operaciones_insert_admin on public.operaciones
  for insert to authenticated
  with check (public.rls_is_admin() or public.rls_is_master_broker());
comment on policy operaciones_insert_admin on public.operaciones is
  'RATIONALE: insert manual solo admin/manager. Path principal: trigger cascade SECDEF.';

create policy operaciones_update_admin on public.operaciones
  for update to authenticated
  using (public.rls_is_admin())
  with check (public.rls_is_admin());
comment on policy operaciones_update_admin on public.operaciones is
  'RATIONALE: actualizaciones fiscal vía RPC (Facturapi callback). Asesor read-only.';

create policy operaciones_no_delete on public.operaciones
  for delete using (false);
comment on policy operaciones_no_delete on public.operaciones is
  'RATIONALE: ADR-009 D7 operaciones append-only (CFDI fiscal compliance LFPDPPP/SAT 5y).';

-- ============================================================
-- RLS policies — buyer_twins + buyer_twin_traits
-- ============================================================
create policy buyer_twins_select_owner on public.buyer_twins
  for select to authenticated
  using (user_id is not null and user_id = auth.uid());

create policy buyer_twins_select_admin on public.buyer_twins
  for select to authenticated
  using (public.rls_is_admin());

create policy buyer_twins_insert_self on public.buyer_twins
  for insert to authenticated
  with check (
    (user_id = auth.uid())
    or public.rls_is_admin()
    or user_id is null
  );

create policy buyer_twins_update_owner on public.buyer_twins
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy buyer_twins_update_admin on public.buyer_twins
  for update to authenticated
  using (public.rls_is_admin())
  with check (public.rls_is_admin());

create policy buyer_twins_delete_admin on public.buyer_twins
  for delete to authenticated
  using (public.rls_is_admin());

create policy buyer_twin_traits_select_owner on public.buyer_twin_traits
  for select to authenticated
  using (
    exists (
      select 1 from public.buyer_twins bt
      where bt.id = buyer_twin_id and bt.user_id = auth.uid()
    )
  );

create policy buyer_twin_traits_select_admin on public.buyer_twin_traits
  for select to authenticated
  using (public.rls_is_admin());

revoke insert, update, delete on public.buyer_twin_traits from authenticated, anon;
comment on table public.buyer_twin_traits is
  'INSERT/UPDATE/DELETE solo via SECDEF function recompute_buyer_twin_traits (service_role). Comprador NO escribe directo.';

-- ============================================================
-- RLS policies — family_units + family_unit_members
-- ============================================================
create policy family_units_select_owner on public.family_units
  for select to authenticated
  using (
    exists (
      select 1 from public.buyer_twins bt
      where bt.id = primary_buyer_twin_id and bt.user_id = auth.uid()
    )
  );

create policy family_units_select_member on public.family_units
  for select to authenticated
  using (
    exists (
      select 1 from public.family_unit_members fum
      join public.buyer_twins bt on bt.id = fum.buyer_twin_id
      where fum.family_unit_id = family_units.id and bt.user_id = auth.uid()
    )
  );

create policy family_units_select_admin on public.family_units
  for select to authenticated
  using (public.rls_is_admin());

create policy family_units_insert_owner on public.family_units
  for insert to authenticated
  with check (
    exists (
      select 1 from public.buyer_twins bt
      where bt.id = primary_buyer_twin_id and bt.user_id = auth.uid()
    ) or public.rls_is_admin()
  );

create policy family_units_update_owner on public.family_units
  for update to authenticated
  using (
    exists (
      select 1 from public.buyer_twins bt
      where bt.id = primary_buyer_twin_id and bt.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.buyer_twins bt
      where bt.id = primary_buyer_twin_id and bt.user_id = auth.uid()
    )
  );

create policy family_units_delete_admin on public.family_units
  for delete to authenticated
  using (public.rls_is_admin());

create policy family_unit_members_select on public.family_unit_members
  for select to authenticated
  using (
    public.rls_is_admin()
    or exists (
      select 1 from public.buyer_twins bt
      where bt.id = buyer_twin_id and bt.user_id = auth.uid()
    )
    or exists (
      select 1 from public.family_units fu
      join public.buyer_twins bt on bt.id = fu.primary_buyer_twin_id
      where fu.id = family_unit_id and bt.user_id = auth.uid()
    )
  );

create policy family_unit_members_insert_owner on public.family_unit_members
  for insert to authenticated
  with check (
    public.rls_is_admin()
    or exists (
      select 1 from public.family_units fu
      join public.buyer_twins bt on bt.id = fu.primary_buyer_twin_id
      where fu.id = family_unit_id and bt.user_id = auth.uid()
    )
  );

create policy family_unit_members_update_owner on public.family_unit_members
  for update to authenticated
  using (
    public.rls_is_admin()
    or exists (
      select 1 from public.family_units fu
      join public.buyer_twins bt on bt.id = fu.primary_buyer_twin_id
      where fu.id = family_unit_id and bt.user_id = auth.uid()
    )
  );

create policy family_unit_members_delete_admin on public.family_unit_members
  for delete to authenticated
  using (public.rls_is_admin());

-- ============================================================
-- RLS policies — behavioral_signals (privacy boundary)
-- ============================================================
create policy behavioral_signals_select_owner on public.behavioral_signals
  for select to authenticated
  using (
    exists (
      select 1 from public.buyer_twins bt
      where bt.id = buyer_twin_id and bt.user_id = auth.uid()
    )
  );
comment on policy behavioral_signals_select_owner on public.behavioral_signals is
  'RATIONALE: comprador ve solo SU telemetría. Asesor NO ve telemetría individual (privacy ADR-021 §3 + LFPDPPP).';

create policy behavioral_signals_select_admin on public.behavioral_signals
  for select to authenticated
  using (public.rls_is_admin());

create policy behavioral_signals_no_delete on public.behavioral_signals
  for delete using (false);
comment on policy behavioral_signals_no_delete on public.behavioral_signals is
  'RATIONALE: append-only telemetría. Cleanup solo via pg_partman.run_maintenance (>24m).';

revoke insert, update, delete on public.behavioral_signals from authenticated, anon;

-- ============================================================
-- RLS policies — referrals + referral_rewards
-- ============================================================
create policy referrals_select on public.referrals
  for select to authenticated
  using (
    public.rls_is_admin()
    or (source_type = 'user' and source_id = auth.uid())
    or (target_type = 'user' and target_id = auth.uid())
    or (
      public.rls_is_asesor()
      and target_type = 'deal'
      and target_id in (select id from public.deals where asesor_id = auth.uid())
    )
  );

create policy referrals_insert on public.referrals
  for insert to authenticated
  with check (
    public.rls_is_admin()
    or public.rls_is_asesor()
    or public.rls_is_developer()
  );

create policy referrals_update on public.referrals
  for update to authenticated
  using (
    public.rls_is_admin()
    or (source_type = 'user' and source_id = auth.uid())
  )
  with check (
    public.rls_is_admin()
    or (source_type = 'user' and source_id = auth.uid())
  );

create policy referrals_delete on public.referrals
  for delete to authenticated
  using (public.rls_is_admin());

create policy referral_rewards_select on public.referral_rewards
  for select to authenticated
  using (
    public.rls_is_admin()
    or referral_id in (
      select id from public.referrals
      where (source_type = 'user' and source_id = auth.uid())
         or (target_type = 'user' and target_id = auth.uid())
    )
  );

create policy referral_rewards_admin on public.referral_rewards
  for all to authenticated
  using (public.rls_is_admin())
  with check (public.rls_is_admin());
