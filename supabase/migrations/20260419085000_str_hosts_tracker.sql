-- FASE 07b / BLOQUE 7b.G — Super-Host Tracker.
create table public.str_hosts (
  host_id text primary key,
  country_code char(2) not null references public.countries(code),
  display_name text,
  listings_count smallint not null default 0,
  superhost_flag boolean not null default false,
  avg_rating numeric(3, 2),
  avg_reviews_count numeric(6, 2),
  avg_occupancy_rate numeric(5, 4),
  super_host_score numeric(5, 2) check (super_host_score between 0 and 100),
  tier text check (tier in ('diamond', 'gold', 'silver', 'bronze')),
  churn_risk numeric(4, 3) check (churn_risk between 0 and 1),
  retention_12m_rate numeric(4, 3) check (retention_12m_rate between 0 and 1),
  first_seen_at timestamptz not null default now(),
  last_updated_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

create index idx_str_hosts_country_score
  on public.str_hosts (country_code, super_host_score desc nulls last);
create index idx_str_hosts_tier on public.str_hosts (country_code, tier)
  where tier is not null;
create index idx_str_hosts_churn on public.str_hosts (churn_risk desc)
  where churn_risk is not null;

alter table public.str_hosts enable row level security;

create policy str_hosts_select_internal on public.str_hosts
  for select to authenticated
  using (
    public.is_superadmin()
    or public.get_user_role() in ('asesor', 'mb_admin', 'admin_desarrolladora')
  );

create policy str_hosts_write_admin on public.str_hosts
  for all to authenticated
  using (public.is_superadmin() or public.get_user_role() = 'mb_admin')
  with check (public.is_superadmin() or public.get_user_role() = 'mb_admin');

comment on table public.str_hosts is
  'Tracker de hosts STR (derivado de str_listings). Score compuesto: occupancy 40% + '
  'avg_rating 25% + reviews_count_normalized 15% + portfolio_size 10% + retention_12m 10%. '
  'tier asignado por score (diamond ≥85, gold ≥70, silver ≥50, bronze <50). '
  'churn_risk inferido de drops de listings/price en 30d.';
