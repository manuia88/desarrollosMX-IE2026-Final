-- F14.F.7 Sprint 6 BIBLIA v4 §6 — Seedance video con audio ambiente nativo (Tarea 6.1).
-- DMX Studio dentro DMX único entorno (ADR-054). Tabla studio_seedance_clips.

create table public.studio_seedance_clips (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_video_projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset_id uuid references public.studio_video_assets(id) on delete set null,
  prompt text not null,
  audio_context text check (audio_context in (
    'kitchen','outdoor_garden','urban_downtown','ocean_view','fireplace_cozy',
    'park_kids','rooftop_wind','pool_water','rain_window','cafe_chatter',
    'forest_morning','office_open','auto'
  )),
  duration_seconds numeric(6,2) not null default 5.0 check (duration_seconds between 1 and 30),
  resolution text not null default '1080p' check (resolution in ('720p','1080p','4k')),
  storage_path text,
  has_native_audio boolean not null default true,
  cost_usd numeric(8,4),
  fal_request_id text,
  status text not null default 'pending' check (status in ('pending','submitted','processing','completed','failed')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_studio_seedance_clips_user on public.studio_seedance_clips(user_id);
create index idx_studio_seedance_clips_project on public.studio_seedance_clips(project_id);
create index idx_studio_seedance_clips_status on public.studio_seedance_clips(status);
create index idx_studio_seedance_clips_fal_request on public.studio_seedance_clips(fal_request_id) where fal_request_id is not null;

alter table public.studio_seedance_clips enable row level security;

create policy studio_seedance_clips_select_self
  on public.studio_seedance_clips for select to authenticated
  using (user_id = auth.uid());
create policy studio_seedance_clips_insert_self
  on public.studio_seedance_clips for insert to authenticated
  with check (user_id = auth.uid());
create policy studio_seedance_clips_update_self
  on public.studio_seedance_clips for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy studio_seedance_clips_delete_self
  on public.studio_seedance_clips for delete to authenticated
  using (user_id = auth.uid());
