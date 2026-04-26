# M18 — Dashboard Comprador (10 Pages Internas)

> **Portal:** Comprador
> **Ruta principal:** `/comprador`
> **Fase donde se construye:** [FASE 20 — Portal Comprador](../02_PLAN_MAESTRO/FASE_20_PORTAL_COMPRADOR.md)
> **Priority:** [H1]

---

## Descripción funcional

Portal del comprador final (consumer). Personalizado por `buyer_persona` (Netflix pattern). **10 pages internas** accesibles desde un Dashboard principal que adapta orden y contenido según perfil. Soporta **family accounts** (wishlist compartida con pareja + padres), **WhatsApp primary** (no email — mercado MX), **pre-aprobación crediticia express** widget (BBVA / Santander / Kueski / Creditas), **apartado con escrow** integrado (Fase 18 Stripe Connect).

**Disclaimers T&Cs claros**: "DesarrollosMX es infraestructura de intelligence y matching. NO somos responsables del post-venta. Responsabilidad post-venta es del desarrollador vendedor." (decisión founder — NO responsabilidad post-venta).

## Las 10 pages internas

1. **Dashboard principal** — homepage personalizada por `buyer_persona`.
2. **Lifestyle Match A10** — selector 6 perfiles (first-buyer / investor / upgrader / downsizer / relocator / second-home).
3. **¿Me Alcanza?** — A01 Affordability calculator (ingresos + gastos + enganche → max precio).
4. **Simulador Inversión** — A02 con 4 escenarios (ROI bruto/neto, yield MXN/USD).
5. **TCO Calculator** — A05 Total Cost Ownership 10 años (predial + mantenimiento + seguros + intereses).
6. **Patrimonio 20y** — A11 forecast patrimonio neto con compra vs renta.
7. **Comparador** — A08 multi-dimensional (hasta 4 propiedades, 15 dimensiones).
8. **Timing Optimizer** — A07 (ahora vs esperar vs rentar-comprar-después).
9. **Watchlist** — con score alerts (suscripción a zone_scores + project_scores).
10. **Discover Weekly** — Spotify pattern, 3 matches semanales lunes 8am.

## Personalización Netflix

Por `buyer_persona` (definido en Lifestyle Match):
- **First-buyer**: prioriza affordability + crédito + FOVISSSTE/INFONAVIT.
- **Investor**: prioriza ROI/yield + arbitrage + market cycle.
- **Family**: prioriza schools + safety + walkability + hospitales.
- **Upgrader**: prioriza amenidades + vista + prestigio zona.
- **Downsizer**: prioriza accesibilidad + hospitales + seguridad.
- **Relocator**: prioriza transit + expat community + international schools.

Homepage adapta: orden de secciones, score presentation, artwork (amenidad más relevante).

## Flujos principales

### Flujo 1 — Onboarding primer login
1. User signup via WA OTP (primary) o email.
2. Wizard: Lifestyle Match A10 (6 opciones visuales).
3. Guarda `user_buyer_profiles.buyer_persona` (ADR-049 — tabla NUEVA separada de `user_scores` IE).
4. Afloja: budget rango, ciudad, timeline.
5. Genera primera Discover Weekly on-the-fly.
6. Redirige a Dashboard personalizado.

### Flujo 2 — Dashboard personalizado
1. Hero: saludo + insight del día ("El precio mediano en Del Valle subió 2.3% este mes").
2. Secciones (orden según persona):
   - Watchlist (si tiene proyectos guardados).
   - Discover Weekly (3 matches).
   - Pre-aprobación crediticia widget.
   - Score Alerts (cambios importantes en zonas seguidas).
   - Comparador quick.
   - Quick links a 10 pages.

### Flujo 3 — ¿Me Alcanza? (A01)
1. Form: ingreso mensual, gastos fijos, ahorro disponible (enganche), crédito existente.
2. `scores.calculateAffordability` → precio máximo + rango sugerido + simulación crédito.
3. Muestra propiedades dentro del rango como CTA.

### Flujo 4 — Simulador Inversión (A02)
1. Selecciona propiedad (de watchlist o search).
2. Muestra 4 escenarios:
   - Compra contado.
   - Crédito bancario 20 años.
   - Pre-venta + financiamiento desarrollador.
   - Co-inversión (si feature H2).
3. Output: ROI bruto, ROI neto, yield bruto, yield neto, TIR.

### Flujo 5 — TCO (A05)
1. Selecciona propiedad + horizonte (5 / 10 / 20 años).
2. Calcula: precio inicial + intereses crédito + mantenimiento anual + predial + seguros + costos fiscales.
3. Muestra costo total vs equity building.

### Flujo 6 — Comparador (A08)
1. Add up to 4 propiedades.
2. Tabla con 15 dimensiones:
   - Precio, precio/m², superficie, recámaras, baños.
   - DMX Score, zone_score, momentum, risk.
   - Amenidades, antigüedad, entrega.
   - Mantenimiento, predial.
   - Walkability, safety, transit.
