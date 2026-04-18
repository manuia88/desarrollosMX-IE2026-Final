# FASE 26 — Compliance + Auditoría (LFPDPPP multi-country + ARCO + cookies + audit + legal)

> **Duración estimada:** 3 sesiones Claude Code (~12 horas con agentes paralelos)
> **Dependencias:** FASE 00-02 (auth + BD base), FASE 06 (seguridad baseline — audit_log existe), FASE 22 (notifs — unsubscribe + STOP ya compliance), FASE 23 (billing — consents pago), FASE 24 (observability — PII scrubbing). Bloqueante suave legal review externo (Manu).
> **Bloqueantes externos:**
> - **Revisión legal** Terms of Service + Privacy Policy + Cookie Policy por abogado corporativo MX (y representación en CO/AR/BR/CL si el alcance requiere registrar AEPD-equivalents).
> - **Registro ante INAI (MX)** del aviso de privacidad (self-submit, no pre-approval — pero requiere haberlo publicado).
> - **Domain dedicado para ARCO**: `arco@desarrollosmx.com` o `privacidad@desarrollosmx.com` (según INAI).
> - **DPO** designado (puede ser Manu en H1 con contacto email público; H2 considerar externalizar a Privacy Solutions MX o equivalente).
> - **AML/KYC retention**: storage bucket separado con retention 10 años per UIF MX.
> - Feature flags `privacy_consent_v1`, `arco_workflow_enabled`, `cookie_consent_banner`, `data_export_enabled`, `account_deletion_enabled`.
> **Resultado esperado:** Cumplimiento LFPDPPP MX + equivalencias multi-country (CO/AR/BR/CL). Flow ARCO funcional UI + backend. Cookie consent granular. Data retention políticas aplicadas. Audit log completo con queries sensibles. Data export user (GDPR-lite) JSON+PDF. Account deletion soft+hard con gracia 30 días. Legal docs publicados + versionados + signables. AML/KYC records segregated. T&Cs con cláusula explícita "DMX es infraestructura, no responsable post-venta". Tag `fase-26-complete`.
> **Priority:** [H1]

## Contexto y objetivo

Esta fase convierte DMX de "funcionalmente seguro" a **legalmente operable** en MX + LATAM. Sin ella, DMX no puede vender por contrato, cerrar deals enterprise, ni operar sin riesgo regulatorio.

Principios no negociables:
- **Privacy by design**: consent granular, data minimization, purpose limitation, right to be forgotten.
- **Multi-country privacy**: 5 regímenes legales paralelos en el mismo código, toggled por `country_code`.
- **DMX NO responsable post-venta** (ADR-008): cláusula EXPLÍCITA + cerrada duro en UI compra + checkout + escrow release + T&Cs footer — objetivo legal defense.
- **Audit log inmutable**: tamper-evident via hash chain + retention 7 años AML/KYC.
- **Data export y deletion siempre disponibles** per ARCO / GDPR-lite — no excusas técnicas.

Cross-references:
- ADR-008 (monetización + disclaimers post-venta).
- ADR-009 (security model — base del audit_log).
- ADR-003 (multi-country — frameworks legales per país).
- FASE 06 (audit_log tabla base).
- FASE 22 (unsubscribe/STOP ya cumple opt-out).
- FASE 24 (PII masking observability).
- Runbook 05.6 (Data Retention Policy — lo aterriza operacional).

## Bloques

### BLOQUE 26.A — LFPDPPP MX compliance

#### MÓDULO 26.A.1 — Aviso de privacidad publicado

**Pasos:**
- `[26.A.1.1]` Ruta pública `/privacy` con aviso de privacidad integral (no simplificado, requerido en LFPDPPP art. 15-16):
  - Identidad y domicilio del responsable (DesarrollosMX, razón social, RFC, domicilio fiscal).
  - Finalidades del tratamiento (primarias vs secundarias).
  - Datos recabados (taxonomía: identificación, contacto, patrimoniales, sensibles si existen).
  - Transferencias (Stripe, Anthropic, OpenAI, Supabase, etc. — listar completo).
  - Derechos ARCO + medio de ejercerlos.
  - Límite uso/divulgación.
  - Revocación de consentimiento.
  - Uso de cookies.
  - Cambios al aviso + dónde se comunicarán.
  - Fecha última actualización.
  - Contacto DPO.
