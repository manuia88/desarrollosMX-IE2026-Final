# BIBLIA DMX v5 — INTELLIGENCE ENGINE COMPLETO
## PART 2 de 5: Scores_Nivel0_Nivel1
## Contenido ÍNTEGRO de IE_DMX_v4_PART2
## Fase: Sesiones 07-13 (IE)
---
# BIBLIA IE — DesarrollosMX v4
## Intelligence Engine: Scores Nivel 0 + Nivel 1
## PART 2 de 5 (Módulos 4–5)
## Fecha: 8 abril 2026

---

# MÓDULO 4: SCORES NIVEL 0 (21 scores — sin dependencias de otros scores)

Cada score documenta la cadena completa end-to-end:
1. Fuente → 2. Ingesta → 3. Almacenamiento → 4. Procesamiento → 5. Persistencia → 6. API/tRPC → 7. Hook → 8. Componente → 9. Page → 10. Interacción → 11. Feedback loop → 12. Notificación → 13. API externa

---

## 4.1 F01 — Safety Score (Seguridad de Zona)

```
ID:           F01
Nombre:       Safety Score
Nivel:        0
Categoría:    zona
Tabla dest:   zone_scores
Tier datos:   1 (funciona día 1 con datos externos)
Estado:       NO implementado (calculator pendiente)
```

### 1. Fuente
```
Primaria: FGJ CDMX — carpetas de investigación con delito, categoría, lat/lon, fecha, hora
  Tabla: geo_data_points WHERE source='fgj'
  Volumen: ~100K carpetas/año CDMX
  
Secundaria: *0311 Locatel — reportes ciudadanos de seguridad
  Tabla: geo_data_points WHERE source='0311' AND category LIKE 'seguridad%'
```

### 2. Ingesta
```
Ingestor: /lib/intelligence-engine/ingest/fgj.ts
Cron: refresh_fgj_monthly (mensual)
Proceso: 
  1. GET datos.cdmx.gob.mx/api/3/action/datastore_search?resource_id={id}&limit=1000&offset=N
  2. Paginar hasta obtener todos los registros del mes
  3. Por cada registro: geocode lat/lon → zone_id via zones table
  4. INSERT geo_data_points con source='fgj', period_date=fecha_hecho
  5. Snapshot: NO sobreescribir datos anteriores, cada mes es un nuevo period_date
```

### 3. Almacenamiento
```
Tabla: geo_data_points
Schema por registro:
  source: 'fgj'
  category: categoria_delito (text)
  name: delito (text)
  latitude: numeric(10,7)
  longitude: numeric(10,7)
  zone_id: uuid (FK zones)
  alcaldia: text
  colonia: text
  data: {
    external_id: text,
    delito_tipo: text,
    categoria: text,
    fecha_hecho: date,
    hora_hecho: time,
    ano_inicio: integer
  }
  period_date: date
  is_active: boolean

Índices:
  idx_geo_data_source ON geo_data_points(source, category)
  idx_geo_data_zone ON geo_data_points(zone_id, source)
  idx_geo_data_alcaldia ON geo_data_points(alcaldia, source, category)

RLS: SELECT para auth.uid() IS NOT NULL (lectura pública autenticada)
```

### 4. Procesamiento
```
Calculator: /lib/intelligence-engine/calculators/zona/safety.ts
Función pura: calculateSafety(zoneId: string, radiusKm: number = 1.5)

Inputs:
  1. geo_data_points WHERE source='fgj' AND zone_id=? AND period_date >= now() - interval '12 months'
  2. geo_data_points WHERE source='fgj' AND zone_id=? AND period_date >= now() - interval '24 months'
     (para calcular tendencia)

Lógica:
  // Clasificar delitos por gravedad
  const PESOS_DELITO = {
    'HOMICIDIO DOLOSO': 10,
    'SECUESTRO': 10,
    'VIOLACIÓN': 9,
    'ROBO A CASA HABITACIÓN CON VIOLENCIA': 8,
    'ROBO A TRANSEÚNTE CON VIOLENCIA': 7,
    'ROBO DE VEHÍCULO CON VIOLENCIA': 7,
    'ROBO A TRANSEÚNTE SIN VIOLENCIA': 4,
    'ROBO DE VEHÍCULO SIN VIOLENCIA': 4,
    'ROBO A NEGOCIO SIN VIOLENCIA': 3,
    'LESIONES DOLOSAS': 5,
    'AMENAZAS': 2,
    'FRAUDE': 2,
    'DAÑO A PROPIEDAD': 1,
    'DEFAULT': 3
  };

  // Score = 100 - (sum_ponderado / area_km2) normalizado
  const delitos12m = query últimos 12 meses
  const sumPonderado = delitos12m.reduce((sum, d) => 
    sum + (PESOS_DELITO[d.data.delito_tipo] || PESOS_DELITO.DEFAULT), 0)
  const densidadCriminal = sumPonderado / areaZonaKm2
  
  // Normalizar contra promedio CDMX (percentil)
  const promediosCDMX = await getPromedioDensidadPorZona('cdmx')
  const percentil = calculatePercentile(densidadCriminal, promediosCDMX)
  const score = Math.max(0, Math.min(100, 100 - percentil))
  
  // Tendencia: comparar últimos 6 meses vs 6 meses anteriores
  const delitos6mReciente = filtrar últimos 6 meses
  const delitos6mAnterior = filtrar 6-12 meses atrás
  const trendPct = ((delitos6mReciente.length - delitos6mAnterior.length) / 
                     Math.max(delitos6mAnterior.length, 1)) * 100
  
  // Componentes por tipo de delito
  const componentesPorTipo = groupBy(delitos12m, 'data.categoria')
  
  // Horarios de riesgo
  const porHora = groupBy(delitos12m, d => parseInt(d.data.hora_hecho))
  const horaMaxRiesgo = maxBy(Object.entries(porHora), ([h, arr]) => arr.length)

Output:
  score_value: 0-100 (100 = más seguro)
  score_label: 'Muy segura' | 'Segura' | 'Moderada' | 'Riesgosa' | 'Muy riesgosa'
  components: {
    densidad_criminal: number,
    delitos_12m_total: number,
    delitos_graves_12m: number,
    delitos_por_tipo: { [tipo: string]: number },
    hora_max_riesgo: string,
    horario_riesgo: { hora: number, count: number }[],
    trend_6m_pct: number,
    trend_direction: 'mejorando' | 'estable' | 'empeorando',
    radio_contagio_km: number
  }

Confidence:
  high: >= 50 delitos en zona en 12 meses (suficiente muestra)
  medium: 10-49 delitos
  low: 1-9 delitos
  insufficient_data: 0 delitos (zona sin cobertura FGJ)
```

### 5. Persistencia
```
Tabla: zone_scores
INSERT/UPSERT:
  zone_id: uuid de la zona
  alcaldia: text
  colonia: text (si aplica, null para score de alcaldía)
  score_type: 'safety'
  score_value: numeric(5,2) — el score 0-100
  score_label: text — interpretación humana
  components: jsonb — todo el desglose
  inputs_used: jsonb — { fgj_records: N, period: '12m', radius_km: 1.5 }
  confidence: text
  trend_vs_previous: numeric(5,2) — delta vs cálculo anterior
  trend_direction: text
  period_date: date — primer día del mes del cálculo
  valid_until: date — primer día del mes siguiente
  calculated_at: timestamptz

UNIQUE constraint: (zone_id, score_type, period_date)
Trigger: archive_score_before_update → score_history INSERT
```

### 6. API/tRPC
```
Endpoint REST: GET /api/scores/zone/[zoneId]/safety
Auth: Autenticado (auth.uid() IS NOT NULL)
Cache: staleTime 5 min, gcTime 30 min

tRPC (futuro): trpc.scores.getZoneScore.useQuery({ zoneId, scoreType: 'safety' })

Response:
{
  score_value: 72.5,
  score_label: "Segura",
  components: { ... },
  confidence: "high",
  trend_vs_previous: -2.3,
  calculated_at: "2026-04-01T06:00:00Z"
}
```

