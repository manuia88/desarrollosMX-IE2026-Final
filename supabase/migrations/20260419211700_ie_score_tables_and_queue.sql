-- IE score tables + recalculation queue + pg_partman score_history + helpers.
-- FASE 08 / BLOQUE 8.A / MÓDULO 8.A.3
-- Refs:
--   docs/02_PLAN_MAESTRO/FASE_08_IE_SCORES_N0.md §8.A.3
--   docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D5/D6/D7
--   docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md (RLS misma migration)
-- Upgrades v2:
--   U2 — score_history PARTITION BY RANGE (archived_at) mensual desde 2026-04-01,
--         retention 60 meses vía pg_partman.
--   U4 — columna provenance jsonb NOT NULL DEFAULT '{}'::jsonb en las 4 tablas.

-- ============================================================
-- score_recalculation_queue — cola de recálculo con dedup + priority
-- ============================================================
create table if not exists public.score_recalculation_queue (
  id uuid primary key default gen_random_uuid(),
  score_id text not null,
  entity_type text not null check (entity_type in ('zone','project','user','market')),
  entity_id uuid not null,
  country_code char(2) not null references public.countries(code),
  triggered_by text not null,
  priority int not null default 5 check (priority between 1 and 10),
  batch_mode boolean not null default false,
  status text not null default 'pending' check (status in ('pending','processing','done','error')),
  error text,
  attempts int not null default 0,
  scheduled_for timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

-- Dedup: impide 2 filas activas (pending|processing) para el mismo
-- (score, entity, country). Partial unique index.
create unique index if not exists idx_queue_dedup_active
  on public.score_recalculation_queue (score_id, entity_type, entity_id, country_code)
  where status in ('pending', 'processing');

-- Query del worker: ORDER BY priority ASC, scheduled_for ASC + status='pending'.
create index if not exists idx_queue_pending_priority
  on public.score_recalculation_queue (status, priority, scheduled_for)
  where status = 'pending';

create index if not exists idx_queue_status_finished
  on public.score_recalculation_queue (status, finished_at desc);

alter table public.score_recalculation_queue enable row level security;

create policy queue_service_all on public.score_recalculation_queue
  for all to service_role using (true) with check (true);

comment on table public.score_recalculation_queue is
  'Cola IE de recálculo de scores. Dedup por (score_id, entity, country) en estados activos. '
  'Worker /api/cron/score-worker procesa cada 1 min con SKIP LOCKED.';

-- ============================================================
-- zone_scores — scores a nivel zona (colonia)
-- ============================================================
create table if not exists public.zone_scores (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null,
  country_code char(2) not null references public.countries(code),
  score_type text not null,
  score_value numeric(8, 3) not null,
  score_label text,
  level smallint not null check (level between 0 and 5),
  tier smallint not null check (tier between 1 and 4),
  confidence text not null check (confidence in ('high','medium','low','insufficient_data')),
  components jsonb not null default '{}'::jsonb,
  inputs_used jsonb not null default '{}'::jsonb,
  citations jsonb not null default '[]'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  trend_vs_previous numeric(8, 3),
  trend_direction text check (trend_direction in ('mejorando','estable','empeorando')),
  period_date date not null,
  computed_at timestamptz not null default now(),
  unique (zone_id, score_type, period_date)
);

create index if not exists idx_zone_scores_type_period
  on public.zone_scores (score_type, period_date desc);
create index if not exists idx_zone_scores_zone on public.zone_scores (zone_id);
create index if not exists idx_zone_scores_country on public.zone_scores (country_code);

alter table public.zone_scores enable row level security;

create policy zone_scores_service on public.zone_scores
  for all to service_role using (true) with check (true);

create policy zone_scores_select_internal on public.zone_scores
  for select to authenticated using (true);

comment on table public.zone_scores is
  'Scores IE por zona. UPSERT por (zone_id, score_type, period_date). '
  'Columna provenance jsonb NOT NULL (U4 v2). '
  'UPDATE dispara archive_score_before_update → score_history.';

-- ============================================================
-- project_scores — scores a nivel proyecto
-- ============================================================
create table if not exists public.project_scores (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  country_code char(2) not null references public.countries(code),
  score_type text not null,
  score_value numeric(8, 3) not null,
  score_label text,
  level smallint not null check (level between 0 and 5),
  tier smallint not null check (tier between 1 and 4),
  confidence text not null check (confidence in ('high','medium','low','insufficient_data')),
  components jsonb not null default '{}'::jsonb,
  inputs_used jsonb not null default '{}'::jsonb,
  citations jsonb not null default '[]'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  trend_vs_previous numeric(8, 3),
  trend_direction text check (trend_direction in ('mejorando','estable','empeorando')),
  period_date date not null,
  computed_at timestamptz not null default now(),
  unique (project_id, score_type, period_date)
);

create index if not exists idx_project_scores_type_period
  on public.project_scores (score_type, period_date desc);
create index if not exists idx_project_scores_project on public.project_scores (project_id);

alter table public.project_scores enable row level security;

create policy project_scores_service on public.project_scores
  for all to service_role using (true) with check (true);

create policy project_scores_select_internal on public.project_scores
  for select to authenticated using (true);

comment on table public.project_scores is
  'Scores IE por proyecto. Provenance jsonb NOT NULL (U4). '
  'Trigger archive_score_before_update → score_history.';

-- ============================================================
-- user_scores — scores a nivel usuario (afinidad / personalización)
-- ============================================================
create table if not exists public.user_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  country_code char(2) not null references public.countries(code),
  score_type text not null,
  score_value numeric(8, 3) not null,
  score_label text,
  level smallint not null check (level between 0 and 5),
  tier smallint not null check (tier between 1 and 4),
  confidence text not null check (confidence in ('high','medium','low','insufficient_data')),
  components jsonb not null default '{}'::jsonb,
  inputs_used jsonb not null default '{}'::jsonb,
  citations jsonb not null default '[]'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  trend_vs_previous numeric(8, 3),
  trend_direction text check (trend_direction in ('mejorando','estable','empeorando')),
  period_date date not null,
  computed_at timestamptz not null default now(),
  unique (user_id, score_type, period_date)
);

