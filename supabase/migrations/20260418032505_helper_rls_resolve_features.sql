-- Helper RLS: resolve_features(user_id)
-- FASE 01 / MÓDULO 1.D.3
-- Ref: docs/02_PLAN_MAESTRO/FASE_01_BD_FUNDACION.md §1.D.3

create or replace function public.resolve_features(p_user_id uuid default null)
returns setof text
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_uid uuid;
  v_rol public.user_role;
  v_plan_code text;
begin
  v_uid := coalesce(p_user_id, auth.uid());
  if v_uid is null then
    return;
  end if;

  -- seguridad: solo superadmin puede consultar de otros usuarios
  if p_user_id is not null and p_user_id <> auth.uid() and not public.is_superadmin() then
    raise exception 'unauthorized';
  end if;

  select rol into v_rol from public.profiles where id = v_uid;

  select p.code
    into v_plan_code
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
   where s.subject_type = 'profile'
     and s.subject_id = v_uid
     and s.status in ('trialing','active')
   order by s.current_period_end desc
   limit 1;

  return query
    select fr.code
      from public.feature_registry fr
      join public.role_features rf on rf.feature_code = fr.code
     where rf.rol = v_rol
       and rf.is_enabled
       and fr.is_enabled
       and (fr.min_plan is null or fr.min_plan = v_plan_code or v_plan_code is not null)
       and not exists (
         select 1 from public.profile_feature_overrides pfo
          where pfo.profile_id = v_uid
            and pfo.feature_code = fr.code
            and pfo.is_enabled = false
            and (pfo.expires_at is null or pfo.expires_at > now())
       )
    union
    select pfo.feature_code
      from public.profile_feature_overrides pfo
     where pfo.profile_id = v_uid
       and pfo.is_enabled = true
       and (pfo.expires_at is null or pfo.expires_at > now());
end;
$$;

comment on function public.resolve_features(uuid) is
  'Combina role_features + plan activo + profile_feature_overrides. p_user_id opcional; solo superadmin puede consultar perfiles ajenos (RAISE unauthorized en caso contrario).';

grant execute on function public.resolve_features(uuid) to authenticated;
