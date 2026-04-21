# BIBLIA DMX v5 — INTELLIGENCE ENGINE COMPLETO
## PART 4 de 5: 11Nuevos_Indices_Snapshots
## Contenido ÍNTEGRO de IE_DMX_v4_PART4
## Fase: Sesiones 07-13 (IE)
---
# BIBLIA IE — DesarrollosMX v4
## Intelligence Engine: 11 Scores Nuevos · 7 Índices Propietarios DMX · Sistema de Snapshots
## PART 4 de 5 (Módulos 9–10)
## Fecha: 8 abril 2026

---

# MÓDULO 9: 11 SCORES NUEVOS + SISTEMA DE SNAPSHOTS TEMPORALES

Estos 11 scores son la ventaja competitiva central del IE v4. Ningún competidor global los tiene. Se basan en cruces de fuentes que solo existen en México (DENUE × FGJ × SACMEX × GTFS × Atlas) y en la acumulación temporal de snapshots que nadie más está haciendo.

Los IDs usan prefijo N (Nuevo) para distinguirlos de los 97 scores originales. En el registry.ts se agregan al catálogo existente.

---

## 9.1 N01 — Ecosystem Diversity Index

```
ID:           N01
Nombre:       Ecosystem Diversity Index
Nivel:        0
Categoría:    nuevos
Tabla dest:   zone_scores
Dependencias: NINGUNA (solo datos crudos DENUE)
Fuente:       geo_data_points WHERE source='denue'
Tier datos:   1 (funciona día 1 con DENUE)
Fase:         R5a-2 (implementar en sprint actual)
```

### 1. Fuente
```
geo_data_points WHERE source='denue' AND zone_id=? AND is_active=true
Usa el mapeo SCIAN → macro_categories (12 categorías) definido en PART 1 §3.18
```

### 2. Ingesta
```
Ingestor: /lib/intelligence-engine/ingest/denue.ts
Cron: snapshot_denue_monthly
Los datos ya están en geo_data_points cuando el ingestor DENUE corre.
N01 consume lo que ya existe — no necesita su propio ingestor.
```

### 3. Almacenamiento
```
Lee de: geo_data_points (ya poblada por DENUE ingestor)
No tiene tabla propia de fuente — consume datos existentes.
```

### 4. Procesamiento
```
Calculator: /lib/intelligence-engine/calculators/nuevos/ecosystem-diversity.ts

function calculateEcosystemDiversity(zoneId: string, radiusKm: number = 1.0): ScoreResult

Inputs:
  1. geo_data_points WHERE source='denue' AND zone_id=? AND is_active=true
  2. Mapeo SCIAN → macro_category (PART 1 §3.18)

Lógica:
  const establecimientos = await supabaseAdmin
    .from('geo_data_points')
    .select('data')
    .eq('source', 'denue')
    .eq('zone_id', zoneId)
    .eq('is_active', true)

  // 1. Agrupar por macro_category
  const categoryCounts: Record<string, number> = {}
  for (const est of establecimientos) {
    const macro = est.data.scian_macro || 'OTRO'
    categoryCounts[macro] = (categoryCounts[macro] || 0) + 1
  }

  // 2. Shannon-Wiener Diversity Index
  //    H = -Σ(pi × ln(pi))  donde pi = proporción de categoría i
  const total = establecimientos.length
  const categories = Object.entries(categoryCounts)
  let H = 0
  for (const [cat, count] of categories) {
    const pi = count / total
    if (pi > 0) H -= pi * Math.log(pi)
  }

  // 3. Evenness Index (J) = H / Hmax
  //    Hmax = ln(S) donde S = número de categorías presentes
  const S = categories.length
  const Hmax = Math.log(S)
  const J = Hmax > 0 ? H / Hmax : 0  // 0-1, donde 1 = perfectamente distribuido

  // 4. Normalizar a 0-100
  //    H teórico máximo con 12 categorías = ln(12) ≈ 2.485
  //    Usamos H normalizado: score = (H / 2.485) * 100
  const scoreH = Math.min(100, (H / 2.485) * 100)

  // 5. Ajustar por evenness (penalizar ecosistemas dominados por 1-2 categorías)
  const score = scoreH * 0.70 + J * 100 * 0.30

  // 6. Label
  const label = score >= 80 ? 'Ecosistema altamente diverso' :
                score >= 60 ? 'Ecosistema diverso' :
                score >= 40 ? 'Ecosistema moderado' :
                score >= 20 ? 'Ecosistema limitado' : 'Ecosistema muy limitado'

  // 7. Confidence
  const confidence = total >= 100 ? 'high' :
                     total >= 20 ? 'medium' :
                     total >= 1 ? 'low' : 'insufficient_data'

Output:
  score_value: 0-100
  score_label: text
  components: {
    shannon_wiener_H: number,          // el índice H crudo
    evenness_J: number,                // 0-1
    categorias_presentes: number,      // de 12 posibles
    total_establecimientos: number,
    distribucion: {                    // por cada macro_category
      ALIMENTACION: { count, pct },
      SALUD: { count, pct },
      EDUCACION: { count, pct },
      SERVICIOS_PROF: { count, pct },
      COMERCIO_RETAIL: { count, pct },
      GASTRONOMIA: { count, pct },
      ENTRETENIMIENTO: { count, pct },
      BELLEZA_PERSONAL: { count, pct },
      TECNOLOGIA: { count, pct },
      TRANSPORTE: { count, pct },
      MANUFACTURA: { count, pct },
      GOBIERNO: { count, pct }
    },
    categoria_dominante: { nombre, pct },
    categorias_ausentes: string[]      // categorías con 0 establecimientos
  }

Confidence:
  high: >= 100 establecimientos en zona
  medium: 20-99
  low: 1-19
  insufficient_data: 0
```

### 5. Persistencia
```
Tabla: zone_scores
UPSERT: zone_id, 'ecosystem_diversity', period_date
Trigger: archive_score_before_update → score_history
```

### 6-13. End-to-end
```
API: GET /api/scores/zone/[zoneId]/ecosystem_diversity | Auth: Autenticado
Hook: useScore('zone_scores', zoneId, 'ecosystem_diversity')
Componente: EcosystemDiversityPanel
  - Donut chart 12 categorías con colores por macro_category
  - Bar chart horizontales sorted by count
  - Badge H index + evenness
  - Categorías ausentes como warning
Page: /proyectos/[id] Tab Zona, /admin/inteligencia, /asesor/inteligencia
Interacción: Drill-down por categoría → ver establecimientos individuales en mapa
Feedback: Views de este panel → PostHog → saber que diversidad económica importa
Notificación: N/A (cambia mensualmente con snapshots, no urgente)
API externa: GET /api/v1/scores/ecosystem_diversity?lat=X&lon=Y&radius=1
  Producto: DMX Livability API
  Clientes: portales inmobiliarios, fintechs, apps de movilidad
```

