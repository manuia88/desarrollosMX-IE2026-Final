# ADR-021 — Progressive Preference Discovery (PPD) over Monolithic Onboarding

**Status:** Accepted
**Date:** 2026-04-19
**Deciders:** Manu Acosta (founder)
**Referenced by:** [FASE_20_PORTAL_COMPRADOR](../02_PLAN_MAESTRO/) (Portal Comprador)
**References:** [ADR-011 Moonshot 3 Horizontes](./ADR-011_MOONSHOT_3_HORIZONTES.md), [ADR-014 Agentic Architecture](./ADR-014_AGENTIC_ARCHITECTURE.md), [ADR-022 Vibe Tags Hybrid](./ADR-022_VIBE_TAGS_HYBRID.md) (en paralelo), [Competitive intel Findperty](../06_REFERENCIAS_LEGADO/competitive_intel_findperty_20260419.md)
**Supersedes:** —

## 1. Context

La revisión competitiva de Findperty (2026-04-19) confirma que el matching psicográfico para real estate MX es un espacio reconocido por el mercado, pero validó **apariencia de tracción, no tracción real**: zero properties listadas, zero usuarios activos, marketing enfocado en futuro tense. Su approach UX — un cuestionario monolítico de **49 preguntas upfront antes de ver propiedades** — es una hipótesis no validada con riesgo conocido en literatura UX (dropout 60-80% después de la pregunta 7-10 en formularios largos sin payoff intermedio).

DMX necesita personalización psicográfica como **complemento** a Spatial Decision Intelligence (catálogo, mapa, IE Scores, AVM, STR overlays), pero no puede sacrificar el discovery inicial: si el comprador no ve propiedades en los primeros 60 segundos, abandona (benchmarks Zillow / Redfin / Inmuebles24).

Inspiraciones validadas:

- **Spotify Discover Weekly**: behavioral signals (skip, replay, dwell) > preferencias explícitas. El usuario nunca llena un cuestionario; el sistema infiere taste de comportamiento.
- **Netflix Wrapped**: transparency progressive — el sistema explica al usuario "esto es lo que sé de ti" en momentos puntuales, no antes de dejarlo entrar.
- **Strava**: gamification orgánica — segmentos y badges emergen de uso real, no de un onboarding declarativo.

El reto arquitectónico: combinar (a) discovery inmediato sin gates, (b) captura progresiva de señales psicográficas suficientes para alimentar un match score multidimensional, (c) transparencia y reversibilidad sobre lo que el sistema infiere, sin sesgar el catálogo a lo que el usuario dice querer (que sistemáticamente diverge de lo que termina comprando).

## 2. Decision

DMX implementa **Progressive Preference Discovery (PPD)** como modelo de personalización del Portal Comprador. **No** se adopta el cuestionario monolítico estilo Findperty. PPD se estructura en **4 capas**:

### 2.1 Capa 1 — Micro-onboarding inicial (3-5 preguntas, ~60s)

Mínimo viable para arrancar el match score sin diluir la experiencia. 5 dimensiones obligatorias:

1. **Presupuesto** + forma de pago (`contado` / `credito_hipotecario` / `mixto`).
2. **Timeline** (`ya_busco_activo` / `3_6_meses` / `investigacion_temprana`).
3. **Buyer persona** — taxonomía cerrada: `first_time` / `investor` / `upgrade_family` / `couple_first` / `retiree` / `relocation_regional` / `relocation_internacional`.
4. **Zona interés inicial** — ciudad + 1-2 alcaldías/colonias semilla.
5. **Situación familiar** — `solo` / `pareja` / `con_hijos` / `ampliando_familia` / `empty_nester`.

Implementación UI: `ProgressBarMultiSegment` de 5 segmentos visibles desde el primer momento; cada respuesta avanza un segmento. Skippable por completo (con default por país + persona genérica).

### 2.2 Capa 2 — Micro-questions embedded en swipe / navegación

Trigger engine en frontend lanza **1 pregunta cada N interacciones** (N=3-7, dinámico según engagement).

