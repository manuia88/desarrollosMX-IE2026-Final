# ADR-058 — DMX IA Add-on (paid tier separado de Studio Founder/Pro/Agency)

**Status**: Accepted 2026-04-28 · Founder OK
**Deciders**: Manu (founder) + PM
**Sub-bloque**: FASE 14.F.12 (Sprint 11+12 BIBLIA mini-cleanup + master tag fase-14-complete)
**Related ADRs**: ADR-054 (DMX Studio integrated within DMX), ADR-053 (feature module pattern unified), ADR-018 (E2E connectedness + STUBs 4 señales), ADR-008 (monetization tiers canon)

---

## Context

FASE 14.F (M21 DMX Studio) ship en 12 sub-fases produce 3 tiers MAIN canon:

- **DMX Studio Founder** $997 MXN/mes — entry-level lifetime cohort 100 grandfathered.
- **DMX Studio Pro** $2,497 MXN/mes — tier estándar para asesores activos.
- **DMX Studio Agency** $5,997 MXN/mes — multi-user + IA bundled + Modo Reseller.

Cada plan Studio incluye acceso completo al **DMX CRM basic** (M01 Captación + M02 Operaciones + M03 Leads + M04 Compradores + M05 Cartera + M06 Marketing + M07 Reportes + M08 Settings + M09 Onboarding asesor — los módulos del portal asesor sin features de IA predictiva).

Sin embargo, el catálogo IA propio de DesarrollosMX (denominado coloquialmente **"DMX IA"**) — features que consumen tokens Claude Sonnet 4 + embeddings + scoring zonas — NO está incluido en los planes Studio Founder/Pro. Estos features son:

1. **Atlas predictive scoring** — score zona+desarrollo predictive H1-H6 horizontes con benchmarks colonia.
2. **Copilot semantic search** — búsqueda matchings inversionistas vía embeddings + reranking.
3. **Smart Matching** — recomendación auto matching busqueda↔unidad disponible vía Claude tool-use.
4. **AI Agents portal asesor** — agentes autónomos generación reportes + outreach personalizado + qualification leads.
5. **DMX Atlas anomaly detection** — alertas pricing zona + outliers comportamiento mercado.

Razones para mantener DMX IA como tier add-on separado y no bundlearlo en Studio:

1. **Cost API real-world.** Cada call Claude Sonnet 4 cuesta ~$0.05–0.20 USD (memoria canon AirROI cost empírico): bundlear unlimited en plan $997 MXN romperia márgenes en cohort grandfathered.
2. **Adopción gradual.** Manu objetivo escala masiva 1000+ asesores Studio H2; solo subset (estimate 10-30%) consumirá IA features con suficiente regularidad para justificar premium pricing — paradigma "razor + blades" canon SaaS.
3. **Pricing tier futuro TBD.** Founder no determinó pricing concreto DMX IA Add-on todavía — defer decisión post-launch Studio cuando exista signal real demanda + data costo real per-asesor activo.
4. **Modular subscription canon.** ADR-008 monetization tiers contempla extension via `subscriptions.feature_set` jsonb + `subscription_addons` tabla future — DMX IA Add-on encaja como segundo product_id Stripe additional al base Studio plan.
5. **Founder decision separation.** Mantener DMX IA pricing decision separado evita scope creep en F14.F.12 mini-cleanup; agendado para FASE 15+ cuando portal developer monetization define tier completo IE scores premium.

---

## Decision

### Regla canónica — DMX IA es paid add-on separado, NO incluido por defecto en Studio Founder/Pro

> **DMX IA Add-on es un tier opcional adicional a cualquier plan Studio (Founder/Pro/Agency). Studio Agency sí bundlea DMX IA por default** (justificación: tier premium $5,997 MXN/mes incluye todas las capabilities). **Founder y Pro NO bundlean DMX IA — debe contratarse aparte cuando esté disponible H2.**

### Pricing tier futuro (TBD — decisión separada post-launch Studio)

Documentación sketch tiers posibles (NO commitment, ejemplo orientativo):

- **DMX IA Light** ~$XXX MXN/mes — 50 calls/mes Claude Sonnet 4 + 100 embeddings/día + Atlas scoring básico zona.
- **DMX IA Standard** ~$XXX MXN/mes — 200 calls/mes + unlimited embeddings + Smart Matching + Atlas scoring full.
- **DMX IA Pro** ~$XXX MXN/mes — unlimited calls + AI Agents + Copilot semantic search + anomaly detection + priority queue.

