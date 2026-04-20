# FASE 19 — Portal Admin (17 Pages + Market Observatory 7 capas Mapbox + Super-Admin Tools)

> **Duración estimada:** 7 sesiones Claude Code (~28 horas con agentes paralelos)
> **Dependencias:** FASE 01 (BD completa), FASE 02 (Auth + RLS + role='superadmin' + feature_registry), FASE 03 (AI-Native Shell + Command Palette), FASE 04 (Design System), FASE 07 (Ingesta datos geo), FASE 08-12 (IE completo — zone_scores + dmx_indices + E04 Anomaly Detector), FASE 13-14 (Portal Asesor referenciado), FASE 15-18 (Dev + Contabilidad + Legal wireados).
> **Bloqueantes externos:**
> - **Mapbox token admin tier** (con uso elevado — ~20K cargas/mes) para 7 capas simultaneous.
> - **Sentry DSN** admin-only para error monitoring.
> - **PostHog project** activo para platform analytics agg.
> - **Vercel Analytics** API habilitado (para system health widget).
> - **Supabase `service_role` key** solo server-side (nunca expuesta cliente) para impersonation audit.
> - Feature registry completo seeded (FASE 02).
> **Resultado esperado:** Portal Admin `(admin)` group con 17 páginas navegables por role='superadmin'. Middleware guard estricto (403 si no super-admin). Market Observatory con 7 capas Mapbox toggleables. Impersonation tool con audit log. Bulk operations (aprobación masiva). Config global + feature flags + emergency kill switches. Auditoría completa de acciones admin. Feature Registry CRUD + Role Features matriz. Stripe webhooks monitor + replay. Cohort Analysis + Revenue. System Health real-time. Tag `fase-19-complete`.
> **Priority:** [H1]

## Contexto y objetivo

El portal admin es el centro de comando interno DMX. Acá el equipo de plataforma (Manu + equipo) vigila la salud de la plataforma, aprueba participantes nuevos, resuelve disputes escaladas, analiza cohorts, configura feature flags (gating no-code), monitorea APIs, y accede al **Market Observatory** — la vista maestra de la inteligencia DMX (7 capas Mapbox superpuestas) que es a la vez la materia prima del IE y la demostración más potente del moat (lo que convence a inversionistas y enterprise customers).

Crítico:
- Middleware guard estricto: NO es suficiente ocultar UI — backend valida role='superadmin' en cada tRPC procedure admin.
- Impersonation con audit inmutable: cada impersonation registra quien, cuándo, a quién, por qué. Session del impersonator visible con badge visible en todas las vistas.
- Market Observatory es heavy: 7 capas Mapbox requieren optimización (vector tiles, clustering, LOD).
- Emergency kill switches: feature flags que pueden apagar partes del sistema sin deploy (ej: "apagar nuevos signups", "apagar emisión CFDI", "apagar marketplace público").

## Bloques

### BLOQUE 19.A — Layout admin + guard middleware

#### MÓDULO 19.A.1 — Layout `(admin)` group

**Pasos:**
- `[19.A.1.1]` Ruta `app/(admin)/layout.tsx` con middleware guard. Server-side validation:
  ```ts
  const user = await getSession();
  if (!user || !await isSuperadmin(user.id)) redirect('/403');
  ```
- `[19.A.1.2]` Sidebar admin con 17 items agrupados:
  - **Section "Overview"**: Dashboard, Revenue, System Health.
  - **Section "Content"**: Projects, Participantes, Zonas, Anomalías.
  - **Section "Intelligence"**: Market Observatory, Macro.
  - **Section "Users & Access"**: Feature Registry, Role Features, Audit Log.
  - **Section "Revenue & Ops"**: Cohort Analysis, Cohort Revenue, Stripe Webhooks, API Metrics.
  - **Section "Config"**: Config Global.
- `[19.A.1.3]` Header con impersonation banner (si active) + user info + logout.
- `[19.A.1.4]` Middleware `tRPC.adminProcedure` (extends `authenticatedProcedure`): valida rol superadmin antes ejecutar handler. Throws 403 si no.
- `[19.A.1.5]` Audit interceptor en cada admin mutation → log a `admin_actions` tabla.