- `[26.A.1.2]` Versión corta en signup form con link completa + checkbox "He leído y acepto el Aviso de Privacidad".
- `[26.A.1.3]` Signage adicional en formularios que recolectan datos (avisos cortos estilo "Al enviar, aceptas..." con link aviso corto).
- `[26.A.1.4]` Registrar aviso en INAI via self-service (Manu action item).

**Criterio de done del módulo:**
- [ ] `/privacy` publicado con aviso integral revisado legal.
- [ ] Signup form no permite submit sin checkbox.

#### MÓDULO 26.A.2 — Tabla `privacy_consents` (tracking granular)

**Pasos:**
- `[26.A.2.1]` Schema:
  ```sql
  CREATE TABLE privacy_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL CHECK (consent_type IN (
      'privacy_notice','tos','cookies_essential','cookies_analytics','cookies_marketing',
      'marketing_email','marketing_whatsapp','marketing_sms','marketing_push',
      'data_sharing_partners','data_processing_ai','biometric_processing',
      'aml_kyc_processing','credit_bureau_query','secondary_purposes'
    )),
    version TEXT NOT NULL, -- 'v1.2.0' - referencia a legal_documents.version
    consent_given BOOLEAN NOT NULL,
    consent_method TEXT CHECK (consent_method IN ('checkbox','implicit','email','signature','revocation')),
    ip_address INET,
    user_agent TEXT,
    country_code TEXT,
    consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ,
    metadata JSONB -- e.g. { source_url, form_id }
  );
  CREATE INDEX ON privacy_consents (user_id, consent_type);
  CREATE INDEX ON privacy_consents (user_id, consented_at DESC);
  ```
- `[26.A.2.2]` RLS: user SELECT own; admin todo. INSERT solo via service (no mutable por user excepto revocación via `revokeConsent`).
- `[26.A.2.3]` Immutable: UPDATE/DELETE bloqueados por RLS; revocación crea new row con `consent_given=false`.
- `[26.A.2.4]` Audit: cada insert dispara trigger a `audit_log`.

**Criterio de done del módulo:**
- [ ] Consent grabado en signup con IP + UA + version + timestamp.
- [ ] Revocación sin sobrescribir histórico.

#### MÓDULO 26.A.3 — ARCO rights workflow

**Pasos:**
- `[26.A.3.1]` UI `/privacy/my-data` (auth required) con 4 acciones:
  - **Acceso**: ver todos mis datos → exporta JSON + PDF (ver 26.F).
  - **Rectificación**: request con campos específicos → admin review → update BD + notif.
  - **Cancelación**: soft delete account → gracia 30 días → hard delete (ver 26.G).
  - **Oposición**: stop processing para fines secundarios (marketing, sharing partners).
- `[26.A.3.2]` Workflow backend:
  - Tabla `arco_requests` (id, user_id, type CHECK ARCO, status CHECK submitted/in_review/resolved/denied, submitted_at, resolved_at, resolver_id, justification, evidence_url).
  - Cron `arco_sla_monitor` diario → si request >20 días hábiles sin resolver → alert admin + notif user (LFPDPPP requiere respuesta 20 días).
- `[26.A.3.3]` Identity verification antes de procesar: si request desde email no verified → require 2FA / upload INE photo.
- `[26.A.3.4]` Admin page `/admin/arco` procesa queue requests con evidencia+decisión.

**Criterio de done del módulo:**
- [ ] User submite Cancelación → soft delete aplicado; notif confirmando.
- [ ] Admin resuelve request en UI + timestamp + resolver tracked.

### BLOQUE 26.B — Multi-country privacy

#### MÓDULO 26.B.1 — Config per país

