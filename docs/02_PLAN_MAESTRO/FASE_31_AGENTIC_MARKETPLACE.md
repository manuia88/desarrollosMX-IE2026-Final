# FASE 31 — Agentic Marketplace

> **Duración estimada:** 5 sesiones Claude Code (~20 horas)
> **Dependencias:** [FASE 03 — AI-Native Shell](./FASE_03_AI_NATIVE_SHELL.md), [FASE 12 — IE AI Scores N5](./FASE_12_IE_AI_SCORES_N5.md), [FASE 30 — Platform API](./FASE_30_PLATFORM_API.md)
> **Bloqueantes externos:**
> - Anthropic API key Enterprise tier (rate limits ≥ 1000 RPM por workspace)
> - Vercel AI Gateway configurado (routing multi-provider, observability, cost caps)
> - LangSmith account para traces agent runs (`LANGSMITH_API_KEY`)
> - Anthropic Memory API access (preview/GA)
> - Cuenta LangGraph Cloud o self-host (decidir 31.A.2)
> - MCP (Model Context Protocol) libraries estables (H2/H3 scope)
> **Horizonte:** H2
> **Resultado esperado:** Marketplace de agentes 24/7 persistentes donde usuarios (asesores, compradores, devs) configuran agentes no-code desde 5 templates predefinidos (Researcher, Match-Maker, Follow-Up, Negotiator, Report-Generator). Agent runtime LangGraph + Claude Sonnet 4.6, memoria persistente Anthropic Memory API + Runtime Cache, Constitutional AI guardrails (cite sources, refuse non-legal, ask when uncertain), observability LangSmith + Vercel AI Observability, metered billing Claude API via Vercel AI Gateway, multi-agent orchestration (H3 pin). Tag `fase-31-complete`.
> **Priority:** [H2]

## Contexto y objetivo

El shell AI-native de FASE 03 dio a DMX un Copilot conversacional. Esta fase va un paso más — **convertir al usuario en curador de agentes persistentes que trabajan 24/7 en su favor**. El asesor no tiene que abrir DMX para que un agente investigue zonas, monitoree leads, mande follow-ups. El comprador tiene un agente "match-maker" que revisa mercado cada noche y notifica oportunidades. El desarrollador tiene un "report-generator" que genera reportes semanales automáticos.

Esto es **la piedra angular del H2** ([ADR-011](../01_DECISIONES_ARQUITECTONICAS/ADR-011_MOONSHOT_3_HORIZONTES.md), [ADR-014](../01_DECISIONES_ARQUITECTONICAS/ADR-014_AGENTIC_ARCHITECTURE.md)): competidores tienen CRMs estáticos; DMX tiene CRM + agentes que trabajan continuamente. El moat es la combinación de **datos propios (IE scores) + orquestación LangGraph + memoria persistente** — cada agente mejora con el tiempo porque recuerda el contexto del usuario.

Principios:
- **Agentes son código, no "prompts guardados"**. Cada agent template es un `StateGraph` con tools + memory.
- **Constitutional AI always** — refuse to give legal/financial/medical advice, always cite data sources from DMX, ask clarifying question when uncertain.
- **Observability first** — cada run traced en LangSmith, cada token costado via Vercel AI Gateway.
- **User control** — usuario puede pausar, inspeccionar memoria, approve high-stakes actions antes de ejecución.

## Bloques

### BLOQUE 31.A — Agent runtime LangGraph + Claude Sonnet 4.6

#### MÓDULO 31.A.1 — Setup LangGraph

**Pasos:**
- `[31.A.1.1]` Instalar deps: `npm i @langchain/langgraph @langchain/anthropic @langchain/core langsmith`. Confirmar compatibilidad con Next.js 16 edge runtime (fallback a Node.js runtime si edge no soportado).
- `[31.A.1.2]` Crear `features/agents/lib/runtime/base-graph.ts`:
  ```ts
  import { StateGraph, Annotation, END, START } from '@langchain/langgraph';
  import { ChatAnthropic } from '@langchain/anthropic';
  export const AgentState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({ reducer: (a, b) => [...a, ...b], default: () => [] }),
    memory_key: Annotation<string>(),
    user_id: Annotation<string>(),
    country_code: Annotation<string>(),
    tools_used: Annotation<string[]>({ reducer: (a, b) => [...new Set([...a, ...b])], default: () => [] }),
    cost_tokens_total: Annotation<number>({ reducer: (a, b) => a + b, default: () => 0 }),
    status: Annotation<'running'|'waiting_user'|'completed'|'error'>(),
  });
  export const llm = new ChatAnthropic({
    model: 'claude-sonnet-4-6-20260401',
    baseURL: process.env.VERCEL_AI_GATEWAY_URL,
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxTokens: 8192,
    temperature: 0.3,
  });
  ```
