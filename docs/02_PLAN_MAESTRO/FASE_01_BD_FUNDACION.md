# FASE 01 — BD Fundación

> **Duración estimada:** 3 sesiones Claude Code (~6 horas con agentes paralelos)
> **Dependencias:** [FASE 00 — Bootstrap](./FASE_00_BOOTSTRAP.md)
> **Bloqueantes externos:**
> - Acceso admin a proyecto Supabase `qxfuqwlktmhokwwlvggy` (ya linkeado en Fase 00)
> - `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` para ejecutar migrations destructivas
> - Confirmación de Manu del listado de features `feature_registry` (~120 features)
> **Resultado esperado:** BD con extensions habilitadas (pgvector, pgsodium, pg_partman, pg_trgm, btree_gin, unaccent); schema core multi-country (countries, currencies, locales seed); tablas fundación con `country_code NOT NULL` en todas (profiles, desarrolladoras, agencies, broker_companies, addresses, plans, subscriptions, feature_registry, role_features, profile_feature_overrides, audit_log); helpers RLS SECURITY DEFINER con validación `auth.uid()`; indexes de performance; types TypeScript auto-generados en CI; seed de 6 países + ~120 features. Tag `fase-01-complete`.
> **Priority:** [H1]

## Contexto y objetivo

Define el esqueleto de datos del sistema. Todo se hace con `country_code NOT NULL` desde el primer día (multi-country día 1 — ADR-003). Las extensiones pesadas (pgvector para embeddings IE, pgsodium para secrets, pg_partman para particionamiento) se habilitan vía SQL admin. Las RLS completas de negocio se escriben en Fase 02 — aquí solo helpers fundacionales y tablas que no contienen PII sensible. Esta fase NO expone datos reales; solo deja la estructura seed.

## Bloques

### BLOQUE 1.A — Habilitar extensions Supabase

Las extensiones quedan en una migration inicial. Orden: primero las que no dependen de otras, luego pg_partman.

#### MÓDULO 1.A.1 — Migration `00000000000000_extensions.sql`

**Pasos:**
- `[1.A.1.1]` Crear migration: `supabase migration new extensions`.
- `[1.A.1.2]` Contenido SQL:
  ```sql
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE EXTENSION IF NOT EXISTS btree_gin;
  CREATE EXTENSION IF NOT EXISTS btree_gist;
  CREATE EXTENSION IF NOT EXISTS unaccent;
  CREATE EXTENSION IF NOT EXISTS vector;         -- pgvector para embeddings IE
  CREATE EXTENSION IF NOT EXISTS pgsodium;       -- vault para secretos
  CREATE EXTENSION IF NOT EXISTS pg_partman;     -- particionamiento por tiempo
  CREATE EXTENSION IF NOT EXISTS postgis;        -- geometría (zones, buffers)
  ```
- `[1.A.1.3]` Ejecutar `supabase db push` — o via MCP `apply_migration` sobre `qxfuqwlktmhokwwlvggy`.
- `[1.A.1.4]` Verificar con SQL: `SELECT extname FROM pg_extension ORDER BY extname;` — deben aparecer las 10.
- `[1.A.1.5]` Documentar en `docs/03_CATALOGOS/03.2_CATALOGO_BD_FUNCIONES.md` la lista de extensiones y para qué se usan.

**Criterio de done del módulo:**
- [ ] `supabase db push` sin errores.
- [ ] `SELECT extname FROM pg_extension` muestra 10 entries.
- [ ] Migration commiteada.

### BLOQUE 1.B — Schemas core multi-country (countries, currencies, locales)

Sin estas tablas referenciales no se puede definir `country_code NOT NULL`. Seed inicial: MX, CO, AR, BR, CL, US.

#### MÓDULO 1.B.1 — Migration `countries_currencies_locales.sql`

**Pasos:**
- `[1.B.1.1]` Crear migration `supabase migration new countries_currencies_locales`.
- `[1.B.1.2]` Schema `countries`:
  ```sql
  CREATE TABLE public.countries (
    code CHAR(2) PRIMARY KEY,                    -- ISO 3166-1 alpha-2
    name_en TEXT NOT NULL,
    name_es TEXT NOT NULL,
    name_pt TEXT,
    default_currency CHAR(3) NOT NULL,           -- ISO 4217
    default_locale TEXT NOT NULL,
    default_timezone TEXT NOT NULL,
    phone_prefix TEXT NOT NULL,                  -- "+52"
    address_format JSONB NOT NULL DEFAULT '{}'::jsonb,
    fiscal_regime_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ```
