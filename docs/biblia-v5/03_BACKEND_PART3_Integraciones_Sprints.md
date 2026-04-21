# BIBLIA DMX v5 — BACKEND COMPLETO
## PART 3 de 3: Integraciones + Stripe + Notificaciones + Soft Delete + Sprints R0-R10
## Contenido ÍNTEGRO de BACKEND_DMX_v4_PART3
## Fase: Referencia para todas las fases
---
# BIBLIA BACKEND — DesarrollosMX v4
## Integraciones · Stripe · Notificaciones · Soft Delete · Cross-Portal · Sprints R0-R10
## PART 3 de 3 (Módulos 6–7)
## Fecha: 8 abril 2026

---

# MÓDULO 6: INTEGRACIONES + WEBHOOKS + STRIPE + NOTIFICACIONES + SOFT DELETE + CROSS-PORTAL

## 6.1 Stripe Integration + Monetización (conservado de v3 + expandido)

### Modelo de monetización

```
FASE 1 (lanzamiento): Todo gratis — validar producto.
FASE 2 (post-validación): Dos revenue streams:
  - Suscripción asesor/dev: Free → Starter → Pro → Enterprise
  - Fee por venta: 0.5% del valor de cierre al desarrollador

FASE 3 (IE monetizado): Tres revenue streams:
  - Suscripciones marketplace
  - API IE (Livability, Momentum, Risk, Estimate)
  - Productos (Reports, Site Selection)
```

### Planes asesor (conservado v3)

```
Free:       $0      | 50 contactos  | 10 búsquedas  | 2 AI dossiers/mes  | 2 briefings
Starter:    $499/mes| 200 contactos | 50 búsquedas  | 10 AI dossiers     | 4 briefings
Pro:        $999/mes| Ilimitado     | Ilimitado      | 30 AI dossiers     | 8 briefings
Enterprise: $2,499  | Ilimitado+equipo | Ilimitado   | Ilimitado          | Ilimitado
```

### Planes desarrollador (conservado v3)

```
Free:       $0      | 1 proyecto  | 5 AI extractions | 1 Drive monitor | 2 GB
Starter:    $999/mes| 5 proyectos | 20 extractions   | 5 monitors      | 10 GB
Pro:        $2,999  | Ilimitado   | 50 extractions    | Ilimitado       | 50 GB
Enterprise: Custom  | Ilimitado   | Ilimitado          | Ilimitado       | Ilimitado+API
```

### Planes API externa (NUEVO v4)

```
Free:       $0          | 100 queries/día  | Solo score + label (sin components)
Starter:    $5,000/mes  | 10K queries/día  | Components incluidos
Pro:        $25,000/mes | 100K queries/día | Historical + trends + bulk
Enterprise: Custom      | Unlimited        | SLA 99.9%, dedicated support, custom endpoints
```

### Stripe webhook handler (conservado v3)

```typescript
// /api/payments/webhook/route.ts
switch (event.type) {
  case 'invoice.paid':
    → subscriptions UPDATE status='active', current_period_end
  case 'invoice.payment_failed':
    → subscriptions UPDATE status='past_due' + notificar usuario
  case 'customer.subscription.deleted':
    → subscriptions UPDATE status='cancelled' + downgrade to free
  case 'customer.subscription.updated':
    → subscriptions UPDATE plan_id (upgrade/downgrade)
}
```

### Feature gating (conservado v3 + expandido)

```typescript
async function checkFeatureLimit(userId: string, feature: string): Promise<{allowed, limit, used}> {
  const sub = await getActiveSubscription(userId);
  const features = sub?.plans?.features;
  const limit = features?.[feature];
  if (!limit || limit === -1) return { allowed: true, limit: Infinity, used: 0 };
  const used = await countFeatureUsage(userId, feature);
  return { allowed: used < limit, limit, used };
}

// Features gateados:
// max_contacts, max_searches, ai_dossiers_month, ai_briefings_month (asesor)
// max_projects, ai_extractions_month, drive_monitors, storage_gb (dev)
// max_asesores, max_projects_authorized (MB)
// NUEVO v4: max_captaciones, max_props_secundarias, acm_month, api_queries_day
```

