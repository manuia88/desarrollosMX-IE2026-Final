# FASE 03 — AI-Native Shell

> **Duración estimada:** 3 sesiones Claude Code (~6 horas con agentes paralelos)
> **Dependencias:** [FASE 00 — Bootstrap](./FASE_00_BOOTSTRAP.md), [FASE 01 — BD Fundación](./FASE_01_BD_FUNDACION.md), [FASE 02 — Auth](./FASE_02_AUTH_Y_PERMISOS.md)
> **Bloqueantes externos:**
> - `ANTHROPIC_API_KEY` (Claude Sonnet 4) — Manu debe crear cuenta con billing activo, > $25/mes para dev
> - `OPENAI_API_KEY` (GPT-4o-mini fallback) — cuenta con billing
> - Vercel AI Gateway habilitado en el proyecto Vercel (Fase 00). Configurar rutas por categoría.
> - `DEEPGRAM_API_KEY` (opcional — upgrade voice H2; H1 usa Web Speech API nativo)
> - PostHog project + API key (`NEXT_PUBLIC_POSTHOG_KEY`) para telemetría AI
> - Sentry DSN (`SENTRY_DSN`) para capturar errores de AI calls
> - Anthropic Memory API — beta activada en la cuenta de Manu (salió 2026, requiere flag)
> **Resultado esperado:** Shell AI-native funcional sin lógica de negocio aún: ⌘K Command Palette con comandos stub, Copilot sidebar persistente collapsed/expanded, Memory API namespace por usuario, Voice interaction via Web Speech API, Generative components scaffold, RAG scaffold con pgvector listo para embedar contenido en fases posteriores, multi-agent orchestrator router, AI telemetry en PostHog + Sentry. Tag `fase-03-complete`.
> **Priority:** [H1]

## Contexto y objetivo

DesarrollosMX se define como "AI-native, not AI-assisted" (ADR-002). Esta fase construye el shell AI que será ubicuo en toda la plataforma: el ⌘K como UI primaria (inspirado en Linear/Raycast), el Copilot sidebar persistente (inspirado en Cursor Composer) con contexto del módulo activo, y la infraestructura de agentes multi-especializados con router meta. No se implementa lógica de negocio — cada módulo en Fases 13+ registra sus propios comandos + agentes contra este shell. La calidad de este shell determina la percepción AI-native del producto entero.

## Bloques

### BLOQUE 3.A — Vercel AI SDK v6 + AI Gateway routing

#### MÓDULO 3.A.1 — Setup Vercel AI SDK + providers

**Pasos:**
- `[3.A.1.1]` Instalar deps: `npm i ai @ai-sdk/anthropic @ai-sdk/openai @ai-sdk/react`.
- `[3.A.1.2]` Crear `shared/lib/ai/providers.ts`:
  ```typescript
  import { anthropic } from '@ai-sdk/anthropic';
  import { openai } from '@ai-sdk/openai';

  export const MODEL_REGISTRY = {
    'primary': anthropic('claude-sonnet-4-5'),
    'fast': openai('gpt-4o-mini'),
    'legal': anthropic('claude-sonnet-4-5'),       // high-stakes precisión
    'financial': anthropic('claude-sonnet-4-5'),
    'match': anthropic('claude-sonnet-4-5'),       // estructurado
    'marketing': openai('gpt-4o-mini'),            // creatividad barata
    'simple_task': openai('gpt-4o-mini')
  } as const;

  export type ModelCategory = keyof typeof MODEL_REGISTRY;
  ```
- `[3.A.1.3]` Crear `shared/lib/ai/ai-gateway.ts` que usa strings `"provider/model"` para permitir overrides via env:
  ```typescript
  import { createAnthropic } from '@ai-sdk/anthropic';
  import { createOpenAI } from '@ai-sdk/openai';

  // Vercel AI Gateway: rewrites provider base URLs a https://ai-gateway.vercel.sh
  const anthropicGateway = createAnthropic({
    baseURL: process.env.AI_GATEWAY_URL ? `${process.env.AI_GATEWAY_URL}/anthropic` : undefined,
    apiKey: process.env.ANTHROPIC_API_KEY!
  });

  export function resolveModel(category: ModelCategory) { return MODEL_REGISTRY[category]; }
  ```
