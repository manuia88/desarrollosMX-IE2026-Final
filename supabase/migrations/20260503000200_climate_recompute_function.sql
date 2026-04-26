-- F1.C.A — Deterministic recompute of climate_monthly_aggregates from raw observations.
--
-- Inputs:
--   p_zone_id    uuid NULL → recompute every zone
--   p_year_month date NULL → recompute every month
--
-- Behavior per (zone_id, year_month) with at least one observation:
--   1. NOAA only             → winner=NOAA,    source='noaa',    status='single_source_noaa'
--   2. CONAGUA only          → winner=CONAGUA, source='conagua', status='single_source_conagua'
--   3. BOTH and within tol   → winner=CONAGUA, source='conagua', status='cross_validated_match'
--                              (CONAGUA preferred = local authority MX, station density 13 vs 8 NOAA)
--   4. BOTH and outside tol  → winner=NOAA,    source='noaa',    status='cross_validated_outlier_noaa_winner'
--                              (NOAA preferred on disagreement = international QA flags)
--
-- Tolerance rule:
--   |temp_avg_noaa − temp_avg_conagua| ≤ 5.0 °C
--   AND
--   |rainfall_noaa − rainfall_conagua| / GREATEST(avg(rainfall), 1.0) ≤ 0.30
--
-- extreme_events_count es UNION (sum per key) regardless of winner — no se pierde
-- señal heat/cold del loser source.
--
-- search_path='' mandatory (defense-in-depth vs search-path attack).
-- SECDEF: agrega entre dos tablas RLS-protected y escribe a una tercera; equivale
-- a service-role-only orchestration RPC.

