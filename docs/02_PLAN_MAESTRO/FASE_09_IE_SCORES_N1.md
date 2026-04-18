# FASE 09 — Intelligence Engine: Scores Nivel 1

> **Duración estimada:** 4 sesiones Claude Code (~16 horas con agentes paralelos)
> **Dependencias:** FASE 08 (registry, framework, queue, calculators N0)
> **Bloqueantes externos:**
> - Todos los N0 de FASE 08 operando (alimentan los 16 N1).
> - Al menos 10 proyectos seed en `projects` para que Tier 2 scores se activen en pruebas.
> - `market_prices_secondary` con ≥100 filas seed (A12 Price Fairness, A04 Arbitrage).
> **Resultado esperado:** Los 16 scores Nivel 1 implementados como calculators puros, consumiendo N0 como entrada, con persistencia, cascade y UI cards. B02 Margin Pressure escrito CORRECTAMENTE desde cero (fórmula `precio_m2 = precio_total / m2_totales`, NO el bug del repo viejo). A05 TCO 10y y A02 Investment Simulation con 4 escenarios. B08 Absorption Forecast con 3 escenarios × 12 meses. Tag `fase-09-complete`.
> **Priority:** [H1]

## Contexto y objetivo

Los scores N1 son los primeros que componen información: consumen scores N0 (que dependen solo de fuentes externas) y producen insights más ricos. Ejemplos: F08 Life Quality Index combina F01+F02+F03+N08+H01+H02; B02 Margin Pressure cruza INPP Construcción (macro_series) con precio/m2 del proyecto; B08 Absorption Forecast proyecta ventas 12 meses con 3 escenarios.

Esta fase también documenta formalmente la fórmula CORRECTA de B02 (repo viejo tenía un bug donde usaba `precio_total / superficie_m2` — el rewrite usa `precio/m2_totales` desde el archivo 1). Se incluyen tests de regresión que comparan ambas fórmulas para garantizar que no se reintroduce el bug.

## Bloques

### BLOQUE 9.A — Calculators Zona + Hogar N1

Scores N1 de zona (F08, F12, H07, H05, H14) y algunos cross-comprador (A06, A12). Dependen solo de N0 del registry.

#### MÓDULO 9.A.1 — F08 Life Quality Index (LQI)

**Pasos:**
- `[9.A.1.1]` Crear `shared/lib/intelligence-engine/calculators/n1/f08-lqi.ts`. Fórmula: `LQI = 0.20×F01_safety + 0.15×F02_transit + 0.15×F03_ecosystem + 0.10×H01_school + 0.10×H02_health + 0.10×N08_walkability + 0.10×N01_diversity + 0.05×N04_crime_trajectory + 0.05×H07_environment`.
- `[9.A.1.2]` Fetch dependencias desde `zone_scores` WHERE `zone_id=?` AND `score_type IN (...)` AND `period_date=current_period`. Si falta alguna → fallback `score=NULL` de ese componente y reducir pesos proporcionalmente.
- `[9.A.1.3]` Components detallados: `{ subscores: { F01: n, F02: n, ... }, pesos_aplicados: {...}, datos_faltantes: [...] }`.
- `[9.A.1.4]` Confidence cascade: usa `composeConfidence([conf(F01), conf(F02), ...])` — el peor manda.
- `[9.A.1.5]` Test: con 9 subscores (F01=85, F02=80, ...) calcula LQI y verifica pesos.

**Criterio de done del módulo:**
- [ ] Del Valle LQI ≥80; Iztapalapa Sur LQI <45.
- [ ] Faltan 2 subscores → pesos recalculados y `confidence='medium'`.

#### MÓDULO 9.A.2 — F12 Risk Map (zona)

**Pasos:**
- `[9.A.2.1]` `n1/f12-risk-map.ts`: consolida H03_seismic + N07_water_security + F01_safety (invertido) + F06_land_use + N05_resilience. Output `score_value` INVERSO (100 = sin riesgo).
- `[9.A.2.2]` Components: `riesgos_principales: [{ tipo: 'sismico'|'hidrico'|'social'|'uso_suelo'|'infraestructura', severity: 0-100 }]`.
- `[9.A.2.3]` Integra con producto DMX Risk Score (FASE 23 endpoint /api/v1/scores/risk).