**Criterio de done del módulo:**
- [ ] Login no-admin intentando acceder `/admin/*` → 403.
- [ ] Banner impersonation visible cuando active.
- [ ] Sidebar 17 items visibles + clickables.

### BLOQUE 19.B — Páginas 1-4 (Dashboard + Projects + Participantes + Revenue)

#### MÓDULO 19.B.1 — Page 1: Dashboard AARRR platform metrics

**Pasos:**
- `[19.B.1.1]` `/admin/dashboard/page.tsx` con 5 bloques AARRR:
  - **Acquisition**: new signups (7d/30d/90d) per role (asesor/dev/comprador) + source (organic/referral/ads).
  - **Activation**: % que completa onboarding dentro de 7 días, % primer lead creado, % primer matching.
  - **Retention**: WoW retention curve, DAU/MAU ratio, churn mensual.
  - **Revenue**: MRR, ARR, ARPU per role, ARR growth rate.
  - **Referral**: referral rate, viral coefficient, NPS.
- `[19.B.1.2]` Data consolidada desde `platform_metrics_daily` tabla (cron FASE 24 populates). Recharts Line + Bar.
- `[19.B.1.3]` Selectores rango + segmentación (país, rol, plan).
- `[19.B.1.4]` Alert cards: "Churn subió 15% última semana", "Revenue en MX supera CO por primera vez".

**Criterio de done del módulo:**
- [ ] 5 bloques AARRR renderizan.
- [ ] Selector rango actualiza charts.

#### MÓDULO 19.B.2 — Page 2: Projects management (global)

**Pasos:**
- `[19.B.2.1]` `/admin/projects/page.tsx` con tabla global de TODOS los proyectos (cross-dev): filtros por dev, status, zona, país, completitud docs.
- `[19.B.2.2]` Columnas: nombre, dev, ciudad, zona, unidades total/disp, completitud %, DMX Score, published? (flag).
- `[19.B.2.3]` Acciones: flag for review (moderation), force unpublish, reassign to dev, delete (soft).
- `[19.B.2.4]` Bulk operations: selectar N proyectos → aprobar todos / despublicar todos / reassign dev.
- `[19.B.2.5]` Detail modal con full project data + audit log cambios.

**Criterio de done del módulo:**
- [ ] Tabla carga 500+ proyectos con virtualization.
- [ ] Bulk unpublish 10 proyectos funciona.

#### MÓDULO 19.B.3 — Page 3: Participantes (asesores/devs/MBs — approval flow)

**Pasos:**
- `[19.B.3.1]` `/admin/participantes/page.tsx` con tabs: Asesores | Desarrolladores | Master Brokers | Compradores.
- `[19.B.3.2]` Tabla con filtros: status (pending_approval/approved/suspended), KYC status (incomplete/complete/verified), is_active.
- `[19.B.3.3]` Approval flow queue: pendientes mostrados prominentes — click → modal con:
  - Datos personales + docs KYC (identity, tax, domicilio).
  - Background check (partnerships external — Mati/Jumio opcional).
  - Comentarios admin previo.
  - CTAs: Approve / Reject / Request more info.
- `[19.B.3.4]` Suspension flow con razón obligatoria + downstream effects (soft-delete patterns §20.4).
- `[19.B.3.5]` Bulk approve: selectar N → approve all con confirm modal.

**Criterio de done del módulo:**
- [ ] Approve asesor → flag `is_approved=true` + notif email.
- [ ] Suspend dev → cascada despublica proyectos.

#### MÓDULO 19.B.4 — Page 4: Revenue dashboard (Stripe aggregate)

**Pasos:**
- `[19.B.4.1]` `/admin/revenue/page.tsx` consolidado Stripe:
  - MRR por producto (asesor plans + dev plans + fee por venta + API).
  - Churn MRR, Expansion MRR, New MRR.
  - Top paying customers.
  - Recent invoices con status.
  - Failed payments queue.
