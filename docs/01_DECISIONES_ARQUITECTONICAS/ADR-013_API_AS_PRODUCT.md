# ADR-013 — API as Product (Stripe-like) desde FASE 30

**Status:** Accepted
**Date:** 2026-04-18
**Deciders:** Manu Acosta (founder), Claude Opus 4.7

## Context

El plan original DMX contemplaba una **API externa** como parte de FASE 23 (Monetización), con endpoints REST básicos, documentación Swagger, y tiers de pricing (Starter $5K/mes, Pro $25K/mes, Enterprise custom — ver CONTEXTO §21 Fase 3).

El pivot moonshot ([ADR-011](./ADR-011_MOONSHOT_3_HORIZONTES.md)) eleva la API de "monetización adicional" a **producto primario de H2+**, con target H3 de **35% del revenue total** ($1.75M-$8.75M MRR sólo de API en H3).

El contexto que fuerza esta elevación:

### Estudio comparativo de valuations platform vs product

| Empresa | Valuation | Categoría | Diferenciador |
|---------|-----------|-----------|---------------|
| **Stripe** | $95B (2024) | Payments API | Docs-first; API *is* the product |
| Adyen | $50B | Payments | Infra + Merchant services |
| Square | $35B | POS + payments | Consumer-facing |
| PayPal | $65B | Payments legacy | Brand + scale |
| **Twilio** | $12B | Communications API | Docs + SDKs multi-lenguaje |
| **Plaid** | $13B (priv.) | Banking APIs | Developer experience |
| **Nvidia** | $3T+ | Compute + CUDA | Framework moat |
| **AWS** | (Amazon ~$1.8T) | Cloud APIs | Every service an API |

Stripe en particular vale **~2x** su competencia directa precisamente por la **calidad del developer experience**. Su CEO Patrick Collison lo describió: *"Docs are the product."*

### Competidores del vertical spatial intelligence

- **CoStar** tiene API pero oculta, cerrada, no documentada públicamente. Developer experience inexistente.
- **Cherre** tiene API B2B con contratos custom; docs internos, no autoservicio.
- **Local Logic** tiene API B2B pero con onboarding sales-led, no developer-led.
- **Walk Score** (Redfin) tiene API documentada pero rate-limited y solo 3 scores.
- **Zillow** tiene API deprecada; ahora solo partnership deals.

La oportunidad: **no existe en spatial intelligence un player "Stripe de scores"**. Si DMX construye docs-first API as product, captura la categoría developer-first antes que los players actuales reaccionen.

### Forzas adicionales

1. **Credibility loop.** Bancos, aseguradoras, fintechs, portales que **citan** scores DMX en sus productos crean credibilidad institucional. CoStar reporta que "DMX Score" mencionado en un pitch de competidor *ayuda* a DMX más que a CoStar (flywheel paso 5, §6 visión).
2. **Third-party embedding.** Portales terceros integran `<DmxScore zone="roma-norte" />` como widget — tráfico orgánico permanente.
3. **Developer ecosystem.** Desarrolladores independientes construyen aplicaciones consumiendo DMX API (dashboards personalizados, bots Telegram, Slack integrations, Excel plugins). Cada app es marketing viral.
4. **Pricing power.** Una API de valor alto con docs de clase mundial puede cobrar 10x lo que cobra una API mediocre. Target $5K-$500K/cliente/año vs CoStar $300-500/usuario.
5. **Sin API as product, DMX se commoditiza en 24 meses** — Cherre y Local Logic ya tienen tracks B2B; si DMX no defiende el flanco developer-first, uno de ellos (o un nuevo entrante con capital) toma la categoría.

### Por qué no antes de H2

En H1 (FASE 23), DMX tiene una **API básica** (REST, OpenAPI básico, rate limit por plan) orientada a 3-5 clientes B2B iniciales. Eso es suficiente para generar primeras señales de demanda. No tiene sentido invertir en docs portal Stripe-level, SDKs multi-lenguaje, devrel, antes de:
- Tener ≥ 3 clientes API B2B pagando (no gratuitos).
- Tener scores calibrados con datos reales (H1 termina con Tier 1 calibrado).
- Tener headcount DevRel (que entra en H2 cuando Series A cierra).

Por eso la decisión es construir API básica en H1 pero **elevarla a producto full** en FASE 30 (H2).

## Decision

**Se adopta el patrón "API as Product" completo desde FASE 30 (H2), con los siguientes componentes obligatorios:**

### D1 — Stripe-like Developer Portal (`/developers`)

Portal público sin auth con:

