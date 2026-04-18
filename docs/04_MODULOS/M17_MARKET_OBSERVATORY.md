# M17 — Market Observatory (7 Capas Mapbox)

> **Portal:** Admin (submódulo M16 expandido)
> **Ruta principal:** `/admin/observatory`
> **Fase donde se construye:** [FASE 19 — Portal Admin](../02_PLAN_MAESTRO/FASE_19_PORTAL_ADMIN.md)
> **Priority:** [H1]

---

## Descripción funcional

Market Observatory = visor espacial interno DMX con **7 capas Mapbox** superpuestas, cada una alimentada por ingestors del IE (50+ fuentes). Herramienta de análisis para staff DMX (research, partnerships, producto) y demos a inversionistas. **NO expuesta públicamente** (la versión pública `/explorar` es un subset simplificado). Permite cruzar en tiempo real múltiples datasets geoespaciales para detectar patrones, anomalías, oportunidades de expansión, zonas óptimas para nuevos developers.

## 7 Capas (bottom→top stacking)

1. **Catastro CDMX** — parcelas coloreadas por valor catastral (SIGED).
2. **DENUE** — heatmap densidad económica + tier ratios (SCIAN propietario).
3. **FGJ** — heatmap criminalidad por categoría (robo, narco, violencia).
4. **GTFS** — rutas Metro / Metrobús / Tren + estaciones.
5. **zone_scores composite** — DMX Score por zona (agregado N0-N5).
6. **Desarrollos** — pines por status (planning/construction/preventa/delivered).
7. **Demanda** — heatmap búsquedas + wishlist + search_logs.

## Flujos principales

### Flujo 1 — Toggle capas
1. Panel lateral izquierdo: checkbox por capa con opacity slider.
2. Default: Catastro + Desarrollos + Demanda activos.
3. Click checkbox → layer-add / layer-remove en Mapbox.

### Flujo 2 — Filtros contextual
1. Por capa, sub-filtros:
   - Catastro: rango valor, zona.
   - DENUE: SCIAN category (comercio, servicios, industria).
   - FGJ: tipo crimen, gravedad.
   - GTFS: líneas específicas.
   - zone_scores: score range (ej 7.0-10.0).
   - Desarrollos: status, developer, precio.
   - Demanda: tipo propiedad, rango precio, fecha.

### Flujo 3 — Drill-down
1. Click en punto / polígono → popup con detalle.
2. "Open in drawer" → drawer lateral con info completa + charts relacionados.
3. Link a proyecto/dev si aplica.

### Flujo 4 — Análisis cruzado
1. Tool "Crossfilter": selecciona polígono dibujado → muestra stats de TODAS las capas dentro.
2. Ej: "En Del Valle, 180 parcelas catastro avg $42M, 2,400 DENUE establecimientos, 12 incidentes FGJ/mes, 8 estaciones transit, zone_score 8.7, 15 desarrollos activos, 420 búsquedas/mes".

### Flujo 5 — Export
1. Botón "Export view" → PNG / GeoJSON / CSV.
2. Útil para presentations, reports, partnerships.

### Flujo 6 — Time travel
1. Slider temporal (últimos 24 meses).
2. Muestra cómo evolucionaron capas (ej: precios catastro subieron 15% en Roma, criminalidad bajó 20% en Del Valle).

## Wireframe textual

```
┌──────────────────────────────────────────────────────────────┐
│ Market Observatory                                            │
├────┬────────────────────────────┬─────────────────────────────┤
│ SB │ Layers Panel:              │ Mapbox fullscreen           │
│    │ ☑ Catastro                 │ (7 layers stacked)          │
│    │   opacity: [====]          │                              │
│    │ ☐ DENUE                    │         🔴🟡🟢🔵            │
│    │ ☑ FGJ                      │      (pines y heatmaps)     │
│    │   opacity: [==]            │                              │
│    │ ☐ GTFS                     │                              │
│    │ ☑ zone_scores              │                              │
│    │ ☑ Desarrollos              │                              │
│    │ ☑ Demanda                  │                              │
│    │ Tool: [Crossfilter poly]   │                              │
│    │ Time: [===●=====] 2024-10 │                              │
└────┴────────────────────────────┴─────────────────────────────┘
```

