# ADR-002 — Arquitectura AI-native (no AI-assisted)

**Status:** Accepted
**Date:** 2026-04-17
**Deciders:** Manu Acosta (founder), Claude Opus 4.7 (Senior Review)

## Context

DesarrollosMX se posiciona como **Spatial Decision Intelligence** (IE1-§1.3), no como CRM con features de IA atornilladas. El principio rector —"El marketplace es el canal de distribución, el IE es el producto, los datos temporales acumulados son el moat"— obliga a que la capa de IA no sea accesoria sino el **vector primario de interacción**: asesores, desarrolladores, administradores y compradores deberían llegar a la mayoría de tareas a través de intent ("quiero ver el pipeline de la semana", "sugiéreme 3 proyectos para este contacto", "genera un dossier de inversión"), no a través de navegación por menús.

Las tendencias técnicas de 2025-2026 que habilitan esta decisión:

- **Vercel AI SDK v6** con AI Gateway unificado (provider-agnostic: `anthropic/claude-sonnet-4`, `openai/gpt-4o-mini`, `openai/gpt-4o`) con streaming, fallback, cost tracking, rate limits y retries nativos.
- **Anthropic Memory API** (lanzada 2026) para memoria persistente cross-session por usuario, soportando el patrón "Claude recuerda que tu contacto Juan López es inversor y que la última visita fue el martes pasado".
- **LangGraph** como orquestador multi-agente (router meta + agentes especializados legal/financiero/match/marketing) con primitivas para hand-off entre agentes.
- **cmdk** y patrones Command Palette madurados (Linear, Raycast, Vercel, Cursor Composer) que hacen viable ⌘K como UI primaria.
- **Generative UI** con Vercel AI SDK v6 (`streamUI`, `render` helpers) para que la IA construya componentes React tipados on-the-fly.
- **Modelos multi-modales de voz** (Whisper + Voice modes nativos en SDKs 2026) que permiten "Búsqueda por voz en español MX con modismos" como default mobile.

Decisión del founder (BRIEFING §2, pregunta 7): **"AI-native, no AI-assisted"**. Esto se materializa en 7 atributos no negociables (BRIEFING §3):

1. Command Palette ⌘K como UI primaria.
2. Copilot sidebar persistente tipo Cursor Composer.
3. Voice interaction default en mobile.
4. Multi-agent orchestration con router meta.
5. Memory Layer con Anthropic Memory API cross-session.
6. RAG sobre inventory + scores + biblia + docs, con citations verificables.
7. Generative components + proactive intelligence.

## Decision

Se adopta una **arquitectura AI-native** donde la capa de inteligencia es shell primario del producto, no feature opcional. Concretamente:

- **UI primaria**: Command Palette global invocada con ⌘K (Mac) / Ctrl+K (Win/Linux) + Copilot persistente como sidebar derecho retráctil en todos los portales (asesor, desarrollador, admin, comprador). Menús tradicionales existen como fallback pero el happy path documentado pasa por ⌘K o Copilot.
- **Voz default mobile**: en móviles (PWA H1, app nativa iOS/Android H2 sólo para asesores), el botón primario de acción es un micrófono; la búsqueda por teclado queda secundaria.
- **Stack AI**: Vercel AI SDK v6 como capa de abstracción, AI Gateway de Vercel como punto único de routing, **Claude Sonnet 4** como modelo primario (`anthropic/claude-sonnet-4`) y **GPT-4o-mini** como fallback de bajo costo (`openai/gpt-4o-mini`). OpenAI `gpt-4o` disponible como opcional para tareas específicas (extracción PDF compleja, visión).
- **Memory Layer**: Anthropic Memory API enlazada a `profiles.id` para recordar contexto cross-session por usuario (preferencias, historial de consultas, hilos abiertos). Política explícita de opt-out y borrado (ver FASE 26 Compliance + 05_OPERACIONAL/05.6_DATA_RETENTION_POLICY.md).
- **Multi-agente con LangGraph**: orquestador meta-router + agentes especializados:
  - `legal` (DD docs, cláusulas, RFC/CFDI)
  - `financiero` (comisiones, IVA 16%, FX, pre-aprobación crédito)
  - `match` (C03 Matching Engine + búsquedas activas)
  - `marketing` (landings, QR, WhatsApp templates)
  - `ie-analyst` (consultas sobre scores y zones)
- **RAG con citations**: toda respuesta de IA que cite un dato externo debe adjuntar referencia verificable al registro BD (`project_id`, `zone_id`, `macro_series.serie_code + period_date`, `fuente` de `geo_data_points`). UI presenta la cita como badge clicable que abre la entidad original.
- **Generative components**: el Copilot puede entregar componentes React tipados (tablas, cards, charts Recharts) vía `streamUI` del AI SDK v6. Estos componentes son sub-componentes de una librería `shared/ui/generative/` con contratos Zod.
- **Proactive intelligence**: la IA inicia conversaciones cuando detecta oportunidad (ej. "detecté 3 leads sin respuesta >60 min en tu pipeline") vía notificaciones push/in_app y entradas en Copilot.

