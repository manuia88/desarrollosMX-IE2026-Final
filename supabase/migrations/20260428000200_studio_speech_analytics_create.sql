-- F14.F.6 Sprint 5 BIBLIA LATERAL 6+7 — Speech analytics asesor.
-- WPM + filler ratio + bad takes + sentiment + clarity score per raw video.
-- Benchmarks vs top inmobiliarios canon (160-180 WPM, <2% filler, 80+ clarity).
-- RLS owner-only.

create table public.studio_speech_analytics (
  id uuid primary key default gen_random_uuid(),
  raw_video_id uuid not null unique references public.studio_raw_videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  words_per_minute numeric(6,2),
  filler_count integer not null default 0 check (filler_count >= 0),
  filler_ratio_pct numeric(5,2) check (filler_ratio_pct between 0 and 100),
  bad_takes_count integer not null default 0 check (bad_takes_count >= 0),
  sentiment text check (sentiment in ('positive','neutral','negative','mixed')),
  clarity_score integer check (clarity_score between 0 and 100),
  top_fillers jsonb,
  calculated_at timestamptz not null default now()
);

create index idx_studio_speech_analytics_user on public.studio_speech_analytics(user_id, calculated_at desc);

alter table public.studio_speech_analytics enable row level security;

create policy studio_speech_analytics_select_self on public.studio_speech_analytics
  for select to authenticated using (user_id = auth.uid());
create policy studio_speech_analytics_insert_self on public.studio_speech_analytics
  for insert to authenticated with check (user_id = auth.uid());
create policy studio_speech_analytics_update_self on public.studio_speech_analytics
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy studio_speech_analytics_delete_self on public.studio_speech_analytics
  for delete to authenticated using (user_id = auth.uid());

comment on table public.studio_speech_analytics is
  'F14.F.6 Sprint 5 LATERAL 6+7: speech analytics per raw video. WPM + filler ratio + clarity 0-100 + sentiment + top_fillers jsonb. Benchmarks top inmobiliarios canon: 160-180 WPM, <2% filler, 80+ clarity. RLS owner-only.';