**Criterio de done del módulo:**
- [ ] Tlalpan laderas F12 <40.

#### MÓDULO 9.A.3 — H07 Environmental

**Pasos:**
- `[9.A.3.1]` `n1/h07-environmental.ts`: compone F04_air + SEDEMA parques (H2 stub) + PAOT denuncias (H2). En H1 solo air quality + parques básicos de OSM.

**Criterio de done del módulo:**
- [ ] Chapultepec → score ≥75.

#### MÓDULO 9.A.4 — H05 Trust Score (tier 2)

**Pasos:**
- `[9.A.4.1]` `n1/h05-trust-score.ts`: calcula trust de desarrolladora basado en histórico operaciones cerradas + proyectos entregados a tiempo + PROFECO quejas (H2) + documentación completa (H14 Buyer Persona data).
- `[9.A.4.2]` Tier 2 — requiere ≥10 proyectos y ≥1 entrega en histórico de la desarrolladora. Antes muestra placeholder.

**Criterio de done del módulo:**
- [ ] Dev con 15 proyectos, 100% on-time → score ≥90.

#### MÓDULO 9.A.5 — H14 Buyer Persona (zona/proyecto)

**Pasos:**
- `[9.A.5.1]` `n1/h14-buyer-persona.ts`: clusteriza compradores potenciales (wishlist + search_logs + busquedas) por zona/proyecto. Output 6 perfiles: family/inversor/primera_compra/downsizer/second_home/digital_nomad + % de match.

**Criterio de done del módulo:**
- [ ] Zona Polanco → 40% inversor + 30% downsizer + 15% second_home.

### BLOQUE 9.B — Calculators Comprador N1

A02, A05, A06, A12 — scores que orientan al comprador con cálculos financieros transparentes.

#### MÓDULO 9.B.1 — A02 Investment Simulation 4 escenarios

**Pasos:**
- `[9.B.1.1]` `n1/a02-investment-simulation.ts` recibe `{ propertyValue, downPayment, loanYears, loanRateHint? }`. Usa `macro_series` tasa_hipotecaria_avg + Infonavit tables + projection de precios zona vía N11 Momentum.
- `[9.B.1.2]` 4 escenarios: `conservador` (zona momentum p25, tasa +100bps), `base` (zona momentum p50, tasa mkt), `optimista` (zona momentum p75, tasa −50bps), `stress` (zona momentum p10, tasa +300bps).
- `[9.B.1.3]` Para cada escenario devolver: ROI anual %, cashflow mensual (renta − mensualidad hipotecaria), valor apreciado 10y, IRR 10y, payback años.
- `[9.B.1.4]` Assumptions documentadas inline en `components.assumptions`: IVA 16% plusvalía NO aplicable en primera venta, ISR 25% sobre utilidad si aplica, comisión venta 5%.

**Criterio de done del módulo:**
- [ ] Depto $3M, DP 20%, 20y → stress IRR <0%, optimista IRR ≥8%.

#### MÓDULO 9.B.2 — A05 TCO 10y (Total Cost of Ownership)

**Pasos:**
- `[9.B.2.1]` `n1/a05-tco.ts`: `TCO_10y = precio_compra + (mensualidad × 120) + (predial × 10) + (mantenimiento_mensual × 120) + (seguros × 10) + comisiones_venta + (plusvalía esperada × -1)`.
- `[9.B.2.2]` Assumptions: IVA 16% NO aplica compra (transmisión inmuebles usados exenta salvo notario), predial CDMX tabla 2026, mantenimiento 1.2% valor/año (amenidades), seguros: hogar 0.3%/año + vida hipotecaria 0.15%/año, venta 5% + ISR 25% utilidad.
- `[9.B.2.3]` Components con breakdown por año + gráfica stacked Recharts.

**Criterio de done del módulo:**
- [ ] Depto $3M con hipoteca 20% → TCO 10y ≈ $5.1M − plusvalía.

#### MÓDULO 9.B.3 — A06 Neighborhood