- `[1.B.1.3]` Schema `currencies`:
  ```sql
  CREATE TABLE public.currencies (
    code CHAR(3) PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_es TEXT NOT NULL,
    symbol TEXT NOT NULL,
    decimals SMALLINT NOT NULL DEFAULT 2,
    is_crypto BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true
  );
  ```
- `[1.B.1.4]` Schema `locales`:
  ```sql
  CREATE TABLE public.locales (
    code TEXT PRIMARY KEY,                        -- es-MX, pt-BR, en-US
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    language TEXT NOT NULL,                       -- ISO 639-1
    script TEXT,                                  -- ISO 15924
    name_native TEXT NOT NULL,
    is_rtl BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true
  );
  ```
- `[1.B.1.5]` FK de `countries.default_currency` → `currencies.code` AFTER currencies está poblado (defer con `DEFERRABLE INITIALLY DEFERRED` o agregar FK en migration posterior al seed).
- `[1.B.1.6]` RLS: `ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;` + policy `countries_select_public` con `FOR SELECT TO authenticated, anon USING (is_active = true);`. Idem para `currencies` y `locales`.

**Criterio de done del módulo:**
- [ ] Las 3 tablas creadas.
- [ ] RLS habilitado con policy SELECT pública de solo filas activas.
- [ ] FK `countries.default_currency` → `currencies.code` vinculada tras seed.

#### MÓDULO 1.B.2 — Seed `countries + currencies + locales`

**Pasos:**
- `[1.B.2.1]` Crear `supabase/seed.sql` con INSERTS:
  - `currencies`: MXN, COP, ARS, BRL, CLP, USD, EUR (para ESG).
  - `countries`: MX (MXN, es-MX, America/Mexico_City, +52), CO (COP, es-CO, America/Bogota, +57), AR (ARS, es-AR, America/Argentina/Buenos_Aires, +54), BR (BRL, pt-BR, America/Sao_Paulo, +55), CL (CLP, es-CL, America/Santiago, +56), US (USD, en-US, America/New_York, +1).
  - `locales`: es-MX/CO/AR/CL (con country_code correspondiente), pt-BR, en-US.
- `[1.B.2.2]` Popular `address_format` JSONB por país:
  - MX: `{"fields": ["calle", "num_ext", "num_int", "colonia", "municipio", "estado", "cp"]}`.
  - CO: `{"fields": ["direccion", "barrio", "municipio", "departamento"]}`.
  - AR: `{"fields": ["calle_altura", "piso_depto", "barrio", "localidad", "provincia", "cp"]}`.
  - BR: `{"fields": ["rua", "numero", "complemento", "bairro", "cidade", "estado", "cep"]}`.
  - CL: `{"fields": ["calle_numero", "depto", "comuna", "region"]}`.
  - US: `{"fields": ["street", "unit", "city", "state", "zip"]}`.
- `[1.B.2.3]` Popular `fiscal_regime_config` con stubs:
  - MX: `{"tax_id_name": "RFC", "regimes": ["601", "603", "612", "626"]}`.
  - CO: `{"tax_id_name": "NIT"}`, AR: `{"tax_id_name": "CUIT"}`, BR: `{"tax_id_name": "CNPJ"}`, CL: `{"tax_id_name": "RUT"}`, US: `{"tax_id_name": "EIN"}`.
- `[1.B.2.4]` Ejecutar `supabase db reset` (idempotente) para aplicar seed en dev local.
- `[1.B.2.5]` En producción: aplicar seed via `supabase db execute -f supabase/seed.sql` (solo una vez).

**Criterio de done del módulo:**
- [ ] `SELECT count(*) FROM countries` = 6.
- [ ] `SELECT count(*) FROM locales` >= 6.
- [ ] `SELECT count(*) FROM currencies` >= 6.

### BLOQUE 1.C — Tablas fundación con country_code NOT NULL

Todas con `country_code CHAR(2) NOT NULL REFERENCES countries(code)` + índice compuesto con `country_code` primero.

#### MÓDULO 1.C.1 — `profiles` (espejo de auth.users)

