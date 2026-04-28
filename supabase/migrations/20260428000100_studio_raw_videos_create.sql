-- F14.F.6 Sprint 5 BIBLIA Tarea 5.1 — DMX Studio raw videos crudos asesor.
-- Asesor graba video propio + Studio limpia con IA (cortes filler/silence/bad_take + auto-chapters).
-- 500MB max; mp4/mov; transcription Deepgram; EDL Claude director.
-- RLS owner-only. ADR-054 DMX Studio dentro DMX único entorno.

create table public.studio_raw_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.studio_video_projects(id) on delete set null,
  source_storage_path text not null,
  file_size_bytes bigint not null check (file_size_bytes between 0 and 524288000),
  duration_seconds numeric(8,2),
  mime_type text not null check (mime_type in ('video/mp4','video/quicktime')),
  audio_extract_storage_path text,
  transcription jsonb,
  transcription_status text not null default 'pending' check (transcription_status in ('pending','processing','completed','failed')),
  edl jsonb,
  chapters jsonb,
  cuts_applied boolean not null default false,
  cleaned_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_studio_raw_videos_user on public.studio_raw_videos(user_id, created_at desc);
create index idx_studio_raw_videos_status on public.studio_raw_videos(transcription_status);
create index idx_studio_raw_videos_project on public.studio_raw_videos(project_id) where project_id is not null;

alter table public.studio_raw_videos enable row level security;

create policy studio_raw_videos_select_self on public.studio_raw_videos
  for select to authenticated using (user_id = auth.uid());
create policy studio_raw_videos_insert_self on public.studio_raw_videos
  for insert to authenticated with check (user_id = auth.uid());
create policy studio_raw_videos_update_self on public.studio_raw_videos
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy studio_raw_videos_delete_self on public.studio_raw_videos
  for delete to authenticated using (user_id = auth.uid());

comment on table public.studio_raw_videos is
  'F14.F.6 Sprint 5 BIBLIA: videos crudos asesor (mp4/mov 500MB max). Pipeline: upload → audio extract FFmpeg → Deepgram nova-3 ES-MX → Claude director EDL filler/silence/bad_take + auto-chapters → FFmpeg cuts apply → cleaned video. RLS owner-only.';
