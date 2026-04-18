# ADR-010 — Arquitectura del Intelligence Engine: pipeline end-to-end

**Status:** Accepted
**Date:** 2026-04-17
**Deciders:** Manu Acosta (founder), Claude Opus 4.7 (Senior Review)

## Context

El **Intelligence Engine (IE)** es el producto primario de DesarrollosMX, no un subsistema. Citando el principio rector (IE1-§1.2, BIBLIA-§1):

> *"El marketplace es el canal de distribución. El IE es el producto. Los datos temporales acumulados son el moat."*

El IE produce **118 scores** (107 registrados + 11 nuevos N01-N11, ver `biblia-v5/08_IE_PART3_Scores_Nivel2_3_4_5.md`) en **5 niveles** (N0 determinístico → N5 AI generativo) + **7 índices propietarios** (DMX-IPV, DMX-IAB, DMX-IDS, DMX-IRE, DMX-ICO, DMX-MOM, DMX-LIV). Alimenta 4 flywheels: marketplace, asesores, devs, compradores + API B2B (7 productos licenciables, ver ADR-008).

El pipeline del IE es la pieza técnica más compleja del producto y la más diferenciadora. Elementos en juego:

- **50+ fuentes de datos**: 7 macro (Banxico, INEGI, SHF, BBVA Research, CNBV, Infonavit, FOVISSSTE), 17 geo (DENUE, FGJ, GTFS, Atlas Riesgos, SIGED, DGIS, SACMEX, RAMA, SEDUVI, Catastro CDMX, PAOT, SEDEMA, CONAGUA, INAH, PROFECO, 0311 Locatel, Mapbox Traffic), 4 mercado (Inmuebles24 scraping, AirDNA, Google Trends, Cushman&CBRE), 12 propias (del marketplace), 10+ futuras H2.
- **Ingesta heterogénea**: APIs REST (Banxico, Mapbox, AirDNA), APIs con token (INEGI, Banxico), scraping (Inmuebles24, Google Trends), PDF extraction (BBVA Research, Cushman), admin upload XLSX/CSV (SHF, CNBV, Infonavit, FOVISSSTE), shapefile parse (Atlas Riesgos), GTFS feeds (Metro/Metrobús).
- **Volúmenes**: DENUE ~200K establecimientos CDMX, FGJ ~100K carpetas/año, GTFS ~300 estaciones + ~5K paradas, Atlas Riesgos ~500 AGEBs, SIGED ~15K escuelas, DGIS ~5K instalaciones salud.
- **Frecuencias**: diaria (Banxico), mensual (INEGI, CNBV, Infonavit, FGJ), trimestral (SHF, BBVA Research, FOVISSSTE), on-demand (Mapbox Traffic), tiempo real (operaciones propias).
- **Deduplicación**: cada fuente tiene patrones de dedup distintos (DENUE por CLEE, FGJ por carpeta_id, INEGI por serie+periodo).
- **Recálculo**: un cambio en macro (tasa hipotecaria Banxico) dispara recálculo en A01/A02/A04/A05/B05/B08/H11/D01/F16 (~9+ scores). Un `unit_sold` dispara B08 → E01 → D02 → B03 → B09 (5 scores cascada).
- **Storage histórico**: `score_history` preserva cada versión de score con `valid_from`/`valid_until`, vital para analytics temporal ("plusvalía de zona X desde 2024 a 2026").
- **Persistencia multi-capa**: `zone_scores` (por colonia), `project_scores` (por proyecto), `user_scores` (por usuario), `dmx_indices` (índices macro), `geo_snapshots` (fotos temporales de distribución geo).
- **Cascadas formales (6)**: unit_sold, price_changed, macro_updated, geo_data_updated, feedback_registered, search_behavior.
- **Confidence cascade**: 4 niveles (high, medium, low, insufficient_data) según volumen de datos disponibles. UI presenta badges según nivel.
- **Tier system**: 4 tiers (day-1 con fuentes externas, ≥10 proyectos, ≥50 proyectos + 6 meses, ≥100 ventas cerradas) que determinan cuándo cada score se considera confiable.

