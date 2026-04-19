# ADR-023 — Design System Refinement (Dopamine cleaner aesthetic post-competitive analysis)

**Status:** Accepted
**Date:** 2026-04-19
**Deciders:** Manu Acosta (founder)
**Referenced by:** [FASE 04 Design System — módulo 4.P](../02_PLAN_MAESTRO/FASE_04_DESIGN_SYSTEM.md), [FASE 20 Portal Comprador](../02_PLAN_MAESTRO/FASE_20_PORTAL_COMPRADOR.md), [FASE 21 Portal Público](../02_PLAN_MAESTRO/FASE_21_PORTAL_PUBLICO.md)
**References:** [Competitive Intel Findperty](../06_REFERENCIAS_LEGADO/competitive_intel_findperty_20260419.md), [ADR-021 PPD](./ADR-021_PROGRESSIVE_PREFERENCE_DISCOVERY.md), [ADR-022 Vibe Tags Hybrid](./ADR-022_VIBE_TAGS_HYBRID.md)
**Supersedes:** —

## 1. Context

El Design System Dopamine (cerrado en FASE 04) tiene una identidad visual fuerte construida alrededor de los siguientes patrones:

- Paleta brand indigo/violet en gradients OKLCH.
- `Card3D` con `rotateXY ±12°` para feature blocks.
- `ParticleField` canvas-based como ambient layer.
- Gradients como tratamiento por defecto en headings, cards y backgrounds.
- Glow shadows multi-layer para reforzar la sensación "delight".

Tras la revisión competitive de **Findperty** (2026-04-19, ver [competitive_intel_findperty_20260419.md](../06_REFERENCIAS_LEGADO/competitive_intel_findperty_20260419.md)), el founder identifica que el Dopamine actual se percibe **"demasiado colorido"** en comparación con la estética minimalista del competidor — Findperty aplica su lime `#ccd500` con restricción sobre superficie limpia (whitespace amplio, gradient escaso, shadows planos, rounded-full pill selectivo) y el resultado funciona para discovery emocional sin sobrecargar la vista.

El balance buscado **no es un rebrand** (la identidad indigo/violet construida en FASE 04 se mantiene), sino un refinamiento que adopta patrones cleaner sobre el lenguaje existente: más whitespace, menos gradient salpicado, shadows simplificados, pills selectivos y un sistema toast multi-tier que reserva el "wow" para celebraciones reales.

Adicionalmente, los componentes nuevos requeridos por ADR-021 (PPD) y ADR-022 (Vibe Tags Hybrid) — `VibeTagChip`, `MatchScoreBreakdown`, `RadarChart6D`, `ProgressBarMultiSegment`, `ToastCelebration`, `PropertyStory`, `ConfidenceBadge` — encajan mejor en un lenguaje cleaner que en el Dopamine saturado actual.

FASE 04 no se reabre; el refinamiento se entrega como **módulo 4.P (extension)** aditivo: variants nuevos, tokens nuevos y reglas de uso documentadas. Las primitives existentes mantienen su interfaz pública.

## 2. Decision

**Refinar Dopamine** para adoptar patrones cleaner manteniendo la identidad indigo/violet. El refinamiento se entrega como extensión aditiva (no breaking) en módulo 4.P de FASE 04. Sub-decisiones por área del DS:

### 2.1 Border radius — pill `rounded-full` (9999px) como variant adicional

- `<Button variant="pill">` para CTAs primarios marketing y conversion (hero CTAs, signup, "Ver propiedad", "Contactar asesor").
- `<Input variant="pill">` para inputs search y filtros del Portal Público / Portal Comprador.
- `rounded-xl` (12px) **no se descontinúa** — sigue siendo default para cards y buttons secundarios (admin, asesor pro, dashboards).

### 2.2 Gradient strategy — máximo 1 gradient per view como accent

- `GradientText` reservado al **hero principal** de la view (un solo heading por página).
- Cards usan `solid` color o gradient subtle `≤5%` opacity.
- Backgrounds gradient permitidos en hero blocks; **prohibidos en grids de listings** (PropertyCard masivo debe ser plano).
- Marketing/landings pueden romper la regla con justificación documentada en el componente.

### 2.3 Whitespace — escala "comfortable" `~1.3x` sobre la actual

