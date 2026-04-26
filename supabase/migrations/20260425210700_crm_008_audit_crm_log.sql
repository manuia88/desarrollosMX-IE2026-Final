-- FASE 07.7.A.4 — CRM Foundation: audit_crm_log (pg_partman monthly + 7y retention)
-- ADR-018 audit canon + ADR-035 retention 7y CFF Art. 30. Append-only forense.

create table public.audit_crm_log (
  id uuid not null default gen_random_uuid(),

  entity_type text not null,    -- lead | deal | operacion | buyer_twin | family_unit | referral | referral_reward
  entity_id   uuid not null,

  action text not null
    check (action in (
      'insert', 'update', 'delete',
      'stage_change',        -- pipeline_stage transition
      'status_change',       -- status enum transition
      'cascade',             -- propagación cross-tabla
      'policy_change'        -- retention_policies / RLS edit
    )),

  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role    text,    -- snapshot rol al momento (audit forense incluso si rol enum evoluciona)

  -- Excepción D7 jsonb justificada: schema flexible audit ({before, after, diff})
  changes jsonb not null default '{}'::jsonb,

  ip_address inet,
  user_agent text,
  country_code char(2),

  occurred_at timestamptz not null default now(),

  primary key (id, occurred_at)
)
partition by range (occurred_at);

create index idx_audit_crm_entity on public.audit_crm_log (entity_type, entity_id, occurred_at desc);
create index idx_audit_crm_actor on public.audit_crm_log (actor_user_id, occurred_at desc);
create index idx_audit_crm_action on public.audit_crm_log (action, occurred_at desc);
create index idx_audit_crm_country on public.audit_crm_log (country_code, occurred_at desc);

-- pg_partman v5 monthly + retention 84m (7y)
select public.create_parent(
  p_parent_table := 'public.audit_crm_log',
  p_control      := 'occurred_at',
  p_interval     := '1 month'
);

update public.part_config
   set retention            = '84 months',
       retention_keep_table = false,
       retention_keep_index = false
 where parent_table = 'public.audit_crm_log';

-- ============================================================
-- RLS append-only — replica pattern audit_log shipped
-- ============================================================
alter table public.audit_crm_log enable row level security;

create policy audit_crm_log_no_delete on public.audit_crm_log
  for delete using (false);
comment on policy audit_crm_log_no_delete on public.audit_crm_log is
  'RATIONALE: ADR-009 D7 audit append-only. DELETE prohibido incluso a superadmin. Cleanup solo via pg_partman drop_partition (>7y).';

create policy audit_crm_log_select_admin on public.audit_crm_log
  for select to authenticated
  using (public.is_superadmin());
comment on policy audit_crm_log_select_admin on public.audit_crm_log is
  'RATIONALE: superadmin acceso forense + compliance audits.';

create policy audit_crm_log_select_self on public.audit_crm_log
  for select to authenticated
  using (actor_user_id is not null and actor_user_id = auth.uid());
comment on policy audit_crm_log_select_self on public.audit_crm_log is
  'RATIONALE: actor ve sus propios eventos (LFPDPPP derecho ARCO acceso).';

revoke insert, update, delete on public.audit_crm_log from authenticated, anon;

comment on table public.audit_crm_log is
  'Audit log particionado mensual CRM (ADR-018 + ADR-035). Retención 84 months (7y CFF Art. 30). INSERT solo via tg_audit_crm_log() SECDEF. Append-only.';

-- ============================================================
-- tg_audit_crm_log() — trigger function genérico
-- ============================================================
create or replace function public.tg_audit_crm_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new            jsonb;
  v_old            jsonb;
  v_country        text;
  v_record_id      uuid;
  v_action         text;
  v_actor_role_str text;
  v_changes        jsonb;
  v_actor_uid      uuid;
begin
  v_new := case when tg_op <> 'DELETE' then to_jsonb(new) else null end;
  v_old := case when tg_op <> 'INSERT' then to_jsonb(old) else null end;

  v_country := coalesce(
    nullif(v_new->>'country_code', ''),
    nullif(v_old->>'country_code', '')
  );

  v_record_id := coalesce(
    nullif(v_new->>'id', ''),
    nullif(v_old->>'id', '')
  )::uuid;

  if tg_op = 'UPDATE' and v_new->>'stage_id' is distinct from v_old->>'stage_id' then
    v_action := 'stage_change';
  elsif tg_op = 'UPDATE' and v_new->>'status' is distinct from v_old->>'status' then
    v_action := 'status_change';
  elsif tg_op = 'UPDATE' and v_new->>'fiscal_status' is distinct from v_old->>'fiscal_status' then
    v_action := 'status_change';
  else
    v_action := lower(tg_op);
  end if;

  v_actor_uid := auth.uid();
  v_actor_role_str := public.get_user_role()::text;

  v_changes := jsonb_build_object(
    'before', v_old,
    'after',  v_new,
    'diff',   case when tg_op = 'UPDATE' then public.jsonb_diff(v_new, v_old) else null end
  );

  insert into public.audit_crm_log (
    entity_type, entity_id, action,
    actor_user_id, actor_role,
    changes,
    country_code,
    occurred_at
  ) values (
    tg_table_name,
    v_record_id,
    v_action,
    v_actor_uid,
    v_actor_role_str,
    v_changes,
    v_country,
    now()
  );

  return coalesce(new, old);
end;
$$;

comment on function public.tg_audit_crm_log() is
  'Trigger AFTER INSERT/UPDATE/DELETE genérico CRM tables. Detecta stage_change/status_change semantico. SECDEF + search_path="" + auth.uid() reference (ADR-009 D3).';

-- ============================================================
-- Apply audit triggers a 7 tablas CRM
-- ============================================================
create trigger trg_audit_crm_leads
  after insert or update or delete on public.leads
  for each row execute function public.tg_audit_crm_log();

create trigger trg_audit_crm_deals
  after insert or update or delete on public.deals
  for each row execute function public.tg_audit_crm_log();

create trigger trg_audit_crm_operaciones
  after insert or update or delete on public.operaciones
  for each row execute function public.tg_audit_crm_log();

create trigger trg_audit_crm_buyer_twins
  after insert or update or delete on public.buyer_twins
  for each row execute function public.tg_audit_crm_log();

create trigger trg_audit_crm_family_units
  after insert or update or delete on public.family_units
  for each row execute function public.tg_audit_crm_log();

create trigger trg_audit_crm_referrals
  after insert or update or delete on public.referrals
  for each row execute function public.tg_audit_crm_log();

create trigger trg_audit_crm_referral_rewards
  after insert or update or delete on public.referral_rewards
  for each row execute function public.tg_audit_crm_log();
