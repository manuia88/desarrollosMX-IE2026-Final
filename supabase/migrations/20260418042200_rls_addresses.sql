-- RLS canónicas para addresses (polimórfica owner_type/owner_id)
-- FASE 02 / MÓDULO 2.F.2
-- Ref: docs/02_PLAN_MAESTRO/FASE_02_AUTH_Y_PERMISOS.md §2.F.2

-- La migration 20260418031812 ya dejó RLS habilitado y policy stub
-- `addresses_select_own_profile` limitada a owner_type='profile'. Se reemplaza
-- aquí por policies canónicas multi-owner_type + superadmin override.

drop policy if exists addresses_select_own_profile on public.addresses;

-- ============================================================
-- SELECT: superadmin | owner profile | miembros de la desarrolladora
-- project/unit/other se amplían en Fases 07+ cuando existan esas tablas.
-- ============================================================
create policy addresses_select_owner on public.addresses
  for select to authenticated
  using (
    public.is_superadmin()
    or (owner_type = 'profile' and owner_id = auth.uid())
    or (
      owner_type = 'desarrolladora'
      and owner_id in (
        select desarrolladora_id from public.profiles
        where id = auth.uid()
      )
    )
  );

-- ============================================================
-- INSERT: el propio profile o admin_desarrolladora/superadmin del tenant
-- ============================================================
create policy addresses_insert_owner on public.addresses
  for insert to authenticated
  with check (
    public.is_superadmin()
    or (owner_type = 'profile' and owner_id = auth.uid())
    or (
      owner_type = 'desarrolladora'
      and owner_id in (
        select desarrolladora_id from public.profiles
        where id = auth.uid()
          and rol in ('admin_desarrolladora', 'superadmin')
      )
    )
  );

-- ============================================================
-- UPDATE: mismos criterios que INSERT (no se cambia de owner)
-- ============================================================
create policy addresses_update_owner on public.addresses
  for update to authenticated
  using (
    public.is_superadmin()
    or (owner_type = 'profile' and owner_id = auth.uid())
    or (
      owner_type = 'desarrolladora'
      and owner_id in (
        select desarrolladora_id from public.profiles
        where id = auth.uid()
          and rol in ('admin_desarrolladora', 'superadmin')
      )
    )
  )
  with check (
    public.is_superadmin()
    or (owner_type = 'profile' and owner_id = auth.uid())
    or (
      owner_type = 'desarrolladora'
      and owner_id in (
        select desarrolladora_id from public.profiles
        where id = auth.uid()
          and rol in ('admin_desarrolladora', 'superadmin')
      )
    )
  );

-- ============================================================
-- DELETE: sólo owner profile o superadmin (desarrolladora sigue UPDATE soft)
-- ============================================================
create policy addresses_delete_owner on public.addresses
  for delete to authenticated
  using (
    public.is_superadmin()
    or (owner_type = 'profile' and owner_id = auth.uid())
  );
