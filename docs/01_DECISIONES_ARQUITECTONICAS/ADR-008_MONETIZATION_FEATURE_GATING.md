# ADR-008 — Monetización en 3 fases + Feature Gating + Boundary Post-Venta

**Status:** Accepted
**Date:** 2026-04-17
**Deciders:** Manu Acosta (founder), Claude Opus 4.7 (Senior Review)

## Context

DesarrollosMX es un producto B2B2C con cuatro tipos de actores monetizables:

1. **Asesores inmobiliarios** (individuos): plataforma CRM con inteligencia + marketplace.
2. **Desarrolladoras (devs)**: portal completo con contabilidad, inventario, marketing, analytics IE, matching.
3. **Compradores**: portal personalizado Netflix-style, AI-native, marketplace; acceso gratis (cuenta con marketplace fee de venta pagado por el dev).
4. **Consumidores API** (bancos, aseguradoras, fondos, portales, fintechs, gobierno, academia): 7 productos licenciables del Intelligence Engine (DMX Livability API, Momentum Index, Risk Score, Site Selection, Market Intelligence Reports, COMPASS, Knowledge Graph).

El founder estableció (BRIEFING §2, pregunta 3) que los revenue streams no están 100% definidos pero sí lo está el **approach**: membresías para asesores + membresía + fee de cierre para devs + monetización API B2B en fase posterior. Y estableció de forma rotunda (BRIEFING §2, pregunta 4 + §11) que **DMX NO es responsable post-venta**. DMX es **infraestructura de marketplace + escrow + split payments + pre-aprobación crediticia + CFDI**, no el vendedor final. Esta distinción es crítica porque:

- Soporte post-venta (garantías de construcción, vicios ocultos, retrasos de entrega) es responsabilidad del desarrollador y los derechos del comprador.
- La relación legal de compraventa es entre comprador ↔ desarrollador, no comprador ↔ DMX.
- DMX ofrece salvaguardas (escrow release rules con entrega ok / rechazo válido / disputa UIF o tribunal) pero no se compromete a reparación.
- Esto debe quedar explícito en T&Cs, disclaimers visibles en UI compra, email de confirmación, CFDI.

Adicionalmente, el producto tiene ~120 features granulares que distintos planes deben exponer/ocultar. El repo viejo introdujo en v5-S0 las tablas `feature_registry` + `role_features` + `profile_feature_overrides` con función `resolve_features()` que aplica cascada override > role > global default. Esto es la infraestructura correcta; el rewrite la preserva conceptualmente pero re-diseña limpio.

Feature gating H1 existente en registry (fuente CONTEXTO §2):
- `feature_registry`: catálogo de features con key, nombre, descripción, plan_required, default_value (boolean o limit), country_scope jsonb.
- `role_features`: mapeo (rol × feature) con overrides.
- `profile_feature_overrides`: overrides por profile_id (trial extendido, enterprise custom).
- `resolve_features(profile_id)`: función que retorna objeto `{feature_key: enabled|limit}` tras aplicar cascada.

## Decision

### D1. Monetización en 3 fases temporales

**Fase 1 — Validación (H1, meses 1-6 post-launch)**
- **GRATIS** para asesores (piloto + onboarding). Sin membresía mensual.
- **GRATIS** para compradores (siempre).
- **Marketplace fee 0.5%** del valor de cierre pagado por el **desarrollador** en cada operación cerrada vía DMX. Fee retenido por el contrato de comisión del dev.
- **API B2B no monetizado** aún (acceso cerrado a partnerships piloto).
- **Objetivo**: validar retención, comisión promedio, absorción, y ajustar pricing Fase 2 con datos.

**Fase 2 — Monetización SaaS (H2, meses 6-18)**
- Asesores: **4 planes** (Free / Starter / Pro / Enterprise). Starter $499 MXN/mes, Pro $1,499, Enterprise custom.
- Desarrolladores: **4 planes** (Free / Starter / Pro / Enterprise) según capacidades contabilidad + IE + AI. Free 1 proyecto; Starter $999 MXN/mes (5 proyectos, 20 AI extractions/mes); Pro $2,999 (ilimitado, 50 extractions); Enterprise custom con API.
- Fee marketplace 0.5% del valor cierre se mantiene para devs con operaciones vía DMX.
- API B2B comienza a monetizar con Free tier (100 req/día) + Starter $5K + Pro $25K + Enterprise custom.

