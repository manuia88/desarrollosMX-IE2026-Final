# BIBLIA DMX v5 — INTELLIGENCE ENGINE COMPLETO
## PART 5 de 5: Cascadas_Productos_Competencia
## Contenido ÍNTEGRO de IE_DMX_v4_PART5
## Fase: Sesiones 07-13 (IE)
---
# BIBLIA IE — DesarrollosMX v4
## Intelligence Engine: Cascadas · Productos Licenciables · Competencia · Fases H1/H2/H3
## PART 5 de 5 (Módulos 11–13)
## Fecha: 8 abril 2026

---

# MÓDULO 11: 6 CASCADAS + TIER SYSTEM + PRE-CARGA

## 11.1 Las 6 Cascadas de Recálculo

Cada cascada define: qué evento dispara recálculos, qué scores se recalculan, en qué orden, con qué prioridad, y si es batch o individual.

---

### Cascada 1: Venta de Unidad (unit_sold)

```
Trigger:    unidades UPDATE SET estado='vendido'
            → trigger T6 (trigger_webhooks) detecta estado cambió a vendido
            → unit_change_log INSERT (field='estado', new_value='vendido')
            → enqueueCascade('unit_sold', project_id)

Priority:   3 (directa, individual)
Batch mode: false

Scores recalculados (en orden):
  1. B08 Absorption Forecast    → project_scores (project_id)
     ↓ si B08 cambió >5%
  2. E01 Full Project Score     → project_scores (project_id)
  3. D02 Zona Ranking           → zone_scores (zone_id)
  4. B03 Pricing Autopilot      → project_scores (project_id)
  5. B09 Cash Flow              → project_scores (project_id)

Side effects:
  - inventory_snapshots INSERT (snapshot actualizado)
  - Notificación: asesores autorizados "Unidad X vendida en Proyecto Y"
  - Notificación: compradores watchlist "Unidad vendida — quedan N disponibles"
  - Webhook: event_type='unit_sold' → webhook_logs INSERT
  - PostHog: event 'unit_sold' con metadata
```

### Cascada 2: Cambio de Precio (price_changed)

```
Trigger:    unidades UPDATE WHERE OLD.precio != NEW.precio
            → trigger log_unit_changes INSERT unit_change_log
            → enqueueCascade('price_changed', project_id, unidad_id)

Priority:   3 (directa, individual)
Batch mode: false

Scores recalculados:
  1. A12 Price Fairness          → project_scores (project_id, unidad_id)
  2. A01 Affordability           → project_scores (project_id, unidad_id)
  3. A04 Arbitrage               → project_scores (project_id, unidad_id)
  4. A02 Investment Sim          → project_scores (project_id, unidad_id)
  5. B02 Margin Pressure         → project_scores (project_id)
  6. B03 Pricing Autopilot       → project_scores (project_id)
  7. E01 Full Project Score      → project_scores (project_id)

Side effects:
  - Notificación: compradores watchlist "Proyecto X ajustó precios"
  - Webhook: event_type='price_changed'
```

### Cascada 3: Dato Macro Actualizado (macro_updated) — BATCH

```
Trigger:    macro_series INSERT (nuevo dato de Banxico, INEGI, SHF, etc.)
            → enqueueCascade('macro_updated', serie_key)

Priority:   8 (batch masivo)
Batch mode: true

Jobs batch encolados:
  1. batch: recalculate_all_affordability
     batch_filter: { score_type: 'affordability', entity_type: 'all_units' }
     → 1 SQL UPDATE masivo para TODOS los A01 de TODAS las unidades
  
  2. batch: recalculate_all_migration
     batch_filter: { score_type: 'migration', entity_type: 'all_units' }
  
  3. batch: recalculate_all_absorption_macro_factor
     batch_filter: { score_type: 'absorption_forecast', entity_type: 'all_projects' }
  
  4. batch: recalculate_infonavit
     batch_filter: { score_type: 'infonavit_calc', entity_type: 'all' }
  
  5. individual (priority 3): D01 Market Pulse → zone_scores
  
  6. deferred: C05 Weekly Briefing incluirá el cambio macro (cron lunes)

CRÍTICO: Sin batch mode, un cambio de tasa Banxico con 1,500 desarrollos
y 15,000+ unidades generaría 15,000 jobs individuales de A01.
Con batch mode: 4 jobs batch + 1 individual + 1 deferred = 6 jobs total.
```

### Cascada 4: Datos Geo Actualizados (geo_data_updated) — BATCH

```
Trigger:    geo_data_points INSERT/UPDATE (nueva carga de DENUE, FGJ, GTFS, SACMEX, etc.)
            → enqueueCascade('geo_data_updated', source, affected_zone_ids)

Priority:   8 (batch masivo)
Batch mode: true

Jobs por fuente:

  source='denue':
    1. batch: recalculate_ecosystem_denue_affected_zones
    2. batch: recalculate_ecosystem_diversity_affected (N01)
    3. batch: recalculate_employment_accessibility_affected (N02)
    4. batch: recalculate_gentrification_velocity_affected (N03) — si hay ≥2 snapshots
    5. batch: recalculate_walkability_affected (N08)
    6. batch: recalculate_nightlife_affected (N09)
    7. batch: recalculate_senior_livability_affected (N10)
    8. batch: recalculate_momentum_affected (N11)
    ↓ después de zona scores
    9. batch: recalculate_lqi_affected (F08)
    10. batch: recalculate_value_scores_affected (F09)
    11. batch: recalculate_full_scores_affected (E01, G01)

  source='fgj':
    1. batch: recalculate_safety_affected_zones (F01)
    2. batch: recalculate_crime_trajectory_affected (N04)
    3. batch: recalculate_nightlife_affected (N09) — seguridad nocturna
    ↓
    4. batch: recalculate_lqi_affected (F08)
    5. batch: recalculate_risk_maps_affected (F12)
    6. batch: recalculate_momentum_affected (N11)

  source='sacmex':
    1. batch: recalculate_water_affected (F05)
    2. batch: recalculate_water_security_affected (N07)
    3. batch: recalculate_infrastructure_resilience_affected (N05)
    ↓
    4. batch: recalculate_lqi_affected (F08)
    5. batch: recalculate_momentum_affected (N11)

  source='gtfs':
    1. batch: recalculate_transit_affected (F02)
    2. batch: recalculate_employment_accessibility_affected (N02)
    3. batch: recalculate_infrastructure_resilience_affected (N05)
    4. batch: recalculate_walkability_affected (N08)
    ↓
    5. batch: recalculate_lqi_affected (F08)

  source='siged':
    1. batch: recalculate_school_quality_affected (H01)
    2. batch: recalculate_school_premium_affected (N06)
    ↓
    3. batch: recalculate_lqi_affected (F08)

  source='dgis':
    1. batch: recalculate_health_access_affected (H02)
    2. batch: recalculate_senior_livability_affected (N10)
```

### Cascada 5: Feedback Registrado (feedback_registered)

