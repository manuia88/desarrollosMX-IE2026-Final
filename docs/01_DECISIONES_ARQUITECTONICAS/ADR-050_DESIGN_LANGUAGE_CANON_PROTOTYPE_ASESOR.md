# ADR-050 — Design Language Canon Prototype Asesor (extensión ADR-048 al portal asesor)

**Status:** Aprobado 2026-04-26 founder Manu Acosta
**Date:** 2026-04-26
**Sub-sesión origen:** FASE 13.A — Foundation Visual Portal Asesor
**Deciders:** Manu Acosta (founder) + PM
**Extends:** ADR-048 (Frontend canon DMX = prototype JSX puro)
**Supersedes (frontend layer asesor):** ADR-023 (Dopamine refinement) — frontend visual del portal asesor; ADR-031 (hybrid blend) — totalmente para asesor
**Amends:** BIBLIA DECISIÓN 1 (frontend canon definition) — extiende cobertura a portal asesor
**Referenced by:** `docs/02_PLAN_MAESTRO/FASE_13_PORTAL_ASESOR_M1_M5.md`, `docs/02_PLAN_MAESTRO/FASE_14_PORTAL_ASESOR_M6_M10.md`, `styles/tokens.css`, `shared/ui/motion/`, `shared/ui/primitives/canon/`

## 1. Contexto

ADR-048 (2026-04-25) canoniza el prototype JSX (`tmp/product_audit_input/DMX-prototype/`) como source-of-truth visual frontend para landing público (M19) y portal comprador. El portal asesor (M01-M10) tiene su propio set de specs funcionales (Dashboard, Desarrollos, Contactos, Búsquedas, Captaciones, Tareas, Operaciones, Marketing, Estadísticas, Academia) y referencias-ui en `docs/referencias-ui/M1_Dashboard.tsx ... M9_Estadisticas.tsx` que fueron diseñadas con el lenguaje visual Dopamine v5.1 (OKLCH light theme + Card3D + density toggle + accent dominante).

Founder establece (2026-04-26) que el portal asesor **adopta el design language canon prototype** (dark theme navy + cream + indigo→rose + Outfit/DM Sans), preservando la **estructura de layout** de las referencias M1-M9 (sidebar 60→240px + topbar 72px + sections + cards) pero **re-skineando el lenguaje visual** al canon prototype. Adicionalmente, el portal asesor requiere extensiones específicas no presentes en landing (3 accents operacionales, 3 backgrounds compositivos, 4 score gradients narrativos, AI gradient distintivo, 4 shadows narrativas, 10 wayfinding colors por módulo).

Este ADR formaliza el canon design language asesor como extensión aditiva sobre ADR-048 prototype + reglas inviolables operacionales.

## 2. Decisión

### 2.1 Base canon (heredado de ADR-048)

El portal asesor adopta el set completo de tokens prototype canon definido en `tmp/product_audit_input/DMX-prototype/styles.css`:

- **Backgrounds dark canon:** `--bg: #06080F`, `--bg-2: #0D1017`, `--bg-3: #111827`.
- **Cream variants:** `--cream: #F0EBE0`, `--cream-2: rgba(240,235,224,0.62)`, `--cream-3: rgba(240,235,224,0.32)`.
- **Indigo + rose:** `--indigo: #6366F1`, `--indigo-2: #818CF8`, `--indigo-3: #A5B4FC`, `--rose: #EC4899`.
- **Status semantics:** `--green: #22C55E`, `--amber: #F59E0B`, `--red: #EF4444`.
- **Border tints:** `--border: rgba(255,255,255,0.08)`, `--border-2: rgba(255,255,255,0.14)`.
- **Brand gradient:** `linear-gradient(90deg, #6366F1, #EC4899)`.
- **Typography:** Outfit (700/800 display) + DM Sans (400/500/600 body) + ui-monospace (data tables).
- **Radii canon:** pill 9999px (Button/Input/Chip/Badge/Pill/Save/Tab obligatorio), card 22px, inner 14px, chip 10px, sharp 6px.
- **Motion canon:** instant 100ms / fast 200ms / normal 350ms / slow 650ms / grand 850ms (cap absoluto). Easings `ease-out cubic-bezier(.22,1,.36,1)` + `ease-spring`.

### 2.2 Extensión asesor — 3 accents operacionales