### 7. Hook
```typescript
// Consumo via useScore genérico
const { data, isLoading } = useScore('zone_scores', zoneId, 'safety');

// O via useZoneScores para todos los scores de una zona
const { data: allScores } = useZoneScores(zoneId);
const safety = allScores?.safety;

// Si el score no existe aún:
const { data, isCalculating } = useOnDemandScore('zone_scores', zoneId, 'safety');
```

### 8. Componente
```typescript
// Componente compartido: ScoreDisplay
<ScoreDisplay 
  scoreType="safety" 
  entityId={zoneId} 
  table="zone_scores"
  showTrend={true}
  showComponents={true}
/>

// Componente específico de zona: SafetyPanel
// Muestra: score + mapa de calor de delitos + gráfica por hora + tendencia
<SafetyPanel zoneId={zoneId} />

// Dentro de SafetyPanel:
// - Donut chart por tipo de delito (Recharts PieChart)
// - Heatmap de horarios (grid 24h × 7 días)
// - Trend line últimos 12 meses (Recharts LineChart)
// - Badge de tendencia: ↑ Mejorando / → Estable / ↓ Empeorando
```

### 9. Page
```
Portal Público:
  /proyectos/[id] → Tab "Zona" → SafetyPanel
  /explorar → Filtro "Zonas seguras" → filtra zone_scores.safety >= 70

Portal Asesor:
  /asesor/inteligencia → Tab "Zonas" → SafetyPanel por zona del asesor
  /asesor/inventario/[projectId] → Sidebar scores → Safety badge

Portal Comprador:
  /comprador/comparador → Columna Safety en tabla comparativa

Portal Admin:
  /admin/inteligencia/zonas → Mapa Mapbox con heatmap de safety scores
```

### 10. Interacción
```
- Filtrar explorar por "zonas seguras" (score >= umbral)
- Comparar safety entre zonas en el comparador
- Drill-down en componentes: ver tipos de delito, horarios, tendencia
- Exportar datos de zona como PDF (Neighborhood Report)
- Compartir score via WhatsApp/email (deep link)
```

### 11. Feedback loop
```
- Cada vez que un comprador filtra por "zona segura" → search_logs registra
  → B01 Demand Heatmap sabe que seguridad importa a los compradores
- Cada vez que un comprador ve el SafetyPanel → PostHog event 'score_viewed'
  → sabemos qué scores importan más
- Si un asesor usa el safety score en un argumentario → interaction_feedback
  → C04 Objection Killer aprende qué argumentos funcionan
```

### 12. Notificación
```
Trigger: score cambió > 10% vs cálculo anterior
Destinatarios: score_subscriptions WHERE score_type='safety' AND entity_id=zone_id
Canal: según config del suscriptor (in_app / email / whatsapp)
Mensaje: "La seguridad en [zona] cambió: score pasó de X a Y ([dirección])"
```

### 13. API externa
```
GET /api/v1/scores/safety?lat=19.3756&lon=-99.1625&radius=1.5
Auth: X-DMX-API-Key header
Response: { score: 72.5, label: "Segura", components: {...}, confidence: "high" }
Rate limit: según plan API (100/day free, 10K/day paid)
Clientes potenciales: portales inmobiliarios, aseguradoras, bancos, apps de movilidad
```

---

## 4.2 F02 — Transit Score (Accesibilidad de Transporte)

```
ID:           F02
Nombre:       Transit Score
Nivel:        0
Categoría:    zona
Tabla dest:   zone_scores
Tier datos:   1
Estado:       NO implementado
```

### 1-5. Fuente → Persistencia
```
Fuente: geo_data_points WHERE source='gtfs'
Ingesta: /lib/intelligence-engine/ingest/gtfs.ts, trimestral
Calculator: /lib/intelligence-engine/calculators/zona/transit.ts

Inputs:
  1. Estaciones/paradas en radio de 1km del centroide de la zona
  2. Tipo de transporte (metro peso 5, metrobús 4, tren 4, cablebús 3, bus 2, ecobici 1)
  3. Frecuencia en hora pico
  4. Líneas distintas (multimodalidad)
  5. Estaciones de transbordo (bonus)

Lógica:
  // Puntuar por cercanía × tipo × frecuencia
  for each estacion in radio:
    distKm = haversine(centroide, estacion)
    proximityWeight = 1 - (distKm / 1.0) // 1 a 0km, 0 a 1km
    typeWeight = PESOS_TIPO[estacion.data.route_type]
    freqWeight = min(estacion.data.frequency_peak / 20, 1) // normalizar a max 20/hr
    score += proximityWeight * typeWeight * freqWeight
  
  // Bonus multimodalidad
  tiposDistintos = unique(estaciones.map(e => e.data.route_type))
  multimodalBonus = tiposDistintos.length * 5
  
  // Bonus transbordo
  transbordos = estaciones.filter(e => e.data.is_transfer)
  transbordo Bonus = transbordos.length * 3
  
  // Normalizar 0-100
  rawScore = score + multimodalBonus + transbordoBonus
  finalScore = normalize(rawScore, promediosCDMX)

Output:
  score_value: 0-100
  score_label: 'Excelente' | 'Bueno' | 'Aceptable' | 'Limitado' | 'Sin transporte'
  components: {
    estaciones_en_radio: number,
    tipos_transporte: string[],
    multimodalidad_index: number,
    estacion_mas_cercana: { nombre, tipo, distancia_m },
    frecuencia_promedio_pico: number,
    lineas_distintas: number,
    transbordos_accesibles: number
  }

Confidence:
  high: >= 3 estaciones en radio
  medium: 1-2 estaciones
  low: 0 estaciones pero bus routes pasan
  insufficient_data: sin datos GTFS para la zona

Persistencia: zone_scores (zone_id, 'transit', period_date)
```

### 6-13. API → API externa
```
API: GET /api/scores/zone/[zoneId]/transit | Auth: Autenticado
Hook: useScore('zone_scores', zoneId, 'transit')
Componente: TransitPanel — mapa con estaciones + badges de tipo + isócronas
Page: /proyectos/[id] Tab Zona, /explorar filtro, /asesor/inteligencia, /comprador/comparador
Interacción: Filtrar por "buena conexión", comparar zonas, ver isócronas
Feedback: Filtros de transporte en search_logs → B01 sabe que importa movilidad
Notificación: Score cambió >10% (raro — transporte es estable)
API externa: GET /api/v1/scores/transit?lat=X&lon=Y
```

---

## 4.3 F03 — Ecosystem DENUE (Ecosistema Económico de Zona)

```
ID:           F03
Nombre:       Ecosystem DENUE
Nivel:        0
Categoría:    zona
Tabla dest:   zone_scores
Tier datos:   1
Estado:       NO implementado
```

