-- Trigger prevent_role_escalation en profiles (ADR-009 D4 / SEC-02)
-- FASE 02 / MÓDULO 2.D.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_02_AUTH_Y_PERMISOS.md §2.D.1

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_uid uuid;
  v_actor_role public.user_role;
  v_is_service boolean;
  v_changed boolean;
begin
  v_actor_uid := auth.uid();
  -- service_role/postgres bypass (seed, migrations, backend con service key).
  v_is_service := current_setting('role', true) in ('service_role', 'supabase_admin');

  v_changed := (
    old.rol is distinct from new.rol
    or old.is_approved is distinct from new.is_approved
    or old.is_active is distinct from new.is_active
    or old.country_code is distinct from new.country_code
    or old.desarrolladora_id is distinct from new.desarrolladora_id
    or old.agency_id is distinct from new.agency_id
    or old.broker_company_id is distinct from new.broker_company_id
  );

  if not v_changed then
    return new;
  end if;

  if v_is_service then
    insert into public.audit_log (country_code, actor_id, action, table_name, record_id, before, after, meta)
    values (
      coalesce(new.country_code, old.country_code),
      null,
      'RBAC_SERVICE_ROLE_CHANGE',
      'profiles',
      new.id,
      to_jsonb(old),
      to_jsonb(new),
      jsonb_build_object('note', 'service_role bypass')
    );
    return new;
  end if;

  select rol into v_actor_role from public.profiles where id = v_actor_uid;
  -- Permitido: superadmin siempre; mb_admin (flujo approve_role_request).
  if v_actor_role not in ('superadmin', 'mb_admin') then
    raise exception 'role_escalation_blocked: only superadmin or mb_admin can modify privileged fields'
      using errcode = '42501';
  end if;

  insert into public.audit_log (country_code, actor_id, actor_role, action, table_name, record_id, before, after)
  values (
    coalesce(new.country_code, old.country_code),
    v_actor_uid,
    v_actor_role,
    'RBAC_CHANGE',
    'profiles',
    new.id,
    to_jsonb(old),
    to_jsonb(new)
  );

  return new;
end;
$$;

comment on function public.prevent_role_escalation() is
  'BEFORE UPDATE guard ADR-009 D4. Aborta si actor no es superadmin/mb_admin al mutar rol/is_approved/is_active/country_code/desarrolladora_id/agency_id/broker_company_id. service_role bypass + audit. Cambio legítimo queda en audit_log RBAC_CHANGE.';

drop trigger if exists trg_prevent_role_escalation on public.profiles;
create trigger trg_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();
