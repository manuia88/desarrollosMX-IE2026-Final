-- F14.F.5 Sprint 4 UPGRADE 8 LATERAL — DMX Studio AI coach diario.
-- 1 sesion per user per dia. Mood detected desde asesor metrics
-- (low/neutral/high/celebratory) ajusta tono sugerencia. RLS owner-only.

create table public.studio_ai_coach_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_date date not null,
  mood_detected text not null check (mood_detected in ('low','neutral','high','celebratory')),
  suggested_action text not null,
  user_response text,
  completed boolean not null default false,
  dismissed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, session_date)
);

create index idx_studio_ai_coach_sessions_user_date on public.studio_ai_coach_sessions(user_id, session_date desc);

alter table public.studio_ai_coach_sessions enable row level security;

create policy studio_ai_coach_sessions_select_self on public.studio_ai_coach_sessions
  for select to authenticated using (user_id = auth.uid());
create policy studio_ai_coach_sessions_insert_self on public.studio_ai_coach_sessions
  for insert to authenticated with check (user_id = auth.uid());
create policy studio_ai_coach_sessions_update_self on public.studio_ai_coach_sessions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

comment on table public.studio_ai_coach_sessions is
  'F14.F.5 Sprint 4 UPGRADE 8: AI coach diario. UNIQUE (user_id,session_date). mood_detected calculado por features/dmx-studio/lib/calendar/mood-detector.ts.';
