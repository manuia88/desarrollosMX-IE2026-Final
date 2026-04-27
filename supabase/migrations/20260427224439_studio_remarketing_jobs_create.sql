-- F14.F.5 Sprint 4 — DMX Studio remarketing automático cron (Tarea 4.3 BIBLIA v4).
-- Tracking jobs remarketing daily scan. Cron studio-remarketing-scan recorre
-- studio_video_projects status='completed' con DATE > 14d sin remarketing reciente,
-- selecciona angle distinto al último (general → cocina → zona → inversionista → familiar → lujo)
-- y reutiliza video-pipeline F14.F.2. RLS owner-only.

create table public.studio_remarketing_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_project_id uuid not null references public.studio_video_projects(id) on delete cascade,
  new_project_id uuid references public.studio_video_projects(id) on delete set null,
  angle text not null check (angle in ('general','cocina','zona','inversionista','familiar','lujo')),
  status text not null default 'pending' check (status in ('pending','generating','completed','failed')),
  generated_at timestamptz,
  notification_sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create index idx_studio_remarketing_jobs_user_status on public.studio_remarketing_jobs(user_id, status);
create index idx_studio_remarketing_jobs_source on public.studio_remarketing_jobs(source_project_id);
create index idx_studio_remarketing_jobs_created on public.studio_remarketing_jobs(created_at desc);

alter table public.studio_remarketing_jobs enable row level security;

create policy studio_remarketing_jobs_select_self on public.studio_remarketing_jobs
  for select to authenticated using (user_id = auth.uid());
create policy studio_remarketing_jobs_insert_self on public.studio_remarketing_jobs
  for insert to authenticated with check (user_id = auth.uid());
create policy studio_remarketing_jobs_update_self on public.studio_remarketing_jobs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

comment on table public.studio_remarketing_jobs is
  'F14.F.5 Sprint 4 Tarea 4.3: jobs remarketing automatico daily scan. Angle rotation evita feed monoton. cron studio-remarketing-scan en /api/cron/studio-remarketing-scan.';
