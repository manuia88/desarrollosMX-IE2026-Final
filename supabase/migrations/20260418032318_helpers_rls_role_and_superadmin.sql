-- Helpers RLS: get_user_role() + is_superadmin()
-- FASE 01 / MÓDULO 1.D.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_01_BD_FUNDACION.md §1.D.1 + ADR-009 D3

-- ============================================================
-- get_user_role() — retorna rol del caller o NULL si no autenticado
-- ============================================================
create or replace function public.get_user_role()
returns public.user_role
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_uid uuid;
  v_rol public.user_role;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return null;
  end if;
  select rol into v_rol from public.profiles where id = v_uid;
  return v_rol;
end;
$$;

comment on function public.get_user_role() is
  'Retorna el user_role del caller autenticado. NULL si no autenticado. SECURITY DEFINER + SET search_path="" (ADR-009 D3).';

-- ============================================================
-- is_superadmin() — boolean. False si no autenticado.
-- ============================================================
create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and rol = 'superadmin'
      and is_active
  );
$$;

comment on function public.is_superadmin() is
  'True si el caller es superadmin activo; false para anon o cualquier otro rol. SECURITY DEFINER + SET search_path="" (ADR-009 D3).';

-- ============================================================
-- Policy SELECT pendiente: audit_log accesible a superadmin
-- (completar MÓDULO 1.C.6 que dejó el slot abierto)
-- ============================================================
create policy audit_log_select_superadmin on public.audit_log
  for select to authenticated
  using (public.is_superadmin());