### 1-5. Fuente → Persistencia
```
Fuente: geo_data_points WHERE source='denue'
Ingesta: /lib/intelligence-engine/ingest/denue.ts, mensual con snapshots
Calculator: /lib/intelligence-engine/calculators/zona/ecosystem-denue.ts

Inputs:
  1. Todos los establecimientos DENUE en la zona (zone_id match)
  2. Clasificación SCIAN → tier (premium/standard/basic) — ver mapeo 3.18
  3. Clasificación SCIAN → macro_category (12 categorías) — ver mapeo 3.18
  4. staff_estimate por establecimiento

Lógica:
  const establecimientos = query geo_data_points WHERE source='denue' AND zone_id=?
  
  // 1. Densidad total
  const densidad = establecimientos.length / areaZonaKm2
  
  // 2. Ratio premium/basic (ver mapeo SCIAN)
  const premium = establecimientos.filter(e => e.data.tier === 'premium').length
  const basic = establecimientos.filter(e => e.data.tier === 'basic').length
  const ratioPB = basic > 0 ? premium / basic : premium > 0 ? 10 : 0
  
  // 3. Diversidad Shannon-Wiener por macro_category
  const categoryCounts = groupBy(establecimientos, e => e.data.scian_macro)
  const total = establecimientos.length
  const H = -Object.values(categoryCounts).reduce((sum, arr) => {
    const pi = arr.length / total
    return sum + (pi > 0 ? pi * Math.log(pi) : 0)
  }, 0)
  
  // 4. Densidad de empleo
  const empleoTotal = establecimientos.reduce((sum, e) => sum + (e.data.staff_estimate || 3), 0)
  const densidadEmpleo = empleoTotal / areaZonaKm2
  
  // Score compuesto
  const scoreDensidad = normalize(densidad, promediosCDMX.densidad) * 0.20
  const scoreRatio = normalize(ratioPB, promediosCDMX.ratioPB) * 0.30
  const scoreDiversidad = normalize(H, promediosCDMX.H) * 0.30
  const scoreEmpleo = normalize(densidadEmpleo, promediosCDMX.empleo) * 0.20
  
  const finalScore = (scoreDensidad + scoreRatio + scoreDiversidad + scoreEmpleo) * 100

Output:
  score_value: 0-100
  score_label: 'Ecosistema vibrante' | 'Ecosistema activo' | 'Ecosistema básico' | 'Ecosistema limitado'
  components: {
    densidad_establecimientos_km2: number,
    ratio_premium_basic: number,
    shannon_wiener_H: number,
    densidad_empleo_km2: number,
    total_establecimientos: number,
    por_tier: { premium: N, standard: N, basic: N },
    por_macro_category: { [cat: string]: number },
    top_5_scian: { codigo: string, nombre: string, count: number }[],
    empleo_estimado_total: number
  }

Confidence: high >= 100 establecimientos, medium 20-99, low 1-19, insufficient < 1
Persistencia: zone_scores (zone_id, 'ecosystem_denue', period_date)
```

### 6-13. API → API externa
```
API: GET /api/scores/zone/[zoneId]/ecosystem_denue
Hook: useScore('zone_scores', zoneId, 'ecosystem_denue')
Componente: EcosystemPanel — donut chart por tier + bar chart por categoría + densidad mapa
Page: /proyectos/[id] Tab Zona, /asesor/inteligencia, /admin/inteligencia
Interacción: Drill-down por categoría, comparar ecosistemas entre zonas
Feedback: Vistas a EcosystemPanel → PostHog sabe que importa economía local
Notificación: N/A (cambios mensuales por snapshot, no urgentes)
API externa: GET /api/v1/scores/ecosystem?lat=X&lon=Y&radius=1
```

---

## 4.4 F04 — Air Quality (Calidad del Aire)

```
ID: F04 | Nivel: 0 | Categoría: zona | Tier: 1
Fuente: geo_data_points WHERE source='rama' (SINAICA)
Ingesta: ingest/rama.ts, diaria
Calculator: calculators/zona/air-quality.ts
Inputs: PM2.5, PM10, O3, NO2 de estaciones RAMA en radio 5km
Lógica: Promedio ponderado por distancia inversa de contaminantes, 
        normalizado contra normas NOM-020/021/022/023
Output: score 0-100, components por contaminante, estación más cercana
Persistencia: zone_scores (zone_id, 'air_quality', period_date)
API: GET /api/scores/zone/[zoneId]/air_quality
Hook: useScore('zone_scores', zoneId, 'air_quality')
Componente: AirQualityBadge — semáforo verde/amarillo/rojo/morado
Page: /proyectos/[id] Tab Zona
Feedback: Filtros por calidad aire → search_logs
API externa: GET /api/v1/scores/air_quality?lat=X&lon=Y
```

---

## 4.5 F05 — Water (Infraestructura Hídrica)

```
ID: F05 | Nivel: 0 | Categoría: zona | Tier: 1 (solo CDMX)
Fuente: geo_data_points WHERE source='sacmex'
Ingesta: ingest/sacmex.ts, mensual
Calculator: calculators/zona/water.ts
Inputs: 
  1. Cortes programados últimos 12 meses en la zona
  2. Duración promedio de cortes
  3. Frecuencia de tandeo
Lógica:
  frecuenciaCortes = count(cortes_12m) / 12 // cortes por mes
  duracionPromedio = avg(cortes_12m.map(c => c.data.duracion_horas))
  score = 100 - (frecuenciaCortes * 15 + duracionPromedio * 5)
  // Normalizar 0-100, penalizar zonas con tandeo permanente
Output: score 0-100, frecuencia cortes/mes, duración promedio, tendencia
Persistencia: zone_scores (zone_id, 'water', period_date)
API: GET /api/scores/zone/[zoneId]/water
Componente: WaterInfraPanel — calendario de cortes + tendencia
Page: /proyectos/[id] Tab Zona, /asesor/inteligencia
Notificación: Corte nuevo programado → compradores watchlist en la zona
API externa: GET /api/v1/scores/water?lat=X&lon=Y
```

---

## 4.6 F06 — Land Use (Uso de Suelo)

```
ID: F06 | Nivel: 0 | Categoría: zona | Tier: 1 (solo CDMX)
Fuente: geo_data_points WHERE source='uso_suelo' (SEDUVI/SIG CDMX)
Ingesta: admin upload anual (CSV/Shapefile procesado)
Calculator: calculators/zona/land-use.ts
Inputs: uso de suelo por cuenta catastral, densidad permitida, niveles, área libre
Lógica:
  // Clasificar usos: habitacional, mixto, comercial, industrial, equipamiento
  // Calcular mix index y potencial de densificación
  densificacionPotencial = (niveles_permitidos - niveles_construidos_avg) / niveles_permitidos
  mixUseIndex = entropy(usoCounts) // Shannon sobre tipos de uso
Output: score 0-100, mix de usos, potencial densificación, restricciones
Persistencia: zone_scores (zone_id, 'land_use', period_date)
Page: /admin/inteligencia, /asesor/inteligencia (para context)
API externa: GET /api/v1/scores/land_use?lat=X&lon=Y
```

---

## 4.7 F07 — Predial (Carga Fiscal)

```
ID: F07 | Nivel: 0 | Categoría: zona | Tier: 1 (solo CDMX)
Fuente: geo_data_points WHERE source='catastro'
Ingesta: admin upload anual
Calculator: calculators/zona/predial.ts
Inputs: valor catastral promedio por m², tasa impositiva, tendencia valor catastral
Lógica: Estimar carga fiscal anual por propiedad tipo en la zona
Output: predial_anual_estimado, valor_catastral_m2, tendencia, percentil CDMX
Persistencia: zone_scores (zone_id, 'predial', period_date)
Page: /proyectos/[id] (input para A05 TCO)
```

---

## 4.8 H01 — School Quality (Calidad Educativa)

```
ID: H01 | Nivel: 0 | Categoría: calidad_vida | Tier: 1
Fuente: geo_data_points WHERE source='siged'
Ingesta: ingest/siged.ts, anual
Calculator: calculators/calidad-vida/school-quality.ts

Inputs:
  1. Escuelas en radio 2km del centroide de zona
  2. Nivel (preescolar, primaria, secundaria, media_superior)
  3. Sostenimiento (público, privado)
  4. Ratio alumnos/docente
  5. Resultado PLANEA (si disponible)

Lógica:
  // Score por nivel educativo
  for each nivel in ['preescolar','primaria','secundaria','media_superior']:
    escuelasNivel = filter by nivel in radio
    countPublic = filter sostenimiento='publico'
    countPrivate = filter sostenimiento='privado'
    ratioPrivPub = countPrivate / max(countPublic, 1)
    avgRatioAlumDoc = avg(escuelasNivel.map(e => e.data.ratio_alumnos_docente))
    planeaAvg = avg(escuelasNivel.filter(e => e.data.resultado_planea).map(e => e.data.resultado_planea))
    
    scoreNivel = (
      normalize(escuelasNivel.length, promedios) * 0.25 +    // disponibilidad
      normalize(ratioPrivPub, promedios) * 0.20 +             // proxy socioeconómico
      normalize(1/avgRatioAlumDoc, promedios) * 0.25 +        // calidad por ratio
      normalize(planeaAvg, promedios) * 0.30                  // resultado académico
    )
  
  finalScore = weightedAvg(scores por nivel, pesos=[0.15, 0.30, 0.30, 0.25])

Output:
  score_value: 0-100
  components: {
    por_nivel: { preescolar: {count, ratio_priv_pub, planea}, ... },
    escuelas_total: number,
    ratio_privada_publica: number,
    escuela_mejor_rankeada: { nombre, nivel, planea_score },
    cobertura_por_nivel: { preescolar: bool, primaria: bool, ... }
  }

Persistencia: zone_scores (zone_id, 'school_quality', period_date)
Componente: SchoolQualityPanel — mapa escuelas + badges nivel + rating
Page: /proyectos/[id] Tab Zona (familia ve esto primero con personalización Netflix)
API externa: GET /api/v1/scores/school_quality?lat=X&lon=Y&radius=2
```

