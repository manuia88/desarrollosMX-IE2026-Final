-- F14.F.4 Sprint 3 BIBLIA — Listing health scores (UPGRADE 5).
--
-- Pure JS analyzer (zero LLM cost) computa score 0-100 + breakdown 4 dims +
-- suggestions. Asesor ve badge en UrlPreviewCard antes confirmar generate.
--
-- 1:1 con studio_portal_imports.id (UNIQUE constraint).
-- ADR-054 canon: tablas studio_* dentro DMX único entorno.
-- RLS owner-only via portal_import ownership.

create table public.studio_listing_health_scores (
  id uuid primary key default gen_random_uuid(),
  url_import_id uuid not null unique references public.studio_portal_imports(id) on delete cascade,
  score_overall integer not null check (score_overall between 0 and 100),
  score_photos_count integer not null check (score_photos_count between 0 and 100),
  score_description_length integer not null check (score_description_length between 0 and 100),
  score_missing_fields integer not null check (score_missing_fields between 0 and 100),
  score_metadata_quality integer not null check (score_metadata_quality between 0 and 100),
  missing_fields jsonb not null default '[]'::jsonb,
  improvement_suggestions jsonb not null default '[]'::jsonb,
  calculated_at timestamptz not null default now()
);

create index idx_studio_listing_health_scores_import
  on public.studio_listing_health_scores(url_import_id);

create index idx_studio_listing_health_scores_overall
  on public.studio_listing_health_scores(score_overall);

alter table public.studio_listing_health_scores enable row level security;

create policy studio_listing_health_scores_select_self
  on public.studio_listing_health_scores
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.studio_portal_imports pi
      where pi.id = studio_listing_health_scores.url_import_id
        and pi.user_id = auth.uid()
    )
  );

create policy studio_listing_health_scores_insert_self
  on public.studio_listing_health_scores
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.studio_portal_imports pi
      where pi.id = studio_listing_health_scores.url_import_id
        and pi.user_id = auth.uid()
    )
  );

create policy studio_listing_health_scores_update_self
  on public.studio_listing_health_scores
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.studio_portal_imports pi
      where pi.id = studio_listing_health_scores.url_import_id
        and pi.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.studio_portal_imports pi
      where pi.id = studio_listing_health_scores.url_import_id
        and pi.user_id = auth.uid()
    )
  );

comment on table public.studio_listing_health_scores is
  'F14.F.4 Sprint 3 UPGRADE 5: pure JS analyzer scores 0-100 + breakdown 4 dims (photos/description/missing_fields/metadata) + improvement suggestions. RLS via portal_imports ownership.';
comment on column public.studio_listing_health_scores.score_overall is
  'Weighted average de 4 dims. 80-100 excellent / 50-79 good / 0-49 needs improvement.';
comment on column public.studio_listing_health_scores.missing_fields is
  'jsonb array de field names ausentes (ej: ["bathrooms","year_built"]).';
comment on column public.studio_listing_health_scores.improvement_suggestions is
  'jsonb array text suggestions accionables localizadas (ej: "Agrega más fotos: tienes 4, recomendado 10+").';