- `[19.B.4.2]` Fuente: Stripe API `balance_transactions.list` + local cache `stripe_events` tabla + `subscriptions`.
- `[19.B.4.3]` Breakdown por país (aggregation en `subscriptions.country_code`).
- `[19.B.4.4]` Payouts pendientes (connected accounts) + próximos (next_payout_at).
- `[19.B.4.5]` Export CSV mensual.

**Criterio de done del módulo:**
- [ ] MRR calculado == Stripe dashboard.
- [ ] Export abre en Excel sin warning.

### BLOQUE 19.C — Page 5: Market Observatory (la joya)

#### MÓDULO 19.C.1 — Mapbox base + 7 capas toggleables

**Pasos:**
- `[19.C.1.1]` `/admin/market-observatory/page.tsx` con Mapbox GL JS full-screen.
- `[19.C.1.2]` Controles lateral derecho: 7 toggles para capas + filtros comunes (rango fecha, alcaldía, proyecto status).
- `[19.C.1.3]` **Capa 1 — Catastro CDMX (parcelas por valor catastral)**:
  - Source: Supabase tabla `geo_data_points` type='catastro_parcela' (FASE 07 ingiere).
  - Layer type: fill-extrusion con color-scale por `valor_catastral_m2` (5 cubetas: 0-10K gris, 10-25K azul, 25-50K verde, 50-100K amarillo, >100K rojo).
  - Hover popup: cuenta catastral, superficie, valor, último año actualización.
- `[19.C.1.4]` **Capa 2 — DENUE heatmap** (densidad económica + tier ratios):
  - Source: `geo_data_points` type='denue_establishment' + agregación zone_score F03.
  - Layer: heatmap-density + optional circle cluster per SCIAN macro_category.
  - Selector: filtrar por tier (premium/standard/basic) o macro_category (ALIMENTACION/SALUD/…).
  - Ratio premium:basic visible en popup zona (indicador gentrificación).
- `[19.C.1.5]` **Capa 3 — FGJ heatmap (criminalidad)**:
  - Source: `geo_data_points` type='fgj_incident' con categoría (alto_impacto/bajo_impacto/patrimonial/violencia).
  - Layer: heatmap weight=incident_severity_numeric.
  - Filtros por categoría + rango fecha (últimos 12 meses por default).
  - Popup click: top 5 tipos delito zona + trend 6m.
- `[19.C.1.6]` **Capa 4 — GTFS rutas + estaciones Metro/Metrobús/Tren**:
  - Source: `geo_data_points` type='gtfs_stop' + `geo_data_points` type='gtfs_route'.
  - Layer: line (routes) + circle (stops). Color por modo (Metro verde, Metrobús naranja, Tren azul, EcoBici rojo).
  - Click estación: líneas que pasan + frecuencia promedio + ridership.
- `[19.C.1.7]` **Capa 5 — zone_scores composite DMX Score**:
  - Source: `zone_scores` tabla con `DMX-IPV` index_value (o otro seleccionable).
  - Layer: fill por polígono de colonia con color-scale 0-100 gradient rojo→amarillo→verde.
  - Hover: tooltip nombre colonia + score + rank alcaldía.
- `[19.C.1.8]` **Capa 6 — Desarrollos (pines por status)**:
  - Source: `projects` con lat/lng.
  - Layer: circle + icon por status (disponible verde, en_construccion amarillo, entregado azul, vendido gris).
  - Click: popup con nombre + dev + unidades disp + DMX Score + CTA "Ver ficha".
- `[19.C.1.9]` **Capa 7 — Demanda heatmap (búsquedas + wishlist + search_logs)**:
  - Source: aggregation `search_logs` + `wishlist` + `busquedas` pun fijas (centro zona búsqueda).
  - Layer: heatmap weight=match_count últimos 90d.
  - Útil para devs al evaluar feasibility.

**Criterio de done del módulo:**
- [ ] 7 capas toggleables sin conflict.
- [ ] Render inicial <3s, toggle capa <500ms.
- [ ] Hover popups correctos.

#### MÓDULO 19.C.2 — Cross-layer analysis + exports