- `[31.A.1.3]` Vercel AI Gateway config (`vercel.json` o dashboard): route `anthropic/claude-sonnet-4-6` con fallback a `claude-haiku-4-5` si cost cap hit, cost cap diario $500 USD por workspace.
- `[31.A.1.4]` Tests unitarios del base graph con mock LLM (no hit API real).

**Criterio de done del módulo:**
- [ ] Runtime inicializa sin errores.
- [ ] Mock test pasa.

#### MÓDULO 31.A.2 — Deployment: LangGraph Cloud vs self-host

**Pasos:**
- `[31.A.2.1]` Decisión: **LangGraph Cloud** para H2 (managed, autoscaling, persistent checkpointing out-of-the-box). H3 evaluar migración a self-host en Vercel Functions si costs > $3K/mes.
- `[31.A.2.2]` Deploy via `langgraph deploy` → endpoint público con auth JWT de DMX.
- `[31.A.2.3]` Checkpointer: Postgres via `PostgresSaver` apuntando a tabla dedicada `agent_checkpoints` en Supabase:
  ```sql
  CREATE TABLE public.agent_checkpoints (
    thread_id TEXT NOT NULL,
    checkpoint_id TEXT NOT NULL,
    parent_checkpoint_id TEXT,
    type TEXT,
    checkpoint BYTEA,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (thread_id, checkpoint_id)
  );
  CREATE INDEX idx_agent_ckp_thread ON public.agent_checkpoints (thread_id, created_at DESC);
  ```

**Criterio de done del módulo:**
- [ ] LangGraph Cloud deploy activo.
- [ ] Checkpointer Postgres funcional.

### BLOQUE 31.B — 5 Agent templates predefinidos

#### MÓDULO 31.B.1 — Template Researcher

**Pasos:**
- `[31.B.1.1]` `features/agents/templates/researcher.ts`: agente que investiga zonas/desarrollos a petición, produce reporte markdown con citations a fuentes DMX (DENUE, FGJ, Atlas Riesgos, market prices).
- `[31.B.1.2]` Tools:
  - `getZoneScores(zone_id)` — pull IE scores N0-N5.
  - `getMarketTrends(zone_id, period)` — time-series.
  - `getComparables(property_id, radius_km)` — listados similares.
  - `getMacroContext(country_code, metrics)` — Banxico/INEGI relevantes.
- `[31.B.1.3]` System prompt incluye Constitutional: "Always cite source. If confidence < 0.7, say 'data insufficient'. Never invent numbers."
- `[31.B.1.4]` Output schema Zod: `{ title: string, executive_summary: string, sections: { heading: string, body_markdown: string, citations: Citation[] }[], confidence_score: number }`.

**Criterio de done del módulo:**
- [ ] Researcher corre end-to-end con tools reales.
- [ ] Output matches schema.

#### MÓDULO 31.B.2 — Template Match-Maker

**Pasos:**
- `[31.B.2.1]` `features/agents/templates/match-maker.ts`: corre cada noche (cron diario 3AM), revisa inventario vs preferencias comprador, notifica nuevos matches.
- `[31.B.2.2]` Tools: `searchInventory(filters)`, `scoreMatch(buyer_dna, property)`, `notifyUser(channel, payload)`.
- `[31.B.2.3]` Trigger vía `@trigger.dev/v3` cron `0 3 * * *` per comprador activo.
- `[31.B.2.4]` Threshold: solo notifica si match_score ≥ 0.85 Y no notificado hace 14 días.

**Criterio de done del módulo:**
- [ ] Match-Maker cron activo.
- [ ] Notifica vía WA/email cuando aplica.

