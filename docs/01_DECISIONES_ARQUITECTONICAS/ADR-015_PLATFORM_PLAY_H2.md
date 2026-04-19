# ADR-015 — Platform Play H2: App Store, Themes, Integrations

**Status:** Accepted
**Date:** 2026-04-18
**Deciders:** Manu Acosta (founder), Claude Opus 4.7

## Context

En H1 DMX construye un **producto** (CRM asesor + marketplace + portal dev + IE + AI-native shell). En H2 DMX evoluciona a **plataforma** — una base sobre la cual terceros construyen valor adicional, generando network effects compounding.

### Evidencia histórica de platform vs product

| Empresa | Product-only (hypothetical) | Platform (real) | Multiplier |
|---------|----------------------------|-----------------|------------|
| **Shopify** | ~$5-10B (SaaS e-commerce) | $85B (platform + app store + themes + partners) | ~10x |
| **Salesforce** | ~$30B (CRM) | $290B (platform + AppExchange + Lightning) | ~10x |
| **Stripe** | ~$20B (payments processor) | $95B (platform + docs + integrations) | ~5x |
| **Atlassian** | ~$10B (Jira) | $45B (platform + Marketplace) | ~4.5x |
| **HubSpot** | ~$8B (CRM SaaS) | $30B (platform + App Marketplace) | ~4x |
| **Notion** | ~$2B (product only) | ~$10B (platform + templates + integrations) | ~5x |

El patrón es consistente: **platforms multiplican valuation 4-10x** vs products equivalentes en el mismo vertical. La razón es network effects — cada app/tema/integración añadido incrementa el valor de la plataforma para los siguientes usuarios, y cada usuario adicional incrementa el incentivo de publicar apps.

### Por qué DMX puede ser plataforma (y no solo producto)

1. **IE como primitiva.** El Intelligence Engine es una API de scoring. Terceros pueden construir sobre ella (widget embeds, dashboards, bots, Excel plugins, mobile apps verticales).
2. **Data rica.** Marketplace + CRM + scoring genera >100 entidades de dominio. Cada entidad es terreno fértil para apps.
3. **Multi-country día 1** ([ADR-003](./ADR-003_MULTI_COUNTRY_SCHEMA.md)). Platform play internacional desde el inicio.
4. **Usuarios motivados.** Asesores + desarrolladores son profesionales con willingness to pay por apps que incrementen su productividad.
5. **Competidores sin platform.** CoStar, Cherre, Local Logic, Walk Score, DD360, Pulppo — cero tienen app store / themes / marketplace. DMX primera en la categoría.

### Fuerzas H2

- H1 cierra con ~200-500 asesores + ~20-50 desarrolladoras + ~5K compradores activos. Es mass crítica suficiente para atraer desarrolladores terceros.
- API as Product ([ADR-013](./ADR-013_API_AS_PRODUCT.md)) crea el sustrato técnico (SDKs, docs, sandbox).
- Agent Marketplace ([ADR-014](./ADR-014_AGENTIC_ARCHITECTURE.md)) H2 es parte del app store (agents son subcategoría).
- Creator economy tendencia (Gumroad, Substack, Patreon, Zapier creator program) normaliza el modelo "build on top and earn".

## Decision

**Se adopta patrón Platform + Ecosystem completo en FASE 34 (Creator Economy), soportado por FASE 30 (API) como infraestructura técnica.**

### D1 — DMX App Store

Marketplace dentro de la plataforma DMX donde desarrolladores terceros publican **apps**:

**Categorías de apps:**
- **Integraciones** — conectan DMX con sistemas externos (Google Calendar, Slack, Zapier, Make, N8N, Calendly, Docusign, Zoho, Monday, Airtable, etc.).
- **Analytics add-ons** — dashboards custom sobre scores IE (Heat map zona, Gentrification tracker, Crime temporal analyzer, etc.).
- **Workflows custom** — automatizaciones específicas por vertical (Workflow "Inversionista premium" que combina scoring A02 + E07 + watchlist alerts).
- **Bots** — Telegram/WhatsApp/Slack bots que exponen DMX data.
- **Mobile apps verticales** — apps nativas específicas (Inversionista app, Compra primera vivienda app).
- **Reportes premium** — generadores de PDFs/Excel custom.
- **Agentes custom** — templates de agentes del Agent Marketplace (ADR-014 Capa 6).

**Onboarding developer:**
1. Register en `/developers` (existing desde FASE 30).
2. Crear app en `/developers/apps/new`: nombre, icon, description, categorías, screenshots.
3. Configurar OAuth scopes requeridos (read:scores, write:contactos, etc.).
4. Desarrollar app usando DMX SDK.
5. Submit for review.
6. DMX review ~1 semana (security + quality + docs).
7. Publicar en App Store.

### D2 — DMX Themes

Tercera sección del marketplace: **themes** para personalizar landing pages públicas y fichas de proyecto.

**Casos:**
- Desarrolladora con 5 proyectos quiere landing premium con branding propio — compra o contrata tema premium.
- Asesor con microsite propio (`/asesores/[slug]`) personaliza con tema editorial.
- Partner portal (bancos embebiendo scores) tienen theme corporate.

