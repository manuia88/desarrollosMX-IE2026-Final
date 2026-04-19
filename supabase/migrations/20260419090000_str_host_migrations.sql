-- FASE 07b / BLOQUE 7b.J — Host Migration Pipeline.
-- Refs:
--   docs/02_PLAN_MAESTRO/FASE_07b_STR_INTELLIGENCE_COMPLETE.md §7b.J
--
-- Detecta migraciones cross-platform (Airbnb → VRBO / Booking) por firma
-- (geom 10m + bedrooms + bathrooms + capacity + title_tokens). Feed al
-- Knowledge Graph B2B (GC-18) y alerta regulatoria si zone migra > 10%.

create table public.str_host_migrations (
  id uuid primary key default gen_random_uuid(),
  from_platform text not null check (from_platform in ('airbnb', 'vrbo', 'booking')),
  to_platform text not null check (to_platform in ('airbnb', 'vrbo', 'booking')),
  from_listing_id text not null,
  to_listing_id text not null,
  from_host_id text,
  to_host_id text,
  zone_id uuid,
  market_id uuid references public.str_markets(id) on delete set null,
  signature_hash text not null, -- hash determinista de firma cross-platform.
  match_features jsonb not null default '{}'::jsonb,
  confidence numeric(4, 3) not null check (confidence between 0 and 1),
  first_detected_at timestamptz not null default now(),
  last_verified_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb,
  check (from_platform <> to_platform)
);

create unique index idx_str_host_migrations_unique
  on public.str_host_migrations (from_platform, from_listing_id, to_platform, to_listing_id);
create index idx_str_host_migrations_signature
  on public.str_host_migrations (signature_hash);
create index idx_str_host_migrations_market_detected
  on public.str_host_migrations (market_id, first_detected_at desc);
create index idx_str_host_migrations_to_platform
  on public.str_host_migrations (to_platform, first_detected_at desc);

alter table public.str_host_migrations enable row level security;

create policy str_host_migrations_select_admin on public.str_host_migrations
  for select to authenticated
  using (
    public.is_superadmin()
    or public.get_user_role() in ('mb_admin', 'admin_desarrolladora', 'asesor')
  );

create policy str_host_migrations_write_admin on public.str_host_migrations
  for all to authenticated
  using (public.is_superadmin() or public.get_user_role() = 'mb_admin')
  with check (public.is_superadmin() or public.get_user_role() = 'mb_admin');

comment on table public.str_host_migrations is
  'Cross-platform listing matches detectados por firma (geom + bedrooms + capacity + title). '
  'Input para Knowledge Graph B2B y alerta regulatoria por market.';

create or replace function public.market_migration_alert_pct(
  p_market_id uuid,
  p_lookback_days integer default 30
)
returns numeric
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with recent_migrations as (
    select count(distinct from_listing_id) as migrated_count
    from public.str_host_migrations
    where market_id = p_market_id
      and first_detected_at >= now() - (p_lookback_days || ' days')::interval
  ),
  active_listings as (
    select count(*) as total_count
    from public.str_listings
    where market_id = p_market_id and status = 'active'
  )
  select case when active_listings.total_count > 0
    then round(
      (recent_migrations.migrated_count::numeric / active_listings.total_count::numeric) * 100,
      2
    )
    else 0
  end
  from recent_migrations, active_listings;
$$;

comment on function public.market_migration_alert_pct(uuid, integer) is
  'Pct de listings que migraron cross-platform en lookback_days vs activos del market. '
  'Alerta admin si > 10% (señal regulatoria adversa).';
