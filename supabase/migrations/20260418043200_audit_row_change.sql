-- audit_row_change: función genérica + triggers en 5 tablas sensibles
-- FASE 02 / MÓDULO 2.K.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_02_AUTH_Y_PERMISOS.md §2.K.1

-- ============================================================
-- jsonb_diff — devuelve sólo las keys cuyo valor cambió (a respecto de b)
-- ============================================================
create or replace function public.jsonb_diff(a jsonb, b jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  from (
    select k as key, a->k as value
    from jsonb_object_keys(a) as k
    where a->k is distinct from b->k
  ) t;
$$;

comment on function public.jsonb_diff(jsonb, jsonb) is
  'Retorna un jsonb con las keys cuyo valor en "a" difiere de "b". Usada por audit_row_change().';

-- ============================================================
-- audit_row_change — trigger AFTER INSERT/UPDATE/DELETE genérico
-- Resiliente a tablas sin country_code o sin columna "id" singular.
-- ============================================================
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new jsonb;
  v_old jsonb;
  v_country char(2);
  v_record_id uuid;
begin
  v_new := case when tg_op <> 'DELETE' then to_jsonb(new) else null end;
  v_old := case when tg_op <> 'INSERT' then to_jsonb(old) else null end;

  v_country := coalesce(
    nullif(v_new->>'country_code', ''),
    nullif(v_old->>'country_code', '')
  )::char(2);

  v_record_id := coalesce(
    nullif(v_new->>'id', ''),
    nullif(v_old->>'id', ''),
    nullif(v_new->>'profile_id', ''),
    nullif(v_old->>'profile_id', '')
  )::uuid;

  insert into public.audit_log (
    country_code, actor_id, actor_role, action,
    table_name, record_id, before, after, diff
  ) values (
    v_country,
    auth.uid(),
    public.get_user_role(),
    tg_op,
    tg_table_name,
    v_record_id,
    v_old,
    v_new,
    case when tg_op = 'UPDATE' then public.jsonb_diff(v_new, v_old) else null end
  );

  return coalesce(new, old);
end;
$$;

comment on function public.audit_row_change() is
  'Trigger genérico AFTER INSERT/UPDATE/DELETE que deja trazabilidad en audit_log. SECURITY DEFINER + search_path="".';

-- ============================================================
-- Attach triggers en tablas sensibles (ADR-009 D7 + FASE 02 §2.K.1)
-- profiles ya tiene trg_prevent_role_escalation (BEFORE UPDATE, RBAC);
-- este trigger es AFTER y complementa con trazabilidad generica.
-- ============================================================
drop trigger if exists trg_audit_profiles on public.profiles;
create trigger trg_audit_profiles
  after insert or update or delete on public.profiles
  for each row execute function public.audit_row_change();

drop trigger if exists trg_audit_desarrolladoras on public.desarrolladoras;
create trigger trg_audit_desarrolladoras
  after insert or update or delete on public.desarrolladoras
  for each row execute function public.audit_row_change();

drop trigger if exists trg_audit_subscriptions on public.subscriptions;
create trigger trg_audit_subscriptions
  after insert or update or delete on public.subscriptions
  for each row execute function public.audit_row_change();

drop trigger if exists trg_audit_role_requests on public.role_requests;
create trigger trg_audit_role_requests
  after insert or update or delete on public.role_requests
  for each row execute function public.audit_row_change();

drop trigger if exists trg_audit_profile_feature_overrides on public.profile_feature_overrides;
create trigger trg_audit_profile_feature_overrides
  after insert or update or delete on public.profile_feature_overrides
  for each row execute function public.audit_row_change();