- Las preguntas se eligen del catálogo `micro_questions_catalog` con base en **behavioral patterns detectados** (e.g., usuario ve 4 listings en CDMX con garage marcado como filtro → trigger pregunta sobre prioridad de garage para resale value).
- **NON-ADAPTIVE para QUÉ se pregunta**: el contenido de la pregunta no depende de respuestas previas. Ejemplo: la pregunta de garage en CDMX siempre se hace si el usuario navega CDMX, aunque haya respondido "no tengo auto" — porque para resale value el dato sigue siendo relevante. Lo que sí es adaptive: **CUÁNDO** y **EN QUÉ ORDEN** se hacen.
- Total esperado: **20-30 preguntas distribuidas a lo largo del primer mes** (vs 49 upfront en Findperty).
- Constraint UX: cada pregunta `<10s` para responder, `Skip` siempre disponible en posición prominente.
- Cooldown: una misma pregunta no se repite en `7d`. Rate limit: **máximo 1 pregunta por sesión de browser**.

Implementación UI: bottom sheet toast-style, no-modal, dismissible con swipe-down.

### 2.3 Capa 3 — Behavioral inference engine

Server-side job que recalcula `inferred_preferences jsonb` del usuario a partir de signals de comportamiento:

- `dwell_time_per_listing`
- `photos_zoomed`
- `zones_expanded_on_map`
- `save / skip / contact patterns`
- `price_skip_threshold` (precio sobre el cual el usuario sistemáticamente skip-ea)
- `amenity_like_correlation` (qué amenities co-ocurren en propiedades guardadas)
- `neighborhood_stickiness` (% de tiempo en una zona vs exploración)
- `session_time_of_day`
- `property_story_sections_read`

El engine recalcula cada N eventos o **daily** (cron). Output:

```jsonb
{
  "emotional": { "value": 0.62, "confidence": 0.71 },
  "tecnico":   { "value": 0.40, "confidence": 0.55 },
  ...
}
```

El score por dimensión incluye `confidence 0-1`. El match engine usa la inferencia **únicamente cuando `micro_questions` no cubre la dimensión** (las respuestas explícitas siempre ganan a la inferencia).

### 2.4 Capa 4 — Profile transparency UI (`/profile/dna`)

Vista accesible desde el menú de perfil. Componentes:

- **RadarChart 6 ejes**: Emocional / Técnico / Urbano / Financiero / Espacial / Inversión.
- **Completion meter %** (qué tan completo es el perfil).
- **"Lo que DMX sabe de ti"** — lista editable de inferencias clave en lenguaje natural (e.g., "Te interesan zonas con vida nocturna después de 9pm" — editable o flagged como incorrecta).
- **Badge de confianza por dimensión** (low / medium / high), derivado del campo `confidence` del engine.
- **Share para pareja** (co-match): genera link temporal para que el partner complete su perfil; el sistema produce un match combinado.
- **CTA opcional** "Survey rápido 10-15 preguntas" para usuarios que quieren acelerar — lo offrecemos, no lo imponemos.

### 2.5 Principios inviolables

1. **NON-ADAPTIVE en catálogo**: lo que se pregunta no cambia por respuestas previas. Lo que el usuario VE en catálogo SÍ se ajusta (orden, scoring), pero el set de propiedades visibles no se filtra por preferencias inferidas (anti-burbuja).
2. **Preguntas <10s, skip siempre disponible**.
3. **Propiedades visibles desde el minuto 0** — no hay gating de catálogo por completitud de perfil.
4. **Transparency**: el usuario ve cómo el sistema lo entiende (Capa 4).
5. **Reversibilidad**: correcciones del usuario sobre inferencias se aceptan sin penalty (la corrección actualiza `inferred_preferences` y registra audit trail).

### 2.6 Pesos dinámicos del match score por buyer_persona

Cada `buyer_persona` aplica un set de pesos al combinar las 6 dimensiones del match score. Los pesos a continuación son **un punto de partida razonable** y deben recalibrarse post-launch con feedback real (clicks, contactos, transacciones cerradas).

| Dimensión   | first_time | investor | upgrade_family | couple_first | retiree | relocation |
|-------------|-----------:|---------:|---------------:|-------------:|--------:|-----------:|
| Emocional   |       0.20 |     0.10 |           0.25 |         0.30 |    0.30 |       0.15 |
| Técnico     |       0.15 |     0.10 |           0.20 |         0.15 |    0.20 |       0.15 |
| Urbano      |       0.20 |     0.15 |           0.15 |         0.20 |    0.15 |       0.25 |
| Financiero  |       0.30 |     0.20 |           0.15 |         0.15 |    0.15 |       0.15 |
| Espacial    |       0.10 |     0.10 |           0.20 |         0.15 |    0.15 |       0.25 |
| Inversión   |       0.05 |     0.35 |           0.05 |         0.05 |    0.05 |       0.05 |