**Fase 3 — Intelligence Engine monetizado (H3, meses 18+)**
- Los 7 productos licenciables IE (Livability, Momentum, Risk, Site Selection, Market Intelligence Reports, COMPASS, Knowledge Graph) se monetizan con API externa.
- Planes API: Free (100/día) → Starter $5K MXN/mes (10K/día) → Pro $25K (100K/día) → Enterprise custom.
- Revenue split target H3: **40% marketplace / 35% API / 25% productos** (suscripciones asesor + dev).

### D2. Planes detallados (schema)

Tabla `plans` con columnas: `code`, `tier` (asesor|developer|api_external), `name`, `price_mxn_monthly`, `price_usd_monthly`, `active`, `order_display`.

Planes H1 semilla (Fase 23 Monetización):
- **Asesor Free / Starter / Pro / Enterprise**
- **Developer Free / Starter / Pro / Enterprise**
- **API External Free / Starter / Pro / Enterprise**

Tabla `subscriptions` con `user_id, plan_code, stripe_subscription_id, status, current_period_end, country_code`. Soporta Stripe MX + MercadoPago LATAM como processors.

### D3. Feature Gating — `feature_registry` + `role_features` + `profile_feature_overrides`

**Esquema (rewrite limpio)**:

```sql
CREATE TABLE feature_registry (
  key text PRIMARY KEY,                    -- ej. 'ai.copilot.persistent', 'marketplace.escrow'
  name text NOT NULL,
  description text,
  category text,                           -- ai | crm | marketplace | ie | marketing | contabilidad
  value_type text NOT NULL CHECK (value_type IN ('boolean','limit','string')),
  plan_required text,                      -- null => disponible en todos
  default_value jsonb NOT NULL,            -- {enabled: true} | {limit: 50} | {mode: "basic"}
  country_scope jsonb DEFAULT '["*"]',     -- lista de country_code o ["*"]
  created_at timestamptz DEFAULT now()
);

CREATE TABLE role_features (
  rol text NOT NULL,
  feature_key text REFERENCES feature_registry(key),
  value jsonb NOT NULL,
  PRIMARY KEY (rol, feature_key)
);

CREATE TABLE profile_feature_overrides (
  profile_id uuid REFERENCES profiles(id),
  feature_key text REFERENCES feature_registry(key),
  value jsonb NOT NULL,
  reason text,                             -- ej. 'trial extendido', 'partner enterprise'
  expires_at timestamptz,
  PRIMARY KEY (profile_id, feature_key)
);

CREATE FUNCTION resolve_features(p_profile_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER ...
-- Cascada: override > role > plan > global default
```

**Helpers TypeScript (shared/lib/features/)**:

```typescript
// Server-side
const features = await resolveFeatures(profileId)
if (!features['ai.copilot.persistent']?.enabled) throw new ForbiddenError()

// checkFeatureLimit: { limit: 50, consumed: 32 } => ok
await checkFeatureLimit(profileId, 'ai.extractions.monthly')
```

**Convención de naming**: `<category>.<feature>.<subfeature?>` ej. `ai.copilot.persistent`, `marketplace.escrow`, `ie.scores.momentum`, `contabilidad.cfdi.complementos`.

### D4. Seed H1 — ~120 features registradas

Features distribuidas en 8 categorías:
- **ai.** (~18): copilot persistent, command palette, voice input, memory cross-session, extractions, generations por tipo.
- **crm.** (~22): contactos ilimitados, busquedas pipeline, captaciones Kanban, operaciones wizard, etc.
- **marketplace.** (~15): escrow, split payments, pre-approval credit, family accounts, referrals, whatsapp primary, QR codes.
- **ie.** (~20): zone_scores basic/premium, project_scores, user_scores, indices DMX-IPV/IAB/IDS/IRE/ICO/MOM/LIV, confidence cascade, tiers.
- **marketing.** (~10): landings, QR, whatsapp templates, email, automation rules.
- **contabilidad.** (~12): CFDI, bank reconcile, payouts, AML/KYC, ESG.
- **ops.** (~10): realtime, notifications, webhooks, exports.
- **api.** (~13): rate limits por plan, endpoints habilitados, bulk access, historical data.

### D5. STATUS_MAP + UI gating

UI consume `resolveFeatures(profileId)` y renderiza:
- **Enabled**: componente normal.
- **Disabled por plan**: overlay con CTA "Upgrade to Pro" + link a `/plans`.
- **Limit reached**: badge "24/50 este mes" + warning antes del 100%.
- **Country out of scope**: oculto totalmente (ej. `contabilidad.cfdi.complementos` oculto en CO).

### D6. Fee marketplace 0.5% del valor cierre

