# TODO — Playwright Auto-fetch (fuentes financieras MX)

> **Status:** Diferido — mini-fase pendiente (~0.5-1 sesión Claude Code)
> **Owner:** Claude Code + Manu (founder approval)
> **Created:** 2026-04-19 (housekeeping post-07b)
> **Related:** FASE 07 Ingesta Datos, FASE 18 Legal+Pagos+Escrow, FASE 24 Observabilidad+SRE
> **References:** ADR-010 IE Pipeline Architecture, ADR-012 Scraping Policy

## Contexto

Las fuentes financieras MX que alimentan calculadoras hipotecarias y módulos credit-prequalified (FASE 18 + FASE 20 M-CREDIT-PREQUALIFIED-LIVE + M-FINANCIAL-REALITY-CHECK) requieren tasas y publicaciones periódicas:

- **BBVA Research** — reportes mensuales market outlook + tasas
- **Infonavit** — tablas factor + topes anuales (cambio Q1 cada año)
- **CNBV** — boletines mensuales tasas activas/pasivas + condiciones crédito hipotecario
- **FOVISSSTE** — tablas crédito anuales + reglas operativas
- **SHF** — Tasa Hipotecaria DMX-relevant + reportes trimestrales

Estos publishers no exponen API pública estable. Fuente actual: admin upload manual CSV/PDF (FASE 07 BLOQUE 7.E.2). Mini-fase Playwright autofetch elimina manual upload para refresh recurrente y baja TCO operativo.

## Scope mini-fase

### Sources a integrar

| Source | URL pattern | Frecuencia | Asset format | Detección cambio |
|---|---|---|---|---|
| BBVA Research | `bbvaresearch.com/.../mexico-...` | Mensual | PDF | ETag header + content hash SHA256 |
| Infonavit | `portalmcc.infonavit.org.mx/.../tablas` | Anual Q1 | XLSX | URL versioned + hash |
| CNBV | `gob.mx/cnbv/.../boletines-bancos` | Mensual | PDF | ETag + Last-Modified |
| FOVISSSTE | `gob.mx/fovissste/.../credito` | Anual | PDF + tabla HTML | DOM diff + hash |
| SHF | `gob.mx/shf/.../indicadores` | Trimestral | PDF | ETag + hash |

### Workflow

1. **Cron trigger** — Vercel cron daily 06:00 America/Mexico_City (FASE 24 SRE). Ejecuta job `playwright_autofetch_financial`.
2. **Per source**:
   - Playwright visita URL pattern (browser headless, respect robots.txt)
   - Extrae current asset URL del DOM
   - Compara contra `playwright_autofetch_state` table: { source, last_etag, last_hash, last_url, fetched_at }
   - Si cambió: download asset → cloud storage `supabase://playwright-autofetch/{source}/{date}/{filename}`
   - Trigger parser existente FASE 07 (`shared/lib/ingest/financial/<source>-parser.ts`)
   - Update state row + emit Sentry event `playwright_autofetch.fetched` con metadata
3. **Fallback** — si Playwright falla o ToS bloquea (rate limit, captcha, JS-heavy bot detection): notif Manu via WA template `playwright_autofetch_failed`. Admin upload manual sigue disponible como path B.
4. **Audit** — cada fetch genera row en `audit_log` con event_type `playwright_autofetch.<source>` (ADR-018 R7).

### Stack técnico

- Playwright Node API (no Vercel Sandbox) — runs en Vercel Function timeout 300s default. Node 24 LTS runtime.
- Storage: Supabase Storage bucket privado `playwright-autofetch/`.
- State table: `playwright_autofetch_state` (source PK, last_etag, last_hash, last_url, last_filename, fetched_at, parse_status, parse_error_message).
- Cron: Vercel cron registered en `vercel.ts` (cron `0 6 * * *`).
- Parser handoff: tRPC procedure `ingest.financial.parseFile({ source, storagePath })` — reusa parsers FASE 07.

### Estimación

- Scaffolding base + state table + cron trigger: ~2h
- Per source (5 fuentes): ~1h cada (selectores Playwright + handler change-detection + tests) = ~5h
- Fallback notif + manual override admin UI: ~1h
- Sentry tagging + observability + retry logic: ~1h
- **Total**: ~9h ≈ 0.5-1 sesión Claude Code (con sub-agents paralelos por source)

### Riesgos

- **ToS gris**: gob.mx + bbvaresearch.com no prohíben explícitamente bot fetching de assets públicos PDF/XLSX. Respect robots.txt + rate limit + User-Agent identificable (`DMXAutoFetch/1.0 (+https://desarrollosmx.com/about/data)`). Si algún publisher reclama, switch a admin upload + notif.
- **DOM volatility**: selectors pueden romper. Mitigación: tests semanales `playwright_autofetch_smoke` + alert Slack/WA si selector falla 2 runs consecutivos.
- **Cost**: ~1MB PDF avg × 5 sources × monthly = ~30MB/mes storage trivial. Vercel function 300s limit cubierto.
- **PII**: assets son agregados públicos, no PII. LFPDPPP no aplica.

### Criterio de done (cuando se ejecute la mini-fase)

- [ ] 5 sources implementadas con state table + change detection.
- [ ] Cron daily activo + Sentry observability.
- [ ] Tests Playwright smoke en CI weekly.
- [ ] Fallback notif Manu via WA + admin manual upload sigue funcional.
- [ ] Audit log trail completo.
- [ ] Tag git: `mini-fase-playwright-autofetch-complete`.

## Decision pendiente

- **Ejecutar mini-fase**: cuándo (post-FASE 18 que consume datos financieros más activamente, o pre-FASE 20 launch comprador para evitar admin upload manual UX). Recomendación: post-FASE 18.
- **Sources adicionales** considerar: Banxico (ya cron snapshot fx-rates), Profeco precios construcción, INEGI INPC.

---

**Autor:** Claude (housekeeping post-07b 2026-04-19)
