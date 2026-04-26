# M02 — Desarrollos (Inventario del Asesor)

> **Portal:** Asesor
> **Ruta principal:** `/asesores/desarrollos`
> **Fase donde se construye:** [FASE 13 — Portal Asesor M1-M5](../02_PLAN_MAESTRO/FASE_13_PORTAL_ASESOR_M1_M5.md)
> **Sidebar tint canon:** `--mod-desarrollos: #14b8a6` (teal, ADR-050)
> **Priority:** [H1]
> **Referencia visual:** `/docs/referencias-ui/M2_Desarrollos.tsx`
>
> **Estado 2026-04-26 (FASE 13.C-datasource shipped):**
> - UI shipped FASE 13.C (route + 11 components + 3 hooks + 3 lib utilities + 36 tests, 66 i18n keys × 5 locales).
> - **Datasource real shipped FASE 13.C-datasource**: 5 tablas core BD creadas (`proyectos`, `unidades`, `project_brokers`, `marketing_assets`, `exclusividad_acuerdos`) con RLS por rol (asesor via project_brokers, admin_desarrolladora scope, master_broker scope, superadmin all). Procedures `desarrollos.list/get/searchByName/listUnidades/listBrokers/listAssets/listExclusividad` (7 procedures wired). Loader `loadDesarrollos` consume real BD vía `createAdminClient` con scope filtering (own/exclusive/dmx/mls). Empty state honesto cuando BD vacía: `isStub=true + reason="BD vacía..."`.
> - Tablas BD restantes M11 FASE 15: `precios_unidad`, `photos`, `documents`, `acm_valuaciones` (no bloquean asesor read-only view).
> - Components shipped: `DesarrollosPage`, `DesarrollosTabs`, `DesarrollosFilters`, `DesarrollosSort`, `DesarrollosGrid`, `DesarrollosSkeleton`, `DesarrolloCard`, `DesarrolloDetailDrawer`, `QualityScoreBadge` (4 niveles canon NO invertidos), `ExclusividadBadge` (formato X-Y-Z), `EmptyState` (SVG inline canon), `PhotoPlaceholder` (gradient teal canon, NO Lorem Picsum).
> - Hooks shipped: `useDesarrollosFilters` (URL search params), `useDesarrollosTab`, `useDesarrolloDrawer` (focus trap + ESC handler).
> - Tests Vitest shipped: schemas + quality-score + loader STUB + components/hooks smoke (zero render dependencias DOM).

---

## Descripción funcional

Módulo de inventario para el asesor: browse de desarrollos disponibles para vender segmentado en tabs (Propias, Exclusivas, DMX, MLS), con cards enriquecidos por IE cards inline (DMX Score, zone_scores, momentum, risk). Reemplaza el "Inventario" de Pulppo pero resuelve sus dos gaps críticos: (1) Quality Score con **labels descriptivos DIRECTOS** (Competitivo / Moderado / Fuera de mercado / Sin ACM) — no invertidos como Pulppo donde `high=malo`; (2) Sistema Exclusividad X-Y-Z transparente (meses exclusividad + meses contrato + % comisión). Incluye assets marketing ready/generating (postCuadrado, postLargo, story, videoStory ≤24h, video ≤24h) con botones "Usar en WhatsApp/IG/FB".

## Flujos principales

### Flujo 1 — Browse por tabs
1. Usuario entra a `/asesores/desarrollos`, default tab = "Propias".
2. `trpc.developer.listProjectsForAsesor` con `{ tab: 'own' | 'exclusive' | 'dmx' | 'mls' }`.
3. Query respeta RLS: `own` = `project_brokers.asesor_id = me`; `exclusive` = inmobiliaria del asesor; `dmx` = toda la plataforma; `mls` = red sindicada.
4. Grid masonry de cards con infinite scroll (react-virtual).
5. Filtros laterales: país, ciudad, colonia, tipo, precio, recámaras, amenidades.

### Flujo 2 — Ver detalle proyecto
1. Click en card → navigate `/asesores/desarrollos/[id]`.
2. Carga tabs: Overview / Unidades / Galería / Documentos / IE Scores / Competencia.
3. IE Scores panel: DMX Score, zone_scores (B01-B12 relevantes), momentum, risk (H03 seismic, N07 water, F12 risk).
4. Tab Unidades: lista con disponibilidad realtime (useRealtimeUnits).

