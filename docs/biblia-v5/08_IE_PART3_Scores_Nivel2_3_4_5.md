# BIBLIA DMX v5 — INTELLIGENCE ENGINE COMPLETO
## PART 3 de 5: Scores_Nivel2_3_4_5
## Contenido ÍNTEGRO de IE_DMX_v4_PART3
## Fase: Sesiones 07-13 (IE)
---
# BIBLIA IE — DesarrollosMX v4
## Intelligence Engine: Scores Nivel 2 · 3 · 4 · 5
## PART 3 de 5 (Módulos 6–8)
## Fecha: 8 abril 2026

---

# MÓDULO 6: SCORES NIVEL 2 (14 scores — dependen de Nivel 0 + Nivel 1)

---

## 6.1 F09 — Value Score (Valor vs Precio)

```
ID:           F09
Nombre:       Value Score
Nivel:        2
Categoría:    zona
Tabla dest:   zone_scores
Dependencias: F08 Life Quality Index + unit price + market_prices_secondary
```

### Procesamiento
```
Calculator: calculators/zona/value-score.ts

Inputs:
  1. F08 LQI → zone_scores WHERE score_type='life_quality_index' AND zone_id=?
  2. market_prices_secondary → precio/m² promedio zona (venta)
  3. unidades → precio/m² promedio de proyectos nuevos en zona

Lógica:
  lqi = F08.score_value  // 0-100
  precioM2Zona = market_prices_secondary.price_m2_median
  
  // Normalizar precio en escala 0-100 (0 = baratísimo, 100 = carísimo)
  precioNormalizado = percentile(precioM2Zona, todosLosPreciosCDMX) 
  
  // Value = LQI alto + precio bajo = buena relación
  valueGap = lqi - precioNormalizado
  score = 50 + (valueGap / 2)
  score = clamp(score, 0, 100)
  
  label = score >= 75 ? 'Excelente relación calidad-precio' :
          score >= 60 ? 'Buena relación' :
          score >= 45 ? 'Relación justa' :
          score >= 30 ? 'Precio alto para la zona' : 'Sobre valorada'

Output:
  score_value: 0-100
  score_label: text
  components: {
    lqi: number,
    precio_m2_zona: number,
    precio_percentil_cdmx: number,
    value_gap: number,
    zonas_mejor_value: [ { zona, lqi, precio_m2, value_score } ]
  }

Persistencia: zone_scores (zone_id, 'value_score', period_date)
API: GET /api/scores/zone/[zoneId]/value_score
Hook: useScore('zone_scores', zoneId, 'value_score')
Componente: ValueScoreBadge — scatter plot LQI vs Precio con zona marcada
Page: /explorar (filtro "mejor valor"), /proyectos/[id] Tab Zona, /comprador/comparador
Interacción: Explorar por value_score >= 70 ("zonas oportunidad")
Feedback: Búsquedas por "mejor valor" → search_logs → demanda de value
Notificación: Value score subió >10 puntos → compradores en zonas adyacentes
API externa: GET /api/v1/scores/value?lat=X&lon=Y
```

---

## 6.2 F10 — Gentrification 2.0 (Multi-Fuente Temporal)

```
ID: F10 | Nivel: 2 | Categoría: zona
Dependencias: D05 Gentrification + geo_data_points(denue, fgj, gtfs)

Calculator: calculators/zona/gentrification-2.ts

Inputs:
  1. D05 Gentrification Score base
  2. DENUE snapshots temporales → delta ratio premium/basic
  3. FGJ tendencia → mejora/empeoramiento seguridad
  4. GTFS cambios → nuevas estaciones/rutas

Lógica:
  gentrificationBase = D05.score_value
  
  // Deltas temporales (requiere ≥2 snapshots separados ≥3 meses)
  ratioPBActual = DENUE snapshot reciente → ratio premium/basic
  ratioPB6mAtras = DENUE snapshot 6m atrás → ratio premium/basic
  deltaRatioPB = ratioPBActual - ratioPB6mAtras
  
  safetyActual = F01 actual
  safety6mAtras = score_history WHERE score_type='safety' 6m atrás
  deltaSafety = safetyActual - safety6mAtras
  
  transitActual = F02 actual
  deltaTransit = transitActual - transit6mAtras
  
  velocity = (deltaRatioPB * 0.40 + deltaSafety * 0.30 + deltaTransit * 0.30)
  
  // Clasificar fase
  if (gentrificationBase < 30 && velocity > 0) fase = 'pre_gentrificacion'
  else if (gentrificationBase >= 30 && < 60 && velocity > 0) fase = 'temprana'
  else if (gentrificationBase >= 60 && < 80) fase = 'consolidada'
  else if (gentrificationBase >= 80) fase = 'madura'
  else fase = 'estable'

Output:
  score_value: velocity normalizado 0-100
  score_label: fase
  components: {
    gentrification_base, velocity, delta_ratio_pb, delta_safety, delta_transit,
    fase, prediccion_12m, negocios_premium_nuevos, negocios_basic_cerrados
  }

Persistencia: zone_scores (zone_id, 'gentrification_2', period_date)
Componente: GentrificationTimeline — timeline con fases + velocímetro
Page: /admin/inteligencia, /asesor/inteligencia
Notificación: Zona cambió de fase → "Colonia [X] entró en gentrificación temprana"
API externa: GET /api/v1/scores/gentrification?lat=X&lon=Y
```

