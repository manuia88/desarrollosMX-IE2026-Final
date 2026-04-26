# 02 — Design Migration Plan (FASE 07.6.C)

> **Status (2026-04-25):** SUPERSEDED por `docs/01_DECISIONES_ARQUITECTONICAS/ADR-048_FRONTEND_PROTOTYPE_CANONICAL_REPLACEMENT.md` + `docs/08_PRODUCT_AUDIT/07_FRONTEND_PROTOTYPE_CANONICAL.md`.
> Análisis hybrid-blend ya no aplica. Re-evaluar plan migración bajo prototype puro (M3a/M3b/M3c siguen vigentes con framing canon-puro).

> Plan formal migración diseño Dopamine (ADR-023) ↔ prototype JSX (`tmp/product_audit_input/DMX-prototype/`).
> Generado: 2026-04-24 sub-sesión 07.6.C.
> Input: `01_CROSSWALK_MATRIX.md` (632 líneas, 150 features) + prototype assets (17 JSX × 1709 LOC + 1823 líneas styles.css + 1311 líneas README spec).
> Output paralelo: `03_RICE_PRIORITIES.md` (sub-sesión 07.6.D).
> ADR formal (SUPERSEDED 2026-04-25): `docs/01_DECISIONES_ARQUITECTONICAS/ADR-031_DESIGN_SYSTEM_REFRESH.md` → reemplazado por ADR-048.

## Resumen ejecutivo

| Métrica | Count |
|---|---|
| Tokens analizados (6 categorías) | 82 |
| Tokens keep-dopamine | 28 |
| Tokens adopt-prototype | 14 |
| Tokens hybrid-blend | 31 |
| Tokens propose-new | 9 |
| Componentes adopt-as-is | 2 |
| Componentes adapt-pattern | 7 |
| Componentes port-completo | 7 |
| Componentes skip-no-fit | 1 |
| **Total componentes prototype** | **17** |
| **Total effort M3a (tokens + primitives + base)** | **42 h** |
| **Total effort M3b (feature components)** | **144 h** |
| i18n keys nuevas | 187 keys |
| i18n entries (× 5 locales) | 935 entries |
| WCAG 2.1 AA validation | 12 h (89 a11y items) |
| **Effort total Design Migration** | **214 h** |
| L-NEW candidates 07.6.C detectados | 5 (L-NEW72–L-NEW76) |
| Deps nuevas requeridas | 0 (todas presentes en `package.json`) |

Decisión canonical: **hybrid-blend** (Opción C) aprobada founder 2026-04-24 en ADR-031. Backbone Dopamine preservado + 4 founder approvals (gradient indigo→rose, pill 9999 universal, Outfit/DM Sans, cream text variants).

## Sección 1 — Tokens migration plan

Análisis comparativo per-category Dopamine actual ↔ prototype, con decisión hybrid-blend per token y justificación 1-line.

### 1.1 Colores — Background / surface

| Token | Dopamine actual | Prototype propuesto | Decisión | Justificación | Effort h |
|---|---|---|---|---|---|
| `--color-bg-base` light | `oklch(0.99 0 0)` | n/a (prototype dark only) | keep-dopamine | prototype no tiene light mode; mantener Dopamine para portales admin/asesor | 0 |
| `--color-bg-base` dark | `oklch(0.15 0.02 280)` (tinted) | `#06080F` | hybrid-blend | adoptar tono prototype más frío `oklch(0.10 0.015 250)` para hero marketing; mantener Dopamine para apps | 1 |
| `--color-bg-surface` dark | `oklch(0.20 0.02 280)` | `#0D1017` (--bg-2) | adopt-prototype | prototype más profundo, mejor contraste con cards `linear-gradient #0E1220 → #0A0D16` | 1 |
| `--color-bg-muted` dark | `oklch(0.25 0.02 280)` | `#111827` (--bg-3) | hybrid-blend | adoptar tinte prototype para input backgrounds; mantener Dopamine para sidebars | 0.5 |
| `--color-surface-raised` dark | `oklch(0.21 0.02 280)` | `linear-gradient(180deg, #0E1220, #0A0D16)` | propose-new | añadir nuevo token `--gradient-surface-card` para cards hero/marketing tipo `prop-premium` y `vinyl-tile` | 1 |
| `--color-surface-sunken` | `oklch(0.96 0.005 280)` light / `oklch(0.11 0.02 280)` dark | `#05060B` (vinyl-hmap bg) | hybrid-blend | adoptar valor más oscuro prototype para canvases y heatmaps; mantener Dopamine genérico | 0.5 |

### 1.2 Colores — Texto

| Token | Dopamine actual | Prototype propuesto | Decisión | Justificación | Effort h |
|---|---|---|---|---|---|
| `--color-text-primary` light | `oklch(0.18 0.02 280)` | n/a | keep-dopamine | prototype dark-only; light mantiene tono frío Dopamine | 0 |
| `--color-text-primary` dark | `oklch(0.96 0 0)` | `#F0EBE0` (cream) | hybrid-blend | ✅ founder approval — adoptar cream `oklch(0.93 0.02 80)` para hero/marketing, mantener Dopamine puro para dashboards densos | 2 |
| `--color-text-secondary` dark | `oklch(0.78 0.01 280)` | `rgba(240,235,224,0.62)` (--cream-2) | hybrid-blend | añadir `--color-text-cream-secondary` derivado de cream primary @62%, escena marketing | 1 |
| `--color-text-muted` dark | `oklch(0.62 0.01 280)` | `rgba(240,235,224,0.32)` (--cream-3) | hybrid-blend | añadir `--color-text-cream-muted` cream @32% para captions/eyebrows hero/marketing | 1 |
| `--color-text-inverse` | contextual | n/a | keep-dopamine | semántica Dopamine ya correcta | 0 |
| `--color-text-cream-primary` (nuevo) | — | `#F0EBE0` | propose-new | ✅ founder approval cream variant — token explícito | 0.5 |
| `--color-text-cream-secondary` (nuevo) | — | `rgba(240,235,224,0.62)` | propose-new | ✅ derivado cream variant @62% para subtítulos hero/marketing | 0.25 |
| `--color-text-cream-muted` (nuevo) | — | `rgba(240,235,224,0.32)` | propose-new | ✅ derivado cream variant @32% para labels/eyebrows | 0.25 |

