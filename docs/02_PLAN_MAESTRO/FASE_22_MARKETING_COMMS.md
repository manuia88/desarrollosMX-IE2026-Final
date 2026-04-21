# FASE 22 — Marketing + Comunicaciones (Notifs 20×4 + Webhooks 12 + WhatsApp + Resend + SMS + Auto-piezas)

> **Duración estimada:** 5 sesiones Claude Code (~20 horas con agentes paralelos)
> **Dependencias:** FASE 00-06 (bootstrap, BD, auth, DS, i18n, seguridad), FASE 07 (ingesta/crons base), FASE 08-12 (IE para momentum/score change triggers), FASE 13-14 (portal asesor — consume notifs in-app), FASE 17 (Document Intel — disparador `document_processed`), FASE 18 (Legal/Pagos/Escrow — dispara `operation_closed`, `payment_received`), FASE 19 (Admin Stripe webhook monitor), FASE 20 (Comprador — consume notifs), FASE 21 (Público — share buttons DMX Wrapped).
> **Bloqueantes externos:**
> - **Meta WhatsApp Business API approval** (2-4 semanas — Manu gestionar ASAP vía BSP tipo Twilio/360dialog/Wati, o directo Meta Business Manager). Fase requiere `WA_PHONE_NUMBER_ID`, `WA_BUSINESS_ACCOUNT_ID`, `WA_ACCESS_TOKEN`, verified display name "DesarrollosMX".
> - **Resend account** + dominio verificado (`mail.desarrollosmx.com`) con SPF + DKIM + DMARC.
> - **Twilio account** + número verificado MX (para SMS fallback). Opcional: también CO/AR/BR/CL.
> - **Web Push VAPID keys** generadas (`npx web-push generate-vapid-keys`).
> - **PostHog project** activo (Fase 24 adelanta su setup si aún no).
> - **Feature flags** `notifs_whatsapp`, `notifs_sms`, `notifs_push`, `webhooks_outbound`, `marketing_auto_generator` en `feature_registry` (FASE 02).
> - Seeds: 5 templates WhatsApp aprobados Meta (requiere revisión Meta ~24-48h por template).
> - Dataset seed: 5 notificaciones de cada tipo para smoke tests.
> **Resultado esperado:** Sistema de comunicaciones completo operando. 20 tipos notificación × 4 canales con preferences + quiet hours + dedup; 12 webhooks outgoing con HMAC + retry exponencial; WhatsApp Business bidireccional (templates + session + webhooks entrantes); Resend email con React Email templates Dopamine; Twilio SMS fallback; auto-generación piezas marketing (PostCuadrado/PostLargo/Story/VideoStory/Video); landing pages + QR; 4 crons (`weekly_briefing`, `discover_weekly`, `monthly_index_newsletter`, `annual_wrapped`); compliance unsubscribe/STOP/preferences center; tracking PostHog. Tag `fase-22-complete`.
> **Priority:** [H1]

## Contexto y objetivo

Esta fase construye la **capa de comunicación saliente** de DMX. Es el nervio que conecta el backend (crons IE, webhook triggers, score changes, operaciones) con el humano: asesor, desarrollador, comprador, master broker, admin.

Principios no negociables:
- **Preference matrix primero**: antes de enviar algo, consultar `notificaciones_config` (per user, per tipo, per canal).
- **Quiet hours** (22:00-07:00 locales por timezone) excepto urgencias (tipo 1 new_lead, tipo 4 document_signed).
- **Dedup** por `(user_id, type, reference_id, reference_type)` ventana 5 min — no spamear.
- **Orquestador único** `shared/lib/notifs/orchestrator.ts` — no enviar desde routers tRPC sueltos; todo pasa por `enqueueNotif()`.
- **Compliance**: unsubscribe link en cada email, STOP en cada WhatsApp, preferences center UI accesible (`/settings/notifications`).
- **Observabilidad**: PostHog event por notif sent/opened/clicked; webhook_logs persistente; Sentry capture en fallos.
- **Failover canal**: si WhatsApp falla (24h window, template rechazado, user bloqueó), cascada → SMS Twilio → email Resend → in_app (siempre llega in_app).
- **Disclaimer DMX NO responsable post-venta** (ADR-008): marketing copy evita promesas servicio post-venta.

Cross-references:
- ADR-002 (AI-native, notifs gatillan Copilot proactivo).
- ADR-003 (multi-country — templates WA per country locale).
- ADR-007 (observabilidad — PostHog + Sentry wiring).
- ADR-008 (monetización — upsell hooks en notifs gratuitas).
- ADR-009 (seguridad — webhook HMAC, secrets en `vault` pgsodium).
- FASE 02 (feature_registry gates).
- FASE 05 (i18n — templates traducibles).
- Catálogo 03.12 (notifs + webhooks detalle).
- M01 Dashboard notifs badge, M20 preferences center.

## Game-changers integrados en esta fase

| GC | Nombre | Impacto | Bloque/Módulo |
|---|---|---|---|
| GC-33 | WhatsApp template auto-draft | Generación IA templates por zona/segmento con IE scores; alimenta WA send | Módulo 22.N.1 (nuevo) |
| GC-28 | Sequence Engine integration | Conecta con FASE 14 sequence engine para multi-channel batch sends | Módulo 22.N.2 (nuevo) |
| GC-50 | Birthday + anniversary cron | Cron diario detecta fechas clave y triggers flows (cumple, 1y compra, 6m sin contacto) | Módulo 22.K.5 (nuevo cron) |

## Bloques

### BLOQUE 22.A — Schema BD (notificaciones + config + queue + webhooks)

#### MÓDULO 22.A.1 — Tabla `notificaciones` (histórico enviadas)

**Pasos:**
- `[22.A.1.1]` Migration `20260417_notifs_schema.sql`:
  ```sql
  CREATE TABLE notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
      'new_lead','lead_assigned','visit_scheduled','visit_completed',
      'operation_created','operation_status_changed','document_signed','document_processed',
      'payment_received','payment_overdue','score_changed_significantly','discover_weekly_ready',
      'weekly_briefing','daily_summary','badge_unlocked','property_match',
      'price_drop','captacion_etapa_advanced','acm_generated','momentum_changed'
    )),
    channel TEXT NOT NULL CHECK (channel IN ('in_app','email','whatsapp','push','sms')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    reference_id UUID,
    reference_type TEXT,
    cta_label TEXT,
    cta_href TEXT,
    country_code TEXT NOT NULL DEFAULT 'MX',
    locale TEXT NOT NULL DEFAULT 'es-MX',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','opened','clicked','failed','bounced')),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    external_id TEXT, -- Meta WA message_id, Resend id, Twilio sid
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT dedup_window UNIQUE NULLS NOT DISTINCT (user_id, type, channel, reference_id, reference_type, date_trunc('minute', created_at))
  );
  CREATE INDEX ON notificaciones (user_id, created_at DESC);
  CREATE INDEX ON notificaciones (status, created_at) WHERE status = 'pending';
  CREATE INDEX ON notificaciones (external_id) WHERE external_id IS NOT NULL;
  ```