#### MÓDULO 31.B.3 — Template Follow-Up

**Pasos:**
- `[31.B.3.1]` `features/agents/templates/follow-up.ts`: para asesores, revisa contactos sin interacción > N días y propone mensaje personalizado.
- `[31.B.3.2]` Tools: `getIdleContacts(asesor_id, days_threshold)`, `draftFollowUpMessage(contact_context)`.
- `[31.B.3.3]` Human-in-the-loop: agente pausa en estado `waiting_user` con draft, asesor aprueba/edita, agente manda vía WA/email.
- `[31.B.3.4]` Se integra con FASE 22 comms stack (WhatsApp primary, Resend fallback).

**Criterio de done del módulo:**
- [ ] Follow-Up genera drafts coherentes.
- [ ] Human-in-the-loop UI funciona.

#### MÓDULO 31.B.4 — Template Negotiator

**Pasos:**
- `[31.B.4.1]` `features/agents/templates/negotiator.ts`: asiste al asesor en negociación (oferta/contraoferta). No actúa autónomamente; siempre human approval.
- `[31.B.4.2]` Tools: `getPropertyValuation(property_id)`, `getHistoricalDeals(zone, type)`, `getBuyerUrgency(buyer_id)`, `proposeCounteroffer(inputs)`.
- `[31.B.4.3]` Guardrail extra: no propone oferta arriba de techo establecido por broker lead o bajo piso ético.

**Criterio de done del módulo:**
- [ ] Negotiator propone rangos justificados.

#### MÓDULO 31.B.5 — Template Report-Generator

**Pasos:**
- `[31.B.5.1]` `features/agents/templates/report-generator.ts`: genera reporte semanal personalizado por rol (asesor → pipeline + lead insights, dev → inventory + market share, comprador → market updates relevantes).
- `[31.B.5.2]` Tools: `getMetricsByRole(user_id, role, period)`, `getNewsByZone(zones)`, `exportPDF(content)`.
- `[31.B.5.3]` Cron weekly Lunes 8AM.
- `[31.B.5.4]` Distribution: email + guarda en `/reports/personal` para consulta histórica.

**Criterio de done del módulo:**
- [ ] Reportes entregados weekly.

### BLOQUE 31.C — Agent configurator UI (no-code drag-drop)

#### MÓDULO 31.C.1 — UI builder

**Pasos:**
- `[31.C.1.1]` Ruta `app/[locale]/(*)/agents/new/page.tsx` — wizard 5 pasos:
  1. Selecciona template (5 cards).
  2. Configura triggers (cron expression, eventos, manual-only).
  3. Configura tools (toggle on/off + params límite).
  4. Memory settings (TTL, max tokens, privacy level).
  5. Guardrails (human-in-loop obligatorio o solo en high-stakes actions).
- `[31.C.1.2]` Componente `features/agents/components/tool-selector.tsx` — lista tools disponibles con tier (free/pro/enterprise) y uso esperado.
- `[31.C.1.3]` Schema Zod `agent_config_schema.ts` con validación cross-field (cron válido, tools compatibles con template).
- `[31.C.1.4]` Persistencia tabla `agents`:
  ```sql
  CREATE TABLE public.agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    template_slug TEXT NOT NULL,
    name TEXT NOT NULL,
    config JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    memory_thread_id TEXT NOT NULL UNIQUE
  );
  CREATE INDEX idx_agents_owner ON public.agents (owner_id, status);
  ```
- `[31.C.1.5]` RLS: owner-only SELECT/UPDATE/DELETE; admins SELECT todos.

**Criterio de done del módulo:**
- [ ] Wizard crea agente end-to-end.
- [ ] RLS enforced.

### BLOQUE 31.D — Agent memory (Anthropic Memory API + Runtime Cache)

#### MÓDULO 31.D.1 — Memory layers