create index if not exists idx_user_scores_type_period
  on public.user_scores (score_type, period_date desc);
create index if not exists idx_user_scores_user on public.user_scores (user_id);

alter table public.user_scores enable row level security;

create policy user_scores_service on public.user_scores
  for all to service_role using (true) with check (true);

-- Self-read: cada usuario lee solo sus propios scores.
create policy user_scores_self_select on public.user_scores
  for select to authenticated using (user_id = auth.uid());

comment on table public.user_scores is
  'Scores IE por usuario (ej. H14 Buyer Persona). Provenance jsonb NOT NULL (U4). '
  'Self-read policy: user_id = auth.uid().';

-- ============================================================
-- score_history — historial append-only particionado mensual (U2 pg_partman)
-- ============================================================
create table if not exists public.score_history (
  id bigint generated always as identity,
  archived_at timestamptz not null default now(),
  entity_type text not null check (entity_type in ('zone','project','user','market')),
  entity_id uuid not null,
  country_code char(2) not null references public.countries(code),
  score_type text not null,
  score_value numeric(8, 3) not null,
  score_label text,
  level smallint not null,
  tier smallint not null,
  confidence text not null,
  components jsonb not null default '{}'::jsonb,
  inputs_used jsonb not null default '{}'::jsonb,
  citations jsonb not null default '[]'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  period_date date not null,
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  primary key (id, archived_at)
) partition by range (archived_at);

create index if not exists idx_score_history_entity
  on public.score_history (entity_type, entity_id, score_type, archived_at desc);
create index if not exists idx_score_history_archived_brin
  on public.score_history using brin (archived_at);

-- pg_partman v5: crea partition set mensual.
select public.create_parent(
  p_parent_table := 'public.score_history',
  p_control      := 'archived_at',
  p_interval     := '1 month'
);

-- Retention 60 meses (compliance + valor analítico — ADR-010 §D6).
-- Premake 12 meses — cumple criterio U2 "≥12 particiones 2026-04..2027-03".
update public.part_config
   set retention = '60 months',
       retention_keep_table = false,
       premake = 12
 where parent_table = 'public.score_history';

