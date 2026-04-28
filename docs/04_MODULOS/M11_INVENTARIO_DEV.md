# M11 — Inventario Desarrollador

> **Portal:** Desarrollador
> **Ruta principal:** `/desarrolladores/inventario`
> **Fase donde se construye:** [FASE 15 — Portal Desarrollador](../02_PLAN_MAESTRO/FASE_15_PORTAL_DESARROLLADOR.md)
> **Priority:** [H1]

---

## Descripción funcional

Gestión completa del inventario del desarrollador: proyectos + prototipos + unidades + esquemas de pago + precios + fotos + avance de obra. Soporta upload masivo de documentos (PDFs de planos, permisos, factibilidades) que disparan pipeline de Document Intelligence (Fase 17). Realtime via `useRealtimeUnits` (Supabase Realtime) para cambios de disponibilidad instantáneos. Historial de precios visible por unidad (trazabilidad). Integración con zone_scores + alertas catastrales (predial, zonas protegidas, riesgos sísmicos/hídricos).

## Flujos principales

### Flujo 1 — Navegación jerárquica
1. `/desarrolladores/inventario` → tree: Projects (N) → Prototypes (N) → Units (N).
2. Click proyecto → detalle proyecto con tabs (Overview / Prototipos / Unidades / Precios / Esquemas pago / Fotos / Docs / Avance obra / IE).
3. Cada tab con CRUD completo.

### Flujo 2 — Crear proyecto
1. Botón "+ Nuevo proyecto" → wizard:
   - Paso 1: Datos básicos (nombre, dirección geocoded, descripción, status planning/construction/delivered).
   - Paso 2: Prototipos (templates unidades: Tipo A 80m² 2rec, Tipo B 100m² 3rec).
   - Paso 3: Unidades (generar N unidades por prototipo + pisos + números).
   - Paso 4: Esquemas pago (contado 5% desc, 24 MSI sin intereses, financiamiento bancario, pre-venta con entrega 18m).
   - Paso 5: Fotos y docs iniciales.
2. Submit → INSERT proyecto + prototipos + unidades + esquemas.

### Flujo 3 — Realtime unidades
1. Tab Unidades: grid con status (disponible / reservada / apartada / vendida).
2. Hook `useRealtimeUnits({ projectId })` suscrito a Supabase Realtime channel.
3. Cuando otro usuario marca una unidad como vendida → UI actualiza con pulse animation.
4. Asesores en M02 Desarrollos también reciben update.

### Flujo 4 — Historial precios
1. Click unidad → detalle.
2. Tab "Precios" muestra tabla `precios_unidad`: fecha, precio, cambio %, motivo.
3. Gráfica line chart últimos 12 meses.

### Flujo 5 — Upload masivo docs
1. Tab Docs → drop zone multi-file.
2. Upload → Supabase Storage.
3. INSERT `documents` + trigger `document_job` (Fase 17).
4. AI extrae datos (permisos, planos, factibilidades).
5. Review UI: tabla verde/amarillo/rojo con sugerencias.
6. Dev aprueba/rechaza datos extraídos.

### Flujo 6 — Avance de obra
1. Tab Avance obra: upload fotos mensuales + % progress por área (cimentación / estructura / albañilería / instalaciones / acabados).
2. Gantt chart vs forecast.
3. Si desviación >10% → alert + notif a compradores apartados.

### Flujo 7 — Alerts IE
1. Banner arriba si zona tiene:
   - Predial alto (N07).
   - Riesgo sísmico H03 > threshold.
   - Alerta hídrica N07.
   - Criminalidad F12 en tier alto.
2. Info contextual + recomendaciones mitigación.

## Wireframe textual

```
┌──────────────────────────────────────────────────────────────┐
│ Inventario         [+ Nuevo proyecto]                         │
├────┬─────────────────────────────────────────────────────────┤
│ SB │ Proyectos (3)                                            │
│    │ ▶ Torre Nápoles 120 unidades  [Status: Construcción]     │
│    │ ▶ Depas Roma     60 unidades  [Status: Pre-venta]        │
│    │ ▶ Residencial X  48 unidades  [Status: Entregado]        │
│    │                                                           │
│    │ Detalle Torre Nápoles                                     │
│    │ ┌Overview│Prototipos│Unidades│Precios│Esquemas│Docs│...┐│
│    │ │ Unidades grid 10x12 con colores:                      ││
│    │ │  🟢 Disponible (45)  🟡 Reservada (20)                ││
│    │ │  🟠 Apartada (15)    🔵 Vendida (40)                  ││
│    │ └──────────────────────────────────────────────────────┘│
└────┴─────────────────────────────────────────────────────────┘
```

## Componentes UI requeridos

- `<ProjectsTree />` — tree nav.
- `<ProjectWizard />` — 5 pasos.
- `<PrototiposList />` + `<PrototipoForm />`.
- `<UnidadesGrid />` — grid con realtime.
- `<UnidadDetail />` — con historial precios.
- `<PrecioHistorial />` — line chart + table.
- `<EsquemasPagoEditor />`.
- `<FotosUploader />` (shared M05/M08).
- `<DocsBulkUploader />` — drop zone + progress.
- `<DocExtractionReview />` — verde/amarillo/rojo.
- `<AvanceObraGantt />`.
- `<IEAlertBanner />` — predial + risks.