**Pasos:**
- `[31.D.1.1]` Capa 1 (short-term): LangGraph checkpointer (Postgres) — persiste state por thread durante run.
- `[31.D.1.2]` Capa 2 (medium-term): Vercel Runtime Cache keyed `agent:{agent_id}:memory:{key}` con TTL 7 días — para facts frecuentes (ej: "buyer prefers Polanco").
- `[31.D.1.3]` Capa 3 (long-term): Anthropic Memory API — persistent memory across threads. Escribe cuando confidence ≥ 0.8 + user approval (primera vez).
- `[31.D.1.4]` Migration tabla `agent_memory_events` para audit (no storage — solo eventos con IDs remotos):
  ```sql
  CREATE TABLE public.agent_memory_events (
    id BIGSERIAL PRIMARY KEY,
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    layer TEXT NOT NULL CHECK (layer IN ('checkpoint','runtime_cache','anthropic')),
    operation TEXT NOT NULL CHECK (operation IN ('read','write','delete')),
    key_hash TEXT NOT NULL,
    tokens_in INT,
    tokens_out INT,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- `[31.D.1.5]` UI `/agents/{id}/memory` permite ver/borrar memoria (LFPDPPP ARCO — cumple derecho olvido).

**Criterio de done del módulo:**
- [ ] 3 capas integradas.
- [ ] UI memory management funcional.

### BLOQUE 31.E — Agent marketplace (usuarios publican agents → otros descargan)

#### MÓDULO 31.E.1 — Publish + install flow

**Pasos:**
- `[31.E.1.1]` Tabla `agent_marketplace_items`:
  ```sql
  CREATE TABLE public.agent_marketplace_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES auth.users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    template_slug TEXT NOT NULL,
    config_frozen JSONB NOT NULL,        -- config sin owner-specific
    tags TEXT[],
    price_usd_minor BIGINT DEFAULT 0,   -- 0 = free
    installs_count INT DEFAULT 0,
    rating_avg NUMERIC(3,2),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published','archived')),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE INDEX idx_amki_status ON public.agent_marketplace_items (status, published_at DESC);
  ```
- `[31.E.1.2]` Review queue admin `/admin/agents/marketplace-review` — admin aprueba/rechaza items antes de publish (safety check + quality).
- `[31.E.1.3]` Install flow: user click "Install" → clone `config_frozen` como nueva row en `agents`, owner_id = user actual, author recibe credit (si pago, split 70/30 DMX/author).
- `[31.E.1.4]` Rating system: user rate 1-5 stars post 30 días uso. Rating influencia ranking marketplace.

**Criterio de done del módulo:**
- [ ] Flow publish + review + install funcional.
- [ ] 10 agents template oficiales DMX publicados en marketplace como seed.

### BLOQUE 31.F — Constitutional AI guardrails

#### MÓDULO 31.F.1 — Policy engine

**Pasos:**
- `[31.F.1.1]` `features/agents/lib/guardrails/constitution.ts`:
  ```ts
  export const CONSTITUTION = `
  You are an AI agent working inside DesarrollosMX (DMX), a LATAM real estate decision intelligence platform.

  MANDATORY BEHAVIORS:
  1. CITE SOURCES — Every factual claim must cite a DMX data source (zone_scores, macro_series, market_prices_secondary, etc).
  2. REFUSE NON-REAL-ESTATE — If user asks for legal advice, financial advice, tax advice, medical advice, or anything outside real estate research/coordination, refuse and suggest consulting licensed professional.
  3. ASK WHEN UNCERTAIN — If confidence < 70% on a claim, say so explicitly ("data insufficient"). Never invent numbers.
  4. HUMAN APPROVAL for HIGH-STAKES — Any action with financial impact (sending money, signing docs, closing deals) requires human approval. You can only PROPOSE, not execute.
  5. PRIVACY — Never reveal another user's private data. Aggregates only.
  6. NO NEGOTIATION IN USER'S NAME — You draft, human sends.
  `;
  ```
- `[31.F.1.2]` Pre-flight check: cada node del graph, antes de tool call, verifica contra constitution via cheaper model (Haiku) → si viola, rewrite response o bloquea.
- `[31.F.1.3]` Post-flight check: output del agente pasa por classifier → si detecta legal/financial/medical advice, reemplaza con disclaimer + suggest professional.
- `[31.F.1.4]` Audit: cada violation registrada en `agent_guardrail_violations` para revisión.

**Criterio de done del módulo:**
- [ ] Pre/post flight activos.
- [ ] Tests de red-teaming (15 prompts adversariales) todos bloqueados.

### BLOQUE 31.G — Agent observability

#### MÓDULO 31.G.1 — LangSmith + Vercel AI Observability

**Pasos:**
- `[31.G.1.1]` LangSmith tracer configurado en runtime — cada run tagged con `agent_id`, `owner_id`, `template_slug`.
- `[31.G.1.2]` Dashboard interno `/admin/agents/observability`:
  - Runs por hora / día / template
  - p50/p95/p99 latencia
  - Costo total / ARPU (avg revenue per user) vs agent cost
  - Top errores (LangSmith)
- `[31.G.1.3]` Vercel AI Observability integrado vía AI Gateway — token usage + cost per request.
- `[31.G.1.4]` Alerting: Sentry captura exceptions; PagerDuty si error rate > 5% en 15 min.

**Criterio de done del módulo:**
- [ ] Traces visibles en LangSmith.
- [ ] Dashboard interno mostrando métricas.

### BLOQUE 31.H — Agent billing (metered Claude via AI Gateway)

#### MÓDULO 31.H.1 — Pricing + metering

**Pasos:**
- `[31.H.1.1]` Pricing: plan user Pro (FASE 23) incluye 1M tokens/mes + 5 agents. Overage $15/1M tokens. Enterprise unlimited.
- `[31.H.1.2]` Metering via AI Gateway — cada call retorna tokens_in/out, costadas a `agent_usage_events`:
  ```sql
  CREATE TABLE public.agent_usage_events (
    id BIGSERIAL PRIMARY KEY,
    agent_id UUID NOT NULL REFERENCES public.agents(id),
    owner_id UUID NOT NULL,
    tokens_in INT NOT NULL,
    tokens_out INT NOT NULL,
    cost_usd_minor BIGINT NOT NULL,
    model TEXT NOT NULL,
    occurred_at TIMESTAMPTZ DEFAULT now()
  ) PARTITION BY RANGE (occurred_at);
  SELECT partman.create_parent('public.agent_usage_events', 'occurred_at', 'native', 'monthly');
  ```
- `[31.H.1.3]` Dashboard user `/settings/billing/agents` muestra consumo actual + proyección fin de mes.
- `[31.H.1.4]` Sync a Stripe meter events (pattern FASE 30.G).

**Criterio de done del módulo:**
- [ ] Usage metering preciso.
- [ ] Billing sync con Stripe.

### BLOQUE 31.I — Multi-agent orchestration (MCP protocol) — H3 pin

#### MÓDULO 31.I.1 — MCP foundation

**Pasos:**
- `[31.I.1.1]` STUB — activar FASE 36+ cuando MCP protocol estable. Establece hook en runtime para que agents puedan delegar subtareas a otros agents via MCP.
- `[31.I.1.2]` Documentar pattern en `docs/01_DECISIONES_ARQUITECTONICAS/ADR-014_AGENTIC_ARCHITECTURE.md` §5.
- `[31.I.1.3]` Ejemplo diseño: Researcher delega cálculo DMX Estimate a especializado Estimator, que internamente llama tools IE. Cada agent es un servicio MCP-compliant.
- `[31.I.1.4]` Badge `[H3 próximamente]` visible en UI config "multi-agent delegation".

**Criterio de done del módulo:**
- [ ] STUB marcado visiblemente.
- [ ] Doc interno de diseño H3.

## Criterio de done de la FASE

- [ ] Runtime LangGraph + Claude Sonnet 4.6 funcional con checkpointer Postgres.
- [ ] 5 agent templates deployados (Researcher, Match-Maker, Follow-Up, Negotiator, Report-Generator).
- [ ] Agent configurator UI no-code (wizard 5 pasos).
- [ ] Memoria 3 capas (checkpoint + Runtime Cache + Anthropic Memory API).
- [ ] Marketplace publish/install/rating.
- [ ] Constitutional guardrails pre/post flight con tests red-teaming.
- [ ] Observability LangSmith + Vercel AI Gateway dashboard.
- [ ] Billing metered vía Stripe.
- [ ] Multi-agent orchestration MCP como STUB H3.
- [ ] RLS owner-only en tablas `agents`, `agent_memory_events`, `agent_usage_events`.
- [ ] Tag git: `fase-31-complete`.

## E2E VERIFICATION CHECKLIST

### Conectividad
- [ ] Todos los botones UI mapeados en [03.13_E2E_CONNECTIONS_MAP](../03_CATALOGOS/03.13_E2E_CONNECTIONS_MAP.md)
- [ ] Todos los tRPC procedures implementados (no stubs sin marcar)
- [ ] Todas las migrations aplicadas y `db:types` regenerado
- [ ] Todos los triggers/cascades testeados con integration tests
- [ ] Permission enforcement validado para cada rol (asesor / dev / comprador / admin / superadmin)

### States
- [ ] Loading states (skeleton matching layout) en agent runs, memory UI, marketplace
- [ ] Error states con recovery path (rate limit, guardrail violation, 5xx)
- [ ] Empty states con call-to-action ("Install your first agent")
- [ ] Success states con feedback visual (agent running, memory updated)

### Quality
- [ ] Mobile responsive verificado (iPhone 15, Pixel 8, iPad)
- [ ] Accessibility WCAG 2.1 AA (keyboard nav, ARIA, contrast ≥4.5:1, focus visible)
- [ ] `prefers-reduced-motion` respeta
- [ ] i18n — zero strings hardcoded
- [ ] Core Web Vitals green (LCP <2.5s, FID <100ms, CLS <0.1)

### Automation
- [ ] `npm run audit:dead-ui` pasa (0 violations)
- [ ] Playwright smoke tests covering golden paths pasan en CI (create agent → first run → memory read)
- [ ] PostHog events tracked (agent_created, agent_run_started, agent_run_completed, agent_error)
- [ ] Sentry captures errors
- [ ] LangSmith traces en cada run
- [ ] Red-team tests (15 adversarial prompts) bloqueados al 100%

### Stubs (si aplica)
- [ ] STUB multi-agent MCP marcado `// STUB — activar FASE 36+`
- [ ] STUB visible al user con badge `[H3 próximamente]`
- [ ] STUBs documentados en §5.B
- [ ] STUB endpoints devuelven 501 Not Implemented