### 1.3 Colores — Brand / accent

| Token | Dopamine actual | Prototype propuesto | Decisión | Justificación | Effort h |
|---|---|---|---|---|---|
| `--color-brand-primary` | `oklch(0.67 0.19 285)` indigo/violet | `#6366F1` indigo-500 | adopt-prototype | prototype indigo es más saturado y cleaner; mapeo OKLCH `oklch(0.61 0.21 277)` | 2 |
| `--color-brand-secondary` | `oklch(0.78 0.12 180)` teal | `#818CF8` indigo-400 | hybrid-blend | mantener teal Dopamine para portal-desarrollador; añadir `--color-indigo-light` para gradient | 1 |
| `--color-accent-warm` | `oklch(0.80 0.15 65)` amber/coral | `#F59E0B` amber-500 | keep-dopamine | Dopamine amber es coral-warm shadow-wow; prototype amber es más clínico | 0 |
| `--color-rose` (nuevo) | — | `#EC4899` rose-500 | propose-new | ✅ founder approval — segunda parada del gradient indigo→rose; mapeo `oklch(0.65 0.24 5)` | 1 |
| `--color-indigo-3` (nuevo) | — | `#a5b4fc` indigo-300 | propose-new | tono claro indigo para text accent (eyebrows, links activos); `oklch(0.79 0.13 277)` | 0.5 |

### 1.4 Colores — Status (success/warning/danger/info)

| Token | Dopamine actual | Prototype propuesto | Decisión | Justificación | Effort h |
|---|---|---|---|---|---|
| `--color-success` | `oklch(0.72 0.17 150)` | `#22C55E` (--green) | hybrid-blend | mantener Dopamine semantic; añadir `--color-success-light` `#86EFAC` | 1 |
| `--color-warning` | `oklch(0.82 0.17 85)` | `#F59E0B` (--amber) | hybrid-blend | mantener Dopamine; añadir `--color-warning-light` `#FCD34D` | 0.5 |
| `--color-danger` | `oklch(0.64 0.23 25)` | `#EF4444` (--red) | hybrid-blend | mantener Dopamine; añadir `--color-danger-light` `#FCA5A5` | 0.5 |
| `--color-info` | `oklch(0.72 0.15 240)` | n/a (no info en prototype) | keep-dopamine | prototype no usa info color separado; Dopamine sigue | 0 |

### 1.5 Colores — Borders

| Token | Dopamine actual | Prototype propuesto | Decisión | Justificación | Effort h |
|---|---|---|---|---|---|
| `--color-border-subtle` | `oklch(0.30 0.02 280)` dark | `rgba(255,255,255,0.08)` | hybrid-blend | adoptar valor prototype para dark cards (más sutil); mantener Dopamine light | 1 |
| `--color-border-strong` | `oklch(0.40 0.02 280)` dark | `rgba(255,255,255,0.14)` | hybrid-blend | adoptar prototype para inputs/pills dark; mantener Dopamine light | 1 |
| `--color-border-focus` | `oklch(0.67 0.19 285)` | `rgba(99,102,241,0.4)` indigo | adopt-prototype | focus indigo `0.4` opacity más suave, menos chrome | 0.5 |
| `--color-border-hover-indigo` (nuevo) | — | `rgba(99,102,241,0.35)` | propose-new | hover state borde para cards (`vinyl-tile:hover`, `prop-premium:hover`) | 0.5 |
| `--color-border-hover-rose` (nuevo) | — | `rgba(236,72,153,0.45)` | propose-new | hover state borde rose para save/like (`prop-save.active`) | 0.25 |

### 1.6 Colores — Tints / pill backgrounds

| Token | Dopamine actual | Prototype propuesto | Decisión | Justificación | Effort h |
|---|---|---|---|---|---|
| `--color-bg-lavender` | `oklch(0.97 0.025 300)` | n/a | keep-dopamine | tint Dopamine cubre caso de uso portal-comprador; prototype no tiene equivalente | 0 |
| `--color-bg-mint` | `oklch(0.97 0.03 170)` | n/a | keep-dopamine | sigue, FASE 20 dependency | 0 |
| `--color-bg-peach` | `oklch(0.97 0.035 60)` | n/a | keep-dopamine | sigue | 0 |
| `--color-bg-slate` | `oklch(0.97 0.01 240)` | n/a | keep-dopamine | sigue | 0 |
| `--color-bg-rose` | `oklch(0.97 0.03 10)` | n/a | keep-dopamine | mantener token Dopamine; estandarizar uso rgba inline | 0 |
| `--color-pill-indigo-bg` (nuevo) | — | `rgba(99,102,241,0.10)` | propose-new | bg standard para `.pill` indigo, `.search-tab.active`, `.chip.active` — centralizar | 1 |
| `--color-pill-indigo-border` (nuevo) | — | `rgba(99,102,241,0.24)` | propose-new | border standard pill indigo (normalizar 0.22-0.30 range) | 0.25 |
| `--color-pill-green-bg` (nuevo) | — | `rgba(34,197,94,0.10)` | propose-new | success pill bg | 0.5 |
| `--color-pill-amber-bg` (nuevo) | — | `rgba(245,158,11,0.10)` | propose-new | warning pill bg | 0.25 |
| `--color-pill-rose-bg` (nuevo) | — | `rgba(236,72,153,0.12)` | propose-new | rose accent pill bg (save active states) | 0.25 |

### 1.7 Colores — Gradients