- `[22.A.1.2]` RLS: `SELECT` own + admin superadmin. `INSERT/UPDATE` solo service_role (via orchestrator).
- `[22.A.1.3]` Trigger `notifs_realtime` publicando en Supabase Realtime channel `user:{user_id}:notifs` en INSERT.
- `[22.A.1.4]` Particionar por mes (`pg_partman`) si se prevé >1M rows/mes.

**Criterio de done del módulo:**
- [ ] Migration aplicada, 20 types CHECK OK, 5 channels OK.
- [ ] Realtime publica event al insertar row.
- [ ] RLS test: asesor A no ve notifs de asesor B.

#### MÓDULO 22.A.2 — Tabla `notificaciones_config` (preferences matrix)

**Pasos:**
- `[22.A.2.1]` Schema:
  ```sql
  CREATE TABLE notificaciones_config (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- los 20 types
    in_app BOOLEAN DEFAULT true,
    email BOOLEAN DEFAULT true,
    whatsapp BOOLEAN DEFAULT false, -- opt-in
    push BOOLEAN DEFAULT false,
    sms BOOLEAN DEFAULT false, -- opt-in solo
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '07:00',
    respect_quiet_hours BOOLEAN DEFAULT true,
    digest_frequency TEXT DEFAULT 'realtime' CHECK (digest_frequency IN ('realtime','hourly','daily','weekly','off')),
    PRIMARY KEY (user_id, type)
  );
  ```
- `[22.A.2.2]` Trigger `seed_notif_config_on_profile_insert` que crea las 20 rows default cuando se crea un profile.
- `[22.A.2.3]` Defaults por rol: asesor tiene email+in_app ON para todos; comprador tiene email+in_app ON solo en property_match/price_drop/discover_weekly/momentum_changed. Dev tiene email+in_app en operation_*, payment_*, document_*.
- `[22.A.2.4]` RLS: user puede SELECT/UPDATE solo su propia config; admin puede todo.

**Criterio de done del módulo:**
- [ ] Profile nuevo auto-genera 20 config rows.
- [ ] UI `/settings/notifications` (ver MÓDULO 22.L.2) lee/escribe contra esta tabla.

#### MÓDULO 22.A.3 — Tabla `notification_queue` (buffer outbound)

**Pasos:**
- `[22.A.3.1]` Schema:
  ```sql
  CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notificacion_id UUID REFERENCES notificaciones(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    priority INT NOT NULL DEFAULT 5, -- 1=urgente (lead), 10=bajo (weekly)
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
    attempts INT NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','sent','failed','cancelled')),
    error TEXT,
    locked_by TEXT, -- worker ID
    locked_at TIMESTAMPTZ
  );
  CREATE INDEX ON notification_queue (status, scheduled_for) WHERE status IN ('queued','failed');
  ```
- `[22.A.3.2]` Stored function `claim_next_notifs(worker_id TEXT, batch INT)` con `SELECT ... FOR UPDATE SKIP LOCKED` para evitar double-processing.
- `[22.A.3.3]` Stored function `requeue_failed(notification_queue_id)` con backoff exponencial (2^attempts min, max 60 min, max 10 attempts → status='failed').

**Criterio de done del módulo:**
- [ ] 2 workers concurrentes no procesan mismo row (test con `SKIP LOCKED`).
- [ ] Retry exponencial respetado.

#### MÓDULO 22.A.4 — Tabla `webhooks_outbound` + `webhook_logs`

**Pasos:**
- `[22.A.4.1]` Schema:
  ```sql
  CREATE TABLE webhooks_outbound (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id), -- dueño (dev/admin que lo registró)
    name TEXT NOT NULL,
    target_url TEXT NOT NULL,
    event_types TEXT[] NOT NULL, -- subset de los 12
    secret_hash TEXT NOT NULL, -- bcrypt del secret que ellos copian 1 vez
    is_active BOOLEAN DEFAULT true,
    failure_count INT DEFAULT 0,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks_outbound(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    target_url TEXT NOT NULL,
    status_code INT,
    response_body TEXT,
    response_headers JSONB,
    attempt INT NOT NULL DEFAULT 1,
    duration_ms INT,
    signature TEXT, -- HMAC enviado
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    next_retry_at TIMESTAMPTZ
  );
  CREATE INDEX ON webhook_logs (webhook_id, sent_at DESC);
  CREATE INDEX ON webhook_logs (next_retry_at) WHERE status_code >= 400 OR status_code IS NULL;
  ```
- `[22.A.4.2]` RLS: dev puede ver solo sus webhooks; admin todo. `secret_hash` NUNCA retornado en SELECT.
- `[22.A.4.3]` Trigger `reset_failure_count_on_success` cuando webhook_logs status 2xx.
- `[22.A.4.4]` Trigger `deactivate_webhook_on_max_failures` cuando `failure_count >= 10` → `is_active = false` + notif tipo 20 al dueño.

**Criterio de done del módulo:**
- [ ] Dev crea webhook vía UI /developer/webhooks (Fase 15), recibe secret plaintext 1 vez.
- [ ] 10 failures consecutivos desactivan auto.

### BLOQUE 22.B — 20 tipos de notificación (catálogo funcional)

#### MÓDULO 22.B.1 — Definir catálogo `shared/lib/notifs/types.ts`

**Pasos:**
- `[22.B.1.1]` Export const `NOTIF_TYPES` con 20 entries. Cada entry: `{ id, priority (1-10), defaultChannels[], whenTrigger (SQL trigger name), audiences (roles[]), urgent (bypass quiet hours), waTemplate?, emailTemplate?, copyBuilder (fn), ctaBuilder (fn) }`.
- `[22.B.1.2]` 15 originales v3:
  1. `new_lead` (prioridad 1, urgent, canales default in_app+email+whatsapp, audience=[asesor], trigger `AFTER INSERT ON contactos WHERE origen='wishlist' OR origen='portal_dmx'`, waTemplate `new_lead_v1`, cta "Ver lead")
  2. `lead_assigned` (prio 2, in_app+email+whatsapp, asesor, `AFTER UPDATE busquedas SET asesor_id`, waTemplate `lead_assigned_v1`)
  3. `visit_scheduled` (prio 3, in_app+email+whatsapp+push, [asesor, comprador], `AFTER INSERT visitas_programadas`, waTemplate `visit_reminder_v1`)
  4. `visit_completed` (prio 5, in_app+email, asesor, `AFTER UPDATE visitas_programadas SET status='completed'`)
  5. `operation_created` (prio 3, in_app+email, [asesor, mb, admin], `AFTER INSERT operaciones`)
  6. `operation_status_changed` (prio 3, in_app+email+whatsapp, asesor+comprador+dev, `AFTER UPDATE operaciones SET status`)
  7. `document_signed` (prio 2, urgent, in_app+email+whatsapp, todos partes op, `AFTER UPDATE documents SET signed_at`)
  8. `document_processed` (prio 5, in_app, dev, `AFTER UPDATE document_jobs SET status='completed'`)
  9. `payment_received` (prio 2, in_app+email+whatsapp, asesor+dev+comprador, `AFTER INSERT payments WHERE status='succeeded'`, waTemplate `payment_received_v1`)
  10. `payment_overdue` (prio 4, in_app+email+whatsapp, comprador, cron check `payment_schedules.due_date < now() AND status='pending'`)
  11. `score_changed_significantly` (prio 6, in_app+email, dev+comprador watchlist, cron detecta delta >5% en zone_scores o project_scores)
  12. `discover_weekly_ready` (prio 7, in_app+email, comprador con busqueda activa, cron lunes 8am)
  13. `weekly_briefing` (prio 7, in_app+email, asesor+dev, cron lunes 7am)
  14. `daily_summary` (prio 8, in_app+email opcional, asesor, cron 19:00 local)
  15. `property_match` (prio 3, in_app+email+push, comprador, matching engine tras INSERT unidad OR busqueda)