---

## 4.9 H02 — Health Access (Acceso a Salud)

```
ID: H02 | Nivel: 0 | Categoría: calidad_vida | Tier: 1
Fuente: geo_data_points WHERE source='dgis'
Ingesta: ingest/dgis.ts, anual
Calculator: calculators/calidad-vida/health-access.ts

Inputs:
  1. Establecimientos CLUES en radio 3km
  2. Nivel de atención (1er, 2do, 3er)
  3. Institución (IMSS, ISSSTE, SSA, privado)
  4. Especialidades disponibles

Lógica:
  // Score por acceso a cada nivel
  primer_nivel = filter nivel_atencion=1 in radio 1.5km
  segundo_nivel = filter nivel_atencion=2 in radio 3km
  tercer_nivel = filter nivel_atencion=3 in radio 5km
  
  scorePrimer = min(primer_nivel.length / 3, 1) * 30   // al menos 3 en 1.5km = full
  scoreSegundo = min(segundo_nivel.length / 2, 1) * 35  // al menos 2 en 3km
  scoreTercer = min(tercer_nivel.length / 1, 1) * 20    // al menos 1 en 5km
  scorePrivado = min(privados.length / 2, 1) * 15        // acceso privado bonus
  
  finalScore = scorePrimer + scoreSegundo + scoreTercer + scorePrivado

Output: score 0-100, establecimientos por nivel, especialidades accesibles, distancia al más cercano por nivel
Persistencia: zone_scores (zone_id, 'health_access', period_date)
Componente: HealthAccessPanel — mapa establecimientos + distancias
Page: /proyectos/[id] Tab Zona
API externa: GET /api/v1/scores/health_access?lat=X&lon=Y
```

---

## 4.10 H03 — Seismic Risk (Riesgo Sísmico)

```
ID: H03 | Nivel: 0 | Categoría: calidad_vida | Tier: 1
Fuente: geo_data_points WHERE source='atlas_riesgos'
Ingesta: admin upload anual (shapefile → JSON)
Calculator: calculators/calidad-vida/seismic-risk.ts

Inputs:
  1. Zona sísmica (A, B, C, D) del AGEB donde está la zona
  2. Riesgo de hundimiento
  3. PGA estimado (Peak Ground Acceleration)
  4. Tipo de suelo (si disponible)

Lógica:
  // Mapeo simple pero con impacto financiero
  const SCORES_ZONA = { 'A': 95, 'B': 75, 'C': 45, 'D': 15 }
  let baseScore = SCORES_ZONA[zonaData.data.zona_sismica] || 50
  
  // Ajustes por riesgo adicional
  if (zonaData.data.riesgo_hundimiento === 'alto') baseScore -= 15
  if (zonaData.data.riesgo_hundimiento === 'medio') baseScore -= 8
  
  // Impacto financiero: costo seguro sísmico estimado
  const costoSeguroAnual = calcularCostoSeguro(baseScore, valorPropiedad)

Output:
  score_value: 0-100 (100 = menor riesgo)
  score_label: 'Riesgo mínimo' | 'Riesgo bajo' | 'Riesgo moderado' | 'Riesgo alto'
  components: {
    zona_sismica: text,
    riesgo_hundimiento: text,
    riesgo_inundacion: text,
    pga_estimado: number,
    costo_seguro_anual_estimado: number,
    impacto_financiero_post_sismo: text
  }

Persistencia: zone_scores (zone_id, 'seismic_risk', period_date)
Componente: SeismicRiskBadge — semáforo + tooltip con detalle
Page: /proyectos/[id] Tab Zona (sección Riesgos), /comprador/simulador
Notificación: N/A (datos estables)
API externa: GET /api/v1/scores/seismic_risk?lat=X&lon=Y
```

---

## 4.11 H04 — Credit Demand (Demanda de Crédito Hipotecario)

```
ID: H04 | Nivel: 0 | Categoría: calidad_vida | Tier: 2 (necesita datos CNBV)
Fuente: macro_series WHERE source IN ('cnbv','infonavit','fovissste')
Calculator: calculators/calidad-vida/credit-demand.ts
Inputs: créditos otorgados por municipio, montos, tasa promedio, cartera vencida
Lógica: Calcular volumen de créditos vs población, tasa de aprobación implícita,
        tendencia de demanda, monto promedio vs precio promedio de zona
Output: creditos_anuales_municipio, monto_promedio, tasa_aprobacion_estimada, gap_precio
Persistencia: zone_scores (zone_id, 'credit_demand', period_date)
Page: /asesor/inteligencia, /desarrollador/analytics
Componente: CreditDemandWidget — "4,200 créditos/año en tu rango de precio"
```

---

## 4.12 H06 — City Services (Servicios Urbanos)

```
ID: H06 | Nivel: 0 | Categoría: calidad_vida | Tier: 1 (solo CDMX)
Fuente: geo_data_points WHERE source='0311'
Calculator: calculators/calidad-vida/city-services.ts
Inputs: reportes *0311 por tipo, resolución, tiempo de resolución, zona
Lógica: Score inverso: más reportes = peor servicio, pero si resolución es rápida = bonus
Output: score 0-100, reportes/mes, % resueltos, tiempo promedio resolución, top 3 problemas
Persistencia: zone_scores (zone_id, 'city_services', period_date)
```

---

## 4.13 H08 — Heritage Zone (Zona Patrimonial)

```
ID: H08 | Nivel: 0 | Categoría: calidad_vida | Tier: 1
Fuente: geo_data_points WHERE source='inah'
Calculator: calculators/calidad-vida/heritage-zone.ts
Inputs: monumentos históricos, zonas arqueológicas, museos en radio
Lógica: Presencia de patrimonio = restricciones construcción + premium cultural
Output: es_zona_patrimonial: bool, monumentos_count, restricciones, premium_cultural_pct
Persistencia: zone_scores (zone_id, 'heritage_zone', period_date)
```

---

## 4.14 H09 — Commute Time (Tiempo de Traslado)

```
ID: H09 | Nivel: 0 | Categoría: calidad_vida | Tier: 1
Fuente: Mapbox Directions API + geo_data_points(gtfs)
Ingesta: ON-DEMAND (se calcula cuando el usuario lo pide, no batch)
Calculator: calculators/calidad-vida/commute-time.ts

Inputs:
  1. Ubicación del proyecto/zona (lat, lon)
  2. Destino del comprador (trabajo, escuela — desde perfil o input manual)
  3. Mapbox API para driving-traffic + transit
  4. GTFS para opciones de transporte público

Lógica:
  const driving = await mapboxDirections(origin, destination, 'driving-traffic')
  const transit = await mapboxDirections(origin, destination, 'transit') // si disponible
  const walking = await mapboxDirections(origin, destination, 'walking')
  
  // Score: menor commute = mayor score
  const commuteMinDriving = driving.duration / 60
  const commuteMinTransit = transit?.duration / 60 || null
  
  score = 100 - min(commuteMinDriving, 90) * (100/90) // 0min=100, 90min=0

Output:
  score_value: 0-100
  components: {
    driving_minutes: number,
    transit_minutes: number | null,
    walking_minutes: number | null,
    distance_km: number,
    route_summary: string,
    departure_time: string
  }

NOTA: Este score es PER-USER (depende del destino del comprador), 
no per-zone. Se almacena en user_scores, no zone_scores.

Persistencia: user_scores (user_id, target_id=project_id, 'commute_time')
Componente: CommuteCalculator — mapa con ruta + tiempo + opciones
Page: /proyectos/[id] Tab Zona → "¿Cuánto tardas en llegar al trabajo?"
```

