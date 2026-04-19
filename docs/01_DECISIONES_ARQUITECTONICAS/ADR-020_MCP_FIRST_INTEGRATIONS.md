# ADR-020 — MCP-First Pattern para integraciones externas (AirROI exemplar)

**Status:** Accepted
**Date:** 2026-04-19
**Deciders:** Manu Acosta (founder)
**Referenced by:** [FASE_07b_STR_INTELLIGENCE_COMPLETE.md](../02_PLAN_MAESTRO/FASE_07b_STR_INTELLIGENCE_COMPLETE.md)
**References:** [ADR-019 STR Module Complete](./ADR-019_STR_MODULE_COMPLETE.md), [ADR-010 IE Pipeline Architecture](./ADR-010_IE_PIPELINE_ARCHITECTURE.md), [ADR-012 Scraping Policy](./ADR-012_SCRAPING_POLICY.md)
**Supersedes:** —

## 1. Context

Durante la implementación de FASE 07b (STR Intelligence) emergió un hallazgo arquitectónico relevante validado en U3:

- El endpoint `/listings/export_market` **no existe en la API REST de AirROI** (404 en todas las variantes probadas — ver header de `shared/lib/ingest/str/airroi-pricing.ts`).
- El path equivalente es un **tool exclusivo del servidor MCP** `https://mcp.airroi.com` llamado `airroi_export_market`, que internamente paginate y devuelve listings en una sola tool call.
- La alternativa REST (`/listings/search/market` con `page_size` máximo 10 por offset) requiere **>100 calls por sub-colonia CDMX** (>2,300 calls para CDMX completo) a $0.50/call → excede el budget $500/mes con un solo bulk export.

Este patrón se repite en otros proveedores que están adoptando MCP como interfaz primaria para tools de alto valor (export bulk, agentic workflows, batch operations). El stack actual de DMX trata MCP como capability de cliente (Copilot, Claude Code dev), pero no como **path canónico de integración server-side**.

Adicionalmente, ya validamos en U4 que un cliente MCP minimalista (JSON-RPC 2.0 over fetch, sin dep al `@modelcontextprotocol/sdk`) es viable desde Vercel Functions Fluid Compute con un footprint pequeño y fallback determinista a REST cuando el endpoint MCP no está disponible o falla.

## 2. Decision

**Adoptar MCP-First** como patrón canónico para integraciones externas que cumplen al menos uno de los siguientes:

1. El proveedor expone funcionalidad bulk/agregada **solo** a través de MCP (caso AirROI export_market).
2. El proveedor publica costos materialmente menores en el path MCP que en el REST equivalente paginado.
3. El proveedor expone tools agentic (workflow steps, multi-step queries) que requerirían múltiples calls REST encadenados.
4. La integración se usa también desde el Copilot (FASE 03) — reusar la misma capa MCP server-side reduce duplicación.

Decisiones concretas:

1. **Capa MCP server-side genérica**: la implementación de `shared/lib/ingest/str/airroi-mcp.ts` (FASE 07b U4) es el primer ejemplar. Cuando un segundo proveedor MCP entre, mover la lógica JSON-RPC común a `shared/lib/mcp/` y dejar el adapter por proveedor en su propio módulo.
2. **Sin dependencia al `@modelcontextprotocol/sdk`** mientras la superficie usada permanezca pequeña (solo `tools/call`). Si en el futuro necesitamos `tools/list`, `resources/*`, `prompts/*`, o el handshake completo con `initialize`, evaluar adoptar el SDK oficial vía un nuevo ADR.
3. **Fallback determinista obligatorio**: cada wrapper MCP debe ofrecer un path REST/HTTP alternativo o documentar explícitamente por qué no aplica. El cliente AirROI implementa `bulkExportMarket(strategy: 'auto'|'mcp_only'|'rest_only')` con cap proyectado por costo en ambas rutas.
4. **Allowlist + cost ledger**: cada source MCP se registra en `shared/lib/ingest/allowlist.ts` con sufijo `_mcp` (ya cumplido: `airroi_mcp`) y comparte el cost tracker `api_budgets` con su contraparte REST.
5. **Validación prod por primer call**: el costo real de un tool MCP no es siempre publicado en docs. La primera ejecución contra producción reconcilia el `estimated_cost_usd` en la pricing table. Tracking obligatorio en commit message del ingest job inicial.
6. **No usar MCP para hot-path user-facing** — el latency MCP sobre HTTPS (incluso por Streamable HTTP) puede ser superior al REST equivalente. Reservar MCP para jobs de orchestrator (cron-driven), batch operations y agentic workflows. Hot path UI/Copilot usa REST.

## 3. Consequences

### Positivas

