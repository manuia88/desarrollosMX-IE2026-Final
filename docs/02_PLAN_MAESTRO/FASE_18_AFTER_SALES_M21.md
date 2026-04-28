# FASE 18 — M21 After-Sales Care (8 bloques + cross-fn shipped)

> **Duración estimada:** ~50-60h CC-A multi-agent canon paralelo (3 ventanas)
> **Dependencias:** FASE 15 (Portal Developer M11-M15 con worksheets/contracts/lead scoring), FASE 16 (Contabilidad CFDI 4.0 + Facturapi auto-emit), FASE 17 (Doc Intelligence), Studio AI canon (Anthropic Claude Sonnet shipped)
> **Bloqueantes externos:**
> - Decisión producto: subcontractor onboarding model (invite-only H1 vs marketplace H2 — PM rec invite-only)
> - Decisión producto: inspector role (empleado dev H1 vs marketplace H2 — PM rec empleado H1)
> - Auth role nuevo: `comprador_postventa`, `subcontratista`, `inspector` (extiende profiles.role enum)
> **Resultado esperado:** Portal cliente branded post-venta + selección acabados self-serve con CFDI auto-emit + inspecciones PWA offline + work orders + portal subcontratistas + AI chatbot 24/7 Claude Sonnet + AI task management subcontratistas + insights data-driven alimentando M09/M15. Tag `fase-18-after-sales-complete`.
> **Priority:** [H1]

## Contexto y objetivo