## Procedures tRPC consumidas

- `developer.listProjects`, `createProject`, `updateProject`, `archiveProject`.
- `developer.listUnidades`, `updateUnidadStatus`.
- `developer.getPriceHistory`.
- `developer.updatePrecioUnidad`.
- `developer.listEsquemasPago`, `createEsquema`.
- `documents.uploadBulk`, `getDocJobStatus`, `approveExtractedData`.
- `developer.uploadAvanceObra`.
- `scores.getIEAlertsForProject`.

## Tablas BD tocadas

- `proyectos`.
- `prototipos`.
- `unidades`.
- `precios_unidad` (con history).
- `esquemas_pago`.
- `photos`.
- `documents` + `document_jobs`.
- `avance_obra`.
- `zone_scores` (alerts).
- `audit_log`.

## Estados UI

- **Loading**: skeleton tree + grid.
- **Error**: toast + retry.
- **Empty**: "Crea tu primer proyecto" CTA + video onboarding.
- **Success**: tree + grid renderizados.

## Validaciones Zod

```typescript
const createProjectInput = z.object({
  countryCode: z.string().length(2),
  developerId: z.string().uuid(),
  nombre: z.string().min(3).max(120),
  direccion: z.string().min(5).max(200),
  descripcion: z.string().max(5000),
  status: z.enum(['planning', 'construction', 'preventa', 'delivered']),
  tipoProyecto: z.enum(['departamentos', 'casas', 'mixto', 'comercial']),
  unidadesTotales: z.number().int().positive().max(5000),
  fechaEntrega: z.string().date().optional(),
});

const updateUnidadStatusInput = z.object({
  unidadId: z.string().uuid(),
  newStatus: z.enum(['disponible', 'reservada', 'apartada', 'vendida']),
  motivoChange: z.string().max(500).optional(),
});
```

## Integraciones externas

- **Supabase Realtime** — units updates.
- **Supabase Storage** — photos + docs + obra.
- **Mapbox Geocoder** — direcciones.
- **Anthropic Claude** — doc extraction (Fase 17).
- **OpenAI Vision** — photo classify.
- **SAT** — consulta predial (via web scraping autorizado o API).

## Tests críticos

- [ ] Crear proyecto con 120 unidades genera 120 filas correctas.
- [ ] Realtime: marcar unidad vendida → M02 asesor ve update.
- [ ] Historial precios preserva todos los cambios.
- [ ] Upload 50 docs PDF → 50 `document_jobs` creados.
- [ ] Extraction review: dev aprueba → UPDATE proyecto con datos.
- [ ] IE alert banner muestra si predial en tier alto.
- [ ] RLS: dev solo ve sus proyectos.
- [ ] i18n: `t('dev.inventario.*')`.

## i18n keys ejemplo

```tsx
<Badge>{t('dev.unidad.status.' + s)}</Badge>
<Tab>{t('dev.project.tabs.' + t)}</Tab>
```

## Cross-references

- ADR-010 IE Pipeline
- [FASE 17 Document Intel](../02_PLAN_MAESTRO/FASE_17_DOCUMENT_INTEL.md)
- [03.8 Scores IE](../03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md) — H03 seismic, N07 water, F12 risk
- Módulos relacionados: M02 Desarrollos (source), M12 Contabilidad (precios → CFDI), M15 Analytics IE

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent H) | **Fecha:** 2026-04-17

---

## APPEND v3 onyx-benchmarked (2026-04-28) — B.2 Unit-level demand heatmap

**Autoritativo:** [ADR-060](../01_DECISIONES_ARQUITECTONICAS/ADR-060_FASE_15_BUCKET_B_ONYX_BENCHMARKED_INTEGRATION.md).

### Anchor Onyx M2 +30% eficiencia operativa (parte unit map interactivo)

Cada unidad muestra "calor" (demand_score 0-100) basado en signals reales últimos 30d:
- 40% landing_views unit-specific (`landing_analytics`)
- 25% wishlist adds (`wishlist`)
- 20% busqueda_matches (`busqueda_matches`)
- 15% qr_scans (`qr_codes.scans`)

### BD nueva
- Migration agrega `unidades.demand_score_30d int default 0`, `unidades.demand_color text generated always` (rojo<30/ámbar 30-70/verde>70), `unidades.demand_signals jsonb`.

### tRPC
- `developer.getUnitDemandHeatmap({projectId})` returns `[{unitId, demandScore, color, signalsBreakdown}]`. Extiende `features/developer/routes/developer.ts`.

### Engine + Cron
- `lib/scores/unit-demand-score.ts` — cálculo composite ponderado.
- Cron `unit_demand_score_daily` 3am refresca todos proyectos activos.

### UI
- M11 grid color-codes unit cards rojo/ámbar/verde.
- Tooltip muestra signals breakdown + comparativa vs media proyecto.

### Cross-fn
- Alimenta B03 Pricing Autopilot input (recommendation engine considera demand real).
- Alimenta M14 dashboard "Top 5 unidades hot" widget.

**Esfuerzo:** 6-8h. **Priority Bucket B:** 🥈 #5.