## Componentes UI requeridos

- `<ObservatoryMap />` (`features/observatory/components/ObservatoryMap.tsx`) — Mapbox container con 7 layers + controls.
- `<LayerControls />` — checkbox + opacity per layer.
- `<LayerFilters />` — sub-filters per layer.
- `<CrossfilterTool />` — draw polygon + aggregate.
- `<TimeTravelSlider />` — time series scrubber.
- `<DrillDownDrawer />` — detail on click.
- `<ExportDialog />` — PNG/GeoJSON/CSV.

## Procedures tRPC consumidas

- `observatory.getCatastroLayer` — input: `{ bbox, filters? }` / output: GeoJSON.
- `observatory.getDENUELayer`.
- `observatory.getFGJLayer`.
- `observatory.getGTFSLayer`.
- `observatory.getZoneScoresLayer`.
- `observatory.getProjectsLayer`.
- `observatory.getDemandLayer`.
- `observatory.crossfilter` — input: `{ polygon: GeoJSON }` / output: stats per layer.
- `observatory.timeTravel` — input: `{ snapshotDate }`.
- `observatory.exportView` — input: `{ layers, bbox, format }`.

## Tablas BD tocadas (source layers)

- `catastro_parcelas` — CDMX SIGED.
- `denue_establecimientos` — INEGI DENUE.
- `fgj_incidents` — FGJ CDMX.
- `gtfs_routes`, `gtfs_stops` — Metro/Metrobús/Tren.
- `zone_scores` — IE aggregated.
- `proyectos` — con geom.
- `busquedas`, `wishlist_items`, `search_logs` — demanda aggregation.
- `layer_snapshots_monthly` — time travel history.

## Estados UI

- **Loading**: mapbox tiles shimmer.
- **Error**: toast.
- **Empty layer**: gris "Sin datos en esta zona".
- **Success**: layers renderizadas.

## Validaciones Zod

```typescript
const bboxSchema = z.tuple([z.number(), z.number(), z.number(), z.number()]); // [minLng, minLat, maxLng, maxLat]

const getLayerInput = z.object({
  bbox: bboxSchema.optional(),
  zoom: z.number().min(0).max(22).optional(),
  filters: z.record(z.unknown()).optional(),
});

const crossfilterInput = z.object({
  polygon: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
  }),
  layersIncluded: z.array(z.string()).default(['all']),
});
```

## Integraciones externas

- **Mapbox GL JS** — rendering.
- **Mapbox Tiling Service (MTS)** — custom tilesets for performance (pre-built tiles de capas pesadas).
- **Turf.js** — crossfilter geo ops.
- **Supabase PostGIS** — queries espaciales ST_Intersects, ST_Within.
- **INEGI** — catastro + DENUE.
- **FGJ CDMX** — crime data.
- **GTFS feeds** — Metro + Metrobús + Tren Ligero.

## Tests críticos

- [ ] 7 layers toggle on/off sin crashes.
- [ ] Crossfilter polygon retorna stats correctos (fixtures).
- [ ] Time travel cambia datos según snapshot date.
- [ ] Export GeoJSON valid schema.
- [ ] Performance: layers grandes usan vector tiles (MTS), no JSON.
- [ ] RLS: observatory accesible solo admin role.
- [ ] Mobile: UI colapsa layers panel a bottom sheet.
- [ ] Accessibility: controls keyboard nav.
- [ ] i18n: `t('admin.observatory.*')`.

## i18n keys ejemplo

```tsx
<Checkbox>{t('admin.observatory.layer.' + layerKey)}</Checkbox>
<Button>{t('admin.observatory.crossfilter.apply')}</Button>
```

## Cross-references

- ADR-010 IE Pipeline (all layers alimentados por ingestors)
- [FASE 07 Ingesta](../02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md) — source ingestors
- [FASE 08-12 IE Scores](../02_PLAN_MAESTRO/FASE_08_IE_SCORES_N0.md)
- [03.9 Fuentes Datos](../03_CATALOGOS/03.9_CATALOGO_FUENTES_DATOS.md)
- Módulos relacionados: M16 Dashboard Admin (parent), M19 Marketplace `/explorar` (versión pública simplificada)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent H) | **Fecha:** 2026-04-17
