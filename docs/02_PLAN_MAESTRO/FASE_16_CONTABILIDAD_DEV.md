# FASE 16 — Contabilidad Dev (CFDI 4.0 + SAT + Multi-RFC + Bank Reconciliation + Payouts + Holdback + Dunning + AML/KYC + ESG)

> **Duración estimada:** 8 sesiones Claude Code (~32 horas con agentes paralelos)
> **Dependencias:** FASE 01 (BD base), FASE 02 (Auth + RLS), FASE 05 (Multi-country — tax engines per país), FASE 06 (Seguridad baseline — pgsodium + Vault), FASE 15 (Portal Dev pin Contabilidad — esta fase popula el pin).
> **Bloqueantes externos:**
> - **Cuenta Facturapi.io** activa (o Finkok como fallback): API key test + prod. Requiere contratar plan según volumen (500 CFDIs/mes mínimo).
> - **FIEL** del dev (Certificado `.cer` + Llave privada `.key` + passphrase). Obtenida vía SAT trámite presencial (4-6 semanas).
> - **Cuenta bancaria test** BBVA/Santander/Banorte/HSBC con acceso a descarga OFX/CSV.
> - **UIF MX** registro Sujeto Obligado si Manu decide que DMX es PSF (Persona Sujeta Financiera). Si no, devs reportan por su cuenta pero la app genera reporte.
> - **SAT portal acceso RFC** del dev para validación de complementos (consulta CFDI, status).
> - **Partnerships bancos/SOFOMEs** (opcional MVP) para AML screening automatizado via API (Buró, Círculo, Mixto).
> - **Vercel env vars**: `FACTURAPI_KEY`, `FACTURAPI_WEBHOOK_SECRET`, `SAT_FIEL_CER_VAULT_ID`, `SAT_FIEL_KEY_VAULT_ID`, `BANXICO_TOKEN` (ya existente).
> **Resultado esperado:** M12 Contabilidad Dev 100% funcional. Dev conecta su FIEL + Facturapi → emite CFDI 4.0 para cada operación cerrada → cancela si aplica → complementos Pago/NC/REP/Pagos. Bank reconciliation automática para 4 bancos MX + stubs LATAM. Payout schedule automatizado (cron nocturno). Holdback por milestone de entrega. Dunning por vencimiento factura (WA+email secuencial). AML/KYC screening para ops >$200K USD. ESG básico report (certificaciones proyecto, huella carbono estimada). Multi-país: CFDI MX + Factura DIAN CO + AFIP AR + NFS-e BR + SII CL — stubs wireados. Reportes P&L, balance general, flujo caja, comisiones. Export PDF/XLSX. Tag `fase-16-complete`.
> **Priority:** [H1]

## Contexto y objetivo

La decisión del founder (§2.2 briefing) es contabilidad **full en H1** — no MVP contabilidad. El desarrollador MX vive en un paisaje fiscal complejo: CFDI 4.0 obligatorio, múltiples RFCs por holding+operadoras+fideicomisos, complementos (Pago, Notas de Crédito, REP Recibo Electrónico Pagos), SAT validación, conciliación bancaria manual hoy. DMX **absorbe toda esta complejidad** en un único módulo integrado al flow transaccional: cuando una operación se cierra en M07 del asesor (FASE 14), la factura se emite automáticamente, el payout se programa, la comisión se retiene hasta entrega, y el reporte P&L se actualiza.

## Game-changers integrados en esta fase

| GC | Nombre | Impacto | Bloque/Módulo |
|---|---|---|---|
| GC-56 | Commission + Tax Forecast | Forecast fiscal 3-6 meses (IVA por pagar, retenciones) cruzado con Commission Forecast FASE 14 | Módulo 16.J.3 (nuevo) |

Crítico:
- Multi-RFC por dev (holding + SPVs operadoras por proyecto + fideicomisos): la relación correcta es `developer_entities` (N) per `profile.id`, cada una con su propia FIEL.
- FIEL cifrada en Vault con pgsodium — NUNCA plain text, NUNCA en env vars Vercel largas. Admin acceso solo via procedure con MFA.
- Bank reconciliation parser para 4 bancos MX OFX/CSV con formatos propietarios (BBVA usa CSV pipe, Santander XLSX con encabezados multiline).
- Multi-país: MX es full, demás países stubs con adapters pattern — Fase 23 puede extender.
- DMX es infraestructura, no responsable fiscal: disclaimer en T&Cs (ADR-008). Acá solo mencionar y apuntar a Fase 26 Compliance.

