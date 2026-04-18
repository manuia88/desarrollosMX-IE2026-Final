-- Privacy ARCO / GDPR-lite: data-export + data-delete + scheduled_delete cron
-- FASE 06 / MÓDULO 6.K.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_06_SEGURIDAD_BASELINE.md §6.K + ADR-009 compliance

-- ============================================================
-- Columnas de lifecycle en profiles
-- ============================================================
alter table public.profiles
  add column if not exists pending_deletion_at timestamptz,
  add column if not exists anonymized_at timestamptz,
  add column if not exists deleted_at timestamptz;

create index if not exists idx_profiles_pending_deletion
  on public.profiles (pending_deletion_at) where pending_deletion_at is not null and anonymized_at is null;

-- ============================================================
-- Tabla privacy_exports — tracking de solicitudes ARCO (access)
-- ============================================================
create table if not exists public.privacy_exports (
  id uuid primary key default extensions.uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  storage_path text,                        -- dossier-exports/<uuid>/<file>.json
  expires_at timestamptz,                   -- signed URL TTL 24h
  download_count int not null default 0,
  meta jsonb not null default '{}'::jsonb
);

create index idx_privacy_exports_profile on public.privacy_exports (profile_id, requested_at desc);

alter table public.privacy_exports enable row level security;

drop policy if exists pex_select_own on public.privacy_exports;
drop policy if exists pex_insert_self on public.privacy_exports;

create policy pex_select_own on public.privacy_exports
  for select to authenticated
  using (profile_id = auth.uid() or public.is_superadmin());

create policy pex_insert_self on public.privacy_exports
  for insert to authenticated
  with check (profile_id = auth.uid());

comment on table public.privacy_exports is
  'Registro ARCO (acceso LFPDPPP/GDPR). Source of truth del link generado; email real detrás de RESEND_ENABLED flag.';

-- ============================================================
-- anonymize_profile — ejecuta anonimización PII (sin DELETE real)
-- ============================================================
create or replace function public.anonymize_profile(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or (not public.is_superadmin() and p_profile_id <> auth.uid()) then
    raise exception 'anonymize_profile: unauthorized';
  end if;

  update public.profiles
  set
    email = 'deleted-' || id::text || '@anon.local',
    first_name = 'Deleted',
    last_name = 'User',
    phone = null,
    rfc_encrypted = null,
    tax_id_encrypted = null,
    avatar_url = null,
    slug = null,
    meta = '{}'::jsonb,
    anonymized_at = now(),
    is_active = false
  where id = p_profile_id
    and anonymized_at is null;
end;
$$;

revoke execute on function public.anonymize_profile(uuid) from public, anon;
grant execute on function public.anonymize_profile(uuid) to authenticated, service_role;

comment on function public.anonymize_profile(uuid) is
  'Anonimiza PII de un profile. ARCO supresión (LFPDPPP). No hace DELETE real; audit_log conserva historial con dato anonimizado.';

-- ============================================================
-- request_account_deletion — soft flag (caller = propio perfil)
-- ============================================================
create or replace function public.request_account_deletion()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scheduled timestamptz;
begin
  if auth.uid() is null then
    raise exception 'request_account_deletion: unauthorized';
  end if;

  v_scheduled := now() + interval '30 days';

  update public.profiles
  set pending_deletion_at = now()
  where id = auth.uid() and pending_deletion_at is null and anonymized_at is null;

  return v_scheduled;
end;
$$;

revoke execute on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;

comment on function public.request_account_deletion() is
  'Marca la cuenta del caller como pending_deletion_at = now(). Cron scheduled_delete anonimiza +30d. Ventana de arrepentimiento.';

-- ============================================================
-- cancel_account_deletion — el usuario se arrepiente antes de 30d
-- ============================================================
create or replace function public.cancel_account_deletion()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'cancel_account_deletion: unauthorized';
  end if;
  update public.profiles
  set pending_deletion_at = null
  where id = auth.uid() and anonymized_at is null;
end;
$$;

revoke execute on function public.cancel_account_deletion() from public, anon;
grant execute on function public.cancel_account_deletion() to authenticated;

-- ============================================================
-- run_scheduled_deletions — invocada por pg_cron diario
-- Anonimiza todos los profiles donde pending_deletion_at + 30d <= now().
-- ============================================================
create or replace function public.run_scheduled_deletions()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int := 0;
  v_id uuid;
begin
  for v_id in
    select id from public.profiles
    where pending_deletion_at is not null
      and anonymized_at is null
      and pending_deletion_at < (now() - interval '30 days')
  loop
    update public.profiles
    set
      email = 'deleted-' || id::text || '@anon.local',
      first_name = 'Deleted',
      last_name = 'User',
      phone = null,
      rfc_encrypted = null,
      tax_id_encrypted = null,
      avatar_url = null,
      slug = null,
      meta = '{}'::jsonb,
      anonymized_at = now(),
      is_active = false
    where id = v_id and anonymized_at is null;
    v_count := v_count + 1;
  end loop;

  insert into public.audit_log (
    country_code, actor_id, actor_role, action, table_name, record_id, after
  ) values (
    null, null, 'system', 'SCHEDULED_DELETE', 'profiles', null,
    jsonb_build_object('anonymized_count', v_count, 'run_at', now())
  );

  return v_count;
end;
$$;

revoke execute on function public.run_scheduled_deletions() from public, anon, authenticated;
grant execute on function public.run_scheduled_deletions() to service_role;

comment on function public.run_scheduled_deletions() is
  'Ejecutado por pg_cron diario 03:15 UTC. Anonimiza profiles con pending_deletion_at + 30d vencido.';

-- ============================================================
-- pg_cron jobs
-- ============================================================
select cron.schedule(
  'scheduled_delete_daily',
  '15 3 * * *',                             -- 03:15 UTC daily
  $$ select public.run_scheduled_deletions(); $$
);
