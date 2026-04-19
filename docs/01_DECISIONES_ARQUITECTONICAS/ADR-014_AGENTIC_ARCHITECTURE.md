# ADR-014 — Agentic Architecture: agentes persistentes como producto nativo

**Status:** Accepted
**Date:** 2026-04-18
**Deciders:** Manu Acosta (founder), Claude Opus 4.7

## Context

El shift fundamental de AI 2025-2026 es el paso de **chatbots** (reactive, single-turn, sin memoria, sin herramientas) a **agents** (proactive, multi-turn, memoria persistente, tool-using, operan 24/7).

Evidencia del shift:

- **Anthropic Claude 4.6/4.7** con computer use, memory API cross-session (2026), constitutional AI.
- **OpenAI** con Assistants API, GPTs marketplace, function calling maduro.
- **Manus.im** (startup China, 2025) — agent autónomo que vaporizó el mercado con demos virales; referencia de "agent como producto", no feature.
- **Cursor Composer + Agent** — reemplaza al developer pair programmer como mode dominante (vs Copilot single-line).
- **Replit Agent** — build an app from prompt, autonomous execution.
- **Devin (Cognition)** — agentic software engineer; referencia (aunque polémica en implementación).
- **LangGraph** — framework que ha emergido como estándar para multi-agent orchestration.

La evidencia económica:

- **Clay** (GTM enrichment + agents) — valuación $1.25B (Jul 2024) con modelo 100% agentic.
- **Lusha** — $1.5B revenue run rate basado en agent-driven enrichment.
- **Apollo.io** — $1.6B valuación, agentic sequencing.
- **Gong.io** — $7.25B valuación, AI agents para sales analytics.

Estos productos no son "chatbots con esteroides". Son **agentes** que:
- Persisten estado entre sesiones.
- Tienen herramientas (tools) que ejecutan acciones reales en sistemas externos.
- Operan proactivamente (cron-like) sin prompt del usuario.
- Aprenden de feedback (reward loop).

### Por qué importa para DMX

DMX tiene el **inventario perfecto para agents**:

1. **Scores dinámicos** que cambian con cascadas (6 cascadas formales, ver [ADR-010](./ADR-010_IE_PIPELINE_ARCHITECTURE.md)). Un agente puede monitorear zonas y disparar acciones cuando scores cruzan thresholds.
2. **Transacciones reales** del marketplace. Un agente puede detectar oportunidades de arbitrage, alertar, proponer ACM, generar pitch.
3. **Usuarios con intent explícito** (asesores, compradores, desarrolladores). Un agente puede personalizar workflow por rol.
4. **Herramientas tRPC mature** (H1 FASE 02). Un agente tiene ~200 tool calls potenciales disponibles.
5. **Anthropic Memory API cross-session** (FASE 19). Los agentes mantienen contexto por semanas/meses.
6. **Constitutional AI pattern** alineado con principios DMX (P4 confidence cascade, nunca mentir con precisión falsa).

Sin agents, DMX es "otra UI con scores". Con agents, DMX es "la plataforma donde los asesores, compradores, desarrolladores tienen copilots que trabajan 24/7 a su favor". Diferencia de categoría.

### Fuerza competitiva

- **Pulppo, Wiggot, DD360**: cero agentes. Todavía en paradigma chatbot simple.
- **CoStar**: "COMPASS" es un modelo predictivo, no agent (no tool use, no memoria cross-session).
- **Cherre Agent.STUDIO**: el nombre anuncia agents pero es enterprise-only y cerrado.

DMX tiene ventana ~18 meses para establecer liderazgo en agentic spatial intelligence LATAM antes de que CoStar/Cherre respondan.

## Decision

**DMX adopta una arquitectura agentic nativa con 5 capas, desde H1 (FASE 19-20) hasta H2 (FASE 31 Agentic Marketplace).**

### Capa 1 — Agent Runtime (LangGraph + Claude Sonnet 4.6 + Memory API)

Stack fijo:

- **LangGraph** (JS/TS, compatible Next.js RSC) — orquestación de grafos de agentes, state management, persistence layer (Postgres via Supabase).
- **Claude Sonnet 4.6** (o sucesor) como modelo primario vía **Vercel AI Gateway** (multi-provider fallback a GPT-4o, Gemini 2 Pro si Claude está caído).
- **Anthropic Memory API** para memoria cross-session (user-scoped + conversation-scoped).
- **Vercel AI SDK 5** para streaming, tool calling, generative UI (RSC streaming components).
- **Redis (Upstash)** para cola de agentes asíncronos (proactive triggers).

Cada agente persiste estado en tabla `agent_sessions`:

```sql
CREATE TABLE agent_sessions (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles,
  agent_type text NOT NULL, -- 'copilot' | 'legal' | 'financiero' | 'match' | 'marketing' | 'coach' | 'custom'
  state jsonb NOT NULL DEFAULT '{}',
  memory_key text, -- pointer a Anthropic Memory API
  active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_interaction_at timestamptz,
  next_scheduled_run timestamptz -- para agentes proactivos
);
```

RLS: usuarios ven sus sesiones; admins ven todas.

### Capa 2 — Agentic Copilot (H1, FASE 19-20)

Copilot sidebar persistente en todos los portales (asesor, comprador, desarrollador, admin). Características:

- **Sidebar right** fijo en desktop; modal bottom en mobile.
- **Streaming responses** con Vercel AI SDK 5 + RSC generative components.
- **Tool use** conectado a ~200 tRPC procedures:
  - `scores.getZoneScores`, `scores.getHistory`.
  - `contactos.create`, `contactos.update`, `contactos.addNote`.
  - `operaciones.createFromMatch`.
  - `busquedas.search`, `busquedas.refine`.
  - `ai.generateACM`, `ai.generateBriefing`, `ai.generateDossier`.
  - `calendario.scheduleVisit`.
  - etc.
- **RAG sobre IE + Biblia + Documentos del usuario**:
  - Vector store: `pgvector` en Supabase con embeddings `text-embedding-3-small` (512 dim).
  - Chunks: metodología pública, docs `/docs` (non-confidential subset), fichas de proyectos, scores actuales.
  - User documents: contratos subidos, PDFs de proyectos, ACMs generados anteriormente.
- **Citations** — cada respuesta cita fuentes con enlaces clickeables a scores / docs / metodología.
- **Memory cross-session**: el Copilot recuerda preferencias del usuario, proyectos en seguimiento, contactos mencionados, conversaciones previas relevantes.
- **Voice** en mobile (Web Speech API + Whisper fallback).
- **Proactive**: Copilot abre conversación cuando detecta oportunidad (nuevo match score >8.5, momentum cambió en zona watchlist, SLA respuesta en riesgo).

### Capa 3 — Agentes especializados (H1 FASE 20, expandido H2 FASE 31)

5 agentes especializados H1, cada uno con system prompt + tools + memory namespace:

| Agente | Rol | Tools principales | Users target |
|--------|-----|-------------------|--------------|
| **Legal** | Valida contratos, cláusulas LATAM, compliance AML/KYC, CFDI | RAG legal pack + OCR docs + `contratos.*` procedures | Asesor, desarrollador, admin |
| **Financiero** | Hipotecas, TCO, yield, escenarios 20y, afford calc | `scores.A0*`, `calc.*`, Banxico macro, SHF tables | Comprador, asesor |
| **Match** | Matching comprador ↔ inventario, discovery weekly | `busquedas.*`, `scores.getProjectScores`, `scores.getUserScores` | Comprador, asesor |
| **Marketing** | Generación piezas (PostCuadrado, Story, VideoStory), kit ventas QR | `ai.generateContent`, `marketing.*`, brand style | Asesor, desarrollador |
| **Coach** | Coaching asesor basado en métricas + gamification | `asesor_gamification.*`, `operaciones.*`, SLAs, badges | Asesor |