```
Trigger:    interaction_feedback INSERT
            → enqueueCascade('feedback_registered', project_id)

Priority:   5 (indirecta, individual)
Batch mode: false

Scores recalculados:
  1. B04 PMF → project_scores (recalcula con nuevo feedback)
     → si objeción='precio' representa >70% de feedbacks:
  2. B03 Pricing Autopilot → project_scores (ajustar sugerencia)
  3. C04 Objection Killer → ai_generated_content (regenerar argumentos)

Side effects:
  - Si objeción_precio > 70%: Notificación dev "Alerta: mayoría objeciones son precio"
```

### Cascada 6: Comportamiento de Búsqueda (search_behavior) — NUEVA v4

```
Trigger:    search_logs INSERT (comprador busca/filtra en marketplace)
            O wishlist INSERT (comprador guarda proyecto)
            O project_views INSERT (comprador ve ficha)
            → Acumulado: enqueueCascade('search_behavior') cada 1 hora (no por cada evento)

Priority:   10 (baja, refresh periódico)
Batch mode: true

Scores recalculados:
  1. batch: recalculate_demand_heatmap_all_zones (B01)
  2. batch: recalculate_pmf_all_projects (B04)
  3. batch: recalculate_buyer_persona_all_zones (H14)

Side effects:
  - search_trends UPDATE con datos internos (complementa Google Trends)
  - "Discover Weekly" se beneficia de datos frescos (cron lunes)

NOTA: Esta cascada es la que cierra el feedback loop del flywheel.
Cada búsqueda del comprador → mejora la demanda heatmap → mejora las
recomendaciones → el comprador encuentra mejor → más búsquedas.
```

## 11.1b Modelo de Confidence por Score

Cada score tiene un confidence_model implícito basado en sus inputs:

```
REGLA: confidence = f(disponibilidad de inputs, frescura de datos, volumen de datos)

POR NIVEL:
  Nivel 0 (datos crudos):
    high: fuente disponible + datos < 7 días + volumen >= umbral mínimo
    medium: fuente disponible + datos 7-30 días
    low: fuente disponible + datos > 30 días
    insufficient_data: fuente no disponible o sin registros en zona

  Nivel 1 (dependencias simples):
    Hereda el MÍNIMO confidence de sus inputs de Nivel 0
    Excepción: si > 50% inputs son insufficient → insufficient

  Nivel 2-3 (dependencias compuestas):
    Hereda el MÍNIMO confidence de sus inputs directos
    Si algún input tiene fallback (F08 puede funcionar sin F04) → no baja

  Nivel 4 (agregados):
    Promedio ponderado de confidence de sus componentes
    Si > 3 de los 10 componentes son insufficient → low

  Nivel 5 (AI generated):
    Siempre 'medium' (AI puede generar con datos parciales)
    Sube a 'high' si todos los inputs del prompt son high

UMBRALES POR FUENTE:
  DENUE: high >= 100 establecimientos en zona, medium >= 20, low >= 1
  FGJ: high >= 50 carpetas en zona/año, medium >= 10, low >= 1
  GTFS: high >= 3 estaciones en 1km, medium >= 1, low = 0 estaciones
  SACMEX: high >= 6 meses datos, medium >= 3 meses, low >= 1 mes
  macro_series: high = dato < 7 días, medium < 30 días, low < 90 días

UI: ScoreDisplay muestra badge de confidence:
  high → sin indicador (limpio)
  medium → badge amarillo "Datos limitados"
  low → badge naranja "Calculado con pocos datos"
  insufficient_data → placeholder "Score disponible pronto"
```

## 11.2 Implementación de Cascadas

```
/lib/intelligence-engine/cascades/

unit-sold.ts:
  export const UNIT_SOLD_CASCADE = {
    trigger: 'unit_sold',
    jobs: [
      { scoreType: 'absorption_forecast', entityType: 'project', priority: 3 },
      { scoreType: 'full_project_score', entityType: 'project', priority: 5, 
        condition: 'prev_score_changed_pct > 5' },
      { scoreType: 'zona_ranking', entityType: 'zone', priority: 5 },
      { scoreType: 'pricing_autopilot', entityType: 'project', priority: 5 },
      { scoreType: 'cash_flow', entityType: 'project', priority: 5 }
    ],
    sideEffects: ['inventory_snapshot', 'notify_brokers', 'notify_watchlist', 'webhook']
  }

price-changed.ts:    → 7 jobs, priority 3
macro-updated.ts:    → 6 jobs batch, priority 8
geo-data-updated.ts: → 5-11 jobs batch por fuente, priority 8
feedback-registered.ts: → 3 jobs, priority 5
search-behavior.ts:  → 3 jobs batch, priority 10 (NUEVO v4)
```

```typescript
// cascade.ts — orquestador

export function getCascadeJobs(
  eventType: string, 
  entityId: string,
  metadata?: Record<string, any>
): CascadeJob[] {
  const cascade = CASCADE_REGISTRY[eventType]
  if (!cascade) return []
  
  return cascade.jobs.map(job => ({
    ...job,
    entityId: job.entityType === 'zone' ? getZoneIdForEntity(entityId) : entityId,
    triggeredBy: eventType
  }))
}

export async function enqueueCascade(
  eventType: string,
  entityId: string,
  metadata?: Record<string, any>
): Promise<void> {
  const jobs = getCascadeJobs(eventType, entityId, metadata)
  
  for (const job of jobs) {
    await enqueueScoreRecalc(
      job.scoreType,
      job.entityType,
      job.entityId,
      job.triggeredBy,
      job.priority
    )
  }
  
  // Side effects
  const cascade = CASCADE_REGISTRY[eventType]
  for (const effect of cascade.sideEffects || []) {
    await executeSideEffect(effect, entityId, metadata)
  }
}
```

## 11.3 Tier System — Datos Día 1 vs Masa Crítica

```
TIER 1 — Funciona día 1 (solo fuentes externas, 0 datos propios):
  Zona:      F01 Safety, F02 Transit, F03 Ecosystem, F04 Air, F05 Water, F06 Land Use, F07 Predial
  Calidad:   H01 School, H02 Health, H03 Seismic, H08 Heritage, H09 Commute (on-demand), H10 Water Crisis
  Compuesto: F08 LQI (si componentes disponibles)
  Nuevos:    N01 Ecosystem Diversity, N02 Employment Access, N05 Infrastructure Resilience,
             N06 School Premium, N07 Water Security, N08 Walkability MX, N09 Nightlife,
             N10 Senior Livability
  Macro:     Banxico series, INEGI INPC/INPP, F16 Hipotecas Comparador
  Índices:   DMX-IDS (parcial), DMX-IRE (parcial), DMX-LIV (parcial)

TIER 2 — Funciona con 10+ proyectos:
  Comprador: A01 Affordability, A04 Arbitrage, A12 Price Fairness
  Zona:      F09 Value Score
  Dev:       B07 Competitive Intel, H05 Trust Score, B12 Cost Tracker
  Índice:    DMX-IPV, DMX-IAB

TIER 3 — Necesita masa crítica (50+ proyectos, 6+ meses de datos):
  Dev:       B01 Demand Heatmap, B08 Absorption Forecast, B03 Pricing Autopilot
  Mercado:   D05 Gentrification, D02 Zone Ranking
  Agregado:  E01 Full Project Score, G01 DMX Score
  Reportes:  I02 Market Report
  Nuevos:    N03 Gentrification Velocity (requiere ≥2 snapshots DENUE),
             N04 Crime Trajectory (requiere 12m FGJ), N11 Momentum (requiere datos temporales)
  Índice:    DMX-MOM (requiere snapshots), DMX-ICO

TIER 4 — Necesita calibración con transacciones reales (100+ ventas cerradas):
  Asesor:    C01 Lead Score calibrado, C03 Matching calibrado
  Dev:       B14 Buyer Persona calibrado
  Agregado:  E03 Predictive Close, E04 Anomaly Detector
  Producto:  I01 DMX Estimate (AVM)
```