- `[22.B.1.3]` 5 nuevas v4:
  16. `momentum_changed` (prio 5, in_app+email, comprador watchlist zona + asesores zona, cron detecta cambio signo Momentum zona)
  17. `badge_unlocked` (prio 7, in_app + push, asesor, trigger gamification `AFTER INSERT asesor_badges`)
  18. `price_drop` (prio 4, in_app+email+whatsapp+push, comprador con watchlist proyecto/unidad, `AFTER UPDATE unidades SET precio < OLD.precio`, waTemplate `price_drop_v1`)
  19. `captacion_etapa_advanced` (prio 6, in_app, asesor+mb, `AFTER UPDATE captaciones SET etapa`)
  20. `acm_generated` (prio 6, in_app+email, asesor que solicitó, `AFTER INSERT acm_valuaciones WHERE status='ready'`)
- `[22.B.1.4]` Zod schema por tipo para validar payload; tests snapshot de cada `copyBuilder`.

**Criterio de done del módulo:**
- [ ] 20 entries completos con `copyBuilder` i18n-ready (`t('notifs.new_lead.title', {...})`).
- [ ] Tests 20 builders OK.

#### MÓDULO 22.B.2 — Triggers BD que enfilan notifs

**Pasos:**
- `[22.B.2.1]` Crear trigger genérico `enqueue_notif(type, user_id, ref_id, ref_type, payload jsonb)` que llama función SQL `pg_notify('notif_queue', jsonb_build_object(...))` + INSERT en `notificaciones` status='pending'.
- `[22.B.2.2]` 15 triggers AFTER INSERT/UPDATE (listados en 22.B.1) — cada uno determina audiencia (ej: new_lead → asesor asignado; momentum_changed → query watchlists).
- `[22.B.2.3]` 3 crons orquestadores (weekly_briefing, discover_weekly, payment_overdue_check) que hacen batch enqueue.
- `[22.B.2.4]` Idempotency: triggers chequean `SELECT 1 FROM notificaciones WHERE user_id=? AND type=? AND reference_id=? AND created_at > now() - interval '5 minutes'` antes de insertar.

**Criterio de done del módulo:**
- [ ] 15 triggers activos + 3 crons registrados en `vercel.json`.
- [ ] Test: INSERT contacto origen=wishlist → notif new_lead creada ≤2s.

### BLOQUE 22.C — 4 canales (adapters)

#### MÓDULO 22.C.1 — Adapter in_app (Supabase Realtime)

**Pasos:**
- `[22.C.1.1]` `shared/lib/notifs/channels/in-app.ts` con `sendInApp(notif)`: simplemente UPDATE notificaciones SET status='sent', delivered_at=now() (Realtime ya lo publicó en INSERT).
- `[22.C.1.2]` Cliente: hook `useNotifs()` escucha channel `user:{id}:notifs`, agrega a Zustand store, muestra toast no-bloqueante (react-hot-toast) + badge header.
- `[22.C.1.3]` Marcar como opened al abrir `/notifications` o click en toast.

**Criterio de done del módulo:**
- [ ] Notif INSERT aparece en browser <500ms.
- [ ] Badge count decrementa al marcar leída.

#### MÓDULO 22.C.2 — Adapter email (Resend + React Email)

**Pasos:**
- `[22.C.2.1]` Instalar `resend` + `@react-email/components` + `@react-email/render`.
- `[22.C.2.2]` Crear `shared/lib/notifs/channels/email.ts` con `sendEmail({to, subject, reactTemplate, props})`. Usa Resend SDK. Retorna `external_id`.
- `[22.C.2.3]` Crear `emails/` carpeta con 20 templates React Email (uno por tipo notif), cada uno extiende `<DopamineEmailLayout>` con logo + gradient header + footer unsubscribe. Tokens Dopamine CSS-in-JS (inline por compatibilidad Gmail/Outlook).
- `[22.C.2.4]` Dominio Resend: enviar desde `DesarrollosMX <hola@mail.desarrollosmx.com>`. Verificar SPF/DKIM/DMARC en DNS.
- `[22.C.2.5]` Tracking pixel (Resend tracking automático) → webhook Resend (`/api/webhooks/resend`) actualiza `status='opened'`, `opened_at`.
- `[22.C.2.6]` Click tracking: links pasan por `/r/:notifId?to=...` que marca `clicked_at` y redirige.
- `[22.C.2.7]` Unsubscribe link siempre presente `/unsubscribe?token=...&type=...` (link firmado HMAC 7 días).
- `[22.C.2.8]` List-Unsubscribe header (RFC 8058) one-click.

**Criterio de done del módulo:**
- [ ] 20 templates renderizadas OK en Gmail + Outlook + Apple Mail.
- [ ] Unsubscribe marca `notificaciones_config.email=false` correctamente.

#### MÓDULO 22.C.3 — Adapter WhatsApp (Meta WA Business API)

**Pasos:**
- `[22.C.3.1]` Instalar SDK WA Meta (o fetch directo a `https://graph.facebook.com/v21.0/{WA_PHONE_NUMBER_ID}/messages`).
- `[22.C.3.2]` `shared/lib/notifs/channels/whatsapp.ts` con `sendWhatsApp({to, templateName, locale, components})`.
- `[22.C.3.3]` 5 templates aprobados Meta (Manu submite para review):
  - `new_lead_v1`: "Hola {{1}}, tienes un nuevo lead en {{2}}. Tiempo de respuesta <15min es clave. [Ver lead]"
  - `lead_assigned_v1`: "Te asignaron un lead: {{1}} busca {{2}} en {{3}}. [Responder ahora]"
  - `visit_reminder_v1`: "Recordatorio: visita con {{1}} en {{2}} a las {{3}}. [Confirmar]"
  - `payment_received_v1`: "Recibimos tu pago de {{1}} por {{2}}. [Ver comprobante]"
  - `price_drop_v1`: "Bajó el precio de {{1}} en {{2}}. Nuevo precio: {{3}}. [Ver proyecto]"