---

## 9.2 N02 — Employment Accessibility

```
ID:           N02
Nombre:       Employment Accessibility
Nivel:        0
Categoría:    nuevos
Dependencias: NINGUNA (DENUE + GTFS crudos)
Fuente:       geo_data_points WHERE source IN ('denue', 'gtfs')
Fase:         R5a-2
```

### 1. Fuente
```
geo_data_points WHERE source='denue' AND zone_id IN (zona + adyacentes) AND is_active=true
geo_data_points WHERE source='gtfs' AND ST_Distance(point, zoneCentroid) < 1000
```

### 2. Ingesta
```
Ingestor DENUE: /lib/intelligence-engine/ingest/denue.ts (cron mensual)
Ingestor GTFS: /lib/intelligence-engine/ingest/gtfs.ts (cron trimestral)
N02 consume datos ya ingestados — no tiene ingestor propio.
```

### 3. Almacenamiento
```
Lee de: geo_data_points (ya poblada por ingestores DENUE + GTFS)
```

### 4. Procesamiento
```
Calculator: calculators/nuevos/employment-accessibility.ts

function calculateEmploymentAccessibility(zoneId: string): ScoreResult

Inputs:
  1. DENUE en zona y zonas adyacentes → staff_estimate por establecimiento
  2. GTFS → estaciones accesibles y tiempos de traslado estimados

Lógica:
  // Empleos accesibles en 30 minutos de transporte público
  // 1. Obtener estaciones GTFS en radio 1km de la zona
  const estaciones = geo_data_points WHERE source='gtfs'
    AND ST_Distance(point, zoneCentroid) < 1000

  // 2. Para cada estación, estimar zonas alcanzables en 30min
  //    Metro: ~15 estaciones en 30min, Metrobús: ~10 paradas
  //    Simplificación: radio de 5km para metro, 3km para bus
  const zonasAlcanzables = expandFromStations(estaciones, 30) // minutos

  // 3. Sumar empleo estimado en zonas alcanzables
  const empleosAccesibles = await supabaseAdmin
    .from('geo_data_points')
    .select('data->>staff_estimate')
    .eq('source', 'denue')
    .in('zone_id', zonasAlcanzables.map(z => z.id))
    .eq('is_active', true)

  const totalEmpleos = empleosAccesibles.reduce((sum, e) =>
    sum + (parseInt(e.staff_estimate) || 3), 0)

  // 4. Normalizar contra promedio CDMX
  const score = normalize(totalEmpleos, promedioEmpleosCDMX) * 100

  // 5. Bonus por diversidad de empleo (no solo retail)
  const empleosPremium = filter tier='premium' in zonasAlcanzables
  const ratioEmpleoPremium = empleosPremium / totalEmpleos
  const bonusDiversidad = ratioEmpleoPremium * 15

  finalScore = clamp(score + bonusDiversidad, 0, 100)

Output:
  score_value: 0-100
  score_label: 'Excelente acceso a empleo' | 'Buen acceso' | 'Acceso limitado' | 'Acceso muy limitado'
  components: {
    empleos_accesibles_30min: number,
    empleos_premium_accesibles: number,
    ratio_empleo_premium: number,
    estaciones_transporte_1km: number,
    zonas_alcanzables_30min: number,
    densidad_empleo_zona_propia: number,
    top_sectores_empleo: [{ sector, empleos_estimados }]
  }

Persistencia: zone_scores (zone_id, 'employment_accessibility', period_date)
Componente: EmploymentAccessPanel — mapa isócrona 30min + empleos por sector
Page: /proyectos/[id] Tab Zona
API externa: GET /api/v1/scores/employment?lat=X&lon=Y
```

---

## 9.3 N03 — Gentrification Velocity

```
ID:           N03
Nombre:       Gentrification Velocity
Nivel:        0 (solo DENUE snapshots temporales, sin depender de otros scores)
Categoría:    nuevos
Dependencias: NINGUNA (solo snapshots DENUE)
REQUISITO CRÍTICO: ≥2 snapshots DENUE separados ≥3 meses
Fase:         R5a-2 (pero score funcional solo después de 2do snapshot)
```

### Procesamiento
```
Calculator: calculators/nuevos/gentrification-velocity.ts

Inputs:
  1. DENUE snapshot actual: geo_data_points WHERE source='denue' AND zone_id=? AND period_date=latest
  2. DENUE snapshot anterior: period_date = latest - 3 months (o más antiguo disponible)
  3. Mapeo SCIAN → tier (premium/standard/basic)

Lógica:
  // Calcular ratio premium/basic en cada snapshot
  const snapshotActual = query DENUE period_date=latest
  const snapshotAnterior = query DENUE period_date=previous

  const ratioActual = countTier(snapshotActual, 'premium') /
                      Math.max(countTier(snapshotActual, 'basic'), 1)
  const ratioAnterior = countTier(snapshotAnterior, 'premium') /
                        Math.max(countTier(snapshotAnterior, 'basic'), 1)

  // Velocidad = cambio del ratio por mes
  const mesesEntre = monthsBetween(snapshotAnterior.period_date, snapshotActual.period_date)
  const velocidadRatio = (ratioActual - ratioAnterior) / mesesEntre

  // Análisis de migración de categorías
  const nuevoPremium = snapshotActual.filter(e =>
    e.data.tier === 'premium' &&
    !snapshotAnterior.find(a => a.data.external_id === e.data.external_id))
  const cerroBasic = snapshotAnterior.filter(e =>
    e.data.tier === 'basic' &&
    !snapshotActual.find(a => a.data.external_id === e.data.external_id))
  const upgradedTier = snapshotActual.filter(e => {
    const prev = snapshotAnterior.find(a => a.data.external_id === e.data.external_id)
    return prev && TIER_ORDER[e.data.tier] > TIER_ORDER[prev.data.tier]
  })

  // Score compuesto de velocidad
  const scoreVelocidad = normalize(velocidadRatio, promediosCDMX) * 100
  const scoreMigracion = (nuevoPremium.length * 2 + upgradedTier.length - cerroBasic.length * 0.5)
  const finalScore = clamp(scoreVelocidad * 0.60 + normalize(scoreMigracion) * 0.40, 0, 100)

  // Dirección
  const direccion = velocidadRatio > 0.05 ? 'acelerando' :
                    velocidadRatio > 0 ? 'positiva_lenta' :
                    velocidadRatio > -0.05 ? 'estable' : 'revertiendo'

Output:
  score_value: 0-100 (0=revertiendo, 50=estable, 100=gentrificación acelerada)
  score_label: dirección
  components: {
    ratio_premium_basic_actual: number,
    ratio_premium_basic_anterior: number,
    velocidad_ratio_por_mes: number,
    negocios_premium_nuevos: number,
    negocios_basic_cerrados: number,
    negocios_upgraded_tier: number,
    direccion: text,
    meses_entre_snapshots: number,
    prediccion_ratio_6m: number,
    ejemplos_premium_nuevos: [{ nombre, scian, direccion }],
    ejemplos_basic_cerrados: [{ nombre, scian, direccion }]
  }

Confidence:
  high: ≥ 2 snapshots separados ≥ 6 meses, ≥ 100 establecimientos
  medium: 2 snapshots separados 3-6 meses, ≥ 50 establecimientos
  low: 2 snapshots separados < 3 meses
  insufficient_data: < 2 snapshots (IMPOSIBLE calcular sin historial)

Persistencia: zone_scores (zone_id, 'gentrification_velocity', period_date)
Componente: GentrificationVelocityGauge — velocímetro + ejemplos de cambio
Page: /admin/inteligencia, /asesor/inteligencia
Notificación: Velocidad pasó de 'estable' a 'acelerando' → "Colonia [X] muestra señales de gentrificación"
API externa: GET /api/v1/scores/gentrification_velocity?lat=X&lon=Y
  Producto: DMX Momentum Index
  Clientes: fondos de inversión, desarrolladores buscando oportunidades
```

