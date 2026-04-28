# photographer/commission

F14.F.10 Sprint 9 BIBLIA — Commission tracking + Referrer program + Payment processor.

## Módulos

- `tracker.ts` — `trackVideoSale` + `getPhotographerEarnings`. Aggregations atomic
  por client + photographer cuando registra venta video. Range filter por mes.
- `referrer-program.ts` — `processReferralAcceptance`. Valida invitation_type
  `'referral_program'`, marca `subscribed_to_pro=true`, INSERT
  `commission_earned_usd` (20% primer mes hardcoded canon), trigger Resend email.
- `payment-processor.ts` — STUB ADR-018 H1 manual founder process (ACH/Wire),
  automate H2. Throws `NOT_IMPLEMENTED_H2_MANUAL_PROCESS`.

## STUB ADR-018 (4 señales obligatorias)

1. Comentario header explícito en `payment-processor.ts`.
2. `calculateMonthlyPayment` throws `NOT_IMPLEMENTED_H2_MANUAL_PROCESS`.
3. Este `_README.md` documenta H1 manual process.
4. UI condicional `commission_auto_payment_enabled = false` (canon hardcoded).

## H1 Manual Process (founder ejecuta)

### Step 1 — Query monthly earnings

Conectar Supabase Studio o psql directo y correr:

```sql
SELECT
  sp.id AS photographer_id,
  sp.business_name,
  sp.email,
  COUNT(DISTINCT spi.id) AS referrals_count,
  SUM(spi.commission_earned_usd) AS commission_owed_usd
FROM studio_photographers sp
LEFT JOIN studio_photographer_invites spi ON spi.photographer_id = sp.id
WHERE spi.invitation_type = 'referral_program'
  AND spi.subscribed_to_pro = TRUE
  AND spi.accepted_at >= '2026-MM-01'
  AND spi.accepted_at < '2026-MM-01'::date + INTERVAL '1 month'
GROUP BY sp.id, sp.business_name, sp.email
HAVING SUM(spi.commission_earned_usd) > 0
ORDER BY commission_owed_usd DESC;
```

### Step 2 — Procesar pagos ACH/Wire

Founder revisa:

- Photographer KYC válido (RFC MX, EIN/SSN US, IBAN AR/CO/BR).
- Compliance check (1099-NEC US, factura electrónica MX, etc.).
- Procesa pago vía banco/Wise/Stripe Connect manual.

### Step 3 — Marcar pago manual

Sin tabla `studio_commission_payouts` H1. Founder mantiene spreadsheet externo
(Google Sheets) con: photographer_id, month, amount_paid_usd, payment_method,
external_ref, paid_at.

## Flip H2

Activar cuando founder valida:

1. Volumen mensual > $5K USD justifica integración automatizada.
2. Schema `studio_commission_payouts` creada con RLS ON + audit_rls_allowlist.
3. Compliance review per-país (US 1099-NEC, MX RFC, etc.).
4. Integración Stripe Connect / Wise / Mercury elegida.
5. Test E2E pago real con sandbox.

Steps flip:

1. Reemplazar throw en `calculateMonthlyPayment` con lógica real.
2. Set `COMMISSION_AUTO_PAYMENT_ENABLED = true`.
3. UI muestra "Próximo pago automático: DD/MM/YYYY" en `CommissionDashboard`.
4. Tests integración pago sandbox.