## 11.4 Pre-carga de Datos

### Fase 1: CDMX (día 1, R0/R5a-2)
```
1. DENUE CDMX: ~200K establecimientos
   Ingestor: denue.ts → geo_data_points con mapeo SCIAN
   Peso: ~150MB en geo_data_points

2. FGJ Carpetas: ~100K registros último año
   Ingestor: fgj.ts → geo_data_points
   Peso: ~50MB

3. GTFS: ~300 estaciones + ~5,000 paradas
   Ingestor: gtfs.ts → geo_data_points
   Peso: ~5MB

4. Atlas Riesgos: ~500 AGEBs CDMX
   Ingestor: atlas-riesgos.ts → geo_data_points
   Peso: ~2MB

5. SIGED Escuelas: ~15K escuelas
   Ingestor: siged.ts → geo_data_points
   Peso: ~10MB

6. DGIS/CLUES Salud: ~5K establecimientos
   Ingestor: dgis.ts → geo_data_points
   Peso: ~3MB

7. SACMEX: ~2K registros cortes
   Ingestor: sacmex.ts → geo_data_points
   Peso: ~1MB

TOTAL GEO CDMX: ~820K registros, ~220MB

8. Macro Series: Banxico 5 años + INEGI 5 años + SHF + IMSS
   Peso: ~15K registros, ~2MB

TOTAL CDMX: ~835K registros, ~222MB
Supabase Pro plan: 8GB DB → sobra
```

### Fase 2: Top 10 Ciudades México (semana 2-4, paralelo con R1-R2)
```
Por ciudad: DENUE (nacional, filtrar) + SIGED (nacional) + DGIS (nacional)
Volumen: ~300K registros × 9 ciudades = ~2.7M registros adicionales
Storage: ~700MB adicionales
TOTAL con CDMX: ~3.5M registros, ~920MB
```

### Orden de ejecución de ingestores
```
1. geo-loader.ts (batch upsert idempotente — base para todos)
2. denue.ts (el más grande, el más valioso)
3. fgj.ts (segundo más importante para safety)
4. gtfs.ts (estable, pocos datos)
5. atlas-riesgos.ts (estable, pocos datos)
6. siged.ts (anual, pocos datos)
7. dgis.ts (anual, pocos datos)
8. sacmex.ts (mensual, pocos datos)

Cada ingestor:
  1. Descarga/consulta la fuente
  2. Transforma al schema de geo_data_points
  3. Llama geo-loader.ts con batch de registros
  4. geo-loader hace UPSERT idempotente (ON CONFLICT external_id DO UPDATE)
  5. Dispara cascada geo_data_updated para las zonas afectadas
```

---

# MÓDULO 12: PRODUCTOS LICENCIABLES + DMX ESTIMATE + API

## 12.1 Catálogo de 7 Productos

### Producto 1: DMX Livability API

```
Nombre:     DMX Livability API
Endpoint:   GET /api/v1/scores/livability
Params:     lat, lon, radius (optional, default 1km)
Auth:       X-DMX-API-Key header
Response:   {
              score: 78,
              label: "Excepcional",
              premium_pct: 8.4,
              components: {
                safety: 72, transit: 85, ecosystem: 81, walkability: 76,
                schools: 69, health: 74, water: 65, air: 82, employment: 71
              },
              confidence: "high",
              zone: { name: "Nápoles", alcaldia: "Benito Juárez", city: "CDMX" },
              calculated_at: "2026-04-01T06:00:00Z"
            }

Clientes:   Portales inmobiliarios (Inmuebles24, Vivanuncios)
            Fintechs (Creditas, Coru, Yotepresto)
            Apps de movilidad (Beat, Uber)
            Gobierno (SEDUVI, INVI)
            Aseguradoras

Pricing:
  Free:       100 queries/día, solo score + label (sin components)
  Starter:    $5,000 MXN/mes, 10K queries/día, components incluidos
  Pro:        $25,000 MXN/mes, 100K queries/día, historical + trends
  Enterprise: Custom, unlimited, SLA 99.9%, dedicated support

Implementación:
  - Tabla: api_keys (id, user_id, key_hash, plan, requests_today, requests_month, created_at)
  - Middleware: validateApiKey() → check plan → check rate limit → process
  - Rate limit: api_rate_limits con window por hora
  - Logging: api_request_logs para analytics de uso
  - Dashboard: /admin/api-metrics (requests/day, top consumers, revenue)
```

### Producto 2: DMX Momentum Index

```
Nombre:     DMX Momentum Index
Endpoint:   GET /api/v1/scores/momentum
Params:     zone_id OR (lat, lon)
Response:   {
              score: 67,
              label: "Momentum positivo",
              signals: {
                economic: 0.45, safety: 0.22, infrastructure: -0.10,
                market: 0.38, demand: 0.51
              },
              prediction_12m: "Apreciación estimada 8-12%",
              confidence: "high"
            }

Clientes:   Fondos de inversión inmobiliaria
            Bancos (evaluación de colateral hipotecario)
            Desarrolladores (site selection)

Pricing:
  Starter:    $10,000 MXN/mes, 5K queries/día
  Pro:        $50,000 MXN/mes, 50K queries/día, historical + bulk
  Enterprise: Custom

Diferenciador: NADIE en el mundo tiene momentum temporal para colonias en México.
               El historial de snapshots es irreplicable.
```

### Producto 3: DMX Risk Score

```
Nombre:     DMX Risk Score
Endpoint:   GET /api/v1/scores/risk
Params:     lat, lon, property_type (optional)
Response:   {
              risk_score: 25,  // 0-100, bajo = menos riesgo
              label: "Riesgo bajo",
              dimensions: {
                seismic: 15, flood: 10, crime: 30, water: 35, infrastructure: 20
              },
              insurance_premium_factor: 0.85,  // multiplicador vs baseline
              risk_dominant: "water",
              mitigations: ["Cisterna recomendada", "Seguro contra sismo incluido"]
            }

Clientes:   Aseguradoras (pricing de pólizas)
            Bancos (riesgo de colateral)
            Valuadores (ajuste de avalúo)

Pricing:    $15,000-$75,000 MXN/mes según volumen
```