## Bloques

### BLOQUE 16.A — Schema contabilidad multi-RFC

#### MÓDULO 16.A.1 — Tablas core

**Pasos:**
- `[16.A.1.1]` Migration `create_accounting_schema`:
  ```sql
  CREATE TABLE developer_entities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('holding','operadora','fideicomiso','spv','persona_fisica')),
    legal_name TEXT NOT NULL,
    rfc TEXT NOT NULL,
    curp TEXT,
    regimen_fiscal TEXT NOT NULL, -- catálogo SAT c_RegimenFiscal
    domicilio_fiscal_cp TEXT NOT NULL,
    country_code TEXT NOT NULL DEFAULT 'MX' REFERENCES supported_cities(country_code),
    fiel_cer_vault_id TEXT, -- pgsodium key id
    fiel_key_vault_id TEXT,
    fiel_passphrase_vault_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- `[16.A.1.2]` Tabla `chart_of_accounts` con catálogo SAT obligatorio (nivel 1-4):
  ```sql
  CREATE TABLE chart_of_accounts (
    id uuid PRIMARY KEY,
    developer_entity_id uuid NOT NULL REFERENCES developer_entities(id),
    code_agrupador TEXT NOT NULL, -- código SAT 4 dígitos
    account_code TEXT NOT NULL,
    account_name TEXT NOT NULL,
    parent_id uuid REFERENCES chart_of_accounts(id),
    level INT NOT NULL,
    nature TEXT CHECK (nature IN ('debit','credit')),
    is_active BOOLEAN DEFAULT TRUE
  );
  ```
- `[16.A.1.3]` Tabla `journal_entries` (asientos contables):
  ```sql
  CREATE TABLE journal_entries (
    id uuid PRIMARY KEY,
    developer_entity_id uuid NOT NULL,
    entry_number SERIAL,
    entry_date DATE NOT NULL,
    description TEXT,
    total_debit NUMERIC(18,2) NOT NULL,
    total_credit NUMERIC(18,2) NOT NULL,
    reference_type TEXT, -- 'operation','invoice','payment','manual'
    reference_id uuid,
    status TEXT DEFAULT 'posted',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (total_debit = total_credit)
  );
  CREATE TABLE journal_entry_lines (
    id uuid PRIMARY KEY,
    journal_entry_id uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id uuid NOT NULL REFERENCES chart_of_accounts(id),
    debit NUMERIC(18,2) DEFAULT 0,
    credit NUMERIC(18,2) DEFAULT 0,
    description TEXT,
    currency TEXT DEFAULT 'MXN',
    exchange_rate NUMERIC(10,6) DEFAULT 1
  );
  ```
- `[16.A.1.4]` Tabla `invoices` (CFDI 4.0 metadata + payload):
  ```sql
  CREATE TABLE invoices (
    id uuid PRIMARY KEY,
    developer_entity_id uuid NOT NULL,
    operation_id uuid REFERENCES operaciones(id),
    country_code TEXT NOT NULL DEFAULT 'MX',
    invoice_type TEXT CHECK (invoice_type IN ('I','E','T','N','P','R')), -- SAT CFDI types
    serie TEXT, folio INT,
    uuid_fiscal TEXT, -- UUID SAT tras timbrado
    xml_path TEXT, pdf_path TEXT,
    issued_at TIMESTAMPTZ,
    total NUMERIC(18,2) NOT NULL,
    subtotal NUMERIC(18,2),
    iva NUMERIC(18,2),
    currency TEXT DEFAULT 'MXN',
    cancellation_status TEXT, -- null / 'pending' / 'cancelled' / 'rejected'
    cancelled_at TIMESTAMPTZ,
    facturapi_id TEXT, -- ID externo
    status TEXT DEFAULT 'draft' -- draft / issued / cancelled / error
  );
  ```
- `[16.A.1.5]` Tabla `payments`, `payouts`, `payout_schedules`, `holdbacks`:
  ```sql
  CREATE TABLE payments (
    id uuid PRIMARY KEY,
    invoice_id uuid REFERENCES invoices(id),
    operation_id uuid REFERENCES operaciones(id),
    amount NUMERIC(18,2) NOT NULL,
    method TEXT, -- 'spei','stripe','cheque','efectivo','oxxo'
    received_at TIMESTAMPTZ,
    reconciled_at TIMESTAMPTZ,
    bank_transaction_id uuid REFERENCES bank_transactions(id),
    complement_rep_emitted BOOLEAN DEFAULT FALSE
  );
  CREATE TABLE payouts (
    id uuid PRIMARY KEY,
    developer_entity_id uuid,
    recipient_type TEXT, -- 'asesor','broker_company','dmx','dev'
    recipient_id uuid,
    amount NUMERIC(18,2),
    currency TEXT,
    scheduled_for DATE,
    released_at TIMESTAMPTZ,
    status TEXT -- 'scheduled','held','released','cancelled'
  );
  CREATE TABLE holdbacks (
    id uuid PRIMARY KEY,
    payout_id uuid REFERENCES payouts(id),
    operation_id uuid REFERENCES operaciones(id),
    pct_retenido NUMERIC(5,2), -- ej 20
    reason TEXT, -- 'milestone_entrega','garantia_obra','holdout_legal'
    released_at TIMESTAMPTZ,
    released_by uuid REFERENCES profiles(id),
    released_note TEXT
  );
  ```
- `[16.A.1.6]` RLS policies: dev solo ve sus `developer_entities` + children. Admin ve todos. Contador externo (role='contador') ve solo su `developer_entity_id` asignado (nuevo role — Fase 02 amplía enum).

**Criterio de done del módulo:**
- [ ] Migration aplica sin errores.
- [ ] RLS prueba: dev A no ve invoices de dev B.
- [ ] Seed: 3 developer_entities test con chart_of_accounts básico.

#### MÓDULO 16.A.2 — FIEL storage con pgsodium

**Pasos:**
- `[16.A.2.1]` Hab. extension pgsodium (FASE 06) + Vault.
- `[16.A.2.2]` Procedure tRPC `accounting.uploadFiel({ developerEntityId, cerFile, keyFile, passphrase })` con middleware MFA step-up (Fase 06).
- `[16.A.2.3]` Server-side: valida formato `.cer` + `.key` + passphrase abriendo con node-forge, firma un payload de test.
- `[16.A.2.4]` Si válida → pgsodium `crypto_secretbox_open` cifra los 3 con key master → retorna 3 vault_ids → guarda en `developer_entities.fiel_*_vault_id`. Destroy file buffers con `sodium.memzero`.
- `[16.A.2.5]` Acceso para timbrado: función SQL `get_fiel_for_stamping(entity_id)` SECURITY DEFINER con validación `auth.uid()` + `jwt.role IN ('contador','dev','admin')` (fix preventivo SEC-04).
- `[16.A.2.6]` Auto-rotate: notif a dev 30 días antes de expiry FIEL (SAT expiry 4 años).

**Criterio de done del módulo:**
- [ ] Upload FIEL válida persiste en Vault.
- [ ] Intento decrypt sin permiso retorna error.
- [ ] Test expiry date calculada correctamente.

### BLOQUE 16.B — CFDI 4.0 integration vía Facturapi.io

#### MÓDULO 16.B.1 — Adapter Facturapi

**Pasos:**
- `[16.B.1.1]` `shared/lib/accounting/facturapi/client.ts` wrapper de SDK oficial `facturapi` npm. Auth con `FACTURAPI_KEY` env. Modo `test`/`production`.
- `[16.B.1.2]` Método `createInvoice(payload)` con schema Zod:
  ```ts
  const InvoicePayloadSchema = z.object({
    customer: z.object({ legal_name: z.string(), tax_id: z.string(), tax_system: z.string(), zip: z.string() }),
    items: z.array(z.object({ quantity: z.number(), product: z.object({ description: z.string(), product_key: z.string(), price: z.number(), tax_included: z.boolean() }) })),
    payment_form: z.string(), // 03 SPEI, 04 tarjeta, 01 efectivo
    payment_method: z.string(), // PUE / PPD
    use: z.string(), // G01, G03
    series: z.string(), folio_number: z.number().optional()
  });
  ```
- `[16.B.1.3]` Método `cancelInvoice(uuid, motive, substitute_uuid?)`: SAT motivos 01/02/03/04.
- `[16.B.1.4]` Método `getInvoiceStatus(uuid)`: consulta SAT status.
- `[16.B.1.5]` Método `createComplement(parent_invoice_id, type, payload)` para Pago/NC/REP.
- `[16.B.1.6]` Retries exponential backoff (3 intentos) para errores 5xx de Facturapi.
- `[16.B.1.7]` Logging Sentry con fingerprint `facturapi:<method>:<status>`.

**Criterio de done del módulo:**
- [ ] createInvoice test produce UUID válido sandbox Facturapi.
- [ ] cancelInvoice válida respuesta SAT.

#### MÓDULO 16.B.2 — Flow emisión post-cierre operación

**Pasos:**
- `[16.B.2.1]` Trigger BD en `operaciones` AFTER UPDATE WHEN status changes to 'cerrada': inserta job en `invoice_queue`.
- `[16.B.2.2]` Cron `invoice_worker` cada 5 min: toma siguiente job, construye payload (customer=comprador, items=precio_cierre - IVA desglosado, payment_form según pago actual), llama Facturapi, guarda UUID + xml + pdf en Storage `invoices/`.
- `[16.B.2.3]` Si success: crea `journal_entry` contable asiento Ingreso; notif tipo "Factura emitida" al dev + comprador.
- `[16.B.2.4]` Si error: retry 3 veces, luego marca `status='error'` y notif al dev con razón.
- `[16.B.2.5]` UI `/contabilidad/facturas` con tabla: folio, fecha, cliente, total, UUID SAT (con link al XML), status color-coded, acciones (ver PDF, cancelar).

**Criterio de done del módulo:**
- [ ] Operación cerrada test emite CFDI en sandbox.
- [ ] XML validable contra SAT (parse + schema).
- [ ] Journal entry contrapartida cuadrada.

#### MÓDULO 16.B.3 — Complementos

**Pasos:**
- `[16.B.3.1]` Complemento Pago (REP Recibo Electrónico Pagos): cuando `payments` se crea y la factura original era PPD (Pago en Parcialidades Diferido) → emitir REP via `createComplement(invoice_id, 'payment', payload)`.
- `[16.B.3.2]` Nota de Crédito: cuando operación se cancela con devolución → crear NC via `createInvoice({ type: 'E' })` relacionada al CFDI original vía CFDI relacionado (UUID-Rel + tipo 01 Nota de crédito).
- `[16.B.3.3]` Complemento Recibo Electrónico Pagos automático por cada pago parcial.
- `[16.B.3.4]` UI tab "Complementos" en detalle factura con lista de REP/NC + botón "Emitir".

**Criterio de done del módulo:**
- [ ] Pago recibido de factura PPD emite REP automáticamente.
- [ ] NC emitida correctamente vinculada al CFDI origen.

### BLOQUE 16.C — SAT integration con FIEL (directa)

#### MÓDULO 16.C.1 — Consumer SAT WebService

**Pasos:**
- `[16.C.1.1]` `shared/lib/accounting/sat/client.ts` con cliente SOAP para WebService Consulta CFDI SAT.
- `[16.C.1.2]` Método `consultarEstadoCfdi(rfcEmisor, rfcReceptor, total, uuid)` retorna `Estado` (Vigente/Cancelado/No encontrado).
- `[16.C.1.3]` Cron `sat_validation_daily` (3am) re-valida CFDIs emitidos últimos 30 días contra SAT → actualiza `invoices.cancellation_status` si SAT reporta cancelado.
- `[16.C.1.4]` Para cancelación iniciada desde DMX: llamar Facturapi (que internamente habla con SAT usando la FIEL).

**Criterio de done del módulo:**
- [ ] Cron valida 100 CFDIs sandbox en <10min.
- [ ] Estado sincronizado con SAT.

### BLOQUE 16.D — Bank reconciliation (OFX/CSV)

#### MÓDULO 16.D.1 — Parsers por banco

**Pasos:**
- `[16.D.1.1]` `shared/lib/accounting/bank-parsers/bbva.ts`: parser CSV formato BBVA (separador pipe, columnas `Fecha|Concepto|Referencia|Cargo|Abono|Saldo`, header 6 líneas skip).
- `[16.D.1.2]` `shared/lib/accounting/bank-parsers/santander.ts`: parser XLSX via `sheetjs` (encabezado multiline, skip 3 filas, columnas `Fecha Operación|Concepto|Retiros|Depósitos|Saldo`).
- `[16.D.1.3]` `shared/lib/accounting/bank-parsers/banorte.ts`: parser OFX estándar (open financial exchange) via `ofx-js` package.
- `[16.D.1.4]` `shared/lib/accounting/bank-parsers/hsbc.ts`: parser CSV HSBC (comma, quoted strings, fechas DD/MM/YYYY).
- `[16.D.1.5]` Interface común `IBankParser`:
  ```ts
  interface BankTransaction { date: Date; description: string; reference: string; debit: number; credit: number; balance: number; raw: any }
  interface IBankParser { parse(file: File): Promise<BankTransaction[]> }
  ```
- `[16.D.1.6]` Tabla `bank_accounts` (CRUD) + `bank_transactions` (insertadas post-parse) + `bank_statements` (archivo original).

**Criterio de done del módulo:**
- [ ] Parser BBVA pasa test con archivo sample sandbox (reales redacted).
- [ ] 4 parsers con schema común.

#### MÓDULO 16.D.2 — Matching engine

**Pasos:**
- `[16.D.2.1]` Upload UI `/contabilidad/conciliacion` con drop file + selector banco.
- `[16.D.2.2]` Al parsear: matching automático contra `payments` pendientes por (amount exact match ± 0.01) AND (date within ±3 días) AND (reference contains CFDI folio/UUID substring).
- `[16.D.2.3]` Matches alta confianza: auto-reconcile (set `payments.reconciled_at` + `bank_transactions.payment_id`).
- `[16.D.2.4]` Matches baja confianza: UI revisión manual dual-pane (izq=bank_transactions sin match, der=payments pendientes) con drag&drop para match manual.
- `[16.D.2.5]` Bank transactions sin payment candidate → crear pre-payment record para revisión (flag `pending_review`).
- `[16.D.2.6]` KPI superior: % reconciliado mes actual, total desbalance.

**Criterio de done del módulo:**
- [ ] Subir statement BBVA 100 tx auto-reconcilia ≥70%.
- [ ] Manual match funciona.
- [ ] Sin double-match (cada bank_tx matchea 1 payment max).

### BLOQUE 16.E — Payout programs + Holdback

#### MÓDULO 16.E.1 — Payout schedule

**Pasos:**
- `[16.E.1.1]` Config UI `/contabilidad/payout-programs` por dev: frecuencia (semanal/quincenal/mensual), día del mes, threshold mínimo para ejecutar, método (SPEI bank transfer / Stripe Connect).
- `[16.E.1.2]` Cron `payout_schedule_runner` diario 02:00 evalúa: para cada operación cerrada con payments reconciled, calcula comisiones due a (asesor + broker + DMX fee) y crea records en `payouts` con scheduled_for.
- `[16.E.1.3]` Día de pago: cron `payout_execute_daily` toma scheduled_for=today + status='scheduled' → ejecuta transferencia:
  - Stripe Connect: `stripe.transfers.create({ amount, destination: connected_account })` (Fase 18 config Connect).
  - SPEI manual (MVP): genera layout bancario BBVA/Santander para upload en portal banca (admin).
- `[16.E.1.4]` Si holdback aplica (ver 16.E.2), resta holdback_amount del payout.
- `[16.E.1.5]` UI dashboard payouts: calendario de upcoming payouts + history.

**Criterio de done del módulo:**
- [ ] Operación test cerrada genera payout con schedule correcto.
- [ ] Ejecución payout crea journal entry egreso cuadrado.

#### MÓDULO 16.E.2 — Commission holdback rules

**Pasos:**
- `[16.E.2.1]` Tabla `holdback_policies` per dev: `pct_retenido` (default 20%), `release_trigger` (milestone_entrega/avance_75pct/escritura_firmada), `max_days_hold` (default 180).
- `[16.E.2.2]` Al crear payout con operation: si policy aplica, crea `holdbacks` record con pct retenido + deja pago parcial (p.ej. 80% release, 20% held).
- `[16.E.2.3]` Release automático cuando trigger cumple:
  - `milestone_entrega`: `operaciones.status='entregada'` + `operations_timeline` event `unit_delivered`.
  - `avance_75pct`: `avance_obra.overall_pct >= 75`.
  - `escritura_firmada`: `operations_timeline` event `escritura_signed`.
- `[16.E.2.4]` Release manual: admin/dev puede liberar con razón + nota (audit). UI botón "Liberar holdback".
- `[16.E.2.5]` Si max_days_hold expira sin release → escalation: notif dev + bloquear nuevas operaciones hasta resolución.

**Criterio de done del módulo:**
- [ ] Policy 20% / entrega crea holdback correcto.
- [ ] Release trigger se dispara al cambio de status.

### BLOQUE 16.F — Dunning management

#### MÓDULO 16.F.1 — Secuencia recordatorios

**Pasos:**
- `[16.F.1.1]` Config por dev `dunning_policies`: tabla con `days_before` (array: `[-3, 0, 3, 7, 14]`), channels (`['whatsapp','email']`), template_id, escalation_after_days.
- `[16.F.1.2]` Cron `dunning_daily` (8am): busca `invoices` con due_date próxima o vencida → por cada match envía notif según days_offset.
- `[16.F.1.3]` Templates WhatsApp templates aprobados Meta:
  - `-3d`: "Hola {customer_name}, tu factura {folio} por {amount} vence el {due_date}."
  - `0`: "Vence hoy tu factura {folio}. Paga ya: {pay_link}."
  - `+3d`: "Factura {folio} vencida 3 días. Monto {amount}."
  - `+7d`: "Aviso formal vencimiento 7 días. Contacta al {contact}."
  - `+14d`: "Acción legal puede proceder. Contacto inmediato {legal_email}."
- `[16.F.1.4]` Email templates (Resend) equivalentes en HTML con mismo contenido + PDF factura adjunta.
- `[16.F.1.5]` UI log `/contabilidad/dunning` con tabla: invoice, customer, last_reminder_sent, next_reminder_due, status.
- `[16.F.1.6]` Manual override: dev puede pausar dunning para cliente VIP.

**Criterio de done del módulo:**
- [ ] Factura vencida +3d dispara WA+email.
- [ ] Pause pausa correctamente.

### BLOQUE 16.G — AML/KYC screening (UIF >$200K USD)

#### MÓDULO 16.G.1 — Detection + reporting

**Pasos:**
- `[16.G.1.1]` Config tabla `aml_thresholds` por country: MX `200000_usd`, CO `100000_usd`, AR `50000_usd` (ajustar según cada país).
- `[16.G.1.2]` Trigger BD en `operaciones` cuando `valor_cierre_usd >= threshold`:
  - Crea record `aml_flags` con status `pending_review`.
  - Notif admin (role='compliance') + dev owner.
  - Bloquea payout hasta resolución.
- `[16.G.1.3]` Screening checklist UI `/contabilidad/aml/[flag_id]`:
  - Origen fondos (documento soporte — upload).
  - Identificación beneficiario final (INE, pasaporte).
  - Buró crédito consulta (opcional partnership).
  - Lista PEP (Personas Expuestas Políticamente) match (API externa opcional OpenSanctions).
  - Resolución: `cleared` / `escalated_to_uif`.
- `[16.G.1.4]` Cron `aml_monthly_report` (día 5): genera reporte XML para UIF MX con todos los flagged del mes anterior.
- `[16.G.1.5]` Format UIF: XML oficial (SAT PPR) o PDF formato F59 según tipo reporte (operación inusual / preocupante / relevante).
- `[16.G.1.6]` Storage bucket `aml-reports/` con retention 10 años (compliance).
- `[16.G.1.7]` Audit log inmutable — todos los cambios de estado registrados (SEC baseline).

**Criterio de done del módulo:**
- [ ] Op $250K USD test flagea automáticamente.
- [ ] Reporte UIF generado pasa validación XSD oficial.

### BLOQUE 16.H — ESG reporting básico

#### MÓDULO 16.H.1 — Métricas ESG per proyecto

**Pasos:**
- `[16.H.1.1]` Schema `esg_project_metrics` per proyecto:
  ```sql
  CREATE TABLE esg_project_metrics (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES projects(id),
    reporting_period TEXT, -- '2026-Q1'
    leed_certified BOOLEAN DEFAULT FALSE,
    leed_level TEXT, -- 'certified','silver','gold','platinum'
    edge_certified BOOLEAN DEFAULT FALSE,
    energy_kwh_m2_year NUMERIC,
    water_l_m2_year NUMERIC,
    carbon_footprint_tco2e_total NUMERIC,
    renewable_energy_pct NUMERIC,
    waste_recycled_pct NUMERIC,
    social_affordable_units INT,
    governance_audit_completed BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- `[16.H.1.2]` UI `/contabilidad/esg` con form per proyecto: checkboxes certificaciones + inputs numéricos + upload docs soporte.
- `[16.H.1.3]` Cálculo automático huella carbono estimada: usa factores emisión construcción MX (CMM-ICM 2024) × m2 construidos + materiales estimados.
- `[16.H.1.4]` Dashboard ESG: KPIs agregados dev (total tCO2e, # proyectos certificados, % renewable).
- `[16.H.1.5]` Export PDF "Reporte ESG Q<N>" con estilo S&P Global inspiración (§10 metodología abierta).
- `[16.H.1.6]` Badge ESG visible en portal público (FASE 21): proyectos con LEED/EDGE muestran sello verde.

**Criterio de done del módulo:**
- [ ] Dev registra certificación LEED Gold → aparece en ficha pública.
- [ ] Cálculo huella carbono returns valor plausible.

### BLOQUE 16.I — Multi-país stubs

#### MÓDULO 16.I.1 — Adapter pattern fiscal

**Pasos:**
- `[16.I.1.1]` Interface `IFiscalAdapter`:
  ```ts
  interface IFiscalAdapter {
    issueInvoice(payload: UnifiedInvoicePayload): Promise<IssuedInvoice>;
    cancelInvoice(id: string, reason: string): Promise<CancellationResult>;
    getInvoiceStatus(id: string): Promise<InvoiceStatus>;
    issueComplement(parentId: string, type: string, payload: any): Promise<any>;
  }
  ```
- `[16.I.1.2]` Implementations:
  - `MexicoFiscalAdapter` (Facturapi, full).
  - `ColombiaFiscalAdapter` stub (DIAN — electronic invoice XML UBL 2.1).
  - `ArgentinaFiscalAdapter` stub (AFIP — CAE via WSFE).
  - `BrazilFiscalAdapter` stub (NFS-e multi-municipios).
  - `ChileFiscalAdapter` stub (SII via DTE XML).
- `[16.I.1.3]` Factory `getFiscalAdapter(country_code)` retorna impl correcto.
- `[16.I.1.4]` `developer_entities.country_code` determina adapter.
- `[16.I.1.5]` Stubs retornan `NotImplementedError` con link a doc onboarding futuro Fase 23.

**Criterio de done del módulo:**
- [ ] MX flow completo funcional.
- [ ] Otros países stubs retornan error claro.

### BLOQUE 16.J — Reportes y export

#### MÓDULO 16.J.1 — P&L, Balance, Flujo

**Pasos:**
- `[16.J.1.1]` `/contabilidad/reportes/p-and-l` con selector rango (mes/trimestre/año) + developer_entity.
- `[16.J.1.2]` Query SQL aggregations sobre `journal_entry_lines` agrupadas por `chart_of_accounts.code_agrupador`:
  - Ingresos (códigos 400-499)
  - Costos (500-599)
  - Gastos (600-699)
  - Resultado neto.
- `[16.J.1.3]` Vista similar Balance General (100-300 activos, pasivos, capital).
- `[16.J.1.4]` Flujo de caja: operativo + inversión + financiamiento (agrupación por tipo cuenta).
- `[16.J.1.5]` Reporte comisiones: tabla asesores × mes con pagadas / pendientes / retenidas.
- `[16.J.1.6]` Charts: Recharts BarChart + LineChart temporal.

**Criterio de done del módulo:**
- [ ] P&L trimestre actual con datos seed retorna números consistentes.
- [ ] Totales cuadran contra suma `journal_entries`.

#### MÓDULO 16.J.2 — Export PDF/XLSX

**Pasos:**
- `[16.J.2.1]` Generador PDF via `@react-pdf/renderer` con template DMX (logo + branding + disclaimer "DMX no es responsable fiscal — ADR-008").
- `[16.J.2.2]` Generador XLSX via `xlsx` package: hojas (Resumen, Ingresos detalle, Egresos detalle, Asientos).
- `[16.J.2.3]` Endpoints `/api/accounting/export/pdf?type=p-and-l&period=2026-Q1&entity=X` y `.../xlsx`.
- `[16.J.2.4]` Storage temp + signed URL 1h expiry.
- `[16.J.2.5]` Accountant share: permite al contador externo del dev acceder con link temporal + token.

**Criterio de done del módulo:**
- [ ] PDF P&L descargable con formato correcto.
- [ ] XLSX abre en Excel sin warnings.

#### MÓDULO 16.J.3 — Tax pre-calc automation (GC-56 variante fiscal)

**Pasos:**
- `[16.J.3.1]` Cron `tax_forecast_monthly` día 1 cada mes: para cada `developer_entity` MX calcula:
  - IVA trasladado vs acreditado (por cfdi emitidos + gastos deducibles).
  - ISR estimado (utilidad fiscal preliminar × tarifa).
  - Retenciones pendientes (IVA retenido 4%, ISR servicios).
  - Cash flow proyectado 3-6 meses basado en operaciones abiertas + probability (cruza Commission Forecast FASE 14 GC-56).
- `[16.J.3.2]` UI `/contabilidad/tax-forecast` con chart stacked bar months next 6 (IVA por pagar, ISR anticipado, retenciones).
- `[16.J.3.3]` Alert "Próximo pago DIOT / DyP / ISR provisional" con 7 días de anticipación.
- `[16.J.3.4]` Export PDF para contador externo.

**Criterio de done del módulo:**
- [ ] Forecast 3m coherente con operaciones/facturas reales.
- [ ] Alerts se disparan correctamente.

### BLOQUE 16.K — UI dashboard contable

#### MÓDULO 16.K.1 — Dashboard principal contabilidad

**Pasos:**
- `[16.K.1.1]` `/contabilidad/dashboard` (reemplaza pin stub Fase 15) con widgets:
  - KPIs superior: Ingresos mes, Gastos mes, Resultado neto, Cash flow próximos 30d, Facturas pendientes timbrado, Payouts próximos.
  - Grid: facturas recientes (5), payouts próximos (5), alertas dunning (5), aml flags pending.
- `[16.K.1.2]` Selector multi-entity: si dev tiene múltiples RFCs (holding+operadoras), toggle para consolidado o individual.
- `[16.K.1.3]` Quick actions: "Emitir factura manual", "Subir bank statement", "Ejecutar payout run".
- `[16.K.1.4]` Health indicator: FIEL válida (días hasta expiry), Facturapi conectado (green ping), último sync SAT, último reconciliación bancaria.

**Criterio de done del módulo:**
- [ ] Dashboard carga en <2s con data real.
- [ ] Toggle multi-entity funciona.

#### MÓDULO 16.K.2 — Feature gating + plan

**Pasos:**
- `[16.K.2.1]` Free dev: solo visualización básica (sin emisión CFDI).
- `[16.K.2.2]` Starter: emisión CFDI hasta 50/mes, bank reconciliation manual.
- `[16.K.2.3]` Pro: emisión ilimitada, auto-reconciliation, dunning automático, ESG básico.
- `[16.K.2.4]` Enterprise: multi-entity full, AML avanzado, API accountant externo.
- `[16.K.2.5]` Contador externo (role='contador'): agregado Fase 02 enum — acceso readonly a reportes + export con ACL por developer_entity.

**Criterio de done del módulo:**
- [ ] Free dev no puede emitir CFDI (lock UI).
- [ ] Contador test accede readonly.

## Criterio de done de la FASE

- [ ] Todas las 11 tablas accounting creadas + RLS probadas.
- [ ] FIEL upload + Vault storage funcional con MFA.
- [ ] Facturapi MX emitiendo CFDI sandbox correctamente (test 10 operaciones).
- [ ] Cancelación CFDI + complementos Pago/NC/REP funcionales.
- [ ] SAT cron validación diaria ejecutando.
- [ ] 4 bank parsers MX pasan tests con samples reales.
- [ ] Matching engine auto-reconcilia ≥70% test dataset.
- [ ] Payout schedule cron ejecutando + Stripe Connect transfers simuladas.
- [ ] Holdback release manual + automático funcional.
- [ ] Dunning 5 recordatorios (-3/0/+3/+7/+14) envían via WA+email.
- [ ] AML flag automático para op >$200K USD + reporte UIF XML válido.
- [ ] ESG metrics capturados + PDF export.
- [ ] Adapter pattern per país wireado (MX full, demás stubs).
- [ ] Reportes P&L + Balance + Flujo + Comisiones generando datos correctos.
- [ ] Export PDF + XLSX funcional.
- [ ] i18n strings via `t('accounting.*')`.
- [ ] Tests: Vitest coverage ≥75% en `features/accounting/*` + Playwright e2e (login dev → emitir CFDI → conciliar → ejecutar payout → ver reporte).
- [ ] Audit log inmutable de cambios sensitivos (FIEL upload, holdback release, AML status).
- [ ] Disclaimer "DMX es infraestructura, no responsable fiscal" visible en footer del módulo.
- [ ] Tag git `fase-16-complete`.
- [ ] Features entregados: 35 (target §9 briefing).

## Features añadidas por GCs (delta v2)

- **F-16-36** Tax pre-calc automation (GC-56 variante fiscal) con forecast 3-6m + alerts.

## E2E VERIFICATION CHECKLIST

Enforcement per [ADR-018 E2E Connectedness](../01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md). Todos los items deben pasar antes del tag `fase-16-complete`.

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

## Próxima fase

FASE 17 — Document Intelligence Pipeline (PDFs/planos/docs oficiales → tabla verde/amarillo/rojo con AI)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent E) | **Fecha:** 2026-04-17
**Pivot revisión:** 2026-04-18 (biblia v2 moonshot — GCs integrados + E2E checklist)
