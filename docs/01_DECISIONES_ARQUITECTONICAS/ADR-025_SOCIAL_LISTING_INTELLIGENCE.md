# ADR-025 — DMX Social + Listing Intelligence Layer

**Status:** Accepted (founder decision 2026-04-20)
**Deciders:** Manu Acosta (founder), PM Sr Dev session
**Context:** Nuevo pilar estratégico + arquitectura free-tier MVP

## Context

Durante sesiones FASE 09/FASE 10 pre-flight el founder detectó 3 data gaps críticos que nadie en el mercado MX está capitalizando sistemáticamente:

1. **Social signals**: posts de developers/brokers en IG/TikTok/LinkedIn/X constantemente publican nuevos proyectos, lanzamientos, preventas, avances de obra. Data temprana (3-6m antes que portales).
2. **WhatsApp groups de corretaje**: brokers MX intercambian listings/oportunidades en grupos privados. Volumen 100-200 listings/día en 5-10 grupos activos. Data que NO llega a portales públicos.
3. **Páginas web de inmobiliarias**: RE/MAX, Century 21, Coldwell Banker, Engel & Völkers, Houm, La Haus, Lamudi, Casas y Terrenos publican listings en sus propios sites. Data fragmentada, nadie la agrega.

Estos 3 gaps combinados representan la data más completa de real estate MX — que **ninguna plataforma actual** (Inmuebles24, Vivanuncios, Habi, MercadoLibre) captura sistemáticamente.