---

## 6.3 B03 — Pricing Autopilot

```
ID: B03 | Nivel: 2 | Categoría: desarrollador
Dependencias: B08 Absorption + B07 Competitive + days_on_market + búsquedas matching

Calculator: calculators/desarrollador/pricing-autopilot.ts

Inputs:
  1. B08 velocidad de venta actual
  2. B07 precios de competidores
  3. unidades.days_on_market por unidad
  4. búsquedas WHERE presupuesto range includes unidad.precio AND zone match

Lógica:
  for each unidad in proyecto:
    sobrecompetencia = (unidad.precio/m2) / B07.avg_price_m2_competitors - 1
    demandCount = count(búsquedas matching)
    ventaLenta = B08.absorptionRate < 0.5
    muchoTiempo = daysOnMarket > 180
    
    if (sobrecompetencia > 0.15 && ventaLenta) ajuste = -sobrecompetencia * 0.5 * 100
    else if (muchoTiempo && demandCount < 3) ajuste = -5
    else if (B08.absorptionRate > 2 && demandCount > 10) ajuste = +3
    else ajuste = 0

Output:
  score_value: ajuste promedio ponderado proyecto
  components: {
    por_unidad: [{ unidad_id, precio_actual, precio_sugerido, ajuste_pct,
                   days_on_market, demand_count, vs_competencia_pct, impacto_estimado }],
    unidades_sobre_precio, unidades_bajo_precio, unidades_ok
  }
  recommendations: ["3 unidades 12% sobre competencia — bajar precio aceleraría venta"]

Persistencia: project_scores (project_id, null, 'pricing_autopilot')
  + project_scores por unidad (project_id, unidad_id, 'pricing_autopilot')
API: tRPC developer.getPricingAutopilot({ projectId })
Componente: PricingAutopilotPanel — tabla por unidad + sugerencia + impacto
Page: /desarrollador/analytics Tab Precios
Interacción: Dev acepta/rechaza sugerencia → feedback → calibra modelo
Feedback: Accept/reject → interaction_feedback type='pricing_response' → calibra pesos
Notificación: "Sugerencia de precio: 3 unidades podrían beneficiarse de ajuste"
```

---

## 6.4 B05 — Market Cycle

```
ID: B05 | Nivel: 2 | Categoría: desarrollador
Dependencias: macro_series(inpp, pib, banxico) + B08 Absorption + inventario tendencia

Calculator: calculators/desarrollador/market-cycle.ts

Inputs: tasa_referencia trend, absorción aggregate zona, inventario disponible, búsquedas trend

Lógica:
  if (demandaTrend > 0 && absorcionTrend > 0 && inventarioTrend < 0) fase = 'expansion'
  else if (demandaTrend > 0 && absorcionTrend < 0 && inventarioTrend > 0) fase = 'pico'
  else if (demandaTrend < 0 && absorcionTrend < 0 && inventarioTrend > 0) fase = 'contraccion'
  else if (demandaTrend < 0 && absorcionTrend > 0 && inventarioTrend < 0) fase = 'recuperacion'
  else fase = 'transicion'

Output:
  score_value: position en ciclo (0-100)
  score_label: fase
  components: { fase, tasa_trend, absorcion_trend, inventario_trend, demanda_trend,
                meses_hasta_transicion, recomendacion }

Persistencia: zone_scores (zone_id, 'market_cycle', period_date)
Componente: MarketCycleIndicator — reloj circular 4 fases + flecha posición
Page: /desarrollador/analytics, /admin/inteligencia, /asesor/inteligencia
Hook: useScore('zone_scores', zoneId, 'market_cycle')
Interacción: Toggle zona, comparar fases entre zonas, histórico ciclos
Feedback: Devs que ven ciclo + ajustan precio → interaction_feedback valida modelo
Notificación: Zona cambió de fase → "Mercado [zona] entró en fase [X]"
API externa: GET /api/v1/scores/market_cycle?zone_id=X
```

---

## 6.5 B09 — Cash Flow Projection

```
ID: B09 | Nivel: 2 | Categoría: desarrollador
Dependencias: B08 Absorption + macro_series(inpp, banxico) + payment_plans
Calculator: calculators/desarrollador/cash-flow.ts
Lógica: Proyectar 12 meses: ingresos por ventas + cobros - costos construcción - comisiones
Output: proyeccion_mensual[12], breakeven_mes, margen_12m, riesgo_costos, sensibilidad_tasa
Persistencia: project_scores (project_id, null, 'cash_flow')
Componente: CashFlowChart — stacked bar chart 12 meses (Recharts)
Page: /desarrollador/analytics
Hook: useProjectScore(projectId, 'cash_flow')
Interacción: Ajustar supuestos (tasa, ritmo venta) → recalcular en tiempo real
Feedback: Dev ajusta supuestos → interaction_feedback → calibra sensibilidad
Notificación: Cash flow negativo detectado → "Alerta: proyecto [X] podría tener déficit mes [N]"
API externa: N/A (datos sensibles del desarrollador, no se exponen)
```