- `[3.A.1.4]` En Vercel dashboard activar AI Gateway, configurar observability + rate limits per provider.

**Criterio de done del módulo:**
- [ ] `npm run dev` no rompe al importar providers.
- [ ] Un test `generateText({ model: resolveModel('fast'), prompt: 'hola' })` responde.

#### MÓDULO 3.A.2 — `generateAI` wrapper con fallback + telemetry

**Pasos:**
- `[3.A.2.1]` Crear `shared/lib/ai/generate.ts`:
  ```typescript
  import { generateText, streamText, type CoreMessage } from 'ai';
  import * as Sentry from '@sentry/nextjs';
  import { posthog } from '@/shared/lib/telemetry/posthog';

  export async function generateAI(opts: {
    category: ModelCategory;
    messages: CoreMessage[];
    userId: string;
    session?: string;
    fallbackCategory?: ModelCategory;
    maxTokens?: number;
  }) {
    const start = Date.now();
    posthog.capture({ distinctId: opts.userId, event: 'ai_query_started', properties: { category: opts.category } });
    try {
      const res = await generateText({ model: resolveModel(opts.category), messages: opts.messages, maxTokens: opts.maxTokens });
      posthog.capture({ distinctId: opts.userId, event: 'ai_query_completed', properties: { category: opts.category, tokens_in: res.usage?.promptTokens, tokens_out: res.usage?.completionTokens, ms: Date.now() - start } });
      return res;
    } catch (err) {
      Sentry.captureException(err, { tags: { category: opts.category, userId: opts.userId } });
      if (opts.fallbackCategory) {
        return generateText({ model: resolveModel(opts.fallbackCategory), messages: opts.messages, maxTokens: opts.maxTokens });
      }
      throw err;
    }
  }
  ```
- `[3.A.2.2]` Crear `app/api/ai/stream/route.ts` usando `streamText` para SSE streaming.

**Criterio de done del módulo:**
- [ ] Call a `/api/ai/stream` emite tokens via SSE.
- [ ] Errores capturados en Sentry.
- [ ] Events en PostHog (`ai_query_started`, `ai_query_completed`).

### BLOQUE 3.B — Anthropic Memory API integration

#### MÓDULO 3.B.1 — Namespace por usuario + session persistence

**Pasos:**
- `[3.B.1.1]` Crear tabla `ai_memory_store` (persistencia local para recuerdos sintetizados):
  ```sql
  CREATE TABLE public.ai_memory_store (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    namespace TEXT NOT NULL,                    -- 'user:<uuid>' | 'project:<uuid>' | 'session:<uuid>'
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    embedding VECTOR(1536),                      -- para RAG sobre memoria
    importance_score REAL NOT NULL DEFAULT 0.5,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_memory_namespace ON public.ai_memory_store (namespace, key);
  CREATE INDEX idx_memory_embedding ON public.ai_memory_store USING ivfflat (embedding vector_cosine_ops);
  CREATE INDEX idx_memory_user ON public.ai_memory_store (user_id, updated_at DESC);
  ```
- `[3.B.1.2]` Crear `shared/lib/ai/memory.ts`:
  ```typescript
  export class MemoryClient {
    constructor(private userId: string) {}
    namespace(scope: 'user' | 'project' | 'session', id?: string) {
      return scope === 'user' ? `user:${this.userId}` : `${scope}:${id}`;
    }
    async remember(namespace: string, key: string, value: unknown, opts?: { ttl?: number; importance?: number }) {
      // write to ai_memory_store via tRPC mutation memory.upsert
    }
    async recall(namespace: string, opts?: { query?: string; limit?: number; minImportance?: number }) {
      // if query: embed + search pgvector; else fetch by recency
    }
    async forget(namespace: string, key: string) { /* DELETE */ }
  }
  ```