| Token | Dopamine actual | Prototype propuesto | Decisión | Justificación | Effort h |
|---|---|---|---|---|---|
| `--gradient-p` (primary) | `linear-gradient(135deg, oklch indigo→teal-blue)` | `linear-gradient(90deg, #6366F1, #EC4899)` indigo→rose | adopt-prototype | ✅ founder approval — pieza brand del prototype | 4 |
| `--gradient-warm` | amber→coral 135deg | n/a | keep-dopamine | mantener para shadow-wow celebrations | 0 |
| `--gradient-cool` | teal→blue 135deg | n/a | keep-dopamine | sigue para portal-desarrollador | 0 |
| `--gradient-fresh` | mint→teal 135deg | `linear-gradient(90deg, #22C55E, #86EFAC)` | hybrid-blend | mantener Dopamine; añadir alias `--gradient-success-bar` para barras plusvalia | 0.5 |
| `--gradient-sunset` | amber→red 135deg | `linear-gradient(90deg, #F59E0B, #EF4444)` | hybrid-blend | mantener Dopamine; añadir alias `--gradient-warning-bar` para barras alerta | 0.5 |
| `--gradient-iridescent` | indigo→teal→amber 3-stop | n/a | keep-dopamine | sigue uso Dopamine (Card3D feature blocks) | 0 |
| `--gradient-shimmer` | white shimmer 90deg | n/a | keep-dopamine | sigue | 0 |
| `--gradient-surface-card` (nuevo) | — | `linear-gradient(180deg, #0E1220 0%, #0A0D16 100%)` | propose-new | surface gradient para `prop-premium`, `vinyl-tile`, `pcard`, `spec-card` | 1 |
| `--gradient-aurora-indigo` (nuevo) | — | radial blur 80px | propose-new | aurora ambient blob — para hero backgrounds, complementa ParticleField | 0.5 |
| `--gradient-aurora-rose` (nuevo) | — | radial blur 80px | propose-new | aurora rose ambient | 0.25 |
| `--gradient-fade-bg` (nuevo) | — | hero bottom fade utility | propose-new | reemplaza inline gradient en marketing | 0.25 |

### 2 — Typography

| Token | Dopamine actual | Prototype propuesto | Decisión | Justificación | Effort h |
|---|---|---|---|---|---|
| `--font-display` | `'Outfit', ui-sans-serif, system-ui` | `'Outfit', sans-serif` | hybrid-blend | ✅ founder approval — mantener fallbacks Dopamine con valor canonical Outfit | 0.25 |
| `--font-body` | `'DM Sans', ui-sans-serif, system-ui` | `'DM Sans', sans-serif` | hybrid-blend | ✅ founder approval DM Sans pair — fallbacks Dopamine | 0.25 |
| `--font-mono` | `'JetBrains Mono', ui-monospace, ...` | `ui-monospace, monospace` | keep-dopamine | prototype no especifica mono custom; Dopamine sigue | 0 |
| `--text-xs` ... `--text-5xl` | escala fija | escala fluida `clamp()` | propose-new | añadir tier fluid responsive para hero/marketing; mantener escala fixed para apps | 2 |
| `--text-fluid-display` (nuevo) | — | `clamp(44px, 6vw, 80px)` | propose-new | hero h1 marketing | 0.5 |
| `--text-fluid-h2` (nuevo) | — | `clamp(32px, 4.2vw, 52px)` | propose-new | section headings | 0.25 |
| `--text-fluid-cta` (nuevo) | — | `clamp(38px, 5.5vw, 68px)` | propose-new | cta-h2 oversized italic | 0.25 |
| `--font-weight-extrabold` (nuevo) | — | `800` | propose-new | display weight prototype (h2, hero-h1, comp-big, vinyl-score-big, stat .v) | 0.25 |
| `--leading-tight` | `1.15` | `0.95-0.98` | hybrid-blend | añadir `--leading-display: 0.98` para display tipographic super-tight | 0.5 |
| `--leading-snug` | `1.3` | `1.20` | keep-dopamine | mantener escala Dopamine | 0 |
| `--leading-normal` | `1.5` | `1.45-1.55` | keep-dopamine | rango compatible | 0 |
| `--leading-relaxed` | `1.7` | `1.7` | keep-dopamine | exact match | 0 |
| `--tracking-tight` | `-0.02em` | `-0.02em → -0.045em` | hybrid-blend | añadir `--tracking-tighter`, `--tracking-tightest` para display oversized | 0.5 |
| `--tracking-display` (nuevo) | — | `-0.03em` | propose-new | display tracking standard | 0.25 |
| `--tracking-display-mega` (nuevo) | — | `-0.045em` | propose-new | mega numbers (scores 68px+) | 0.25 |
| `--tracking-uppercase-eyebrow` | `0.04em` | `0.05em-0.22em` | hybrid-blend | añadir `--tracking-eyebrow: 0.22em`, `--tracking-uppercase: 0.14em` — sistema explícito | 0.75 |

### 3 — Radii

| Token | Dopamine actual | Prototype propuesto | Decisión | Justificación | Effort h |
|---|---|---|---|---|---|
| `--radius-sm` | `0.375rem` (6px) | `8px` | hybrid-blend | actualizar a `0.5rem` (8px) para alinear con prototype "small chip" | 0.5 |
| `--radius-md` | `0.75rem` (12px) | `10-12px` | hybrid-blend | mantener `0.75rem`; añadir `--radius-md-tight: 0.625rem` (10px) para inner chips | 0.5 |
| `--radius-lg` | `1.25rem` (20px) | `14-18px` | hybrid-blend | reducir a `1rem` (16px) — prototype standard cards más compacto | 1 |
| `--radius-xl` | `1.75rem` (28px) | `20-28px` | hybrid-blend | añadir `--radius-xl: 1.25rem` (20px) y `--radius-2xl: 1.375rem` (22px); reservar `--radius-3xl: 1.75rem` (28px) | 1 |
| `--radius-pill` | `999px` | `9999px` universal | adopt-prototype | ✅ founder approval — pill 9999 universal para todo lo interactivo (buttons, inputs, chips, badges, save buttons, nav links, ctas) | 4 |

