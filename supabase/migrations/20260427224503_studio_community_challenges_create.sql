-- F14.F.5 Sprint 4 UPGRADE 6 LATERAL — DMX Studio community challenges (Strava Segments).
-- Challenges semanales seed via cron weekly. Asesores participan generando contenido alineado.
-- Public read (todos asesores ven challenge actual) + participations owner-only.

create table public.studio_community_challenges (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  title text not null,
  description text not null,
  challenge_type text not null check (challenge_type in ('content_type','platform','style','theme')),
  target_value text not null,
  participants_count integer not null default 0,
  completers_count integer not null default 0,
  reward_xp integer not null default 50,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_studio_community_challenges_week on public.studio_community_challenges(week_start desc);
create index idx_studio_community_challenges_active on public.studio_community_challenges(is_active) where is_active;

alter table public.studio_community_challenges enable row level security;

create policy studio_community_challenges_select_public on public.studio_community_challenges
  for select to authenticated using (true);

comment on table public.studio_community_challenges is
  'F14.F.5 Sprint 4 UPGRADE 6: weekly challenges Strava Segments style. Public read (intentional_public_authed). Seed via cron studio-challenge-launch lunes 00:00 UTC.';

comment on policy studio_community_challenges_select_public on public.studio_community_challenges is
  'intentional_public_authed: todos asesores autenticados ven challenges activos para participar.';

create table public.studio_challenge_participations (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.studio_community_challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.studio_video_projects(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);

create index idx_studio_challenge_participations_user on public.studio_challenge_participations(user_id);
create index idx_studio_challenge_participations_challenge on public.studio_challenge_participations(challenge_id);

alter table public.studio_challenge_participations enable row level security;

create policy studio_challenge_participations_select_self on public.studio_challenge_participations
  for select to authenticated using (user_id = auth.uid());
create policy studio_challenge_participations_insert_self on public.studio_challenge_participations
  for insert to authenticated with check (user_id = auth.uid());
create policy studio_challenge_participations_update_self on public.studio_challenge_participations
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

comment on table public.studio_challenge_participations is
  'F14.F.5 Sprint 4 UPGRADE 6: participaciones M:N challenges. UNIQUE (challenge_id,user_id) garantiza una participacion por user.';