**Pasos:**
- `[1.C.1.1]` Migration `supabase migration new profiles_and_roles`.
- `[1.C.1.2]` Schema profiles (sin PII excesiva en SELECT público — eso se cubre en Fase 02 con VIEW `public_profiles`):
  ```sql
  CREATE TYPE user_role AS ENUM (
    'superadmin', 'admin_desarrolladora', 'asesor', 'broker_manager',
    'mb_admin', 'mb_coordinator', 'comprador', 'vendedor_publico'
  );

  CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    phone TEXT,
    rol user_role NOT NULL DEFAULT 'comprador',
    avatar_url TEXT,
    preferred_locale TEXT REFERENCES public.locales(code),
    preferred_timezone TEXT NOT NULL DEFAULT 'America/Mexico_City',
    preferred_currency CHAR(3) REFERENCES public.currencies(code),
    rfc TEXT,                                  -- MX (encrypted en Fase 06)
    tax_id TEXT,                               -- genérico (CUIT/CNPJ/NIT/RUT/EIN)
    razon_social TEXT,
    regimen_fiscal TEXT,
    docs_verificacion_urls JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_approved BOOLEAN NOT NULL DEFAULT false,
    desarrolladora_id UUID,                    -- FK Fase posterior
    agency_id UUID,                            -- FK Fase posterior
    broker_company_id UUID,                    -- FK Fase posterior
    slug TEXT UNIQUE,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX idx_profiles_country_rol ON public.profiles (country_code, rol) WHERE is_active;
  CREATE INDEX idx_profiles_email ON public.profiles (lower(email));
  CREATE INDEX idx_profiles_slug ON public.profiles (slug) WHERE slug IS NOT NULL;
  ```
- `[1.C.1.3]` Trigger `trg_profiles_updated_at` → `BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION set_updated_at()` (helper global).
- `[1.C.1.4]` Trigger `trg_profiles_on_insert` para clonar `auth.users.email` y `id` al nuevo row — manejar con `SECURITY DEFINER` y `SET search_path = ''`.

**Criterio de done del módulo:**
- [ ] Tabla creada.
- [ ] Índice compuesto `(country_code, rol)` existe.
- [ ] Trigger `auth.users` → `profiles` listo para Fase 02.

#### MÓDULO 1.C.2 — `desarrolladoras`, `agencies`, `broker_companies`

**Pasos:**
- `[1.C.2.1]` Schema `desarrolladoras`:
  ```sql
  CREATE TABLE public.desarrolladoras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    name TEXT NOT NULL,
    legal_name TEXT NOT NULL,
    tax_id TEXT NOT NULL,                      -- RFC/NIT/CUIT/CNPJ/RUT
    tax_id_encrypted BYTEA,                    -- pgsodium en Fase 06
    contact_email TEXT,
    contact_phone TEXT,
    website TEXT,
    logo_url TEXT,
    slug TEXT UNIQUE,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    verification_docs_urls JSONB,
    holding_parent_id UUID REFERENCES public.desarrolladoras(id),
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_desarrolladoras_country_active ON public.desarrolladoras (country_code, is_active);
  CREATE INDEX idx_desarrolladoras_tax_id ON public.desarrolladoras (country_code, tax_id);
  ```
- `[1.C.2.2]` Schema `agencies` (agencias inmobiliarias — empleadora de asesores):
  ```sql
  CREATE TABLE public.agencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    name TEXT NOT NULL,
    legal_name TEXT,
    tax_id TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    logo_url TEXT,
    slug TEXT UNIQUE,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_agencies_country_active ON public.agencies (country_code, is_active);
  ```
- `[1.C.2.3]` Schema `broker_companies` (brokerages que canalizan asesores):
  ```sql
  CREATE TABLE public.broker_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    name TEXT NOT NULL,
    legal_name TEXT,
    tax_id TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    logo_url TEXT,
    slug TEXT UNIQUE,
    is_authorized_broker BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_broker_country_authorized ON public.broker_companies (country_code, is_authorized_broker);
  ```
- `[1.C.2.4]` Agregar FKs a `profiles`:
  ```sql
  ALTER TABLE public.profiles
    ADD CONSTRAINT fk_profiles_desarrolladora FOREIGN KEY (desarrolladora_id) REFERENCES public.desarrolladoras(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_profiles_agency FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_profiles_broker FOREIGN KEY (broker_company_id) REFERENCES public.broker_companies(id) ON DELETE SET NULL;
  ```

**Criterio de done del módulo:**
- [ ] 3 tablas creadas + FKs a profiles.
- [ ] Índices compuestos con country_code primero.