-- pg_partman v5 crea premake=N particiones FUTURAS. Para cubrir el año
-- entero 2026-04 .. 2027-04 desde el start de H1, creamos explícitamente
-- los meses faltantes. Idempotente: partitions existentes se ignoran.
do $$
declare
  d date;
begin
  for d in select generate_series('2026-09-01'::date, '2027-04-01'::date, interval '1 month')::date
  loop
    begin
      perform public.create_partition_time('public.score_history', array[d::timestamptz]);
    exception when others then
      null; -- partition ya existe o creada por premake
    end;
  end loop;
end $$;

alter table public.score_history enable row level security;

create policy score_history_no_delete on public.score_history
  for delete using (false);

create policy score_history_service_all on public.score_history
  for all to service_role using (true) with check (true);

comment on table public.score_history is
  'Histórico append-only de scores IE. Particionada mensual (U2 pg_partman, retention 60m). '
  'Trigger archive_score_before_update inserta fila anterior en BEFORE UPDATE. '
  'Provenance preservado (U4) para auditoría temporal.';

-- ============================================================
-- enqueue_score_recalc — RPC de encolado con dedup transparente
-- ============================================================
create or replace function public.enqueue_score_recalc(
  p_score_id text,
  p_entity_type text,
  p_entity_id uuid,
  p_country text,
  p_triggered_by text,
  p_priority int default 5,
  p_batch boolean default false,
  p_scheduled_for timestamptz default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.score_recalculation_queue (
    score_id, entity_type, entity_id, country_code, triggered_by,
    priority, batch_mode, scheduled_for
  )
  values (
    p_score_id, p_entity_type, p_entity_id, p_country, p_triggered_by,
    p_priority, p_batch, coalesce(p_scheduled_for, now())
  )
  on conflict do nothing
  returning id into v_id;

  return jsonb_build_object(
    'enqueued', v_id is not null,
    'id', v_id
  );
end;
$$;

grant execute on function public.enqueue_score_recalc to service_role;

comment on function public.enqueue_score_recalc is
  'Encola recálculo de score con dedup vía partial unique index '
  '(solo rows pending|processing). Retorna {enqueued: bool, id: uuid}.';

-- ============================================================
-- archive_score_before_update — trigger BEFORE UPDATE en las 3 tablas
-- Inserta la fila anterior en score_history preservando provenance (U4).
-- ============================================================
create or replace function public.archive_score_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_type text;
  v_entity_id uuid;
begin
  if TG_TABLE_NAME = 'zone_scores' then
    v_entity_type := 'zone';
    v_entity_id := OLD.zone_id;
  elsif TG_TABLE_NAME = 'project_scores' then
    v_entity_type := 'project';
    v_entity_id := OLD.project_id;
  elsif TG_TABLE_NAME = 'user_scores' then
    v_entity_type := 'user';
    v_entity_id := OLD.user_id;
  else
    return NEW;
  end if;

  insert into public.score_history (
    archived_at, entity_type, entity_id, country_code, score_type,
    score_value, score_label, level, tier, confidence,
    components, inputs_used, citations, provenance,
    period_date, valid_from, valid_until
  ) values (
    now(), v_entity_type, v_entity_id, OLD.country_code, OLD.score_type,
    OLD.score_value, OLD.score_label, OLD.level, OLD.tier, OLD.confidence,
    OLD.components, OLD.inputs_used, OLD.citations, OLD.provenance,
    OLD.period_date, OLD.computed_at, now()
  );

  return NEW;
end;
$$;

drop trigger if exists trg_zone_scores_archive on public.zone_scores;
create trigger trg_zone_scores_archive
  before update on public.zone_scores
  for each row execute function public.archive_score_before_update();

drop trigger if exists trg_project_scores_archive on public.project_scores;
create trigger trg_project_scores_archive
  before update on public.project_scores
  for each row execute function public.archive_score_before_update();

drop trigger if exists trg_user_scores_archive on public.user_scores;
create trigger trg_user_scores_archive
  before update on public.user_scores
  for each row execute function public.archive_score_before_update();

comment on function public.archive_score_before_update is
  'Trigger BEFORE UPDATE: archiva fila anterior de zone/project/user_scores '
  'en score_history. Preserva provenance (U4) para auditoría /metodologia.';