**Política crítica de fuentes**: el founder estableció (INS §Precauciones, HABI reporte) que **DMX NO consume la API de Habi** bajo ninguna circunstancia, aun si Habi/propiedades.com es la mayor fuente comercial de datos catastrales agregados en MX. La razón es doble:
- Riesgo legal/comercial (Habi es competidor directo en MX; usar su API incumple TOS y expone a acciones legales).
- Técnico: propiedades.com/Habi mismo agrega datos de fuentes públicas (SIGCDMX, Catastro, SEDUVI, OVICA, DENUE, Overpass/OSM, GTFS). DMX puede y debe consumir esas fuentes directamente, construyendo el dataset propio auditable.

## Decision

Se adopta un **pipeline IE end-to-end de 9 etapas**, implementado con Trigger.dev v3 (H1) / Vercel Queues (H2 cuando GA), y consumible desde tRPC + UI generative.

### D1. Pipeline de 9 etapas

```
[1] Fuentes (50+)
        ↓
[2] Ingestores per-source (cron + retry + dedup)
        ↓
[3] Storage bruto (geo_data_points, macro_series, market_prices_secondary, zone_snapshots, geo_snapshots)
        ↓
[4] Calculators (registry con trigger map)
        ↓
[5] Queue (score_recalculation_queue priority 1-10 + batch_mode)
        ↓
[6] Worker (/api/cron/score-worker 1min en Vercel Cron)
        ↓
[7] Persistence (zone_scores, project_scores, user_scores, dmx_indices)
        ↓
[8] History (score_history via trigger archive_score_before_update BEFORE UPDATE)
        ↓
[9] Surface (tRPC procedures + UI cards + confidence badges + tiers)
        ↓
[Feedback loop] cascades: unit_sold | price_changed | macro_updated | geo_data_updated | feedback_registered | search_behavior
```

### D2. Ingestores per-source

Cada fuente tiene un **ingestor dedicado** en `features/ingesta/routes/` y `features/ingesta/lib/sources/<source>.ts`:

**Macro (7)**:
- `banxico.ts` — diaria 8am. Token `BANXICO_TOKEN`. Series: tasa_referencia, TIIE28, tipo_cambio_fix, tasa_hipotecaria_avg. → `macro_series`.
- `inegi.ts` — mensual día 15. Token `INEGI_TOKEN`. Series: INPC, INPP construcción + pendientes materiales/mano_obra/PIB/vivienda. → `macro_series`.
- `shf.ts` — trimestral. **Admin upload** XLSX (`/api/admin/ingest-upload`). IPV nacional + 32 estados. → `macro_series`.
- `bbva_research.ts` — trimestral. **PDF extraction GPT-4o-mini**. sobrecosto_vivienda, oferta_vivienda, credito_hipotecario. → `macro_series`.
- `cnbv.ts` — mensual. Admin upload CSV. Créditos hipotecarios municipio, cartera_vencida, tasa por banco. → `macro_series`.
- `infonavit.ts` — mensual. Admin upload. Créditos, monto, VSM. → `macro_series`.
- `fovissste.ts` — trimestral. Admin upload. Créditos, monto por estado. → `macro_series`.

**Geo (17)**:
- `denue.ts` — mensual. Bulk download INEGI DENUE + parse. ~200K registros CDMX. Mapeo SCIAN propietario aplicado al insertar. → `geo_data_points` con `source='denue'`.
- `fgj.ts` — mensual. datos.cdmx.gob.mx (carpetas de investigación). ~100K/año. → `geo_data_points` con `source='fgj'`.
- `gtfs.ts` — mensual. GTFS feeds Metro/Metrobús/Tren/Cablebús/EcoBici. Parse estaciones + paradas + rutas. → `geo_data_points` con `source='gtfs_<red>'`.
- `atlas_riesgos.ts` — anual. Shapefile parse CENAPRED + local. → `geo_data_points` con `source='atlas_<tipo>'`.
- `siged.ts` — mensual. SEP API. ~15K escuelas. → `geo_data_points` con `source='siged'`.
- `dgis.ts` — mensual. CLUES catálogo. → `geo_data_points` con `source='dgis'`.
- `sacmex.ts` — diaria. Cortes agua CDMX. → `geo_data_points` con `source='sacmex'`.
- `mapbox_traffic.ts` — on-demand. Requests a Mapbox Directions API cuando score lo pide. Cache 24h. → `external_data` + cache memoria.
- Otros H2: RAMA, SEDUVI, Catastro CDMX, PAOT, SEDEMA, CONAGUA, INAH, PROFECO, 0311 Locatel.