## Rationale

Se prefiere AI-native sobre AI-assisted porque:

1. **Posicionamiento competitivo**: competidores regionales (Pulppo, Habi, Inmuebles24) son AI-assisted en el mejor caso. Tratar la IA como shell primario es el diferencial vertical con ventana H1 2026.
2. **Adopción de usuarios power**: los asesores top 10% de Pulppo (referencia) usan shortcuts constantemente; ⌘K aproxima esa experiencia al 100% de la base.
3. **Monetización futura**: el Copilot persistente es el punto natural donde aparecen las AI generations del Plan Pro (Plan dev Pro: 50 extractions/mes). El AI-native justifica el upsell.
4. **Datos temporales como moat**: cada interacción con el Copilot genera telemetría (`ai_usage_tracking`) que alimenta AARRR, calibra prompts (`ai_prompt_versions`) y reduce costo por query. Este loop no existe si la IA es accesoria.
5. **Soft-launch con ventana corta**: tener un shell ⌘K + Copilot funcional desde FASE 03 reduce el riesgo de "vender IA" sin tenerla tangible en la demo piloto.

## Consequences

### Positivas
- **Diferenciación clara en pitch**: "El único CRM inmobiliario LATAM con Copilot persistente y ⌘K primario" es un mensaje ejecutivo simple.
- **Reduce fricción de onboarding** para usuarios que vienen de Linear/Notion/Vercel donde ⌘K ya es hábito.
- **Reutilización de componentes**: el Copilot consume tRPC directamente, por lo que cada procedure nuevo se vuelve inmediatamente "invocable por IA" sin trabajo adicional.
- **Memory API acumula moat**: cuanto más usa un usuario el Copilot, más útil se vuelve; migrar a un competidor significa perder contexto.
- **Citations como mecanismo anti-hallucination**: si el Copilot no puede citar, responde "no tengo datos verificables sobre esto". Esto construye confianza profesional (asesores cierran operaciones con números que pueden defender).

### Negativas / tradeoffs
- **Costo variable por sesión**: cada interacción con el Copilot genera tokens Anthropic + posibles tokens OpenAI fallback. Sin rate limiting + monitoring estricto (ver ADR-007 y ADR-009 §SEC-10), el run-rate puede salirse de presupuesto. Budget mensual H1: $2K-$4K USD/mes en AI routing, a revisar tras primeros 60 días soft launch.
- **Latencia de primera respuesta**: streaming mitiga la percepción pero las consultas con tool calls (multi-agent + RAG + citations) pueden tardar 3-8 segundos hasta primer token útil. Requisito de diseño: siempre streaming, siempre placeholder explicativo ("Buscando en 12,000 proyectos..."), nunca bloqueo sincrónico.
- **Dependencia de proveedores**: Anthropic + OpenAI son vendors externos con cambios de pricing/capacidades. La abstracción Vercel AI SDK v6 mitiga pero no elimina. Se adopta **modelo como variable de entorno** (`AI_PRIMARY_MODEL=anthropic/claude-sonnet-4`, `AI_FALLBACK_MODEL=openai/gpt-4o-mini`) para permitir swap sin deploy.
- **Complejidad de testing**: prompts y respuestas IA no son deterministas. Estrategia: golden tests sobre estructura Zod + evaluación offline (Fase 27) + snapshot tests visuales sólo en componentes generativos estables.
- **Curva de aprendizaje para usuarios no power**: compradores ocasionales y asesores junior pueden no descubrir ⌘K. Mitigación: onboarding guiado en Fase 20 + CTA visible "Pulsa ⌘K para empezar" + Copilot como CTA lateral siempre visible.
- **Riesgo de privacidad en Memory API**: almacenar contexto cross-session obliga a cumplir LFPDPPP (MX), LPDP (CO), Ley 25.326 (AR), LGPD (BR). Se diseña con opt-in explícito por país y derecho de borrado completo (FASE 26).

### Neutrales
- **Anthropic vs OpenAI como primario**: se elige Claude Sonnet 4 por calidad en tareas de razonamiento estructurado (generación tRPC calls, síntesis de biblia) y por el Memory API; GPT-4o-mini como fallback por costo/throughput. Intercambiable si el benchmark propio (Fase 24) muestra mejora en otro proveedor.
- **LangGraph vs orquestación propia**: LangGraph es el estándar 2026 para multi-agente con hand-off; evaluar alternativa propia sólo si el costo operativo supera a la flexibilidad (improbable en H1).
- **Voz español MX con modismos**: Whisper cubre el caso base. Calibración de modismos ("recámara" vs "habitación", "alberca" vs "piscina") se hace vía prompt engineering en el agente de intent, no con fine-tuning.

