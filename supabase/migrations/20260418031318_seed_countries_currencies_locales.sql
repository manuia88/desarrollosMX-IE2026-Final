-- Seed: currencies + countries + locales
-- FASE 01 / MÓDULO 1.B.2
-- Ref: docs/02_PLAN_MAESTRO/FASE_01_BD_FUNDACION.md §1.B.2
-- Idempotente via ON CONFLICT DO NOTHING.

-- ============================================================
-- currencies (7 monedas H1-H3)
-- ============================================================
insert into public.currencies (code, name_en, name_es, symbol, decimals, is_crypto, is_active) values
  ('MXN', 'Mexican Peso',      'Peso mexicano',    '$',   2, false, true),
  ('COP', 'Colombian Peso',    'Peso colombiano',  '$',   2, false, true),
  ('ARS', 'Argentine Peso',    'Peso argentino',   '$',   2, false, true),
  ('BRL', 'Brazilian Real',    'Real brasileño',   'R$',  2, false, true),
  ('CLP', 'Chilean Peso',      'Peso chileno',     '$',   0, false, true),
  ('USD', 'US Dollar',         'Dólar americano',  'US$', 2, false, true),
  ('EUR', 'Euro',              'Euro',             '€',   2, false, true)
on conflict (code) do nothing;

-- ============================================================
-- countries (6 países H1-H3)
-- ============================================================
insert into public.countries
  (code, name_en, name_es, name_pt, default_currency, default_locale, default_timezone, phone_prefix, address_format, fiscal_regime_config)
values
  ('MX', 'Mexico',        'México',         'México',        'MXN', 'es-MX', 'America/Mexico_City',              '+52',
    '{"fields": ["calle", "num_ext", "num_int", "colonia", "municipio", "estado", "cp"]}'::jsonb,
    '{"tax_id_name": "RFC", "regimes": ["601", "603", "612", "626"]}'::jsonb),
  ('CO', 'Colombia',      'Colombia',       'Colômbia',      'COP', 'es-CO', 'America/Bogota',                   '+57',
    '{"fields": ["direccion", "barrio", "municipio", "departamento"]}'::jsonb,
    '{"tax_id_name": "NIT"}'::jsonb),
  ('AR', 'Argentina',     'Argentina',      'Argentina',     'ARS', 'es-AR', 'America/Argentina/Buenos_Aires',   '+54',
    '{"fields": ["calle_altura", "piso_depto", "barrio", "localidad", "provincia", "cp"]}'::jsonb,
    '{"tax_id_name": "CUIT"}'::jsonb),
  ('BR', 'Brazil',        'Brasil',         'Brasil',        'BRL', 'pt-BR', 'America/Sao_Paulo',                '+55',
    '{"fields": ["rua", "numero", "complemento", "bairro", "cidade", "estado", "cep"]}'::jsonb,
    '{"tax_id_name": "CNPJ"}'::jsonb),
  ('CL', 'Chile',         'Chile',          'Chile',         'CLP', 'es-CL', 'America/Santiago',                 '+56',
    '{"fields": ["calle_numero", "depto", "comuna", "region"]}'::jsonb,
    '{"tax_id_name": "RUT"}'::jsonb),
  ('US', 'United States', 'Estados Unidos', 'Estados Unidos','USD', 'en-US', 'America/New_York',                 '+1',
    '{"fields": ["street", "unit", "city", "state", "zip"]}'::jsonb,
    '{"tax_id_name": "EIN"}'::jsonb)
on conflict (code) do nothing;

-- ============================================================
-- locales (6 locales BCP 47)
-- ============================================================
insert into public.locales (code, country_code, language, script, name_native, is_rtl, is_active) values
  ('es-MX', 'MX', 'es', 'Latn', 'Español (México)',    false, true),
  ('es-CO', 'CO', 'es', 'Latn', 'Español (Colombia)',  false, true),
  ('es-AR', 'AR', 'es', 'Latn', 'Español (Argentina)', false, true),
  ('pt-BR', 'BR', 'pt', 'Latn', 'Português (Brasil)',  false, true),
  ('es-CL', 'CL', 'es', 'Latn', 'Español (Chile)',     false, true),
  ('en-US', 'US', 'en', 'Latn', 'English (US)',        false, true)
on conflict (code) do nothing;
