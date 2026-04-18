-- Rate limit keyed: user:<uuid> / ip:<ip> / global:<endpoint>
-- FASE 06 / MÓDULO 6.E.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_06_SEGURIDAD_BASELINE.md §6.E + ADR-009 D9
--
-- Añade:
--  - public.api_rate_limits (TEXT key, particionado diario via pg_partman)
--  - public.check_rate_limit(p_key TEXT, p_endpoint TEXT, p_window_sec INT, p_max_calls INT)
--  - public.rate_limit_policies (catálogo endpoint → window/max) documentado para uso en route handlers
--  - check_rate_limit_db(uuid,text,int,int) se mantiene (backward compat; wraps en check_rate_limit).

-- ============================================================
-- Tabla api_rate_limits (keyed, partitioned)
-- ============================================================
create table public.api_rate_limits (
  key text not null,
  endpoint text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, endpoint, window_start)
) partition by range (window_start);

create index idx_arl_endpoint_window on public.api_rate_limits (endpoint, window_start desc);

select public.create_parent(
  p_parent_table := 'public.api_rate_limits',
  p_control      := 'window_start',
  p_interval     := '1 day'
);

alter table public.api_rate_limits enable row level security;

revoke insert, update, delete, select on public.api_rate_limits from authenticated, anon;

comment on table public.api_rate_limits is
  'Rate limit keyed. key = user:<uuid> | ip:<ip> | global:<endpoint>. RLS revoke all; solo SECURITY DEFINER check_rate_limit escribe.';

-- ============================================================
-- check_rate_limit keyed (nueva, recomendada)
-- ============================================================
create or replace function public.check_rate_limit(
  p_key text,
  p_endpoint text,
  p_window_sec int,
  p_max_calls int
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_count int;
begin
  if p_key is null or p_endpoint is null then
    raise exception 'check_rate_limit: key/endpoint no pueden ser null';
  end if;

  v_window := date_trunc('minute', now())
    + ((extract(second from now())::int / greatest(p_window_sec, 1))
       * (greatest(p_window_sec, 1) || ' seconds')::interval);

  insert into public.api_rate_limits (key, endpoint, window_start, count)
  values (p_key, p_endpoint, v_window, 1)
  on conflict (key, endpoint, window_start)
    do update set count = public.api_rate_limits.count + 1
  returning count into v_count;

  return v_count <= p_max_calls;
end;
$$;

revoke execute on function public.check_rate_limit(text, text, int, int) from public, anon;
grant execute on function public.check_rate_limit(text, text, int, int) to authenticated, service_role;

comment on function public.check_rate_limit(text, text, int, int) is
  'Rate limit keyed (user:/ip:/global:). Retorna TRUE si dentro del tope.';

-- ============================================================
-- check_rate_limit_db (backward compat) delega a check_rate_limit
-- ============================================================
create or replace function public.check_rate_limit_db(
  p_user_id uuid,
  p_endpoint text,
  p_window_sec int,
  p_max_calls int
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.check_rate_limit(
    'user:' || coalesce(p_user_id::text, 'anon'),
    p_endpoint,
    p_window_sec,
    p_max_calls
  );
end;
$$;

grant execute on function public.check_rate_limit_db(uuid, text, int, int) to authenticated;

comment on function public.check_rate_limit_db(uuid, text, int, int) is
  'Backward-compat FASE 02. Delega a check_rate_limit con key=''user:<uuid>''.';

-- ============================================================
-- Tabla rate_limit_policies — catálogo de políticas por endpoint
-- (referencia: el enforce vive en route handlers que resuelven la policy antes de check_rate_limit)
-- ============================================================
create table if not exists public.rate_limit_policies (
  endpoint text primary key,
  key_type text not null check (key_type in ('user', 'ip', 'global')),
  window_sec int not null check (window_sec > 0),
  max_calls int not null check (max_calls > 0),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rate_limit_policies enable row level security;

drop policy if exists rlp_select_auth on public.rate_limit_policies;
create policy rlp_select_auth on public.rate_limit_policies
  for select to authenticated
  using (true);

comment on policy rlp_select_auth on public.rate_limit_policies is
  'intentional_public: catálogo de rate limits es configuración de producto, no confidencial.';

drop policy if exists rlp_manage_super on public.rate_limit_policies;
create policy rlp_manage_super on public.rate_limit_policies
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

create trigger trg_rlp_updated_at
  before update on public.rate_limit_policies
  for each row execute function public.set_updated_at();

-- Seed de políticas H1 (ajustables en FASE 22+ con datos reales)
insert into public.rate_limit_policies (endpoint, key_type, window_sec, max_calls, description) values
  ('auth.signup', 'ip', 600, 3, 'FASE 06 §6.E: 3 signups / 10 min per IP'),
  ('auth.password-reset', 'ip', 3600, 5, '5 resets / hora per IP'),
  ('auth.sms-otp', 'ip', 60, 5, '5 SMS OTP / min per IP'),
  ('ai.copilot', 'user', 60, 60, '60 msg/min per user'),
  ('ai.stream', 'user', 60, 30, '30 streams/min per user'),
  ('public.default', 'ip', 60, 100, 'Fallback público 100/min per IP'),
  ('global.default', 'global', 60, 10000, 'Tope global 10k req/min per endpoint')
on conflict (endpoint) do update set
  key_type = excluded.key_type,
  window_sec = excluded.window_sec,
  max_calls = excluded.max_calls,
  description = excluded.description,
  updated_at = now();