### Producto 4: DMX Site Selection

```
Nombre:     DMX Site Selection Tool
Endpoint:   POST /api/v1/site-selection
Body:       {
              city: "cdmx",
              property_type: "departamento",
              target_price_m2: { min: 35000, max: 55000 },
              min_demand_score: 60,
              min_livability: 50,
              max_risk: 40,
              max_results: 10
            }
Response:   {
              zones: [{
                zone_id, name, alcaldia,
                livability: 72, momentum: 65, risk: 22, demand: 78,
                avg_price_m2: 42000, supply_pipeline: "low",
                recommendation: "Zona ideal: demanda alta, oferta baja, momentum positivo",
                score_match: 89
              }, ...]
            }

Clientes:   Desarrolladores inmobiliarios
            Fondos de inversión
            Consultoras de real estate

Pricing:    $25,000-$100,000 MXN/mes, o por reporte ($5,000 MXN/reporte)
```

### Producto 5: DMX Market Intelligence Reports

```
Nombre:     Reportes Automáticos de Mercado
Endpoint:   GET /api/v1/reports/market?zone_id=X&format=pdf
Response:   PDF generado con:
            - Resumen ejecutivo
            - 7 índices DMX de la zona
            - Tendencias 12 meses
            - Comparativa con zonas adyacentes
            - Oferta y demanda
            - Predicciones

Clientes:   Gobierno (SEDUVI, INVI, alcaldías)
            Academia (universidades, centros de investigación)
            Medios (Forbes, Expansión, El Financiero)
            Consultoras

Pricing:    $5,000-$20,000 MXN por reporte, o suscripción mensual
```

### Producto 6: DMX COMPASS (Predicción de Cierre)

```
Nombre:     DMX COMPASS
Concepto:   Modelo predictivo de probabilidad de cierre de operación
            Inspirado en CoStar COMPASS (credit default model)
Endpoint:   POST /api/v1/compass
Body:       { lead_profile, property_id, broker_id }
Response:   { probability: 0.72, estimated_days: 45, risk_factors: [...] }

Clientes:   Inmobiliarias grandes, MBs
Pricing:    Incluido en plan Enterprise del marketplace
Fase:       H3 (requiere calibración con 100+ transacciones cerradas)
```

### Producto 7: DMX Knowledge Graph

```
Nombre:     DMX Knowledge Graph (Ontología Inmobiliaria)
Concepto:   Consultas que cruzan dominios:
            "Zonas con DMX-MOM positivo AND DMX-IRE bajo AND school_premium alto"
Endpoint:   POST /api/v1/knowledge-graph/query
Body:       { filters: [...], operators: [...], limit: 20 }

Clientes:   Empresas de data analytics, consultoras, gobierno
Pricing:    $50,000+ MXN/mes
Fase:       H3 (requiere datos maduros)
```

## 12.2 DMX Estimate — AVM Mexicano

```
Concepto:   Automated Valuation Model para México
            Inspirado en Zillow Zestimate + HouseCanary Value by Conditions

Endpoint:   POST /api/v1/estimate
Body:       {
              lat: 19.3756, lon: -99.1625,
              property_type: "departamento",
              m2_total: 85, m2_construido: 80,
              recamaras: 2, banos: 2,
              piso: 6, estacionamientos: 1,
              antiguedad_anos: 0,  // 0 = nuevo
              amenidades: ["gym", "roof_garden", "lobby"],
              conditions: {          // Value by Conditions (HouseCanary style)
                condicion_general: "excelente",
                remodelacion_reciente: true,
                vista: "calle"
              }
            }

Response:   {
              estimate: {
                value: 4250000,
                value_m2: 50000,
                range_low: 3825000,   // -10%
                range_high: 4675000,  // +10%
                confidence: 0.82,
                confidence_label: "Alta"
              },
              comparables: [
                { address, price, m2, date_sold, distance_km, similarity_pct }
              ],
              adjustments: {
                base_price_m2_zone: 45000,
                piso_premium: "+5%",
                amenidades_premium: "+3%",
                antiguedad_discount: "0%",
                condicion_premium: "+2%",
                vista_adjustment: "0%"
              },
              market_context: {
                zone_trend_12m: "+8%",
                momentum: 65,
                supply_demand_ratio: 0.7,  // <1 = más demanda que oferta
                days_on_market_avg: 120
              },
              methodology: "DMX Estimate v1 — 47 variables, 12 fuentes"
            }

Inputs del modelo:
  1. market_prices_secondary → precios de mercado secundario (comparables)
  2. project_scores → precios de proyectos nuevos en zona
  3. zone_scores → calidad de vida, seguridad, transporte
  4. macro_series → tasa hipotecaria, INPP, IPV
  5. geo_data_points → DENUE (ecosistema), SIGED (escuelas), FGJ (seguridad)
  6. operaciones → transacciones reales de la plataforma (calibración)
  7. Características de la propiedad (input del usuario)
  8. Condiciones específicas (Value by Conditions)

Modelo:
  Phase 1 (H1): Regression lineal múltiple con comparables
    estimate = base_m2 × m2 × adj_piso × adj_amenidades × adj_condicion × adj_zona
  Phase 2 (H2): Gradient boosting con features del IE
    + zone_scores como features
    + DENUE ratios como features
    + momentum como feature
  Phase 3 (H3): Deep learning calibrado con transacciones reales
    + cada venta cerrada valida/ajusta el modelo
    + confidence score mejora con más datos

Confidence Score:
  >0.85: Alta — muchos comparables recientes, datos completos
  0.70-0.85: Media — comparables limitados o antiguos
  0.50-0.70: Baja — pocos comparables, zona con pocos datos
  <0.50: Muy baja — estimación indicativa, datos insuficientes

Pricing:
  Free: 5 estimaciones/mes (sin comparables, sin adjustments)
  Pro: $2,999 MXN/mes, 50 estimaciones, comparables incluidos
  API: $15,000-$50,000 MXN/mes según volumen

Fase: H2 (regression) → H3 (ML calibrado)
```

## 12.3 Arquitectura API Externa

