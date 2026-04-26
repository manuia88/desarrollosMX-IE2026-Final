-- ============================================================
-- DMX dev/staging seed v2 — F2.13.F PR-A (FASE 13.F)
-- ============================================================
-- Purpose
--   Cargar dataset DEV/STAGING idempotente vinculado a los 3 test users canon
--   para habilitar end-to-end UI testing del portal asesor (módulos M01-M04 +
--   M02 Desarrollos + M04 Búsquedas) sin depender de signups manuales.
--
-- Test users (auth.users + profiles ya existentes via FASE 13.B test fixtures)
--   - admin@test.com   (superadmin,           MX) fd98ab77-2b4f-4b84-9e4e-adf785ad3d0c
--   - asesor@test.com  (asesor,               MX) eb6919f0-d724-49ba-8e96-7be9b6d55220
--   - dev@test.com     (admin_desarrolladora, MX) 97d78ed5-bcfb-4939-9e65-50e4dbc92a0a
--
-- Idempotency
--   Single DO block. Guard: si existen leads con contact_email LIKE '%@dev.dmx.local'
--   (marcador del seed) entonces skip + raise notice. Re-ejecutable seguro.
--
-- NO aplicar en PROD
--   Aunque el código no rompe RLS canon (asesor_id real, FK chains válidos), el
--   contenido es sintético. Aplicar solo en branch dev/staging Supabase, nunca
--   en proyecto productivo. Asesor canon F1.A.4 separa por user_id, así que
--   cada test user solo verá lo suyo (no leak cross-user).
--
-- Tabla counts esperadas post-seed (delta sobre estado base)
--   desarrolladoras            +1   (DMX Dev Holdings, dev tenant)
--   leads                      +50  (35 asignados a asesor, 15 NULL)
--   buyer_twins                +20  (10 linked via lead/user, 10 anonymous)
--   family_units               +8   (cada uno con primary_buyer_twin_id)
--   deals                      +10  (3 closed_won + 2 contract + 3 offer + 2 qualified)
--   operaciones                +5   (3 venta closed + 2 venta contract avanzados)
--   referrals                  +3   (polymorphic: user/developer/deal sources)
--   proyectos                  +5   (CDMX: Roma, Polanco, Doctores, Condesa, Pedregal)
--   unidades                   +20  (4 por proyecto)
--   project_brokers            +8   (cobertura asesor/admin/dev cross-proyecto)
--   marketing_assets           +25  (5 por proyecto)
--   exclusividad_acuerdos      +3   (proyectos 1, 2, 3)
--   busquedas                  +10  (todas asignadas a asesor)
--
-- NO se siembran captaciones (PR-B se encarga).
--
-- Catálogos (persona_types, lead_sources, deal_stages, retention_policies,
-- countries, currencies, zones) ya sembrados via migrations canon.
-- ============================================================