### Sign-off
- [ ] Reviewer manual: @____ firmó este checklist
- [ ] PR link: #___
- [ ] Tag fase-31-complete aplicado post-merge

## Features implementadas en esta fase (≈ 22)

1. **F-31-01** Runtime LangGraph + Claude Sonnet 4.6 via Vercel AI Gateway
2. **F-31-02** Checkpointer Postgres con tabla `agent_checkpoints`
3. **F-31-03** Agent template Researcher con tools + citations
4. **F-31-04** Agent template Match-Maker con cron nightly
5. **F-31-05** Agent template Follow-Up con human-in-the-loop
6. **F-31-06** Agent template Negotiator con guardrail extra
7. **F-31-07** Agent template Report-Generator weekly
8. **F-31-08** Configurator UI wizard 5 pasos
9. **F-31-09** Tabla `agents` + RLS owner-only
10. **F-31-10** Memoria capa 1 short-term (checkpointer)
11. **F-31-11** Memoria capa 2 medium-term (Vercel Runtime Cache)
12. **F-31-12** Memoria capa 3 long-term (Anthropic Memory API)
13. **F-31-13** UI `/agents/{id}/memory` management + LFPDPPP delete
14. **F-31-14** Marketplace publish flow con admin review
15. **F-31-15** Marketplace install + rating
16. **F-31-16** 10 agents oficiales DMX seed en marketplace
17. **F-31-17** Constitutional AI pre-flight + post-flight guardrails
18. **F-31-18** Red-team test suite 15 adversarial prompts
19. **F-31-19** Observability LangSmith + AI Gateway
20. **F-31-20** Dashboard admin `/admin/agents/observability`
21. **F-31-21** Agent usage billing metered via Stripe
22. **F-31-22** MCP multi-agent orchestration STUB H3

## Próxima fase

[FASE 32 — Digital Twin](./FASE_32_DIGITAL_TWIN.md)

---
**Autor:** Claude Opus 4.7 (biblia v2 moonshot) | **Fecha:** 2026-04-18