El portal asesor diferencia 3 dominios funcionales mediante accents semánticos NO presentes en landing:

| Token | HEX | Uso |
|---|---|---|
| `--accent-teal` | `#14B8A6` | Producto / oferta inmobiliaria (Desarrollos, Captaciones, Listings) |
| `--accent-violet` | `#A855F7` | Inteligencia artificial / signals predictivos (AI features, scores predichos, alertas) |
| `--accent-gold` | `#EAB308` | Performance / logros / KPIs operacionales (Estadísticas, Performance Today, achievements) |

Soft variants `--accent-{teal,violet,gold}-soft` (rgba 0.12 alpha) para badges/pills/glows.

### 2.3 Extensión asesor — 3 backgrounds compositivos

| Token | Definición | Uso |
|---|---|---|
| `--surface-elevated` | `#13182A` | Cards principales con shadow-up (KPI Strip, Pipeline cards, Hero Pulse) |
| `--surface-recessed` | `#04060B` | Áreas hundidas (insets de gráficos, sub-paneles, drawer bg) |
| `--surface-spotlight` | radial-gradient indigo glow over `#0D1017` | Elementos destacados (Daily Standup, AI cards focus state) |

### 2.4 Extensión asesor — 4 score gradients narrativos

Los scores asesor (Pulse, IE, conversion, performance) requieren codificación cromática progresiva más rica que el indigo→rose puro:

| Token | Gradient | Rango score |
|---|---|---|
| `--gradient-score-excellent` | `linear-gradient(90deg, #22C55E, #10B981)` (green→emerald) | 85-100 |
| `--gradient-score-good` | `linear-gradient(90deg, #6366F1, #8B5CF6)` (indigo→violet) | 65-84 |
| `--gradient-score-warning` | `linear-gradient(90deg, #F59E0B, #F97316)` (amber→orange) | 40-64 |
| `--gradient-score-critical` | `linear-gradient(90deg, #EF4444, #EC4899)` (red→rose) | 0-39 |

### 2.5 Extensión asesor — AI gradient distintivo

Para signals AI (predicciones, recomendaciones, score forecasts) un gradient único violet+indigo+rose que diferencia visualmente AI de data observada:

```css
--gradient-ai: linear-gradient(135deg, #A855F7 0%, #6366F1 50%, #EC4899 100%);
```

Aplicado en: AI cards border-glow, AI pills, AI score halos, predictive forecasts.

### 2.6 Extensión asesor — 4 shadows narrativas

| Token | Definición | Uso |
|---|---|---|
| `--shadow-rest` | `0 1px 2px rgba(0,0,0,0.45)` | Cards default reposo |
| `--shadow-hover` | `0 12px 32px rgba(99,102,241,0.18)` | Hover lift (translateY -6px + glow indigo) |
| `--shadow-focus` | `0 0 0 3px rgba(99,102,241,0.45)` | Keyboard focus ring canon |
| `--shadow-spotlight` | `0 24px 64px rgba(168,85,247,0.22)` | AI elementos destacados / spotlights |

### 2.7 Extensión asesor — 10 wayfinding colors per module

Cada uno de los 10 módulos del portal asesor (M01-M09 + Academia) tiene un accent token sutil (border-left 3px + ícono tint) para orientación cromática rápida:

| Módulo | Token | HEX | Rationale |
|---|---|---|---|
| M01 Dashboard | `--mod-dashboard` | `#6366F1` (indigo) | Comando central, brand neutral |
| M02 Desarrollos | `--mod-desarrollos` | `#14B8A6` (teal) | Producto/inventario |
| M03 Contactos | `--mod-contactos` | `#EC4899` (rose) | Personas/relación |
| M04 Búsquedas | `--mod-busquedas` | `#A855F7` (violet) | AI matching/intelligent |
| M05 Captaciones | `--mod-captaciones` | `#10B981` (emerald) | Pipeline growth/captura |
| M06 Tareas | `--mod-tareas` | `#F59E0B` (amber) | Acción/urgencia |
| M07 Operaciones | `--mod-operaciones` | `#3B82F6` (blue) | Procesos/flujo legal |
| M08 Marketing | `--mod-marketing` | `#F97316` (orange) | Outbound/creatividad |
| M09 Estadísticas | `--mod-estadisticas` | `#EAB308` (gold) | Performance/logros |
| Academia | `--mod-academia` | `#8B5CF6` (purple) | Learning/knowledge |