**Pasos:**
- `[26.B.1.1]` Tabla `privacy_frameworks`:
  ```sql
  CREATE TABLE privacy_frameworks (
    country_code TEXT PRIMARY KEY,
    framework_name TEXT, -- 'LFPDPPP','Ley 1581','Ley 25326','LGPD','Ley 19628'
    consent_method TEXT, -- 'explicit','implicit_permitted_some'
    arco_deadline_days INT, -- 20 MX, 10 CO, 10 AR, 15 BR, 15 CL
    breach_notification_deadline_hours INT, -- 72 LGPD BR, etc
    dpo_required BOOLEAN,
    cross_border_transfer_rules TEXT,
    cookie_consent_required BOOLEAN DEFAULT true,
    data_localization BOOLEAN DEFAULT false,
    children_protection_age INT DEFAULT 18,
    regulatory_body_url TEXT,
    regulatory_body_email TEXT
  );
  ```
- `[26.B.1.2]` Seed 5 rows: MX LFPDPPP, CO Ley 1581 (Habeas Data), AR Ley 25326, BR LGPD, CL Ley 19628 (actualización 21719 si promulgada).
- `[26.B.1.3]` Helper `getPrivacyFramework(countryCode)` retorna config → UI y backend customizan UX.

**Criterio de done del módulo:**
- [ ] 5 frameworks seeded.
- [ ] ARCO deadline cron usa `arco_deadline_days` del país del user.

#### MÓDULO 26.B.2 — Content localization

**Pasos:**
- `[26.B.2.1]` Aviso de privacidad tiene 5 versiones (una por país) en `messages/{locale}/privacy.json` + template render.
- `[26.B.2.2]` BR LGPD: incluir specifically legal basis per purpose (consent, contract, legitimate interest...).
- `[26.B.2.3]` CO: Habeas Data Financiero separado si aplica credit bureau.
- `[26.B.2.4]` Version control: cada vez que se actualiza aviso → `legal_documents` row nueva con semver + required_reconsent boolean.

**Criterio de done del módulo:**
- [ ] User CO ve aviso Ley 1581 + Habeas Data si aplica.

### BLOQUE 26.C — Cookie consent banner

#### MÓDULO 26.C.1 — Banner granular

**Pasos:**
- `[26.C.1.1]` Componente `<CookieConsentBanner>` bottom-fixed, Dopamine styled, 3 categorías toggles:
  - Esenciales (always on, no toggle): auth, csrf, session, language.
  - Analytics: PostHog, Vercel Analytics.
  - Marketing: conversion pixels (FB, Google), retargeting.
- `[26.C.1.2]` 3 botones: "Aceptar todas", "Solo esenciales", "Personalizar" (abre modal detallado por cookie).
- `[26.C.1.3]` Cookie `dmx_cookie_consent=v1:essential=1:analytics=0:marketing=0` + row `privacy_consents` 3 types.
- `[26.C.1.4]` Hasta que user elige → PostHog NO inicializa, pixels NO cargan.
- `[26.C.1.5]` Link footer "Preferencias de cookies" reabre banner.

**Criterio de done del módulo:**
- [ ] Banner no bloquea UX crítico.
- [ ] Analytics OFF → PostHog no trackea.

#### MÓDULO 26.C.2 — Cookie registry

**Pasos:**
- `[26.C.2.1]` Tabla `cookie_registry` (name, category, purpose, provider, expiry, description_es, description_pt).
- `[26.C.2.2]` Seed con ~15 cookies/localStorage/sessionStorage items DMX: `sb-access-token`, `sb-refresh-token`, `dmx_locale`, `dmx_country`, `posthog_*`, `_ga`, etc.
- `[26.C.2.3]` UI admin `/admin/cookies` gestiona registry + auto-scan script detecta nuevas cookies para review.

**Criterio de done del módulo:**
- [ ] Banner muestra 15 cookies con categoría + purpose.

### BLOQUE 26.D — Data retention policies

#### MÓDULO 26.D.1 — Retention schedule