- `[22.C.3.4]` Session messages (cuando usuario escribió últimas 24h): texto libre, útil para handoff humano.
- `[22.C.3.5]` Endpoint `/api/webhooks/whatsapp` recibe status callbacks (sent/delivered/read/failed) + mensajes entrantes. Valida `x-hub-signature-256` HMAC.
- `[22.C.3.6]` Mensaje entrante → tRPC router `inboxWA.receive` crea row en `inbox_messages` (FASE 14 M11 Inbox). Si es "STOP" → desactiva WA en `notificaciones_config` todas las tipos.
- `[22.C.3.7]` Multi-country: template locale (es-MX, es-CO, es-AR, pt-BR). Meta requiere aprobar cada locale por separado.
- `[22.C.3.8]` Opt-in explícito: al onboarding user marca "Recibir por WhatsApp" → crea consent row en `privacy_consents` (FASE 26) + set config.whatsapp=true.

**Criterio de done del módulo:**
- [ ] 5 templates aprobados Meta en sandbox.
- [ ] Test: INSERT contacto → WA llega al asesor en <10s con texto correcto.
- [ ] STOP de usuario desactiva todos los WA para ese user.

#### MÓDULO 22.C.4 — Adapter Web Push (VAPID) + APNs H2

**Pasos:**
- `[22.C.4.1]` `shared/lib/notifs/channels/push.ts` con `sendWebPush({subscription, title, body, data})`. Usa `web-push` npm.
- `[22.C.4.2]` Tabla `push_subscriptions` (user_id, endpoint, p256dh, auth, user_agent, device_type, created_at, last_seen_at).
- `[22.C.4.3]` Service Worker `/sw.js` (Fase 25) handle `push` event.
- `[22.C.4.4]` APIs nativas iOS/Android H2 (Fase 29 scaffold): APNs + FCM adapters stub que comparten interfaz.

**Criterio de done del módulo:**
- [ ] Suscripción desktop Chrome funciona.
- [ ] Push llega con notif click abre URL correcta.

### BLOQUE 22.D — Orquestador central

#### MÓDULO 22.D.1 — `shared/lib/notifs/orchestrator.ts`

**Pasos:**
- `[22.D.1.1]` Export `enqueueNotif({ userId, type, referenceId, referenceType, payload })`:
  1. Lookup `notificaciones_config` para (userId, type).
  2. Determinar canales activos respetando quiet hours (salvo `type.urgent=true`).
  3. Dedup check (ventana 5min).
  4. Para cada canal activo → INSERT row en `notificaciones` (status='pending') + INSERT en `notification_queue`.
- `[22.D.1.2]` Export `processNotifQueue(workerId, batch=50)` consumido por cron `notifs_worker` cada 30s:
  1. `SELECT claim_next_notifs(workerId, batch)`.
  2. Por cada row, llamar adapter correspondiente.
  3. UPDATE `notificaciones.status='sent'` + `external_id` o `status='failed'` + `error_message`.
  4. Si falla: `requeue_failed(id)` con backoff.
- `[22.D.1.3]` Export `deliverNow(notifId)` para testing o retries manuales admin.
- `[22.D.1.4]` Failover cascade: si WA falla `recipient_not_in_whatsapp` → enqueue SMS. Si SMS falla → mantener solo email+in_app.
- `[22.D.1.5]` Digest support: si `digest_frequency='daily'` en config, agrupa notifs del día en un solo email 19:00 local (cron `digest_daily_send`).
- `[22.D.1.6]` Event a PostHog: `notif_sent`, `notif_opened`, `notif_clicked`, `notif_failed` con propiedades (type, channel, user_role, country_code).

**Criterio de done del módulo:**
- [ ] Orquestador respeta preference matrix (test 4 escenarios).
- [ ] Failover WA→SMS funciona.
- [ ] Digest agrupa correcto.

#### MÓDULO 22.D.2 — Quiet hours + timezone awareness

**Pasos:**
- `[22.D.2.1]` Función `isQuietHour(userId, now)` que lee `profiles.preferred_timezone` + `notificaciones_config.quiet_hours_*` y decide.
- `[22.D.2.2]` Si quiet hour y `!type.urgent` → `scheduled_for = next morning 07:00 local`.
- `[22.D.2.3]` Urgentes (new_lead, document_signed, payment_received): bypass si user optó explícitamente (config.respect_quiet_hours=false) o si tipo.alwaysUrgent=true.

**Criterio de done del módulo:**
- [ ] User en CDMX 23:00 recibe new_lead (urgent) pero no daily_summary (posterga a 7am).

### BLOQUE 22.E — WhatsApp Business bidireccional

#### MÓDULO 22.E.1 — Inbound webhook

**Pasos:**
- `[22.E.1.1]` Route `/api/webhooks/whatsapp` (GET verify token, POST events).
- `[22.E.1.2]` Verify `X-Hub-Signature-256` HMAC SHA256 (`WA_APP_SECRET`).
- `[22.E.1.3]` Parse eventos: `messages.status` (sent/delivered/read/failed) update `notificaciones.status`; `messages.text` INSERT `inbox_messages`.
- `[22.E.1.4]` Palabras especiales: "STOP"/"BAJA" → opt-out global WA (set config rows whatsapp=false para todos tipos); "AYUDA"/"HELP" → template respuesta con links self-service.
- `[22.E.1.5]` NLP básico (Claude Haiku via AI SDK v6) parsea intención: "confirmar visita" → update visitas_programadas; "cambiar cita" → crea tarea para asesor; default → forward a inbox asesor con flag `needs_human=true`.
- `[22.E.1.6]` Rate limit webhook por phone_number (ventana 60s, max 30 eventos).

**Criterio de done del módulo:**
- [ ] Test: enviar STOP → WA queda desactivado.
- [ ] Comprador responde "confirmar" → visita status=confirmed.

#### MÓDULO 22.E.2 — Session messages (handoff humano)

**Pasos:**
- `[22.E.2.1]` Si usuario respondió a template últimas 24h, asesor puede enviar texto libre desde inbox.
- `[22.E.2.2]` UI `/inbox` (Fase 14 M11) con conversaciones agrupadas por contacto.
- `[22.E.2.3]` Enviar desde inbox → endpoint tRPC `inbox.sendMessage` con validación session activa.
- `[22.E.2.4]` Timer visible "Quedan XXh para session" (24h desde último mensaje user).

**Criterio de done del módulo:**
- [ ] Asesor responde session antes de 24h ok; después de 24h solo templates.

### BLOQUE 22.F — Resend email templates React Email

#### MÓDULO 22.F.1 — Layout branded + componentes