3. Highlight mejores en cada dimensión.

### Flujo 7 — Watchlist + Score Alerts
1. Guarda propiedades + zonas.
2. Suscripción `zone_alert_subscriptions` → notif si score cambia >5% (ADR-049).
3. Ej: "DMX Score Del Valle subió de 8.4 a 8.7 ↑".
4. Listing con filtros + bulk actions.

### Flujo 8 — Discover Weekly
1. Cron lunes 8am local time del user.
2. `discover_weekly_generate` cron genera 3 matches personalizados.
3. Email + WA + in-app notification.
4. Page `/comprador/discover` con carrusel.
5. Track engagement (open/click/save) → mejora matching próximo.

### Flujo 9 — Pre-aprobación crediticia
1. Widget "¿Quieres saber cuánto te prestan?" → CTA.
2. Form: datos básicos + autorización buró.
3. `credit.getPreApproval` → calls partners (BBVA / Santander / Kueski / Creditas via API).
4. Returns: monto aprobado + tasa + plazo.
5. Store encrypted.

### Flujo 10 — Family account
1. Config: invite pareja/padres con rol (primary/viewer/approver).
2. Wishlist compartida.
3. Approver requerido para apartar.

### Flujo 11 — Apartado con escrow
1. En ficha proyecto (M20), botón "Apartar".
2. Selecciona unidad + monto apartado.
3. Redirect Stripe Connect — pago en escrow.
4. Dev recibe aviso + tiene 30 días para generar contrato.
5. Si contrato firmado → escrow release to dev.
6. Si cancela dentro ventana → refund al comprador.

## Wireframe textual

```
┌──────────────────────────────────────────────────────────────┐
│ Logo DMX | Hola Ana 🏡 | Settings | 🔔 | Avatar                │
├────┬─────────────────────────────────────────────────────────┤
│ SB │ Personalizado para First-Buyer                           │
│    │ ┌──────────────────────────────────────┐                │
│    │ │ Pre-aprobación: $3.2M disponible ✓   │                │
│    │ └──────────────────────────────────────┘                │
│    │                                                           │
│    │ Discover Weekly (3 matches) 🎵                            │
│    │ [Match1] [Match2] [Match3]                                │
│    │                                                           │
│    │ Watchlist (5 proyectos)                                  │
│    │ Score Alerts ⚡ (2 nuevos)                                │
│    │                                                           │
│    │ Herramientas: [¿Me alcanza?][Simulador][TCO]             │
│    │               [Patrimonio][Comparador][Timing]            │
└────┴─────────────────────────────────────────────────────────┘
```

## Componentes UI requeridos

- `<CompradorDashboard />` — personalizado por persona.
- `<LifestyleMatchWizard />` — 6 opciones visuales.
- `<AffordabilityCalc />` — A01.
- `<InversionSimulator />` — A02 4 escenarios.
- `<TCOCalculator />` — A05.
- `<PatrimonioForecast />` — A11.
- `<ComparadorMulti />` — A08 4 props x 15 dims.
- `<TimingOptimizer />` — A07.
- `<WatchlistWithAlerts />`.
- `<DiscoverWeeklyCarousel />`.
- `<PreApprovalWidget />`.
- `<FamilyAccountSettings />`.
- `<ApartarDialog />` — Stripe Connect.
- `<DisclaimerBanner />` — T&Cs post-venta.

## Procedures tRPC consumidas

- `comprador.getDashboard`.
- `comprador.updateBuyerPersona`.
- `scores.calculateAffordability` (A01).
- `scores.calculateInversion` (A02).
- `scores.calculateTCO` (A05).
- `scores.calculatePatrimonio` (A11).
- `scores.calculateTiming` (A07).
- `comprador.addToWatchlist`, `removeFromWatchlist`, `listWatchlist`.
- `comprador.subscribeToScore`, `unsubscribe`.
- `comprador.getDiscoverWeekly`.
- `credit.getPreApproval`.
- `familyAccount.invite`, `acceptInvite`, `setRole`.
- `apartado.initiate`, `getStatus`, `cancel`.

## Tablas BD tocadas

> ADR-049 separa `user_buyer_profiles` (persona M18) de `user_scores` (IE scores). Pre-implementación M18 requiere migration `create_user_buyer_profiles` con cols `buyer_persona text`, `budget_mxn numeric`, `timeline text`, `lifestyle_tags jsonb`, RLS owner-only.

- `users` — auth + preferences.
- `user_buyer_profiles` — buyer_persona, budget_mxn, timeline, lifestyle_tags (NUEVA, ADR-049).
- `user_scores` — IE scores N4 (level/tier/score_value/components). NO contiene persona/budget/timeline.
- `wishlist_items`.
- `zone_alert_subscriptions`. <!-- ADR-049: BD canonical `zone_alert_subscriptions` (no `score_subscriptions`). -->