### 2.8 Reglas inviolables canon (asesor + landing unified)

**Visuales:**
1. Buttons SIEMPRE `border-radius: 9999px` (pill obligatorio, sin excepciones).
2. Brand gradient principal SOLO `linear-gradient(90deg, #6366F1, #EC4899)`. Variantes score/AI son aditivas, NO reemplazan brand.
3. Cero emoji en UI (excepto messaging chat usuario-asesor).
4. Transforms de hover SOLO eje Y (`translateY`). NO rotateX/rotateY/scale en cards.
5. Motion duración total ≤ 850ms (cap absoluto, no excepciones).
6. `viewport-triggered` animations usan `once: true` en IntersectionObserver.
7. Hardcoded colors fuera de tokens `@theme` PROHIBIDO.

**Operacionales asesor:**
8. **Numerical respect:** big numbers usan Outfit 800 + tabular-nums. Data tables usan ui-monospace. Gradient cromático SOLO en cifras hero (Pulse score, Performance score), nunca en data tabular.
9. **AI signal differentiation:** todo elemento que represente predicción/recomendación AI tiene `--gradient-ai` o `--shadow-spotlight` violet glow. Data observada usa indigo o accent del módulo.
10. **Disclosure flag:** features con data sintética/placeholder muestran badge `<DataDisclosureBadge type="synthetic" />` visible en card.
11. **Keyboard-first:** atajos `kbd` documentados en cada feature (`?` open shortcuts overlay, `cmd+k` global search, `j/k` row navigation, `g d` go dashboard).
12. **`prefers-reduced-motion`:** todas las animations respetan via media query global (ya en `tokens.css`).

## 3. Consequences

### Positivas

- **Identidad asesor coherente con canon DMX:** zero ambigüedad cross-portal; mismo sistema visual landing + comprador + asesor.
- **Diferenciación funcional cromática:** 3 accents + 10 wayfinding colors permiten orientación rápida sin texto adicional.
- **Score storytelling rico:** 4 score gradients comunican tier sin necesidad de etiquetas (excellent/good/warning/critical).
- **AI signals identificables:** gradient AI distinto a brand permite a usuario distinguir "predicho" vs "observado" sin lectura.
- **Foundation reusable:** primitives canon (`shared/ui/primitives/canon/`) + motion (`shared/ui/motion/`) sirven M01-M10 + futuras fases sin duplicación.
- **Co-existence con Dopamine legacy:** primitives existentes (`shared/ui/primitives/{card,button,...}.tsx` consumidos por 20+ features) NO se modifican. Migration gradual feature-by-feature en F2 implementation.

### Negativas / tradeoffs

- **Dual primitives durante transición F2:** features existentes Dopamine + features nuevas canon coexisten hasta migration completa. Mitigación: `shared/ui/primitives/canon/` namespace explícito + ADR-048 ya estableció migration plan M3b waves.
- **referencias-ui M1-M9 deprecated visual layer:** estructura de layout sigue siendo referencia válida (sidebar/topbar/sections), pero el lenguaje visual Dopamine v5.1 light theme queda DEPRECATED en banners de cada archivo (BIBLIA DECISIÓN 2 — preservar archivos como referencia layout, banner deprecated visual).
- **Effort F2 implementation no trivial:** re-skin layout structure × 10 módulos asesor × design language canon = ~80h CC pace 4x estimado en FASE 13.B-13.E + FASE 14.
- **Tokens.css crece:** ~70 tokens nuevos asesor (sobre los ~30 prototype canon). Mitigación: agrupados en secciones bien comentadas + Tailwind v4 CSS-first @theme purge automático.
- **Wayfinding colors potencial overdose:** 10 accents + 3 operational + brand puede saturar. Mitigación: regla "max 1 accent per card", brand neutral default en navegación cross-módulo.

### Neutras

- **Backend, RLS, tRPC, schemas:** NO cambian. Puro frontend foundation.
- **ADR-018 E2E connectedness:** NO cambia. Audit:dead-ui sigue obligatorio.
- **i18n:** NO cambia. Strings asesor extracción concurrente con cada módulo en F2.
- **Dependencies:** zero deps adicionales más allá de `class-variance-authority` (canon CVA pattern Button variants), `clsx`, `tailwind-merge` (ya presentes pre-13.A).

