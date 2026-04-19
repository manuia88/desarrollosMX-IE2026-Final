-- Helpers RPC para confidence_thresholds + zone_tiers + cron schedule.
-- Las TABLAS ya existen desde 20260418080400_ingest_meta_schema.sql con seed
-- inicial (10 rows confidence_thresholds, zone_tiers vacía).
--
-- Esta migration añade SOLO las funciones de consumo + el cron nightly
-- para recompute zone_tiers. Plan §7.J + §7.K.
--
-- FASE 07 / BLOQUE 7.J + 7.K
-- Refs:
--   docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.J + §7.K

-- ============================================================
-- confidence_level_for(source, metric, sample_size) → text
-- Devuelve 'high' | 'medium' | 'low' | 'insufficient' | 'unknown'.
-- ============================================================
create or replace function public.confidence_level_for(
  p_source text,
  p_metric text,
  p_sample_size integer
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_high integer;
  v_med integer;
  v_low integer;
begin
  select min_sample_high, min_sample_medium, min_sample_low
    into v_high, v_med, v_low
  from public.confidence_thresholds
  where source = p_source and metric = p_metric;

  if v_high is null then
    return 'unknown';
  end if;
  if p_sample_size >= v_high then return 'high'; end if;
  if p_sample_size >= v_med then return 'medium'; end if;
  if p_sample_size >= v_low then return 'low'; end if;
  return 'insufficient';
end;
$$;

grant execute on function public.confidence_level_for(text, text, integer)
  to authenticated, anon, service_role;

comment on function public.confidence_level_for(text, text, integer) is
  'Lookup confidence cascade: high/medium/low/insufficient/unknown. Plan §7.J.';

-- ============================================================
-- recompute_zone_tier(...) — upsert tier asignado a una zona.
-- Tier 4: sales >= 100. Tier 3: projects >= 50 AND months >= 6.
-- Tier 2: projects >= 10. Tier 1: otros.
-- ============================================================
create or replace function public.recompute_zone_tier(
  p_zone_id uuid,
  p_country_code char(2),
  p_projects_count integer,
  p_sales_count integer,
  p_months_tracked integer
)
returns smallint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tier smallint;
begin
  if p_sales_count >= 100 then
    v_tier := 4;
  elsif p_projects_count >= 50 and p_months_tracked >= 6 then
    v_tier := 3;
  elsif p_projects_count >= 10 then
    v_tier := 2;
  else
    v_tier := 1;
  end if;

  insert into public.zone_tiers (
    zone_id, country_code, tier,
    projects_count, sales_count, months_tracked,
    last_recomputed_at
  ) values (
    p_zone_id, p_country_code, v_tier,
    p_projects_count, p_sales_count, p_months_tracked,
    now()
  )
  on conflict (zone_id) do update
    set tier = excluded.tier,
        projects_count = excluded.projects_count,
        sales_count = excluded.sales_count,
        months_tracked = excluded.months_tracked,
        last_recomputed_at = now();

  return v_tier;
end;
$$;

revoke execute on function public.recompute_zone_tier(uuid, char, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.recompute_zone_tier(uuid, char, integer, integer, integer)
  to service_role;

comment on function public.recompute_zone_tier(uuid, char, integer, integer, integer) is
  'Upsert zone_tier según projects/sales/months. Plan §7.K.1.2.';

-- ============================================================
-- recompute_all_zone_tiers — itera zone_tiers existente.
-- En Fase 08 (cuando exista public.zones) este wrapper se actualizará
-- para iterar sobre zones (no sólo las ya en zone_tiers).
-- ============================================================
create or replace function public.recompute_all_zone_tiers()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  rec record;
begin
  for rec in
    select zone_id, country_code, projects_count, sales_count, months_tracked
    from public.zone_tiers
  loop
    perform public.recompute_zone_tier(
      rec.zone_id, rec.country_code,
      rec.projects_count, rec.sales_count, rec.months_tracked
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.recompute_all_zone_tiers() from public, anon, authenticated;
grant execute on function public.recompute_all_zone_tiers() to service_role;

comment on function public.recompute_all_zone_tiers() is
  'Recompute todas las zonas. Ejecutado nightly por pg_cron job. Plan §7.K.1.3.';

-- ============================================================
-- pg_cron job — nightly 04:30 UTC.
-- ============================================================
select cron.schedule(
  'zone_tier_recompute_nightly',
  '30 4 * * *',
  $$ select public.recompute_all_zone_tiers(); $$
);
