-- F14.F.9 Sprint 8 BIBLIA — extend studio_series_projects con campos canon Sprint 8.
-- template_id (Tarea 8.4), narrative_arc (Tarea 8.1 Claude), visual_consistency_refs (Tarea 8.2 Seedance),
-- music_theme_track_id (Upgrade 2), desarrollo_id (Cross-function 9 ADR-056),
-- public slug + auto_progress (Lateral 7 + Upgrade 1).

alter table public.studio_series_projects
  add column if not exists template_id uuid references public.studio_series_templates(id) on delete set null,
  add column if not exists narrative_arc jsonb not null default '[]'::jsonb,
  add column if not exists visual_consistency_refs text[] not null default '{}',
  add column if not exists music_theme_track_id uuid references public.studio_music_tracks(id) on delete set null,
  add column if not exists desarrollo_id uuid references public.proyectos(id) on delete set null,
  add column if not exists is_published_publicly boolean not null default false,
  add column if not exists public_slug text unique,
  add column if not exists auto_progress_enabled boolean not null default false;

create index if not exists idx_studio_series_projects_desarrollo
  on public.studio_series_projects(desarrollo_id) where desarrollo_id is not null;

create index if not exists idx_studio_series_projects_public_slug
  on public.studio_series_projects(public_slug) where public_slug is not null;

comment on column public.studio_series_projects.template_id is
  'F14.F.9 Sprint 8 — FK a studio_series_templates si serie creada desde template canon.';
comment on column public.studio_series_projects.narrative_arc is
  'F14.F.9 Sprint 8 — Arco narrativo Claude generated. Array de objetos {episode_number, phase, suggested_title, key_visuals}.';
comment on column public.studio_series_projects.visual_consistency_refs is
  'F14.F.9 Sprint 8 Tarea 8.2 — Storage paths de hasta 12 refs visuales para Seedance multi-shot consistency.';
comment on column public.studio_series_projects.desarrollo_id is
  'F14.F.9 Sprint 8 ADR-056 — FK opcional a proyectos M02 Desarrollos cross-function.';
comment on column public.studio_series_projects.public_slug is
  'F14.F.9 Sprint 8 LATERAL 7 — slug unico para /studio/[asesor]/serie/[slug] binge-watch publica.';
comment on column public.studio_series_projects.auto_progress_enabled is
  'F14.F.9 Sprint 8 Upgrade 1 — auto-trigger generar episodio cuando obra avanza fase (cross M02 progress).';
