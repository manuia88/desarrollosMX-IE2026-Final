# FASE 10 — Intelligence Engine: Scores Nivel 2 y 3

> **Duración estimada:** 5 sesiones Claude Code (~20 horas con agentes paralelos)
> **Dependencias:** FASE 08 (N0 framework + AVM), FASE 09 (N1 cards)
> **Bloqueantes externos:**
> - Tier 2-3 data suficiente para que C01 Lead Score, C03 Matching Engine, B14 Buyer Persona Proyecto funcionen (≥10 proyectos + ≥10 búsquedas).
> - `feedback_registered` cascade ya wireada desde FASE 08.
> - `ai_prompt_versions` con prompts C04 Objection Killer + C06 Commission Forecast versionados.
> **Resultado esperado:** 14 N2 + 12 N3 = 26 scores implementados. C03 Matching Engine operando con algoritmo ponderado zone_scores × project_scores × busqueda_filtros. B03 Pricing Autopilot sugiriendo por unidad. A10 Lifestyle Match 6 perfiles. A08 Comparador Multi-Dimensional 8 dimensiones en UI. H13 Site Selection Tool (input polígono → ranked sites). Tag `fase-10-complete`.
> **Priority:** [H1]

## Contexto y objetivo

Los scores N2 son composición de N1: Value Score, Gentrification 2.0, Pricing Autopilot, Market Cycle, Cash Flow, Amenity ROI, Lead Score, Matching Engine, etc. Los N3 son scores con alta dependencia (comparador multi-dimensional, lifestyle match, due diligence, site selection). Esta fase entrega el corazón del advisory ASESOR + COMPRADOR + DEV en H1.

## Bloques

### BLOQUE 10.A — Calculators Nivel 2 (14 scores)

#### MÓDULO 10.A.1 — F09 Value Score

**Pasos:**
- `[10.A.1.1]` Crear `shared/lib/intelligence-engine/calculators/n2/f09-value.ts`. Fórmula: `value = F08_LQI × 0.30 + (100 − percentil_precio_m2_zona) × 0.40 + N11_momentum × 0.30`. Percentil invertido: cuanto más barato para la calidad, mayor value.
- `[10.A.1.2]` Components: `{ lqi, percentil_precio, momentum, oportunidad_valor: 'excelente'|'buena'|'regular'|'sobreprecio' }`.
- `[10.A.1.3]` Tier 2.

**Criterio de done del módulo:**
- [ ] Del Valle con LQI=82 + precio p50 + momentum=78 → value ≈78 "buena".

#### MÓDULO 10.A.2 — F10 Gentrification 2.0

**Pasos:**
- `[10.A.2.1]` `n2/f10-gentrification-2.ts`: consolida N03 Velocity + N04 Crime Trajectory + N01 Diversity Δ + A04 Arbitrage + precios 12m. Clasifica fase gentrificación: `inicial | media | tardia | post_gentrificada`.
- `[10.A.2.2]` Tier 3 (requiere snapshots).

**Criterio de done del módulo:**
- [ ] Escandón → fase "media" + tasa anual +12%.

#### MÓDULO 10.A.3 — B03 Pricing Autopilot

**Pasos:**
- `[10.A.3.1]` `n2/b03-pricing-autopilot.ts` recibe `projectId` → por cada `unidad` activa, calcula `precio_sugerido`. Inputs: precio_actual, precio_m2 zona p50/p75, días_en_mercado, absorcion B08, B07 competencia.
- `[10.A.3.2]` Lógica: si días_mercado > 90 y absorcion < 1/mes → sugerir −3% a −8%; si demanda alta y momentum positivo → sugerir +2% a +5%.
- `[10.A.3.3]` Output por unidad: `{ unidadId, precio_actual, precio_sugerido, delta_pct, rationale }`.
- `[10.A.3.4]` Tier 2.

**Criterio de done del módulo:**
- [ ] 20 unidades con 120 días mercado → sugerir bajadas promedio −5%.

#### MÓDULO 10.A.4 — B05 Market Cycle

**Pasos:**
- `[10.A.4.1]` `n2/b05-market-cycle.ts`: clasifica zona en fase del ciclo `expansion | pico | contraccion | recuperacion` a partir de B01 demand, B08 absorption trend, A12 price fairness, N11 momentum, macro TIIE.

