-- Helper RLS: get_visible_asesor_ids()
-- FASE 01 / MÓDULO 1.D.2
-- Ref: docs/02_PLAN_MAESTRO/FASE_01_BD_FUNDACION.md §1.D.2

create or replace function public.get_visible_asesor_ids()
returns setof uuid
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_uid uuid;
  v_rol public.user_role;
  v_broker uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return;
  end if;

  select rol, broker_company_id
    into v_rol, v_broker
    from public.profiles
   where id = v_uid;

  if v_rol = 'superadmin' then
    return query
      select id from public.profiles where rol = 'asesor';
  elsif v_rol = 'broker_manager' and v_broker is not null then
    return query
      select id from public.profiles where broker_company_id = v_broker;
  else
    return query select v_uid;
  end if;
end;
$$;

comment on function public.get_visible_asesor_ids() is
  'Retorna SETOF UUID de asesores visibles al caller: superadmin ve todos, broker_manager ve su broker_company, demás sólo a sí mismos. Usado en policies de tablas que filtran por asesor_id.';
