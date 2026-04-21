-- Security fix: habilitar RLS en 13 templates pg_partman que estaban detectadas
-- por Supabase Linter como rls_disabled_in_public. Son templates vacías usadas
-- por pg_partman para crear particiones nuevas; no se queryean directamente.
-- Habilitamos RLS + policy service_role only + comment justificativo.
--
-- Fuente: email Supabase alert 2026-04-21 "Table publicly accessible — Row-Level
-- Security is not enabled" detectó 13 tablas template_public_*. Regla founder
-- zero deuda técnica: resolver inmediato antes de avanzar.

alter table public.template_public_api_rate_limits enable row level security;
alter table public.template_public_audit_log enable row level security;
alter table public.template_public_geo_snapshots enable row level security;
alter table public.template_public_macro_series enable row level security;
alter table public.template_public_market_prices_secondary enable row level security;
alter table public.template_public_market_pulse enable row level security;
alter table public.template_public_rate_limit_log enable row level security;
alter table public.template_public_score_history enable row level security;
alter table public.template_public_search_trends enable row level security;
alter table public.template_public_str_market_monthly_aggregates enable row level security;
alter table public.template_public_str_monthly_snapshots enable row level security;
alter table public.template_public_str_reviews enable row level security;
alter table public.template_public_zone_price_index enable row level security;

create policy pg_partman_template_service_role on public.template_public_api_rate_limits for all to service_role using (true) with check (true);
create policy pg_partman_template_service_role on public.template_public_audit_log for all to service_role using (true) with check (true);
create policy pg_partman_template_service_role on public.template_public_geo_snapshots for all to service_role using (true) with check (true);
create policy pg_partman_template_service_role on public.template_public_macro_series for all to service_role using (true) with check (true);
create policy pg_partman_template_service_role on public.template_public_market_prices_secondary for all to service_role using (true) with check (true);
create policy pg_partman_template_service_role on public.template_public_market_pulse for all to service_role using (true) with check (true);
create policy pg_partman_template_service_role on public.template_public_rate_limit_log for all to service_role using (true) with check (true);
create policy pg_partman_template_service_role on public.template_public_score_history for all to service_role using (true) with check (true);
create policy pg_partman_template_service_role on public.template_public_search_trends for all to service_role using (true) with check (true);
create policy pg_partman_template_service_role on public.template_public_str_market_monthly_aggregates for all to service_role using (true) with check (true);
create policy pg_partman_template_service_role on public.template_public_str_monthly_snapshots for all to service_role using (true) with check (true);
create policy pg_partman_template_service_role on public.template_public_str_reviews for all to service_role using (true) with check (true);
create policy pg_partman_template_service_role on public.template_public_zone_price_index for all to service_role using (true) with check (true);

comment on policy pg_partman_template_service_role on public.template_public_api_rate_limits is 'pg_partman template table — RLS enabled para cumplir Linter; service_role only (tabla vacía, no queryable directamente)';
comment on policy pg_partman_template_service_role on public.template_public_audit_log is 'pg_partman template table — RLS enabled para cumplir Linter; service_role only';
comment on policy pg_partman_template_service_role on public.template_public_geo_snapshots is 'pg_partman template table — RLS enabled para cumplir Linter; service_role only';
comment on policy pg_partman_template_service_role on public.template_public_macro_series is 'pg_partman template table — RLS enabled para cumplir Linter; service_role only';
comment on policy pg_partman_template_service_role on public.template_public_market_prices_secondary is 'pg_partman template table — RLS enabled para cumplir Linter; service_role only';
comment on policy pg_partman_template_service_role on public.template_public_market_pulse is 'pg_partman template table — RLS enabled para cumplir Linter; service_role only';
comment on policy pg_partman_template_service_role on public.template_public_rate_limit_log is 'pg_partman template table — RLS enabled para cumplir Linter; service_role only';
comment on policy pg_partman_template_service_role on public.template_public_score_history is 'pg_partman template table — RLS enabled para cumplir Linter; service_role only';
comment on policy pg_partman_template_service_role on public.template_public_search_trends is 'pg_partman template table — RLS enabled para cumplir Linter; service_role only';
comment on policy pg_partman_template_service_role on public.template_public_str_market_monthly_aggregates is 'pg_partman template table — RLS enabled para cumplir Linter; service_role only';
comment on policy pg_partman_template_service_role on public.template_public_str_monthly_snapshots is 'pg_partman template table — RLS enabled para cumplir Linter; service_role only';
comment on policy pg_partman_template_service_role on public.template_public_str_reviews is 'pg_partman template table — RLS enabled para cumplir Linter; service_role only';
comment on policy pg_partman_template_service_role on public.template_public_zone_price_index is 'pg_partman template table — RLS enabled para cumplir Linter; service_role only';
