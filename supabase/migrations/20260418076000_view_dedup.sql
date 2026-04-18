-- view_dedup + register_view — anti-abuse de vistas
-- FASE 06 / MÓDULO 6.J.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_06_SEGURIDAD_BASELINE.md §6.J

create table public.view_dedup (
  entity_type text not null,
  entity_id uuid not null,
  dedup_key text not null,                  -- hash(session_id + user_id) o hash(ip + user_agent)
  viewed_at timestamptz not null default now(),
  primary key (entity_type, entity_id, dedup_key, viewed_at)
);

create index idx_view_dedup_recent
  on public.view_dedup (entity_type, entity_id, dedup_key, viewed_at desc);

alter table public.view_dedup enable row level security;

drop policy if exists view_dedup_read_super on public.view_dedup;
create policy view_dedup_read_super on public.view_dedup
  for select to authenticated
  using (public.is_superadmin());

-- No INSERT policy para usuarios: escritura solo via register_view (SECURITY DEFINER).

comment on table public.view_dedup is
  'Anti-abuse genérico. Inserción via register_view(entity_type, entity_id, dedup_key) con ventana 30 min.';

-- ============================================================
-- register_view — inserta solo si no hubo vista en los últimos 30 min con misma dedup_key
-- ============================================================
create or replace function public.register_view(
  p_entity_type text,
  p_entity_id uuid,
  p_dedup_key text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exists boolean;
begin
  if p_entity_type is null or p_entity_id is null or p_dedup_key is null then
    return false;
  end if;

  select exists (
    select 1 from public.view_dedup
    where entity_type = p_entity_type
      and entity_id = p_entity_id
      and dedup_key = p_dedup_key
      and viewed_at > now() - interval '30 minutes'
  ) into v_exists;

  if v_exists then
    return false;
  end if;

  insert into public.view_dedup (entity_type, entity_id, dedup_key)
  values (p_entity_type, p_entity_id, p_dedup_key);

  return true;
end;
$$;

revoke execute on function public.register_view(text, uuid, text) from public, anon;
grant execute on function public.register_view(text, uuid, text) to authenticated, service_role;

comment on function public.register_view(text, uuid, text) is
  'Registra una vista solo si no hubo vista en 30 min con el mismo dedup_key. Retorna true si se insertó.';

-- REVOKE DELETE: la tabla es append-only para trazabilidad (se puede prunar con job cron +90d en FASE 24).
revoke delete on public.view_dedup from authenticated, anon;