**Pasos:**
- `[22.F.1.1]` `emails/_layout/DopamineEmailLayout.tsx` con Header (logo + gradient), Footer (unsubscribe link, preferences link, dirección legal DMX MX, disclaimer "DMX es infraestructura, no responsable post-venta").
- `[22.F.1.2]` Componentes reusables: `<ScoreBadge>`, `<CTAButton>`, `<PropertyCard>`, `<KPITile>`, `<FooterSocial>`.
- `[22.F.1.3]` Light/Dark mode vía media query (fallback Dopamine claro).
- `[22.F.1.4]` Tokens Dopamine via CSS inline (Outfit font fallback a Arial).
- `[22.F.1.5]` Accessibility: alt text imágenes, contraste ≥4.5:1, semantic HTML.

**Criterio de done del módulo:**
- [ ] Layout renderiza OK en Gmail/Outlook/Apple Mail (litmus test).

#### MÓDULO 22.F.2 — 20 templates concretos

**Pasos:**
- `[22.F.2.1]` Uno por tipo. Ejemplos clave:
  - `emails/new-lead.tsx`: Hero "Tienes un nuevo lead", Card contacto (nombre + tipo + origen + temperatura), CTA "Ver y responder", tip SLA 15min.
  - `emails/weekly-briefing.tsx`: 3 recomendaciones AI + 2 insights mercado + chart momentum zonas top (PNG generado server-side o inline SVG).
  - `emails/discover-weekly.tsx`: "Tus 3 proyectos de la semana" con carrusel 3 PropertyCards, cada una con score + 1-liner AI.
  - `emails/annual-wrapped.tsx`: DMX Wrapped viral con stats personales + share buttons.
- `[22.F.2.2]` i18n: cada template wrapeado en `<IntlProvider locale={locale}>` con dicts `messages/es-MX.json` etc. (FASE 05).
- `[22.F.2.3]` Preheader (preview text) optimizado por tipo.

**Criterio de done del módulo:**
- [ ] 20 templates con snapshots Playwright pixel-diff <5%.

### BLOQUE 22.G — Twilio SMS fallback

#### MÓDULO 22.G.1 — Adapter SMS

**Pasos:**
- `[22.G.1.1]` `shared/lib/notifs/channels/sms.ts` con `sendSMS({to, body, messagingServiceSid})`. Usa Twilio SDK.
- `[22.G.1.2]` Números verificados per país (MX +52, CO +57, AR +54, BR +55, CL +56).
- `[22.G.1.3]` 3 reintentos con backoff 1min/5min/15min.
- `[22.G.1.4]` Opt-out palabras "STOP"/"BAJA" → set config.sms=false.
- `[22.G.1.5]` Longitud ≤160 chars o segmentado (cuenta costo — log en PostHog property `sms_segments`).
- `[22.G.1.6]` Solo se activa cuando WhatsApp falla 2 veces consecutivas + config.sms=true.

**Criterio de done del módulo:**
- [ ] SMS llega en <30s con link corto a acción.
- [ ] Costo tracked por notif.

### BLOQUE 22.H — 12 Webhooks outgoing

#### MÓDULO 22.H.1 — Registry de 12 event types

**Pasos:**
- `[22.H.1.1]` Catálogo `shared/lib/webhooks/events.ts` con 12 event types:
  - Originales v3 (7): `unit_sold`, `price_changed`, `lead_created`, `operation_created`, `operation_closed`, `document_processed`, `visit_scheduled`.
  - Nuevos v4 (5): `score_changed` (>5% delta), `captacion_created`, `prop_sec_published`, `acm_generated`, `momentum_changed`.
- `[22.H.1.2]` Cada event tiene Zod schema para payload estable (versión v1, backwards-compat futura).
- `[22.H.1.3]` Documentación OpenAPI en `/api/v1/webhooks/docs` con example payloads.

**Criterio de done del módulo:**
- [ ] 12 events documentados con schema Zod + ejemplos.

#### MÓDULO 22.H.2 — Dispatcher + HMAC + retry

**Pasos:**
- `[22.H.2.1]` `shared/lib/webhooks/dispatcher.ts` con `dispatchWebhook(eventType, payload)`:
  1. SELECT `webhooks_outbound WHERE is_active AND event_types @> ARRAY[eventType]`.
  2. Por cada suscripción: compute `signature = HMAC-SHA256(secret, timestamp + '.' + JSON.stringify(payload))`.
  3. POST target_url con headers `X-DMX-Signature`, `X-DMX-Timestamp`, `X-DMX-Event`, `X-DMX-Delivery-Id`.
  4. Timeout 10s. INSERT webhook_logs con attempt, status_code.
  5. Si 2xx → success. Si 4xx (permanente) → marcar no-retry. Si 5xx/timeout → scheduler retry.
- `[22.H.2.2]` Retry exponencial: 1min, 5min, 15min, 1h, 6h, 24h → max 10 attempts. Cron `webhooks_retry_dispatcher` cada 1min procesa `WHERE next_retry_at <= now()`.
- `[22.H.2.3]` Circuit breaker: si `failure_count >= 10` consecutivos → is_active=false + notif al dueño.
- `[22.H.2.4]` Al éxito, reset `failure_count=0` y update `last_success_at`.

**Criterio de done del módulo:**
- [ ] Webhook con URL inválida hace 10 intentos y se desactiva.
- [ ] HMAC verificable por consumidor (ejemplo receptor en docs).

#### MÓDULO 22.H.3 — UI `/developer/webhooks` (referencia, detalle en FASE 15)

**Pasos:**
- `[22.H.3.1]` CRUD webhooks: name, target_url, event_types (multiselect), secret generado.
- `[22.H.3.2]` Secret mostrado 1 sola vez tras crear (modal copiar). No se puede ver después.
- `[22.H.3.3]` Logs: últimos 50 dispatches por webhook con status, latency, retry attempt.
- `[22.H.3.4]` Boton "Test webhook" dispara evento `ping` con payload dummy.

**Criterio de done del módulo:**
- [ ] Dev crea webhook, recibe ping OK.
- [ ] Logs legibles con timestamps.

### BLOQUE 22.I — Marketing auto-generación piezas

#### MÓDULO 22.I.1 — `ai_marketing_generator` service

**Pasos:**
- `[22.I.1.1]` Schema `ai_marketing_assets`: (id, project_id, asset_type CHECK ('post_cuadrado','post_largo','story','video_story','video'), channel, target_audience jsonb, status CHECK ('queued','generating','ready','failed'), input_params jsonb, output_url, storage_bucket, ai_model_used, generation_cost_usd numeric, created_by, created_at, expires_at).
- `[22.I.1.2]` tRPC `marketing.generateAsset` input `{ projectId, assetType, targetAudience, channel }` → encola job en `ai_jobs` (FASE 17 pipeline reusable).
- `[22.I.1.3]` Worker edge function consume job:
  1. Lee project data + IE scores (zone + project) inline.
  2. PostCuadrado/PostLargo/Story: usa Claude Sonnet 4 para copy + Ideogram/DALL-E 3 para imagen; plantillas Dopamine por asset_type (branding + gradients).
  3. VideoStory hasta 24h: usa Runway Gen-3 o similar (H1 opt-in, pricing tracked).
  4. Video hasta 24h: mismo motor video con script Claude.
  5. Upload a Supabase Storage bucket `marketing-assets` (signed URLs expires_at=expiration de asset).