Cost API benchmark referencia (memoria canon `feedback_airroi_cost_empirical`):

- Claude Sonnet 4: ~$0.05–0.20 USD per call (depende prompt+output tokens).
- Embeddings text-embedding-3-large: ~$0.0001 USD per 1K tokens.
- Reranking voyage-2: ~$0.05 USD per 1K queries.

Markup margen sugerido: 3-4x cost real para sostener crecimiento + soporte técnico canon SaaS.

### Implications técnicas

**BD (Supabase qxfuqwlktmhokwwlvggy):**

- Sin migrations FASE 14.F.12. Schema actual `subscriptions` + `studio_users_extension` ya soporta extension via `feature_set` jsonb (canon ADR-008).
- DMX IA Add-on activación H2: se agregará tabla `subscription_addons (id, subscription_id, addon_product_id, status, activated_at)` o flag canon en `subscriptions.feature_set jsonb`.

**Feature flags & gating canon ADR-018:**

- Crear feature flag canon `DMX_IA_ENABLED` per user, default false.
- Studio Agency plan: flag activado bundle automáticamente post-checkout.
- Studio Founder/Pro: flag false hasta contratación add-on (paywall canon `PlanPaywallCanon` cuando intenta acceder Atlas/Copilot/Smart Matching).
- Helper canon `lib/feature-flags.ts` extension futuro: `function hasDmxIaAccess(subscription): boolean`.

**Stripe canon:**

- Sin price IDs nuevos en F14.F.12. DMX IA Add-on price IDs Stripe se crearán cuando founder defina pricing tier (post-launch).
- Constants futuras canon: `DMX_IA_LIGHT_PRICE_ID`, `DMX_IA_STANDARD_PRICE_ID`, `DMX_IA_PRO_PRICE_ID` — todas hardcoded en `features/dmx-ia/lib/stripe-products.ts` cuando feature exista.

**UI canon ADR-050:**

- En Studio dashboard: badge "DMX IA Add-on" disponible solo Agency plan (o post-contratación paid tier).
- Founder/Pro plans: tarjeta paywall canon `PlanPaywallCanon` con CTA "Activar DMX IA Add-on" cuando intentan acceder feature gated.
- Disclosure flag canon ADR-018 visible cuando feature consume tokens Claude (cost transparency).

**i18n canon Tier 1 (es-MX + en-US):**

- Keys reservadas namespace `Studio.dmxIaAddon.*`:
  - `dmxIaAddon.title`: "DMX IA Add-on"
  - `dmxIaAddon.subtitle`: "Extiende tu plan Studio con IA predictiva, búsqueda semántica y agentes autónomos"
  - `dmxIaAddon.featureAtlas`: "Atlas predictive scoring zona + desarrollo"
  - `dmxIaAddon.featureCopilot`: "Copilot búsqueda semántica matchings"
  - `dmxIaAddon.featureSmartMatching`: "Smart Matching auto recomendaciones"
  - `dmxIaAddon.featureAgents`: "AI Agents reportes + outreach"
  - `dmxIaAddon.featureAnomaly`: "Anomaly detection pricing + outliers"
  - `dmxIaAddon.ctaContact`: "Contactar para activar"
  - `dmxIaAddon.bundledAgency`: "Incluido en plan Agency"
- En F14.F.12 NO se materializan keys (defer H2 cuando feature shippee).

---

## Consequences

### Positive

1. **Margen sostenido cohort grandfathered.** Founder $997 MXN/mes sostiene márgenes razonables porque NO incluye API IA tokens unlimited (que romperían cost-per-user en escala 100 grandfathered).
2. **Pricing flexibility H2.** Founder puede experimentar pricing DMX IA tiers Light/Standard/Pro sin re-negociar plan Studio base — tabla `subscriptions` + addon ledger desacoplados.
3. **Adoption signal.** Conversión Studio Founder → Studio Pro → Studio Agency + DMX IA Add-on indica claramente ROI percibido per asesor — telemetría canon useful para iterar pricing.
4. **Docs canon claros.** Ambigüedad común "Studio incluye IA?" zanjada explícitamente: NO en Founder/Pro, SÍ en Agency, opcional add-on en cualquier tier.
5. **Codebase preparado.** F14.F.12 deja feature flag `DMX_IA_ENABLED` + paywall canon listo para activación H2 sin refactor mayor.