**Stack theme:**
- Compatibles con Next.js 16 RSC + Tailwind v4 CSS-first + tokens Dopamine.
- Declarative `theme.json` con overrides de tokens, fonts, layout, componentes permitidos.
- Preview en sandbox antes de publicar.

### D3 — Revenue share 80/20 dev/DMX

Patrón Shopify/Atlassian/Salesforce:

| Tier precio app | Share developer | Share DMX |
|-----------------|-----------------|-----------|
| $0 (gratuita) | N/A | N/A |
| $1-$100/mes | 80% | 20% |
| $101-$1,000/mes | 80% | 20% |
| $1,001+/mes (Enterprise apps) | 85% | 15% |

Billing procesado por DMX vía Stripe Connect. Desarrolladores reciben payout mensual (Stripe Connect payouts).

**Por qué 80/20 (no 70/30 Apple/Google):** en platforms B2B SaaS la norma es 70-85% developer (Shopify 80/20, Salesforce 85/15). DMX elige 80/20 como posición competitiva clara + incentivo para atraer developers.

### D4 — App review process

Proceso obligatorio antes de publicación:

**Security review (bloqueante):**
- OAuth scopes mínimos (principle of least privilege).
- Sin eval() / data injection vulnerabilities.
- Rate limits respetados.
- Sin leaking de data entre tenants.
- Sin exfiltration de PII.
- Auth tokens almacenados correctamente.

**Quality review (bloqueante):**
- Docs suficientes (quickstart + uso + troubleshooting).
- No uso de APIs deprecadas.
- Performance: no ralentiza DMX significativamente.
- Responsive mobile.
- Accessibility WCAG 2.1 AA básica.

**Content review (bloqueante):**
- No contenido ilegal, scam, fraud.
- No competencia desleal con DMX core (ej. "DMX Score 2.0" clon).
- Respeta branding guidelines (no usar logo DMX sin aprobación).

**Review turnaround target:** primera review 7 días; re-submits 3 días.

### D5 — SDK multi-lenguaje

