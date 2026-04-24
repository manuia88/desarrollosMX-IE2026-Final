-- BLOQUE 11.R.-1.2 — Zone Constellation Clusters (Louvain community detection).
--
-- Tabla nueva zone_constellation_clusters persiste la asignación cluster_id
-- por colonia × período. El algoritmo Louvain corre offline en el engine
-- (11.R.1.2) sobre zone_constellations_edges; esta tabla es el resultado
-- denormalizado consumido por UI (coloring de nodes D3) + queries "colonias
-- del mismo cluster que X".
--
-- Idempotente: UNIQUE (zone_id, period_date) permite upsert del cron
-- mensual sin duplicados.

create table if not exists public.zone_constellation_clusters (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null,
  cluster_id int not null,
  period_date date not null,
  computed_at timestamptz not null default now(),
  unique (zone_id, period_date)
);

create index if not exists zone_constellation_clusters_period_idx
  on public.zone_constellation_clusters (period_date, cluster_id);
create index if not exists zone_constellation_clusters_zone_idx
  on public.zone_constellation_clusters (zone_id, period_date desc);

alter table public.zone_constellation_clusters enable row level security;

create policy zone_constellation_clusters_public_read
  on public.zone_constellation_clusters
  for select
  using (true);

comment on policy zone_constellation_clusters_public_read
  on public.zone_constellation_clusters is
  'RATIONALE intentional_public: clusters Louvain son features agregadas '
  'del producto Zone Constellations (sin PII); público como pulse/genome.';

create policy zone_constellation_clusters_service_write
  on public.zone_constellation_clusters
  for all to service_role
  using (true) with check (true);

comment on policy zone_constellation_clusters_service_write
  on public.zone_constellation_clusters is
  'RATIONALE intentional_public: service_role cron Louvain mensual.';

comment on table public.zone_constellation_clusters is
  'BLOQUE 11.R.1.2: Louvain community detection sobre zone_constellations_edges. '
  'Asignación cluster_id × período consumida por UI D3 graph coloring + '
  'queries "colonias del mismo cluster".';
