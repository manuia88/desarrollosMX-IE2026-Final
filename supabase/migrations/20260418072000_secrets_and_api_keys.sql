-- Secrets management con pgsodium + tabla api_keys (bcrypt)
-- FASE 06 / MÓDULO 6.C.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_06_SEGURIDAD_BASELINE.md §6.C + ADR-009 D8/D10

-- ============================================================
-- Key bootstrap (idempotente; key ya creada fuera del migration pipeline
-- vía pgsodium.create_key('aead-det', 'default_secret_key'))
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pgsodium.valid_key where name = 'default_secret_key'
  ) then
    raise exception 'pgsodium key "default_secret_key" no existe. Crear con: select pgsodium.create_key(''aead-det''::pgsodium.key_type, ''default_secret_key'');';
  end if;
end $$;

-- ============================================================
-- encrypt_secret / decrypt_secret helpers
-- decrypt_secret requiere is_superadmin() (ADR-009 D10).
-- ============================================================
create or replace function public.encrypt_secret(p_plaintext text)
returns bytea
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key uuid;
begin
  if p_plaintext is null then
    return null;
  end if;
  select id into v_key from pgsodium.valid_key where name = 'default_secret_key' limit 1;
  if v_key is null then
    raise exception 'encrypt_secret: pgsodium key "default_secret_key" no encontrada';
  end if;
  return pgsodium.crypto_aead_det_encrypt(
    convert_to(p_plaintext, 'utf8'),
    convert_to('dmx', 'utf8'),
    v_key
  );
end;
$$;

revoke execute on function public.encrypt_secret(text) from public, anon;
grant execute on function public.encrypt_secret(text) to authenticated, service_role;

create or replace function public.decrypt_secret(p_ciphertext bytea)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key uuid;
begin
  if p_ciphertext is null then
    return null;
  end if;
  if auth.uid() is null then
    raise exception 'decrypt_secret: unauthorized (no auth context)';
  end if;
  if not public.is_superadmin() then
    raise exception 'decrypt_secret: unauthorized (superadmin only)';
  end if;
  select id into v_key from pgsodium.valid_key where name = 'default_secret_key' limit 1;
  return convert_from(
    pgsodium.crypto_aead_det_decrypt(p_ciphertext, convert_to('dmx', 'utf8'), v_key),
    'utf8'
  );
end;
$$;

revoke execute on function public.decrypt_secret(bytea) from public, anon;
grant execute on function public.decrypt_secret(bytea) to authenticated, service_role;

comment on function public.encrypt_secret(text) is
  'Cifra texto con pgsodium AEAD-det y la key "default_secret_key". Determinista (mismo input → mismo output). ADR-009 D10.';

comment on function public.decrypt_secret(bytea) is
  'Descifra bytea. Requiere auth.uid() + is_superadmin(). ADR-009 D10.';

-- ============================================================
-- profiles: añadir columnas encriptadas (no drop de plaintext aún;
-- FASE 07+ migra escritura a helpers set_profile_rfc/get_profile_rfc y dropea plaintext)
-- ============================================================
alter table public.profiles
  add column if not exists rfc_encrypted bytea,
  add column if not exists tax_id_encrypted bytea;

comment on column public.profiles.rfc is
  'DEPRECATED: se migra a rfc_encrypted via trigger. FASE 07+ dropea.';
comment on column public.profiles.tax_id is
  'DEPRECATED: se migra a tax_id_encrypted via trigger. FASE 07+ dropea.';

-- ============================================================
-- Trigger desarrolladoras_encrypt_tax — cifra tax_id al INSERT/UPDATE,
-- y nullifica plaintext en la misma fila (at rest: solo tax_id_encrypted).
-- ============================================================
create or replace function public.desarrolladoras_encrypt_tax()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.tax_id is not null then
    if (tg_op = 'UPDATE' and old.tax_id is distinct from new.tax_id) or tg_op = 'INSERT' then
      new.tax_id_encrypted := public.encrypt_secret(new.tax_id);
    end if;
    new.tax_id := null;  -- nunca persiste plaintext
  end if;
  return new;
end;
$$;

drop trigger if exists trg_desarrolladoras_encrypt_tax on public.desarrolladoras;
create trigger trg_desarrolladoras_encrypt_tax
  before insert or update on public.desarrolladoras
  for each row execute function public.desarrolladoras_encrypt_tax();

-- ============================================================
-- Trigger profiles_encrypt_pii — cifra rfc y tax_id en profiles
-- ============================================================
create or replace function public.profiles_encrypt_pii()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.rfc is not null then
    if (tg_op = 'UPDATE' and old.rfc is distinct from new.rfc) or tg_op = 'INSERT' then
      new.rfc_encrypted := public.encrypt_secret(new.rfc);
    end if;
    new.rfc := null;
  end if;
  if new.tax_id is not null then
    if (tg_op = 'UPDATE' and old.tax_id is distinct from new.tax_id) or tg_op = 'INSERT' then
      new.tax_id_encrypted := public.encrypt_secret(new.tax_id);
    end if;
    new.tax_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_encrypt_pii on public.profiles;