- Nuevos tokens density-aware: `--spacing-section`, `--spacing-card-y`, `--spacing-component-gap` con dos sets:
  - `compact` (escala actual) — Portal Asesor pro, Portal Admin, dashboards densos.
  - `comfortable` (`~1.3x`) — Portal Comprador, Portal Público, hero blocks, marketing.
- Toggle `density: comfortable | compact` per portal vía cookie + default por rol.

### 2.4 Shadows — simplificación a 3 niveles + `shadow-wow`

- Mantener: `shadow-sm`, `shadow-md`, `shadow-xl`.
- Descontinuar: `shadow-lg` si redunda con `shadow-md`/`shadow-xl` (revisar usos en módulo 4.P).
- Nuevo: `shadow-wow` con acento coral warm — `inset rgba(217,119,87,0.45)` + outer `rgba(217,119,87,0.24) blur 40px` — reservado a **celebrations únicamente** (toast `celebration`, milestone reached, match perfect, deal cerrado).
- Regla "less chrome": cards usan border subtle **OR** shadow sutil, **nunca ambos**.

### 2.5 Toast framework — 3 tiers semánticos

- `info` — color neutral, icon subtle, sin animación entrance fuerte, auto-dismiss 3s.
- `success` — paleta lime/emerald, check icon, fade-in suave, auto-dismiss 3s.
- `celebration` — confetti opcional + emoji + `shadow-wow` + auto-dismiss extendido 6s. Uso restringido (deal cerrado, primera propiedad guardada, score milestone).

### 2.6 Typography — calma

- **Solid color** para la mayoría de headings.
- `GradientText` reservado al hero principal y display numbers (precio, score, KPIs grandes).
- Fonts no cambian: **Outfit 400-800** (display) + **DM Sans** (body).

### 2.7 Cards — less chrome

- Variants nuevos:
  - `card-flat` — border subtle, sin shadow.
  - `card-soft` — sin border, `shadow-sm`.
- Eliminar combinaciones over-decorated: border + shadow + gradient simultáneos.
- `Card3D` (rotateXY ±12°) se reclasifica a **uso restringido**: hero blocks y feature highlights, NO default para listings ni dashboards.

### 2.8 Accent strategy — 1 dominant accent per view

- No salpicar accents secundarios; un view = una accent dominante.
- Per-portal:
  - Portal Comprador → indigo.
  - Portal Asesor → violet.
  - Portal Desarrollador → teal.
  - Portal Admin → slate.
- Per-page tints suaves (lavender, mint, peach) introducidos en FASE 20 se mantienen y son compatibles con la regla.

## 3. Consequences

### Positivas

- **DS más limpio + brand coherente**: la identidad indigo/violet se preserva pero la página deja de competir consigo misma.
- **Reduce cognitive load**: menos elementos saturados peleando por atención del usuario.
- **A11y mejor por construcción**: menos gradients = mayor garantía de contrast ratio ≥4.5:1.
- **Consistencia mayor cross-portal**: la regla de accent dominante per portal homogeneíza la experiencia.
- **Render performance**: menos shadow stacks + uso selectivo de `ParticleField`/`Card3D` reduce paint cost en grids masivos.
- **Encaje natural de componentes nuevos**: `VibeTagChip`, `MatchScoreBreakdown`, `RadarChart6D`, `ProgressBarMultiSegment`, `ToastCelebration`, `PropertyStory`, `ConfidenceBadge` (ADR-021/022) caben en este lenguaje sin disonancia.

### Negativas / tradeoffs

- **+1 sesión Claude Code** en FASE 04 para entregar módulo 4.P (tokens + variants + refactor selectivo).
- **Reclasificación de componentes existentes**: `Card3D` y `ParticleField` pasan a "uso restringido" — requiere refactor en pocos lugares ya construidos para devolverlos a hero/feature blocks.
- **Toggle density** agrega un poco de complejidad de estado (cookie + default per rol). Mitigación: cookie + valor por defecto por rol resuelto en server layout.
- **Riesgo "menos diferenciador visual"** si el péndulo va demasiado lejos hacia minimal. Mitigación: tokens de tint suave (lavender/mint/peach), `AnimNum`, `shadow-wow` para celebraciones y `Card3D` para hero blocks conservan la cuota de delight.

### Neutrales