## 6.2 Sistema de Notificaciones (15 tipos v3 + 5 nuevos v4 = 20)

### Tipos conservados de v3 (15)

```
1.  Unidad vendida         → Dev + asesores + compradores watchlist
2.  Precio cambió          → Compradores watchlist + asesores
3.  Lead nuevo             → Asesor asignado (in_app + email + whatsapp)
4.  Visita agendada        → Dev (sala ventas) + asesor
5.  Operación creada       → Dev + admin
6.  Documento procesado    → Dev
7.  Objeciones precio >70% → Dev
8.  Score cambió >5%       → score_subscribers según config
9.  Tarea vencida          → Asesor
10. SLA vencido            → Asesor + MB
11. Autorización aprobada  → Asesor solicitante
12. Review recibida        → Dev
13. Pago próximo           → Comprador
14. Anomalía detectada     → Admin
15. Briefing semanal       → Cada asesor activo
```

### Tipos NUEVOS v4 (5)

```
16. Momentum cambió señal    → Compradores watchlist en zona + asesores zona
    Trigger: N11 cambió de señal (estable→positivo, positivo→negativo)
    Canal: in_app + email
    Mensaje: "La colonia [X] muestra momentum [positivo/negativo] — [razón]"

17. Badge desbloqueado       → Asesor
    Trigger: asesor_gamification.badges UPDATE
    Canal: in_app
    Mensaje: "¡Felicidades! Desbloqueaste badge [nombre]"

18. Discover Weekly listo    → Comprador con búsqueda activa
    Trigger: Cron discover_weekly_generate (lunes 8am)
    Canal: email + in_app
    Mensaje: "3 proyectos que coinciden con tu búsqueda esta semana"

19. ACM generado             → Asesor que solicitó ACM
    Trigger: acm_valuaciones INSERT
    Canal: in_app
    Mensaje: "Tu valuación para [dirección] está lista: $[precio_sugerido]"

20. Captación avanzó etapa   → Asesor (si auto) o MB (si equipo)
    Trigger: captaciones UPDATE etapa
    Canal: in_app
    Mensaje: "Captación [dirección] avanzó a [etapa]"
```

### Configuración por usuario (conservado v3)

```
Tabla: notificaciones_config
Campos: user_id, notification_type, channel (in_app|email|whatsapp), enabled, digest_mode
Página: /[portal]/configuracion → toggles por tipo × canal
```

## 6.3 Webhooks (conservado v3 + expandido)

### Eventos webhook existentes

```
unit_sold, price_changed, lead_created, operation_created,
operation_closed, document_processed, visit_scheduled
```

### Eventos NUEVOS v4

```
score_changed:      Cuando cualquier score cambia >5% → payload con score_type, old, new, entity
captacion_created:  Cuando se crea captación → payload con captación
prop_sec_published: Cuando propiedad secundaria pasa a 'activo'
acm_generated:      Cuando se genera ACM → payload con valuación
momentum_changed:   Cuando N11 Momentum cambia de señal
```

### Envío de webhooks (conservado v3)

```
Trigger T6 detecta evento → INSERT webhook_logs con payload
Cron o Edge Function procesa webhook_logs pendientes:
  1. SELECT * FROM webhook_logs WHERE response_status IS NULL ORDER BY created_at LIMIT 50
  2. Para cada log: POST target_url con payload + HMAC signature
  3. UPDATE webhook_logs SET response_status, response_body
  4. Si falla: webhook.failure_count++, retry con backoff
  5. Si failure_count > 10: webhook.is_active = false, notificar owner
```

## 6.4 Storage Optimization (conservado de v3)

```
IMÁGENES (proyectos + propiedades secundarias):
  UPLOAD → Validar tipo+tamaño → Sharp: WebP → 3 variantes:
    Original (max 2MB, max 2000x2000)
    Thumbnail (400x300, ~20KB)
    LQIP blur placeholder (32x24, ~1KB, base64 inline)
  
  Paths Supabase Storage:
    project-photos/{project_id}/original/{filename}.webp
    project-photos/{project_id}/thumb/{filename}.webp
    props-sec-photos/{propiedad_id}/original/{filename}.webp  ← NUEVO v4
    props-sec-photos/{propiedad_id}/thumb/{filename}.webp     ← NUEVO v4

DOCUMENTOS PDFs:
  Max 20MB. Cleanup: PDFs con status approved > 90 días → eliminar.

LÍMITES POR PLAN:
  Free: 2 GB, 20 imgs/proyecto, 5 PDFs
  Starter: 10 GB, 50 imgs, 20 PDFs
  Pro: 50 GB, 200 imgs, 100 PDFs
  Enterprise: Ilimitado
```