```
/app/api/v1/
  ├── scores/
  │   ├── livability/route.ts     → DMX Livability API
  │   ├── momentum/route.ts       → DMX Momentum Index
  │   ├── risk/route.ts           → DMX Risk Score
  │   ├── project/route.ts        → DMX Score por proyecto
  │   └── [scoreType]/route.ts    → Score genérico
  ├── estimate/route.ts           → DMX Estimate (AVM)
  ├── site-selection/route.ts     → Site Selection Tool
  ├── reports/
  │   └── market/route.ts         → Market Intelligence Reports
  ├── rankings/route.ts           → Zone Rankings
  ├── neighborhood-report/route.ts → Neighborhood Report
  ├── compass/route.ts            → COMPASS predicción (H3)
  └── knowledge-graph/
      └── query/route.ts          → Knowledge Graph (H3)

Middleware compartido:
  1. validateApiKey(req) → buscar en api_keys, verificar plan
  2. checkRateLimit(apiKey, endpoint) → api_rate_limits
  3. logRequest(apiKey, endpoint, responseTime) → api_request_logs
  4. formatResponse(data, plan) → free plan omite components/details

Tablas nuevas:
  api_keys: id, user_id, key_hash, plan, name, is_active, requests_today, 
            requests_month, last_used_at, created_at
  api_request_logs: id, api_key_id, endpoint, method, params_hash, 
                    response_status, response_time_ms, created_at

Dashboard admin:
  /admin/api-metrics → requests/day chart, top consumers, revenue, errors
```

---

# MÓDULO 13: COMPETENCIA DETALLADA + FASES H1/H2/H3

## 13.1 Matriz Competitiva Completa

### CoStar Group ($35B+, $3B+/yr revenue)

```
Fortalezas:
  - Mayor base de datos CRE global: 6M+ propiedades, 39 años de acumulación
  - Vertical integration: data + marketplaces + analytics + 3D (Matterport)
  - COMPASS credit default model: 17 años de risk modeling para lenders
  - 163M monthly unique visitors
  - Forecasting con Oxford Economics: rent trajectories, vacancy projections
  - Peer comparison: comparar tu propiedad vs propiedades similares
  - 8 economic scenarios: modelar impacto de cambios macro
  - Saved searches + alerts: notificaciones de oportunidades
  - Custom reports: generación de reportes ad-hoc
  - Lease expiration tracking + tenant tracking
  - 1,000+ research analysts (humanos verificando datos)

Debilidades vs DMX:
  ✗ Primariamente US/UK/France — ZERO presencia LATAM
  ✗ Commercial-first: residencial es secundario
  ✗ NO neighborhood livability ni lifestyle scores
  ✗ NO urban intelligence layer (no crime, transit, walkability, ecosystem)
  ✗ NO temporal momentum (no snapshots, no dirección de cambio)
  ✗ Data collection con 1,000+ humanos = alto burn rate
  ✗ NO open data integration — todo propietario, todo pagado
  ✗ Pricing $300-500/mo por usuario = inaccesible para LATAM

Lo que DMX debe copiar de CoStar:
  → Peer comparison (A08 Comparador ya lo hace)
  → 8 economic scenarios (E07 Scenario Planning)
  → Saved searches + alerts (watchlist + score_subscriptions)
  → Custom reports (I02 Market Report + E08 Auto Report)
  → COMPASS credit model (DMX COMPASS, H3)
```

### Cherre (~$300M private)

```
Fortalezas:
  - Knowledge graph: 500M nodos, 1.5B edges
  - Data Fabric: mapea ANY address a entity con ML
  - 100+ vendor integrations
  - Agent.STUDIO: agentic AI workflows
  - Powers $3T+ AUM
  - SOC-2 compliant

Debilidades vs DMX:
  ✗ Infrastructure play, NO consumer-facing
  ✗ US-only
  ✗ No proprietary scores ni indices
  ✗ No neighborhood analytics
  ✗ Requires significant integration effort
  ✗ No marketplace component

Lo que DMX debe aprender de Cherre:
  → Knowledge Graph (DMX Knowledge Graph, H3)
  → Data Fabric concept (el IE ya hace esto con geo_data_points unificado)
  → Agent.STUDIO (futuro: AI agents que operen sobre el IE)
```

### Local Logic (~$50M private)

```
Fortalezas:
  - 18 location scores: walkability, transit, quiet, vibrant, groceries, parks, 
    schools, nightlife, cafes, etc.
  - Address-level granularity
  - B2B API en Sotheby's, RE/MAX, Royal LePage
  - 10 años de datos
  - Sustainable location metrics

Debilidades vs DMX:
  ✗ US + Canada ONLY
  ✗ Scores ESTÁTICOS — no temporal dimension, no momentum
  ✗ No crime/safety data
  ✗ No economic ecosystem analysis (no DENUE equivalent)
  ✗ No risk scoring (seismic, flooding, water)
  ✗ No market/pricing data
  ✗ Not connected to transaction data
  ✗ B2B only — no consumer product

Lo que DMX supera a Local Logic:
  → DMX tiene 108+ scores vs 18 de Local Logic
  → DMX tiene temporalidad (momentum, trajectory) — Local Logic es estático
  → DMX tiene crime/safety que Local Logic NO tiene
  → DMX tiene risk (seismic, water, infrastructure) que Local Logic NO tiene
  → DMX tiene ecosystem económico (DENUE) que Local Logic NO tiene
  → DMX está conectado a transacciones reales (calibración)
  → DMX cubre México (130M personas, 0 competidores)
```

### Walk Score (part of Redfin ~$1B)

```
Fortalezas:
  - Industry standard: Walk Score, Transit Score, Bike Score
  - $3,250 price increase per point (research-backed)
  - Embedded in Redfin, Zillow, Apartments.com
  - Simple 0-100 scale, consumer-friendly

Debilidades vs DMX:
  ✗ Grid-based, not address-specific
  ✗ Only 3 scores — extremely limited
  ✗ Static — no temporal trends
  ✗ US/Canada only
  ✗ Methodology hasn't evolved since 2007
  ✗ No crime, no economic ecosystem, no risk, no water, no schools quality

Lo que DMX debe copiar:
  → Simplicity of 0-100 scale (N08 Walkability MX usa la misma escala)
  → Opportunity Score concept (H12 Zona Oportunidad)
  → Historical tracking (score_history ya lo hace)
  → Embeddability (API para que portales lo integren)
```

### First Street Foundation

```
Fortalezas:
  - Climate risk financiero por propiedad
  - Integrado en Zillow/Redfin
  - $50M+ levantados
  - Modelo probabilístico de riesgo flood/fire/heat

Debilidades vs DMX:
  ✗ Solo climate risk — no urban risk integral
  ✗ US only
  ✗ No crime, no water infrastructure, no seismic
  ✗ No marketplace

Lo que DMX cubre que First Street NO:
  → Riesgo sísmico (H03) — crítico para México
  → Riesgo hídrico por infraestructura (N07, F05) — no por clima sino por SACMEX
  → Riesgo criminal (F01, N04) — no existe en First Street
  → Riesgo integral (DMX-IRE) combinando todos los tipos
```

### DD360 + Monopolio + Wiggot + Compa (Ecosistema MX)