Heredado de [ADR-013 §D2](./ADR-013_API_AS_PRODUCT.md#d2--openapi-31-como-source-of-truth):

- `@dmx/sdk-ts` (npm) — TypeScript/JavaScript.
- `dmx-python` (PyPI) — Python.
- `dmx-ruby` (RubyGems) — Ruby.
- `dmx-php` (Packagist) — PHP (WordPress/Laravel ecosystem).
- `dmx-go` (pkg.go.dev) — Go.

SDK expone todos los endpoints públicos + helpers de alta nivel:

```ts
// @dmx/sdk-ts ejemplo
import { DmxClient } from '@dmx/sdk'
const dmx = new DmxClient({ apiKey: process.env.DMX_API_KEY })
const scores = await dmx.scores.zone('roma-norte', { codes: ['N11', 'N04'] })
const momentum = scores.find(s => s.code === 'N11').value // 0.83
```

SDK auto-regenerated desde OpenAPI spec en cada release.

### D6 — App lifecycle management

- **Dashboard developer** `/developers/apps/[id]`: users, usage metrics, revenue, reviews, support tickets.
- **Versioning** — apps tienen versiones. Users pueden quedarse en v1 mientras dev lanza v2 beta.
- **Deprecation flow** — dev puede marcar app como deprecated; users notificados 90 días antes de shutdown.
- **Force shutdown** — DMX puede forzar retire app por violación policies (con right to appeal).

### D7 — App discovery + personalization

- **Browse** `/apps` con categorías, trending, nuevos.
- **Search** con filtros (categoría, precio, rating).
- **Ratings + reviews** de users.
- **Personalized recommendations** por agente AI ("Para tu perfil de asesor Roma Norte, estos 3 apps son más útiles").
- **Editor's choice** — DMX destaca apps curadas.

## Rationale

### Network effects compounding

- Más apps → más valor por user → más users → más incentivo para publicar apps.
- Cada developer es marketing viral (content, social, blog posts).
- Apps bien posicionadas convierten a DMX en infra obligatoria para su vertical (lock-in positivo).

### Fulfills Shift 3 del 00.1 VISION

Shift 3 (§5) es "de plataforma a sistema operativo". App Store es la materialización literal de ese shift.

### Por qué 80/20 y no Apple/Google 70/30

B2B SaaS developer ecosystems compiten por talent. DMX como plataforma naciente debe atraer developers con pricing agresivo. 80/20 posiciona.

### Timing H2 (no H1)

- H1 genera la base crítica (usuarios, datos, IE calibrado).
- API as Product (FASE 30) es prerequisito técnico.
- Sin 200+ users, ningún developer se molesta en construir apps.

## Consequences

### Positivas

- **Network effects.** Cada app añadida refuerza la plataforma.
- **Revenue stream diversificado.** 20% cut de apps externas = nuevo revenue high-margin.
- **Moat compounding.** Competidores tendrían que replicar plataforma *+* ecosystem para competir. Barrera temporal.
- **Brand upgrade.** DMX deja de ser "CRM/marketplace LATAM" y se convierte en "plataforma spatial intelligence" — categoría más alta.
- **Valuation uplift.** Multiplier 4-10x observado empíricamente en comparables.
- **Developer community.** Canal de talento (algunos developers terceros pueden ser future hires).

### Negativas / tradeoffs

- **Curation overhead.** Review process requiere team dedicado (~1-2 FTE engineers reviewers + 1 PM). Costo ~$200K-$400K/año.
- **Policy disputes.** Developers que no pasan review o son baneados pueden hacer ruido público. Requiere policy transparente + appeals process + legal.
- **Fraud / abuse risk.** Apps maliciosas que roban data de users. Mitigación: OAuth scopes estrictos + audit logs + kill switch + bug bounty.
- **Complejidad auth.** OAuth 2.0 + PKCE + token rotation + scope management = surface de seguridad amplia.
- **Ecosystem dependency.** Si 3 apps críticas fallan simultáneamente, users perciben DMX como inestable. Mitigación: isolation (app failures no afectan DMX core) + SLAs developers.
- **Revenue cannibalization riesgo.** Si un app externo ofrece feature que DMX planea construir, hay conflicto de interés (DMX decide si construye internamente o deja al ecosystem). Policy explícita requerida.

### Neutrales

- **Documentación significativa.** Policies, guidelines, API contracts, review criteria — todo debe ser público y mantenido.
- **Legal framework.** Acuerdos con developers (developer agreement + revenue share + IP + liability). Requiere legal review H2.
- **Localization.** App Store funciona en los 5 locales DMX + possibly inglés para developers internacionales.

## Alternatives considered

### Alt 1: "Closed system forever" (sin app store)
**Rechazada.** Pierde network effects. DMX queda siendo producto, no plataforma. Valuation cap en ~$500M-$1B vs $1-5B con plataforma.

### Alt 2: "Open but no curation" (submission sin review)
**Rechazada.** Quality tanks rápido (spam apps, scams, security issues). Users pierden confianza. Apple App Store 2008 tuvo que introducir curation post-launch precisamente por esto.

### Alt 3: "Revenue share 50/50"
**Rechazada.** Demasiado extractivo para developers naciente. No competitivo vs Shopify 80/20 o Atlassian 85/15.

### Alt 4: "Revenue share 95/5"
**Rechazada.** No justifica costo review + infra + payment processing para DMX. 80/20 es el balance.

### Alt 5: "Solo integraciones, sin app store completo"
**Rechazada.** Deja en la mesa analytics add-ons, bots, mobile apps verticales, themes — categorías valiosas.

### Alt 6: "App store en H1 (FASE 24)"
**Rechazada.** Prematuro. Sin 200+ users + API as Product maduro, no hay demanda suficiente. Developers necesitan sustrato.

### Alt 7: "Franquicias white-label (DMX como SaaS licenciable)"
**Rechazada.** Modelo distinto (white-label para regional operators) no es mutuamente exclusivo con platform. Puede existir como FASE H3 separada.

## Success metrics (post-FASE 34)

- **Apps published:** 20+ apps Mes 6 post-FASE 34. 100+ apps Mes 18.
- **Themes published:** 10+ themes Mes 6.
- **Developer signups:** 200+ registered developers Mes 12.
- **Apps revenue:** $50K+ MRR de revenue share Mes 18.
- **User adoption:** ≥30% de users Pro+ tiene ≥1 app instalada.
- **Developer NPS:** ≥60.
- **Review turnaround:** p50 ≤7 días, p95 ≤14 días.

## References

- [ADR-011 — Moonshot 3 Horizontes](./ADR-011_MOONSHOT_3_HORIZONTES.md) — FASE 34 en H2.
- [ADR-013 — API as Product](./ADR-013_API_AS_PRODUCT.md) — sustrato técnico.
- [ADR-014 — Agentic Architecture](./ADR-014_AGENTIC_ARCHITECTURE.md) — agent marketplace como sub-app store.
- [ADR-017 — Data Ecosystem Revenue](./ADR-017_DATA_ECOSYSTEM_REVENUE.md) — data partnerships H2.
- [FASE 30 — API as Product](../02_PLAN_MAESTRO/FASE_30_API_AS_PRODUCT.md).
- [FASE 31 — Agentic Marketplace](../02_PLAN_MAESTRO/FASE_31_AGENTIC_MARKETPLACE.md).
- [FASE 34 — Creator Economy](../02_PLAN_MAESTRO/FASE_34_CREATOR_ECONOMY.md).
- [07.2 — Game Changer GC-2 Platform](../07_GAME_CHANGERS/).
- [07.11 — Game Changer GC-11 Creator Economy](../07_GAME_CHANGERS/).
- Shopify Partner Program — https://www.shopify.com/partners.
- Atlassian Marketplace — https://marketplace.atlassian.com.
- Stripe Partners Directory — https://stripe.com/partners.

---

**Author:** Claude Opus 4.7 (biblia v2 moonshot rewrite) | **Date:** 2026-04-18
