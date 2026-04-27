# DMX Studio — Stripe Webhook Setup (founder action manual)

> Post-deploy guía configuración webhook Stripe → DMX deployment.
> Bloquea activación checkout real (Pro / Foto / Agency).
> Hasta que esté configurado: `STRIPE_SECRET_KEY=sk_test_stub` mantiene stub mode.

## Pre-requisito

Cuenta Stripe activa con productos canon (ADR-054) creados:

- Pro USD 47/mes (`price_1TQl2xCdtMsDaBnL2wzRlICK`)
- Foto USD 67/mes (`price_1TQl2yCdtMsDaBnLKVAZbarz`)
- Agency USD 297/mes (`price_1TQl3aCdtMsDaBnLfMUI88Sm`)

Verificar precios en `features/dmx-studio/lib/stripe-products.ts`. Cualquier
discrepancia ID requiere actualizar canon antes de habilitar webhook.

## Paso 1 — Crear endpoint Stripe Dashboard

1. [Stripe Dashboard] https://dashboard.stripe.com/webhooks → Add endpoint
2. URL endpoint:
   - Production: `https://desarrollos-mx-ie-2026-final.vercel.app/api/webhooks/stripe-studio`
   - Preview opcional: usar `vercel env pull` URL del PR
3. Description: `DMX Studio subscription lifecycle`
4. Eventos a escuchar (4 mínimos):
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Click "Add endpoint"

## Paso 2 — Copiar signing secret

1. En la página del endpoint creado, sección "Signing secret"
2. Click "Reveal" → copiar valor `whsec_xxxxxxxxxxxx...`

## Paso 3 — Configurar Vercel env vars

[Vercel Dashboard] → Project `desarrollos-mx-ie-2026-final` → Settings → Environment Variables

Agregar / actualizar:

| Variable | Valor | Environments |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` (production) o `sk_test_...` (preview) | Production + Preview |
| `STRIPE_STUDIO_WEBHOOK_SECRET` | `whsec_...` (paso 2) | Production + Preview |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` o `pk_test_...` | Production + Preview |

Click Save → Redeploy último deployment para tomar las variables.

## Paso 4 — Verificar webhook activo

1. Stripe Dashboard → Webhooks → endpoint creado → "Send test webhook"
2. Seleccionar `checkout.session.completed`
3. Click "Send test event"
4. Response esperada: `200 OK`
5. Si falla: revisar Vercel logs `/api/webhooks/stripe-studio` para diagnostics

## Paso 5 — Smoke test end-to-end (opcional pero recomendado)

1. Abrir incognito → https://desarrollos-mx-ie-2026-final.vercel.app/studio
2. Login asesor pruebas
3. Click "Suscribirse Pro USD 47"
4. Stripe checkout flow con tarjeta test `4242 4242 4242 4242`
5. Validar redirect success
6. Validar BD: `select * from studio_subscriptions where user_id = '<user-uuid>'` muestra row
7. Validar `audit_log` con `action='studio.subscription.created'`

## Rollback

Si algo falla en producción:

1. Vercel Dashboard → revertir `STRIPE_SECRET_KEY` a `sk_test_stub`
2. Resultado: wrapper devuelve mock IDs (cs_test_*) sin tocar Stripe API real
3. El stack (UI → tRPC → BD) permanece funcional para validación interna

## Eventos adicionales (post-launch H2)

Cuando se agreguen features F14.F.3+:

- `customer.subscription.created` (welcome flow)
- `invoice.payment_succeeded` (renovación silenciosa)
- `payment_intent.payment_failed` (cobro one-shot, Foto plan boleto?)

Agregar al endpoint via Stripe Dashboard sin redeploy. El handler en
`features/dmx-studio/lib/stripe/webhook.ts` solo registra `audit_log` si el
event type no tiene handler explícito (ignorado seguro).

## Logs y observabilidad

- Vercel Functions logs: `/api/webhooks/stripe-studio` runtime
- Sentry tags: `feature:dmx-studio.stripe op:webhook.*`
- BD `audit_log` table: filter `table_name='studio_subscriptions'`