**Criterio de done del módulo:**
- [ ] CDMX agregado → fase detectada con confianza medium.

#### MÓDULO 10.A.5 — B09 Cash Flow

**Pasos:**
- `[10.A.5.1]` `n2/b09-cash-flow.ts` para desarrollador: flujo mensual 24m proyectado usando B08 absorption × precio_promedio × split + B12 costos + amortización terreno/construccion.

**Criterio de done del módulo:**
- [ ] Gráfica stacked cash-in vs cash-out correcta.

#### MÓDULO 10.A.6 — B10 Unit Revenue Optimization

**Pasos:**
- `[10.A.6.1]` `n2/b10-unit-revenue-opt.ts`: por unidad, encuentra combo `{precio, esquema_pago, amenidades_incluidas}` que maximice ingreso esperado × probabilidad_venta.
- `[10.A.6.2]` Dependencies: C01 lead score + B03 precio + B04 PMF.

**Criterio de done del módulo:**
- [ ] Recomendación específica por unidad con lift % esperado.

#### MÓDULO 10.A.7 — B13 Amenity ROI

**Pasos:**
- `[10.A.7.1]` `n2/b13-amenity-roi.ts`: para cada amenidad del proyecto, calcula ROI = (precio_m2 lift estimado × m2_total) / (costo_amenidad + costo_mantenimiento_10y).
- `[10.A.7.2]` Benchmark amenidades más rentables vs menos rentables en la zona.

**Criterio de done del módulo:**
- [ ] Roof garden típicamente ROI>3; gym indoor ROI<1 en zonas con gyms cercanos.

#### MÓDULO 10.A.8 — B14 Buyer Persona Proyecto

**Pasos:**
- `[10.A.8.1]` `n2/b14-buyer-persona-proyecto.ts`: identifica el mix de perfiles (6 tipos) que mejor matchea el proyecto. Usa busqueda_proyectos + visitas + operaciones + demografía zona.

**Criterio de done del módulo:**
- [ ] Proyecto Polanco studios → 60% digital_nomad + 30% inversor.

#### MÓDULO 10.A.9 — B15 Launch Timing

**Pasos:**
- `[10.A.9.1]` `n2/b15-launch-timing.ts`: recomienda ventana óptima de lanzamiento (mes + semana) basado en estacionalidad + macro cycle + competencia pipeline (D03).

**Criterio de done del módulo:**
- [ ] Recomienda evitar diciembre-enero (alta comisión cierre + baja actividad).

#### MÓDULO 10.A.10 — C01 Lead Score

**Pasos:**
- `[10.A.10.1]` `n2/c01-lead-score.ts`: para cada `contacto` del asesor, score de probabilidad cierre basado en: presupuesto declarado × afordability (A01), urgencia_busqueda, interactions_count, feedback positivo histórico, visitas agendadas, perfil DISC (si existe).
- `[10.A.10.2]` Tier 4 calibrado (requiere ≥100 ventas cerradas); en H1 usa heurística + feedback bayesiano.
- `[10.A.10.3]` Output: `{ score, temperatura: frio|tibio|caliente, siguiente_mejor_accion: 'llamar'|'agendar_visita'|'enviar_dossier'|'esperar' }`.

**Criterio de done del módulo:**
- [ ] Contacto con 3 visitas + feedback hot → score ≥80.

#### MÓDULO 10.A.11 — C03 Matching Engine

**Pasos:**
- `[10.A.11.1]` `n2/c03-matching-engine.ts`: para una `busqueda`, devuelve top 10 proyectos match.
  ```
  match_score = 0.35 × filters_match + 0.25 × zone_scores_fit + 0.25 × project_scores_fit + 0.15 × momentum
  filters_match = coincidencia en [operacion, tipo_propiedad, recámaras, precio_min/max, colonia]
  zone_scores_fit = cosine_similarity(buyer_preferences_vector, zone_scores_vector_normalized)
  project_scores_fit = G01 Full Score 2.0 (cuando exista; fallback media N1 del proyecto)
  momentum = N11 zona
  ```
