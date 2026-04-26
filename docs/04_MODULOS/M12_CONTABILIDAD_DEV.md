# M12 — Contabilidad Desarrollador

> **Portal:** Desarrollador
> **Ruta principal:** `/desarrolladores/contabilidad`
> **Fase donde se construye:** [FASE 16 — Contabilidad Dev](../02_PLAN_MAESTRO/FASE_16_CONTABILIDAD_DEV.md)
> **Priority:** [H1]

---

## Descripción funcional

Módulo de contabilidad **completa en H1** (decisión founder — no MVP). Para México: CFDI 4.0 emisión / cancelación / consulta + complementos (Pago, Notas de Crédito/Recibo, Nómina si aplica). Multi-RFC selector (holding + operadoras + fideicomisos — devs típicamente tienen 3-5 RFCs). Chart of accounts SAT catálogo nativo. Bank reconciliation (parser OFX/CSV BBVA / Santander / Banorte / HSBC). Payout programs con schedule automático. Commission holdback (retener % hasta entrega). Dunning management (cobro vencidos -3/0/+3/+7/+14 días). AML/KYC UIF flag para operaciones >$200K USD. ESG reporting básico (emisiones + inclusión). Reportes P&L, balance, flujo caja, comisiones. Export PDF/XLSX para contador externo. **Stubs multi-país**: DIAN CO, AFIP AR, NFS-e BR, SII CL.

## Flujos principales

### Flujo 1 — Emitir CFDI
1. Auto-trigger desde M07 Operaciones (status=cerrada) o manual.
2. Selector RFC emisor (si dev tiene múltiples).
3. Datos pre-hidratados: receptor (cliente RFC + régimen + CP), conceptos (unidad + monto), IVA, total.
4. Preview XML + PDF.
5. Submit → Facturapi.io timbrado → UUID fiscal.
6. INSERT `fiscal_docs` + email al cliente.

### Flujo 2 — Cancelar CFDI
1. Lista CFDIs → botón cancelar (con motivo SAT 01-04).
2. Confirmación.
3. Submit → Facturapi.cancel → update status.

### Flujo 3 — Multi-RFC selector
1. Header: dropdown con RFCs registrados.
2. Switch contexto → recarga datos filtrados por RFC.
3. Config RFC: FIEL upload (.key + .cer) + password cifrado (pgsodium).

### Flujo 4 — Bank reconciliation
1. Tab "Conciliación" → upload OFX/CSV/XLS.
2. Parser detecta banco automáticamente.
3. UI match: transacciones vs pagos registrados (drag match o auto-suggest).
4. Unmatched rows → crear pago manual o marcar "no aplicable".

### Flujo 5 — Chart of accounts SAT
1. Tab "Cuentas" → árbol SAT nativo (1000 Activos / 2000 Pasivos / ...).
2. CRUD cuentas propias bajo árbol.
3. Asientos contables auto-generados desde eventos (venta, CFDI, pago, comisión).

### Flujo 6 — Payout programs (asesores)
1. Config: schedule (weekly/biweekly/monthly) + day.
2. Calcula comisiones pagables (operaciones status=cerrada con cobro íntegro).
3. Commission holdback: retener 20% hasta escritura firmada (configurable).
4. Ejecuta via Stripe Connect → split payment automático.

### Flujo 7 — Dunning
1. Tab "Cobranza" → listado pagos pending con edad.
2. Auto-emails a -3 (recordatorio), 0 (vencimiento), +3 (primer aviso), +7 (segundo aviso), +14 (escalamiento).
3. Templates editables.

### Flujo 8 — AML/KYC UIF flag
1. Trigger al registrar operación >$200K USD: marca `operaciones.aml_flagged=true`.
2. UI muestra flag + checklist: ID comprador + origen fondos + UBO + due diligence.
3. Reporte UIF: export CSV estándar `Oper-UIF` reglamento MX.

### Flujo 9 — ESG reporting (basic H1)
1. Tab "ESG": emisiones estimadas (construcción + operación), proyectos con certificación LEED/EDGE/WELL, inclusión (% unidades accesibles, precio mediano vs vivienda social threshold).
2. Export PDF para inversionistas.

### Flujo 10 — Export contador externo
1. Selector rango fechas + reporte type.
2. Reports: P&L, Balance, Flujo caja, CFDIs emitidos, comisiones pagadas.
3. Export PDF + XLSX.

## Wireframe textual

```
┌──────────────────────────────────────────────────────────────┐
│ Contabilidad   RFC: [ALM121212XYZ ▾]                          │
├────┬─────────────────────────────────────────────────────────┤
│ SB │ CFDIs | Conciliación | Cuentas | Payouts | Cobranza |   │
│    │ AML | ESG | Reportes                                     │
│    │ ┌───────────────────────────────────────────────┐       │
│    │ │ CFDIs último mes: 48 emitidos, $52M facturado │       │
│    │ │ [Tabla: UUID | Fecha | Cliente | Monto | St.] │       │
│    │ └───────────────────────────────────────────────┘       │
└────┴─────────────────────────────────────────────────────────┘
```

## Componentes UI requeridos