**Pasos:**
- `[19.C.2.1]` Tool "Análisis interseccional": user dibuja polígono en mapa → agrega métricas de todas las capas intersectadas:
  - # establecimientos DENUE por tier.
  - # incidentes FGJ por categoría.
  - # estaciones GTFS.
  - Zone scores promedio.
  - # desarrollos + unidades disponibles.
  - # búsquedas activas.
- `[19.C.2.2]` Export: GeoJSON + PDF report del polígono analizado.
- `[19.C.2.3]` Save custom view: user guarda combo capas + zoom + filters para reusar.
- `[19.C.2.4]` Share link público (slug) con view pre-configurado para demos a externos.

**Criterio de done del módulo:**
- [ ] Polígono dibujo + análisis cross <5s.
- [ ] PDF report descarga.

### BLOQUE 19.D — Pages 6-9 (Macro + Zonas + Anomalías + API Metrics)

#### MÓDULO 19.D.1 — Page 6: Macro dashboard

**Pasos:**
- `[19.D.1.1]` `/admin/macro/page.tsx` consolida fuentes macro (Banxico + INEGI + SHF).
- `[19.D.1.2]` Indicadores: tasa de referencia, TIIE28, FX, INPC, INPP Construcción, IPV nacional, créditos hipotecarios mensuales.
- `[19.D.1.3]` Charts temporales (Recharts Line) 12/24/36 meses.
- `[19.D.1.4]` Alertas auto: "INPP subió >10% YoY → revisar pricing devs" (cron macro_alerts).
- `[19.D.1.5]` Export dashboard PDF mensual para reports ejecutivos.

**Criterio de done del módulo:**
- [ ] 7+ indicators rendean con data real.
- [ ] Alert auto-dispara si threshold cruzado.

#### MÓDULO 19.D.2 — Page 7: Zonas con zone_scores + filtros

**Pasos:**
- `[19.D.2.1]` `/admin/zonas/page.tsx` con tabla de todas las colonias (o zonas L-BMX) con scoring.
- `[19.D.2.2]` Columnas: zona, ciudad, alcaldía, F01 Safety, F03 Ecosystem, F08 LQI, H16 Evolution, DMX-IPV, DMX-MOM, DMX-LIV, # proyectos, # unidades, densidad demanda.
- `[19.D.2.3]` Filtros: min/max por cada score, rank top N, trending up (momentum >+0.5σ).
- `[19.D.2.4]` Click zona → detalle completo: scoring breakdown, evolution chart 24 meses, proyectos en zona, búsquedas activas, fuentes usadas.
- `[19.D.2.5]` Export XLSX rankings por score seleccionado.

**Criterio de done del módulo:**
- [ ] Tabla 500 zonas con virtualization.
- [ ] Detalle zona completo.

#### MÓDULO 19.D.3 — Page 8: Anomalías (E04 Anomaly Detector feed)

**Pasos:**
- `[19.D.3.1]` `/admin/anomalias/page.tsx` consume `market_anomalies` tabla populated por E04 cron.
- `[19.D.3.2]` Feed style (Twitter-like) con cards: tipo (price_spike, absorption_drop, search_surge, gentrification_acceleration), zona/proyecto afectado, severidad (high/medium/low), descripción AI-generated, evidencia (metric values).
- `[19.D.3.3]` Acciones: investigar (open related dashboard), archivar, crear tarea admin, notif a devs en zona.
- `[19.D.3.4]` Filtros por tipo + severidad + ciudad.
- `[19.D.3.5]` Real-time channel: nuevas anomalías aparecen en vivo.

**Criterio de done del módulo:**
- [ ] Feed renderiza anomalías existentes.
- [ ] Realtime push funciona.

#### MÓDULO 19.D.4 — Page 9: API Metrics

**Pasos:**
- `[19.D.4.1]` `/admin/api-metrics/page.tsx` consume `api_request_logs`:
  - Requests/día chart 30d.
  - Top 10 consumers (api_key_id → customer).
  - Revenue per customer mes actual.
  - Error rate % + top error types.
  - Rate limit violations.