Cada agente:
- Hereda del Runtime (Capa 1).
- Tiene system prompt versionado en `features/ai/agents/<agent>/prompt.ts`.
- Tiene whitelist de tools en `features/ai/agents/<agent>/tools.ts`.
- Tiene memory namespace dedicado (`memory:legal:user_xxx`).
- Observa eventos pertinentes (Capa 5) para proactive triggers.

### Capa 4 — Constitutional AI guardrails

Inspirado en Anthropic Constitutional AI. Se materializa en `features/ai/lib/constitution.ts` con reglas duras:

1. **Never hallucinate financial numbers.** Si el agente va a citar una tasa, un precio, un cashflow, DEBE venir de una tool call o de RAG con citation. Si no, responde "no tengo ese dato confiable, deja que lo busque" y dispara tool.
2. **Always cite sources.** Toda respuesta con dato factual lleva `[source: <ref>]` inline.
3. **Ask when uncertain.** Si confidence <0.7, el agente pregunta antes de ejecutar acciones con side-effects (ej. crear contacto, agendar visita).
4. **Refuse non-legal actions.** Si usuario pide scraping, captura de datos no autorizados, bypass de rate limits, el agente rechaza explícitamente y explica por qué.
5. **Respect confidence cascade.** Si un score tiene confidence `low` o `insufficient_data`, el agente NO lo presenta como hecho — lo califica "dato limitado".
6. **Respect user role + plan + feature gating.** El agente no intenta acciones que el usuario no tiene permiso de ejecutar (el tool call falla con TRPC_UNAUTHORIZED, el agente no intenta workaround).
7. **No PII leaks.** El agente no expone PII de otros usuarios (nombres, teléfonos, emails) incluso si tiene acceso técnico — ese es un test explícito en Playwright.
8. **Audit log all actions.** Cada tool call con side-effect genera entry en `audit_log` con `agent_type + user_id + tool + args_hash`.

La constitution se carga al system prompt de cada agente y también se valida post-hoc en un **judge pass** (second LLM call con modelo distinto que revisa la respuesta para detectar violations).

### Capa 5 — Agent Observability

Observability stack específico para agents:

- **LangSmith** (o Vercel AI Observability Gateway) — trace completo de cada llamada: input, system prompt, tool calls, intermedios, output final, latencia, cost.
- **Tabla `agent_traces`** en BD (reducido mirror del trace) con `(agent_type, user_id, tokens_in, tokens_out, cost_cents, tools_called[], duration_ms, created_at)`.
- **Sentry** captures errores en tool calls + constitution violations.
- **PostHog events** para UX (`copilot_message_sent`, `agent_tool_executed`, `agent_proactive_triggered`).
- **Dashboard admin** `/admin/ai-observability` con métricas por agente:
  - Tokens consumidos, costo total, margen por usuario.
  - Tool call distribution.
  - Constitution violations count.
  - User NPS por agente (post-interaction pulse survey).

### Capa 6 (H2) — Agent Marketplace (FASE 31)

En FASE 31, usuarios avanzados (Plan Pro+) pueden **configurar agentes custom** sobre el runtime existente:

- **UI Agent Builder**: nombre, system prompt, tools allowlist, memory namespace, triggers (manual / cron / evento).
- **Templates** prediseñados: "Monitor Roma Norte" (cron semanal + report), "Agente Inversionista Multifamiliar" (match multi-criterio), "Agente Legal Colombia" (compliance LATAM).
- **Sharing**: user puede compartir template con comunidad (opt-in). Marketplace público dentro de DMX.
- **Monetización H2**: top creators de templates reciben revenue share si sus templates son usados por otros plan Enterprise.

Esta capa es la fusión con [ADR-015 Platform Play](./ADR-015_PLATFORM_PLAY_H2.md) — agent marketplace es sub-marketplace de app store.

## Rationale

### Vs "AI como feature"

"AI como feature" implica implementar ChatGPT-clone sidebar, generar ACM con 1 prompt, resumir contratos, etc. Commoditized en 2025 — cada SaaS tiene su Copilot genérico.

