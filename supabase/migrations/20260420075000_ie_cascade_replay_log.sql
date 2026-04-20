-- FASE 08 / BLOQUE 8.F.6 — cascade_replay_log.
-- Ref: plan §BLOQUE 8.F prompt v8 F2.
--
-- F2 — Cascade replay/backfill admin tool
--   Permite replay de cascades para rangos fechas / filtros entity
--   (útil: fix bug fórmula → replay últimos 30 días zonas afectadas).
--   Cada replay genera audit entry auditable desde portal admin.

create table if not exists public.cascade_replay_log (
  id uuid primary key default gen_random_uuid(),
  triggered_by uuid references auth.users(id),
  cascade_event text not null,
  target_filter jsonb not null default '{}'::jsonb,
  period_from date,
  period_to date,
  dry_run boolean not null default false,
  jobs_enqueued int not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'started' check (status in ('started','completed','failed')),
  error text
);

comment on table public.cascade_replay_log is
  'F2 — Auditoría de replays manuales de cascades (admin tool). Cada POST '
  '/api/admin/cascades/replay genera entry con filter + conteo jobs + status.';

create index if not exists idx_cascade_replay_log_started
  on public.cascade_replay_log (started_at desc);

alter table public.cascade_replay_log enable row level security;

drop policy if exists cascade_replay_log_service_all on public.cascade_replay_log;
create policy cascade_replay_log_service_all on public.cascade_replay_log
  for all to service_role using (true) with check (true);

drop policy if exists cascade_replay_log_select_superadmin on public.cascade_replay_log;
create policy cascade_replay_log_select_superadmin on public.cascade_replay_log
  for select to authenticated
  using (public.is_superadmin());

comment on policy cascade_replay_log_select_superadmin on public.cascade_replay_log is
  'Solo superadmin puede leer replay log — sensible operacional.';
