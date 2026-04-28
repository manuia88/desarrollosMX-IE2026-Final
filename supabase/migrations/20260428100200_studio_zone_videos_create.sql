-- F14.F.8 Sprint 7 BIBLIA — studio_zone_videos (Tarea 7.5).
-- Video de Zona con datos IE DMX integration cross-feature M17 (vía ADR-055).
-- 1 zone_video per studio_video_projects (project owns relation).

create table public.studio_zone_videos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.studio_video_projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  zone_id uuid not null references public.zones(id) on delete restrict,
  zone_name text not null,
  ie_scores_snapshot jsonb not null default '{}'::jsonb,
  market_data jsonb not null default '{}'::jsonb,
  heatmap_storage_path text,
  ai_summary text,
  created_at timestamptz not null default now()
);

create index idx_studio_zone_videos_user on public.studio_zone_videos(user_id);
create index idx_studio_zone_videos_zone on public.studio_zone_videos(zone_id);
create index idx_studio_zone_videos_project on public.studio_zone_videos(project_id);

alter table public.studio_zone_videos enable row level security;

create policy studio_zone_videos_select_self on public.studio_zone_videos
  for select to authenticated
  using (user_id = auth.uid());
create policy studio_zone_videos_select_public_via_gallery on public.studio_zone_videos
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.studio_public_galleries g
      where g.user_id = studio_zone_videos.user_id
        and g.is_active = true
    )
  );
create policy studio_zone_videos_insert_self on public.studio_zone_videos
  for insert to authenticated
  with check (user_id = auth.uid());
create policy studio_zone_videos_update_self on public.studio_zone_videos
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy studio_zone_videos_delete_self on public.studio_zone_videos
  for delete to authenticated
  using (user_id = auth.uid());

comment on table public.studio_zone_videos is
  'F14.F.8 Sprint 7 BIBLIA Tarea 7.5 — Video de Zona con IE DMX integration vía ADR-055.';
comment on policy studio_zone_videos_select_public_via_gallery on public.studio_zone_videos is
  'intentional_public: Lectura pública si asesor tiene galería pública activa (Tarea 7.2 + 7.5).';