## Alternatives considered

### Alt 1: AI-assisted clásico (chat flotante opcional, shortcuts puntuales)
La IA aparece como botón "Pregunta a DMX" en esquina inferior, shortcuts ⌘K abren una búsqueda pero sin agente, generación de descripciones de propiedad vía botón "Generar con IA" en formularios. **Descartada** porque:
- Es el patrón Pulppo/Inmuebles24 actual. No diferencia el producto.
- No construye Memory Layer: cada interacción es aislada, el moat de datos temporales no capitaliza.
- Las generative components quedan sin caso de uso porque el chat flotante es texto-only.
- No soporta voz default mobile sin re-arquitectura.

### Alt 2: AI sólo backend (scores + documents intelligence, sin UI AI)
La IA se usa únicamente para calcular scores N5 (26 scores AI de IE3-§8.2), extraer documentos (document-intel FASE 17) y generar reportes batch (Discover Weekly, DMX Wrapped). Sin Copilot, sin ⌘K semántico, sin voz. **Descartada** porque:
- Invisibiliza la IA para el usuario. El asesor nunca "ve" que el producto es AI-native.
- Pierde el flywheel: no hay `ai_usage_tracking` de intent, no hay calibración de prompts por uso real, no hay upsell natural a planes Pro.
- Es compatible con AI-native como subset, pero como único enfoque deja la oportunidad de diferenciación sin capturar.

### Alt 3: Chat-as-UI total (sin menús, todo conversacional)
Un solo chat-box como interfaz principal, al estilo ChatGPT/Claude.ai. Menús eliminados, navegación sólo conversacional. **Descartada** porque:
- Rompe con expectativas de usuarios profesionales que necesitan dashboards visuales (M1 Dashboard Asesor, M10 Estadísticas con 11 KPIs tipo semáforo).
- La generación de componentes on-the-fly sobre cada query multiplica costos y latencia por 5-10x.
- Vetted compliance en MX/CO/AR/BR requiere vistas auditables, no solo outputs conversacionales (ej. cálculo de comisión con IVA 16% debe mostrarse como tabla visible, no como paragraph).
- Chat-only falla como vector de descubrimiento: asesores junior no saben qué preguntar.

### Alt 4: LLM routing con múltiples proveedores sin Vercel AI Gateway
Integración directa a Anthropic + OpenAI SDKs, con routing manual en código. **Descartada** porque:
- Se pierde el logging/telemetry/rate limit unificado que AI Gateway provee.
- Cada cambio de modelo requiere deploy (vs. env var).
- Complejidad de retries/fallback duplicada en código.
- AI Gateway está incluido en el plan Vercel Pro con cuota generosa.

## Decisiones conexas y tensiones

- **ADR-009 §D9 rate limiting** limita Copilot a 30 req/min + cuota mensual por plan (ADR-008). Esto es una tensión directa con la aspiración AI-native (el usuario pudiera querer usarlo más). Resolución: burst allowance + upgrade CTA visible.
- **ADR-007 masking PII** en session replay obliga a marcar con `data-ph-capture-attribute-input-mask` los inputs del Copilot que capturen datos sensibles (ej. preguntas "cuánto cobra Juan López por comisión"). Estándar aplicado en `shared/ui/layout/AICopilot.tsx`.
- **ADR-003 multi-country** implica que el Copilot debe responder en locale del usuario y citar fuentes del país correspondiente. El meta-router pasa `country_code` como parte del contexto inicial de cada sesión.

## References
- `../BRIEFING_PARA_REWRITE.md` §2 pregunta 7, §3 "AI-native implica" (7 atributos)
- `../CONTEXTO_MAESTRO_DMX_v5.md` §9 "Scores IE" (26 AI en Nivel 5), §20.6 "Personalización Netflix"
- `../biblia-v5/06_IE_PART1_Vision_Arquitectura_Fuentes_SCIAN.md` §1.5 Patterns (Netflix, Spotify, Duolingo)
- `../biblia-v5/12_CROSS_INDUSTRY_Strategy_7Patterns.md` (Flywheel + 7 patterns)
- `../02_PLAN_MAESTRO/FASE_03_AI_NATIVE_SHELL.md` (implementación)
- `../02_PLAN_MAESTRO/FASE_12_IE_AI_SCORES_N5.md` (scores generativos)
- Vercel AI SDK v6 docs: https://sdk.vercel.ai
- Anthropic Memory API: https://docs.anthropic.com/memory
- LangGraph docs: https://langchain-ai.github.io/langgraph

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent B) | **Fecha:** 2026-04-17