- `[10.A.11.2]` Sort resultado: operación > tipo_propiedad > colonia preferida > precio cercano > recámaras.
- `[10.A.11.3]` tRPC `intelligence.match({ busquedaId })` → 10 resultados con `{ projectId, unidadId?, score, rationale[], missing_filters[] }`.
- `[10.A.11.4]` Tier 4 calibrado con feedback (feedback_registered dispara cascade aprende qué matches funcionan).

**Criterio de done del módulo:**
- [ ] Búsqueda "depto 2 rec Roma Norte $4-5M" → top 3 son proyectos con recámaras=2 en Roma Norte $4-5M.
- [ ] Comprador rechaza match → ajusta pesos futuros (feedback loop).

#### MÓDULO 10.A.12 — D03 Supply Pipeline

**Pasos:**
- `[10.A.12.1]` `n2/d03-supply-pipeline.ts`: cuenta proyectos en pipeline (construccion/preventa) por zona desde `projects` + SEDUVI permisos (H2). Score = densidad oferta futura vs demanda B01.

**Criterio de done del módulo:**
- [ ] Santa Fe con 50 proyectos pipeline → alerta oversupply.

#### MÓDULO 10.A.13 — H12 Zona Oportunidad

**Pasos:**
- `[10.A.13.1]` `n2/h12-zona-oportunidad.ts`: combina F09 value + N11 momentum + A04 arbitrage. Identifica zonas ranked "oportunidad alta" para inversión short/mid term.

**Criterio de done del módulo:**
- [ ] Narvarte top 5 ranking "oportunidad CDMX".

#### MÓDULO 10.A.14 — H16 Neighborhood Evolution

**Pasos:**
- `[10.A.14.1]` `n2/h16-neighborhood-evolution.ts`: narrativa 5y de la zona usando F10 + N03 + N04 + precios. Compose para FASE 12 AI narrative.

**Criterio de done del módulo:**
- [ ] Roma Norte → "gentrificada post-2017", Narvarte → "en apreciación activa".

### BLOQUE 10.B — Calculators Nivel 3 (12 scores)

#### MÓDULO 10.B.1 — A07 Timing Optimizer

**Pasos:**
- `[10.B.1.1]` `n3/a07-timing-optimizer.ts`: para comprador, sugiere "comprar ahora" vs "esperar 3/6/12 meses" basado en B05 Market Cycle, A01 Affordability trend, tasa hipotecaria forecast, N11 Momentum zona objetivo.
- `[10.B.1.2]` Output: `{ recommendation, confidence_pct, reasoning[] }`.

**Criterio de done del módulo:**
- [ ] En fase "contraccion" con tasas bajando → recomienda esperar 3-6 meses.

#### MÓDULO 10.B.2 — A08 Comparador Multi-Dimensional

**Pasos:**
- `[10.B.2.1]` `n3/a08-comparador.ts`: recibe `projectIds[2..6]`. Genera tabla comparativa en 8 dimensiones: Precio, LQI (F08), Risk (F12), Momentum (N11), Walkability (N08), Schools (H01), Community fit (A06), Ecosystem (F03).
- `[10.B.2.2]` Cada dimensión normalizada 0-100 + ranking por dimensión.
- `[10.B.2.3]` Ruta `/comparar?ids=x,y,z` (portal comprador y público) con UI card3D.

**Criterio de done del módulo:**
- [ ] 4 proyectos comparados → 8 dimensiones x 4 celdas + gráfica radar.

#### MÓDULO 10.B.3 — A09 Risk Score Comprador

**Pasos:**
- `[10.B.3.1]` `n3/a09-risk-score-comprador.ts`: evalúa riesgos específicos al comprador dado un proyecto: riesgo_construccion (avance_obra + trust H05), riesgo_legal (docs_verificados), riesgo_reventa (N11 + zona), riesgo_plusvalia (gentrificacion fase).

**Criterio de done del módulo:**
- [ ] Proyecto avance 30% + trust dev medio → risk score 55.

#### MÓDULO 10.B.4 — A10 Lifestyle Match (6 perfiles)

