# M07 — Operaciones

> **Portal:** Asesor
> **Ruta principal:** `/asesores/operaciones`
> **Fase donde se construye:** [FASE 14 — Portal Asesor M6-M10](../02_PLAN_MAESTRO/FASE_14_PORTAL_ASESOR_M6_M10.md)
> **Sidebar tint:** bgMint `#EDFAF5`
> **Priority:** [H1]
> **Referencia visual:** `/docs/referencias-ui/M7_Operaciones.tsx`

---

## Descripción funcional

Módulo de operaciones (ventas/rentas) del asesor. Wizard 6 pasos para crear operación con partes claramente identificadas (comprador/vendedor/ambos), comisión con **IVA 16% automático explícito** y **split plataforma 20% EXPLÍCITO** (mejora crítica vs Pulppo que lo oculta). Status schema limpio: `side` CHECK `(ambos/comprador/vendedor)` — **NO columna `lado` duplicada** (ADR cerró DISC-03). Status operaciones: `propuesta/oferta_aceptada/escritura/cerrada/pagando/cancelada` (mapeo STATUS_MAP: offer↔propuesta, offer_blocked↔oferta_aceptada, contract↔escritura, closed↔cerrada, paying↔pagando, cancelled↔cancelada). Código único `98A-ACOS-ACOS`. Ciclo cobro `pending → paid (parcial) → closed (íntegro) → expired`. Módulo Legal separado `/legal` (Fase 18) integrado. **Diferenciación fuerte vs Pulppo**: RFC + CFDI 4.0 + Mifiel NOM-151 (fiscalidad MX real), conversión FX USD/MXN, integración PAC, retención ISR.

## Flujos principales

### Flujo 1 — Lista operaciones
1. Usuario entra `/asesores/operaciones`, vista default = lista.
2. `trpc.operaciones.listOperaciones` con filtros (status, side, fecha_cierre, currency).
3. Cada fila: código único + partes + precio + status badge + % completitud.
4. Sort default: más recientes primero, status pending arriba.

### Flujo 2 — Wizard crear operación (6 pasos)
1. Botón "+ Nueva operación" → wizard stepper:

**Paso 1 — Operación**
- Selector `side` con descripciones claras:
  - **AMBOS LADOS**: represento comprador y vendedor.
  - **LADO VENDEDOR**: co-broke, otra inmobiliaria trae comprador.
  - **LADO COMPRADOR**: co-broke, otra inmobiliaria tiene propiedad.

**Paso 2 — Comprador**
- Asesor (team picker, default me).
- Comprador/Inquilino (contactos picker + "Crear nuevo" inline).

**Paso 3 — Vendedor**
- Propiedad (browser proyectos/unidades/propiedades_secundarias, con filtro + search).
- Asesor Productor (auto-fill desde proyecto).
- Asesor Vendedor (auto-fill o editable).
- Propietario (contactos picker).
- **Botón "Pegar liga"**: input URL EasyBroker/ML/Inmuebles24 → parser extrae datos.

**Paso 4 — Estado**
- Status inicial default `propuesta`.
- Fecha cierre: auto +10 días (editable).
- Valores:
  - Reserva: monto + currency (MXN/USD).
  - Promoción: monto + currency.
  - Cierre: monto + currency.
- FX rate aplicado (Open Exchange Rates API) si currencies mixtos.

**Paso 5 — Comisión**
- % default 4% (both) / 3% (buyer side) / configurable.
- IVA 16% auto: 4% → 4.64% total.
- Monto recibido editable.
- **Split plataforma 20% EXPLÍCITO**: breakdown visible — "Tu inmobiliaria: 80%, DMX: 20%".
- Adjuntar factura opcional (upload PDF/XML).
- Checkbox "Declaración jurada de datos correctos" OBLIGATORIO.

**Paso 6 — Notas**
- Textarea + attachments opcional (drag&drop).

2. Submit → INSERT `operaciones` + `operacion_parts` + `operacion_commissions`.
3. Código único `98A-ACOS-ACOS` auto-generado (pattern `{3-alphanum}-{4-initials}-{4-initials}`).
4. Vincula búsqueda (si viene de M04) → busqueda avanza a "Ofertando".

### Flujo 3 — Cambiar estado operación
1. Detalle operación, status chip clickeable → dropdown con siguientes válidos.
2. Validaciones:
   - `propuesta → oferta_aceptada`: requiere firma simple (check).
   - `oferta_aceptada → escritura`: requiere módulo Legal `/legal` iniciado.
   - `escritura → cerrada`: requiere firma Mifiel NOM-151 completa + CFDI emitido.
   - `cerrada → pagando`: disparo automático al recibir pago.
   - `pagando → cerrada` (back): cuando pago íntegro.
   - `* → cancelada`: con motivo obligatorio.
