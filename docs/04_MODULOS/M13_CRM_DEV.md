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

---

## APPEND v3 onyx-benchmarked (2026-04-28) — B.6 Lead scoring C01 IA shipped + B.7 Journey builder

**Autoritativo:** [ADR-060](../01_DECISIONES_ARQUITECTONICAS/ADR-060_FASE_15_BUCKET_B_ONYX_BENCHMARKED_INTEGRATION.md).

### B.6 — Lead scoring C01 IA shipped real (anchor 21x conversión <5min response)

**BD nueva:** Tabla `lead_scores` (lead_id FK contactos, score 0-100, factors jsonb {engagement, intent, demographics, recency}, model_version, computed_at, ttl_until). RLS dev/asesor por ownership lead.

**Calculator:** `lib/scores/c01-lead-score.ts` extiende patrón C04 dynamic-advisor str-intelligence. Factors:
- engagement: count touchpoints + recency exponential decay
- intent: form submissions + meeting scheduled + offer requested
- demographics: budget match + location match + financial qualification
- recency: días desde último touchpoint

**Trigger BD:** insert/update `lead_touchpoints` → debounced 30s recompute.

**tRPC nuevas:** `scores.getLeadScore({leadId})`, `scores.recomputeLeadScore({leadId})` extiende `features/ie/routes/scores.ts`.

**Cron:** `lead_score_recompute_hourly` batch refresh degraded leads (TTL>1h).

**Notif type 17:** "Hot lead detected (score >85)" SLA <5min asesor + dev (canal in-app + WA + email).

**Hook React:** `useLeadScore(leadId)` realtime sub canal `lead_scores:lead_id=eq.${id}`.

**UI integration:** Badge `<LeadScoreBadge score={X}>` con colores rojo/ámbar/verde + Kanban M04 sort default hot leads primero.

**Cross-fn shipped:** alimenta M03 Contactos + M04 Búsquedas + M01 Dashboard widget hot leads + dispara B.7 journey trigger.

**Esfuerzo:** 8-12h. **Priority:** 🥇 #1.

---

### B.7 — Journey builder visual básico (anchor -30% ciclo ventas)

**BD nueva:** Tablas `marketing_journeys` (id, name, trigger_event enum, audience_filter jsonb, steps jsonb[], active, created_by, project_id) + `journey_executions` (journey_id, lead_id, current_step, status, started_at, completed_at).

**UI builder:** dnd-kit drag&drop steps simple (NO full Marketo). Trigger types: lead_created, lead_score_changed, visit_scheduled, offer_sent, days_no_activity. Step types: send_email (Resend template), send_wa (wa_template), wait (hours/days), conditional (if score>X then else).

**Cron:** `journey_executor_hourly` evalúa pendientes → ejecuta step actual → log execution.

**5 templates seed:**
1. Bienvenida lead nuevo (immediate WA + email +24h follow-up)
2. Follow-up post-visita (3d after visit_scheduled→completed)
3. Reactivación frío 60d sin actividad
4. Aniversario apartado (1 año post-deposit confirm)
5. Drip tour proyecto (5 emails escalonados nurturing)

**tRPC en `features/marketing/routes/marketing.ts`:** `listJourneys`, `createJourney`, `updateJourney`, `pauseJourney`, `getJourneyExecutions`.

**Cross-fn:** trigger desde lead_score_change (B.6) + envía vía M08 Resend shipped + wa_templates shipped + registra event en `lead_touchpoints` → alimenta de vuelta B.6 score.

**Esfuerzo:** 16-20h. **Priority:** 🥇 #2.

---

**Autor v3:** Claude Opus 4.7 PM (canon zero preguntas) | **Fecha:** 2026-04-28
