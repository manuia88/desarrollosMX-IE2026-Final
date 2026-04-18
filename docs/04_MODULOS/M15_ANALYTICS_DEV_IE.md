# M15 — Analytics Desarrollador IE (7 Tabs)

> **Portal:** Desarrollador
> **Ruta principal:** `/desarrolladores/analytics`
> **Fase donde se construye:** [FASE 15 — Portal Desarrollador](../02_PLAN_MAESTRO/FASE_15_PORTAL_DESARROLLADOR.md)
> **Priority:** [H1] (producto core B2B — diferenciador competitivo)

---

## Descripción funcional

**Producto estrella B2B del portal desarrollador.** 7 tabs Analytics IE — cada uno consume scores de Intelligence Engine (IE). Diferenciador competitivo vs CoStar, Local Logic, Wiggot, Cherre. El desarrollador paga por acceso (Plan Pro $2,999/mes o Enterprise custom). Tabs:

1. **Demanda** — B01 Demand Heatmap + búsquedas activas que matchean inventario.
2. **Pricing** — B03 Pricing Autopilot (por unidad: sugerencias vs competencia + días en mercado).
3. **Absorción** — B08 Absorption Forecast (3 escenarios optimista / base / pesimista).
4. **Competencia** — B07 Competitive Intel (mi proyecto vs top 5 competidores, 8 dimensiones).
5. **Product Market Fit** — B04 PMF (gap analysis + demand count).
6. **Costos** — B12 Cost Tracker (INPP trend, alertLevel critical / warning / normal).
7. **Predicciones** — B05 Market Cycle fase + B15 Launch Timing + B09 Cash Flow 12m.

## Flujos principales

### Flujo 1 — Tab Demanda (B01)
1. Heatmap CDMX con intensidad demanda por zona (búsquedas activas + wishlist + search_logs).
2. Filtros: tipo propiedad, rango precio, amenidades.
3. Panel lateral: top 10 zonas demanda vs top 10 zonas inventario (gap identifica oportunidad).
4. Drill-down por zona: cantidad búsquedas, precio mediano demandado, % que matchea inventario del dev.

### Flujo 2 — Tab Pricing (B03 Autopilot)
1. Tabla unidades del dev con columnas: precio actual, precio sugerido, gap ±%, competencia directa (top 3 proyectos con precios similares), días en mercado, probabilidad cierre próximos 30d.
2. Botón "Aplicar sugerencia" → updates `precios_unidad` + log cambio.
3. Toggle "Autopilot ON" → cron aplica sugerencias automáticamente si gap <5% (opt-in).

### Flujo 3 — Tab Absorción (B08)
1. Por proyecto: line chart con 3 escenarios de venta (Optimista, Base, Pesimista) vs real.
2. Forecast 12 meses.
3. Factores que influyen: precio, lanzamientos competencia, macro economía (tasas BANXICO), estacionalidad.

### Flujo 4 — Tab Competencia (B07)
1. Tabla mi proyecto vs top 5 competidores con 8 dimensiones:
   - Precio mediano /m²
   - Amenidades
   - Absorción mensual
   - Tiempo promedio venta
   - Distancia metro
   - DMX Score
   - Reviews Google
   - Trust Score developer
2. Color coded (yo mejor / empate / peor).

### Flujo 5 — Tab PMF (B04)
1. Per proyecto: gap analysis.
2. Segmentos demanda vs lo que ofrezco.
3. Ejemplo: "60% demanda pide 2 recámaras, 85% de tu inventario son 3 recámaras — mismatch 25%".
4. Recomendaciones: re-configurar prototipos, ajustar pricing, segment marketing.

### Flujo 6 — Tab Costos (B12)
1. INPP trend 12 meses (varilla, cemento, mano de obra, acabados).
2. Tu costo vs promedio mercado.
3. AlertLevel: `critical` (si INPP +10% mes), `warning` (+5%), `normal`.
4. Recomendaciones: hedging, cambio proveedores.

### Flujo 7 — Tab Predicciones
1. Sub-panel **B05 Market Cycle**: fase actual (boom / recovery / slowdown / trough) + timing estimado next phase.
2. Sub-panel **B15 Launch Timing**: ventana óptima próximos 12 meses para lanzar (considera macro + competencia).
3. Sub-panel **B09 Cash Flow 12m**: forecast cash flow del proyecto con escenarios.

## Wireframe textual

