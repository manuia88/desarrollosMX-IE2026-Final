-- FASE 07.7.A.4 — CRM Foundation seed dev/staging minimal
-- Append-only · NO ejecutar en PROD · solo branches dev/staging
-- Pre-requisito: usuarios auth.users + zones existen + catálogos sembrados (via migrations).
--
-- Para correr en local:
--   supabase db reset --local
-- Aplica migrations + ejecuta este seed automáticamente.

-- ============================================================
-- Catalogs ya sembrados via migrations crm_001_catalogs (idempotent ON CONFLICT DO NOTHING)
-- - persona_types: 6 rows
-- - lead_sources: 8 rows
-- - deal_stages: 7 rows
-- - retention_policies: 28 rows
-- ============================================================

-- ============================================================
-- DEV SEED — solo si NO hay leads (idempotent guard)
-- ============================================================
do $$
declare
  v_lead_count int;
  v_zone_id uuid;
  v_source_id uuid;
  v_stage_lead uuid;
  v_stage_qualified uuid;
  v_stage_won uuid;
  v_persona_id uuid;
begin
  select count(*) into v_lead_count from public.leads;
  if v_lead_count > 0 then
    raise notice 'CRM seed skip — leads already populated (% rows)', v_lead_count;
    return;
  end if;

  -- Pickup primer zona disponible y catalogs (asume catalog seeds aplicaron)
  select id into v_zone_id from public.zones limit 1;
  if v_zone_id is null then
    raise notice 'CRM seed skip — no zones available, run zones master first';
    return;
  end if;

  select id into v_source_id from public.lead_sources where slug = 'whatsapp';
  select id into v_stage_lead from public.deal_stages where slug = 'lead';
  select id into v_stage_qualified from public.deal_stages where slug = 'qualified';
  select id into v_stage_won from public.deal_stages where slug = 'closed_won';
  select id into v_persona_id from public.persona_types where slug = 'buyer_self';

  -- Insertar 50 leads dev (10 per país × 5 = 50)
  insert into public.leads (zone_id, source_id, country_code, status, contact_name, contact_email, contact_phone, qualification_score)
  select
    v_zone_id,
    v_source_id,
    (array['MX','CO','AR','BR','US'])[1 + ((i - 1) % 5)],
    (array['new','qualified','nurturing'])[1 + ((i - 1) % 3)],
    'Dev Lead ' || i,
    'lead' || i || '@dev.dmx.local',
    '+5215555' || lpad(i::text, 6, '0'),
    (random() * 100)::numeric(5,2)
  from generate_series(1, 50) i;

  raise notice 'CRM seed: 50 leads inserted';

  -- Insertar 20 buyer_twins dev (anonymous, persona_self)
  insert into public.buyer_twins (persona_type_id, country_code, zone_focus_ids, price_range_min, price_range_max, price_range_currency)
  select
    v_persona_id,
    (array['MX','CO','AR','BR','US'])[1 + ((i - 1) % 5)],
    array[v_zone_id]::uuid[],
    1500000 + (i * 100000),
    3000000 + (i * 200000),
    (array['MXN','COP','ARS','BRL','USD'])[1 + ((i - 1) % 5)]
  from generate_series(1, 20) i;

  raise notice 'CRM seed: 20 buyer_twins inserted';

  raise notice 'CRM seed dev/staging complete. Note: deals/operaciones/referrals require user_id post-signup; agregar con script separado FASE 13.';
end;
$$;
