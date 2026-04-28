# M21 — After-Sales Care

> **Portal:** Comprador post-venta + Desarrollador (vista admin) + Subcontratistas + Inspectores
> **Rutas principales:** `/comprador-postventa/*`, `/desarrolladores/postventa/*`, `/subcontratistas/*`, `/inspecciones/*`
> **Fase donde se construye:** [FASE 18 — After-Sales M21](../02_PLAN_MAESTRO/FASE_18_AFTER_SALES_M21.md)
> **Priority:** [H1]
> **Related ADRs:** ADR-061 (FASE 18 dedicated), ADR-060 (FASE 15 Bucket B), ADR-009 (Security RLS), ADR-018 (E2E + STUBs)

---

## Descripción funcional

After-Sales Care portal completo cubriendo el ciclo post-cierre operación: portal cliente branded con contratos/garantías/manuales/edo cuenta + selección acabados self-serve con CFDI 4.0 auto-emit (único LATAM) + inspecciones pre-entrega PWA offline + work orders mantenimiento + portal subcontratistas integrado + AI chatbot 24/7 Claude Sonnet con RAG sobre warranties/manuals + AI task management subcontratistas + insights data-driven alimentando M09 Estadísticas asesor + M15 Analytics dev.

Diferenciador principal: cubre el módulo #1 de Onyx Technologies (8/8 features Onyx M7) + agrega CFDI auto-emit en finishes selection (Onyx canadiense no lo tiene) + AI chatbot Claude nativo + PWA offline para inspecciones obra sin wifi.

## Flujos principales

### Flujo 1 — Cliente accede portal post-cierre

1. `operaciones.stage='cerrada'` AND `has_cfdi=true` → trigger BD crea `profiles.role='comprador_postventa'` ghost + invite link automático email/WA.
2. Cliente click link → magic link Supabase auth.
3. Redirect `/comprador-postventa/dashboard` con branding del dev (lee desde M14 brand_kit).
4. Ve cards: Mi Unidad, Próximos Hitos, Mis Documentos, Estado de Cuenta, Solicitudes Mantenimiento.

### Flujo 2 — Selección acabados con CFDI auto-emit

1. Cliente entra `/comprador-postventa/finishes`.
2. Catálogo deadline-driven (countdown days_before_delivery) cargado desde `finishes_catalog` configurado por dev.
3. Selecciona opción → muestra `price_delta` + IVA + total acumulado real-time.
4. Submit selección → INSERT `finishes_selections.confirmed=true`.
5. Trigger BD crea `fiscal_docs.status='pending_finishes_emit'`.
6. Cron `cfdi_auto_emit_finishes_5min` toma + Facturapi.io timbrado → UUID + PDF + XML.
7. Email cliente con CFDI PDF + notif dashboard.
8. Notif type 26 "Cliente confirmó acabado" → dev dashboard + construcción team export.

### Flujo 3 — Inspección pre-entrega PWA offline

1. Dev programa inspección desde `/desarrolladores/postventa/inspections` + asigna inspector.
2. Notif type 27 "Inspección programada" → inspector + cliente.
3. Inspector llega obra (sin wifi) → abre `/inspecciones/[id]` PWA con service worker cacheado.
4. Checklist habitación-por-habitación dynamic (configurable por prototipo en `inspection_templates`).
5. Cada item: pass/fail/N-A + foto evidencia obligatoria si fail + nota libre. Stores IndexedDB.
6. Al completar → al volver online sync trigger BD upsert `inspection_items`.
7. Status='completed' → genera reporte PDF auto + asigna work_orders auto para cada fail crítico.

### Flujo 4 — Cliente crea work order mantenimiento

1. `/comprador-postventa/mantenimiento/nueva` form.
2. Submit → INSERT `work_orders`.
3. Trigger asigna auto subcontratista por specialty match + availability.
4. Notif type 28 → subcontratista WA + email.
5. Subcontratista resuelve → status='resolved' + fotos before/after.
6. Cron SLA hourly: si violation → notif type 29 escalación dev.

### Flujo 5 — AI chatbot 24/7

1. Cliente abre `/comprador-postventa/chat`.
2. Query → embedding match top 5 docs from `client_warranties` + `client_manuals` + `finishes_catalog` + project specs.
3. Claude Sonnet contexto + respuesta + cita fuentes.
4. Si confidence <0.6 → escalación human notif type 30 → equipo dev customer service.
5. Conversación cerrada → append `lead_touchpoints` para timeline 360°.

## Wireframe textual

