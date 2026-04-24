-- v34 — FIX zero deuda pre-FASE 07.6.B
-- Parte A: user_role enum 'system' (fix crons zombie mfa_reminders + scheduled_delete)
-- Parte B: FK enforcement zones (40 columnas zone_id/colonia_id sin FK previo)
-- Pre-flight: 0 orphans confirmado 2026-04-24 sobre los 40 targets.

-- ============================================================
-- Parte A — user_role enum: añadir 'system'
-- ============================================================
-- Root cause DEUDA-1:
--   public.mfa_reminders_tick() y public.run_scheduled_deletions() insertan en
--   public.audit_log con actor_role='system', pero el enum user_role no contiene ese
--   valor. Evidencia: 1 fallo mfa_reminders_weekly (2026-04-20 14:00) + 6 fallos
--   scheduled_delete_daily (2026-04-19..2026-04-24 03:15).
-- Fix: ADD VALUE 'system' al enum. Idempotente.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'user_role' and e.enumlabel = 'system'
  ) then
    alter type public.user_role add value 'system';
  end if;
end$$;

-- ============================================================
-- Parte B — FK enforcement zones (40 objetivos)
-- ============================================================
-- Excluidos:
--   - tax_rules.scope_id: scope_id polimórfico (scope IN 'global','desarrolladora','item'), nunca referencia zones.
--   - v_ltr_str_connection: view.
--   - Particiones: FK en parent propaga a hijas.
-- ON DELETE:
--   - geo_data_points: SET NULL (soft reference).
--   - resto: CASCADE (data derivativa; si desaparece la zona, desaparecen sus métricas).

do $$
declare
  rec record;
  fk_name text;
  on_delete_policy text;
begin
  for rec in
    select * from (values
      -- Regular tables (30)
      ('climate_annual_summaries',       'zone_id',    'cascade'),
      ('climate_future_projections',     'colonia_id', 'cascade'),
      ('climate_monthly_aggregates',     'zone_id',    'cascade'),
      ('climate_twin_matches',           'zone_id',    'cascade'),
      ('climate_zone_signatures',        'zone_id',    'cascade'),
      ('colonia_dna_vectors',            'colonia_id', 'cascade'),
      ('colonia_vibe_tags',              'colonia_id', 'cascade'),
      ('colonia_wiki_entries',           'colonia_id', 'cascade'),
      ('enigh_zone_income',              'zone_id',    'cascade'),
      ('geo_data_points',                'zone_id',    'set null'),
      ('ghost_zones_ranking',            'colonia_id', 'cascade'),
      ('historical_forensics_reports',   'colonia_id', 'cascade'),
      ('inegi_census_zone_stats',        'zone_id',    'cascade'),
      ('influencer_heat_zones',          'zone_id',    'cascade'),
      ('pulse_forecasts',                'zone_id',    'cascade'),
      ('str_events_calendar',            'zone_id',    'cascade'),
      ('str_host_migrations',            'zone_id',    'cascade'),
      ('str_invisible_hotels',           'zone_id',    'cascade'),
      ('str_listings',                   'zone_id',    'cascade'),
      ('str_markets',                    'zone_id',    'cascade'),
      ('str_zone_regulations',           'zone_id',    'cascade'),
      ('zona_snapshots',                 'zone_id',    'cascade'),
      ('zone_alert_subscriptions',       'zone_id',    'cascade'),
      ('zone_alpha_alerts',              'zone_id',    'cascade'),
      ('zone_certifications',            'zone_id',    'cascade'),
      ('zone_constellation_clusters',    'zone_id',    'cascade'),
      ('zone_scores',                    'zone_id',    'cascade'),
      ('zone_slugs',                     'zone_id',    'cascade'),
      ('zone_tiers',                     'zone_id',    'cascade'),
      ('zone_topology_metrics',          'zone_id',    'cascade'),
      -- Partitioned parents (5) — FK propaga a particiones
      ('geo_snapshots',                  'zone_id',    'cascade'),
      ('market_prices_secondary',        'zone_id',    'cascade'),
      ('market_pulse',                   'zone_id',    'cascade'),
      ('search_trends',                  'zone_id',    'cascade'),
      ('zone_price_index',               'zone_id',    'cascade'),
      -- Template tables (5) — integridad consistente
      ('template_public_geo_snapshots',           'zone_id', 'cascade'),
      ('template_public_market_prices_secondary', 'zone_id', 'cascade'),
      ('template_public_market_pulse',            'zone_id', 'cascade'),
      ('template_public_search_trends',           'zone_id', 'cascade'),
      ('template_public_zone_price_index',        'zone_id', 'cascade')
    ) as t(table_name, column_name, on_delete)
  loop
    fk_name := rec.table_name || '_' || rec.column_name || '_fkey';
    on_delete_policy := rec.on_delete;

    if not exists (
      select 1 from information_schema.table_constraints tc
      where tc.constraint_name = fk_name
        and tc.table_schema = 'public'
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (%I) references public.zones(id) on delete %s',
        rec.table_name, fk_name, rec.column_name, on_delete_policy
      );
      raise notice 'Added FK: % (% -> zones.id ON DELETE %)', fk_name, rec.column_name, upper(on_delete_policy);
    else
      raise notice 'FK already exists, skipping: %', fk_name;
    end if;
  end loop;
end$$;