```
┌──────────────────────────────────────────────────────────────┐
│ Analytics IE    [Demanda|Pricing|Absorción|Comp|PMF|Costos|Preds]│
├────┬─────────────────────────────────────────────────────────┤
│ SB │ TAB: Demanda (B01)                                       │
│    │ ┌─Mapbox Heatmap CDMX────────────────┐                   │
│    │ │ 🔴 Del Valle (alta demanda)         │                   │
│    │ │ 🟡 Roma Norte                       │                   │
│    │ │ 🟢 Condesa                          │                   │
│    │ └────────────────────────────────────┘                   │
│    │ Top 10 zonas demanda │ Top 10 inventario tuyo            │
│    │ 1. Del Valle 420 ser │ 1. Polanco 45 unids               │
│    │ 2. Roma 380 sear     │ 2. Del Valle 30 unids              │
│    │ Gap: Roma no tienes inventario — oportunidad            │
└────┴─────────────────────────────────────────────────────────┘
```

## Componentes UI requeridos

- `<AnalyticsTabs />` — 7 tabs navigation.
- `<TabDemanda />` — Mapbox + lists.
- `<TabPricing />` — table + sugerencias.
- `<PricingAutopilotToggle />`.
- `<TabAbsorcion />` — 3 scenarios chart.
- `<TabCompetencia />` — 8D comparison table.
- `<TabPMF />` — gap analysis + recommendations.
- `<TabCostos />` — INPP trend + alerts.
- `<TabPredicciones />` — 3 sub-panels.
- `<ScoreCard />` — render score IE with citations + confidence badge.

## Procedures tRPC consumidas

- `scores.getDemandHeatmap` (B01).
- `scores.getPricingAutopilot` (B03) — per unidad.
- `scores.updatePricing` — apply sugestion.
- `scores.getAbsorptionForecast` (B08).
- `scores.getCompetitiveIntel` (B07).
- `scores.getPMFAnalysis` (B04).
- `scores.getCostTracker` (B12).
- `scores.getMarketCycle` (B05).
- `scores.getLaunchTiming` (B15).
- `scores.getCashFlowForecast` (B09).

## Tablas BD tocadas

- `zone_scores` — B01 heatmap.
- `market_prices` — B03 pricing references.
- `market_prices_secondary` — competencia.
- `absorption_models` — B08.
- `competitive_intel_cache` — B07.
- `pmf_analyses` — B04.
- `cost_tracker` — B12.
- `market_cycle_snapshots` — B05.
- `launch_timing_analyses` — B15.
- `cash_flow_forecasts` — B09.
- `proyectos`, `unidades` — dev inventory context.

## Estados UI

- **Loading**: skeleton per tab.
- **Error**: banner "Score en cálculo" + retry.
- **Empty**: "No tienes suficientes datos — sube inventario primero".
- **Stale**: "Última actualización hace 3 días — recalculando" (cron ejecuta semanal).
- **Success**: datos con confidence badge.

## Validaciones Zod

```typescript
const getDemandHeatmapInput = z.object({
  countryCode: z.string().length(2),
  bbox: z.array(z.number()).length(4).optional(), // [minLng, minLat, maxLng, maxLat]
  filters: z.object({
    propertyType: z.enum(['departamento', 'casa', 'terreno', 'oficina', 'local']).optional(),
    priceRange: z.tuple([z.number(), z.number()]).optional(),
    amenities: z.array(z.string()).optional(),
  }).optional(),
});
```

## Integraciones externas

- **Mapbox GL** — heatmaps.
- **Anthropic Claude** — explicaciones generadas por tab (citations IE).
- **Recharts / Visx** — charts.
- **BANXICO API** — tasas para forecasts.
- **INEGI INPP** — cost tracker.

## Tests críticos

- [ ] Cada score retorna confidence level (high/medium/low).
- [ ] Citations en cada tab linkean a fuentes (ver /metodologia).
- [ ] Pricing autopilot aplica cambios con audit log.
- [ ] Forecast B08 3 escenarios muestra rangos reales (MAPE <15%).
- [ ] B07 competencia excluye mi propio proyecto de top 5.
- [ ] B04 gap analysis muestra recommendations actionable.
- [ ] B12 alertLevel dispara notif push al dev.
- [ ] RLS: dev solo ve analytics de sus proyectos.
- [ ] Feature gating: Free tier bloquea tabs avanzadas, Pro unlocks todo.
- [ ] i18n: `t('dev.analytics.*')`.

## i18n keys ejemplo

```tsx
<Tab>{t('dev.analytics.tabs.' + tab)}</Tab>
<Badge>{t('dev.analytics.confidence.' + level)}</Badge>
```

## Cross-references

- ADR-002 AI-Native (scores with citations)
- ADR-008 Monetization (tier gating)
- ADR-010 IE Pipeline (scores source)
- [03.8 Scores IE](../03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md) — B01, B03, B04, B05, B07, B08, B09, B12, B15
- [03.11 Productos B2B](../03_CATALOGOS/03.11_CATALOGO_PRODUCTOS_B2B.md) — uno de los 7 productos licenciables
- Módulos relacionados: M11 Inventario (source dev data), M17 Market Observatory (admin rollup)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent H) | **Fecha:** 2026-04-17