- `[19.D.4.2]` Breakdown por endpoint (/scores/livability, /scores/momentum, etc.).
- `[19.D.4.3]` Alertas: customer consuming >90% rate limit (upsell opportunity).
- `[19.D.4.4]` Detalle customer: logs recientes + billing + notes.

**Criterio de done del módulo:**
- [ ] Charts renderean desde logs reales.
- [ ] Breakdown correcto.

### BLOQUE 19.E — Pages 10-12 (Cohort Analysis + Revenue + System Health)

#### MÓDULO 19.E.1 — Page 10: Cohort Analysis (ABRA + churn)

**Pasos:**
- `[19.E.1.1]` `/admin/cohorts/page.tsx` con cohort table estilo Mixpanel:
  - Rows: cohort (month of signup).
  - Cols: period (M0, M1, M2, ..., M12).
  - Cells: retention % (users active that period from that cohort).
- `[19.E.1.2]` Triángulo visual con gradient color por cell.
- `[19.E.1.3]` Selector metric: retention, activation, feature usage (Matching, briefings, etc.).
- `[19.E.1.4]` Segmentación por role + plan + país.
- `[19.E.1.5]` Backed by `platform_metrics_daily` + joins con `profiles` created_at + `events`.

**Criterio de done del módulo:**
- [ ] Cohort table renderiza con gradient correcto.
- [ ] Segmentación cambia cells.

#### MÓDULO 19.E.2 — Page 11: Cohort Revenue (LTV por cohort)

**Pasos:**
- `[19.E.2.1]` `/admin/cohort-revenue/page.tsx` cohort table con cells = revenue acumulado.
- `[19.E.2.2]` Métricas: LTV promedio cohort, payback period, CAC:LTV ratio (si cost data disponible Fase 22 Marketing).
- `[19.E.2.3]` Charts complementarios: LTV evolution cohort-over-cohort.

**Criterio de done del módulo:**
- [ ] Revenue cohort table renderiza.
- [ ] LTV cálculo consistente.

#### MÓDULO 19.E.3 — Page 12: SystemHealthWidget

**Pasos:**
- `[19.E.3.1]` `/admin/system-health/page.tsx` widget real-time:
  - `/api/health` endpoints: [`/db`, `/storage`, `/auth`, `/realtime`, `/crons`] con status OK/DEGRADED/DOWN.
  - Supabase status: pull desde status.supabase.com API.
  - Vercel status: pull desde vercel.com/status API.
  - Sentry errors rate últimas 24h.
  - AI API availability (Anthropic + OpenAI uptime).
- `[19.E.3.2]` Widget color-coded (verde all OK, amarillo degraded, rojo down).
- `[19.E.3.3]` Alertas: si any DOWN → email + Slack alert + PagerDuty (Fase 24 wiring).
- `[19.E.3.4]` Historial incidentes últimos 30d con MTTR promedio.

**Criterio de done del módulo:**
- [ ] Widget refresca cada 30s.
- [ ] Endpoint /api/health retorna JSON válido.

### BLOQUE 19.F — Pages 13-17 (Feature Registry + Role Features + Audit + Stripe Webhooks + Config)

#### MÓDULO 19.F.1 — Page 13: Feature Registry

**Pasos:**
- `[19.F.1.1]` `/admin/features/page.tsx` CRUD de `feature_registry` tabla.
- `[19.F.1.2]` Tabla: feature_key, description, default_value, value_type (bool/number/string), category.
- `[19.F.1.3]` Crear: key (unique), descripción, tipo, default, categoría (crm/ie/billing/ai).
- `[19.F.1.4]` Editar default_value — aviso: cambio afecta usuarios sin override.
- `[19.F.1.5]` Soft delete + archivado.

**Criterio de done del módulo:**
- [ ] Crear feature aparece inmediatamente.
- [ ] Default change reflejado en `resolve_features`.

#### MÓDULO 19.F.2 — Page 14: Role Features assignment (matriz)

**Pasos:**
- `[19.F.2.1]` `/admin/role-features/page.tsx` matriz interactiva: roles (asesor/dev/mb/comprador/superadmin) × features.
- `[19.F.2.2]` Cada celda editable: toggle bool, input number, selector string.
- `[19.F.2.3]` Save button → batch update `role_features`.
- `[19.F.2.4]` Preview effect: "Este cambio afectará 1,234 asesores" (cuenta users with that role sin override).
- `[19.F.2.5]` Undo: last change revertible.