- `[3.B.1.3]` tRPC routes: `memory.upsert`, `memory.recall`, `memory.forget` en `features/ia-generativa/routes/memory.ts`.
- `[3.B.1.4]` Integración con Anthropic Memory API beta (cuando esté GA):
  - Headers: `anthropic-beta: memory-1` y `memory.enabled: true` en llamadas generate.
  - Fallback local store (`ai_memory_store`) cuando Anthropic Memory no está disponible.

**Criterio de done del módulo:**
- [ ] Tabla con pgvector índice ivfflat.
- [ ] `memory.recall(ns, { query: 'preferencias zona' })` retorna rows ordenadas por similarity.

### BLOQUE 3.C — Command Palette ⌘K global

#### MÓDULO 3.C.1 — Componente con `cmdk`

**Pasos:**
- `[3.C.1.1]` Instalar: `npm i cmdk`.
- `[3.C.1.2]` Crear `shared/ui/layout/CommandPalette.tsx`:
  ```typescript
  'use client';
  import { Command } from 'cmdk';
  import { useHotkeys } from 'react-hotkeys-hook';
  // ...
  export function CommandPalette() {
    const [open, setOpen] = useState(false);
    useHotkeys('mod+k', () => setOpen(o => !o), { preventDefault: true });
    const commands = useCommandRegistry();
    return (
      <Command.Dialog open={open} onOpenChange={setOpen} label="Command Palette">
        <Command.Input placeholder="Buscar, actuar o preguntar a la IA..." />
        <Command.List>
          <Command.Empty>Sin resultados. Pulsa Enter para preguntar a IA.</Command.Empty>
          {commands.groups.map(group => (
            <Command.Group key={group.id} heading={group.label}>
              {group.items.map(cmd => (
                <Command.Item key={cmd.id} onSelect={() => cmd.run()} shortcut={cmd.shortcut}>
                  <cmd.Icon /> {cmd.label}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
      </Command.Dialog>
    );
  }
  ```
- `[3.C.1.3]` Instalar hotkeys: `npm i react-hotkeys-hook`.
- `[3.C.1.4]` Insertar `<CommandPalette />` en `app/layout.tsx` dentro del provider tree.

**Criterio de done del módulo:**
- [ ] `⌘K` abre el dialog.
- [ ] Estilo Dopamine (glass backdrop, rounded-xl, shadow-glow).

#### MÓDULO 3.C.2 — Registry de comandos extensible

**Pasos:**
- `[3.C.2.1]` Crear `shared/lib/command-palette/registry.ts`:
  ```typescript
  type Command = {
    id: string;
    label: string;
    group: string;                              // 'Navegación' | 'IA' | 'Acciones' | 'Ajustes'
    shortcut?: string[];
    Icon: React.FC;
    keywords?: string[];
    when?: () => boolean;                       // feature flag
    run: () => Promise<void> | void;
  };
  const registry = new Map<string, Command>();
  export const commandRegistry = {
    register(cmd: Command) { registry.set(cmd.id, cmd); },
    unregister(id: string) { registry.delete(id); },
    list() { return Array.from(registry.values()).filter(c => !c.when || c.when()); }
  };
  ```
- `[3.C.2.2]` Hook `useCommandRegistry()` reacciona a invalidaciones via event emitter.
- `[3.C.2.3]` Seed comandos globales:
  - `nav.dashboard` → `router.push('/asesor/dashboard')`.
  - `nav.marketplace` → `router.push('/marketplace')`.
  - `actions.logout` → `supabase.auth.signOut()`.
  - `ai.ask` → abre Copilot con input del palette.
  - `settings.locale.change` → modal de selector locale.
  - `settings.theme.toggle` → toggle dark mode.
- `[3.C.2.4]` Documentar en CLAUDE.md: "Cada módulo en Fases 13+ registra sus comandos en `useEffect(() => commandRegistry.register({ ... }); return () => commandRegistry.unregister(...); })`".

**Criterio de done del módulo:**
- [ ] Registry con ≥ 6 comandos stub iniciales.
- [ ] Grupos se renderizan en el palette.
- [ ] Feature `when()` respetado.