**Pasos:**
- `[10.B.4.1]` `n3/a10-lifestyle-match.ts`: para un `userId` con `buyer_persona` definido (uno de 6: quiet/nightlife/family/fitness/remote_worker/investor), calcula match score vs cada zona/proyecto.
- `[10.B.4.2]` Pesos por perfil:
  ```
  quiet:         N04=0.25, F01=0.20, ruido_denue=0.15, N08=0.10, H07=0.15, N09_inv=0.15
  nightlife:     N09=0.35, N08=0.20, F02=0.15, F03=0.10, gasto_gastronomico=0.20
  family:        H01=0.30, F01=0.20, parques=0.15, H02=0.15, F02=0.10, N04=0.10
  fitness:       gyms_1km=0.25, parques=0.25, N08=0.20, ciclovias=0.15, F04=0.15
  remote_worker: coworks=0.25, cafes=0.20, N08=0.15, F02=0.10, H02=0.10, N09=0.10, H07=0.10
  investor:      N11=0.30, F09=0.25, A04=0.20, A12=0.15, B08=0.10
  ```
- `[10.B.4.3]` UI en portal comprador FASE 20 (selector perfiles + homepage reordenada).

**Criterio de done del módulo:**
- [ ] Perfil family → Del Valle top3; perfil nightlife → Condesa/Roma top3.

#### MÓDULO 10.B.5 — A11 Patrimonio 20y

**Pasos:**
- `[10.B.5.1]` `n3/a11-patrimonio-20y.ts`: proyecta valor inmueble + capital equity 20 años con 4 escenarios A02 extendidos.

**Criterio de done del módulo:**
- [ ] Depto $3M → patrimonio base 20y ≈$6.2M.

#### MÓDULO 10.B.6 — B06 Project Genesis

**Pasos:**
- `[10.B.6.1]` `n3/b06-project-genesis.ts`: para dev evaluando un nuevo proyecto en zona. Consolidate F09 + F10 + B01 + B04 + D03 + H12. Score "viabilidad lanzamiento" 0-100.

**Criterio de done del módulo:**
- [ ] Zona saturada + demanda baja → genesis <40.

#### MÓDULO 10.B.7 — B11 Channel Performance

**Pasos:**
- `[10.B.7.1]` `n3/b11-channel-performance.ts`: por canal (Inmuebles24, ML, Facebook, referencias, DMX directo) mide conversión leads→visits→operations y ROI por canal.

**Criterio de done del módulo:**
- [ ] Facebook ads con 1000 leads/5 ops → ROI calculado.

#### MÓDULO 10.B.8 — C04 Objection Killer AI

**Pasos:**
- `[10.B.8.1]` `n3/c04-objection-killer-ai.ts`: dado `feedback_text` del contacto (objeción), usa LLM Claude Sonnet 4 + prompt versionado en `ai_prompt_versions` para sugerir respuesta al asesor + evidencias IE (scores zona/proyecto/AVM).
- `[10.B.8.2]` Cache respuesta en `ai_generated_content` por `(contact_hash + objection_hash)` 7 días.
- `[10.B.8.3]` Citations obligatorias (responder siempre con números y fuente).

**Criterio de done del módulo:**
- [ ] Objeción "el precio está alto" → respuesta con F09+A12+comparables zona.

#### MÓDULO 10.B.9 — C06 Commission Forecast

**Pasos:**
- `[10.B.9.1]` `n3/c06-commission-forecast.ts`: para un asesor, proyección comisiones 3m/6m/12m usando pipeline busquedas × C01 lead scores × B08 absorption de proyectos.

**Criterio de done del módulo:**
- [ ] Asesor con 20 leads hot + pipeline valorado $15M → forecast $600K comisiones 6m.

#### MÓDULO 10.B.10 — D04 Cross Correlation

**Pasos:**
- `[10.B.10.1]` `n3/d04-cross-correlation.ts`: calcula correlaciones entre scores (ej. F01 vs precio_m2, N08 vs ventas). Matriz 15×15 publicada a admin FASE 19.

**Criterio de done del módulo:**
- [ ] Correlación F01 vs precio_m2 CDMX detectada ≥0.4.

#### MÓDULO 10.B.11 — H13 Site Selection AI