## 6.5 Soft Delete Patterns (conservado de v3)

### Proyecto despublicado
```
projects.publicado = false
  → project_scores: marcar valid_until = now()
  → workflow_executions activos: status = 'cancelled'
  → score_subscriptions: is_active = false
  → project_brokers: se mantienen (dev puede re-publicar)
  → unidades: se mantienen
  → Notificación: asesores "Proyecto X despublicado"
```

### Asesor dado de baja
```
profiles.is_active = false, employer_released_at = now()
  → user_scores: se mantienen (auditoría)
  → ai_generated_content: se mantienen
  → busquedas activas: etapa = 'perdida', motivo = 'asesor_dado_de_baja'
  → tareas pendientes: completar con nota "asesor desvinculado"
  → contactos: flag inactivo, histórico visible
  → visible_asesores_cache: invalidar
  → asesor_gamification: se mantiene (histórico)  ← NUEVO v4
  → captaciones activas: etapa = 'perdida'        ← NUEVO v4
  → propiedades_secundarias: estado = 'pausado'   ← NUEVO v4
  → Audit log
```

### Operación cancelada
```
operaciones.status = 'cerrada_perdida'
  → operation_timeline: stages pendientes = 'skipped'
  → payment_plans: status = 'cancelled'
  → apartados: status = 'cancelled'
  → unidad: volver a 'disponible'
  → Cascada: B08 recalcula, B09 recalcula
```

### Desarrolladora desactivada
```
desarrolladoras.activa = false
  → Todos los projects: publicado = false (trigger soft delete proyecto × N)
  → Asesores inhouse: is_active = false (trigger soft delete asesor × N)
  → Notificación admin
```

### Captación cerrada (NUEVO v4)
```
captaciones.etapa = 'perdida'
  → captaciones.closed_at = now()
  → captaciones.motivo_perdida = campo obligatorio
  → propiedades_secundarias vinculada: sin cambio (puede seguir activa)
  → Timeline: INSERT actividad_timeline action='cancelled'
  → REVERSIBLE: puede reabrir vía updateCaptacionEtapa
```

## 6.6 Cross-Portal Flows (conservado de v3 + nuevos CRM)

### Flujo maestro: De documento a venta (conservado v3)
```
DEV sube PDF → document_job → AI extrae → Tabla verde/amarillo/rojo →
DEV completa → Quality Score → Proyecto publicado →
Matching ejecuta → ASESOR recibe sugerencias →
ASESOR comparte con COMPRADOR → busqueda_proyectos →
COMPRADOR interesado → feedback (hot) →
ASESOR agenda visita → feedback post-visita →
ASESOR crea operación → timeline → checklist docs →
Apartado → Pagos → Escritura → 3 precios → IE calibra →
Trust Score → Review comprador
```

### Flujo NUEVO v4: Captación → Venta secundaria
```
ASESOR capta propiedad → captaciones INSERT (captura rápida móvil) →
ASESOR avanza pipeline: seguimiento → encuentro con propietario →
ASESOR solicita ACM → calculate_acm() con datos IE →
PROPIETARIO acepta precio → documentación → captado →
propiedades_secundarias INSERT con estado='activo' →
SYNC: propiedades_secundarias → market_prices_secondary (source='dmx_captaciones') →
IE se enriquece con datos reales del mercado secundario →
ASESOR busca comprador → búsqueda + matching →
ASESOR crea operación con propiedad_secundaria_id →
Operation flow estándar → cierre → IE calibra modelos
```

### Flujo NUEVO v4: Propiedades secundarias como fuente IE
```
ASESOR publica propiedad secundaria (estado='activo') →
Cron sync_props_to_market (mensual): agrega precios a market_prices_secondary →
IE recalcula A12 Price Fairness con datos más frescos →
IE recalcula A04 Arbitrage (nuevo vs usado) con datos reales →
Compradores ven scores más precisos → confían más → más transacciones →
Más transacciones → mejor calibración → mejores scores →
FLYWHEEL
```