Onyx Technologies declara **+35% retención y ocupación** post implementación After-Sales Care (Módulo 7, diferenciador #1). DMX H1 cubre 0/8 features Onyx M7 hasta esta fase. FASE 18 inserta en slot vacío post FASE 17 sin desplazar fases 19-28. Posiciona DMX como **única plataforma residencial nueva LATAM** con post-venta digitalizado completo: portal cliente branded + CFDI auto-emit en finishes selection (Onyx canadiense no tiene compliance MX) + AI chatbot 24/7 nativo + PWA inspecciones offline.

## Game-changers integrados en esta fase

| GC | Nombre | Impacto | Bloque/Módulo |
|---|---|---|---|
| GC-NEW-A | Finishes self-serve CFDI auto-emit | Único LATAM — comprador elige acabado y recibe factura instantánea | 18.B |
| GC-NEW-B | AI chatbot post-venta Claude RAG | Reduce tickets servicio cliente -70% (proyectado Onyx) | 18.F |
| GC-NEW-C | Inspecciones PWA offline | Inspector trabaja en obra sin wifi, sync al volver | 18.C |

## Bloques

### BLOQUE 18.A — Portal cliente branded + auth role + dashboard

#### MÓDULO 18.A.1 — Auth + role `comprador_postventa`

**Pasos:**
- `[18.A.1.1]` Migration extiende `profiles.role` enum con `comprador_postventa` + `subcontratista` + `inspector`.
- `[18.A.1.2]` Trigger BD: cuando `operaciones.stage='cerrada'` AND `operaciones.has_cfdi=true` → INSERT `profiles` ghost con role='comprador_postventa' invite link automático email/WA.
- `[18.A.1.3]` `/comprador-postventa/login` flow magic link Supabase auth.
- `[18.A.1.4]` Layout `app/(comprador-postventa)/layout.tsx` con guard role + branding consumer (lee dev branding desde M14 brand_kit).

**Criterio de done:** Cliente con operación cerrada recibe email invite + accede a dashboard branded con datos reales unidad.

#### MÓDULO 18.A.2 — Dashboard cliente

**Pasos:**
- `[18.A.2.1]` `/comprador-postventa/dashboard` con cards: Mi Unidad (foto+specs+status entrega), Próximos Hitos (timeline construcción + selección acabados deadline + inspección programada), Mis Documentos (contratos+garantías+manuales+CFDIs), Estado de Cuenta (pagos hechos + pendientes), Solicitudes Mantenimiento (botón crear + lista activas).
- `[18.A.2.2]` Tab "Mi Unidad" embebe foto-realtime + avance obra % desde `avance_obra` shipped + cuenta regresiva entrega.
- `[18.A.2.3]` Tab "Mis Documentos" lista `client_warranties` + `client_manuals` + `fiscal_docs` (CFDIs) con preview + download.

**Criterio de done:** Dashboard carga <2s SSR con datos reales del cliente.

### BLOQUE 18.B — Selección acabados self-serve + CFDI auto-emit

#### MÓDULO 18.B.1 — Catálogo acabados configurable por dev

**Pasos:**
- `[18.B.1.1]` Tabla `finishes_catalog` (dev_id, project_id, prototype_id, item_name, category enum cocina/baños/pisos/closets/extras, base_price, options jsonb[{name, image_url, price_delta, lead_time_days}], deadline_offset_days_before_delivery).
- `[18.B.1.2]` UI dev `/desarrolladores/postventa/finishes` CRUD catálogo por proyecto/prototipo.
- `[18.B.1.3]` Bulk upload CSV templates SAT-compliant (descripción + clave SAT + IVA).

**Criterio de done:** Dev configura 20 items catálogo en <10min con bulk upload.

#### MÓDULO 18.B.2 — Selección self-serve cliente + impacto precio

**Pasos:**
- `[18.B.2.1]` `/comprador-postventa/finishes` muestra catálogo deadline-driven (countdown).
- `[18.B.2.2]` Cliente selecciona opción → muestra `price_delta` real-time + acumulado total + impacto fiscal (deducibilidad si aplica).
- `[18.B.2.3]` Submit → INSERT `finishes_selections` (status='confirmed') → trigger BD genera `fiscal_docs` row para CFDI auto-emit.
- `[18.B.2.4]` Comunicación equipo construcción: notif type 26 "Cliente X confirmó acabado Y proyecto Z" → cron weekly export PDF/CSV per dev/proyecto.

**Criterio de done:** Cliente selecciona acabado → CFDI emit timbrado <30s + email cliente con PDF + asignación construcción visible en dev dashboard.

#### MÓDULO 18.B.3 — Auto-emit CFDI hook M12 Contabilidad

**Pasos:**
- `[18.B.3.1]` Trigger BD `finishes_selection.confirmed=true` → `fiscal_docs` INSERT con receptor=cliente RFC + concepto=item_name + monto=price_delta + IVA SAT auto-calculado.
- `[18.B.3.2]` Cron `cfdi_auto_emit_finishes_5min` toma `fiscal_docs.status='pending_finishes_emit'` → llama Facturapi.io timbrado → UUID + PDF + XML → email cliente.
- `[18.B.3.3]` Si timbrado falla → fallback Finkok PAC (memoria reference) + Sentry alert.

**Criterio de done:** CFDI emite con UUID válido + PDF XML descargables desde dashboard cliente + dev.

### BLOQUE 18.C — Inspecciones pre-entrega PWA offline

#### MÓDULO 18.C.1 — Inspector role + scheduling

**Pasos:**
- `[18.C.1.1]` Tabla `inspections` (id, unit_id, scheduled_at, scheduled_by_dev_id, inspector_id, status enum scheduled/in_progress/completed/cancelled, started_at, completed_at).
- `[18.C.1.2]` Dev dashboard `/desarrolladores/postventa/inspections` programa inspección + asigna inspector (empleado dev role='inspector').
- `[18.C.1.3]` Notif type 27 "Inspección programada" → inspector + cliente.
- `[18.C.1.4]` Cron `inspection_reminder_daily` 8am: próximas <72h dispara reminder cliente + inspector.

**Criterio de done:** Inspección programada notif a 3 actores (dev + inspector + cliente).

#### MÓDULO 18.C.2 — PWA offline app móvil checklist

**Pasos:**
- `[18.C.2.1]` `/inspecciones/[id]` PWA con service worker + IndexedDB cache.
- `[18.C.2.2]` Checklist habitación-por-habitación dynamic: Cocina (12 items), Baños (8 items per baño), Recámaras (10 items per recámara), Áreas comunes (15 items), Exterior (8 items). Items configurables por prototipo en `inspection_templates` table.
- `[18.C.2.3]` Cada item: pass/fail/N-A + foto evidencia obligatoria si fail + nota libre.
- `[18.C.2.4]` Offline mode: stores en IndexedDB → sync al volver online → trigger BD upsert `inspection_items`.
- `[18.C.2.5]` Submit final → status='completed' + genera reporte PDF auto + asigna work_orders auto para cada fail crítico.

**Criterio de done:** Inspector completa 50 items offline + sync sin error al volver online + reporte PDF generado.

### BLOQUE 18.D — Solicitudes mantenimiento + work orders

#### MÓDULO 18.D.1 — Cliente crea solicitud

**Pasos:**
- `[18.D.1.1]` `/comprador-postventa/mantenimiento/nueva` form: tipo (plomería/electricidad/acabados/electrodomésticos/garantía/otro), descripción, fotos opcional, urgencia (alta/media/baja).
- `[18.D.1.2]` Submit → INSERT `work_orders` (id, unit_id, requester_type='cliente', priority, status='created').
- `[18.D.1.3]` Trigger asigna auto a subcontratista por specialty match + availability.
- `[18.D.1.4]` Notif type 28 "Work order creado" → subcontratista + dev.

**Criterio de done:** Cliente crea WO → subcontratista recibe WA + email <60s con link al portal subcontratista.

#### MÓDULO 18.D.2 — Tracking + SLA escalation

**Pasos:**
- `[18.D.2.1]` Cliente ve status real-time desde dashboard (created/assigned/in_progress/resolved/closed).
- `[18.D.2.2]` Cron `work_order_sla_check_hourly` evalúa: priority=alta SLA 24h, media 72h, baja 7d. Si violation → notif type 29 escalación dev + reasignación.
- `[18.D.2.3]` Tabla `work_order_events` registra cada cambio de status + actor + timestamp + notas.

**Criterio de done:** WO violation SLA dispara escalación dev <60min post threshold.

### BLOQUE 18.E — Portal subcontratistas integrado

#### MÓDULO 18.E.1 — Onboarding invite-only H1

**Pasos:**
- `[18.E.1.1]` Tabla `subcontractors` (id, dev_id, name, specialty enum, contact_phone, contact_email, active, invited_by, invited_at, accepted_at).
- `[18.E.1.2]` Dev `/desarrolladores/postventa/subcontratistas` invite form → magic link Supabase auth + role='subcontratista'.
- `[18.E.1.3]` Onboarding subcontratista: confirm specialty, upload comprobante fiscal (CFDI receiver setup), accept terms.

**Criterio de done:** Subcontratista invite link → onboarded en <5min con datos completos.

#### MÓDULO 18.E.2 — Dashboard subcontratista

**Pasos:**
- `[18.E.2.1]` `/subcontratistas/dashboard` con tabs: Work Orders Asignados (lista filtrable por status), Próximos Vencimientos SLA, Historial Completados, Pagos Recibidos (linked M12 Contabilidad payouts).
- `[18.E.2.2]` Detalle WO: ver fotos, ubicación unidad, contacto cliente (mediado, no PII directa), checkin/checkout obra, upload fotos resolución, mark resolved.
- `[18.E.2.3]` Comunicación con dev/cliente vía chat in-app (NO directo cliente — mediado por sistema).

**Criterio de done:** Subcontratista resuelve WO con fotos before/after + status actualiza real-time todos los actores.

### BLOQUE 18.F — AI chatbot post-venta 24/7 Claude Sonnet

#### MÓDULO 18.F.1 — Chatbot RAG warranties + manuals

**Pasos:**
- `[18.F.1.1]` Tabla `postsale_chat_conversations` + `postsale_chat_messages` con embeddings pgvector.
- `[18.F.1.2]` Chatbot UI `/comprador-postventa/chat` reusa Studio chat patterns shipped.
- `[18.F.1.3]` Sistema RAG: indexa `client_warranties` + `client_manuals` + `finishes_catalog` + project specs en vector store. Query usuario → embedding match top 5 docs → Claude Sonnet contexto + respuesta + cita fuentes.
- `[18.F.1.4]` Cuando Claude no puede resolver (confidence <0.6) → escalación a human (notif type 30 "Chatbot escalación") asignada a equipo dev customer service.
- `[18.F.1.5]` Cada conversación cerrada → append `lead_touchpoints` cliente para timeline 360°.

**Criterio de done:** Chatbot resuelve 70%+ queries warranties/manuals sin escalación + cita docs origen.

### BLOQUE 18.G — AI task management subcontratistas

#### MÓDULO 18.G.1 — Priorización deadlines IA

**Pasos:**
- `[18.G.1.1]` Cron `ai_task_prioritizer_daily` 6am Claude Sonnet evalúa work_orders activos por subcontratista: prioriza por (SLA proximity 50% + priority 30% + dependencies 20%).
- `[18.G.1.2]` Output: ranking diario con top 3 WOs día + recomendaciones rebalanceo si subcontratista overloaded.
- `[18.G.1.3]` Notif subcontratista 7am "Tu top 3 hoy" + dev dashboard "Subcontratistas at-risk SLA".

**Criterio de done:** Top 3 ranking calculado <60s para 100 WOs activos.

### BLOQUE 18.H — Insights post-venta data-driven (cross-fn M09/M15)

#### MÓDULO 18.H.1 — Vista materializada insights

**Pasos:**
- `[18.H.1.1]` Vista `v_postsale_insights_aggregated` JOIN inspections + work_orders + finishes_selections + chat_conversations: tasas finalización inspecciones, tendencias mantenimiento por categoría, finishes más populares, satisfaction rate (si NPS implementado).
- `[18.H.1.2]` Cron `postsale_insights_weekly` lunes 9am refresca + alimenta:
  - M09 Estadísticas asesor: agregados anonimizados zona/colonia
  - M15 Analytics dev: detalle por proyecto
- `[18.H.1.3]` Reporte PDF auto trimestral por dev "After-Sales Q[N]" con métricas + benchmarking.

**Criterio de done:** Vista refresca <30s + reporte trimestral genera con 30+ métricas.

## Criterio de done de la FASE 18

- [ ] Todos los 8 bloques cerrados.
- [ ] 4 rutas portal nuevas navegables sin errores (`/comprador-postventa`, `/desarrolladores/postventa`, `/subcontratistas`, `/inspecciones`).
- [ ] 12 tablas BD nuevas + RLS strict + triggers + audit_rls_allowlist v.N+ aplicado mismo PR.
- [ ] 9 notif types nuevos (26-34) seed migration + canales WA+email+in-app.
- [ ] 3 crons nuevos activos en orchestrator + observabilidad ingest_runs (memoria 23).
- [ ] PWA offline funciona: inspector completa inspección sin wifi + sync al volver.
- [ ] CFDI auto-emit finishes selection: timbrado Facturapi <30s + cliente recibe email PDF.
- [ ] AI chatbot RAG resuelve 70%+ queries con citations.
- [ ] AI task management subcontratistas top 3 ranking diario activo.
- [ ] Insights weekly cron alimenta M09 + M15.
- [ ] Cross-fn validadas: finishes → CFDI M12 + work_orders → tareas asesor M06 + chatbot → contactos M03 timeline + insights → estadísticas M09 + M15.
- [ ] i18n: todas strings via `t('postsale.*')` cero hardcoded.
- [ ] audit-dead-ui CI passes 0 violations + ADR-018 STUBs marcados (4 señales) si subcontractor marketplace defer H2.
- [ ] Vitest coverage ≥70% features postventa + Playwright e2e cliente flow + dev flow + subcontratista flow.
- [ ] supabase gen types actualizado + commiteado.
- [ ] Tag git `fase-18-after-sales-complete`.

## Próxima fase

FASE 19 — M16 Admin (sin cambios roadmap maestro)

## L-NEW H2 derivados de FASE 18 (defer)

- L-NEW-AFTER-SALES-SUBCONTRACTOR-MARKETPLACE-PUBLIC (H2 — extender invite-only a marketplace)
- L-NEW-AFTER-SALES-INSPECTOR-MARKETPLACE (H2 — empleado-only → marketplace inspectores certificados)
- L-NEW-POSTSALE-NPS-LOOP-AUTOMATED (H2 — survey + score + AI insights)
- L-NEW-POSTSALE-WARRANTY-AUTO-RENEWAL-REMINDERS (H2)

---

**Autor:** Claude Opus 4.7 (PM canon zero preguntas — memoria 19) | **Fecha:** 2026-04-28
**Related:** ADR-061 (FASE 18 M21 dedicated), ADR-060 (FASE 15 Bucket B onyx-benchmarked)