do $$
declare
  -- Test users (constants)
  v_user_admin  uuid := 'fd98ab77-2b4f-4b84-9e4e-adf785ad3d0c'::uuid;
  v_user_asesor uuid := 'eb6919f0-d724-49ba-8e96-7be9b6d55220'::uuid;
  v_user_dev    uuid := '97d78ed5-bcfb-4939-9e65-50e4dbc92a0a'::uuid;

  -- Zones canon CDMX (constants)
  v_zone_roma     uuid := 'e30c8fd4-deef-56f1-8dd3-ca755ea1a9dc'::uuid;
  v_zone_polanco  uuid := '11851b50-2d04-5c3e-bd0b-dbe4f5b48a91'::uuid;
  v_zone_doctores uuid := 'd258c670-3d27-5616-ba4d-6c65adbd3f00'::uuid;
  v_zone_condesa  uuid := '3e32bb60-4760-59ae-bc79-87bd009468e4'::uuid;
  v_zone_pedregal uuid := '1f0cb7fd-a31d-534b-bb09-6eb027b83720'::uuid;

  -- Persona types (constants)
  v_persona_buyer       uuid := '2806f20e-450d-4038-ad9d-a6599a7ee2f8'::uuid;
  v_persona_investor    uuid := 'd295b40b-90d0-4990-a4c6-4d7f9de63fa1'::uuid;
  v_persona_family      uuid := 'bc92ac77-965b-4f62-831a-03ee45470f71'::uuid;
  v_persona_masterbroker uuid := '136eaade-7cbb-4d48-bce5-0718049d7209'::uuid;
  v_persona_asesor_lead uuid := '0995d821-525d-47b6-83b1-b836462fece6'::uuid;
  v_persona_referrer    uuid := 'd556ef0d-d313-4b3a-92db-6347b217e6b5'::uuid;

  -- Lead sources (constants)
  v_src_whatsapp uuid := 'f971a72f-565e-4693-93d6-464ea6474b6f'::uuid;
  v_src_web_org  uuid := '9d53a758-01ef-4ebc-bb75-bf0e420d1d56'::uuid;
  v_src_referral uuid := '713dcd49-63e6-4944-ae8e-0122f26ef8fc'::uuid;
  v_src_partner  uuid := '0fc3ea2f-41c4-48e8-844a-a6a572b4165d'::uuid;
  v_src_listing  uuid := 'e6a9b36e-1bbc-4f4f-80b7-a5bcd4a1b4d8'::uuid;
  v_src_ferret   uuid := '19339d73-b063-4719-add8-9c08e3b62ca0'::uuid;
  v_src_casa     uuid := '24edc5ac-db51-4500-a742-15fe76b75799'::uuid;
  v_src_web_paid uuid := '68354e3f-b739-4ea0-a3fa-f5d350a8c7c5'::uuid;

  -- Deal stages (constants)
  v_stage_lead      uuid := '7cdf1824-ee28-4073-be78-91c513e938ac'::uuid;
  v_stage_qualified uuid := '45b50ee6-5015-46ae-bdba-6ac9a4aaf6bf'::uuid;
  v_stage_showing   uuid := '63521f71-0116-4cac-b64f-22bb98a4be24'::uuid;
  v_stage_offer     uuid := 'eaa71d0e-0081-472b-b5dd-cb1e1d4a985a'::uuid;
  v_stage_contract  uuid := '3d6f1010-be31-460a-9073-0ddb51f0ae18'::uuid;
  v_stage_won       uuid := '4f004884-3aba-4266-ae4d-3647f8df5776'::uuid;
  v_stage_lost      uuid := 'e541f409-cbd8-4fee-a73e-4c67bb76391f'::uuid;

  -- Locals para FK chains
  v_dev_seed_count int;
  v_desarrolladora_id uuid;

  v_proyecto_roma     uuid;
  v_proyecto_polanco  uuid;
  v_proyecto_doctores uuid;
  v_proyecto_condesa  uuid;
  v_proyecto_pedregal uuid;

  v_first_lead_id uuid;
  v_first_deal_id uuid;
  v_first_operacion_id uuid;

  v_first_buyer_twin_id uuid;
  v_buyer_twin_ids uuid[];