#### MÓDULO 1.C.3 — `addresses` multi-country flex

El formato de dirección cambia por país. Usar JSONB para flexibilidad + columnas normalizadas clave para indexado.

**Pasos:**
- `[1.C.3.1]` Schema `addresses`:
  ```sql
  CREATE TABLE public.addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    owner_type TEXT NOT NULL,                    -- 'profile' | 'desarrolladora' | 'project' | 'unit' | 'other'
    owner_id UUID NOT NULL,
    label TEXT,                                  -- "Home", "Office", "Fiscal"
    line1 TEXT NOT NULL,                         -- calle + num
    line2 TEXT,
    neighborhood TEXT,                           -- colonia / barrio / bairro
    municipality TEXT,                           -- alcaldía / municipio / comuna
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country_sub_divisions JSONB NOT NULL DEFAULT '{}'::jsonb, -- flexible (alcaldía MX, departamento CO, estado AR)
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    geom GEOMETRY(Point, 4326) GENERATED ALWAYS AS (
      CASE WHEN lat IS NOT NULL AND lng IS NOT NULL
      THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326) END
    ) STORED,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    is_fiscal BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_addresses_country_owner ON public.addresses (country_code, owner_type, owner_id);
  CREATE INDEX idx_addresses_postal ON public.addresses (country_code, postal_code);
  CREATE INDEX idx_addresses_geom ON public.addresses USING GIST (geom);
  ```
- `[1.C.3.2]` Trigger `trg_addresses_updated_at`.
- `[1.C.3.3]` Validation function `validate_postal_code(country_code, postal_code)` — regex per country (MX `^\d{5}$`, CO `^\d{6}$`, AR `^[A-Z]\d{4}[A-Z]{3}$`, BR `^\d{5}-?\d{3}$`, CL `^\d{7}$`, US `^\d{5}(-\d{4})?$`) — enforzar via CHECK constraint o trigger.

**Criterio de done del módulo:**
- [ ] Tabla creada con geom GIST index.
- [ ] Regex CP funciona para los 6 países.

#### MÓDULO 1.C.4 — `plans` y `subscriptions`

**Pasos:**
- `[1.C.4.1]` Schema `plans`:
  ```sql
  CREATE TABLE public.plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,                  -- 'asesor_basic' | 'asesor_pro' | 'dev_basic' | 'dev_growth' | 'dev_enterprise'
    name TEXT NOT NULL,
    audience TEXT NOT NULL CHECK (audience IN ('asesor', 'desarrolladora', 'broker_company', 'comprador')),
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    monthly_price_minor INT NOT NULL,           -- en centavos (menor unidad)
    yearly_price_minor INT,
    currency CHAR(3) NOT NULL REFERENCES public.currencies(code),
    trial_days SMALLINT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    features_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_plans_country_audience ON public.plans (country_code, audience) WHERE is_active;
  ```
- `[1.C.4.2]` Schema `subscriptions`:
  ```sql
  CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    subject_type TEXT NOT NULL CHECK (subject_type IN ('profile', 'desarrolladora', 'broker_company')),
    subject_id UUID NOT NULL,
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'expired')),
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    stripe_subscription_id TEXT,
    mercadopago_subscription_id TEXT,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_subs_country_subject ON public.subscriptions (country_code, subject_type, subject_id);
  CREATE INDEX idx_subs_status ON public.subscriptions (status, current_period_end);
  ```

**Criterio de done del módulo:**
- [ ] 2 tablas creadas.
- [ ] Índices listos.

#### MÓDULO 1.C.5 — `feature_registry`, `role_features`, `profile_feature_overrides`

Fuente de verdad del feature-gating a nivel runtime.

**Pasos:**
- `[1.C.5.1]` Schema `feature_registry`:
  ```sql
  CREATE TABLE public.feature_registry (
    code TEXT PRIMARY KEY,                       -- 'asesor.busquedas.advanced_filters'
    category TEXT NOT NULL,                      -- 'asesor' | 'dev' | 'admin' | 'comprador' | 'public' | 'shared'
    module TEXT NOT NULL,                        -- 'busquedas' | 'operaciones' | ...
    name_en TEXT NOT NULL,
    name_es TEXT NOT NULL,
    description_es TEXT,
    is_premium BOOLEAN NOT NULL DEFAULT false,
    min_plan TEXT REFERENCES public.plans(code), -- NULL = free
    is_beta BOOLEAN NOT NULL DEFAULT false,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    h_phase SMALLINT NOT NULL DEFAULT 1,         -- 1 | 2 | 3
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ```
- `[1.C.5.2]` Schema `role_features` (mapeo rol → features por defecto):
  ```sql
  CREATE TABLE public.role_features (
    rol user_role NOT NULL,
    feature_code TEXT NOT NULL REFERENCES public.feature_registry(code) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (rol, feature_code)
  );
  ```