> Nota: el prototype usa `9999px` literalmente en ~40 lugares. La hybrid-blend significa: el **default** para `Input`, `Chip`, `Badge`, `Save`, `Nav link`, `Tab` debe ser pill en el lenguaje hybrid. Esto requiere un audit per-componente (ver M3a effort breakdown).

### 4 — Shadows

| Token | Dopamine actual | Prototype propuesto | Decisión | Justificación | Effort h |
|---|---|---|---|---|---|
| `--shadow-xs` | `0 1px 2px ...` | n/a | keep-dopamine | granularidad útil app | 0 |
| `--shadow-sm` | `0 2px 6px ...` | n/a | keep-dopamine | sigue | 0 |
| `--shadow-md` | `0 6px 18px ...` | n/a | keep-dopamine | sigue | 0 |
| `--shadow-lg` | `0 14px 32px ...` | `0 24px 80px rgba(0,0,0,0.45)` | hybrid-blend | añadir `--shadow-elev-card` para cards elevated dark | 0.5 |
| `--shadow-xl` | `0 24px 56px ...` | `0 24px 60px rgba(99,102,241,0.12)` | hybrid-blend | añadir `--shadow-card-hover-indigo` — hover sombra tinted brand | 1 |
| `--shadow-glow-primary` | `0 0 32px oklch indigo / 0.4` | `0 8px 24px rgba(99,102,241,0.25)` rest / `0 12px 32px rgba(236,72,153,0.35)` hover | hybrid-blend | refactor: añadir `--shadow-cta-rest` y `--shadow-cta-hover` | 1 |
| `--shadow-glow-warm` | `0 0 32px oklch warm / 0.45` | n/a | keep-dopamine | shadow-wow celebrations sigue | 0 |
| `--shadow-glow-cool` | `0 0 32px oklch cool / 0.4` | n/a | keep-dopamine | sigue | 0 |
| `--shadow-pin-rose` (nuevo) | — | `0 0 0 3px rgba(236,72,153,0.25), 0 0 12px rgba(236,72,153,0.8)` | propose-new | pin/dot map glow rose — heatmap accent | 0.25 |
| `--shadow-pin-indigo` (nuevo) | — | `0 0 12px rgba(99,102,241,0.7)` | propose-new | pin map indigo — map overlays | 0.25 |
| `--shadow-logo-mark` (nuevo) | — | `0 4px 14px rgba(99,102,241,0.35)` | propose-new | sombra brand logo gradient | 0.25 |
| `--shadow-focus-ring` (nuevo) | — | derivado de border-focus | propose-new | A11y focus ring `0 0 0 3px oklch(0.61 0.21 277 / 0.4)` | 0.5 |

### 5 — Spacing

| Token | Dopamine actual | Prototype propuesto | Decisión | Justificación | Effort h |
|---|---|---|---|---|---|
| `--spacing-sidebar-collapsed` | `60px` | n/a | keep-dopamine | layout admin/asesor | 0 |
| `--spacing-sidebar-expanded` | `240px` | n/a | keep-dopamine | sigue | 0 |
| `--spacing-header` | `54px` | `60px` (.nav height) | hybrid-blend | actualizar a `60px` para alinear con prototype navbar | 0.5 |
| `--spacing-copilot-collapsed` | `60px` | n/a | keep-dopamine | sigue | 0 |
| `--spacing-copilot-expanded` | `420px` | n/a | keep-dopamine | sigue | 0 |
| `--content-max` | `1100px` | `1100-1280px` | hybrid-blend | añadir `--content-max-narrow: 760px` (cta), `--content-max-wide: 1200px` marketing landing | 0.5 |
| `--spacing-section` (nuevo, ADR-023 mention) | — | `80px 32px` | propose-new | resolver TODO ADR-023 — densidad `comfortable` 80/32 y `compact` 48/24 | 1 |
| `--spacing-card-y` (nuevo, ADR-023 mention) | — | `28px 32px` | propose-new | densidad card vertical, dos sets `comfortable` 28px / `compact` 18px | 0.5 |
| `--spacing-component-gap` (nuevo, ADR-023 mention) | — | `48-72px` | propose-new | gap entre componentes marketing, dos sets `comfortable` 48px / `compact` 24px | 0.5 |
| `--gap-card-grid` (nuevo) | — | `20-24px` | propose-new | gap standard grids cards listings | 0.25 |

### 6 — Animations