---

## 4.15 H10 — Water Crisis (Crisis Hídrica Compuesta)

```
ID: H10 | Nivel: 0 | Categoría: calidad_vida | Tier: 1 (solo CDMX)
Fuente: geo_data_points WHERE source IN ('sacmex','conagua','0311','atlas_riesgos')
Calculator: calculators/calidad-vida/water-crisis.ts
Inputs:
  1. SACMEX: frecuencia cortes, tandeo
  2. CONAGUA: nivel acuífero, disponibilidad
  3. *0311: reportes de falta de agua
  4. Atlas: riesgo inundación (paradójicamente, zona con inundaciones puede tener agua)
Lógica: Score compuesto ponderado: cortes 40% + acuífero 25% + reportes 20% + inundación 15%
Output: score 0-100, water_discount_pct (impacto estimado en valor), tendencia
Persistencia: zone_scores (zone_id, 'water_crisis', period_date)
Componente: WaterCrisisBadge — indicador + water discount estimado
```

---

## 4.16 H11 — Infonavit Calculator

```
ID: H11 | Nivel: 0 | Categoría: calidad_vida | Tier: 1
Fuente: macro_series WHERE source='infonavit' (tablas de crédito, VSM)
Calculator: calculators/calidad-vida/infonavit-calc.ts
Inputs: VSM vigente, tabla de crédito por edad/salario, precio de la unidad
Lógica: Calcular si el comprador califica, monto máximo, mensualidad, plazo
Output: califica: bool, monto_maximo, mensualidad, plazo_anos, subsidio_aplicable
Persistencia: user_scores (user_id, target_id=unit_id, 'infonavit_calc')
Componente: InfonavitCalculator — simulador interactivo
Page: /comprador/alcanza, /proyectos/[id] calculadora
```

---

## 4.17 A01 — Affordability (¿Me Alcanza?)

```
ID:           A01
Nombre:       Affordability Score
Nivel:        0
Categoría:    comprador
Tabla dest:   project_scores (per unit) o user_scores (per user)
Tier datos:   2 (necesita precios de unidades)
Estado:       NO implementado
```

### 1-5. Fuente → Persistencia
```
Fuentes:
  1. macro_series WHERE source='imss' AND serie_key='empleo_formal_cdmx' → ingreso estimado
  2. macro_series WHERE source='banxico' AND serie_key='tasa_hipotecaria_avg' → tasa vigente
  3. unidades WHERE id=? → precio de la unidad
  4. profiles WHERE id=buyer_id → ingreso declarado (si disponible)

Calculator: calculators/comprador/affordability.ts

Inputs:
  ingresoMensual: number   // de IMSS promedio o declarado por comprador
  precioUnidad: number     // de unidades.precio
  tasaAnual: number        // de macro_series.tasa_hipotecaria_avg
  enganchePct: number      // default 20%
  plazoAnos: number        // default 20

Lógica:
  const enganche = precioUnidad * enganchePct
  const montoCredito = precioUnidad - enganche
  const tasaMensual = tasaAnual / 100 / 12
  const numPagos = plazoAnos * 12
  const mensualidad = montoCredito * (tasaMensual * (1+tasaMensual)**numPagos) / 
                      ((1+tasaMensual)**numPagos - 1)
  const ratioIngresoVivienda = mensualidad / ingresoMensual
  
  // Score: ratio < 30% = excelente, 30-40% = ok, 40-50% = ajustado, >50% = no alcanza
  if (ratioIngresoVivienda <= 0.25) score = 95
  else if (ratioIngresoVivienda <= 0.30) score = 85
  else if (ratioIngresoVivienda <= 0.35) score = 70
  else if (ratioIngresoVivienda <= 0.40) score = 55
  else if (ratioIngresoVivienda <= 0.50) score = 35
  else score = max(0, 20 - (ratioIngresoVivienda - 0.50) * 100)
  
  // Ingreso mínimo requerido para que el ratio sea 30%
  const ingresoMinimo = mensualidad / 0.30

Output:
  score_value: 0-100
  score_label: 'Cómodo' | 'Alcanzable' | 'Ajustado' | 'Difícil' | 'No alcanza'
  score_unit: 'porcentaje_ingreso'
  components: {
    mensualidad: number,
    enganche: number,
    monto_credito: number,
    ratio_ingreso_vivienda: number,
    ingreso_minimo_requerido: number,
    tasa_usada: number,
    plazo_anos: number,
    ingreso_fuente: 'declarado' | 'imss_promedio_zona'
  }
  recommendations: [
    { if ratio > 0.40: "Considera un enganche mayor para reducir la mensualidad" },
    { if ratio > 0.50: "Esta unidad supera tu capacidad de pago recomendada" },
    { "Ingreso mínimo requerido: $X para ratio 30%" }
  ]

Confidence:
  high: ingreso declarado por comprador
  medium: ingreso estimado de IMSS zona
  low: ingreso default nacional
  insufficient_data: sin datos de ingreso y sin IMSS

Persistencia: 
  Si es para una unidad específica: project_scores (project_id, unidad_id, 'affordability')
  Si es para un usuario: user_scores (user_id, target_id=unit_id, 'affordability')
```

### 6-13. API → API externa
```
API: GET /api/calculator/affordability?unitId=X&income=Y (público)
     POST /api/scores/request-recalc (para on-demand con perfil del usuario)
Hook: useScore('project_scores', unitId, 'affordability') 
      O custom hook useAffordability(unitId, userIncome)
Componente: AffordabilityCalculator — sliders de enganche/plazo + resultado
Page: /proyectos/[id] calculadora "¿Me Alcanza?", /comprador/alcanza
Interacción: Ajustar enganche %, plazo, ver impacto en mensualidad
Feedback: Cada cálculo → search_logs con params → sabemos rangos de precio buscados
Notificación: Si tasa hipotecaria cambia >0.5% → "Tu mensualidad cambiaría de X a Y"
API externa: GET /api/v1/calculator/affordability?price=X&income=Y&rate=Z
```

---

## 4.18 A03 — Migration Score (Renta vs Compra)

```
ID: A03 | Nivel: 0 | Categoría: comprador | Tier: 2
Fuente: market_prices_secondary (renta) + unidades.precio + macro_series(banxico)
Calculator: calculators/comprador/migration.ts
Inputs: renta mensual promedio en zona, precio unidad, tasa hipotecaria
Lógica:
  mensualidadCompra = calcularMensualidad(precioUnidad, tasa, 20%, 20 años)
  rentaMensual = market_prices_secondary.price_m2_avg * m2_unidad (tipo renta)
  ratio = mensualidadCompra / rentaMensual
  // ratio < 1.0 = comprar es más barato que rentar → score alto
  // ratio > 1.5 = rentar es mucho más barato → score bajo
  score = 100 - min(ratio * 50, 100)
Output: score 0-100, mensualidad_compra, renta_estimada, ratio, breakeven_anos
Persistencia: project_scores (project_id, unidad_id, 'migration')
Componente: MigrationComparison — tabla compra vs renta con breakeven
Page: /proyectos/[id] calculadora, /comprador/simulador
```

---

## 4.19 A04 — Arbitrage (Nuevo vs Secundario)