create or replace function public.recompute_climate_aggregates_from_observations(
  p_zone_id uuid default null,
  p_year_month date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_rows_inserted int := 0;
  v_rows_updated int := 0;
  v_single_noaa_count int := 0;
  v_single_conagua_count int := 0;
  v_match_count int := 0;
  v_outlier_count int := 0;
  v_observations_seen int := 0;
  v_temp_tol_c constant numeric := 5.0;
  v_rain_tol_pct constant numeric := 0.30;
begin
  with grouped as (
    select
      o.zone_id,
      o.year_month,
      max(case when o.source = 'noaa' then o.temp_avg end) as temp_avg_noaa,
      max(case when o.source = 'noaa' then o.temp_max end) as temp_max_noaa,
      max(case when o.source = 'noaa' then o.temp_min end) as temp_min_noaa,
      max(case when o.source = 'noaa' then o.rainfall_mm end) as rainfall_noaa,
      max(case when o.source = 'noaa' then o.humidity_avg end) as humidity_noaa,
      max(case when o.source = 'conagua' then o.temp_avg end) as temp_avg_conagua,
      max(case when o.source = 'conagua' then o.temp_max end) as temp_max_conagua,
      max(case when o.source = 'conagua' then o.temp_min end) as temp_min_conagua,
      max(case when o.source = 'conagua' then o.rainfall_mm end) as rainfall_conagua,
      bool_or(o.source = 'noaa') as has_noaa,
      bool_or(o.source = 'conagua') as has_conagua,
      count(*) as obs_count
    from public.climate_source_observations o
    where (p_zone_id is null or o.zone_id = p_zone_id)
      and (p_year_month is null or o.year_month = p_year_month)
    group by o.zone_id, o.year_month
  ),
  -- extreme_events_count UNION via separate aggregation step.
  extreme_union as (
    select
      o.zone_id,
      o.year_month,
      coalesce(jsonb_object_agg(k, sumv), '{}'::jsonb) as extreme_count
    from (
      select
        o.zone_id,
        o.year_month,
        k.key as k,
        sum((k.value)::text::numeric) as sumv
      from public.climate_source_observations o,
        lateral jsonb_each(o.extreme_events_count) as k
      where (p_zone_id is null or o.zone_id = p_zone_id)
        and (p_year_month is null or o.year_month = p_year_month)
      group by o.zone_id, o.year_month, k.key
    ) o
    group by o.zone_id, o.year_month
  ),
  decided as (
    select
      g.zone_id,
      g.year_month,
      coalesce(eu.extreme_count, '{}'::jsonb) as extreme_count,
      g.obs_count,
      -- match condition: both sources present + within both tolerances
      (g.has_noaa and g.has_conagua
        and g.temp_avg_noaa is not null and g.temp_avg_conagua is not null
        and abs(g.temp_avg_noaa - g.temp_avg_conagua) <= v_temp_tol_c
        and coalesce(
          abs(coalesce(g.rainfall_noaa, 0) - coalesce(g.rainfall_conagua, 0))
          / greatest((coalesce(g.rainfall_noaa, 0) + coalesce(g.rainfall_conagua, 0)) / 2.0, 1.0),
          0
        ) <= v_rain_tol_pct
      ) as is_match,
      g.has_noaa,
      g.has_conagua,
      g.temp_avg_noaa,
      g.temp_max_noaa,
      g.temp_min_noaa,
      g.rainfall_noaa,
      g.humidity_noaa,
      g.temp_avg_conagua,
      g.temp_max_conagua,
      g.temp_min_conagua,
      g.rainfall_conagua
    from grouped g
    left join extreme_union eu
      on eu.zone_id = g.zone_id and eu.year_month = g.year_month
  ),
  resolved as (
    select
      d.zone_id,
      d.year_month,
      d.extreme_count,
      case
        when d.is_match then 'cross_validated_match'
        when d.has_noaa and d.has_conagua then 'cross_validated_outlier_noaa_winner'
        when d.has_noaa then 'single_source_noaa'
        when d.has_conagua then 'single_source_conagua'
        else 'no_data'
      end as status,
      case
        when d.is_match then 'conagua'
        when d.has_noaa and d.has_conagua then 'noaa'
        when d.has_noaa then 'noaa'
        when d.has_conagua then 'conagua'
        else 'heuristic_v1'
      end as winner_source,
      case
        when d.is_match then d.temp_avg_conagua
        when d.has_noaa and d.has_conagua then d.temp_avg_noaa
        when d.has_conagua then d.temp_avg_conagua
        else d.temp_avg_noaa
      end as w_temp_avg,
      case
        when d.is_match then d.temp_max_conagua
        when d.has_noaa and d.has_conagua then d.temp_max_noaa
        when d.has_conagua then d.temp_max_conagua
        else d.temp_max_noaa
      end as w_temp_max,
      case
        when d.is_match then d.temp_min_conagua
        when d.has_noaa and d.has_conagua then d.temp_min_noaa
        when d.has_conagua then d.temp_min_conagua
        else d.temp_min_noaa
      end as w_temp_min,
      case
        when d.is_match then d.rainfall_conagua
        when d.has_noaa and d.has_conagua then d.rainfall_noaa
        when d.has_conagua then d.rainfall_conagua
        else d.rainfall_noaa
      end as w_rainfall_mm,
      d.humidity_noaa as w_humidity_avg
    from decided d
  ),
  upserted as (
    insert into public.climate_monthly_aggregates as a (
      zone_id, year_month,
      temp_avg, temp_max, temp_min, rainfall_mm, humidity_avg,
      extreme_events_count, source, computed_at, cross_validation_status
    )
    select
      r.zone_id, r.year_month,
      r.w_temp_avg, r.w_temp_max, r.w_temp_min, r.w_rainfall_mm, r.w_humidity_avg,
      r.extreme_count,
      r.winner_source,
      now(),
      r.status
    from resolved r
    on conflict (zone_id, year_month) do update
      set temp_avg = excluded.temp_avg,
          temp_max = excluded.temp_max,
          temp_min = excluded.temp_min,
          rainfall_mm = excluded.rainfall_mm,
          humidity_avg = excluded.humidity_avg,
          extreme_events_count = excluded.extreme_events_count,
          source = excluded.source,
          computed_at = excluded.computed_at,
          cross_validation_status = excluded.cross_validation_status
    returning (xmax = 0) as inserted, cross_validation_status
  )
  select
    sum(case when inserted then 1 else 0 end),
    sum(case when not inserted then 1 else 0 end),
    sum(case when cross_validation_status = 'single_source_noaa' then 1 else 0 end),
    sum(case when cross_validation_status = 'single_source_conagua' then 1 else 0 end),
    sum(case when cross_validation_status = 'cross_validated_match' then 1 else 0 end),
    sum(case when cross_validation_status like 'cross_validated_outlier_%' then 1 else 0 end)
  into v_rows_inserted, v_rows_updated,
       v_single_noaa_count, v_single_conagua_count,
       v_match_count, v_outlier_count
  from upserted;

  select count(*) into v_observations_seen
  from public.climate_source_observations o
  where (p_zone_id is null or o.zone_id = p_zone_id)
    and (p_year_month is null or o.year_month = p_year_month);

  return jsonb_build_object(
    'rows_inserted', coalesce(v_rows_inserted, 0),
    'rows_updated', coalesce(v_rows_updated, 0),
    'single_noaa_count', coalesce(v_single_noaa_count, 0),
    'single_conagua_count', coalesce(v_single_conagua_count, 0),
    'match_count', coalesce(v_match_count, 0),
    'outlier_count', coalesce(v_outlier_count, 0),
    'observations_seen', coalesce(v_observations_seen, 0),
    'temp_tolerance_c', v_temp_tol_c,
    'rainfall_tolerance_pct', v_rain_tol_pct
  );
end;
$function$;

comment on function public.recompute_climate_aggregates_from_observations(uuid, date) is
  'F1.C.A — deterministic recompute of climate_monthly_aggregates from '
  'climate_source_observations. SECDEF + search_path='''' (defense-in-depth). '
  'Cross-validation rules: temp tol 5°C, rainfall tol 30%. Match → CONAGUA winner '
  '(local authority). Outlier → NOAA winner (international QA). Returns jsonb stats. '
  'Invocation: SELECT public.recompute_climate_aggregates_from_observations(NULL, NULL); '
  'for full recompute.';
