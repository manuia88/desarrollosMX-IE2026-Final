-- F14.F.9 Sprint 8 BIBLIA Tarea 8.1 — studio_series_episodes
-- Episodios individuales de una serie documental. Cada episodio = 1 studio_video_project (FK opcional).
-- RLS owner-only via series ownership.

create table public.studio_series_episodes (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.studio_series_projects(id) on delete cascade,
  project_id uuid unique references public.studio_video_projects(id) on delete set null,
  episode_number integer not null check (episode_number > 0),
  title text not null,
  description text,
  narrative_phase text check (narrative_phase in ('planificacion','construccion','acabados','amenidades','entrega','custom')),
  real_progress_pct numeric(5,2) check (real_progress_pct is null or (real_progress_pct >= 0 and real_progress_pct <= 100)),
  shoot_recommended_date date,
  shoot_completed_date date,
  status text not null default 'pending'
    check (status in ('pending','recommended','in_progress','published','archived')),
  guest_avatars jsonb not null default '[]'::jsonb,
  title_card_storage_path text,
  music_track_id uuid references public.studio_music_tracks(id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (series_id, episode_number)
);

create index idx_studio_series_episodes_series on public.studio_series_episodes(series_id);
create index idx_studio_series_episodes_status on public.studio_series_episodes(status);
create index idx_studio_series_episodes_project on public.studio_series_episodes(project_id);

alter table public.studio_series_episodes enable row level security;

create policy studio_series_episodes_select_self on public.studio_series_episodes
  for select to authenticated
  using (exists (
    select 1 from public.studio_series_projects sp
    where sp.id = studio_series_episodes.series_id
      and sp.user_id = auth.uid()
  ));

create policy studio_series_episodes_insert_self on public.studio_series_episodes
  for insert to authenticated
  with check (exists (
    select 1 from public.studio_series_projects sp
    where sp.id = studio_series_episodes.series_id
      and sp.user_id = auth.uid()
  ));

create policy studio_series_episodes_update_self on public.studio_series_episodes
  for update to authenticated
  using (exists (
    select 1 from public.studio_series_projects sp
    where sp.id = studio_series_episodes.series_id
      and sp.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.studio_series_projects sp
    where sp.id = studio_series_episodes.series_id
      and sp.user_id = auth.uid()
  ));

create policy studio_series_episodes_delete_self on public.studio_series_episodes
  for delete to authenticated
  using (exists (
    select 1 from public.studio_series_projects sp
    where sp.id = studio_series_episodes.series_id
      and sp.user_id = auth.uid()
  ));

create trigger trg_studio_series_episodes_updated_at
  before update on public.studio_series_episodes
  for each row execute function public.set_updated_at();

comment on table public.studio_series_episodes is
  'F14.F.9 Sprint 8 BIBLIA Tarea 8.1 — episodios individuales de serie documental. RLS owner-only via series ownership. status canon: pending/recommended/in_progress/published/archived.';