---

## 9.4 N04 — Crime Trajectory

```
ID:           N04
Nombre:       Crime Trajectory
Nivel:        0
Categoría:    nuevos
Dependencias: NINGUNA (solo FGJ temporal)
Fuente:       geo_data_points WHERE source='fgj'
Fase:         R5a-2
```

### 1. Fuente
```
geo_data_points WHERE source='fgj' AND zone_id=? ORDER BY period_date DESC
Requiere: datos de últimos 24 meses para calcular tendencia
```

### 2. Ingesta
```
Ingestor FGJ: /lib/intelligence-engine/ingest/fgj.ts (cron mensual)
N04 consume datos ya ingestados — no tiene ingestor propio.
```

### 3. Almacenamiento
```
Lee de: geo_data_points WHERE source='fgj' (acumulado mensual)
```

### 4. Procesamiento
```
Calculator: calculators/nuevos/crime-trajectory.ts

Inputs:
  1. FGJ últimos 12 meses por zona
  2. FGJ 12-24 meses atrás por zona (para tendencia)

Lógica:
  // Vectores de tendencia por tipo de delito
  const TIPOS = ['ROBO_TRANSEÚNTE', 'ROBO_VEHÍCULO', 'ROBO_CASA', 'HOMICIDIO',
                 'LESIONES', 'VIOLENCIA_FAMILIAR', 'FRAUDE', 'DAÑO_PROPIEDAD']

  for (const tipo of TIPOS) {
    const reciente = count FGJ últimos 6 meses WHERE categoria LIKE tipo
    const anterior = count FGJ 6-12 meses atrás WHERE categoria LIKE tipo
    const trend = anterior > 0 ? (reciente - anterior) / anterior * 100 : 0
    vectores[tipo] = { reciente, anterior, trend_pct: trend,
                       direccion: trend < -10 ? 'mejorando' : trend > 10 ? 'empeorando' : 'estable' }
  }

  // Score compuesto: más tipos mejorando = mejor score
  const mejorando = Object.values(vectores).filter(v => v.direccion === 'mejorando').length
  const empeorando = Object.values(vectores).filter(v => v.direccion === 'empeorando').length
  const trendScore = (mejorando - empeorando) / TIPOS.length * 50 + 50

  // Horarios de riesgo con tendencia
  const horariosRiesgoReciente = groupByHora(fgj_6m_reciente)
  const horariosRiesgoAnterior = groupByHora(fgj_6m_anterior)

  // Radio de contagio delictivo: ¿los delitos se concentran o dispersan?
  const dispersion = calcStdDevLocation(fgj_12m)
  const contagioKm = dispersion * 111 // grados a km approx

Output:
  score_value: 0-100 (100 = tendencia muy positiva/mejorando)
  score_label: 'Mejorando significativamente' | 'Mejorando' | 'Estable' | 'Empeorando' | 'Deterioro acelerado'
  components: {
    vectores_por_tipo: { [tipo]: { reciente, anterior, trend_pct, direccion } },
    tipos_mejorando: number,
    tipos_empeorando: number,
    tipos_estables: number,
    horarios_riesgo: [{ hora, count, trend }],
    radio_contagio_km: number,
    delito_dominante: { tipo, count, trend },
    prediccion_6m: text
  }

Persistencia: zone_scores (zone_id, 'crime_trajectory', period_date)
Componente: CrimeTrajectoryPanel — arrows por tipo de delito + heatmap horario + tendencia
Page: /proyectos/[id] Tab Zona Seguridad, /admin/inteligencia
Notificación: Zona pasó de 'empeorando' a 'mejorando' → "Mejora de seguridad detectada en [zona]"
API externa: GET /api/v1/scores/crime_trajectory?lat=X&lon=Y
```

---

## 9.5 N05 — Infrastructure Resilience

