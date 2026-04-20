-- FASE 08 / BLOQUE 8.F.8 — Cascadas formales triggers SQL.
-- Ref: plan §BLOQUE 8.F.2 + ADR-010 §D7 (6 cascadas formales).
--
-- geo_data_updated — AFTER INSERT ON geo_data_points FOR EACH STATEMENT.
--   Aggrega por (source, zone_id, country_code) y enqueues scores afectados
--   según CASCADE_GRAPH.geo_data_updated (keep aligned con TS constant).
--
-- macro_updated — AFTER INSERT ON macro_series FOR EACH STATEMENT.
--   Enqueues A01, A03, A04, A05, B02, B12, D01, C05 batch_mode priority 8
--   para zonas activas del country afectado.
--
-- Dedup automático en enqueue_score_recalc via UNIQUE partial index.

-- ============================================================
-- fn_cascade_geo_data_updated — source → scores per CASCADE_GRAPH
-- ============================================================
create or replace function public.fn_cascade_geo_data_updated(
  p_source text,
  p_zone_id uuid,
  p_country char(2)
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scores text[];
  v_score text;
  v_enqueued int := 0;
  v_result jsonb;
begin
  v_scores := case p_source
    when 'denue' then array['F03','N01','N02','N03','N08','N09','N10']
    when 'fgj' then array['F01','N04','N09']
    when 'gtfs' then array['F02','N02','N05','N08']
    when 'siged' then array['H01','N06','N10']
    when 'dgis' then array['H02','N10']
    when 'sacmex' then array['F05','N07','H10','N05']
    when 'atlas_riesgos' then array['H03','N05']
    when 'rama' then array['F04']
    when 'inah' then array['H08']
    else array[]::text[]
  end;

  if p_zone_id is null then
    return 0;
  end if;

  foreach v_score in array v_scores loop
    v_result := public.enqueue_score_recalc(
      v_score, 'zone', p_zone_id, p_country, 'cascade:geo_data_updated:' || p_source, 8, true, null
    );
    if (v_result ->> 'enqueued')::boolean then
      v_enqueued := v_enqueued + 1;
    end if;
  end loop;

  return v_enqueued;
end;
$$;

comment on function public.fn_cascade_geo_data_updated is
  'Enqueues scores afectados por geo_data_updated:<source> para una zona. '
  'Source → scores mapping alineado con shared/lib/intelligence-engine/cascades/'
  'dependency-graph.ts (F1 CASCADE_GRAPH). Priority 8 batch_mode.';

grant execute on function public.fn_cascade_geo_data_updated to service_role;

-- ============================================================
-- trg_geo_data_points_cascade — AFTER INSERT FOR EACH STATEMENT
-- ============================================================
create or replace function public.fn_trg_geo_data_points_cascade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select distinct source, zone_id, country_code
    from new_rows
    where zone_id is not null
  loop
    perform public.fn_cascade_geo_data_updated(r.source, r.zone_id, r.country_code);
  end loop;
  return null;
end;
$$;

drop trigger if exists trg_geo_data_points_cascade on public.geo_data_points;
create trigger trg_geo_data_points_cascade
  after insert on public.geo_data_points
  referencing new table as new_rows
  for each statement
  execute function public.fn_trg_geo_data_points_cascade();

comment on trigger trg_geo_data_points_cascade on public.geo_data_points is
  'Cascade geo_data_updated — enqueue scores N0 afectados al INSERT. '
  'STATEMENT-level para evitar explosión en bulk inserts (ingestor batch 500 rows).';

-- ============================================================
-- fn_cascade_macro_updated — Enqueues A01..C05 para zonas activas país
-- ============================================================
create or replace function public.fn_cascade_macro_updated(
  p_country char(2)
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scores text[] := array['A01','A03','A04','A05','B02','B12','D01','C05'];
  v_score text;
  v_zone record;
  v_enqueued int := 0;
  v_result jsonb;
begin
  -- Batch enqueue por todas las zonas activas del country.
  -- Protección runtime: si no hay tabla zones o está vacía, no-op.
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='zones') then
    return 0;
  end if;

  for v_zone in
    select id from public.zones where country_code = p_country limit 500
  loop
    foreach v_score in array v_scores loop
      v_result := public.enqueue_score_recalc(
        v_score, 'zone', v_zone.id, p_country, 'cascade:macro_updated', 8, true, null
      );
      if (v_result ->> 'enqueued')::boolean then
        v_enqueued := v_enqueued + 1;
      end if;
    end loop;
  end loop;

  return v_enqueued;
end;
$$;

grant execute on function public.fn_cascade_macro_updated to service_role;

-- ============================================================
-- trg_macro_series_cascade — AFTER INSERT FOR EACH STATEMENT
-- ============================================================
create or replace function public.fn_trg_macro_series_cascade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select distinct country_code
    from new_rows
  loop
    perform public.fn_cascade_macro_updated(r.country_code);
  end loop;
  return null;
end;
$$;

drop trigger if exists trg_macro_series_cascade on public.macro_series;
create trigger trg_macro_series_cascade
  after insert on public.macro_series
  referencing new table as new_rows
  for each statement
  execute function public.fn_trg_macro_series_cascade();

comment on trigger trg_macro_series_cascade on public.macro_series is
  'Cascade macro_updated — enqueue A01..C05 para todas zonas activas del country. '
  'Priority 8 batch_mode. Cap 500 zonas per statement para no saturar queue.';