#### MÓDULO 3.C.3 — Fallback "preguntar a IA"

**Pasos:**
- `[3.C.3.1]` Cuando `Command.Empty` aparece y el user presiona Enter: invoca `askCopilot(currentQuery)` que abre el Copilot con el contexto y genera respuesta.
- `[3.C.3.2]` Atajo alterno `⌘/` directo al Copilot input.

**Criterio de done del módulo:**
- [ ] "hola cómo estás" en palette + Enter abre Copilot con respuesta.

### BLOQUE 3.D — Copilot sidebar persistente

#### MÓDULO 3.D.1 — Componente `AICopilot.tsx`

**Pasos:**
- `[3.D.1.1]` Crear `shared/ui/layout/AICopilot.tsx` — sidebar derecho fijo:
  - Collapsed: 60px, muestra icono esfera pulsante + badge con count de sugerencias activas.
  - Expanded: 420px, chat UI con streaming messages, context chips (módulo actual), acciones rápidas.
- `[3.D.1.2]` State Zustand `shared/hooks/useCopilotStore.ts`:
  ```typescript
  export const useCopilotStore = create<{
    isOpen: boolean; toggle: () => void;
    messages: Message[]; pushMessage: (m: Message) => void;
    context: CopilotContext | null; setContext: (c: CopilotContext | null) => void;
    suggestions: Suggestion[]; setSuggestions: (s: Suggestion[]) => void;
  }>(...)
  ```
- `[3.D.1.3]` Atajo `⌘J` → toggle.
- `[3.D.1.4]` Streaming: `const { messages, input, handleInputChange, handleSubmit } = useChat({ api: '/api/ai/copilot' });`.

**Criterio de done del módulo:**
- [ ] `⌘J` toggle animado (Framer Motion).
- [ ] Messages se renderizan con markdown + citaciones.

#### MÓDULO 3.D.2 — Context-aware (módulo actual)

**Pasos:**
- `[3.D.2.1]` Crear hook `shared/hooks/useCopilotContext.ts` que cada página llama con:
  ```typescript
  useCopilotContext({
    module: 'busquedas',
    entity: { type: 'busqueda', id: busquedaId },
    visibleData: { filters, results_count }
  });
  ```
  El hook sincroniza con `useCopilotStore.setContext()`.
- `[3.D.2.2]` El endpoint `/api/ai/copilot` recibe el context y lo incluye en system prompt.
- `[3.D.2.3]` Chips visibles en Copilot UI mostrando contexto activo; `×` para soltar.

**Criterio de done del módulo:**
- [ ] Navegar a `/asesor/busquedas/X` → context incluye module=busquedas.
- [ ] System prompt refleja el contexto.

#### MÓDULO 3.D.3 — Sugerencias proactivas

**Pasos:**
- `[3.D.3.1]` Endpoint `/api/ai/suggestions` que toma context y retorna 2-5 sugerencias (JSON structured output con `generateObject`).
- `[3.D.3.2]` Poll cada 30s o on context change — muestra badge con count.
- `[3.D.3.3]` Click en sugerencia abre copilot con preguntai pre-pobalada.

**Criterio de done del módulo:**
- [ ] Sugerencias aparecen según contexto.

### BLOQUE 3.E — Generative components scaffold

#### MÓDULO 3.E.1 — `<GenerativeComponent spec={...}/>`

**Pasos:**
- `[3.E.1.1]` Crear `shared/ui/generative/GenerativeComponent.tsx`:
  ```typescript
  type Spec =
    | { type: 'stat_card'; label: string; value: string | number; trend?: number; color?: string }
    | { type: 'comparison_table'; columns: string[]; rows: Array<Array<string | number>> }
    | { type: 'mini_map'; center: [number, number]; zoom: number; markers: Array<{lng:number,lat:number,label?:string}> }
    | { type: 'timeline'; items: Array<{date: string; label: string}> }
    | { type: 'cta_card'; title: string; description: string; action: { label: string; href: string } };

  export function GenerativeComponent({ spec }: { spec: Spec }) {
    switch (spec.type) {
      case 'stat_card': return <StatCard {...spec} />;
      case 'comparison_table': return <ComparisonTable {...spec} />;
      case 'mini_map': return <MiniMap {...spec} />;
      case 'timeline': return <Timeline {...spec} />;
      case 'cta_card': return <CTACard {...spec} />;
    }
  }
  ```
