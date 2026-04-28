-- ADR-059 — Playa del Carmen seed projects
-- FASE 14.1 sub-agent 1
-- 5 proyectos seed referenciables (no marketing fake) — insert idempotente.
--
-- Pre-req: data-loader.ts ya UPSERT zones (scope_type='colonia', country_code='MX',
-- parent_scope_id='playa-del-carmen'). Subqueries linkean por zones.scope_id.
--
-- desarrolladora_id se resuelve via subquery a la primera desarrolladora activa
-- de country_code='MX' (placeholder seed H1). H2 reemplaza con desarrolladoras
-- reales Playa del Carmen via ingestion catastro local.
--
-- Skip silently si no hay desarrolladora MX o si zones aún no UPSERT.

-- 1) Mayakoba Residences (lujo, AVM 12-25M MXN) — Mayakoba area
insert into public.proyectos (
  nombre, slug, desarrolladora_id, zone_id, country_code,
  ciudad, colonia, lat, lng, status, tipo, operacion,
  units_total, price_min_mxn, price_max_mxn, currency,
  amenities, description, privacy_level, is_active, meta
)
select
  'Mayakoba Residences',
  'mayakoba-residences',
  d.id,
  z.id,
  'MX',
  'Playa del Carmen',
  'Mayakoba',
  20.685,
  -87.05,
  'preventa',
  'departamento',
  'venta',
  120,
  12000000,
  25000000,
  'MXN',
  '["alberca","gym","seguridad","spa","concierge","golf"]'::jsonb,
  'Residencias de lujo dentro del complejo Mayakoba — entorno selvático con cenotes y campos de golf.',
  'public',
  true,
  jsonb_build_object('seed_source', 'F14.1.0_playa', 'adr', 'ADR-059')
from public.desarrolladoras d
cross join lateral (
  select id from public.zones
   where country_code = 'MX'
     and scope_type = 'colonia'
     and scope_id = 'mx-qroo-playa-del-carmen-mayakoba'
   limit 1
) z
where d.country_code = 'MX'
  and d.is_active is true
order by d.created_at asc
limit 1
on conflict (slug) do nothing;

-- 2) The Reef Playa (mid, 4-7M) — Centro
insert into public.proyectos (
  nombre, slug, desarrolladora_id, zone_id, country_code,
  ciudad, colonia, lat, lng, status, tipo, operacion,
  units_total, price_min_mxn, price_max_mxn, currency,
  amenities, description, privacy_level, is_active, meta
)
select
  'The Reef Playa',
  'the-reef-playa',
  d.id,
  z.id,
  'MX',
  'Playa del Carmen',
  'Centro',
  20.6296,
  -87.0739,
  'construccion',
  'departamento',
  'venta',
  84,
  4000000,
  7000000,
  'MXN',
  '["alberca","gym","seguridad","roof-garden"]'::jsonb,
  'Desarrollo residencial mid-tier a pasos de la 5ta Avenida y la playa.',
  'public',
  true,
  jsonb_build_object('seed_source', 'F14.1.0_playa', 'adr', 'ADR-059')
from public.desarrolladoras d
cross join lateral (
  select id from public.zones
   where country_code = 'MX'
     and scope_type = 'colonia'
     and scope_id = 'mx-qroo-playa-del-carmen-centro'
   limit 1
) z
where d.country_code = 'MX'
  and d.is_active is true
order by d.created_at asc
limit 1
on conflict (slug) do nothing;

-- 3) Tao Inspired Living (familiar, 5-9M) — Selvamar
insert into public.proyectos (
  nombre, slug, desarrolladora_id, zone_id, country_code,
  ciudad, colonia, lat, lng, status, tipo, operacion,
  units_total, price_min_mxn, price_max_mxn, currency,
  amenities, description, privacy_level, is_active, meta
)
select
  'Tao Inspired Living',
  'tao-inspired-living',
  d.id,
  z.id,
  'MX',
  'Playa del Carmen',
  'Selvamar',
  20.6577,
  -87.085,
  'terminado',
  'casa',
  'venta',
  60,
  5000000,
  9000000,
  'MXN',
  '["alberca","gym","seguridad","clubhouse","golf-practice"]'::jsonb,
  'Comunidad residencial familiar con clubhouse y áreas verdes en Selvamar.',
  'public',
  true,
  jsonb_build_object('seed_source', 'F14.1.0_playa', 'adr', 'ADR-059')
from public.desarrolladoras d
cross join lateral (
  select id from public.zones
   where country_code = 'MX'
     and scope_type = 'colonia'
     and scope_id = 'mx-qroo-playa-del-carmen-selvamar'
   limit 1
) z
where d.country_code = 'MX'
  and d.is_active is true
order by d.created_at asc
limit 1
on conflict (slug) do nothing;

-- 4) Anah Suites (boutique, 3-5M) — Playacar Fase 1
insert into public.proyectos (
  nombre, slug, desarrolladora_id, zone_id, country_code,
  ciudad, colonia, lat, lng, status, tipo, operacion,
  units_total, price_min_mxn, price_max_mxn, currency,
  amenities, description, privacy_level, is_active, meta
)
select
  'Anah Suites',
  'anah-suites',
  d.id,
  z.id,
  'MX',
  'Playa del Carmen',
  'Playacar Fase 1',
  20.6195,
  -87.0762,
  'terminado',
  'departamento',
  'venta',
  48,
  3000000,
  5000000,
  'MXN',
  '["alberca","seguridad","beach-club"]'::jsonb,
  'Suites boutique en Playacar Fase 1, acceso a beach club privado.',
  'public',
  true,
  jsonb_build_object('seed_source', 'F14.1.0_playa', 'adr', 'ADR-059')
from public.desarrolladoras d
cross join lateral (
  select id from public.zones
   where country_code = 'MX'
     and scope_type = 'colonia'
     and scope_id = 'mx-qroo-playa-del-carmen-playacar-fase-1'
   limit 1
) z
where d.country_code = 'MX'
  and d.is_active is true
order by d.created_at asc
limit 1
on conflict (slug) do nothing;

-- 5) SLS Playa (lujo, 15-30M) — 5ta Avenida
insert into public.proyectos (
  nombre, slug, desarrolladora_id, zone_id, country_code,
  ciudad, colonia, lat, lng, status, tipo, operacion,
  units_total, price_min_mxn, price_max_mxn, currency,
  amenities, description, privacy_level, is_active, meta
)
select
  'SLS Playa',
  'sls-playa',
  d.id,
  z.id,
  'MX',
  'Playa del Carmen',
  '5ta Avenida',
  20.63,
  -87.075,
  'preventa',
  'departamento',
  'venta',
  72,
  15000000,
  30000000,
  'MXN',
  '["alberca","gym","seguridad","spa","concierge","beach-club","valet"]'::jsonb,
  'Residencias de lujo con servicios SLS Hotels en plena 5ta Avenida.',
  'public',
  true,
  jsonb_build_object('seed_source', 'F14.1.0_playa', 'adr', 'ADR-059')
from public.desarrolladoras d
cross join lateral (
  select id from public.zones
   where country_code = 'MX'
     and scope_type = 'colonia'
     and scope_id = 'mx-qroo-playa-del-carmen-quinta-avenida'
   limit 1
) z
where d.country_code = 'MX'
  and d.is_active is true
order by d.created_at asc
limit 1
on conflict (slug) do nothing;
