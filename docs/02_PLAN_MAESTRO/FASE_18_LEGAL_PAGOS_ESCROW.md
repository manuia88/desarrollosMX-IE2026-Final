# FASE 18 — Legal + Pagos + Escrow (Mifiel + Stripe Connect + Apartado + Split Payments + Pre-aprobación Crediticia)

> **Duración estimada:** 7 sesiones Claude Code (~28 horas con agentes paralelos)
> **Dependencias:** FASE 01 (schema base), FASE 02 (auth + RLS + MFA), FASE 05 (multi-country — MercadoPago + Wompi), FASE 06 (Vault + webhooks signed), FASE 14 (M07 Operaciones wire base), FASE 16 (CFDI auto post-pago), FASE 17 (document jobs approved = contratos listos para firma).
> **Bloqueantes externos:**
> - **Stripe MX cuenta activa** + Stripe Connect enabled: requiere contrato MSA + validación KYC Stripe. 2-3 semanas.
> - **MercadoPago** cuenta activa LATAM (MX, CO, AR, BR, CL) con API credentials Marketplace enabled.
> - **Wompi CO** cuenta activa (para Colombia refuerzo).
> - **Mifiel** cuenta activa (firma electrónica NOM-151 MX): plan empresarial — 2-3 semanas aprobación.
> - **DocuSign** fallback (países sin Mifiel): API key + Integration Key.
> - **Partnerships bancos pre-aprobación** (NEGOCIACIÓN MANU):
>   - BBVA Open Banking API.
>   - Santander Open Finance.
>   - Kueski partner agreement.
>   - Creditas partner agreement.
>   Cada banco ~6-8 semanas negociación + legal.
> - **Vercel env vars**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_CLIENT_ID`, `MIFIEL_API_ID`, `MIFIEL_API_SECRET`, `MERCADOPAGO_ACCESS_TOKEN`, `WOMPI_PRIVATE_KEY`, `DOCUSIGN_INTEGRATION_KEY`.
> **Resultado esperado:** Flow /legal por operación end-to-end: Sin subir → En revisión → Aprobado/Rechazado → Contrato enviado (Mifiel o DocuSign) → Contrato firmado (audit). Apartado escrow real: comprador deposita 1-5% via Stripe Connect → held hasta closing milestone → release tras confirmación dual dev+comprador. Escrow release rules cerradas (ADR-008): milestone-based con disputa escalation. Split payments automáticos al cierre: % dev / % asesor / % DMX. Pre-aprobación crediticia express widget comprador consumes 4 partner APIs. Webhook handlers signed (Stripe signature verification). Refund + dispute workflow. Cron `payment_reminders` (-7/-3/0). Multi-país: MercadoPago LATAM + Wompi CO. Tag `fase-18-complete`.
> **Priority:** [H1]

## Contexto y objetivo

DMX no existe sin esta fase: acá se cierra el ciclo del dinero (escrow + split) y del legal (firma + NOM-151). Es también la fase más regulada (SAT + CNBV + NOM-151 + UIF). La decisión ADR-008 define: DMX es infraestructura, **no es responsable post-venta**. Los escrow releases son mecánicos (milestones triggers), no subjetivos. Si hay disputa, se escala a tribunal/UIF, no a soporte DMX. Este disclaimer debe visibilizarse en el comprador (Fase 20 T&Cs) y en el dev (Fase 15 onboarding).

Crítico:
- Mifiel vs DocuSign: Mifiel es NOM-151 compliance MX (certificación temporal + fingerprint SHA-256 + audit trail legalmente válido en juicio MX). DocuSign es fallback para otros países.
- Stripe Connect tipo "Express" o "Custom" para devs/asesores. Decisión técnica: usar **Custom** para control total (branding DMX) a costo de más compliance.
- Split payments vía Stripe `transfer_data.destination` + `application_fee_amount` DMX.
- Escrow: depositos held en Stripe Connected Account de DMX (intermediary) hasta release.
- Pre-aprobación crediticia: 4 bancos = 4 adapters. Algunos síncrono (Kueski ~5s), otros async (BBVA async webhook ~1-3d).

## Bloques

### BLOQUE 18.A — Schema legal + contracts + signatures

#### MÓDULO 18.A.1 — Tablas base

**Pasos:**
- `[18.A.1.1]` Migration `create_legal_schema`:
  ```sql
  CREATE TABLE contracts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id uuid NOT NULL REFERENCES operaciones(id),
    contract_type TEXT CHECK (contract_type IN ('apartado','compraventa','promesa_cv','escritura','pagare','adendum','cesion')),
    template_id uuid REFERENCES contract_templates(id),
    country_code TEXT NOT NULL DEFAULT 'MX',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
      'draft','under_review','approved','rejected','sent_for_signature',
      'partially_signed','fully_signed','cancelled','expired'
    )),
    pdf_path TEXT,
    pdf_hash_sha256 TEXT,
    rendered_html TEXT,
    signed_pdf_path TEXT,
    required_signers JSONB, -- array {role: 'comprador'|'dev'|'asesor'|'notario', email, phone, name}
    sent_for_signature_at TIMESTAMPTZ,
    fully_signed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    provider TEXT CHECK (provider IN ('mifiel','docusign','manual')),
    provider_doc_id TEXT,
    created_by uuid REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX idx_contracts_operation ON contracts(operation_id);
  CREATE INDEX idx_contracts_status ON contracts(status) WHERE status IN ('draft','sent_for_signature','partially_signed');
  ```
- `[18.A.1.2]` Tabla `contract_templates` (plantillas reutilizables):
  ```sql
  CREATE TABLE contract_templates (
    id uuid PRIMARY KEY,
    name TEXT NOT NULL,
    contract_type TEXT,
    country_code TEXT,
    developer_entity_id uuid REFERENCES developer_entities(id), -- null = global
    html_template TEXT NOT NULL, -- Handlebars placeholders {{comprador.nombre}}, {{unidad.precio}}
    variables_schema JSONB,
    version INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- `[18.A.1.3]` Tabla `signature_requests`:
  ```sql
  CREATE TABLE signature_requests (
    id uuid PRIMARY KEY,
    contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    signer_role TEXT,
    signer_name TEXT,
    signer_email TEXT,
    signer_phone TEXT,
    signer_rfc TEXT,
    status TEXT CHECK (status IN ('pending','sent','viewed','signed','rejected','expired')),
    signed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    ip_address INET,
    user_agent TEXT,
    geolocation JSONB,
    otp_method TEXT CHECK (otp_method IN ('sms','whatsapp','email')),
    provider_signer_id TEXT,
    signature_evidence JSONB -- { hash_sha256, cert_fingerprint, nom151_timestamp }
  );
  ```
- `[18.A.1.4]` Tabla `contract_versions` (versioning):
  ```sql
  CREATE TABLE contract_versions (
    id uuid PRIMARY KEY,
    contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    version_num INT NOT NULL,
    pdf_path TEXT,
    pdf_hash_sha256 TEXT,
    changes_summary TEXT,
    created_by uuid,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- `[18.A.1.5]` Tabla `signature_events` (audit):
  ```sql
  CREATE TABLE signature_events (
    id uuid PRIMARY KEY,
    signature_request_id uuid,
    contract_id uuid,
    event_type TEXT, -- 'created','sent','opened','otp_sent','otp_verified','signed','rejected','expired','downloaded'
    payload JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- `[18.A.1.6]` RLS: operation stakeholders (asesor, comprador, dev) ven sus contracts. Admin/superadmin all.

**Criterio de done del módulo:**
- [ ] Migration aplica.
- [ ] Trigger log a signature_events inserta en cada cambio de status.
- [ ] Seed 5 contract_templates MX (apartado, promesa, compraventa, adendum, cesion).

### BLOQUE 18.B — Mifiel integration (MX primary)

#### MÓDULO 18.B.1 — Adapter Mifiel

**Pasos:**
- `[18.B.1.1]` `shared/lib/signatures/mifiel/client.ts` wrapper Mifiel SDK `@mifiel/js-client` o REST direct.
- `[18.B.1.2]` Método `createDocument(pdfBuffer, signers, options)`:
  ```ts
  const doc = await mifiel.documents.create({
    file: pdfBuffer,
    signatories: signers.map(s => ({ 
      name: s.name, 
      email: s.email, 
      tax_id: s.rfc, 
      otp: true,
      otp_method: 'sms'
    })),
    send_invites: true,
    days_to_expire: 30,
    external_id: contractId
  });
  return { docId: doc.id, hash_sha256: doc.original_hash };
  ```
- `[18.B.1.3]` Método `getDocumentStatus(mifielDocId)` retorna status + signers con timestamps.
- `[18.B.1.4]` Método `downloadSignedPdf(mifielDocId)` → buffer con NOM-151 certificación embedded.
- `[18.B.1.5]` Método `cancelDocument(mifielDocId)` para cancel antes de firma.
- `[18.B.1.6]` Webhook endpoint `/api/webhooks/mifiel` con signature verification (HMAC):
  - Events: `document.signed`, `document.viewed`, `document.rejected`, `document.expired`.
  - Update `signature_requests.status`, emit `signature_events`, si all signers done → update `contracts.status='fully_signed'` + download signed PDF + persist hash.

**Criterio de done del módulo:**
- [ ] createDocument test produce Mifiel doc ID.
- [ ] Webhook recibe y procesa event firmado.
- [ ] Signed PDF descargado + hash verificable.

#### MÓDULO 18.B.2 — OTP via SMS / WhatsApp

**Pasos:**
- `[18.B.2.1]` Config per template: `otp_method` (default sms, option whatsapp).
- `[18.B.2.2]` Mifiel internamente envía OTP; fallback manual si needed via Twilio.
- `[18.B.2.3]` UI comprador al firmar: widget iframe Mifiel o custom `<MifielSignFlow>` wrapper.
- `[18.B.2.4]` Audit: ip_address + user_agent + geolocation (si permiso) en signature_events.

**Criterio de done del módulo:**
- [ ] Test OTP SMS entrega en <30s.
- [ ] Geolocation opcional se registra si consent.

### BLOQUE 18.C — DocuSign fallback

#### MÓDULO 18.C.1 — Adapter DocuSign

**Pasos:**
- `[18.C.1.1]` `shared/lib/signatures/docusign/client.ts` wrapper DocuSign eSign REST API v2.1.
- `[18.C.1.2]` Auth JWT con Integration Key + RSA private key (Vault).
- `[18.C.1.3]` Método `createEnvelope(pdfBuffer, signers)` crea envelope DocuSign.
- `[18.C.1.4]` Webhook `/api/webhooks/docusign` con HMAC verification.
- `[18.C.1.5]` Factory `getSignatureProvider(country_code)`: MX → Mifiel, CO/AR/BR/CL → DocuSign (ajustable per dev config).

**Criterio de done del módulo:**
- [ ] Envelope creado en sandbox DocuSign.
- [ ] Webhook procesa completed event.

### BLOQUE 18.D — Flow /legal por operación

#### MÓDULO 18.D.1 — Página /legal

**Pasos:**
- `[18.D.1.1]` Ruta `/operaciones/[id]/legal/page.tsx` (en portal asesor Y portal comprador con vistas distintas).
- `[18.D.1.2]` Timeline visual estados:
  - **Sin subir** (gris): falta upload template o generación.
  - **En revisión** (amarillo): dev legal review pendiente.
  - **Aprobado** (verde): dev aprobó + asesor ok.
  - **Rechazado** (rojo): motivo explícito.
  - **Contrato enviado** (azul): Mifiel/DocuSign awaiting signatures.
  - **Contrato firmado** (verde sólido): all signers done, audit trail visible.
- `[18.D.1.3]` Section "Generar contrato": selector template + preview variables extraídas de operación + botón "Generar PDF" renderiza con Handlebars → stores pdf_path.
- `[18.D.1.4]` Section "Revisión dev" (solo visible al dev): UI aprobar/rechazar con comentarios.
- `[18.D.1.5]` Section "Enviar a firma": CTA que invoca `mifiel.createDocument` o `docusign.createEnvelope` según country_code.
- `[18.D.1.6]` Section "Audit timeline": lista `signature_events` con iconos + timestamps + actors.
- `[18.D.1.7]` Section "Documento firmado": descarga signed PDF + verificador de hash (user pega hash externo → valida contra `pdf_hash_sha256`).

**Criterio de done del módulo:**
- [ ] Crear contrato template desde operación → genera PDF preview.
- [ ] Flow full hasta firmado en sandbox Mifiel.

### BLOQUE 18.E — Stripe Connect + Split Payments

#### MÓDULO 18.E.1 — Onboarding Stripe Connect

**Pasos:**
- `[18.E.1.1]` Para cada dev y asesor: Custom Connect account creation via `stripe.accounts.create({ type: 'custom', country: 'MX', capabilities: { transfers: { requested: true }, card_payments: { requested: true } } })`.
- `[18.E.1.2]` UI onboarding `/settings/payouts` con Stripe `account_links` flow embedded: user completa KYC bank info.
- `[18.E.1.3]` Persiste `stripe_account_id` en `profiles.stripe_account_id` (o `developer_entities.stripe_account_id` para devs con múltiples RFCs).
- `[18.E.1.4]` Webhook `/api/webhooks/stripe/connect` maneja `account.updated` para track status KYC.
- `[18.E.1.5]` Sin Connect account completo → bloquear recibo de payouts (warning UI).

**Criterio de done del módulo:**
- [ ] Account Connect test creado con KYC completado.
- [ ] status `payouts_enabled=true` después de onboarding.

#### MÓDULO 18.E.2 — Split payment al cierre

**Pasos:**
- `[18.E.2.1]` Cuando `operaciones.status='cerrada'` y pago final recibido: trigger emite `SplitPaymentExecute` job.
- `[18.E.2.2]` Cálculo split transparente (UI también):
  - Dev: 95% (ejemplo — configurable per project via `projects.split_dev_pct`).
  - Asesor: 4% (comisión — `project_brokers.commission_pct`).
  - DMX fee: 1% (fee plataforma — config global).
- `[18.E.2.3]` Stripe `paymentIntent.create` con `transfer_group: operation_id` + múltiples transfers:
  ```ts
  await stripe.paymentIntents.create({
    amount: total,
    currency: 'mxn',
    transfer_group: operationId
  });
  // Post-success:
  await stripe.transfers.create({ amount: devAmount, destination: devAccount.id, transfer_group: operationId });
  await stripe.transfers.create({ amount: asesorAmount, destination: asesorAccount.id, transfer_group: operationId });
  // DMX fee stays in platform account
  ```
- `[18.E.2.4]` Minus holdback amounts si aplica (Fase 16 holdback policy).
- `[18.E.2.5]` UI transparencia: card "Cómo se divide tu pago" visible a los 3 stakeholders con breakdown.

**Criterio de done del módulo:**
- [ ] Split 95/4/1 ejecuta correctamente en sandbox.
- [ ] Holdback minus funciona si aplica.

### BLOQUE 18.F — Apartado escrow

#### MÓDULO 18.F.1 — Schema + flow apartado

**Pasos:**
- `[18.F.1.1]` Schema:
  ```sql
  CREATE TABLE escrow_deposits (
    id uuid PRIMARY KEY,
    operation_id uuid NOT NULL REFERENCES operaciones(id),
    buyer_id uuid NOT NULL REFERENCES profiles(id),
    amount NUMERIC(18,2) NOT NULL,
    currency TEXT DEFAULT 'MXN',
    pct_of_unit NUMERIC(5,2), -- 1-5%
    stripe_payment_intent_id TEXT,
    status TEXT CHECK (status IN ('pending','held','released','refunded','disputed','escalated')),
    held_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    release_trigger TEXT, -- 'entrega_confirmada','comprador_signoff','auto_14d'
    dispute_opened_at TIMESTAMPTZ,
    dispute_resolution TEXT,
    refunded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- `[18.F.1.2]` Flow comprador apartado:
  - UI `/comprador/apartar/[unit_id]` muestra unidad + % apartado (default 3%) + amount MXN.
  - Confirm → Stripe Checkout session con capture_method='manual' (authorizes, no charges).
  - On success: `paymentIntent.capture` → funds held on DMX platform account.
  - Create `escrow_deposits` record `status='held'`.
  - `operaciones.status='apartada'` + unit_id lock.
  - Notif al dev "Unidad X apartada por comprador Y".
- `[18.F.1.3]` UI comprador panel: ver apartados activos con status + días restantes + milestone esperado.

**Criterio de done del módulo:**
- [ ] Apartado test crea `escrow_deposits` en `held`.
- [ ] Unit lock impide otros compradores.

#### MÓDULO 18.F.2 — Escrow release rules (ADR-008 cerrado duro)

**Pasos:**
- `[18.F.2.1]` Trigger release automático al cumplir milestone:
  - **`entrega_confirmada`**: dev confirma entrega en M07 Operaciones + comprador sign-off via UI "Confirmo recepción" → release full amount al dev.
  - **`rechazo_valido_por_dev`**: dev rechaza comprador con evidencia (proof upload) dentro de 14d → reversal (refund buyer).
  - **`disputa_abierta_>14d`**: comprador disputa y dev no responde en 14d → escalation a tribunal/UIF (admin manual).
  - **`auto_14d_sin_disputa`**: si entrega ocurre y 14d sin disputa → auto-release.
- `[18.F.2.2]` Cron `escrow_release_worker` diario 4am evalúa condiciones + ejecuta Stripe transfers.
- `[18.F.2.3]` Para release: `stripe.transfers.create({ amount, destination: devAccount, transfer_group: operationId })` + update status='released'.
- `[18.F.2.4]` Para refund: `stripe.refunds.create({ payment_intent, reason: 'requested_by_customer' })` + status='refunded'.
- `[18.F.2.5]` Para escalation: status='escalated', notif compliance admin + lock case.

**Criterio de done del módulo:**
- [ ] Dev confirma entrega → release ejecuta en <5 min.
- [ ] Dispute escalation triggers admin notif.
- [ ] Audit log completo.

### BLOQUE 18.G — Pre-aprobación crediticia express

#### MÓDULO 18.G.1 — Schema + adapters partners

**Pasos:**
- `[18.G.1.1]` Schema:
  ```sql
  CREATE TABLE credit_preapprovals (
    id uuid PRIMARY KEY,
    buyer_id uuid NOT NULL REFERENCES profiles(id),
    partner TEXT CHECK (partner IN ('bbva','santander','kueski','creditas','infonavit_calc')),
    requested_amount NUMERIC(18,2),
    unit_id uuid REFERENCES unidades(id),
    status TEXT CHECK (status IN ('requested','in_review','approved','denied','expired','used')),
    approved_amount NUMERIC(18,2),
    interest_rate_yearly NUMERIC(6,3),
    term_months INT,
    monthly_payment NUMERIC(18,2),
    partner_reference_id TEXT,
    consent_given_at TIMESTAMPTZ,
    buro_score INT,
    approved_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    raw_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- `[18.G.1.2]` `shared/lib/credit/adapters/bbva.ts`: API BBVA Open Banking call with OAuth2 client_credentials + consent flow + async score request with webhook callback.
- `[18.G.1.3]` `shared/lib/credit/adapters/santander.ts`: Santander Open Finance similar async flow.
- `[18.G.1.4]` `shared/lib/credit/adapters/kueski.ts`: síncrono ~5s — input CURP+RFC → retorna approved_amount + rate.
- `[18.G.1.5]` `shared/lib/credit/adapters/creditas.ts`: híbrido — rápido pre-score luego async validation.
- `[18.G.1.6]` `shared/lib/credit/adapters/infonavit-calc.ts`: calculator local usando H11 Infonavit Score (IE2 §9.1) — sin API externa, solo math.

**Criterio de done del módulo:**
- [ ] 4 adapters con interface común.
- [ ] Kueski síncrono devuelve pre-aprobación en test.
- [ ] BBVA async webhook flow funcional.

#### MÓDULO 18.G.2 — Consent + UI widget

**Pasos:**
- `[18.G.2.1]` Widget `<PreApprovalCheck>` en dashboard comprador (Fase 20 consumirá):
  - Paso 1: "Necesitamos tu consentimiento para consultar burós". Toggle explicit consent + Terms.
  - Paso 2: Inputs CURP + RFC + ingreso mensual + tipo trabajo.
  - Paso 3: Monto deseado + plazo.
  - Paso 4: "Consultar en 4 bancos" botón.
- `[18.G.2.2]` Paralelo llama 4 adapters → agrega resultados en real-time con loading skeletons.
- `[18.G.2.3]` Tabla comparativa resultante: Banco | Monto aprobado | Tasa anual | Plazo | Mensualidad | Expiración.
- `[18.G.2.4]` Si aplica: CTA "Usar pre-aprobación en este proyecto" link al match concreto.
- `[18.G.2.5]` Retención consent evidence para audit legal (LFPDPPP compliance).

**Criterio de done del módulo:**
- [ ] Widget completa flow 4 bancos en <15s (algunos síncronos).
- [ ] Async results via webhook update UI.

### BLOQUE 18.H — Facturas automáticas post-pago

#### MÓDULO 18.H.1 — Integración Fase 16

**Pasos:**
- `[18.H.1.1]` Cuando escrow release o pago final completed: trigger `emit_cfdi_job` → Fase 16 cron `invoice_worker` emite CFDI automáticamente.
- `[18.H.1.2]` Email factura PDF + XML al comprador (via Resend).
- `[18.H.1.3]` Si falla: escalation al dev con CTA "Emitir factura manual".
- `[18.H.1.4]` Countries sin CFDI → emission equivalente per adapter Fase 16 (DIAN CO, AFIP AR, etc.).

**Criterio de done del módulo:**
- [ ] Release escrow → CFDI emitido en <2 min.
- [ ] Comprador recibe email con XML+PDF.

### BLOQUE 18.I — Multi-país MercadoPago + Wompi

#### MÓDULO 18.I.1 — Adapters LATAM

**Pasos:**
- `[18.I.1.1]` `shared/lib/payments/adapters/mercadopago.ts`: LATAM (MX, CO, AR, BR, CL) — Checkout Preferences + Marketplace Split API.
- `[18.I.1.2]` `shared/lib/payments/adapters/wompi.ts`: Colombia refuerzo si dev prefiere sobre MP.
- `[18.I.1.3]` Factory `getPaymentProvider(country_code, preference)`: MX default Stripe, CO default MP/Wompi, AR/BR/CL MercadoPago.
- `[18.I.1.4]` Webhook handlers per provider `/api/webhooks/mercadopago` + `/api/webhooks/wompi` with signature verification.
- `[18.I.1.5]` UI unified: botón "Pagar" resuelve provider internamente según context.

**Criterio de done del módulo:**
- [ ] MP sandbox payment CO funciona.
- [ ] Webhook verifica signature correcta.

### BLOQUE 18.J — Webhook handlers signed

#### MÓDULO 18.J.1 — Signature verification obligatoria

**Pasos:**
- `[18.J.1.1]` Middleware `verifyWebhookSignature(provider)` en cada endpoint:
  - Stripe: `stripe.webhooks.constructEvent(payload, sig, secret)`.
  - Mifiel: HMAC-SHA256 con secret del provider.
  - DocuSign: HMAC with secret.
  - MercadoPago: x-signature header validation.
  - Wompi: x-integrity-signature.
- `[18.J.1.2]` Rate limiting per webhook endpoint: 100 req/min per source IP.
- `[18.J.1.3]` Idempotency keys: dedup events ya procesados (cache `webhook_events_processed`).
- `[18.J.1.4]` Retry queue si processing falla: 3 retries exponential backoff, luego DLQ + alert.
- `[18.J.1.5]` Audit log todos webhook events en `webhook_logs` (tabla existente).

**Criterio de done del módulo:**
- [ ] Signature inválida → 401.
- [ ] Dedup: mismo event ID 2x → second skip.

### BLOQUE 18.K — Refund policy + dispute workflow

#### MÓDULO 18.K.1 — Refund flow

**Pasos:**
- `[18.K.1.1]` UI admin `/admin/refunds/[operation]` con review form: razón, monto (full/partial), método.
- `[18.K.1.2]` Executes `stripe.refunds.create` + update operacion + emit NC CFDI Fase 16.
- `[18.K.1.3]` Notif al comprador + dev.
- `[18.K.1.4]` Audit log + email al CEO si refund >$100K MXN.

**Criterio de done del módulo:**
- [ ] Refund partial funciona.
- [ ] NC emitida correctamente.

#### MÓDULO 18.K.2 — Dispute workflow

**Pasos:**
- `[18.K.2.1]` Schema `disputes` (id, operation_id, opened_by, type, description, status, resolution).
- `[18.K.2.2]` Flow:
  - Comprador abre dispute desde portal → status='open' + freeze escrow.
  - Dev responde con evidencia upload (contra-argumento).
  - Admin review 14d SLA → resolución (release_to_dev | refund_buyer | split).
  - Si 14d sin resolución → escalation externa (tribunal, UIF, PROFECO).
- `[18.K.2.3]` T&Cs compradores (Fase 20) explicit DMX es facilitador, no árbitro.

**Criterio de done del módulo:**
- [ ] Flow completo end-to-end.
- [ ] Timer 14d trigger correcto.

### BLOQUE 18.L — Cron payment_reminders

#### MÓDULO 18.L.1 — Recordatorios vencimientos

**Pasos:**
- `[18.L.1.1]` Cron `payment_reminders` diario 9am:
  - Query: `operaciones` con `payment_plans` schedule + próxima cuota.
  - Lógica: para cada cuota vencimiento en [7d, 3d, 0d] enviar WA template + email:
    - -7d: "Tu cuota X vence en 7 días ($Y MXN). Paga aquí: {pay_link}".
    - -3d: "Recordatorio: vence en 3 días".
    - 0: "Vence hoy. Paga para evitar recargos".
- `[18.L.1.2]` Si pago no recibido +3d → escala a Fase 16 dunning.
- `[18.L.1.3]` Exclusiones: ops con status completed / cancelled.

**Criterio de done del módulo:**
- [ ] Cron ejecuta sin error 3 ciclos.
- [ ] Template WA respeta aprobado Meta.

## Criterio de done de la FASE

- [ ] Schema contracts + signatures + escrow_deposits + credit_preapprovals + disputes creadas.
- [ ] Mifiel adapter + webhook + OTP SMS funcionales (sandbox).
- [ ] DocuSign fallback operativo (sandbox).
- [ ] Flow /legal por operación con 6 estados + timeline audit.
- [ ] Stripe Connect Custom onboarding + KYC.
- [ ] Split payments 95/4/1 ejecutando en sandbox.
- [ ] Escrow deposit + release rules cerradas (milestone-based, ADR-008).
- [ ] Escrow dispute escalation después 14d.
- [ ] 4 credit adapters (BBVA+Santander+Kueski+Creditas) + Infonavit calc.
- [ ] UI pre-approval widget comprador entrega resultados.
- [ ] Consent LFPDPPP log inmutable.
- [ ] Facturas automáticas post-pago (via Fase 16).
- [ ] MercadoPago + Wompi adapters LATAM.
- [ ] Webhook handlers signed + dedup + retry.
- [ ] Refund flow admin-gated.
- [ ] Dispute workflow 14d SLA.
- [ ] Cron payment_reminders (-7/-3/0) envía.
- [ ] Disclaimer "DMX no es responsable post-venta" visible en UI comprador + docs T&Cs.
- [ ] Tests Vitest coverage ≥75% en `features/legal/*` + `features/payments/*`. Playwright e2e: flow apartado → escrow held → entrega confirmed → release + split + CFDI.
- [ ] Tag git `fase-18-complete`.
- [ ] Features entregados: 20 (target §9 briefing).

## Próxima fase

FASE 19 — Portal Admin (17 pages + Market Observatory 7 capas Mapbox + super-admin tools)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent E) | **Fecha:** 2026-04-17