- **Cost containment**: para AirROI, MCP `export_market` reduce el bulk de 230+ calls REST ($115+) a 1 tool call estimada ~$2 — orden de magnitud sostenible dentro del cap $500/mes.
- **Scope reducido del SDK MCP**: implementar solo `tools/call` + parser de respuestas (3 shapes soportados: `structuredContent`, top-level, `content[].text`) cabe en ~250 LOC sin tocar el stack.
- **Composabilidad con Copilot**: el Copilot ya usa MCP client-side (Claude Code). Cuando se diseñe el Copilot server-side (FASE 03 downstream), puede reutilizar `shared/lib/mcp/` sin reimplementar el transport layer.
- **Future-proof para nuevos proveedores**: AirROI no será el último. Si Mapbox, Google, Anthropic o terceros publican tools MCP-only para casos bulk, el patrón está cableado.

### Negativas / tradeoffs

- **Duplicación temporal**: cada nuevo proveedor MCP requerirá su propio adapter mientras la capa común no exista. Acceptable hasta el segundo proveedor (entonces refactor obligatorio).
- **Costo MCP no publicado**: no hay un `pricing.md` por tool. Riesgo de que un call inesperado dispare costo > estimate. Mitigación: pre-check con valor conservador (e.g., `mcp_export_market: $2` aunque docs no confirmen) + reconciliación post-call.
- **Dependencia de uptime del MCP server**: AirROI MCP no publica SLA explícito. El fallback REST mitiga, pero introduce branching en cada job. Aceptable dado que el REST paginado es más caro pero funcional.
- **Headers de auth no estándar**: cada servidor MCP puede usar diferentes esquemas (Bearer, X-API-KEY, ambos). El cliente actual envía ambos por simplicidad — refinar cuando un proveedor rechace ambos esquemas.

### Neutrales

- **`@modelcontextprotocol/sdk` queda como opción futura**: si la complejidad crece (multiplexing, server-sent events, sessions), adoptarlo via nuevo ADR. No lo descartamos definitivamente.

## 4. Alternativas consideradas

### Alt 1 — Solo REST paginado

**Rechazada.** En el caso AirROI, supera el budget cap $500/mes con un solo bulk export. Sin viabilidad económica.

### Alt 2 — Adoptar `@modelcontextprotocol/sdk` desde el primer integrador

**Rechazada por scope.** El SDK aporta initialize handshake, sessions, multi-tool listing — features que no usamos hoy. Pagar el complexity tax por features no requeridas viola las prohibiciones de CLAUDE.md (no añadir abstracciones para escenarios hipotéticos). Reabrir vía ADR si la superficie usada crece.

### Alt 3 — Scraping directo de la web AirROI

**Rechazada por TOS + ADR-012.** Misma justificación que el descarte de scraping de portales consumer-facing.

### Alt 4 — Negociar con AirROI un endpoint REST equivalente

**No descartada como path largo plazo.** Si AirROI eventualmente expone `/listings/export_market` como REST con pricing competitivo, podemos migrar el adapter sin cambiar la interface pública (`bulkExportMarket('rest_only')` ya existe).

## 5. Impacto downstream

- **FASE 07b**: cumplido. El cliente MCP AirROI está operativo, con tests + fallback REST.
- **FASE 03 (Copilot)**: cuando se diseñe Copilot server-side, debe mover la lógica JSON-RPC común a `shared/lib/mcp/` antes de añadir el segundo proveedor.
- **FASE 24 (Telemetría)**: el panel `airroi_budget` ya cubre MCP + REST; añadir un panel separado por endpoint si se vuelve hotspot.
- **Documentación**: catálogo de fuentes (`03.9_CATALOGO_FUENTES_DATOS.md`) debe marcar cada source con `transport: rest|mcp|both`.

## References

- [ADR-019 STR Module Complete](./ADR-019_STR_MODULE_COMPLETE.md) §2.1 (AirROI como fuente primaria H1).
- [ADR-010 IE Pipeline Architecture](./ADR-010_IE_PIPELINE_ARCHITECTURE.md) §D2 ingestores per source.
- [ADR-012 Scraping Policy](./ADR-012_SCRAPING_POLICY.md) (descarte de scraping directo).
- [shared/lib/ingest/str/airroi-mcp.ts](../../shared/lib/ingest/str/airroi-mcp.ts) (implementación de referencia).
- [shared/lib/ingest/str/airroi-pricing.ts](../../shared/lib/ingest/str/airroi-pricing.ts) (pricing table + hallazgo U3).
- Model Context Protocol spec: https://modelcontextprotocol.io/

---

**Autor:** Claude Opus 4.7 (sesión continuación FASE 07b) | **Fecha:** 2026-04-19
