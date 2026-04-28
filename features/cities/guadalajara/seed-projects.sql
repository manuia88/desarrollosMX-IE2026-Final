-- FASE 14.1 — Guadalajara city expansion (ADR-059 §Step 2).
-- 5 proyectos seed GDL canónicos. Reuse `proyectos` table (M02 Desarrollos).
-- NO migration: este archivo es referencia / runner manual via psql post-deploy.
--
-- Pre-requisitos:
--   1. zones GDL ya seedeadas via features/cities/guadalajara/data-loader.ts → loadGuadalajaraZones()
--   2. Existe public.desarrolladoras row de tipo seed (placeholder) o ajustar desarrolladora_id manualmente
--
-- Currency: 'MXN' canon (ADR-051 multi-currency display).
-- price_min_mxn / price_max_mxn en MXN (no USD inline — Dubai usa USD/AED via FX).

with desarrolladora_seed as (
  select id from public.desarrolladoras
  where slug in ('seed-gdl', 'desarrollos-mx-seed')
  order by created_at asc
  limit 1
),
gdl_zones as (
  select scope_id, id as zone_id from public.zones
  where country_code = 'MX'
    and scope_type = 'colonia'
    and parent_scope_id = 'guadalajara'
)
insert into public.proyectos (
  nombre, slug, desarrolladora_id, zone_id, country_code,
  ciudad, colonia, status, tipo, operacion,
  price_min_mxn, price_max_mxn, currency,
  description, privacy_level, is_active, meta
)
select
  v.nombre, v.slug, ds.id, gz.zone_id, 'MX',
  'Guadalajara', v.colonia, v.status::public.proyecto_status,
  v.tipo::public.proyecto_tipo, 'venta'::public.proyecto_operacion,
  v.price_min_mxn, v.price_max_mxn, 'MXN',
  v.description, 'public'::public.proyecto_privacy, true,
  jsonb_build_object('seed_version', 'v1_h1_gdl', 'tier', v.tier)
from (values
  (
    'Andares Punto Sur', 'gdl-andares-punto-sur', 'MX-JAL-GDL-andares', 'Andares',
    'preventa', 'departamento', 8000000::numeric, 18000000::numeric,
    'Torres residenciales premium en Andares — el corazón financiero de Zapopan.',
    'lujo'
  ),
  (
    'Torres Providencia', 'gdl-torres-providencia', 'MX-JAL-GDL-providencia', 'Providencia',
    'construccion', 'departamento', 6000000::numeric, 12000000::numeric,
    'Torres premium en Providencia — barrio establecido con conectividad Av. Pablo Neruda.',
    'premium'
  ),
  (
    'Country Club Residences', 'gdl-country-club-residences', 'MX-JAL-GDL-country-club', 'Country Club',
    'preventa', 'penthouse', 10000000::numeric, 25000000::numeric,
    'Penthouse y residencias de lujo frente al Country Club — vistas panorámicas a la ciudad.',
    'lujo'
  ),
  (
    'Lafayette Living', 'gdl-lafayette-living', 'MX-JAL-GDL-lafayette', 'Lafayette',
    'construccion', 'departamento', 4000000::numeric, 8000000::numeric,
    'Lofts y departamentos en Lafayette — barrio cosmopolita con cafés y vida nocturna.',
    'mid-premium'
  ),
  (
    'Zapopan Sky', 'gdl-zapopan-sky', 'MX-JAL-GDL-zapopan-centro', 'Zapopan Centro',
    'preventa', 'departamento', 5000000::numeric, 10000000::numeric,
    'High-rise en Zapopan Centro — 30+ niveles con amenidades premium.',
    'high-rise'
  )
) as v(
  nombre, slug, scope_id, colonia,
  status, tipo, price_min_mxn, price_max_mxn,
  description, tier
)
join gdl_zones gz on gz.scope_id = v.scope_id
cross join desarrolladora_seed ds
on conflict (slug) do nothing;
