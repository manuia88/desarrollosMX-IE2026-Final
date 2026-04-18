-- mfa_reminders — cron semanal que deja entry en audit_log para admins sin MFA >7 días
-- FASE 06 / MÓDULO 6.H.1.3
-- Email real vía Resend se activa en FASE 22 con RESEND_ENABLED=true.

create or replace function public.mfa_reminders_tick()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int := 0;
  v_row record;
begin
  for v_row in
    select id, email, rol
    from public.profiles
    where rol in ('superadmin', 'admin_desarrolladora', 'mb_admin', 'mb_coordinator')
      and is_active = true
      and anonymized_at is null
      and coalesce((meta ->> 'mfa_enabled')::boolean, false) = false
      and created_at < (now() - interval '7 days')
  loop
    insert into public.audit_log (
      country_code, actor_id, actor_role, action, table_name, record_id, after
    ) values (
      null, null, 'system', 'MFA_REMINDER',
      'profiles', v_row.id,
      jsonb_build_object('rol', v_row.rol, 'sent_to_email_stub', v_row.email)
    );
    v_count := v_count + 1;
  end loop;

  insert into public.audit_log (
    country_code, actor_id, actor_role, action, table_name, record_id, after
  ) values (
    null, null, 'system', 'MFA_REMINDER_BATCH', 'profiles', null,
    jsonb_build_object('count', v_count, 'run_at', now())
  );

  return v_count;
end;
$$;

revoke execute on function public.mfa_reminders_tick() from public, anon, authenticated;
grant execute on function public.mfa_reminders_tick() to service_role;

comment on function public.mfa_reminders_tick() is
  'Cron semanal. Insert en audit_log por cada admin sin MFA >7d. Email real en FASE 22 (RESEND_ENABLED).';

-- pg_cron job: lunes 14:00 UTC
select cron.schedule(
  'mfa_reminders_weekly',
  '0 14 * * 1',
  $$ select public.mfa_reminders_tick(); $$
);
