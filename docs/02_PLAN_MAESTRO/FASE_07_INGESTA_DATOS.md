# FASE 07 — Ingesta de Datos

> **Duración estimada:** 4 sesiones Claude Code (~10 horas con agentes paralelos)
> **Dependencias:** [FASE 01 — BD Fundación](./FASE_01_BD_FUNDACION.md), [FASE 05 — Multi-country](./FASE_05_I18N_Y_MULTICOUNTRY.md), [FASE 06 — Seguridad Baseline](./FASE_06_SEGURIDAD_BASELINE.md)
> **Bloqueantes externos:**
> - `BANXICO_TOKEN` — Banxico SIE API (registro gratuito en https://www.banxico.org.mx/SieAPIRest)
> - `INEGI_TOKEN` — INEGI BIE API (registro gratuito https://www.inegi.org.mx/app/api)
> - `MAPBOX_ACCESS_TOKEN` — Mapbox Traffic + geocoding (~$50-$200/mes según volumen)
> - `AIRDNA_API_KEY` — AirDNA MarketMinder API (Enterprise $500+/mes — opcional H1, pin H2 si presupuesto tight)
> - `GOOGLE_TRENDS_METHOD` — decisión: scraping via `google-trends-api` npm package (sin token, pero rate limited) ó SerpAPI ($50/mes)
> - Anthropic API key ya existe (Fase 03) — usar GPT-4o-mini para extraer PDF BBVA Research
> - Trigger.dev v3 account con workers activos (cron scheduler robusto)
> - Manu debe autorizar los crons en prod Supabase (concurrency limits) y aprobar lista de fuentes antes de activar producción
> - **PROHIBIDO**: API Habi — constraint explícito en código + docs (razones: rate limit 3k calls/día, datos contaminados con sesgo de vendedor, costo no justificado vs valor)
> **Resultado esperado:** Schema ingest completo (geo_data_points, geo_snapshots, macro_series, market_prices_secondary, search_trends, market_pulse, zone_price_index, zona_snapshots con particionamiento pg_partman), orchestrator con retry + dedup + audit, 7 ingestores MACRO + 17 GEO + 4 MERCADO activos con cron schedules, mapeo SCIAN propietario con 3 tiers y 12 macro categorías, admin upload UI para XLSX/CSV/PDF, confidence cascade thresholds seed, tier system seed. Tag `fase-07-complete`.
> **Priority:** [H1]

## Contexto y objetivo

El Intelligence Engine (IE) es el moat de DesarrollosMX. Esta fase habilita la capa de ingesta que alimenta los 118 scores de Fases 08-12. Las 50+ fuentes cubren las tres categorías: MACRO (tasa de referencia, INPC, IPV, cartera hipotecaria), GEO (comercios DENUE, incidencia FGJ, transporte GTFS, riesgos Atlas, servicios educación/salud/agua), MERCADO (precios secundarios Inmuebles24/Mudafy, Airbnb AirDNA, intención Google Trends, reports Cushman/CBRE). El mapeo SCIAN es IP propietario (el valor de "cercanía a comercios" depende de clasificar qué comercios importan). Esta fase deja los ingestores operativos; las métricas de Fases 08+ los consumen.

## Bloques

### BLOQUE 7.A — Schema ingest

#### MÓDULO 7.A.1 — Tablas unificadas con pg_partman

**Pasos:**
- `[7.A.1.1]` Migration `ingest_schema.sql`:
  ```sql
  -- Series macro (time-series por país)
  CREATE TABLE public.macro_series (
    id BIGSERIAL,
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    source TEXT NOT NULL,                       -- 'banxico' | 'inegi' | 'shf' | 'dane' | 'bcra' | 'ibge'
    series_id TEXT NOT NULL,                    -- 'SF43718' (Banxico), 'INPC_GEN' (INEGI)
    metric_name TEXT NOT NULL,
    value NUMERIC(20,6) NOT NULL,
    unit TEXT NOT NULL,                         -- '%', 'MXN', 'index'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    periodicity TEXT NOT NULL CHECK (periodicity IN ('daily','weekly','monthly','quarterly','yearly')),
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY (id, period_start)              -- requerido para pg_partman
  ) PARTITION BY RANGE (period_start);
  SELECT partman.create_parent('public.macro_series', 'period_start', 'native', 'yearly');
  CREATE INDEX idx_macro_country_series ON public.macro_series (country_code, source, series_id, period_start DESC);

  -- Geo data points (puntuales: comercios DENUE, escuelas SIGED, hospitales CLUES, incidentes FGJ)
  CREATE TABLE public.geo_data_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    source TEXT NOT NULL,                       -- 'denue', 'fgj', 'siged', 'clues', 'atlas_riesgos'
    source_id TEXT,                             -- ID externo (CLUE, CCT, cve_estado+municipio+ageb...)
    entity_type TEXT NOT NULL,                  -- 'business','school','hospital','crime','risk_zone','waste_cut'
    name TEXT,
    scian_code TEXT,                            -- solo para DENUE
    geom GEOMETRY(Point, 4326),
    zone_id UUID,                               -- FK zones (Fase 08)
    valid_from DATE NOT NULL,
    valid_to DATE,                              -- NULL = activo
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_gdp_country_source ON public.geo_data_points (country_code, source, entity_type);
  CREATE INDEX idx_gdp_geom ON public.geo_data_points USING GIST (geom);
  CREATE INDEX idx_gdp_scian ON public.geo_data_points (scian_code) WHERE scian_code IS NOT NULL;
  CREATE INDEX idx_gdp_zone ON public.geo_data_points (zone_id) WHERE zone_id IS NOT NULL;
  CREATE INDEX idx_gdp_valid ON public.geo_data_points (country_code, valid_from, valid_to);

  -- Snapshots agregados por zona (resumen para queries rápidos)
  CREATE TABLE public.geo_snapshots (
    id BIGSERIAL,
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    zone_id UUID NOT NULL,
    source TEXT NOT NULL,
    metric TEXT NOT NULL,                        -- 'business_count_high_tier','crime_rate_total','school_count_public'
    value NUMERIC(20,6) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, period_start)
  ) PARTITION BY RANGE (period_start);
  SELECT partman.create_parent('public.geo_snapshots', 'period_start', 'native', 'yearly');
  CREATE INDEX idx_geosnap_zone_metric ON public.geo_snapshots (country_code, zone_id, metric, period_start DESC);

  -- Precios del mercado secundario (scrapers)
  CREATE TABLE public.market_prices_secondary (
    id BIGSERIAL,
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    source TEXT NOT NULL,                        -- 'inmuebles24','mudafy','zonaprop','vivareal'
    listing_id TEXT NOT NULL,
    zone_id UUID,
    property_type TEXT,                         -- 'departamento','casa','terreno','oficina','local'
    operation TEXT NOT NULL CHECK (operation IN ('venta','renta')),
    price_minor BIGINT NOT NULL,
    currency CHAR(3) NOT NULL REFERENCES public.currencies(code),
    area_built_m2 NUMERIC(10,2),
    bedrooms SMALLINT,
    bathrooms NUMERIC(3,1),
    amenities JSONB,
    posted_at DATE NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, posted_at)
  ) PARTITION BY RANGE (posted_at);
  SELECT partman.create_parent('public.market_prices_secondary', 'posted_at', 'native', 'monthly');
  CREATE INDEX idx_mps_zone ON public.market_prices_secondary (country_code, zone_id, operation, property_type);
  CREATE UNIQUE INDEX idx_mps_source_listing ON public.market_prices_secondary (source, listing_id, posted_at);

  -- Search trends (Google Trends)
  CREATE TABLE public.search_trends (
    id BIGSERIAL,
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    zone_id UUID,
    keyword TEXT NOT NULL,
    interest_score SMALLINT NOT NULL CHECK (interest_score BETWEEN 0 AND 100),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, period_start)
  ) PARTITION BY RANGE (period_start);
  SELECT partman.create_parent('public.search_trends', 'period_start', 'native', 'yearly');
  CREATE INDEX idx_st_zone_kw ON public.search_trends (country_code, zone_id, keyword, period_start DESC);

  -- Market pulse (Airbnb, ocupación)
  CREATE TABLE public.market_pulse (
    id BIGSERIAL,
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    zone_id UUID,
    source TEXT NOT NULL,                        -- 'airdna'
    metric TEXT NOT NULL,                        -- 'occupancy_rate','adr','revpar','listings_count'
    value NUMERIC(20,6) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, period_start)
  ) PARTITION BY RANGE (period_start);
  SELECT partman.create_parent('public.market_pulse', 'period_start', 'native', 'yearly');
  CREATE INDEX idx_mp_zone_metric ON public.market_pulse (country_code, zone_id, metric, period_start DESC);

  -- Índice de precios por zona (cálculo derivado; source=dmx)
  CREATE TABLE public.zone_price_index (
    id BIGSERIAL,
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    zone_id UUID NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('venta','renta')),
    property_type TEXT,
    price_per_m2_minor BIGINT NOT NULL,
    currency CHAR(3) NOT NULL,
    yoy_pct NUMERIC(8,4),                        -- year over year
    mom_pct NUMERIC(8,4),                        -- month over month
    sample_size INT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, period_start)
  ) PARTITION BY RANGE (period_start);
  SELECT partman.create_parent('public.zone_price_index', 'period_start', 'native', 'yearly');
  CREATE UNIQUE INDEX idx_zpi_zone_op_type ON public.zone_price_index (country_code, zone_id, operation, property_type, period_start);

  -- Snapshots por zona (multi-fuente combinada)
  CREATE TABLE public.zona_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    zone_id UUID NOT NULL,
    period DATE NOT NULL,
    payload JSONB NOT NULL,                     -- objeto consolidado con todos los indicadores
    computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE UNIQUE INDEX idx_zs_zone_period ON public.zona_snapshots (country_code, zone_id, period);
  ```
- `[7.A.1.2]` RLS: SELECT público para `macro_series`, `geo_snapshots`, `zone_price_index`, `zona_snapshots`, `search_trends`, `market_pulse`. Restringido para `geo_data_points` (no exponer puntos individuales DENUE con razón social — solo agregados). `market_prices_secondary` restringido a asesores/dev.
- `[7.A.1.3]` Verificar particionamiento en pg_partman: `SELECT * FROM partman.part_config WHERE parent_table LIKE 'public.%';` debe listar 7 parents.

**Criterio de done del módulo:**
- [ ] 8 tablas creadas (7 particionadas + zona_snapshots).
- [ ] Políticas RLS coherentes con sensibilidad.
- [ ] Particiones generadas automáticamente por año/mes.

### BLOQUE 7.B — Orchestrator de ingesta

#### MÓDULO 7.B.1 — Core orchestrator

**Pasos:**
- `[7.B.1.1]` Crear `shared/lib/ingest/orchestrator.ts`:
  ```typescript
  import { withRetry, exponentialBackoff } from './retry';
  import { deduplicate } from './dedup';

  export type IngestJob = {
    id: string; source: string; country: string;
    run: (ctx: IngestCtx) => Promise<IngestResult>;
  };
  export interface IngestResult { rows_inserted: number; rows_updated: number; rows_skipped: number; errors: string[]; }

  const ALLOWED_SOURCES = [
    'banxico','inegi','shf','bbva_research','cnbv','infonavit','fovissste',
    'denue','fgj','gtfs','atlas_riesgos','siged','clues','sacmex','rama','seduvi','catastro','paot','sedema','conagua','inah','profeco','locatel','mapbox_traffic',
    'inmuebles24','mudafy','airdna','google_trends','cushman','cbre'
    // 'habi' — PROHIBIDO explícitamente
  ] as const;

  export async function runIngest(job: IngestJob) {
    // 1. Guard fuente autorizada
    if (!ALLOWED_SOURCES.includes(job.source as any)) {
      throw new Error(`source_not_allowed: ${job.source}. Habi explicitly prohibited.`);
    }
    // 2. Audit start
    const runId = await logStart(job);
    try {
      const result = await withRetry(() => job.run({ runId }), { retries: 5, backoff: exponentialBackoff });
      await logComplete(runId, result);
      return result;
    } catch (err) {
      await logError(runId, err);
      throw err;
    }
  }
  ```
- `[7.B.1.2]` Tabla `ingest_runs`:
  ```sql
  CREATE TABLE public.ingest_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL,
    country_code CHAR(2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running','success','failed','partial')),
    rows_inserted INT DEFAULT 0,
    rows_updated INT DEFAULT 0,
    rows_skipped INT DEFAULT 0,
    error TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    duration_ms INT,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb
  );
  CREATE INDEX idx_ir_source_status ON public.ingest_runs (source, status, started_at DESC);
  ```
- `[7.B.1.3]` Dedup helper `shared/lib/ingest/dedup.ts` que usa (source + source_id + period) como clave natural antes de INSERT.
- `[7.B.1.4]` Retry helper con backoff exponencial (base 1s, cap 60s, jitter 0.3).
- `[7.B.1.5]` Rate limiter interno per source (ej: Banxico SIE API permite ~100 req/min — respetar).

**Criterio de done del módulo:**
- [ ] Orchestrator loggea cada run.
- [ ] Retry funciona en failures transitorios.
- [ ] Dedup evita duplicados por unique index.

### BLOQUE 7.C — 7 ingestores MACRO (MX)

(Referencia: `docs/biblia-v5/06_IE_PART1_Vision_Arquitectura_Fuentes_SCIAN.md` §3.1)

#### MÓDULO 7.C.1 — Banxico SIE

**Pasos:**
- `[7.C.1.1]` Crear `shared/lib/ingest/macro/banxico.ts`:
  ```typescript
  const BANXICO_BASE = 'https://www.banxico.org.mx/SieAPIRest/service/v1/series';
  const SERIES = {
    tasa_referencia: 'SF43783',
    TIIE28: 'SF43718',
    USD_MXN: 'SF43718',                          // spot
    tasa_hipotecaria_avg: 'SF282'
  };
  export async function ingestBanxico(): Promise<IngestResult> {
    const token = process.env.BANXICO_TOKEN!;
    const result = { rows_inserted: 0, rows_updated: 0, rows_skipped: 0, errors: [] as string[] };
    for (const [metric, series_id] of Object.entries(SERIES)) {
      const url = `${BANXICO_BASE}/${series_id}/datos?token=${token}`;
      const res = await fetch(url, { headers: { 'Bmx-Token': token } });
      const json = await res.json();
      const points = json.bmx.series[0].datos;
      for (const p of points) {
        // parse fecha 'DD/MM/YYYY' + valor numeric
        // UPSERT en macro_series
      }
    }
    return result;
  }
  ```
- `[7.C.1.2]` Cron schedule: **diario 8:00 AM CDMX** (via Trigger.dev o `pg_cron` via Supabase Scheduler).
- `[7.C.1.3]` Source tag: `source='banxico'`, `country_code='MX'`.

**Criterio de done del módulo:**
- [ ] Tabla `macro_series` con rows `source='banxico'`.
- [ ] Cron ejecuta y actualiza.

#### MÓDULO 7.C.2 — INEGI BIE

**Pasos:**
- `[7.C.2.1]` `shared/lib/ingest/macro/inegi.ts` con series:
  ```typescript
  const INEGI_BASE = 'https://www.inegi.org.mx/app/api/indicadores/desarrolladores/jsonxml/INDICATOR';
  const SERIES = {
    INPC_GEN: '910414',                          // Índice Nacional de Precios al Consumidor
    INPP_CONSTRUCCION: '628194',                 // Productor construcción
    PIB_REAL: '493911',
    MATERIALES_CONST: '628193',
    VIVIENDA_NUEVA: '496001'
  };
  ```
- `[7.C.2.2]` Cron: **mensual, día 15 a las 9:00** (INEGI publica ~día 9).
- `[7.C.2.3]` Source tag: `source='inegi'`.

**Criterio de done del módulo:**
- [ ] Ingesta INEGI funcional.

#### MÓDULO 7.C.3 — SHF

**Pasos:**
- `[7.C.3.1]` `shared/lib/ingest/macro/shf.ts` — SHF publica IPV trimestral en XLSX. Endpoint: `https://www.gob.mx/shf/documentos/indice-shf-de-precios-de-la-vivienda`.
- `[7.C.3.2]` Admin upload UI permite a mb_admin subir XLSX cuando SHF libera → parser Sheet.js + INSERT en `macro_series`.
- `[7.C.3.3]` Cron **trimestral día 20** + alerta si admin no sube tras 30 días.

**Criterio de done del módulo:**
- [ ] Upload XLSX funcional + parse correcto.

#### MÓDULO 7.C.4 — BBVA Research (PDF extract GPT-4o-mini)

**Pasos:**
- `[7.C.4.1]` `shared/lib/ingest/macro/bbva-research.ts`: admin descarga PDF mensual ("Situación Inmobiliaria"); pipeline OCR `pdf-parse` + prompt estructurado a GPT-4o-mini con schema Zod (outputs: `forecast_housing_prices_yoy`, `mortgage_rate_forecast`, `demand_index`).
- `[7.C.4.2]` Cron **mensual día 25**.

**Criterio de done del módulo:**
- [ ] Extract devuelve JSON estructurado válido.

#### MÓDULO 7.C.5 — CNBV

**Pasos:**
- `[7.C.5.1]` CNBV publica XLSX sistema bancario (cartera hipotecaria, tasa promedio por institución). Admin upload mensual.
- `[7.C.5.2]` Cron alerta día 20 de cada mes.

**Criterio de done del módulo:**
- [ ] Upload + parse.

#### MÓDULO 7.C.6 — Infonavit

**Pasos:**
- `[7.C.6.1]` Infonavit Portal Transparencia — datasets CSV (créditos otorgados por delegación, valor de vivienda promedio por tipo). Scraping controlado del portal + admin override manual.
- `[7.C.6.2]` Cron **mensual día 10**.

**Criterio de done del módulo:**
- [ ] Datos Infonavit en `macro_series`.

#### MÓDULO 7.C.7 — FOVISSSTE

**Pasos:**
- `[7.C.7.1]` FOVISSSTE publica informe trimestral PDF + XLSX complementario. Admin upload + parser.
- `[7.C.7.2]` Cron alerta trimestral.

**Criterio de done del módulo:**
- [ ] Datos FOVISSSTE ingestados.

### BLOQUE 7.D — 17 ingestores GEO (MX + extensible multi-country)

(Referencia: `docs/biblia-v5/06_IE_PART1_Vision_Arquitectura_Fuentes_SCIAN.md` §3.2)

#### MÓDULO 7.D.1 — DENUE (INEGI) con mapeo SCIAN

**Pasos:**
- `[7.D.1.1]` `shared/lib/ingest/geo/denue.ts`: endpoint `https://www.inegi.org.mx/app/api/denue/v1/consulta/BuscarEntidad/{cve_estado}/{token}`.
- `[7.D.1.2]` Ingestar todos los establecimientos; asignar `zone_id` via geocoding + ST_Contains con tabla `zones` (Fase 08).
- `[7.D.1.3]` Campo `meta` incluye: `scian_code`, `employee_range`, `giro`, `razon_social` (NO exponer públicamente).
- `[7.D.1.4]` Snapshot agregado en `geo_snapshots` por zona × SCIAN tier (high/standard/basic) — descrito en Bloque 7.F.
- `[7.D.1.5]` Cron **mensual día 5**.

**Criterio de done del módulo:**
- [ ] DENUE CDMX ingestado (~550k puntos).
- [ ] Snapshots por zona computados.

#### MÓDULO 7.D.2 — FGJ CDMX

**Pasos:**
- `[7.D.2.1]` `shared/lib/ingest/geo/fgj.ts`: portal datos abiertos CDMX `https://datos.cdmx.gob.mx/dataset/carpetas-de-investigacion-fgj-de-la-ciudad-de-mexico` — CSV/JSON de carpetas de investigación.
- `[7.D.2.2]` Geocoding por colonia + tipo delito (heurística: robo vivienda, robo vehículo, violencia familiar, homicidio, etc.).
- `[7.D.2.3]` Snapshot `geo_snapshots` metric `crime_rate_per_1000_inhabs_monthly` por zona.
- `[7.D.2.4]` Cron **semanal viernes 7AM**.

**Criterio de done del módulo:**
- [ ] FGJ datos ingestados.

#### MÓDULO 7.D.3 — GTFS (Metro + Metrobús + Tren + Cablebús + EcoBici)

**Pasos:**
- `[7.D.3.1]` `shared/lib/ingest/geo/gtfs.ts`: feeds estáticos GTFS de cada sistema:
  - Metro CDMX: https://metro.cdmx.gob.mx/operacion/horarios
  - Metrobús: https://www.metrobus.cdmx.gob.mx/gtfs
  - Tren Suburbano + Cablebús + EcoBici.
- `[7.D.3.2]` Parse stops.txt + routes.txt → rows en `geo_data_points` entity_type `transit_stop`.
- `[7.D.3.3]` Cron **trimestral**.

**Criterio de done del módulo:**
- [ ] Stops de 5 sistemas en `geo_data_points`.

#### MÓDULO 7.D.4 — Atlas Nacional de Riesgos

**Pasos:**
- `[7.D.4.1]` Shapefiles desde Atlas: sismicidad, hundimientos, inundaciones, deslaves. Descargar ZIP + extract con `shp2pgsql`.
- `[7.D.4.2]` `geo_data_points` entity_type `risk_zone`, geom polígonos.
- `[7.D.4.3]` Cron **semestral** o on-demand (poco cambia).

**Criterio de done del módulo:**
- [ ] Shapefiles cargados.

#### MÓDULO 7.D.5 — SIGED (SEP — escuelas)

**Pasos:**
- `[7.D.5.1]` Dataset público SEP con CCT (Centro de Trabajo), nivel (preescolar/primaria/secundaria/media superior/superior), tipo (público/privado).
- `[7.D.5.2]` Cron **mensual**.

**Criterio de done del módulo:**
- [ ] Escuelas en `geo_data_points`.

#### MÓDULO 7.D.6 — DGIS/CLUES (salud)

**Pasos:**
- `[7.D.6.1]` Dataset CLUES con establecimientos de salud (ISSSTE, IMSS, Secretaría Salud, privados).
- `[7.D.6.2]` Cron **mensual**.

**Criterio de done del módulo:**
- [ ] Hospitales en `geo_data_points`.

#### MÓDULO 7.D.7 — SACMEX (cortes agua)

**Pasos:**
- `[7.D.7.1]` Scraping del portal de avisos SACMEX; almacenar corte por colonia/alcaldía con start/end date.
- `[7.D.7.2]` Cron **semanal**.

**Criterio de done del módulo:**
- [ ] Cortes registrados.

#### MÓDULO 7.D.8 — RAMA SINAICA (calidad aire) — H2 pin

**Pasos:**
- `[7.D.8.1]` Stub `shared/lib/ingest/geo/rama.ts` — API SINAICA.
- `[7.D.8.2]` Feature flag `ingest.rama.enabled` off en H1, on en H2.

**Criterio de done del módulo:**
- [ ] Stub listo.

#### MÓDULO 7.D.9 — Uso de Suelo SEDUVI — H2 pin

**Pasos:**
- `[7.D.9.1]` Stub. Shapefile CDMX.
- `[7.D.9.2]` Flag off H1.

**Criterio de done del módulo:**
- [ ] Stub.

#### MÓDULO 7.D.10 — Catastro CDMX — H2 pin

**Pasos:**
- `[7.D.10.1]` Stub. Valor catastral por predio.

**Criterio de done del módulo:**
- [ ] Stub.

#### MÓDULO 7.D.11-17 — PAOT, SEDEMA, CONAGUA, INAH, PROFECO, Locatel 0311, Mapbox Traffic

**Pasos:**
- `[7.D.11.1]` PAOT: denuncias ambientales portales datos.
- `[7.D.12.1]` SEDEMA: alertas atmosféricas + áreas verdes.
- `[7.D.13.1]` CONAGUA: precipitación, riesgo hídrico.
- `[7.D.14.1]` INAH: zonas arqueológicas (restricciones construcción).
- `[7.D.15.1]` PROFECO: denuncias por zona (servicio al cliente desarrolladoras).
- `[7.D.16.1]` Locatel 0311: reportes ciudadanos (bacheo, alumbrado, ruido).
- `[7.D.17.1]` **Mapbox Traffic on-demand**: endpoint server que consulta traffic live para una zona dada; NO bulk ingest (costo). Uso: cálculo de `commute_time_to_work` en match.

**Criterio de done del módulo:**
- [ ] 7 fuentes implementadas (3 activas H1, 4 como stubs/low-freq).

### BLOQUE 7.E — 4 ingestores MERCADO

#### MÓDULO 7.E.1 — Inmuebles24 / Mudafy scraping

**Pasos:**
- `[7.E.1.1]` `shared/lib/ingest/market/inmuebles24.ts` + `mudafy.ts` con Playwright headless:
  - Respetar robots.txt; rate limit 1 req cada 3 seg + User-Agent rotation + IP pool (opcional).
  - Campos: listing_id, price, area_built_m2, bedrooms, bathrooms, operation, property_type, address (parse), posted_at, amenities.
- `[7.E.1.2]` Cron **semanal** (balance costo vs freshness).
- `[7.E.1.3]` Dedup por (source + listing_id).

**Criterio de done del módulo:**
- [ ] Cron scrape zonas piloto (Roma, Condesa, Polanco) sin ban.

#### MÓDULO 7.E.2 — AirDNA

**Pasos:**
- `[7.E.2.1]` `shared/lib/ingest/market/airdna.ts` con API key (plan Enterprise). Endpoints: occupancy, ADR, RevPAR por zona.
- `[7.E.2.2]` Si plan tight, defer H2.

**Criterio de done del módulo:**
- [ ] Stub listo (activable cuando cuenta exista).

#### MÓDULO 7.E.3 — Google Trends

**Pasos:**
- `[7.E.3.1]` `shared/lib/ingest/market/google-trends.ts` con `google-trends-api` npm package. Keywords: `"departamentos <colonia>"`, `"casas <ciudad>"`, `"venta <zona>"`.
- `[7.E.3.2]` Cron **semanal**.

**Criterio de done del módulo:**
- [ ] Trends por zona en `search_trends`.

#### MÓDULO 7.E.4 — Cushman & Wakefield + CBRE (reports PDF manual upload)

**Pasos:**
- `[7.E.4.1]` Admin upload UI `/admin/ingest/reports` para PDFs trimestrales Cushman/CBRE.
- `[7.E.4.2]` GPT-4o-mini extrae métricas con schema Zod: vacancy_rate, asking_rent_usd_m2, cap_rate.
- `[7.E.4.3]` Cron alerta admin cada trimestre ~día 30 del mes de cierre.

**Criterio de done del módulo:**
- [ ] Upload + extract funciona.

### BLOQUE 7.F — Mapeo SCIAN propietario (IP)

#### MÓDULO 7.F.1 — Tiers + Macro categorías + Formulas

**Pasos:**
- `[7.F.1.1]` Crear `shared/lib/ingest/scian-mapping.ts` con:
  ```typescript
  export const SCIAN_TIER = {
    high: ['722412','722513','453910', /* cafés boutique, restaurantes gourmet, tiendas especializadas */],
    standard: ['722110','461110','452210', /* restaurantes familiares, tiendas conveniencia, supermercados */],
    basic: ['812110','722513','453210', /* tintorerías, fondas, misceláneas */]
  };
  export const SCIAN_MACRO_CATEGORIES = {
    gastronomia: { prefixes: ['7224','7225'], weight_high: 3, weight_standard: 2, weight_basic: 1 },
    retail: { prefixes: ['461','462','463'], weight_high: 2, weight_standard: 2, weight_basic: 1 },
    salud: { prefixes: ['621','622'], weight_high: 2.5, weight_standard: 2, weight_basic: 1 },
    educacion: { prefixes: ['611'], weight_high: 2, weight_standard: 1.5, weight_basic: 1 },
    servicios_profesionales: { prefixes: ['541'], weight_high: 2, weight_standard: 1, weight_basic: 0.5 },
    cultura_entretenimiento: { prefixes: ['711','712'], weight_high: 3, weight_standard: 2, weight_basic: 1 },
    financiero: { prefixes: ['522'], weight_high: 2, weight_standard: 1.5, weight_basic: 1 },
    fitness_wellness: { prefixes: ['713940','812199'], weight_high: 2.5, weight_standard: 1.5, weight_basic: 0.5 },
    servicios_publicos: { prefixes: ['221'], weight_high: 1, weight_standard: 1, weight_basic: 1 },
    automotriz: { prefixes: ['441','811'], weight_high: 0.5, weight_standard: 1, weight_basic: 1 },
    manufacturas: { prefixes: ['311','315','332'], weight_high: 0.5, weight_standard: 0.5, weight_basic: 0.5 },
    logistica: { prefixes: ['484','493'], weight_high: 0.5, weight_standard: 0.5, weight_basic: 0.5 }
  };
  export function tierForScian(code: string): 'high'|'standard'|'basic' { /* lookup */ }
  ```
- `[7.F.1.2]` Staff estimate midpoint: INEGI publica rangos (0-5, 6-10, 11-30, 31-50, 51-100, 101-250, 251+). Usar midpoint: (0-5)→3, (6-10)→8, (11-30)→20, (31-50)→40, (51-100)→75, (101-250)→175, (251+)→400.
- `[7.F.1.3]` Fórmulas:
  - **ratio_PB** (ratio Premium/Basic): count_high / (count_basic + 1) → zona premium si ratio > 1.5.
  - **Shannon-Wiener diversity index**: `H = -Σ (p_i × ln(p_i))` donde p_i es proporción de cada macro_category. Valores altos indican zona diversa (desirable para residencial).
  - **Gentrification Velocity**: `(ratio_PB_t - ratio_PB_{t-12m}) / ratio_PB_{t-12m}` — > 0.3 indica gentrificación activa.
- `[7.F.1.4]` Aplicar en snapshot agregación: por cada zona × periodo, compute count per tier + ratio_PB + diversity + gentrification_velocity, guardar en `geo_snapshots` metric `scian_*`.

**Criterio de done del módulo:**
- [ ] 3 tiers definidos.
- [ ] 12 macro categorías con weights.
- [ ] Fórmulas computables y expuestas via tRPC `scian.zoneStats`.

### BLOQUE 7.G — Cron schedules

#### MÓDULO 7.G.1 — Trigger.dev jobs

**Pasos:**
- `[7.G.1.1]` Setup Trigger.dev v3: `npm i @trigger.dev/sdk` + config en `trigger/` folder.
- `[7.G.1.2]` Jobs por source:
  - `banxico_daily`: cron "0 14 * * *" (14:00 UTC = 8:00 CDMX).
  - `inegi_monthly`: cron "0 15 15 * *".
  - `shf_quarterly`: cron "0 10 20 1,4,7,10 *".
  - `denue_monthly`: cron "0 2 5 * *".
  - `fgj_weekly`: cron "0 13 * * 5" (viernes 7:00 CDMX).
  - `gtfs_quarterly`: cron "0 6 1 1,4,7,10 *".
  - `sacmex_weekly`: cron "0 15 * * 1" (lunes 9:00 CDMX).
  - `inmuebles24_weekly`, `mudafy_weekly`, `google_trends_weekly`: cron "0 3 * * 2".
  - `airdna_monthly`: cron "0 5 1 * *".
  - Admin alerts trimestrales (Cushman/CBRE/SHF/FOVISSSTE): reminder email 5 días antes del cierre.
- `[7.G.1.3]` Cada job llama `runIngest(job)` del orchestrator (Bloque 7.B).
- `[7.G.1.4]` Dashboard Trigger.dev muestra historial por run.

**Criterio de done del módulo:**
- [ ] 11+ crons programados.
- [ ] Ejecución manual "run now" funciona desde dashboard.

### BLOQUE 7.H — Admin upload UI

#### MÓDULO 7.H.1 — Página `/admin/ingest/upload`

**Pasos:**
- `[7.H.1.1]` `app/[locale]/(admin)/admin/ingest/upload/page.tsx` (solo mb_admin/superadmin):
  - Select source (SHF, BBVA Research, CNBV, FOVISSSTE, Cushman, CBRE).
  - Drag & drop XLSX/CSV/PDF (max 100MB).
  - Preview (primeras 20 filas para XLSX/CSV).
  - Confirm → ejecuta parser apropiado + muestra resumen.
- `[7.H.1.2]` Storage bucket `ingest-uploads` (privado, admin only).
- `[7.H.1.3]` Log en `ingest_runs` con `meta.uploaded_by` = user_id.

**Criterio de done del módulo:**
- [ ] Upload XLSX SHF funciona, parser importa 100% filas.

### BLOQUE 7.I — PROHIBIDO Habi API — constraint explícito

#### MÓDULO 7.I.1 — Enforcement

**Pasos:**
- `[7.I.1.1]` En orchestrator `ALLOWED_SOURCES` (Bloque 7.B) NO incluir `habi`. Runtime guard lanza error.
- `[7.I.1.2]` Biome lint custom rule: grep `habi` en código alerta warning.
- `[7.I.1.3]` Documentar razón en `docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md` sección "Fuentes rechazadas": Habi API tiene rate limit 3k calls/día, datos contaminados por sesgo (solo propiedades que Habi quiere comprar/vender), costo no justificado vs valor informacional.
- `[7.I.1.4]` Test en CI `tests/security/forbidden-sources.test.ts` que intenta `runIngest({ source: 'habi', ... })` y espera exception.

**Criterio de done del módulo:**
- [ ] Intento programático de ingest Habi → error.

### BLOQUE 7.J — Confidence cascade thresholds seed

#### MÓDULO 7.J.1 — Tabla + seed

**Pasos:**
- `[7.J.1.1]` Tabla:
  ```sql
  CREATE TABLE public.confidence_thresholds (
    source TEXT NOT NULL,
    metric TEXT NOT NULL,
    min_sample_high INT NOT NULL,               -- ≥ high = confianza alta
    min_sample_medium INT NOT NULL,
    min_sample_low INT NOT NULL,
    notes TEXT,
    PRIMARY KEY (source, metric)
  );
  ```
- `[7.J.1.2]` Seed:
  ```sql
  INSERT INTO public.confidence_thresholds VALUES
    ('denue', 'business_count', 100, 30, 10, 'Comercios por zona'),
    ('fgj', 'crime_count', 50, 20, 5, 'Incidentes por zona/mes'),
    ('siged', 'school_count', 10, 5, 2, 'Escuelas por zona'),
    ('clues', 'hospital_count', 5, 2, 1, 'Hospitales por zona'),
    ('inmuebles24', 'listings_count', 30, 10, 3, 'Listados por zona/op/tipo'),
    ('google_trends', 'interest_score', 50, 20, 0, 'Score mínimo para confianza');
  ```

**Criterio de done del módulo:**
- [ ] Tabla seed con ~10 rows.

### BLOQUE 7.K — Tier system seed (4 tiers de zonas)

#### MÓDULO 7.K.1 — Tabla `zone_tiers`

**Pasos:**
- `[7.K.1.1]` Tabla (zone_id se asocia en Fase 08 cuando existan zonas):
  ```sql
  CREATE TABLE public.zone_tiers (
    zone_id UUID PRIMARY KEY,
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    tier SMALLINT NOT NULL CHECK (tier BETWEEN 1 AND 4),
    projects_count INT NOT NULL DEFAULT 0,
    sales_count INT NOT NULL DEFAULT 0,
    months_tracked INT NOT NULL DEFAULT 0,
    last_recomputed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    meta JSONB NOT NULL DEFAULT '{}'::jsonb
  );
  ```
- `[7.K.1.2]` Función `recompute_zone_tiers()` que asigna:
  - Tier 1 (fuentes públicas): 0 proyectos DMX.
  - Tier 2 (emerging): ≥ 10 proyectos.
  - Tier 3 (maduro): ≥ 50 proyectos + ≥ 6 meses tracked.
  - Tier 4 (premium data): ≥ 100 ventas cerradas.
- `[7.K.1.3]` Cron `zone_tier_recompute` nightly.

**Criterio de done del módulo:**
- [ ] Función + cron listos (ejecución real en Fase 08+).

## Criterio de done de la FASE

- [ ] 8 tablas ingest creadas (7 particionadas con pg_partman).
- [ ] Orchestrator con retry + dedup + audit en `ingest_runs`.
- [ ] 7 ingestores MACRO (Banxico, INEGI, SHF, BBVA Research, CNBV, Infonavit, FOVISSSTE) funcionales o con admin upload.
- [ ] 17 ingestores GEO (DENUE, FGJ, GTFS, Atlas, SIGED, CLUES, SACMEX, RAMA stub, SEDUVI stub, Catastro stub, PAOT, SEDEMA, CONAGUA, INAH, PROFECO, Locatel, Mapbox Traffic) — al menos 8 activos H1.
- [ ] 4 ingestores MERCADO (Inmuebles24/Mudafy, AirDNA, Google Trends, Cushman+CBRE).
- [ ] Mapeo SCIAN con 3 tiers + 12 macro categorías + fórmulas ratio_PB/Shannon/Gentrification.
- [ ] Cron schedules en Trigger.dev (11+ jobs).
- [ ] Admin upload UI `/admin/ingest/upload`.
- [ ] Habi API prohibido con test guardrail.
- [ ] Tabla `confidence_thresholds` seed.
- [ ] Tabla `zone_tiers` con función recompute.
- [ ] Tag git: `fase-07-complete`.

## Features implementadas en esta fase (≈ 20)

1. **F-07-01** 8 tablas ingest (macro_series, geo_data_points, geo_snapshots, market_prices_secondary, search_trends, market_pulse, zone_price_index, zona_snapshots) con pg_partman
2. **F-07-02** Orchestrator de ingesta con retry + dedup + audit
3. **F-07-03** Tabla `ingest_runs` tracking
4. **F-07-04** Allowlist de 30 fuentes + runtime guard (Habi bloqueado)
5. **F-07-05** Ingestor Banxico SIE (tasa_referencia, TIIE28, USD/MXN, tasa_hipotecaria)
6. **F-07-06** Ingestor INEGI BIE (INPC, INPP, PIB, materiales, vivienda)
7. **F-07-07** Ingestor SHF IPV con admin upload
8. **F-07-08** Ingestor BBVA Research PDF + GPT-4o-mini extract
9. **F-07-09** Ingestor DENUE con mapeo SCIAN (550k puntos CDMX)
10. **F-07-10** Ingestor FGJ CDMX (datos abiertos)
11. **F-07-11** Ingestor GTFS 5 sistemas (Metro, Metrobús, Tren, Cablebús, EcoBici)
12. **F-07-12** Ingestores SIGED + CLUES + SACMEX
13. **F-07-13** Ingestor Atlas Nacional de Riesgos (shapefiles)
14. **F-07-14** Ingestor Inmuebles24 + Mudafy scraping Playwright
15. **F-07-15** Ingestor Google Trends semanal por zona
16. **F-07-16** Ingestor AirDNA (stub + activación H2)
17. **F-07-17** Admin upload UI Cushman/CBRE/FOVISSSTE PDF + XLSX
18. **F-07-18** Mapeo SCIAN propietario 3 tiers + 12 macro categorías + fórmulas
19. **F-07-19** 11+ crons Trigger.dev v3
20. **F-07-20** Confidence thresholds seed + zone_tiers + recompute

## Próxima fase

[FASE 08 — IE Scores Nivel 0](./FASE_08_IE_SCORES_N0.md)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent C) | **Fecha:** 2026-04-17