```
ID: A04 | Nivel: 0 | Categoría: comprador | Tier: 2
Fuente: market_prices_secondary(venta) + unidades.precio + macro_series(shf)
Calculator: calculators/comprador/arbitrage.ts
Inputs: precio/m² unidad nueva, precio/m² secundario promedio zona, IPV SHF
Lógica:
  precioM2Nuevo = unidad.precio / unidad.m2_totales
  precioM2Secundario = market_prices_secondary.price_m2_avg (venta, zona)
  premium = (precioM2Nuevo - precioM2Secundario) / precioM2Secundario * 100
  // Premium < 5% → oportunidad (comprar nuevo casi al precio de usado)
  // Premium 5-15% → normal
  // Premium > 15% → caro vs mercado secundario
  score = 100 - min(premium * 3, 100)
Output: score 0-100, premium_pct, precio_m2_nuevo, precio_m2_secundario, ipv_tendencia
Persistencia: project_scores (project_id, unidad_id, 'arbitrage')
Componente: ArbitrageBadge — "12% más caro que usado" o "Oportunidad: 3% sobre usado"
Page: /proyectos/[id] Tab Inversión
```

---

## 4.20 B12 — Cost Tracker (INPP Construcción)

```
ID: B12 | Nivel: 0 | Categoría: desarrollador | Tier: 1
Fuente: macro_series WHERE source='inegi' AND serie_key='inpp_construccion'
Calculator: calculators/desarrollador/cost-tracker.ts (IMPLEMENTADO)
Inputs: Serie INPP últimos 24 meses
Lógica:
  changeYoY = (ultimo / hace12meses - 1) * 100
  changeMoM = (ultimo / penultimo - 1) * 100
  change6m = (ultimo / hace6meses - 1) * 100
  alertLevel = changeYoY > 10 ? 'critical' : changeYoY > 5 ? 'warning' : 'normal'
Output: changeYoY, changeMoM, change6m, alertLevel, serie completa
Persistencia: project_scores (project_id, null, 'cost_tracker')
Componente: CostTracker — sparkline + alertas semáforo
Page: /desarrollador/analytics Tab Costos
Estado: IMPLEMENTADO (1 de 5 calculators existentes)
```

---

## 4.21 D07 — STR/LTR Analysis (Renta Corta vs Larga)

```
ID: D07 | Nivel: 0 | Categoría: mercado | Tier: 2
Fuente: str_market_data (AirDNA) + market_prices_secondary (renta) + unidades.precio
Calculator: calculators/mercado/str-ltr.ts
Inputs: ADR, occupancy, revenue mensual STR + renta mensual LTR + precio unidad
Lógica:
  revenueSTR_mensual = str_market_data.revenue_monthly_avg
  revenueSTR_anual = revenueSTR_mensual * 12 * occupancy_rate
  revenueLTR_anual = market_prices_secondary.price_m2_avg * m2 * 12
  yieldSTR = revenueSTR_anual / precio_unidad * 100
  yieldLTR = revenueLTR_anual / precio_unidad * 100
  mixedYield = (revenueSTR_anual * 0.6 + revenueLTR_anual * 0.4) / precio_unidad * 100
  bestStrategy = max de los 3
Output: yieldSTR, yieldLTR, yieldMixed, bestStrategy, ADR, occupancy
Persistencia: project_scores (project_id, unidad_id, 'str_ltr')
Componente: InvestmentScenarios — 4 cards con yield por estrategia
Page: /proyectos/[id] Tab Inversión, /comprador/simulador
```

---

# MÓDULO 5: SCORES NIVEL 1 (16 scores — dependen de Nivel 0)

---

## 5.1 F08 — Life Quality Index (Índice de Calidad de Vida)

```
ID:           F08
Nombre:       Life Quality Index (LQI)
Nivel:        1
Categoría:    zona
Tabla dest:   zone_scores
Dependencias: F01 Safety + F02 Transit + F03 Ecosystem + F04 Air Quality + F05 Water + IDS externo
Estado:       NO implementado
```

### 1-5. Fuente → Persistencia
```
Fuentes (todos zone_scores del mismo zone_id):
  1. F01 Safety → zone_scores WHERE score_type='safety'
  2. F02 Transit → zone_scores WHERE score_type='transit'
  3. F03 Ecosystem → zone_scores WHERE score_type='ecosystem_denue'
  4. F04 Air Quality → zone_scores WHERE score_type='air_quality'
  5. F05 Water → zone_scores WHERE score_type='water'
  6. IDS (Índice de Desarrollo Social CDMX) → externo, admin upload

Calculator: calculators/zona/life-quality-index.ts

Lógica:
  const scores = {
    safety: getScore('safety', zoneId),      // peso 0.25
    transit: getScore('transit', zoneId),      // peso 0.20
    ecosystem: getScore('ecosystem_denue', zoneId), // peso 0.15
    airQuality: getScore('air_quality', zoneId),    // peso 0.10
    water: getScore('water', zoneId),          // peso 0.15
    ids: getExternalIDS(zoneId)               // peso 0.15
  }
  
  // Manejar scores faltantes con confidence cascade
  const available = Object.entries(scores).filter(([k, v]) => v !== null)
  const totalWeight = available.reduce((sum, [k]) => sum + PESOS[k], 0)
  
  const lqi = available.reduce((sum, [key, score]) => {
    return sum + (score.score_value * PESOS[key] / totalWeight)
  }, 0)
  
  // Determinar confidence basado en inputs
  const inputConfidences = available.map(([k, v]) => v.confidence)
  const insufficientCount = inputConfidences.filter(c => c === 'insufficient_data').length
  const confidence = insufficientCount > available.length * 0.5 
    ? 'insufficient_data' 
    : insufficientCount > 0 ? 'low' : 'high'

Output:
  score_value: 0-100
  score_label: 'Excepcional' | 'Muy buena' | 'Buena' | 'Regular' | 'Baja'
  components: {
    safety: { value, weight, confidence },
    transit: { value, weight, confidence },
    ecosystem: { value, weight, confidence },
    air_quality: { value, weight, confidence },
    water: { value, weight, confidence },
    ids: { value, weight, confidence },
    inputs_available: number,
    inputs_total: 6
  }

Persistencia: zone_scores (zone_id, 'life_quality_index', period_date)
```

### 6-13. API → API externa
```
API: GET /api/scores/zone/[zoneId]/life_quality_index
Hook: useScore('zone_scores', zoneId, 'life_quality_index')
Componente: LifeQualityPanel — radar chart 6 ejes + score central + desglose
Page: /proyectos/[id] Tab Zona (prominente), /explorar filtro, /comprador/comparador
Interacción: Hover en cada eje del radar para ver sub-score, filtrar explorar por LQI >= 70
Feedback: Compradores que filtran por LQI alto → search_logs → valida demanda de calidad
Notificación: LQI cambió > 5 puntos → compradores con watchlist en la zona
API externa: GET /api/v1/scores/livability?lat=X&lon=Y (producto estrella)
```

---

## 5.2 F12 — Risk Map (Mapa de Riesgo Compuesto)

```
ID: F12 | Nivel: 1 | Categoría: zona
Dependencias: H03 Seismic + F01 Safety + F05 Water + F06 Land Use
Calculator: calculators/zona/risk-map.ts
Lógica:
  riesgoSismico = (100 - H03.score_value) * 0.30
  riesgoSeguridad = (100 - F01.score_value) * 0.30
  riesgoHidrico = (100 - F05.score_value) * 0.25
  riesgoUsoSuelo = evalRiesgoUsoSuelo(F06) * 0.15 // incompatibilidad de usos
  riskScore = riesgoSismico + riesgoSeguridad + riesgoHidrico + riesgoUsoSuelo
  score = 100 - riskScore // invertir: más alto = menos riesgo
Output: score 0-100, riesgo por categoría, riesgo dominante, mitigaciones sugeridas
Persistencia: zone_scores (zone_id, 'risk_map', period_date)
Componente: RiskMapPanel — heatmap Mapbox + badges por tipo de riesgo
Page: /proyectos/[id] Tab Zona Riesgos, /admin/inteligencia
API externa: GET /api/v1/scores/risk?lat=X&lon=Y
```

---

## 5.3 H07 — Environmental (Calidad Ambiental Compuesta)