**Pasos:**
- `[9.B.3.1]` `n1/a06-neighborhood.ts`: blend F08 LQI + H01 schools + H02 health + N08 walkability + N10 senior adaptado al `buyer_persona` del user (si user_scores.buyer_persona existe, reordena pesos).

**Criterio de done del módulo:**
- [ ] Perfil family → H01 peso 0.3; perfil digital_nomad → H01 peso 0.05 y N08 peso 0.3.

#### MÓDULO 9.B.4 — A12 Price Fairness

**Pasos:**
- `[9.B.4.1]` `n1/a12-price-fairness.ts`: para una propiedad específica, score = 100 − `|precio_ofertado − precio_justo| / precio_justo × 100`. Donde `precio_justo = AVM_I01_estimate` (usa endpoint interno de FASE 08).
- `[9.B.4.2]` Components: `{ precio_ofertado, precio_justo_avm, gap_pct, percentil_zona, comparables: [...] }`.
- `[9.B.4.3]` Tier 2 (≥10 propiedades en zona para comparables).

**Criterio de done del módulo:**
- [ ] Propiedad +25% sobre AVM → score ≈25 (muy alto).

### BLOQUE 9.C — Calculators Desarrollador/Mercado N1

B01, B02 (crítico: fórmula correcta), B04, B07, B08 (con 3 escenarios), D05, D06.

#### MÓDULO 9.C.1 — B01 Demand Heatmap

**Pasos:**
- `[9.C.1.1]` `n1/b01-demand-heatmap.ts`: cruza `wishlist` + `search_logs` + `project_views` últimos 30 días por zona. Score = demanda relativa normalizada percentil.
- `[9.C.1.2]` Components incluyen `searches_count`, `wishlist_count`, `views_count`, `intention_score` (wishlist pesa ×5 vs view ×1).

**Criterio de done del módulo:**
- [ ] Del Valle con 200 wishlist + 1K views → score ≥85 y marcada "alta demanda".

#### MÓDULO 9.C.2 — B02 Margin Pressure (FÓRMULA CORRECTA — NO repetir bug)

**Pasos:**
- `[9.C.2.1]` **Documentar la fórmula correcta** como comentario inicial del archivo:
  ```ts
  /**
   * B02 Margin Pressure
   *
   * FÓRMULA CORRECTA (desde rewrite v1, NO repetir bug del repo viejo):
   *
   *   precio_m2_real = precio_unidad_total / m2_totales_unidad
   *   // m2_totales_unidad = construccion + terreno + roof_garden + balcon (todos los m2 vendibles)
   *
   *   costo_m2_real = costo_construccion_m2 (viene de INPP Construcción ajustado por tipo)
   *
   *   margen_m2 = precio_m2_real - costo_m2_real
   *   margen_pct = margen_m2 / precio_m2_real
   *
   *   pressure_score = 100 - normalizePercentile(margen_pct vs zona)
   *
   * BUG HISTÓRICO (repo viejo, register-all.ts:82):
   *   - Usaba precio_total / superficie_m2 (solo construcción) → inflaba precio_m2 artificialmente
   *   - Resultado: todos los proyectos parecían tener margen sano falso
   *   - Test de regresión abajo garantiza no retroceso.
   */
  ```
- `[9.C.2.2]` Crear `n1/b02-margin-pressure.ts` implementando fórmula correcta. Input: `projectId`. Query: `projects + unidades + prototipos` para obtener precio_total por unidad + m2_totales (construccion + terreno + extras). `macro_series` para INPP Construcción actual y hace 12m.
- `[9.C.2.3]` Output: `{ score_value, components: { margen_pct, margen_m2, precio_m2_real, costo_m2_inpp, presion_inpp_12m } }`.
- `[9.C.2.4]` **Test de regresión** `__tests__/b02-regression.test.ts`:
  - Fixture proyecto con precio_total=$5M, construccion_m2=100, terreno_m2=50, roof_garden_m2=20 → m2_totales=170 → precio_m2_real=$29,411.
  - Bug viejo hubiera calculado $50,000/m2 (usando solo construccion_m2).
  - Test asserts: `calcB02(fixture).components.precio_m2_real === 29411` ±10.
  - Test negativo: simula la fórmula buggy y verifica que difiere.
