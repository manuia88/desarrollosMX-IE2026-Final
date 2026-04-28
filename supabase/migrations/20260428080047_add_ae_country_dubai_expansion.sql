-- F14.1 Expansion Cities — Dubai support (ADR-059)
--
-- Cambios:
--   1. Seed countries +1 row: 'AE' (United Arab Emirates) — currency AED, locale ar-AE, timezone Asia/Dubai
--   2. Seed currencies +1 row: 'AED' (UAE Dirham, peg fixed 3.6725 vs USD)
--   3. Seed locales +1 row: 'ar-AE' (Arabic UAE, RTL=true) — STUB H2 ar-AE locale full activation
--   4. ALTER zones_country_code_valid CHECK constraint: incluir 'AE'
--
-- Audit: 0 SECDEF nuevas, audit_rls_allowlist v37 vigente, NO incrementa.
-- Idempotente via ON CONFLICT DO NOTHING + DROP/ADD constraint.
-- Cross-ref: ADR-059 Cities Expansion Pattern + ADR-051 Multi-country tier scope.

-- ============================================================
-- 1. AED currency (peg fixed vs USD)
-- ============================================================
insert into public.currencies (code, name_en, name_es, symbol, decimals, is_crypto, is_active) values
  ('AED', 'UAE Dirham', 'Dírham emiratí', 'AED', 2, false, true)
on conflict (code) do nothing;

-- ============================================================
-- 2. AE country (United Arab Emirates)
-- ============================================================
insert into public.countries
  (code, name_en, name_es, name_pt, default_currency, default_locale, default_timezone, phone_prefix, address_format, fiscal_regime_config)
values
  ('AE', 'United Arab Emirates', 'Emiratos Árabes Unidos', 'Emirados Árabes Unidos', 'AED', 'ar-AE', 'Asia/Dubai', '+971',
    '{"fields": ["building", "street", "area", "city", "emirate", "po_box"]}'::jsonb,
    '{"tax_id_name": "TRN", "vat_rate": 0.05}'::jsonb)
on conflict (code) do nothing;

-- ============================================================
-- 3. ar-AE locale (RTL, STUB H2 full activation)
-- ============================================================
insert into public.locales (code, country_code, language, script, name_native, is_rtl, is_active) values
  ('ar-AE', 'AE', 'ar', 'Arab', 'العربية (الإمارات)', true, false)
on conflict (code) do nothing;

-- ============================================================
-- 4. ALTER zones_country_code_valid CHECK constraint (add 'AE')
-- ============================================================
alter table public.zones drop constraint if exists zones_country_code_valid;
alter table public.zones add constraint zones_country_code_valid
  check (country_code in ('MX', 'CO', 'AR', 'BR', 'US', 'AE', 'XX'));

comment on column public.zones.country_code is
  'ISO 3166-1 alpha-2. Allowed: MX (canon CDMX + cities expansion FASE 14.1), CO/AR/BR (Tier 2 H2 ADR-051), US (Tier 1 Latinx ADR-051), AE (Dubai FASE 14.1 ADR-059), XX (sandbox).';