- `<RFCSwitcher />` — header dropdown.
- `<CFDITable />` + `<CFDIEmitter />` + `<CFDIViewer />`.
- `<CancelCFDIDialog />`.
- `<BankReconciliation />` — upload + match UI.
- `<ChartOfAccountsTree />`.
- `<AsientosLog />`.
- `<PayoutProgramsEditor />`.
- `<CommissionHoldbackConfig />`.
- `<DunningDashboard />` — templates + triggers.
- `<AMLChecklist />`.
- `<ESGReportCard />`.
- `<ReportExporter />`.

## Procedures tRPC consumidas

- `fiscal.emitCFDI`, `cancelCFDI`, `listCFDIs`, `getCFDIById`.
- `fiscal.uploadFIEL` — encrypted storage.
- `fiscal.switchRFC`.
- `contabilidad.parseBankStatement`, `matchTransaction`.
- `contabilidad.listChartOfAccounts`, `createAccount`.
- `contabilidad.listAsientos`.
- `contabilidad.configPayoutProgram`, `executePayouts`.
- `contabilidad.listDunning`, `sendDunningEmail`.
- `contabilidad.flagAML`, `exportUIFReport`.
- `contabilidad.generateESGReport`.
- `contabilidad.exportReports`.

## Tablas BD tocadas

- `developer_rfcs` — multi RFC.
- `fiscal_docs` — CFDIs.
- `fiscal_complementos` — Pago, NCR, Recibo.
- `bank_statements` — OFX/CSV parsed.
- `bank_matches`.
- `chart_of_accounts` — SAT + propias.
- `asientos_contables`.
- `payout_programs`.
- `payouts` — ejecuciones.
- `dunning_templates`, `dunning_events`.
- `aml_records`.
- `esg_reports`.
- `audit_log`.

## Estados UI

- **Loading**: skeleton.
- **Error**: toast + ticket de soporte si falla SAT.
- **Empty**: CTA upload FIEL + tutorial.
- **Success**: datos.

## Validaciones Zod

```typescript
const emitCFDIInput = z.object({
  rfcEmisorId: z.string().uuid(),
  rfcReceptor: z.string().regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/),
  cpReceptor: z.string().regex(/^\d{5}$/),
  regimenFiscalReceptor: z.string(), // catálogo SAT
  usoCFDI: z.string(), // G01, G03, etc
  conceptos: z.array(z.object({
    claveProdServ: z.string(),
    descripcion: z.string().max(200),
    cantidad: z.number().positive(),
    valorUnitario: z.number().positive(),
    ivaApplica: z.boolean().default(true),
  })).min(1),
  moneda: z.enum(['MXN', 'USD']).default('MXN'),
  tipoCambio: z.number().positive().optional(),
  formaPago: z.string(), // catálogo SAT 01..99
  metodoPago: z.enum(['PUE', 'PPD']),
  relacionadoOperacionId: z.string().uuid().optional(),
});

const cancelCFDIInput = z.object({
  cfdiId: z.string().uuid(),
  motivo: z.enum(['01', '02', '03', '04']),
  cfdiSustitucionUuid: z.string().uuid().optional(), // si motivo=01
});
```

## Integraciones externas

- **Facturapi.io** (primary) — CFDI 4.0 timbrado.
- **Finkok** (fallback PAC).
- **SAT** — consulta RFC, catálogos, régimenes.
- **Stripe Connect** — payouts.
- **Bancos APIs** (BBVA, Santander, Banorte, HSBC) — Open Banking MX si disponible; parser OFX/CSV como fallback.
- **Kueski, Creditas** — origen fondos KYC (Fase 18).
- **DIAN CO / AFIP AR / NFS-e BR / SII CL** — stubs multi-país.

## Tests críticos

- [ ] Emitir CFDI → UUID retornado + XML válido schema SAT.
- [ ] Cancelar CFDI motivo 01 requiere UUID sustitución.
- [ ] Bank reconciliation parsea BBVA OFX correctamente.
- [ ] Chart of accounts SAT catálogo completo seeded.
- [ ] Payout program ejecuta split Stripe Connect correcto.
- [ ] Commission holdback retiene 20% hasta escritura.
- [ ] Dunning emails envía en días correctos.
- [ ] AML flag >$200K USD activa checklist.
- [ ] Export UIF CSV schema reglamento.
- [ ] RLS: dev solo ve su contabilidad.
- [ ] FIEL encrypted con pgsodium (nunca plain).
- [ ] i18n: `t('dev.contabilidad.*')` es-MX priority.

## i18n keys ejemplo

```tsx
<Label>{t('dev.contabilidad.cfdi.rfcEmisor')}</Label>
<Badge>{t('dev.contabilidad.cfdi.status.' + status)}</Badge>
```

## Cross-references

- ADR-003 Multi-Country (stubs DIAN, AFIP, NFS-e, SII)
- ADR-009 Security (FIEL encrypted, AML compliance)
- [FASE 16 Contabilidad](../02_PLAN_MAESTRO/FASE_16_CONTABILIDAD_DEV.md)
- [FASE 18 Pagos Escrow](../02_PLAN_MAESTRO/FASE_18_LEGAL_PAGOS_ESCROW.md)
- [03.6 API Routes](../03_CATALOGOS/03.6_CATALOGO_API_ROUTES.md) — webhooks facturapi + sat
- Módulos relacionados: M07 Operaciones (trigger CFDI), M13 CRM Dev (payouts)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent H) | **Fecha:** 2026-04-17