### Flujo 3 — Compartir asset marketing
1. En card, hover reveal "Assets" menú.
2. 5 variantes: postCuadrado, postLargo, story, videoStory, video.
3. Estados `ready` / `generating`.
4. Si ready → click → `trpc.marketing.sharePropertyLink` (genera short URL con UTM).
5. Si generating → toast "En proceso, estimado 45s" + polling.
6. videoStory y video caducan a 24h (almacenamiento Supabase Storage con TTL).

### Flujo 4 — Quality Score tooltip pedagógico
1. Badge "Competitivo" | "Moderado" | "Fuera de mercado" | "Sin ACM" (label directo).
2. Hover → tooltip con explicación: precio vs ACM + desvío ±%.
3. Click → modal con breakdown: precio_solicitado, precio_sugerido, comparables usados.

### Flujo 5 — Sistema Exclusividad X-Y-Z
1. Si proyecto tiene exclusividad con el asesor, badge `EXC 6-12-3%` (6 meses exclusivo, 12 contrato, 3% comisión).
2. Click badge → drawer con términos completos + firma digital Mifiel si pendiente.

## Wireframe textual

```
┌───────────────────────────────────────────────────────────────┐
│ Header | ⌘K | Notifs | Avatar                                  │
├────┬──────────────────────────────────────────────────────────┤
│ SB │ Desarrollos                                   + Nuevo    │
│    │ ┌─Tabs─────────────────────────────────────┐              │
│    │ │ Propias | Exclusivas | DMX | MLS         │              │
│    │ └──────────────────────────────────────────┘              │
│    │ ┌─Filters lateral────┐ ┌─Grid cards──────────┐            │
│    │ │ País CDMX          │ │ [Card][Card][Card]  │            │
│    │ │ Colonia Del Valle  │ │ [Card][Card][Card]  │            │
│    │ │ Precio 3M-8M MXN   │ │ IE: DMX 8.4 ↑       │            │
│    │ │ Recámaras 2-3      │ │ EXC 6-12-3%          │            │
│    │ └────────────────────┘ │ Competitivo ✓        │            │
│    │                        │ [Assets] [Compartir]│            │
│    │                        └──────────────────────┘            │
└────┴──────────────────────────────────────────────────────────┘
```

## Componentes UI requeridos

- `<ProyectoCard />` (`features/desarrollos/components/ProyectoCard.tsx`) — foto hero + título + precio + IE Score inline + Quality Score + Exclusividad badge + Assets menu.
- `<DesarrollosTabs />` (`features/desarrollos/components/DesarrollosTabs.tsx`) — 4 tabs con counts.
- `<FiltersSidebar />` (`features/desarrollos/components/FiltersSidebar.tsx`) — filtros con URL state (nuqs).
- `<QualityScoreBadge />` (`features/desarrollos/components/QualityScoreBadge.tsx`) — 4 niveles con tooltip pedagógico.
- `<ExclusividadBadge />` (`features/desarrollos/components/ExclusividadBadge.tsx`) — X-Y-Z format.
- `<IEScoreInline />` (`features/scores/components/IEScoreInline.tsx`) — DMX Score + arrow delta + mini chart.
- `<AssetsMenu />` (`features/marketing/components/AssetsMenu.tsx`) — 5 variantes con status ready/generating.
- `<ProyectoDetailPage />` (`features/desarrollos/components/ProyectoDetailPage.tsx`) — layout con 6 tabs.
- `<UnidadesList />` (`features/desarrollos/components/UnidadesList.tsx`) — realtime con `useRealtimeUnits`.

## Procedures tRPC consumidas

- `developer.listProjectsForAsesor` — input: `{ tab, filters, cursor }` / output: `{ projects[], nextCursor }`.
- `developer.getProjectById` — input: `{ projectId }` / output: proyecto + unidades + photos + docs.
- `scores.getProjectScores` — input: `{ projectId }` / output: `{ dmxScore, zoneScores, riskScores, momentumDelta }`.
- `scores.getACM` — input: `{ projectId, unitId? }` / output: `{ precioSugerido, comparables, confidence }`.
- `marketing.getAssetsForProject` — input: `{ projectId }` / output: `{ postCuadrado, postLargo, story, videoStory, video }` con status.
- `marketing.sharePropertyLink` — input: `{ projectId, contactoId?, channel }` / output: `{ shortUrl, qrCodeUrl }`.
- `developer.getExclusividad` — input: `{ projectId, asesorId }` / output: `{ mesesExclusividad, mesesContrato, comisionPct, status }`.

## Tablas BD tocadas