| Token | Dopamine actual | Prototype propuesto | Decisión | Justificación | Effort h |
|---|---|---|---|---|---|
| `--duration-fast` | `150ms` | `200ms` | hybrid-blend | mantener Dopamine 150ms; añadir `--duration-fast-2: 200ms` para hover transitions | 0.25 |
| `--duration-base` | `250ms` | `0.25s` (250ms) | keep-dopamine | exact match | 0 |
| `--duration-slow` | `400ms` | `0.4-0.45s` | keep-dopamine | match | 0 |
| `--duration-slower` | `700ms` | `1s` (bar-fill) | hybrid-blend | añadir `--duration-bar-fill: 1000ms` para barras animadas | 0.25 |
| `--ease-dopamine` | `cubic-bezier(0.22, 1, 0.36, 1)` | `cubic-bezier(.22,1,.36,1)` | keep-dopamine | ✅ exact match | 0 |
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | n/a | keep-dopamine | sigue | 0 |
| `--motion-enter` | `300ms ease-dopamine` | n/a | keep-dopamine | sigue | 0 |
| `--motion-exit` | `200ms cubic-bezier(0.4, 0, 1, 1)` | n/a | keep-dopamine | sigue | 0 |
| `--motion-bounce` | `600ms cubic-bezier(0.68, -0.55, 0.265, 1.55)` | n/a | keep-dopamine | sigue (toast celebration) | 0 |
| keyframe `marquee` | n/a (Dopamine usa `ticker` similar) | `from{translateX(0)} to{translateX(-50%)}` 28-60s linear infinite | hybrid-blend | renombrar Dopamine `ticker` → mantener; añadir alias `marquee` para parity | 0.25 |
| keyframe `ping` | n/a | `0%{scale(1) opacity:1} 100%{scale(2.5) opacity:0}` 2s | propose-new | pin pulse map ring | 0.25 |
| keyframe `pulse` (live-dot) | Dopamine `pulse-glow` shadow-based | `0/100%{opacity:1 scale(1)} 50%{opacity:0.4 scale(1.4)}` 1.6s | hybrid-blend | añadir `pulse-dot` keyframe distinto (dot scaling) | 0.25 |
| keyframe `float-a/b` (aurora) | Dopamine `float-y/slow/med/fast` | `float-a` 18s + `float-b` 22s translate | hybrid-blend | añadir `aurora-float-a/b` para blob aurora ambient blur | 0.5 |
| Reduced motion override | Dopamine OK `0.01ms` | prototype `0.001ms` | keep-dopamine | exact behavioral match | 0 |

### Effort breakdown M3a

| Sub-bloque | Effort h |
|---|---|
| Tokens.css refactor (apply 82 decisions) | 14 |
| Primitives DMX framer-motion port (BlurText, FadeUp, StaggerContainer, CountUp, AnimatedBar, AuroraBackground, Marquee) | 16 |
| Componentes base DMX refresh (Button, Card, Input, Pill/Chip, Select, Badge — pill default + cream variants + gradient indigo→rose) | 12 |
| **Total M3a** | **42** |

Desglose componentes base (12 h):

- `Button` — variant `pill` ya existe (ADR-023), añadir `pill-glass`, `pill-ghost`, `pill-solid` variants prototype + glow shadows: 2 h
- `Card` — añadir `variant="surface-card"` con `--gradient-surface-card` + double-layer mask border (`prop-premium::before`): 2 h
- `Input` — variant `pill` ya existe, añadir search-row composition pattern: 2 h
- `Pill/Chip` — nuevo componente unificado con variants `indigo|green|amber|rose|glass|muted`, default radius pill: 2 h
- `Select` — variant pill alineado con `Input`: 1 h
- `Badge` — props `tone` (success/warning/danger/info/indigo/rose) + `variant` (solid/soft/outline): 2 h
- Sweep `score-chip`, `dossier-tag`, `tag-chip`, `nav-link` → componente compartido: 1 h

## Sección 2 — Componentes adoption plan

Análisis 17 componentes prototype × DMX existing mapping. Detalle component-by-component vive en `tmp/07.6.C-drafts/SA-Componentes.md`. Tabla resumen:

| # | Componente | Equivalente DMX | Gap | Decisión | Server/Client | Destino DMX | i18n keys | A11y items | Deps | Effort h |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Hero.jsx | NO existe | full landing hero | port-completo | Client (canvas + IO) | `features/landing/components/hero.tsx` | 14 | 6 | framer-motion, M3a primitives | 18 |
| 2 | Navbar.jsx | `shared/ui/layout/header.tsx` (admin shell, scope distinto) | landing nav público | port-completo | Client (scroll listener) | `features/landing/components/navbar.tsx` | 9 | 7 | next-intl, next/link | 10 |
| 3 | LiveTicker.jsx | NO existe | data-driven marquee | adapt-pattern | Client (CSS marquee) | `features/landing/components/live-ticker.tsx` | 5 | 4 | M3a primitives, CSS-only | 6 |
| 4 | SearchBar.jsx | NO existe | search hero overlap | port-completo | Client (state) | `features/landing/components/search-bar.tsx` | 18 | 7 | react-hook-form, zod, M3a | 14 |
| 5 | ColoniasBento.jsx | parcial: `intelligence-card.tsx` (IE scope distinto) | layered tile colonia público | port-completo | Server shell + Client tile | `features/landing/components/colonias-bento.tsx` + `colonia-vinyl-tile.tsx` | 28 | 8 | recharts/SVG inline, M3a | 24 |
| 6 | ColoniaComparator.jsx | NO existe (radar custom SVG) | radar interactivo 6-axis | port-completo | Client (SVG + state) | `features/landing/components/colonia-comparator.tsx` | 24 | 9 | M3a primitives, SVG nativo | 22 |
| 7 | PropertyListings.jsx | NO existe | property card multi-photo | port-completo | Server shell + Client carousel | `features/landing/components/property-listings.tsx` + `property-card.tsx` | 22 | 9 | M3a primitives, formatCurrency | 20 |
| 8 | IntelligenceEngine.jsx | parcial: `intelligence-card.tsx` (rich) + `score-transparency-panel.tsx` | landing IE explainer panel | adapt-pattern | Client (animated bars) | `features/landing/components/intelligence-engine.tsx` | 16 | 6 | M3a primitives, AnimNum existing | 10 |
| 9 | Stats.jsx | parcial: `anim-num.tsx` (CountUp existe) | wrapper grid 4-stat | adapt-pattern | Client (IO + AnimNum) | `features/landing/components/stats.tsx` | 6 | 4 | AnimNum existing, IO | 4 |
| 10 | Testimonials.jsx | NO existe | doble marquee CSS | adapt-pattern | Client | `features/landing/components/testimonials.tsx` | 14 | 5 | CSS-only animation | 6 |
| 11 | Faq.jsx | NO existe (page `/faq` existe sin accordion landing) | accordion 7 items + sticky col | adapt-pattern | Client (Disclosure custom) | `features/landing/components/faq.tsx` | 16 | 7 | @radix-ui pattern, M3a | 6 |
| 12 | CtaFooter.jsx | parcial: `PreviewCta.tsx` (preview scope) | landing CTA + global footer | port-completo | Server (semantic) + Client tag | `features/landing/components/cta-footer.tsx` + `shared/ui/layout/footer.tsx` | 12 | 5 | next-intl, next/link | 8 |
| 13 | MapOverlay.jsx | parcial: `mini-map.tsx` (scope distinto) | hero floating glass overlay | adapt-pattern | Client (ping anim) | `features/landing/components/map-overlay.tsx` | 8 | 4 | mapbox-gl o SVG simulado, M3a | 6 |
| 14 | CustomCursor.jsx | NO existe | desktop cursor 3-layer | skip-no-fit | n/a | n/a | 0 | n/a | n/a | 0 |
| 15 | icons.jsx | NO existe (SVG inline) | librería de iconos shared | adopt-as-is | Server (SVG puro) | `shared/ui/icons/index.tsx` | 0 | 2 | none | 4 |
| 16 | primitives.jsx | parcial: `AnimNum` existe; resto NO | 5 motion primitives M3a | adopt-as-is | Client | `shared/ui/motion/{blur-text,fade-up,stagger-container,animated-bar}.tsx` + `use-in-view.ts` | 0 | 6 | framer-motion + IO API | 8 |
| 17 | App.jsx | n/a (composición route) | composición landing route | adapt-pattern | Server | `app/[locale]/page.tsx` (overwrite stub) | 0 | 0 | n/a | 2 |