**Criterio de done del módulo:**
- [ ] Matriz carga 50 features × 5 roles en <2s.
- [ ] Cambio persiste + resolve_features refleja.

#### MÓDULO 19.F.3 — Page 15: Audit log reader

**Pasos:**
- `[19.F.3.1]` `/admin/audit-log/page.tsx` consume `audit_log` + `admin_actions`.
- `[19.F.3.2]` Filtros: user, action_type (login/logout/create/update/delete/impersonate), entity_type, rango fecha.
- `[19.F.3.3]` Tabla con timestamp, actor, action, target, IP, user-agent.
- `[19.F.3.4]` Detail modal: full JSON payload del evento.
- `[19.F.3.5]` Export CSV para análisis externo o forensics.
- `[19.F.3.6]` Policies: este page solo superadmin + readonly (no edits, audit log es inmutable).

**Criterio de done del módulo:**
- [ ] Filtros combinables funcionan.
- [ ] Export CSV genera archivo correcto.

#### MÓDULO 19.F.4 — Page 16: Stripe webhooks monitor

**Pasos:**
- `[19.F.4.1]` `/admin/stripe-webhooks/page.tsx` consume `webhook_logs` filtered source='stripe'.
- `[19.F.4.2]` Tabla: event_id, event_type (customer.subscription.created, invoice.payment_succeeded, etc.), received_at, processed_at, status (ok/failed/replayed), response_code.
- `[19.F.4.3]` Filtros por event_type + status.
- `[19.F.4.4]` Replay action: manual trigger re-process evento fallado.
- `[19.F.4.5]` Stats panel: last 24h events count, failure rate, avg processing time.

**Criterio de done del módulo:**
- [ ] Tabla muestra últimos 1000 events.
- [ ] Replay exitosamente procesa evento.

#### MÓDULO 19.F.5 — Page 17: Config global / feature flags

**Pasos:**
- `[19.F.5.1]` `/admin/config/page.tsx` con secciones:
  - **Emergency kill switches**: toggles globales (signups_enabled, cfdi_emission_enabled, marketplace_public_enabled, ai_features_enabled).
  - **Business config**: dmx_platform_fee_pct (default 1%), default_holdback_pct (20%), escrow_dispute_max_days (14), payout_schedule_default.
  - **Integrations config**: Anthropic model default (claude-sonnet-4), OpenAI fallback model, Mapbox token rotation, Stripe mode test/prod.
  - **Feature flags growth experiments**: flag A/B tests activos.
- `[19.F.5.2]` Cualquier toggle dispara audit + notif a todos los admin (evita cambios accidentales).
- `[19.F.5.3]` Confirmation modal 2-step para kill switches (previene misclick).
- `[19.F.5.4]` Rollback: last valid config restore.

**Criterio de done del módulo:**
- [ ] Kill switch test apaga feature en <30s.
- [ ] Audit registra cambio.

### BLOQUE 19.G — Super-admin tools: impersonation + bulk + emergency

#### MÓDULO 19.G.1 — Impersonation

**Pasos:**
- `[19.G.1.1]` UI: en Participantes page, botón "Impersonate" (solo superadmin).
- `[19.G.1.2]` Click → modal "Razón obligatoria" (debugging, support, moderation, auditoría).
- `[19.G.1.3]` Backend: tRPC `admin.startImpersonation({ targetUserId, reason })` crea session ephemeral con `impersonator_id` + `target_user_id` + `started_at` + `reason` en `admin_impersonations` tabla.
- `[19.G.1.4]` JWT session switched to target_user context (mantiene original en claim `original_user`).
- `[19.G.1.5]` Banner visible en todas las vistas: "Estás viendo como {target.name}. [Exit impersonation]".
- `[19.G.1.6]` Todas acciones mientras impersonation: log con `is_impersonation=true` flag.
- `[19.G.1.7]` Exit button → `admin.stopImpersonation` restaura original session.
- `[19.G.1.8]` Max duration 1h automático con warning a 55min.