- `[1.C.5.3]` Schema `profile_feature_overrides` (override por usuario):
  ```sql
  CREATE TABLE public.profile_feature_overrides (
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    feature_code TEXT NOT NULL REFERENCES public.feature_registry(code) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL,
    reason TEXT,
    granted_by UUID REFERENCES public.profiles(id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    PRIMARY KEY (profile_id, feature_code)
  );
  CREATE INDEX idx_pfo_profile ON public.profile_feature_overrides (profile_id) WHERE expires_at IS NULL OR expires_at > now();
  ```

**Criterio de done del módulo:**
- [ ] 3 tablas creadas.
- [ ] FKs coherentes.

#### MÓDULO 1.C.6 — `audit_log`

**Pasos:**
- `[1.C.6.1]` Schema `audit_log`:
  ```sql
  CREATE TABLE public.audit_log (
    id BIGSERIAL PRIMARY KEY,
    country_code CHAR(2),                        -- NULL para eventos globales
    actor_id UUID,                               -- auth.uid() al momento de la acción
    actor_role user_role,
    action TEXT NOT NULL,                        -- 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'RBAC_CHANGE' | ...
    table_name TEXT,
    record_id UUID,
    before JSONB,
    after JSONB,
    diff JSONB,                                  -- computed diff
    ip INET,
    user_agent TEXT,
    request_id TEXT,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_audit_actor ON public.audit_log (actor_id, created_at DESC);
  CREATE INDEX idx_audit_record ON public.audit_log (table_name, record_id, created_at DESC);
  CREATE INDEX idx_audit_country_date ON public.audit_log (country_code, created_at DESC);
  ```
- `[1.C.6.2]` Particionar por mes con `pg_partman`:
  ```sql
  SELECT partman.create_parent('public.audit_log', 'created_at', 'native', 'monthly');
  ```
- `[1.C.6.3]` Policy RLS: solo superadmin puede SELECT (`USING (is_superadmin())`) — la función se crea en Bloque 1.D. Nunca DELETE (se define restricción absoluta en Fase 06).

**Criterio de done del módulo:**
- [ ] Tabla particionada (SELECT `partman.part_config` muestra la entry).
- [ ] RLS habilitado.

### BLOQUE 1.D — Helpers RLS SECURITY DEFINER

Funciones utilitarias con `auth.uid()` validation obligatoria (ADR-009 — previene SEC-04 del repo viejo). Todas con `SET search_path = ''`.

#### MÓDULO 1.D.1 — `get_user_role()` y `is_superadmin()`

**Pasos:**
- `[1.D.1.1]` Migration `helpers_rls.sql`:
  ```sql
  CREATE OR REPLACE FUNCTION public.get_user_role()
  RETURNS user_role
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  STABLE
  AS $$
  DECLARE v_uid UUID; v_rol user_role;
  BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN RETURN NULL; END IF;   -- no autenticado
    SELECT rol INTO v_rol FROM public.profiles WHERE id = v_uid;
    RETURN v_rol;
  END $$;
  ```
- `[1.D.1.2]`
  ```sql
  CREATE OR REPLACE FUNCTION public.is_superadmin()
  RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = '' STABLE AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'superadmin' AND is_active
    );
  $$;
  ```

**Criterio de done del módulo:**
- [ ] `SELECT public.get_user_role()` sin auth devuelve NULL (no error).
- [ ] `SELECT public.is_superadmin()` devuelve bool.

#### MÓDULO 1.D.2 — `get_visible_asesor_ids()`

Retorna los IDs que un asesor/broker puede ver (self + subordinados + broker canaliza).