**Mercado (4)**:
- `inmuebles24.ts` — semanal. **Scraping responsable** (robots.txt compliance, rate limit 1 req/5s). → `market_prices_secondary`.
- `airdna.ts` — mensual. API con `AIRDNA_API_KEY`. → `str_market_data`.
- `google_trends.ts` — semanal. Scraping Trends por keywords de zona. → `search_trends`.
- `cushman_cbre.ts` — trimestral. Reportes PDF manual admin upload. → `office_market_data`.

**Propias (12)** ingestan continuamente vía triggers PG en `projects`, `unidades`, `operaciones`, `busquedas`, `contactos`, `visitas_programadas`, `interaction_feedback`, `search_logs`, `project_views`, `wishlist`, `unit_change_log`, `inventory_snapshots`.

**Patrón común de ingestor**:
```typescript
export async function ingestDenue(params: { country_code: 'MX', period: Date }) {
  const sourceLog = await startSourceRun({ source: 'denue', params })
  try {
    const batch = await fetchDenueBulk({ period })
    for (const chunk of chunks(batch, 500)) {
      await supabase.from('geo_data_points').upsert(
        chunk.map(mapToGeoDataPoint),
        { onConflict: 'source,source_id,period_date', ignoreDuplicates: false }
      )
    }
    await finishSourceRun(sourceLog.id, { status: 'success', rows: batch.length })
  } catch (e) {
    await finishSourceRun(sourceLog.id, { status: 'failed', error: e.message })
    throw e
  }
}
```

### D3. Storage bruto + deduplicación

Tablas de almacenamiento bruto con **unique indexes** para deduplicación:

- `geo_data_points`: `UNIQUE (source, source_id, period_date, country_code)`.
- `macro_series`: `UNIQUE (serie_code, period_date, country_code)`.
- `market_prices_secondary`: `UNIQUE (portal, listing_id, period_date)`.
- `zone_snapshots`: `UNIQUE (zone_id, snapshot_date)`.
- `geo_snapshots`: `UNIQUE (country_code, source, snapshot_date)`.

Columnas comunes: `id uuid`, `country_code CHAR(2) NOT NULL`, `ingested_at timestamptz`, `period_date date`, `is_active bool`, `metadata jsonb`.

### D4. Calculators + Registry

`features/scores/lib/registry.ts` mantiene registro de 118 scores con metadatos:

```typescript
export interface ScoreDefinition {
  code: string                              // ej. 'B08', 'N11', 'DMX-MOM'
  name: string
  level: 0 | 1 | 2 | 3 | 4 | 5
  target: 'zone' | 'project' | 'user' | 'macro'
  tier: 1 | 2 | 3 | 4
  countryScope: string[]                    // ['MX'] | ['MX','CO',...]
  inputs: Array<InputSource>                // qué tablas/series/fuentes consume
  triggerEvents: Array<CascadeEvent>        // unit_sold | price_changed | macro_updated | ...
  confidence: {
    high: ConditionExpr
    medium: ConditionExpr
    low: ConditionExpr
    insufficient: ConditionExpr             // fallback
  }
  compute(ctx: CalcContext): Promise<ScoreResult>
}
```

Cada calculator es un módulo puro con firma `compute(ctx) → { value, confidence, metadata }`. El registry es auditable (`/metodologia` pública consume entries del registry para publicar fórmulas).