- **Landing developer** inspirada en `stripe.com/docs`: hero con "curl" ready-to-copy, tabla de endpoints por caso de uso, quickstart 5-minute.
- **Interactive examples** — cada endpoint tiene un widget ejecutable en el navegador (tipo Swagger UI pero con diseño custom).
- **SDKs multi-lenguaje:** TypeScript, Python, Ruby, PHP, Go. Publicados en npm/PyPI/RubyGems/Packagist/pkg.go.dev bajo `@dmx/*` o `dmx-*`.
- **API reference autogenerada** desde OpenAPI 3.1 spec con Redoc o Fern.
- **Code samples** en 5 lenguajes × 20+ use cases.
- **Migration guides** entre versiones (v1 → v2).
- **Changelog público** con breaking changes.
- **Status page** público (Vercel Status + Statuspage.io pattern).

### D2 — OpenAPI 3.1 como source of truth

Una sola fuente de verdad en `/specs/openapi.yaml`:

- Endpoints, schemas, ejemplos, rate limits, auth, errores, webhooks.
- CI valida que cada endpoint implementado tiene entry en OpenAPI y viceversa.
- Genera SDKs automáticamente con `openapi-generator` o Fern.
- Genera docs automáticamente con Fern.dev o Redoc.
- Clientes pueden importar spec en Postman, Insomnia, Paw, Bruno.

### D3 — Versioning semver explícito

- **v1** — stable. Soportada mínimo 24 meses post deprecation notice.
- **v2 beta** — preview de cambios breaking.
- **v0** — no se expone públicamente.
- Cada versión vive en `/api/v{N}/*`.
- Headers `Dmx-Api-Version: 2025-06-15` para version pinning (patrón Stripe).
- Deprecation avisos en headers + email + developer dashboard + changelog.

### D4 — Rate limits tier-based

| Tier | Queries/día | Concurrencia | Precio | SLA |
|------|-------------|--------------|--------|-----|
| **Free (Dev)** | 100 | 2 | $0 | Best effort |
| **Starter** | 10,000 | 10 | $99/mes | 99% |
| **Pro** | 100,000 | 50 | $999/mes | 99.9% |
| **Business** | 1,000,000 | 200 | $4,999/mes | 99.9% |
| **Enterprise** | Ilimitado | Ilimitado | Custom ($25K+/mes) | 99.95% + dedicated support |

Rate limiting implementado con Upstash Redis (sliding window por API key). Respuesta 429 con header `Retry-After` + `X-RateLimit-Remaining`.

### D5 — Webhooks bidireccionales

**Eventos DMX → cliente:**
- `score.changed` — score de zona/proyecto/usuario cambió > threshold.
- `index.updated` — índice DMX-MOM/DMX-LIV/etc. tiene nuevo período.
- `momentum.shifted` — zona cambió de alcista a bajista (o viceversa).
- `market.alert` — anomalía detectada (spike volumen, caída precio zona, etc.).
- `snapshot.created` — nuevo snapshot disponible para consulta histórica.

**Eventos cliente → DMX:**
- `client.transaction` — cliente reporta transacción cerrada (alimenta calibración).
- `client.inventory.sync` — cliente sincroniza inventario propio con DMX.

Patrón Stripe Events con firma HMAC + replay protection + retry exponencial + ledger `webhook_deliveries`.

### D6 — Sandbox environment

- `https://sandbox.api.dmx.ai` — endpoints idénticos a producción pero con datos sintéticos.
- Datos sintéticos generados por Claude 4.6 + coherentes con distribuciones reales.
- Reset diario a las 00:00 UTC.
- API keys sandbox empiezan con `sk_test_*`; production con `sk_live_*` (patrón Stripe).
- Webhooks sandbox apuntan a `http://localhost` o tool como webhook.site para testing.

### D7 — SLA tier-based

| Tier | Uptime | Response time p95 | Support response |
|------|--------|---|---|
| Free | No SLA | No SLA | Foro comunidad |
| Starter | 99% | <500ms | Email 48h |
| Pro | 99.9% | <200ms | Email 12h |
| Business | 99.9% | <150ms | Email + Slack 4h |
| Enterprise | 99.95% | <100ms | Dedicated CSM + Slack Connect 1h |

Penalizaciones: breach SLA = crédito proporcional mes siguiente (patrón AWS/Stripe).

### D8 — Metering granular + billing unified Stripe

- Por endpoint: `/scores/zone` cuenta 1 query; `/scores/batch` cuenta N queries (N zonas); `/digital-twin/render` cuenta 5 queries (compute pesado).
- Tabla `api_usage_log` append-only con `(api_key, endpoint, tokens_used, cost_cents, ts)`.
- Agregación diaria → Stripe metered billing via `stripe.subscriptionItems.createUsageRecord`.
- Dashboard developer mostrando usage actual + projection fin de mes + alert thresholds.
- Overages billing: cargo automático + email notification.

### D9 — DevRel program

