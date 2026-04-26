# 06 — Audit Estado Real M01-M20 (DOCS-ONLY)

> **Audit consolidado** del estado real de implementación de los 20 módulos funcionales DMX (M01-M20) cruzando:
> - Backend canon: `docs/biblia-v5/15_CONEXIONES_E2E_Dopamine_Backend.md` (frontend SUPERSEDED, backend canon)
> - Spec funcional: `docs/04_MODULOS/M01_*.md` … `M20_*.md`
> - Frontend canon nuevo: prototype JSX en `tmp/product_audit_input/DMX-prototype/` (formalizado en ADR-048)
> - BD live: Supabase project `qxfuqwlktmhokwwlvggy`
> - Código: `features/`, `app/`, `server/trpc/`, `shared/`, `supabase/migrations/`
>
> **Generado** en sub-bloque FASE 07.7.A.1 (2026-04-25) por consolidación de 4 sub-agents paralelos:
> - SA-Audit-M01-M05 (84 acciones · ~6%)
> - SA-Audit-M06-M10 (81 acciones · ~2%)
> - SA-Audit-M11-M16 (175 acciones · 8%)
> - SA-Audit-M17-M20 (67 acciones · ~10%)
>
> **Status legend** ∈ {✅ active / 🟡 parcial / 🔴 missing / ⚠️ stub-marked / 🔄 needs-prototype-port}

---

## Tabla de contenido