```
DD360:
  - AVM mexicano con 200+ puntos de data
  - $91M USD levantados
  - 120+ desarrollos
  - "Se conecta con SEDUVI" = descarga datos públicos SIG CDMX
  - Ciclo de vida de compra

Debilidades vs DMX:
  ✗ No location intelligence profunda
  ✗ No scores temporales
  ✗ No ecosystem económico
  ✗ No risk scoring multi-fuente
  ✗ No marketplace con transacciones reales para calibración
  ✗ Valuación sin calibración transaccional

Lo que DMX tiene que DD360 NO:
  → IE con 108+ scores vs valuación puntual
  → Momentum temporal (DENUE snapshots)
  → Risk integral (sísmico + hídrico + criminal)
  → Marketplace como fuente de datos de demanda y calibración
  → Ecosystem Score (Shannon-Wiener sobre SCIAN) — IP propietaria
```

### Pulppo (CRM competidor)

```
Fortalezas (observadas en análisis reverse engineering):
  - CRM funcional con 10 módulos completos
  - MLS con 813K propiedades
  - ACM automático (valuación con datos internos)
  - Pipeline de captación 6 etapas
  - Métricas con pedagogía integrada y SLAs
  - Multi-país (MX, CO, AR)
  - Integración portales (Inmuebles24, ML, Zonaprop)
  - Auto-generación piezas marketing

Debilidades vs DMX:
  ✗ ZERO intelligence engine — no scores de zona, no momentum, no risk
  ✗ ACM usa solo datos internos Pulppo — no cruza fuentes externas
  ✗ No scores de seguridad, transporte, ecosistema, agua
  ✗ No temporal tracking de zonas
  ✗ Sin API para terceros
  ✗ 10MB bundle monolítico (performance)
  ✗ MongoDB + Firebase = escalabilidad limitada vs PostgreSQL
  ✗ No personalización de homepage (Netflix pattern)
  ✗ No gamification del asesor

Lo que DMX tropicaliza de Pulppo:
  → Dashboard carrusel "¿Qué debo hacer hoy?" (con scores IE integrados)
  → Kanban búsquedas 6+1 columnas (con lead score badges)
  → Captaciones pipeline (con ACM basado en IE, no solo datos internos)
  → Métricas pedagógicas (con SLAs + semáforos + scores IE del asesor)
  → Operaciones wizard 6 pasos (con comisión IVA auto)
  → Inventario calidad/valuación (con scores IE overlay)
  → Auto-generación marketing (con datos IE en las piezas)

Lo que DMX agrega que Pulppo NO tiene:
  → Scores IE en cada superficie del CRM
  → Lead Score que predice probabilidad de cierre
  → Matching Engine con datos IE (no solo precio/tipo)
  → Pricing Autopilot para desarrolladores
  → Gamification (streaks, XP, leaderboards, badges)
  → Personalización homepage por perfil
  → Discover Weekly inmobiliario
  → DMX Wrapped anual
  → API licenciable
```

### Duolingo (Gamification benchmark)

```
Qué hacen:
  - Streaks diarios que generan retención 3x vs apps sin gamification
  - XP system con ligas semanales (Bronce → Diamante)
  - Badges coleccionables por hitos (30 días, 100 lecciones, etc.)
  - Leaderboards con amigos y competidores cercanos
  - Penalización por romper streak → loss aversion drive

Revenue: $600M+/año — la gamification ES el producto, no un add-on

Lo que DMX aplica (IE_PART1 Pattern 8):
  → Streaks: días consecutivos respondiendo leads <60min
  → XP: contacto creado 10XP, visita 25XP, venta cerrada 500XP
  → Ligas: ranking mensual entre asesores de zona
  → Badges: "Experto Nápoles" (>10 ventas), "Respuesta Rayo" (SLA <15min 30 días)
  → Tabla: asesor_gamification (user_id, xp_total, streak, badges[], monthly_rank)
  → Cron: gamification-daily (streak check + monthly rank reset)
  → Componente: GamificationWidget en dashboard asesor

Lo que DMX hace diferente:
  ✓ Gamification basada en KPIs de negocio real (no solo engagement)
  ✓ Leaderboard conectada a comisiones reales (no puntos arbitrarios)
  ✓ Badges que reflejan expertise de zona verificable con datos IE
```

### Strava (Social fitness benchmark)

```
Qué hacen:
  - Segmentos geográficos con tiempos: KOM (King of the Mountain)
  - Leaderboards por segmento (quién corre más rápido este tramo)
  - Actividad social: ver qué hacen otros atletas, kudos, comentarios
  - Heatmaps de actividad global (datos crowdsourced)
  - Subscription $12/mes con analytics avanzados

Revenue: ~$250M+/año — datos de actividad SON el producto

Lo que DMX aplica (IE_PART1 Pattern 8):
  → "Segmentos" = zonas geográficas (colonias) con performance de asesores
  → Leaderboard por zona: quién vende más rápido en Nápoles, quién en Del Valle
  → "KOM" inmobiliario: "Rey de Nápoles Q2 2026" → badge visible en perfil
  → Heatmap de actividad: dónde están las visitas, dónde están las ventas

Lo que DMX hace diferente:
  ✓ Segmentos son colonias reales con datos IE (no rutas GPS)
  ✓ Performance medido en transacciones cerradas, no en tiempo
  ✓ Social limitado a equipos (no público) para proteger datos de negocio
```

### Cursor (Implicit feedback loop benchmark)

```
Qué hacen:
  - Cada accept/reject de sugerencia de código entrena el modelo
  - El feedback loop es instantáneo y sin fricción
  - El usuario no "entrena" explícitamente — el uso ES el entrenamiento
  - Cada interacción hace el producto mejor para TODOS los usuarios

Lo que DMX aplica (IE_PART1 Pattern 9):
  → Accept/reject de sugerencia B03 Pricing Autopilot → calibra modelo de pricing
  → Reject de proyecto sugerido por C03 Matching → aprende qué NO funciona
  → Filtros modificados en búsqueda → search_logs → señal de qué importa
  → Tiempo en ficha de proyecto → PostHog engagement signal
  → Scroll depth en scores → qué datos le importan al usuario
  → Comparador: qué proyectos compara → revela preferencias ocultas
  → Tabla: interaction_feedback + search_logs + PostHog events

Lo que DMX hace diferente:
  ✓ Feedback loop cruza dominios (comprador → asesor → desarrollador)
  ✓ Cada transacción cerrada calibra 10+ scores simultáneamente
  ✓ El flywheel no solo mejora sugerencias — mejora predicciones de mercado
```

### Otros competidores (resumen)

```
Zillow/Zestimate:     AVM con 104M propiedades, influencia conductual. DMX → I01 DMX Estimate
HouseCanary:          AVM enterprise, Value by 6 Conditions, confidence. DMX → I01 con conditions
Placer.ai:            Foot traffic para CRE. DMX → search_logs + PostHog como proxy
CAPE Analytics:       Computer vision aérea, 100M+ estructuras. DMX → futuro H3 satellite
PriceHubble:          AVM europeo con lifestyle. DMX → I01 + A10 Lifestyle Match
ZestyAI:              Climate risk via aerial imagery. DMX → H03 + N07 + F12
CoreLogic:            HPI, líder global AVM. DMX → I01 es la versión MX
Quantarium:           Deep learning AVM, sub-4% error. DMX → I01 H3 con ML
ATTOM Data:           158M propiedades US. DMX → marketplace como equivalente
Lofty/Chime:          CRM con IA, 50K+ agentes. DMX → CRM integrado + IE
Opendoor:             iBuyer, instant pricing. DMX → I01 + A12 price fairness
CHAOS Helsinki:       Location intelligence Europa. DMX → equivalente para LATAM
Matterport:           Digital twins 3D. DMX → futuro H3 3D tours
```