```
ID: N05 | Nivel: 0 | Categoría: nuevos
Dependencias: NINGUNA (SACMEX + GTFS redundancia + Atlas)
Fuente: geo_data_points WHERE source IN ('sacmex', 'gtfs', 'atlas_riesgos')
Fase: R5a-2

### 1-3. Fuente → Almacenamiento
```
Fuente: geo_data_points WHERE source IN ('sacmex', 'gtfs', 'atlas_riesgos')
Ingesta: sacmex.ts (mensual) + gtfs.ts (trimestral) + atlas-riesgos.ts (anual)
N05 consume datos ya ingestados — no tiene ingestor propio.
```

Calculator: calculators/nuevos/infrastructure-resilience.ts

Inputs:
  1. SACMEX: frecuencia cortes, duración, tendencia mejora/empeoramiento
  2. GTFS: redundancia de transporte (líneas alternativas si una falla)
  3. Atlas: riesgo de inundación + hundimiento (afecta infraestructura)

Lógica:
  // Agua: score inverso de cortes
  waterResilience = 100 - (frecuenciaCortesMes * 10 + duracionPromedioHrs * 5)
  waterResilience = clamp(waterResilience, 0, 100)

  // Transporte: redundancia = si Metro cierra, ¿hay Metrobús/bus alternativo?
  tiposDistintos = unique(estaciones_1km.map(e => e.data.route_type))
  lineasDistintas = unique(estaciones_1km.map(e => e.data.route_id))
  transitResilience = min(tiposDistintos.length * 20 + lineasDistintas.length * 5, 100)

  // Infraestructura física: riesgo de daño por sismo/inundación
  physicalRisk = atlas.riesgo_hundimiento === 'alto' ? 30 :
                 atlas.riesgo_hundimiento === 'medio' ? 60 : 90
  if (atlas.riesgo_inundacion === 'alto') physicalRisk -= 20

  score = waterResilience * 0.35 + transitResilience * 0.30 + physicalRisk * 0.35

Output:
  score_value: 0-100
  components: { water_resilience, transit_resilience, physical_risk,
                cortes_mes, lineas_alternativas, riesgo_hundimiento }

Persistencia: zone_scores (zone_id, 'infrastructure_resilience', period_date)
API externa: GET /api/v1/scores/infrastructure?lat=X&lon=Y
```

---

## 9.6 N06 — School Premium

```
ID: N06 | Nivel: 0 | Categoría: nuevos
Dependencias: NINGUNA (SIGED + market_prices_secondary)
Fuente: geo_data_points(siged) + market_prices_secondary

### 1-3. Fuente → Almacenamiento
```
Fuente: geo_data_points(siged) + market_prices_secondary
Ingesta: siged.ts (anual) + sync-props-market cron (mensual)
N06 consume datos ya ingestados — no tiene ingestor propio.
```

Calculator: calculators/nuevos/school-premium.ts

Inputs:
  1. SIGED escuelas en radio 2km con calidad (PLANEA, ratio alumnos/docente)
  2. market_prices_secondary: precio/m² de zona vs zonas con peores escuelas

Lógica:
  // ¿Cuánto premium de precio generan las buenas escuelas?
  schoolQuality = H01 School Quality score (o calcular directo si H01 no disponible)
  precioM2Zona = market_prices_secondary zona
  precioM2ZonasSinEscuelas = avg(market_prices de zonas con schoolQuality < 30)

  premiumPct = (precioM2Zona - precioM2ZonasSinEscuelas) / precioM2ZonasSinEscuelas * 100
  premiumAtribuibleEscuelas = premiumPct * correlationFactor // 0.3-0.5 estimado

  // Score: calidad de escuelas × premium que generan
  score = schoolQuality * 0.60 + normalize(premiumAtribuibleEscuelas) * 0.40

Output:
  score_value: 0-100
  components: { school_quality, premium_pct, premium_atribuible_pct,
                escuelas_premium_radio, escuela_top: { nombre, nivel, planea } }

Persistencia: zone_scores (zone_id, 'school_premium', period_date)
Page: /proyectos/[id] Tab Zona (prominente para perfil familia)
```

---

## 9.7 N07 — Water Security Index

```
ID: N07 | Nivel: 0 | Categoría: nuevos
Dependencias: NINGUNA (SACMEX + Atlas + CONAGUA)
Fuente: geo_data_points WHERE source IN ('sacmex', 'atlas_riesgos', 'conagua')

### 1-3. Fuente → Almacenamiento
```
Fuente: geo_data_points WHERE source IN ('sacmex', 'atlas_riesgos', 'conagua')
Ingesta: sacmex.ts (mensual) + atlas-riesgos.ts (anual) + conagua.ts (anual)
N07 consume datos ya ingestados — no tiene ingestor propio.
```

Calculator: calculators/nuevos/water-security.ts

Inputs:
  1. SACMEX: cortes programados frecuencia + duración + tendencia
  2. Atlas: riesgo inundación
  3. CONAGUA: nivel acuífero, disponibilidad zona

Lógica:
  // Compuesto de 3 dimensiones
  abastecimiento = 100 - (cortesFreq * 15 + duracionAvg * 5)  // inverso de cortes
  riesgoInundacion = atlas.riesgo_inundacion === 'muy_alto' ? 10 :
                     atlas.riesgo_inundacion === 'alto' ? 30 :
                     atlas.riesgo_inundacion === 'medio' ? 60 : 90
  disponibilidadSubterranea = conagua.disponibilidad_pct || 50  // default medio

  score = abastecimiento * 0.45 + riesgoInundacion * 0.30 + disponibilidadSubterranea * 0.25

  // Tendencia: comparar últimos 6 meses vs anteriores
  tendencia = compararCortes6mReciente_vs_6mAnterior

  // Impacto financiero: "water discount"
  waterDiscount = score < 40 ? -5 : score < 60 ? -2 : 0  // % estimado de descuento en valor

Output:
  score_value: 0-100
  components: { abastecimiento, riesgo_inundacion, disponibilidad_subterranea,
                cortes_mes_promedio, duracion_promedio_hrs, tendencia,
                water_discount_pct, prediccion_12m }

Persistencia: zone_scores (zone_id, 'water_security', period_date)
Componente: WaterSecurityPanel — 3 gauges + tendencia + water discount
Page: /proyectos/[id] Tab Zona Riesgos
API externa: GET /api/v1/scores/water_security?lat=X&lon=Y
  Producto: DMX Risk Score
```

---

## 9.8 N08 — Walkability Score MX