### Flujo NUEVO v4: Gamification → Engagement → Datos
```
ASESOR realiza acción → trigger XP automático →
XP acumulado → level up → badge desbloqueado → notificación →
ASESOR motivado → más acciones → más datos para IE →
Leaderboard mensual → competencia sana entre asesores →
Streak de 7 días → badge "Consistente" → asesor mantiene hábito →
Más datos diarios → IE más preciso
```

---

# MÓDULO 7: SPRINTS R0-R10 ACTUALIZADOS v4

## 7.1 Resumen de fases

```
Fase  | Contenido                                      | Horas est.
──────┼────────────────────────────────────────────────┼───────────
R0    | DB + Security + tRPC + IE structure + Fixes     | 14-18
R0.5  | Multi-ciudad data load (paralelo con R1)        | 3-5
R1    | Asesor Core + CRM Pulppo tropicalizado          | 25-30
R2    | Dev Core + Analytics IE                         | 20-25
R3    | Document Intelligence pipeline                  | 24-30
R4    | Legal + Pagos + Inbox + Calendario              | 18-22
R5a-2 | IE Geo Ingesta (7 fuentes CDMX + calculators)  | 15-20
R5    | Intelligence Cruces completo                    | 16-20
R6    | Marketing + Landing + QR + Kit Ventas           | 14-17
R7    | WhatsApp + Notificaciones + Workflows           | 16-20
R8    | Portal Comprador + Post-Venta + Watchlist       | 12-16
R9    | Admin + Billing Stripe + API + Productos        | 16-20
R10   | Crons + Mobile + DR + Tests                     | 14-19
Post  | Verificación final 7 roles + Build + Visual     | 4-5
──────┼────────────────────────────────────────────────┼───────────
TOTAL |                                                 | 211-267
+25%  |                                                 | 264-334 hrs
      |                                                 | ~33-42 días
      |                                                 | ~7-9 semanas
```

## 7.2 Detalle por fase

### R0: DB + Security + Migration (14-18 hrs)

```
□ FIX BUG 1: rateLimit.ts → implementar check_rate_limit real (api_rate_limits)
□ FIX BUG 2: register-all.ts:82 → precio, m2_totales (no precio_total, superficie_m2)
□ FIX BUG 3: documentIntel.approve → unidad_esquema_desglose (no payment_breakdowns)
□ FIX SECURITY: updateProjectDetails z.any() → Zod schema explícito
□ Habilitar Point-in-Time Recovery en Supabase
□ pg_dump backup pre-migración
□ ALTER TABLEs (14 de v3 + 4 de v4)
□ CREATE 8 tablas nuevas v4 (geo_snapshots, api_keys, api_request_logs,
  asesor_gamification, captaciones, propiedades_secundarias, props_sec_fotos, acm_valuaciones)
□ Helper functions: check_rate_limit, add_asesor_xp, calculate_acm, sync_props_sec
□ RLS en TODAS las tablas nuevas
□ Triggers nuevos v4: T7-T10 (XP, precio_m2)
□ Script migración datos existentes (v3 + v4)
□ Seed supported_cities (10) + zones (16 alcaldías CDMX)
□ Seed plans (free) + workflows (5 pre-construidos)
□ tRPC: verificar 5 routers funcionales + crear scores.ts con 6 procedures
□ Crear .env.example completo
□ Crear CLAUDE.md
□ Crear vercel.json con cron schedules
□ Cron #1: score_recalculation_worker verificar funcional
□ Test RLS matrix con 7 roles → todos PASS
□ Build limpio, 0 errores
□ Tag: restructure-r0-v4
```

### R1: Asesor Core + CRM Pulppo (25-30 hrs)

