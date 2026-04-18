-- rate_limit_log particionado por día (pg_partman v5) + check_rate_limit_db()
-- FASE 02 / MÓDULO 2.H.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_02_AUTH_Y_PERMISOS.md §2.H.1

-- ============================================================
-- Tabla parent: PARTITION BY RANGE (window_start).
-- PK compuesta incluye columna de partición (Postgres requirement).
-- ============================================================
create table public.rate_limit_log (
  user_id uuid not null,
  endpoint text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (user_id, endpoint, window_start)
) partition by range (window_start);

create index idx_rll_endpoint_window on public.rate_limit_log (endpoint, window_start desc);

-- ============================================================
-- Particionamiento diario vía pg_partman v5 (sintaxis moderna: '1 day')
-- ============================================================
select public.create_parent(
  p_parent_table := 'public.rate_limit_log',
  p_control      := 'window_start',
  p_interval     := '1 day'
);

-- ============================================================
-- RLS — solo service_role (SECURITY DEFINER helpers) puede leer/escribir.
-- Sin policies para authenticated/anon → RLS bloquea por default.
-- ============================================================
alter table public.rate_limit_log enable row level security;

revoke insert, update, delete, select on public.rate_limit_log from authenticated, anon;

-- ============================================================
-- check_rate_limit_db
-- Crea/incrementa la fila dentro de la ventana actual y devuelve si el
-- contador no ha superado el tope.
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
declare
  v_window timestamptz;
  v_count int;
begin
  -- Ventana anclada al minuto + buckets de p_window_sec dentro del minuto.
  -- Para p_window_sec=60 → bucket = minuto exacto.
  v_window := date_trunc('minute', now())
              + ((extract(second from now())::int / p_window_sec)
                 * (p_window_sec || ' seconds')::interval);

  insert into public.rate_limit_log (user_id, endpoint, window_start, count)
  values (p_user_id, p_endpoint, v_window, 1)
  on conflict (user_id, endpoint, window_start)
    do update set count = public.rate_limit_log.count + 1
  returning count into v_count;

  return v_count <= p_max_calls;
end;
$$;

grant execute on function public.check_rate_limit_db(uuid, text, int, int) to authenticated;

comment on function public.check_rate_limit_db(uuid, text, int, int) is
  'Rate limit por (user_id, endpoint) con ventana temporal. Retorna TRUE si la llamada está dentro del tope. SECURITY DEFINER + search_path="".';