**Agents son producto.** Diferencia:
- Feature: "Click para generar ACM" — usuario dirige flujo completo.
- Agent: "Monitorea estos 5 proyectos y avísame si alguno cambia momentum; propón ACM automático cuando detectes match con cliente X" — agent toma iniciativa.

### Vs "Build our own LLM"

DMX NO entrena modelos. Usa Claude/GPT/Gemini vía Vercel AI Gateway. Las razones son obvias (costo $100M+ pre-training; DMX opera en capa de aplicación).

Lo que SÍ construye:
- System prompts específicos del dominio.
- Tool use orchestration con LangGraph.
- Memory management con Anthropic Memory API.
- Constitution tailored a DMX.
- Observability pipeline.
- RAG con IE + Biblia.

### Vs "Wait and see" agent maturity

Esperar 2027 a que agents "maduren" no es opción. Los competidores que esperen quedan 24 meses atrás en capacidades. Anthropic/OpenAI han dejado claro que el paradigma es ahora agent-native.

## Consequences

### Positivas

- **Moat aumentado.** User LTV sube porque agentes con memoria cross-session son *sticky* (cambiar a competidor = perder semanas de contexto aprendido).
- **Diferenciación categórica.** "DMX tiene agentes que trabajan 24/7 por ti" vs "CoStar tiene dashboards".
- **Revenue upside.** Plan Pro ($999/mes) ↔ Enterprise ($2499/mes) se justifica por agentes custom + mayor memoria + agentes proactivos.
- **Data flywheel.** Cada interacción con agent genera señal (tools llamadas, follow-ups ejecutados, conversaciones) → mejora prompts + mejora UX + mejora products.
- **Developer attractiveness.** Engineers quieren trabajar en agentic products. Hiring H2 más fácil.
- **Press/PR angle.** "Primera plataforma agentic spatial intelligence LATAM" genera coverage.

### Negativas / tradeoffs

- **Costo de inference.** Agents proactivos 24/7 consumen tokens continuamente. Estimación H1: $0.5-$2/usuario/mes. H2 con agentes custom: $5-$50/usuario/mes. Pricing debe absorberlo (plan Pro $999/mes cubre fácilmente $50/mes compute).
- **Hallucination risk.** Mitigado por Constitutional AI (Capa 4) pero no eliminado. Requiere monitoring continuo + human review de violations.
- **Latency.** Tool calls + RAG + reasoning pueden sumar 3-10s por respuesta. UX debe estar preparado con streaming + skeleton.
- **Complejidad debugging.** Trace de agent con 5 tool calls es difícil de debuggear. Observability (Capa 5) es obligatoria, no opcional.
- **Dependency Anthropic / OpenAI.** Si estos providers caen, agentes DMX caen. Mitigación: Vercel AI Gateway con multi-provider fallback + degradación elegante.
- **Reasoning models más caros.** Claude Opus/4.6 con extended thinking cuesta 5x Sonnet. Enrutamiento: Sonnet default, Opus solo para decisiones críticas (ACM generation, litigation-risk analysis).

### Neutrales

- **Vercel AI Gateway setup** requerido pre-FASE 19. ETA 1-2 días ingeniería.
- **Tool contracts** — cada tRPC procedure llamable por agent debe tener description en OpenAPI-compatible format. Formalizado en FASE 02.
- **Memory retention policy.** LFPDPPP requiere opt-out de memoria persistente. UI en `/perfil/privacidad` con toggle.
- **Kill switch admin.** Admin puede pausar un agente específico o todos (emergency shutdown). Endpoint `/api/admin/agents/shutdown`.

## Alternatives considered

### Alt 1: "ChatGPT clone sidebar" (sin memoria, sin tools)
**Rechazada.** Commoditized. No diferencia DMX de cualquier SaaS 2024 con OpenAI API plug-in.