- `[9.C.2.5]` Tier 2 (requiere INPP Construcción data 12m).

**Criterio de done del módulo:**
- [ ] Test regresión pasa verde; bug imposible de reintroducir silenciosamente.
- [ ] Correr B02 sobre 10 proyectos seed muestra distribución coherente margen_pct 8-25%.

#### MÓDULO 9.C.3 — B04 Product-Market Fit

**Pasos:**
- `[9.C.3.1]` `n1/b04-pmf.ts`: gap analysis entre `busquedas` filtros (recámaras/precio/ubicación) y unidades disponibles del proyecto. Score = match% × intensity.
- `[9.C.3.2]` Components: `unidades_match_pct`, `demanda_no_satisfecha: [...]`, `oportunidades_ajuste_producto: [...]`.

**Criterio de done del módulo:**
- [ ] Proyecto con 3 rec precio $4M y demanda busca 2 rec $3M → score bajo + sugerencia.

#### MÓDULO 9.C.4 — B07 Competitive Intel

**Pasos:**
- `[9.C.4.1]` `n1/b07-competitive-intel.ts`: tabla comparativa mi proyecto vs top 5 competidores zona (`project_competitors`). 8 dimensiones: precio/m2, amenidades_count, tamaño_promedio, absorcion_12m, marketing_spend_proxy, days_on_market, quality_score, N11 momentum zona.
- `[9.C.4.2]` Tier 2.

**Criterio de done del módulo:**
- [ ] Retorna 5 competidores ordenados por similitud.

#### MÓDULO 9.C.5 — B08 Absorption Forecast (3 escenarios × 12 meses)

**Pasos:**
- `[9.C.5.1]` `n1/b08-absorption-forecast.ts`: recibe `projectId`. Base: ventas últimos 6 meses → regresión simple + estacionalidad (trimestre). Ajustes: N11 Momentum zona, B01 demand heatmap, B04 PMF, macro TIIE28.
- `[9.C.5.2]` 3 escenarios optimista/base/pesimista (±15% ajuste sobre base). Output `components.monthly_projection: [{ month, optimista, base, pesimista }] × 12`.
- `[9.C.5.3]` Absorción "fecha fin estimada" cuando queda 1 unidad.
- `[9.C.5.4]` Tier 3 (≥50 proyectos en zona 6m data).

**Criterio de done del módulo:**
- [ ] Proyecto con 20 ventas/mes + momentum alto → fin estimado <6 meses.

#### MÓDULO 9.C.6 — D05 Gentrification (mercado)

**Pasos:**
- `[9.C.6.1]` `n1/d05-gentrification.ts`: combina N03 Gentrification Velocity + A04 Arbitrage + precio_m2_zona 12m Δ. Output señales macro por colonia.

**Criterio de done del módulo:**
- [ ] Escandón → señal "gentrificación fase media" con confianza high.

#### MÓDULO 9.C.7 — D06 Affordability Crisis

**Pasos:**
- `[9.C.7.1]` `n1/d06-affordability-crisis.ts`: A01 + BBVA sobrecosto_vivienda + salario mediano zona. Flags zonas en crisis (salario local no alcanza para renta/compra).

**Criterio de done del módulo:**
- [ ] Iztapalapa salario mediano vs renta P50 → crisis.

### BLOQUE 9.D — UI Intelligence Cards N1

Pantallas-cartas que muestran cada score con su desglose.

#### MÓDULO 9.D.1 — Componente base `IntelligenceCard`

**Pasos:**
- `[9.D.1.1]` Crear `shared/ui/dopamine/IntelligenceCard.tsx` con props:
  ```tsx
  interface IntelligenceCardProps {
    scoreId: string;
    value: number;
    label: string;
    trend?: { direction: 'up'|'down'|'flat'; delta: number };
    confidence: Confidence;
    components?: React.ReactNode;
    citations?: Citation[];
    onExplore?: () => void;          // abre drawer detalle
  }
  ```
