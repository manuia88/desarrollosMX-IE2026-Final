-- FASE 07.7.A.4 — CRM Foundation: domain triggers (cascadas + recompute embedding)
-- STUB markers ADR-018: cascadas activan FASE 07.7.B + 13.B.7

-- ============================================================
-- recompute_buyer_twin_embedding(twin_id) — STUB FASE 13.B.7
-- ============================================================
create or replace function public.recompute_buyer_twin_embedding(p_twin_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
volatile
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null and not public.is_superadmin() then
    raise exception 'recompute_buyer_twin_embedding: unauthenticated caller';
  end if;

  -- STUB — activar FASE 13.B.7 con sentence-transformers all-MiniLM-L6-v2 endpoint
  -- Real impl:
  --   1. Concat (disc_profile || big_five_profile || zone_focus snapshot || persona slug) → text
  --   2. POST a /encode endpoint → vector(384)
  --   3. UPDATE buyer_twins SET behavioral_embedding = ..., embedding_updated_at = now()
  update public.buyer_twins
     set embedding_updated_at = now()
   where id = p_twin_id;

  raise notice 'recompute_buyer_twin_embedding STUB invoked twin %; real compute FASE 13.B.7', p_twin_id;
end;
$$;

comment on function public.recompute_buyer_twin_embedding(uuid) is
  'STUB FASE 07.7.A.4 — activar FASE 13.B.7 con sentence-transformers endpoint. SECDEF + search_path="" + auth.uid() check.';

grant execute on function public.recompute_buyer_twin_embedding(uuid) to authenticated, service_role;

-- ============================================================
-- Trigger AFTER UPDATE buyer_twins.disc/big_five → recompute embedding
-- ============================================================
create or replace function public.trg_buyer_twins_recompute_embedding()
returns trigger
language plpgsql
as $$
begin
  if (NEW.disc_profile is distinct from OLD.disc_profile)
     or (NEW.big_five_profile is distinct from OLD.big_five_profile) then
    perform public.recompute_buyer_twin_embedding(NEW.id);
  end if;
  return NEW;
end;
$$;

create trigger trg_buyer_twins_after_profile_update
  after update of disc_profile, big_five_profile on public.buyer_twins
  for each row execute function public.trg_buyer_twins_recompute_embedding();

-- ============================================================
-- Trigger AFTER INSERT/UPDATE/DELETE buyer_twin_traits → cascade embedding
-- ============================================================
create or replace function public.trg_buyer_twin_traits_cascade_embedding()
returns trigger
language plpgsql
as $$
declare
  v_twin_id uuid;
begin
  v_twin_id := coalesce(NEW.buyer_twin_id, OLD.buyer_twin_id);
  perform public.recompute_buyer_twin_embedding(v_twin_id);
  return coalesce(NEW, OLD);
end;
$$;

create trigger trg_buyer_twin_traits_after_change
  after insert or update or delete on public.buyer_twin_traits
  for each row execute function public.trg_buyer_twin_traits_cascade_embedding();

-- ============================================================
-- Trigger AFTER INSERT behavioral_signals → update buyer_twins.last_signal_at
-- ============================================================
create or replace function public.trg_behavioral_signals_update_heartbeat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Validar que buyer_twin_id existe (FK enforcement vía trigger porque partitioned no permite FK)
  if not exists (select 1 from public.buyer_twins where id = NEW.buyer_twin_id) then
    raise exception 'behavioral_signals.buyer_twin_id (%) does not exist in buyer_twins', NEW.buyer_twin_id;
  end if;

  update public.buyer_twins
     set last_signal_at = NEW.occurred_at
   where id = NEW.buyer_twin_id
     and (last_signal_at is null or last_signal_at < NEW.occurred_at);
  return NEW;
end;
$$;

comment on function public.trg_behavioral_signals_update_heartbeat() is
  'Mantiene buyer_twins.last_signal_at sincronizado + valida FK buyer_twin_id (partitioned table sin FK formal). SECDEF + search_path="".';

create trigger trg_behavioral_signals_after_insert
  after insert on public.behavioral_signals
  for each row execute function public.trg_behavioral_signals_update_heartbeat();

-- ============================================================
-- Cascade stubs ADR-018 marked — completa FASE 07.7.B
-- ============================================================
create or replace function public.cascade_deal_won_to_operacion(p_deal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null and not public.is_superadmin() then
    raise exception 'cascade_deal_won_to_operacion: unauthenticated';
  end if;

  -- STUB — activar bloque 07.7.B con lógica completa:
  --   - INSERT INTO operaciones (deal_id, operacion_type, amount, amount_currency, country_code, ...)
  --   - INSERT INTO operacion_parts (07.7.B)
  --   - INSERT INTO operacion_commissions (07.7.B)
  raise notice 'STUB cascade_deal_won_to_operacion: deal_id=% — implement FASE 07.7.B', p_deal_id;
end;
$$;

comment on function public.cascade_deal_won_to_operacion(uuid) is
  'STUB ADR-018 marked — activar FASE 07.7.B operacion_parts + operacion_commissions. SECDEF + auth.uid() check.';

create or replace function public.cascade_operacion_commission_calc(p_operacion_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null and not public.is_superadmin() then
    raise exception 'cascade_operacion_commission_calc: unauthenticated';
  end if;

  raise notice 'STUB cascade_operacion_commission_calc: operacion_id=% — implement FASE 07.7.B', p_operacion_id;
end;
$$;

comment on function public.cascade_operacion_commission_calc(uuid) is
  'STUB ADR-018 marked — activar FASE 07.7.B con commission_rules. SECDEF + auth.uid() check.';

-- ============================================================
-- Domain trigger: AFTER UPDATE deals.stage_id → audit + cascade closed_won
-- (audit ya cubierto por tg_audit_crm_log generic; este trigger gestiona cascade)
-- ============================================================
create or replace function public.crm_handle_deal_stage_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_won boolean;
begin
  if old.stage_id is not distinct from new.stage_id then
    return new;
  end if;

  select is_won into v_is_won from public.deal_stages where id = new.stage_id;

  if v_is_won then
    -- Cascade closed_won → operacion (STUB FASE 07.7.B)
    begin
      perform public.cascade_deal_won_to_operacion(new.id);
    exception
      when others then
        raise notice 'cascade_deal_won_to_operacion failed for deal %: %', new.id, sqlerrm;
    end;
  end if;

  return new;
end;
$$;

comment on function public.crm_handle_deal_stage_change() is
  'Trigger AFTER UPDATE deals stage_id → cascade closed_won → operacion. Audit cubierto por tg_audit_crm_log generic. SECDEF.';

create trigger trg_crm_handle_deal_stage_change
  after update of stage_id on public.deals
  for each row execute function public.crm_handle_deal_stage_change();

-- ============================================================
-- Domain trigger: AFTER INSERT operaciones → cascade commission calc (STUB)
-- ============================================================
create or replace function public.crm_handle_operacion_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform public.cascade_operacion_commission_calc(new.id);
  exception
    when others then
      raise notice 'cascade_operacion_commission_calc failed for operacion %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

comment on function public.crm_handle_operacion_insert() is
  'Trigger AFTER INSERT operaciones → cascade commission calc (STUB FASE 07.7.B). Audit cubierto por tg_audit_crm_log generic.';

create trigger trg_crm_handle_operacion_insert
  after insert on public.operaciones
  for each row execute function public.crm_handle_operacion_insert();

-- ============================================================
-- STUB cron crm_retention_cleanup — FASE 06 enforcement
-- ============================================================
create or replace function public.fn_crm_retention_cleanup()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- STUB FASE 07.7.A.4 — implementación FASE 06 cron enforcement.
  -- Lee retention_policies WHERE active=true.
  -- Para cada (country_code, entity_type, retention_years):
  --   IF entity_type = 'lead'        → DELETE FROM leads WHERE country_code=X AND created_at < now()-Y years AND status NOT IN ('legal_hold')
  --   IF entity_type = 'deal'        → idem deals
  --   IF entity_type = 'operacion'   → ANONYMIZE buyer/seller PII (NO delete — legal hold fiscal)
  --   IF entity_type = 'buyer_twin'  → ANONYMIZE PII embedding NULL
  --   IF entity_type = 'fiscal_doc'  → archive cold storage S3 + delete row
  --   IF entity_type = 'behavioral_signal' → DELETE
  --   IF entity_type = 'audit_crm_log' → pg_partman drop_partition (>= retention_years)
  -- INSERT INTO ingest_runs (source='crm_retention_cleanup', ...) observability obligatorio.
  raise notice 'fn_crm_retention_cleanup STUB — activar FASE 06 enforcement (ADR-035)';
end;
$$;

comment on function public.fn_crm_retention_cleanup() is
  'STUB FASE 07.7.A.4 — activar FASE 06 cron enforcement. Lee retention_policies y aplica DELETE/anonymize/archive per entity_type+country. ingest_runs observability obligatorio. ADR-035.';
