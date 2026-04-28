# ADR-061 — FASE 18 M21 After-Sales Care Dedicated (insertada slot vacío post FASE 17)

**Status**: Accepted 2026-04-28 · Founder OK
**Deciders**: Manu (founder) + PM
**Sub-bloque**: Pre-tag `fase-15-onyx-benchmarked` (canonización forward H1)
**Related ADRs**: ADR-060 (FASE 15 Bucket B onyx-benchmarked), ADR-053 (feature module unified pattern), ADR-018 (E2E + STUBs 4 señales), ADR-009 (Security RLS), ADR-008 (monetization tiers)

---

## Context

Audit Onyx Technologies 2026-04-28 evidencia que el **Módulo 7 After-Sales Care** es el diferenciador #1 de Onyx (8 features, DMX 0/8 cobertura). Métrica declarada Onyx: **+35% retención y ocupación** post implementación.

Roadmap maestro DMX define orden secuencial: FASE 15 → 16 (Contabilidad full) → 17 (Doc Intel) → **[18 vacía]** → 19 (M16 Admin) → 20 → 21 → 22 → 23-28 launch. El slot FASE 18 está vacío en `docs/02_PLAN_MAESTRO/02.0_INDICE_MAESTRO.md` v6.4.

Cancelaciones founder 2026-04-28 (NO entran ni H1 ni H2 forward):
- ❌ M1.1.4 Tours virtuales 360°/Matterport
- ❌ M4.4.4 Background biométrico identidad
- ❌ M4.4.5 Tenant screening rentas

8 features Onyx M7 que SÍ entran a FASE 18 (alineadas con scope DMX residencial nueva):

| # | Feature Onyx M7 | Aplicabilidad H1 DMX |
|---|---|---|
| 7.1 | Portal cliente personalizado branded (contratos/garantías/manuales/edo cuenta) | SÍ — alimenta M19 Comprador full FASE 21 |
| 7.2 | Selección acabados self-serve (impacto precio + factura auto + comunicación construcción) | SÍ — único LATAM con CFDI auto-emit |
| 7.3 | Inspecciones pre-entrega app móvil PWA offline | SÍ — checklist habitación-por-habitación |
| 7.4 | Solicitudes mantenimiento digitales (tenant→subcontratista→tracking) | SÍ — alineado scope post-venta no leasing |
| 7.5 | Portal subcontratistas integrado | SÍ — workspace dedicado |
| 7.6 | AI chatbot soporte post-venta 24/7 (Claude Sonnet) | SÍ — diferenciador Studio AI canon |
| 7.7 | Notifs real-time cliente (acabados+inspección+mant) | SÍ — extiende notification_types |
| 7.8 | Insights post-venta data-driven | SÍ — alimenta M09 Estadísticas + M15 Analytics IE |
| 7.9 | AI task management subcontratistas (priorización deadlines) | SÍ — Claude orchestrator |

## Decision

Crear **FASE 18 — M21 After-Sales Care** dedicada en slot vacío post FASE 17, con scope completo Onyx M7 + cross-functions con módulos shipped/canonizados.

### Scope FASE 18

**4 nuevas rutas portal:**
- `/comprador-postventa/*` (portal cliente branded, M19 extension)
- `/desarrolladores/postventa/*` (vista admin dev)
- `/subcontratistas/*` (portal nuevo dedicado)
- `/inspecciones/*` (PWA offline app móvil)

**8 bloques FASE 18:**
- 18.A — Portal cliente branded + auth + role 'comprador_postventa' (extiende M19)
- 18.B — Selección acabados self-serve + CFDI auto-emit + impacto precio
- 18.C — Inspecciones pre-entrega PWA offline + checklist + foto evidencia
- 18.D — Solicitudes mantenimiento digital + work orders + tracking
- 18.E — Portal subcontratistas + asignación + comunicación
- 18.F — AI chatbot post-venta 24/7 (Claude Sonnet con memoria conversacional)
- 18.G — AI task management subcontratistas + priorización deadlines
- 18.H — Insights post-venta data-driven + alimenta M09/M15

### Scope BD nuevo FASE 18

**12 tablas nuevas:**
- `client_portals` (cliente_id, branding jsonb, dev_id, custom_domain)
- `client_warranties` (cliente_id, unit_id, type, expires_at, doc_url)
- `client_manuals` (unit_id, title, doc_url, category)
- `finishes_catalog` (dev_id, project_id, prototype_id, item_name, base_price, options jsonb[])
- `finishes_selections` (cliente_id, unit_id, finish_id, option_chosen, price_delta, cfdi_id)
- `inspections` (id, unit_id, scheduled_at, completed_at, inspector_id, status)
- `inspection_items` (inspection_id, room, item, status pass/fail, photo_url, notes)
- `work_orders` (id, unit_id, requester_type cliente/asesor/dev, type, priority, status, assigned_subcontractor_id)
- `work_order_events` (work_order_id, event_type, actor_id, timestamp, notes)
- `subcontractors` (id, dev_id, name, specialty, contact, active)
- `postsale_chat_conversations` (cliente_id, started_at, status, summary)
- `postsale_chat_messages` (conversation_id, role, content, embeddings, timestamp)

**Roles nuevos:** `comprador_postventa`, `subcontratista`, `inspector` (extiende `profiles.role` enum).

**Notif types nuevos (26-34):** finishes selected, finishes deadline, inspection scheduled, inspection completed, work order created, work order assigned, work order resolved, chatbot escalation human, postsale insight alert.

**3 crons nuevos:**
- `inspection_reminder_daily` (próximas inspecciones <72h)
- `work_order_sla_check_hourly` (escalación SLA violation)
- `postsale_insights_weekly` (alimenta M09/M15)