- `[22.I.1.4]` Output bundle: MP4 / PNG / PDF según asset_type.
- `[22.I.1.5]` Usage counter `ai_assets_generated_month` gateado por plan (FASE 23 feature gating).

**Criterio de done del módulo:**
- [ ] Asesor genera PostCuadrado para un proyecto → ready en <60s.
- [ ] Usage increment respetado.

#### MÓDULO 22.I.2 — UI `/marketing/generate/[projectId]`

**Pasos:**
- `[22.I.2.1]` Wizard 3 pasos: (1) Target audience (familia/inversor/primera_compra/senior/nightlife/remote_worker — A10 perfiles), (2) Asset type + channel (FB/IG/WA/LinkedIn/Landing), (3) Preview + Generate.
- `[22.I.2.2]` Preview muestra data IE que se incluirá (Livability, Momentum, ZoneScore) + editable.
- `[22.I.2.3]` Galería de assets generados previos.
- `[22.I.2.4]` CTA "Compartir" → genera link tracking `/m/:assetId` que cuenta clicks + incrementa `asset_views`.

**Criterio de done del módulo:**
- [ ] Flow E2E: asesor selecciona → espera 30-60s → recibe asset listo para descargar/compartir.

### BLOQUE 22.J — Landing pages + QR + kit ventas

#### MÓDULO 22.J.1 — Landing pages dinámicas `/lp/[slug]`

**Pasos:**
- `[22.J.1.1]` Tabla `project_landing_pages` (id, project_id, slug unique, created_by, headline, subheadline, cta_label, cta_target, seo_title, seo_description, published, views_count, leads_count, created_at). RLS: creator OR admin.
- `[22.J.1.2]` tRPC `marketing.createLanding` con slug auto-gen `{project-slug}-{random6}`.
- `[22.J.1.3]` Ruta pública `app/(public)/lp/[slug]/page.tsx` server component con IE scores inline (livability/momentum), galería fotos, form captura lead (name + phone + email) → POST /api/public/lp/:slug/lead crea `contactos` origen=`landing_page` + dispatch webhook `lead_created`.
- `[22.J.1.4]` Branding Dopamine; tokens, gradients, animaciones.
- `[22.J.1.5]` SEO: Open Graph, schema.org Residence, canonical.
- `[22.J.1.6]` Rate limit form 3 req/min por IP.

**Criterio de done del módulo:**
- [ ] Asesor crea landing → URL share-able → lead cae en su CRM.

#### MÓDULO 22.J.2 — QR codes

**Pasos:**
- `[22.J.2.1]` Tabla `qr_codes` (id, target_url, short_slug, created_by, scan_count, last_scan_at).
- `[22.J.2.2]` tRPC `marketing.createQR` genera PNG 512x512 + SVG via `qrcode` npm. Short URL `dmx.to/q/:slug` redirige target y count++.
- `[22.J.2.3]` Download formatos: PNG, SVG, PDF (página impresa con QR + branding).

**Criterio de done del módulo:**
- [ ] QR escaneable abre landing + count++.

#### MÓDULO 22.J.3 — Kit ventas PDF con datos IE

**Pasos:**
- `[22.J.3.1]` Generador PDF (react-pdf o puppeteer-core) con 6 páginas: cover proyecto, fotos, specs, scores IE (DMX Score + Livability + Momentum + Risk), comparables (A08), cierre CTA + QR.
- `[22.J.3.2]` tRPC `marketing.generateKit({projectId, audience})` retorna signed URL PDF.
- `[22.J.3.3]` Branding configurable por asesor (logo + colores dentro de tokens Dopamine).

**Criterio de done del módulo:**
- [ ] PDF 6 páginas <2s generación, <3MB.

### BLOQUE 22.K — Crons periodicos

#### MÓDULO 22.K.1 — `weekly_briefing_generate` (lunes 7am local)

**Pasos:**
- `[22.K.1.1]` Cron `vercel.json` entry `0 7 * * 1` → ejecuta `cron/weekly_briefing.ts`.
- `[22.K.1.2]` Para cada asesor activo: generar briefing vía Claude Sonnet 4 (N5 C05 en FASE 12) + enqueue notif tipo 13 `weekly_briefing`.
- `[22.K.1.3]` Batched: 100 asesores por worker, parallel Vercel Queues.
- `[22.K.1.4]` Timezone awareness: cron corre 24 veces (cada hora UTC) y selecciona user cuyo timezone local sea ~7am.

**Criterio de done del módulo:**
- [ ] Lunes 7am CDMX → todos asesores MX reciben briefing.
- [ ] Asesor Bogotá recibe a las 7am BOG (diferente hora UTC).

#### MÓDULO 22.K.2 — `discover_weekly_generate` (lunes 8am local)

**Pasos:**
- `[22.K.2.1]` Cron `0 8 * * 1`.
- `[22.K.2.2]` Para cada comprador con ≥1 búsqueda activa: ejecutar matching C03 × top3 → INSERT `ai_generated_content.type='discover_weekly'` + enqueue notif tipo 12.
- `[22.K.2.3]` Si <3 matches ese comprador → skip (no spam).

**Criterio de done del módulo:**
- [ ] Comprador con busqueda activa recibe 3 proyectos match + email con 3 PropertyCards.

#### MÓDULO 22.K.3 — `monthly_index_newsletter` (día 5 de cada mes)

**Pasos:**
- `[22.K.3.1]` Cron `0 10 5 * *`.
- `[22.K.3.2]` Newsletter pública + registrados opt-in: top 5 colonias por cada índice DMX + 3 insights + link `/indices`.
- `[22.K.3.3]` Subscribers tabla `newsletter_subscribers` (email unique, country, interest_areas[], opt_in_timestamp, unsubscribed_at).

**Criterio de done del módulo:**
- [ ] Día 5 mes → newsletter sale.
- [ ] Unsubscribe link funciona.

#### MÓDULO 22.K.4 — `annual_wrapped` (1 enero)

**Pasos:**
- `[22.K.4.1]` Cron `0 9 1 1 *`.
- `[22.K.4.2]` Genera DMX Wrapped por usuario (asesor: XP total año, top zona, deals, streak más largo; comprador: zonas exploradas, score promedio watchlist, momentum zonas donde compró vs promedio).
- `[22.K.4.3]` Share buttons: Twitter, LinkedIn, Instagram Story (imagen generada con IE stats + branding).
- `[22.K.4.4]` Viral loop: si comparten → badge "Early 2027 sharer" + 100 XP bonus.

**Criterio de done del módulo:**
- [ ] Wrapped genera para 100% usuarios con actividad año.
- [ ] Share Twitter incluye imagen + hashtag #DMXWrapped.

#### MÓDULO 22.K.5 — Birthday + anniversary cron (GC-50)