create trigger trg_profiles_encrypt_pii
  before insert or update on public.profiles
  for each row execute function public.profiles_encrypt_pii();

-- ============================================================
-- Tabla api_keys — key plaintext jamás persiste; sólo key_hash (bcrypt via pgcrypto)
-- ============================================================
create table if not exists public.api_keys (
  id uuid primary key default extensions.uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  key_prefix text not null,                 -- primeros 8 chars visibles en UI (p.ej. 'dmx_abc1')
  key_hash text not null,                   -- extensions.crypt(raw_key, gen_salt('bf', 10))
  scopes text[] not null default '{}',
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_apikeys_prefix_active
  on public.api_keys (key_prefix) where revoked_at is null;
create index if not exists idx_apikeys_profile on public.api_keys (profile_id);

alter table public.api_keys enable row level security;

drop policy if exists api_keys_select_own on public.api_keys;
drop policy if exists api_keys_insert_self on public.api_keys;
drop policy if exists api_keys_update_own on public.api_keys;
drop policy if exists api_keys_delete_own on public.api_keys;

create policy api_keys_select_own on public.api_keys
  for select to authenticated
  using (profile_id = auth.uid() or public.is_superadmin());

create policy api_keys_insert_self on public.api_keys
  for insert to authenticated
  with check (profile_id = auth.uid() or public.is_superadmin());

create policy api_keys_update_own on public.api_keys
  for update to authenticated
  using (profile_id = auth.uid() or public.is_superadmin())
  with check (profile_id = auth.uid() or public.is_superadmin());

-- Sin policy DELETE: revocar = set revoked_at, no DELETE real.

comment on table public.api_keys is
  'API keys de usuarios. key_hash = extensions.crypt(raw, gen_salt(''bf'')). Plaintext NUNCA persiste. ADR-009 D8.';
comment on column public.api_keys.key_hash is 'bcrypt hash. Verificación: extensions.crypt(input, key_hash) = key_hash.';
comment on column public.api_keys.key_prefix is 'Primeros 8 chars de la key raw, visible en UI para identificación.';

-- ============================================================
-- Helpers RPC para api_keys (issue + verify)
-- ============================================================
create or replace function public.issue_api_key(
  p_name text,
  p_scopes text[] default '{}',
  p_expires_at timestamptz default null
)
returns table (api_key_id uuid, raw_key text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_raw text;
  v_prefix text;
begin
  v_profile_id := auth.uid();
  if v_profile_id is null then
    raise exception 'issue_api_key: unauthorized';
  end if;

  v_raw := 'dmx_' || encode(extensions.gen_random_bytes(24), 'hex');
  v_prefix := substring(v_raw from 1 for 12);

  insert into public.api_keys (profile_id, name, key_prefix, key_hash, scopes, expires_at)
  values (
    v_profile_id,
    p_name,
    v_prefix,
    extensions.crypt(v_raw, extensions.gen_salt('bf', 10)),
    coalesce(p_scopes, '{}'),
    p_expires_at
  )
  returning id into api_key_id;

  raw_key := v_raw;
  return next;
end;
$$;

revoke execute on function public.issue_api_key(text, text[], timestamptz) from public, anon;
grant execute on function public.issue_api_key(text, text[], timestamptz) to authenticated, service_role;

create or replace function public.verify_api_key(p_raw_key text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_prefix text;
  v_api_key_id uuid;
begin
  if p_raw_key is null or length(p_raw_key) < 12 then
    return null;
  end if;
  v_prefix := substring(p_raw_key from 1 for 12);

  select id into v_api_key_id
  from public.api_keys ak
  where ak.key_prefix = v_prefix
    and ak.revoked_at is null
    and (ak.expires_at is null or ak.expires_at > now())
    and extensions.crypt(p_raw_key, ak.key_hash) = ak.key_hash
  limit 1;

  if v_api_key_id is not null then
    update public.api_keys set last_used_at = now() where id = v_api_key_id;
  end if;
  return v_api_key_id;
end;
$$;

revoke execute on function public.verify_api_key(text) from public, anon, authenticated;
grant execute on function public.verify_api_key(text) to service_role;

comment on function public.issue_api_key(text, text[], timestamptz) is
  'Crea api_key para el caller. Retorna raw_key solo aquí; luego solo el hash persiste.';
comment on function public.verify_api_key(text) is
  'Valida api_key raw vs prefix+bcrypt. Retorna id si válida, null si no. Solo service_role (uso en route handlers).';