### Cross-functions FASE 18 con módulos shipped

| Cross-fn | Mecanismo |
|---|---|
| 18.B finishes → M12 Contabilidad CFDI auto-emit | Trigger BD finishes_selection.confirmed → fiscal_docs INSERT |
| 18.D work_orders → M06 Tareas asesor (notif si dev asigna asesor) | Cross-portal notif type 31 |
| 18.F chatbot ↔ contactos M03 timeline | Append `lead_touchpoints` cada conversación cerrada |
| 18.H insights → M09 Estadísticas asesor + M15 Analytics dev | Vista materializada `v_postsale_insights_aggregated` |
| 18.A portal branded → reutiliza tokens canon ADR-050 + dev branding from M14 Marketing | Brand kit consumer pattern |
| 18.E subcontratistas notif → reutiliza WhatsApp Business API shipped F14.C | wa_templates extension |

### Stack adicional FASE 18

- **PWA offline**: service worker + IndexedDB para inspecciones móvil sin wifi
- **Anthropic Claude Sonnet 4** + memoria conversacional + RAG sobre warranties/manuals (vector embeddings)
- **Sharp** (ya shipped) para inspection photos compression
- **Resend + WhatsApp Business** (shipped) para notifs cliente/subcontratista

### Wall-clock estimado FASE 18

~50h CC-A multi-agent canon paralelo (3 ventanas: 18.A+B / 18.C+D / 18.E+F+G) + ~10h secuencial (18.H insights + cross-fn integration) = **~50-60h total**.

### Pricing tier FASE 18

- After-Sales features incluidas en planes dev_pro + dev_enterprise (Pro+ unlock)
- dev_starter ve teaser "Upgrade Pro para After-Sales Care"
- AI chatbot 24/7 cost-tracked separado ($0.10-0.30 por conversación tokens Claude) con quota Pro 100/mes / Enterprise ilimitado

## Consequences

### Positivas
- Cubre el **diferenciador #1 Onyx** (8/8 features) → posiciona DMX como única plataforma "Market.Sell.Lease.Manage" parcial LATAM (Lease defer H2 Gate-9, Manage = FASE 18 cubierto)
- Métrica anchor: +35% retención compradores declarada Onyx
- Diferenciador único LATAM: CFDI auto-emit en finishes selection (Onyx canadiense no lo tiene)
- Cross-functions con M03/M06/M09/M12/M14/M15 maximizan reuso shipped (zero rebuild)
- Slot FASE 18 vacío → zero desplazamiento fases 19-28

### Negativas
- +50-60h CC-A wall-clock al H1 launch total (~300-450h restante post FASE 15 v3 onyx-benchmarked)
- 12 tablas nuevas + 9 RLS policies + nuevo rol `subcontratista` requieren MCP apply_migration pre-merge (memoria 27)
- PWA offline complejidad técnica (service workers + IndexedDB sync) requiere QA exhaustivo
- AI chatbot 24/7 cost variable según uso real — pricing reviewable post-launch
- Requiere onboarding flow nuevo subcontratistas (decisión producto pendiente: invite-only por dev o marketplace público?)

### Mitigaciones canon
- Multi-agent canon 3 ventanas branches independientes (memoria multi-agent canon)
- audit_rls_strict v.N+ allowlist mismo PR (memoria 22)
- ADR-018 STUBs 4 señales para subcontractor marketplace (defer H2 si decisión producto = invite-only H1)
- PM audit exhaustivo post-CC cada ola (memoria 17)

## Validation post-tag fase-18-after-sales-complete

- [ ] Comprador con unidad apartada accede a `/comprador-postventa` con datos reales
- [ ] Selección acabados genera CFDI 4.0 auto-emit con timbrado Facturapi.io
- [ ] Inspección PWA funciona offline + sync al volver online
- [ ] Work order creado por cliente → asignado a subcontratista → notificado WA + email
- [ ] AI chatbot Claude Sonnet responde con contexto warranties + manuals via RAG
- [ ] AI task management prioriza work orders por SLA + deadline
- [ ] Insights weekly cron alimenta M09/M15 dashboards
- [ ] Audit-dead-ui CI passes 0 violations
- [ ] audit_rls_strict 1:1 SECDEF↔allowlist v.N+

## Decisión producto pendiente FASE 18

| Decisión | Pendiente |
|---|---|
| Subcontractor onboarding model | invite-only por dev (H1) vs marketplace público (H2)? — PM rec: invite-only H1, marketplace L-NEW H2 |
| AI chatbot pricing tier | bundled Pro+ unlimited vs metered tokens? — PM rec: bundled con quota fair-use 100 conversaciones/mes Pro / ilimitado Enterprise |
| Inspections inspector role | empleado dev (H1) vs marketplace inspectores (H2)? — PM rec: empleado dev H1 |

## References

- ADR-060 FASE 15 Bucket B Onyx-Benchmarked Integration (autoritativo Onyx audit)
- Onyx Technologies feature audit (autoritativo founder 2026-04-28, contexto chat)
- `docs/04_MODULOS/M21_AFTER_SALES.md` (nuevo, post este ADR)
- `docs/02_PLAN_MAESTRO/FASE_18_AFTER_SALES_M21.md` (nuevo, post este ADR)
- `docs/02_PLAN_MAESTRO/02.0_INDICE_MAESTRO.md` (update FASE 18 inserta)
- ADR-009 Security RLS (subcontratistas RLS strict)
- ADR-018 E2E + 4 señales STUBs

---

**Autor:** Claude Opus 4.7 (PM canon zero preguntas — memoria 19) | **Fecha:** 2026-04-28
