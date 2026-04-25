# FASE 21.A — WhatsApp Business Integration (mini-fase foundational, BLK_WA resolution)

## Status
🟡 AGENDADA pre-FASE 22 Marketing+Comms (resolución blocker BLK_WA — provider abstraction + WABA + templates + sender service)

## Trigger
- Inicio: founder cerró Gate-10 (ADR-042 provider BLOQUEANTE) + tag `fase-21-portal-publico-complete`
- Cierre: tag `fase-21.A-whatsapp-integration-complete`

## Objetivo
Habilitar WhatsApp como canal primario de comunicación (80% destino comprador en MX/CO/AR/BR). Sin esta capa, FASE 22 Marketing+Comms es incompleta: 8 features directos (agente WA C3.F1, reporte personalizado C3.17, financing simulator distribución C3.F19, referrals magic-link C3.F11/T.2.4, etc.) + 12 notificaciones cascade quedan bloqueadas. Provee provider abstraction (Twilio H1 multi-channel revertible), templates approval flow, sender service con opt-in consent, webhooks inbound y cost cap.

## Sub-bloques propuestos

### 21.A.A — Provider abstraction + ADR-042
- Scope: tabla `messaging_providers` + interface `WhatsAppProvider` (sendMessage/sendTemplate/getStatus) + adapter Twilio H1 + adapter Meta WA Cloud stub para H2 pivot.
- Migrations: 2 (~20h)

### 21.A.B — Templates + WABA approval flow
- Scope: tabla `wa_templates` + WABA verification path (Twilio Embedded Signup 1-3 días) + tracking estado approval Meta.
- Migrations: 2 (~18h)

### 21.A.C — Sender service + opt-in consent
- Scope: tRPC `wa.send` con consent check + `wa_opt_ins` log LFPDPPP/GDPR/LGPD + rate limit per recipient.
- Migrations: 3 (~23h)

### 21.A.D — Webhooks inbound + alerts engine wire
- Scope: API route `/api/wa/webhook/[provider]` + parser + wire a `alerts_engine` (post-compra T.2.6, milestones T.1.5).
- Migrations: 1 (~14h)

### 21.A.E — Cost cap + observability + tests
- Scope: cost cap diario por provider + `ingest_runs` entries + Sentry alerts + smoke E2E sandbox Twilio.
- Migrations: 1 (~1h)

## Migrations requeridas
- Count: **9**
- Lista tentativa:
  - `wa_001_messaging_providers_schema`
  - `wa_002_provider_credentials_secure_pgsodium`
  - `wa_003_wa_templates_schema`
  - `wa_004_waba_approval_tracking`
  - `wa_005_wa_opt_ins_log`
  - `wa_006_wa_send_log_partitioned`
  - `wa_007_wa_rate_limit_per_recipient`
  - `wa_008_wa_inbound_webhooks_log`
  - `wa_009_wa_cost_cap_daily_cron`

## Founder gates requeridos
- Gate-10 ADR-042 — Twilio vs Meta WA Cloud BLOQUEANTE (rec: Twilio H1 multi-channel revertible)
- Gate-11 ADR-043 — WABA verification path Twilio Embedded vs Meta direct (rec: Twilio Embedded 1-3 días)
- Gate-12 ADR-044 — Templates initial scope (rec: 12 templates H1 — utility 8 + marketing 4)

## Effort + Wall-clock
- Effort total: **76h**
- Wall-clock 1 dev fulltime: **10 días**
- Wall-clock 3 devs paralelo: **4 días**

## Features unblocked downstream
- Count: **20** (8 directos + 12 cascade WA notifs)
- Top 5:
  1. C3.F1 Agente WhatsApp DISC-aware (depende también 11.W)
  2. C3.17 Reporte personalizado WhatsApp (RICE 6,600)
  3. T.2.6 Post-compra alertas (RICE 10,000) — necesita canal WA
  4. T.1.5 GPS financiero enganche (RICE 8,750) — milestones WA
  5. T.2.4 Referral magic link perfil (RICE 8,750)

## Success criteria
- [ ] 9 migrations aplicadas + `audit:rls` clean
- [ ] WABA verification approved Meta (production-ready)
- [ ] 12 templates H1 approved + versionados en BD
- [ ] Cost cap diario configurable + Sentry alert si >80%
- [ ] Inbound webhook idempotente (replay seguro)
- [ ] Provider swap Twilio→Meta requiere zero changes en consumers (interface estable)
- [ ] Tag `fase-21.A-whatsapp-integration-complete` en main

## Referencias
- `docs/08_PRODUCT_AUDIT/04_ROADMAP_INTEGRATION.md` sec 1.4
- `docs/08_PRODUCT_AUDIT/03_RICE_PRIORITIES.md` sec 7 (BLK_WA source)
- `docs/08_PRODUCT_AUDIT/01_CROSSWALK_MATRIX.md` (20 features afectadas, capa C3 + C6)
- ADR-042/043/044 (a crear post-Gates 10-12)
- Memoria `feedback_arquitectura_escalable_desacoplada` (provider abstraction multi-provider canonized)