```
R1a: Dashboard + Contactos (7-8 hrs)
  □ Dashboard: carrusel "¿Qué debo hacer hoy?" con RPC + scores IE
  □ Dashboard: GamificationWidget (XP, streak, level, badge reciente)
  □ Dashboard: CommissionForecast widget (C06)
  □ Dashboard: WeeklyBriefingCard (C05)
  □ Contactos: tipo_contacto field, tags, fuente, presupuesto, notas
  □ Contactos: toggle Mis/Todos (multi-tenancy con visible_asesores_cache)
  □ Contactos: detección duplicados + merge comprador
  □ Onboarding tooltips (primera vez)
  □ tRPC: asesorCRM.ts (8 procedures)
  □ tRPC: gamification.ts (3 procedures)
  □ Tag: restructure-r1a-v4

R1b: Pipeline + Búsquedas (5-6 hrs)
  □ Kanban 6+1 columnas con validaciones HARD (Pulppo style)
  □ 4 métricas superiores con $ values
  □ Lead Score badge (C01) en cada card — Hot/Warm/Cool/Cold
  □ Fuente obligatoria, motivo pérdida, pérdida reversible
  □ Tab proyectos sugeridos (C03 matching)
  □ Tag: restructure-r1b-v4

R1c: Captaciones + Props Secundarias (6-8 hrs)
  □ Captaciones Kanban 6 columnas (Pulppo tropicalizado)
  □ Captura rápida móvil (dirección + tipo + operación + precio + 1 foto)
  □ Propiedad secundaria editor (inspirado Pulppo pero simplificado)
  □ ACM con datos IE (requestACM tRPC procedure)
  □ Valuación badge verde/amarillo/rojo (estilo Pulppo pero con IE data)
  □ Inventario asesor: tabs Propias / Empresa / DMX Desarrollos / Secundarias
  □ Tag: restructure-r1c-v4

R1d: Tareas + Ops + Métricas (7-8 hrs)
  □ Tareas: 3 categorías Pulppo (Propiedades/Clientes/Prospectos)
  □ Tareas: automáticas + manuales, recordatorio relativo (1/7/15/30 días)
  □ Operaciones: wizard 6 pasos Pulppo, lado (ambos/vendedor/comprador)
  □ Operaciones: comisión con IVA 16% auto, co-broke split
  □ Operaciones: puede vincular propiedad_secundaria_id O project_id+unidad_id
  □ Métricas: slide-over rápido + /stats (Pulppo style)
  □ Métricas: SLAs (60min primera respuesta, 120min promedio)
  □ Métricas: semáforos + diseño pedagógico (consejos de mejora)
  □ Métricas: scores IE del asesor (activity_score, commission_forecast, lead quality)
  □ Tag: restructure-r1d-v4
```

### R2-R4 (conservados de v3 con actualizaciones menores)

```
R2: Dev Core (20-25 hrs) — sin cambios significativos vs v3
  R2a: Dashboard + Perfil + Trust Score
  R2b: Inventario + Historial + useRealtimeUnits
  R2c: Canal de Distribución + Lead Assignment
  R2d: Competitive Intelligence + Analytics

R3: Document Intelligence (24-30 hrs) — sin cambios vs v3
  R3a: Pipeline arquitectura
  R3b: Extracción listas precios
  R3c: Onboarding 3 pasos + trial
  R3d: Drive Monitor MVP
  R3e: AI Photo Classification

R4: Legal + Pagos + Inbox + Calendario (18-22 hrs) — sin cambios vs v3
  R4a: Checklist documentos + Timeline + 3 precios + RFC
  R4b: Apartado digital Stripe + Payment plans
  R4c: Inbox unificado MVP
  R4d: Calendarios + feedback post-visita
```

### R5a-2: IE Geo Ingesta (15-20 hrs) — NUEVO sprint v4

```
□ geo-loader.ts: batch upsert idempotente (base para todos los ingestores)
□ denue.ts: ingestar ~200K establecimientos CDMX con mapeo SCIAN
□ fgj.ts: ingestar ~100K carpetas FGJ último año
□ gtfs.ts: ingestar ~300 estaciones + paradas
□ atlas-riesgos.ts: ingestar ~500 AGEBs
□ siged.ts: ingestar ~15K escuelas
□ dgis.ts: ingestar ~5K establecimientos salud
□ sacmex.ts: ingestar ~2K registros cortes agua
□ Primer snapshot DENUE (geo_snapshots INSERT)
□ Actualizar registry.ts: agregar 11 scores nuevos (N01-N11) + 2 índices (MOM, LIV)
□ Implementar calculators: N01 Ecosystem Diversity, N08 Walkability MX
□ Implementar calculators: F01 Safety, F02 Transit, F03 Ecosystem DENUE
□ Cron: ingest_geo_orchestrator, snapshot_denue_monthly
□ Verificar: geo_data_points tiene ~820K registros CDMX
□ Verificar: zone_scores tiene scores Tier 1 calculados
□ Tag: restructure-r5a-2
```

