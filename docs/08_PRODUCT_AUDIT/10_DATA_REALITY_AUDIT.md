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

## §4 Climate Reality (SA-Climate-Geo full draft: tmp/A.3-drafts/SA-Climate-Geo.md, 675 líneas)

### §4.1 `heuristic_v1` confirmed SYNTHETIC SEED

- **43,776 rows = 228 zonas × 192 meses (2011-01 → 2026-12, 16 años inclusive futuro 8 meses).**
- **Generator:** `shared/lib/intelligence-engine/climate/noaa-ingestion.ts:43-89` `heuristicMonthlyAggregate()` — sinusoides + hash FNV-1a determinístico.
- **CDMX-only baseline:** `CDMX_BASE_TEMP_C=17.5`, `CDMX_BASE_RAINFALL_MM_MONTH=70`, `CDMX_BASE_HUMIDITY=55`. Climate-change drift `+0.03°C/año desde 2011 base` (linear estimación ad-hoc).
- **Driver real `conagua.ts` STUB-marcado correctamente** con feature flag `ingest.conagua.enabled=false` y `throw new ConaguaNotImplementedError()` referenciando ADR-018. ✅
- **ingest_runs climate:** solo 1 row `compute_climate_signatures` 2026-04-24 19:02 (rebuild signatures, no nueva ingesta externa).

### §4.2 Migration trail labeling correcto

- `supabase/migrations/20260423120100_*.sql:39-51` — CREATE TABLE `climate_monthly_aggregates` (default `source='noaa'`, check `('noaa','conagua','hybrid')`). NO incluía `heuristic_v1`.
- `supabase/migrations/20260423130100_*.sql:8-20` — **fix migration agrega `heuristic_v1`** al check constraint y lo pone como default. Comment explica: `heuristic_v1 (SEED H1 sintético CDMX pattern) | noaa (GHCND real L140 FASE 12) | conagua (scrape real) | hybrid (NOAA+CONAGUA merged)`.

### §4.3 L-NEW handoff

- **L-NEW-CLIMATE-REAL-NOAA-01:** Real NOAA GHCND ingest replace `heuristic_v1`. Bloque sugerido: **FASE 12** (already planeado per `noaa-ingestion.ts:140` comment). Esfuerzo ~8h.
- **L-NEW-CLIMATE-CONAGUA-SCRAPE-01:** Real CONAGUA SMN scraping legítimo (no portal listado ADR-012). Bloque sugerido: **FASE 12** (post NOAA baseline). Esfuerzo ~12h.
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
