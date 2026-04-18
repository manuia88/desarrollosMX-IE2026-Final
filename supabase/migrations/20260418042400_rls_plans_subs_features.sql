-- RLS canónicas para plans, feature_registry, role_features,
-- subscriptions, profile_feature_overrides
-- FASE 02 / MÓDULO 2.F.3
-- Ref: docs/02_PLAN_MAESTRO/FASE_02_AUTH_Y_PERMISOS.md §2.F.3

-- ============================================================
-- plans — SELECT público activo (ya existente). Añadir INSERT/UPDATE super.
-- ============================================================
drop policy if exists plans_insert_super on public.plans;
create policy plans_insert_super on public.plans
  for insert to authenticated
  with check (public.is_superadmin());

drop policy if exists plans_update_super on public.plans;
create policy plans_update_super on public.plans
  for update to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists plans_delete_super on public.plans;
create policy plans_delete_super on public.plans
  for delete to authenticated
  using (public.is_superadmin());

-- ============================================================
-- feature_registry — SELECT público activo (ya existente). Mutaciones super.
-- ============================================================
drop policy if exists feature_registry_insert_super on public.feature_registry;
create policy feature_registry_insert_super on public.feature_registry
  for insert to authenticated
  with check (public.is_superadmin());

drop policy if exists feature_registry_update_super on public.feature_registry;
create policy feature_registry_update_super on public.feature_registry
  for update to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists feature_registry_delete_super on public.feature_registry;
create policy feature_registry_delete_super on public.feature_registry
  for delete to authenticated
  using (public.is_superadmin());

-- ============================================================
-- role_features — SELECT público auth (ya existente). Mutaciones super.
-- ============================================================
drop policy if exists role_features_insert_super on public.role_features;
create policy role_features_insert_super on public.role_features
  for insert to authenticated
  with check (public.is_superadmin());

drop policy if exists role_features_update_super on public.role_features;
create policy role_features_update_super on public.role_features
  for update to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists role_features_delete_super on public.role_features;
create policy role_features_delete_super on public.role_features
  for delete to authenticated
  using (public.is_superadmin());

-- ============================================================
-- subscriptions — SELECT owner + tenant members + superadmin.
-- INSERT/UPDATE/DELETE solo service_role (Stripe/MP webhooks FASE 23);
-- no emitimos policies para authenticated (RLS bloquea por default).
-- ============================================================
drop policy if exists subscriptions_select_own_profile on public.subscriptions;

create policy subscriptions_select_owner on public.subscriptions
  for select to authenticated
  using (
    public.is_superadmin()
    or (subject_type = 'profile' and subject_id = auth.uid())
    or (
      subject_type = 'desarrolladora'
      and subject_id in (
        select desarrolladora_id from public.profiles
        where id = auth.uid()
          and rol in ('admin_desarrolladora', 'superadmin')
      )
    )
    or (
      subject_type = 'broker_company'
      and subject_id in (
        select broker_company_id from public.profiles
        where id = auth.uid()
          and rol in ('broker_manager', 'mb_admin', 'superadmin')
      )
    )
  );

-- Aunque no haya policy INSERT/UPDATE/DELETE, revocar explícito impide que un
-- futuro GRANT accidental abra el vector. service_role mantiene BYPASS RLS.
revoke insert, update, delete on public.subscriptions from authenticated, anon;

-- ============================================================
-- profile_feature_overrides — SELECT self + super. Mutaciones super/mb_admin.
-- ============================================================
drop policy if exists pfo_select_own on public.profile_feature_overrides;

create policy pfo_select_self_or_super on public.profile_feature_overrides
  for select to authenticated
  using (
    profile_id = auth.uid()
    or public.is_superadmin()
    or (select rol from public.profiles where id = auth.uid()) = 'mb_admin'
  );

create policy pfo_insert_admin on public.profile_feature_overrides
  for insert to authenticated
  with check (
    public.is_superadmin()
    or (select rol from public.profiles where id = auth.uid()) = 'mb_admin'
  );

create policy pfo_update_admin on public.profile_feature_overrides
  for update to authenticated
  using (
    public.is_superadmin()
    or (select rol from public.profiles where id = auth.uid()) = 'mb_admin'
  )
  with check (
    public.is_superadmin()
    or (select rol from public.profiles where id = auth.uid()) = 'mb_admin'
  );

create policy pfo_delete_admin on public.profile_feature_overrides
  for delete to authenticated
  using (
    public.is_superadmin()
    or (select rol from public.profiles where id = auth.uid()) = 'mb_admin'
  );