### R5: Intelligence Cruces (16-20 hrs) — expandido v4

```
R5a: Cruces Comprador (A01, A02, A04, A05, A12)
R5b: Cruces Desarrollador (B03, B04, B07, B12, H04)
R5c: Cruces Asesor (C01 Lead Score, C03 Matching, C06 Commission Forecast)
R5d: Segundo Orden (F08 LQI, F12 Risk Map, H03 Seismic)
R5e: Scores Nuevos v4 (N04 Crime Trajectory, N07 Water Security, N11 Momentum)
  □ NOTA: N11 requiere ≥2 snapshots DENUE — funcional a partir de mes 2+
□ Crons: ingest_banxico_daily, ingest_inegi_monthly, sync_props_to_market
□ Cron: zone_scores_weekly_refresh
□ Tag: restructure-r5-complete
```

### R6-R8 (conservados de v3 con expandidos v4)

```
R6: Marketing + Landing + QR (14-17 hrs)
  + Landing pages con scores IE integrados
  + Kit Ventas con datos IE (auto-generación piezas marketing)

R7: WhatsApp + Notificaciones + Workflows (16-20 hrs)
  + 5 tipos notificación nuevos v4 (#16-#20)
  + Discover Weekly cron
  + Score change alerts via score_subscriptions

R8: Portal Comprador (12-16 hrs)
  + Lifestyle Match selector (6 perfiles)
  + Personalización homepage por perfil (Netflix pattern)
  + TCO Calculator, Investment Simulator
  + Watchlist con score alerts
  + Discover Weekly email
```

### R9: Admin + Billing + API + Productos (16-20 hrs) — expandido v4

```
R9a: Admin refactored
  □ Platform metrics AARRR dashboard
  □ Market Observatory con 7 índices DMX en mapa Mapbox
  □ Anomaly Detector feed
  □ SystemHealthWidget con /api/health
  □ API Metrics dashboard (requests/day, top consumers, revenue)
  □ Cohort Analysis

R9b: Stripe integration
  □ Checkout, webhook, portal, feature gating
  □ Planes API externa (Free/Starter/Pro/Enterprise)

R9c: API externa + Productos
  □ /api/v1/scores/livability endpoint live
  □ /api/v1/scores/momentum endpoint live
  □ /api/v1/scores/risk endpoint live
  □ /api/v1/estimate endpoint (DMX Estimate v1)
  □ /api/v1/rankings endpoint
  □ api_keys CRUD en admin
  □ Middleware: validateApiKey + checkRateLimit + logRequest
  □ Página /metodologia (pública, metodología abierta de índices)
  □ Página /indices (rankings públicos)

□ Tag: restructure-r9-complete
```

### R10: Edge Functions + Mobile + DR + Tests (14-19 hrs)

```
R10a: 14+ crons restantes implementados
  □ expire_overdue_tasks, inventory_snapshot_daily, metricas_kpi_weekly
  □ trust_score_monthly, platform_metrics_daily, payment_reminders
  □ ingest_shf_quarterly, dmx_indices_monthly, score_subscriptions_notify
  □ cleanup_old_jobs, storage_usage_update, days_on_market_update
  □ market_anomaly_detector, asesor_status_offline_check
  □ gamification_monthly_reset, props_sec_days_on_market

R10b: Mobile + UX
  □ Responsive completo (bottom nav 5 items por portal)
  □ Touch targets 44px, inputs 16px (iOS no zoom)
  □ Loading skeletons por tipo de data
  □ Centro de ayuda / FAQ
  □ Tour guiado react-joyride
  □ PWA manifest actualizado

R10c: Quality + DR
  □ Disaster Recovery Runbook (rollback por fase + PITR)
  □ Tests mínimos para 5+ calculators
  □ CI pipeline (tsc + lint + test)
  □ Lighthouse >80 en páginas públicas

□ Tag: restructure-r10-complete
```