---

## 6.6 B10 — Unit Revenue Optimization

```
ID: B10 | Nivel: 2 | Dependencias: B07 + historial specs→premium
Lógica: Qué specs generan premium → sugerir pricing diferencial por unidad
Output: premium por spec, unidades con pricing subóptimo, revenue uplift potencial
Persistencia: project_scores (project_id, null, 'unit_revenue_opt')
Hook: useProjectScore(projectId, 'unit_revenue_opt')
Componente: UnitRevenueOptPanel — tabla specs vs premium con uplift estimado
Page: /desarrollador/analytics (decisiones de diseño)
Interacción: Toggle specs para ver impacto en revenue
Feedback: Dev implementa sugerencia → ventas confirman/niegan premium → calibra
Notificación: N/A (info bajo demanda)
API externa: N/A (datos de producto del dev)
```

---

## 6.7 B13 — Amenity ROI

```
ID: B13 | Nivel: 2 | Dependencias: proyectos con/sin amenidad + absorción + premium
Lógica: Por amenidad, estimar premium de precio y aceleración de absorción
Output: por_amenidad: { nombre, premium_pct, absorcion_boost, roi_estimado }
Persistencia: zone_scores (zone_id, 'amenity_roi', period_date)
Page: /desarrollador/analytics (decisiones de diseño)
Hook: useScore('zone_scores', zoneId, 'amenity_roi')
Componente: AmenityROITable — tabla por amenidad: nombre, premium%, absorción boost, ROI
Interacción: Filtrar por tipo de amenidad, comparar entre zonas
Feedback: Proyectos con/sin amenidad → ventas reales → calibra premium estimado
Notificación: N/A (análisis periódico)
API externa: N/A (datos agregados de proyectos)
```

---

## 6.8 B14 — Buyer Persona (Proyecto)

```
ID: B14 | Nivel: 2 | Dependencias: H14 zona + búsquedas activas + perfil compradores
Lógica: Quién compra este producto en esta zona
Output: persona principal/secundaria, ingreso estimado, financiamiento preferido
Persistencia: project_scores (project_id, null, 'buyer_persona')
Hook: useProjectScore(projectId, 'buyer_persona')
Componente: BuyerPersonaCard — avatar + stats del comprador típico + financiamiento
Page: /desarrollador/analytics, /asesor/inteligencia
Interacción: Ver perfil detallado, comparar con búsquedas activas
Feedback: Transacciones cerradas → perfil real vs predicho → calibra modelo
Notificación: Perfil comprador cambió significativamente → "El buyer persona de [proyecto] cambió"
API externa: N/A (datos de proyecto)
```

---

## 6.9 B15 — Launch Timing

```
ID: B15 | Nivel: 2 | Dependencias: B05 + B08 + competencia lanzamientos + search_trends
Lógica: ¿Buen momento para lanzar? Evitar pico oferta o contracción
Output: timing_score, ventana óptima, riesgo de lanzar ahora, competidores recientes
Persistencia: project_scores (project_id, null, 'launch_timing')
Hook: useProjectScore(projectId, 'launch_timing')
Componente: LaunchTimingPanel — semáforo + ventana óptima + competidores lanzando
Page: /desarrollador/analytics (Tab Estrategia)
Interacción: Simular diferentes fechas de lanzamiento → ver impacto estimado
Feedback: Dev lanza en fecha sugerida vs otra → resultado real → calibra modelo
Notificación: Ventana óptima detectada → "Buen momento para lanzar en zona [X]"
API externa: N/A (decisión interna del dev)
```

---

## 6.10 C01 — Lead Score

```
ID: C01 | Nivel: 2 | Categoría: asesor
Dependencias: A01 + búsqueda matching + historial cierres + comportamiento lead

Calculator: calculators/asesor/lead-score.ts

Inputs:
  1. A01 Affordability → capacidad de pago
  2. búsquedas → búsqueda activa con criterios claros
  3. interaction_feedback → feedback positivo de visitas
  4. visitas_programadas → ha visitado proyectos
  5. search_logs/wishlist → engagement
  6. historial cierres asesor con perfiles similares

Lógica:
  affordabilityScore = A01.score_value * 0.20
  intentionScore = (búsquedaActiva?20:0 + visitas>0?15:0 + wishlist>0?10:0 + feedbackHot?15:0) * 0.30
  engagementScore = (díasSinAcción<1?30 : <3?25 : <7?15 : <14?5 : 0) * 0.25
  matchScore = bestMatchPct * 0.25
  totalScore = sum
  
  label = >=80 'Hot' : >=60 'Warm' : >=30 'Cool' : 'Cold'
  accion = Hot+inactivo → 'Contactar HOY'
           Warm+sinVisita → 'Agendar visita'
           Cool → 'Enviar opciones'

Output:
  score_value: 0-100
  score_label: 'Hot'|'Warm'|'Cool'|'Cold'
  components: { affordability, intention, engagement, match_quality,
                dias_sin_contacto, visitas_count, accion_sugerida }

Persistencia: user_scores (user_id=asesor_id, target_id=contacto_id, 'lead_score')
Componente: LeadScoreBadge — badge Hot/Warm/Cool/Cold en card pipeline
Page: /asesor/pipeline (badges), /asesor/contactos/[id] (prominente)
Feedback: Asesor sigue acción → registra resultado → calibra pesos
Notificación: Lead pasó de Cool a Hot → "Lead [nombre] se activó"
```