**Total effort componentes (incluido orchestration): 168 h.**
**Total feature components puros (excluyendo skip + icons + primitives + App): 144 h.**

### Patterns recurrentes detectados

- `useInViewFallback` (IntersectionObserver) → centralizar en `shared/ui/motion/use-in-view.ts`, reutilizar en 12+ componentes.
- `BlurText` en H1/H2 de Hero, ColoniasBento, ColoniaComparator, PropertyListings, IntelligenceEngine, Testimonials, Faq, CtaFooter (8 usos).
- `FadeUp` ubicuo (todos los wrappers de bloque).
- `StaggerContainer` en grids: ColoniasBento (3 tiles), PropertyListings (3 cards), IntelligenceEngine (3 features).
- CSS marquee en LiveTicker + Testimonials (compartir `@keyframes marquee` en `styles/tokens.css`).
- Glass card pattern (background `rgba(255,255,255,0.05)` + backdrop-blur(24px) + border) en MapOverlay, Testimonials, Faq button → centralizar `.glass` utility en `styles/tokens.css`.
- SVG inline scenes (PhotoScene 4 variants) — patrón aplicable en `shared/ui/illustrations/property-scenes.tsx` reutilizable.

### Componentes que dependen de M3a primitives

12 de 17 componentes (Hero, LiveTicker, SearchBar, ColoniasBento, ColoniaComparator, PropertyListings, IntelligenceEngine, Stats, Testimonials, Faq, CtaFooter, MapOverlay) consumen primitives definidos en `primitives.jsx` (#16). **M3a debe shipear ANTES de cualquier componente M3b.**

## Sección 3 — i18n extraction plan

### Breakdown 187 keys × 5 locales = 935 entries

| Componente | Keys | Notas |
|---|---|---|
| Hero | 14 | eyebrow, h1 split, sub, 2 CTAs, 5 score pills, location, partners label |
| Navbar | 9 | brand, 4 links, 2 CTAs, mobile menu aria, signin aria |
| LiveTicker | 5 | label, currency_unit, 3 percent_aria (up/down/flat) |
| SearchBar | 18 | 4 tabs, input ph, 2 selects + options, btn, 8 chips |
| ColoniasBento | 28 | eyebrow, h2, sub, 4 layer labels + descs, ~12 fact keys, lifeline label, footer labels, CTA aria |
| ColoniaComparator | 24 | eyebrow, h2, sub, 3 howto + descs, slot labels, 6 axis_label + 6 AXIS_HELP |
| PropertyListings | 22 | eyebrow, h2, sub, 7 photo tags, meta labels, plusvalia, 3 scores, asesor role, CTA, save/nav arias |
| IntelligenceEngine | 16 | eyebrow, h2, sub, 3 features × 2 (title+desc), panel meta, score block, CTA |
| Stats | 6 | 4 stat labels + footer + pill template |
| Testimonials | 14 | eyebrow, h2, 6 testimonios × {q, a, r} compactos |
| Faq | 16 | tag, h2, sub, btn, 7 Q+A items + arias |
| CtaFooter | 12 | cta block + footer block (logo, 4 links, copyright) |
| MapOverlay | 8 | preview, 6 score acronyms, link |
| **Total** | **187** | × 5 locales = **935 entries** |

### Locale-aware patterns (regla #9 CLAUDE.md)

- **Currency**: `formatCurrency(amount, country_code)` retorna formato local — `MXN $58,000`, `COP $4,800,000`, `ARS $25,000`, `BRL R$ 12,000`, `USD $3,400`.
- **Date**: `formatDate(date, locale)` con date-fns + date-fns-tz (presentes 4.1.0 / 3.2.0).
- **Phone**: `formatPhone(phone, country_code)` E.164 → display nacional.
- **Address**: `formatAddress({ colonia, ciudad, country })` por convención local.

### Gating per ship

- Zero strings hardcoded user-facing (regla #8 CLAUDE.md). Sweep automatizado pre-merge.
- Revisión nativo por locale (es-MX nativo founder; es-CO/AR/pt-BR/en-US async via vendor TBD FASE 08).
- Effort estimate: **16h** total revisión + integración.

## Sección 4 — WCAG 2.1 AA validation checklist

89 a11y items concretos validables, distribuidos por categoría componente:

### Hero / Marketing surfaces (6 items)
- `prefers-reduced-motion` → omitir canvas + scroll-scrub, mostrar `hero-fallback` estático.
- BlurText preserva texto leído por screenreader (`aria-hidden` spans + `sr-only` full).
- Contrast cream `#F0EBE0` sobre `#06080F` ≈ 18.4:1 OK.
- Cream-3 (32% opacity) verificar 6:1 marginal (re-validar caso "actualizado hace 6h").
- Skip-to-content link visually hidden, focus visible.
- Focus visible CTAs primary/glass — outline indigo 2px o `--shadow-focus-ring`.

### Nav / Header (7 items)
- `<nav aria-label="Principal">` semantic.
- Hamburger button `aria-expanded` + `aria-controls`.
- Mobile sheet: focus trap + ESC close + restore focus.
- Active link `aria-current="page"`.
- Skip-to-content link visually hidden.
- Keyboard nav Tab order lógico + outline visible.
- CTA accessible name explícito ("Explorar mapa CDMX") no solo "Explorar mapa" si icon `aria-hidden`.

### Forms — SearchBar, Faq form CTAs (7 items SearchBar)
- `<form>` semantic con submit handler.
- Tabs `role="tablist"` + `role="tab"` + `aria-selected`.
- Input `<label>` asociado (no solo placeholder).
- Selects con `aria-label` + chevron icon `aria-hidden`.
- Chips `aria-pressed` + `role="group" aria-label="Filtros activos"`.
- Submit button con icono → texto explícito.
- Keyboard nav between tabs ←/→.

### Lists — PropertyListings (9 items), ColoniasBento (8 items)
- `<article>` per card, heading `<h3>` colonia/property name.
- Carousel `role="region" aria-roledescription="carousel" aria-label="..."`.
- Slides anuncian idx ("Foto 2 de 3: Interior").
- Arrows `aria-label` + keyboard arrows ←/→.
- Heart button `aria-pressed` saved/unsaved.
- Dots `role="tablist"` + `role="tab"` `aria-selected`.
- Plusvalía positiva: texto + icono (no solo color verde).
- Reduced-motion → omitir transitions/auto-rotate.
- Photo scenes `role="img"` + `aria-label` descriptivo.

### Maps / Comparator — ColoniaComparator (9 items), MapOverlay (4 items)
- SVG `<title>` + `<desc>` describiendo radar values.
- Axis pills `role="button"` + `aria-pressed` + keyboard activable.
- Picker buttons `role="radio"` dentro `role="radiogroup"`.
- Help box on highlight `aria-live="polite"` región.
- Color-blind friendly: stroke + texto chip A/B (no solo color).
- Mobile <960: stack vertical + picker fullwidth.
- Reduced-motion: omitir radar polygon transitions + ticker.
- SVG con `role="img" aria-label="Mapa preview Del Valle Centro"`.
- Pin con `aria-label` posición.

### Modal / Disclosure — Faq (7 items)
- Accordion WCAG: `<button aria-expanded aria-controls>` + `<div role="region" aria-labelledby>`.
- Keyboard: ESC close + Up/Down nav between triggers + Home/End first/last.
- Single-open vs multi-open: prototype single-open — anuncia con `aria-live="polite"`.
- Chevron `aria-hidden="true"` (decorativo).
- Sticky col izq no oculta trigger en mobile.
- Focus visible per trigger.
- Question heading `<h3>` per item.

### Bars / Meters — IntelligenceEngine (6 items), Stats (4 items)
- Bars `role="meter"` + `aria-valuenow/aria-valuemax` + accessible name (label).
- Reduced-motion → bars render directos sin width transition.
- Score-big como `<output>` o spans con `aria-label` "Score 87 sobre 100".
- AnimNum live region opcional `aria-live="polite"`.
- Stat label asociado a número (programmatic).
- Order semantic: número primero o etiqueta primero según UX (consistente).

### Marquees — LiveTicker (4 items), Testimonials (5 items)
- `aria-live="off"` (no spam screenreader).
- Pause on hover/focus.
- Reduced-motion → static stack vertical.
- Up/down/flat percent variants → `aria-label` semantic con valor.
- Testimonial author + role programmatic relationship.

### Footer — CtaFooter (5 items)
- `<footer>` semantic con `<nav aria-label="Footer">`.
- Logo con accessible name.
- Links con focus visible.
- Copyright como `<small>` semantic.
- CTA accessible name explícito.

### Otras categorías (residual)
- icons (2): default `aria-hidden="true"` decorativo + opt-in `role="img"` + `aria-label`.
- primitives (6): useReducedMotion en cada primitive + screenreader fallback BlurText + role meter AnimatedBar + GPU-accel transforms + no DOM extra StaggerContainer + opcional `will-change` FadeUp.

**Total: 89 items concretos auditables Vitest + axe-playwright + Playwright keyboard nav.**
**Effort total WCAG validation: 12 h cross-feature.**

## Sección 5 — Frontend build timeline (M3a + M3b)

### M3a Design System Refresh (PREREQUISITO bloqueante absoluto)

| Sub-bloque | Effort h |
|---|---|
| `styles/tokens.css` refactor (82 decisiones) | 14 |
| `shared/ui/motion/` primitives framer-motion port (BlurText, FadeUp, StaggerContainer, AnimatedBar, useInView, AuroraBackground, Marquee) | 16 |
| `shared/ui/dopamine/` base components refreshed (Button, Card, Input, Pill, Select, Badge) + `shared/ui/icons/index.tsx` | 12 |
| **Total M3a** | **42 h** |

- Fase target: **pre-FASE 11.T** (bloqueante para M3b).
- Tag de gate: `m3a-design-refresh-complete`.
- Host fase: extensión natural FASE 04 Design System (módulo 4.P).

### M3b Feature components (USA DS refreshed)

Distribuidos según destino del componente y fase target del crosswalk:

| Componente | Effort h | Fase target sugerida |
|---|---|---|
| Hero (#1) | 18 | FASE 11.T (Landing greenfield) |
| Navbar (#2) | 10 | FASE 11.T |
| LiveTicker (#3) | 6 | FASE 11.T |
| SearchBar (#4) | 14 | FASE 11.T |
| ColoniasBento (#5) | 24 | FASE 11.U (Atlas tile colonia) |
| ColoniaComparator (#6) | 22 | FASE 11.V (Comparator) |
| PropertyListings (#7) | 20 | FASE 11.W (Listings public) |
| IntelligenceEngine (#8) | 10 | FASE 11.T (landing IE explainer) |
| Stats (#9) | 4 | FASE 11.T |
| Testimonials (#10) | 6 | FASE 11.T |
| Faq (#11) | 6 | FASE 11.T |
| CtaFooter (#12) | 8 | FASE 11.T (CTA) + FASE 12 (footer global) |
| MapOverlay (#13) | 6 | FASE 11.T |
| **Total M3b** | **144 h** | distribuidos FASE 11.T-W |

- Tag de gate per feature: `m3b-<feature>-complete`.
- Cada componente entrega checklist a11y + i18n keys + tests pre-merge.

### Total Design Migration

| Bloque | Effort h |
|---|---|
| M3a Design System Refresh | 42 |
| M3b Feature components | 144 |
| i18n extraction (935 entries) | 16 |
| WCAG 2.1 AA validation | 12 |
| **Total** | **214 h** |

> Nota: tests Vitest + Playwright E2E son FASE 08 dedicated (~30 h adicional, fuera de esta cifra).

## Sección 6 — L-NEW propuestos por 07.6.C

> No editamos `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md` aquí — esa edición la hace 07.6.F canonization. Listamos candidates para registro y consolidación posterior.

| ID | Nombre | Descripción | Dependencia | Capa source |
|---|---|---|---|---|
| **L-NEW72** | Property Photo Scene Library | Set reutilizable de SVG illustrations (building/interior/view/garden + 6+ variantes) parametrizables por color y mood, alternativa a stock photos — zero CDN cost, brand-coherent, a11y-perfect. | M3b PropertyListings (#7) | SA-Componentes §7 |
| **L-NEW73** | Marquee Live-Data Component | Pattern reusable para tickers data-driven (LiveTicker actual + futuros: tasa BANXICO live, AVM movers, INPC delta) con props `{items, speed, direction, pauseOnHover, reducedMotion}`. | M3a primitives + DMX-LIV ticker | SA-Componentes §3 + SA-Tokens §6 |
| **L-NEW74** | Radar Comparator Engine | Extender `ColoniaComparator` a comparator universal: 2 colonias, 2 desarrollos, 2 properties. SVG manual con axes parametrizables. | M3b ColoniaComparator (#6) + L-NEW36 multi-comparable | SA-Componentes §6 |
| **L-NEW75** | Vinyl Tile Layered Display | Pattern dataviz "switch entre N capas en single tile" (`ColoniasBento`) reutilizable: Atlas tile multi-capa LIV/MOV/SEC/ECO, Indices nacional tile estado-level. | M3b ColoniasBento (#5) | SA-Componentes §5 |
| **L-NEW76** | Disclosure Primitive | Extracción del accordion pattern a `shared/ui/primitives/disclosure.tsx` reutilizable en Settings, Help docs, Onboarding. WCAG-compliant single/multi-open. | M3b Faq (#11) | SA-Componentes §11 |

**Total: 5 L-NEW candidates** (L-NEW72–L-NEW76), todos con destino concreto M3a/M3b actual (cumple regla `feedback_upgrades_destino.md` — prohibido "documentar sin ubicar"). Consolidación canonical en sub-sesión 07.6.F.

## Referencias

- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-031_DESIGN_SYSTEM_REFRESH.md` — ADR formal (decisión hybrid-blend approved).
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-023_DESIGN_SYSTEM_REFINEMENT.md` — Dopamine DS background, ADR amended por ADR-031.
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-032_FASE_07.6_PRODUCT_AUDIT_INSERTION.md` — fase 07.6 insertion context.
- `docs/08_PRODUCT_AUDIT/00_INVENTARIO_ACTUAL.md` — input 07.6.A inventario shipped.
- `docs/08_PRODUCT_AUDIT/01_CROSSWALK_MATRIX.md` — input 07.6.B crosswalk 150 features × DMX shipped.
- `docs/08_PRODUCT_AUDIT/03_RICE_PRIORITIES.md` — output paralelo 07.6.D (consume effort estimates de este doc).
- `docs/02_PLAN_MAESTRO/FASE_04_DESIGN_SYSTEM.md` — host del módulo 4.P (M3a refresh extension natural).
- `docs/02_PLAN_MAESTRO/FASE_07.6_PRODUCT_AUDIT.md` — plan maestro 07.6 detallado.
- `docs/05_OPERACIONAL/CONTRATO_EJECUCION.md` — contrato general (pendiente actualizar sección FASE 07.6).
- `tmp/product_audit_input/DMX-prototype/` — prototype assets analyzed (17 JSX × 1709 LOC + styles.css 1823 líneas + README spec 1311 líneas).
- Memorias canonizadas: `feedback_arquitectura_escalable_desacoplada.md` (opción más grande moonshot), `feedback_zero_deuda_tecnica.md` (M3a no diferible), `feedback_upgrades_destino.md` (L-NEW con destino), `feedback_pm_audit_exhaustivo_post_cc.md` (gating per-component), `feedback_card3d_no_tilt.md` (Dopamine cleaner — soporta skip CustomCursor).

---

**Generado:** 2026-04-24 sub-sesión 07.6.C (3/6) | **Inputs sub-agents:** SA-Tokens (82 tokens × 6 categorías), SA-Componentes (17 componentes × 1709 LOC), SA-ADR (consolidación ADR-031). **Drafts intermedios** archivados en `tmp/07.6.C-drafts/` (gitignored).