- `[3.E.1.2]` Zod schema export para que AI genere specs válidos con `generateObject({ model, schema: SpecSchema, prompt })`.
- `[3.E.1.3]` Endpoint `/api/ai/generate-component` que toma prompt + context, llama generateObject, retorna spec.
- `[3.E.1.4]` Copilot renderiza `<GenerativeComponent>` inline cuando la respuesta incluye tool_use de este tipo.

**Criterio de done del módulo:**
- [ ] Spec válido genera componente renderizado.
- [ ] Spec inválido cae al catch y renderiza fallback card.

### BLOQUE 3.F — Voice interaction

#### MÓDULO 3.F.1 — Web Speech API (H1 baseline)

**Pasos:**
- `[3.F.1.1]` Crear hook `shared/hooks/useVoiceInput.ts`:
  ```typescript
  export function useVoiceInput(opts: { locale: string; onTranscript: (text: string) => void }) {
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const start = () => { /* new webkitSpeechRecognition, lang = opts.locale, onresult → opts.onTranscript */ };
    const stop = () => { /* ... */ };
    return { start, stop, isListening };
  }
  ```
- `[3.F.1.2]` Botón mic en Copilot input + ⌘K input → start/stop voice.
- `[3.F.1.3]` Respetar `navigator.permissions.query({ name: 'microphone' })`.
- `[3.F.1.4]` Fallback si Web Speech no soportado (Firefox): mostrar tooltip "Voz no disponible en este navegador; prueba Chrome/Edge/Safari".

**Criterio de done del módulo:**
- [ ] Micrófono captura voz, transcribe en español MX, rellena input.
- [ ] UI muestra estado `isListening` con animación.

#### MÓDULO 3.F.2 — Deepgram upgrade (pin H2)

**Pasos:**
- `[3.F.2.1]` Stub `shared/lib/ai/deepgram.ts` con interfaz equivalente (`start/stop/transcript`) usando WebSocket a `wss://api.deepgram.com/v1/listen`.
- `[3.F.2.2]` Feature flag `shared.voice.deepgram` — off en H1, on en H2.

**Criterio de done del módulo:**
- [ ] Código stub compila sin invocarse.

### BLOQUE 3.G — RAG scaffold con pgvector

#### MÓDULO 3.G.1 — Tabla `embeddings` genérica

**Pasos:**
- `[3.G.1.1]` Schema:
  ```sql
  CREATE TABLE public.embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code CHAR(2) REFERENCES public.countries(code),
    source_type TEXT NOT NULL,                  -- 'project' | 'unit' | 'captacion' | 'score' | 'biblia_doc' | 'user_memory'
    source_id UUID NOT NULL,
    chunk_index SMALLINT NOT NULL DEFAULT 0,
    content TEXT NOT NULL,
    embedding VECTOR(1536) NOT NULL,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_type, source_id, chunk_index)
  );
  CREATE INDEX idx_emb_vec ON public.embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
  CREATE INDEX idx_emb_source ON public.embeddings (source_type, source_id);
  CREATE INDEX idx_emb_country ON public.embeddings (country_code);
  ```
