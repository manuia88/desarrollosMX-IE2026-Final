-- F14.F.5 Sprint 4 UPGRADE 3 — DMX Studio streaks gamification (Duolingo+Strava style).
-- 1 row por user con tracking racha consecutiva dias generando contenido.
-- Badges canon: streak_7, streak_30, streak_100, streak_365.
-- recordActivity(userId) trigger desde studio_video_projects INSERT.
-- RLS owner-only.

create table public.studio_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  current_streak_days integer not null default 0,
  longest_streak_days integer not null default 0,
  last_activity_date date,
  badges_unlocked text[] not null default array[]::text[],
  total_videos_generated integer not null default 0,
  updated_at timestamptz not null default now()
);

create index idx_studio_streaks_current on public.studio_streaks(current_streak_days desc);
create index idx_studio_streaks_longest on public.studio_streaks(longest_streak_days desc);

alter table public.studio_streaks enable row level security;

create policy studio_streaks_select_self on public.studio_streaks
  for select to authenticated using (user_id = auth.uid());
create policy studio_streaks_insert_self on public.studio_streaks
  for insert to authenticated with check (user_id = auth.uid());
create policy studio_streaks_update_self on public.studio_streaks
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger trg_studio_streaks_updated_at
  before update on public.studio_streaks
  for each row execute function public.set_updated_at();

comment on table public.studio_streaks is
  'F14.F.5 Sprint 4 UPGRADE 3: gamification streaks Duolingo+Strava style. badges_unlocked text[] (streak_7/30/100/365). Update vía recordActivity() en cada studio_video_projects INSERT.';