**Restricciones arquitectónicas existentes:**
- ADR-012 inviolable: NO scraping server-side Inmuebles24/Vivanuncios/Propiedades/ML/Habi
- ADR-010 inviolable: NO API Habi
- Plan Vercel Free: cron daily only (TODO #21 pendiente upgrade Pro cuando producción demande)
- Presupuesto founder: zero gasto externo sin validación previa

## Decision

Se crea un **nuevo pilar estratégico paralelo al IE core**: **"DMX Social + Listing Intelligence Layer"**.

Este pilar NO es parte de FASE 08-12 (IE scores). Es categoría separada con su propia fase dedicada (FASE 26 — stub creado 2026-04-20) que se ejecutará POST FASE 10 en modo free-tier MVP primero.

### D1. Alcance del pilar (29 laterales consolidados L30-L58)

El pilar agrupa todos los laterales de social intelligence + listing intelligence aprobados durante sesiones FASE 09-FASE 10:

**Social Intelligence Layer (13 laterales):**
- L43 DMX Social Radar Dashboard (Brandwatch)
- L44 Real-Time Zone Feed (X/Twitter)
- L45 Residente-Verified Reviews (Threads verified)
- L46 DMX Spaces audio rooms (X Spaces)
- L47 Community Notes developers (X Community Notes)
- L48 Trending Topics extended (merged con L29)
- L49 Influencer Map Real Estate (Brandwatch)
- L50 Crisis Alerting Zones (Brandwatch crisis)
- L51 Voice Notes Residentes (Threads voice)
- L52 For You Feed personalizado (TikTok algo)
- L54 Developer Claim Cross-Check (Politifact)
- L55 Broker Performance Leaderboard (LinkedIn SSI)
- L56 Zone Signal Dashboard / DMX Terminal (Bloomberg Terminal, cruza L12)

**Listing Intelligence Layer (3 laterales core):**
- L53 DMX Project Intelligence Pipeline (social listening new projects)
- L57 WhatsApp/Email Integration Monitoring Brokers
- L58 DMX Listing Intelligence Layer (unified pipeline — master hub)

**Retention + Engagement (6 laterales):**
- L30 DMX Personality Score (16Personalities)
- L31 Multiplayer Analysis (Figma)
- L32 DMX Zone Certified (Airbnb Superhost)
- L33 Predictive Portfolio 20y (Wealthfront)
- L34 DMX Weekly Newsletter auto-gen (The Hustle)
- L35 AI Co-pilot Deep Analysis (Cursor)

**Financial Products (3 laterales):**
- L37 Ready-to-Buy Score comprador (Experian)
- L38 Zone ESG Rating (MSCI ESG)
- L40 Insurance Bid Engine (Lemonade)

### D2. Arquitectura free-tier MVP (validada 2026-04-20)

Pipeline unificado en **$5-15 USD/mes** total operacional:

```
FUENTES LEGÍTIMAS GRATUITAS/MICRO-PAGO          EXTRACTION             STORAGE                 PRODUCTOS
──────────────────────────────────────────────  ──────────────────     ──────────────────     ──────────────────
WhatsApp groups (export manual + bot opt-in)  ┐
Chrome extension expandida user-side          ┤
(Re/Max, Century 21, Coldwell, Engel & Völ.,  ┤
 Houm, La Haus, Lamudi, Casas y Terrenos)     ┤
Puppeteer self-hosted GitHub Actions (2000min ┤
 gratis/mes)                                  ┤                        external_listings      Market benchmarks agregados
Reddit API free (60 req/min)                  ┼─▶  Claude Haiku   ─▶  (tabla NO-pública,  ─▶  B01 Demand Heatmap enriquecido
YouTube Data API v3 free (10K units/día)      ┤     NLP extraction     solo admin access)      B07 Competitive Intel
Meta Graph API (cuentas owned/managed)        ┤     pgvector dedup                             B08 Absorption Forecast
RSS feeds portales (donde existan)            ┤                                                N03/D05 Gentrification
Admin manual upload (Claude Vision            ┤                                                L43 Social Radar
 screenshots, PDFs)                           ┤                                                L50 Crisis Alerting
Opendata (RUV, Catastro, INEGI, SHF)          ┘                                                L53 Project Intelligence early alerts
                                                                                                Reports B2B trimestrales
```

**NO incluido free-tier MVP (diferir a paid upgrade):**
- Instagram Graph API masivo cuentas ajenas (solo propias owned/managed free)
- TikTok Research API (academic only, no comercial)
- X/Twitter API v2 ($100+/mes tier, skip hasta justifique)
- Apify actors especializados > $5 credits/mes (self-hosted Puppeteer como alternativa)
- Bright Data / proxies rotativos (diferir a H2)

**Validación criteria para upgrade a paid:**
- Free-tier pipeline genera ≥3,000 listings útiles/mes → justifica upgrade $50/mes
- Clientes B2B pagan por reports → upgrade fondo
- Sin validación: permanecer free-tier indefinido

### D3. Inmobiliarias MX reales (validadas 2026-04-20)

Lista real post-investigación web search (corrige mención previa de Allegra/Hawah que no existen como major players):

**Brokers operando listings:**
- RE/MAX México (#1 ventas BR MX y mundo)
- Century 21 México (red nacional)
- Coldwell Banker México (cobertura nacional)
- Engel & Völkers (top lujo CDMX)
- Houm (digital MX-native, strong renta)
- La Haus (PropTech regional CDMX+GDL+QRO+Riviera Maya+MTY)

**Portales (non-blocklist):**
- Lamudi MX (1.2M visits/mes, top portal MX fuera blocklist)
- Casas y Terrenos (portal GDL-based 1994+)

**Portales bloqueados (ADR-012 inviolable):**
- Inmuebles24 (OLX)
- Vivanuncios (ML)
- Propiedades.com (Habi)
- MercadoLibre

**Fuentes oficiales opendata:**
- RUV (Registro Único Vivienda SEDATU)
- Catastro CDMX (FASE 08 stub)
- INEGI vivienda + ENIGH (FASE 07 ingestado)
- SHF Reports trimestrales (FASE 07 admin upload)

### D4. Compliance & Legal

**Principios:**
1. **User-side scraping OK** (Chrome extension con consentimiento usuario) — alineado ADR-012
2. **Opendata agresivo** — todo lo público
3. **Partnerships B2B** — business development con inmobiliarias medianas que den feed a cambio de scores IE
4. **User consent explícito** para WhatsApp forwards (bot opt-in, no scraping)
5. **Data retention con TTL** — listings expiran 30-90 días (no acumulación indefinida)
6. **NO expose raw listings** — solo scores agregados + analytics + reports B2B

**Compliance LFPDPPP:**
- Datos personales de brokers (nombre, contacto) anonymizados en storage
- Consent opt-in para WhatsApp Business
- Retention policy explícita con eliminación automática

### D5. Roadmap ejecución

**H1 (FASE 26 — MVP free-tier, post FASE 10):**
- BLOQUE 26.A: WhatsApp groups pipeline (export + bot + Vision screenshots)
- BLOQUE 26.B: Chrome extension expandida (8 sitios MX)
- BLOQUE 26.C: Puppeteer self-hosted GitHub Actions (sites sin API)
- BLOQUE 26.D: Reddit + YouTube APIs integration
- BLOQUE 26.E: Claude Haiku NLP extraction + pgvector dedup
- BLOQUE 26.F: `external_listings` table + admin dashboard
- Estimado: 4-6 sesiones CC + $5-15 USD/mes ops

**H2 (si validado):**
- Expansión Instagram/TikTok (upgrade paid APIs)
- Social Radar Dashboard público L43 (FASE 27 nueva)
- Crisis Alerting L50 operativo (FASE 27)
- Productos B2B Social Intelligence tier
- Upgrade Vercel Pro $20/mo si cron frequency demandada

**H3 (H3 horizonte):**
- L43 Social Radar Dashboard como producto SaaS separado
- L58 Listing Intelligence como capa infra (Plaid-equivalent real estate)
- L40 Insurance Bid Engine marketplace activo
- L49 Influencer Map como producto B2B premium

## Rationale

Se eligió crear este pilar estratégico paralelo (no parte de IE core) porque:

1. **Data moat brutal**: los 3 gaps (social + WhatsApp + listings inmobiliarias) combinados dan a DMX data MÁS COMPLETA que cualquier portal MX existente — posicionamiento defensivo largo plazo.
2. **Productos B2B nuevos**: L43 Social Radar + L49 Influencer Map + L50 Crisis Alerting + L56 Bloomberg Terminal habilitan ARR tier enterprise ($500-2000/mes) sin competencia directa en MX.
3. **Free-tier viable**: arquitectura validada con búsqueda web real permite MVP en $5-15 USD/mes — cumple regla "zero gasto sin validación".
4. **Respeta ADR-012**: user-side scraping + partnerships + opendata — NO viola inviolables.
5. **Alimenta IE core**: data generada mejora scores existentes (B01/B07/B08/N03/D05) sin ser parte de su fase constructiva.
6. **Fase dedicada (FASE 26)**: scope separado evita bloat en FASEs IE core + permite ejecución parallel/posterior sin bloquear roadmap moonshot.

## Consequences

### Positivas
- Nuevo pilar defensible posicionamiento: "DMX captura data que nadie más tiene"
- 29 laterales consolidados en pipeline vivo + fase dedicada
- Productos B2B nuevos adicionales ya identificados (L43, L49, L50, L56)
- Data moat arquitectónico (Plaid-equivalent real estate MX)
- Alimentación de scores IE con data real markets (no solo portales)

### Negativas / tradeoffs
- **Scope ampliado**: 29 laterales adicionales al backlog — requiere disciplina de no ejecutar hasta FASE 26
- **Compliance overhead**: user consent + retention policies + LFPDPPP requires detail implementation
- **Data quality heterogénea**: WhatsApp groups + scraping producen data ruidosa — NLP Claude Haiku maneja pero require calibration
- **Maintenance Chrome extension**: cada cambio de site inmobiliaria puede romper extractors
- **Riesgo legal grises**: Puppeteer scraping sites sin API explícita es fair use pero TOS strict
- **Dependencia Claude API**: si Anthropic cambia pricing drasticamente, pipeline affected (mitigación: local NLP fallback con transformers.js)

### Neutrales
- FASE 26 será la fase más compleja por integrar múltiples fuentes heterogéneas
- H2 upgrade a paid APIs (Instagram, X) requiere validación de valor generado con free-tier primero
- Partnerships inmobiliarias requieren business development humano (no solo tech)

## Alternatives considered

### Alt 1: Ignorar esta categoría y quedarse con IE core + marketplace
**Descartada.** Perder data moat que competidores (Habi, Inmuebles24) nunca van a capturar por posición estructural. Gap estratégico largo plazo.

### Alt 2: Ejecutar como parte de FASE 10-12 (mezclado con IE scores)
**Descartada.** Mezcla scope ejecución (calculators puros) con infraestructura de ingesta nueva. Rompe principio feature-sliced + aumenta riesgo hard-stop 92% mid-fase.

### Alt 3: Upgrade inmediato a paid APIs (X, Instagram, Apify Pro)
**Descartada.** Viola regla founder "zero gasto sin validación". Free-tier MVP primero, upgrade cuando data prove valor.

### Alt 4: Sub-contratar a terceros (Brandwatch + Similarweb + contratación SEO scraping)
**Descartada.** Costo prohibitivo ($5K-20K/mes enterprise tools) + NO construye moat propio (dependencia externa).

## References

- `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md` §L30-L58 (pipeline detallado)
- `docs/02_PLAN_MAESTRO/FASE_26_LISTING_INTELLIGENCE_PLATFORM.md` (stub plan operativo)
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md` (IE core — este ADR-025 es paralelo)
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-012_SCRAPING_POLICY.md` (compliance source-truth)
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-013_API_AS_PRODUCT.md` (monetización B2B)
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-015_PLATFORM_PLAY_H2.md` (platform positioning)
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-021_PROGRESSIVE_PREFERENCE_DISCOVERY.md` (PPD — L52 For You alimenta)
- `docs/05_OPERACIONAL/CONTRATO_EJECUCION.md` §8 TODOs + §9 FASE 08 + §10 FASE 09

## Sources validated (2026-04-20 web research)

- [Mejores inmobiliarias CDMX 2026 (Houm)](https://blog.houm.com/mejores-inmobiliarias-en-cdmx-top-5-para-propietarios/)
- [Inmobiliarias MX directory (Mejores México)](https://www.mejoresmexico.com/inmobiliarias/)
- [Lamudi MX — 1.2M visits/mes](https://www.lamudi.com.mx/en/)
- [Apify Pricing Free Tier Real Costs (Use Apify)](https://use-apify.com/docs/what-is-apify/apify-pricing)
- [Instagram Graph API Pricing Limits 2026 (Phyllo)](https://www.getphyllo.com/post/instagram-api-pricing-explained-iv)
- [Instagram Graph API Developer Guide 2026 (Elfsight)](https://elfsight.com/blog/instagram-graph-api-complete-developer-guide-for-2026/)

---
**Autor:** PM Sr Dev (sesión FASE 10 pre-flight social+listing intelligence) | **Fecha:** 2026-04-20
