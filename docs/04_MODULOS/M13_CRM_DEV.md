# M13 — CRM Desarrollador

> **Portal:** Desarrollador
> **Ruta principal:** `/desarrolladores/crm`
> **Fase donde se construye:** [FASE 15 — Portal Desarrollador](../02_PLAN_MAESTRO/FASE_15_PORTAL_DESARROLLADOR.md)
> **Priority:** [H1]

---

## Descripción funcional

CRM interno del desarrollador: pipeline propio de leads directos (landing pages, portales externos, referidos, walk-ins). Estados: Lead → Interés → Visita → Oferta → Cierre. Permite asignar leads a asesores aliados (canal de distribución). Timeline completo por lead (touchpoints multi-canal: web, WA, email, teléfono). Tareas propias del equipo dev. Inbox unificado (emails transaccionales + WA business + eventos CRM). Diferente de M03 Contactos (asesor) — aquí el dueño del lead es el developer, no el asesor.

## Flujos principales

### Flujo 1 — Pipeline kanban
1. `/desarrolladores/crm` → 5 columnas: Lead / Interés / Visita / Oferta / Cierre.
2. `trpc.devCRM.listLeads` con filtros (proyecto, fuente, asesor asignado, fecha).
3. Drag&drop cambia estado con validaciones.

### Flujo 2 — Asignación a asesor aliado
1. En card lead, menú "Asignar asesor".
2. Lista asesores aliados al proyecto (desde `project_brokers`).
3. Assign → UPDATE `leads_dev.asesor_id_assigned` + notif al asesor.
4. Asesor ve lead en M04 Búsquedas.

### Flujo 3 — Timeline del lead
1. Click lead → detail drawer.
2. Timeline desc: web visit (landing X), form submit, WA reply, visit scheduled, visit completed, offer sent, etc.
3. Cada entry con fuente + asesor (si aplica).

### Flujo 4 — Tareas team dev
1. Tab "Tareas" — similar M06 pero para team dev.
2. Types: follow_up_lead / prepare_proposal / send_docs / internal.

### Flujo 5 — Inbox unificado
1. Tab "Inbox" — bandeja única:
   - Emails (Resend inbound webhook).
   - WhatsApp messages (Meta Business API webhook).
   - CRM events (lead nuevo, visita agendada).
2. Reply inline → envía por canal correspondiente.
3. Auto-link a lead si match email/phone.

### Flujo 6 — Lead scoring C01
1. Cada lead tiene badge Lead Score (0-100) basado en: fuente, engagement, demografía, intent signals.
2. Sort default: hot leads primero.

## Wireframe textual

```
┌──────────────────────────────────────────────────────────────┐
│ CRM Dev          [+ Nuevo lead]     [Inbox] [Tareas]          │
├────┬─────────────────────────────────────────────────────────┤
│ SB │ Lead │ Interés │ Visita │ Oferta │ Cierre                │
│    │ 25   │ 12      │ 8       │ 4       │ 2                    │
│    │ ┌───┐┌────┐┌────┐┌────┐┌────┐                             │
│    │ │L1 ││L2  ││L3  ││L4  ││L5  │                             │
│    │ │🔥 ││🔥  ││🔥  ││🔥  ││✓   │                             │
│    │ │84 ││72  ││91  ││88  ││100 │                             │
│    │ │Web││WA  ││Port││Ref ││Ref │                             │
│    │ └───┘└────┘└────┘└────┘└────┘                             │
└────┴─────────────────────────────────────────────────────────┘
```

## Componentes UI requeridos

- `<DevCRMKanban />` — 5 cols.
- `<LeadDevCard />` — nombre + source + score + asesor asignado.
- `<LeadDevForm />` — crear manual.
- `<LeadDevDrawer />` — detail + timeline + actions.
- `<AssignAsesorDialog />`.
- `<DevTareasList />`.
- `<InboxUnified />` — multi-canal.
- `<InboxMessageThread />`.
- `<LeadScoreBadge />`.

## Procedures tRPC consumidas

- `devCRM.listLeads`, `createLead`, `updateLead`, `updateLeadStage`.
- `devCRM.assignAsesor`.
- `devCRM.getLeadTimeline`.
- `devCRM.listTareasDev`, `createTareaDev`.
- `devCRM.getInbox`, `replyInbox`.
- `scores.getLeadScore` (C01).

## Tablas BD tocadas

- `leads_dev` — pipeline.
- `lead_touchpoints` — timeline.
- `tareas_dev`.
- `inbox_messages` — unificado.
- `contactos` — shared (si match).
- `asesores` — assign picker.
- `project_brokers` — asesores aliados.
- `lead_scores` — C01 cache.

## Estados UI

- **Loading**: skeleton.
- **Error**: toast.
- **Empty**: "Integra tus landings para capturar leads" CTA.
- **Success**: kanban + inbox.

## Validaciones Zod

```typescript
const createLeadDevInput = z.object({
  developerId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  source: z.enum(['landing', 'inmuebles24', 'mercadolibre', 'facebook', 'whatsapp', 'walk_in', 'referido', 'evento', 'otro']),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: z.string(),
  email: z.string().email().optional(),
  interestNotes: z.string().max(2000).optional(),
  budgetRange: z.string().optional(),
});

const assignAsesorInput = z.object({
  leadDevId: z.string().uuid(),
  asesorId: z.string().uuid(),
  notifyAsesor: z.boolean().default(true),
});
```

## Integraciones externas

- **WhatsApp Business API** — inbox + send.
- **Resend Inbound** — email → inbox.
- **Mailgun** (alt inbound).
- **Twilio** — SMS fallback.
- **PostHog** — lead conversion funnel.

## Tests críticos

- [ ] Lead creado via landing page webhook → aparece en Lead column.
- [ ] Assign asesor → notif + lead visible en M04 asesor.
- [ ] Inbox unifica WA + email + CRM events.
- [ ] Lead score actualiza con nuevo touchpoint.
- [ ] RLS: dev solo ve sus leads.
- [ ] i18n: `t('dev.crm.*')`.

## i18n keys ejemplo

```tsx
<Column>{t('dev.crm.stage.' + stage)}</Column>
<Badge>{t('dev.crm.source.' + source)}</Badge>
```

## Cross-references

- ADR-002 AI-Native (lead scoring C01)
- [FASE 15](../02_PLAN_MAESTRO/FASE_15_PORTAL_DESARROLLADOR.md)
- [03.8 Scores IE](../03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md) — C01
- [03.12 Notifs](../03_CATALOGOS/03.12_CATALOGO_NOTIFS_Y_WEBHOOKS.md)
- Módulos relacionados: M04 Búsquedas (asesor recibe lead), M14 Marketing (landings source), M03 Contactos (sync)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent H) | **Fecha:** 2026-04-17