## 13.2 Tabla Comparativa de Features

```
Feature                          CoStar  Cherre  Reonomy  Local   Walk   DMX
                                                          Logic   Score  IE
─────────────────────────────────────────────────────────────────────────────
Marketplace integrated           ✅      ❌      ❌       ❌      🔶     ✅
Transaction data (calibration)   ✅      ❌      ❌       ❌      ❌     ✅
Location scores (18+)            ❌      ❌      ❌       ✅      ❌     ✅
Livability/lifestyle scores      ❌      ❌      ❌       ✅      ❌     ✅
Crime/safety intelligence        ❌      ❌      ❌       ❌      ❌     ✅
Safety TREND (dirección)         ❌      ❌      ❌       ❌      ❌     ✅
Economic ecosystem score         ❌      ❌      ❌       ❌      ❌     ✅
Seismic/flood risk               ❌      ❌      ❌       ❌      ❌     ✅
Water infrastructure             ❌      ❌      ❌       ❌      ❌     ✅
School QUALITY score             ❌      ❌      ❌       🔶      ❌     ✅
Health access by level           ❌      ❌      ❌       ❌      ❌     ✅
Temporal/momentum tracking       ❌      ❌      ❌       ❌      ❌     ✅
Predictive gentrification        ❌      ❌      ❌       ❌      ❌     ✅
Cross-source correlations        ❌      🔶      ❌       ❌      ❌     ✅
Transaction-calibrated models    ✅      ❌      ❌       ❌      ❌     ✅
Mexico / LATAM coverage          ❌      ❌      ❌       ❌      ❌     ✅
Residential-first                🔶      ❌      ❌       ✅      ✅     ✅
Risk-adjusted valuation          ❌      ❌      ❌       ❌      ❌     ✅
Employment accessibility         ❌      ❌      ❌       ❌      ❌     ✅
CRM integrado                    ❌      ❌      ❌       ❌      ❌     ✅
AI content generation            ❌      🔶      ❌       ❌      ❌     ✅
Gamification                     ❌      ❌      ❌       ❌      ❌     ✅
Personalized homepage            ❌      ❌      ❌       ❌      ❌     ✅
Knowledge graph                  ❌      ✅      ❌       ❌      ❌     🔶
AVM / Estimate                   ✅      ❌      ❌       ❌      ❌     🔶

✅ Tiene  🔶 Parcial  ❌ No tiene
```

## 13.3 Fases de Ejecución H1/H2/H3

### H1: Foundation + Data (ahora → 3 meses)

```
Objetivo: Que el IE funcione con datos reales de CDMX y produzca scores Tier 1.

Sprint R5a-2 (inmediato — 2-3 semanas):
  □ geo-loader.ts con batch upsert idempotente
  □ denue.ts → ingestar ~200K establecimientos CDMX
  □ fgj.ts → ingestar ~100K carpetas último año
  □ gtfs.ts → ingestar ~300 estaciones
  □ atlas-riesgos.ts → ingestar ~500 AGEBs
  □ siged.ts → ingestar ~15K escuelas
  □ dgis.ts → ingestar ~5K establecimientos salud
  □ sacmex.ts → ingestar ~2K registros cortes
  □ Primer snapshot DENUE (period_date = hoy)
  □ Actualizar registry.ts con 11 scores nuevos (N01-N11)
  □ Implementar N01 Ecosystem Diversity calculator
  □ Implementar N08 Walkability MX calculator
  □ Tabla geo_snapshots (nueva)
  □ vercel.json con schedules de crons geo
  □ Tag: restructure-r5a-2

Sprint R2-R3-R4 (en paralelo, ya definidos en Biblia v3):
  □ R2: Dev Core completo
  □ R3: Document Intelligence completo
  □ R4: Legal + Pagos + Inbox + Calendario

Sprint R5 completo (post R5a-2):
  □ R5b: Calculators comprador (A01, A02, A04, A05, A12)
  □ R5c: Calculators asesor (C01, C03)
  □ R5d: Segundo orden (F08 LQI, F01 Safety, F02 Transit)
  □ Implementar N04 Crime Trajectory
  □ Implementar N07 Water Security
  □ Implementar N11 Momentum Index (requiere ≥2 snapshots, funcional mes 2+)
  □ Crons: ingest_banxico_daily, ingest_inegi_monthly, snapshot_denue_monthly

Sprint R6-R7:
  □ R6: Marketing + Landing + QR (con scores IE)
  □ R7: WhatsApp + Notificaciones + Workflows
  □ Segundo snapshot DENUE (1 mes después del primero)
  □ N03 Gentrification Velocity funcional
  □ N11 Momentum Index funcional

Entregable H1: 
  - IE produciendo 30+ scores Tier 1 con datos reales CDMX
  - 2+ snapshots DENUE para scores temporales
  - Marketplace funcional con CRM integrado
  - 0 datos de prueba, todo real
```

### H2: Calibration + Products (3-6 meses)

```
Objetivo: Calibrar modelos con transacciones reales, lanzar primeros productos.

Sprint R8-R9:
  □ R8: Portal Comprador (Lifestyle Match, TCO, Simulador)
  □ R9: Admin + Billing Stripe + primeros productos vendibles
  □ API v1 live: /api/v1/scores/livability, /momentum, /risk
  □ api_keys tabla + middleware + rate limiting
  □ DMX Estimate v1 (regression lineal con comparables)
  □ Primeros 10+ proyectos reales en la plataforma
  □ Primeras 5+ transacciones cerradas → calibración E03 Predictive Close
  □ Scores Tier 2 funcionales (A01, A12, B07, H05 con datos reales)
  □ Reporte trimestral "DMX Índice de Colonias Q3 2026" → PR a medios
  □ Newsletter mensual con rankings momentum
  □ 6+ snapshots DENUE → series temporales robustas
  □ Gamification v1 (XP, streaks, badges)
  □ Discover Weekly v1 (email semanal con matches)

Sprint R10:
  □ 14 crons restantes implementados
  □ Mobile responsive completo
  □ Disaster Recovery Runbook

Entregable H2:
  - 50+ proyectos, primeras transacciones cerradas
  - API live con primeros clientes beta
  - DMX Estimate v1 funcionando
  - Scores Tier 2+3 funcionales
  - Serie temporal de 6+ meses de snapshots
  - Primer revenue de API ($0→$X)
```

### H3: Monetization + Scale (6-12+ meses)

