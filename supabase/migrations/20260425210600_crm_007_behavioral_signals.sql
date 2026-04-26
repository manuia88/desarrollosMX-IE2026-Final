-- FASE 07.7.A.4 — CRM Foundation: behavioral_signals (pg_partman monthly + 24m retention)
-- D11: telemetría comportamental partitioned. Privacy boundary: comprador propio + admin (asesor NO ve telemetría individual).

create table public.behavioral_signals (
  id uuid not null default gen_random_uuid(),
  buyer_twin_id uuid not null,
  signal_type text not null
    check (signal_type in ('search', 'click', 'voice_note', 'message', 'view_listing', 'filter_change')),
  -- Excepción D7 jsonb justificada: shape variable por signal_type (event sourcing pattern).
  signal_data jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),

  primary key (id, occurred_at)
) partition by range (occurred_at);

-- NOTA FK buyer_twin_id: NO declarable en partitioned parent (lock contention CASCADE).
-- Integridad: trigger BEFORE INSERT (siguiente migration crm_010_domain_triggers) + cleanup nightly.
-- Pattern idéntico a audit_log.actor_id sin FK.

-- Indexes parent (propagados a particiones)
create index idx_behavioral_signals_twin_time
  on public.behavioral_signals (buyer_twin_id, occurred_at desc);
create index idx_behavioral_signals_type_time
  on public.behavioral_signals (signal_type, occurred_at desc);

-- pg_partman v5 monthly partitions
select public.create_parent(
  p_parent_table := 'public.behavioral_signals',
  p_control      := 'occurred_at',
  p_interval     := '1 month'
);

-- Retention 24 months auto-drop (D11)
update public.part_config
   set retention            = '24 months',
       retention_keep_table = false,
       retention_keep_index = false
 where parent_table = 'public.behavioral_signals';

alter table public.behavioral_signals enable row level security;

comment on table public.behavioral_signals is
  'Telemetría comportamental partitioned monthly (pg_partman v5). 24m retention auto-drop. signal_data jsonb justificado (shape variable event sourcing). Privacy boundary: asesor NO ve telemetría individual (ADR-021 §3).';
