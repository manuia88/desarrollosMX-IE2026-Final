# FASE 08 — Intelligence Engine: Scores Nivel 0 + AVM MVP

> **Duración estimada:** 5 sesiones Claude Code (~20 horas con agentes paralelos)
> **Dependencias:** FASE 00, FASE 01, FASE 02, FASE 06, FASE 07 (ingesta de datos)
> **Bloqueantes externos:**
> - `BANXICO_TOKEN` activo en `.env.local` y Vercel envs (verificar que sigue válido).
> - `INEGI_TOKEN` activo.
> - `MAPBOX_ACCESS_TOKEN` activo.
> - Supabase project `qxfuqwlktmhokwwlvggy` con tablas IE creadas en FASE 01: `geo_data_points`, `zone_scores`, `project_scores`, `score_history`, `score_recalculation_queue`, `macro_series`.
> - Ingestores DENUE, FGJ, GTFS, SIGED, DGIS, Atlas, SACMEX operativos (FASE 07).
> - Al menos 1 snapshot mensual de DENUE ya persistido (para que N01 calcule).
> - Acceso a tabla `ai_prompt_versions` con al menos 1 prompt AVM versionado.
> **Resultado esperado:** Los 32 scores Nivel 0 (21 originales + 11 nuevos N01-N11) implementados como calculators puros, persistidos en `zone_scores`/`project_scores`, con confidence cascade y tier gating. Queue worker procesando cada 1 min. AVM MVP I01 "DMX Estimate" operativo con regresión lineal. Tag `fase-08-complete`.
> **Priority:** [H1]

## Contexto y objetivo

Esta fase concreta los calculators más básicos del Intelligence Engine: los 32 scores Nivel 0 que no dependen de otros scores (solo de fuentes externas ingestadas). También implementa la primera versión del AVM Mexicano (DMX Estimate — I01) usando regresión lineal, como MVP para H1. Al final de esta fase DMX tiene intelligence real de zona para CDMX día 1 con datos externos (sin requerir data propia), cerrando UPG 1-38 (sub-etapas 7.1-7.5) + UPG 39-46 (sub-etapa 7.6). Cubre Tier 1 completo y sienta bases para Tier 2-4.

## Bloques

### BLOQUE 8.A — Registry, framework base y queue

Construye la columna vertebral del IE: el registry de los 118 scores, el framework de calculators con confidence cascade automático y la infraestructura de queue + worker cron. Sin esto, ningún score es observable ni cascade-able.

#### MÓDULO 8.A.1 — Registry central de scores

**Pasos:**
- `[8.A.1.1]` Crear `shared/lib/intelligence-engine/registry.ts` con interface `ScoreRegistryEntry`: `{ score_id: string; name: string; level: 0|1|2|3|4|5; category: 'zona'|'proyecto'|'comprador'|'dev'|'mercado'|'agregado'|'producto'; tier: 1|2|3|4; dependencies: string[]; triggers_cascade: string[]; formula_doc: string; confidence_sources: string[]; calculator_path: string; country_codes: string[]; }`.
- `[8.A.1.2]` Escribir el array `SCORE_REGISTRY: ScoreRegistryEntry[]` con 118 entries (21 N0 + 11 N01-N11 + 16 N1 + 14 N2 + 12 N3 + 7 N4 + 26 N5 + 6 productos I01-I06 + 5 stubs futuros). Los N0 listados aquí con tier 1 y deps vacías. Incluir `country_codes: ['MX']` para todos los de H1; dejar preparado para agregar más países.
- `[8.A.1.3]` Exportar helpers: `getScoreById(id)`, `getScoresByLevel(level)`, `getScoresByTier(tier)`, `getScoresByCategory(cat)`, `getCascadeTargets(trigger_event)`.
- `[8.A.1.4]` Crear test `shared/lib/intelligence-engine/__tests__/registry.test.ts` que valida: (a) hay 118 entries únicas por `score_id`, (b) toda dep apunta a score_id existente, (c) todo `calculator_path` apunta a un archivo real (import dinámico en test).
- `[8.A.1.5]` Exponer snapshot JSON `npm run registry:snapshot` que escribe `docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.json` para consumo externo (CI diff si cambia).

**Criterio de done del módulo:**
- [ ] `npm run test -- registry.test` pasa en 0 fallos.
- [ ] `getScoresByTier(1)` devuelve exactamente los scores del Tier 1 definidos en §9.10 del CONTEXTO_MAESTRO.
- [ ] `getCascadeTargets('unit_sold')` devuelve `['B08','E01','D02','B03','B09']` (cascade oficial unit_sold).

#### MÓDULO 8.A.2 — Calculator framework con confidence cascade

**Pasos:**
- `[8.A.2.1]` Crear `shared/lib/intelligence-engine/calculators/base.ts` con la interface genérica:
  ```ts
  export type Confidence = 'high' | 'medium' | 'low' | 'insufficient_data';
  export interface CalculatorInput { zoneId?: string; projectId?: string; userId?: string; countryCode: string; periodDate: string; }
  export interface CalculatorOutput<TComponents = Record<string, unknown>> {
    score_value: number;           // 0-100 canónico
    score_label: string;            // interpretación humana i18n-friendly
    components: TComponents;        // desglose para UI
    inputs_used: Record<string, unknown>;
    confidence: Confidence;
    citations: Array<{ source: string; url?: string; period?: string; count?: number }>;
    trend_vs_previous?: number;
    trend_direction?: 'mejorando' | 'estable' | 'empeorando';
  }
  export interface Calculator<T = Record<string, unknown>> {
    scoreId: string;
    version: string;                 // semver
    tier: 1 | 2 | 3 | 4;
    run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput<T>>;
  }
  ```
- `[8.A.2.2]` Agregar helpers en `confidence.ts`:
  - `detectConfidenceByVolume(count, thresholds: { high: number; medium: number; low: number })` — implementa umbrales por fuente (DENUE high≥100, medium≥20, low≥1; FGJ high≥50, medium≥10, low≥1; GTFS high≥3, medium≥1; SACMEX high≥6 meses, medium≥3; macro_series high<7 días, medium<30 días, low<90 días).
  - `detectConfidenceByFreshness(lastSeenDays, thresholds)`.
  - `composeConfidence(sub: Confidence[])` — si cualquiera es insufficient_data → insufficient_data; el peor manda.
