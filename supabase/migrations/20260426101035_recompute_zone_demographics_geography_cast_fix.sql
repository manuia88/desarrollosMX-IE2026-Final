-- F1.C.C Tier 2 Demographics — Geography cast fix for spatial overlay RPC
--
-- zones.boundary is geography type (not geometry). Original .200000 RPC used
-- ST_Intersects(geometry, geography) which silently emitted
-- 'lwgeom_distance_spheroid returned negative!' and returned 0 results.
--
-- Fix: cast z.boundary::geometry inside ST_Intersects and ST_Intersection.
-- Geometry-to-geography conversions are lossless within EPSG:4326 lon/lat
-- range and PostGIS auto-uses spatial GIST index when both sides are geometry.
--
-- Methodology version bumped: postgis_st_intersection_v1_geography_cast.

create or replace function public.recompute_zone_demographics_from_ageb(
  p_zone_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = 'public, pg_catalog'
as $function$
declare
  v_updated_count integer := 0;
  v_skipped_count integer := 0;
  v_errors text[] := array[]::text[];
  v_started_at timestamptz := now();
begin
  if not exists (select 1 from public.inegi_ageb_staging limit 1) then
    raise exception 'recompute_zone_demographics_from_ageb: inegi_ageb_staging is empty. Run AGEB ingest first.';
  end if;

  with overlap_data as (
    select
      z.id as zone_id,
      z.scope_id,
      z.scope_type,
      z.area_km2,
      a.cve_ent, a.cve_mun, a.cve_loc, a.cve_ageb,
      a.pobtot, a.tothog, a.graproes, a.pea, a.poblacion_12y,
      a.pob_0_14, a.pob_15_64, a.pob_65_mas,
      a.vph_inter, a.vph_pc,
      public.ST_Area(public.ST_Intersection(a.geom_4326, z.boundary::public.geometry)) /
        nullif(public.ST_Area(a.geom_4326), 0) as frac
    from public.zones z
    join public.inegi_ageb_staging a
      on public.ST_Intersects(a.geom_4326, z.boundary::public.geometry)
    where z.country_code = 'MX'
      and z.scope_type = 'colonia'
      and z.boundary is not null
      and (p_zone_id is null or z.id = p_zone_id)
  ),
  aggregated as (
    select
      zone_id,
      scope_id,
      max(area_km2) as area_km2,
      sum(pobtot * frac)::int                                         as poblacion_total,
      sum(tothog * frac)::int                                         as hogares_censales,
      sum(poblacion_12y * frac)::int                                  as poblacion_12_y_mas,
      case when sum(pobtot * frac) > 0
        then (sum(pob_0_14 * frac) / sum(pobtot * frac))::numeric(5,4)
        else null end                                                  as pct_pob_0_14,
      case when sum(pobtot * frac) > 0
        then (sum(pob_15_64 * frac) / sum(pobtot * frac))::numeric(5,4)
        else null end                                                  as pct_pob_15_64,
      case when sum(pobtot * frac) > 0
        then (sum(pob_65_mas * frac) / sum(pobtot * frac))::numeric(5,4)
        else null end                                                  as pct_pob_65_mas,
      case when sum(pobtot * frac) > 0
        then (sum(graproes * pobtot * frac) / sum(pobtot * frac))::numeric(5,2)
        else null end                                                  as graproes_anios,
      case when sum(poblacion_12y * frac) > 0
        then (sum(pea * frac) / sum(poblacion_12y * frac))::numeric(5,4)
        else null end                                                  as pea_ratio,
      case when sum(tothog * frac) > 0
        then (sum(vph_inter * frac) / sum(tothog * frac))::numeric(5,4)
        else null end                                                  as pct_viviendas_internet,
      case when sum(tothog * frac) > 0
        then (sum(vph_pc * frac) / sum(tothog * frac))::numeric(5,4)
        else null end                                                  as pct_viviendas_pc,
      count(*)::int                                                    as n_agebs_intersected,
      sum(frac)::numeric(8,4)                                          as total_overlap_fraction
    from overlap_data
    group by zone_id, scope_id
  ),
  upserted as (
    insert into public.inegi_census_zone_stats (
      zone_id, snapshot_date,
      poblacion_total, hogares_censales, poblacion_12_y_mas,
      densidad_hab_km2,
      data_origin,
      graproes_anios, pea_ratio,
      pct_pob_0_14, pct_pob_15_64, pct_pob_65_mas,
      pct_viviendas_internet, pct_viviendas_pc,
      per_ageb_aggregations
    )
    select
      a.zone_id,
      '2020-12-31'::date,
      a.poblacion_total, a.hogares_censales, a.poblacion_12_y_mas,
      case when a.area_km2 > 0
        then (a.poblacion_total / a.area_km2)::numeric(10,2)
        else null end as densidad_hab_km2,
      'inegi_ageb_overlay',
      a.graproes_anios, a.pea_ratio,
      a.pct_pob_0_14, a.pct_pob_15_64, a.pct_pob_65_mas,
      a.pct_viviendas_internet, a.pct_viviendas_pc,
      jsonb_build_object(
        'n_agebs_intersected', a.n_agebs_intersected,
        'total_overlap_fraction', a.total_overlap_fraction,
        'overlay_methodology', 'postgis_st_intersection_v1_geography_cast',
        'computed_at', now()
      )
    from aggregated a
    on conflict (zone_id, snapshot_date) do update
      set
        poblacion_total = excluded.poblacion_total,
        hogares_censales = excluded.hogares_censales,
        poblacion_12_y_mas = excluded.poblacion_12_y_mas,
        densidad_hab_km2 = excluded.densidad_hab_km2,
        data_origin = excluded.data_origin,
        graproes_anios = excluded.graproes_anios,
        pea_ratio = excluded.pea_ratio,
        pct_pob_0_14 = excluded.pct_pob_0_14,
        pct_pob_15_64 = excluded.pct_pob_15_64,
        pct_pob_65_mas = excluded.pct_pob_65_mas,
        pct_viviendas_internet = excluded.pct_viviendas_internet,
        pct_viviendas_pc = excluded.pct_viviendas_pc,
        per_ageb_aggregations = excluded.per_ageb_aggregations
    returning 1
  )
  select count(*) into v_updated_count from upserted;

  return jsonb_build_object(
    'updated_count', v_updated_count,
    'skipped_count', v_skipped_count,
    'errors', v_errors,
    'started_at', v_started_at,
    'completed_at', now(),
    'duration_ms', extract(epoch from (now() - v_started_at)) * 1000,
    'p_zone_id', p_zone_id,
    'methodology', 'postgis_st_intersection_v1_geography_cast'
  );
end;
$function$;