**Pasos:**
- `[22.K.5.1]` Cron `birthday_anniversary_daily` 8am local por timezone (wrapper timezone-aware como briefing). Para cada asesor activo, escanea sus contactos:
  - `birthday_today`: `contactos.birth_date` mes/día = hoy.
  - `birthday_upcoming_3d`: mes/día = hoy+3 (ya cubierto FASE 13 GC-50 módulo 13.F.6 — aquí replica en marketing comms para notif a contacto si opt-in).
  - `anniversary_1y_purchase`: `operaciones.closed_at` date exactly 1y ago.
  - `anniversary_6m_no_contact`: `contactos.last_interaction_at < now() - 180 days`.
- `[22.K.5.2]` Para cada match: (a) crea tarea asesor, (b) si contacto consent WA/email → dispatch template personalizado (birthday template "¡Feliz cumpleaños {name}!", anniversary "Hace 1 año cerramos tu hogar en {zona}"), (c) log en `re_engagement_flows` tabla.
- `[22.K.5.3]` 3 templates WA a aprobar Meta adicionales (adds a 22.C.3 catalog): `birthday_greeting_v1`, `anniversary_1y_v1`, `reengagement_6m_v1`.
- `[22.K.5.4]` Si el contacto responde → push a FASE 14 Sequence Engine (GC-28) step "post_birthday_followup".
- `[22.K.5.5]` Feature gated `feature.birthday_reengagement` (default Starter+).

**Criterio de done del módulo:**
- [ ] Contacto con birth_date hoy recibe WA greeting.
- [ ] Tarea asesor creada paralela.
- [ ] Template catálogo actualizado.

### BLOQUE 22.L — Compliance (unsubscribe + preferences center)

#### MÓDULO 22.L.1 — Unsubscribe links firmados

**Pasos:**
- `[22.L.1.1]` Ruta `/unsubscribe?token=...` verifica HMAC token (payload: user_id, type, channel, exp 7 días).
- `[22.L.1.2]` Muestra página con toggles de tipos + confirm unsubscribe.
- `[22.L.1.3]` Audit log row en `audit_log` con action='notif_unsubscribe'.
- `[22.L.1.4]` One-click unsubscribe (RFC 8058) con endpoint POST /api/unsubscribe/one-click.

**Criterio de done del módulo:**
- [ ] Click unsubscribe en email → config actualizada en <2s.

#### MÓDULO 22.L.2 — `/settings/notifications` preferences center

**Pasos:**
- `[22.L.2.1]` UI matriz 20 tipos × 5 canales (in_app siempre on), toggles tipo switch.
- `[22.L.2.2]` Quiet hours picker (time range) + timezone.
- `[22.L.2.3]` Digest frequency picker (realtime / hourly / daily / weekly / off).
- `[22.L.2.4]` Botón "Quiero pausar notifs 7 días" (set respect_quiet_hours=false + scheduled_for all future = now() + 7 días).
- `[22.L.2.5]` Link desde email footer siempre visible.

**Criterio de done del módulo:**
- [ ] User modifica config → próxima notif respeta cambio.

#### MÓDULO 22.L.3 — STOP en WhatsApp

**Pasos:**
- `[22.L.3.1]` Webhook inbound detecta "STOP"/"BAJA"/"CANCELAR" case insensitive.
- `[22.L.3.2]` Desactiva WA en los 20 tipos + responde con template confirmación + link preferences si quieren reactivar.

**Criterio de done del módulo:**
- [ ] Enviar STOP → WA bloqueado + confirmación recibida.

### BLOQUE 22.N — GC-33 WA Auto-Draft + GC-28 Sequence Engine integration

#### MÓDULO 22.N.1 — WhatsApp template auto-draft (GC-33)

**Pasos:**
- `[22.N.1.1]` Service `shared/lib/notifs/wa-auto-draft.ts` centraliza `draftWaTemplate({ userId, contactId, intent, locale })` (intent ∈ nurture/property_match/follow_up/birthday/anniversary/price_drop/re_engagement).
- `[22.N.1.2]` Genera draft usando Claude Haiku + data contacto + IE scores zona top (N8 Livability, N11 Momentum, F01 Safety). Output `{ text, variables_used, citations[] }`.
- `[22.N.1.3]` Validación Meta policy: asegura que variables están soportadas por template aprobado (mapeo intent→template). Si custom text fuera de ventana 24h → requires template.
- `[22.N.1.4]` UI integrations: usado por FASE 13 (13.D.4) y Sequence Engine (22.N.2) y Blast (FASE 14 14.C.5).
- `[22.N.1.5]` Feature gated `feature.wa_auto_draft`.

**Criterio de done del módulo:**
- [ ] Draft multi-intent genera con ≥2 citations IE.
- [ ] Variables mapeo correcto.

#### MÓDULO 22.N.2 — Sequence Engine integration (GC-28)

**Pasos:**
- `[22.N.2.1]` El orchestrator de notifs (22.D.1) expone API `orchestrator.sendFromSequence(step, contact, context)` que FASE 14 Sequence Engine invoca en cada step tipo Message.
- `[22.N.2.2]` Soporta channels (wa, email, sms, in_app) con fallback cascade.
- `[22.N.2.3]` Tracking: cada send desde sequence ≠ notif regular — tag `source='sequence_run'`, `sequence_run_id` en `notificaciones.metadata` para analytics.
- `[22.N.2.4]` Rate limiting per sequence (max 100 sends/hour por user para evitar bursts Meta).
- `[22.N.2.5]` Stop events: si notif bounces / opt-out / contact_responded → notifica Sequence Engine para evaluar branch/stop.

**Criterio de done del módulo:**
- [ ] Sequence 3 steps WA+email+SMS ejecuta via orchestrator.
- [ ] Stop event propaga correctamente.

### BLOQUE 22.M — Tracking PostHog

#### MÓDULO 22.M.1 — Events

**Pasos:**
- `[22.M.1.1]` Eventos: `notif_enqueued`, `notif_sent`, `notif_delivered`, `notif_opened`, `notif_clicked`, `notif_failed`, `webhook_dispatched`, `webhook_success`, `webhook_failed`, `marketing_asset_generated`, `landing_viewed`, `landing_lead_captured`, `qr_scanned`, `unsubscribe`.
- `[22.M.1.2]` Propiedades: type, channel, user_role, country_code, locale, reference_type, duration_ms.
- `[22.M.1.3]` Dashboards PostHog: "Notifs funnel" (sent→delivered→opened→clicked), "Webhooks health" (success rate por subscriber), "Marketing assets ROI" (generated→shared→lead_captured).
- `[22.M.1.4]` Alert: si open rate email <15% 24h → Sentry warn (puede ser SPF/DKIM broken o dominio blocklist).

**Criterio de done del módulo:**
- [ ] Dashboard "Notifs funnel" muestra datos tras 24h tráfico seed.

## Criterio de done de la FASE