- `discover_weekly_generations`.
- `affordability_calcs`.
- `inversion_simulations`.
- `tco_calcs`.
- `patrimonio_forecasts`.
- `comparador_sessions`.
- `timing_analyses`.
- `family_accounts`, `family_members`.
- `pre_approvals` (encrypted pgsodium).
- `apartados` — escrow records.
- `disclaimers_acceptance`.

## Estados UI

- **Loading**: skeletons.
- **Error**: toast + fallback defaults.
- **Empty** (nuevo user sin persona): redirect a Lifestyle Match onboarding.
- **Success**: personalized layout.

## Validaciones Zod

```typescript
const buyerPersonaInput = z.object({
  persona: z.enum(['first_buyer', 'investor', 'upgrader', 'downsizer', 'family', 'relocator', 'second_home']),
  budget: z.object({
    min: z.number().nonnegative(),
    max: z.number().positive(),
    currency: z.enum(['MXN', 'USD']).default('MXN'),
  }),
  timeline: z.enum(['immediate', '3_months', '6_months', '12_months', 'exploring']),
  cityPreference: z.string().max(80),
  mustHaves: z.array(z.string()).max(10).default([]),
});

const apartadoInitiateInput = z.object({
  projectId: z.string().uuid(),
  unidadId: z.string().uuid(),
  montoApartado: z.number().positive(),
  currency: z.enum(['MXN', 'USD']).default('MXN'),
  disclaimersAccepted: z.array(z.string()).min(3), // T&Cs, privacy, post-venta
});
```

## Integraciones externas

- **WhatsApp Business API** — OTP signup + notifs.
- **Meta WA** — Discover Weekly send.
- **Resend** — email fallback.
- **Anthropic Claude** — personalized insights.
- **Stripe Connect** — escrow apartado.
- **BBVA / Santander / Kueski / Creditas** — pre-approval partner APIs.
- **Buró de Crédito** — consulta autorizada.
- **Apple / Google Pay** — apartado mobile.
- **PostHog** — personalization A/B tests.

## Tests críticos

- [ ] Onboarding wizard guarda buyer_persona.
- [ ] Dashboard homepage orden adapta por persona.
- [ ] A01 Affordability calcula correctamente (test fixtures).
- [ ] Watchlist subscribe → notif cuando score cambia >5%.
- [ ] Discover Weekly cron lunes 8am local.
- [ ] Pre-approval partner API retorna monto.
- [ ] Family account invite flow.
- [ ] Apartado Stripe Connect escrow: pago retenido hasta contrato.
- [ ] Disclaimers T&Cs aparecen antes de apartar.
- [ ] RLS: comprador solo ve sus propios datos.
- [ ] WA OTP signup funciona sin email.
- [ ] i18n: `t('comprador.*')`.

## i18n keys ejemplo

```tsx
<h1>{t('comprador.dashboard.greeting', { name })}</h1>
<Tab>{t('comprador.pages.' + page)}</Tab>
<p>{t('comprador.disclaimer.postVenta')}</p>
```

## Disclaimers (T&Cs claros)

Ejemplo copy:
> "DesarrollosMX es una plataforma de infraestructura e inteligencia inmobiliaria. Facilitamos el descubrimiento, comparación y matching entre compradores, asesores y desarrolladores. **No somos parte del contrato de compraventa y no somos responsables del post-venta, entrega, calidad de construcción, defectos, ni reclamaciones derivadas de la operación.** El desarrollador vendedor asume todas las obligaciones y responsabilidades legales correspondientes."

Checkbox obligatorios al apartar:
- "He leído y acepto los Términos y Condiciones."
- "Entiendo que DesarrollosMX no es responsable del post-venta."
- "Autorizo el uso de mis datos para matching y análisis estadístico."

## Referencia visual

Ver Landing_v2.jsx (referencia portal público M19). El dashboard comprador usa Dopamine tokens pero con layout propio (no basado en módulos asesor).

## Cross-references

- ADR-002 AI-Native (personalización + Discover Weekly)
- ADR-003 Multi-Country (partners crédito MX only H1, LATAM H2)
- ADR-008 Monetization (free para compradores, revenue via lead generation a asesores)
- ADR-009 Security (disclaimers + consent)
- [FASE 20](../02_PLAN_MAESTRO/FASE_20_PORTAL_COMPRADOR.md)
- [FASE 18 Escrow](../02_PLAN_MAESTRO/FASE_18_LEGAL_PAGOS_ESCROW.md)
- [03.8 Scores IE](../03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md) — A01, A02, A05, A07, A08, A10, A11
- [03.7 Crons](../03_CATALOGOS/03.7_CATALOGO_CRONS.md) — `discover_weekly_generate`
- Módulos relacionados: M19 Marketplace (entry público), M20 Ficha Proyecto (personalizada)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent H) | **Fecha:** 2026-04-17
