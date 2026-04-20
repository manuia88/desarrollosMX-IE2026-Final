# FASE 26 — DMX Social + Listing Intelligence Platform (stub H2)

> **Status:** 🟡 STUB creado 2026-04-20 — ejecutar POST FASE 10 como mini-fase validación MVP free-tier
> **Duración estimada MVP:** 4-6 sesiones CC
> **Dependencias:** FASE 07 (ingesta framework + Chrome extension GC-27) + FASE 08 (IE scores core) + ADR-025
> **Bloqueantes externos:**
> - Founder autoriza presupuesto ~$5-15 USD/mes Claude API adicional (ya dentro del existente)
> - Chrome extension framework FASE 07 reutilizable
> - Lista curada ~50 cuentas oficiales developers/brokers top MX
> - Partnership outreach a 2-3 inmobiliarias medianas (business development paralelo)
> **Resultado esperado:** Pipeline free-tier MVP capturando 3,000-10,000 listings/mes + social signals de 50 cuentas curadas + 5-10 grupos WhatsApp, alimentando scores agregados internos sin expose público.
> **Priority:** H2 (post-validación)

## Contexto y objetivo

Ver ADR-025 para contexto completo + arquitectura + compliance.

Esta fase materializa el pilar **"Social + Listing Intelligence Layer"** como fase ejecutable en modo free-tier MVP. Integra 3 fuentes de data que nadie en MX captura sistemáticamente:

1. **Social signals** (IG/TikTok/LinkedIn/X) — cuentas oficiales developers + brokers top MX
2. **WhatsApp groups corretaje** — export manual + bot opt-in + admin screenshots
3. **Páginas inmobiliarias MX** — Chrome extension expandida + partnerships + opendata

Respeta ADR-012 (no scraping server-side portales bloqueados). Respeta regla founder "zero gasto sin validación" (arquitectura $5-15 USD/mes validada).

## Bloques

### BLOQUE 26.A — WhatsApp Groups Pipeline
- Export manual .txt + admin upload UI
- Bot WhatsApp Business opt-in para brokers voluntarios (Twilio/Gupshup free tier)
- Claude Vision para screenshots ad-hoc
- Extraction NLP Claude Haiku → estructurado
- Persist `external_listings` con source='whatsapp_group'

### BLOQUE 26.B — Chrome Extension Expandida
- Extender Chrome extension (FASE 07 GC-27) para cubrir:
  - RE/MAX MX (remax.com.mx)
  - Century 21 MX (century21.com.mx)
  - Coldwell Banker MX (coldwellbanker.com.mx)
  - Engel & Völkers MX
  - Houm MX
  - La Haus (varias ciudades)
  - Lamudi MX (1.2M visits/mes)
  - Casas y Terrenos (GDL)
- User-side capture con consentimiento usuario
- Background sync a `external_listings` source='chrome_ext'

### BLOQUE 26.C — Puppeteer Self-Hosted GitHub Actions
- Scraping sites sin API (opcional) user-side permitido
- GitHub Actions cron (2000 min/mes gratis)
- User-Agent rotation + slow scraping + respeta robots.txt
- Fallback cuando Chrome extension no cubre

### BLOQUE 26.D — Social APIs Free Tier Integration
- Reddit API (60 req/min gratis) — r/CDMX, r/Mexico, r/RealEstate_Mexico
- YouTube Data API v3 (10K units/día gratis) — canales developers MX
- Meta Graph API solo cuentas owned/managed
- RSS feeds donde existan
- NO Instagram/TikTok/X masivo (diferir paid upgrade)

### BLOQUE 26.E — NLP Extraction + pgvector Dedup
- Claude Haiku para extracción estructurada (~$0.001/listing)
- Schema Zod validated
- pgvector embeddings para dedup cross-source
- Enrichment: cross-reference con scores IE + geo + macro

### BLOQUE 26.F — Storage + Admin Dashboard
- Tabla `external_listings` (no-público, RLS service_role + is_admin)
- TTL configurable per source (default 30-90 días)
- Admin dashboard: volumen, sources, dedup rate, quality metrics
- Exports: market benchmarks agregados, CSV reports B2B

### BLOQUE 26.G — Integración con scores IE
- Wire `external_listings` a scores B01 Demand Heatmap, B07 Competitive Intel, B08 Absorption Forecast
- Alimenta N03 Gentrification Velocity + D05 Gentrification macro con rotación real listings
- Market benchmarks precio/m² por colonia con n≥50 listings validación

## Roadmap post-MVP

Post-validación free-tier (90 días):
- Si ≥3,000 listings útiles/mes → evaluar upgrade paid APIs (IG, X, Apify Pro) $50-150/mes
- Si B2B clientes pagan por reports → fase dedicada "Social Radar Dashboard" (L43 como producto SaaS)
- Crisis Alerting L50 como feature premium
- L47 Community Notes developers + L54 Claim Cross-Check como accountability layer

## Criterio done de la FASE

- [ ] Todos los bloques 26.A-26.G cerrados
- [ ] Pipeline capturando ≥1,000 listings/mes en primer sprint (validar hipótesis)
- [ ] `external_listings` table con RLS + TTL + dedup funcional
- [ ] Admin dashboard operativo
- [ ] Scores IE (B01/B07/B08) consumiendo `external_listings` en cálculo
- [ ] Tag git: `fase-26-complete` (si MVP validado)
- [ ] Documentación actualizada: ADR-025 + pipeline + laterals L53/L57/L58

## Próxima fase

Ver roadmap post-MVP en ADR-025 §D5 — si MVP validado, expansión paid tier + productos B2B Social Intelligence.

---
**Autor:** PM Sr Dev (stub FASE 26 post session FASE 10 pre-flight) | **Fecha:** 2026-04-20
**Status:** STUB — plan operativo detallado se materializa al activar ejecución