- Se aplica **al desarrollador**, no al comprador.
- Trigger BD `calculate_marketplace_fee BEFORE INSERT/UPDATE ON operaciones` calcula `marketplace_fee = valor_cierre * 0.005` cuando `estado = 'cerrada'` y `origen_operacion = 'dmx'`.
- Fee se descuenta del payout al dev vía Stripe Connect Split Payment automatizado.
- Visibilidad: UI dev muestra "Comisión DMX Marketplace" como línea separada en el estado de cuenta.

### D7. Boundary Post-Venta — DMX NO es responsable

**Cláusulas explícitas en T&Cs (FASE 18 Legal):**

> "DesarrollosMX opera como plataforma de intermediación tecnológica. La relación legal de compraventa se establece entre el Comprador y el Desarrollador. DesarrollosMX no es parte de dicha relación de compraventa ni asume responsabilidad por (i) entregas, (ii) calidad de construcción, (iii) garantías, (iv) vicios ocultos, (v) retrasos o (vi) disputas no resueltas por los medios de resolución ofrecidos por la plataforma."
>
> "DesarrollosMX ofrece como servicios de infraestructura: (a) escrow transparente con reglas de liberación públicas, (b) firma electrónica NOM-151 compliant, (c) CFDI 4.0 timbrado automático, (d) resolución de disputas asistida por agente IA y escalable a UIF o tribunal competente, (e) split payments automáticos."

**UI disclaimers visibles:**
- Landing page `/` footer y FAQ.
- Ficha de proyecto `/proyectos/[id]` tab "Términos" con disclaimer fijo.
- Flow de compra paso "Apartado": disclaimer como cláusula checkbox obligatoria.
- Confirmación de operación cerrada: email + in-app banner permanente.

**Escrow release rules explícitas (módulo legal FASE 18):**
- **Entrega ok**: comprador confirma recepción → escrow libera 100% al dev.
- **Rechazo válido** (defecto documentable con evidencia): escrow retenido + flow de disputa iniciado.
- **Disputa UIF**: si operación >$200K USD, UIF MX puede trabar según normativa AML; escrow retenido hasta resolución.
- **Tribunal**: si disputa no resuelta en 45 días (plazo configurable), escrow escalado a mediación o tribunal competente; DMX congela escrow pero **no decide** el fondo del asunto.
- **Timeout**: si comprador no confirma en 7 días naturales post-entrega + sin disputa abierta, escrow libera automáticamente al dev.

## Rationale

Se eligió este enfoque porque:

1. **3 fases temporales separan validación de monetización**: lanzar con precios altos antes de validar product-market fit arriesga rechazo piloto. Fase 1 gratis minimiza fricción; Fase 2 monetiza con data de Fase 1.
2. **Fee marketplace 0.5% es competitivo y sostenible**: significativamente menor al fee Pulppo/Inmuebles24 (típicamente 1-3% o membresía+fee). Permite captura sin desplazar al dev a otros canales.
3. **Feature registry desacopla código de pricing**: cambiar el plan que habilita `ai.copilot.persistent` no requiere deploy, sólo UPDATE en `feature_registry`. Esto acelera experimentos de monetización.
4. **Boundary post-venta protege a DMX de demandas improcedentes**: la experiencia de marketplaces LATAM (Mercado Libre, Airbnb, Rappi) muestra que sin delimitación legal clara, la plataforma absorbe riesgo desproporcionado.
5. **Escrow transparente con reglas públicas** construye confianza sin comprometer responsabilidad: el comprador sabe exactamente cuándo se libera el dinero; DMX no decide, solo opera reglas.
6. **Disclaimers visibles reducen fricción legal post-hoc**: más vale explicar claramente al inicio que disputar en tribunal después.

## Consequences

### Positivas
- **Time-to-launch rápido** con Fase 1 gratis: no hay que integrar Stripe MX + MercadoPago + Wompi en FASE 18 producción plena para vender.
- **Feature gating granular permite experimentación**: A/B de "Pro con/sin Copilot" vía PostHog flags sincronizados con `feature_registry`.
- **Revenue diversificado H3**: 40% marketplace + 35% API + 25% suscripciones reduce dependencia de un único channel.
- **Boundary legal claro**: DMX puede escalar asesores/devs/compradores sin heredar responsabilidad post-venta.
- **Escrow como diferenciador**: competidores regionales no ofrecen escrow transparente + split payments automáticos. Es moat de producto.
- **API B2B como revenue stream H3 independiente**: el IE tiene valor más allá del marketplace (aseguradoras, bancos, fondos).