```
┌──────────────────────────────────────────────────────────────────┐
│ DASHBOARD COMPRADOR POST-VENTA           [chat 24/7] [👤 cliente] │
├──────────────────────────────────────────────────────────────────┤
│ ┌─Mi Unidad────────┐ ┌─Próximos Hitos──┐ ┌─Mis Documentos──────┐│
│ │ Apartado 3B      │ │ ▪ Acabados      │ │ Contrato APS ✓      ││
│ │ Torre Vista      │ │   deadline 12d  │ │ Garantía estructura ││
│ │ Avance obra 78%  │ │ ▪ Inspección    │ │ Manual cocina       ││
│ │ Entrega: jul 26  │ │   programada    │ │ CFDI ABC-123 ✓     ││
│ └──────────────────┘ └─────────────────┘ └─────────────────────┘│
│ ┌─Edo Cuenta───────┐ ┌─Solicitudes Mant.───────────────────────┐│
│ │ Pagado: $850K    │ │ [+ Nueva Solicitud]                     ││
│ │ Pendiente: $1.2M │ │ ▪ Filtración baño 2do — en progreso     ││
│ │ Próximo: 15 may  │ │ ▪ Closet sin aldaba — resuelto          ││
│ └──────────────────┘ └─────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

## Componentes UI requeridos

- `<ClientPortalLayout />` — auth guard + branding consumer
- `<MyUnitCard />` — foto+specs+avance obra+entrega countdown
- `<UpcomingMilestonesCard />` — timeline construcción + deadlines
- `<MyDocumentsList />` — warranties + manuals + CFDIs
- `<FinishesSelector />` — catálogo deadline-driven + price delta real-time
- `<FinishOptionCard />` — imagen + nombre + delta precio + lead time
- `<InspectionPWA />` — service worker + IndexedDB + checklist offline
- `<InspectionRoomChecklist />` — items pass/fail/N-A + foto evidencia
- `<WorkOrderForm />` — tipo + descripción + fotos + urgencia
- `<WorkOrderTimeline />` — events log + status real-time
- `<SubcontractorDashboard />` — WOs asignados + SLA + pagos
- `<AIChatbot />` — Claude Sonnet RAG + cita fuentes + escalación human
- `<DevPostsaleAdmin />` — vista admin dev: catálogo finishes + scheduling inspections + invite subcontratistas

## Procedures tRPC consumidas

- `postsale.getClientDashboard`, `getMyUnit`, `getMyDocuments`, `getUpcomingMilestones`.
- `postsale.listFinishesCatalog`, `selectFinish`, `getFinishesSelections`.
- `postsale.scheduleInspection`, `assignInspector`, `submitInspection`.
- `postsale.createWorkOrder`, `listMyWorkOrders`, `getWorkOrderDetail`, `assignSubcontractor`.
- `postsale.listMyAssignedWorkOrders` (subcontractor), `markWorkOrderResolved`, `uploadResolutionPhotos`.
- `postsale.chatStartConversation`, `chatSendMessage`, `chatEscalateToHuman`.
- `postsale.getInsightsAggregated` (alimenta M09/M15).
- `postsale.adminListFinishes`, `adminCreateFinish`, `adminInviteSubcontractor`.

## Tablas BD tocadas

**Nuevas FASE 18 (12):**
- `client_portals` (cliente_id, branding jsonb, dev_id, custom_domain, active)
- `client_warranties` (cliente_id, unit_id, type, expires_at, doc_url, terms jsonb)
- `client_manuals` (unit_id, title, doc_url, category, lang)
- `finishes_catalog` (id, dev_id, project_id, prototype_id, item_name, category, base_price, options jsonb[], deadline_offset_days)
- `finishes_selections` (id, cliente_id, unit_id, finish_id, option_chosen, price_delta, status, cfdi_id FK fiscal_docs, confirmed_at)
- `inspections` (id, unit_id, scheduled_at, scheduled_by, inspector_id, status, started_at, completed_at, report_pdf_url)
- `inspection_templates` (id, prototype_id, rooms jsonb)
- `inspection_items` (inspection_id, room, item, status pass/fail/na, photo_url, notes)
- `work_orders` (id, unit_id, requester_type, requester_id, type, description, priority, status, assigned_subcontractor_id, sla_deadline)
- `work_order_events` (id, work_order_id, event_type, actor_id, timestamp, notes, photo_urls jsonb[])
- `subcontractors` (id, dev_id, name, specialty, contact, active, invited_by, invited_at, accepted_at)
- `postsale_chat_conversations` (id, cliente_id, started_at, status, summary, escalated_to_human)
- `postsale_chat_messages` (id, conversation_id, role, content, embeddings vector(1536), citations jsonb[], timestamp)

**Cross-fn shipped reutilizadas:**
- `unidades`, `proyectos`, `prototipos`, `operaciones`, `fiscal_docs`, `audit_log`, `notifications`, `lead_touchpoints`, `marketing_brand_kits`, `wa_templates`.

## Estados UI

- **Loading**: skeleton portales + spinners chatbot
- **Error**: toast + Sentry capture
- **Empty**: 
  - Sin acabados configurados → "Tu desarrollador aún no configura acabados"
  - Sin work orders → "Sin solicitudes activas. Crear nueva"
  - Sin inspección → "Inspección será programada por tu desarrollador"
- **Success**: states felicitación CFDI emit + WO resuelta + inspección completada

## Validaciones Zod

```typescript
const selectFinishInput = z.object({
  finishId: z.string().uuid(),
  optionChosen: z.string().min(1),
  acceptTerms: z.literal(true),
});