Actividades en H2+ (requiere 1-2 headcount DevRel):

- **Postman collections** publicadas.
- **Starter repos** en GitHub: `dmx-examples/nextjs-property-dashboard`, `dmx-examples/python-portfolio-analyzer`, `dmx-examples/telegram-bot-alerts`, etc.
- **Office hours developers** — livestream mensual en YouTube + Q&A.
- **Developer Discord/Slack** — community-driven.
- **Bug bounty program** con precios $500-$25K (patrón HackerOne).
- **Hackathon anual** — "DMX Hack LATAM" con premios $50K.
- **Content**: video tutoriales, blog posts técnicos, case studies de integraciones exitosas.

## Rationale

### Stripe benchmark

Stripe pasó de $0 a $95B valuation en 13 años siendo *peor* en features core que competidores (PayPal/Adyen). Lo que ganó la categoría fue:
- Docs de tan alta calidad que developers prefieren Stripe aunque cueste más.
- API stable 10+ años — mismo endpoint `POST /charges` sigue funcionando en 2026.
- SDKs "just work" en cada lenguaje mainstream.
- Sandbox genuino, no "modo pruebas con caveats".

DMX replica **cada una** de estas decisiones. No se inventa patrón nuevo; se implementa el playbook probado.

### Por qué no "API como side feature"

"API como side feature" significa construirla reactivamente (cuando un cliente grande la pide), documentarla al mínimo (Swagger default), sin SDKs, sin sandbox, sin webhooks robustos. Resultado: un cliente grande la usa tras 6 semanas de hand-holding; el segundo cliente hace lo mismo; el tercero y el cuarto también. Nunca escala. Nunca genera ecosystem. Nunca se convierte en producto.

DMX no puede permitirse eso si quiere H3 target 35% revenue de API.

### Por qué FASE 30 (no antes, no después)

- **Antes (H1):** prematuro. No hay calibración suficiente de scores para que la API sea valiosa a precio Stripe-level.
- **FASE 30 (mes 9-12):** post-soft-launch. Scores Tier 1 calibrados. Primeros 3-5 clientes B2B indicando demanda. Headcount DevRel puede entrar.
- **Después (FASE 32+):** tardío. Cherre o Local Logic pueden lanzar primero en LATAM si esperamos.

### Por qué valor compounding vs moat temporal

El moat de datos temporales (principio rector §3) **multiplica su valor** cuando se expone vía API de alta calidad:
- Un banco integra DMX API → cada vez que actualiza scoring hipotecario, cita DMX → flywheel paso 5.
- Un portal embebe widget DMX Score → tráfico orgánico permanente.
- Una fintech usa DMX API para underwriting → DMX gana data adicional (transacciones calibradoras).

Sin API de calidad, el moat queda atrapado dentro de la UI DMX. Con API as product, el moat se distribuye y compounding acelera.

## Consequences

### Positivas

- **Flywheel acelerado.** Paso 5 (terceros citan índices) recibe aceleración 10x vs API mediocre.
- **Revenue stream high-margin.** API cuesta en infra ~5% del precio; margen >90%. Vs marketplace fee cierre ~40% margen.
- **Moat adicional.** Developer community + docs quality + SDKs mantenidos son difíciles de replicar. Stripe's moat real no es el payment processing, es el developer experience.
- **Pricing power.** Podemos cobrar Enterprise $25K-$500K/mes a bancos top que necesitan 99.95% SLA.
- **Credibility institucional.** Cuando Forbes cita "DMX Score", los lectores pueden usar la API para verificar → construye marca.
- **Forces internal APIs quality.** Si la API pública es tan buena, las APIs internas (tRPC) también mejoran (los mismos principios aplican).
- **Strategic optionality.** En H3 DMX puede licenciar la infra API "as white-label" a partners regionales (multiplicador adicional).

### Negativas / tradeoffs

- **Requires dedicated DevRel headcount en H2.** 1-2 engineers senior especializados en DX. Costo ~$200K-$400K/año.
- **Docs maintenance overhead.** Cada cambio de endpoint requiere update docs, ejemplos, SDKs, migration guide. Proceso formalizado que consume velocity.
- **SDK support burden.** 5 lenguajes × mantener al día con cambios API = trabajo continuo. Mitigación: auto-generación desde OpenAPI + tests automatizados.
- **Sandbox infra cost.** Datos sintéticos + reset diario = infra adicional ~$500-$1000/mes. Aceptable.
- **Backward compatibility lock-in.** Una vez publicada v1, 24 meses de soporte mínimo obliga a pensar bien el diseño upfront. Menor velocity de cambio.
- **Security surface expandida.** API pública con rate limits + auth + data sensitive requiere threat modeling + penetration testing formal.

### Neutrales