### Negativas / tradeoffs
- **Complejidad seed ~120 features**: mantener el registry sincronizado con el código exige disciplina. Mitigación: catalogo en `03_CATALOGOS/03.10_CATALOGO_FEATURES_REGISTRY.md` como SSoT, y CI check que valida que toda llamada a `features['<key>']` en código corresponde a una entry en registry.
- **STATUS_MAP y overlays UI**: renderizar disabled states con CTA upgrade requiere componente shared (`<FeatureGate />`) usado en cada lugar. Disciplina alta para agentes paralelos.
- **Disclaimers reducen fricción legal pero pueden reducir conversión**: disclaimer agresivo en flow de compra puede asustar a compradores primerizos. Mitigación: copywriting cuidadoso + progresión gradual (disclaimer breve inicial + T&Cs detallados en link).
- **Escrow release rules requieren integración con Mifiel (firma) + Stripe Connect (custody) + tribunal gateway (H3)**: complejidad operativa no trivial en FASE 18.
- **Fee 0.5% puede ser bajo**: si volumen H1 es bajo, revenue marketplace es marginal. Mitigación: planes dev SaaS compensan con MRR estable.
- **Dependencia Stripe Connect + MercadoPago**: ambos tienen cambios de políticas y comisiones externas. Mitigación: adapter pattern en `shared/lib/payments/` permite swap.
- **Feature gating puede romper UX**: si asesor Free ve botón "Copilot" pero al hacer click ve upgrade modal, siente bait-and-switch. Mitigación: UX explícito "Copilot (Pro)" desde inicio + trial gratis 14 días.

### Neutrales
- **Catálogo `plans`** es data, no código. Se puede iterar pricing sin deploy.
- **Cross-country pricing**: planes en MXN H1; COP/ARS/BRL via FX H2. Stripe maneja multi-currency nativamente.
- **Referral program** (desde día 1 según BRIEFING §3) se implementa como feature desde Fase 01; trackeado vía PostHog + incentivos cross-plan.

## Alternatives considered

### Alt 1: Pricing flat (una sola suscripción por tier)
Asesor $999/mes sin features tiered, todo incluido. **Descartada** porque:
- Pierde oportunidad de upsell (Pro features marginales pero valiosas).
- No permite capturar valor de usuarios enterprise.
- Friccionaba validación Fase 1 (no hay modelo intermedio gratis).

### Alt 2: Usage-based only (pay-per-use)
Cobrar por AI query, por CFDI timbrado, por operación cerrada. Sin membresías. **Descartada** porque:
- Impredecible para el usuario (factura sorpresa).
- Dificulta forecasting revenue para DMX.
- Complejidad alta de billing para H1.
- Revisable como complemento H3 (overages sobre límites de plan).

### Alt 3: Freemium infinito (siempre hay tier gratis)
Plan Free permanente con features bastante completas. **Descartada** parcialmente — SÍ se mantiene Free tier en los 3 tiers, pero con límites estrictos (Free asesor = hasta 10 contactos, Free dev = 1 proyecto, Free API = 100 req/día).

### Alt 4: DMX como responsable post-venta con comisión alta (5-8%)
Asumir responsabilidad de entrega/garantías con comisión agresiva que financie call center + legal team. **Descartada** explícitamente por el founder (BRIEFING §2 p4, §11). Razones técnicas:
- Carga operativa excesiva (call center multi-country, legal team per country).
- Riesgo legal asimétrico (un caso grave de vicio oculto puede costar millones).
- Modelo no-escalable con piloto de 2 personas.
- Regulación AMPI/CANADEVI/fideicomisos ya asigna responsabilidades al dev; intentar superponerse es improductivo.

## References
- `../BRIEFING_PARA_REWRITE.md` §2 preguntas 3 + 4, §11 "lo que founder quiere/no quiere"
- `../CONTEXTO_MAESTRO_DMX_v5.md` §2 (tablas permisos v5-S0), §13 (productos B2B), §16.3 (planes dev)
- `../biblia-v5/11_INSTRUCCIONES_MAESTRAS_20Sesiones_245Upgrades.md` (precauciones comerciales)
- `../biblia-v5/10_IE_PART5_Cascadas_Productos_Competencia.md` §12 (productos licenciables)
- `../02_PLAN_MAESTRO/FASE_18_LEGAL_PAGOS_ESCROW.md` (escrow release rules)
- `../02_PLAN_MAESTRO/FASE_23_MONETIZACION.md` (implementación)
- `../03_CATALOGOS/03.10_CATALOGO_FEATURES_REGISTRY.md` (registry SSoT)
- `../03_CATALOGOS/03.11_CATALOGO_PRODUCTOS_B2B.md` (7 productos licenciables)
- ADR-003 Multi-country (payment processors per country)
- ADR-009 Security Model (AML/KYC + audit)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent B) | **Fecha:** 2026-04-17
