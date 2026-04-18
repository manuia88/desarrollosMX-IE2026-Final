-- audit_log particionado por mes (pg_partman v5 nativo range)
-- FASE 01 / MÓDULO 1.C.6
-- Ref: docs/02_PLAN_MAESTRO/FASE_01_BD_FUNDACION.md §1.C.6 + ADR-009 D7

-- ============================================================
-- Tabla parent: PARTITION BY RANGE (created_at). PK compuesta (id, created_at)
-- exigida por Postgres cuando la tabla es particionada.
-- ============================================================
create table public.audit_log (
  id bigint generated always as identity,
  country_code char(2),
  actor_id uuid,
  actor_role public.user_role,
  action text not null,
  table_name text,
  record_id uuid,
  before jsonb,
  after jsonb,
  diff jsonb,
  ip inet,
  user_agent text,
  request_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (id, created_at)
) partition by range (created_at);

-- Indexes parent → propagados a particiones automáticamente.
create index idx_audit_actor on public.audit_log (actor_id, created_at desc);
create index idx_audit_record on public.audit_log (table_name, record_id, created_at desc);
create index idx_audit_country_date on public.audit_log (country_code, created_at desc);

-- ============================================================
-- Particionamiento automático mensual vía pg_partman v5
-- ============================================================
select public.create_parent(
  p_parent_table := 'public.audit_log',
  p_control      := 'created_at',
  p_interval     := '1 month'
);

-- ============================================================
-- RLS — append-only; DELETE prohibido incluso a superadmin (ADR-009 D7).
-- SELECT policy para superadmin se agrega en MÓDULO 1.D.1 cuando existe
-- is_superadmin(). Sin SELECT policy → solo service_role (BYPASS) puede leer.
-- ============================================================
alter table public.audit_log enable row level security;

create policy audit_log_no_delete on public.audit_log
  for delete using (false);

comment on policy audit_log_no_delete on public.audit_log is
  'RATIONALE: ADR-009 D7 — audit_log es append-only histórico. Retención >= 5 años (LFPDPPP/LGPD).';
