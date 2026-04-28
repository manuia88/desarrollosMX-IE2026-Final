-- ADR-059 — Querétaro city expansion (FASE 14.1) — Paso 2: 5 proyectos seed.
-- Inserción manual diferida a sub-bloque ingest. Ejecutable independiente vía MCP apply_migration
-- o vía script CLI. NO crea tablas — reuse public.proyectos existing.
--
-- Pre-condiciones (assumed):
--   1. desarrolladoras seed con un placeholder dev_id constante (overrideable per env via psql variable).
--   2. zones rows Querétaro ya cargadas via loadQueretaroZones() data-loader.ts.
--
-- Idempotente: ON CONFLICT (slug) DO NOTHING.

-- Variable placeholder: reemplazar :dev_id_qro al ejecutar (ej. \set dev_id_qro 'uuid-real').
-- Default fallback usa la primera desarrolladora activa MX si :dev_id_qro no se setea.

with dev as (
  select coalesce(
    nullif(current_setting('queretaro.dev_id', true), ''),
    (select id::text from public.desarrolladoras where country_code = 'MX' and is_active = true order by created_at limit 1)
  )::uuid as id
),
qro_zones as (
  select scope_id, id as zone_id from public.zones
  where country_code = 'MX'
    and scope_type = 'zona'
    and parent_scope_id = 'queretaro'
)
insert into public.proyectos (
  nombre, slug, desarrolladora_id, zone_id, country_code, ciudad, colonia,
  status, tipo, operacion,
  units_total, units_available,
  price_min_mxn, price_max_mxn, currency,
  bedrooms_range, amenities, description,
  privacy_level, is_active, meta
)
select * from (
  select
    'Juriquilla Towers'::text                              as nombre,
    'qro-juriquilla-towers'::text                          as slug,
    (select id from dev)                                   as desarrolladora_id,
    (select zone_id from qro_zones where scope_id = 'mx-queretaro-juriquilla')         as zone_id,
    'MX'::char(2)                                          as country_code,
    'Querétaro'::text                                      as ciudad,
    'Juriquilla'::text                                     as colonia,
    'preventa'::public.proyecto_status                     as status,
    'departamento'::public.proyecto_tipo                   as tipo,
    'venta'::public.proyecto_operacion                     as operacion,
    120::integer                                           as units_total,
    96::integer                                            as units_available,
    7000000::numeric(14, 2)                                as price_min_mxn,
    15000000::numeric(14, 2)                               as price_max_mxn,
    'MXN'::char(3)                                         as currency,
    array[2, 4]::integer[]                                 as bedrooms_range,
    '["alberca","gym","seguridad24","co-working","sky-lounge"]'::jsonb as amenities,
    'Torres residenciales de lujo en Juriquilla con amenidades premium y vista al campo de golf.'::text as description,
    'public'::public.proyecto_privacy                      as privacy_level,
    true::boolean                                          as is_active,
    '{"city":"queretaro","seed":"adr-059"}'::jsonb         as meta
  union all
  select
    'El Refugio Residences', 'qro-el-refugio-residences',
    (select id from dev),
    (select zone_id from qro_zones where scope_id = 'mx-queretaro-el-refugio'),
    'MX', 'Querétaro', 'El Refugio',
    'construccion'::public.proyecto_status, 'departamento'::public.proyecto_tipo, 'venta'::public.proyecto_operacion,
    180, 142, 4000000, 8000000, 'MXN',
    array[1, 3]::integer[],
    '["alberca","gym","seguridad24","jardines","areas-infantiles"]'::jsonb,
    'Residencial mid-premium familiar en El Refugio, conectividad directa con corredores principales.',
    'public'::public.proyecto_privacy, true, '{"city":"queretaro","seed":"adr-059"}'::jsonb
  union all
  select
    'Cumbres del Lago Park', 'qro-cumbres-del-lago-park',
    (select id from dev),
    (select zone_id from qro_zones where scope_id = 'mx-queretaro-cumbres-del-lago'),
    'MX', 'Querétaro', 'Cumbres del Lago',
    'preventa'::public.proyecto_status, 'casa'::public.proyecto_tipo, 'venta'::public.proyecto_operacion,
    60, 48, 5000000, 9000000, 'MXN',
    array[3, 4]::integer[],
    '["alberca","casa-club","seguridad24","areas-verdes","cancha-tenis"]'::jsonb,
    'Comunidad familiar con casas de 3 y 4 recámaras frente al lago, áreas verdes extensas.',
    'public'::public.proyecto_privacy, true, '{"city":"queretaro","seed":"adr-059"}'::jsonb
  union all
  select
    'Centro Histórico Lofts', 'qro-centro-historico-lofts',
    (select id from dev),
    (select zone_id from qro_zones where scope_id = 'mx-queretaro-centro-historico'),
    'MX', 'Querétaro', 'Centro Histórico',
    'terminado'::public.proyecto_status, 'loft'::public.proyecto_tipo, 'venta'::public.proyecto_operacion,
    24, 18, 3000000, 6000000, 'MXN',
    array[1, 2]::integer[],
    '["roof-garden","co-working","seguridad24","patrimonio-historico"]'::jsonb,
    'Lofts boutique en edificio restaurado del Centro Histórico, ideal para inversión turística.',
    'public'::public.proyecto_privacy, true, '{"city":"queretaro","seed":"adr-059"}'::jsonb
  union all
  select
    'Antigua Hacienda Villas', 'qro-antigua-hacienda-villas',
    (select id from dev),
    (select zone_id from qro_zones where scope_id = 'mx-queretaro-antigua-hacienda'),
    'MX', 'Querétaro', 'Antigua Hacienda',
    'construccion'::public.proyecto_status, 'casa'::public.proyecto_tipo, 'venta'::public.proyecto_operacion,
    36, 30, 10000000, 22000000, 'MXN',
    array[3, 5]::integer[],
    '["alberca","casa-club","seguridad24","caballerizas","spa","gym"]'::jsonb,
    'Villas de lujo en hacienda restaurada con caballerizas, spa y servicios concierge.',
    'public'::public.proyecto_privacy, true, '{"city":"queretaro","seed":"adr-059"}'::jsonb
) as seed_data
on conflict (slug) do nothing;