---

## 6.11 C03 — Matching Engine

```
ID: C03 | Nivel: 2 | Categoría: asesor
Dependencias: A01 + A02 + inventario completo + búsqueda criterios

Calculator: calculators/asesor/matching.ts

Lógica:
  for each unidad in inventarioDisponible:
    matchPrecio = presupuesto includes precio ? 1.0 : within 10% ? 0.7 : 0
    matchTipo = tipo matches ? 1.0 : 0.3
    matchZona = zona matches ? 1.0 : misma alcaldía ? 0.6 : 0.2
    matchRecamaras = within ±1 ? 1.0 : 0.3
    matchM2 = >= 90% min ? 1.0 : 0.5
    bonusAffordability = A01>70 ? 0.1 : 0
    bonusInvestment = A02.bestYield>6 ? 0.1 : 0
    
    total = precio*0.30 + tipo*0.15 + zona*0.20 + rec*0.15 + m2*0.10 + bonuses
  
  top5 con razón del match por cada uno

Output: matches[5] con unidad_id, project_id, match_pct, razon
Persistencia: user_scores (user_id=asesor, target_id=busqueda_id, 'matching')
API: POST /api/match (existente, funcional)
Componente: MatchingSuggestions — 5 cards con match % y razón
Page: /asesor/pipeline → detalle búsqueda → Tab "Sugeridos"
Feedback: Asesor comparte proyecto → cliente responde → match validado/invalidado
```

---

## 6.12 D03 — Supply Pipeline

```
ID: D03 | Nivel: 2 | Dependencias: macro_series(sniiv) + uso_suelo + absorción
Lógica: Oferta futura 12-24m vs absorción → surplus o déficit
Output: supply_12m, supply_24m, absorcion_actual, deficit_surplus, meses_inventario
Persistencia: zone_scores (zone_id, 'supply_pipeline', period_date)
Hook: useScore('zone_scores', zoneId, 'supply_pipeline')
Componente: SupplyPipelineChart — barras apiladas 12/24m: oferta futura vs absorción
Page: /admin/inteligencia, /desarrollador/analytics
Interacción: Filtrar por tipo de producto, comparar zonas
Feedback: Oferta real vs proyectada → calibra modelo de pipeline
Notificación: Surplus detectado > 18 meses inventario → "Zona [X] con sobreoferta"
API externa: GET /api/v1/scores/supply_pipeline?zone_id=X
```

---

## 6.13 H12 — Zona Oportunidad

```
ID: H12 | Nivel: 2 | Dependencias: D05 + 0311/denue + H03 + market_prices_secondary
Lógica: Zonas con mejora detectada + precio todavía accesible = oportunidad
Output: oportunidad_score, señales de mejora, precio actual vs proyectado, ventana
Persistencia: zone_scores (zone_id, 'zona_oportunidad', period_date)
API externa: GET /api/v1/scores/opportunity?lat=X&lon=Y

Hook: useScore('zone_scores', zoneId, 'zona_oportunidad')
Componente: ZonaOportunidadBadge — badge + señales de mejora + ventana
Page: /explorar (filtro "zonas oportunidad"), /admin/inteligencia, /asesor/inteligencia
Interacción: Click → ver señales detalladas, comparar con precio actual
Feedback: Compras en zonas oportunidad → resultado real → calibra detección
Notificación: Nueva zona oportunidad detectada → "Zona [X] muestra señales de mejora + precio accesible"
```

---

## 6.14 H16 — Neighborhood Evolution

```
ID: H16 | Nivel: 2 | Dependencias: 0311 + denue + fgj + market_prices + gtfs
Lógica: Narrar evolución de colonia últimos 6-12m usando snapshots temporales
Output: narrativa, indicadores que mejoraron/empeoraron, predicción 12m
Persistencia: zone_scores (zone_id, 'neighborhood_evolution', period_date)
Componente: NeighborhoodEvolutionTimeline — timeline animada + indicadores + predicción
Page: /proyectos/[id] Tab Zona, /admin/inteligencia
Hook: useScore('zone_scores', zoneId, 'neighborhood_evolution')
Interacción: Scroll timeline, ver antes/después por indicador
Feedback: Views → PostHog → saber que evolución de barrio importa
Notificación: Cambio significativo en evolución → "Colonia [X] mostró cambios importantes este mes"
API externa: GET /api/v1/scores/neighborhood_evolution?zone_id=X
```

---

# MÓDULO 7: SCORES NIVEL 3 (12 scores)

---

## 7.1 A07 — Timing Optimizer