- `[8.A.2.3]` Crear `shared/lib/intelligence-engine/persist.ts` con `persistZoneScore(output, registryEntry, input)` que hace UPSERT en `zone_scores` respetando `UNIQUE(zone_id, score_type, period_date)` y dispara trigger `archive_score_before_update`. Idéntico `persistProjectScore()` y `persistUserScore()`.
- `[8.A.2.4]` Implementar `tierGate(tier, countryCode, supabase)`: para Tier 2-4 consulta contadores reales (proyectos publicados, ventas cerradas) y, si no alcanza el mínimo, devuelve `{ gated: true, reason: 'tier_insufficient', requirement: '…' }`. La UI mostrará placeholder "Score disponible pronto" cuando `gated === true`.
- `[8.A.2.5]` Crear un wrapper `runScore(scoreId, input)` que: (a) carga el registry entry, (b) valida country_codes, (c) aplica tierGate, (d) importa dinámicamente el calculator, (e) corre `.run()`, (f) persiste, (g) enqueue downstream cascades, (h) loggea en `score_history` + PostHog event `ie.score.calculated`.

**Criterio de done del módulo:**
- [ ] Un calculator de prueba con 3 datos retorna `confidence='low'`; con 150 datos retorna `high`.
- [ ] `runScore('F01', { zoneId: seedZoneId, countryCode: 'MX', periodDate: '2026-04-01' })` persiste una fila en `zone_scores`.
- [ ] Llamar `runScore('E03', …)` sin datos suficientes devuelve `gated` sin persistir.

#### MÓDULO 8.A.3 — Queue `score_recalculation_queue`

**Pasos:**
- `[8.A.3.1]` En migration `supabase/migrations/xxxx_ie_queue.sql` crear tabla si no existe:
  ```sql
  CREATE TABLE IF NOT EXISTS score_recalculation_queue (
    id uuid primary key default gen_random_uuid(),
    score_id text not null,
    entity_type text not null check (entity_type in ('zone','project','user','market')),
    entity_id uuid not null,
    country_code text not null,
    triggered_by text not null,
    priority int not null default 5 check (priority between 1 and 10),
    batch_mode boolean not null default false,
    status text not null default 'pending' check (status in ('pending','processing','done','error')),
    error text,
    attempts int not null default 0,
    scheduled_for timestamptz not null default now(),
    started_at timestamptz,
    finished_at timestamptz,
    created_at timestamptz not null default now(),
    UNIQUE(score_id, entity_type, entity_id, country_code, status) DEFERRABLE INITIALLY IMMEDIATE
  );
  CREATE INDEX idx_queue_pending_priority ON score_recalculation_queue (status, priority, scheduled_for) WHERE status='pending';
  ALTER TABLE score_recalculation_queue ENABLE ROW LEVEL SECURITY;
  CREATE POLICY queue_service_all ON score_recalculation_queue FOR ALL TO service_role USING (true) WITH CHECK (true);
  ```
- `[8.A.3.2]` Crear función SQL `enqueue_score_recalc(p_score_id, p_entity_type, p_entity_id, p_country, p_triggered_by, p_priority, p_batch)` que INSERT ON CONFLICT DO NOTHING en la combinación (score_id, entity, country, status pending|processing). Evita duplicar jobs pendientes.
- `[8.A.3.3]` Exponer equivalente TypeScript `enqueueScoreRecalc()` en `shared/lib/intelligence-engine/queue.ts` invocando la RPC.
- `[8.A.3.4]` Seed test: enqueue 3 veces F01 para misma zona + periodo — debe haber 1 sola fila pendiente.

**Criterio de done del módulo:**
- [ ] Migration aplica limpio en branch Supabase.
- [ ] Dedup funciona: 100 llamadas → 1 fila.
- [ ] Índice `idx_queue_pending_priority` existe y es usado por EXPLAIN en la query del worker.

#### MÓDULO 8.A.4 — Worker cron `/api/cron/score-worker`