- `[9.D.1.2]` Card3D (perspective 800, rotateX/Y ±12°) con tint color según categoría (zona bgLavender, proyecto bgMint, comprador bgPeach, dev bgSlate).
- `[9.D.1.3]` Badge confidence (reusa FASE 08 `ConfidenceBadge`).
- `[9.D.1.4]` CTA "Ver detalles" abre `IntelligenceDrawer` con fórmula + inputs_used + citations + FAQ.
- `[9.D.1.5]` Stories Storybook para 16 scores N1 con fixtures realistas.

**Criterio de done del módulo:**
- [ ] Card3D animación al hover.
- [ ] Accesibilidad: keyboard focus, aria-label con score_id.

#### MÓDULO 9.D.2 — Hooks tRPC consumo

**Pasos:**
- `[9.D.2.1]` Extender router `intelligence` con:
  - `getZoneScores.input({ zoneId, scoreTypes?, countryCode, levels? })` → array `ZoneScore[]`.
  - `getProjectScores.input({ projectId, scoreTypes?, levels? })` → array.
  - `getUserScores.input({ userId, scoreTypes? })` → array.
- `[9.D.2.2]` Cada procedure incluye cascade N0→N1 automático: si no hay score N1 pero hay dependencias N0 → encola recalc y responde con el score N0 más reciente marcado `stale: true`.
- `[9.D.2.3]` Hook `useZoneScores(zoneId)` en `features/intelligence-engine/hooks/` con refetch cada 60s si `stale=true`.

**Criterio de done del módulo:**
- [ ] Llamar `getZoneScores` sin F08 y con F01/F02/etc → devuelve N0 + encola recalc F08.

#### MÓDULO 9.D.3 — Validación tier en UI

**Pasos:**
- `[9.D.3.1]` Cuando backend responde `gated=true` → UI renderiza `ScorePlaceholder` con requirement claro.
- `[9.D.3.2]` Admin con `is_superadmin` ve bypass + warning.

**Criterio de done del módulo:**
- [ ] Comprador en zona con 3 proyectos ve solo 9/16 N1; resto placeholders.

### BLOQUE 9.E — Integration tests + regresión

#### MÓDULO 9.E.1 — E2E tests IE

**Pasos:**
- `[9.E.1.1]` Playwright `tests/e2e/ie-n1.spec.ts`: flujo asesor abre ficha proyecto → ve B02/B04/B07/B08 cards → click detalle abre drawer → muestra fórmula + citations.
- `[9.E.1.2]` Medición latencia: card carga en <800ms p95 (suma tRPC + SSR).

**Criterio de done del módulo:**
- [ ] Test green 3 runs consecutivos.

#### MÓDULO 9.E.2 — Snapshot coverage y regression harness

**Pasos:**
- `[9.E.2.1]` Para cada N1, fixture + expected JSON en `shared/lib/intelligence-engine/__fixtures__/n1/*.json`. `npm run test:snapshot` corre calcs y diff contra expected con tolerancia ±1%.
- `[9.E.2.2]` Git hook pre-push: corre snapshot tests; si difieren, bloquear push (fuerza revisión de cambio fórmula).

**Criterio de done del módulo:**
- [ ] 16/16 N1 con snapshot.

## Criterio de done de la FASE

- [ ] 16 scores N1 implementados, testeados y cascadeando desde N0.
- [ ] B02 Margin Pressure correcto + test regresión bug-proof.
- [ ] A02 (4 escenarios) y A05 (TCO 10y) con assumptions documentadas inline.
- [ ] B08 Absorption Forecast 3 escenarios × 12 meses funcionando.
- [ ] Tier gating bloqueando scores Tier 2 en entornos sin suficiente data.
- [ ] UI `IntelligenceCard` renderizando 16 N1 con Storybook + e2e.
- [ ] Queue + cascades disparan recalc N1 cuando cambian N0 dependencias.
- [ ] Tag git: `fase-09-complete`.
- [ ] Documentación: `docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md` actualizado con 16 N1 "implementado".

## Próxima fase

[FASE 10 — IE Scores Nivel 2 y 3](./FASE_10_IE_SCORES_N2_N3.md)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent D) | **Fecha:** 2026-04-17