**Pasos:**
- `[26.D.1.1]` Documentar en `docs/05_OPERACIONAL/05.6_DATA_RETENTION_POLICY.md` (extensa; aquí referenciamos). Principales:
  - `logs` (pino, Vercel): 90 días, auto-purge.
  - `audit_log`: 7 años (AML/KYC/regulatory).
  - `session_replays` (PostHog): 30 días.
  - `api_request_logs`: 90 días.
  - `webhook_logs`: 180 días.
  - `notificaciones`: 18 meses post-sent.
  - `privacy_consents`: vigente + 7 años post-cancel.
  - PII `profiles` (soft delete): 30 días gracia → hard delete (salvo legal hold).
  - `documents` firmados: 10 años (regulación fiscal/legal MX).
  - `commission_payments`, `billing_history`: 10 años.
  - `operaciones` cerradas: 10 años.
  - `contactos` (CRM): mientras relación activa; 5 años post-inactivity.
- `[26.D.1.2]` Crons de purge:
  - `purge_logs_90d` daily.
  - `purge_session_replays_30d` daily.
  - `purge_notificaciones_18mo` weekly.
  - `purge_expired_soft_deletes` daily procesa profiles status='pending_deletion' AND deletion_scheduled_for < now() → hard delete cascada.
- `[26.D.1.3]` Legal hold: tabla `legal_holds` (user_id, reason, set_by, set_at, released_at) bloquea purge si active.

**Criterio de done del módulo:**
- [ ] 4 crons registrados en `vercel.json` con schedules.
- [ ] Runbook publicado.

### BLOQUE 26.E — Audit log completo

#### MÓDULO 26.E.1 — Extensión `audit_log`

**Pasos:**
- `[26.E.1.1]` Schema extendido:
  ```sql
  CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    actor_type TEXT CHECK (actor_type IN ('user','admin','system','cron','api_key','webhook')),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_values JSONB,
    new_values JSONB,
    diff JSONB,
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,
    country_code TEXT,
    severity TEXT CHECK (severity IN ('info','notice','warning','critical')) DEFAULT 'info',
    prev_hash TEXT, -- hash of prev row (tamper-evident chain)
    row_hash TEXT, -- hash(prev_hash + row data)
    created_at TIMESTAMPTZ DEFAULT now()
  ) PARTITION BY RANGE (created_at);
  ```