```
ID: N08 | Nivel: 0 | Categoría: nuevos
Dependencias: NINGUNA (DENUE density + GTFS + street connectivity)

### 1-3. Fuente → Almacenamiento
```
Fuente: geo_data_points WHERE source='denue' + source='gtfs' (radio 500m del centroide zona)
Ingesta: denue.ts (mensual) + gtfs.ts (trimestral)
N08 consume datos ya ingestados — no tiene ingestor propio.
```

Calculator: calculators/nuevos/walkability-mx.ts

Inputs:
  1. DENUE: densidad de establecimientos por categoría en radio 500m (walking distance)
  2. GTFS: paradas de transporte en radio 500m
  3. Conectividad vial (proxy: densidad de intersecciones, estimable de DENUE dispersión)

Lógica:
  // Inspirado en Walk Score pero adaptado a México
  // Walk Score usa: restaurants, groceries, shopping, coffee, banks, parks, schools, books, entertainment
  // DMX MX usa macro_categories del DENUE filtradas por walking distance (500m)

  const CATEGORIAS_WALK = {
    ALIMENTACION: { peso: 0.20, minimo: 3 },    // tiendas, super, mercado
    GASTRONOMIA: { peso: 0.15, minimo: 5 },     // restaurantes, fondas, cafés
    SALUD: { peso: 0.10, minimo: 1 },           // farmacia, consultorio
    EDUCACION: { peso: 0.10, minimo: 1 },       // escuela
    COMERCIO_RETAIL: { peso: 0.10, minimo: 2 }, // tiendas
    ENTRETENIMIENTO: { peso: 0.05, minimo: 1 }, // gym, cine
    BELLEZA_PERSONAL: { peso: 0.05, minimo: 1 },
    SERVICIOS_PROF: { peso: 0.05, minimo: 1 },  // banco, oficina
    TRANSPORTE: { peso: 0.20, minimo: 2 }       // estaciones/paradas
  }

  for (const [cat, config] of Object.entries(CATEGORIAS_WALK)) {
    const count = countInRadius(denue, zoneCentroid, 500, cat)
    const catScore = Math.min(count / config.minimo, 3) / 3 * 100  // cap at 3x minimum
    totalScore += catScore * config.peso
  }

  // Bonus por densidad general (más cosas = más caminable)
  const densidadBonus = Math.min(totalEstablecimientos500m / 50, 1) * 10

  finalScore = clamp(totalScore + densidadBonus, 0, 100)

Output:
  score_value: 0-100 (compatible con Walk Score scale)
  score_label:
    90-100: 'Daily Errands — Caminable para todo'
    70-89: 'Very Walkable — Mayoría de mandados a pie'
    50-69: 'Somewhat Walkable — Algunos mandados a pie'
    25-49: 'Car-Dependent — Mayoría en coche'
    0-24: 'Very Car-Dependent — Casi todo en coche'
  components: {
    por_categoria: { [cat]: { count_500m, score, minimo } },
    total_establecimientos_500m: number,
    densidad_500m: number,
    comparativa_walk_score_us: text  // "Equivalente a Walk Score ~X"
  }

Persistencia: zone_scores (zone_id, 'walkability_mx', period_date)
Componente: WalkabilityBadge — número grande + label + comparativa
Page: /proyectos/[id] Tab Zona (prominente), /explorar filtro
API externa: GET /api/v1/scores/walkability?lat=X&lon=Y
  Producto estrella: compite directamente con Walk Score pero para México
```

---

## 9.9 N09 — Nightlife Economy

```
ID: N09 | Nivel: 0 | Categoría: nuevos
Dependencias: NINGUNA (DENUE SCIAN bares/restaurantes + FGJ horarios)

### 1-3. Fuente → Almacenamiento
```
Fuente: geo_data_points WHERE source='denue' (SCIAN nightlife) + source='fgj' (horarios)
Ingesta: denue.ts (mensual) + fgj.ts (mensual)
N09 consume datos ya ingestados — no tiene ingestor propio.
```

Calculator: calculators/nuevos/nightlife-economy.ts

Inputs:
  1. DENUE SCIAN filtrado: restaurantes premium, bares, antros, cafeterías nocturnas
     SCIAN: 722511, 722512, 722514, 713210, 713111
  2. FGJ: delitos por hora en la zona (20:00-06:00 = periodo nocturno)

Lógica:
  nightlifeCount = count DENUE WHERE scian IN (nightlife codes) AND zone_id
  nightlifeDensity = nightlifeCount / areaKm2

  // Seguridad nocturna (crucial para que nightlife sea positivo)
  delitosNocturnos = count FGJ WHERE hora_hecho BETWEEN '20:00' AND '06:00'
  delitosTotal = count FGJ total
  ratioNocturno = delitosNocturnos / max(delitosTotal, 1)
  safetyNight = 100 - (ratioNocturno * 200) // penalizar fuerte si >50% es nocturno

  // Score: nightlife alto + seguridad nocturna alta = bueno
  // nightlife alto + seguridad baja = peligroso, score bajo
  score = normalize(nightlifeDensity) * 0.50 + safetyNight * 0.50

Output:
  score_value: 0-100
  components: { nightlife_count, nightlife_density, safety_night,
                delitos_nocturnos_pct, top_establecimientos: [...],
                es_zona_nocturna: boolean }

Persistencia: zone_scores (zone_id, 'nightlife_economy', period_date)
Page: /proyectos/[id] Tab Zona (relevante para perfil nightlife/joven)
```

---

## 9.10 N10 — Senior Livability

```
ID: N10 | Nivel: 0 | Categoría: nuevos
Dependencias: NINGUNA (DGIS + GTFS + DENUE farmacias + FGJ seguridad diurna)

### 1-3. Fuente → Almacenamiento
```
Fuente: geo_data_points WHERE source IN ('dgis', 'gtfs', 'denue', 'fgj')
Ingesta: dgis.ts (anual) + gtfs.ts (trimestral) + denue.ts (mensual) + fgj.ts (mensual)
N10 consume datos ya ingestados — no tiene ingestor propio.
```

Calculator: calculators/nuevos/senior-livability.ts

Inputs:
  1. DGIS: nivel atención accesible (1er y 2do nivel en radio 2km)
  2. GTFS: accesibilidad transporte (no requiere caminar mucho)
  3. DENUE: farmacias, consultorios, centros de día en radio 1km
  4. FGJ: seguridad en horario diurno (06:00-18:00)

Lógica:
  healthAccess = min(primerNivel2km.length / 2, 1) * 30 + min(segundoNivel3km.length, 1) * 20
  farmacias = min(countDENUE('461213', 1km) / 2, 1) * 15 // farmacias en 1km
  transitEasy = F02 transit score * 0.15 // transporte accesible
  safetyDay = 100 - (delitos_06_18 / totalDelitos * 100) // seguridad diurna
  safetyComponent = safetyDay * 0.20

  score = healthAccess + farmacias + transitEasy + safetyComponent

Output:
  score_value: 0-100
  components: { health_access, farmacias_1km, transit_accessibility,
                safety_diurna, servicios_senior: [...] }

Persistencia: zone_scores (zone_id, 'senior_livability', period_date)
Page: /proyectos/[id] Tab Zona (relevante para perfil senior/retirado)
API externa: GET /api/v1/scores/senior_livability?lat=X&lon=Y
```

