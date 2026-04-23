-- BLOQUE 11.M.-1.1 — Vibe Tags canónicos + relación colonia ↔ tag.
--
-- Contexto: Genoma Colonias SEED (pgvector 64-dim) reutiliza la tabla
-- `colonia_dna_vectors` ya creada en la migration XL 11.A
-- (20260421100000_fase11_xl_dmx_indices_schema.sql). Esta migration sólo
-- añade el catálogo de vibe tags + la tabla de pesos por colonia, que
-- alimentan 10 de las 64 dimensiones del embedding.
--
-- Tablas nuevas:
--   vibe_tags (catálogo — 10 canónicos seed)
--   colonia_vibe_tags (colonia × tag + weight + source)
--
-- Heurística H1 (source='heuristic_v1') es determinística sobre N0-N3 +
-- índices DMX existentes. Reemplazable en FASE 12 N5 (source='llm_v1')
-- sin migración de schema (ADR-022).

-- ============================================================
-- TABLA 1: vibe_tags — catálogo canónico
-- ============================================================
create table if not exists public.vibe_tags (
  id text primary key,
  label_es text not null,
  label_en text not null,
  label_pt text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.vibe_tags enable row level security;

create policy vibe_tags_public_read on public.vibe_tags
  for select
  using (true);

comment on policy vibe_tags_public_read on public.vibe_tags is
  'RATIONALE intentional_public: catálogo canónico de vibe tags es metadata '
  'pública del Genoma Colonias (diferenciador de búsqueda similar).';

create policy vibe_tags_service_write on public.vibe_tags
  for all to service_role
  using (true) with check (true);

-- Seed 10 canónicos H1.
insert into public.vibe_tags (id, label_es, label_en, label_pt, sort_order) values
  ('walkability',       'Caminable',                'Walkable',                'Caminhável',               10),
  ('quiet',             'Tranquila',                'Quiet',                   'Tranquila',                20),
  ('nightlife',         'Vida nocturna',            'Nightlife',               'Vida noturna',             30),
  ('family',            'Familiar',                 'Family-friendly',         'Familiar',                 40),
  ('foodie',            'Foodie',                   'Foodie',                  'Foodie',                   50),
  ('green',             'Verde',                    'Green',                   'Verde',                    60),
  ('bohemian',          'Bohemia',                  'Bohemian',                'Boêmia',                   70),
  ('corporate',         'Corporativa',              'Corporate',               'Corporativa',              80),
  ('safety_perceived',  'Segura',                   'Safe',                    'Segura',                   90),
  ('gentrifying',       'Gentrificando',            'Gentrifying',             'Gentrificando',           100)
on conflict (id) do nothing;

-- ============================================================
-- TABLA 2: colonia_vibe_tags — pesos por colonia
-- ============================================================
create table if not exists public.colonia_vibe_tags (
  colonia_id uuid not null,
  vibe_tag_id text not null references public.vibe_tags(id) on delete cascade,
  weight numeric(5,2) not null check (weight >= 0 and weight <= 100),
  source text not null default 'heuristic_v1',
  computed_at timestamptz not null default now(),
  primary key (colonia_id, vibe_tag_id)
);

create index if not exists colonia_vibe_tags_colonia_idx
  on public.colonia_vibe_tags (colonia_id, weight desc);
create index if not exists colonia_vibe_tags_tag_idx
  on public.colonia_vibe_tags (vibe_tag_id, weight desc);

alter table public.colonia_vibe_tags enable row level security;

create policy colonia_vibe_tags_public_read on public.colonia_vibe_tags
  for select
  using (true);

comment on policy colonia_vibe_tags_public_read on public.colonia_vibe_tags is
  'RATIONALE intentional_public: pesos vibe tags son features del Genoma '
  'público (similarity search + chips en UI); sin PII.';

create policy colonia_vibe_tags_service_write on public.colonia_vibe_tags
  for all to service_role
  using (true) with check (true);

comment on table public.vibe_tags is
  'BLOQUE 11.M: catálogo canónico 10 vibe tags (H1 determinístico + H2 LLM reemplazable ADR-022).';
comment on table public.colonia_vibe_tags is
  'BLOQUE 11.M: pesos 0-100 por colonia × tag; source=heuristic_v1 (H1) → llm_v1 (H2).';