3. Al cambiar status → trigger T18 webhook + notificación a contraparte.

### Flujo 4 — Ciclo cobro
1. En detalle op, panel Pagos:
   - Estados: `pending` (0%) → `paid` (parcial) → `closed` (íntegro) → `expired`.
   - Registrar pago: monto + fecha + comprobante.
2. Si `paid` pero no `closed` en 30 días → cron marca `expired` + notif.

### Flujo 5 — Módulo Legal /legal
1. En detalle op, botón "Ir a Legal".
2. Ruta `/legal/[operacionId]` (fase 18).
3. Flow: No subido → En revisión → Aprobado/Rechazado → Contrato enviado (Mifiel) → Contrato firmado (NOM-151 timestamp).

### Flujo 6 — CFDI emisión (México)
1. Al status `cerrada`, trigger `fiscal.emitCFDI`.
2. Facturapi.io emite CFDI 4.0 con complemento Pago.
3. PDF + XML almacenados en `fiscal_docs`.
4. Email automático al comprador con CFDI.

## Wireframe textual

```
┌───────────────────────────────────────────────────────────────┐
│ Operaciones              Filters▾      [+ Nueva]               │
├────┬──────────────────────────────────────────────────────────┤
│ SB │ Código       Partes           Precio     Status    %      │
│    │ 98A-ACOS-JGOM Ana↔Juan    $3.5M MXN Propuesta  ▓░░ 45% │
│    │ 7BC-MGOM-ACOS María↔Luis  $4.2M MXN Escritura  ▓▓▓ 85% │
│    │ 9FG-ACOS-LPEZ Luis↔Pedro  $2.8M USD Cerrada    ▓▓▓100% │
└────┴──────────────────────────────────────────────────────────┘

Wizard:
┌─ Paso 5 Comisión ──────────────────────────────────┐
│ Precio cierre: $3,500,000 MXN                       │
│ Comisión: [4]% = $140,000                           │
│ IVA 16%: $22,400                                    │
│ Total: $162,400                                     │
│ ──────────────────────────                          │
│ Split:                                              │
│   Tu inmobiliaria (80%): $129,920                  │
│   DMX (20%):             $32,480                   │
│ ──────────────────────────                          │
│ [📎 Factura.pdf] [☑ Declaración jurada]            │
│                                     [← Back][Next→] │
└─────────────────────────────────────────────────────┘
```

## Componentes UI requeridos

- `<OperacionesList />` — tabla con filters.
- `<OperacionRow />` — compact row.
- `<WizardOperacion />` — 6 pasos stepper.
- `<SideSelector />` — 3 opciones con descripciones.
- `<PropiedadBrowser />` — search/filter proyectos.
- `<PegarLigaInput />` — shared con M04.
- `<ComisionCalculator />` — breakdown IVA + split explícito.
- `<StatusChanger />` — dropdown con validations.
- `<PagoRegistrar />` — form monto + comprobante.
- `<LegalFlowIndicator />` — steps del flow Legal.
- `<CFDIViewer />` — iframe PDF + download XML.

## Procedures tRPC consumidas

- `operaciones.listOperaciones`.
- `operaciones.createOperacion` — input wizard schema.
- `operaciones.getById`.
- `operaciones.updateStatus` — con validaciones.
- `operaciones.registerPago`.
- `operaciones.cancelOperacion` — motivo obligatorio.
- `fiscal.emitCFDI` — en status cerrada.
- `fiscal.cancelCFDI`.
- `scrapers.parseExternalListing` — Pegar liga (shared).
- `fx.getRate` — Open Exchange Rates.
- `legal.initFlow` — start /legal flow.

## Tablas BD tocadas

- `operaciones` — schema:
  ```sql
  CREATE TABLE operaciones (
    id uuid PRIMARY KEY,
    codigo text UNIQUE NOT NULL,  -- 98A-ACOS-ACOS
    country_code char(2) NOT NULL,
    side text CHECK (side IN ('ambos', 'comprador', 'vendedor')), -- ÚNICA columna, no 'lado'
    status text CHECK (status IN ('propuesta', 'oferta_aceptada', 'escritura', 'cerrada', 'pagando', 'cancelada')),
    -- ...
  );
  ```
- `operacion_parts` — comprador + vendedor + asesores.
- `operacion_commissions` — % + IVA + split.
- `operacion_pagos` — ciclo cobro.
- `operacion_attachments`.
- `fiscal_docs` — CFDI PDF+XML.
- `legal_flows` — state machine.
- `proyectos`, `unidades`, `propiedades_secundarias`, `contactos`, `asesores` — SELECT picker.
- `audit_log` — mutaciones.
- `timeline_entries` — cada cambio status.

## Estados UI