---

## 9.11 N11 — DMX Momentum Index

```
ID:           N11
Nombre:       DMX Momentum Index
Nivel:        0 (pero requiere snapshots temporales = funcional solo después de mes 2+)
Categoría:    nuevos
Dependencias: NINGUNA directa (usa deltas temporales de fuentes crudas)
CRÍTICO:      Este es el score MÁS VALIOSO del IE — predice hacia dónde va una zona

Calculator: calculators/nuevos/momentum-index.ts

Inputs:
  1. DENUE delta: cambio ratio premium/basic entre snapshots (N03 gentrification velocity)
  2. FGJ trend: dirección de delitos últimos 6 meses (N04 crime trajectory)
  3. SACMEX trend: mejora/empeoramiento de cortes de agua
  4. market_prices_secondary trend: tendencia precios
  5. search_trends: tendencia de búsquedas en la zona

Lógica:
  // Momentum = dirección + velocidad de transformación urbana
  // Compuesto de 5 señales temporales, todas comparando periodo reciente vs anterior

  const denueDelta = N03.velocidad_ratio_por_mes || 0       // positivo = premium crece
  const crimeDelta = -N04.vectores_trend_promedio || 0       // negativo inverted = mejora
  const waterDelta = calcWaterTrend(sacmex_6m vs sacmex_12m) // positivo = menos cortes
  const priceDelta = linearSlope(market_prices_6m)            // positivo = precios suben
  const searchDelta = linearSlope(search_trends_6m)           // positivo = más búsquedas

  // Normalizar cada delta a -1..+1
  const signals = {
    economic: normalize(denueDelta, -0.5, 0.5),    // peso 0.25
    safety: normalize(crimeDelta, -30, 30),          // peso 0.20
    infrastructure: normalize(waterDelta, -5, 5),    // peso 0.15
    market: normalize(priceDelta, -10, 10),          // peso 0.25
    demand: normalize(searchDelta, -50, 50)          // peso 0.15
  }

  const PESOS = { economic: 0.25, safety: 0.20, infrastructure: 0.15,
                  market: 0.25, demand: 0.15 }

  const momentum = Object.entries(signals).reduce((sum, [key, val]) =>
    sum + val * PESOS[key], 0)

  // Escala: -1 a +1 → convertir a 0-100 (50 = neutral)
  const score = (momentum + 1) / 2 * 100

  const label = score >= 75 ? 'Momentum fuerte positivo' :
                score >= 60 ? 'Momentum positivo' :
                score >= 45 ? 'Estable' :
                score >= 30 ? 'Momentum negativo' : 'Deterioro acelerado'

  // Predicción cualitativa
  const prediccion = score >= 60 ?
    `La zona muestra señales consistentes de mejora. Se espera apreciación de ${(priceDelta*12).toFixed(1)}% anual si las tendencias se mantienen.` :
    score <= 40 ?
    `La zona muestra señales de deterioro. Riesgo de depreciación si las tendencias continúan.` :
    `La zona está estable. Sin señales claras de cambio en el corto plazo.`

Output:
  score_value: 0-100 (50 = neutral)
  score_label: text
  components: {
    economic_signal: number,     // -1 a +1
    safety_signal: number,
    infrastructure_signal: number,
    market_signal: number,
    demand_signal: number,
    momentum_raw: number,        // -1 a +1
    señales_positivas: string[],
    señales_negativas: string[],
    señal_dominante: text,
    prediccion_12m: text,
    confianza_prediccion: 'alta' | 'media' | 'baja'
  }

Confidence:
  high: ≥ 2 snapshots DENUE + FGJ 12m + SACMEX 6m + market_prices 6m
  medium: algunos datos temporales disponibles
  low: solo 1-2 señales con datos temporales
  insufficient_data: sin datos temporales (primer mes)

Persistencia: zone_scores (zone_id, 'momentum_index', period_date)

API: GET /api/scores/zone/[zoneId]/momentum_index
Hook: useScore('zone_scores', zoneId, 'momentum_index')
Componente: MomentumIndicator
  - Gauge semicircular: rojo(izq) → amarillo(centro) → verde(derecha)
  - 5 barras de señal (tipo wifi) por cada dimensión
  - Predicción textual en card debajo
  - Trend line últimos 6 meses (si hay historial)
Page: /proyectos/[id] Tab Zona (prominente), /admin/inteligencia (mapa),
      /explorar (filtro "zonas con momentum positivo"), /indices (público)
Interacción: Click en cada señal → drill-down con datos crudos
Feedback: Búsquedas filtradas por momentum → search_logs → valida demanda predictiva
Notificación: Momentum cambió de señal → "La colonia [X] cambió a momentum [positivo/negativo]"
API externa: GET /api/v1/scores/momentum?lat=X&lon=Y
  Producto: DMX Momentum Index (producto licenciable estrella)
  Clientes: fondos de inversión, bancos (riesgo colateral), desarrolladores (site selection)
  Pricing: $5K-$50K/mes según volumen de consultas
```

---

## 9.12 Sistema de Snapshots Temporales

El sistema de snapshots es la infraestructura que habilita N03, N04, N11 y todos los scores temporales.

### Principio
```
NUNCA sobreescribir datos. SIEMPRE insertar con period_date nuevo.
El historial DE SNAPSHOTS es el activo temporal más valioso del IE.
Cada mes que pasa, la barrera de entrada sube.
Un competidor que empiece mañana necesita meses para alcanzar nuestro baseline.
```

### Implementación: /lib/intelligence-engine/snapshots/

```typescript
// snapshot-manager.ts

interface SnapshotConfig {
  source: string           // 'denue' | 'fgj' | 'sacmex'
  frequency: 'monthly' | 'weekly'
  retentionMonths: number  // cuántos meses mantener snapshots antiguos
}

const SNAPSHOT_CONFIGS: SnapshotConfig[] = [
  { source: 'denue', frequency: 'monthly', retentionMonths: 60 },  // 5 años de DENUE
  { source: 'fgj', frequency: 'monthly', retentionMonths: 36 },    // 3 años de FGJ
  { source: 'sacmex', frequency: 'monthly', retentionMonths: 24 }, // 2 años de SACMEX
  { source: '0311', frequency: 'monthly', retentionMonths: 24 },
]

async function createSnapshot(source: string, periodDate: Date): Promise<void> {
  // 1. Marcar snapshot anterior como is_active=false
  await supabaseAdmin
    .from('geo_data_points')
    .update({ is_active: false })
    .eq('source', source)
    .eq('is_active', true)

  // 2. Insertar nuevos datos con is_active=true y period_date=hoy
  // (el ingestor específico hace el INSERT)

  // 3. Registrar snapshot en tabla de control
  await supabaseAdmin
    .from('geo_snapshots') // NUEVA TABLA v4
    .insert({
      source,
      period_date: periodDate,
      record_count: newRecords.length,
      created_at: new Date()
    })
}

async function getSnapshotDates(source: string): Promise<Date[]> {
  const { data } = await supabaseAdmin
    .from('geo_snapshots')
    .select('period_date')
    .eq('source', source)
    .order('period_date', { ascending: false })
  return data.map(d => d.period_date)
}
```