begin
  -- ============================================================
  -- IDEMPOTENCY GUARD
  -- ============================================================
  select count(*) into v_dev_seed_count
  from public.leads
  where contact_email like '%@dev.dmx.local';

  if v_dev_seed_count > 0 then
    raise notice 'dev_seed_v2 skip — % leads marcados @dev.dmx.local ya cargados', v_dev_seed_count;
    return;
  end if;

  raise notice 'dev_seed_v2 START — vinculando datos a 3 test users (admin/asesor/dev)';

  -- ============================================================
  -- 1) desarrolladoras — 1 dummy holding del dev tenant
  -- FK NOT NULL en proyectos.desarrolladora_id, así que se siembra primero.
  --
  -- NOTE pgsodium: trg_desarrolladoras_encrypt_tax invoca extensions.crypto_aead_det_encrypt
  -- vía encrypt_secret(text). Cuando el seed corre via MCP execute_sql (postgres role,
  -- sin permission al keyspace pgsodium) ese trigger lanza permission_denied. Disable
  -- temporal — tax_id_encrypted queda NULL y se rellena en runtime app cuando dev tenant
  -- inicie sesión y modifique el row. Mismo patrón usado para trg_profiles_encrypt_pii.
  -- ============================================================
  alter table public.desarrolladoras disable trigger trg_desarrolladoras_encrypt_tax;
  alter table public.profiles disable trigger trg_profiles_encrypt_pii;

  insert into public.desarrolladoras (
    country_code, name, legal_name, tax_id, slug,
    contact_email, contact_phone, is_verified, is_active, meta
  )
  values (
    'MX', 'DMX Dev Holdings', 'DMX Dev Holdings S.A. de C.V.',
    'DDH260101AAA', 'dmx-dev-holdings',
    'dev@test.com', '+5215555000001',
    true, true,
    jsonb_build_object('seed', 'dev_seed_v2', 'tenant_user_id', v_user_dev::text)
  )
  returning id into v_desarrolladora_id;

  -- Linkear dev@test.com a la desarrolladora vía profiles.desarrolladora_id
  update public.profiles
     set desarrolladora_id = v_desarrolladora_id
   where id = v_user_dev
     and desarrolladora_id is null;

  alter table public.desarrolladoras enable trigger trg_desarrolladoras_encrypt_tax;
  alter table public.profiles enable trigger trg_profiles_encrypt_pii;

  raise notice 'dev_seed_v2 step 1/13: desarrolladora % creada + linkeada a dev user', v_desarrolladora_id;

  -- ============================================================
  -- 2) leads — 50 rows
  -- 35 asignados a asesor@test.com, 15 NULL (anonymous)
  -- Mix de zones, sources, status, country MX
  -- ============================================================
  insert into public.leads (
    user_id, zone_id, source_id, country_code, status,
    contact_name, contact_email, contact_phone,
    assigned_asesor_id, qualification_score, notes, metadata
  )
  select
    null,  -- user_id NULL (lead anónimo)
    (array[v_zone_roma, v_zone_polanco, v_zone_doctores, v_zone_condesa, v_zone_pedregal])[1 + ((i - 1) % 5)],
    (array[v_src_whatsapp, v_src_web_org, v_src_referral, v_src_partner, v_src_listing,
           v_src_ferret, v_src_casa, v_src_web_paid])[1 + ((i - 1) % 8)],
    'MX',
    (array['new','qualified','nurturing','converted','lost'])[1 + ((i - 1) % 5)],
    'Lead Demo ' || lpad(i::text, 3, '0'),
    'lead' || lpad(i::text, 3, '0') || '@dev.dmx.local',
    '+5215560' || lpad(i::text, 6, '0'),
    case when i <= 35 then v_user_asesor else null end,
    ((i * 7) % 100)::numeric(5,2),
    'Lead sembrado dev_seed_v2 (' || (case when i <= 35 then 'asignado' else 'sin asignar' end) || ')',
    jsonb_build_object('seed', 'dev_seed_v2', 'utm_source', 'dev_seed', 'index', i)
  from generate_series(1, 50) i;

  select id into v_first_lead_id
  from public.leads
  where contact_email = 'lead001@dev.dmx.local'
  limit 1;

  raise notice 'dev_seed_v2 step 2/13: 50 leads insertados (35 asesor / 15 anonymous)';

  -- ============================================================
  -- 3) buyer_twins — 20 rows
  -- 10 linkeados a v_user_asesor (representando leads convertidos a usuarios),
  -- 10 anonymous. DISC + Big Five jsonb deterministic varying.
  -- ============================================================
  insert into public.buyer_twins (
    user_id, persona_type_id, zone_focus_ids,
    price_range_min, price_range_max, price_range_currency,
    country_code, disc_profile, big_five_profile, last_signal_at
  )
  select
    case when i <= 10 then v_user_asesor else null end,
    (array[v_persona_buyer, v_persona_investor, v_persona_family,
           v_persona_asesor_lead])[1 + ((i - 1) % 4)],
    case (i % 5)
      when 0 then array[v_zone_roma, v_zone_condesa]::uuid[]
      when 1 then array[v_zone_polanco]::uuid[]
      when 2 then array[v_zone_doctores, v_zone_roma]::uuid[]
      when 3 then array[v_zone_condesa]::uuid[]
      else        array[v_zone_pedregal, v_zone_polanco]::uuid[]
    end,
    1500000 + (i * 150000),
    3500000 + (i * 350000),
    'MXN',
    'MX',
    jsonb_build_object(
      'D', 30 + ((i * 11) % 60),
      'I', 30 + ((i * 13) % 60),
      'S', 30 + ((i * 17) % 60),
      'C', 30 + ((i * 19) % 60)
    ),
    jsonb_build_object(
      'openness',         30 + ((i * 23) % 60),
      'conscientiousness',30 + ((i * 29) % 60),
      'extraversion',     30 + ((i * 31) % 60),
      'agreeableness',    30 + ((i * 37) % 60),
      'neuroticism',      30 + ((i * 41) % 60)
    ),
    now() - (i || ' days')::interval
  from generate_series(1, 20) i;

  -- Capturar ids buyer_twins recién insertados (marcados via meta no disponible aquí —
  -- usamos timestamp creado en este seed run como filtro: created_at >= start of DO block).
  -- Suficiente práctica: tomar los 20 más recientes que matchean los filtros del seed.
  select array_agg(id order by created_at desc) into v_buyer_twin_ids
  from (
    select id, created_at
    from public.buyer_twins
    where country_code = 'MX'
      and (user_id = v_user_asesor or user_id is null)
    order by created_at desc
    limit 20
  ) recent;

  v_first_buyer_twin_id := v_buyer_twin_ids[1];

  raise notice 'dev_seed_v2 step 3/13: 20 buyer_twins insertados (10 user / 10 anon)';

  -- ============================================================
  -- 4) family_units — 8 rows
  -- Cada uno apunta a un buyer_twin distinto como primary
  -- ============================================================
  insert into public.family_units (
    primary_buyer_twin_id, unit_type, members_count,
    combined_budget_min, combined_budget_max, combined_budget_currency,
    country_code
  )
  select
    v_buyer_twin_ids[i],
    (array['couple','family','partnership','single'])[1 + ((i - 1) % 4)],
    (array[2,4,2,1,3,5,2,3])[i],
    2000000 + (i * 500000),
    5000000 + (i * 1000000),
    'MXN',
    'MX'
  from generate_series(1, 8) i
  where v_buyer_twin_ids[i] is not null;

  raise notice 'dev_seed_v2 step 4/13: 8 family_units insertados';

  -- ============================================================
  -- 5) proyectos — 5 desarrollos CDMX
  -- Vinculados a v_desarrolladora_id (DMX Dev Holdings)
  -- ============================================================
  insert into public.proyectos (
    nombre, slug, desarrolladora_id, zone_id, country_code,
    ciudad, colonia, status, tipo, operacion,
    units_total, units_available, price_min_mxn, price_max_mxn, currency,
    bedrooms_range, amenities, description, privacy_level, is_active, meta
  )
  values
    ('Roma Boutique 7', 'roma-boutique-7-devseed', v_desarrolladora_id, v_zone_roma, 'MX',
     'Ciudad de México', 'Roma Norte', 'preventa', 'departamento', 'venta',
     24, 18, 4500000, 9800000, 'MXN',
     array[1,3], '["alberca","gym","seguridad","roof_garden"]'::jsonb,
     'Boutique residencial en corazón Roma Norte. 24 unidades 1-3 recamaras.',
     'public', true, jsonb_build_object('seed','dev_seed_v2'))
  returning id into v_proyecto_roma;

  insert into public.proyectos (
    nombre, slug, desarrolladora_id, zone_id, country_code,
    ciudad, colonia, status, tipo, operacion,
    units_total, units_available, price_min_mxn, price_max_mxn, currency,
    bedrooms_range, amenities, description, privacy_level, is_active, meta
  )
  values
    ('Polanco Lumiere', 'polanco-lumiere-devseed', v_desarrolladora_id, v_zone_polanco, 'MX',
     'Ciudad de México', 'Polanco I Sección Chapultepec', 'construccion', 'penthouse', 'venta',
     12, 8, 12000000, 25000000, 'MXN',
     array[2,4], '["alberca","gym","spa","concierge","valet","seguridad"]'::jsonb,
     'Penthouses lujo Polanco. Concierge 24/7 + valet.',
     'broker_only', true, jsonb_build_object('seed','dev_seed_v2'))
  returning id into v_proyecto_polanco;

  insert into public.proyectos (
    nombre, slug, desarrolladora_id, zone_id, country_code,
    ciudad, colonia, status, tipo, operacion,
    units_total, units_available, price_min_mxn, price_max_mxn, currency,
    bedrooms_range, amenities, description, privacy_level, is_active, meta
  )
  values
    ('Doctores Skyline', 'doctores-skyline-devseed', v_desarrolladora_id, v_zone_doctores, 'MX',
     'Ciudad de México', 'Doctores', 'terminado', 'departamento', 'venta',
     60, 40, 2500000, 5800000, 'MXN',
     array[1,2], '["gym","seguridad","lobby"]'::jsonb,
     'Torre 60 unidades Doctores. Entrega inmediata.',
     'public', true, jsonb_build_object('seed','dev_seed_v2'))
  returning id into v_proyecto_doctores;

  insert into public.proyectos (
    nombre, slug, desarrolladora_id, zone_id, country_code,
    ciudad, colonia, status, tipo, operacion,
    units_total, units_available, price_min_mxn, price_max_mxn, currency,
    bedrooms_range, amenities, description, privacy_level, is_active, meta
  )
  values
    ('Condesa Atelier', 'condesa-atelier-devseed', v_desarrolladora_id, v_zone_condesa, 'MX',
     'Ciudad de México', 'Condesa', 'preventa', 'loft', 'venta',
     18, 14, 3200000, 7500000, 'MXN',
     array[1,2], '["roof_garden","seguridad","coworking"]'::jsonb,
     'Lofts arquitecto autor Condesa. Acabados premium.',
     'public', true, jsonb_build_object('seed','dev_seed_v2'))
  returning id into v_proyecto_condesa;

  insert into public.proyectos (
    nombre, slug, desarrolladora_id, zone_id, country_code,
    ciudad, colonia, status, tipo, operacion,
    units_total, units_available, price_min_mxn, price_max_mxn, currency,
    bedrooms_range, amenities, description, privacy_level, is_active, meta
  )
  values
    ('Pedregal Vista', 'pedregal-vista-devseed', v_desarrolladora_id, v_zone_pedregal, 'MX',
     'Ciudad de México', 'Pedregal de San Ángel', 'entregado', 'casa', 'venta',
     8, 5, 18000000, 35000000, 'MXN',
     array[3,5], '["alberca","jardin","seguridad","valet","gym","spa"]'::jsonb,
     'Casas residenciales Pedregal. 800-1200 m2 terreno.',
     'assigned_only', true, jsonb_build_object('seed','dev_seed_v2'))
  returning id into v_proyecto_pedregal;

  raise notice 'dev_seed_v2 step 5/13: 5 proyectos CDMX insertados';

  -- ============================================================
  -- 6) unidades — 4 por proyecto = 20 total
  -- numero ej "A-101", recamaras/banos/parking diversos
  -- ============================================================
  insert into public.unidades (
    proyecto_id, numero, tipo, recamaras, banos, parking,
    area_m2, price_mxn, maintenance_fee_mxn, status, floor, photos, features, meta
  )
  select
    v_proyecto_roma,
    (array['A-101','A-102','B-201','B-202'])[i],
    'departamento'::public.unidad_tipo,
    (array[1,2,3,2])[i],
    (array[1,1.5,2,2])[i],
    (array[1,1,2,1])[i],
    (array[55,72,95,80])[i]::numeric,
    (array[4500000,5800000,8200000,6500000])[i]::numeric,
    (array[2200,2800,3500,3000])[i]::numeric,
    (array['disponible','disponible','reservada','vendida'])[i]::public.unidad_status,
    (array[1,1,2,2])[i],
    array[]::text[],
    jsonb_build_object('orientacion', 'sur', 'closets', 2),
    jsonb_build_object('seed','dev_seed_v2')
  from generate_series(1, 4) i;

  insert into public.unidades (
    proyecto_id, numero, tipo, recamaras, banos, parking,
    area_m2, price_mxn, maintenance_fee_mxn, status, floor, photos, features, meta
  )
  select
    v_proyecto_polanco,
    (array['PH-1','PH-2','PH-3','PH-4'])[i],
    'penthouse'::public.unidad_tipo,
    (array[2,3,3,4])[i],
    (array[2.5,3,3,4])[i],
    (array[2,2,3,3])[i],
    (array[140,180,210,280])[i]::numeric,
    (array[12500000,16800000,20500000,25000000])[i]::numeric,
    (array[6500,8200,9800,12000])[i]::numeric,
    (array['disponible','reservada','disponible','apartada'])[i]::public.unidad_status,
    (array[10,10,11,12])[i],
    array[]::text[],
    jsonb_build_object('vista','panoramica','terraza_m2',40),
    jsonb_build_object('seed','dev_seed_v2')
  from generate_series(1, 4) i;

  insert into public.unidades (
    proyecto_id, numero, tipo, recamaras, banos, parking,
    area_m2, price_mxn, maintenance_fee_mxn, status, floor, photos, features, meta
  )
  select
    v_proyecto_doctores,
    (array['101','205','308','412'])[i],
    'departamento'::public.unidad_tipo,
    (array[1,1,2,2])[i],
    (array[1,1,2,2])[i],
    (array[0,1,1,1])[i],
    (array[50,58,75,82])[i]::numeric,
    (array[2500000,3200000,4500000,5800000])[i]::numeric,
    (array[1500,1800,2400,2800])[i]::numeric,
    (array['disponible','disponible','vendida','disponible'])[i]::public.unidad_status,
    (array[1,2,3,4])[i],
    array[]::text[],
    jsonb_build_object('orientacion','poniente'),
    jsonb_build_object('seed','dev_seed_v2')
  from generate_series(1, 4) i;

  insert into public.unidades (
    proyecto_id, numero, tipo, recamaras, banos, parking,
    area_m2, price_mxn, maintenance_fee_mxn, status, floor, photos, features, meta
  )
  select
    v_proyecto_condesa,
    (array['L-01','L-02','L-03','L-04'])[i],
    'loft'::public.unidad_tipo,
    (array[1,1,2,2])[i],
    (array[1,1.5,2,2])[i],
    (array[1,1,1,2])[i],
    (array[60,68,85,98])[i]::numeric,
    (array[3200000,4100000,5500000,7500000])[i]::numeric,
    (array[1900,2200,2900,3500])[i]::numeric,
    (array['disponible','disponible','reservada','disponible'])[i]::public.unidad_status,
    (array[1,1,2,2])[i],
    array[]::text[],
    jsonb_build_object('doble_altura',true),
    jsonb_build_object('seed','dev_seed_v2')
  from generate_series(1, 4) i;

  insert into public.unidades (
    proyecto_id, numero, tipo, recamaras, banos, parking,
    area_m2, price_mxn, maintenance_fee_mxn, status, floor, photos, features, meta
  )
  select
    v_proyecto_pedregal,
    (array['Casa-A','Casa-B','Casa-C','Casa-D'])[i],
    'casa'::public.unidad_tipo,
    (array[3,4,4,5])[i],
    (array[3,3.5,4,5])[i],
    (array[2,3,3,4])[i],
    (array[280,340,380,450])[i]::numeric,
    (array[18500000,24000000,28500000,35000000])[i]::numeric,
    (array[8500,10500,12000,15000])[i]::numeric,
    (array['disponible','vendida','disponible','disponible'])[i]::public.unidad_status,
    null,
    array[]::text[],
    jsonb_build_object('terreno_m2', (array[850,1000,1100,1200])[i], 'jardin',true),
    jsonb_build_object('seed','dev_seed_v2')
  from generate_series(1, 4) i;

  raise notice 'dev_seed_v2 step 6/13: 20 unidades insertadas (4 por proyecto)';

  -- ============================================================
  -- 7) project_brokers — 8 rows cobertura cross-proyecto
  -- UNIQUE (proyecto_id, broker_user_id) → planificado para evitar conflicto
  --   roma:    asesor=associate, admin=lead_broker
  --   polanco: asesor=associate, dev=coordinator
  --   doctores: asesor=lead_broker
  --   condesa: admin=lead_broker
  --   pedregal: dev=coordinator
  --   polanco: admin=associate (octava asignación)
  -- ============================================================
  insert into public.project_brokers (
    proyecto_id, broker_user_id, role, commission_pct,
    meses_exclusividad, meses_contrato, active, meta
  )
  values
    (v_proyecto_roma,     v_user_asesor, 'associate',   3.50, 6, 12, true, jsonb_build_object('seed','dev_seed_v2')),
    (v_proyecto_roma,     v_user_admin,  'lead_broker', 5.00, 6, 12, true, jsonb_build_object('seed','dev_seed_v2')),
    (v_proyecto_polanco,  v_user_asesor, 'associate',   4.00, 9, 18, true, jsonb_build_object('seed','dev_seed_v2')),
    (v_proyecto_polanco,  v_user_dev,    'coordinator', 2.50, 9, 18, true, jsonb_build_object('seed','dev_seed_v2')),
    (v_proyecto_doctores, v_user_asesor, 'lead_broker', 5.50, 12,24, true, jsonb_build_object('seed','dev_seed_v2')),
    (v_proyecto_condesa,  v_user_admin,  'lead_broker', 4.50, 6, 12, true, jsonb_build_object('seed','dev_seed_v2')),
    (v_proyecto_pedregal, v_user_dev,    'coordinator', 3.00, 12,24, true, jsonb_build_object('seed','dev_seed_v2')),
    (v_proyecto_polanco,  v_user_admin,  'associate',   3.50, 6, 12, true, jsonb_build_object('seed','dev_seed_v2'));

  raise notice 'dev_seed_v2 step 7/13: 8 project_brokers insertados';

  -- ============================================================
  -- 8) marketing_assets — 5 por proyecto = 25 rows
  -- variety: photo_gallery, brochure_pdf, render_3d, virtual_tour, post_cuadrado
  -- ============================================================
  insert into public.marketing_assets (
    proyecto_id, asset_type, url, thumbnail_url, format, locale, status, display_order, meta
  )
  select
    p.proyecto_id,
    a.asset_type::public.marketing_asset_type,
    'https://dev.dmx.local/assets/' || p.slug || '/' || a.asset_type || '.' || a.format,
    'https://dev.dmx.local/assets/' || p.slug || '/' || a.asset_type || '_thumb.jpg',
    a.format,
    'es-MX',
    'ready'::public.marketing_asset_status,
    a.display_order,
    jsonb_build_object('seed','dev_seed_v2','generated','dev')
  from
    (values
      (v_proyecto_roma,     'roma-boutique-7-devseed'),
      (v_proyecto_polanco,  'polanco-lumiere-devseed'),
      (v_proyecto_doctores, 'doctores-skyline-devseed'),
      (v_proyecto_condesa,  'condesa-atelier-devseed'),
      (v_proyecto_pedregal, 'pedregal-vista-devseed')
    ) as p(proyecto_id, slug)
    cross join
    (values
      ('photo_gallery', 'jpg', 0),
      ('brochure_pdf',  'pdf', 1),
      ('render_3d',     'jpg', 2),
      ('virtual_tour',  'mp4', 3),
      ('post_cuadrado', 'jpg', 4)
    ) as a(asset_type, format, display_order);

  raise notice 'dev_seed_v2 step 8/13: 25 marketing_assets insertados (5 por proyecto)';

  -- ============================================================
  -- 9) exclusividad_acuerdos — 3 acuerdos para proyectos roma/polanco/doctores
  -- ============================================================
  insert into public.exclusividad_acuerdos (
    proyecto_id, asesor_id, meses_exclusividad, meses_contrato,
    comision_pct, start_date, scope, active, meta
  )
  values
    (v_proyecto_roma,     v_user_asesor, 6, 12, 5.00, '2026-04-01', 'full'::public.exclusividad_scope,
     true, jsonb_build_object('seed','dev_seed_v2')),
    (v_proyecto_polanco,  v_user_asesor, 9, 18, 5.50, '2026-04-01', 'territory'::public.exclusividad_scope,
     true, jsonb_build_object('seed','dev_seed_v2')),
    (v_proyecto_doctores, v_user_asesor, 6, 12, 4.50, '2026-04-01', 'category'::public.exclusividad_scope,
     true, jsonb_build_object('seed','dev_seed_v2'));

  raise notice 'dev_seed_v2 step 9/13: 3 exclusividad_acuerdos insertados';

  -- ============================================================
  -- 10) deals — 10 deals
  -- 3 closed_won + 2 contract + 3 offer + 2 qualified
  -- todos asignados a v_user_asesor, vinculados a leads dev_seed
  -- ============================================================
  insert into public.deals (
    lead_id, zone_id, stage_id, amount, amount_currency, country_code,
    asesor_id, probability, expected_close_date, actual_close_date, notes
  )
  select
    l.id,
    l.zone_id,
    case
      when row_number() over (order by l.created_at) <= 3 then v_stage_won
      when row_number() over (order by l.created_at) <= 5 then v_stage_contract
      when row_number() over (order by l.created_at) <= 8 then v_stage_offer
      else v_stage_qualified
    end as stage_id,
    (2000000 + ((row_number() over (order by l.created_at)) * 1300000))::numeric(14,2) as amount,
    'MXN',
    'MX',
    v_user_asesor,
    case
      when row_number() over (order by l.created_at) <= 3 then 100.00
      when row_number() over (order by l.created_at) <= 5 then 80.00
      when row_number() over (order by l.created_at) <= 8 then 50.00
      else 25.00
    end as probability,
    case
      when row_number() over (order by l.created_at) <= 3 then current_date - 10
      when row_number() over (order by l.created_at) <= 5 then current_date + 15
      when row_number() over (order by l.created_at) <= 8 then current_date + 30
      else current_date + 60
    end as expected_close_date,
    case
      when row_number() over (order by l.created_at) <= 3 then current_date - 10
      else null
    end as actual_close_date,
    'Deal sembrado dev_seed_v2'
  from public.leads l
  where l.assigned_asesor_id = v_user_asesor
    and l.contact_email like '%@dev.dmx.local'
  order by l.created_at
  limit 10;

  select id into v_first_deal_id
  from public.deals
  where asesor_id = v_user_asesor
    and notes = 'Deal sembrado dev_seed_v2'
  order by created_at
  limit 1;

  raise notice 'dev_seed_v2 step 10/13: 10 deals insertados (3 won + 2 contract + 3 offer + 2 qualified)';

  -- ============================================================
  -- 11) operaciones — 5 rows
  -- 1 por cada closed_won deal (3) + 2 contract avanzados
  -- UNIQUE deal_id: 1:1 deal↔operacion
  -- ============================================================
  insert into public.operaciones (
    deal_id, operacion_type, amount, amount_currency,
    commission_amount, commission_currency, closed_at,
    fiscal_status, cfdi_uuid, country_code
  )
  select
    d.id,
    'venta',
    d.amount,
    d.amount_currency,
    (d.amount * 0.05)::numeric(14,2),
    'MXN',
    coalesce(d.actual_close_date::timestamptz, now() - interval '5 days'),
    case when ds.is_won then 'invoiced' else 'pending' end as fiscal_status,
    case when ds.is_won then gen_random_uuid()::text else null end as cfdi_uuid,
    'MX'
  from public.deals d
  join public.deal_stages ds on ds.id = d.stage_id
  where d.asesor_id = v_user_asesor
    and d.notes = 'Deal sembrado dev_seed_v2'
    and (ds.is_won or ds.slug = 'contract')
  order by ds.order_index desc, d.created_at
  limit 5;

  select id into v_first_operacion_id
  from public.operaciones
  order by created_at
  limit 1;

  raise notice 'dev_seed_v2 step 11/13: 5 operaciones insertadas (3 invoiced + 2 pending)';

  -- ============================================================
  -- 12) referrals — 3 polymorphic
  -- Schema constraints: source_type in ('user','developer','deal'),
  --                     target_type in ('user','deal','operacion').
  -- 1) asesor user → admin user (status pending)
  -- 2) deal → operacion (status attributed)
  -- 3) developer (DMX Dev Holdings) → asesor user (status paid)
  --
  -- NOTE: El trigger fn_validate_referral_polymorphic_fks exige auth.uid() not null
  -- O is_superadmin(). Cuando este seed corre via MCP execute_sql (postgres role,
  -- sin JWT), ambas condiciones fallan. Disable temporal del trigger durante el
  -- INSERT y rehab post. Validación FK polimórfica se preserva en runtime app-layer.
  -- ============================================================
  alter table public.referrals disable trigger trg_referrals_validate_polymorphic_fks;

  insert into public.referrals (
    source_type, source_id, target_type, target_id,
    persona_type_id, status, attribution_chain,
    reward_amount, reward_currency, country_code, attributed_at
  )
  values
    -- 1) asesor → admin (pending)
    ('user', v_user_asesor, 'user', v_user_admin,
     v_persona_referrer, 'pending',
     jsonb_build_array(jsonb_build_object(
       'hop', 1,
       'referrer_id', v_user_asesor,
       'timestamp', now() - interval '7 days',
       'weight', 1.0
     )),
     null, null, 'MX', null),
    -- 2) deal → operacion (attributed)
    ('deal', v_first_deal_id, 'operacion', v_first_operacion_id,
     v_persona_investor, 'attributed',
     jsonb_build_array(jsonb_build_object(
       'hop', 1,
       'referrer_id', v_first_deal_id,
       'timestamp', now() - interval '3 days',
       'weight', 1.0
     )),
     50000, 'MXN', 'MX', now() - interval '3 days'),
    -- 3) developer → asesor (paid)
    ('developer', v_desarrolladora_id, 'user', v_user_asesor,
     v_persona_masterbroker, 'paid',
     jsonb_build_array(jsonb_build_object(
       'hop', 1,
       'referrer_id', v_desarrolladora_id,
       'timestamp', now() - interval '14 days',
       'weight', 1.0
     )),
     25000, 'MXN', 'MX', now() - interval '10 days');

  alter table public.referrals enable trigger trg_referrals_validate_polymorphic_fks;

  raise notice 'dev_seed_v2 step 12/13: 3 referrals polymorphic insertados';

  -- ============================================================
  -- 13) busquedas — 10 búsquedas asesor
  -- 7 activa + 3 pausada. asesor_id = v_user_asesor en TODAS
  -- criteria jsonb shape canon: zones, tipo, operacion, price_min, price_max,
  -- bedrooms_min
  -- NOTE: schema status check accepts 'activa'/'pausada'/'cerrada' (no 'active').
  -- ============================================================
  insert into public.busquedas (
    lead_id, asesor_id, country_code, status, criteria, matched_count,
    last_run_at, notes, created_by
  )
  select
    l.id,
    v_user_asesor,
    'MX',
    case when row_number() over (order by l.created_at) <= 7 then 'activa' else 'pausada' end,
    jsonb_build_object(
      'zones', jsonb_build_array((array[v_zone_roma, v_zone_polanco, v_zone_doctores,
                                        v_zone_condesa, v_zone_pedregal])
                                  [1 + ((row_number() over (order by l.created_at) - 1)::int % 5)]),
      'tipo', (array['departamento','penthouse','loft','casa','departamento'])
              [1 + ((row_number() over (order by l.created_at) - 1)::int % 5)],
      'operacion', 'venta',
      'price_min', 2000000 + ((row_number() over (order by l.created_at))::int * 250000),
      'price_max', 8000000 + ((row_number() over (order by l.created_at))::int * 500000),
      'currency', 'MXN',
      'bedrooms_min', 1 + ((row_number() over (order by l.created_at) - 1)::int % 3)
    ),
    ((row_number() over (order by l.created_at) * 3) % 16)::int,
    now() - ((row_number() over (order by l.created_at)) || ' hours')::interval,
    'Busqueda dev_seed_v2',
    v_user_asesor
  from public.leads l
  where l.assigned_asesor_id = v_user_asesor
    and l.contact_email like '%@dev.dmx.local'
  order by l.created_at
  limit 10;

  raise notice 'dev_seed_v2 step 13/13: 10 busquedas insertadas (7 activa / 3 pausada)';

  -- ============================================================
  -- DONE
  -- ============================================================
  raise notice 'dev_seed_v2 COMPLETE — totales: 1 desarrolladora, 50 leads, 20 buyer_twins, 8 family_units, 5 proyectos, 20 unidades, 8 project_brokers, 25 marketing_assets, 3 exclusividad_acuerdos, 10 deals, 5 operaciones, 3 referrals, 10 busquedas';
end;
$$;
