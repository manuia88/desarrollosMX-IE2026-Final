-- FASE 10 SESIÓN 2/3 — mark SELECT policies como intentional_public para audit.
-- Ref: audit_rls_violations() scannea pg_description por 'intentional_public'.
-- property_comparables + inegi_census_zone_stats + enigh_zone_income: policies
-- de service_role y authenticated SELECT son legítimas porque los scores y
-- demographics son data pública post-agregación (zone-level, no PII).

comment on policy property_comparables_select_authenticated on public.property_comparables
  is 'intentional_public — D31: A08 Comparador Multi-D lee comparables per property (zone-level aggregate, no PII).';

comment on policy property_comparables_service_all on public.property_comparables
  is 'intentional_public — service_role all para worker cron populate (D31).';

comment on policy inegi_census_select_authenticated on public.inegi_census_zone_stats
  is 'intentional_public — L-69: INEGI Census zone stats son data pública agregada (profession/age distribution per zona).';

comment on policy inegi_census_service_all on public.inegi_census_zone_stats
  is 'intentional_public — service_role all para ingest FASE 07b (L-69).';

comment on policy enigh_select_authenticated on public.enigh_zone_income
  is 'intentional_public — L-69: ENIGH salary distribution zone-level agregada, no PII.';

comment on policy enigh_service_all on public.enigh_zone_income
  is 'intentional_public — service_role all para ingest FASE 07b (L-69).';
