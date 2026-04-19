-- FASE 07b / BLOQUE 7b.F — AQI aggregate function for ENV score.
-- Refs:
--   docs/02_PLAN_MAESTRO/FASE_07b_STR_INTELLIGENCE_COMPLETE.md §7b.F
--
-- Aggregator que toma rows de geo_data_points (AQI ingest desde RAMA/SINAICA
-- en FASE 07) cercanas al market_id y calcula promedios 30d para feed env-score.
--
-- Distancia: ST_DWithin(market_centroid, geom, p_radius_m). Default 10km
-- (radio típico de cobertura de estación SINAICA en CDMX).
--
-- Source filter: source IN ('rama', 'sinaica', 'sedema') — todos los proxies
-- de calidad del aire registrados en allowlist.

create or replace function public.zone_aqi_summary(
  p_market_id uuid,
  p_radius_m integer default 10000,
  p_lookback_days integer default 30
)
returns table (
  market_id uuid,
  aqi_avg numeric,
  aqi_max numeric,
  aqi_min numeric,
  samples bigint,
  stations_count bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with market as (
    select id, country_code,
      coalesce(
        (select st_centroid(st_collect(l.geom))
         from public.str_listings l
         where l.market_id = m.id and l.geom is not null),
        null
      ) as centroid
    from public.str_markets m
    where m.id = p_market_id
  ),
  aqi_points as (
    select
      g.id,
      g.source_id as station_id,
      coalesce((g.meta->>'aqi')::numeric, (g.meta->>'aqi_value')::numeric) as aqi,
      g.valid_from
    from public.geo_data_points g
    cross join market
    where market.centroid is not null
      and g.country_code = market.country_code
      and g.source in ('rama', 'sinaica', 'sedema')
      and g.geom is not null
      and st_dwithin(g.geom::geography, market.centroid::geography, p_radius_m)
      and g.valid_from >= current_date - (p_lookback_days || ' days')::interval
      and (g.meta ? 'aqi' or g.meta ? 'aqi_value')
  )
  select
    p_market_id as market_id,
    round(avg(aqi)::numeric, 2) as aqi_avg,
    max(aqi) as aqi_max,
    min(aqi) as aqi_min,
    count(*)::bigint as samples,
    count(distinct station_id)::bigint as stations_count
  from aqi_points
  where aqi is not null;
$$;

comment on function public.zone_aqi_summary(uuid, integer, integer) is
  'AQI aggregate por market_id (radius 10km default, 30d lookback). Feed primario '
  'para zone-environmental-score (ENV) component. Source: geo_data_points filtrado '
  'a rama/sinaica/sedema. Si RAMA no está activado, returns 0 samples.';