const createWorkOrderInput = z.object({
  unitId: z.string().uuid(),
  type: z.enum(['plomeria', 'electricidad', 'acabados', 'electrodomesticos', 'garantia', 'otro']),
  description: z.string().min(20).max(2000),
  photos: z.array(z.string().url()).max(10).optional(),
  priority: z.enum(['alta', 'media', 'baja']),
});

const submitInspectionInput = z.object({
  inspectionId: z.string().uuid(),
  items: z.array(z.object({
    room: z.string(),
    item: z.string(),
    status: z.enum(['pass', 'fail', 'na']),
    photoUrl: z.string().url().optional(),
    notes: z.string().max(500).optional(),
  })).min(1),
});
```

## Integraciones externas

- **Anthropic Claude Sonnet 4** — chatbot RAG + AI task prioritizer
- **OpenAI Embeddings (text-embedding-3-small)** — vector search RAG
- **Facturapi.io** — CFDI 4.0 timbrado finishes auto-emit (primary)
- **Finkok** — PAC fallback
- **Resend** — emails CFDI + invites + notifs
- **WhatsApp Business API** — notifs work orders + inspection reminders
- **Sharp** (shipped) — inspection photos compression
- **Service Worker + IndexedDB** — PWA offline inspections

## Tests críticos

- [ ] Cliente con operación cerrada recibe invite link <60s + accede dashboard branded.
- [ ] Selección acabado emit CFDI Facturapi <30s + email cliente con PDF.
- [ ] PWA offline: inspector completa 50 items sin wifi + sync sin error al volver.
- [ ] WO creado por cliente → subcontratista asignado auto + notif WA <60s.
- [ ] WO SLA violation dispara escalación dev <60min post threshold.
- [ ] Chatbot RAG cita fuentes correctas en 90%+ respuestas con confidence >0.6.
- [ ] AI task management top 3 ranking <60s para 100 WOs.
- [ ] Insights weekly cron refresca <30s + alimenta M09/M15.
- [ ] RLS: cliente solo ve su unidad + sus docs + sus WOs.
- [ ] RLS: subcontratista solo ve WOs asignados + dev info necesaria.
- [ ] i18n: `t('postsale.*')` cero hardcoded.

## i18n keys ejemplo

```tsx
<H1>{t('postsale.dashboard.title')}</H1>
<Card>{t('postsale.unit.delivery_countdown', { days: 47 })}</Card>
<Button>{t('postsale.workorder.create')}</Button>
<Toast>{t('postsale.cfdi.emit_success', { uuid: 'ABC-123' })}</Toast>
```

## Cross-references

- ADR-061 FASE 18 M21 After-Sales Dedicated (autoritativo scope)
- ADR-060 FASE 15 Bucket B Onyx-Benchmarked (audit Onyx contexto)
- ADR-009 Security RLS (subcontractors RLS strict + cliente PII protection)
- ADR-018 E2E + 4 señales STUBs (subcontractor marketplace defer H2 marcado)
- [FASE 18](../02_PLAN_MAESTRO/FASE_18_AFTER_SALES_M21.md)
- [03.5 tRPC](../03_CATALOGOS/03.5_CATALOGO_TRPC_PROCEDURES.md) — postsale.* procedures
- [03.12 Notifs](../03_CATALOGOS/03.12_CATALOGO_NOTIFS_Y_WEBHOOKS.md) — types 26-34
- Módulos relacionados: M03 Contactos (lead_touchpoints append chatbot), M06 Tareas (cross-fn WO assigned asesor), M09 Estadísticas (insights consumer), M12 Contabilidad (CFDI auto-emit), M14 Marketing (brand_kit consumer), M15 Analytics (insights data-driven), M19 Comprador (extension)

---

**Autor:** Claude Opus 4.7 (PM canon zero preguntas — memoria 19) | **Fecha:** 2026-04-28
