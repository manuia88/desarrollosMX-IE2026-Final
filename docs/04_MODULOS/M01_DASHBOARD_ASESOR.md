# M01 — Dashboard Asesor (Command Center)

> **Portal:** Asesor
> **Ruta principal:** `/[locale]/dashboard` (route group `(asesor)`)
> **Status:** SHIPPED 2026-04-26 (FASE 13.B)
> **Fase donde se construye:** [FASE 13 — Portal Asesor M1-M5](../02_PLAN_MAESTRO/FASE_13_PORTAL_ASESOR_M1_M5.md)
> **Sidebar tint canon:** `--mod-dashboard` (#6366f1 indigo) — ADR-050 wayfinding
> **Priority:** [H1]
> **Referencia visual:** `/docs/referencias-ui/M1_Dashboard.tsx` layout structure; re-skin canon dark via ADR-050.

## Implementación shipped (FASE 13.B)

- **Server layout + auth gate:** `app/[locale]/(asesor)/layout.tsx` valida sesión + role en `ALLOWED_ASESOR_ROLES = {asesor, admin_desarrolladora, broker_manager, mb_admin, mb_coordinator}`.
- **Server page:** `app/[locale]/(asesor)/dashboard/page.tsx` carga `loadDashboardSummary(asesorId)` (paralelo: leads + deals + operaciones via supabase server client + RLS) y compone 10 secciones.
- **Shell wrapper:** `features/asesor-shell/` (5 componentes + 3 hooks): AsesorSidebar (60→240px hover-expand) + AsesorTopbar (72px breadcrumb + ⌘K + availability + notifs + avatar) + CopilotRail (5 buttons + drawer overlay) + QuickActionsFloater (5 actions + ⇧L/V/C/N/S kbd) + CommandPalette (cmdk + 4 sections).
- **Dashboard sections:** `features/asesor-dashboard/` (10 componentes + lib derive): HeroPulse + KpiStrip + PipelineCarousel + DailyStandup{MorningBriefing,TodayAgenda,ActivityFeed} + PerformanceToday{StreakWidget,XpProgressBar,BadgesRow,SmartRecommendations}.
- **Innovaciones visuales canon-asesor:** `shared/ui/primitives/canon-asesor/` — 8 componentes (DecisionCrystal, ConfidenceHalo, TideLineChart, ConversationThermometer, MoodStripe, DiffCard, HeatmapDensity, CalendarConstellation) + 2 hooks (useListenMode, useSpatialSearch) marcados ADR-018 stub.
- **Tokens canon adicionales:** `--temp-{cold,cool,warm,hot,burning}`, `--mood-slate-{1,2}`, keyframes `mood-pulse`, `diff-after-in`, `heatmap-fade` agregados a `styles/tokens.css`.
- **Pre-shipped foundation 13.A:** `shared/ui/primitives/canon/{button,card,score-pill,momentum-pill,glass-overlay,icon-circle,disclosure-pill}` + `shared/ui/motion/*` + tokens ADR-050.
- **i18n:** namespaces `AsesorShell.*` + `AsesorDashboard.*` agregados en es-MX + en-US (Tier 1 H1) + es-CO/es-AR/pt-BR (fallback graceful).

---

## Descripción funcional

Command Center del asesor inmobiliario. Primera pantalla que ve tras login, diseñada como centro operativo accionable, NO como reporte pasivo. Combina KPIs pedagógicos con umbrales Pulppo adaptados, carrusel "¿Qué debo hacer hoy?", Morning Briefing generado por IA (scoreC05 Copilot), 3 insights (mercado/personal/gamification), 5 quick actions (llamada/visita/compartir), búsqueda global ⌘K, badge de notificaciones y widget de gamification (streak + XP + nivel + badges). Responde la pregunta central del asesor: *¿qué acción genera la mayor oportunidad de ingreso en las próximas 2 horas?* Layout inspirado en Pulppo (header 72px + sidebar 64→285px + sidebar derecho 55px) pero con scroll flexible (NO altura fija 828px) y sin fricciones v3/v4.

## Flujos principales

### Flujo 1 — Carga inicial del dashboard
1. Usuario llega a `/asesores` tras login (permiso `feature:asesor:dashboard`).
2. Server component llama `trpc.asesorCRM.getDashboardSummary` (incluye KPIs + alerts + quick actions + availability status).
3. Client component monta carrusel + secciones con skeletons shimmer.
4. Cron `morning-briefing-generate` (6:00 UTC) ya dejó `ai_generated_content.type='morning_briefing'` — hook `useMorningBriefing` lo hidrata.
5. Widget Gamification hidrata `trpc.gamification.getAsesorState` (xp_total, streak, level, badges, monthly_rank).
6. Hook `useUnreadNotifCount` (WebSocket realtime) actualiza badge notifs.

### Flujo 2 — Toggle disponibilidad (estado asesor)
1. Usuario clickea switch "Disponible/Ocupado" en header.
2. Optimistic update UI.
3. `trpc.asesorCRM.toggleAvailability` mutation — actualiza `asesores.is_available`.
4. Si pasa a Ocupado → `notificaciones_config` respeta (no push en mobile).
5. Trigger T12 registra en `audit_log`.

### Flujo 3 — Ejecutar Quick Action (Llamada/Visita/Compartir)
1. Click en card Quick Action.
2. Si es "Llamada" → drawer con `<ContactPicker />` → seleccionar contacto → `trpc.asesorCRM.logCall` (crea timeline entry).
3. Si es "Visita" → `<ScheduleVisitDialog />` → `trpc.asesorCRM.scheduleVisit` (crea en `visitas` + sync Google Calendar).
4. Si es "Compartir" → `<ShareProjectDialog />` → selecciona proyecto + contacto → `trpc.marketing.sharePropertyLink` (genera QR + link con UTM).
5. Toast confirmación + XP +10 gamification.

### Flujo 4 — Búsqueda global ⌘K
1. Usuario presiona `Cmd+K` (macOS) o `Ctrl+K` (Windows/Linux).
2. `<CommandPalette />` modal aparece (cmdk library).
3. `trpc.search.globalSearch` con debounce 150ms — busca en contactos/proyectos/operaciones/documentos (pgvector + FTS).
4. Resultados con citations inline (RAG pattern).
5. Enter → navigate + cerrar palette.

### Flujo 5 — Morning Briefing AI
1. Card superior muestra `<MorningBriefing />` con saludo personalizado + 3 puntos accionables del día.
2. Botón "Refresh" → `trpc.ai.regenerateMorningBriefing` (rate-limited: 3/día).
3. Cada punto es clickable → navega al módulo relevante (tarea, búsqueda, captación).

## Wireframe textual

```
┌──────────────────────────────────────────────────────────────────────┐
│ Header 72px | Logo | ⌘K Search | Disponibilidad toggle | 🔔 | Avatar │
├────┬────────────────────────────────────────────────────────┬────────┤
│ SB │ Hola María, son las 9:15 ☀️                             │  SBR   │
│ 64 │ ┌────────────────────────────────────────────────┐     │  55px  │
│ px │ │ ¿Qué debo hacer hoy? (carrusel 5 acciones)    │     │        │
│    │ └────────────────────────────────────────────────┘     │  Icons │
│ ↓  │ ┌──────────┬──────────┬──────────┬──────────┐          │  5    │
│285 │ │ KPI 1    │ KPI 2    │ KPI 3    │ KPI 4    │          │        │
│px  │ └──────────┴──────────┴──────────┴──────────┘          │        │
│on  │ ┌──────────┬──────────┬──────────┐                     │        │
│hov │ │ KPI 5    │ KPI 6    │ KPI 7    │                     │        │
│    │ └──────────┴──────────┴──────────┘                     │        │
│    │ ┌─────────────────┬─────────────────┐                   │        │
│    │ │ Morning Brief   │ Insight Mercado │                   │        │
│    │ └─────────────────┴─────────────────┘                   │        │
│    │ ┌─────────────────┬─────────────────┐                   │        │
│    │ │ Insight Personal│ Gamification W. │                   │        │
│    │ └─────────────────┴─────────────────┘                   │        │
│    │ [Quick Actions x5: llamar, visitar, compartir...]       │        │
└────┴─────────────────────────────────────────────────────────┴────────┘
```

## Componentes UI requeridos

- `<DashboardHeader />` (`features/asesor/components/DashboardHeader.tsx`) — logo + ⌘K trigger + availability toggle + notifs badge + user menu.
- `<TodayCarousel />` (`features/asesor/components/TodayCarousel.tsx`) — carrusel 5 slides con acciones priorizadas por AI.
- `<KpiCard />` (`shared/ui/dopamine/KpiCard.tsx`) — card con Card3D hover + AnimNum + semáforo threshold + pedagogía tooltip.
- `<MorningBriefing />` (`features/asesor/components/MorningBriefing.tsx`) — card con streaming text + refresh button + citations.
- `<InsightCard />` (`features/asesor/components/InsightCard.tsx`) — 3 variantes (market/personal/gamification).
- `<GamificationWidget />` (`features/gamification/components/GamificationWidget.tsx`) — streak flame + XP progress + level + badges strip.
- `<QuickActionButton />` (`features/asesor/components/QuickActionButton.tsx`) — 5 variantes con iconos dopamine.
- `<CommandPalette />` (`shared/ui/layout/CommandPalette.tsx`) — cmdk + RAG search global.
- `<NotificationsBadge />` (`shared/ui/layout/NotificationsBadge.tsx`) — realtime badge con dropdown preview.
- `<AvailabilityToggle />` (`features/asesor/components/AvailabilityToggle.tsx`) — switch con confirmación.
- `<AsesorSidebar />` (`shared/ui/layout/AsesorSidebar.tsx`) — 64→285px on hover, 13 items.
- `<AsesorRightSidebar />` (`shared/ui/layout/AsesorRightSidebar.tsx`) — 55px, 5 icons shortcuts.

## Procedures tRPC consumidas

- `asesorCRM.getDashboardSummary` — input: `{ asesorId: uuid }` / output: `{ kpis, alerts, quickActions, availability }`.
- `asesorCRM.toggleAvailability` — input: `{ available: boolean }` / output: `{ success, newState }`.
- `asesorCRM.logCall` — input: `{ contactoId, duration?, notes? }` / output: `{ timelineEntryId }`.
- `asesorCRM.scheduleVisit` — input: `{ contactoId, proyectoId?, unidadId?, scheduledAt, notes? }` / output: `{ visitaId, calendarEventId }`.
- `ai.generateMorningBriefing` — input: `{ asesorId, date }` / output: `{ content, citations[] }`.
- `ai.regenerateMorningBriefing` — rate-limited, returns `{ content, citations[] }`.
- `search.globalSearch` — input: `{ query, filters? }` / output: `{ contactos, proyectos, operaciones, documents }`.
- `notifications.getUnreadCount` — output: `{ count: number }`.
- `notifications.markAsRead` — input: `{ notifIds: uuid[] }`.
- `gamification.getAsesorState` — output: `{ xpTotal, currentStreak, level, badges, monthlyRank }`.
- `marketing.sharePropertyLink` — input: `{ proyectoId, contactoId, channel }` / output: `{ shortUrl, qrCodeUrl }`.

## Tablas BD tocadas

- `asesores` — SELECT (avatar, is_available), UPDATE (is_available).
- `contactos` — SELECT (global search).
- `proyectos` — SELECT (global search + share).
- `operaciones` — SELECT (KPIs pipeline + revenue).
- `busquedas` — SELECT (KPIs pipeline).
- `tareas` — SELECT (widget "tareas del día").
- `visitas` — INSERT (scheduleVisit).
- `home_alerts` — SELECT (6 tipos: whatsapp_desvinculado, visita_sin_confirmar, captacion_pendiente, curso_pendiente, continua_refiriendo, +dmx-specific).
- `timeline_entries` — INSERT (logCall).
- `notificaciones` — SELECT (badge count) + UPDATE (mark as read).
- `ai_generated_content` — SELECT (morning_briefing type).
- `asesor_gamification` — SELECT (widget).
- `audit_log` — INSERT (toggle availability).

## Estados UI

- **Loading**: skeleton shimmer para cada card (header/carousel/KPIs/insights/gamification). Header y sidebar renderizan inmediatamente.
- **Error**: `<ErrorBoundary />` por sección + retry button. Si falla Morning Briefing, mostrar mensaje "Estamos preparando tu resumen del día" + skeleton.
- **Empty**: carrusel muestra "Aún no tienes acciones pendientes — ¡empieza creando tu primer contacto!" CTA a `/asesores/contactos`. KPIs muestran `—` cuando no hay datos (nuevo asesor).
- **Success**: datos hidratados. KPIs con color semáforo (verde/amarillo/rojo según thresholds Pulppo adaptados). Carrusel auto-play cada 5s, pausable en hover.

## Thresholds KPI (Pulppo adaptados — labels DIRECTOS, no invertidos)

```
Consultas pendientes: <15 verde, 15-59 amarillo, ≥60 rojo
T. primera respuesta: <15 min verde, 15-59 amarillo, ≥60 rojo (SLA 3600s=60min)
T. respuesta promedio: <15 min verde, 15-59 amarillo, ≥60 rojo (SLA 7200s=120min)
Volumen interacciones semana: ≥10 Muchas verde, 4-10 Normal amarillo, <4 Pocas rojo
Sugerencias promedio: >15 verde, 10-15 regular, <10 rojo
Tasa visita: ≥75% verde, 50-74% regular, <50% rojo
Tasa oferta: ≥70% verde, 50-69% regular, <50% rojo
```
Horario hábil cómputo: 8am-8pm todos los días (ajustable por `asesores.preferred_timezone`).

## Validaciones Zod

```typescript
const toggleAvailabilityInput = z.object({
  available: z.boolean(),
  reason: z.string().max(200).optional(),
});

const scheduleVisitInput = z.object({
  contactoId: z.string().uuid(),
  proyectoId: z.string().uuid().optional(),
  unidadId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(240).default(60),
  notes: z.string().max(500).optional(),
});

const globalSearchInput = z.object({
  query: z.string().min(1).max(200),
  filters: z.object({
    types: z.array(z.enum(['contacto', 'proyecto', 'operacion', 'document'])).optional(),
    limit: z.number().int().min(1).max(50).default(20),
  }).optional(),
});
```

## Integraciones externas

- **Anthropic Claude Sonnet 4** — Morning Briefing generation (via Vercel AI Gateway).
- **OpenAI GPT-4o-mini** — Global search reranking con citations.
- **Supabase Realtime** — notif badge subscriptions (WebSocket).
- **Google Calendar API** — sync visitas agendadas (ADR-002).
- **Outlook Graph API** — fallback sync calendario.
- **Resend** — email notifs fallback.
- **PostHog** — track interacciones dashboard (A/B test posición KPIs).
- **Sentry** — error capture.

## Tests críticos

- [ ] Happy path: user loguea → dashboard renderiza en <1.5s LCP.
- [ ] Morning briefing se genera con citations verificables (no alucinaciones).
- [ ] Toggle availability persiste en BD + respeta notifs config.
- [ ] ⌘K abre palette, búsqueda funciona con debounce, navega correcto.
- [ ] Quick action "Llamada" crea timeline entry + otorga +10 XP.
- [ ] RLS: asesor sólo ve sus propios KPIs (no del equipo salvo manager con `permissions.dashboard.team=true`).
- [ ] Thresholds semáforo color-code correctamente según user locale (es-MX/es-CO/etc).
- [ ] Accessibility: keyboard nav completa, aria-labels en KPIs, focus visible.
- [ ] i18n: cero strings hardcoded — todo via `t('asesor.dashboard.*')`.
- [ ] Performance: widget gamification NO bloquea render si falla.
- [ ] Morning briefing rate limit: 3/día por asesor.
- [ ] Mobile PWA: layout colapsa a stack vertical, sidebars a bottom nav.

## i18n keys ejemplo

```tsx
// No hardcode:
<h1>{t('asesor.dashboard.greeting', { name: user.firstName, time: greetingTime })}</h1>
<Button>{t('asesor.dashboard.quickActions.call')}</Button>
<KpiCard label={t('asesor.dashboard.kpi.pendingInquiries')} value={n} threshold={{green: 15, yellow: 60}} />
```

## Referencia visual

Ver `/docs/referencias-ui/M1_Dashboard.tsx` (solo local, gitignored). El JSX Dopamine final del repo viejo mapea 1:1 al layout aquí especificado, con colores tint bgLavender, Card3D y carrusel "¿Qué debo hacer hoy?".

## Cross-references

- ADR-002 AI-Native Architecture (Copilot sidebar + ⌘K + RAG)
- ADR-003 Multi-Country Schema (`country_code` en asesores, `preferred_timezone`)
- ADR-008 Monetization (feature gating por plan)
- [03.5 Catálogo tRPC Procedures](../03_CATALOGOS/03.5_CATALOGO_TRPC_PROCEDURES.md) — `asesorCRM.*`, `gamification.*`, `search.*`
- [03.7 Catálogo Crons](../03_CATALOGOS/03.7_CATALOGO_CRONS.md) — `morning-briefing-generate`, `gamification-daily`
- [03.10 Features Registry](../03_CATALOGOS/03.10_CATALOGO_FEATURES_REGISTRY.md) — `feature:asesor:dashboard`
- [03.12 Notifs + Webhooks](../03_CATALOGOS/03.12_CATALOGO_NOTIFS_Y_WEBHOOKS.md) — 20 tipos notifs
- Módulos relacionados: M03 Contactos, M04 Búsquedas, M06 Tareas, M09 Estadísticas

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent H) | **Fecha:** 2026-04-17