## 4. Alternatives considered

### Alt-A: Adoptar Dopamine v5.1 puro para asesor (mantener referencias-ui as-is)

Rechazada — produce inconsistencia visual cross-portal (asesor light theme vs landing/comprador dark canon). Founder rechazó explícitamente.

### Alt-B: Crear design language standalone asesor (3er sistema)

Rechazada — fragmentación de identidad DMX. ADR-048 establece prototype canon como source-of-truth single. Asesor extiende, no fork.

### Alt-C: Migrar primitives Dopamine existentes in-place (overwrite)

Rechazada — rompe 20+ features consumidoras (Pulse Score, Indices Públicos, Migration Flow, Widget Embed, etc.). Memoria canon `feedback_zero_deuda_tecnica.md` y `feedback_arquitectura_escalable_desacoplada.md` mandan co-existence + migration gradual.

### Alt-D (elegida): Co-existence — primitives canon en sub-namespace + tokens aditivos + migration F2

Aceptada — preserva 20+ features Dopamine, abre carril canon clean, permite re-skin gradual feature-by-feature post 13.A.

## 5. Compatibility

### Co-existence rules

- Tokens Dopamine v5.1 (`--color-bg-*` OKLCH light + dark overrides) PRESERVADOS sin cambios. NO se borran.
- Tokens prototype canon ADR-048 (`--bg`, `--cream`, `--indigo`, etc.) AGREGADOS al @theme.
- Tokens extensión asesor (3 accents + 3 surfaces + 4 gradients + 4 shadows + 10 wayfinding) AGREGADOS al @theme.
- Primitives Dopamine (`shared/ui/primitives/{card,button,...}.tsx`) PRESERVADOS. NO se modifican.
- Primitives canon (`shared/ui/primitives/canon/{Card,Button,ScorePill,MomentumPill,GlassOverlay,IconCircle}.tsx`) NUEVOS en sub-namespace.
- Motion primitives (`shared/ui/motion/{BlurText,FadeUp,StaggerContainer,Marquee}.tsx` + hooks `useInView`, `use3DTilt`) NUEVOS en directorio nuevo.

### Migration path F2

Cada módulo asesor M01-M10 en F2 implementation re-skinea consumiendo:
- Layout structure → referenciar `docs/referencias-ui/MN_*.tsx` (sidebar/topbar/sections estructura)
- Visual language → consumir `shared/ui/primitives/canon/*` + `shared/ui/motion/*` + tokens asesor
- Logic/handlers/hooks → NO touch (solo re-skin visual)

Features Dopamine existentes (Pulse Score, Indices, Migration Flow, etc.) migran post-asesor en fases dedicadas (FASE 18+ landing migration ADR-048 plan M3b).

## 6. Inputs referenciados

- `tmp/product_audit_input/DMX-prototype/styles.css` (1823 LOC — fuente verdad CSS canon)
- `tmp/product_audit_input/DMX-prototype/README.md` (1310 LOC — spec exhaustiva)
- `tmp/product_audit_input/DMX-prototype/src/primitives.jsx` (5 motion primitives canon)
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-048_FRONTEND_PROTOTYPE_CANONICAL_REPLACEMENT.md` (canon base)
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-023_DESIGN_SYSTEM_REFINEMENT.md` (Dopamine SUPERSEDED frontend)
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-031_DESIGN_SYSTEM_REFRESH.md` (hybrid SUPERSEDED totalmente)
- `docs/04_MODULOS/M01_DASHBOARD_ASESOR.md` ... `M09_ESTADISTICAS.md` (specs funcionales asesor)
- `docs/referencias-ui/M1_Dashboard.tsx` ... `M9_Estadisticas.tsx` (layout structure reference, visual SUPERSEDED)
- `docs/02_PLAN_MAESTRO/FASE_13_PORTAL_ASESOR_M1_M5.md` (plan canon)
- `styles/tokens.css` (Tailwind v4 @theme actual)
- `docs/biblia-v5/17_BIBLIA_DMX_v5_Decisiones_Hallazgos_Plan.md` (BIBLIA DECISIÓN 1 + 2)

---

# Fin ADR-050.