- `[3.G.1.2]` Función SQL `match_embeddings`:
  ```sql
  CREATE OR REPLACE FUNCTION public.match_embeddings(
    p_embedding VECTOR(1536),
    p_source_types TEXT[] DEFAULT NULL,
    p_country_code CHAR(2) DEFAULT NULL,
    p_match_count INT DEFAULT 10,
    p_min_similarity REAL DEFAULT 0.7
  ) RETURNS TABLE (id UUID, source_type TEXT, source_id UUID, content TEXT, similarity REAL, meta JSONB)
  LANGUAGE sql STABLE SECURITY INVOKER AS $$
    SELECT e.id, e.source_type, e.source_id, e.content,
           1 - (e.embedding <=> p_embedding) AS similarity, e.meta
    FROM public.embeddings e
    WHERE (p_source_types IS NULL OR e.source_type = ANY(p_source_types))
      AND (p_country_code IS NULL OR e.country_code = p_country_code)
      AND 1 - (e.embedding <=> p_embedding) >= p_min_similarity
    ORDER BY e.embedding <=> p_embedding
    LIMIT p_match_count;
  $$;
  ```
- `[3.G.1.3]` RLS: SELECT por país del user + superadmin override.

**Criterio de done del módulo:**
- [ ] Tabla + índice creados.
- [ ] Función `match_embeddings` retorna rows.

#### MÓDULO 3.G.2 — RAG client con citations cascade

**Pasos:**
- `[3.G.2.1]` Crear `shared/lib/ai/rag.ts`:
  ```typescript
  export async function rag(query: string, opts: { sourceTypes?: string[]; country?: string; limit?: number }) {
    const embedding = await embed(query);        // via OpenAI text-embedding-3-small
    const { data: matches } = await supabaseAdmin.rpc('match_embeddings', {
      p_embedding: embedding, p_source_types: opts.sourceTypes, p_country_code: opts.country, p_match_count: opts.limit ?? 8
    });
    return matches.map(m => ({ content: m.content, citation: `${m.source_type}:${m.source_id}`, similarity: m.similarity }));
  }
  ```
- `[3.G.2.2]` Wrapper `generateAIWithRAG`: inyecta `<context>{matches}</context>` en system prompt + instruye "cita con [source_type:source_id] inline".
- `[3.G.2.3]` Parse de citations en respuesta → renderizar clickeables en Copilot.

**Criterio de done del módulo:**
- [ ] RAG retorna matches.
- [ ] Citations aparecen parsed en UI.

### BLOQUE 3.H — Multi-agent orchestrator

#### MÓDULO 3.H.1 — Router meta + agentes especializados

**Pasos:**
- `[3.H.1.1]` Crear `shared/lib/ai/agents.ts`:
  ```typescript
  type Agent = {
    id: 'router' | 'legal' | 'financial' | 'match' | 'marketing' | 'general';
    systemPrompt: string;
    model: ModelCategory;
    tools?: Tool[];
  };
  export const AGENTS: Record<string, Agent> = {
    router: { id: 'router', systemPrompt: 'Router meta. Clasifica la intención en: legal|financial|match|marketing|general. Devuelve JSON {agent, reason}.', model: 'fast' },
    legal: { id: 'legal', systemPrompt: 'Experto legal inmobiliario MX/CO/AR/BR/CL...', model: 'legal' },
    financial: { id: 'financial', systemPrompt: 'Experto financiero, hipotecas, tasas, ROI...', model: 'financial' },
    match: { id: 'match', systemPrompt: 'Experto matching buyer↔property...', model: 'match' },
    marketing: { id: 'marketing', systemPrompt: 'Copywriter inmobiliario...', model: 'marketing' },
    general: { id: 'general', systemPrompt: 'Asistente general DesarrollosMX...', model: 'primary' }
  };
  export async function orchestrate(query: string, ctx: any) {
    const route = await generateObject({ model: resolveModel('fast'), schema: RouteSchema, prompt: AGENTS.router.systemPrompt + '\n\nQuery: ' + query });
    const agent = AGENTS[route.object.agent];
    return generateAI({ category: agent.model, messages: [{ role: 'system', content: agent.systemPrompt }, { role: 'user', content: query }], ... });
  }
  ```
- `[3.H.1.2]` LangGraph pattern: grafo declarativo en `shared/lib/ai/agent-graph.ts` con nodos (agents) + edges (condiciones) — implementación simple H1 (linear route). H2 upgrade a state machine con cycles.
- `[3.H.1.3]` Expose `orchestrate` via tRPC `ai.ask` procedure.