### Negative

1. **Onboarding asesor confusión potencial.** Asesor que pague Founder $997 MXN/mes puede esperar IA features automáticamente — UX onboarding debe explicitar diferencial clara entre "DMX CRM basic incluido" vs "DMX IA Add-on opcional".
2. **Stripe billing dual-product.** Asesor con Studio Pro + DMX IA Standard gestionará 2 line items en factura — UX billing settings debe agrupar visualmente (mismo `subscriptions` row con `feature_set` jsonb expand, o 2 subscriptions rows linkeadas).
3. **Pricing comparison tabla compleja.** Landing /studio incluirá tabla 3 columns (Founder/Pro/Agency) + subnota "DMX IA Add-on contratable separado por XXX MXN/mes" — riesgo cognitive overload para founder no técnico.
4. **Documentación cross-feature.** ADR-058 + ADR-054 + ADR-008 + roadmap H2 deben mantenerse coherentes — actualización manual cada vez que cambie pricing canon.

### Mitigation

- F14.F.12 sub-agente 4 actualiza `docs/biblia-v5/17_BIBLIA_DMX_v5_Decisiones_Hallazgos_Plan.md` para reflectar la separación + docs `STUDIO_DMX_IA_INTEGRATION.md` explicando claramente qué incluye Studio vs DMX IA.
- UX onboarding asesor F14.F.12 sub-agente 3 (auto-import) muestra banner diferencial: "Tu plan Studio Founder incluye DMX CRM completo. Para IA predictiva (Atlas, Copilot, Agents) contrata DMX IA Add-on H2."
- Landing /studio/pricing tabla incluye nota explicit footer: "DMX IA Add-on disponible H2 post-launch — contacta soporte para early access."

---

## Alternatives considered

### A. Bundle DMX IA en TODOS los planes Studio (Founder + Pro + Agency)

**Pros**: Onboarding más simple, "Studio incluye todo" pitch claro.
**Cons**: Margen Founder $997 MXN/mes negativo si asesor consume 50+ Claude calls/mes; cost-per-user runaway risk para grandfathered cohort 100.
**Resolución**: Rechazada. Margen sostenibilidad > simplicidad onboarding.

### B. Sin tier add-on — DMX IA solo Agency

**Pros**: Pricing canon más simple (Founder/Pro = CRM only, Agency = CRM + IA).
**Cons**: Asesor Pro $2,497 MXN/mes que necesita ocasionalmente Atlas scoring no puede pagar incremental — fuerza upgrade $5,997 MXN/mes Agency aunque solo necesite IA, no Multi-user/Reseller.
**Resolución**: Rechazada. Razor+blades modular permite asesores Pro + IA Light por menos costo total que Agency forzado.

### C. DMX IA pay-per-call (no tier subscription)

**Pros**: Justo cost-per-use, sin minimum monthly fee.
**Cons**: UX impredecible (factura variable mensual), retention bajo (asesores cancelan post-uso esporádico), opex ops complex.
**Resolución**: Rechazada. SaaS canon recurring revenue > pay-per-call usage-based.

---

## References

- ADR-008 — Monetization Tiers (subscriptions table + feature_set jsonb canon).
- ADR-018 — E2E Connectedness (STUBs 4 señales canon para features no shipped).
- ADR-053 — Feature Module Pattern Unified (futuro `features/dmx-ia/` directorio).
- ADR-054 — DMX Studio Integrated Within DMX (Studio shares Stripe + Supabase).
- Memoria canon `feedback_airroi_cost_empirical` — Cost benchmarks API real-world.
- Memoria canon `feedback_verify_before_spend` — Validar pricing dashboard ANTES hardcodear price IDs.
- BIBLIA v5 sec 17 — Decisión actualizada Studio pricing 3 tiers MXN + DMX IA Add-on documentado separado.

---

## Notas operativas

- F14.F.12 NO crea Stripe price IDs DMX IA (defer H2 hasta founder defina pricing concreto).
- F14.F.12 NO crea feature flag `DMX_IA_ENABLED` runtime (defer H2 cuando feature shippee).
- F14.F.12 SÍ documenta canon en este ADR + cross-refs en BIBLIA v5 + docs/M21_STUDIO/STUDIO_DMX_IA_INTEGRATION.md.
- Master tag `fase-14-complete` cierra FASE 14 entera con DMX IA Add-on canon establecido.