```
ID: A07 | Nivel: 3 | Categoría: comprador
Dependencias: market_prices historial + macro_series(banxico) + inventario + B05 Market Cycle

Calculator: calculators/comprador/timing-optimizer.ts

Inputs: precio trend 24m, tasa trend, inventario trend, B05 fase

Lógica:
  if (fase='contraccion' && precioTrend<0 && inventarioTrend>0)
    → esperar_3_6m, "Precios bajando y oferta creciendo"
  if (fase='recuperacion' && precioTrend>0 && tasaTrend<0)
    → comprar_ahora, "Precios empezando a subir con tasas bajando"
  if (fase='expansion' && precioTrend>2)
    → comprar_pronto, "Precios subiendo rápido"
  if (fase='pico')
    → precaucion, "Mercado en pico — negociar agresivamente"
  
  costoEsperar3m = precioTrend * 3 * m2
  ahorroPorTasa = calcAhorroPorBajaTasa(monto, tasaTrend, 3)

Output:
  score_value: urgencia 0-100 (100=comprar ya)
  components: { fase, precio_trend, tasa_trend, recomendacion, razon,
                costo_esperar_3m, ahorro_tasa_3m, ventana_optima_meses }

Persistencia: zone_scores (zone_id, 'timing_optimizer', period_date)
Componente: TimingOptimizer — semáforo + razonamiento + impacto financiero
Page: /comprador/simulador, /proyectos/[id]
```

---

## 7.2 A08 — Comparador Multi-Dimensional

```
ID: A08 | Nivel: 3 | Categoría: comprador
Dependencias: A01 + A02 + A12 + B08 + F08

Calculator: calculators/comprador/comparador.ts

Inputs: Array project_ids (max 5) + todos scores disponibles

Lógica:
  for each projectId:
    scores = { affordability, investment, price_fairness, absorption,
               life_quality, trust, risk }
  
  // Ranking por cada dimensión + score compuesto por perfil
  perfilInversor = investment*0.35 + price_fairness*0.25 + trust*0.20 + risk*0.20
  perfilFamilia = life_quality*0.35 + trust*0.25 + affordability*0.25 + risk*0.15
  perfilPrimerCompra = affordability*0.40 + price_fairness*0.30 + life_quality*0.20 + trust*0.10

Output: comparación multi-dimensional, ranking por perfil, mejor por dimensión
Persistencia: NO se persiste — on-demand
API: GET /api/scores/compare?ids=a,b,c,d,e
Hook: useCompareProjects(projectIds)
Componente: ComparadorTable — tabla multi-dimensional + toggle por perfil
Page: /asesor/comparador, /comprador/comparador
```

---

## 7.3 A09 — Risk Score (Comprador)

```
ID: A09 | Nivel: 3 | Dependencias: B08 + H05 + avance_obra + F06 + A12
Lógica: Riesgo compuesto para el comprador (proyecto fantasma, estafa, over-leverage)
Output: risk_score 0-100 (100=bajo riesgo), red_flags[], mitigaciones
Persistencia: project_scores (project_id, null, 'buyer_risk')
Componente: RiskScoreBadge — escudo verde/amarillo/rojo
Page: /proyectos/[id] prominente, /comprador/guardados
Notificación: Red flag → compradores watchlist: "Alerta en proyecto [X]"
```

---

## 7.4 A10 — Lifestyle Match

```
ID: A10 | Nivel: 3 | Categoría: comprador
Dependencias: amenidades + denue + str_market_data + perfil comprador

Calculator: calculators/comprador/lifestyle-match.ts

6 perfiles:
  quiet:        { safety: 0.3, air: 0.2, noise: 0.3, green: 0.2 }
  nightlife:    { restaurants: 0.3, bars: 0.3, transit: 0.2, safety_night: 0.2 }
  family:       { schools: 0.3, safety: 0.3, parks: 0.2, health: 0.2 }
  fitness:      { gyms: 0.3, parks: 0.3, cycling: 0.2, clean_air: 0.2 }
  remote_worker:{ cafes: 0.3, internet: 0.2, quiet: 0.3, cowork: 0.2 }
  investor:     { yield: 0.4, appreciation: 0.3, demand: 0.2, risk: 0.1 }

Output: match 0-100, fortalezas, debilidades, alternativas mejores
Persistencia: user_scores (user_id, target_id=project_id, 'lifestyle_match')
Componente: LifestyleMatchSelector — selector perfil + radar chart
Page: /proyectos/[id] (prominente comprador)
Feedback: Perfil seleccionado → personalización Netflix del homepage
```

---

## 7.5 A11 — Patrimonio 20 Años

```
ID: A11 | Nivel: 3 | Dependencias: unit price + macro_series(shf, inegi, banxico) + A02
Lógica: Simulación 20y: equity buildup + plusvalía + ingresos renta - costos
Output: patrimonio_neto_20y, equity_chart, vs_renta, vs_cetes
Persistencia: user_scores (user_id, target_id=unit_id, 'patrimonio_20y')
Hook: useUserScore(userId, unitId, 'patrimonio_20y')
Componente: PatrimonioSimulator — gráfica 20 años 3 escenarios (optimista/base/pesimista)
Page: /comprador/simulador, /proyectos/[id] Tab Inversión
Interacción: Ajustar enganche, plazo, plusvalía estimada → recalcular en tiempo real
Feedback: Simulaciones guardadas → search_logs → qué rangos exploran los compradores
Notificación: N/A (herramienta on-demand)
API externa: N/A (datos personales del comprador)
```

