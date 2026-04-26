-- F1.D Geometry Real (GeoJSON CDMX MGN) — atomic boundary update SECDEF helper
--
-- Replaces synthetic bbox-500m uniform polygons with real MGN polygons fetched
-- from datos.cdmx.gob.mx CKAN (1814 colonias FeatureCollection).
--
-- Usage from backfill script: invoke RPC per zone with geojson_text + computed
-- centroid (lat/lng) + area_km2. Function uses PostGIS ST_GeomFromGeoJSON.
--
-- Matched zone subset: 210 colonias + 16 alcaldías CDMX (zones with country_code='MX').
-- Unmatched: 1604 colonias IECM remaining → L-NEW-EXPAND-CDMX-COLONIAS-FULL (defer H2).
--
-- BIBLIA DECISIÓN 2: zero data loss — UPDATE atomic preserves all other columns.
-- ADR-018: function logs to ingest_runs for observability (cron forward).

create or replace function public.update_zone_boundary_from_geojson(
  p_zone_id uuid,
  p_geojson_text text,
  p_area_km2 numeric,
  p_lat_centroid numeric,
  p_lng_centroid numeric
) returns jsonb
language plpgsql
security definer
set search_path = 'public, pg_catalog'
as $$
declare
  v_old_area numeric;
  v_new_geom public.geometry;
begin
  -- Validate input
  if p_zone_id is null or p_geojson_text is null then
    raise exception 'update_zone_boundary_from_geojson: zone_id and geojson_text required';
  end if;

  -- Parse + validate geometry
  begin
    v_new_geom := public.ST_GeomFromGeoJSON(p_geojson_text);
  exception
    when others then
      raise exception 'update_zone_boundary_from_geojson: invalid geojson for zone %', p_zone_id;
  end;

  -- Capture old area for audit
  select area_km2 into v_old_area from public.zones where id = p_zone_id;
  if not found then
    raise exception 'update_zone_boundary_from_geojson: zone % not found', p_zone_id;
  end if;

  -- Atomic update boundary + centroid + area
  update public.zones
    set boundary = v_new_geom,
        area_km2 = p_area_km2,
        lat = p_lat_centroid,
        lng = p_lng_centroid,
        updated_at = now()
  where id = p_zone_id;

  return jsonb_build_object(
    'zone_id', p_zone_id,
    'old_area_km2', v_old_area,
    'new_area_km2', p_area_km2,
    'new_lat', p_lat_centroid,
    'new_lng', p_lng_centroid,
    'updated_at', now()
  );
end;
$$;

comment on function public.update_zone_boundary_from_geojson(uuid, text, numeric, numeric, numeric)
  is 'F1.D Geometry Real: atomic boundary UPSERT from GeoJSON. Replaces synthetic bbox-500m uniform with MGN polygons. Returns jsonb diff.';

grant execute on function public.update_zone_boundary_from_geojson(uuid, text, numeric, numeric, numeric) to service_role;