**Pasos:**
- `[1.D.2.1]`
  ```sql
  CREATE OR REPLACE FUNCTION public.get_visible_asesor_ids()
  RETURNS SETOF UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' STABLE AS $$
  DECLARE v_uid UUID; v_rol user_role; v_broker UUID;
  BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN RETURN; END IF;
    SELECT rol, broker_company_id INTO v_rol, v_broker FROM public.profiles WHERE id = v_uid;
    IF v_rol = 'superadmin' THEN
      RETURN QUERY SELECT id FROM public.profiles WHERE rol = 'asesor';
    ELSIF v_rol = 'broker_manager' AND v_broker IS NOT NULL THEN
      RETURN QUERY SELECT id FROM public.profiles WHERE broker_company_id = v_broker;
    ELSE
      RETURN QUERY SELECT v_uid;              -- solo sí mismo
    END IF;
  END $$;
  ```

**Criterio de done del módulo:**
- [ ] Función creada.
- [ ] Test manual con role broker_manager retorna > 1 row.

#### MÓDULO 1.D.3 — `resolve_features(user_id UUID)`

Resuelve qué features ve un usuario combinando `role_features`, `profile_feature_overrides` y plan activo.

**Pasos:**
- `[1.D.3.1]`
  ```sql
  CREATE OR REPLACE FUNCTION public.resolve_features(p_user_id UUID DEFAULT NULL)
  RETURNS SETOF TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' STABLE AS $$
  DECLARE v_uid UUID; v_rol user_role; v_plan_code TEXT;
  BEGIN
    v_uid := COALESCE(p_user_id, auth.uid());
    IF v_uid IS NULL THEN RETURN; END IF;
    -- seguridad: solo superadmin puede consultar de otros
    IF p_user_id IS NOT NULL AND p_user_id <> auth.uid() AND NOT public.is_superadmin() THEN
      RAISE EXCEPTION 'unauthorized';
    END IF;
    SELECT rol INTO v_rol FROM public.profiles WHERE id = v_uid;
    SELECT p.code INTO v_plan_code
      FROM public.subscriptions s JOIN public.plans p ON p.id = s.plan_id
      WHERE s.subject_type = 'profile' AND s.subject_id = v_uid AND s.status IN ('trialing', 'active')
      ORDER BY s.current_period_end DESC LIMIT 1;
    RETURN QUERY
      SELECT fr.code
      FROM public.feature_registry fr
      JOIN public.role_features rf ON rf.feature_code = fr.code
      WHERE rf.rol = v_rol AND rf.is_enabled AND fr.is_enabled
        AND (fr.min_plan IS NULL OR fr.min_plan = v_plan_code OR v_plan_code IS NOT NULL)
        AND NOT EXISTS (
          SELECT 1 FROM public.profile_feature_overrides pfo
          WHERE pfo.profile_id = v_uid AND pfo.feature_code = fr.code
            AND pfo.is_enabled = false AND (pfo.expires_at IS NULL OR pfo.expires_at > now())
        )
    UNION
      SELECT pfo.feature_code
      FROM public.profile_feature_overrides pfo
      WHERE pfo.profile_id = v_uid AND pfo.is_enabled = true
        AND (pfo.expires_at IS NULL OR pfo.expires_at > now());
  END $$;
  ```
- `[1.D.3.2]` Grant EXECUTE a `authenticated`: `GRANT EXECUTE ON FUNCTION public.resolve_features TO authenticated;`.

**Criterio de done del módulo:**
- [ ] Función creada.
- [ ] Tests: con role asesor_basic retorna un set ≥ 10 features.

#### MÓDULO 1.D.4 — Helper global `set_updated_at()`

**Pasos:**
- `[1.D.4.1]`
  ```sql
  CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
  BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
  ```
- `[1.D.4.2]` Aplicar en todas las tablas con `updated_at` via `CREATE TRIGGER trg_<table>_updated_at BEFORE UPDATE ON <table> FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();`.

**Criterio de done del módulo:**
- [ ] Trigger activo en todas las tablas con `updated_at`.

### BLOQUE 1.E — Indexes de performance

#### MÓDULO 1.E.1 — GIN indexes para JSONB y trigrams

**Pasos:**
- `[1.E.1.1]` Para cada tabla con `meta JSONB`: `CREATE INDEX idx_<tbl>_meta_gin ON public.<tbl> USING GIN (meta);`.
- `[1.E.1.2]` Trigram para búsqueda fuzzy en nombres: `CREATE INDEX idx_profiles_fullname_trgm ON public.profiles USING GIN (full_name gin_trgm_ops);`, idem `desarrolladoras.name`, `agencies.name`, `broker_companies.name`.
- `[1.E.1.3]` Índices compuestos adicionales: `CREATE INDEX idx_profiles_country_approved ON public.profiles (country_code, is_approved, is_active);`.