- **Naming conventions estandarizadas.** `snake_case` en request/response bodies, `camelCase` en SDK bindings (patrón Stripe). Requiere documentar convención.
- **Idempotency keys requeridas en POSTs.** Patrón Stripe `Idempotency-Key` header. Patrón claro.
- **Pagination pattern unified.** Cursor-based pagination con `starting_after`, `ending_before`, `limit`. Patrón Stripe.
- **Error format unified.** Objeto con `{code, message, doc_url, request_id}`. Patrón Stripe.

## Alternatives considered

### Alt 1: "API as side feature" (mantener plan original FASE 23)
**Rechazada.** Detallado en Rationale. Never becomes a product. Sets a ceiling on valuation.

### Alt 2: "No public API, partnerships only"
**Rechazada.** Cierra la categoría developer-first. Cherre/Local Logic con sus APIs abiertas nos ganan developers LATAM. Partnerships también son opción complementaria (ADR-017) pero no sustituta.

### Alt 3: "White-label only" (DMX como infra invisible; clientes construyen UI)
**Rechazada.** Pierde el brand "DMX Score 85" que es parte central del flywheel (paso 5). Stripe decidió lo mismo: no solo backend invisible, sino brand visible en cada checkout.

### Alt 4: "GraphQL only" en lugar de REST + OpenAPI
**Rechazada.** GraphQL es *nicho* developer; REST es universal. Bancos/aseguradoras legacy consumen REST; GraphQL requiere explicación. DMX puede ofrecer GraphQL endpoint como **adicional** en FASE 30+ (no reemplazo).

### Alt 5: "gRPC first"
**Rechazada.** Mismo argumento que GraphQL: nicho tech. Legacy clients consume REST/JSON. gRPC puede añadirse para Enterprise clients que lo pidan explícitamente.

### Alt 6: "Open source la API, monetiza solo Enterprise"
**Rechazada.** Open source la infra de la API desprotege el moat (competencia instala y compete con ventaja de costo). Patrón Stripe no es open source; Plaid tampoco. Valuation premium viene de control.

## Implementation phases

### FASE 23 (H1) — API básica funcional
- Endpoints REST core (`/scores/zone`, `/scores/project`, `/indices/*`).
- API keys + rate limits básicos.
- Docs swagger básicas en `/api-docs`.
- 3 tiers: Free, Starter, Pro (Enterprise on-demand custom).
- 3-5 clientes B2B target.

### FASE 30 (H2) — API as Product full
- Todo lo descrito en Decision arriba.
- Migración a docs portal Stripe-like.
- SDKs 5 lenguajes.
- Webhooks robustos.
- Sandbox.
- DevRel headcount.

### Post-FASE 30 — Expansión
- FASE 32 endpoints digital twin.
- FASE 33 endpoints data ecosystem bilateral.
- FASE 34 endpoints app store integration.

## Success metrics

- **DevRel metrics:** 500+ developers con API key activa Mes 12 post-FASE 30. 50+ apps terceros en GitHub usando DMX.
- **Revenue metrics:** $1M MRR from API Mes 18 post-FASE 30.
- **Quality metrics:** Docs NPS developer ≥60. API uptime ≥99.9% sostenido. Response time p95 <200ms.
- **Ecosystem metrics:** 5+ apps en "ecosystem" page. 3+ menciones técnicas en blogs/Hacker News/Reddit/r/programming.

## References

- [ADR-008 — Monetization Feature Gating](./ADR-008_MONETIZATION_FEATURE_GATING.md) — pricing tiers base H1.
- [ADR-011 — Moonshot 3 Horizontes](./ADR-011_MOONSHOT_3_HORIZONTES.md) — FASE 30 dentro de H2.
- [ADR-015 — Platform Play H2](./ADR-015_PLATFORM_PLAY_H2.md) — relación con app store.
- [FASE 23 — Monetización](../02_PLAN_MAESTRO/FASE_23_MONETIZACION.md) — API básica H1.
- [FASE 30 — API as Product](../02_PLAN_MAESTRO/FASE_30_API_AS_PRODUCT.md) — implementación full.
- [07.1 — Game Changer GC-1 API Premium](../07_GAME_CHANGERS/07.1_API_PREMIUM.md) — GC-1.
- Stripe Press — *Working in Public* (Collison / Eghbal references).
- Jeff Bezos, "API Mandate" memo (2002) — AWS origin.
- Stripe Docs — https://stripe.com/docs/api (canonical reference).
- Twilio Docs — https://www.twilio.com/docs.
- Nvidia CUDA Docs — https://docs.nvidia.com/cuda.
- *The Developer Marketing Handbook* — Adam DuVander.

---

**Author:** Claude Opus 4.7 (biblia v2 moonshot rewrite) | **Date:** 2026-04-18
