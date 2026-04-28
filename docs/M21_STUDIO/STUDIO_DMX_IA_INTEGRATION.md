# DMX Studio + DMX IA — Qué incluye cada uno

> **Status**: Canon 2026-04-28 · Fase 14.F.12 cierre
> **ADR canónico**: [ADR-058 — DMX IA Add-on (paid tier separado)](../01_DECISIONES_ARQUITECTONICAS/ADR-058_DMX_IA_ADD_ON_PRICING_TIER.md)
> **Audiencia**: Founder + asesores onboarding + soporte + sales

---

## Resumen ejecutivo

Tres ideas a recordar siempre que un asesor pregunte "¿qué incluye mi plan Studio?":

1. **Studio Founder / Pro / Agency** incluyen acceso completo a **DMX CRM basic** — los módulos M01-M09 del portal asesor (captación, operaciones, leads, compradores, cartera, marketing, reportes, settings, onboarding) **sin features de IA predictiva**.
2. **DMX IA Add-on** (Atlas predictive scoring + Copilot semantic search + Smart Matching + AI Agents + Anomaly detection) es **paid tier separado opcional** — ningún asesor lo recibe automáticamente al pagar Founder/Pro.
3. **Studio Agency bundlea DMX IA por default**. **Founder y Pro NO bundlean** DMX IA — debe contratarse aparte cuando esté disponible H2.

---

## DMX CRM basic — lo que SÍ incluye cualquier plan Studio

| Módulo | Qué hace | Plan que lo incluye |
|---|---|---|
| **M01 Captación** | Lead capture forms públicos + auto-assignment | Founder · Pro · Agency |
| **M02 Operaciones** | Kanban operaciones + timeline + workflow stages | Founder · Pro · Agency |
| **M03 Leads** | Gestión leads + scoring básico (sin IA) | Founder · Pro · Agency |
| **M04 Compradores** | Perfilamiento + preferencias + buyer twins basic | Founder · Pro · Agency |
| **M05 Cartera** | Assignment + tracking unidades en venta | Founder · Pro · Agency |
| **M06 Marketing** | Campañas básicas + landing pages personalizadas | Founder · Pro · Agency |
| **M07 Reportes** | Dashboards básicos (sin IA narrativa) | Founder · Pro · Agency |
| **M08 Settings** | Configuración cuenta + branding personal | Founder · Pro · Agency |
| **M09 Onboarding asesor** | Auto-import perfil DMX + setup inicial | Founder · Pro · Agency |

**Resumen claro**: lo que un asesor compra al contratar Founder $997 MXN/mes es un CRM completo + portal asesor canon + workflow operaciones — equivalente a soluciones tipo Pulppo / EasyBroker / ApiBroker pero con UX prototype canon DMX y arquitectura multi-país lista.

---

## DMX IA Add-on — lo que NO incluye por default

| Feature IA | Qué hace | Plan que lo incluye |
|---|---|---|
| **Atlas predictive scoring** | Score zona+desarrollo predictive con horizontes H1-H6 + benchmarks colonia | Solo Agency (bundled) o Add-on |
| **Copilot semantic search** | Búsqueda matchings inversionistas vía embeddings + reranking | Solo Agency (bundled) o Add-on |
| **Smart Matching auto** | Recomendación auto matching busqueda↔unidad disponible vía Claude tool-use | Solo Agency (bundled) o Add-on |
| **AI Agents portal asesor** | Agentes autónomos: reportes + outreach personalizado + qualification leads | Solo Agency (bundled) o Add-on |
| **Anomaly detection mercado** | Alertas pricing zona + outliers comportamiento mercado | Solo Agency (bundled) o Add-on |

**Por qué NO bundleado en Founder/Pro**: cada call Claude Sonnet 4 cuesta entre $0.05 y $0.20 USD reales. Bundlear IA unlimited en plan $997 MXN rompería márgenes en cohort grandfathered de 100 asesores. Ver detalle en [ADR-058 §Context](../01_DECISIONES_ARQUITECTONICAS/ADR-058_DMX_IA_ADD_ON_PRICING_TIER.md).

---

## Tabla comparativa rápida

| | **Founder** $997 | **Pro** $2,497 | **Agency** $5,997 | **+ DMX IA Add-on** |
|---|---|---|---|---|
| DMX CRM basic (M01-M09) | ✓ | ✓ | ✓ | — |
| Single-user | ✓ | ✓ | Multi-user | — |
| Branding personal | ✓ | ✓ | Multi-brand | — |
| Modo Reseller | — | — | ✓ | — |
| Atlas predictive scoring | — | — | ✓ bundled | ✓ contratado aparte |
| Copilot semantic search | — | — | ✓ bundled | ✓ contratado aparte |
| Smart Matching auto | — | — | ✓ bundled | ✓ contratado aparte |
| AI Agents | — | — | ✓ bundled | ✓ contratado aparte |
| Anomaly detection | — | — | ✓ bundled | ✓ contratado aparte |
| Cohort grandfathered lifetime | ✓ (primeros 100) | — | — | — |

Todos los precios **MXN/mes** sin IVA. Pricing concreto DMX IA Add-on TBD H2 (founder definirá tiers Light/Standard/Pro post-launch — ver [ADR-058 §Decision](../01_DECISIONES_ARQUITECTONICAS/ADR-058_DMX_IA_ADD_ON_PRICING_TIER.md)).

---