Calibración post-launch obligatoria: A/B sobre subsets, feedback loop de cierre de operación (`operaciones.cerrada` como label) y telemetría de quality of match (NDCG sobre listings contactados).

## 3. Consequences

### Positivas

- **Mejor UX inicial**: ningún wall upfront, propiedades visibles desde el primer segundo.
- **Menor dropout**: vs el 60-80% conocido del modelo Findperty con 49 preguntas upfront.
- **Onboarding humano**: el usuario "siente cosas" (swipe, save, explore), no llena un formulario; aumenta engagement emocional.
- **Engagement sostenido**: cada visita aprende más sobre el usuario, justificando re-engagement (push, email).
- **Data quality superior**: behavioral signals (lo que la persona hace) son más predictivos que self-report (lo que la persona dice que quiere) — literatura consolidada en e-commerce y media.
- **Transparency genera trust**: vs el blackbox AI de competidores; alineado con principios constitucionales DMX (GC-7).
- **Compatibilidad H1/H2**: la inferencia engine madura sin bloquear launch; el match score puede operar inicialmente solo con Capa 1 + Capa 2.

### Negativas / tradeoffs

- **+1-2 sesiones de trabajo en FASE 20** para implementar las 4 capas + UI.
- **Behavioral inference engine es un módulo nuevo** (~+1 sesión, asignable a FASE 12 o FASE 20 según ordering del plan maestro).
- **Match score "frío" en primeras visitas**: el usuario nuevo solo tiene Capa 1 contestada; el match es pobre hasta acumular signals. Mitigación: usar `buyer_persona` + zona como defaults razonables, con disclaimer "tu match mejorará a medida que explores".
- **Cooldown + rate limit per pregunta agrega complejidad de estado** (server + client side cache, dedup cross-device).
- **Privacy**: los `behavioral_signals` son datos sensibles bajo LFPDPPP. Deben quedar fuera de exports CSV/PDF y de logs detallados; acceso limitado a engine y al propio usuario en `/profile/dna`. Retention policy explícita en FASE 26.

### Neutrales

- **Compatible con todas las vistas** (Mapa / Lista / Grid / Swipe): PPD no obliga a un modo de visualización único.
- **Vibe Tags (ADR-022) se enriquecen con micro-questions de Capa 2**: la combinación produce un sistema híbrido donde tags emergen de behavioral + answers, no de declaración pura.
- **Feature flag `ppd_enabled`** permite toggle global durante el periodo de calibración inicial sin redeploy.

## 4. Alternativas consideradas

### Alt 1 — Cuestionario monolítico estilo Findperty (49 preguntas upfront)

**Rechazada.** Dropout esperado 60-80% entre pregunta 7-10. Bloquea el discovery del catálogo, que es el value prop primario de DMX. Findperty no ha validado el modelo (zero usuarios reales). Asume que el usuario sabe lo que quiere antes de ver el inventario — supuesto contradicho por research de search behavior en real estate.

### Alt 2 — Sin personalización (catálogo + filtros tradicionales)

**Rechazada.** Pierde el moat psicográfico que DMX puede construir. Convierte a DMX en otro Inmuebles24 / Propiedades.com con mejor estética; no diferencia el producto a largo plazo.

### Alt 3 — Personalización 100% behavioral (sin Capa 1)

**Rechazada.** Cold start es severo: sin presupuesto / timeline / persona, el match score es ruido los primeros días. La fricción de 5 preguntas a 60s es marginal y paga el inventario inicial de signals para que Capa 3 arranque con base.

### Alt 4 — Wrapper sobre LLM ("describe lo que buscas en lenguaje natural")

**Rechazada para H1.** No descarta a futuro como Capa 5 opcional, pero como mecanismo primario sufre de (a) costo per query no acotado, (b) usuarios que no saben articular lo que quieren, (c) dificultad para mapear texto libre a las 6 dimensiones del match score sin un layer estructurado intermedio. Reabrir vía nuevo ADR si Copilot Comprador (FASE 03 derivada) madura.