### D5. Queue + Worker

Tabla `score_recalculation_queue`:

```sql
CREATE TABLE score_recalculation_queue (
  id bigserial PRIMARY KEY,
  score_code text NOT NULL,
  target_type text NOT NULL,        -- zone | project | user | macro
  target_id uuid,
  triggered_by text,                 -- unit_sold:<op_id> | price_changed:<unit_id> | ...
  priority smallint DEFAULT 5,       -- 1 = highest, 10 = lowest
  batch_mode bool DEFAULT false,     -- true para jobs agrupables (macro_updated)
  status text DEFAULT 'pending',     -- pending | processing | completed | failed
  enqueued_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  attempts int DEFAULT 0,
  error text,
  UNIQUE (score_code, target_type, target_id, triggered_by, status)
    WHERE status IN ('pending','processing')
);
```

Función `enqueue_score_recalc(score_code, target_type, target_id, triggered_by, priority)` deduplica contra pending + processing.

Worker en `/api/cron/score-worker` (Vercel Cron cada 1 minuto):
- SELECT FOR UPDATE SKIP LOCKED 100 rows con priority ascendente.
- Invoca calculator → updates `zone_scores`/`project_scores`/`user_scores`/`dmx_indices`.
- Trigger PG `archive_score_before_update` BEFORE UPDATE inserta fila anterior en `score_history`.
- Marca row de queue como completed.
- Si `attempts > 5` → marca `failed` y emite evento Sentry.

En H2 (cuando Vercel Queues GA), migrar queue propia a Vercel Queues manteniendo tabla como ledger auditable.

### D6. Persistence + history

- `zone_scores (zone_id, score_code, value, confidence, computed_at, valid_until)`.
- `project_scores (project_id, score_code, value, confidence, computed_at, valid_until)`.
- `user_scores (user_id, score_code, value, confidence, computed_at, valid_until)`.
- `dmx_indices (index_code, period_date, value, components jsonb, confidence, computed_at)`.
- `score_history` append-only con `archived_at`. Retención mínima 5 años (compliance + valor analítico).

### D7. Las 6 cascadas formales

Implementadas en `features/scores/lib/cascades/`:

1. **unit_sold** — trigger BD INSERT/UPDATE en `operaciones` WHERE status='cerrada'. Priority 3, individual. Dispara: B08 → E01 → D02 → B03 → B09.
2. **price_changed** — trigger BD en `unidades` cuando precio cambia (log en `unit_change_log`). Priority 3, individual. Dispara: A12 → A01 → A04 → A02 → B02 → B03 → E01.
3. **macro_updated** — cron post-ingesta Banxico/INEGI. Priority 8, batch_mode=true. Dispara: affordability macro factor, migration, absorption_macro_factor, infonavit (4-6 jobs batch) + D01 individual + C05 deferred.
4. **geo_data_updated** — cron post-ingesta DENUE/FGJ/SACMEX/GTFS/SIGED/DGIS. Priority 8, batch_mode=true. Jobs por fuente: DENUE (5-11 scores: F03, N01, N02, N03, N04 ...), FGJ (F01, N04, N09, N11...), SACMEX (F05, N07, H10...), etc.
5. **feedback_registered** — trigger BD INSERT en `interaction_feedback`. Priority 5. Dispara: B04 → B03 → C04.
6. **search_behavior** — batch cron cada 1 hora agrega `search_logs`. Priority 10. Dispara: B01, B04, H14.

Función `enqueueCascade(event, payload)` decide jobs + prioridades por cascade type.

### D8. Confidence cascade + Tier system

**Confidence levels**:
- `high`: datos suficientes + frescos (p. ej. DENUE ≥100 establecimientos zona, Banxico <7 días). UI sin indicador.
- `medium`: datos mínimos (DENUE ≥20, Banxico <30 días). UI badge amarillo "Datos limitados".
- `low`: datos escasos (DENUE ≥1, Banxico <90 días). UI badge naranja "Calculado con pocos datos".
- `insufficient_data`: por debajo de mínimo. UI placeholder "Score disponible pronto".