---

## 7.6 B06 — Project Genesis

```
ID: B06 | Nivel: 3 | Dependencias: B01 + B14 + B05 + macro(inpp, shf) + search_trends + str
Lógica: ¿Qué producto construir en esta zona? Tipo, rango precio, m², amenidades
Output: tipo_recomendado, rango_precio_optimo, m2_optimo, amenidades, yield_estimado
Persistencia: zone_scores (zone_id, 'project_genesis', period_date)
API externa: GET /api/v1/site-selection?zone_id=X

Hook: useScore('zone_scores', zoneId, 'project_genesis')
Componente: ProjectGenesisPanel — recomendación de producto + specs óptimas
Page: /admin/inteligencia, /desarrollador/analytics (si zona del proyecto)
Interacción: Ajustar criterios de inversión → ver cómo cambia la recomendación
Feedback: Dev construye producto sugerido → ventas validan → calibra modelo
Notificación: N/A (análisis bajo demanda)
```

---

## 7.7 B11 — Channel Performance (IMPLEMENTADO)

```
ID: B11 | Nivel: 3 | Estado: IMPLEMENTADO
Calculator: calculators/desarrollador/channel-performance.ts
Lógica: Conversion rate por broker, ranking, top performer, avgCommission
Persistencia: project_scores (project_id, null, 'channel_performance')
Componente: BrokerPerformancePanel
Page: /desarrollador/asesores
```

---

## 7.8 C04 — Objection Killer (AI)

```
ID: C04 | Nivel: 3 | Dependencias: A12 + A04 + A09 + H05 + objeción
Lógica: Generar contra-argumentos con datos IE según objeción específica
  precio_alto → A12 + A04 para demostrar valor
  zona_insegura → F01 + tendencia FGJ
  desarrolladora_desconocida → H05 Trust Score
Output: argumentos[] con datos que respaldan, formato WhatsApp copy-paste
Persistencia: ai_generated_content (content_type='objection_killer')
Componente: ObjectionKillerPanel — selector objeción + argumentos generados
Page: /asesor/contactos/[id], /asesor/dossier
```

---

## 7.9 C06 — Commission Forecast

```
ID: C06 | Nivel: 3 | Dependencias: pipeline × probabilidad × comisiones
Lógica: forecast = sum(búsquedas.map(b => valor * comision_pct * probByEtapa[etapa]))
  probByEtapa = { cerrando:0.80, ofertando:0.50, visitando:0.20, buscando:0.05 }
Output: forecast_30d, 60d, 90d, pipeline_count, comision_mes_actual
Persistencia: user_scores (user_id, null, 'commission_forecast')
Componente: CommissionForecast — barras 30/60/90 días
Page: /asesor/dashboard (prominente), /asesor/metricas
```

---

## 7.10 D04 — Cross Correlation

```
ID: D04 | Nivel: 3 | Dependencias: office_market + market_prices + macro(imss)
Lógica: Correlacionar vacancy oficinas → precios residencial (lag 6-12m)
Output: correlaciones significativas, leading indicators, lag meses
Persistencia: zone_scores (zone_id, 'cross_correlation', period_date)
Hook: useScore('zone_scores', zoneId, 'cross_correlation')
Componente: CrossCorrelationChart — scatter plot con lag indicators
Page: /admin/inteligencia (solo admin — datos sensibles)
Interacción: Seleccionar variables, ajustar lag, ver R² y p-value
Feedback: N/A (análisis estadístico, no genera feedback de usuario)
Notificación: Correlación significativa nueva detectada → admin: "Nueva correlación: [X] predice [Y] con lag [N]m"
API externa: N/A (insights internos de mercado)
```

---

## 7.11 H13 — Site Selection AI

```
ID: H13 | Nivel: 3 | Dependencias: F06 + H03 + denue + gtfs + fgj + B01 + H04 + catastro
Lógica: Ranking zonas óptimas para desarrollar según criterios
Output: top_10_zonas con scores, fortalezas/debilidades, terrenos potenciales
Persistencia: ai_generated_content (content_type='site_selection')
API externa: GET /api/v1/site-selection?criteria={...}

Hook: useSiteSelection(criteria)
Componente: SiteSelectionMap — mapa con top zonas destacadas + tabla ranking
Page: /admin/inteligencia, /api/v1/site-selection (producto licenciable)
Interacción: Ajustar criterios (tipo, presupuesto, target) → re-ranking en tiempo real
Feedback: Dev elige zona sugerida → resultado → calibra ranking
Notificación: N/A (herramienta on-demand)
```

---

## 7.12 H15 — Due Diligence Score

```
ID: H15 | Nivel: 3 | Dependencias: F06 + H03 + H05 + F07 + H06 + profeco
Lógica: Checklist automatizado de due diligence con red/green flags
Output: score 0-100, red_flags[], green_flags[], recomendaciones
Persistencia: project_scores (project_id, null, 'due_diligence')
API externa: GET /api/v1/due-diligence?project_id=X

Hook: useProjectScore(projectId, 'due_diligence')
Componente: DueDiligenceChecklist — checklist con red/green flags + score resumen
Page: /proyectos/[id] Tab Legal, /comprador/guardados
Interacción: Expandir cada flag para ver detalle y fuente del dato
Feedback: Comprador reporta problema no detectado → flag faltante → mejorar checklist
Notificación: Red flag detectada en proyecto watchlist → "Alerta: proyecto [X] tiene red flag en [Y]"
```

