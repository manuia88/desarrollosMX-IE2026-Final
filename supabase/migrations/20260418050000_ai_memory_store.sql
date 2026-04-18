-- ai_memory_store: memoria persistente por usuario + pgvector
-- FASE 03 / MÓDULO 3.B.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_03_AI_NATIVE_SHELL.md §3.B.1
-- Fallback local a Anthropic Memory API cuando ANTHROPIC_MEMORY_BETA no activo.

create table public.ai_memory_store (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  namespace text not null,
  key text not null,
  value jsonb not null,
  embedding vector(1536),
  importance_score real not null default 0.5 check (importance_score >= 0 and importance_score <= 1),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, namespace, key)
);

create index idx_memory_namespace on public.ai_memory_store (user_id, namespace, key);
create index idx_memory_user_recent on public.ai_memory_store (user_id, updated_at desc);
create index idx_memory_embedding
  on public.ai_memory_store
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create trigger trg_ai_memory_store_updated_at
  before update on public.ai_memory_store
  for each row execute function public.set_updated_at();

alter table public.ai_memory_store enable row level security;

create policy ai_memory_store_select_self on public.ai_memory_store
  for select to authenticated
  using (user_id = auth.uid() or public.is_superadmin());

create policy ai_memory_store_insert_self on public.ai_memory_store
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_superadmin());

create policy ai_memory_store_update_self on public.ai_memory_store
  for update to authenticated
  using (user_id = auth.uid() or public.is_superadmin())
  with check (user_id = auth.uid() or public.is_superadmin());

create policy ai_memory_store_delete_self on public.ai_memory_store
  for delete to authenticated
  using (user_id = auth.uid() or public.is_superadmin());

-- ============================================================
-- match_ai_memory: cosine similarity search dentro del namespace del caller.
-- SECURITY INVOKER → respeta RLS del usuario.
-- ============================================================
create or replace function public.match_ai_memory(
  p_namespace text,
  p_embedding vector(1536),
  p_match_count int default 10,
  p_min_similarity real default 0.6
) returns table (
  id uuid,
  key text,
  value jsonb,
  importance_score real,
  similarity real,
  updated_at timestamptz
)
language sql
stable
security invoker
as $$
  select m.id, m.key, m.value, m.importance_score,
         (1 - (m.embedding <=> p_embedding))::real as similarity,
         m.updated_at
    from public.ai_memory_store m
   where m.namespace = p_namespace
     and m.embedding is not null
     and (m.expires_at is null or m.expires_at > now())
     and 1 - (m.embedding <=> p_embedding) >= p_min_similarity
   order by m.embedding <=> p_embedding
   limit p_match_count;
$$;

grant execute on function public.match_ai_memory(text, vector, int, real) to authenticated;

comment on table public.ai_memory_store is
  'Memoria persistente local (fallback de Anthropic Memory API). Scopes via namespace: user:<uuid>, project:<uuid>, session:<uuid>.';