**Criterio de done del módulo:**
- [ ] Impersonate user funciona + banner visible.
- [ ] Audit log registra acciones con flag.
- [ ] Exit restore original.

#### MÓDULO 19.G.2 — Bulk operations

**Pasos:**
- `[19.G.2.1]` En páginas 2 (Projects) y 3 (Participantes) + otras: checkbox rows + bulk action dropdown.
- `[19.G.2.2]` Operations: approve, unpublish, suspend, export, bulk notify.
- `[19.G.2.3]` Confirmation modal con count afectado + CTAs.
- `[19.G.2.4]` Ejecuta in background con progress bar (queue worker).
- `[19.G.2.5]` Report final: success count + errors list.

**Criterio de done del módulo:**
- [ ] Bulk approve 50 asesores en <30s.
- [ ] Report precisos.

#### MÓDULO 19.G.3 — Emergency flags

**Pasos:**
- `[19.G.3.1]` Big red button `/admin/emergency`: "Pausar operaciones críticas".
- `[19.G.3.2]` Opciones: pause new signups, pause payments, pause AI, pause marketplace público.
- `[19.G.3.3]` Confirmation double-click + reason + email Manu (dual-confirm).
- `[19.G.3.4]` Auto-unpause después de N horas (default 4h) con re-confirm option.
- `[19.G.3.5]` Audit + notif all admins instant.

**Criterio de done del módulo:**
- [ ] Pause payments test apaga Stripe webhook processing.
- [ ] Auto-unpause fires después de 4h.

## Criterio de done de la FASE

- [ ] 17 pages navegables con role='superadmin'.
- [ ] Middleware guard estricto (server + client).
- [ ] Market Observatory con 7 capas Mapbox + análisis interseccional.
- [ ] Impersonation con audit inmutable.
- [ ] Bulk operations en 5+ pages.
- [ ] Emergency flags funcionales.
- [ ] Feature Registry CRUD + Role Features matriz.
- [ ] Audit Log reader + export.
- [ ] Stripe webhooks monitor + replay.
- [ ] SystemHealth real-time.
- [ ] Cohorts + Cohort Revenue.
- [ ] Config global con kill switches.
- [ ] i18n via `t('admin.*')`.
- [ ] Tests Vitest coverage ≥70% + Playwright e2e (login admin → verifica 17 pages load + bulk op + impersonate + market observatory render).
- [ ] Tag git `fase-19-complete`.
- [ ] Features entregados: 30 (target §9 briefing).

**Dependencia cruzada:** Este archivo referencia M16 Dashboard Admin + M17 Market Observatory (docs/04_MODULOS/) — los escribe Agente H en BATCH 2.

## Próxima fase

FASE 20 — Portal Comprador (10 pages + personalización Netflix + UPG 7.11 Buyer Experience)

---

## Laterals pipeline (proposed durante ejecución previa)

Ver registro maestro: `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md`

Aplican en esta fase:
- **L20 DMX Data Quality Dashboard** (Datadog pattern) — observability pública del IE: scores actualizados/min, cascades fallidas, latencia worker, freshness por fuente, queue depth. Bloque sugerido: integrar en M17 Market Observatory como tab "IE Health" o nuevo M18 dedicado.
- **L21 DMX Pipeline Audit Trail** (Vercel Functions Logs pattern) — log explorable por score: cascade trigger → queue → worker → persist → downstream cascades. Bloque sugerido: integrar en M16 Dashboard Admin como UI drill-down sobre score_history + cascade execution logs.
- **L27 DMX Sector Maps** (CB Insights pattern) — visualizaciones segmentadas del mercado: zonas premium consolidadas vs emergentes, devs por tier H05, matriz competitive intel B07. Bloque sugerido: integrar en M17 Market Observatory como tab "Sector Maps" + export PDF para reportes B2B trimestrales.

Al ejecutar FASE 19, revisar status en pipeline maestro y confirmar incorporación al scope.

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent E) | **Fecha:** 2026-04-17
