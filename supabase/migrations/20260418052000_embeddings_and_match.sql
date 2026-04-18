-- Tabla `embeddings` + función match_embeddings (RAG scaffold)
-- FASE 03 / MÓDULO 3.G.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_03_AI_NATIVE_SHELL.md §3.G.1

create table public.embeddings (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) references public.countries(code),
  source_type text not null,
  source_id uuid not null,
  chunk_index smallint not null default 0,
  content text not null,
  embedding vector(1536) not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_type, source_id, chunk_index)
);

create index idx_emb_source on public.embeddings (source_type, source_id);
create index idx_emb_country on public.embeddings (country_code);
create index idx_emb_vec
  on public.embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table public.embeddings enable row level security;

-- ============================================================
-- RLS: SELECT por country del user + superadmin. Escritura solo service_role
-- (pipelines de indexado en FASES 07+ y jobs biblia).
-- ============================================================
create policy embeddings_select_country on public.embeddings
  for select to authenticated
  using (
    public.is_superadmin()
    or country_code is null
    or country_code in (
      select country_code from public.profiles where id = auth.uid()
    )
  );

revoke insert, update, delete on public.embeddings from authenticated, anon;

-- ============================================================
-- match_embeddings: búsqueda por cosine similarity con filtros opcionales
-- por source_types y country_code. SECURITY INVOKER respeta RLS.
-- ============================================================
create or replace function public.match_embeddings(
  p_embedding vector(1536),
  p_source_types text[] default null,
  p_country_code char(2) default null,
  p_match_count int default 10,
  p_min_similarity real default 0.7
) returns table (
  id uuid,
  source_type text,
  source_id uuid,
  content text,
  similarity real,
  meta jsonb
)
language sql
stable
security invoker
as $$
  select e.id, e.source_type, e.source_id, e.content,
         (1 - (e.embedding <=> p_embedding))::real as similarity,
         e.meta
    from public.embeddings e
   where (p_source_types is null or e.source_type = any(p_source_types))
     and (p_country_code is null or e.country_code = p_country_code)
     and 1 - (e.embedding <=> p_embedding) >= p_min_similarity
   order by e.embedding <=> p_embedding
   limit p_match_count;
$$;

grant execute on function public.match_embeddings(vector, text[], char, int, real) to authenticated;

comment on table public.embeddings is
  'Tabla genérica de embeddings RAG. source_type ∈ {project|unit|captacion|score|biblia_doc|user_memory|...}.';