Umbrales por fuente documentados en `features/scores/lib/confidence.ts` (tabla de thresholds).

**Tier system** documentado en `biblia-v5/10_IE_PART5_Cascadas_Productos_Competencia.md` §11.3:
- **Tier 1 (day-1)**: sólo fuentes externas. 23 scores N0 accesibles día 1.
- **Tier 2 (≥10 proyectos)**: calibración inicial con marketplace propio.
- **Tier 3 (≥50 proyectos + 6 meses)**: modelos estadísticos confiables.
- **Tier 4 (≥100 ventas cerradas)**: modelos AI calibrados con transacciones reales.

UI indica tier de cada score con tooltip "Este score requiere Tier 3 (50+ proyectos en zona). Actualmente: 23".

### D9. Surface (tRPC + UI generative)

- tRPC router `scores` en `features/scores/routes/scores.ts`:
  - `scores.getZoneScores({ zone_id, score_codes? })`
  - `scores.getProjectScores({ project_id, score_codes? })`
  - `scores.getUserScores({ user_id })` (self o superadmin)
  - `scores.getIndices({ index_code, date_from, date_to })`
  - `scores.getScoreHistory({ target_type, target_id, score_code, from, to })`
- UI: componentes `<ScoreCard />`, `<IndexTicker />`, `<ZoneComparator />` en `shared/ui/generative/` consumidos por Copilot (ADR-002) y por portales.
- API pública v1 `/api/v1/scores/*` (plan-gated por feature_registry, rate limit por plan — ADR-008 + ADR-009).

### D10. Política de fuentes autorizadas + bloqueos explícitos

**Autorizadas** (whitelist explícita en `features/ingesta/lib/sources/index.ts`):
- Macro: Banxico, INEGI, SHF, BBVA Research, CNBV, Infonavit, FOVISSSTE.
- Geo: DENUE/INEGI, FGJ CDMX, GTFS operadores, Atlas Riesgos (CENAPRED), SIGED (SEP), DGIS/CLUES, SACMEX, RAMA (H2), SEDUVI (H2), Catastro CDMX (H2), PAOT/SEDEMA/CONAGUA/INAH/PROFECO/0311 Locatel (H2+), Mapbox Traffic (on-demand).
- Mercado: Inmuebles24 (scraping responsable), AirDNA (API contratada), Google Trends (scraping), Cushman & Wakefield / CBRE (reportes manuales admin upload).
- Propias: 12 tablas del marketplace.

**Prohibidas** (blocklist hardcoded):
- **API de Habi (`apiv2.habi.co`, `habi.co/api/*`, `propiedades.com/api/*`)** — PROHIBIDO CONSUMIR. Razón: competidor directo en MX + TOS que prohíbe scraping + riesgo legal. La whitelist en `features/ingesta/lib/sources/index.ts` explícitamente lanza error si alguna nueva entry matchea regex `/habi\.co|propiedades\.com/`.
- El dataset que Habi agrega viene de SIGCDMX + Catastro + SEDUVI + OVICA + Overpass OSM + GTFS (ver `biblia-v5/13_REPORTE_HABI_Catastro_SIGCDMX.md`). DMX consume esas fuentes directamente.
- Cualquier fuente no-whitelisted requiere ADR nuevo o entry en `docs/01_DECISIONES_ARQUITECTONICAS/` autorizada por founder.

## Rationale

Se eligió este pipeline porque:

1. **Per-source ingestors** vs. ETL centralizado (Airbyte) porque las fuentes son heterogéneas (APIs, scraping, PDF, XLSX, shapefile, GTFS). Cada fuente necesita lógica custom de parse + dedup.
2. **Queue + worker propio** (`score_recalculation_queue` + `/api/cron/score-worker`) porque:
   - Permite dedup contra pending + processing (vital para cascadas que pueden encolar 100+ jobs concurrentes).
   - Priority 1-10 + batch_mode cubre necesidades sin overhead de Redis/Sidekiq/BullMQ.
   - Trigger.dev v3 puede consumir eventos PG si escala supera worker Vercel.