- `proyectos` — SELECT (browse + detail).
- `unidades` — SELECT (realtime).
- `precios_unidad` — SELECT (historial).
- `project_brokers` — SELECT (filter tab `own` + `exclusive`).
- `photos` — SELECT (galería).
- `documents` — SELECT (tab docs, con RLS por rol).
- `zone_scores` — SELECT (IE inline).
- `project_scores` — SELECT (DMX Score).
- `marketing_assets` — SELECT (5 variantes).
- `exclusividad_acuerdos` — SELECT (X-Y-Z).
- `audit_log` — INSERT en share.

## Estados UI

- **Loading**: skeleton grid con 12 cards shimmer. Sidebar filtros carga inmediata.
- **Error**: ErrorBoundary por card (graceful degrade — card muestra "Error cargando" pero no tumba toda la grid).
- **Empty**: ilustración + CTA. Por tab:
  - Propias: "Aún no te han asignado proyectos. Solicita a tu MB asignación."
  - Exclusivas: "Tu inmobiliaria no tiene exclusivas por ahora."
  - DMX: "No hay proyectos que cumplan tus filtros."
  - MLS: "No hay proyectos compartidos en la red."
- **Success**: grid renderizado con realtime updates (nueva unidad disponible → card pulse green).

## Validaciones Zod

```typescript
const listProjectsInput = z.object({
  tab: z.enum(['own', 'exclusive', 'dmx', 'mls']),
  filters: z.object({
    countryCode: z.string().length(2).optional(),
    city: z.string().max(80).optional(),
    colonia: z.string().max(80).optional(),
    priceMin: z.number().positive().optional(),
    priceMax: z.number().positive().optional(),
    bedrooms: z.array(z.number().int().min(0).max(10)).optional(),
    amenities: z.array(z.string()).max(20).optional(),
    tipo: z.enum(['departamento', 'casa', 'terreno', 'oficina', 'local']).optional(),
  }).optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(6).max(60).default(24),
});
```

## Integraciones externas

- **Mapbox GL JS** — minimap en detail.
- **Supabase Storage** — fotos + video assets.
- **Supabase Realtime** — cambios disponibilidad unidades.
- **PostHog** — track qué proyectos ve, clicks en compartir (input para C03 Matching).
- **Sentry** — error capture.
- **Vercel AI SDK** — generar descripciones asset (si texto vacío).

## Tests críticos

- [ ] Happy path: user entra a /desarrollos → tab "DMX" renderiza proyectos públicos.
- [ ] RLS: tab "Propias" sólo retorna proyectos asignados via `project_brokers`.
- [ ] Quality Score label descriptivo correcto (NO invertido — "Competitivo" = bueno, "Fuera de mercado" = malo).
- [ ] Tooltip pedagógico muestra desvío ± vs ACM.
- [ ] Exclusividad X-Y-Z badge parsea correctamente `6-12-3%`.
- [ ] Compartir asset genera short URL con UTM + registra en timeline.
- [ ] Realtime: cuando dev marca unidad vendida, card se actualiza sin refresh.
- [ ] Asset videoStory >24h muestra "Expirado, regenerar" CTA.
- [ ] i18n: todos los labels via `t('desarrollos.*')`.
- [ ] Accessibility: grid keyboard nav (arrow keys), aria-labels.

## i18n keys ejemplo

```tsx
<Tab>{t('desarrollos.tabs.own')}</Tab>
<Badge>{t('desarrollos.quality.' + level)}</Badge> // 'competitivo' | 'moderado' | 'fueraMercado' | 'sinACM'
<Button>{t('desarrollos.actions.shareAsset', { channel })}</Button>
```

## Referencia visual

Ver `/docs/referencias-ui/M2_Desarrollos.tsx` (423 LOC en repo viejo, JSX Dopamine final). Grid con Card3D hover, tint bgSlate, tabs superiores, filtros laterales colapsables.

## Cross-references

- ADR-002 AI-Native (descripciones generadas)
- ADR-003 Multi-Country (filters con country_code)
- ADR-010 IE Pipeline (zone_scores + DMX Score)
- [03.8 Scores IE](../03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md) — DMX Score, momentum, risk
- [03.10 Features Registry](../03_CATALOGOS/03.10_CATALOGO_FEATURES_REGISTRY.md) — `feature:asesor:desarrollos`
- Módulos relacionados: M05 Captaciones (crea nuevos proyectos), M08 Marketing (genera assets), M11 Inventario Dev (source of truth)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent H) | **Fecha:** 2026-04-17