- **Stack intacto**: Tailwind v4 CSS-first sigue, tokens en `styles/tokens.css` (regla de CLAUDE.md respetada).
- **Interfaz pública de primitives no cambia**: variants nuevos son aditivos. Cero breaking change para features ya construidas.
- **Compatible con dark mode**: 3 tiers de shadow + accent strategy funcionan en ambos modos `next-themes`.

## 4. Alternativas consideradas

### Alt 1 — Rebrand completo a estilo Findperty

**Rechazada.** Perdería la identidad indigo/violet construida desde FASE 04 y desperdiciaría el trabajo del DS ya cerrado. La diferenciación brand DMX está en juego.

### Alt 2 — Mantener Dopamine intocado

**Rechazada.** El founder percibió saturación visual y el competitive intel valida que la aesthetic cleaner funciona para discovery emocional. No iterar sería ignorar señal cualitativa + cuantitativa.

### Alt 3 — Crear DS paralelo "DMX Lite"

**Rechazada.** Dos DS divide esfuerzo de mantenimiento, rompe consistencia cross-portal y obliga a decidir per feature cuál usar. Refinamiento aditivo sobre Dopamine entrega el mismo resultado sin la deuda.

## 5. Implementation notes

### Módulo de FASE 04 que recibe los cambios

Todos los cambios caen en **FASE 04 extension — módulo 4.P** documentado en [`docs/02_PLAN_MAESTRO/FASE_04_DESIGN_SYSTEM.md`](../02_PLAN_MAESTRO/FASE_04_DESIGN_SYSTEM.md). FASE 04 base no se reabre.

### Tokens nuevos en `styles/tokens.css`

- `--shadow-wow-inner`, `--shadow-wow-outer` (acento coral warm para celebrations).
- `--toast-info`, `--toast-success`, `--toast-celebration` (paleta semántica toasts).
- Density variables (`--spacing-section`, `--spacing-card-y`, `--spacing-component-gap`) con dos sets `compact` / `comfortable` resueltos por `data-density` attribute.
- Accent per-portal tokens (revisar consistencia indigo/violet/teal/slate).

### Componentes nuevos en `shared/ui/dopamine/`

- `VibeTagChip` (referenciado por ADR-022).
- `MatchScoreBreakdown`.
- `ProgressBarMultiSegment`.
- `ToastCelebration` (consume `--toast-celebration` + `shadow-wow`).
- `PropertyStory`.
- `RadarChart6D` (referenciado por ADR-021 PPD).
- `ConfidenceBadge`.

### Refactor de primitives existentes

- `Button` — añadir `variant: "pill"`.
- `Input` — añadir `variant: "pill"`.
- `Card` — añadir prop `lowChrome` (resuelve `card-flat` / `card-soft` según border vs shadow).
- `Text` — preferir `SolidText` por defecto; `GradientText` queda explícito y reservado.

### E2E checklist (ADR-018)

Todos los componentes nuevos deben quedar mapeados en [`03.13_E2E_CONNECTIONS_MAP`](../03_CATALOGOS/03.13_E2E_CONNECTIONS_MAP.md) con sus props, slots, datos de origen tRPC y estados (loading/empty/error/success).

## References

- [Competitive Intel Findperty](../06_REFERENCIAS_LEGADO/competitive_intel_findperty_20260419.md) (input cualitativo del refinamiento).
- [ADR-021 PPD](./ADR-021_PROGRESSIVE_PREFERENCE_DISCOVERY.md) (componentes downstream que dependen del DS refinado).
- [ADR-022 Vibe Tags Hybrid](./ADR-022_VIBE_TAGS_HYBRID.md) (`VibeTagChip` como consumidor del nuevo lenguaje).
- [FASE 04 Design System](../02_PLAN_MAESTRO/FASE_04_DESIGN_SYSTEM.md) (host del módulo 4.P).
- [FASE 20 Portal Comprador](../02_PLAN_MAESTRO/FASE_20_PORTAL_COMPRADOR.md) (consumidor primario de variants pill + density `comfortable`).
- [FASE 21 Portal Público](../02_PLAN_MAESTRO/FASE_21_PORTAL_PUBLICO.md) (consumidor primario de aesthetic cleaner).
- [03.13 E2E Connections Map](../03_CATALOGOS/03.13_E2E_CONNECTIONS_MAP.md) (registro obligatorio de componentes nuevos).

---

**Autor:** Claude Opus 4.7 (sesión refinamiento DS post-competitive intel) | **Fecha:** 2026-04-19