3. **archive_score_before_update trigger** vs. log manual: cero código de aplicación, cero riesgo de olvidar loggear cambios.
4. **Confidence cascade + tier system** porque publicar scores con baja confianza mata credibilidad. La UI debe transparentar "cuán confiable es este número".
5. **Fuentes públicas + propias** vs. API Habi porque el moat real es el dataset propio auditable. Depender de Habi crea dependencia estratégica del competidor.
6. **Cascadas formales (6)** en lugar de triggers ad-hoc: cada cascade tiene contrato explícito + orden + prioridad. Facilita debugging cuando un score no se actualiza.

## Consequences

### Positivas
- **Flexibilidad per-source**: agregar una nueva fuente es crear `<source>.ts` + registrar en whitelist + escribir 1-2 scores que la consuman.
- **Deduplicación robusta**: unique indexes + enqueue con dedup previenen inflación de queue bajo cascadas grandes (ej. Banxico actualiza 4 series y dispara 4 × 9 scores = 36 jobs, dedup los reduce a los distintos).
- **Historial completo**: `score_history` permite analytics temporal (plusvalía 2024-2026) y publicación DMX Wrapped.
- **Política de fuentes auditable**: `/metodologia` pública lista exactamente qué fuentes alimentan qué score, construyendo confianza institucional.
- **Independencia de Habi**: no hay single point of failure externo en el dataset.
- **Escalable a multi-country**: la arquitectura per-source se replica agregando `country_code` parameter al ingestor. Fuente CO (DANE + Banrep) se añade sin tocar el resto.

### Negativas / tradeoffs
- **Costo ingesta H1 ~$150/mes infra + tokens**: AirDNA ($99), Open Exchange Rates ($12-$30), Mapbox Traffic ($50 estimado), PDF extraction GPT-4o-mini ($20 estimado), workers compute. Total controlable.
- **Scraping Inmuebles24 + Google Trends**: legalmente gris. Mitigación: respetar robots.txt + rate limit conservador (1 req/5s) + User-Agent identificable + documentar en policy. En caso de TOS change, fallback a admin upload.
- **Escalado queue**: con 500 proyectos + 1000 unidades activas, cascadas pueden generar ~50 jobs/segundo pico. Worker Vercel 1min basta H1; H2 evaluar Trigger.dev v3 sustained workers.
- **Dedup en cascadas**: si dos price_changed llegan en 5s, el segundo debería reemplazar al primero (no encolar dos jobs). La función `enqueueScoreRecalc` resuelve con `UNIQUE` parcial, pero require testing exhaustivo.
- **Admin upload como fuente**: algunas fuentes (SHF, CNBV, Infonavit, FOVISSSTE, BBVA Research) dependen de admin subiendo PDFs/XLSX manualmente. Proceso humano propenso a retraso. Mitigación: alert si última ingesta >45 días para serie trimestral.
- **PDF extraction con GPT-4o-mini**: errores de extracción silenciosos. Mitigación: double-check estructura Zod + alert si varianza >30% vs. período anterior.
- **Complejidad registry**: 118 scores implementados progresivamente a lo largo de FASE 08-12. Tracking en `docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md`.
- **Tier system ≠ tier de plan**: tier 1-4 del score es "qué tan confiable está el cálculo", no "qué tan premium es el plan". Potencial confusión UI. Mitigación: naming distinto en UI (tier → "nivel de calibración").

### Neutrales
- **Worker 1min** es conservador. Si cascadas demandan mayor throughput, escalable con workers concurrentes + SKIP LOCKED ya soporta.
- **Score history vs. event sourcing puro**: se elige "última versión + history" por simplicidad. Event sourcing puro reservado para H3 si necesario.
- **Registry como code vs. data**: registry vive como TypeScript (`registry.ts`) para que cada calculator esté co-localizado con su definición. Data mirror en `feature_registry` para gating.

