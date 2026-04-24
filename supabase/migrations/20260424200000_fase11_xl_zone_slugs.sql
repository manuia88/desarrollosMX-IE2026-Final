-- FASE 11 XL — BLOQUE 11.S Living Atlas — zone_slugs + wiki RLS relax.
--
-- Contexto: H1 no tiene tabla master `zones` (zone_id es UUID referenced
-- libre en zona_snapshots / colonia_dna_vectors / colonia_wiki_entries /
-- etc.). El founder requiere slugs SEO únicos por zona para URLs
-- /atlas/<coloniaSlug>. La opción escalable / desacoplada / versionable
-- (memoria feedback arquitectura_escalable_desacoplada) es una tabla
-- normalizada `zone_slugs` con 1:1 zone_id ↔ slug en lugar de añadir la
-- columna a múltiples tablas.
--
-- Cambios:
--   1. Nueva tabla public.zone_slugs (RLS enabled + policies).
--   2. Alter policy colonia_wiki_public_read para dropear reviewed=true
--      (decision D2 founder: seed H1 = published=true + reviewed=false,
--      workflow editorial reviewed=true agendado FASE 12 N5 L-NEW8).
--
-- Audit allowlist v25 llega en migration separada (20260424200100).

-- ============================================================
-- TABLA: zone_slugs — 1:1 zone_id ↔ slug para URLs SEO
-- ============================================================
create table if not exists public.zone_slugs (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null unique,
  scope_type text not null check (scope_type in ('colonia','alcaldia','city','estado')),
  slug text not null unique,
  country_code char(2) not null default 'MX' references public.countries(code),
  source_label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(slug) between 1 and 80),
  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index if not exists zone_slugs_slug_idx
  on public.zone_slugs (slug);
create index if not exists zone_slugs_zone_idx
  on public.zone_slugs (zone_id);
create index if not exists zone_slugs_scope_idx
  on public.zone_slugs (scope_type, country_code);

alter table public.zone_slugs enable row level security;

create policy zone_slugs_public_read on public.zone_slugs
  for select
  using (true);

comment on policy zone_slugs_public_read on public.zone_slugs is
  'RATIONALE intentional_public: slug ↔ zone_id mapping es directorio '
  'público — URL resolver del Living Atlas requiere lookup anónimo por '
  'slug para routing SEO (/atlas/<coloniaSlug>). Sin PII expuesto.';

create policy zone_slugs_service_write on public.zone_slugs
  for all to service_role
  using (true) with check (true);

comment on table public.zone_slugs is
  'FASE 11 XL BLOQUE 11.S — slug ↔ zone_id directory para Living Atlas. '
  'Tabla normalizada decoupled (no columna en zones — no existe master table). '
  'Slug kebab-case lowercase max 80 chars. Backfill via scripts/seed-living-atlas-wiki.ts.';

-- ============================================================
-- RELAX colonia_wiki_public_read — drop reviewed=true requirement
-- ============================================================
-- Decision founder 2026-04-24: seed 200 colonias H1 genera content via
-- Claude Haiku 4.5. Queremos visibilidad inmediata (published=true) pero
-- sin gate editorial humano todavía (reviewed=false). Workflow editorial
-- con moderadores humanos agendado L-NEW8 → FASE 12 N5.
drop policy if exists colonia_wiki_public_read on public.colonia_wiki_entries;

create policy colonia_wiki_public_read on public.colonia_wiki_entries
  for select
  using (published = true);

comment on policy colonia_wiki_public_read on public.colonia_wiki_entries is
  'RATIONALE intentional_public: entradas published=true son contenido '
  'Wikipedia-style visible post-seed LLM H1. Gate reviewed=true queda '
  'reservado L-NEW8 FASE 12 N5 (editor rico + moderación humana). '
  'Borradores (published=false) siguen restringidos a service_role.';

-- ============================================================
-- Close
-- ============================================================
comment on schema public is
  'FASE 11 XL — 21 tablas indices + zone_slugs (11.S) + wiki RLS relax.';