### Alt 2: "No agents — dashboards mejorados"
**Rechazada.** Paradigma obsoleto 2026. CoStar y Cherre ya están moviendo a agentic; esperar es perder ventana competitiva.

### Alt 3: "Build our own LLM from scratch"
**Rechazada.** Costo prohibitivo ($100M+ pre-training). DMX no es AI lab.

### Alt 4: "Solo un agente genérico multi-purpose"
**Rechazada.** System prompts optimizados por dominio (legal, financiero, match, marketing, coach) superan agentes genéricos en benchmarks internos (tested informalmente con Claude 4.5).

### Alt 5: "Usar LangChain en lugar de LangGraph"
**Rechazada.** LangChain es legacy; LangGraph es el sucesor con mejor state management + graph-based orchestration. Decision mainstream 2026.

### Alt 6: "Agents solo H2, no H1"
**Rechazada.** Copilot H1 con tool use ya es parte de la propuesta de valor diferenciadora del launch. Dejar H2 = commoditized en launch.

### Alt 7: "Sin memoria cross-session (solo conversation-scoped)"
**Rechazada.** Pierde el sticky factor principal. La memoria cross-session es la razón por la que users no se van.

## Success metrics

- **Engagement:** Copilot DAU / total DAU ≥ 60%.
- **Retention:** Users que usan Copilot tienen retention D30 +20 puntos vs non-Copilot users.
- **Tool accuracy:** Tool call success rate >95%.
- **Constitution compliance:** Violations / total interactions <0.5%.
- **User NPS Copilot:** ≥65.
- **Cost efficiency:** Gross margin agentes ≥70% (after compute costs).

## Implementation sequence

- **FASE 19 (H1)** — AI Copilot + RAG + Anthropic Memory API.
- **FASE 20 (H1)** — 5 agentes especializados + constitution + observability.
- **FASE 31 (H2)** — Agent Marketplace (templates + user builder + sharing).
- **Post-FASE 31** — integración con API as Product (ADR-013): clientes B2B pueden construir agents sobre DMX data.

## References

- [ADR-002 — AI-Native Architecture](./ADR-002_AI_NATIVE_ARCHITECTURE.md) — principio matriz AI-native.
- [ADR-011 — Moonshot 3 Horizontes](./ADR-011_MOONSHOT_3_HORIZONTES.md) — ubicación en H1/H2.
- [ADR-013 — API as Product](./ADR-013_API_AS_PRODUCT.md) — exposición vía API B2B.
- [ADR-015 — Platform Play H2](./ADR-015_PLATFORM_PLAY_H2.md) — agent marketplace como sub-app store.
- [FASE 03 — AI Native Shell](../02_PLAN_MAESTRO/FASE_03_AI_NATIVE_SHELL.md) — shell base.
- [FASE 19 — AI Copilot + RAG](../02_PLAN_MAESTRO/FASE_19_AI_COPILOT.md).
- [FASE 20 — Agentes Especializados](../02_PLAN_MAESTRO/FASE_20_AGENTES.md).
- [FASE 31 — Agentic Marketplace](../02_PLAN_MAESTRO/FASE_31_AGENTIC_MARKETPLACE.md).
- [07.4 GC-4 Copilot](../07_GAME_CHANGERS/) — game changer Copilot.
- [07.5 GC-5 Agents](../07_GAME_CHANGERS/).
- [07.7 GC-7 Memory API](../07_GAME_CHANGERS/).
- [07.8 GC-8 Constitutional AI](../07_GAME_CHANGERS/).
- [07.31 GC-31 Manus Agentic Pattern](../07_GAME_CHANGERS/).
- Anthropic — "Constitutional AI" paper (Bai et al., 2022) + "Memory" announcement 2026.
- LangGraph docs — https://langchain-ai.github.io/langgraph/.
- Vercel AI SDK 5 docs — https://sdk.vercel.ai.
- Clay / Lusha / Apollo benchmarks (public metrics).

---

**Author:** Claude Opus 4.7 (biblia v2 moonshot rewrite) | **Date:** 2026-04-18