## Roadmap activación H2

Pasos secuenciales para shippear DMX IA Add-on cuando founder dé GO post-launch Studio:

1. **Founder define pricing concreto** Light / Standard / Pro (sketch tiers en ADR-058 son orientativos, no commitment).
2. **Stripe price IDs** hardcoded en `features/dmx-ia/lib/stripe-products.ts` (futuro `features/dmx-ia/` siguiendo ADR-053 unified pattern).
3. **Feature flag `DMX_IA_ENABLED`** per user en Supabase (default `false`; Agency plan auto-activa post-checkout webhook).
4. **UI canon `PlanPaywallCanon`** mostrando paywall en features gated cuando Founder/Pro intentan acceder Atlas/Copilot/Smart Matching.
5. **Disclosure flag canon ADR-018** visible en cada call que consume tokens Claude (cost transparency obligatoria).
6. **Migration `subscription_addons`** o flag jsonb en `subscriptions.feature_set` (canon ADR-008 monetization tiers — schema actual ya soporta extension sin breaking change).
7. **Telemetría adoption** Studio Founder → Pro → Agency + DMX IA Add-on para iterar pricing data-driven post-validation.

---

## Mensajería onboarding asesor

Lo que un asesor recién contratado Founder o Pro debe escuchar (antes de que asuma que IA viene incluida):

> "Tu plan Studio Founder incluye DMX CRM completo: contactos, leads, búsquedas, captaciones, operaciones, marketing y reportes. Para features de IA predictiva (Atlas zona scoring, Copilot búsqueda semántica, Smart Matching automático, agentes autónomos), DMX IA Add-on estará disponible H2 post-launch — contacta soporte para early access."

Banner sugerido sub-agente 3 onboarding asesor F14.F.12 muestra esto al primer login del asesor con plan Founder/Pro.

---

## Preguntas frecuentes founder

**P: ¿Por qué no incluyo DMX IA en Pro $2,497?**
R: Asesor Pro promedio consumiría 30-80 calls Claude/mes según uso típico Atlas + Smart Matching. A $0.10 USD promedio per call → $80-160 USD cost solo en API. Pro tier $2,497 MXN ≈ $145 USD: margen quedaría 0% o negativo. Add-on resuelve cobrando por consumo real escalable.

**P: ¿Por qué Agency SÍ bundlea DMX IA?**
R: Agency $5,997 MXN ≈ $350 USD/mes. Multi-user (típicamente 3-5 asesores brokerage) reparte cost API per user. Premium tier sostiene IA bundled como diferenciador justificando el precio.

**P: ¿Qué pasa con cohort grandfathered Founder primeros 100?**
R: Mantienen $997 MXN forever con DMX CRM basic. Si quieren IA, contratan Add-on aparte cuando esté disponible. Lifetime grandfathered = solo plan base, no IA bundled.

**P: ¿Cuándo activar DMX IA Add-on?**
R: H2 post-launch Studio (~3-6 meses post-lanzamiento Founder/Pro/Agency). Founder valida primero signal demanda real + estabilidad costo API antes de commit pricing.

---

## Cross-refs canónicos

- **[ADR-058](../01_DECISIONES_ARQUITECTONICAS/ADR-058_DMX_IA_ADD_ON_PRICING_TIER.md)** — Decisión canon DMX IA Add-on separado de Studio Founder/Pro (este doc explica + ADR-058 fundamenta).
- **[ADR-054](../01_DECISIONES_ARQUITECTONICAS/ADR-054_DMX_STUDIO_INTEGRATED_WITHIN_DMX.md)** — Studio dentro DMX único entorno (mismo Supabase + Stripe + repo).
- **[ADR-053](../01_DECISIONES_ARQUITECTONICAS/ADR-053_FEATURE_MODULE_PATTERN_UNIFIED.md)** — Feature module pattern unified (futuro `features/dmx-ia/` directorio canon).
- **[ADR-018](../01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md)** — E2E connectedness + STUBs canon 4 señales para features no shipped.
- **[ADR-008](../01_DECISIONES_ARQUITECTONICAS/ADR-008_MONETIZATION_FEATURE_GATING.md)** — Monetization tiers canon (`subscriptions.feature_set` jsonb extension pattern).
- **Memoria canon `feedback_airroi_cost_empirical`** — Cost benchmarks API real-world (justifica margen tier separation).
- **Memoria canon `feedback_verify_before_spend`** — Validar pricing dashboard ANTES hardcodear price IDs.
- **[BIBLIA v5 §17](../biblia-v5/17_BIBLIA_DMX_v5_Decisiones_Hallazgos_Plan.md)** — Decisión Studio pricing 3 tiers MXN + DMX IA Add-on documentada.

---

## Notas de mantenimiento

- Si founder cambia pricing Studio (Founder/Pro/Agency), actualizar tabla §"Tabla comparativa rápida" + ADR-058 §Context.
- Cuando founder defina pricing concreto DMX IA Light/Standard/Pro, materializar i18n keys reservadas namespace `Studio.dmxIaAddon.*` (lista en ADR-058 §"i18n canon Tier 1").
- Cuando shippee Add-on H2: actualizar §Roadmap activación H2 → §"Estado activación shipped" con tag `fase-NN-dmx-ia-addon-shipped`.
- Cualquier cambio canon DMX IA pricing pasa por nuevo ADR (no editar ADR-058 — append delta-ADR).
