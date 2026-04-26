-- F1.C.C Tier 2 Demographics — SECDEF batch loader staging
--
-- Server-side jsonb-driven INSERT/UPSERT into inegi_ageb_staging. Casts
-- GeoJSON text to PostGIS geometry via ST_GeomFromGeoJSON + ST_Multi +
-- ST_MakeValid (canon resilient para slivers + self-intersecting polygons).
--
-- Llamado desde tools/scripts/run-demographics-tier2-backfill.ts vía
-- supabase.rpc('load_inegi_ageb_staging_batch', { p_rows: [...] }) en chunks
-- de 200 rows. Service-role-only (allowlist v33).

create or replace function public.load_inegi_ageb_staging_batch(
  p_rows jsonb
) returns integer
language plpgsql
security definer
set search_path = 'public, pg_catalog'
as $$
declare
  v_inserted integer := 0;
  v_row jsonb;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'load_inegi_ageb_staging_batch: p_rows must be jsonb array';
  end if;

  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    insert into public.inegi_ageb_staging (
      cve_ent, cve_mun, cve_loc, cve_ageb,
      geom_4326,
      pobtot, poblacion_12y, pob_0_14, pob_15_64, pob_65_mas,
      tothog, graproes, pea, vph_inter, vph_pc
    )
    values (
      v_row->>'cve_ent',
      v_row->>'cve_mun',
      v_row->>'cve_loc',
      v_row->>'cve_ageb',
      public.ST_Multi(public.ST_MakeValid(public.ST_GeomFromGeoJSON(v_row->>'geom_geojson_text'))),
      nullif(v_row->>'pobtot','')::int,
      nullif(v_row->>'poblacion_12y','')::int,
      nullif(v_row->>'pob_0_14','')::int,
      nullif(v_row->>'pob_15_64','')::int,
      nullif(v_row->>'pob_65_mas','')::int,
      nullif(v_row->>'tothog','')::int,
      nullif(v_row->>'graproes','')::numeric(5,2),
      nullif(v_row->>'pea','')::int,
      nullif(v_row->>'vph_inter','')::int,
      nullif(v_row->>'vph_pc','')::int
    )
    on conflict (cve_ent, cve_mun, cve_loc, cve_ageb) do update
      set
        geom_4326 = excluded.geom_4326,
        pobtot = excluded.pobtot,
        poblacion_12y = excluded.poblacion_12y,
        pob_0_14 = excluded.pob_0_14,
        pob_15_64 = excluded.pob_15_64,
        pob_65_mas = excluded.pob_65_mas,
        tothog = excluded.tothog,
        graproes = excluded.graproes,
        pea = excluded.pea,
        vph_inter = excluded.vph_inter,
        vph_pc = excluded.vph_pc,
        imported_at = now();
    v_inserted := v_inserted + 1;
  end loop;

  return v_inserted;
end;
$$;

comment on function public.load_inegi_ageb_staging_batch(jsonb) is
  'F1.C.C Tier 2: SECDEF batch loader. INSERT/UPDATE inegi_ageb_staging desde jsonb array, casts GeoJSON text to PostGIS via ST_GeomFromGeoJSON + ST_Multi + ST_MakeValid. Service-role-only.';

grant execute on function public.load_inegi_ageb_staging_batch(jsonb) to service_role;