- [ ] Schema 4 tablas + 3 indexes clave + particion mensual `notificaciones`.
- [ ] 20 tipos × 4+ canales cubiertos + 5º canal SMS fallback.
- [ ] Orquestador con preference matrix + quiet hours + dedup funcionando.
- [ ] WhatsApp Business bidireccional: 5 templates aprobados + webhook inbound + STOP funcional.
- [ ] Resend email 20 templates React Email branded Dopamine + unsubscribe.
- [ ] Twilio SMS fallback cuando WA falla.
- [ ] 12 webhooks outgoing con HMAC + retry 10 attempts + circuit breaker.
- [ ] Marketing auto: 5 asset types + landing pages + QR + kit PDF.
- [ ] 4 crons (`weekly_briefing`, `discover_weekly`, `monthly_newsletter`, `annual_wrapped`) registrados en `vercel.json`.
- [ ] Compliance: unsubscribe links firmados, STOP WA, preferences center `/settings/notifications`.
- [ ] PostHog tracking + dashboards activos.
- [ ] Tests integrales: E2E "INSERT contacto → WA llega asesor en <10s", E2E "user unsubscribe → próxima notif respeta", E2E "webhook URL rota 10 retries + deactivate".
- [ ] Feature flags gateando `notifs_whatsapp`, `notifs_sms`, `notifs_push`, `webhooks_outbound`, `marketing_auto_generator`.
- [ ] ADR-009 compliance: webhook secrets encriptados, HMAC sin timing attack (`crypto.timingSafeEqual`).
- [ ] Documentación catálogo 03.12 actualizada con mapping final tipos → canales default → templates.
- [ ] Tag git `fase-22-complete`.

## Features añadidas por GCs (delta v2)

- **F-22-21** Birthday + anniversary cron (GC-50) con 3 templates Meta nuevos.
- **F-22-22** WhatsApp template auto-draft service (GC-33) centralizado.
- **F-22-23** Sequence Engine orchestrator integration (GC-28) con stop events.

## E2E VERIFICATION CHECKLIST

Enforcement per [ADR-018 E2E Connectedness](../01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md). Todos los items deben pasar antes del tag `fase-22-complete`.

- [ ] Todos los botones UI mapeados en 03.13_E2E_CONNECTIONS_MAP
- [ ] Todos los tRPC procedures implementados (no stubs sin marcar)
- [ ] Todas las migrations aplicadas
- [ ] Todos los triggers/cascades testeados
- [ ] Permission enforcement validado para cada rol
- [ ] Loading + error + empty states implementados
- [ ] Mobile responsive verificado
- [ ] Accessibility WCAG 2.1 AA
- [ ] audit-dead-ui.mjs pasa sin violations (0 dead)
- [ ] Playwright smoke tests covering happy paths pasan
- [ ] PostHog events tracked para acciones clave
- [ ] Sentry captures errors (validación runtime)
- [ ] STUBs marcados explícitamente con // STUB — activar FASE XX

## BLOQUE 22.X — WhatsApp Bot consulta índices + Alert Radar segmentado + Press Kit mensual

> **Contexto:** Extensiones comunicacionales que apalancan FASE 11 XL (seeds implementados — 15 índices + Alert Radar WhatsApp base en 11.T + Press Kit trimestral en 11.I). Este bloque amplía hacia consulta conversacional + segmentación fina + frecuencia mayor.
> **Dependencias:** FASE 11 XL (seeds implementados), FASE 22 WA Business base + templates.

### MÓDULO 22.X.1 — WhatsApp Bot consulta índices

**Pasos:**
- `[22.X.1.1]` Extender webhook inbound WA (22.E.1) con NLP para detectar queries tipo "¿cómo va Roma Norte?", "score Condesa", "momentum Del Valle", "¿cuál colonia me conviene para familia budget 5M?".
- `[22.X.1.2]` Claude Haiku parsea intent + entities (zona/índice/budget/perfil) → llama `intelligence.getZoneIndicesSummary({zoneSlug})` o `intelligence.recommendZonesByProfile({budget, profile})`.
- `[22.X.1.3]` Response template WA (pre-aprobado Meta) con los 15 índices DMX formateados + link a página colonia (FASE 20.Y.4).
- `[22.X.1.4]` Rate limit: 10 queries/hora por número WA para evitar abuse.
- `[22.X.1.5]` Feature gated `feature.wa_bot_indices_consultation` (free limited 3/día, Starter 20, Pro ilimitado).

**Criterio de done del módulo:**
- [ ] Query "¿cómo va Roma Norte?" responde en <5s con 15 índices.
- [ ] Query recomendación retorna top 3 zonas con rationale.

### MÓDULO 22.X.2 — Alert Radar WhatsApp ampliado (segmentación fina)

**Pasos:**
- `[22.X.2.1]` Extiende Alert Radar WhatsApp base (FASE 11.T) con segmentación por persona (family/investor/young/senior/nomad), horarios preferidos (quiet hours per user), frecuencia (realtime/daily/weekly), filtros zona.
- `[22.X.2.2]` UI `/settings/alerts` permite al user configurar: (a) alert types subscribe (alpha alert, price drop, new listing, pulse spike, climate warning), (b) zonas watchlist, (c) persona fit, (d) horarios.
- `[22.X.2.3]` Cron `alert_radar_wa_dispatcher` cada 15 min evalúa `zone_alpha_alerts` + user subscriptions + respeta quiet hours + dispatch via orchestrator (22.D.1).
- `[22.X.2.4]` Templates WA específicos por alert type (5 templates Meta a aprobar adicionales).

**Criterio de done del módulo:**
- [ ] User configura alerts, recibe WA al trigger correcto.
- [ ] Quiet hours respetadas.

### MÓDULO 22.X.3 — Press Kit Auto mensual

**Pasos:**
- `[22.X.3.1]` Complementa Press Kit trimestral de FASE 11.I con versión mensual más ágil: el día 3 de cada mes, cron `press_kit_monthly_generate` auto-produce PDF 6-8 páginas con:
  - "Movers del mes" (top 10 colonias con mayor Δ Momentum/Pulse).
  - 1 narrative editorial AI (2 páginas).
  - 3 datos sorprendentes con citations.
  - Infografías ready para prensa.
- `[22.X.3.2]` Distribución: emails a lista `press_subscribers` (journalists, reporters, fondos, researchers) + publicación automática `/prensa/mensual/YYYY-MM`.
- `[22.X.3.3]` Tracking: abre, clicks, menciones (Google Alerts integration H2).
- `[22.X.3.4]` PR loop: cada mención en prensa alimenta authority + SEO + social proof.

**Criterio de done del módulo:**
- [ ] Día 3 mes → Press Kit generado + enviado.
- [ ] Página pública accesible.

## Próxima fase

FASE 23 — Monetización (Stripe full + feature gating + 7 productos B2B infraestructura H1 + API externa).

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent F) | **Fecha:** 2026-04-17
**Pivot revisión:** 2026-04-18 (biblia v2 moonshot — GCs integrados + E2E checklist)