```typescript
// delta-calculator.ts

interface DeltaResult {
  nuevos: GeoDataPoint[]      // en snapshot N pero no en N-1
  cerrados: GeoDataPoint[]    // en snapshot N-1 pero no en N
  cambiados: { current: GeoDataPoint, previous: GeoDataPoint, changes: string[] }[]
}

async function calculateDelta(
  source: string,
  currentDate: Date,
  previousDate: Date,
  zoneId?: string
): Promise<DeltaResult> {
  const current = await getSnapshot(source, currentDate, zoneId)
  const previous = await getSnapshot(source, previousDate, zoneId)

  const currentIds = new Set(current.map(r => r.data.external_id))
  const previousIds = new Set(previous.map(r => r.data.external_id))

  const nuevos = current.filter(r => !previousIds.has(r.data.external_id))
  const cerrados = previous.filter(r => !currentIds.has(r.data.external_id))

  const cambiados = []
  for (const curr of current) {
    const prev = previous.find(p => p.data.external_id === curr.data.external_id)
    if (prev) {
      const changes = detectChanges(curr.data, prev.data)
      if (changes.length > 0) cambiados.push({ current: curr, previous: prev, changes })
    }
  }

  return { nuevos, cerrados, cambiados }
}
```

### Nueva tabla: geo_snapshots

```sql
CREATE TABLE geo_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL,
  period_date date NOT NULL,
  record_count integer NOT NULL,
  metadata jsonb DEFAULT '{}',   -- stats del snapshot
  created_at timestamptz DEFAULT now(),
  UNIQUE(source, period_date)
);

CREATE INDEX idx_geo_snapshots_source ON geo_snapshots(source, period_date DESC);
```

---

# MÓDULO 10: 7 ÍNDICES PROPIETARIOS DMX

Los índices DMX son los "FICO scores" del real estate mexicano. Se calculan mensualmente, se publican trimestralmente, y son los productos estrella del IE.

---

## 10.1 DMX-IPV — Índice Precio-Valor

```
Código:       DMX-IPV
Nombre:       Índice Precio-Valor
Frecuencia:   Mensual
Publicación:  Trimestral con reporte
Tabla:        dmx_indices (index_code='DMX-IPV')

Concepto: ¿Las propiedades de esta zona están sobre o sub-valuadas
respecto a su valor fundamental (calidad de vida + infraestructura + tendencia)?

Fórmula:
  IPV = (F08_LQI * 0.30 + F09_ValueScore * 0.25 + N11_Momentum * 0.20 +
         A12_PriceFairness_zona_avg * 0.15 + N01_EcosystemDiversity * 0.10)

  Interpretación:
    IPV > 70: Zona sub-valuada (precio bajo vs valor real) → OPORTUNIDAD
    IPV 40-70: Zona con precio justo
    IPV < 40: Zona sobre-valuada (precio alto vs valor real) → PRECAUCIÓN

Componentes:
  index_components: {
    life_quality: { value, weight: 0.30 },
    value_score: { value, weight: 0.25 },
    momentum: { value, weight: 0.20 },
    price_fairness_avg: { value, weight: 0.15 },
    ecosystem_diversity: { value, weight: 0.10 }
  }
  interpretation: "La zona [X] tiene un IPV de 72, indicando que está
                   ligeramente sub-valuada. El LQI alto (78) y momentum
                   positivo (+0.3σ) sugieren potencial de apreciación."

Persistencia: dmx_indices (index_code='DMX-IPV', zone_id, period_date)
```

---

## 10.2 DMX-IAB — Índice Absorción Benchmark

```
Código: DMX-IAB
Concepto: ¿Qué tan rápido se venden las propiedades en esta zona vs el benchmark?

Fórmula:
  IAB = (B08_AbsorptionRate_zona_avg / benchmark_cdmx) * 50
  // 50 = al benchmark, >50 = más rápido, <50 = más lento

  benchmark_cdmx = promedio de absorción de todas las zonas activas

Componentes: absorption_zona, benchmark, ratio, meses_inventario, tendencia
Interpretación: IAB 65 = "venta 30% más rápida que promedio CDMX"
```

---

## 10.3 DMX-IDS — Índice Desarrollo Social Integrado

```
Código: DMX-IDS
Concepto: Calidad de vida multidimensional (versión DMX del IDS oficial)

Fórmula:
  IDS = F08_LQI * 0.25 + H01_SchoolQuality * 0.15 + H02_HealthAccess * 0.10 +
        N01_EcosystemDiversity * 0.15 + N02_EmploymentAccess * 0.15 +
        F01_Safety * 0.10 + F02_Transit * 0.10

Componentes: 7 dimensiones con score individual
Interpretación: IDS 75 = "desarrollo social alto, comparable con top 20% CDMX"
```

---

## 10.4 DMX-IRE — Índice Riesgo Estructural

```
Código: DMX-IRE
Concepto: Riesgo compuesto (sísmico + hídrico + legal + criminal + financiero)

Fórmula:
  IRE = 100 - (
    (100 - H03_SeismicRisk) * 0.25 +
    (100 - N07_WaterSecurity) * 0.20 +
    (100 - F01_Safety) * 0.20 +
    (100 - F06_LandUse_compliance) * 0.15 +
    (100 - N05_InfraResilience) * 0.20
  )
  // Inverted: IRE alto = BAJO riesgo

Componentes: riesgo por dimensión, riesgo dominante, mitigaciones
Interpretación: IRE 80 = "riesgo estructural bajo"
Producto: DMX Risk Score (licenciable para aseguradoras)
```

---

## 10.5 DMX-ICO — Índice Costo Oportunidad