```
Objetivo: IE como negocio independiente, escala nacional.

Productos:
  □ DMX Livability API con clientes pagando
  □ DMX Momentum Index como producto estrella para fondos
  □ DMX Risk Score para aseguradoras
  □ DMX Site Selection para desarrolladores
  □ DMX Market Reports para gobierno/academia
  □ DMX Estimate v2 (gradient boosting con features IE)
  □ DMX COMPASS (predicción de cierre calibrada)
  □ DMX Knowledge Graph v1

Escala:
  □ 1,500 desarrollos en todo México
  □ Top 10 ciudades con datos geo completos
  □ 500+ asesores activos
  □ 100+ transacciones cerradas → modelos calibrados
  □ 12+ meses de snapshots → series temporales maduras

Revenue split target:
  □ Marketplace (suscripciones + fee por venta): 40%
  □ API (Livability + Momentum + Risk): 35%
  □ Productos (Reports + Estimate + Site Selection): 25%

Hitos de validación:
  □ DMX Score citado en 3+ medios nacionales
  □ 5+ clientes API pagando
  □ Error del DMX Estimate < 15% vs precio real
  □ Momentum Index predijo correctamente 3+ zonas de apreciación
  □ "DMX Score 85" aparece en presentaciones de venta de asesores
```

---

# CONTEO FINAL COMPLETO IE v4

```
SCORES:
  Nivel 0 (datos crudos):           21 originales + 11 nuevos = 32
  Nivel 1 (dependen de N0):         16
  Nivel 2 (dependen de N0+N1):      14
  Nivel 3 (dependen de N2):         12
  Nivel 4 (agregados):              7
  Nivel 5 (AI/content):             26
  TOTAL SCORES:                     107

ÍNDICES DMX:                        7 (5 originales + 2 nuevos)

FUENTES DE DATOS:
  Macro:                            7
  Geo:                              17
  Mercado:                          4
  Propias:                          12
  Futuras:                          10+
  TOTAL FUENTES:                    50+

CASCADAS:                           6 (5 originales + 1 nueva)

PRODUCTOS LICENCIABLES:             7

CALCULATORS IMPLEMENTADOS:          5 de 107 (4.7%)
  B08 Absorption Forecast
  B11 Channel Performance
  B12 Cost Tracker
  B02 Margin Pressure (con BUG — fix requerido)
  H05 Trust Score

INGESTORES IMPLEMENTADOS:           2 de 9 (22%)
  Banxico (4 series)
  INEGI (2 series)

DATOS REALES EN BD:                 0 (100% seed data)
GEO DATA POINTS:                    0 rows (target: 820K CDMX día 1)
```

---

# CROSS-REFERENCES FINALES

```
BIBLIA_IE_DMX_v4 (este documento, 5 partes):
  PART 1: Visión + Arquitectura + Fuentes
  PART 2: Scores Nivel 0 + 1 (37 scores end-to-end)
  PART 3: Scores Nivel 2-5 (59 scores)
  PART 4: 11 Scores Nuevos + 7 Índices DMX
  PART 5: Cascadas + Productos + Competencia + Fases (este archivo)

BIBLIA_BACKEND_DMX_v4 (próximo documento):
  - Tablas: 99 existentes + nuevas (geo_snapshots, api_keys, api_request_logs,
    asesor_gamification, captaciones, propiedades_secundarias)
  - tRPC routers: 5 funcionales + nuevos (asesor CRM, captaciones, scores API)
  - API routes: 14 funcionales + nuevas (ingest-geo, v1/scores/*)
  - Crons: 4 existentes + nuevos (snapshot_denue, ingest_geo_*, zone_scores_weekly)
  - Security fixes: rateLimit, B02 columns, payment_breakdowns
  - CRM integrado: propiedades secundarias, captaciones, inventario asesor

BIBLIA_FRONTEND_DMX_v4 (último documento):
  - Portal Asesor: Pulppo tropicalizado + IE overlay
  - Portal Desarrollador: + IE analytics
  - Portal Comprador: NUEVO (R8)
  - Portal Admin: + observatory + API metrics
  - Componentes nuevos: MomentumIndicator, WalkabilityBadge, LifestyleMatch, etc.
  - Gamification: XP, streaks, leaderboards, badges
  - Personalización Netflix: homepage por perfil
  - Discover Weekly + DMX Wrapped
```

---

**FIN DE BIBLIA_IE_DMX_v4 (5 PARTES COMPLETAS)**

**SIGUIENTE: BIBLIA_BACKEND_DMX_v4**

---

## Addendum 2026-04-20 — Competencia MX + Global (research post v5)

Post research competitivo exhaustivo 2026-04-20 (ver ADR-025 + ADR-026):

### Competidores MX analizados

| Empresa | Nicho | Producto estrella | Moat |
|---|---|---|---|
| **Metric Analysis** | AVM + WhatsApp IA | ValueChat (2.7M appraisals) | Canal WhatsApp masivo |
| **Brandata** | Research pre-desarrollo | Estudio vocación predio | Equipo multidisciplinario consultoría |
| **DatAlpine** | Analytics avanzado devs | Pricing Algorithm + Simulator | Econometría hedonic + Monte Carlo <5% error |
| **Phiqus** | Multi-sector data science | Visión artificial + simulador precios | End-to-end + granularidad operacional |
| **Datoz** | Commercial real estate intel | Analytics 2.0 + Portal FIBRAs (44 mercados) | Clientes enterprise Barclays/Prologis/Vesta/JLL |
| **Tinsa México** | Valuación + consultoría (25 años) | Stima AVM EAA-endorsed + Pulso Inmobiliario | Standard internacional EAA + all-asset types |

### Competidores Global referenciados (ADR-026)

Reonomy (54M parcels + pierce corporate veil), HouseCanary (114M + image recognition renovation), Placer.ai (foot traffic panel), ATTOM (158M API), CoStar (6M + 11M comps + LoopNet + 3D), Cherre (property knowledge graph + Agent.STUDIO), CompStak (crowdsourced 20K brokers), Opendoor (AI Video Inspections smartphone), Zillow AI Mode 2026, Redfin Redesign AI.

### Posicionamiento DMX vs competencia

**DMX defiende únicos (no replicables corto plazo):**
- Consumer-facing B2C (competencia MX all B2B)
- Multi-país LATAM día 1 (ADR-003)
- 118 scores jerárquicos N0-N5 (nadie cerca)
- AI-Native Copilot conversacional (Zillow US, nadie MX)
- Open API as Product (ADR-013)
- Transparency provenance + methodology
- Spatial Decision Intelligence category nueva

**Cross-functions identificados (LATERAL_UPGRADES_PIPELINE.md CF-L1-8 local + CF-G1-8 global):**
16 combinaciones que empaquetan features DMX vs competencia en productos nuevos.

Ver detalle completo: `docs/01_DECISIONES_ARQUITECTONICAS/ADR-025_SOCIAL_LISTING_INTELLIGENCE.md` + `ADR-026_GLOBAL_PROPTECH_BENCHMARKS.md` + `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md`
