-- auth_backup_codes: 10 códigos bcrypt-hashed por profile con MFA TOTP
-- FASE 02 / MÓDULO 2.B.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_02_AUTH_Y_PERMISOS.md §2.B.1.4
-- Hashing usa extensions.crypt(..., gen_salt('bf')) — pgcrypto ya habilitado FASE 01.

create table public.auth_backup_codes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_bc_profile_unused
  on public.auth_backup_codes (profile_id)
  where used_at is null;

alter table public.auth_backup_codes enable row level security;

-- Owner SELECT (solo para "ya usé 3/10" UI info).
create policy backup_codes_select_own on public.auth_backup_codes
  for select to authenticated
  using (profile_id = auth.uid());

-- INSERT/UPDATE solo via funciones SECURITY DEFINER. Sin policies correspondientes,
-- los clientes authenticated no pueden operar directamente. service_role (tRPC admin)
-- opera con BYPASSRLS.

-- ============================================================
-- Funciones helper para el flow MFA enrollment/challenge
-- ============================================================

-- Genera y almacena 10 backup codes para el caller. Retorna los codes en plaintext
-- (la única vez que se exponen). Invalida codes previos del mismo profile.
create or replace function public.mfa_regenerate_backup_codes()
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_code text;
  v_i int;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  -- Invalidar codes previos (marcarlos used_at para no borrar histórico auditable).
  update public.auth_backup_codes
     set used_at = now()
   where profile_id = v_uid
     and used_at is null;

  for v_i in 1..10 loop
    -- 8 chars base32 friendly (sin ambigüedad 0/O/1/I).
    v_code := upper(substring(encode(extensions.gen_random_bytes(8), 'hex') from 1 for 8));
    insert into public.auth_backup_codes (profile_id, code_hash)
      values (v_uid, extensions.crypt(v_code, extensions.gen_salt('bf')));
    return next v_code;
  end loop;
end;
$$;

comment on function public.mfa_regenerate_backup_codes() is
  'Genera 10 backup codes en plaintext (solo retornados aquí) + hashes bcrypt vía pgcrypto. Invalida codes previos. SECURITY DEFINER con auth.uid() guard.';

grant execute on function public.mfa_regenerate_backup_codes() to authenticated;

-- Consume un backup code. Retorna true si match y marca used_at.
create or replace function public.mfa_consume_backup_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select id into v_id
    from public.auth_backup_codes
   where profile_id = v_uid
     and used_at is null
     and code_hash = extensions.crypt(p_code, code_hash)
   limit 1;

  if v_id is null then
    return false;
  end if;

  update public.auth_backup_codes set used_at = now() where id = v_id;
  return true;
end;
$$;

comment on function public.mfa_consume_backup_code(text) is
  'Consume un backup code del caller: valida contra hash bcrypt (pgcrypto crypt(code, hash)), marca used_at. Idempotente — códigos ya usados retornan false.';

grant execute on function public.mfa_consume_backup_code(text) to authenticated;

-- Marca en profiles.meta que el usuario tiene MFA enabled.
create or replace function public.mfa_mark_enabled()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  update public.profiles
     set meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object('mfa_enabled', true, 'mfa_enabled_at', now())
   where id = v_uid;
end;
$$;

grant execute on function public.mfa_mark_enabled() to authenticated;