```
Código: DMX-ICO
Concepto: ¿Invertir en inmobiliario en esta zona es mejor que alternativas?

Fórmula:
  yieldInmobiliario = A02_bestYield_zona_avg
  yieldCetes = macro_series.tasa_referencia  // rendimiento libre de riesgo
  yieldBolsa = ~12% anualizado histórico BMV
  
  ICO = (yieldInmobiliario - yieldCetes) / yieldCetes * 50 + 50
  // >50 = inmobiliario gana, <50 = alternativas ganan

Componentes: yield inmobiliario, yield CETES, yield bolsa, spread, ajuste riesgo
Interpretación: ICO 62 = "inmobiliario rinde 24% sobre CETES ajustado por riesgo"
```

---

## 10.6 DMX-MOM — Momentum Index (NUEVO v4)

```
Código:       DMX-MOM
Nombre:       DMX Momentum Index
Concepto:     Dirección + velocidad de transformación urbana
NUEVO:        Este índice NO existía en v3

Fórmula:
  MOM = N11_MomentumIndex (el score N11 elevado a índice)
  // N11 ya calcula el momentum compuesto de 5 señales temporales
  // DMX-MOM lo publica como índice oficial con metodología abierta

Interpretación:
  MOM > 65: "Zona en transformación positiva acelerada"
  MOM 50-65: "Zona con mejora gradual"
  MOM 40-50: "Zona estable"
  MOM < 40: "Zona con señales de deterioro"

Publicación: Mensual con narrativa
  "DMX Momentum Reporte Mensual: Las 10 colonias con mayor momentum en CDMX"
  → contenido viralizarle para medios, newsletter, redes sociales

Producto licenciable: $5K-$50K/mes
  Clientes: fondos inmobiliarios, bancos (evaluación colateral), aseguradoras
```

---

## 10.7 DMX-LIV — Livability Index (NUEVO v4)

```
Código:       DMX-LIV
Nombre:       DMX Livability Index
Concepto:     Calidad de vida compuesta con impacto financiero ($)
NUEVO:        Este índice NO existía en v3

Fórmula:
  LIV = F08_LQI * 0.30 +
        N08_WalkabilityMX * 0.15 +
        N01_EcosystemDiversity * 0.10 +
        N10_SeniorLivability * 0.05 +
        N07_WaterSecurity * 0.10 +
        H01_SchoolQuality * 0.10 +
        H02_HealthAccess * 0.05 +
        N02_EmploymentAccess * 0.10 +
        N04_CrimeTrajectory * 0.05  // tendencia, no nivel actual

  // Lo que lo diferencia de F08 LQI:
  // 1. Incluye walkability MX (N08)
  // 2. Incluye scores NUEVOS v4 (ecosystem, water security, senior)
  // 3. Incluye tendencia de seguridad (no solo nivel)
  // 4. Tiene impacto financiero asociado

  // Impacto financiero: premium/descuento estimado
  livabilityPremium = (LIV - 50) * 0.3  // cada punto sobre 50 = ~0.3% premium
  // LIV 75 → premium de +7.5% estimado sobre promedio
  // LIV 35 → descuento de -4.5% estimado

Componentes: 9 dimensiones + premium_pct estimado
Interpretación: LIV 78 = "Calidad de vida excepcional, premium estimado +8.4%"

Producto: DMX Livability API (producto licenciable principal)
  GET /api/v1/scores/livability?lat=X&lon=Y
  Response: { score: 78, label: "Excepcional", premium_pct: 8.4, components: {...} }
  Clientes: portales inmobiliarios, apps de movilidad, fintechs, gobierno
  Pricing: $5K-$25K/mes
```

---

## 10.8 Publicación de Índices

### Calendario
```
Mensual:   DMX-MOM se actualiza y publica en /indices
Trimestral: Los 7 índices se publican con reporte completo
            "DMX Índice de Colonias CDMX — Q2 2026"
Anual:     DMX Wrapped con resumen del año
```

### Metodología abierta
```
Página: /metodologia (pública, sin auth)
Contenido:
  - Descripción de cada índice
  - Fuentes de datos usadas (sin revelar pesos exactos)
  - Ejemplo de cálculo
  - Disclaimer: "Los pesos específicos y ajustes son propietarios"
  - Link a reporte trimestral más reciente
  - FAQ para periodistas y académicos

Inspiración: S&P publica cómo calcula sus índices (metodología general)
             pero no revela los ajustes específicos
```

### Newsletter
```
Cron: monthly_index_newsletter (día 5 de cada mes)
Contenido: Top 5 zonas momentum, cambios en rankings, oportunidades detectadas
Distribución: email subscribers + blog + redes sociales
Componente: IndexNewsletterTemplate (email HTML)
```

---

# CONTEO TOTAL IE v4

| Categoría | Scores | Implementados | Nuevos v4 |
|-----------|--------|---------------|-----------|
| Nivel 0 (original) | 21 | 1 (B12) | — |
| Nivel 1 (original) | 16 | 2 (B02, B08) | — |
| Nivel 2 (original) | 14 | 0 | — |
| Nivel 3 (original) | 12 | 1 (B11) | — |
| Nivel 4 (original) | 7 | 0 | — |
| Nivel 5 (original) | 26 | 0 | — |
| **Nuevos v4 (N01-N11)** | **11** | **0** | **11** |
| **Subtotal scores** | **108** | **4** | **11** |
| Índices DMX | 7 | 0 | 2 (MOM, LIV) |
| **TOTAL** | **115** | **4** | **13** |

H05 Trust Score es el 5to implementado pero está en Nivel 1.

---

# CROSS-REFERENCES

```
→ PART 1: Fuentes DENUE, FGJ, GTFS, SACMEX que alimentan los 11 scores nuevos
→ PART 1 §3.18: Mapeo SCIAN que N01, N03, N08, N09 usan
→ PART 2: Scores Nivel 0 originales — N01-N11 se insertan en paralelo
→ PART 3: Scores Nivel 2+ que DEPENDERÁN de los nuevos (F10 usa N03, etc.)
→ PART 5: Cascada geo_data_updated que dispara recálculo de N01-N11
→ PART 5: Productos licenciables basados en estos scores e índices
→ BIBLIA_BACKEND_DMX_v4: Tabla geo_snapshots (nueva), dmx_indices actualizada
→ BIBLIA_FRONTEND_DMX_v4: Componentes MomentumIndicator, WalkabilityBadge, etc.
```

---

**FIN DE PART 4 — Continúa en BIBLIA_IE_DMX_v4_PART5.md (Cascadas + Productos + Competencia + Fases)**
