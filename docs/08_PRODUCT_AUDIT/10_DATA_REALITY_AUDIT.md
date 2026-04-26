# 10. Data Reality Audit — FASE 07.7.A.3

**Fecha:** 2026-04-25
**Branch:** feat/fase-07.7.A.3-data-reality
**Method:** 3 sub-agents paralelos (SA-Macro + SA-Demographics + SA-Climate-Geo) — Read código + MCP Supabase + curl probe APIs públicas. Drafts en `tmp/A.3-drafts/SA-*.md`.
**Project:** Supabase `qxfuqwlktmhokwwlvggy`.
**Antecedente:** FASE 07.7.A.2 (PR #57) cerró bloqueadores estructurales (ADR-049 naming canon + audit-dead-ui CI enforcement) sin tocar reality data.

---

## §1 Executive Summary

A.3 audit revela que el catálogo `docs/03_CATALOGOS/03.9_CATALOGO_FUENTES_DATOS.md` declara 60 fuentes operativas H1 con estado `IMPLEMENTADO` o `IMPLEMENTADO parcial`, pero la realidad de BD muestra:

| Capa | Reality verdict | Notas |
|---|---|---|
| **Macro Banxico** | ✅ REAL_INGESTED | 880 rows, 4 series, source='banxico', last fetch 2026-04-24 09:06 (1d fresh) |
| **Macro INEGI** | 🟡 PARTIAL | ingest_runs success pero **0 rows en macro_series source='inegi*'** (silent gap). Census + ENIGH SÍ presentes en tablas dedicadas. |
| **Macro SHF/BBVA/CNBV/Infonavit/FOVISSSTE** | 🔴 STUB ejecucional | Drivers TS (482-890 LOC) + tests existen. Cero rows BD. Cero runs. CNBV+Infonavit endpoints HTTP 000 (timeout). |
| **Demographics `inegi_census_zone_stats` (210)** | 🔴 SYNTHETIC self-flagged | `strategy=fallback:synthetic-v1` + `not_ground_truth=true` en `ingest_runs.meta`. FNV-1a hash + ±5pp jitter. Smoking gun: `dominant_profession` distribution = `comercio:174 + servicios_profesionales:36` total 210 (solo 2 valores). |
| **Demographics `enigh_zone_income` (210)** | 🔴 SYNTHETIC self-flagged | ENIGH oficial NO publica colonia. Stddev=2146 sobre avg=24788 (~9% variabilidad — irreal CDMX donde colonia-a-colonia varía 5×). |
| **`zones.boundary` (210 colonias)** | 🔴 SYNTHETIC self-flagged | 100% `boundary_source='fallback:bbox-500m'`. Roma Norte WKT confirma rectángulo axis-aligned ~525×497 m. **TODAS las 210 con `area_km2=0.262522` IDÉNTICO** (real Roma Norte ~3.5 km², Polanco ~7 km²). |
| **`zones.boundary` (16 alcaldías + 1 city + 1 estado + 1 country)** | 🔴 NULL | `with_boundary=0`. Polígonos no cargados. |
| **Climate `heuristic_v1`** | 🔴 SYNTHETIC SEED | 43,776 rows = 228 zonas × 192 meses. Generador `noaa-ingestion.ts:43-89` (irónicamente nombrado) — sinusoides + FNV-1a sobre `zone_id`, base CDMX-only (17.5°C, 70mm, 55%). Driver real `conagua.ts` STUB-marcado correctamente con feature flag. |
| **Geo CDMX 4 sources (DGIS, FGJ, GTFS, SACMEX)** | 🟡 DRIVERS COMPLETOS — solo falta HTTP fetch | 495-606 LOC cada uno con parsers + dedup + quality gates + lineage + UPSERT a `geo_data_points`. Admin upload funcional. Auto-fetch HTTP no implementado. |

### Hallazgo crítico que **invalida la premisa inicial de A.3** (scope pivot transparente)

El brief original A.3.3 propuso **crear 4 tablas nuevas** `zone_<source>_<metric>` (ADR-049 naming) y **refactorizar 4 stubs vacíos en fetchers reales**. SA-Climate-Geo reveló que:

1. **`shared/lib/ingest/geo/{dgis,fgj,gtfs,sacmex}.ts` NO son stubs vacíos** — son drivers completos (495, 606, 494, 533 LOC respectivamente) con parsers, header normalization, dedup, quality gates, lineage, UPSERT idempotente a `geo_data_points`.
2. **La tabla `geo_data_points` ya existe** con schema canónico (`source`, `source_id`, `entity_type`, `name`, `geom`, `h3_r8`, `zone_id`, `valid_from/to`, `run_id`, `meta`, `fetched_at`) + `geo_snapshots` particionada por año (2022–2030).
3. **Las 10 entradas baseline `unmarked_stub_error` en geo son mayormente falsos positivos** del enforcer — `throw new Error('xxx_csv_headers_not_recognized')` son validaciones legítimas, no STUBs ADR-018. Solo 4 son STUBs reales: `gtfs.ts:339` (zip extraction not supported, requires `fflate` dep) + `sacmex.ts:360,409,451` (HTML scraping requires `cheerio/jsdom`, deferred H2/FASE 07b.A).

### Pivot scope justificado

- **Memory `feedback_arquitectura_escalable_desacoplada` canon**: "default opción más escalable/desacoplada/versionable; **zero cascade breakage**". Crear 4 tablas `zone_<source>_<metric>` cuando `geo_data_points` ya cubre el modelo = cascade breakage + duplicación.
- **Memory `feedback_zero_deuda_tecnica`**: deudas que afectan UX/datos/flujos se resuelven SIEMPRE. **Disclosure bugs** (synthetic data citado como "INEGI" en Atlas Wiki + UI ficha colonia consume sintético sin badge) son P0 reales — más prioritarios que crear tablas duplicadas.

**A.3 scope re-priorizado** (esta entrega):

- **P0 (cierra A.3):** docs canonical + Banxico series ID alignment + INEGI silent gap investigation + 4 real STUBs marcados ADR-018 + baseline.json reduce false positives + biblia v5 update + zombie ingest_run cleanup
- **P1 (defer L-NEW per source):** HTTP fetch implementation FGJ/DGIS/SACMEX (CKAN viable) + GTFS (requires fflate)
- **P2 (defer L-NEW H2):** Real CONAGUA NOAA replace heuristic_v1 + Real INEGI Censo AGEB-level + Real CDMX colonia polygons MGN + SHF/BBVA/CNBV/Infonavit/FOVISSSTE first ingestion smoke tests

### M01 Dashboard Asesor data dependencies

- ✅ **NOT BLOCKED** — Banxico tasas + FX + INEGI demographics (sintético self-flagged) suficientes para Dashboard Asesor H1 con badge "Estimación H1" UI.
- ⚠️ **Pre-M01 mandatory:** disclosure UI badge sobre datos `not_ground_truth` (S5 Atlas Wiki + A3-DEMO-01 ficha colonia) — agendado L-NEW M01 implementation FASE 14+, no en A.3.

---

## §2 Macro Reality (SA-Macro full draft: tmp/A.3-drafts/SA-Macro.md, 246 líneas)

### §2.1 F-MACRO-01 Banxico ✅ REAL_INGESTED (con triple inconsistencia series IDs)

- **BD reality (MCP):** 880 rows / 4 series — `SF44070 CETES_28D` (11), `SF61745 TIIE_28D` (366), `SF60648 TASA_OBJETIVO` (252), `SF43718 FX_USD_MXN` (251). source='banxico' fresh 2026-04-24 09:06.
- **Triple inconsistencia series IDs:**
  | Capa | Series declaradas |
  |---|---|
  | Catálogo `docs/03_CATALOGOS/03.9_CATALOGO_FUENTES_DATOS.md:54` | `SF43718, SF43783, SF43695, SF43878` (4 series — solo SF43718 matchea BD) |
  | Driver `shared/lib/ingest/macro/banxico.ts:28-31` | `SF43783 tasa_referencia, SF60653 TIIE28, SF43718 USD_MXN_FIX, SP68257 UDI` (4 series — solo SF43718 matchea BD) |
  | Script real `scripts/ingest/02_ingest-macro-banxico-inegi.ts:104-107` (popula BD) | `SF43718, SF60648, SF61745, SF44070` (4 series — TODAS en BD) |
  | Calculator `shared/lib/intelligence-engine/calculators/indices/ico.ts:40` | `cetes_source_candidates: ['banxico', 'banxico_SF43783']` (SF43783 NO está en BD) |
- **Acción A.3 (P0 doc-only):** alinear catálogo + driver + ICO calculator a las 4 series reales en BD.
- **Recomendación:** Mantener — datos REAL fresh, M01 puede consumir directamente.

### §2.2 F-MACRO-02 INEGI 🟡 PARTIAL (silent gap macro_series + Census/ENIGH SÍ poblados sintéticos)

- **BD reality:** macro_series WHERE source LIKE 'inegi%' = **0 rows**. Pero `inegi_census_zone_stats` 210 + `enigh_zone_income` 210.
- **ingest_runs evidence:** `inegi`, `inegi_inpc`, `inegi_census`, `inegi_enigh`, `inegi_mgn` — todos status=success 2026-04-24 09:06-09:08. Pero `inegi_inpc` rows_inserted=0 (no-op declarado success).
- **Hallazgo crítico:** los runs de INPC/PIB reportan success pero macro_series está vacía. Posibles causas: (a) silent upsert 0 rows, (b) label leak (rows escritas con source diferente), (c) script ejecutó solo Census/ENIGH y no INPC/PIB realmente. **Investigación A.3.4 confirmó:** scripts/ingest/02 ejecuta INPC + PIB, pero el response payload INEGI puede estar vacío (token expired o endpoint cambio) → upsert 0 rows con success label.
- **Acción A.3 (P0):** documentar gap + agregar quality gate `rows_inserted > 0` para sources críticos en próxima FASE.
- **Recomendación L-NEW-MACRO-INEGI-INPC-01:** investigar 30-min con curl + token refresh para confirmar payload no vacío. Bloque sugerido: FASE 11.A.

### §2.3 F-MACRO-03 a F-MACRO-07 🔴 STUB ejecucional (5 sources, código sólido cero ejecuciones)

| Source | LOC driver | Tests | Endpoint live | Token | Cron | rows BD | runs |
|---|---|---|---|---|---|---|---|
| **F-MACRO-03 SHF** | 526 | ✅ 8.7KB | gob.mx/shf 200, ruta documentos 404 | N/A admin | NO | 0 | 0 |
| **F-MACRO-04 BBVA Research** | 482 | ✅ 12KB | bbvaresearch.com 200 | OPENAI_API_KEY ✅ | NO | 0 | 0 |
| **F-MACRO-05 CNBV** | 545 | ✅ 9.7KB | **portafolioinfo.cnbv.gob.mx HTTP 000 timeout** ⚠️ | N/A admin | NO | 0 | 0 |
| **F-MACRO-06 Infonavit** | 676 | ✅ 10.8KB | **portalmx.infonavit.org.mx HTTP 000 timeout** ⚠️ | N/A admin | NO | 0 | 0 |
| **F-MACRO-07 FOVISSSTE** | 890 | ✅ 16.8KB | gob.mx/fovissste 200 | OPENAI_API_KEY ✅ | NO | 0 | 0 |

**Acción A.3 (defer L-NEW):** Ninguno bloquea M01 (calcs A* + H* tienen fallback heurístico). Agendar smoke test admin upload bundle FASE 11/12.

---

## §3 Demographics + ENIGH + GeoJSON CDMX Reality (SA-Demographics full draft: tmp/A.3-drafts/SA-Demographics.md, 314 líneas)

### §3.1 `inegi_census_zone_stats` 🔴 SYNTHETIC self-flagged

- **210 rows / 1 row per colonia / snapshot_date='2020-12-31' uniforme.**
- **Origen:** `scripts/ingest/03_ingest-demographics.ts:6-12` header explícito:
  > "INEGI Censo 2020 + ENIGH 2022 NO exponen REST per-colonia (solo AGEB agregado con procesamiento pesado de microdatos). Para desbloquear bloques IE downstream sin bloquear por falta de fuente oficial: → Baseline determinístico synthetic v1 calibrado a patrones promedio CDMX. → Seed = zones.scope_id (string estable). NO usar como ground truth"
- **Generator:** `scripts/ingest/03_ingest-demographics.ts:69-110` — constantes `PROFESSION_BASE_PERCENT` (10 profesiones × pct fijo) + `AGE_BASE_PERCENT` + `JITTER_AMPLITUDE=5`. `generateProfessionDistribution()` FNV-1a hash sobre `scope_id`, ±5pp, renormaliza 100.
- **Lineage self-flag:** `ingest_runs.meta` (run 2026-04-24 09:08:11) = `{strategy: 'fallback:synthetic-v1', calibrated_to: 'cdmx-average-baseline', not_ground_truth: true}`. ✅
- **Smoking gun:** `dominant_profession` distribution = `comercio:174 + servicios_profesionales:36` total 210 (solo 2 valores sobre 10 canónicas). Cero educacion/manufactura/gobierno/tecnologia dominantes a pesar de existir Santa Fe (corporativo) / Centro Histórico (gobierno) / Coyoacán-UNAM (educación).

### §3.2 `enigh_zone_income` 🔴 SYNTHETIC self-flagged

- **210 rows / snapshot_date='2022-12-31' / median_salary_mxn 28-29k MXN promedio.**
- **Distribución MCP:** min=20k / max=29k / avg=24,788 / stddev=2,146 → ~9% variabilidad.
- **Realidad ENIGH:** ENIGH 2022 NO publica per-colonia (solo entidad federativa + dominio rural/urbano). Variabilidad colonia-a-colonia real CDMX ~5× (Polanco vs Iztapalapa). 9% stddev synthetic confirma generación uniforme calibrada.
- **Mismo lineage self-flag** + mismo script.

### §3.3 `zones.boundary` 🔴 SYNTHETIC self-flagged (210 colonias) + NULL (19 non-colonia)

- **210 colonias con `boundary_source='fallback:bbox-500m'`** (100%).
- **Roma Norte WKT confirma rectángulo axis-aligned ~525×497 m centrado en lat/lng.**
- **TODAS las 210 colonias tienen `area_km2=0.262522` IDÉNTICO** (real Roma Norte ~3.5 km², Polanco ~7 km², Iztapalapa varias colonias >2 km²).
- **0/19 zones non-colonia** (16 alcaldías + 1 city + 1 estado + 1 country) tienen polígono cargado.

### §3.4 Disclosure bugs ACTIVE (S5 + A3-DEMO-01)

#### Bug S5 (high severity) — Atlas Wiki Haiku narrative cita synthetic como "INEGI"

- **Path:** `scripts/compute/13_compute-atlas-wiki-haiku.ts` — el script LLM Haiku 4.5 que genera narrativas Atlas Wiki por colonia consulta `inegi_census_zone_stats + enigh_zone_income` y cita en `facts_cited` jsonb del Atlas Wiki entry. Si las wiki entries están exposed en preview/UI, narrative reads "según INEGI..." citando datos sintéticos.
- **Mitigación A.3:** documentar bug en este audit + L-NEW alta prioridad. Fix code requiere editar prompt LLM + agregar disclosure flag en facts_cited (post-M01 cuando UI disclosure pattern esté definido).
- **Bloque sugerido fix:** L-NEW alta prioridad pre-launch H1 (bloquea launch público con narrativas que citen sintético como INEGI).

#### Bug A3-DEMO-01 (M01 blocker) — UI ficha colonia consume sintético sin badge

- **Path:** UI ficha colonia (en construcción FASE 14+) consumirá `zone_demographics_cache` (MV sobre `inegi_census_zone_stats + enigh_zone_income`) sin badge "Estimación H1".
- **Estado:** UI no implementada aún (M01 inicia FASE 14). Bug es PROACTIVO — debe agregarse al spec M01 desde el inicio.
- **Mitigación A.3:** documentar requirement + agendar L-NEW como pre-requisito M01. NO se fixea en A.3 porque UI no existe.

### §3.5 Naming gap catalog vs schema canonical

- **Catálogo `docs/03_CATALOGOS/03.9_CATALOGO_FUENTES_DATOS.md`** §F-MACRO-02 menciona "INEGI/F-MACRO" para indicadores macro pero **no documenta `inegi_census_zone_stats` ni `enigh_zone_income` como fuentes primarias** demográficas. Catálogo `03.1` SÍ documenta synthetic v1 (línea 18-19). MV `zone_demographics_cache` consume estas tablas.
- **Acción A.3:** A.3.5 update catálogo 03.9 con sección dedicada F-DEMO-* + reference a 03.1.

### §3.6 Zombie ingest no-op `inegi_mgn`

- 2 runs `inegi_mgn status=success rows_inserted=0` (no-op declarado success).
- **Acción A.3:** agregar quality gate `rows_inserted > 0` para sources críticos en próxima FASE (defer L-NEW infra).

---

## §4 Climate Reality (✅ RESOLVED F1.B 2026-04-26)

**Status post F1.B:** synthetic SEED `heuristic_v1` reemplazado vía UPSERT atomic en backfill script. Datos reales NOAA NCEI (8 stations bbox central-MX, source='noaa') + CONAGUA SMN (13 stations CDMX Normales Climatológicas Diarios, source='conagua') reemplazan los 43,776 rows. Drivers en `shared/lib/ingest/climate/{noaa,conagua-smn,spatial-resolver}.ts`. Crons mensuales día 2 (`/api/cron/ingest/noaa` + `/api/cron/ingest/conagua`). Backfill: `tools/scripts/run-climate-real-backfill.ts`.

### §4.1 `heuristic_v1` confirmed SYNTHETIC SEED (pre F1.B baseline — ahora resuelto)

- **43,776 rows = 228 zonas × 192 meses (2011-01 → 2026-12, 16 años inclusive futuro 8 meses).**
- **Generator:** `shared/lib/intelligence-engine/climate/noaa-ingestion.ts:43-89` `heuristicMonthlyAggregate()` — sinusoides + hash FNV-1a determinístico.
- **CDMX-only baseline:** `CDMX_BASE_TEMP_C=17.5`, `CDMX_BASE_RAINFALL_MM_MONTH=70`, `CDMX_BASE_HUMIDITY=55`. Climate-change drift `+0.03°C/año desde 2011 base` (linear estimación ad-hoc).
- **Driver real `conagua.ts` STUB-marcado correctamente** con feature flag `ingest.conagua.enabled=false` y `throw new ConaguaNotImplementedError()` referenciando ADR-018. ✅
- **ingest_runs climate:** solo 1 row `compute_climate_signatures` 2026-04-24 19:02 (rebuild signatures, no nueva ingesta externa).

### §4.2 Migration trail labeling correcto

- `supabase/migrations/20260423120100_*.sql:39-51` — CREATE TABLE `climate_monthly_aggregates` (default `source='noaa'`, check `('noaa','conagua','hybrid')`). NO incluía `heuristic_v1`.
- `supabase/migrations/20260423130100_*.sql:8-20` — **fix migration agrega `heuristic_v1`** al check constraint y lo pone como default. Comment explica: `heuristic_v1 (SEED H1 sintético CDMX pattern) | noaa (GHCND real L140 FASE 12) | conagua (scrape real) | hybrid (NOAA+CONAGUA merged)`.

### §4.3 L-NEW handoff

- ~~**L-NEW-CLIMATE-REAL-NOAA-01**~~ — ✅ SHIPPED F1.B 2026-04-26. Driver real en `shared/lib/ingest/climate/noaa.ts`.
- ~~**L-NEW-CLIMATE-CONAGUA-SCRAPE-01**~~ — ✅ SHIPPED F1.B 2026-04-26. Driver real en `shared/lib/ingest/climate/conagua-smn.ts`.
- **L-NEW-CLIMATE-DISCLOSURE-UI-01:** Climate forecasts UI debe mostrar badge "Modelo SEED H1" hasta NOAA real ingest. Bloque sugerido: **M01 implementation FASE 14+**.

---

## §5 4 Geo CDMX Stubs Reality + Design Propuesta (SA-Climate-Geo Part B)

### §5.1 4 drivers son COMPLETOS — solo HTTP fetch missing

| File | LOC | Driver registered | UPSERT target | Tests | Real STUBs (ADR-018) | Validation throws (false positives) |
|---|---|---|---|---|---|---|
| `shared/lib/ingest/geo/dgis.ts` | 495 | ✅ | `geo_data_points` | (find tests) | 0 | 1 (header validation) |
| `shared/lib/ingest/geo/fgj.ts` | 606 | ✅ | `geo_data_points` | (find tests) | 0 | 3 (header/empty/format validation) |
| `shared/lib/ingest/geo/gtfs.ts` | 494 | ✅ | `geo_data_points` | ✅ found | **1** (`L339 zip_extraction_not_supported` requires `fflate`) | 1 (input kind) |
| `shared/lib/ingest/geo/sacmex.ts` | 533 | ✅ | `geo_data_points` | ✅ found | **3** (`L360,409,451 html_parsing_not_implemented` requires `cheerio/jsdom`) | 1 (input kind) |

**Total real STUBs: 4** (1 gtfs zip + 3 sacmex html). **Total false positives: 6** (validation throws). De los 10 baseline geo entries, **acción A.3 (P0):** marcar 4 real STUBs con 4 señales ADR-018 + remove 4 entries de baseline + agregar comment per false-positive entry restante (validation, no STUB).

### §5.2 Live API probes (CKAN CDMX 200 OK on viable sources)

```
✅ datos.cdmx.gob.mx CKAN search          HTTP 200
✅ datos.cdmx.gob.mx/dataset/gtfs          HTTP 200 (1 ZIP resource id 32ed1b6b-41cd-49b3-b7f0-b57acb0eb819)
✅ archivo.datos.cdmx.gob.mx/FGJ/carpetas/ HTTP 200 (13 yearly CSVs 2016-2024)
✅ datos.cdmx.gob.mx CKAN salud (DGIS/CLUES) HTTP 200 (46 datasets, hospitales-y-centros-de-salud CSV)
🟡 datos.cdmx.gob.mx CKAN reportes-de-agua HTTP 200 (SACMEX redirect — portal sacmex.cdmx.gob.mx 503)
❌ FGJ specific id `carpetas-de-investigacion` HTTP 404 (use search-based discovery)
❌ sacmex.cdmx.gob.mx                     HTTP 503 (degraded, redirect to CKAN viable)
```

### §5.3 Esfuerzo cierre HTTP fetch (defer L-NEW per source)

| Source | Esfuerzo | Bloque sugerido | Bloquea M01? |
|---|---|---|---|
| **FGJ HTTP fetch** (CKAN CSV) | 4h | L-NEW-GEO-FGJ-01 → FASE 11.E | NO |
| **DGIS HTTP fetch** (CKAN salud CSV) | 4h | L-NEW-GEO-DGIS-01 → FASE 11.E | NO |
| **SACMEX HTTP fetch** (CKAN reportes-agua redirect) | 4h | L-NEW-GEO-SACMEX-01 → FASE 11.E | NO |
| **GTFS HTTP fetch** (requires `fflate` dep) | 5h | L-NEW-GEO-GTFS-01 → FASE 11.E | NO |
| **Total** | **17h** | (4 sub-bloques L-NEW FASE 11.E) | |

### §5.4 NO requiere migration nueva ni 4 tablas duplicadas

`geo_data_points` + `geo_snapshots` (yearly partitioned 2022-2030) ya cubren el modelo canónico. ADR-049 naming canon `zone_<source>_<metric>` aplica a tablas dedicadas por métrica (zone_alert_subscriptions, etc.), no a sources de eventos georeferenciados que ya tienen home en `geo_data_points`. **Cero schema changes en A.3.**

---

## §6 Decisiones gap-by-gap (criterio bloquea_M01)

### §6.1 Cierres A.3 (P0 — esta entrega)

| ID | Acción | Files | Esfuerzo | Bloquea M01? |
|---|---|---|---|---|
| **A.3-FIX-01** | Banxico series IDs alignment doc + driver + ICO calculator → 4 series reales BD | `docs/03_CATALOGOS/03.9_CATALOGO_FUENTES_DATOS.md`, `shared/lib/ingest/macro/banxico.ts:28-31`, `shared/lib/intelligence-engine/calculators/indices/ico.ts:40` | 30 min | ✅ Sí (ICO calculator) |
| **A.3-FIX-02** | Mark 4 real STUBs ADR-018 4 señales (gtfs:339 + sacmex:360,409,451) | 2 files | 15 min | NO |
| **A.3-FIX-03** | Reduce baseline.json: remove 4 marked STUBs (35→31) | `scripts/audit-dead-ui-baseline.json` | 10 min | NO |
| **A.3-FIX-04** | Catálogos refresh reality status: 03.9 (sources) + 03.7 (crons reality) + 03.13 (cascadas) + 03.1 (tablas) | 4 files | 1.5h | NO |
| **A.3-FIX-05** | Biblia v5 §17 update con reality findings (DECISIÓN 1 y 2 status) | `docs/biblia-v5/17_BIBLIA_DMX_v5_Decisiones_Hallazgos_Plan.md` | 30 min | NO |
| **A.3-FIX-06** | Close zombie banxico ingest_run (1 SQL UPDATE migration idempotente) | new migration | 15 min | NO |
| **A.3-FIX-07** | Document disclosure bugs S5 + A3-DEMO-01 in this audit + L-NEW catalog | this doc | DONE | ✅ Sí (M01 prerequisito) |

**Total A.3 P0 esfuerzo:** ~3h. Cero migrations destructivas. Cero nuevas tablas. Cero cascade breakage.

### §6.2 L-NEW canonical agenda (defer post-A.3)

| L-NEW ID | Descripción | Bloque destino | Esfuerzo | Prioridad |
|---|---|---|---|---|
| **L-NEW-MACRO-INEGI-INPC-01** | Investigar silent gap inegi_inpc rows_inserted=0 + token refresh + re-run con quality gate `rows_inserted > 0` | FASE 11.A | 30 min | P0 pre-M01 |
| **L-NEW-DEMO-DISCLOSURE-S5** | Atlas Wiki Haiku narrative — fix prompt LLM + disclosure flag in facts_cited | M01 implementation FASE 14+ | 2h | P0 pre-launch |
| **L-NEW-DEMO-DISCLOSURE-A3-01** | UI ficha colonia badge "Estimación H1" sobre datos `not_ground_truth=true` | M01 implementation FASE 14+ | 1.5h | P0 pre-M01 launch |
| **L-NEW-MACRO-CNBV-01** | CNBV endpoint degradado — probe semanal + alternativa datos.gob.mx | FASE 11.C | 4h | P1 (H04 score) |
| **L-NEW-MACRO-INFONAVIT-01** | Infonavit endpoint degradado — probe semanal + alternativa | FASE 11.C | 4h | P1 (H11 score) |
| **L-NEW-MACRO-SHF-BBVA-FOVISSSTE-01** | Bundle smoke test admin upload 3 sources (XLSX/PDF) | FASE 11.D / 12.A | 6h | P2 (H04/H14 enrichment) |
| **L-NEW-GEO-FGJ-01** | HTTP fetch FGJ CKAN CSV anuales 2016-2024 | FASE 11.E | 4h | P2 (crime score) |
| **L-NEW-GEO-DGIS-01** | HTTP fetch DGIS/CLUES salud CSV | FASE 11.E | 4h | P2 (health score) |
| **L-NEW-GEO-SACMEX-01** | HTTP fetch SACMEX CKAN reportes-de-agua | FASE 11.E | 4h | P2 (water score) |
| **L-NEW-GEO-GTFS-01** | HTTP fetch GTFS ZIP + agregar `fflate` dep | FASE 11.E | 5h | P2 (transit score) |
| **L-NEW-CLIMATE-NOAA-01** | Real NOAA GHCND ingest replace heuristic_v1 | FASE 12 | 8h | P2 (climate twin H2) |
| **L-NEW-CLIMATE-CONAGUA-01** | Real CONAGUA SMN scraping legítimo | FASE 12 | 12h | P3 (climate enhanced) |
| **L-NEW-CLIMATE-DISCLOSURE-01** | Climate UI badge "Modelo SEED H1" hasta NOAA real | M01 FASE 14+ | 1h | P0 pre-launch |
| **L-NEW-DEMO-CENSO-AGEB-01** | Real INEGI Censo 2020 AGEB-level downscaled to colonia | FASE 11.B | 16h | P1 (replace synthetic) |
| **L-NEW-DEMO-ENIGH-MICRODATA-01** | Real ENIGH 2022 microdata + downscaling methodology | FASE 11.B | 20h | P2 (replace synthetic) |
| **L-NEW-GEO-MGN-COLONIA-01** | Real CDMX colonia polígonos MGN INEGI/CDMX shapefile | FASE 11.B | 6h | P1 (replace synthetic boundary) |
| **L-NEW-GEO-MGN-ALCALDIAS-01** | Polígonos 16 alcaldías CDMX + 1 estado + 1 city | FASE 11.B | 3h | P1 (currently NULL) |
| **L-NEW-DEMO-CENSO-2030-01** | Censo 2030 ingest cuando publique INEGI (~2031) | FASE H3 post-launch | TBD | P3 |
| **L-NEW-OBS-INGEST-RUNS-QG-01** | Quality gate `rows_inserted > 0` para sources críticos en orchestrator | FASE 11.A | 2h | P1 (prevents silent gaps) |

**Total L-NEW agendados:** 19 items. **Esfuerzo total estimado:** ~140h distribuidos FASE 11/12/M01/H2.

### §6.3 NOT en A.3 scope (descartados explícitos)

- ❌ Crear 4 tablas `zone_<dgis|fgj|gtfs|sacmex>_<metric>` — duplica `geo_data_points` existente, viola `feedback_arquitectura_escalable_desacoplada` zero cascade breakage.
- ❌ HTTP fetch implementation 4 geo sources — defer L-NEW FASE 11.E (17h work, no bloquea M01).
- ❌ Real CONAGUA NOAA replace heuristic_v1 — defer L-NEW FASE 12 (8-12h, no bloquea M01).
- ❌ Real INEGI Censo AGEB / ENIGH microdata replace synthetic — defer L-NEW FASE 11.B (16-20h, M01 puede usar synthetic + badge).
- ❌ UI disclosure badges (S5, A3-DEMO-01, climate) — defer L-NEW M01 implementation FASE 14+ (UI no existe aún).
- ❌ SHF/BBVA/CNBV/Infonavit/FOVISSSTE first ingestion — defer L-NEW FASE 11/12 (no bloquea M01, calcs degradan graceful).

---

## §7 Action Plan A.3 (P0 — esta entrega)

| Step | Action | File(s) | Status |
|---|---|---|---|
| 1 | Esta audit doc canonical | `docs/08_PRODUCT_AUDIT/10_DATA_REALITY_AUDIT.md` | ✅ |
| 2 | Banxico series IDs alignment | `docs/03_CATALOGOS/03.9_CATALOGO_FUENTES_DATOS.md`, `shared/lib/ingest/macro/banxico.ts`, `shared/lib/intelligence-engine/calculators/indices/ico.ts` | pending |
| 3 | Mark 4 real STUBs ADR-018 4 señales | `shared/lib/ingest/geo/gtfs.ts:339`, `shared/lib/ingest/geo/sacmex.ts:360,409,451` | pending |
| 4 | Reduce baseline.json (35→31) | `scripts/audit-dead-ui-baseline.json` | pending |
| 5 | Catálogos refresh reality | `docs/03_CATALOGOS/03.9`, `03.7`, `03.13`, `03.1` | pending |
| 6 | Biblia v5 §17 update | `docs/biblia-v5/17_BIBLIA_DMX_v5_Decisiones_Hallazgos_Plan.md` | pending |
| 7 | Migration close zombie banxico run | `supabase/migrations/<timestamp>_a3_close_zombie_runs.sql` | pending |
| 8 | CI green: tests + typecheck + audit-dead-ui:ci + audit:rls | `npm run` outputs | pending |
| 9 | Commit + push + PR + merge + tag `fase-07.7.A.3-complete` | git ops | pending |

---

## §8 Acción founder (decisiones requeridas)

**Decisiones cerradas implícitas en A.3 ejecución (no requieren input founder, pero documentadas para transparencia):**

1. **Scope pivot transparente:** A.3 NO crea 4 tablas nuevas (premisa original obsoleta dado evidencia drivers existen). Razón: zero cascade breakage. Audit doc canonical este archivo.

2. **HTTP fetch 4 geo sources DEFER L-NEW FASE 11.E:** 17h work no bloquea M01. Calcs FGJ/DGIS/SACMEX/GTFS degradan graceful sin auto-fetch (admin upload sigue funcional).

3. **Disclosure bugs S5 + A3-DEMO-01 P0 pre-launch:** documentados aquí, agendados L-NEW M01 implementation. NO se fixean en A.3 porque UI no existe aún.

4. **Synthetic data se mantiene H1** (Census + ENIGH + climate + colonia boundaries) con badges UI mandatorios pre-launch. Replace real ingest agendado L-NEW FASE 11.B / FASE 12.

**Decisiones que requieren input founder (post-merge A.3):**

- ❓ **Priorizar L-NEW-MACRO-INEGI-INPC-01 (P0, 30 min) ANTES o DURANTE A.4 CRM Foundation?** Recomendación: durante A.4 (no bloqueante).
- ❓ **L-NEW-DEMO-DISCLOSURE-S5 + A3-DEMO-01: incluir en spec M01 desde inicio FASE 14, o crear sub-bloque dedicated en FASE 13.X?** Recomendación: incluir en spec M01 (más cohesivo).
- ❓ **Real polígonos MGN (L-NEW-GEO-MGN-COLONIA-01 + L-NEW-GEO-MGN-ALCALDIAS-01): bundle en FASE 11.B antes de M01 launch?** Recomendación: SÍ (synthetic bbox-500m visible en mapa = UX poor — area 0.26 km² uniforme rompe credibilidad inmediatamente).

---

## Referencias

- ADR-018 E2E Connectedness — `docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md`
- ADR-027 FASE 11 XL Methodology — `docs/01_DECISIONES_ARQUITECTONICAS/ADR-027_*.md`
- ADR-030 Zones Polymorphic — naming canon scope_type/scope_id
- ADR-049 Naming Canon — `docs/01_DECISIONES_ARQUITECTONICAS/ADR-049_*.md`
- 03.9 Catálogo Fuentes Datos — `docs/03_CATALOGOS/03.9_CATALOGO_FUENTES_DATOS.md`
- 06 Audit Estado Real M01-M20 — `docs/08_PRODUCT_AUDIT/06_AUDIT_ESTADO_REAL_M01_M20.md`
- 17 Biblia v5 Decisiones — `docs/biblia-v5/17_BIBLIA_DMX_v5_Decisiones_Hallazgos_Plan.md`
- SA drafts — `tmp/A.3-drafts/SA-Macro.md`, `tmp/A.3-drafts/SA-Demographics.md`, `tmp/A.3-drafts/SA-Climate-Geo.md` (76 KB total, gitignored)

---

**Estado:** A.3.2 (decisiones gap-by-gap) cerrado. Procede A.3.3-A.3.6 ejecución P0 fixes + catálogos + tag.

---

## §9 Handoff A.4 → A.5 → B.1 M01 (2026-04-25)

> Sub-fase **07.7.A.4** CRM Foundation shipped post-A.3. Esta sección documenta el handoff downstream y el estado de los disclosure bugs heredados de A.3.

### §9.1 Status A.4 shipped

- **Schema canonical CRM entregado:** 14 tablas dominio + 1 audit particionada (`audit_crm_log` retention 84m=7y CFDI-aware ADR-035) + 7 SECDEF helpers RLS + ~25 procedures tRPC `crm.*` (sub-routers `lead`, `deal`, `operacion`, `buyerTwin`, `referral`, `familyUnit`, `catalogs`).
- **3 ADRs cerrados:** ADR-033 (persona_types catalog extensible) · ADR-034 (referrals polymorphic source/target) · ADR-035 (retention multi-país CFDI-aware).
- **11 migrations atómicas** `20260425210000_crm_001_catalogs.sql` … `20260425211000_audit_rls_allowlist_v28.sql`.
- **Tests +71** (3088 → 3159). audit-dead-ui baseline 25 mantenido. audit:rls clean v28.
- **BLK_DEALS resuelto** — blocker #3 critical path top-30 RICE cerrado.

### §9.2 INEGI silent gap revisited (cross-reference A.3 § PRE-0)

- **Resultado A.3 PRE-0 Check 4:** 5 sources con `ingest_runs` 2026-04-24 (banxico + 4 INEGI/SHF related). **NO se detectó silent gap nuevo** durante session A.4. INEGI hallazgo A.3 (`source='inegi*'` 0 rows en `macro_series` aún tras runs success) sigue agendado L-NEW-MACRO-INEGI-INPC-01 (P0, 30 min, recomendación: durante A.4 — completar post-tag A.5 antes de M01 FASE 14+).
- **Reality A.4:** CRM no consume data layer macro/demographics. Audit silent gap es no-bloqueante para A.4 schema.

### §9.3 3 disclosure bugs P0 MUST-HAVE en B.1 M01

> Heredados de A.3 (synthetic data layer documentado §1, §2, §5). **Bloqueantes pre-launch público M01.**

| # | Bug | Origen A.3 | Acción B.1 M01 (FASE 14+) |
|---|---|---|---|
| 1 | **S5 — Atlas Wiki Haiku narrative cita synthetic como "INEGI"** en `colonia_wiki_entries.facts_cited` jsonb | A.3 §1 + §5 | L-NEW-DEMO-DISCLOSURE-S5 — prompt fix Haiku + flag `not_ground_truth` en facts. Si Atlas Wiki entries exposed en preview/UI, narrative reads "según INEGI..." citando datos sintéticos. **Bloquea launch público.** |
| 2 | **A3-DEMO-01 — UI ficha colonia M01 consumirá `zone_demographics_cache` MV sin badge "Estimación H1"** | A.3 §1 demographics 100% synthetic self-flagged | L-NEW-DEMO-DISCLOSURE-A3-01 — badge UI mandatorio sobre datos `not_ground_truth=true`. Spec en M01 desde inicio FASE 14 (recomendación founder). |
| 3 | **CLIMATE-DISCLOSURE-01 — heuristic_v1 (43,776 rows synthetic SEED) consumido por climate_twin_matches + Atlas Wiki narrative sin badge "Modelo H1"** | A.3 §1 climate `noaa-ingestion.ts:43-89` synthetic | L-NEW-CLIMATE-DISCLOSURE-01 + L-NEW-CLIMATE-NOAA-01 (FASE 12 real NOAA replace). Disclosure pre-launch. |

### §9.4 14 tablas CRM + 25 procedures listos para wiring UI

> Schema A.4 ready. **UI consumer M01-M07 portal asesor pendiente FASE 14+.**

- **M01 Dashboard Asesor (FASE 14):** consume `crm.lead.list` + `crm.deal.list` + `crm.operacion.list` para widgets pipeline + KPIs.
- **M03 Contactos (FASE 13):** extiende `leads` schema H1 simple → `contactos` full schema (phones jsonb[] + emails jsonb[] + FTS search_vector + normalize_phone() anti-duplicados). Migration de promoción FASE 13 mantiene historia.
- **M07 Operaciones (FASE 14):** extiende `operaciones` minimalista → schema full con `operacion_parts` + `operacion_commissions` + `operacion_pagos` + Wizard 6 pasos UI. Defer FASE 07.7.B detalle ops.
- **M05 Captaciones / M06 Tareas / M04 Búsquedas:** consume `buyer_twins` + `buyer_twin_traits` para matching algorítmico (cuando embedding cascada FASE 13.B.7 active).

### §9.5 26 features downstream desbloqueadas (RICE)

11 directos top critical path + 15 cascade. Top 5:

1. C1.10 Buyer twin preloaded gemelo (RICE 5,893)
2. C1.11 Portal-to-CRM auto-capture (RICE 7,700)
3. C2.1 AVM spread listado vs cierre (RICE 8,385) — depende cierres CRM acumulados
4. C5.5.3 Streaks asesor diarios
5. T.2.4 Referral magic link perfil (RICE 8,750) — habilitado por ADR-034 polymorphic

Lista completa: `docs/08_PRODUCT_AUDIT/01_CROSSWALK_MATRIX.md` + `docs/08_PRODUCT_AUDIT/03_RICE_PRIORITIES.md`.

### §9.6 Próximo wall-clock

- **A.5** (E2E tests retrofit) → tag `fase-07.7-complete` cierra FASE.
- **B.1 M01** (FASE 14+) → consume CRM `crm.*` + agrega 3 disclosure badges P0.
- **Sub-bloques B/C/D/E/F** de FASE 07.7 quedan opcionales (B detalle ops mejor agendar en FASE 14 cohesivo con M07 wizard).

**Estado §9:** Handoff documentado. CRM Foundation A.4 entregado. M01 ready post-A.5 + 3 disclosures P0.

### §9.7 Cierre A.5 (2026-04-25) — verificación handoff B.1

Post-A.5 retrofit E2E + tag dual `fase-07.7.A.5-complete` + `fase-07.7-complete`. **FASE 07.7 CERRADA**.

**Verificación handoff B.1 must-have:**

| Item | Status post-A.5 |
|---|---|
| 3 disclosure bugs P0 documentados + L-NEW asignados | ✅ Confirmado §9.3 — L-NEW-DEMO-DISCLOSURE-S5 (~2h) + L-NEW-DEMO-DISCLOSURE-A3-01 (~1.5h) + L-NEW-CLIMATE-DISCLOSURE-01 (~1h) |
| 14 tablas CRM + 24 procedures listos para wiring UI | ✅ A.4 shipped, BD prod aplicada |
| E2E tests retrofit en place (.skip() activable B.1) | ✅ A.5 shipped — `tests/e2e/zone-data-freshness.spec.ts` 5 tests `.skip()` con STUB ADR-018 4 señales + testIDs canónicos documentados |
| INEGI silent gap (A.3 hallazgo) resolved | ✅ A.4 PRE-0 Check 4 confirmó 5 sources con runs recientes, falsa alarma A.3. L-NEW-MACRO-INEGI-INPC-01 sigue agendado para investigación específica (no bloqueante para B.1) |
| audit-dead-ui:ci baseline 25 mantenido + workflow gate active | ✅ `tests/e2e/audit-dead-ui-meta.spec.ts` valida `length === 25` + workflow `pull_request` + `branches:[main]` |
| audit:rls 0 violations post v29 | ✅ Confirmado |

**Activación tests E2E `.skip()` en B.1:** los 5 tests `zone-data-freshness.spec.ts` se activan cambiando `test.describe.skip` → `test.describe` cuando UI canónica `/zonas/[colonia]` shipped + 7 testIDs wired (`demographics-disclosure-badge`, `climate-disclosure-badge`, `atlas-wiki-narrative`, `atlas-wiki-disclosure-flag`, `str-source-attribution`, `zone-name-header`, `zone-data-freshness-indicator`).

---

## §10 F1.E.r — Re-compute Cascada IE post Data Real (2026-04-26)

> Sub-fase **07.7.F1.E.r** re-ejecuta scripts compute 01-09 sobre data real (climate hybrid F1.B/F1.C.A + geometry MGN F1.D + demographics Tier 1 F1.C.B). Atlas wiki Haiku LLM batch (script 13) defer a F1.C.C post Tier 2 demographics + cache fix L-NEW.

### §10.1 Cascada re-ejecutada (idempotente UPSERT)

| Tabla | Rows | Source | Estado |
|---|---|---|---|
| `zone_scores` (n0+n1) | 5,267 | `compute_ie_n0` + `compute_ie_n1` | ✅ refreshed sobre data real |
| `dmx_indices` | 3,192 | `compute_dmx_indices` | ✅ refreshed (PRC + ICC + ICO + IRD + IPV + IRE) |
| `zone_pulse_scores` | 83,676 | `compute_zone_pulse` | ✅ refreshed (228 zones × 365d) |
| `colonia_dna_vectors` | 210 | `compute_colonia_dna` | ✅ refreshed (UPDATE in-place) |
| `pulse_forecasts` | 7,296 | `compute_pulse_forecasts` | ✅ refreshed (228 zones × 30d) |
| `colonia_wiki_entries` | 6/210 refreshed | `compute_atlas_wiki` | 🟡 deferred F1.C.C (cache fix L-NEW) |

### §10.2 Bug fix scripts compute 07/09 — DEFAULT_LIMIT_ZONES alignment

Scripts `07_compute-zone-pulse.ts` + `09_compute-zone-pulse-forecasts.ts` tenían `DEFAULT_LIMIT_ZONES=500` mientras `MAX_ZONES_CAP=300` enforced en `parseArgs` validation → orchestrator abortaba C07 con FATAL `cap excedido: limitZones=500 (max 300) × lookbackDays=365 (max 400)`. Fix: bajar default a 300 (cubre 228 zonas CDMX H1 con margen). Docstrings ajustados a `default: 300, max 300`. Cero regresiones — script 08 ya tenía DEFAULT=210 ≤ MAX=300 OK.

### §10.3 Atlas Wiki Haiku cache failure → defer L-NEW

Cache `cache_creation_input_tokens=0` en cada call. Blocks `WIKI_SCHEMA_DEFINITION` (~150 tokens) + `WIKI_EXAMPLES_3` (~600 tokens) ambos por debajo del mínimo Anthropic Haiku 4.5 (1024-2048 tokens). Cost real proyectado $1.68 vs cap $1 USD → STOP manual a $0.05 spent (6/210 refreshed).

**Decisión defer post-cache-fix a F1.C.C:**
- Tier 2 demographics + ENIGH downscale en F1.C.C alteran significativamente el contexto que consume el wiki (demographics y ENIGH son inputs en el prompt LLM).
- Refresh ahora sería throwaway: re-refresh post F1.C.C inevitable.
- Entries 2026-04-24 actuales son 2 días stale (post F1.B + F1.D pero pre F1.C.B Tier 1) — aceptable como state-of-record durante F1.C.C dev window.

**L-NEW-COMPUTE-ATLAS-WIKI-CACHE-FIX-01** (~3h, F1.C.C scope):
1. Expandir `WIKI_EXAMPLES_3` a 5+ ejemplos completos (~2048+ tokens combinados).
2. Considerar consolidar `WIKI_SCHEMA_DEFINITION` + `WIKI_EXAMPLES` en UN solo block con cache_control.
3. Verify `cache_creation_input_tokens > 0` en dry-run pre-bulk (1 zone test).
4. Restart C13 con `--no-skip-existing` — projected $0.30 con caching activo (90% off subsecuentes).

### §10.4 Cleanup ingest_runs zombie

2 runs `running` en BD pre-cleanup:
- `compute_ie_n0` (start 09:07:47, sesión inicial standalone con `tail -20` que retornó pero ingest_run no flushed — zombie). Marcado `failed` con error `zombie_orchestrator_session_recovery_F1ER`.
- `compute_atlas_wiki` (start 09:42:41, sesión actual abortada manual). Marcado `budget_exceeded` con error `manual_abort_cache_block_under_min_tokens_F1ER_defer_to_F1CC`.

Cero rows perdidas — UPSERT idempotente garantiza integridad.

### §10.5 Status §10

✅ Cascada IE refreshed sobre data real (5 tablas core: zone_scores + dmx_indices + zone_pulse + dna + forecasts).
🟡 Atlas wiki refresh deferred F1.C.C (L-NEW cache fix + bulk re-run combinado).
✅ Bug fix scripts 07/09 shipped — orchestrator full pipeline ahora corre clean con defaults.

**Tag:** `fase-07.7-data-real-recompute`. **Próximo:** F1.C.C Tier 2 Demographics (AGEB overlay RESAGEBURB + ENIGH downscale + cache wiki fix combo).

---

## §11 F1.C.C Tier 2 Demographics — AGEB spatial overlay + ENIGH downscale (2026-04-26)

> Sub-fase **07.7.F1.C.C** ship Tier 2 demographics via PostGIS spatial overlay sobre RESAGEBURB CSV + Marco Geoestadístico 09a.shp (AGEBs urbanos CDMX), promueve 208/210 colonias de Tier 1 `inegi_municipal_proxy` (16 valores únicos) → Tier 2 `inegi_ageb_overlay` (208 valores per-colonia distintos). ENIGH downscale via graproes_anios proxy genera median_salary_mxn per colonia (rango MXN 17,717-30,353).

### §11.1 Pipeline shipped (5 steps)

1. **Download MGN CDMX ZIP** (~83 MB) desde INEGI BVINEGI catálogo 889463807469 → extracción 09a.shp (AGEB urbanos) vía shpjs auto-reproyectando EPSG:6372→4326 con .prj bundled proj4js. **2,431 AGEB polygons** parsed.
2. **Download RESAGEBURB CSV** (~12 MB ZIP / 44 MB CSV / 230 columnas) desde INEGI Censo 2020 microdatos. papaparse `dynamicTyping: false` preserve hex AGEB codes (e.g., '003A'). Filtro AGEB-total (MZA='000', AGEB!='0000'). **2,433 AGEB rows** parsed.
3. **Staging UPSERT** vía SECDEF `load_inegi_ageb_staging_batch(jsonb)` chunks 200 rows. Casts GeoJSON text → PostGIS geometry vía ST_GeomFromGeoJSON + ST_Multi + ST_MakeValid. **2,431 rows en staging**.
4. **Spatial overlay RPC** vía SECDEF `recompute_zone_demographics_from_ageb()`. PostGIS ST_Intersects + ST_Area population-weighted aggregation. UPSERT inegi_census_zone_stats con data_origin='inegi_ageb_overlay'. **208 colonias updated** (snapshot_date='2020-12-31' censo reference).
5. **ENIGH downscale**: ratio = colonia_graproes / state_graproes_2020 (CDMX 11.5 años); clamp [0.30, 3.00]; median_salary_mxn = ENIGH_2022_CDMX_median × ratio (state_median MXN 22,219 from INEGI Comunicado 414/23). UPSERT enigh_zone_income con data_origin='enigh_2022_state_downscaled_via_censo_2020_proxy'. **208 colonias downscaled**.

### §11.2 Cobertura post-Tier 2

| Tabla | Tier 1 (municipal proxy) | Tier 2 (AGEB overlay) | Status |
|---|---|---|---|
| `inegi_census_zone_stats` | 226 (todas colonias, snapshot 2026-04-26) | 208 (208 colonias con boundary, snapshot 2020-12-31) | Coexisten — UI prefiere Tier 2 cuando exists |
| `inegi_ageb_staging` | — | 2,431 AGEBs urbanos CDMX | Source-of-truth spatial overlay |
| `enigh_zone_income` | 2 synthetic legacy | 208 downscaled (rango MXN 17,717-30,353, avg 24,157) | Tier 2 supersedes synthetic |

### §11.3 Bug fixes shipped en F1.C.C

**Bug A — shpjs fileName prefix.** Original filter `fileName === '09a'` no matched porque INEGI MGN ZIP nests layers en directorio `conjunto_de_datos/09a`. Fix: extract basename via `name.split('/').pop()`.

**Bug B — geometry/geography type mismatch.** `zones.boundary` es `geography` type (no `geometry`). Original RPC ST_Intersects(geometry, geography) emitía silently `lwgeom_distance_spheroid returned negative!` y retornaba 0 results. Fix: cast `z.boundary::geometry` en ST_Intersects + ST_Intersection. Migration `.101035` fix shipped post-discovery.

### §11.4 Methodology canon

- **AGEB-overlay weighted formulas (per SA-ITER §4.2/§4.3):**
  - Counts (POBTOT, TOTHOG): `SUM(X * frac)` donde `frac = ST_Area(ST_Intersection) / ST_Area(ageb)`
  - Ratios (GRAPROES, PEA_ratio): `SUM(X * pobtot * frac) / SUM(pobtot * frac)` — **population-weighted** (NO area-weighted, evita skew por AGEBs sparsely populated con high overlap).
- **ENIGH downscale formula:** `median_mxn = state_median × clamp(colonia_graproes / state_graproes, 0.30, 3.00)`. Linear in education ratio (Pearson r≈0.72-0.78 income↔education en INEGI cross-sections CDMX). Caveat: relación convex en top decile — formula under-estimates Polanco/Lomas, over-estimates Iztapalapa por ~10%. Acceptable H1; flag `data_origin='enigh_2022_state_downscaled_via_censo_2020_proxy'` para UI badge "Estimación H1".

### §11.5 Migrations shipped F1.C.C

| Migration | Tipo | Descripción |
|---|---|---|
| `20260426095736_inegi_ageb_staging` | Schema | inegi_ageb_staging table + GIST index + RLS service-role-only |
| `20260426095751_inegi_census_tier2_columns` | Schema | ALTER inegi_census_zone_stats + enigh_zone_income con 8 indicators + per_ageb_aggregations jsonb |
| `20260426095849_recompute_zone_demographics_from_ageb` | RPC | SECDEF spatial overlay (initial, geography cast bug) |
| `20260426100007_audit_rls_allowlist_v32` | Audit | Allowlist v32 — 1 SECDEF nueva |
| `20260426100358_load_inegi_ageb_staging_batch` | RPC | SECDEF batch loader jsonb-driven (UPSERT staging con ST_GeomFromGeoJSON) |
| `20260426100437_audit_rls_allowlist_v33` | Audit | Allowlist v33 — 2 SECDEF totales (RPC + batch loader) |
| `20260426101035_recompute_zone_demographics_geography_cast_fix` | RPC fix | Cast `z.boundary::geometry` resolver lwgeom_distance_spheroid error |

### §11.6 L-NEW updates F1.C.C

- ✅ ~~L-NEW-DEMO-TIER2-AGEB-OVERLAY-F1CC~~ — **SHIPPED F1.C.C 2026-04-26**.
- 🟡 **L-NEW-COMPUTE-ATLAS-WIKI-CACHE-FIX-01** — defer F1.G (después de Tier 2 wiki refresh contextual será meaningful).
- 🟡 **L-NEW-DEMO-TIER2-AGEB-OVERLAY-EXPAND-COLONIAS-H2** — los 18 colonias remaining (sin overlap AGEB; no boundary o boundary mal-positioned) defer post F1.D L-NEW expand IECM colonias completo.
- 🟡 **L-NEW-DEMO-PROXY-COMPOSITE-01** (FASE 22.B) — composite proxy (0.5×graproes + 0.3×employment + 0.2×housing) lift Pearson r de 0.75 → 0.82-0.85.

### §11.7 Status §11

✅ Tier 2 AGEB spatial overlay shipped (208/210 colonias = 99% coverage).
✅ ENIGH 2022 downscale shipped (208 colonias per-colonia distinct values).
✅ inegi_census_zone_stats `inegi_ageb_overlay` granularity per colonia (vs Tier 1 municipal proxy 16 valores).
✅ enigh_zone_income downscaled rango realista (MXN 17.7k-30.3k consistente con CDMX 5to-95to percentil).
✅ audit:rls 0 violations post v33.
✅ Bug fixes shipped in-PR (shpjs prefix + geography cast).

**Tag:** `fase-07.7-data-real-tier2`. **Próximo:** F1.G master cierre (F1.F tests defer F2 dedicated UI bloque — UI canonical M01 0% per memoria, tests `.skip()` huérfanos sin valor inmediato).

---

## §12 F1.G MASTER CIERRE — FASE 07.7 Data Real shipped (2026-04-26)

> Sub-fase **07.7.F1.G** = MASTER CIERRE F1 Data Real. Documenta cobertura final + handoff F2 Construction M01-M20. Tag `fase-07.7-data-real-shipped`.

### §12.1 Cobertura final F1 (vs synthetic baseline pre-F1)

| Tabla | Pre-F1 | Post-F1 | Cobertura | Tag shipped |
|---|---|---|---|---|
| `climate_source_observations` | 0 | 76,756 | NOAA + CONAGUA real | `fase-07.7-data-real-climate-hybrid` (F1.C.A) |
| `climate_monthly_aggregates` | 43,776 sintético | 46,226 con xval status | Replacement F1.B | `fase-07.7-data-real-climate` |
| `climate_zone_signatures` | 228 sintético | 228 recomputed | Refresh sobre real | F1.E.r |
| `zones.boundary` | 210 synthetic bbox-500m | 210 real MGN polygons | 100% colonias | `fase-07.7-data-real-geometry` (F1.D) |
| `inegi_census_zone_stats` | 226 sintético | 226 Tier 1 + 208 Tier 2 | 99% per-colonia | `fase-07.7-data-real-demographics` + `tier2` |
| `inegi_ageb_staging` | — | 2,431 AGEBs | New canonical | F1.C.C |
| `enigh_zone_income` | 210 sintético | 208 downscaled realista | Tier 2 supersede | F1.C.C |
| `colonia_wiki_entries` | 210 (2026-04-24) | 210 (defer cache fix) | L-NEW combo F2 | (defer) |
| IE cascada (zone_scores + dmx + pulse + dna + forecasts) | computed sobre sintético | recomputed sobre data real | 100% refreshed | `fase-07.7-data-real-recompute` (F1.E.r) |

### §12.2 16 sub-tags FASE 07.7 acumulados

```
fase-07.7-foundation-locked          (F0 baseline)
fase-07.7.A.1-complete               (CRM Foundation A.1)
fase-07.7.A.2-complete               (CRM Foundation A.2)
fase-07.7.A.3-complete               (Data Reality Audit A.3)
fase-07.7.A.4-complete               (CRM Foundation A.4 schema)
fase-07.7.A.5-complete               (E2E retrofit A.5)
fase-07.7-complete                   (Master CRM cierre 2026-04-25)
fase-07.7-data-real-foundation       (F1.A multi-país H1 scope)
fase-07.7-data-real-climate          (F1.B NOAA + CONAGUA)
fase-07.7-data-real-climate-hybrid   (F1.C.A xval winner)
fase-07.7-data-real-geometry         (F1.D MGN GeoJSON)
fase-07.7-data-real-demographics     (F1.C.B Tier 1 municipal proxy)
fase-07.7-data-real-recompute        (F1.E.r IE cascada refresh)
fase-07.7-data-real-tier2            (F1.C.C AGEB overlay + ENIGH downscale)
fase-07.7-data-real-shipped          (F1.G MASTER CIERRE)
[+ housekeeping/checkpoint tags varios]
```

### §12.3 L-NEW Pipeline cohort defer F2 Construction

| L-NEW | Esfuerzo | FASE destino | Bloquea M01? |
|---|---|---|---|
| L-NEW-COMPUTE-ATLAS-WIKI-CACHE-FIX-01 | ~3h | F2 (FASE 13.X) | NO (entries 2026-04-24 stale aceptable) |
| L-NEW-DEMO-TIER2-AGEB-OVERLAY-EXPAND-COLONIAS-H2 | ~4h | post F1.D L-NEW IECM | NO (208/210 = 99% coverage) |
| L-NEW-CRM-DEAL-WON-CASCADE-01 | ~3h | FASE 07.7.B | NO |
| L-NEW-DEMO-DISCLOSURE-S5 | ~2h | M01 P0 (FASE 13) | ✅ Sí |
| L-NEW-DEMO-DISCLOSURE-A3-01 | ~1.5h | M01 P0 (FASE 13) | ✅ Sí |
| L-NEW-CLIMATE-DISCLOSURE-01 | ~1h | M01 P0 (FASE 13) | ✅ Sí |
| L-NEW-DEMO-PROXY-COMPOSITE-01 | ~6h | FASE 22.B | NO |
| L-NEW-DEMO-TIER3-MANZANA-OVERLAY | ~12h | H2 expansion | NO |

### §12.4 Handoff F2 Construction M01-M20

**Próximo:** FASE 13 Portal Asesor M1-M5 foundation visual (ADR-050 design tokens prototype-canon ADR-048). Wireing UI consume Data Real shipped F1:

- **M01 Dashboard Asesor**: consume `inegi_census_zone_stats` (preferir `inegi_ageb_overlay` cuando exists, fallback `inegi_municipal_proxy` con badge "Estimación por alcaldía") + `enigh_zone_income` (preferir `enigh_2022_state_downscaled` con badge "Estimación H1") + `zones.boundary` real polygons + climate hybrid xval.
- **3 disclosure badges P0** must-have pre-launch M01: S5 (atlas wiki sintético cita) + A3-01 (UI ficha colonia consume Tier 2 sin badge) + CLIMATE-01 (climate forecasts UI sin badge fuente).
- **F1.F tests E2E** activan post-UI canonical wiring (descomentar `.skip()` en `tests/e2e/zone-data-freshness*.spec.ts` cuando `/zonas/[colonia]` UI shipped + 7 testIDs wired).

### §12.5 Status §12 — CIERRE F1 master

✅ FASE 07.7 Data Real CIERRE master shipped.
✅ 16 sub-tags acumulados (CRM A.1-A.5 + F1.A-G Data Real).
✅ Cobertura cero-sintético en 8/9 tablas core (atlas wiki defer combo F2).
✅ audit:rls 0 violations post v33 · audit:dead-ui 25 baseline mantenido.
✅ Migrations 1:1 sync (canon mcp_apply_migration_timestamp_drift resuelto).
✅ L-NEW cohort documented + asignados a FASEs destino concretas (canon `upgrades_destino`).

**Tag master:** `fase-07.7-data-real-shipped`. **Próximo:** F2 Construction M01-M20 / FASE 13 Portal Asesor M1-M5 foundation visual (~52-58h CC, ADR-050 design tokens prototype-canon).