---

# MÓDULO 8: SCORES NIVEL 4 + NIVEL 5

## 8.1 NIVEL 4 — Scores Agregados (7)

---

### E01 — Full Project Score

```
ID: E01 | Nivel: 4 | Dependencias: A01+A02+A12+A09+B08+B04+A06+D09

Calculator: calculators/agregados/full-project-score.ts

PESOS:
  affordability: 0.12, investment: 0.10, price_fairness: 0.15,
  buyer_risk: 0.10, absorption: 0.10, pmf: 0.08,
  neighborhood: 0.10, ecosystem_health: 0.08,
  trust: 0.07, life_quality: 0.10

Lógica: Weighted average con fallback para scores faltantes (redistribuir peso)

Output:
  score_value: 0-100 (EL "DMX Score" del proyecto)
  score_label: 'Excepcional'|'Muy bueno'|'Bueno'|'Regular'|'Bajo'
  components: { [score_type]: { value, weight, confidence } }

Persistencia: project_scores (project_id, null, 'full_project_score')
Componente: FullProjectScoreBadge — badge principal en toda ficha
Page: EVERYWHERE — /explorar cards, /proyectos/[id] header, /asesor/inventario
API externa: GET /api/v1/scores/project?project_id=X
```

---

### G01 — Full Score 2.0 (DMX Score Público)

```
ID: G01 | Nivel: 4 | Dependencias: E01 + F08 + F12 + F07
Lógica: E01 proyecto + F08 zona + F12 riesgo + F07 fiscal → score unificado
Output: EL DMX Score público (0-100) — el que aparece en medios
Persistencia: project_scores (project_id, null, 'dmx_score')
Page: /proyectos/[id] header, /explorar, /indices (pública)
API externa: GET /api/v1/scores/dmx?project_id=X
```

---

### E02 — Portfolio Optimizer

```
ID: E02 | Nivel: 4 | Dependencias: A02×múltiples + A09 + D02
Lógica: Optimización portafolio: diversificación zona/tipo/riesgo
Output: portafolio_sugerido, risk_adjusted_return, diversificacion_score
Persistencia: user_scores (user_id, null, 'portfolio_optimizer')
Page: /comprador/simulador (premium)
```

---

### E03 — Predictive Close

```
ID: E03 | Nivel: 4 | Dependencias: C01 + C03 + B05 + A07 + performance asesor
Lógica: Probabilidad cierre × valor → expected revenue por lead
Output: probabilidad_cierre 0-100, expected_value, dias_estimados
Persistencia: user_scores (user_id=asesor, target_id=contacto, 'predictive_close')
Page: /asesor/pipeline (tooltip), /asesor/dashboard
```

---

### E04 — Anomaly Detector

```
ID: E04 | Nivel: 4 | Dependencias: todos los scores con historial + D04
Lógica: Desviaciones estadísticas >2σ en cualquier score → anomalía
Output: anomalías activas con severidad, descripción, métricas involucradas
Persistencia: market_anomalies INSERT
Componente: AnomalyDetectorFeed
Page: /admin/dashboard, /admin/anomalias
Notificación: Anomalía critical → admin: "Anomalía detectada: [descripción]"
```

---

### D09 — Ecosystem Health

```
ID: D09 | Nivel: 4 | Dependencias: imss + denue + F01 + F02 + str + market_prices
Lógica: Salud general ecosistema inmobiliario zona
Output: health_score 0-100, indicadores por dimensión, tendencia
Persistencia: zone_scores (zone_id, 'ecosystem_health', period_date)
```

---

### D02 — Zona Ranking

```
ID: D02 | Nivel: 4 | Dependencias: dmx_indices (7)
Lógica: Ranking todas las zonas por índice DMX compuesto
Output: ranking[] con posición, score, cambio vs anterior
Persistencia: zone_scores (zone_id, 'zona_ranking', period_date)
Componente: ZonaRankingTable — tabla sorteable multi-criterio
Page: /admin/inteligencia, /indices (público)
API externa: GET /api/v1/rankings?city=cdmx&sort=dmx_score
```

---

## 8.2 NIVEL 5 — Contenido Generado por AI (26 scores/productos)

Se almacenan en `ai_generated_content`. Se generan on-demand o por cron.

### Patrón estándar de generación AI

```typescript
async function generateAIContent(contentType, inputs, userId, projectId?) {
  // 1. Prompt activo de ai_prompt_versions
  const prompt = await getActivePrompt(contentType)
  // 2. Rate limit via FeatureGate
  await checkFeatureLimit(userId, `ai_${contentType}_month`)
  // 3. Llamar Claude/GPT
  const response = await anthropic.messages.create({
    model: prompt.model || 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: prompt.prompt_text,
    messages: [{ role: 'user', content: JSON.stringify(inputs) }]
  })
  // 4. Persistir en ai_generated_content
  // 5. Track en ai_usage_tracking
  return response.content[0].text
}
```