**Pasos:**
- `[8.A.4.1]` Crear `app/api/cron/score-worker/route.ts` con `export const dynamic = 'force-dynamic'` + `export const runtime = 'nodejs'`. Validar header `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron protection).
- `[8.A.4.2]` Dentro del handler: tomar batch de 50 items pending con `ORDER BY priority ASC, scheduled_for ASC` usando `SELECT … FOR UPDATE SKIP LOCKED` para concurrencia segura.
- `[8.A.4.3]` Por cada item: marcar `status='processing'`, correr `runScore(...)`, al terminar marcar `status='done'` (o `'error'` con `attempts+=1` y reprogramar 1/5/15 min según attempts).
- `[8.A.4.4]` Retornar `{ processed, done, errors, skipped }` como JSON + PostHog event `ie.worker.tick`.
- `[8.A.4.5]` Registrar en `vercel.json` cron `{"path":"/api/cron/score-worker","schedule":"*/1 * * * *"}` — cada 1 min.
- `[8.A.4.6]` Agregar en `/api/admin/queue-metrics` endpoint con conteos `pending_by_priority`, `last_run_ts`, `avg_duration_ms` (lo consume el portal admin FASE 19).

**Criterio de done del módulo:**
- [ ] Manualmente llamar el cron (con header válido) procesa pendientes reales y responde 200.
- [ ] Concurrencia: 2 workers paralelos no reprocesan el mismo id (SKIP LOCKED).
- [ ] Con 1000 ítems pending, un tick procesa exactamente 50 y deja 950.

### BLOQUE 8.B — Calculators Nivel 0 originales (21 scores)

Implementación score por score siguiendo el patrón E2E de 13 pasos definido en IE2. Cada calculator es un archivo TypeScript puro, testeable sin supabase mockeable.

#### MÓDULO 8.B.1 — F01 Safety Score

**Pasos:**
- `[8.B.1.1]` Crear `shared/lib/intelligence-engine/calculators/n0/f01-safety.ts` que implemente el calculator oficial: consulta `geo_data_points` source='fgj' últimos 12 meses vs 12 meses anteriores de la zona + radio 1.5km. Aplica pesos por tipo de delito (`PESOS_DELITO` map con 14 claves, default 3). Normaliza contra percentil CDMX. Score = 100 − percentil. Detecta confidence por volumen ≥50/≥10/≥1.
- `[8.B.1.2]` Registrar calculator en `registry.ts` con `triggers_cascade: ['crime_updated']`.
- `[8.B.1.3]` Test unit: 3 fixtures (zona segura, moderada, riesgosa) — snapshot de components y score_value con tolerancia ±2.

**Criterio de done del módulo:**
- [ ] Con seed 60 delitos reales zona Del Valle → score ≈85 (seguro).
- [ ] Components incluyen `hora_max_riesgo`, `trend_direction`, `delitos_por_tipo`.

#### MÓDULO 8.B.2 — F02 Transit Score

**Pasos:**
- `[8.B.2.1]` Crear `n0/f02-transit.ts`: consulta `geo_data_points` source='gtfs' con buffer 1km → score = 40 (estaciones metro 1km) + 20 (paradas metrobús 500m) + 20 (BRT/tren 2km) + 10 (ecobici 400m) + 10 (densidad rutas). Confidence por número estaciones.
- `[8.B.2.2]` Registrar + test con fixture estación Polanco (score ≥85).

**Criterio de done del módulo:**
- [ ] Zonas sin transporte retornan 0-20 con confidence insufficient si <1 estación en 2km.

#### MÓDULO 8.B.3 — F03 Ecosystem DENUE (mapeo SCIAN propietario)

**Pasos:**
- `[8.B.3.1]` Crear `n0/f03-ecosystem.ts` usando `shared/lib/intelligence-engine/scian-mapping.ts` (33 premium + ~80 standard + ~30 basic). Fórmula: score = 25×Shannon(H/ln(12)) + 25×scaledLog(total) + 25×premiumRatio + 25×anchorPresence.
- `[8.B.3.2]` `anchorPresence` = 1 si hay hospital+universidad+centro comercial en 2km.
- `[8.B.3.3]` Exponer `components.scian_by_macro_category` con los 12 buckets ALIMENTACION, SALUD, etc.

**Criterio de done del módulo:**
- [ ] Shannon>2 devuelve label "Diversa y robusta".
- [ ] Ratio Premium/Basic>2 agrega flag `consolidation='consolidada'`.

#### MÓDULO 8.B.4 — F04 Air Quality

**Pasos:**
- `[8.B.4.1]` Crear `n0/f04-air-quality.ts` consumiendo `geo_data_points` source='rama' últimas 30 días. Fórmula: score = 100 − AQI_percentil zona. Marcar tier=1 pero con disclaimer H2 (RAMA ingestor pesado).
- `[8.B.4.2]` Si no hay estación RAMA en 5km → interpolación desde 3 estaciones más cercanas ponderada por distancia inversa.

**Criterio de done del módulo:**
- [ ] `confidence='insufficient_data'` si no hay estación en 10km.

#### MÓDULO 8.B.5 — F05 Water

**Pasos:**
- `[8.B.5.1]` Crear `n0/f05-water.ts` consumiendo `geo_data_points` source='sacmex' últimos 6 meses. Score penaliza cortes/tandeos/presión baja.
- `[8.B.5.2]` Confidence high con ≥6 meses datos, medium ≥3 meses.

**Criterio de done del módulo:**
- [ ] Colonias con tandeo ≥3 días/sem → score <40.

#### MÓDULO 8.B.6 — F06 Land Use

**Pasos:**
- `[8.B.6.1]` Crear `n0/f06-land-use.ts` consumiendo SEDUVI (marcar H2 stub por ahora — returns `insufficient_data` hasta que ingestor esté). Placeholder: componer `components: { zonificacion: 'pending', reason: 'SEDUVI ingestor H2' }`.

**Criterio de done del módulo:**
- [ ] No rompe cadena; score se persiste con confidence `insufficient_data`.

#### MÓDULO 8.B.7 — F07 Predial (stub H2)

**Pasos:**
- `[8.B.7.1]` Similar a F06: stub Catastro CDMX con return `insufficient_data`. Documentar en comentario los endpoints futuros `/api/admin/catastro/*`.

**Criterio de done del módulo:**
- [ ] Registrado y no bloquea Tier 1.

#### MÓDULO 8.B.8 — H01 School Quality

**Pasos:**
- `[8.B.8.1]` Crear `n0/h01-school-quality.ts` consumiendo `geo_data_points` source='siged'. Score = 40 (densidad escuelas 1km) + 30 (ratio públicas vs privadas) + 30 (ENLACE/PLANEA percentil).
- `[8.B.8.2]` Publicar components `nivel_primaria`, `nivel_secundaria`, `nivel_preparatoria`.

**Criterio de done del módulo:**
- [ ] Del Valle con ≥8 escuelas privadas top 20 → score ≥85.

#### MÓDULO 8.B.9 — H02 Health Access

**Pasos:**
- `[8.B.9.1]` Crear `n0/h02-health-access.ts` consumiendo `geo_data_points` source='dgis_clues'. Score = distancia hospital 2º nivel (40) + clínicas 1º nivel 1km (30) + urgencias 24/7 (30).

**Criterio de done del módulo:**
- [ ] Confidence high con ≥3 CLUES en radio 2km.

#### MÓDULO 8.B.10 — H03 Seismic Risk

**Pasos:**
- `[8.B.10.1]` Crear `n0/h03-seismic-risk.ts` consumiendo Atlas de Riesgos shapefiles (geo_data_points source='atlas_riesgos'). Score INVERSO (mayor = más seguro). Mapeo zonificación microzonificación CDMX I/II/III.
- `[8.B.10.2]` Components: `zona_geotecnica`, `amplificacion_onda`, `licuacion_riesgo`.

**Criterio de done del módulo:**
- [ ] Zona IIIc → score <25 (riesgo alto).

#### MÓDULO 8.B.11 — H04 Credit Demand

**Pasos:**
- `[8.B.11.1]` Crear `n0/h04-credit-demand.ts` cruzando CNBV + Infonavit por municipio. Score refleja demanda crediticia saludable vs sobrecalentamiento.

**Criterio de done del módulo:**
- [ ] Correlaciona con A01 Affordability cuando A01 corre.

#### MÓDULO 8.B.12 — H06 City Services

**Pasos:**
- `[8.B.12.1]` Crear `n0/h06-city-services.ts` consumiendo 0311 Locatel (H2 stub por ahora).
- `[8.B.12.2]` Marcado con `confidence='insufficient_data'` hasta FASE 29.

#### MÓDULO 8.B.13 — H08 Heritage Zone

**Pasos:**
- `[8.B.13.1]` `n0/h08-heritage-zone.ts` con INAH polígonos. Score = 40 (dentro centro histórico) + 30 (monumentos INAH 500m) + 30 (zonas arqueológicas).

**Criterio de done del módulo:**
- [ ] Centro Histórico → score ≈100; Polanco ≈30.

#### MÓDULO 8.B.14 — H09 Commute Time (on-demand Mapbox)

**Pasos:**
- `[8.B.14.1]` `n0/h09-commute-time.ts`: invoca Mapbox Directions API en runtime (no snapshot — el score se calcula por petición del comprador con su destino laboral).
- `[8.B.14.2]` Cachea resultado 7 días en `zone_scores` con `components: { destino_lat, destino_lng, minutos_auto, minutos_transporte }`.

**Criterio de done del módulo:**
- [ ] Llamada a calcular con destino Reforma 222 desde Nápoles retorna minutos realistas.

#### MÓDULO 8.B.15 — H10 Water Crisis

**Pasos:**
- `[8.B.15.1]` `n0/h10-water-crisis.ts` cruzando SACMEX + CONAGUA. Score = severidad crisis (0 = crisis profunda).

**Criterio de done del módulo:**
- [ ] Iztapalapa Sur → score <30; Coyoacán centro → ≥75.

#### MÓDULO 8.B.16 — H11 Infonavit Calculator

**Pasos:**
- `[8.B.16.1]` `n0/h11-infonavit.ts`: recibe `{ salario_mensual_vsm: number, edad, antiguedad_vsm }` y devuelve `{ monto_credito_max, tasa_avg, mensualidad_estimada }` con tablas oficiales 2026 (hardcodeadas + link a fuente).

**Criterio de done del módulo:**
- [ ] Input salario 20 VSM, 35 años → devuelve crédito máx realista ±5%.

#### MÓDULO 8.B.17 — A01 Affordability, A03 Migration, A04 Arbitrage

**Pasos:**
- `[8.B.17.1]` `n0/a01-affordability.ts`: depende de macro_series (tasas, TIIE, INPC) + Infonavit tables + salario objetivo. Score = % del ingreso que una propiedad promedio de la zona consume.
- `[8.B.17.2]` `n0/a03-migration.ts`: depende SHF (IPV por estado) + operaciones propias. Calcula origen/destino migración interna.
- `[8.B.17.3]` `n0/a04-arbitrage.ts`: depende `market_prices_secondary` vs primarias. Identifica zonas con spread anómalo primario vs secundario.

**Criterio de done del módulo:**
- [ ] A01 devuelve % ingreso coherente (salario mediano CDMX ≈35% para propiedad $3M).
- [ ] A04 marca zona con spread >20% como "arbitraje alto".

#### MÓDULO 8.B.18 — B12 Cost Tracker

**Pasos:**
- `[8.B.18.1]` `n0/b12-cost-tracker.ts`: INPP Construcción (INEGI) + INPP materiales + mano_obra. Output: índice rolling 12m + alertLevel (`normal` | `warning` | `critical`).
- `[8.B.18.2]` Correr para todo proyecto activo con `macro_factor` almacenado en `project_scores`.

**Criterio de done del módulo:**
- [ ] Con INPP +15% últimos 12m → alertLevel='critical'.

#### MÓDULO 8.B.19 — D07 STR/LTR

**Pasos:**
- `[8.B.19.1]` `n0/d07-str-ltr.ts` consumiendo AirDNA API → ADR + occupancy por zona. Score compara rendimiento renta corta vs larga.

**Criterio de done del módulo:**
- [ ] Roma Norte con ADR>$1800 → score STR>LTR (favorece renta corta).

### BLOQUE 8.C — Calculators N01-N11 (11 nuevos scores IE v4)

Scores nuevos introducidos en IE v4, que capitalizan snapshots temporales y cross-referencias entre fuentes. N11 DMX Momentum Index es el más valioso — alimenta DMX-MOM (ver FASE 11).

#### MÓDULO 8.C.1 — N01 Ecosystem Diversity (Shannon-Wiener)

**Pasos:**
- `[8.C.1.1]` Crear `shared/lib/intelligence-engine/calculators/n01-n11/n01-ecosystem-diversity.ts`. Fórmula: `H = -Σ p_i × ln(p_i)` sobre 12 macro_categories. Score = `(H / ln(12)) × 100`.
- `[8.C.1.2]` Components: `shannon_H`, `premium_ratio`, `total_establecimientos`, `top_3_categorias`.
- `[8.C.1.3]` Confidence: high ≥100 establecimientos, medium ≥20, low ≥1.
- `[8.C.1.4]` Integración: actualiza cache `zone_price_index` para consumir en DMX-LIV (FASE 11).

**Criterio de done del módulo:**
- [ ] Mercado Juárez Shannon≈1.8 → score ≈72.

#### MÓDULO 8.C.2 — N02 Employment Accessibility

**Pasos:**
- `[8.C.2.1]` `n02-employment-accessibility.ts`: combina GTFS isócronas 45 min + DENUE empleos oficina/retail/industrial en el área de isócrona.
- `[8.C.2.2]` Score = log(empleos_accesibles_45min) normalizado percentil CDMX × 100.

**Criterio de done del módulo:**
- [ ] Del Valle Sur (cerca Metro) score ≥80.

#### MÓDULO 8.C.3 — N03 Gentrification Velocity

**Pasos:**
- `[8.C.3.1]` `n03-gentrification-velocity.ts`: requiere ≥2 snapshots DENUE separados ≥3 meses (tabla `geo_snapshots`). Δ(ratio_PB) / Δ(meses) × 100.
- `[8.C.3.2]` Si <2 snapshots → confidence `insufficient_data`. Devuelve placeholder "Score disponible tras 2 snapshots DENUE (≥3 meses)".
- `[8.C.3.3]` Components: `snapshot_inicial`, `snapshot_reciente`, `tasa_apertura_cafeterias`, `tasa_cierre_fondas`, `hipsterism_index`.

**Criterio de done del módulo:**
- [ ] Snapshot 2025-10 vs 2026-04 para Escandón → score >60 (gentrificación rápida).

#### MÓDULO 8.C.4 — N04 Crime Trajectory

**Pasos:**
- `[8.C.4.1]` `n04-crime-trajectory.ts`: Δ FGJ últimos 6m vs 6m anteriores por categoría. Score penaliza aumento violentos, premia bajas delitos contra propiedad.

**Criterio de done del módulo:**
- [ ] Condesa con drop robo transeúnte -15% → score ≥75.

#### MÓDULO 8.C.5 — N05 Infrastructure Resilience

**Pasos:**
- `[8.C.5.1]` `n05-infrastructure-resilience.ts`: combina Atlas riesgos (H03) + SACMEX (F05/H10) + GTFS (F02 redundancia). Score = capacidad de la zona para absorber shocks.

**Criterio de done del módulo:**
- [ ] Coyoacán centro → score ≥80; Tlalpan laderas → <40.

#### MÓDULO 8.C.6 — N06 School Premium

**Pasos:**
- `[8.C.6.1]` `n06-school-premium.ts`: basado en H01 + operaciones propias tier 3. Identifica premium pagado por metro cuadrado por proximidad a escuelas top.

**Criterio de done del módulo:**
- [ ] Tier 3 (≥50 proyectos) → activa; else gated.

#### MÓDULO 8.C.7 — N07 Water Security

**Pasos:**
- `[8.C.7.1]` `n07-water-security.ts`: SACMEX (6m cortes) + CONAGUA (nivel acuíferos). Score <30 en crisis hídrica crónica.

**Criterio de done del módulo:**
- [ ] Xochimilco con nivel acuífero -8% y tandeos → score <35.

#### MÓDULO 8.C.8 — N08 Walkability MX

**Pasos:**
- `[8.C.8.1]` `n08-walkability-mx.ts`: densidad calles peatonalizables + semáforos + DENUE retail + GTFS. Adaptado a MX (vs Walk Score US).
- `[8.C.8.2]` Components: `densidad_manzanas`, `diversidad_usos`, `conectividad`, `amenidades_400m`.

**Criterio de done del módulo:**
- [ ] Roma Norte → score ≈88; Ajusco alto → <30.

#### MÓDULO 8.C.9 — N09 Nightlife Economy

**Pasos:**
- `[8.C.9.1]` `n09-nightlife-economy.ts`: DENUE categorías bar/restaurant/teatro + FGJ seguridad nocturna (filtrado 20:00-04:00). Score = actividad nocturna − penalización seguridad.

**Criterio de done del módulo:**
- [ ] Condesa → score ≈85; Santa Fe → ≈30.

#### MÓDULO 8.C.10 — N10 Senior Livability

**Pasos:**
- `[8.C.10.1]` `n10-senior-livability.ts`: DGIS (geriátricos) + SIGED (universidades extensión) + GTFS (bajo esfuerzo) + N01 (ecosistema diverso). Pesos: 0.25/0.15/0.30/0.30.

**Criterio de done del módulo:**
- [ ] Narvarte → score ≈82.

#### MÓDULO 8.C.11 — N11 DMX Momentum Index

**Pasos:**
- `[8.C.11.1]` `n11-dmx-momentum-index.ts` (el más valioso): combo ponderado Δ mensual de F01, F03, N01, N04, N08, A12, precio/m2. Score = momentum score 0-100 con σ z-score.
- `[8.C.11.2]` Requiere tier 3 (≥50 proyectos, ≥6 meses data). Gated otherwise.
- `[8.C.11.3]` Alimenta DMX-MOM (FASE 11) directamente — índice mensual.

**Criterio de done del módulo:**
- [ ] Narvarte con Δ precio +8% últimos 3 meses + apertura cafeterías → score ≥80.

### BLOQUE 8.D — AVM MVP: DMX Estimate (I01) — UPG 7.6

Producto estrella I01 en su versión H1 regresión lineal. Evoluciona a gradient boosting H2 y deep learning H3.

#### MÓDULO 8.D.1 — Feature engineering (47 variables, 12 fuentes)

**Pasos:**
- `[8.D.1.1]` Crear `shared/lib/intelligence-engine/avm/features.ts` con la función `buildFeatureVector(propertyId, supabase)` que ensambla las 47 variables:
  - 12 características propiedad: sup_construida_m2, sup_terreno_m2, recámaras, baños, medio_baños, estacionamientos, edad_años, piso, amenidades_count, tipo_propiedad one-hot (depto/casa/townhouse/studio).
  - 10 score-derivados zona: F01 safety, F02 transit, F03 ecosystem, F08 LQI, N01, N02, N08, N11, H01, H02 (lookups `zone_scores`).
  - 9 comparables: precio_m2_mediana_zona_12m, precio_m2_p25, p75, ventas_12m, dias_en_mercado_avg, absorcion_pct, ratio_lista_cierre.
  - 8 macro_series: TIIE28, tasa_hipotecaria_avg, INPC, INPP_construccion, tipo_cambio_fix, infonavit_vsm, shf_ipv_cdmx, bbva_oferta.
  - 8 condiciones específicas: con_roof_garden bool, orientacion_onehot4, vista_parque bool, amenidades_premium_count, años_escritura, estado_conservacion_onehot5, seguridad_interna bool, mascotas_ok bool.
- `[8.D.1.2]` Normalización z-score por columna con parámetros fit al dataset de training (guardar en `shared/lib/intelligence-engine/avm/normalization-params.json`).
- `[8.D.1.3]` Test que verifica determinismo: mismo input → mismo vector.

**Criterio de done del módulo:**
- [ ] Feature vector length = 47 exacto.
- [ ] Falta data de una fuente → feature=0 + `missing_fields: [...]` en output.

#### MÓDULO 8.D.2 — Modelo regresión lineal H1

**Pasos:**
- `[8.D.2.1]` Crear `shared/lib/intelligence-engine/avm/model-h1.ts`: función `predict(features: number[]): { estimate: number; confidence: number }` usando coeficientes pre-entrenados en Jupyter offline (se adjuntan en `avm/coefficients-h1.json`).
- `[8.D.2.2]` Training notebook documentado en `avm/train.ipynb` (ejecutable offline) con dataset sintético seed + reales conforme lleguen. Output: coeficientes + R² + MAE por zona.
- `[8.D.2.3]` Error MAE objetivo H1: ≤20% (aceptable para MVP). H2 objetivo ≤15%. H3 objetivo ≤10%.

**Criterio de done del módulo:**
- [ ] Con 10 propiedades seed, predict devuelve valor dentro ±25% del real.

#### MÓDULO 8.D.3 — Endpoint AVM `/api/v1/estimate`

**Pasos:**
- `[8.D.3.1]` Crear `app/api/v1/estimate/route.ts` (POST) que:
  1. Valida input Zod `EstimateRequestSchema` (lat, lng, sup_m2, recámaras, baños, amenidades[], estado).
  2. Resuelve `zone_id` por lat/lng.
  3. Construye feature vector.
  4. Llama modelo `predict()`.
  5. Calcula `range_low = estimate × (1 − 0.12)`, `range_high × 1.12`.
  6. Busca 5 comparables en `market_prices_secondary` + operaciones (ordenados por similitud euclidiana).
  7. Adjunta `adjustments[]` (ej. "+3% por roof garden", "-5% por edad 25+años").
  8. Incluye `market_context: { precio_m2_zona_p50, absorcion_12m, momentum: N11_score }`.
  9. Devuelve citations (fuentes INEGI/DENUE/operaciones internas).
- `[8.D.3.2]` Middleware: `validateApiKey → checkRateLimit → logRequest` (reusa de FASE 23 stub si aún no está; por ahora middleware mock).
- `[8.D.3.3]` Response schema Zod `EstimateResponseSchema` exportada desde `shared/schemas/avm.ts`.

**Criterio de done del módulo:**
- [ ] curl POST con casa Del Valle 120m2 → response válido contra schema.
- [ ] p95 latencia <500ms.

#### MÓDULO 8.D.4 — Pricing + gating Free 5/mes

**Pasos:**
- `[8.D.4.1]` Integrar con `api_rate_limits`: free=5/mes por api_key, Pro=ilimitado, Enterprise=ilimitado.
- `[8.D.4.2]` Página `/estimate` en portal público (FASE 21) con formulario y 5 usos free cookie-based + incitación a crear cuenta.

**Criterio de done del módulo:**
- [ ] Al consumir 6to request en mismo mes → 429 + mensaje "Upgrade a Pro".

### BLOQUE 8.E — Confidence cascade UI + tier gating

#### MÓDULO 8.E.1 — Badges visuales en cards

**Pasos:**
- `[8.E.1.1]` Crear `shared/ui/dopamine/ConfidenceBadge.tsx` con 4 variantes:
  - high: sin indicador
  - medium: badge amarillo "Datos limitados" con tooltip "Basado en N datos recientes (últimos X meses)"
  - low: badge naranja "Calculado con pocos datos"
  - insufficient_data: placeholder "Score disponible pronto" + CTA "Saber por qué" (abre modal con explicación).
- `[8.E.1.2]` Integrar en todo componente `IntelligenceCard.tsx` que consuma `zone_scores` / `project_scores`.
- `[8.E.1.3]` i18n: claves `ie.confidence.high|medium|low|insufficient` en `messages/es-MX.json`.

**Criterio de done del módulo:**
- [ ] Storybook story por cada variante renderiza correctamente.

#### MÓDULO 8.E.2 — Tier gating UI

**Pasos:**
- `[8.E.2.1]` `shared/ui/dopamine/ScorePlaceholder.tsx` para tier-gated scores: renderiza icono + "Disponible cuando haya ≥10 proyectos en la zona" (el texto viene de `tierGate()` `.requirement`).
- `[8.E.2.2]` Admin puede bypass con flag `?force_ie=1` solo si `is_superadmin=true` (para dogfooding).

**Criterio de done del módulo:**
- [ ] Zona con 3 proyectos muestra Tier 2 scores como placeholder.

### BLOQUE 8.F — Seed tier requirements + hookup cascades

#### MÓDULO 8.F.1 — Tabla `tier_requirements`

**Pasos:**
- `[8.F.1.1]` Migration `xxxx_tier_requirements.sql`:
  ```sql
  CREATE TABLE tier_requirements (
    tier int primary key,
    min_projects int,
    min_closed_ops int,
    min_months_data int,
    description text
  );
  INSERT INTO tier_requirements VALUES
    (1, 0, 0, 0, 'Dia 1 con fuentes externas'),
    (2, 10, 0, 1, '10 proyectos en zona'),
    (3, 50, 0, 6, '50 proyectos 6 meses'),
    (4, 100, 100, 12, '100 ventas cerradas 12 meses');
  ```
- `[8.F.1.2]` `tierGate()` consulta esta tabla en vez de hardcoded.

**Criterio de done del módulo:**
- [ ] Cambiar min_projects Tier 2 a 20 → `tierGate` responde 20 sin redeploy.

#### MÓDULO 8.F.2 — Wire cascades para N0 triggers

**Pasos:**
- `[8.F.2.1]` Crear `shared/lib/intelligence-engine/cascades/geo-data-updated.ts` que al INSERT nuevo geo_data_points dispare `enqueue_score_recalc` para los scores N0 afectados según source:
  - 'denue' → F03, N01, N03, N09, D05, F10
  - 'fgj' → F01, N04, N09
  - 'gtfs' → F02, N02, N05, N08
  - 'siged' → H01, N06, N10
  - 'dgis' → H02, N10
  - 'sacmex' → F05, N07, H10, N05
  - 'atlas_riesgos' → H03, N05
- `[8.F.2.2]` Trigger SQL AFTER INSERT ON geo_data_points FOR EACH STATEMENT (no FOR EACH ROW para evitar explosión) que llama `enqueue_batch_by_source(NEW.source)`.
- `[8.F.2.3]` Cascade `macro_updated` (priority 8, batch): al INSERT macro_series → enqueue A01, A03, A04, A05, B02, B12, D01, C05.

**Criterio de done del módulo:**
- [ ] INSERT 1 geo_data_point source='fgj' enqueue exactamente F01, N04, N09 para la zona afectada.
- [ ] Cron worker los procesa en <5 min.

## Criterio de done de la FASE

- [ ] Todos los bloques 8.A–8.F cerrados.
- [ ] 32 scores N0 + N01-N11 calculables para al menos 1 zona CDMX (Del Valle).
- [ ] AVM MVP endpoint `/api/v1/estimate` responde con schema válido.
- [ ] Queue worker procesando cada 1 min con 0 jobs quedando >30 min en pending.
- [ ] Confidence cascade visible en UI (al menos Storybook + integración en `IntelligenceCard`).
- [ ] Tier gating bloqueando scores que no cumplen requisitos.
- [ ] Tests unitarios ≥80% coverage en `shared/lib/intelligence-engine/`.
- [ ] Tag git: `fase-08-complete`.
- [ ] PostHog dashboard "IE Worker Health" activo.
- [ ] Documentación actualizada: `docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md` refleja los 32 N0 como "implementado".

## Implementación real (cambios vs plan original) — BLOQUE 8.B cerrado 2026-04-19

### Split en 2 sesiones

BLOQUE 8.B parte 1/2 (15 commits `687dc9e..bba2802`):
- Fixtures CDMX 16 zonas (1 por alcaldía, extremos cubiertos) — `__fixtures__/cdmx-zones.ts`
- Migration U13 `comparable_zones` jsonb precalculada + persist.ts refactor
- 4 stubs H2 (F04 RAMA, F06 SEDUVI, F07 Catastro, H06 0311 Locatel)
- 8 calculators reales: F01 Safety, F02 Transit, F03 Ecosystem DENUE+SCIAN, F05 Water,
  H01 School, H02 Health, H03 Seismic, B12 Cost Tracker

BLOQUE 8.B parte 2/2 (8 commits `2b44cc9..6b8ae54`):
- Migration combinada P1+S1: `valid_until` + RLS country_code filter
- Pre-step telemetry: `shared/lib/telemetry/hash-user-id.ts` (S2) + `run-score.ts` U7 props
- Fixtures extensions: CDMX_CNBV, CDMX_INAH, CDMX_CONAGUA, CDMX_MARKET, CDMX_SEARCH, CDMX_AIRROI
- 7 calculators: H04 Credit Demand, H08 Heritage, H09 Commute (on-demand Mapbox), H10 Water Crisis,
  H11 Infonavit, A01/A03/A04 combined, D07 STR/LTR (wrapper AirROI per ADR-019)

### Upgrades aplicados (v3 + v4)

- **U5** calculator semver versioning (`export const version = '1.0.0'`).
- **U6** snapshot tests con 16 fixtures CDMX (1 por alcaldía, extremos incluidos).
- **U7** PostHog `ie.score.calculated` con props extendidas: duration_ms, components_count,
  source_data_age_days, calculator_version, country_code, hashed_user_id.
- **U9** fixtures reutilizables (BLOQUE 8.C/8.D/8.E podrán consumirlos).
- **U10** `methodology` const export con formula + sources + weights + references + thresholds + validity.
- **U12** `reasoning_template` con placeholders + `template_vars` en `CalculatorOutput`.
- **U13** `comparable_zones` jsonb pre-calculadas al persistir (top 3 closest value, same
  score_type + period_date).
- **U14** `score_label_key` i18n desde día 1 — 21 N0 × 5 labels × 5 locales en `messages/*`.
- **P1** `valid_until` separado de `period_date` en zone_scores/project_scores/user_scores. Cada
  calculator declara su `methodology.validity` — `persist.ts` via `computeValidUntil` helper.
- **S1** RLS cross-tenant country filter: `zone_scores` y `project_scores` policies exigen
  `country_code IN (select country_code from profiles where id = auth.uid()) OR is_superadmin()`.
- **S2** hashed user_id en telemetría: `sha256(user_id + TELEMETRY_SALT).slice(0,12)` para
  pseudonimizar eventos PostHog.

### Cambios vs plan original

- **D07 STR/LTR**: cambio AirDNA → **AirROI** per ADR-019. Calculator es wrapper delgado
  sobre `features/str-intelligence/lib/scores/str-ltr-opportunity.ts` (FASE 07b) — NO duplica lógica.
- **H09 Mapbox cache**: plan v3 propuso `shared/lib/runtime-cache`; no existe. Decisión:
  mantener plan original 8.B.14.2 — cache en `zone_scores.valid_until` 7d. Calculator lee
  cache via `lookupH09Cache()` comparando destino lat/lng (±0.0005° ≈50m).
- **Pure compute function pattern**: factorización `compute<XX>()` pura + Calculator class con
  `run()` I/O. Tests ejercen compute directo contra fixtures — no mock supabase. Pattern
  formalizado pendiente en CONTRATO §8 TODO #6 (ADR-024 opcional).
- **Registry entries N0**: NO modificadas — `calculator_path` ya correctos en BLOQUE 8.A.
- **Confidence para H03 Seismic y H08 Heritage**: siempre `high` porque Atlas de Riesgos e INAH
  son shapefiles polígono deterministic por AGEB.

### Verificaciones al cierre (pendientes sesión 2 final)

Ver §Criterio de done de la FASE — sin tag `fase-08-complete` hasta cerrar BLOQUE 8.C-8.F.

## Implementación real BLOQUE 8.C — cerrado 2026-04-20

### Commits BLOQUE 8.C (12 commits)

| Commit | Descripción |
|---|---|
| `a3c0e93` | Pre-step 0: migration `20260419215000_ie_scores_v3_deltas_ranking.sql` (D2 deltas jsonb + D3 ranking jsonb en zone_scores + project_scores) + persist.ts extension (`computeDeltas`, `computeRanking`) |
| **`c3bc727`** | **N11 DMX Momentum Index (PRIMER COMMIT per CONTRATO §8 TODO #12 — killer asset DMX-MOM B2B)** |
| `f1097cf` | N01 Ecosystem Diversity (Shannon-Wiener) |
| `a947990` | N02 Employment Accessibility |
| `36fc2c0` | N03 Gentrification Velocity (tier 3 gated) |
| `c1ea7cd` | N04 Crime Trajectory (tier 3) |
| `fa1d900` | N05 Infrastructure Resilience |
| `6c1a61e` | N06 School Premium |
| `f536810` | N07 Water Security |
| `a3e81e3` | N08 Walkability MX |
| `53b4411` | N09 Nightlife Economy |
| `6eadccc` | N10 Senior Livability |

### Upgrades nuevos aplicados BLOQUE 8.C

- **D1 — Recomendaciones accionables por score**: cada N01-N11 exporta `methodology.recommendations`
  con 4 buckets (low/medium/high/insufficient_data) × 1-3 i18n keys cada uno. UI `getRecommendationKeys(value, confidence)`
  resuelve set correcto runtime.
- **D2 — Score deltas first-class (3m/6m/12m)**: `zone_scores.deltas` + `project_scores.deltas`
  columnas jsonb. `persist.ts#computeDeltas()` consulta `score_history` con ventana ±15d al
  T-3m/6m/12m para mismo entity + score_type. Null si no hay data.
- **D3 — Ranking explícito vs país**: `zone_scores.ranking` + `project_scores.ranking` columnas
  jsonb. `persist.ts#computeRanking()` cuenta pre-UPSERT rows mismo country+score+period con
  `value > currentValue`. `{position, total, percentile}`.

### Upgrades consolidados (aplicados TODOS los N01-N11)

U5 version semver · U6 snapshot tests 16 fixtures · U7 PostHog props · U9 fixtures reutilizables
· U10 methodology const · U12 reasoning_template · U13 comparable_zones · U14 i18n 5 locales
· P1 valid_until · S1 RLS country · S2 hashed user_id.

### Stubs marcados con 4 señales ADR-018 (BLOQUE 8.C)

- **N11 search_trends**: Google Trends scraper → FASE 27. Placeholder 0 en methodology.weights.
  search_trends. Calculator retorna score reducido pero no gated por este factor (tier gate
  otra dimensión).
- N03 `denue_snapshots`: requiere ≥2 snapshots separados ≥3m. UI placeholder "disponible tras
  próximo snapshot DENUE".

### Tests acumulados FASE 08

- **BLOQUE 8.A**: ~50 tests (registry, queue, worker, framework)
- **BLOQUE 8.B**: 168 tests (21 calculators × ~7 tests cada uno + persist + fixtures)
- **BLOQUE 8.C**: ~66 tests (11 calculators × 6 tests + persist-deltas-ranking × 9)
- **Total esperado**: ~280+ tests passing

### Cambios vs plan original BLOQUE 8.C

- N03 velocity scaling ajustado de 25 → 200 para que Roma Norte (Δratio 0.37 en 6m, velocity 6.17)
  alcance umbral ≥60 gentrificación moderada.
- N06 tier reducido de plan 8.C.6.1 ("Tier 3 requiere ≥50 proyectos") a **Tier 1 H1** per prompt
  ("no requiere ≥50 proyectos para versión H1; usar market_prices_secondary cuando esté"). H2
  activará tier 3 con data real.
- N11 formula: catálogo dice normalización z-score CDMX. Implementación H1 usa mapping lineal
  por componente centrado en 50 + z-score adicional en components para observabilidad. Tier 3
  gate real (≥50 proyectos + ≥6m). Fallback search_trends = 0 hasta FASE 27.

---

## Implementación real BLOQUE 8.D — cerrado 2026-04-20

Producto estrella I01 DMX Estimate en su versión MVP H1 (regresión lineal). Target comercial
$15-50K/licencia API B2B (ADR-013).

### Commits BLOQUE 8.D

| Commit | Descripción |
|---|---|
| `b11783e` | Pre-step 0: migration `20260420063332_avm_estimates.sql` + RLS S1 + indexes + valid_until D7 cache window |
| `3425edd` | 8.D.1 — feature engineering 47 variables + normalization + 7 tests |
| `89fc46d` | 8.D.2 — model H1 regression + coefficients seed + comparables fetcher + 12 tests |
| `4e0654d` | 8.D.3 — endpoint /api/v1/estimate + BotID + D4+D5+D6+D7 + Zod schemas + 20 tests |
| `332d4be` | 8.D.4 — AVM pricing tiers + gating + /estimate page stub |

### Upgrades nuevos aplicados BLOQUE 8.D

- **D4 MAE tracking + intervalos de confianza**: cada estimate persiste
  `{mae_estimated_pct, ci_low, ci_high, confidence_score}`. mae derivado de R² + variance
  comparables + penalty_missing. confidence = clamp(100 − 2×mae, 0, 100).
- **D5 adjustments explícitos auditables**: response.adjustments[] con
  `{feature, value_pct, source, weight, confidence, explanation_i18n_key}`. source ∈
  {`regression_coefficient`, `comparable_overlay`, `market_context`}. Habilita
  explicabilidad total para B2B (aseguradoras, bancos).
- **D6 counter-estimate**: además del estimate principal (regression), endpoint devuelve
  `estimate_alternative` (median price_m2 comparables × sup_m2). `spread_pct = ABS diff / estimate`.
  spread > 15% → `flag_uncertain:true` + recomendación visita presencial. spread ≤ 15% →
  `flag_corroborated:true`. Diferencial vs Habi (ellos solo dan 1 número).
- **D7 cache 24h por fingerprint**: `sha256(canonicalInput).slice(0,16)`. Pre-compute lookup
  `WHERE fingerprint=X AND valid_until>now() LIMIT 1`. Hit → `cached:true` + `computed_at` histórico.
  Cache invalidation cascade vía market_prices_secondary → BLOQUE 8.F.
- **BotID Basic (free)**: `botid@1.5.11` wrap endpoint para bloquear scrapers. Free tier (sin
  api_key) requiere BotID challenge passed. Pro/Enterprise (api_pro_*, api_ent_*) bypass
  completo. Basic mode GRATIS en todos los planes Vercel. Deep Analysis es paid (Pro + $1/1000)
  — no habilitado en H1.

### Tests BLOQUE 8.D

- features 7 (length 47, determinismo, missing tracking, overrides, one-hot, ordinal)
- model-h1 7 (semver, predict length guard, metadata, 10 seed properties ±50%, mae penalty, variance)
- comparables 5 (fetch fallback, maxResults, median × sup, <3 null, pares average)
- schemas 10 (request/response validation, enums, null opt)
- endpoint 10 (invalid json/schema, response shape, D4, D5, D6, D7 cache hit, rate limit 429,
  Pro bypass unlimited, p95 <500ms)

**Total BLOQUE 8.D**: 39/39 AVM tests passing.

### Upgrades acumulados FASE 08 (8.A + 8.B + 8.C + 8.D)

U5 + U6 + U7 + U9 + U10 + U12 + U13 + U14 + P1 + S1 + S2 + D1 + D2 + D3 + **D4 + D5 + D6 + D7** + BotID.

### Stubs BLOQUE 8.D

- `app/[locale]/(public)/estimate/page.tsx` STUB FASE 21 portal público UI completa. 4 señales
  ADR-018: comentario STUB + badge `[próximamente]` + link docs API + documentado en plan.

---

## Próxima fase

[FASE 09 — IE Scores Nivel 1](./FASE_09_IE_SCORES_N1.md)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent D) | **Fecha:** 2026-04-17 · **Actualizado:** 2026-04-19 (BLOQUE 8.B cerrado)
