# M09 — Estadísticas (Métricas Asesor)

> **Portal:** Asesor
> **Ruta principal:** `/asesores/estadisticas`
> **Fase donde se construye:** [FASE 14 — Portal Asesor M6-M10](../02_PLAN_MAESTRO/FASE_14_PORTAL_ASESOR_M6_M10.md)
> **Sidebar tint:** bgLavender `#F0EEFF`
> **Priority:** [H1]
> **Referencia visual:** `/docs/referencias-ui/M9_Estadisticas.tsx`

---

## Descripción funcional

Dashboard de performance del asesor con **2 superficies**:
1. **Página completa `/asesores/estadisticas`**: Calidad Atención (T. 1ª respuesta + T. promedio con SLA comparison) + Métricas Operaciones 9 KPIs + 4 gráficas Recharts (pipeline, revenue, visits conversion, zones heatmap).
2. **Slide-over accesible via `?metrics=true`**: 11 KPIs tipo semáforo para review rápido.

**Pedagogía integrada por KPI**: cada KPI tiene sub-drawer con 4 secciones (¿Qué mide? / ¿Por qué importa? / Consejos / ¿Cómo evoluciona?). **Mejoras vs Pulppo**: (1) selector de fechas flexible (Pulppo es fijo "semana anterior"); (2) filtros por colonia/producto; (3) comparativa vs equipo / promedio plataforma. Alimenta gamification (rankings mensuales).

## Flujos principales

### Flujo 1 — Página completa /estadisticas
1. Usuario entra a `/asesores/estadisticas`.
2. Header: selector rango fechas (Hoy / 7d / 30d / 90d / Custom) + filtros (colonia, producto/tipo, equipo).
3. Secciones:
   - **Calidad Atención**: T. 1ª respuesta vs SLA 60min, T. promedio vs SLA 120min. Gauge visual.
   - **Métricas Operaciones**: 9 KPIs en grid (consultas totales, recibidas, atendidas, búsquedas activas, oportunidades interesado, ACMs, propiedades activas, oportunidades propietario, visitas agendadas).
   - **Gráficas Recharts**:
     - Line chart revenue mensual.
     - Funnel chart pipeline (Pendiente→Buscando→Visitando→Ofertando→Cerrando→Ganada).
     - Bar chart visits vs cerradas.
     - Heatmap colonias por actividad.
4. Botón "Comparar con equipo" → overlay con promedio equipo.

### Flujo 2 — Slide-over ?metrics=true
1. Query param `?metrics=true` activa slide-over (accesible desde cualquier módulo).
2. 11 KPIs con semáforo visual (verde/amarillo/rojo según thresholds).
3. KPIs: consultas pendientes, T.1ª resp, T. promedio, volumen interacciones, sugerencias promedio, tasa visita, tasa oferta, % inventario en venta, inventario total, ACMs generados, captaciones nuevas.
4. Click KPI → abre sub-drawer pedagógico.

### Flujo 3 — Sub-drawer pedagógico
1. Click en cualquier KPI.
2. Drawer lateral con 4 secciones:
   - **¿Qué mide?**: definición operacional.
   - **¿Por qué importa?**: impacto en cierre + revenue.
   - **Consejos**: 3-5 tips accionables.
   - **¿Cómo evoluciona?**: mini chart últimos 90 días.
3. Botón "Acción recomendada" navega al módulo correspondiente (ej: tasa visita baja → M04 Búsquedas filtrado Visitando).

### Flujo 4 — Comparativa equipo
1. Toggle "Equipo" (si user tiene `permissions.stats.team_comparison=true`).
2. Muestra bar chart side-by-side: yo vs promedio equipo vs top performer.
3. Privacidad: top performer anonimizado ("Asesor #1" sin nombre salvo si optin).

## Wireframe textual

```
┌───────────────────────────────────────────────────────────────┐
│ Estadísticas     [Hoy|7d|30d|90d|Custom]   [Equipo toggle]    │
├────┬──────────────────────────────────────────────────────────┤
│ SB │ Calidad Atención                                          │
│    │ ┌──────────────────┐  ┌──────────────────┐                │
│    │ │ T. 1ª respuesta   │  │ T. promedio      │                │
│    │ │ 12 min 🟢         │  │ 45 min 🟡        │                │
│    │ │ SLA: 60 min       │  │ SLA: 120 min     │                │
│    │ └──────────────────┘  └──────────────────┘                │
│    │                                                            │
│    │ Métricas Operaciones (9 KPIs)                             │
│    │ [grid 3x3 KPI cards con semáforo]                         │
│    │                                                            │
│    │ Gráficas                                                  │
│    │ [Line Revenue]  [Funnel Pipeline]                          │
│    │ [Bar Visitas]    [Heatmap Colonias]                        │
└────┴──────────────────────────────────────────────────────────┘

Slide-over (?metrics=true):
┌─Métricas Rápidas──────────────────┐
│ 🟢 Consultas pendientes: 8         │
│ 🟢 T. 1ª resp: 12 min              │
│ 🟡 T. prom: 45 min                 │
│ 🟢 Volumen: 14/semana              │
│ 🔴 Sugerencias: 7 (low)            │
│ ... (11 total)                     │
└────────────────────────────────────┘
```