**Criterio de done del módulo:**
- [ ] `\d+ profiles` muestra los índices.
- [ ] `EXPLAIN SELECT ... WHERE full_name ILIKE '%juan%'` usa el GIN trigram.

### BLOQUE 1.F — Auto-generación de types TypeScript

#### MÓDULO 1.F.1 — Script `db:types` + CI check

**Pasos:**
- `[1.F.1.1]` Verificar que `package.json` tiene `"db:types": "supabase gen types typescript --project-id qxfuqwlktmhokwwlvggy > shared/types/database.ts"` (desde Fase 00).
- `[1.F.1.2]` Ejecutar localmente: `npm run db:types` — debe sobrescribir `shared/types/database.ts` con interfaces `Database`, `Tables`, `Enums`.
- `[1.F.1.3]` Commit del archivo generado.
- `[1.F.1.4]` Workflow CI job `db-types-check` (en Fase 00, ahora activado): corre `npm run db:types` y verifica con `git diff --exit-code shared/types/database.ts` que no hay drift (si hay, CI falla y force a regenerar).

**Criterio de done del módulo:**
- [ ] `shared/types/database.ts` generado con > 300 líneas.
- [ ] CI detecta drift si se agrega tabla sin regenerar.

### BLOQUE 1.G — Seed countries + currencies + locales

(Ya cubierto en 1.B.2 — este bloque es checkpoint final del seed de fundación.)

#### MÓDULO 1.G.1 — Validar seed en prod Supabase

**Pasos:**
- `[1.G.1.1]` Conectar vía MCP Supabase y ejecutar `SELECT code, name_en, default_currency FROM countries;` — deben aparecer 6.
- `[1.G.1.2]` Idem `SELECT code, name_en FROM currencies;` — deben aparecer ≥ 6.
- `[1.G.1.3]` Idem `SELECT code, country_code FROM locales;` — deben aparecer ≥ 6.

**Criterio de done del módulo:**
- [ ] Los 3 SELECTs devuelven las filas esperadas en el proyecto remoto.

### BLOQUE 1.H — Seed `feature_registry` (~120 features)

#### MÓDULO 1.H.1 — Script seed

**Pasos:**
- `[1.H.1.1]` Crear `supabase/seeds/feature_registry.sql` con ~120 INSERT ON CONFLICT DO NOTHING, agrupados por categoría:
  - **asesor (35)**: `asesor.dashboard.overview`, `asesor.busquedas.basic`, `asesor.busquedas.advanced_filters`, `asesor.busquedas.save`, `asesor.busquedas.alerts`, `asesor.captaciones.create`, `asesor.captaciones.match`, `asesor.tareas.create`, `asesor.tareas.recurring`, `asesor.operaciones.pipeline`, `asesor.operaciones.commission_split`, `asesor.contactos.crm`, `asesor.contactos.import`, `asesor.marketing.posts`, `asesor.marketing.campaigns`, `asesor.estadisticas.personal`, `asesor.estadisticas.compare_team`, `asesor.ai.copilot`, `asesor.ai.command_palette`, `asesor.ai.voice`, `asesor.ia.match_recommendations`, etc.
  - **dev (30)**: `dev.inventory.crud`, `dev.inventory.bulk_import`, `dev.contabilidad.cfdi_emit`, `dev.contabilidad.cfdi_cancel`, `dev.contabilidad.bank_reconciliation`, `dev.contabilidad.payout_program`, `dev.contabilidad.commission_holdback`, `dev.analytics.ie_integration`, `dev.crm.leads`, `dev.marketing.campaigns`, `dev.webhooks.outbound`, etc.
  - **admin (15)**: `admin.users.manage`, `admin.desarrolladoras.approve`, `admin.market_observatory`, `admin.audit_log.view`, `admin.feature_flags.edit`, `admin.reports.export`, etc.
  - **comprador (15)**: `comprador.wishlist`, `comprador.family_account`, `comprador.preapproval_integrations`, `comprador.voice_search`, `comprador.apartado_escrow`, etc.
  - **public (10)**: `public.marketplace.browse`, `public.indices.view`, `public.metodologia.view`, `public.blog`, etc.
  - **shared (15)**: `shared.i18n.switch_locale`, `shared.currency.switch`, `shared.notifications.inapp`, `shared.notifications.whatsapp`, `shared.mfa.totp`, `shared.mfa.sms_backup`, etc.