### Catálogo completo Nivel 5

```
ASESOR — on-demand con FeatureGate:
  C02: Argumentario — 5 argumentos con datos IE, copy-paste WhatsApp
  C05: Weekly Briefing — resumen semanal personalizado (cron lunes 7am)
  C08: Dossier Inversión — PDF profesional con 4 escenarios

AGREGADOS — cron o on-demand:
  E05: Market Narrative — narrativa mensual del mercado
  E06: Developer Benchmark — comparativa anónima entre devs
  E07: Scenario Planning — "qué pasa si tasa sube 2%"
  E08: Auto Report — reportes configurables por trigger

FULL SCORE — on-demand:
  G02: Narrative 2.0 — narrativa enriquecida del proyecto
  G03: Due Diligence Report — PDF completo con H15
  G04: Zone Comparison — reporte comparativo 2-3 zonas
  G05: Impact Predictor — impacto de construir X en zona Y

MERCADO — cron:
  D01: Market Pulse — 7 indicadores con narrativa
  D08: Foreign Investment — análisis inversión extranjera
  D10: API Gateway Score — monitoring de uso API

ZONA — on-demand:
  F11: Supply Pipeline Zone — pipeline oferta visual
  F13: Commute — isócronas desde proyecto (Mapbox)
  F14: Neighborhood Change — narración cambio barrio
  F16: Hipotecas Comparador — comparador con datos Banxico reales
  F17: Site Selection — herramienta selección sitio

PRODUCTOS LICENCIABLES (detalle en PART 5 Módulo 12):
  I01: DMX Estimate (AVM mexicano)
  I02: Market Intelligence Report
  I03: Feasibility Report
  I04: Índices Licenciables (API)
  I05: Insurance Risk API
  I06: Valuador Automático
```

### Detalle de los más importantes

#### C02 — Argumentario de Venta
```
Trigger: On-demand desde ficha proyecto
AI: Claude Sonnet via ANTHROPIC_API_KEY
Inputs: specs + A12 + A04 + F08 + H05 + A02 + objeciones frecuentes
Output: 5 argumentos con datos reales, formato WhatsApp
Persistencia: ai_generated_content (content_type='argumentario')
Rate limit: FeatureGate 'ai_dossiers_month'
Componente: ArgumentarioPanel — 5 cards expandibles + copiar
Page: /asesor/inventario/[projectId], /asesor/dossier
```

#### C05 — Weekly Briefing
```
Trigger: Cron weekly_briefing_generate (lunes 7am)
AI: Claude Sonnet
Inputs: KPIs asesor + pipeline + cambios scores zona + market_pulse
Output: Resumen semanal con prioridades y recomendaciones
Persistencia: ai_generated_content (content_type='weekly_briefing')
Componente: WeeklyBriefingCard en dashboard asesor
Notificación: "Tu briefing semanal está listo" (lunes 7:30am)
```

#### C08 — Dossier de Inversión
```
Trigger: On-demand
AI: Claude Sonnet
Inputs: A02 4 escenarios + A12 + F08 + H05 + market_pulse + competitive
Output: PDF profesional con datos IE
Persistencia: ai_generated_content + content_pdf_url
Componente: DossierGenerator — generar + preview + download
Page: /asesor/dossier
```

#### I02 — Market Intelligence Report
```
Trigger: Mensual (cron) o on-demand (admin/API)
AI: Claude Sonnet
Inputs: TODOS los zone_scores + macro_series + market_pulse + anomalías
Output: Reporte completo de mercado por zona, publicable
Persistencia: ai_generated_content (content_type='market_report')
Page: /admin/inteligencia → "Generar reporte"
API externa: GET /api/v1/reports/market?zone_id=X&format=pdf
Producto licenciable: $500-2,000 USD por reporte
```

---

# CONTEO FINAL MÓDULOS 6-8

| Nivel | Scores | Implementados | Pendientes |
|-------|--------|---------------|------------|
| 2 | 14 | 0 | 14 |
| 3 | 12 | 1 (B11) | 11 |
| 4 | 7 | 0 | 7 |
| 5 | 26 | 0 | 26 |
| **Total** | **59** | **1** | **58** |

Nota: F15 Transit Redundancy se cuenta en v3 dentro de Nivel 1. El total IE es 108+ con N01-N11.

---

# CROSS-REFERENCES

```
→ PART 1: Arquitectura IE y fuentes que alimentan todo
→ PART 2: Scores Nivel 0-1 de los que DEPENDEN estos scores
→ PART 4: 11 scores NUEVOS (N01-N11) insertados en niveles 0-2
→ PART 5: Cascadas, productos licenciables, competencia, fases H1/H2/H3
→ BIBLIA_BACKEND_DMX_v4: Tablas, tRPC routers, crons
→ BIBLIA_FRONTEND_DMX_v4: Componentes por portal
```

---

**FIN DE PART 3 — Continúa en BIBLIA_IE_DMX_v4_PART4.md (11 Scores Nuevos + 7 Índices DMX)**