## Componentes UI requeridos

- `<EstadisticasPage />` — layout página completa.
- `<DateRangeSelector />` — 5 presets + custom (nuqs URL state).
- `<KpiGrid />` — 9 KPIs con Card3D hover.
- `<KpiCardWithPedagogy />` — click abre drawer.
- `<PedagogyDrawer />` — 4 secciones + mini chart.
- `<RechartsRevenueLine />`.
- `<RechartsPipelineFunnel />`.
- `<RechartsVisitsBar />`.
- `<RechartsZoneHeatmap />`.
- `<MetricsSlideOver />` — triggered by ?metrics=true.
- `<TeamComparisonOverlay />` — bar comparativo.

## Procedures tRPC consumidas

- `asesorCRM.getEstadisticas` — input: `{ rangeFrom, rangeTo, filters }` / output: full dashboard data.
- `asesorCRM.getMetricsSemaforo` — 11 KPIs semáforo.
- `asesorCRM.getPipelineFunnel` — input range / output: counts per etapa.
- `asesorCRM.getRevenueByMonth` — serie temporal.
- `asesorCRM.getVisitsConversion`.
- `asesorCRM.getZonesActivity`.
- `asesorCRM.getTeamComparison` — team avg + top performer anonymized.
- `gamification.getLeaderboard` — monthly rank.

## Tablas BD tocadas

- `busquedas` — conteos etapa.
- `visitas` — counts agendadas, completadas.
- `operaciones` — revenue + cerradas + %.
- `contactos` — consultas.
- `timeline_entries` — SLA calculations (first_response_at).
- `asesor_stats_daily` (materialized view) — aggregations precalculadas.
- `captaciones` — ACMs + oportunidades propietario.
- `proyectos` — inventario en venta.
- `asesor_gamification` — leaderboard.

## Estados UI

- **Loading**: skeleton para cada sección.
- **Error**: banner + retry.
- **Empty**: "Aún no hay datos — empieza registrando actividad" + link M03/M04.
- **Success**: charts renderizados con animación entrada.

## Thresholds (ver M01 para tabla completa)

```
Consultas pendientes: <15 verde, 15-59 amarillo, ≥60 rojo
T. primera respuesta: <15 verde, 15-59 amarillo, ≥60 rojo (SLA 60min)
T. respuesta promedio: <15 verde, 15-59 amarillo, ≥60 rojo (SLA 120min)
Volumen interacciones: ≥3 verde, <3 rojo
Sugerencias promedio: >15 verde, 10-15 regular, <10 rojo
Tasa visita: ≥75% verde, 50-74% regular, <50% rojo
Tasa oferta: ≥70% verde, 50-69% regular, <50% rojo
% Inventario en venta: >30% verde, 20-30% regular, <20% rojo
Inventario total: ≥3 verde, <3 rojo
```

## Validaciones Zod

```typescript
const estadisticasInput = z.object({
  rangeFrom: z.string().date(),
  rangeTo: z.string().date(),
  filters: z.object({
    colonia: z.string().max(80).optional(),
    tipo: z.enum(['departamento','casa','terreno','oficina','local']).optional(),
    equipo: z.boolean().default(false),
  }).optional(),
});
```

## Integraciones externas

- **Recharts** — charts library.
- **PostHog** — session replay + funnel exploration.
- **Materialized view refresh** — cron cada hora (`asesor-stats-refresh`).

## Tests críticos

- [ ] Range selector persiste en URL.
- [ ] Slide-over abre/cierra con ?metrics=true.
- [ ] Pedagogy drawer renderiza 4 secciones correctamente.
- [ ] Thresholds semáforo correcto para cada KPI.
- [ ] Team comparison anonimiza top performer (si no opt-in).
- [ ] RLS: propio data only, equipo si permission.
- [ ] Performance: dashboard carga <2s p95.
- [ ] i18n: todos los labels KPI via `t('estadisticas.*')`.
- [ ] Accessibility: charts con aria descriptions + data tables fallback.

## i18n keys ejemplo

```tsx
<Label>{t('estadisticas.kpi.pendingInquiries.label')}</Label>
<p>{t('estadisticas.kpi.pendingInquiries.whatMeasures')}</p>
<p>{t('estadisticas.kpi.pendingInquiries.whyMatters')}</p>
```

## Referencia visual

Ver `/docs/referencias-ui/M9_Estadisticas.tsx` (636 LOC). Tint bgLavender, 2 superficies (page + slide-over).

## Cross-references

- ADR-002 AI-Native (consejos generados por AI en pedagogy drawer — H2)
- [FASE 24 Observabilidad](../02_PLAN_MAESTRO/FASE_24_OBSERVABILIDAD_SRE.md) — PostHog funnels
- Módulos relacionados: M01 Dashboard (algunos KPIs embebidos), M16 Dashboard Admin (rollup global)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent H) | **Fecha:** 2026-04-17