- `[26.E.1.2]` Trigger `before insert` compute `row_hash = sha256(prev_hash || concat_all_columns)` para cadena tamper-evident.
- `[26.E.1.3]` Verificación periódica: cron `audit_integrity_check` recalcula hash chain → alert si broken.
- `[26.E.1.4]` Eventos capturados (obligatorios):
  - Auth: login, logout, password_reset, mfa_enabled, mfa_disabled, role_changed.
  - Profile: PII updates, docs uploaded/verified.
  - Operaciones: create, status_change, commission_paid, cancelled.
  - Pagos: payment_succeeded, payment_refunded.
  - Admin actions: every action in /admin/* logged.
  - Privacy: consent granted, consent revoked, arco_request submitted/resolved.
  - Data access: sensitive reads (quien vió RFC de quién) via query Supabase log + sampling.
  - Features gating: denied decisions (para disputas billing).

**Criterio de done del módulo:**
- [ ] 20+ types de eventos capturados.
- [ ] Hash chain verificable + integrity cron green.

#### MÓDULO 26.E.2 — UI `/admin/audit`

**Pasos:**
- `[26.E.2.1]` Tabla paginada con filtros: user_id, action, entity_type, date range, severity.
- `[26.E.2.2]` Export CSV para inquiries legales + auditor externo.
- `[26.E.2.3]` Diff viewer expandible per row (old vs new values).

**Criterio de done del módulo:**
- [ ] Admin encuentra rápido "¿quién cambió precio cierre op X?".

### BLOQUE 26.F — Data export (GDPR-lite MX/BR/LATAM)

#### MÓDULO 26.F.1 — Endpoint export

**Pasos:**
- `[26.F.1.1]` tRPC `privacy.requestDataExport` crea job:
  - Query todas tablas donde user aparece (profiles, contactos, busquedas, operaciones, messages, notificaciones, privacy_consents, audit_log own, billing_history, gamification, etc.).
  - Bundle: `export_{user_id}_{ts}.zip` con JSON por tabla + PDF resumen legible.
  - Sube a Storage bucket `data-exports-user` signed URL 7 días expiry.
- `[26.F.1.2]` Async via queue: email notif cuando listo.
- `[26.F.1.3]` Rate limit 1 export/user/30días.
- `[26.F.1.4]` Datos encriptados con password del user (derivado) → evitar leakage bucket.

**Criterio de done del módulo:**
- [ ] User requests export → email con link en <30min.
- [ ] ZIP contains JSON + PDF + README explicando schemas.

### BLOQUE 26.G — Account deletion flow

#### MÓDULO 26.G.1 — Soft delete + gracia 30 días

**Pasos:**
- `[26.G.1.1]` UI `/settings/delete-account` con warning + confirm password + checkbox "Entiendo que pierdo acceso + datos en 30 días".
- `[26.G.1.2]` Backend:
  1. Set `profiles.status='pending_deletion'`, `profiles.deletion_scheduled_for=now()+interval '30 days'`.
  2. Logout + revoke all sessions + API keys.
  3. Anonimizar profile PII (nombre=`Usuario eliminado`, email=`deleted-{id}@dmx.deleted`, phone=NULL) manteniendo foreign keys.
  4. Cancelar subscriptions activas prorrateando remanente.
  5. Notif admin.
- `[26.G.1.3]` UI login muestra "Cuenta programada para eliminación" + opción restore dentro de 30 días (revert).
- `[26.G.1.4]` Cron `process_scheduled_deletions` diario → hard delete cuando `deletion_scheduled_for <= now()` AND no legal_hold.

**Criterio de done del módulo:**
- [ ] Flow completo testeado.
- [ ] Restore dentro 30 días funciona.
- [ ] Hard delete día 31 cascada correctamente.

#### MÓDULO 26.G.2 — Hard delete cascada

**Pasos:**
- `[26.G.2.1]` Lista tablas con CASCADE ON DELETE apropiado (Fase 01 + 26 revisión).
- `[26.G.2.2]` Tablas con retención legal (audit_log, documents firmados, billing_history) mantener con `user_id` anonimized a `null` o pseudo UUID constante.
- `[26.G.2.3]` Supabase Storage: delete own uploads (avatar, docs personales).
- `[26.G.2.4]` Stripe: delete customer o retain per regulations (Stripe guarda 7 años default).
- `[26.G.2.5]` Final audit log entry: `entity_type='profile', action='hard_delete'`.

**Criterio de done del módulo:**
- [ ] Hard delete limpia PII pero respeta legal hold.

### BLOQUE 26.H — Legal docs (T&Cs + Privacy Policy + Cookie Policy)

#### MÓDULO 26.H.1 — Versioned documents

**Pasos:**
- `[26.H.1.1]` Tabla `legal_documents` (id, slug CHECK IN ('tos','privacy','cookies','aml_kyc_notice'), version semver, effective_at, published BOOLEAN, content_md TEXT, locale, country_code, requires_reconsent BOOLEAN).
- `[26.H.1.2]` Rutas `/terms`, `/privacy`, `/cookies` renderizan markdown + versión + fecha.
- `[26.H.1.3]` UI admin `/admin/legal` para publish new version (update requires_reconsent → trigger notif users para re-aceptar).
- `[26.H.1.4]` Diff viewer para mostrar cambios entre versiones.

**Criterio de done del módulo:**
- [ ] Publish v1.1 → users ven modal re-consent al login.

#### MÓDULO 26.H.2 — Cláusulas críticas

**Pasos:**
- `[26.H.2.1]` T&C sección "Alcance del servicio": "DesarrollosMX es una plataforma de infraestructura y datos. **NO somos responsables** del servicio post-venta de bienes raíces, de la calidad de construcción, entrega, vicios ocultos, o cualquier reclamación relacionada con la propiedad adquirida. El comprador debe tratar directamente con el desarrollador. DMX facilita la conexión pero no es parte de la relación comercial de compraventa."
- `[26.H.2.2]` T&C sección "Exención de responsabilidad IE": los scores e índices son herramientas de referencia, no asesoría financiera ni garantía. Disclaimer explícito.
- `[26.H.2.3]` T&C "Uso IA": contenidos generados por IA marcados como tal; user responsable de verificar.
- `[26.H.2.4]` T&C jurisdicción: México (CDMX). Multi-country overrides per country_code.
- `[26.H.2.5]` Copy en `/legal/disclaimers.md` repetido en UI:
  - Página proyecto: badge "Infraestructura DMX · Desarrollador responsable del proyecto".
  - Checkout operación: modal obligatorio "Entiendo que DMX no es responsable de..."—checkbox require.
  - Escrow release: email "DMX ha liberado fondos. La relación post-venta es con [Desarrollador X]".
  - Footer global: "DMX es infraestructura · Desarrolladores independientes responsables de sus proyectos".

**Criterio de done del módulo:**
- [ ] Disclaimer aparece en 4+ superficies (checkout, project page, escrow email, footer).
- [ ] Revisión legal aprobada con firma timestamp.

### BLOQUE 26.I — AML/KYC records retention

#### MÓDULO 26.I.1 — Segregated storage 5-10 años

**Pasos:**
- `[26.I.1.1]` Bucket Supabase Storage `aml-kyc-evidence` con:
  - Retention: 10 años (UIF MX recomienda hasta 10).
  - Encryption: KMS + client-side GPG adicional.
  - Access: solo service_role + admin role con 2FA + audit per read.
- `[26.I.1.2]` Tabla `aml_kyc_checks` (user_id, check_type enum, result enum, evidence_storage_path, performed_at, performed_by, score, flags jsonb).
- `[26.I.1.3]` Trigger AML flag en operaciones >$200K USD (UIF umbral): crear row + notif compliance officer.
- `[26.I.1.4]` Screening via API proveedor (Refinitiv, Dow Jones, ComplyAdvantage — H2 integration; H1 manual review).
- `[26.I.1.5]` Retention cron NO aplica a este bucket; solo release legal_hold si tras 10 años no regulatory issue.

**Criterio de done del módulo:**
- [ ] Bucket AML con políticas aplicadas.
- [ ] Op >$200K USD → flag creado.

### BLOQUE 26.J — Compliance dashboard

#### MÓDULO 26.J.1 — `/admin/compliance`

**Pasos:**
- `[26.J.1.1]` KPIs: consents gathered this month, ARCO requests pending/resolved SLA, cookie opt-in rate, aml_flags open, legal holds active, retention exceptions.
- `[26.J.1.2]` Alerts: ARCO request aging (>15 días sin resolver → triage red).
- `[26.J.1.3]` Reports export para auditor.

**Criterio de done del módulo:**
- [ ] Dashboard con KPIs actualizados cada día.

## Criterio de done de la FASE

- [ ] Aviso de privacidad MX publicado + 4 equivalents CO/AR/BR/CL + versionados.
- [ ] `privacy_consents` table + granular tracking con IP/UA/version inmutable.
- [ ] ARCO workflow: UI `/privacy/my-data` + admin `/admin/arco` + SLA cron + identity verification.
- [ ] Cookie consent banner 3-categorías + registry 15+ cookies + preferences center link.
- [ ] Data retention schedule + 4 purge crons + legal_holds table.
- [ ] Audit log extendido con hash chain + integrity cron + 20+ event types capturados + partitioned.
- [ ] Data export user JSON+PDF + storage signed 7d + rate limit.
- [ ] Account deletion soft+hard con gracia 30 días + restore + cascada correcta.
- [ ] T&Cs + Privacy + Cookies docs versioned + published + legal review log + re-consent flow.
- [ ] Disclaimers "DMX infraestructura, no responsable post-venta" en 4+ superficies UI + footer + emails.
- [ ] AML/KYC bucket segregado + 10 años retention + flags >$200K + dashboard compliance.
- [ ] Catálogo 03.* cruzado con GDPR-lite map (inventario de datos personales).
- [ ] Tag git `fase-26-complete`.

## Próxima fase

FASE 27 — Testing + QA (Vitest + Playwright + msw + RLS tests + CI).

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent F) | **Fecha:** 2026-04-17