- `[1.H.1.2]` Cada row incluye `category`, `module`, `name_en`, `name_es`, `description_es`, `is_premium`, `min_plan`, `h_phase`.
- `[1.H.1.3]` Crear `supabase/seeds/role_features.sql` con mapeo rol→features default:
  - `asesor`: incluye todos los `asesor.*.basic` + `shared.*`.
  - `admin_desarrolladora`: todos los `dev.*` + `shared.*`.
  - `mb_admin`: todos los `admin.*` + `dev.*` + `asesor.*` (super-visión).
  - `superadmin`: todos.
- `[1.H.1.4]` Ejecutar seeds en remoto: `supabase db execute -f supabase/seeds/feature_registry.sql && supabase db execute -f supabase/seeds/role_features.sql`.
- `[1.H.1.5]` Verificar: `SELECT count(*) FROM feature_registry` ≈ 120.

**Criterio de done del módulo:**
- [ ] `feature_registry` tiene ≥ 108 filas.
- [ ] `role_features` tiene mapeos para los 8 roles del enum.

## Criterio de done de la FASE

- [ ] 10 extensiones Postgres habilitadas.
- [ ] Tablas fundación creadas: `countries`, `currencies`, `locales`, `profiles`, `desarrolladoras`, `agencies`, `broker_companies`, `addresses`, `plans`, `subscriptions`, `feature_registry`, `role_features`, `profile_feature_overrides`, `audit_log`.
- [ ] Todas las tablas con `country_code NOT NULL` donde aplica + índice compuesto.
- [ ] 4 helpers RLS SECURITY DEFINER con `auth.uid()` + `SET search_path = ''`.
- [ ] Seeds de 6 países + ~6 currencies + 6 locales + ~120 features + mapeo rol→features.
- [ ] `shared/types/database.ts` generado y commiteado.
- [ ] CI job `db-types-check` activo.
- [ ] `audit_log` particionado con pg_partman.
- [ ] Tag git: `fase-01-complete`.
- [ ] Documentación actualizada en `docs/03_CATALOGOS/03.1_CATALOGO_BD_TABLAS.md`.
- [ ] Zero errores de TypeScript / Build.

## Features implementadas en esta fase (≈ 25)

1. **F-01-01** Extensions Postgres (pgvector, pgsodium, pg_partman, pg_trgm, btree_gin, unaccent, postgis)
2. **F-01-02** Tabla `countries` + seed 6 países
3. **F-01-03** Tabla `currencies` + seed 6 monedas
4. **F-01-04** Tabla `locales` + seed 6 locales
5. **F-01-05** Enum `user_role` (8 roles)
6. **F-01-06** Tabla `profiles` multi-country con PII separada
7. **F-01-07** Tabla `desarrolladoras` con tax_id per país
8. **F-01-08** Tabla `agencies`
9. **F-01-09** Tabla `broker_companies` con `is_authorized_broker`
10. **F-01-10** Tabla `addresses` multi-country flex con PostGIS
11. **F-01-11** Tabla `plans` multi-country/currency
12. **F-01-12** Tabla `subscriptions` con billing cycles
13. **F-01-13** Tabla `feature_registry` (~120 features)
14. **F-01-14** Tabla `role_features` (mapeo default)
15. **F-01-15** Tabla `profile_feature_overrides` con expiración
16. **F-01-16** Tabla `audit_log` particionada por mes
17. **F-01-17** Helper `get_user_role()` SECURITY DEFINER validado
18. **F-01-18** Helper `is_superadmin()` SECURITY DEFINER
19. **F-01-19** Helper `get_visible_asesor_ids()` con jerarquía broker
20. **F-01-20** Helper `resolve_features()` combinando role+override+plan
21. **F-01-21** Trigger global `set_updated_at()`
22. **F-01-22** Índices GIN sobre JSONB y trigrams
23. **F-01-23** Índices compuestos (country_code, ...) primero
24. **F-01-24** Script `db:types` + CI check para drift
25. **F-01-25** Validación postal_code per country (regex)

## Próxima fase

[FASE 02 — Auth y Permisos](./FASE_02_AUTH_Y_PERMISOS.md)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent C) | **Fecha:** 2026-04-17