**Pasos:**
- `[10.B.11.1]` `n3/h13-site-selection.ts`: input `{ polygon: GeoJSON, criteria: { objetivo: 'residencial'|'comercial'|'industrial', presupuesto_terreno_max, tamaño_m2_min, amenidades_requeridas[] } }`. Output `ranked_sites[]` con score compuesto F09+F10+B01+D03+Uso_Suelo+N11.
- `[10.B.11.2]` tRPC procedure `intelligence.siteSelection` + página en Portal Dev `/site-selection` (FASE 15).
- `[10.B.11.3]` Producto B2B (ver FASE 23 `/api/v1/site-selection`).

**Criterio de done del módulo:**
- [ ] Polígono CDMX-Poniente → devuelve 10 sites ranked con justificación.

#### MÓDULO 10.B.12 — H15 Due Diligence

**Pasos:**
- `[10.B.12.1]` `n3/h15-due-diligence.ts`: check list automática de 20 puntos legales/técnicos/financieros (Uso Suelo, Catastro, avance_obra, permisos, deudas, amparos, riesgos Atlas). Score 0-100.

**Criterio de done del módulo:**
- [ ] Proyecto con 18/20 verdes → score 90.

### BLOQUE 10.C — UI: Comparador + Site Selection

#### MÓDULO 10.C.1 — Ruta `/comparar`

**Pasos:**
- `[10.C.1.1]` Crear `app/(public)/comparar/page.tsx` + server component que recibe query `ids=x,y,z` (2-6 ids).
- `[10.C.1.2]` Layout: grid 6 columnas × 9 filas (8 dimensiones + foto). Card3D por proyecto. Radar chart Recharts al final.
- `[10.C.1.3]` Sticky header con botón "Comparar otros" (drawer con search).
- `[10.C.1.4]` Comparables URL persistente compartible.

**Criterio de done del módulo:**
- [ ] `/comparar?ids=a,b,c` renderiza 3 columnas.
- [ ] Radar chart funcional.

#### MÓDULO 10.C.2 — Site Selection Tool UI (dev-only)

**Pasos:**
- `[10.C.2.1]` `app/(developer)/site-selection/page.tsx` con Mapbox drawing mode (poligono) + panel criterios + lista `ranked_sites`.
- `[10.C.2.2]` Export PDF de top 10 sites con fotos + scores + assumptions.

**Criterio de done del módulo:**
- [ ] Usuario dibuja polígono → 10 sites aparecen en <3s.

### BLOQUE 10.D — Tests + feedback cascades

#### MÓDULO 10.D.1 — Tests N2/N3

**Pasos:**
- `[10.D.1.1]` 26 snapshot tests (14 N2 + 12 N3) con fixtures realistas.
- `[10.D.1.2]` E2E Playwright: asesor abre contacto → ve C01 lead score + C04 Objection Killer sugerido.

**Criterio de done del módulo:**
- [ ] 26/26 tests green.

#### MÓDULO 10.D.2 — Feedback cascade

**Pasos:**
- `[10.D.2.1]` Cuando `interaction_feedback` INSERT (trigger existente) → cascade `feedback_registered` dispara recalc B04 (PMF), B03 (Pricing, si negative feedback precio), C04 (refresh Objection Killer).
- `[10.D.2.2]` AI learning loop: feedback con match rechazado → guardar en `ai_coaching_log` con razón + tokens para futuro fine-tuning.

**Criterio de done del módulo:**
- [ ] Feedback "precio_muy_alto" encola B03 recalc.

## Criterio de done de la FASE

- [ ] 26 scores N2 + N3 implementados con tests snapshot.
- [ ] C03 Matching Engine operando con feedback loop.
- [ ] B03 Pricing Autopilot sugiriendo por unidad con rationale.
- [ ] A10 Lifestyle Match 6 perfiles con pesos definidos.
- [ ] A08 Comparador 8 dimensiones UI en `/comparar`.
- [ ] H13 Site Selection Tool operando con polígono input.
- [ ] C04 Objection Killer AI con citations obligatorias + cache.
- [ ] UI Card N2/N3 en Storybook.
- [ ] Cascades N1→N2, N2→N3 wireadas en queue.
- [ ] Tag git: `fase-10-complete`.
- [ ] Documentación: `docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md` actualizado con 26 scores "implementado".

## Próxima fase

[FASE 11 — Índices DMX (7 índices propietarios)](./FASE_11_IE_INDICES_DMX.md)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent D) | **Fecha:** 2026-04-17