### Post-Sprint: Verificación Final (4-5 hrs)

```
□ Build limpio: 0 errores, 0 warnings
□ Test RLS matrix con 7 roles → todos PASS
□ Verificación visual: independiente, inhouse dev, inhouse MB, 
  desarrollador, MB, superadmin, comprador
□ PostHog events verificados (12+ event types)
□ Lighthouse >80 en públicas
□ 31 crons con vercel.json → todos ejecutan correctamente
□ geo_data_points: ~820K registros CDMX verificados
□ zone_scores: scores Tier 1 calculados para 16 alcaldías
□ Tag: restructure-complete-v4
```

## 7.3 Orden de ejecución recomendado

```
PARALELO 1 (puede correr simultáneo):
  R0 (DB + Security)
  ↓
  R1 (Asesor Core + CRM) ←→ R0.5 (Multi-ciudad data load)
  ↓
  R2 (Dev Core) ←→ R5a-2 (IE Geo Ingesta)
  ↓
  R3 (Document Intelligence)
  ↓
  R4 (Legal + Pagos)

PARALELO 2 (después de R4):
  R5 (Intelligence Cruces) ←→ R6 (Marketing)
  ↓
  R7 (WhatsApp + Notif) ←→ R8 (Portal Comprador)
  ↓
  R9 (Admin + API)
  ↓
  R10 (Crons + Mobile + Tests)
  ↓
  Post-Sprint

NOTA: R5a-2 puede empezar en paralelo con R1 o R2 porque es
independiente (solo ingesta de datos geo, no toca UI).
```

## 7.4 Conteo final verificado v4

```
Métrica                          | v3        | v4
─────────────────────────────────┼───────────┼──────────
Tablas totales                   | 94-99     | 107
ALTER TABLEs                     | 14        | 18
tRPC routers                     | 11 (5 fn) | 16 (16 fn)
tRPC procedures                  | ~66 spec  | ~89 real
API routes funcionales           | 14        | 27+
API routes placeholder           | 9         | 0
RLS policies                     | ~150      | ~160
Helper functions                 | ~22       | ~25
Triggers                         | ~8        | ~12
Cron jobs                        | 23        | 31
IE scores definidos              | 97        | 107
IE scores implementados          | 5         | 5 (+ en R5a-2)
IE calculators NUEVOS v4         | 0         | 11 (N01-N11)
Índices DMX                      | 5         | 7
Ingestores implementados         | 2         | 2 (+ 7 en R5a-2)
Fuentes de datos                 | 40        | 50+
Cascadas                         | 5         | 6
Productos licenciables           | 0         | 7
Notificación tipos               | 15        | 20
Webhook event types              | 7         | 12
Tablas CRM nuevas                | 0         | 4 (captaciones, props_sec, fotos, acm)
Tablas API nuevas                | 0         | 2 (api_keys, api_request_logs)
Gamification                     | 0         | 1 tabla + 4 triggers
Tests                            | 0         | mínimos en R10c
CI/CD                            | 0         | tsc + lint + test
CLAUDE.md                        | 0         | 1
vercel.json                      | 0         | 1 (12 crons)
```

---

# CROSS-REFERENCES FINALES

```
BIBLIA_IE_DMX_v4 (5 partes):
  → Visión + Arquitectura + Fuentes + 107 Scores + 7 Índices + Cascadas + Productos + Competencia

BIBLIA_BACKEND_DMX_v4 (3 partes, este documento):
  PART 1: Arquitectura + 107 tablas con schema completo
  PART 2: Functions + Triggers + RLS + 16 tRPC routers + 31 crons + CLAUDE.md
  PART 3: Stripe + Notificaciones + Soft Delete + Cross-Portal + Sprints R0-R10

BIBLIA_FRONTEND_DMX_v4 (próximo documento):
  → Portales + Componentes + Pulppo tropicalizado + Gamification + Personalización
```

---

**FIN DE BIBLIA_BACKEND_DMX_v4 (3 PARTES COMPLETAS)**

**SIGUIENTE: BIBLIA_FRONTEND_DMX_v4**