- **Loading**: skeleton tabla.
- **Error**: banner + retry.
- **Empty**: CTA "Crea tu primera operación" + link a M04 Búsquedas.
- **Success**: tabla + badges animados.

## Validaciones Zod

```typescript
const OPERACION_STATUS = ['propuesta', 'oferta_aceptada', 'escritura', 'cerrada', 'pagando', 'cancelada'] as const;

const createOperacionInput = z.object({
  countryCode: z.string().length(2),
  side: z.enum(['ambos', 'comprador', 'vendedor']),
  comprador: z.object({
    asesorId: z.string().uuid(),
    contactoId: z.string().uuid(),
  }),
  vendedor: z.object({
    propiedadType: z.enum(['proyecto', 'unidad', 'propiedad_secundaria']),
    propiedadId: z.string().uuid(),
    asesorProductorId: z.string().uuid().optional(),
    asesorVendedorId: z.string().uuid(),
    propietarioContactoId: z.string().uuid(),
  }),
  estado: z.object({
    status: z.enum(OPERACION_STATUS).default('propuesta'),
    fechaCierre: z.string().date(),
    reservaMonto: z.number().nonnegative().optional(),
    reservaCurrency: z.enum(['MXN','USD','COP','ARS','BRL']).optional(),
    promocionMonto: z.number().nonnegative().optional(),
    cierreMonto: z.number().positive(),
    cierreCurrency: z.enum(['MXN','USD','COP','ARS','BRL']),
  }),
  comision: z.object({
    porcentaje: z.number().min(0.25).max(10),
    ivaAplica: z.boolean().default(true),
    splitPlatformaPct: z.number().default(20),
    declaracionJurada: z.literal(true),
    facturaFileUrl: z.string().url().optional(),
  }),
  notas: z.string().max(5000).optional(),
  attachments: z.array(z.string().url()).max(10).default([]),
});
```

## Integraciones externas

- **Facturapi.io** — CFDI 4.0 México (emisión + cancelación + consulta).
- **Finkok** — PAC fallback.
- **Mifiel** — firma NOM-151 (Fase 18).
- **DocuSign** — fallback firma para otros países.
- **Open Exchange Rates** — FX MXN/USD realtime.
- **SAT** — consulta RFC validez.
- **Stripe Connect** — split payment al cierre.
- **Scrapers** EasyBroker, ML, Inmuebles24.
- **Resend** — email CFDI al comprador.

## Tests críticos

- [ ] Wizard 6 pasos valida cada step antes de avanzar.
- [ ] Código único 98A-ACOS-ACOS pattern correcto.
- [ ] IVA 16% auto calculado (4% → 4.64%).
- [ ] Split 20% plataforma VISIBLE en UI (no oculto).
- [ ] Schema operaciones tiene `side` CHECK pero NO columna `lado` duplicada.
- [ ] Status transitions validadas (no saltos ilegales).
- [ ] CFDI emitido en cerrada con XML válido según SAT.
- [ ] Pegar liga EasyBroker extrae datos.
- [ ] FX rate aplicado si currencies mixtos.
- [ ] Ciclo cobro cron marca expired tras 30 días paid.
- [ ] RLS: operaciones visibles a asesores involucrados + admin.
- [ ] i18n: status labels via `t('operaciones.status.*')`.

## i18n keys ejemplo

```tsx
<Badge>{t('operaciones.status.' + op.status)}</Badge>
<Select label={t('operaciones.side.label')}>
  <Option>{t('operaciones.side.ambos')}</Option>
  <Option>{t('operaciones.side.comprador')}</Option>
  <Option>{t('operaciones.side.vendedor')}</Option>
</Select>
<p>{t('operaciones.comision.splitExplanation')}</p>
```

## Referencia visual

Ver `/docs/referencias-ui/M7_Operaciones.tsx` (873 LOC). Tint bgMint, wizard con stepper, lista tabla.

## Cross-references

- ADR-001 Rewrite (schema sin DISC-03, campo `side` único)
- ADR-002 AI-Native (parse listings)
- ADR-003 Multi-Country (CFDI MX + DIAN CO + AFIP AR + NFS-e BR + SII CL stubs)
- ADR-009 Security (declaración jurada + audit)
- [FASE 16 Contabilidad](../02_PLAN_MAESTRO/FASE_16_CONTABILIDAD_DEV.md) — CFDI
- [FASE 18 Legal](../02_PLAN_MAESTRO/FASE_18_LEGAL_PAGOS_ESCROW.md) — Mifiel + escrow
- [03.5 tRPC](../03_CATALOGOS/03.5_CATALOGO_TRPC_PROCEDURES.md) — operaciones.*, fiscal.*
- Módulos relacionados: M04 Búsquedas (creación desde ofertar), M12 Contabilidad Dev (contrapartida CFDI)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent H) | **Fecha:** 2026-04-17