## Alternatives considered

### Alt 1: ETL centralizado con Airbyte
Usar Airbyte como ingestor unificado con connectors + sync a Supabase. **Descartada** porque:
- Airbyte connectors estándar no cubren DENUE, FGJ, SACMEX, GTFS mexicano sin custom connectors.
- PDF extraction + admin upload no son patrones Airbyte.
- Overhead infra (Airbyte OSS requiere servidor propio o Airbyte Cloud $100+/mes piloto).
- Pérdida de control fino sobre dedup y mapeo SCIAN propietario.

### Alt 2: Batch nightly simple (un cron gigante cada madrugada)
Ingestar todo de 2am a 5am y calcular scores de 5am a 7am. **Descartada** porque:
- Mapbox Traffic es on-demand; no cabe en batch nightly.
- Cascadas (unit_sold en horas activas) requieren respuesta <5 minutos para que la UI sea utilizable.
- Recálculo batch de 118 scores × 500 proyectos × cascadas = billones de operaciones; no cabe en ventana 2h.

### Alt 3: Streaming con Kafka/Redpanda
Streaming de eventos + Kafka Streams para procesamiento continuo. **Descartada** porque:
- Overkill en piloto < 100 usuarios.
- Infra adicional (Kafka cluster) no justificada.
- Vercel + Supabase no tienen integración nativa; pérdida de ventajas monolito.
- Revisable H3 si volumen sostenido justifica.

### Alt 4: Consumir API de Habi para acelerar ingesta
Saltarse DENUE/Catastro/SIGCDMX y consumir directamente `apiv2.habi.co/get_lot`. **Descartada** explícitamente (regla INS §Precauciones):
- TOS de Habi prohíbe uso comercial + scraping.
- Habi es competidor directo en MX (operación activa).
- Dependencia estratégica crítica del competidor.
- Riesgo legal alto (cease & desist, demanda).
- Las fuentes primarias (SIGCDMX, Catastro, SEDUVI, OVICA) están públicamente disponibles sin restricción; consumir directo es técnicamente equivalente y legalmente limpio.

## References
- `../BRIEFING_PARA_REWRITE.md` §3 "IE implica", §11 "Cita founder"
- `../CONTEXTO_MAESTRO_DMX_v5.md` §9 "Scores IE (118)", §11 "Cascadas (6)", §12 "Fuentes de datos (50+)"
- `../biblia-v5/06_IE_PART1_Vision_Arquitectura_Fuentes_SCIAN.md` (arquitectura IE completa)
- `../biblia-v5/07_IE_PART2_Scores_Nivel0_Nivel1.md` (scores N0 + N1)
- `../biblia-v5/08_IE_PART3_Scores_Nivel2_3_4_5.md` (scores N2-N5)
- `../biblia-v5/09_IE_PART4_11Nuevos_Indices_Snapshots.md` (11 nuevos + 7 índices)
- `../biblia-v5/10_IE_PART5_Cascadas_Productos_Competencia.md` (cascadas + tiers + confidence)
- `../biblia-v5/11_INSTRUCCIONES_MAESTRAS_20Sesiones_245Upgrades.md` (§Precauciones: NO Habi)
- `../biblia-v5/13_REPORTE_HABI_Catastro_SIGCDMX.md` (fuentes directas alternativas)
- `../02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md` (ingestores)
- `../02_PLAN_MAESTRO/FASE_08_IE_SCORES_N0.md` ... `FASE_12_IE_AI_SCORES_N5.md`
- `../03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md` (registry completo)
- `../03_CATALOGOS/03.9_CATALOGO_FUENTES_DATOS.md` (whitelist fuentes)
- ADR-002 AI-native (Copilot consume scores vía tRPC)
- ADR-003 Multi-country (ingestores per-country)
- ADR-008 Monetization (productos B2B + API licenciable)
- ADR-009 Security (RLS + rate limit + audit)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent B) | **Fecha:** 2026-04-17