### Alt 5 — Survey opcional al final del onboarding (todo lo demás como PPD)

**Considerada y aceptada parcialmente.** Es exactamente el CTA opcional de Capa 4. No reemplaza PPD pero está disponible para usuarios power que quieren acelerar.

## 5. Implementation notes / esquema técnico

### Tablas BD requeridas (a registrar en `03.1_CATALOGO_TABLAS_BD.md`)

- **`micro_questions_catalog`** — set fijo de preguntas Capa 2 (id, dimensión, peso por persona, condiciones de trigger, locale variants).
- **`user_micro_question_answers`** — respuestas del usuario con timestamp + skip flag + cooldown_until.
- **`behavioral_signals`** — eventos crudos de comportamiento. **Particionada mensual via `pg_partman`** dada la cardinalidad esperada (1 usuario activo ~10K-50K eventos/mes). Retention 12 meses; agregados anonimizados conservados indefinidamente.
- **`buyer_property_matches`** — score precalculado por (user_id, listing_id, computed_at) con breakdown por dimensión + confidence + persona_used.

Todas con RLS ON desde la migration (regla 3 del CLAUDE.md). Tipos auto-generados vía `npm run db:types`.

### Engine de inferencia

- **Trigger event-based** cuando un usuario cruza un threshold de signals nuevos (e.g., +50 eventos desde último compute).
- **Cron daily** (Vercel cron) como safety net para usuarios con actividad esporádica.
- Implementación inicial en server route `/api/jobs/recompute-inferences`; mover a Vercel Workflow si la duración por batch excede 60s.

### UI components (shared/ui)

- **`ProgressBarMultiSegment`** — 5 segmentos (Capa 1).
- **`MicroQuestionToast`** — bottom sheet toast-style, swipe-dismissable (Capa 2).
- **`RadarChart6D`** — visualización Capa 4 (probable wrapper sobre Recharts o D3 minimal; decisión técnica en FASE 20).

### Feature flag y observabilidad

- **`ppd_enabled`** — flag global por env. Toggle por país posible vía `ppd_enabled_by_country` jsonb si calibración requiere segmentación.
- **Audit trail obligatorio** (per [ADR-018](./ADR-018_E2E_CONNECTEDNESS.md)) para cada cambio de `inferred_preferences`: quién, cuándo, source (`engine` / `user_correction` / `micro_answer`), valor previo, valor nuevo.
- **Telemetría**: métricas clave en panel FASE 24 — `ppd_capa1_completion_rate`, `ppd_capa2_skip_rate`, `ppd_capa4_visit_rate`, `match_score_confidence_distribution`, `inference_correction_rate`.

### Privacidad y compliance

- `behavioral_signals` excluida de exports user-facing y de logs detallados.
- Vista `/profile/dna` permite descargar el propio perfil (LFPDPPP derecho de acceso) y borrarlo (derecho de cancelación).
- Retention 12 meses sobre signals crudas; agregados anonimizados sin restricción.

### Calibración post-launch

- A/B test de pesos por persona contra cohortes de control (pesos uniformes 1/6).
- Feedback loop de cierre: cada `operacion` cerrada en CRM Sherpa (FASE 22) es señal supervised para reentrenar pesos.
- NDCG sobre orden de listings contactados como métrica primaria de match quality.

## References

- [ADR-011 — Moonshot 3 Horizontes](./ADR-011_MOONSHOT_3_HORIZONTES.md) (alineación H1 producto Comprador).
- [ADR-014 — Agentic Architecture](./ADR-014_AGENTIC_ARCHITECTURE.md) (sub-agentes que pueden consumir `inferred_preferences`).
- [ADR-018 — E2E Connectedness](./ADR-018_E2E_CONNECTEDNESS.md) (audit trail obligatorio).
- [ADR-022 — Vibe Tags Hybrid](./ADR-022_VIBE_TAGS_HYBRID.md) (sistema complementario, en paralelo).
- [Competitive intel Findperty 2026-04-19](../06_REFERENCIAS_LEGADO/competitive_intel_findperty_20260419.md).
- Spotify Discover Weekly — public engineering posts (signals > preferences).
- Netflix Wrapped pattern (transparency progressive).

---

**Autor:** Claude Opus 4.7 (revisión competitiva Findperty 2026-04-19) | **Fecha:** 2026-04-19