```
ID: H07 | Nivel: 1 | Categoría: calidad_vida
Dependencias: F04 Air Quality + F05 Water + geo_data_points(paot, sedema)
Calculator: calculators/calidad-vida/environmental.ts
Lógica: Compuesto de aire + agua + áreas verdes + denuncias ambientales
Output: score 0-100, components por dimensión ambiental
Persistencia: zone_scores (zone_id, 'environmental', period_date)
```

---

## 5.4 A02 — Investment Simulation (4 Escenarios)

```
ID:           A02
Nombre:       Investment Simulation
Nivel:        1
Categoría:    comprador
Dependencias: market_prices_secondary(renta) + str_market_data + macro_series(shf,banxico) + unit price
Estado:       NO implementado
```

### Procesamiento completo
```
Calculator: calculators/comprador/investment-sim.ts

Inputs:
  1. unidades.precio → precio de compra
  2. market_prices_secondary WHERE operation_type='renta' AND zone → renta mensual estimada
  3. str_market_data WHERE zone → ADR, occupancy, revenue STR
  4. macro_series WHERE serie_key='ipv_cdmx' → plusvalía histórica
  5. macro_series WHERE serie_key='tasa_referencia' → costo de capital

Lógica — 4 escenarios:
  ESCENARIO 1: Long-Term Rental (LTR)
    rentaMensual = market_prices_secondary.price_m2_avg * m2_unidad
    rentaAnual = rentaMensual * 12 * 0.92 // 8% vacancy
    gastosAnuales = rentaAnual * 0.15 // mantenimiento, predial, admin
    netAnual = rentaAnual - gastosAnuales
    yieldLTR = netAnual / precioUnidad * 100
    roi5y = (netAnual * 5 + plusvalia5y) / precioUnidad * 100
    roi10y = (netAnual * 10 + plusvalia10y) / precioUnidad * 100
  
  ESCENARIO 2: Short-Term Rental (STR / Airbnb)
    revenueSTR = str_market_data.revenue_monthly_avg * 12
    gastosSTR = revenueSTR * 0.35 // limpieza, plataforma, mantenimiento, admin
    netSTR = revenueSTR - gastosSTR
    yieldSTR = netSTR / precioUnidad * 100
  
  ESCENARIO 3: Mixed (70% LTR, 30% STR)
    netMixed = netAnual * 0.7 + netSTR * 0.3
    yieldMixed = netMixed / precioUnidad * 100
  
  ESCENARIO 4: Plusvalía Pura (comprar y vender en 5 años)
    plusvaliaAnual = ipv_cdmx_trend * 1.0 // ajustar por zona premium/descuento
    valorFuturo5y = precioUnidad * (1 + plusvaliaAnual/100) ** 5
    ganancia = valorFuturo5y - precioUnidad
    roi = ganancia / precioUnidad * 100
    roiAnualizado = (roi / 5)

Output:
  score_value: max(yieldLTR, yieldSTR, yieldMixed, roiAnualizado) // mejor escenario
  score_unit: 'porcentaje_yield'
  components: {
    ltr: { yield_anual, renta_mensual, gastos, net, roi_5y, roi_10y },
    str: { yield_anual, revenue_mensual, occupancy, adr, gastos, net },
    mixed: { yield_anual, mix_pct, net },
    plusvalia: { tasa_anual, valor_5y, ganancia, roi, roi_anualizado },
    mejor_estrategia: 'ltr' | 'str' | 'mixed' | 'plusvalia',
    cap_rate: number,
    price_to_rent_ratio: number
  }
  recommendations: [
    { strategy: 'ltr', reason: "Yield estable de X% con menor gestión" },
    { strategy: 'str', reason: "Mayor yield pero requiere gestión activa" }
  ]

Persistencia: project_scores (project_id, unidad_id, 'investment_sim')
Componente: InvestmentSimulator — 4 cards con gráficas por escenario + selector
Page: /proyectos/[id] Tab Inversión, /comprador/simulador
Feedback: Escenario seleccionado → PostHog → sabemos qué tipo de inversión buscan
API externa: GET /api/v1/calculator/investment?unitId=X
```

---

## 5.5 A05 — TCO (Total Cost of Ownership 10 años)

```
ID: A05 | Nivel: 1 | Categoría: comprador
Dependencias: F07 Predial + unit price + macro_series(banxico, inegi, shf)
Calculator: calculators/comprador/tco.ts
Inputs: precio, enganche, tasa, predial anual, mantenimiento, seguros, HOA fees
Lógica:
  costoTotal10y = enganche + (mensualidad * 120) + (predial * 10) + 
                  (mantenimiento * 10) + (seguro * 10) + (cuotaMantenimiento * 120)
  costoRealNeto = costoTotal10y - plusvaliaEstimada10y
Output: costoTotal10y, desglose por categoría, costo mensual real, comparativa con renta 10y
Persistencia: project_scores (project_id, unidad_id, 'tco_10y')
Componente: TCOCalculator — timeline 10 años con desglose visual stacked bar
Page: /comprador/simulador, /proyectos/[id]
```

---

## 5.6 A06 — Neighborhood Score

```
ID: A06 | Nivel: 1 | Categoría: comprador
Dependencias: F01 Safety + F02 Transit + F03 Ecosystem + macro_series(imss) + market_prices_secondary + search_trends
Calculator: calculators/comprador/neighborhood.ts
Lógica: Score compuesto de habitabilidad + dinámica económica + demanda de búsqueda + empleo
Output: score 0-100, fortalezas y debilidades de la zona, comparativa con zonas similares
Persistencia: zone_scores (zone_id, 'neighborhood', period_date)
Componente: NeighborhoodReport — reporte completo tipo Local Logic
Page: /proyectos/[id] Tab Zona
API externa: GET /api/v1/neighborhood-report?lat=X&lon=Y
```

---

## 5.7 A12 — Price Fairness (¿Es Buen Precio?)

```
ID:           A12
Nombre:       Price Fairness
Nivel:        1
Categoría:    comprador
Dependencias: market_prices_secondary + macro_series(inpp) + unit specs
Estado:       NO implementado
```

### Procesamiento
```
Calculator: calculators/comprador/price-fairness.ts

Inputs:
  1. unidades.precio, unidades.m2_totales → precio/m² de la unidad
  2. market_prices_secondary WHERE zone AND operation_type='venta' → precio/m² zona
  3. macro_series WHERE serie_key='inpp_construccion' → costo construcción trending

Lógica:
  precioM2Unidad = unidad.precio / unidad.m2_totales
  precioM2Zona = market_prices_secondary.price_m2_median
  
  // Ajustar por características (m², piso, orientación, amenidades)
  ajustePiso = unidad.piso > 5 ? 1.05 : unidad.piso > 10 ? 1.10 : 1.0
  ajusteAmenidades = unidad.amenidades?.length > 5 ? 1.03 : 1.0
  precioM2ZonaAjustado = precioM2Zona * ajustePiso * ajusteAmenidades
  
  desviacion = (precioM2Unidad - precioM2ZonaAjustado) / precioM2ZonaAjustado * 100
  
  // Score: 0% desviación = 100, ±20% = 50, >40% = 0
  score = max(0, 100 - abs(desviacion) * 2.5)
  
  label = desviacion < -10 ? 'Oportunidad' :
          desviacion < 5 ? 'Precio justo' :
          desviacion < 15 ? 'Ligeramente alto' :
          desviacion < 25 ? 'Sobre precio' : 'Muy sobre precio'

Output:
  score_value: 0-100
  score_label: text
  components: {
    precio_m2_unidad: number,
    precio_m2_zona_median: number,
    precio_m2_zona_ajustado: number,
    desviacion_pct: number,
    ajustes_aplicados: { piso, amenidades },
    sample_size: number,
    comparables_count: number,
    tendencia_precios_zona: 'subiendo' | 'estable' | 'bajando'
  }

Persistencia: project_scores (project_id, unidad_id, 'price_fairness')
Componente: PriceFairnessBadge — badge verde/amarillo/rojo estilo Pulppo valuación
  Verde: "Precio justo" o "Oportunidad"
  Amarillo: "Ligeramente alto"
  Rojo: "Sobre precio"
Page: EVERYWHERE — /explorar cards, /proyectos/[id], /asesor/inventario, /comprador/guardados
Feedback: Badge verde genera más clicks → PostHog → validamos que price fairness importa
Notificación: Si precio cambia y badge cambia de color → compradores watchlist
```

