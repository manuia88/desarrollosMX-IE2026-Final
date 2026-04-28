-- F14.F.6 Sprint 5 BIBLIA LATERAL 8 — Highlight reels auto videos > 5min.
-- Claude detecta 3 momentos más impactantes → reel corto adicional auto.
-- 1-3 clips per raw_video. RLS owner-only.

create table public.studio_highlight_reels (
  id uuid primary key default gen_random_uuid(),
  source_raw_video_id uuid not null references public.studio_raw_videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  clip_index integer not null check (clip_index between 1 and 3),
  start_ms integer not null check (start_ms >= 0),
  end_ms integer not null,
  reason text not null,
  reel_storage_path text,
  reel_duration_seconds numeric(6,2),
  status text not null default 'pending' check (status in ('pending','generating','completed','failed')),
  created_at timestamptz not null default now(),
  constraint studio_highlight_reels_window check (end_ms > start_ms),
  unique (source_raw_video_id, clip_index)
);

create index idx_studio_highlight_reels_user on public.studio_highlight_reels(user_id, created_at desc);
create index idx_studio_highlight_reels_video on public.studio_highlight_reels(source_raw_video_id);

alter table public.studio_highlight_reels enable row level security;

create policy studio_highlight_reels_select_self on public.studio_highlight_reels
  for select to authenticated using (user_id = auth.uid());
create policy studio_highlight_reels_insert_self on public.studio_highlight_reels
  for insert to authenticated with check (user_id = auth.uid());
create policy studio_highlight_reels_update_self on public.studio_highlight_reels
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy studio_highlight_reels_delete_self on public.studio_highlight_reels
  for delete to authenticated using (user_id = auth.uid());

comment on table public.studio_highlight_reels is
  'F14.F.6 Sprint 5 LATERAL 8: highlight reels auto videos > 5min. Claude analiza transcripción + EDL → identifica 3 momentos más impactantes (best soundbites). FFmpeg cut clips 15-30s. RLS owner-only.';