**Criterio de done del módulo:**
- [ ] Router clasifica query "¿cuánto IVA pago en CDMX?" → financial.
- [ ] Respuesta coherente del agent correspondiente.

### BLOQUE 3.I — AI Telemetry

#### MÓDULO 3.I.1 — PostHog events + Sentry errors

**Pasos:**
- `[3.I.1.1]` Setup PostHog en `shared/lib/telemetry/posthog.ts` — server-side client.
- `[3.I.1.2]` Eventos obligatorios: `ai_query_started`, `ai_query_completed`, `ai_query_failed`, `copilot_opened`, `copilot_message_sent`, `command_palette_opened`, `voice_started`, `generative_component_rendered`, `memory_recall`, `rag_match`.
- `[3.I.1.3]` Properties por event: `category`, `model`, `latency_ms`, `tokens_in`, `tokens_out`, `cost_usd` (calc con pricing lookup), `user_id`, `country_code`.
- `[3.I.1.4]` Dashboard PostHog: "AI Usage Overview" con cards top 10 queries, latency p95, error rate, cost per user.
- `[3.I.1.5]` Sentry: tag cada call AI con `ai.category`, `ai.model`, `ai.user_id` para filtrar errores.

**Criterio de done del módulo:**
- [ ] Events aparecen en PostHog UI.
- [ ] Errores AI aparecen en Sentry.

## Criterio de done de la FASE

- [ ] Vercel AI SDK v6 + AI Gateway configurado.
- [ ] Claude Sonnet 4 como primary + GPT-4o-mini fallback operativo.
- [ ] Routing por categoría (legal/financial/match/marketing) con providers mapeados.
- [ ] Anthropic Memory API integrada (con fallback local en `ai_memory_store`).
- [ ] Command Palette ⌘K funcional con registry extensible + 6+ comandos stub.
- [ ] Copilot sidebar persistente con collapsed/expanded + context-aware.
- [ ] Generative components scaffold con 5 tipos de spec.
- [ ] Voice interaction via Web Speech API operativa.
- [ ] RAG scaffold con `embeddings` + `match_embeddings` + citations cascade.
- [ ] Multi-agent orchestrator con 6 agents + router meta.
- [ ] AI Telemetry PostHog + Sentry activa.
- [ ] Tag git: `fase-03-complete`.
- [ ] Tests e2e: ⌘K abre, Copilot ⌘J toggle, voice captura.

## Features implementadas en esta fase (≈ 20)

1. **F-03-01** Vercel AI SDK v6 + AI Gateway routing
2. **F-03-02** Claude Sonnet 4 primary + GPT-4o-mini fallback
3. **F-03-03** Model registry por categoría (6 categorías)
4. **F-03-04** `generateAI` wrapper con telemetry + fallback
5. **F-03-05** Endpoint `/api/ai/stream` SSE streaming
6. **F-03-06** Anthropic Memory API beta integration
7. **F-03-07** Tabla `ai_memory_store` con pgvector + namespaces
8. **F-03-08** Command Palette ⌘K global con cmdk
9. **F-03-09** Command registry extensible por módulo
10. **F-03-10** Command Palette fallback "preguntar a IA"
11. **F-03-11** Copilot sidebar persistente 60↔420px
12. **F-03-12** Copilot context-aware (module/entity/visibleData)
13. **F-03-13** Sugerencias proactivas en Copilot
14. **F-03-14** `<GenerativeComponent>` con 5 tipos de spec
15. **F-03-15** Voice interaction Web Speech API
16. **F-03-16** Voice Deepgram stub (H2 pin)
17. **F-03-17** RAG con tabla `embeddings` + `match_embeddings`
18. **F-03-18** Citations cascade parser en Copilot
19. **F-03-19** Multi-agent orchestrator (router + 5 specialists)
20. **F-03-20** AI Telemetry PostHog + Sentry tagging

## Próxima fase

[FASE 04 — Design System Dopamine](./FASE_04_DESIGN_SYSTEM.md)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent C) | **Fecha:** 2026-04-17