---

## 5.8 B01 — Demand Heatmap

```
ID: B01 | Nivel: 1 | Categoría: desarrollador
Dependencias: macro_series(imss, banxico) + busquedas + inventario
Calculator: calculators/desarrollador/demand-heatmap.ts
Inputs: búsquedas activas por zona, wishlist por zona, search_logs, empleo IMSS zona
Lógica: Densidad de demanda = búsquedas + wishlist + search_logs ponderados por recencia
Output: heatmap data por zona, hot spots, demand-supply gap, zonas desatendidas
Persistencia: zone_scores (zone_id, 'demand_heatmap', period_date)
Componente: DemandHeatmap — mapa Mapbox con capa de calor
Page: /desarrollador/dashboard widget, /admin/inteligencia
```

---

## 5.9 B02 — Margin Pressure (IMPLEMENTADO — con BUG)

```
ID: B02 | Nivel: 1 | Categoría: desarrollador
Dependencias: macro_series(inpp) + unidades precio/m2 + inventory_snapshots
Calculator: calculators/desarrollador/margin-pressure.ts (IMPLEMENTADO)
Estado: IMPLEMENTADO pero con BUG — usa precio_total/superficie_m2 en vez de precio/m2_totales
FIX REQUERIDO: register-all.ts:82 → cambiar a precio, m2_totales
Lógica: marginDelta = (cambio_precio - cambio_INPP), pressure level
Output: marginDelta, pressure level (critical/warning/normal)
Persistencia: project_scores (project_id, null, 'margin_pressure')
```

---

## 5.10 B04 — Product Market Fit

```
ID: B04 | Nivel: 1 | Categoría: desarrollador
Dependencias: busquedas + project specs + competencia
Calculator: calculators/desarrollador/product-market-fit.ts
Inputs: características proyecto vs criterios de búsquedas activas en zona
Lógica: Match % entre lo que la demanda busca y lo que el proyecto ofrece
Output: pmf_score 0-100, gap analysis (qué buscan que no tienes), demand count
Persistencia: project_scores (project_id, null, 'product_market_fit')
Componente: PMFWidget — score + gap analysis con recomendaciones
Page: /desarrollador/analytics
```

---

## 5.11 B07 — Competitive Intelligence

```
ID: B07 | Nivel: 1 | Categoría: desarrollador
Dependencias: proyectos en zona + precios + absorción
Calculator: calculators/desarrollador/competitive-intel.ts
Inputs: todos los proyectos en la misma alcaldía/zona con datos de precio, absorción, tipología
Lógica: Comparar mi proyecto vs competidores en 8 dimensiones
Output: ranking por dimensión, ventajas/desventajas, competidor más cercano
Persistencia: project_scores (project_id, null, 'competitive_intel')
Componente: CompetitiveMatrix — tabla mi proyecto vs top 5 competidores
Page: /desarrollador/analytics Tab Competencia
```

---

## 5.12 B08 — Absorption Forecast (IMPLEMENTADO)

```
ID: B08 | Nivel: 1 | Categoría: desarrollador
Dependencias: histórico absorción + macro_series(banxico) + competencia + search_trends
Calculator: calculators/desarrollador/absorption-forecast.ts (IMPLEMENTADO)
Estado: IMPLEMENTADO (1 de 5 calculators existentes)
Inputs: unidades vendidas/total, velocity/mes, fecha creación proyecto
Lógica: absorptionRate, velocityPerMonth, monthsToSellOut, 3 escenarios (optimista/base/pesimista)
Output: absorptionRate %, velocity, monthsToSellOut, scenarios
Persistencia: project_scores (project_id, null, 'absorption_forecast')
Componente: AbsorptionForecast — gráfica con 3 escenarios (Recharts AreaChart)
Page: /desarrollador/analytics, /admin/inteligencia
```

---

## 5.13 D05 — Gentrification Score

```
ID: D05 | Nivel: 1 | Categoría: mercado
Dependencias: search_trends + str_market_data + market_prices_secondary + macro_series(imss) + geo_data_points(denue)
Calculator: calculators/mercado/gentrification.ts
Inputs: tendencia búsquedas, STR revenue creciendo, precios subiendo, ratio premium/basic DENUE
Lógica: Score compuesto de señales de gentrificación: demanda creciente + inversión STR + 
        sofisticación económica + precios en alza vs ingreso estable
Output: score 0-100, fase (pre-gentrificación, temprana, consolidada, madura), señales activas
Persistencia: zone_scores (zone_id, 'gentrification', period_date)
Componente: GentrificationIndicator — fase + señales + mapa temporal
Page: /admin/inteligencia, /asesor/inteligencia
```

---

## 5.14 D06 — Affordability Crisis

```
ID: D06 | Nivel: 1 | Categoría: mercado
Dependencias: macro_series(bbva sobrecosto, imss, banxico) + market_prices_secondary
Calculator: calculators/mercado/affordability-crisis.ts
Lógica: Sobrecosto vivienda (% ingreso) + tendencia + comparativa entre zonas
Output: severity 0-100, % ingreso para comprar, trend, zonas más/menos accesibles
Persistencia: zone_scores (zone_id, 'affordability_crisis', period_date)
Page: /admin/inteligencia, macro dashboard
```

---

## 5.15 H05 — Trust Score (IMPLEMENTADO)

```
ID: H05 | Nivel: 1 | Categoría: calidad_vida
Dependencias: geo_data_points(profeco) + quality_score + response_time + entregas + reviews
Calculator: calculators/calidad-vida/trust-score.ts (IMPLEMENTADO)
Estado: IMPLEMENTADO (1 de 5 calculators existentes)
Inputs: PROFECO quejas, entregas a tiempo, tiempo respuesta, calidad publicación
Lógica: Weighted score — profeco 25%, entregas 30%, respuesta 20%, quality 25%
Output: trust_score 0-100, desglose, badge
Persistencia: project_scores (project_id, null, 'trust_score')
Componente: TrustScoreBadge — badge público en ficha proyecto
Page: /proyectos/[id] header, /explorar cards
```

---

## 5.16 H14 — Buyer Persona

```
ID: H14 | Nivel: 1 | Categoría: calidad_vida
Dependencias: macro_series(cnbv, infonavit, inegi censo) + absorción por tipo
Calculator: calculators/calidad-vida/buyer-persona.ts
Inputs: perfil demográfico zona, créditos otorgados, tipos más vendidos
Lógica: Perfil del comprador típico de la zona (edad, ingreso, tipo vivienda, financiamiento)
Output: persona description, ingreso_estimado, edad_range, tipo_preferido, financiamiento_preferido
Persistencia: zone_scores (zone_id, 'buyer_persona', period_date)
Componente: BuyerPersonaCard — avatar + stats del comprador típico
Page: /desarrollador/analytics, /asesor/inteligencia
```

---

# CROSS-REFERENCES

```
→ PART 1: Fuentes de datos que alimentan estos scores (Módulo 3)
→ PART 3: Scores Nivel 2-5 que DEPENDEN de estos scores
→ PART 4: Los 11 scores NUEVOS que usan las mismas fuentes
→ PART 5: Cascadas que disparan recálculos de estos scores
→ BIBLIA_BACKEND_DMX_v4: Tablas zone_scores, project_scores, user_scores + ingestors + crons
→ BIBLIA_FRONTEND_DMX_v4: Componentes ScoreDisplay, SafetyPanel, TransitPanel, etc.
```

---

**FIN DE PART 2 — Continúa en BIBLIA_IE_DMX_v4_PART3.md (Scores Nivel 2–5)**