- [Resumen ejecutivo](#resumen-ejecutivo)
- [M01 Dashboard Asesor](#m01)
- [M02 Desarrollos](#m02)
- [M03 Contactos](#m03)
- [M04 Búsquedas](#m04)
- [M05 Captaciones](#m05)
- [M06 Tareas](#m06)
- [M07 Operaciones](#m07)
- [M08 Marketing](#m08)
- [M09 Estadísticas](#m09)
- [M10 Dashboard Dev](#m10)
- [M11 Inventario Dev](#m11)
- [M12 Contabilidad Dev](#m12)
- [M13 CRM Dev](#m13)
- [M14 Marketing Dev](#m14)
- [M15 Analytics Dev IE](#m15)
- [M16 Dashboard Admin](#m16)
- [M17 Market Observatory](#m17)
- [M18 Dashboard Comprador](#m18)
- [M19 Marketplace Público](#m19)
- [M20 Ficha Proyecto Personalizada](#m20)
- [Inconsistencias detectadas (cross-módulos)](#inconsistencias)
- [Recomendaciones de priorización](#priorizacion)

---

<a id="resumen-ejecutivo"></a>

## Resumen ejecutivo

### Totales agregados

| Métrica | Valor |
|---|---|
| Total acciones auditadas | **407** |
| ✅ active | **8** (~2%) |
| 🟡 parcial | **37** (~9%) |
| 🔴 missing | **360** (~88%) |
| ⚠️ stub-marked | **0** |
| 🔄 needs-prototype-port | **5 módulos completos** (M06-M10 sin overlap prototype JSX) |
| **% completion overall** | **~6.4%** ((8 ✅ + 0.5×37 🟡) / 407) |

### Distribución por sub-bloque

| Sub-bloque | Acciones | ✅ | 🟡 | 🔴 | % overall |
|---|---|---|---|---|---|
| M01-M05 (Asesor portal core) | 84 | 0 | 5 | 79 | ~5.95% |
| M06-M10 (Tareas/Ops/Marketing/Stats/DashDev) | 81 | 0 | 3 | 76 | ~2% |
| M11-M16 (Dev portal + Admin) | 175 | 5 | 18 | 152 | ~8% |
| M17-M20 (Observatory + Comprador + Public) | 67 | 3 | 11 | 53 | ~10% |

### Distribución por módulo (% completion individual)

| Módulo | % | Estado overall |
|---|---|---|
| M01 Dashboard Asesor | 0% | 🔴 greenfield |
| M02 Desarrollos | ~3% | 🔴 greenfield (con `project_scores` infra) |
| M03 Contactos | 0% | 🔴 greenfield |
| M04 Búsquedas | ~5% | 🔴 greenfield (con `ieScores` reutilizable) |
| M05 Captaciones | 0% | 🔴 greenfield |
| M06 Tareas | 0% | 🔴 greenfield |
| M07 Operaciones | ~5% | 🔴 greenfield (con `fx_rates` parcial) |
| M08 Marketing Asesor | 0% | 🔴 greenfield |
| M09 Estadísticas Asesor | 0% | 🔴 greenfield |
| M10 Dashboard Dev | 0% | 🔴 greenfield |
| M11 Inventario Dev | ~5% | 🔴 greenfield (con `zone_scores` para IE alerts) |
| M12 Contabilidad Dev | ~3% | 🔴 greenfield (con `fiscal_docs` partial) |
| M13 CRM Dev | 0% | 🔴 greenfield |
| M14 Marketing Dev | ~5% | 🔴 greenfield (con `zone_scores` para IECardEmbed) |
| M15 Analytics Dev IE | ~10% | 🔴 greenfield (con `zone_scores` 5267 rows + 5 triggers) |
| M16 Dashboard Admin | ~15% | 🟡 parcial (audit_log + role_features + ui_feature_flags + macro_series + market_anomalies todos backend listo) |
| M17 Market Observatory | 0% | 🔴 greenfield |
| M18 Dashboard Comprador | ~3% | 🔴 greenfield (con `zone_alert_subscriptions` + `lifepath_user_profiles`) |
| M19 Marketplace Público | ~35% | 🟡 parcial (`/indices`, `/metodologia`, `/atlas`, `/wrapped/[year]`, `public.submitNewsletter` ya producción) |
| M20 Ficha Proyecto Personalizada | 0% | 🔴 greenfield |

### Hallazgos cross-módulos críticos (top 5)

1. **El doc canon `15_CONEXIONES_E2E_Dopamine_Backend.md` documenta backend Pulppo-clone que NUNCA se aplicó al repo H1 actual.** Lista "✅ EXISTE" tablas/funciones/triggers/routers que la BD live no contiene. 240 tablas en `public.*` pero NINGUNA del dominio CRM Asesor (M01-M05). Esto crea falsa señal de progreso peligrosa para PM/sub-agents que interpretan canon como ground-truth. **Acción requerida:** banner SUPERSEDED frontend (ya aplicado por ADR-048) + nota que backend canon refleja Pulppo histórico, no estado actual H1.

2. **Numeración divergente catálogo módulos vs doc canon backend:**
   - `docs/04_MODULOS/` llama M08 Marketing Asesor / M09 Estadísticas / M10 Dashboard Dev.
   - `15_CONEXIONES_E2E_Dopamine_Backend.md` llama M9 Marketing / M10 Estadísticas (orden y contenido distintos).
   - Acción: ADR de canonización numeración antes de cualquier ejecución sub-bloque.

3. **Naming mismatches BD vs spec sin resolver:**
   - `fiscal_docs` (BD shipped) vs `fiscal_documents` (canon doc M07/M12).
   - `desarrolladoras` (BD shipped) vs `developers` (canon doc M10).
   - `macro_series` (BD shipped) vs `macro_indicators` (canon doc M16).
   - `market_anomalies` (BD shipped) vs `anomalies` (canon doc M15/M16).
   - `ui_feature_flags` (rename oficial migration `20260424220000`) vs `feature_registry`/`feature_flags` (canon doc M16).
   - `zone_alert_subscriptions` (BD shipped) vs `score_subscriptions` (canon doc M18).
   - `user_scores` schema (IE scores) ≠ `buyer_persona`/`budget`/`timeline` (canon doc M18 asume estos campos).
   - Acción: ADR de reconciliación naming pre-implementación M07/M12/M15/M16/M18 (founder decisión).

4. **Routers tRPC dominio CRM/dev/admin completamente ausentes:** `server/trpc/root.ts` registra ~38 routers (todos IE/atlas/STR/scoring/auth/observability). Cero routers `asesorCRM.*`, `developer.*`, `devCRM.*`, `devMarketing.*`, `fiscal.*`, `contabilidad.*`, `admin.*`, `gamification.*`, `notifications.*`, `matching.*`, `scrapers.*`, `legal.*`, `catalogos.*`, `marketing.*`, `operaciones.*`, `captacion.*`, `photos.*`, `tareas.*`, `observatory.*`, `comprador.*`, `public.*` (excepto submitNewsletter), `apartado.*`, `credit.*`, `familyAccount.*`, `visitas.*`, `referrals.*`, `wishlist.*`. Bloquea TODOS los módulos M01-M20 (excepto las 3 acciones M19 ya producción).

5. **Frontend canon prototype JSX cubre exclusivamente landing público / portal comprador (M19 70% / M18 25% / M17 5% / M20 10%).** Cero overlap con portales asesor (M01-M09) y dev/admin (M10-M16). Estos requieren build from scratch sobre tokens canon + primitives + sistema de design backoffice (a definir en sub-bloque futuro). 5 módulos M06-M10 marcados `🔄 needs-prototype-port` por bloque completo (no por acción individual).

### Infra reusable detectada (assets sólidos)

1. **`zone_scores` (5267 rows + 5 triggers + cascade webhook + score_change_deliveries)** — anclaje IE para M01 acción 9, M02 acción 11/13, M04 acción 10, M11 IE alerts, M14 IECardEmbed, M15 7 tabs analytics, M17 layer 5, M18 score alerts, M19 `/indices`. Multiplicador alto.
2. **Sistema permisos completo backend, cero UI** — `role_features` 432 + `ui_feature_flags` 120 + `profile_feature_overrides` 0 + `audit_log` particionado (12 partitions hasta 2026-08) + `role_requests` 0. Habilita feature gating + admin role matrix editor + audit log reader.
3. **`audit_log` particionado por mes hasta 2026-08** — 1 trigger activo (`trg_audit_profiles`). Cualquier mutation M01-M20 debe respetar este patrón Day 1.
4. **`fx_rates` + `desarrolladoras` + `addresses` + `agencies` + `broker_companies` + `plans` + `subscriptions` + `tenants_*`** — cimientos billing + multi-país + multi-org listos sin conexión a CRM aún.
5. **`fiscal_docs` migration `20260418060300` + audit triggers** — único anclaje M12 contabilidad (0 rows).
6. **`macro_series` particionado por año (2022..2030) con 880 rows reales** — listo para M16 macro dashboard.
7. **`market_anomalies` schema E04-ready** (cols `score_id`/`deviation_sigma`/`ack`/`ack_at`/`ack_by`) — listo M15/M16 anomaly detector.
8. **VIEW `public_profiles` (11 cols sin PII verificado)** — cierra SEC-01; `/asesores/[slug]` trivial backend.
9. **`/wrapped/[year]` ya producción** (FASE 11.J.2) — viral hook M19 acción 15 parcialmente ready.
10. **`features/lifepath/` + `lifepath_user_profiles`** — long-form quiz; decisión producto pendiente vs M18 Lifestyle Match Netflix-pattern.
11. **`features/ie/routes/scores.ts` `ieScoresRouter`** registrado — base reutilizable para `scores.getProjectScores` + `intelligence.getZoneScores`.
12. **`features/ia-generativa/routes/ai.ts` `aiRouter`** registrado — punto natural para `ai.generateMorningBriefing` + `ai.generateArgumentario` + `ai.generatePromocion` + `ai.classifyPhoto`.

### Funciones SQL canon ausentes (TOP critical missing)

Cero existen en routines actuales (verificado MCP):
- `get_asesor_dashboard`, `get_morning_briefing` (M01)
- `match_busqueda_inventario` (M04)
- `calculate_acm` (M05)
- `calculate_commission`, `generate_operation_code`, `generate_operation_documents` (M07)
- `generate_auto_tasks` (M06)
- `normalize_phone`, `check_duplicate_phone` (M03)
- `get_unit_stats_batch`, `get_asesor_performance` (M02/M09)

Cada una bloqueador de 2-5 acciones canon.

---


<a id="m01"></a>

## M01 — Dashboard Asesor (Command Center)

**Resumen ejecutivo módulo**
Feature dir esperada: `features/asesor/` (NOT_FOUND). Total acciones canon (biblia-v5 cap. 15 + M01 spec): **17 acciones**. % overall implementado: **0%** (zero UI, zero tRPC, zero BD CRM).

**Matriz de auditoría**

| # | Acción Frontend | UI Status | tRPC Procedure | Tabla BD (rows) | Cascada/Trigger | Audit Log | Prototype Comp | Overall | Evidence | Action Required |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Mostrar saludo + nombre + estado disponible | 🔴 NOT_FOUND | 🔴 NOT_FOUND (sin `me.getProfileFull` con `estado`) | 🟡 `profiles` (0 rows, falta col `estado` CHECK disponible/no_disponible/en_visita) | 🟡 `trg_audit_profiles` activo INSERT/UPDATE/DELETE | ✅ via trg_audit_profiles | 🔴 N/A (prototype es landing pública) | 🔴 missing | `find app -iname "*asesor*"` → solo extension+api-keys; col `estado` NOT_FOUND en `\d profiles` | Crear `features/asesor/components/DashboardHeader.tsx`; ALTER profiles ADD COLUMN estado; crear procedure `asesorCRM.getDashboardSummary` |
| 2 | KPI Pipeline activo (count busquedas activas) | 🔴 NOT_FOUND | 🔴 NOT_FOUND `asesorCRM.getBusquedas` | 🔴 tabla `busquedas` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | grep root.ts:0 hits asesorCRM | Crear schema `busquedas` + RLS + router asesorCRM + KpiCard |
| 3 | KPI Contactos este mes | 🔴 NOT_FOUND | 🔴 NOT_FOUND `asesorCRM.getContactos` | 🔴 tabla `contactos` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | tabla contactos no figura en lista de 240 tablas public | Schema contactos (FASE 13 según M01 header) |
| 4 | KPI Operaciones activas | 🔴 NOT_FOUND | 🔴 NOT_FOUND `asesorCRM.getOperaciones` | 🔴 tabla `operaciones` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | tabla operaciones no existe | Bloqueado por schema operaciones |
| 5 | KPI Revenue mes (función SQL) | 🔴 NOT_FOUND | 🔴 NOT_FOUND | 🔴 función `get_asesor_dashboard` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | query routines retornó 0 | Crear función SQL + KpiCard |
| 6 | KPI Visitas semana | 🔴 NOT_FOUND | 🔴 NOT_FOUND `asesorCRM.getVisitasProgramadas` | 🔴 tabla `visitas_programadas` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema visitas_programadas + tRPC |
| 7 | KPI Comisión pendiente | 🔴 NOT_FOUND | 🔴 NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Bloqueado por operaciones.estado_cobro |
| 8 | Insights IA Morning Briefing | 🔴 NOT_FOUND `<MorningBriefing />` | 🔴 NOT_FOUND `ai.generateMorningBriefing` (router `ai` existe pero sin esta procedure — ver `features/ia-generativa/routes/ai.ts`) | 🔴 tabla `ai_generated_content` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | grep `generateMorningBriefing` → 0 | Crear procedure + cron `morning-briefing-generate` + tabla |
| 9 | Insight Mercado (zone scores) | 🔴 NOT_FOUND `<InsightCard />` | 🟡 `ieScores` router existe pero sin `intelligence.getZoneScores` específico para insight cards | ✅ `zone_scores` (5267 rows) | ✅ `trg_zone_scores_cascade_*` x4 + `trg_zone_scores_webhook_emit` | 🔴 N/A | 🔴 N/A | 🟡 parcial | MCP count zone_scores=5267; grep ieScores hits | Reutilizar ieScores router; crear `<InsightCard variant="market" />` |
| 10 | Insight Personal (gamification) | 🔴 NOT_FOUND | 🔴 NOT_FOUND `gamification.getAsesorState` (router gamification no existe) | 🔴 tabla `asesor_gamification` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | root.ts no importa gamificationRouter | Schema asesor_gamification + router + widget |
| 11 | Quick Action Registrar llamada | 🔴 NOT_FOUND `<QuickActionButton />` | 🔴 NOT_FOUND `asesorCRM.logCall` / `createTimelineEntry` | 🔴 tablas `actividad_timeline`, `timeline_entries` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Crear schema + procedure + UI |
| 12 | Quick Action Programar visita | 🔴 NOT_FOUND `<ScheduleVisitDialog />` | 🔴 NOT_FOUND `asesorCRM.scheduleVisit` | 🔴 tabla `visitas` / `visitas_programadas` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema + procedure + dialog |
| 13 | Quick Action Compartir propiedad | 🔴 NOT_FOUND `<ShareProjectDialog />` | 🔴 NOT_FOUND `marketing.sharePropertyLink` (router marketing no existe) | 🔴 tabla `busqueda_proyectos` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | grep marketing router → 0 | Router marketing + tabla + dialog |
| 14 | Toggle disponibilidad header | 🔴 NOT_FOUND `<AvailabilityToggle />` | 🔴 NOT_FOUND `asesorCRM.toggleAvailability` | 🟡 profiles existe pero sin col `estado` / `is_available` | 🟡 trg_audit_profiles capturaría UPDATE | ✅ partial via trg_audit_profiles | 🔴 N/A | 🔴 missing | `\d profiles` no muestra col estado | ALTER profiles + procedure + toggle UI |
| 15 | Gamification bar XP+streak+level | 🔴 NOT_FOUND `<GamificationWidget />` | 🔴 NOT_FOUND `gamification.getAsesorState` | 🔴 NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Bloqueado por schema gamification |
| 16 | Notificaciones badge realtime | 🔴 NOT_FOUND `<NotificationsBadge />` | 🔴 NOT_FOUND `notifications.getUnreadCount` | 🔴 tabla `notificaciones` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema notificaciones + Realtime channel + badge |
| 17 | Búsqueda global ⌘K | 🔴 NOT_FOUND `<CommandPalette />` | 🔴 NOT_FOUND `search.globalSearch` | 🔴 N/A (depende contactos+busquedas+operaciones) | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | grep cmdk → 0 | Bloqueado por schema CRM completo |

**Gaps módulo (priorizados)**
- P0 (crítico bloqueante): schema BD (`contactos`, `busquedas`, `operaciones`, `visitas_programadas`, `actividad_timeline`, `notificaciones`, `asesor_gamification`, `tareas`, `home_alerts`, `ai_generated_content`).
- P0: ampliar `profiles` con cols `estado`, `is_available`, `xp_total`.
- P1: router tRPC `asesorCRM` con 8+ procedures iniciales (getDashboardSummary, getKpis, toggleAvailability, logCall, scheduleVisit, getUnreadNotifCount, globalSearch).
- P1: feature-slice `features/asesor/` completa (12 components definidos en M01 spec).
- P2: cron `morning-briefing-generate` + integración Anthropic Claude vía Vercel AI Gateway.
- P2: WebSocket Supabase Realtime para notif badge.

**Frontend canon prototype mapping**
Ningún prototype JSX cubre M01. La landing pública (Hero, ColoniasBento, PropertyListings, IntelligenceEngine, etc.) es para visitante anónimo / comprador, no para asesor logueado. **El portal Asesor no tiene prototype Dopamine en `tmp/product_audit_input/`** — habrá que generarlo o portar desde el repo viejo (M01 referencia `/docs/referencias-ui/M1_Dashboard.tsx` gitignored local que no está en repo).

---

<a id="m02"></a>

## M02 — Desarrollos (Inventario del Asesor)

**Resumen ejecutivo módulo**
Feature dir esperada: `features/desarrollos/` (NOT_FOUND). Total acciones canon: **14 acciones** (biblia-v5 cap. 15 lista 14 + M02 spec añade exclusividad X-Y-Z, assets marketing, ACM tooltip). % overall: **~3%** (sólo `project_scores` y `zone_scores` existen como infraestructura IE; tablas core `projects`/`proyectos`, `unidades`, `prototipos`, `fotos` NO existen).

**Matriz de auditoría**

| # | Acción Frontend | UI Status | tRPC Procedure | Tabla BD (rows) | Cascada/Trigger | Audit Log | Prototype Comp | Overall | Evidence | Action Required |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Lista de proyectos cards | 🔴 NOT_FOUND `<ProyectoCard />` | 🔴 NOT_FOUND `developer.listProjectsForAsesor` | 🔴 tablas `projects`/`proyectos` + `unidades` + `fotos` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🟡 `PropertyListings.jsx` existe (260 LOC) — UX similar pero datos hardcoded mock | 🔴 missing | grep developer router → 0; tabla projects no existe | Schema + router developer + ProyectoCard.tsx (puede portar layout de PropertyListings.jsx) |
| 2 | Filtrar por alcaldía | 🔴 NOT_FOUND `<FiltersSidebar />` | 🔴 NOT_FOUND filtro WHERE alcaldia | 🔴 col projects.alcaldia NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema projects con cols alcaldia + idx_projects_alcaldia |
| 3 | Filtrar por tipo (departamento/casa/loft/penthouse/townhouse/mixto) | 🔴 NOT_FOUND | 🔴 NOT_FOUND | 🔴 col tipo_vivienda CHECK NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema + CHECK |
| 4 | Filtrar por etapa proyecto (planeación/preventa/.../entregado) | 🔴 NOT_FOUND | 🔴 NOT_FOUND | 🔴 col etapa_proyecto NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema + CHECK |
| 5 | Ver detalle proyecto (83 cols) | 🔴 NOT_FOUND `<ProyectoDetailPage />` | 🔴 NOT_FOUND `developer.getProjectById` | 🔴 NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema completo + page route + tabs Overview/Unidades/Galería/Documentos/IE Scores/Competencia |
| 6 | Ver inventario unidades (estado disponible/reservado/vendido) | 🔴 NOT_FOUND `<UnidadesList />` | 🔴 NOT_FOUND `developer.getProjectUnits` | 🔴 tabla `unidades` (30 cols esperadas) NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema unidades + CHECK estado + Realtime channel |
| 7 | Ver prototipos | 🔴 NOT_FOUND | 🔴 NOT_FOUND `developer.getPrototipos` | 🔴 tabla `prototipos` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema prototipos |
| 8 | Ver esquemas de pago | 🔴 NOT_FOUND | 🔴 NOT_FOUND `developer.getEsquemasPago` | 🔴 tablas `esquemas_pago` + `precios_unidad` + `unidad_esquema_desglose` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema + procedure |
| 9 | Galería fotos | 🔴 NOT_FOUND | 🔴 NOT_FOUND `photos.getProjectPhotos` | 🔴 tabla `fotos`/`photos` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema fotos + Storage policies + hook useProjectPhotos |
| 10 | Avance de obra | 🔴 NOT_FOUND | 🔴 NOT_FOUND `developer.getAvanceObra` | 🔴 tabla `avance_obra` + `avance_obra_log` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema + procedure |
| 11 | Ver IE scores del proyecto | 🔴 NOT_FOUND `<IEScoreInline />` | 🟡 `ieScores` router existe (`features/ie/routes/scores.ts`) — usable | ✅ `project_scores` (0 rows actualmente, infraestructura presente) | ✅ `trg_project_scores_cascade_*` x4 + archive | 🔴 N/A para inserts (depende project_id válido) | 🔴 N/A | 🟡 parcial | root.ts línea 61 importa `ieScoresRouter` | Crear `<IEScoreInline />` consumiendo ieScores; poblar project_scores en sesiones IE 08+ |
| 12 | Ver competidores | 🔴 NOT_FOUND | 🔴 NOT_FOUND `developer.getCompetitors` | 🔴 tabla `project_competitors` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema + procedure |
| 13 | Score badges en cards (DMX Score, Absorption) | 🔴 NOT_FOUND | 🟡 `ieScores.getProjectScores` reutilizable | ✅ project_scores schema OK (score_type, score_value, level, tier, components jsonb) | ✅ cascada existe | 🔴 N/A | 🔴 N/A | 🟡 parcial | MCP \d project_scores OK | Solo UI binding pendiente cuando datos lleguen |
| 14 | Broker alliance badge + comisión | 🔴 NOT_FOUND `<ExclusividadBadge />` | 🔴 NOT_FOUND `developer.getExclusividad` | 🔴 cols `projects.broker_alliance` + `broker_commission_pct` NOT_FOUND; tabla `exclusividad_acuerdos` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema projects + tabla acuerdos + badge X-Y-Z |
| 15 (M02 spec) | Quality Score badges descriptivos directos (Competitivo/Moderado/FueraMercado/SinACM) | 🔴 NOT_FOUND `<QualityScoreBadge />` | 🔴 NOT_FOUND `scores.getACM` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | UI + procedure + tabla acm_results |
| 16 (M02 spec) | Assets marketing 5 variantes (postCuadrado/postLargo/story/videoStory/video) | 🔴 NOT_FOUND `<AssetsMenu />` | 🔴 NOT_FOUND `marketing.getAssetsForProject` | 🔴 tabla `marketing_assets` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Router marketing + Storage TTL para video ≤24h |

**Gaps módulo (priorizados)**
- P0: schema completo BD desarrollos (projects + unidades + prototipos + fotos + esquemas_pago + avance_obra + project_competitors + exclusividad_acuerdos + marketing_assets + acm_results). ~10 tablas nuevas.
- P0: tRPC routers `developer` (~13 procedures), `marketing`, `scores.getACM`.
- P1: feature-slice `features/desarrollos/` completa (9 components M02 spec).
- P1: integraciones Mapbox GL JS + Supabase Realtime + Storage TTL.
- P2: AI Vision para classify photos (M05 también lo usa).

**Frontend canon prototype mapping**
- `PropertyListings.jsx` (260 LOC) — UX inspiración para `<ProyectoCard />` y grid layout. Datos hardcoded (PROPS array con LIV/MOV/SEC scores, gradient photos placeholders, asesor avatar gradient). 🔄 needs-prototype-port: extraer estilos visuales (carrusel 3 fotos por card, score chips, gradient placeholders) → `ProyectoCard.tsx`.
- `MapOverlay.jsx` (35 LOC) — fragmento de mapa stylizado, podría inspirar minimap del detail.
- `IntelligenceEngine.jsx` (76 LOC) — sección hero con scores stack; reutilizable para sección IE Scores en detail page.

---

<a id="m03"></a>

## M03 — Contactos

**Resumen ejecutivo módulo**
Feature dir esperada: `features/contactos/` (NOT_FOUND). Total acciones canon: **12 acciones** (biblia-v5) + 5 acciones spec adicionales (Argumentario AI, bulk actions, anti-duplicados, FTS, 3-niveles notas). % overall: **0%**.

**Matriz de auditoría**

| # | Acción Frontend | UI Status | tRPC Procedure | Tabla BD (rows) | Cascada/Trigger | Audit Log | Prototype Comp | Overall | Evidence | Action Required |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Lista contactos con filtros (temperatura/tipo/tags) | 🔴 NOT_FOUND `<ContactosList />` | 🔴 NOT_FOUND `asesorCRM.listContactos` | 🔴 tabla `contactos` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | tabla contactos no existe en lista de 240 tablas | Schema completo + 5 RLS policies + idx_contactos_asesor + virtual list |
| 2 | Búsqueda FTS por nombre/tel/email | 🔴 NOT_FOUND | 🔴 NOT_FOUND `asesorCRM.searchContactos` | 🔴 col `search_vector` GIN NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema con generated col search_vector tsvector + idx GIN + trigger update |
| 3 | Ver detalle contacto (info personal) | 🔴 NOT_FOUND `<ContactoDetailPage />` | 🔴 NOT_FOUND `asesorCRM.getContactoById` | 🔴 NOT_FOUND (esperado: first_name + last_name + phones jsonb[] + emails jsonb[]) | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema + 4 tabs page (Info/Timeline/Búsquedas/Notas) |
| 4 | Cambiar temperatura (frio/tibio/caliente/cliente) | 🔴 NOT_FOUND `<TemperaturaSelector />` | 🔴 NOT_FOUND `asesorCRM.updateContacto` | 🔴 col temperatura CHECK NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema + CHECK + UI dropdown |
| 5 | Ver DISC Profile badge | 🔴 NOT_FOUND | 🔴 NOT_FOUND | 🔴 tabla `disc_profiles` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing — adicionalmente NOTA: M03 spec dice "schema limpio NO heredado de Pulppo/DISC" así que DISC NO debería implementarse según rewrite | — | Decisión producto: ¿DISC entra o no? Spec M03 dice NO. Biblia v5 sí lista. Conflicto a resolver. |
| 6 | Ver timeline (notas/llamadas/emails) | 🔴 NOT_FOUND `<TimelineEntry />` | 🔴 NOT_FOUND | 🔴 tabla `actividad_timeline`/`timeline_entries` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema timeline_entries (entity_type polimorfico) + UI |
| 7 | Ver búsquedas vinculadas (tab) | 🔴 NOT_FOUND | 🔴 NOT_FOUND | 🔴 tabla busquedas NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Bloqueado por schema busquedas (M04) |
| 8 | Ver operaciones del contacto | 🔴 NOT_FOUND | 🔴 NOT_FOUND | 🔴 tabla operaciones NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Bloqueado por operaciones |
| 9 | Crear contacto nuevo (anti-duplicados) | 🔴 NOT_FOUND `<ContactoForm />` | 🔴 NOT_FOUND `asesorCRM.createContacto` | 🔴 NOT_FOUND (esperado: trigger check_duplicate_phone + update_contactos_search + xp_contacto_creado) | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | función `normalize_phone` NOT_FOUND en routines | Schema + 3 triggers + función SQL normalize_phone (libphonenumber lógica) + unique idx normalized_phone |
| 10 | Editar contacto | 🔴 NOT_FOUND | 🔴 NOT_FOUND `asesorCRM.updateContacto` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Procedure update + UI form |
| 11 | Toggle poder_compra_verificado + presupuesto | 🔴 NOT_FOUND | 🔴 NOT_FOUND | 🔴 cols NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema cols boolean + numeric + UI |
| 12 | Tags management (text[] array) | 🔴 NOT_FOUND `<TagsMultiSelect />` | 🔴 NOT_FOUND | 🔴 col tags text[] NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema + UI creatable tags + autocomplete |
| 13 (M03 spec) | Argumentario AI inline (C02) | 🔴 NOT_FOUND `<ArgumentarioDialog />` | 🔴 NOT_FOUND `ai.generateArgumentario` | 🔴 tabla `ai_generated_content` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema + procedure RAG + Anthropic Claude + citations inline |
| 14 (M03 spec) | Bulk actions (export CSV / cambiar temp / añadir tag / soft delete) | 🔴 NOT_FOUND `<BulkActionsBar />` | 🔴 NOT_FOUND `asesorCRM.bulkUpdate` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Procedure + UI sticky bar |
| 15 (M03 spec) | Notas contacto 3 niveles visibility (privada/inmobiliaria/dmx) | 🔴 NOT_FOUND | 🔴 NOT_FOUND `asesorCRM.addContactoNote` | 🔴 tabla `contacto_notes` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema + RLS visibility + UI radio + editor |
| 16 (M03 spec) | Phone duplicate check pre-submit | 🔴 NOT_FOUND `<DuplicateWarning />` | 🔴 NOT_FOUND `asesorCRM.checkDuplicate` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Procedure consulta normalize_phone + unique idx |
| 17 (M03 spec) | Cross-agency historial contacto | 🔴 NOT_FOUND | 🔴 NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Permission feature `contactos.cross_agency` + procedure anonimizado |

**Gaps módulo (priorizados)**
- P0: schema `contactos` con generated col `normalized_phone` + GIN search_vector + 3 triggers (check_duplicate_phone, update_contactos_search, xp_contacto_creado).
- P0: tablas dependientes (`timeline_entries`, `contacto_notes`, `ai_generated_content`).
- P0: tRPC `asesorCRM` con 9+ procedures contactos.
- P0: feature `features/contactos/` (12 components M03 spec).
- P1: PhoneInput primitive con libphonenumber-js multi-country.
- P1: integración WhatsApp Business API + Resend para acciones desde detail.
- P2: Argumentario AI procedure con RAG (depende de embeddings + AI Gateway).
- Decisión producto pendiente: DISC sí o no (spec M03 dice NO, biblia v5 cap.15 lista disc_profiles → conflict).

**Frontend canon prototype mapping**
Ningún prototype JSX cubre M03 contactos. Los 17 JSX son landing pública.

---

<a id="m04"></a>

## M04 — Búsquedas (Pipeline Comprador)

**Resumen ejecutivo módulo**
Feature dir esperada: `features/busquedas/` (NOT_FOUND). Total acciones canon: **12 acciones** (biblia-v5) + 7 acciones spec adicionales (drag&drop validado HARD, wizard ofertar 6 pasos, pegar liga, notas 3 niveles, cross-agency, lead score badge, fuente contacto 17 opciones MX). % overall: **0%**.

**Matriz de auditoría**

| # | Acción Frontend | UI Status | tRPC Procedure | Tabla BD (rows) | Cascada/Trigger | Audit Log | Prototype Comp | Overall | Evidence | Action Required |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Pipeline Kanban 6+1 columnas | 🔴 NOT_FOUND `<BusquedasKanban />` | 🔴 NOT_FOUND `asesorCRM.getBusquedas` | 🔴 tabla `busquedas` NOT_FOUND (esperado etapa CHECK 7 vals español) | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema + dnd-kit |
| 2 | Drag & drop cambiar etapa con validaciones HARD | 🔴 NOT_FOUND | 🔴 NOT_FOUND `asesorCRM.updateBusquedaEtapa` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Procedure con HARD validations server-side (visita ≥1 para Visitando, etc.) |
| 3 | Crear búsqueda nueva (form criterios) | 🔴 NOT_FOUND `<BusquedaForm />` | 🔴 NOT_FOUND `asesorCRM.createBusqueda` | 🔴 NOT_FOUND tablas `busquedas` + `busqueda_preferences` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema + wizard 5 pasos |
| 4 | Matching /suggested (10 propiedades) | 🔴 NOT_FOUND `<SuggestedMatches />` | 🔴 NOT_FOUND `matching.runSuggest` | 🔴 tablas `match_results`, `busqueda_propiedades` NOT_FOUND; función `match_busqueda_inventario` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Función SQL + procedure + UI ranked list |
| 5 | Compartir proyecto con cliente | 🔴 NOT_FOUND | 🔴 NOT_FOUND | 🔴 tabla `busqueda_proyectos` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema + procedure share |
| 6 | Programar visita desde detalle | 🔴 NOT_FOUND | 🔴 NOT_FOUND | 🔴 tabla `visitas_programadas` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema + Google Calendar sync (ADR-002) |
| 7 | Registrar feedback visita (cascada B03/C04) | 🔴 NOT_FOUND | 🔴 NOT_FOUND | 🔴 tabla `interaction_feedback` + col feedback_interest NOT_FOUND; trigger `trg_feedback_cascade` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema + trigger cascada B03/C04 |
| 8 | Historial precios (cambios presupuesto) | 🔴 NOT_FOUND | 🔴 NOT_FOUND | 🔴 tabla `busqueda_historial_precio` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema + audit trail UI |
| 9 | Contactos vinculados (many-to-many co-comprador) | 🔴 NOT_FOUND | 🔴 NOT_FOUND | 🔴 tabla `busqueda_contactos` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema con rol CHECK |
| 10 | Comparador 2-5 proyectos | 🔴 NOT_FOUND | 🟡 `ieScores` reutilizable para scores side-by-side | ✅ project_scores schema OK | ✅ cascada existe | 🔴 N/A | 🔴 N/A | 🟡 parcial UI faltante | ieScores router OK | UI compare component |
| 11 | Filtros pipeline (prioridad/fuente/zona) | 🔴 NOT_FOUND | 🔴 NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema cols + UI filters bar |
| 12 | Métricas superiores ($ pipeline, conversion) | 🔴 NOT_FOUND | 🔴 NOT_FOUND `asesorCRM.getPipelineMetrics` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Procedure aggregate |
| 13 (M04 spec) | Wizard Ofertar 6 pasos | 🔴 NOT_FOUND `<WizardOfertar />` | 🔴 NOT_FOUND `operaciones.createOperacion` | 🔴 tabla operaciones + triggers (calculate_commission, generate_operation_code, generate_operation_documents) NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema operaciones + 4 triggers + stepper UI |
| 14 (M04 spec) | "Pegar liga" parser EasyBroker/ML/Inmuebles24 | 🔴 NOT_FOUND `<PegarLigaInput />` | 🔴 NOT_FOUND `scrapers.parseExternalListing` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Router scrapers + parsers + UI input |
| 15 (M04 spec) | Notas búsqueda 3 niveles visibility | 🔴 NOT_FOUND `<BusquedaNotesTab />` | 🔴 NOT_FOUND `asesorCRM.addBusquedaNote` | 🔴 tabla `busqueda_notes` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema + RLS visibility + UI |
| 16 (M04 spec) | Cross-agency history (anonimizado) | 🔴 NOT_FOUND `<CrossAgencyHistoryPanel />` | 🔴 NOT_FOUND `asesorCRM.getCrossAgencyHistory` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Procedure con anonimización + UI side panel |
| 17 (M04 spec) | Lead Score C01 badge | 🔴 NOT_FOUND | 🔴 NOT_FOUND `scores.getLeadScore` | 🔴 tabla `lead_scores` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema lead_scores + scoring engine + badge |
| 18 (M04 spec) | Fuente contacto 17 opciones MX (Inmuebles24/Facebook/.../tiktok/otro) | 🔴 NOT_FOUND `<FuenteContactoSelector />` | 🔴 NOT_FOUND CHECK constraint | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema CHECK + UI selector + i18n |
| 19 (M04 spec) | Validation error dialog HARD rules | 🔴 NOT_FOUND `<ValidationErrorDialog />` | 🔴 server-side validation | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | UI + retorno error tipado tRPC |

**Gaps módulo (priorizados)**
- P0: schema BD core (`busquedas`, `busqueda_preferences`, `busqueda_notes`, `busqueda_proyectos`, `busqueda_propiedades`, `busqueda_contactos`, `busqueda_historial_precio`, `visitas_programadas`, `interaction_feedback`, `match_results`, `lead_scores`, `operaciones`).
- P0: 4+ triggers (calculate_commission, generate_operation_code, generate_operation_documents, trg_feedback_cascade).
- P0: función SQL `match_busqueda_inventario`.
- P0: feature `features/busquedas/` + `features/operaciones/` (10+ components M04 spec).
- P1: dnd-kit integration con keyboard support.
- P1: scrapers EasyBroker/ML/Inmuebles24 (riesgo de bloqueo legal/ToS — validar con founder).
- P2: integración Google Calendar (ADR-002).

**Frontend canon prototype mapping**
- `ColoniaComparator.jsx` (291 LOC) — UX inspiración para "Comparador de proyectos" (acción 10) — UI side-by-side con métricas, podría adaptarse al detail page de Búsquedas.
- `ColoniasBento.jsx` (249 LOC) — bento grid layout con scoring, podría inspirar el panel "Sugerencias" (matching results).
- `SearchBar.jsx` (39 LOC) — input search con sugerencias, reusable para filtro pipeline.
Resto no aplica (Hero/Footer/etc).

---

<a id="m05"></a>

## M05 — Captaciones (Pipeline Vendedor/Propietario)

**Resumen ejecutivo módulo**
Feature dir esperada: `features/captaciones/` (NOT_FOUND). Total acciones canon: **9 acciones** (biblia-v5) + 8 acciones spec adicionales (mínimo dirección+tipo+precio para crear, editor 6 secciones, ACM auto, acuerdo comercial Mifiel, cerrar captación irreversible, cascada por etapa, menú 8 acciones, catálogos filtrados country+type). % overall: **0%**.

**Matriz de auditoría**

| # | Acción Frontend | UI Status | tRPC Procedure | Tabla BD (rows) | Cascada/Trigger | Audit Log | Prototype Comp | Overall | Evidence | Action Required |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Pipeline Kanban 6 etapas (Pendiente/Seguimiento/Encuentro/Valuación/Documentación/Captado) | 🔴 NOT_FOUND `<CaptacionesKanban />` | 🔴 NOT_FOUND `asesorCRM.getCaptaciones` | 🔴 tabla `captaciones` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema captaciones (21 cols esperadas) + dnd-kit |
| 2 | Crear captación rápida MIN (dirección+tipo+precio) | 🔴 NOT_FOUND `<NuevaCaptacionDialog />` | 🔴 NOT_FOUND `asesorCRM.createCaptacion` | 🔴 NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema + Zod min validation + UI submit-disabled hasta los 3 campos |
| 3 | Vincular contacto propietario | 🔴 NOT_FOUND | 🔴 NOT_FOUND | 🔴 col captaciones.contacto_id NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema FK + picker UI |
| 4 | Vincular propiedad secundaria (47 cols) | 🔴 NOT_FOUND | 🔴 NOT_FOUND | 🔴 tabla `propiedades_secundarias` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema enorme (47 cols) + UI publish flow |
| 5 | Solicitar ACM (valuación auto) | 🔴 NOT_FOUND `<ACMDisplay />` | 🔴 NOT_FOUND `scores.calculateACM` | 🔴 tabla `acm_valuaciones`/`acm_results` NOT_FOUND; función `calculate_acm` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Función SQL + procedure + chart UI side-by-side solicitado/sugerido/salida |
| 6 | Documentación status tracker | 🔴 NOT_FOUND | 🔴 NOT_FOUND | 🔴 col `documentacion_status` NOT_FOUND; tabla `captacion_documentos` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema CHECK status + checklist UI |
| 7 | Fotos propiedad (drag&drop + classify AI) | 🔴 NOT_FOUND `<GaleriaUploader />` | 🔴 NOT_FOUND `photos.uploadPropSec` + `ai.classifyPhoto` | 🔴 tabla `propiedades_secundarias_fotos` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema + Storage + OpenAI Vision |
| 8 | Cambiar etapa (drag o button) con validaciones | 🔴 NOT_FOUND | 🔴 NOT_FOUND `asesorCRM.updateCaptacionEtapa` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Procedure + special: etapa='perdida' requiere motivo_perdida obligatorio |
| 9 | Encuentros counter | 🔴 NOT_FOUND | 🔴 NOT_FOUND | 🔴 cols encuentros_count + ultimo_encuentro NOT_FOUND; tabla `captacion_encuentros` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema + UI lista encuentros |
| 10 (M05 spec) | Editor 6 secciones (Ubicación cascada / Caracts / Operación / Promoción AI / Interna / Galería) | 🔴 NOT_FOUND `<CaptacionEditor />` | 🔴 NOT_FOUND `asesorCRM.updateCaptacionData` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | UI accordion 6 sections + INEGI/DANE/INDEC/IBGE/INE geocoders |
| 11 (M05 spec) | Ubicación cascada País→Estado→Ciudad→Colonia | 🔴 NOT_FOUND `<UbicacionCascade />` | 🔴 NOT_FOUND | 🔴 catálogos NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema catálogos + INEGI integration + UI cascade selects |
| 12 (M05 spec) | Promoción AI generator (título + descripción) | 🔴 NOT_FOUND `<PromocionAIGenerator />` | 🔴 NOT_FOUND `ai.generatePromocion` | 🔴 tabla `ai_generated_content` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Procedure Anthropic + UI button + citations |
| 13 (M05 spec) | Acuerdo Comercial (slider 1-10% + exclusividad 0/3/6/9/12m + Mifiel firma) | 🔴 NOT_FOUND `<AcuerdoComercialPanel />` | 🔴 NOT_FOUND `legal.createAcuerdoComercial` | 🔴 tabla `captacion_acuerdos` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Router legal + Mifiel envelope + NOM-151 timestamping + UI |
| 14 (M05 spec) | Cerrar captación irreversible (typing CERRAR) | 🔴 NOT_FOUND `<CerrarCaptacionDialog />` | 🔴 NOT_FOUND `asesorCRM.closeCaptacion` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Procedure con Zod refine confirmText='CERRAR' + motivo CHECK |
| 15 (M05 spec) | Menú ··· 8 acciones (kebab) | 🔴 NOT_FOUND `<CaptacionMenu />` | 🔴 NOT_FOUND multiple procedures | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | UI dropdown + procedures: shareRadar, changeStage, listEncuentros, createTask, addNote, publishProperty, duplicate, close |
| 16 (M05 spec) | Catálogos filtrados country+type (17 tipos / 47 amenidades / 42 espacios) | 🔴 NOT_FOUND | 🔴 NOT_FOUND `catalogos.getByCountryAndType` | 🔴 tablas `catalogos_tipos`, `catalogos_amenidades`, `catalogos_espacios` NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Schema 3 catalog tables + seed multi-country + procedure |
| 17 (M05 spec) | Publish as property (Quality Score ≥70 → projects, <70 → propiedades_secundarias) | 🔴 NOT_FOUND | 🔴 NOT_FOUND `captacion.publishAsProperty` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Procedure routing logic + seed Quality Score thresholds |
| 18 (M05 spec) | Duplicar captación (clone para múltiples unidades mismo edificio) | 🔴 NOT_FOUND | 🔴 NOT_FOUND `asesorCRM.duplicateCaptacion` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 missing | — | Procedure clone + UI toast |

**Gaps módulo (priorizados)**
- P0: schema BD captaciones core (`captaciones`, `captacion_seguimientos`, `captacion_encuentros`, `captacion_valuaciones`, `captacion_documentos`, `captacion_acuerdos`, `propiedades_secundarias`, `propiedades_secundarias_fotos`, `acm_valuaciones`, `catalogos_tipos`, `catalogos_amenidades`, `catalogos_espacios`).
- P0: función SQL `calculate_acm` consumiendo zone_scores + comparables.
- P0: feature `features/captaciones/` (11 components M05 spec).
- P1: integración Mifiel (NOM-151) — flow firma digital + PDF storage. **Nota founder regla "verificar antes de gasto":** Mifiel cobra por envelope; validar pricing + sandbox ANTES de hardcodear.
- P1: integraciones geocoder INEGI/DANE/INDEC/IBGE/INE (incident AirROI: validar empírico costo/limit ANTES de hardcodear).
- P1: OpenAI Vision para classify photos.
- P2: Anthropic Claude para promoción AI + título/descripción.

**Frontend canon prototype mapping**
Ningún prototype JSX cubre M05 captaciones. Los 17 JSX son landing pública (compradores). M05 es flujo asesor↔propietario, no comprador.

---

<a id="m06"></a>

## M06 — Tareas

**Resumen ejecutivo módulo**
- Carpeta esperada `features/tareas/` — `NOT_FOUND` (verificado con `find features -type d -name "tareas"`).
- Total acciones canon (sección M6 backend doc): **8** — todas marcadas como ✅ EXISTE en doc canon, pero la realidad BD lo desmiente.
- % overall implementación real: **0% UI · 0% tRPC · 0% BD · 100% audit_log infra cross-cutting**.

**Matriz de auditoría**

| # | Acción Frontend | UI Status | tRPC Procedure | Tabla BD (rows) | Cascada/Trigger | Audit Log | Prototype Comp | Overall | Evidence | Action Required |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Lista tareas con filtros (status, type, priority) | 🔴 NOT_FOUND | 🔴 `asesorCRM.getTareas` no existe | 🔴 `tareas` NOT_FOUND | 🔴 N/A | ✅ infra disponible | 🔴 ningún JSX | 🔴 missing | grep features/tareas → vacío; root.ts no registra `asesorCRM`; MCP `SELECT FROM information_schema.tables WHERE table_name='tareas'` → 0 rows | Crear feature completa `features/tareas/` + migration `tareas` + router `asesorCRM` |
| 2 | Filtro por type (property/capture/search/client/lead/general) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 columna no existe | 🔴 N/A | N/A | 🔴 | 🔴 missing | mismo grep + tabla NOT_FOUND | Definir CHECK constraint en migration nueva |
| 3 | Filtro por categoría (proyecto/captacion/busqueda/cliente/lead) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Spec en M06 doc OK |
| 4 | Completar tarea (`asesorCRM.completeTarea`) | 🔴 NOT_FOUND | 🔴 router no existe | 🔴 N/A | 🔴 N/A | ✅ infra | 🔴 | 🔴 missing | grep server/trpc → no `completeTarea` | Implementar mutation + audit_log INSERT |
| 5 | Crear tarea manual (`asesorCRM.createTarea` wizard 2 pasos) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Construir `<NuevaTareaWizard/>` + Zod schema en M06 doc líneas 137-156 |
| 6 | Tareas auto-generadas (`generate_auto_tasks` SQL func) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 función SQL no existe | 🔴 N/A | N/A | 🔴 | 🔴 missing | tabla NOT_FOUND ⇒ función tampoco | Crear función SQL post tabla |
| 7 | Prioridad badge alta/media/baja | 🔴 NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | CHECK constraint en migration |
| 8 | Link a entidad polimórfico (entity_id + entity_type + redirect_to) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Validar bugfix `redirect_to` (no `reddirectTo`) en migration nueva |
| 9 (extra spec M06) | Sync Google Calendar / Outlook (`calendar.syncToGoogle`) | 🔴 NOT_FOUND | 🔴 router calendar no existe | N/A | N/A | N/A | 🔴 | 🔴 missing | grep `calendar.sync` → 0 hits | OAuth + provider abstraction |
| 10 (extra spec M06) | Cron `tareas-mark-expired` (cada hora) | 🔴 NOT_FOUND | N/A | 🔴 N/A | 🔴 cron NOT_FOUND | N/A | 🔴 | 🔴 missing | `app/api/cron/` no contiene `tareas-mark-expired` | Vercel cron + endpoint |
| 11 (extra spec M06) | Drag & drop reorder columnas | 🔴 NOT_FOUND | N/A | N/A | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | dnd-kit + estado local |
| 12 (extra spec M06) | Widget `TareasTodayWidget` consumido por M01 | 🔴 NOT_FOUND | 🔴 N/A | N/A | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Componente shared para M01 |
| 13 (extra spec M06) | Vista manager equipo (`permissions.tasks.view_team`) | 🔴 NOT_FOUND | 🔴 N/A | N/A | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Permissions + RLS policy |
| 14 (extra spec M06) | Reasignar tarea (`asesorCRM.reassignTarea`, manager-only) | 🔴 NOT_FOUND | 🔴 N/A | N/A | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Mutation + permission check |

**Gaps módulo (priorizados)**
1. Migration `tareas` (PK uuid, asesor_id FK, type CHECK 6 valores, entity_id polimórfico, status CHECK pending/expired/done, priority CHECK alta/media/baja, redirect_to text, completed_at, calendar_event_id) + RLS asesor-self + manager team.
2. Router `asesorCRM` con 6 procedures (`listTareas`, `createTarea`, `updateTarea`, `completeTarea`, `reassignTarea`, `deleteTarea`).
3. Feature `features/tareas/` completa (10 componentes UI listados en M06.md líneas 70-79).
4. Cron `tareas-mark-expired` (Vercel queues).
5. Integración OAuth Google Calendar + Outlook Graph + Apple CalDAV.
6. Widget `TareasTodayWidget` para M01.
7. Permissions JSONB `tasks.view_team`, `tasks.reassign`.

**Frontend canon prototype mapping**
- Cero componentes prototype JSX cubren M06. Todos los `.jsx` son piezas de landing pública (Hero, ColoniasBento, etc.).
- Acción: `🔄 needs-prototype-port` → diseñar TareasBoard / TareaCard / NuevaTareaWizard ex novo siguiendo Dopamine v2 (referencia visual `/docs/referencias-ui/M6_Tareas.tsx` 549 LOC, NO existe en repo — verificar con grep `find docs -name "M6_Tareas*"` antes de portear).

---

<a id="m07"></a>

## M07 — Operaciones

**Resumen ejecutivo módulo**
- Carpeta esperada `features/operaciones/` — `NOT_FOUND`.
- Total acciones canon (sección M8 backend doc líneas 395-464): **12** + 11 extra spec (CFDI, Pegar liga, FX, Mifiel, ciclo cobro, Legal flow, etc.) = **23 acciones**.
- % overall implementación real: **0%**. Trigger `calculate_commission` y función `generate_operation_code` documentados como ✅ en canon NO existen en BD.

**Matriz de auditoría**

| # | Acción Frontend | UI Status | tRPC Procedure | Tabla BD (rows) | Cascada/Trigger | Audit Log | Prototype Comp | Overall | Evidence | Action Required |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Lista operaciones (cards con status badge) | 🔴 NOT_FOUND | 🔴 `asesorCRM.getOperaciones` | 🔴 `operaciones` NOT_FOUND | 🔴 N/A | ✅ infra | 🔴 | 🔴 missing | MCP query → 0 rows; root.ts sin router | Migration `operaciones` 34 cols + router |
| 2 | Status badge (propuesta/oferta_aceptada/escritura/cerrada/pagando/cancelada) + STATUS_MAP FE | 🔴 NOT_FOUND | 🔴 N/A | 🔴 columna status NOT_FOUND | 🔴 N/A | N/A | 🔴 | 🔴 missing | tabla no existe | CHECK constraint + STATUS_MAP en `lib/constants/status-maps.ts` |
| 3 | Wizard Step 0: Tipo `side` (ambos/comprador/vendedor) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 columna NOT_FOUND | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Implementar SIN columna `lado` duplicada (DISC-03 cerrado) |
| 4 | Wizard Step 1: Propiedad (project/unidad/propiedad_secundaria picker) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 FKs no existen (proyectos/unidades/propiedades_sec NOT_FOUND) | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Migrations dependientes de M02 + M05 |
| 5 | Wizard Step 2: Comprador (contactos picker + crear nuevo inline) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 contactos NOT_FOUND | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Depende de M03 |
| 6 | Wizard Step 3: Valores reserva/promoción/cierre + currency MXN/USD | 🔴 NOT_FOUND | 🔴 N/A | 🔴 N/A | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | FX integration via `fxRouter` (✅ existe en root.ts línea 46) — único asset reusable |
| 7 | Wizard Step 4: Comisiones auto-calculadas (IVA 16% + split 20% explícito) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 trigger `calculate_commission` NOT_FOUND | N/A | 🔴 | 🔴 missing | trigger debe coexistir con tabla | Trigger BEFORE INSERT/UPDATE |
| 8 | Wizard Step 5: Documentos checklist (`operation_documents` 14 tipos) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 NOT_FOUND | 🔴 trigger `generate_operation_documents` NOT_FOUND | N/A | 🔴 | 🔴 missing | NOT_FOUND | Migration + trigger generador |
| 9 | Wizard Step 6: Submit `asesorCRM.createOperacion` + código `98A-ACOS-ACOS` | 🔴 NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 trigger `generate_operation_code` NOT_FOUND | N/A | 🔴 | 🔴 missing | NOT_FOUND | Trigger + UNIQUE constraint en `codigo` |
| 10 | Timeline visual (`operation_timeline` stages) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 NOT_FOUND | 🔴 N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Migration |
| 11 | Cobros / facturación (`commission_payments`, estado_cobro) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 NOT_FOUND | 🔴 N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Migration |
| 12 | Búsqueda vinculada (`operaciones.busqueda_id`) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 NOT_FOUND | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | FK a `busquedas` (que tampoco existe) |
| 13 | Cambio status con validaciones transitions | 🔴 NOT_FOUND | 🔴 `operaciones.updateStatus` | 🔴 N/A | 🔴 webhook T18 NOT_FOUND | N/A | 🔴 | 🔴 missing | NOT_FOUND | State machine en server-side |
| 14 | Pegar liga EasyBroker/ML/Inmuebles24 (`scrapers.parseExternalListing`) | 🔴 NOT_FOUND | 🔴 router scrapers no existe | N/A | N/A | N/A | 🔴 | 🔴 missing | grep root.ts no contiene scrapers | API integration |
| 15 | FX rate Open Exchange Rates (currencies mixtos) | 🟡 parcial backend | ✅ `fxRouter` registrado en root.ts:46 | 🔴 `fx_rates` ✅ existe (verificar count) | N/A | N/A | 🔴 UI no existe | 🟡 parcial | root.ts línea 46 + tabla `fx_rates` ✅ en MCP | Reusar fxRouter desde wizard step |
| 16 | CFDI emisión (Facturapi.io, fallback Finkok) `fiscal.emitCFDI` | 🔴 NOT_FOUND | 🔴 router fiscal no existe | 🟡 `fiscal_docs` ✅ existe (singular, NO `fiscal_documents`) | 🔴 N/A | N/A | 🔴 | 🔴 missing | MCP listó `fiscal_docs` no `fiscal_documents` | Reconciliar nombre tabla con M07 doc línea 169 |
| 17 | CFDI cancelación `fiscal.cancelCFDI` | 🔴 NOT_FOUND | 🔴 N/A | 🟡 mismo (fiscal_docs) | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Mutation |
| 18 | Mifiel NOM-151 firma `legal.initFlow` (`legal_flows` tabla) | 🔴 NOT_FOUND | 🔴 router legal no existe | 🔴 NOT_FOUND | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Migration + integración Fase 18 |
| 19 | Stripe Connect split payment 80/20 al cierre | 🔴 NOT_FOUND | 🔴 N/A | 🔴 N/A | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Stripe Connect onboarding + webhook |
| 20 | Resend email CFDI al comprador | 🔴 NOT_FOUND | 🔴 N/A | N/A | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Resend SDK + template |
| 21 | Ciclo cobro (pending→paid→closed→expired) cron 30 días | 🔴 NOT_FOUND | 🔴 N/A | 🔴 `operacion_pagos` NOT_FOUND | 🔴 cron NOT_FOUND | N/A | 🔴 | 🔴 missing | NOT_FOUND | Migration + cron Vercel |
| 22 | XP gamification cierre (`xp_operacion_cerrada` trigger) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 `asesor_gamification` NOT_FOUND | 🔴 N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Trigger AFTER UPDATE status='cerrada' |
| 23 | Webhook T18 a contraparte cambio status | 🔴 NOT_FOUND | 🔴 N/A | 🔴 N/A | 🔴 N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Trigger + queue |

**Gaps módulo (priorizados)**
1. Set de migrations `operaciones` + `operacion_parts` + `operacion_commissions` + `operacion_pagos` + `operacion_attachments` + `operation_documents` + `operation_timeline` + `commission_payments` + `legal_flows`. Reconciliar `fiscal_docs` (existente) vs `fiscal_documents` (canon doc) → ADR pendiente.
2. Router tRPC `operaciones` + `fiscal` + `legal` + `scrapers`.
3. Triggers SQL: `calculate_commission`, `generate_operation_code` (UNIQUE pattern `{3}-{4}-{4}`), `generate_operation_documents`, `webhooks_operaciones`, `xp_operacion_cerrada`.
4. Wizard 6-pasos UI con stepper + validaciones step-by-step.
5. Integraciones externas: Facturapi.io, Finkok, Mifiel, DocuSign, Open Exchange Rates (✅ ya tenemos `fx_rates` BD + `fxRouter`), SAT RFC validez, Stripe Connect, Resend, scrapers EasyBroker/ML/Inmuebles24.
6. RLS: visibilidad solo a asesores involucrados + admin.
7. STATUS_MAP `lib/constants/status-maps.ts` (canon doc líneas 612-619).

**Frontend canon prototype mapping**
- Cero componentes prototype cubren M07. Wizard/stepper/comision-calculator no existen en `.jsx`.
- `🔄 needs-prototype-port` total. Referencia visual `/docs/referencias-ui/M7_Operaciones.tsx` (873 LOC) — verificar existencia en repo antes de portear.

---

<a id="m08"></a>

## M08 — Marketing (Asesor)

**Resumen ejecutivo módulo**
- Carpeta esperada `features/marketing/` — `NOT_FOUND`. Existen `features/newsletter/` (público no-marketing-asesor) y `features/ia-generativa/` (IA infra) — ninguno cubre el spec.
- Total acciones canon (sección M9 backend doc líneas 468-520) + spec M08: **7 backend** + ~15 spec (5 tabs, 5 variantes assets, photos pipeline, portales) = **~22 acciones**.
- % overall implementación real: **0%**. `aiRouter` existente NO equivale a `marketing` — hace prompts genéricos.

**Matriz de auditoría**

| # | Acción Frontend | UI Status | tRPC Procedure | Tabla BD (rows) | Cascada/Trigger | Audit Log | Prototype Comp | Overall | Evidence | Action Required |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Galería fotos proyecto (`photos.getProjectPhotos`) | 🔴 NOT_FOUND | 🔴 router photos no existe | 🔴 `fotos`/`photos` NOT_FOUND | 🔴 N/A | N/A | 🔴 | 🔴 missing | grep root.ts sin photos; MCP NOT_FOUND ambos nombres | Migration + router |
| 2 | Upload fotos drag&drop (Sharp→WebP→3 variantes, `/api/photos/upload`) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 NOT_FOUND | 🔴 N/A | N/A | 🔴 | 🔴 missing | `app/api/photos/upload/route.ts` no existe en grep | API route + Sharp pipeline + Storage bucket |
| 3 | AI classification (`/api/photos/classify` 7 categorías) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 N/A | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | OpenAI Vision o CLIP fine-tune |
| 4 | Landing pages CRUD (`marketing.createLanding/getLandings/updateLanding`) | 🔴 NOT_FOUND | 🔴 router marketing no existe | 🔴 `landings`/`project_landing_pages` NOT_FOUND | 🔴 N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Tabla + 4 procedures + wizard |
| 5 | QR codes (`marketing.createQR/getQRs`, scan_count tracking) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 `qr_codes` NOT_FOUND | 🔴 N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | qrcode lib + UTM auto + redirect endpoint |
| 6 | WhatsApp templates approval Meta (`whatsapp_templates`) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 NOT_FOUND | 🔴 webhook Meta NOT_FOUND | N/A | 🔴 | 🔴 missing | NOT_FOUND | Meta WA Business API + webhook approval |
| 7 | Client folders (Radar) `client_folders` + `client_folder_projects` | 🔴 NOT_FOUND | 🔴 N/A | 🔴 NOT_FOUND | 🔴 N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | 2 tablas + URL pública `/radar/[slug]` |
| 8 | Auto-gen 5 variantes assets (postCuadrado/postLargo/story/videoStory/video) `marketing.generateAssets` | 🔴 NOT_FOUND | 🔴 N/A | 🔴 `marketing_assets` NOT_FOUND | 🔴 cron cleanup 24h NOT_FOUND | N/A | 🔴 | 🔴 missing | NOT_FOUND | DALL-E + Remotion + Storage TTL |
| 9 | OG dynamic image (Vercel OG) | 🔴 NOT_FOUND | N/A | N/A | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | `app/api/og/route.tsx` |
| 10 | Publicar a portales externos (Inmuebles24/ML/Vivanuncios/etc) `marketing.publishToPortal` | 🔴 NOT_FOUND | 🔴 N/A | 🔴 `marketing_portales` NOT_FOUND | 🔴 webhook lead-back NOT_FOUND | N/A | 🔴 | 🔴 missing | NOT_FOUND | Mapper por portal + creds vault |
| 11 | Status sync portales (pending/published/error) `marketing.getPortalStatus` | 🔴 NOT_FOUND | 🔴 N/A | 🔴 `marketing_publications` NOT_FOUND | 🔴 N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Tabla log + webhook handler |
| 12 | Landing analytics (visits/leads/CTR) `marketing.getLandingAnalytics` | 🔴 NOT_FOUND | 🔴 N/A | 🔴 `landing_analytics` NOT_FOUND | 🔴 N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Partition por mes + materialized view |
| 13 | UTM tracking (`utm_tracks`) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 NOT_FOUND | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Tabla + middleware |
| 14 | Compartir property link (`marketing.sharePropertyLink`) | 🔴 NOT_FOUND | 🔴 N/A | N/A | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Short URL service |

**Gaps módulo (priorizados)**
1. Migrations: `landings`, `landing_analytics` (partitioned), `qr_codes`, `whatsapp_templates`, `client_folders`, `client_folder_projects`, `marketing_assets`, `marketing_portales`, `marketing_publications`, `fotos`, `utm_tracks`. (~10 tablas).
2. Router `marketing` con ~15 procedures. ADR pendiente: router nuevo vs extender `asesorCRM` (canon doc línea 518 lo sugiere).
3. API routes `/api/photos/upload` + `/api/photos/classify` (Sharp + AI Vision).
4. Integraciones: Meta WA Business API (template approval webhook), DALL-E 3, Remotion, Vercel OG, scrapers/publishers de 7 portales (Inmuebles24, ML, Vivanuncios, ICasas, EasyBroker, Propiedades.com, FB Marketplace), short URL self-hosted.
5. Storage buckets Supabase con TTL para videoStory + video (24h cron cleanup).

**Frontend canon prototype mapping**
- Cero componentes prototype cubren M08. `PropertyListings.jsx` muestra listado público con avatar de asesor — no es tab de marketing del asesor.
- `🔄 needs-prototype-port` total.

---

<a id="m09"></a>

## M09 — Estadísticas (Métricas Asesor)

**Resumen ejecutivo módulo**
- Carpeta esperada `features/estadisticas/` — `NOT_FOUND`.
- Total acciones canon (sección M10 backend doc líneas 524-561, atención: confusión nomenclatura — el doc canon llama "M10" a Estadísticas mientras el catálogo módulos llama "M09" a Estadísticas y "M10" a Dashboard Dev): **8 backend** + 11 KPIs slide-over + 4 charts Recharts + pedagogy drawer = **~25 acciones**.
- % overall implementación real: **0%**. Materialized view `asesor_stats_daily` NOT_FOUND.

**Matriz de auditoría**

| # | Acción Frontend | UI Status | tRPC Procedure | Tabla BD (rows) | Cascada/Trigger | Audit Log | Prototype Comp | Overall | Evidence | Action Required |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | KPIs principales (`get_asesor_performance(id)` SQL func → jsonb) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 función SQL NOT_FOUND | 🔴 N/A | N/A | 🔴 | 🔴 missing | MCP no listó función | Crear función SQL + dependencias (busquedas, operaciones, etc.) |
| 2 | KPI cards weekly (`metricas_kpi` 17 cols + idx) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 NOT_FOUND | 🔴 N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Migration + cron weekly aggregate |
| 3 | Pipeline funnel (`asesorCRM.getPipelineFunnel`) | 🔴 NOT_FOUND | 🔴 router N/A | 🔴 `busquedas` NOT_FOUND | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Query GROUP BY etapa + Recharts FunnelChart |
| 4 | Revenue chart por mes (`asesorCRM.getRevenueByMonth`) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 `operaciones` NOT_FOUND | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Recharts LineChart + materialized view |
| 5 | Actividad timeline (`actividad_timeline` + events) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 NOT_FOUND | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Migration + router |
| 6 | Ranking gamification (`asesor_gamification.monthly_rank`, `gamification.getLeaderboard`) | 🔴 NOT_FOUND | 🔴 router gamification no existe | 🔴 NOT_FOUND | 🔴 N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Migration + leaderboard query |
| 7 | Comparativo mensual (`asesor_outcomes`) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 NOT_FOUND | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | UNIQUE(asesor_id, mes) |
| 8 | Exportar Excel (xlsx client-side) | 🔴 NOT_FOUND | N/A (client) | N/A | N/A | N/A | 🔴 | 🔴 missing | xlsx no instalado en package.json | npm install xlsx + button handler |
| 9 (extra spec M09) | Date range selector (Hoy/7d/30d/90d/Custom + nuqs URL state) | 🔴 NOT_FOUND | N/A | N/A | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Componente shared + nuqs persistence |
| 10 (extra spec M09) | 11 KPIs semáforo slide-over (`?metrics=true`) | 🔴 NOT_FOUND | 🔴 `getMetricsSemaforo` | N/A | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Slide-over component + query param routing |
| 11 (extra spec M09) | Pedagogy drawer (4 secciones: ¿Qué mide? / ¿Por qué importa? / Consejos / ¿Cómo evoluciona?) | 🔴 NOT_FOUND | N/A | N/A | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Drawer component + i18n keys masivos |
| 12 (extra spec M09) | Heatmap colonias actividad (Recharts custom) | 🔴 NOT_FOUND | 🔴 `getZonesActivity` | N/A | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Componente Recharts custom |
| 13 (extra spec M09) | Team comparison overlay (anonimizado top performer) | 🔴 NOT_FOUND | 🔴 `getTeamComparison` | N/A | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Permission `stats.team_comparison` + opt-in |
| 14 (extra spec M09) | Visits conversion bar (`getVisitsConversion`) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 `visitas` NOT_FOUND | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Migration + chart |
| 15 (extra spec M09) | Cron `asesor-stats-refresh` materialized view hourly | 🔴 NOT_FOUND | N/A | 🔴 N/A | 🔴 cron NOT_FOUND | N/A | 🔴 | 🔴 missing | NOT_FOUND | Vercel cron + REFRESH MATERIALIZED VIEW |

**Gaps módulo (priorizados)**
1. Materialized view `asesor_stats_daily` (depende de tablas downstream busquedas/visitas/operaciones/contactos/timeline_entries — ninguna existe).
2. Router `asesorCRM` con 7 queries de stats + router `gamification` con leaderboard.
3. Función SQL `get_asesor_performance(asesor_id) RETURNS jsonb`.
4. Componentes UI (11 listados en M09.md líneas 89-99) + Recharts setup + nuqs URL state.
5. i18n: ~50 claves nuevas para pedagogy drawer (4 secciones × 11 KPIs).
6. Cron `asesor-stats-refresh` cada hora.
7. Permissions: `stats.team_comparison`, opt-in flag para top performer reveal.
8. Tests: dashboard load <2s p95 (M09.md test crítico).

**Frontend canon prototype mapping**
- Cero componentes prototype cubren M09. `Stats.jsx` del prototype es contador genérico de landing pública (no relacionado con KPIs asesor).
- `🔄 needs-prototype-port` total.

---

<a id="m10"></a>

## M10 — Dashboard Desarrollador

**Resumen ejecutivo módulo**
- Carpeta esperada `features/dashboard-dev/` o `features/developer/` — `NOT_FOUND`. Ruta `app/[locale]/(developer)/dashboard` — `NOT_FOUND` (solo existe `app/[locale]/(developer)/` vacío de subrutas dashboard).
- Total acciones canon spec M10: **6 procedures tRPC** + 10 widgets UI + Trust Score H05 breakdown + 5 quick actions + Morning Briefing AI = **~22 acciones**.
- % overall implementación real: **0%**. Trust Score H05 tabla `dev_trust_scores` NOT_FOUND.

**Matriz de auditoría**

| # | Acción Frontend | UI Status | tRPC Procedure | Tabla BD (rows) | Cascada/Trigger | Audit Log | Prototype Comp | Overall | Evidence | Action Required |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Carga dashboard `developer.getDashboard` | 🔴 NOT_FOUND | 🔴 router developer no existe | 🔴 `developers` NOT_FOUND | N/A | ✅ infra | 🔴 | 🔴 missing | grep root.ts sin developer; MCP NOT_FOUND | Migration `developers` + `desarrolladoras` ✅ existe pero con schema distinto (verificar) |
| 2 | Trust Score H05 card (score 0-100, level Bronze/Silver/Gold/Platinum) | 🔴 NOT_FOUND | 🔴 `developer.getTrustScore` | 🔴 `dev_trust_scores` NOT_FOUND | 🔴 N/A | N/A | 🔴 | 🔴 missing | MCP listó zone/score tablas IE pero no dev_trust_scores | Migration + cálculo H05 (scores IE registry referencia H05 — verificar mapping) |
| 3 | Trust Score drawer breakdown (5 categorías + improvements) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 N/A | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Drawer + citations |
| 4 | Dev company header (logo + RFC + años operando) | 🔴 NOT_FOUND | 🔴 N/A | 🟡 `desarrolladoras` ✅ existe pero schema NOT verificado vs spec | N/A | N/A | 🔴 | 🔴 missing | MCP listó `desarrolladoras` row count pendiente | `\d desarrolladoras` para reconciliar |
| 5 | DevKpiGrid 5 KPIs MTD (proyectos activos, unidades vendidas, revenue, conversion, tickets) | 🔴 NOT_FOUND | 🔴 `developer.getKpis` | 🔴 deps NOT_FOUND (proyectos/unidades/operaciones/leads_dev) | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Múltiples migrations downstream |
| 6 | Morning Briefing Dev (streaming Anthropic Claude Sonnet 4) `ai.generateMorningBriefingDev` | 🔴 NOT_FOUND | 🟡 `aiRouter` ✅ existe (root.ts:42) pero sin procedure dev-oriented | 🔴 `ai_generated_content` NOT_FOUND | N/A | N/A | 🔴 | 🔴 missing | aiRouter genérico, falta vertical dev | Extender aiRouter con procedure especializado + tabla |
| 7 | Inventory snapshot bar chart (`developer.getInventorySnapshot`) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 `unidades` NOT_FOUND | 🔴 Realtime subscription NOT_FOUND | N/A | 🔴 | 🔴 missing | NOT_FOUND | Migration + Supabase Realtime channel |
| 8 | Pendientes list (docs por aprobar / landings pending / CFDIs pending) `developer.getPendientes` | 🔴 NOT_FOUND | 🔴 N/A | 🔴 `documents`/`landings`/`fiscal_docs`(parcial) NOT_FOUND | N/A | N/A | 🔴 | 🔴 missing | `fiscal_docs` ✅ existe pero `documents` y `landings` no | Migrations |
| 9 | Quick action: Subir doc (Doc Intel Fase 17) | 🔴 NOT_FOUND | 🔴 N/A | N/A | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Drawer upload + integración Fase 17 |
| 10 | Quick action: Crear landing (M14 wizard) | 🔴 NOT_FOUND | 🔴 N/A | N/A | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Cross-link M14 |
| 11 | Quick action: Emitir CFDI (M12) | 🔴 NOT_FOUND | 🔴 N/A | 🟡 `fiscal_docs` ✅ existe | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Cross-link M12 |
| 12 | Quick action: Enviar comunicado (bulk email leads activos) | 🔴 NOT_FOUND | 🔴 N/A | 🔴 N/A | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Resend bulk + queue |
| 13 | Quick action: Iniciar campaña (M14) | 🔴 NOT_FOUND | 🔴 N/A | N/A | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Cross-link M14 |
| 14 | Sidebar Dev (Dashboard/Inventario/Contabilidad/CRM/Marketing/Analytics IE) | 🔴 NOT_FOUND | N/A | N/A | N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | 6 secciones layout |
| 15 | RLS dev solo ve sus proyectos | 🔴 NOT_FOUND | N/A | 🔴 N/A | 🔴 N/A | N/A | 🔴 | 🔴 missing | NOT_FOUND | Policy ON proyectos USING (developer_id = auth_developer()) |

**Gaps módulo (priorizados)**
1. Migration `developers` (vs `desarrolladoras` ✅ ya existe — reconciliar) + `dev_trust_scores` + `documents` + `landings` + `unidades` + `proyectos` (todas downstream del dominio M11/M12/M13/M14) + `leads_dev` + `ai_generated_content`.
2. Router `developer` con 6 procedures (`getDashboard`, `getTrustScore`, `getInventorySnapshot`, `getPendientes`, `getKpis`) + extender `aiRouter` con `generateMorningBriefingDev`.
3. Cálculo H05 Trust Score (5 categorías: financial health / on-time delivery / doc transparency / post-venta responsiveness / reviews) — depende de score registry IE (cross-check con `score_weights` y `score_history` ✅ existentes).
4. Layout `app/[locale]/(developer)/dashboard/page.tsx` + `<DevHeader/>` + `<DevSidebar/>` + 8 widgets restantes.
5. Supabase Realtime channel para inventory updates.
6. Cross-references hacia M11 Inventario / M12 Contabilidad / M13 CRM Dev / M14 Marketing Dev / M15 Analytics IE — ninguno implementado.
7. Onboarding flow para dev nuevo (empty state).

**Frontend canon prototype mapping**
- Cero componentes prototype cubren M10 dashboard developer. Prototype es 100% landing comprador / market público.
- `🔄 needs-prototype-port` total.

---

<a id="m11"></a>

## M11 — Inventario Desarrollador

**Resumen ejecutivo módulo**
- Features dir esperado: `features/inventario-dev/` o `features/desarrollador-inventario/` → **NO EXISTE**.
- Total acciones canon (procedures tRPC + tablas BD principales): 14 procedures + 10 tablas = 24 unidades auditadas.
- % overall módulo: 0% (zero implementación; no hay route, ni schema, ni componente, ni tabla).

**Matriz de auditoría**

| # | Acción Frontend | UI Status | tRPC Procedure | Tabla BD (rows) | Cascada/Trigger | Audit Log | Prototype Comp | Overall | Evidence | Action Required |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Listar proyectos `<ProjectsTree />` | 🔴 | `developer.listProjects` 🔴 | `proyectos` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | grep `ProjectsTree` en features/app → 0 matches; root.ts no incluye `developer.*`; MCP `proyectos` exists=false | Crear migration + procedure + componente |
| 2 | Crear proyecto `<ProjectWizard />` | 🔴 | `developer.createProject` 🔴 | `proyectos` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | grep `ProjectWizard` → 0 matches; spec L99 | Wizard 5 pasos por especificar |
| 3 | Update proyecto | 🔴 | `developer.updateProject` 🔴 | `proyectos` 🔴 | n/a | n/a | n/a | 🔴 | spec L99; root.ts | — |
| 4 | Archive proyecto | 🔴 | `developer.archiveProject` 🔴 | `proyectos` 🔴 | n/a | n/a | n/a | 🔴 | spec L99 | — |
| 5 | Listar prototipos `<PrototiposList />` | 🔴 | (no listado en spec) 🔴 | `prototipos` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | grep `prototipos` → solo `docs/04_MODULOS/M11_INVENTARIO_DEV.md` | — |
| 6 | Editar prototipo `<PrototipoForm />` | 🔴 | (no listado) 🔴 | `prototipos` 🔴 | n/a | n/a | n/a | 🔴 | grep | — |
| 7 | Listar unidades `<UnidadesGrid />` realtime | 🔴 | `developer.listUnidades` 🔴 | `unidades` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | grep `UnidadesGrid` → 0; MCP exists=false; `useRealtime*` solo aparece en `shared/lib/intelligence-engine/calculators/multiplayer.ts` (no es M11) | Realtime + grid + status badges |
| 8 | Update unidad status | 🔴 | `developer.updateUnidadStatus` 🔴 | `unidades` 🔴 | n/a | n/a | n/a | 🔴 | Zod schema spec L143-147 | Falta enum status disponible/reservada/apartada/vendida |
| 9 | Historial precios `<PrecioHistorial />` | 🔴 | `developer.getPriceHistory` 🔴 | `precios_unidad` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | grep `precios_unidad` → solo doc spec | Tabla con history |
| 10 | Update precio unidad | 🔴 | `developer.updatePrecioUnidad` 🔴 | `precios_unidad` 🔴 | n/a | n/a | n/a | 🔴 | spec L101 | — |
| 11 | Esquemas pago listar/crear `<EsquemasPagoEditor />` | 🔴 | `developer.listEsquemasPago` / `createEsquema` 🔴 | `esquemas_pago` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | spec L102 | — |
| 12 | Upload bulk docs `<DocsBulkUploader />` | 🔴 | `documents.uploadBulk` 🔴 | `documents` + `document_jobs` 🔴 NOT_FOUND ambas | n/a | n/a | n/a | 🔴 | spec L103; MCP ambas exists=false | Pipeline Document Intel (Fase 17) |
| 13 | Doc extraction review `<DocExtractionReview />` | 🔴 | `documents.getDocJobStatus` / `approveExtractedData` 🔴 | `document_jobs` 🔴 | n/a | n/a | n/a | 🔴 | spec L104 | — |
| 14 | Avance obra Gantt `<AvanceObraGantt />` | 🔴 | `developer.uploadAvanceObra` 🔴 | `avance_obra` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | spec L105 | — |
| 15 | IE alert banner `<IEAlertBanner />` | 🔴 | `scores.getIEAlertsForProject` 🔴 | `zone_scores` ✅ (5267 rows) | trg_zone_scores_cascade_indices ✅ + trg_zone_scores_archive ✅ + trg_zone_scores_webhook_emit ✅ | trg_zone_scores_cascade_* via audit_log ✅ | n/a | 🟡 | MCP zone_scores rows=5267; trigger SELECT; pero no existe procedure `getIEAlertsForProject` en `features/ie/routes/scores.ts` (solo list/getByZone/getDependencies/getTierGate/getHistory) | Procedure nuevo `scores.getIEAlertsForProject` que filtre H03/F12/N07 por bbox proyecto |
| 16 | Photos uploader `<FotosUploader />` (shared M05/M08) | 🔴 | (no listado spec) 🔴 | `photos` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | spec L107; MCP exists=false | Compartir con M05/M08 |
| 17 | Tabla `proyectos` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP query | Crear con RLS por developer_id |
| 18 | Tabla `prototipos` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | FK `proyecto_id` |
| 19 | Tabla `unidades` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | FK `prototipo_id` + status enum |
| 20 | Tabla `precios_unidad` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | History trigger |
| 21 | Tabla `esquemas_pago` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | — |
| 22 | Tabla `documents` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | Trigger document_job |
| 23 | Tabla `document_jobs` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | Pipeline async Fase 17 |
| 24 | Tabla `avance_obra` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | — |

**Gaps módulo M11**
1. CERO migration backend para inventario dev (proyectos/prototipos/unidades/precios_unidad/esquemas_pago/photos/documents/document_jobs/avance_obra). Bloquea todo el módulo.
2. CERO procedure tRPC `developer.*` o `documents.*` registrado en `server/trpc/root.ts`.
3. CERO componente UI dev/inventario en `features/`.
4. Realtime `useRealtimeUnits` no existe (solo `multiplayer.ts` en IE — distinto contexto).
5. Procedure `scores.getIEAlertsForProject` ausente — única integración IE existente parcial (zone_scores ya está poblado y con cascadas).

**Frontend canon prototype mapping**
Ningún componente de `tmp/product_audit_input/DMX-prototype/src/` cubre M11. El prototype solo ofrece landing pública (Hero, ColoniasBento, ColoniaComparator, IntelligenceEngine, PropertyListings, Stats, Faq, etc). M11 es portal interno autenticado del developer — fuera del scope prototype.

---

<a id="m12"></a>

## M12 — Contabilidad Desarrollador

**Resumen ejecutivo módulo**
- Features dir esperado: `features/contabilidad-dev/` o similar → **NO EXISTE**.
- Total acciones canon (16 procedures + 12 tablas): 28 unidades auditadas.
- % overall módulo: ~3.5% (solo `fiscal_docs` migration creada con auditoría trigger; sin row, sin route, sin UI).

**Matriz de auditoría**

| # | Acción Frontend | UI Status | tRPC Procedure | Tabla BD (rows) | Cascada/Trigger | Audit Log | Prototype Comp | Overall | Evidence | Action Required |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | RFC switcher `<RFCSwitcher />` | 🔴 | `fiscal.switchRFC` 🔴 | `developer_rfcs` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | grep `RFCSwitcher` → 0; MCP exists=false | Tabla RFC + FIEL pgsodium |
| 2 | Emitir CFDI `<CFDIEmitter />` | 🔴 | `fiscal.emitCFDI` 🔴 | spec dice `fiscal_documents` 🔴 NOT_FOUND. Existe `fiscal_docs` (alias 0 rows, schema diferente) | `trg_audit_fiscal_docs` (INS/UPD/DEL) ✅ | ✅ via trigger fiscal_docs | n/a | 🟡 | MCP `fiscal_docs` columns: id/country_code/desarrolladora_id/doc_type/series/folio/uuid_extern/total_minor/currency/xml_url/pdf_url/status/issued_at/canceled_at/cancel_reason/operacion_id/meta/created_at; spec menciona `fiscal_documents` (nombre distinto). Migration `20260418060300_fiscal_docs.sql`. 0 rows. | Renombrar a `fiscal_documents` o ADR para mantener `fiscal_docs`. Crear procedure + UI |
| 3 | Cancelar CFDI `<CancelCFDIDialog />` | 🔴 | `fiscal.cancelCFDI` 🔴 | `fiscal_docs` (canceled_at + cancel_reason cols ✅) | trg_audit_fiscal_docs ✅ | ✅ | n/a | 🟡 | columns `cancel_reason`, `canceled_at` existen; falta procedure tRPC | Procedure cancelCFDI + dialog UI |
| 4 | Listar CFDIs `<CFDITable />` | 🔴 | `fiscal.listCFDIs` 🔴 | `fiscal_docs` 0 rows | ✅ | ✅ | n/a | 🟡 | MCP query 0 rows | Procedure list + table UI |
| 5 | Ver CFDI `<CFDIViewer />` | 🔴 | `fiscal.getCFDIById` 🔴 | `fiscal_docs` ✅ schema | ✅ | ✅ | n/a | 🟡 | MCP | Viewer XML + PDF preview |
| 6 | Upload FIEL | 🔴 | `fiscal.uploadFIEL` 🔴 | `developer_rfcs` 🔴 + pgsodium | n/a | n/a | n/a | 🔴 | spec L102; tabla missing | Encrypted storage |
| 7 | Bank reconciliation `<BankReconciliation />` | 🔴 | `contabilidad.parseBankStatement` / `matchTransaction` 🔴 | `bank_statements` + `bank_matches` 🔴 NOT_FOUND ambas | n/a | n/a | n/a | 🔴 | spec L105-106; MCP | Parser OFX/CSV BBVA/Santander/Banorte/HSBC |
| 8 | Chart of Accounts SAT `<ChartOfAccountsTree />` | 🔴 | `contabilidad.listChartOfAccounts` / `createAccount` 🔴 | `chart_of_accounts` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | Catálogo SAT seed + CRUD |
| 9 | Asientos contables `<AsientosLog />` | 🔴 | `contabilidad.listAsientos` 🔴 | `asientos_contables` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | Auto-gen desde eventos |
| 10 | Payout programs `<PayoutProgramsEditor />` | 🔴 | `contabilidad.configPayoutProgram` / `executePayouts` 🔴 | `payout_programs` + `payouts` 🔴 NOT_FOUND ambas | n/a | n/a | n/a | 🔴 | MCP; spec L108 | Stripe Connect split |
| 11 | Commission holdback `<CommissionHoldbackConfig />` | 🔴 | (no listado explícito) 🔴 | `payout_programs` (subcol) 🔴 | n/a | n/a | n/a | 🔴 | spec flujo 6; tabla missing | Config holdback % |
| 12 | Dunning `<DunningDashboard />` | 🔴 | `contabilidad.listDunning` / `sendDunningEmail` 🔴 | `dunning_templates` + `dunning_events` 🔴 NOT_FOUND ambas | n/a | n/a | n/a | 🔴 | MCP; spec L110 | Templates + cron schedule -3/0/+3/+7/+14 |
| 13 | AML/KYC UIF `<AMLChecklist />` | 🔴 | `contabilidad.flagAML` / `exportUIFReport` 🔴 | `aml_records` 🔴 NOT_FOUND + col `operaciones.aml_flagged` n/a (operaciones también NOT_FOUND) | n/a | n/a | n/a | 🔴 | MCP | Trigger >$200K USD |
| 14 | ESG report `<ESGReportCard />` | 🔴 | `contabilidad.generateESGReport` 🔴 | `esg_reports` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | LEED/EDGE/WELL + inclusión |
| 15 | Reports export `<ReportExporter />` | 🔴 | `contabilidad.exportReports` 🔴 | (deriva de varias) | n/a | n/a | n/a | 🔴 | spec L113 | P&L/Balance/Cash flow PDF + XLSX |
| 16 | Tabla `developer_rfcs` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | Multi-RFC + FIEL |
| 17 | Tabla `fiscal_documents` (spec) vs `fiscal_docs` (real) | 🟡 | n/a | `fiscal_docs` ✅ schema, 0 rows | ✅ | ✅ | n/a | 🟡 | Mismatch nombre tabla — ADR requerido | Decisión rename o seguir con `fiscal_docs` |
| 18 | Tabla `fiscal_complementos` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | Pago/NCR/Recibo |
| 19 | Tabla `bank_statements` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | OFX/CSV parser |
| 20 | Tabla `bank_matches` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | — |
| 21 | Tabla `chart_of_accounts` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | SAT catálogo |
| 22 | Tabla `asientos_contables` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | Auto-gen |
| 23 | Tabla `payout_programs` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | Schedule + holdback% |
| 24 | Tabla `payouts` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | Stripe Connect log |
| 25 | Tabla `dunning_templates` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | — |
| 26 | Tabla `dunning_events` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | — |
| 27 | Tabla `aml_records` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | UIF compliance |
| 28 | Tabla `esg_reports` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | — |

**Gaps módulo M12**
1. Sólo existe `fiscal_docs` (alias parcial de `fiscal_documents`) sin route + sin UI + 0 rows. Es el único anclaje real.
2. Mismatch de naming: spec dice `fiscal_documents`, BD tiene `fiscal_docs`. Requiere ADR de naming antes de implementar M12.
3. Resto del módulo (12 tablas, 14 procedures, 12 componentes) en estado completamente missing.
4. Integraciones externas críticas no configuradas: Facturapi.io, Finkok, Stripe Connect (parciales en otros módulos), Open Banking MX.
5. FIEL pgsodium encryption pipeline ausente.

**Frontend canon prototype mapping**
Ningún componente del prototype JSX cubre M12 (CFDI, contabilidad, payouts). Prototype público no incluye contabilidad backoffice.

---

<a id="m13"></a>

## M13 — CRM Desarrollador

**Resumen ejecutivo módulo**
- Features dir esperado: `features/crm-dev/` → **NO EXISTE**.
- Total acciones canon (8 procedures + 8 tablas + 8 componentes): 24 unidades auditadas.
- % overall módulo: 0%.

**Matriz de auditoría**

| # | Acción Frontend | UI Status | tRPC Procedure | Tabla BD (rows) | Cascada/Trigger | Audit Log | Prototype Comp | Overall | Evidence | Action Required |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Pipeline kanban `<DevCRMKanban />` 5 cols | 🔴 | `devCRM.listLeads` 🔴 | `leads_dev` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | grep `DevCRMKanban` → 0; root.ts no `devCRM`; MCP | Pipeline 5 stages Lead/Interés/Visita/Oferta/Cierre |
| 2 | Lead card `<LeadDevCard />` | 🔴 | `devCRM.listLeads` 🔴 | `leads_dev` 🔴 | n/a | n/a | n/a | 🔴 | spec L66 | — |
| 3 | Crear lead `<LeadDevForm />` | 🔴 | `devCRM.createLead` 🔴 | `leads_dev` 🔴 | n/a | n/a | n/a | 🔴 | spec L77 | Webhook landing |
| 4 | Update lead | 🔴 | `devCRM.updateLead` 🔴 | `leads_dev` 🔴 | n/a | n/a | n/a | 🔴 | spec L77 | — |
| 5 | Update stage | 🔴 | `devCRM.updateLeadStage` 🔴 | `leads_dev` 🔴 | n/a | n/a | n/a | 🔴 | spec L77 | Drag&drop validations |
| 6 | Lead drawer + timeline `<LeadDevDrawer />` | 🔴 | `devCRM.getLeadTimeline` 🔴 | `lead_touchpoints` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | grep | — |
| 7 | Assign asesor `<AssignAsesorDialog />` | 🔴 | `devCRM.assignAsesor` 🔴 | `leads_dev.asesor_id_assigned` 🔴 + `asesores` 🔴 NOT_FOUND + `project_brokers` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | spec L78 | Notif asesor + sync M04 |
| 8 | Tareas dev `<DevTareasList />` | 🔴 | `devCRM.listTareasDev` / `createTareaDev` 🔴 | `tareas_dev` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | spec L80 | — |
| 9 | Inbox unificado `<InboxUnified />` | 🔴 | `devCRM.getInbox` / `replyInbox` 🔴 | `inbox_messages` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | spec L81-82 | WA + email + CRM events |
| 10 | Inbox thread `<InboxMessageThread />` | 🔴 | inline reply 🔴 | `inbox_messages` 🔴 | n/a | n/a | n/a | 🔴 | — | — |
| 11 | Lead score badge `<LeadScoreBadge />` | 🔴 | `scores.getLeadScore` (C01) 🔴 | `lead_scores` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | spec L83; ie/routes/scores.ts no incluye C01 lead | Procedure C01 + cache |
| 12 | Tabla `leads_dev` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | Pipeline source |
| 13 | Tabla `lead_touchpoints` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | Timeline |
| 14 | Tabla `tareas_dev` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | — |
| 15 | Tabla `inbox_messages` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | Multi-canal |
| 16 | Tabla `contactos` (shared M03) | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | Canon backend menciona contactos pero no migration |
| 17 | Tabla `asesores` (shared) | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | Picker assign |
| 18 | Tabla `project_brokers` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | — |
| 19 | Tabla `lead_scores` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | C01 cache |
| 20 | Webhook landing → lead | 🔴 | (route público) 🔴 | `leads_dev` 🔴 | n/a | n/a | n/a | 🔴 | grep `landing.*lead` → 0 routes | Endpoint público + signature |
| 21 | WhatsApp Business inbound | 🔴 | webhook 🔴 | `inbox_messages` 🔴 | n/a | n/a | n/a | 🔴 | grep `whatsapp` en api routes | Meta webhook + verify |
| 22 | Resend Inbound email | 🔴 | webhook 🔴 | `inbox_messages` 🔴 | n/a | n/a | n/a | 🔴 | grep | — |
| 23 | Twilio SMS fallback | 🔴 | (no listado) 🔴 | `inbox_messages` 🔴 | n/a | n/a | n/a | 🔴 | spec L97 | — |
| 24 | PostHog conversion funnel | 🔴 | external 🔴 | n/a | n/a | n/a | n/a | 🔴 | spec L99 | — |

**Gaps módulo M13**
1. Sub-router `devCRM` ausente en root.ts. Bloquea 8 procedures.
2. CERO tablas CRM dev. La sub-arquitectura "lead pertenece al developer, distinto de M03 contactos asesor" no tiene anclaje BD.
3. Inbox unificado multi-canal (WA + email + CRM events) requiere webhooks que no existen.
4. Lead scoring C01 ausente del catálogo `ie/routes/scores.ts` (este expone solo list/getByZone/getDependencies/getTierGate/getHistory).
5. Sync con M04 (asesor recibe lead asignado) imposible — M04 también no implementado en backend.

**Frontend canon prototype mapping**
Sin coverage. Prototype landing público no incluye CRM backoffice.

---

<a id="m14"></a>

## M14 — Marketing Desarrollador

**Resumen ejecutivo módulo**
- Features dir esperado: `features/marketing-dev/` → **NO EXISTE**.
- Total acciones canon (10 procedures + 7 tablas + 8 componentes): 25 unidades auditadas.
- % overall módulo: 0%.

**Matriz de auditoría**

| # | Acción Frontend | UI Status | tRPC Procedure | Tabla BD (rows) | Cascada/Trigger | Audit Log | Prototype Comp | Overall | Evidence | Action Required |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Listar campañas `<CampaignsList />` | 🔴 | `devMarketing.listCampaigns` 🔴 | `campaigns` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | grep `CampaignsList` → 0; root.ts no `devMarketing`; MCP | — |
| 2 | Card campaña `<CampaignCard />` | 🔴 | (parte listCampaigns) 🔴 | `campaigns` 🔴 | n/a | n/a | n/a | 🔴 | — | — |
| 3 | Wizard 5 pasos `<CampaignWizard />` | 🔴 | `devMarketing.createCampaign` 🔴 | `campaigns` + `campaign_creatives` 🔴 NOT_FOUND ambas | n/a | n/a | n/a | 🔴 | spec L83 | Creative upload + AI gen |
| 4 | Update / pause campaign | 🔴 | `devMarketing.updateCampaign` / `pauseCampaign` 🔴 | `campaigns` 🔴 | n/a | n/a | n/a | 🔴 | spec L83 | — |
| 5 | Creative AI generator `<AICreativeGenerator />` | 🔴 | (no listado explícito) 🔴 | `campaign_creatives` 🔴 | n/a | n/a | n/a | 🔴 | spec L78; depende Anthropic Claude | — |
| 6 | Landings auto `<LandingsAutoList />` | 🔴 | `devMarketing.listLandings` / `autoGenerateLanding` 🔴 | `landings` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | One-click publish |
| 7 | Kit ventas builder `<KitVentasBuilder />` | 🔴 | `devMarketing.generateKitVentas` 🔴 | `kit_ventas_generations` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | spec L86 | PDF + PPTX + IE cards |
| 8 | IE card embed `<IECardEmbed />` | 🔴 | (`scores.*`) 🔴 | `zone_scores` ✅ 5267 rows | trg_zone_scores_* ✅ | ✅ | n/a | 🟡 | grep `IECardEmbed` → 0; pero zone_scores existe robusto. Componente render falta. | Componente shared para Kit ventas + landings |
| 9 | Campaign analytics `<CampaignAnalytics />` | 🔴 | `devMarketing.getCampaignAnalytics` 🔴 | `campaign_analytics` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | spec L84 | Funnel + breakdown |
| 10 | Portales feed config `<PortalesFeedConfig />` | 🔴 | `devMarketing.publishToPortal` / `configPortalFeed` 🔴 | `marketing_portales_dev` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | spec L88 | Inmuebles24 XML / EasyBroker / MercadoLibre |
| 11 | Generate assets shared M08 | 🔴 | `marketing.generateAssets` (shared) 🔴 | n/a | n/a | n/a | n/a | 🔴 | grep `marketing.generateAssets` → 0 fuera de docs | M08 también missing |
| 12 | Tabla `campaigns` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | — |
| 13 | Tabla `campaign_creatives` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | — |
| 14 | Tabla `campaign_analytics` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | Daily aggregations |
| 15 | Tabla `landings` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | Shared con asesor |
| 16 | Tabla `kit_ventas_generations` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | — |
| 17 | Tabla `marketing_portales_dev` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | Configs feed |
| 18 | Tabla `utm_tracks` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | Attribution |
| 19 | Meta Ads API integration | 🔴 | external 🔴 | n/a | n/a | n/a | n/a | 🔴 | grep `MetaAds`/`facebook.*ads` → 0 | — |
| 20 | Google Ads API | 🔴 | external 🔴 | n/a | n/a | n/a | n/a | 🔴 | — | — |
| 21 | WhatsApp Business broadcast | 🔴 | external 🔴 | n/a | n/a | n/a | n/a | 🔴 | spec L91 | Template approval |
| 22 | Inmuebles24 Feed | 🔴 | external 🔴 | n/a | n/a | n/a | n/a | 🔴 | spec L92 | XML schema valid |
| 23 | EasyBroker MLS | 🔴 | external 🔴 | n/a | n/a | n/a | n/a | 🔴 | spec L93 | — |
| 24 | MercadoLibre Publisher | 🔴 | external 🔴 | n/a | n/a | n/a | n/a | 🔴 | spec L94 | — |
| 25 | Vercel OG dynamic images | 🔴 | route handler 🔴 | n/a | n/a | n/a | n/a | 🔴 | grep `og.*image\|opengraph` en `app/api/og` → no existe directorio | — |

**Gaps módulo M14**
1. Sub-router `devMarketing` ausente. 6 procedures bloqueados.
2. 7 tablas missing — toda la atribución (UTM, campaigns, analytics) no tiene anclaje BD.
3. `IECardEmbed` componente shared no existe pese a que `zone_scores` está poblado y con cascadas sólidas (única integración que sí podría arrancar).
4. Pipeline AI creative generation (Anthropic Claude) sin rutas configuradas.
5. Feed XML portales (Inmuebles24/EasyBroker/MercadoLibre) sin scaffolding API routes.

**Frontend canon prototype mapping**
Sin coverage. Prototype no incluye marketing backoffice. Único componente con afinidad es `IntelligenceEngine.jsx` (3308 bytes, prototype landing) que conceptualmente inspiraría el render de IE cards en kit ventas — pero requiere portar y rebrand backoffice.

---

<a id="m15"></a>

## M15 — Analytics Desarrollador IE (7 Tabs)

**Resumen ejecutivo módulo**
- Features dir esperado: `features/analytics-dev-ie/` → **NO EXISTE**.
- Total acciones canon (9 procedures scores.* + 11 tablas + 9 componentes tab): 29 unidades auditadas.
- % overall módulo: ~3.5% (solo `zone_scores` ya poblado y con cascadas robustas; resto missing).

**Matriz de auditoría**

| # | Acción Frontend | UI Status | tRPC Procedure | Tabla BD (rows) | Cascada/Trigger | Audit Log | Prototype Comp | Overall | Evidence | Action Required |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Tabs nav `<AnalyticsTabs />` 7 items | 🔴 | n/a | n/a | n/a | n/a | n/a | 🔴 | grep → 0 | Nav componente |
| 2 | Tab Demanda B01 `<TabDemanda />` | 🔴 | `scores.getDemandHeatmap` 🔴 | `zone_scores` ✅ 5267 rows | trg_zone_scores_cascade_* ✅ | ✅ via cascade | n/a | 🟡 | grep `getDemandHeatmap` → 0; ieScoresRouter no tiene; pero zone_scores tiene scores B01 type | Procedure heatmap por bbox |
| 3 | Tab Pricing B03 `<TabPricing />` | 🔴 | `scores.getPricingAutopilot` / `updatePricing` 🔴 | `market_prices` 🔴 NOT_FOUND + `market_prices_secondary` ✅ 0 rows | n/a | n/a | n/a | 🔴 | grep → 0; market_prices NOT_FOUND; market_prices_secondary existe pero vacío y sin trigger relevante | Tabla market_prices + scoring B03 |
| 4 | Pricing autopilot toggle `<PricingAutopilotToggle />` | 🔴 | `scores.updatePricing` 🔴 | `precios_unidad` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | M11 también missing | — |
| 5 | Tab Absorción B08 `<TabAbsorcion />` | 🔴 | `scores.getAbsorptionForecast` 🔴 | `absorption_models` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | 3 escenarios + forecast 12m |
| 6 | Tab Competencia B07 `<TabCompetencia />` | 🔴 | `scores.getCompetitiveIntel` 🔴 | `competitive_intel_cache` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | Top 5 + 8 dimensiones |
| 7 | Tab PMF B04 `<TabPMF />` | 🔴 | `scores.getPMFAnalysis` 🔴 | `pmf_analyses` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | Gap analysis |
| 8 | Tab Costos B12 `<TabCostos />` | 🔴 | `scores.getCostTracker` 🔴 | `cost_tracker` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | INPP trend INEGI |
| 9 | Tab Predicciones `<TabPredicciones />` 3 sub-paneles | 🔴 | `scores.getMarketCycle` / `getLaunchTiming` / `getCashFlowForecast` 🔴 | `market_cycle_snapshots` + `launch_timing_analyses` + `cash_flow_forecasts` 🔴 NOT_FOUND las 3 | n/a | n/a | n/a | 🔴 | MCP las 3 missing | B05/B15/B09 |
| 10 | ScoreCard render `<ScoreCard />` | 🔴 | n/a | `zone_scores` ✅ | ✅ | ✅ | n/a | 🟡 | Componente render con citations + confidence existe en docs pero no en código (grep `<ScoreCard` → 0 matches) | Componente shared con citations |
| 11 | Tabla `zone_scores` | ✅ | n/a | 5267 rows | trg_zone_scores_archive ✅ + trg_zone_scores_cascade_indices ✅ + trg_zone_scores_cascade_ins ✅ + trg_zone_scores_cascade_upd ✅ + trg_zone_scores_webhook_emit ✅ | ✅ via cascade triggers | n/a | ✅ | MCP COUNT + triggers SELECT | Punto fuerte único de M15 |
| 12 | Tabla `market_prices` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | B03 source |
| 13 | Tabla `market_prices_secondary` | 🟡 | n/a | EXISTS 0 rows | n/a | n/a | n/a | 🟡 | MCP | Faltan rows ingest pipeline |
| 14 | Tabla `absorption_models` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | B08 |
| 15 | Tabla `competitive_intel_cache` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | B07 |
| 16 | Tabla `pmf_analyses` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | B04 |
| 17 | Tabla `cost_tracker` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | B12 |
| 18 | Tabla `market_cycle_snapshots` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | B05 |
| 19 | Tabla `launch_timing_analyses` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | B15 |
| 20 | Tabla `cash_flow_forecasts` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | B09 |
| 21 | Tabla `proyectos` (context dev) | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP — M11 | — |
| 22 | Tabla `unidades` (context dev) | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP — M11 | — |
| 23 | Mapbox GL heatmap | 🔴 | external 🔴 | n/a | n/a | n/a | n/a | 🔴 | grep `mapbox` en features → 0 instalación | dep + token |
| 24 | Anthropic Claude explanations | 🔴 | external 🔴 | n/a | n/a | n/a | n/a | 🔴 | features/ia-generativa existe pero no consume scores | — |
| 25 | BANXICO API (forecasts) | 🔴 | external 🔴 | n/a | n/a | n/a | n/a | 🔴 | grep `banxico` → 0 routes | — |
| 26 | INEGI INPP (cost tracker) | 🔴 | external 🔴 | n/a | n/a | n/a | n/a | 🔴 | grep `inegi.*inpp` | — |
| 27 | Feature gating Free vs Pro | 🔴 | (middleware) 🔴 | `ui_feature_flags` ✅ 120 rows + `role_features` ✅ 432 rows | trg_audit_ui_feature_flags ✅ + trg_audit_role_features ✅ | ✅ | n/a | 🟡 | Sistema base existe pero no aplica a M15 tabs | Definir flags `analytics_demand_enabled`, `analytics_pricing_enabled`, etc |
| 28 | Confidence badge | 🔴 | parte de `<ScoreCard />` 🔴 | `zone_scores.confidence` ✅ col existe | ✅ | ✅ | n/a | 🟡 | scores.ts L28 incluye `confidence: string` | Componente badge |
| 29 | Citations link `/metodologia` | 🔴 | n/a | `zone_scores.citations` ✅ col existe | ✅ | ✅ | n/a | 🟡 | scores.ts L31 | Page metodología falta |

**Gaps módulo M15**
1. M15 es el **producto estrella B2B** ($2999 MXN/mes Plan Pro) y su backend está al 3.5%. zone_scores poblado es el único activo real.
2. 9 procedures `scores.get*` específicos de M15 ausentes en `features/ie/routes/scores.ts` (este expone 5 procedures genéricos: list/getByZone/getDependencies/getTierGate/getHistory).
3. 8 de 11 tablas BD missing. market_prices_secondary existe pero vacío.
4. Feature gating (Free vs Pro) tiene infrastructure (`ui_feature_flags` + `role_features`) pero no flags M15 definidos.
5. 7 tabs UI completos missing — el portal Pro vendible no tiene una sola pantalla funcional.

**Frontend canon prototype mapping**
- `IntelligenceEngine.jsx` (3308 bytes, landing público) tiene approach visual que podría inspirar el `<ScoreCard />` y `<TabDemanda />` heatmap mockup — pero el componente landing es presentacional sin data, y el portal dev requiere datos reales con confidence + citations + drill-down.
- `ColoniaComparator.jsx` (14112 bytes) ofrece patrón comparison que aplicaría a `<TabCompetencia />` 8 dimensiones — requiere adaptación backoffice.

---

<a id="m16"></a>

## M16 — Dashboard Admin (17 Pages)

**Resumen ejecutivo módulo**
- Features dir esperado: `features/admin/` → **NO EXISTE**.
- Existe `features/ingest-admin/` (2 componentes upload — separadito) + 3 pages bajo `app/[locale]/(admin)/admin/{newsletter-ab, ingest/market, ingest/upload}` (parciales).
- Total acciones canon (17 pages + 16 procedures + 16 tablas + 18 componentes): 67 unidades auditadas.
- % overall módulo: ~7% (3 pages parciales sobre 17; 0 procedures admin.* en root.ts; 4 tablas tangenciales sí existen).

**Matriz de auditoría**

| # | Acción Frontend | UI Status | tRPC Procedure | Tabla BD (rows) | Cascada/Trigger | Audit Log | Prototype Comp | Overall | Evidence | Action Required |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Sidebar `<AdminSidebar />` 17 items | 🔴 | n/a | n/a | n/a | n/a | n/a | 🔴 | grep → 0 | Layout admin |
| 2 | Page `/admin` AARRR `<AARRRDashboard />` | 🔴 | `admin.getAARRR` 🔴 | (deriva) 🔴 | n/a | n/a | n/a | 🔴 | grep `AARRRDashboard` → 0 | — |
| 3 | Page `/admin/projects` `<ProjectsModeration />` | 🔴 | `admin.moderateProject` 🔴 | `proyectos` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | M11 también missing | — |
| 4 | Page `/admin/participantes` `<ParticipantesTable />` | 🔴 | (varias) 🔴 | `asesores`/`developers`/`mbs` 🔴 NOT_FOUND las 3 | n/a | n/a | n/a | 🔴 | MCP | — |
| 5 | KYC reviewer `<KYCReviewer />` | 🔴 | `admin.kycApprove` / `kycReject` 🔴 | `kyc_submissions` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | Stripe Connect on approve |
| 6 | Page `/admin/revenue` `<RevenueDashboard />` | 🔴 | `admin.getRevenue` 🔴 | `stripe_events` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | MRR/ARR/churn/LTV/CAC |
| 7 | Page `/admin/observatory` (M17 sub) | 🔴 | M17 fuera scope auditoría | n/a | n/a | n/a | n/a | 🔴 | M17_MARKET_OBSERVATORY.md existe | — |
| 8 | Page `/admin/macro` `<MacroDashboard />` | 🔴 | `admin.getMacroIndicators` 🔴 | spec dice `macro_indicators` 🔴 NOT_FOUND. Existe `macro_series` ✅ 880 rows + 9 partitions | trg_macro_series_cascade ✅ INSERT | (no audit_log explícito, cascade emite) | n/a | 🟡 | MCP `macro_series` exists con partitioning anual + 880 rows reales. Spec usa `macro_indicators`. Mismatch naming. | ADR rename o usar `macro_series` |
| 9 | Page `/admin/zonas` `<ZonasManager />` | 🔴 | (varias) 🔴 | `zone_scores` ✅ 5267 rows | ✅ 5 triggers | ✅ via cascade | n/a | 🟡 | UI manager falta; backend robusto | UI gestión filtros + edit |
| 10 | Page `/admin/anomalies` `<AnomaliasFeed />` | 🔴 | `admin.getAnomalies` 🔴 | spec dice `anomalies` 🔴 NOT_FOUND. Existe `market_anomalies` ✅ 0 rows + cols `score_id`/`deviation_sigma`/`ack`/`ack_at`/`ack_by` | n/a (ningún trigger en market_anomalies) | n/a | n/a | 🟡 | MCP cols + naming mismatch (anomalies vs market_anomalies) | ADR + UI feed |
| 11 | Page `/admin/api-metrics` `<APIMetricsDashboard />` | 🔴 | `admin.getAPIMetrics` 🔴 | `api_metrics` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | Requests/day + top consumers |
| 12 | Page `/admin/cohorts` `<CohortAnalysis />` | 🔴 | `admin.getCohorts` 🔴 | `cohort_reports` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | PostHog integration |
| 13 | Page `/admin/cohorts-revenue` | 🔴 | (variant getCohorts) 🔴 | `cohort_reports` 🔴 | n/a | n/a | n/a | 🔴 | MCP | — |
| 14 | Page `/admin/health` `<SystemHealthWidget />` | 🔴 | `admin.getSystemHealth` 🔴 | n/a (deriva /api/health) | n/a | n/a | n/a | 🔴 | grep `SystemHealthWidget` → 0; route /api/health existe (root.ts publicProcedure health) pero no widget | UI widget Sentry + Vercel + Supabase status |
| 15 | Page `/admin/features` `<FeatureRegistryTable />` | 🔴 | `admin.listFeatures` / `updateFeature` 🔴 | spec dice `feature_registry` 🔴 (renamed). Existe `ui_feature_flags` ✅ 120 rows | trg_audit_ui_feature_flags ✅ INS/UPD/DEL | ✅ | n/a | 🟡 | Migration `20260424220000_rename_feature_registry_to_ui_feature_flags.sql` confirma rename. Spec M16 desactualizado. | UI table 120 features; ADR/update spec |
| 16 | Page `/admin/roles` `<RoleMatrixEditor />` | 🔴 | `admin.updateRoleFeatures` 🔴 | `role_features` ✅ 432 rows | trg_audit_role_features ✅ INS/UPD/DEL | ✅ | n/a | 🟡 | Backend listo; UI matrix editor falta | Editor matrix |
| 17 | Page `/admin/audit` `<AuditLogTable />` | 🔴 | `admin.getAuditLog` 🔴 | `audit_log` ✅ 3 rows + 9 partitions monthly (audit_log_p2025*..2026_p20260801) | (audit_log es destino, no fuente trigger) | self | n/a | 🟡 | MCP COUNT + partitions; UI table con filters falta | Table + full-text search + CSV export |
| 18 | Page `/admin/stripe-webhooks` `<StripeWebhooksMonitor />` | 🔴 | `admin.listStripeWebhooks` / `retryStripeWebhook` 🔴 | `stripe_events` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | Event stream + retry button |
| 19 | Page `/admin/config` `<ConfigGlobal />` + `<EmergencyFlagsPanel />` | 🔴 | `admin.updateConfig` / `toggleFeatureFlag` 🔴 | `system_config` 🔴 + `feature_flags` 🔴 NOT_FOUND ambas. Existe `ui_feature_flags` (rename) | ✅ | ✅ | n/a | 🟡 | Naming mismatch nuevo (feature_flags vs ui_feature_flags). Vercel Edge Config integration ausente | Toggle UI + emergency 'EMERGENCY' confirmation |
| 20 | Impersonate button + banner `<ImpersonateButton />` `<ImpersonationBanner />` | 🔴 | `admin.impersonate` / `stopImpersonation` 🔴 | `impersonation_sessions` 🔴 NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP; spec L122 | 2FA gate + audit_log impersonation_start/end |
| 21 | Page existente `/admin/newsletter-ab` (newsletter A/B) | 🟡 | (server action `computeWinner`) 🟡 | NewsletterAbTestRow type → tabla newsletter_ab_tests (no auditada en spec M16) | n/a | n/a | n/a | 🟡 | `app/[locale]/(admin)/admin/newsletter-ab/page.tsx` L1-30 | Out of M16 scope spec, in scope admin functional |
| 22 | Page existente `/admin/ingest/market` | 🟡 | server action upload | (varias ingest) | n/a | n/a | n/a | 🟡 | `MarketIngestUploadForm` componente existe en `features/ingest-admin/components/market-upload-form.tsx` | Out of M16 spec scope |
| 23 | Page existente `/admin/ingest/upload` | 🟡 | server action upload | (varias ingest) | n/a | n/a | n/a | 🟡 | `AdminIngestUploadForm` componente existe | Out of M16 spec scope |
| 24 | Tabla `asesores` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | M03 también |
| 25 | Tabla `developers` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | — |
| 26 | Tabla `mbs` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | — |
| 27 | Tabla `proyectos` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | — |
| 28 | Tabla `kyc_submissions` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | — |
| 29 | Tabla `stripe_events` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | — |
| 30 | Tabla `macro_indicators` (spec) vs `macro_series` (real) | 🟡 | n/a | EXISTS 880 rows + 9 partitions | trg_macro_series_cascade ✅ | n/a | n/a | 🟡 | MCP | Naming reconciliation |
| 31 | Tabla `zone_scores` | ✅ | n/a | 5267 rows | 5 triggers ✅ | ✅ | n/a | ✅ | MCP | Backend sólido |
| 32 | Tabla `anomalies` (spec) vs `market_anomalies` (real) | 🟡 | n/a | EXISTS 0 rows | (sin triggers detectados) | n/a | n/a | 🟡 | MCP | Naming + datos |
| 33 | Tabla `api_metrics` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | — |
| 34 | Tabla `cohort_reports` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | — |
| 35 | Tabla `feature_registry` (spec) vs `ui_feature_flags` (real) | 🟡 | n/a | EXISTS 120 rows | trg_audit_ui_feature_flags ✅ INS/UPD/DEL | ✅ | n/a | 🟡 | Migration rename | ADR aplicado, spec M16 desactualizado |
| 36 | Tabla `role_features` | ✅ | n/a | 432 rows | trg_audit_role_features ✅ | ✅ | n/a | ✅ | MCP | Backend sólido |
| 37 | Tabla `audit_log` | ✅ | n/a | 3 rows + 9 partitions monthly | (destino trigger; partitioned via pg_partman) | self | n/a | ✅ | MCP COUNT + partitions list | Backend sólido |
| 38 | Tabla `system_config` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | — |
| 39 | Tabla `feature_flags` | 🔴 | n/a | NOT_FOUND (renamed → ui_feature_flags) | n/a | n/a | n/a | 🟡 | MCP + migration rename | ADR ya aplicado |
| 40 | Tabla `impersonation_sessions` | 🔴 | n/a | NOT_FOUND | n/a | n/a | n/a | 🔴 | MCP | — |
| 41 | Stripe webhook integration | 🔴 | external 🔴 | n/a | n/a | n/a | n/a | 🔴 | grep `stripe.*webhook` en api routes → no existe | — |
| 42 | Vercel Edge Config (feature flags) | 🔴 | external 🔴 | n/a | n/a | n/a | n/a | 🔴 | grep `edge[_-]config` → 0 | — |
| 43 | PostHog integration cohorts | 🔴 | external 🔴 | n/a | n/a | n/a | n/a | 🔴 | grep | — |
| 44 | Sentry errors panel | 🔴 | external 🔴 | n/a | n/a | n/a | n/a | 🔴 | Sentry configurado pero panel admin falta | — |
| 45 | Anthropic Claude anomaly explanations | 🔴 | external 🔴 | n/a | n/a | n/a | n/a | 🔴 | features/ia-generativa existe; sin integración admin | — |

**Gaps módulo M16**
1. Sub-router `admin.*` ausente. 16 procedures bloqueados.
2. 14 de 17 pages no existen. Las 3 que existen (newsletter-ab, ingest/market, ingest/upload) están fuera del scope formal del spec M16 (no aparecen en sus 17 pages numeradas).
3. Naming mismatches importantes pre-implementación:
   - spec `macro_indicators` → real `macro_series` (datos ya cargados, 880 rows).
   - spec `anomalies` → real `market_anomalies` (vacío).
   - spec `feature_registry` → real `ui_feature_flags` (rename oficial migration `20260424220000`).
   - spec `feature_flags` → consolidado en `ui_feature_flags` (?).
4. Sistema permisos backend completo (`role_features` 432 + `ui_feature_flags` 120 + `audit_log` particionado mensual) pero sin UI editor admin.
5. Impersonation no implementada — riesgo seguridad antes de open access multi-tenant prod.
6. Integraciones externas críticas (Stripe webhooks, Vercel Edge Config, PostHog cohorts) sin scaffolding.

**Frontend canon prototype mapping**
Sin coverage. Prototype landing público no incluye ningún patrón admin backoffice. Único componente con afinidad lejana es `ColoniaComparator.jsx` (patrón table multi-row comparison) que podría inspirar `<RoleMatrixEditor />` o `<FeatureRegistryTable />` — pero requiere adaptación total al patrón backoffice.

---

<a id="m17"></a>

## M17 — Market Observatory (7 Capas Mapbox)

**Resumen ejecutivo módulo**

`features/observatory/` NO EXISTE (verificado `ls features/` — directorio ausente). 0 de 10 procedures `observatory.*` declaradas en M17 doc están implementadas. 0 de 8 tablas source layer (`catastro_parcelas`, `denue_establecimientos`, `fgj_incidents`, `gtfs_routes`, `gtfs_stops`, `proyectos`, `busquedas`, `layer_snapshots_monthly`) existen en BD — sólo `zone_scores` está poblada (5,267 rows). % overall: **0%**.

**Matriz de auditoría**

| # | Acción Frontend | UI Status | tRPC Procedure | Tabla BD (rows) | Cascada/Trigger | Audit Log | Prototype Comp | Overall | Evidence | Action Required |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Render Mapbox 7 layers stacked (`<ObservatoryMap />`) | 🔴 | NOT_FOUND `observatory.*` no en `server/trpc/root.ts` L37-76 | NOT_FOUND `catastro_parcelas`, `denue_establecimientos`, `fgj_incidents`, `gtfs_routes`, `gtfs_stops`, `layer_snapshots_monthly` no existen (MCP `information_schema.tables` schema=public) | n/a | 🔴 | parcial: `MapOverlay.jsx` (prototype) cubre overlay UI no admin observatory | 🔴 | grep `Observatory` 0 hits en `features/` `app/`; `find features/observatory` no match | Crear feature `observatory/` + 8 ingestors source + 10 procedures + Mapbox MTS pipeline |
| 2 | Toggle layers ON/OFF + opacity slider (`<LayerControls />`) | 🔴 | NOT_FOUND | n/a (UI-only) | n/a | n/a | NOT_FOUND prototype | 🔴 | grep `LayerControls` 0 hits | Bloque 19.B Mapbox Layer Controls |
| 3 | Sub-filtros per layer (`<LayerFilters />`) | 🔴 | NOT_FOUND | n/a | n/a | n/a | NOT_FOUND | 🔴 | grep `LayerFilters` 0 hits | — |
| 4 | `observatory.getCatastroLayer({bbox, filters})` → GeoJSON | 🔴 | NOT_FOUND | NOT_FOUND `catastro_parcelas` (MCP query) | n/a | 🔴 | n/a | 🔴 | grep `getCatastroLayer` 0 hits | Ingestor SIGED CDMX + tabla + procedure |
| 5 | `observatory.getDENUELayer` | 🔴 | NOT_FOUND | NOT_FOUND `denue_establecimientos` | n/a | 🔴 | n/a | 🔴 | grep 0 hits; DENUE solo aparece como string en migration-flow/types | Ingestor INEGI DENUE + tabla |
| 6 | `observatory.getFGJLayer` | 🔴 | NOT_FOUND | NOT_FOUND `fgj_incidents` | n/a | 🔴 | n/a | 🔴 | grep 0 hits | Ingestor FGJ CDMX |
| 7 | `observatory.getGTFSLayer` | 🔴 | NOT_FOUND | NOT_FOUND `gtfs_routes`, `gtfs_stops` | n/a | 🔴 | n/a | 🔴 | grep 0 hits | Ingestor GTFS Metro/Metrobús |
| 8 | `observatory.getZoneScoresLayer` | 🔴 | NOT_FOUND | ✅ `zone_scores` (5,267 rows) tiene triggers cascade (`trg_zone_scores_cascade_indices`, `trg_zone_scores_archive`, `trg_zone_scores_webhook_emit`) | ✅ múltiple cascade verificada (MCP `information_schema.triggers`) | n/a | n/a | 🔴 | tabla viva, procedure pública faltante observatory wrapper | Wrap `ieScores` o crear `observatory.getZoneScoresLayer` GeoJSON |
| 9 | `observatory.getProjectsLayer` | 🔴 | NOT_FOUND | NOT_FOUND `proyectos` (no existe en BD pese a referencias en docs) | n/a | 🔴 | n/a | 🔴 | grep `proyectos` table 0 hits BD; aparece sólo como referencia doc | Crear tabla `proyectos` + ingestor + procedure |
| 10 | `observatory.getDemandLayer` | 🔴 | NOT_FOUND | NOT_FOUND `busquedas`, `wishlist_items`, `search_logs` | n/a | 🔴 | n/a | 🔴 | grep 0 hits | Diseñar capture demand pipeline + 3 tablas |
| 11 | `observatory.crossfilter({polygon})` Turf.js stats | 🔴 | NOT_FOUND | dependiente de capas anteriores | n/a | 🔴 | n/a | 🔴 | grep `crossfilter` 0 hits | Bloque crossfilter post-layers |
| 12 | `observatory.timeTravel({snapshotDate})` | 🔴 | NOT_FOUND | NOT_FOUND `layer_snapshots_monthly` | n/a | 🔴 | n/a | 🔴 | — | Estrategia snapshot mensual + tabla |
| 13 | `observatory.exportView({layers, bbox, format})` PNG/GeoJSON/CSV | 🔴 | NOT_FOUND | n/a (server-side compose) | n/a | 🔴 | n/a | 🔴 | grep 0 hits | Vercel OG / GeoJSON streaming |
| 14 | RLS admin-only access | 🔴 | NOT_FOUND | NOT_FOUND tablas no existen (no policies posibles) | n/a | n/a | n/a | 🔴 | — | Policy `is_admin()` post-feature |

**Gaps módulo (priorizado)**

1. Ingestors SIGED catastro CDMX + DENUE + FGJ + GTFS + zone_scores aggregation (5 ingestors faltantes) — bloqueantes para todo M17.
2. Tabla `proyectos` (referenced en M17/M19/M20 + canon backend L486 `project_landing_pages`) NO existe — bloqueante M19, M20 además de M17.
3. Tabla `layer_snapshots_monthly` para time-travel — diseño + cron mensual.
4. Procedures `observatory.*` (10 procedures) no implementadas.
5. `<ObservatoryMap />` componente Mapbox + 7 child controls.
6. RLS admin-only enforcement (decisión: rol vía `is_admin()` o tenant-aware).

**Frontend canon prototype mapping**

- `MapOverlay.jsx` (prototype) cubre overlay map UI semilla — útil para `<ExplorarMap />` público (M19) más que admin observatory.
- `IntelligenceEngine.jsx` cubre layout interno tipo "intelligence engine cards" — fragmento reutilizable para LayerFilters panel.
- Ningún componente prototype está dirigido a Observatory admin específicamente. M17 es 100% greenfield.

---

<a id="m18"></a>

## M18 — Dashboard Comprador (10 Pages Internas)

**Resumen ejecutivo módulo**

`features/comprador/` NO EXISTE. Grupo de rutas `app/[locale]/(comprador)/` contiene sólo `.gitkeep`. La única implementación cercana es `app/[locale]/(public)/preview/comprador/page.tsx` (mock para demos públicas, no portal real). 0 de 16 procedures comprador.* / scores.calculate* / credit.* / familyAccount.* / apartado.* implementadas. De las 14 tablas declaradas, sólo `user_scores` y `newsletter_subscribers` existen — pero `user_scores` es scores IE no buyer_persona (verificado columnas). % overall: **3%** (sólo preview demo + zone_alert_subscriptions schema).

**Matriz de auditoría**

| # | Acción Frontend | UI Status | tRPC Procedure | Tabla BD (rows) | Cascada/Trigger | Audit Log | Prototype Comp | Overall | Evidence | Action Required |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Onboarding wizard primer login (WA OTP + Lifestyle Match) | 🟡 | parcial: `mfa.enroll` existe pero no flow comprador específico; NOT_FOUND `comprador.updateBuyerPersona` | NOT_FOUND tabla `users` con `buyer_persona`; `lifepath_user_profiles` (0 rows) parcialmente cubre persona | n/a | 🔴 | `Hero.jsx` + `SearchBar.jsx` (entrada landing) sirven landing onboarding pre-signup | 🟡 | grep `buyer_persona` 0 hits en features; `lifepath` feature sí existe | Diseñar wizard + tabla user persona + WA OTP integration |
| 2 | `<CompradorDashboard />` personalizado por persona | 🔴 | NOT_FOUND `comprador.getDashboard` | NOT_FOUND tabla composer | n/a | 🔴 | NOT_FOUND prototype | 🔴 | grep `CompradorDashboard` 0 hits; `(comprador)/.gitkeep` sólo | Crear feature `comprador/` + dashboard RSC |
| 3 | `<LifestyleMatchWizard />` 6 opciones | 🟡 | parcial: `lifepath.*` existe (`features/lifepath/routes/lifepath.ts`) pero distinto producto (long-form quiz, no 6-tile match) | `lifepath_user_profiles` (0 rows, schema OK) | n/a | n/a | NOT_FOUND prototype específico | 🟡 | grep `lifepath` ✅ feature; routes/components existen | Mapear lifepath → LifestyleMatch wizard 6-tile o nuevo flow |
| 4 | `<AffordabilityCalc />` A01 + `scores.calculateAffordability` | 🔴 | NOT_FOUND `scores.calculateAffordability` | NOT_FOUND `affordability_calcs` | n/a | 🔴 | NOT_FOUND prototype | 🔴 | grep `calculateAffordability` 0 hits | Crear calculator engine + tabla + procedure |
| 5 | `<InversionSimulator />` A02 4 escenarios + `scores.calculateInversion` | 🔴 | NOT_FOUND | NOT_FOUND `inversion_simulations` | n/a | 🔴 | NOT_FOUND prototype específico (preview/comprador `PulseSimulator.tsx` ≠ inversion sim) | 🔴 | grep 0 hits | Engine + tabla + procedure |
| 6 | `<TCOCalculator />` A05 + `scores.calculateTCO` | 🔴 | NOT_FOUND | NOT_FOUND `tco_calcs` | n/a | 🔴 | NOT_FOUND prototype | 🔴 | grep 0 hits | Engine + tabla + procedure |
| 7 | `<PatrimonioForecast />` A11 + `scores.calculatePatrimonio` | 🔴 | NOT_FOUND | NOT_FOUND `patrimonio_forecasts` | n/a | 🔴 | NOT_FOUND prototype | 🔴 | grep 0 hits | Engine + tabla + procedure |
| 8 | `<ComparadorMulti />` A08 4 props × 15 dims | 🟡 | NOT_FOUND `comparador.*` | NOT_FOUND `comparador_sessions` | n/a | 🔴 | `ColoniaComparator.jsx` (prototype) cubre estilo + UX side-by-side | 🟡 | grep `ColoniaComparator` 0 hits en features (existe sólo en prototype) | Port prototype → `<ComparadorMulti />` + tabla sessions |
| 9 | `<TimingOptimizer />` A07 + `scores.calculateTiming` | 🔴 | NOT_FOUND | NOT_FOUND `timing_analyses` | n/a | 🔴 | NOT_FOUND prototype | 🔴 | grep 0 hits | Engine + tabla + procedure |
| 10 | `<WatchlistWithAlerts />` + `comprador.addToWatchlist` etc | 🟡 | parcial: `zone_alert_subscriptions` schema OK (no procedure aún) | `zone_alert_subscriptions` (0 rows, schema OK con `threshold_pct`, `channel`, `active`) | n/a | 🔴 | NOT_FOUND prototype | 🟡 | MCP columns OK; grep `addToWatchlist` 0 hits | Crear procedures CRUD + UI list/manage |
| 11 | `comprador.subscribeToScore` ≥5% delta alerts | 🟡 | parcial: webhook emit trigger `trg_zone_scores_webhook_emit` ya existe en `zone_scores` | ✅ `zone_scores` triggers verificados (MCP); `score_change_webhooks` + `score_change_deliveries` tablas existen | ✅ trigger webhook | n/a | NOT_FOUND prototype | 🟡 | MCP query triggers OK | Cablear webhook emit → user notif (WA/email) |
| 12 | `<DiscoverWeeklyCarousel />` + `comprador.getDiscoverWeekly` | 🔴 | NOT_FOUND | NOT_FOUND `discover_weekly_generations` | n/a | 🔴 | NOT_FOUND prototype | 🔴 | grep 0 hits; cron `discover_weekly_generate` no implementado | Cron + tabla + procedure + UI carousel (Spotify pattern) |
| 13 | `<PreApprovalWidget />` + `credit.getPreApproval` (BBVA/Santander/Kueski/Creditas) | 🔴 | NOT_FOUND `credit.*` | NOT_FOUND `pre_approvals` (debiera ser pgsodium encrypted) | n/a | 🔴 | NOT_FOUND prototype | 🔴 | grep `getPreApproval` 0 hits; ningún partner integration | Partners SDK + tabla encrypted + procedure (H1 MX-only) |
| 14 | `<FamilyAccountSettings />` + `familyAccount.*` | 🔴 | NOT_FOUND `familyAccount.*` | NOT_FOUND `family_accounts`, `family_members` | n/a | 🔴 | NOT_FOUND prototype | 🔴 | grep 0 hits | 2 tablas + invite flow + RLS shared wishlist |
| 15 | `<ApartarDialog />` Stripe Connect escrow + `apartado.initiate` | 🔴 | NOT_FOUND `apartado.*` | NOT_FOUND `apartados`, `disclaimers_acceptance` | n/a | 🔴 | NOT_FOUND prototype | 🔴 | grep `apartado` 0 hits; Stripe Connect no integrado (FASE 18 futura) | Stripe Connect + 2 tablas + flow + disclaimers |
| 16 | `<DisclaimerBanner />` T&Cs post-venta | 🔴 | NOT_FOUND | NOT_FOUND `disclaimers_acceptance` | n/a | 🔴 | NOT_FOUND prototype | 🔴 | grep 0 hits | Componente + tabla aceptaciones |
| 17 | Cron `discover_weekly_generate` lunes 8am local | 🔴 | NOT_FOUND | NOT_FOUND tabla destino | n/a | 🔴 | n/a | 🔴 | `app/api/cron/` no contiene este cron (ls verificado) | Implementar cron + observability `ingest_runs` row |
| 18 | RLS comprador-only data | 🔴 | NOT_FOUND | NOT_FOUND tablas | n/a | n/a | n/a | 🔴 | — | Policies `auth.uid()=user_id` post-feature |

**Gaps módulo (priorizado)**

1. Feature `comprador/` 100% greenfield (router + components + schemas + tests).
2. 7 calculators (A01/A02/A05/A07/A08/A10/A11) cero implementados — cada uno engine + tabla + procedure + UI.
3. Cron `discover_weekly_generate` con observability `ingest_runs` (regla cron observability obligatoria — lección 14 crons shipped sin ejecución).
4. Pre-approval partners API (BBVA/Santander/Kueski/Creditas) + tabla `pre_approvals` pgsodium-encrypted (decisión H1: stub permanente vs activar partner real).
5. Apartado escrow Stripe Connect (depende FASE 18).
6. Family accounts + RLS compartido (wishlist + permisos approver/viewer).
7. Mapeo `lifepath` ↔ Lifestyle Match (decisión producto: reemplazar lifepath actual o nuevo flow paralelo).

**Frontend canon prototype mapping**

Prototype JSX componentes que cubren acciones M18 (port-as-is desde `tmp/product_audit_input/DMX-prototype/src/`):
- `ColoniaComparator.jsx` → base de `<ComparadorMulti />` (acción 8) — UX side-by-side validada.
- `Hero.jsx` + `SearchBar.jsx` → cubren landing pre-onboarding (acción 1).
- `IntelligenceEngine.jsx` → patrón "intelligence panels" reutilizable para Tab Inversión (M20) y dashboards calculator results.
- `LiveTicker.jsx` → patrón ticker reutilizable para Score Alerts feed.
- `PropertyListings.jsx` → cubre Watchlist + Discover Weekly carousel (acciones 10, 12).
- `Stats.jsx` → patrón KPI dashboard reutilizable para `<CompradorDashboard />` hero (acción 2).
- `CustomCursor.jsx`, `primitives.jsx`, `icons.jsx` → primitives globales reutilizables.

Prototype NO cubre: AffordabilityCalc, InversionSimulator, TCOCalculator, PatrimonioForecast, TimingOptimizer, PreApprovalWidget, FamilyAccountSettings, ApartarDialog, DisclaimerBanner, DiscoverWeeklyCarousel (componentes calc-heavy + post-auth — fuera de scope landing prototype).

---

<a id="m19"></a>

## M19 — Marketplace Público (Landing + Rutas)

**Resumen ejecutivo módulo**

Este módulo es el de mayor cobertura prototype JSX (App.jsx contiene 13 secciones, 12 mapean directo a M19 landing canon). Backend: `app/[locale]/page.tsx` es placeholder 7 líneas. NO hay landing M19 implementada. SÍ existen rutas: `/indices`, `/metodologia`, `/atlas`, `/wrapped/[year]`, `/lifepath`, `/scorecard-nacional`, `/preview/{4 personas}` — todas funcionales. Faltan: `/explorar`, `/asesores/[slug]`, `/proyectos/[id]` (M20). De 8 procedures `public.*` declaradas: 0 implementadas; sí existen `indicesPublic.*` y `newsletter.*` que cubren parcialmente. % overall: **35%** (parcial: indices/metodologia/atlas/wrapped + 2 features cercanas; landing + explorar + microsites NO).

**Matriz de auditoría**

| # | Acción Frontend | UI Status | tRPC Procedure | Tabla BD (rows) | Cascada/Trigger | Audit Log | Prototype Comp | Overall | Evidence | Action Required |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `<PublicNavbar />` (logo + nav + lang switcher + login CTA) | 🔴 | n/a (UI-only) | n/a | n/a | n/a | ✅ `Navbar.jsx` | 🔴 | grep `PublicNavbar` 0 hits; `app/[locale]/page.tsx` 7 líneas placeholder | Port `Navbar.jsx` → `<PublicNavbar />` shared/RSC |
| 2 | `<Hero />` con mock dashboard 3 KPIs + chart momentum + 4 zone scores | 🔴 | NOT_FOUND `public.getHeroData` (cache stats) | NOT_FOUND `public_stats_cache` (no existe en BD) | n/a | 🔴 | ✅ `Hero.jsx` (canon spec FASE 07.7.A.1) | 🔴 | grep `Hero` no DMX hits; prototype completo con BlurText/CountUp ya speccado | Port `Hero.jsx` + crear `public_stats_cache` + procedure |
| 3 | `<PhotoCarousel />` HD fotos proyectos destacados | 🔴 | NOT_FOUND | NOT_FOUND `proyectos.photos` (tabla `photos` no existe) | n/a | 🔴 | NOT_FOUND prototype específico (sólo `PropertyListings.jsx` cubre cards) | 🔴 | grep 0 hits; `PropertyListings.jsx` reutilizable | Port + tabla photos |
| 4 | `<Ticker />` stats animado (108+ scores / 7 índices / 50+ fuentes / 16 alcaldías) | 🔴 | depende de `public.getHeroData` | n/a (counts) | n/a | n/a | ✅ `LiveTicker.jsx` | 🔴 | grep `Ticker` parcial hits no DMX; prototype completo | Port `LiveTicker.jsx` (60s linear loop) |
| 5 | `<Pillars />` 3 pilares (IE / Marketplace / AI Copilot) | 🔴 | n/a (static i18n copy) | n/a | n/a | n/a | parcial: `IntelligenceEngine.jsx` cubre layout pilares | 🔴 | grep `Pillars` 0 hits | Componente nuevo + i18n keys |
| 6 | `<ZoneExplorer />` 5 zonas × 6 metrics interactivos | 🔴 | NOT_FOUND `public.getZoneExplorerData` | ✅ `zone_scores` (5,267 rows) datos disponibles vía agregación | ✅ cascade triggers | n/a | ✅ `ColoniasBento.jsx` cubre layout 5-zona bento | 🔴 | grep `ZoneExplorer` 0 hits; prototype completo | Port `ColoniasBento.jsx` + procedure aggregation |
| 7 | `<HowItWorks />` 4 pasos (Ingestamos / Cruzamos / Scores / Decides) | 🔴 | n/a (static) | n/a | n/a | n/a | NOT_FOUND prototype específico (no `HowItWorks.jsx`) | 🔴 | grep 0 hits; sección no en App.jsx prototype | Diseñar componente nuevo (no en prototype) |
| 8 | `<MoatTable />` vs CoStar/LocalLogic/WalkScore/Habi | 🔴 | n/a (static) | n/a | n/a | n/a | NOT_FOUND prototype específico | 🔴 | grep 0 hits; no en App.jsx | Componente nuevo + i18n table |
| 9 | `<FinalCTA />` signup CTA + `<PublicFooter />` newsletter signup | 🔴 | parcial: `newsletter.subscribeZonePreference` ✅ implementado en `features/newsletter/routes/newsletter-public.ts` | `newsletter_subscribers` (0 rows, schema OK con triggers) | ✅ `newsletter_subscribers_set_updated_at` | n/a | ✅ `CtaFooter.jsx` | 🟡 | tRPC route OK; UI footer falta | Port `CtaFooter.jsx` + cablear newsletter procedure |
| 10 | `/explorar` mapa Mapbox 7 capas simplificado | 🔴 | NOT_FOUND `public.getExplorarLayers` | depende M17 source tables (todas NOT_FOUND) | n/a | 🔴 | parcial: `MapOverlay.jsx` cubre overlay UI | 🔴 | `find app/[locale]/explorar` 0 matches | Bloqueado por M17 ingestors |
| 11 | `/indices` rankings públicos top-20 colonias × 7 índices | ✅ | ✅ `indicesPublic.getRanking`, `getMovers`, `getIndexDetail`, etc en `features/indices-publicos/routes/indices-public.ts` | ✅ `dmx_indices` (3,192 rows), `zone_scores` (5,267 rows) | ✅ cascade triggers | n/a | parcial: `Stats.jsx` patrón rankings reutilizable | ✅ | `app/[locale]/(public)/indices/page.tsx` ✅ + 10 sub-rutas (`/movers`, `/streaks`, `/alpha`, `/backtest`, etc) | Validar cumple wireframe M19 (top 20 + filters) |
| 12 | `/metodologia` transparency S&P-style + per-index detail | ✅ | ✅ `indicesPublic.getMethodology` | `dmx_indices_methodology_versions` ✅ existe | n/a | n/a | NOT_FOUND prototype | ✅ | `app/[locale]/(public)/metodologia/page.tsx` ✅ + `[indexCode]/page.tsx` ✅; `MethodologyCard.tsx`, `MethodologyDetailClient.tsx`, `MethodologyPDF.tsx` existen | OK shipped |
| 13 | `/asesores/[slug]` microsite anonymized (VIEW `public_profiles` sin PII) | 🔴 | NOT_FOUND `public.getAsesorMicrosite` | ✅ VIEW `public_profiles` existe (MCP verificado: 11 cols, sin email/phone) | n/a (view) | n/a | NOT_FOUND prototype | 🔴 | `find app/[locale]/asesores` 0 matches | Crear ruta + procedure (VIEW ya cierra SEC-01) |
| 14 | `public.submitNewsletter` double opt-in Resend | ✅ | ✅ `newsletter.subscribeZonePreference` + `app/api/newsletter/confirm` route | `newsletter_subscribers` (0 rows, schema con `consent_lfpdppp` OK) | ✅ trigger updated_at | n/a | ✅ `CtaFooter.jsx` newsletter UI prototype | ✅ | `features/newsletter/routes/newsletter-public.ts` L60-90 OK; rate-limit checked | Validar Resend webhook + double opt-in token flow |
| 15 | `<DMXWrappedTeaser />` enero anual viral (Spotify Wrapped pattern) | 🟡 | parcial: `app/[locale]/(public)/wrapped/[year]/page.tsx` ✅ existe; teaser banner en landing falta | ✅ `dmx_wrapped_snapshots` (0 rows, schema OK) | n/a | n/a | NOT_FOUND prototype específico | 🟡 | `features/newsletter/lib/wrapped-builder.ts` ✅ existe; landing teaser banner falta | Componente teaser + cron `annual_wrapped` |
| 16 | `referrals.generateLink` + `trackReferral` UTM | 🔴 | NOT_FOUND `referrals.*` | NOT_FOUND `referrals` table | n/a | 🔴 | NOT_FOUND prototype | 🔴 | grep `referrals` 0 hits | H2 según ADR-008; H1 stub permanente |
| 17 | SSG/ISR + Vercel OG dynamic + JSON-LD multi-locale | 🟡 | n/a (Next.js features) | n/a | n/a | n/a | n/a | 🟡 | rutas `/indices`, `/metodologia` ya tienen `generateMetadata` + `alternates.languages` (verificado código) | Replicar pattern al landing root + `/asesores` + `/proyectos` |
| 18 | A11y AA + i18n 5 locales (es-MX/CO/AR/pt-BR/en-US) | 🟡 | n/a | n/a | n/a | n/a | n/a (prototype hardcoded es-MX) | 🟡 | `messages/{5}.json` existen ✅; rutas existentes ya pasan `setRequestLocale` | Validar nuevas rutas pendientes M19 cumplen |
| 19 | `/proyectos/[id]` (delegado a M20) | 🔴 | depende M20 | depende M20 | depende M20 | depende M20 | depende M20 | 🔴 | ver M20 | — |
| 20 | Faq sección landing (no canon doc, sí prototype) | 🟡 | n/a (static) | n/a | n/a | n/a | ✅ `Faq.jsx` + ✅ `app/[locale]/(public)/faq/page.tsx` ya existe | 🟡 | route existe; landing Faq section embed pendiente | Decidir: section landing vs page standalone |

**Gaps módulo (priorizado)**

1. Landing root `app/[locale]/page.tsx` reemplazar placeholder por landing canon completo (12 secciones App.jsx prototype + HowItWorks + MoatTable nuevos).
2. Tabla `public_stats_cache` + procedure `public.getHeroData` (counts + chart momentum + 4 zone scores hardcoded inicial).
3. Ruta `/explorar` (bloqueada por M17 ingestors → 5 ingestors source layers).
4. Ruta `/asesores/[slug]` microsite + procedure `public.getAsesorMicrosite` (VIEW `public_profiles` ya cierra SEC-01).
5. Componentes nuevos sin prototype: `<HowItWorks />`, `<MoatTable />`, `<DMXWrappedTeaser />` banner.
6. `referrals.*` (H2 — H1 stub permanente).
7. Photo carousel + tabla `photos` (depende M11 inventario dev → M20).
8. Validación A11y + JSON-LD organization schema.org en root.

**Frontend canon prototype mapping**

Cobertura prototype → M19 landing (App.jsx orden):
- `CustomCursor.jsx` → primitive global (M19 + comprador post-auth).
- `Navbar.jsx` → `<PublicNavbar />` (acción 1).
- `Hero.jsx` → `<Hero />` (acción 2).
- `SearchBar.jsx` → componente landing search input (no en M19 doc canon, presente prototype).
- `LiveTicker.jsx` → `<Ticker />` (acción 4).
- `ColoniasBento.jsx` → `<ZoneExplorer />` (acción 6).
- `ColoniaComparator.jsx` → no en M19 landing canon (mapea M18 acción 8 ComparadorMulti).
- `PropertyListings.jsx` → `<PhotoCarousel />` parcial (acción 3).
- `IntelligenceEngine.jsx` → `<Pillars />` parcial (acción 5) + IE explainer.
- `Stats.jsx` → cubre KPI rankings (acción 11 y patrón Hero metrics).
- `Testimonials.jsx` → no en M19 canon doc (sección extra prototype, decisión producto: incluir o omitir).
- `Faq.jsx` → ✅ ya existe en DMX `/faq` (acción 20); decidir si embed landing o standalone.
- `CtaFooter.jsx` → `<FinalCTA />` + `<PublicFooter />` (acción 9).
- `MapOverlay.jsx` → `<ExplorarMap />` (acción 10) — overlay map UI base.
- `primitives.jsx` (BlurText/FadeUp/StaggerContainer/CountUp/AnimatedBar) → primitives globales `shared/ui/motion/`.
- `icons.jsx` (19 SVG icons) → `shared/ui/icons/`.

Prototype NO cubre M19 canon: `<HowItWorks />`, `<MoatTable />`, `<DMXWrappedTeaser />`, `/asesores/[slug]` microsite, `referrals.*`.

---

<a id="m20"></a>

## M20 — Ficha Proyecto Personalizada

**Resumen ejecutivo módulo**

`/proyectos/[id]` ruta NO EXISTE en `app/`. Tabla `proyectos` NO EXISTE en BD (verificado MCP — sólo aparece como referencia en docs). De 7 procedures declaradas (`public.getProjectById`, `scores.getProjectScoresFull`, `scores.calculateInversion/TCO/Patrimonio`, `public.getPriceHistory`, `public.getProjectBrokers`, `apartado.initiate`, `visitas.scheduleFromPublic`): 0 implementadas. De 11 tablas declaradas, sólo `project_scores` (0 rows, schema OK) y `zone_scores` (5,267 rows) existen. % overall: **0%**.

**Matriz de auditoría**

| # | Acción Frontend | UI Status | tRPC Procedure | Tabla BD (rows) | Cascada/Trigger | Audit Log | Prototype Comp | Overall | Evidence | Action Required |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Render `/proyectos/[id]` SSG/ISR (no-auth) | 🔴 | NOT_FOUND `public.getProjectById` | NOT_FOUND `proyectos`, `unidades`, `precios_unidad`, `photos` | n/a | 🔴 | parcial: `PropertyListings.jsx` (prototype) cubre tarjetas/listing pero no ficha individual | 🔴 | `find app/[locale] -name *.tsx -path *proyectos*` 0 matches | Crear 4 tablas core + ruta + procedure principal |
| 2 | `<ProjectHero />` photos + datos básicos + share + wishlist | 🔴 | NOT_FOUND | NOT_FOUND tablas | n/a | 🔴 | NOT_FOUND prototype específico | 🔴 | grep 0 hits | Componente + integración photos |
| 3 | `<ProjectTabs />` 3 tabs (Zona / Inversión / Riesgos) | 🔴 | NOT_FOUND | n/a (compose) | n/a | n/a | NOT_FOUND prototype | 🔴 | grep 0 hits | Componente RSC con tabs interactivos |
| 4 | `<TabZona />` scores IE + ecosystem SCIAN + safety FGJ + transit + walkability | 🔴 | NOT_FOUND `scores.getProjectScoresFull` | parcial: `zone_scores` ✅ (5,267 rows); SCIAN scores OK (`features/scian/routes/scian.ts`); FGJ NO; walkability NO | ✅ `zone_scores` cascade | n/a | NOT_FOUND prototype | 🔴 | grep `getProjectScoresFull` 0 hits; SCIAN feature ✅ existe | Procedure compose + ingestors FGJ + walkability index |
| 5 | `<TabInversion />` A02 + A05 + A11 + DMX-IPV índice | 🔴 | NOT_FOUND scores.calculate* (M18 also 0 implementados) | NOT_FOUND tablas calc | n/a | 🔴 | parcial: `IntelligenceEngine.jsx` (prototype) patrón panels | 🔴 | grep 0 hits | Compartir engines con M18 (DRY) + DMX-IPV |
| 6 | `<TabRiesgos />` DMX-IRE + H03 seismic + N07 water + F12 risk map | 🔴 | NOT_FOUND | parcial: H03 climate-twin parcial, N07/F12 NO | n/a | 🔴 | NOT_FOUND prototype | 🔴 | `features/climate-twin/` ✅ existe pero no integrado a project ficha | Engines índices + integración climate-twin existente |
| 7 | `<ApartarCTA />` (auth-gated) → flow M18 apartado | 🔴 | NOT_FOUND `apartado.initiate` (también NOT_FOUND M18) | NOT_FOUND `apartados` | n/a | 🔴 | NOT_FOUND prototype | 🔴 | grep 0 hits | Stripe Connect (FASE 18 dependency) |
| 8 | `<AgendarVisitaDialog />` asesor picker + Google Calendar + `visitas.scheduleFromPublic` | 🔴 | NOT_FOUND `visitas.*` | NOT_FOUND `visitas`, `project_brokers` | n/a | 🔴 | NOT_FOUND prototype | 🔴 | grep `visitas` 0 hits; Google Calendar API no integrado | 2 tablas + procedure + Google Calendar OAuth + asesor picker |
| 9 | `<PriceHistoryAccordion />` + `public.getPriceHistory` | 🔴 | NOT_FOUND | NOT_FOUND `precios_unidad` | n/a | 🔴 | NOT_FOUND prototype | 🔴 | grep 0 hits | Tabla price history + procedure + chart UI |
| 10 | `<DisclaimersBanner />` post-venta T&Cs visible | 🔴 | NOT_FOUND | NOT_FOUND `disclaimers_acceptance` | n/a | 🔴 | NOT_FOUND prototype | 🔴 | grep 0 hits | Componente shared con M18 |
| 11 | `<PersonalizedLayout />` re-order tabs por buyer_persona auth | 🔴 | depende M18 `comprador.updateBuyerPersona` (NOT_FOUND) | depende M18 user persona table (NOT_FOUND) | n/a | 🔴 | NOT_FOUND prototype | 🔴 | grep 0 hits | Bloqueado por M18 persona definition |
| 12 | `<IEScoreExplainer />` cada score con citation | 🟡 | parcial: `ieScores.*` ✅ existe en `features/ie/routes/scores.ts` | ✅ `zone_scores` `citations` jsonb col existe | ✅ cascade | n/a | NOT_FOUND prototype | 🟡 | tRPC ✅ existe pero no embebido en ficha proyecto | Componente shared + integrar a TabZona |
| 13 | OpenGraph dynamic + JSON-LD Place + Product schema.org | 🔴 | n/a | NOT_FOUND `proyectos` para inputs | n/a | n/a | n/a | 🔴 | `app/api/og/` no contiene project route | Vercel OG route + generateMetadata + JSON-LD compose |
| 14 | RLS public read + auth-gated apartar/visitas | 🔴 | NOT_FOUND | NOT_FOUND tablas | n/a | n/a | n/a | 🔴 | — | Policies post-tablas |
| 15 | i18n 5 locales + multi-country addressCountry JSON-LD | 🟡 | n/a (Next.js) | n/a | n/a | n/a | n/a | 🟡 | pattern existente en `/indices`/`/metodologia` replicable | Aplicar pattern al renderer ficha |

**Gaps módulo (priorizado)**

1. Tablas core: `proyectos`, `unidades`, `precios_unidad`, `photos`, `project_brokers`, `visitas`, `apartados`, `disclaimers_acceptance` (8 tablas, todas NOT_FOUND).
2. Procedures `public.getProjectById`, `getPriceHistory`, `getProjectBrokers` + `visitas.scheduleFromPublic` + `scores.getProjectScoresFull`.
3. Engines compartidos M18 (A02/A05/A11) — diseño DRY.
4. DMX-IPV (Índice Potencial Valorización) + DMX-IRE (Índice Riesgo Espacial) — engines índices propietarios nuevos.
5. Integración con `climate-twin` feature existente (H03/N07/F12).
6. Vercel OG dynamic per-project + JSON-LD Place + Product schema.org.
7. Google Calendar OAuth (asesor availability) + asesor picker.
8. RLS + disclaimers post-venta flow.

**Frontend canon prototype mapping**

Prototype JSX cobertura M20:
- `IntelligenceEngine.jsx` → patrón panels para Tab Inversión / Tab Riesgos (data-dense Bloomberg-style).
- `PropertyListings.jsx` → patrón cards para project listing index (no ficha individual).
- `MapOverlay.jsx` → mini-map TabZona.
- `ColoniaComparator.jsx` → patrón comparativa "vs media ciudad" en TabZona.
- `Stats.jsx` → patrón KPI hero `<ProjectHero />`.
- `primitives.jsx` (CountUp, AnimatedBar, FadeUp) → animaciones scores/bars.

Prototype NO cubre M20 canon: `<ProjectHero />` específico, `<ProjectTabs />`, `<TabZona/Inversion/Riesgos />`, `<ApartarCTA />`, `<AgendarVisitaDialog />`, `<PriceHistoryAccordion />`, `<DisclaimersBanner />`, `<PersonalizedLayout />`, `<IEScoreExplainer />`. La ficha proyecto es 100% greenfield porque prototype es landing, no detalle proyecto.

---

---

<a id="inconsistencias"></a>

## Inconsistencias detectadas (cross-módulos)

### 1. Doc canon vs realidad BD

| Doc canon afirma | BD live actual | Acción |
|---|---|---|
| `15_CONEXIONES_E2E_Dopamine_Backend.md` afirma "110 tablas, 64 funciones, 36 triggers, 9 tRPC routers existen" para Pulppo-clone | 240 tablas existen pero NINGUNA del dominio CRM Asesor; 38 routers, ninguno asesorCRM/developer/admin | Banner SUPERSEDED frontend (aplicado vía ADR-048) + nota "backend canon refleja repo viejo Pulppo, no estado H1 actual" |
| Spec M03 afirma "schema limpio NO heredado de Pulppo/DISC" | Biblia v5 cap.15 lista `disc_profiles` como tabla canon | Decisión producto: DISC entra (entonces honrar biblia) o sale (entonces honrar M03 spec rewrite) |
| Spec M02 afirma "Quality Score badges con ACM" | Tabla `acm_results`/`acm_valuaciones` NOT_FOUND, función `calculate_acm` NOT_FOUND | Schema + función SQL pre-implementación M02/M05 |
| Spec M07 afirma export Excel "✅ EXISTE" línea 560 | Package `xlsx` NOT instalado | Validar `npm install xlsx` o alternativa JS pre-implementación M09 export |
| Spec M16 referencia `feature_registry`/`feature_flags` | Migration histórica `20260424220000_rename_feature_registry_to_ui_feature_flags.sql` aplicada; tabla real `ui_feature_flags` | Spec M16 necesita addendum editorial pre-FASE 19 |

### 2. Naming mismatches BD vs canon doc

| BD shipped | Canon doc usa | Decisión pendiente |
|---|---|---|
| `fiscal_docs` | `fiscal_documents` (M07/M12) | Renombrar tabla o actualizar docs |
| `desarrolladoras` | `developers` (M10) | Mantener español (consistente con `unidades`/`contactos`) o anglicizar |
| `macro_series` | `macro_indicators` (M16) | ADR de reconciliación |
| `market_anomalies` | `anomalies` (M15/M16) | Mantener `market_anomalies` (más preciso) y actualizar specs |
| `ui_feature_flags` | `feature_registry`/`feature_flags` (M16) | Spec ya outdated por migration de rename — actualizar M16 |
| `zone_alert_subscriptions` | `score_subscriptions` (M18) | Mantener `zone_alert_subscriptions` (granularity zona) y actualizar M18 |
| `user_scores` (cols IE: score_type/score_value/level/tier/components) | `user_buyer_profiles` con `buyer_persona`/`budget`/`timeline` (M18) | Crear nueva tabla `user_buyer_profiles` (NO renombrar `user_scores` — son entidades distintas) |

### 3. Numeración módulos divergente

| Catálogo `04_MODULOS/` | Doc canon backend `15_CONEXIONES` | Resolución |
|---|---|---|
| M08 Marketing Asesor | M9 Marketing | ADR canonización numeración (recomendación: honrar `04_MODULOS/` que es spec funcional vigente) |
| M09 Estadísticas Asesor | M10 Estadísticas | idem |
| M10 Dashboard Dev | (no aparece en canon doc) | idem |
| M11-M20 | (no cubiertos por canon doc backend) | Canon doc backend NO actualizado para M11-M20 — gap doc backend |

### 4. Frontend canon prototype vs portales internos

- Prototype JSX cubre M19 70%, M18 25%, M17 5%, M20 10%, **0% M01-M16**.
- Portales asesor (M01-M09) y dev/admin (M10-M16) son backoffice 100%.
- Gap: sistema de design backoffice canon NO incluido en `tmp/product_audit_input/DMX-prototype/`.
- Acción: sub-bloque futuro debe definir backoffice DS canon (extensión de tokens/primitives sobre el frontend canon prototype) + portar componentes shared (Sidebar, Topbar, KpiCard, Kanban, DataTable, Form pattern, FiltersBar, etc.).

### 5. Pages admin/comprador out-of-spec ya existentes

- `app/[locale]/(admin)/admin/{newsletter-ab, ingest/market, ingest/upload}` existen y son funcionales pero NO aparecen en las 17 pages numeradas del spec M16.
- Acción: addendum editorial M16 spec o ADR para incorporarlas oficialmente.

### 6. Routers tRPC ausentes (lista exhaustiva)

`server/trpc/root.ts` registra 38 sub-routers, todos IE/atlas/STR/scoring/auth/observability. Faltan:

**M01-M09 (Portal Asesor):** `asesorCRM`, `gamification`, `notifications`, `matching`, `scrapers`, `legal`, `catalogos`, `marketing`, `operaciones`, `captacion`, `photos`, `tareas`, `developer` (hybrid asesor/dev).

**M10-M16 (Portal Dev + Admin):** `developer.*`, `devCRM.*`, `devMarketing.*`, `fiscal.*`, `contabilidad.*`, `admin.*`, `analytics.*`, `lead_score.*`.

**M17-M20 (Observatory + Comprador + Public):** `observatory.*`, `comprador.*`, `public.*` (excepto `submitNewsletter` shipped), `apartado.*`, `credit.*`, `familyAccount.*`, `visitas.*`, `referrals.*`, `wishlist.*`.

Total ~30+ routers nuevos a registrar.

---

<a id="priorizacion"></a>

## Recomendaciones de priorización

Cruzando RICE/critical-path (`docs/08_PRODUCT_AUDIT/03_RICE_PRIORITIES.md` + `04_ROADMAP_INTEGRATION.md`) con assets reusables detectados.

### Top 10 quick wins (alto impacto / bajo effort, anclaje BD ya listo)

1. **M16 Audit Log Reader UI** — `audit_log` particionado completo. Falta `<AuditLogTable />` + procedure `admin.getAuditLog`. Compliance unblock.
2. **M16 Role Matrix Editor UI** — `role_features` 432 + audit triggers + `ui_feature_flags` 120. Backend listo, UI editor + procedure `admin.updateRoleFeatures` faltan.
3. **M14 IECardEmbed shared component** — `zone_scores` listo. Componente shared desbloquea kit ventas + landings + portales públicos (cross-módulo).
4. **M16 Feature Registry Table UI** — `ui_feature_flags` 120 rows + audit triggers. UI table + procedure `admin.listFeatures`.
5. **M19 Reemplazar `app/[locale]/page.tsx` placeholder con landing real** — primer touchpoint usuarios; portar `Navbar/Hero/LiveTicker/ColoniasBento/CtaFooter` (5 componentes prototype canónicos ya speccados en ADR-048).
6. **M19 Score Alerts (M18 ↔ M19 conexión)** — `zone_scores.trg_zone_scores_webhook_emit` + `score_change_deliveries` ya existen. Solo falta cablear consumer (WA / email) y UI subscribe.
7. **M19 `/asesores/[slug]` routes** — VIEW `public_profiles` ya cierra SEC-01. Falta solo ruta + procedure wrapper.
8. **M19 Wrapped teaser banner enero** — `/wrapped/[year]` ya producción. Solo falta hero banner conditional.
9. **M16 Macro dashboard** — `macro_series` 880 rows + partitioning. Solo falta procedure + UI charts.
10. **M16 Anomalies feed** — `market_anomalies` schema E04-ready. Solo falta pipeline ingest + UI feed `<AnomaliasFeed />`.

### Top 5 críticos (bloqueantes pre-FASE comercial)

1. **Schema BD core CRM Asesor** (P0): `contactos`, `busquedas`, `captaciones`, `operaciones`, `visitas_programadas`, `tareas`, `actividad_timeline`, `notificaciones`, `asesor_gamification`. Bloquea M01-M09 entero.
2. **Schema BD core Inventario Dev** (P0): `projects`/`proyectos`, `unidades`, `prototipos`, `fotos`, `esquemas_pago`, `precios_unidad`, `avance_obra`, `project_competitors`, `marketing_assets`. Bloquea M02 + M11 + M14 + M15 + M16 moderation + M20.
3. **Routers tRPC dominio CRM/dev/admin/observatory/comprador/public** (~30+ routers).
4. **Naming reconciliation ADR** — fiscal_docs, desarrolladoras, macro_series, market_anomalies, ui_feature_flags, zone_alert_subscriptions, user_scores → decisión founder pre-implementación M07/M10/M12/M15/M16/M18.
5. **Backend canon doc update** — `15_CONEXIONES_E2E_Dopamine_Backend.md` necesita banner "Pulppo histórico, NO estado actual H1" + actualización M11-M20 (no cubiertos).

### Top 5 frontend canon port (Wave 1 ADR-048 M3a/M3b)

1. **icons.jsx** (2h CC) — required by todos.
2. **primitives.jsx** (4h CC) — required by Hero/Bento/Comparator/PropertyListings/IE/Stats/Testimonials/Faq/CtaFooter.
3. **tokens.css refresh** (4h CC) — required by todos. Replace `--gradient-p` + add cream variants + canon shadows + canon durations.
4. **Navbar.jsx + Hero.jsx** (14h CC) — first paint above-the-fold M19.
5. **SearchBar.jsx** (8h CC) — first conversion M19.

Total Wave 1: ~32h CC pace 4x = ~8h wall-clock = ~1 día CC.

### Funciones SQL críticas a crear (P0)

- `normalize_phone` (libphonenumber lógica) — bloqueante M03.
- `match_busqueda_inventario` — bloqueante M04.
- `calculate_acm` — bloqueante M05.
- `calculate_commission` + `generate_operation_code` + `generate_operation_documents` — bloqueante M07.
- `get_asesor_dashboard` + `get_morning_briefing` — bloqueante M01.
- `generate_auto_tasks` — bloqueante M06.

---

**Audit DOCS-ONLY · zero código fuente modificado · evidence-based estricto vía Read + Bash + MCP Supabase.**

**Sub-agents drafts originales:** `tmp/A.1-drafts/SA-Audit-M01-M05.md`, `SA-Audit-M06-M10.md`, `SA-Audit-M11-M16.md`, `SA-Audit-M17-M20.md`, `SA-FrontendCanon.md` (gitignored).
