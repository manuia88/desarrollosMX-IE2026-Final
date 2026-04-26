# ADR-048 — Frontend canon DMX = prototype JSX puro (replaces Dopamine + hybrid)

**Status:** Aprobado 2026-04-25 founder Manu Acosta
**Date:** 2026-04-25
**Sub-sesión origen:** FASE 07.7.A.1 — Frontend canonical audit
**Deciders:** Manu Acosta (founder) + PM
**Supersedes:** parcialmente ADR-023 (Dopamine Design System Refinement), totalmente ADR-031 (Design System Refresh hybrid-blend)
**Amends:** BIBLIA DECISIÓN 1 (frontend canon definition)
**Referenced by:** `docs/08_PRODUCT_AUDIT/07_FRONTEND_PROTOTYPE_CANONICAL.md`, `docs/08_PRODUCT_AUDIT/08_PROTOTYPE_TO_MODULES_MAPPING.md`, `docs/08_PRODUCT_AUDIT/02_DESIGN_MIGRATION.md` (re-evaluar)

## 1. Contexto

BIBLIA DECISIÓN 1 (Frontend canon DMX) tuvo dos iteraciones formales:

1. **ADR-023 (2026-04-19)** — Dopamine Design System Refinement: refinement aditivo sobre Dopamine post-competitive analysis Findperty. Mantiene OKLCH + Card3D restringido + ParticleField ambient + density toggle + shadow-wow celebrations + accent dominante por portal.

2. **ADR-031 (2026-04-24)** — Design System Refresh hybrid-blend: respuesta al Product Audit 07.6.C cuando los sub-agents SA-Tokens y SA-Componentes analizaron el prototype `tmp/product_audit_input/DMX-prototype/` y revelaron que su lenguaje visual (gradient indigo→rose 90deg, pill 9999 universal, typography Outfit/DM Sans, cream variants, dark canon `#06080F`) no existía en Dopamine actual. Founder aprobó "hybrid-blend máxima opción": 28 tokens keep, 14 adopt, 31 hybrid, 9 propose-new. Componentes 17 JSX × adoption (2 adopt-as-is, 7 adapt-pattern, 7 port-completo, 1 skip).

El **2026-04-25** founder revisita la decisión y determina que el blend-hybrid sigue dejando ambigüedad (qué pesa más, Dopamine OKLCH o prototype HEX?) y produce risk de inconsistencia visual cross-portal. Decisión final: **el frontend canon DMX a partir de hoy ES el prototype JSX puro**. Dopamine conserva utilidad parcial backend (utility classes existing en portales internos pueden seguir usando OKLCH), pero el sistema de presentación canon (qué se construye nuevo y qué se migra) es prototype 100%.

Este ADR formaliza la decisión y supera ADR-031 (hybrid era intermedio) y deprecia el frontend layer de ADR-023 (manteniendo backend / utility classes).

## 2. Decisión

**Frontend canon DMX = `tmp/product_audit_input/DMX-prototype/` es la fuente de verdad pixel-perfect.** Concretamente:

### 2.1 Tokens

Adopción del set HEX prototype como tokens canon. `styles/tokens.css` se refactoriza añadiendo capa `--color-canon-*` paralela al backbone OKLCH (Dopamine OKLCH se preserva para utility classes internas). Los nuevos tokens canon son los listados en `07_FRONTEND_PROTOTYPE_CANONICAL.md` §12.

Decisiones explícitas de tokens (refrendadas):
- `--gradient-p` REPLACED a `linear-gradient(90deg, #6366F1, #EC4899)`.
- `--radius-pill: 999px` confirma como default obligatorio para Button, Input, Chip, Badge, Pill, Save, Tab.
- Cream text variants ADD (`--color-text-cream-{primary,secondary,muted}`) activadas via `data-surface="cream-on-dark"`.
- Outfit/DM Sans ratificadas con `--font-weight-extrabold: 800`.
- Fluid typography display added.
- Canon dark surface tokens added (`--color-canon-bg-{base,surface,input}`).

### 2.2 Componentes

17 componentes prototype × estrategia adoption:

| Decisión | Count | Componentes |
|---|---|---|
| adopt-as-is | 2 | icons.jsx → `shared/ui/icons/`, primitives.jsx → `shared/ui/motion/` (BlurText, FadeUp, StaggerContainer, AnimatedBar; CountUp alias `AnimNum`) |
| adapt-pattern | 7 | LiveTicker, IntelligenceEngine, Stats, Testimonials, Faq, MapOverlay, App.jsx |
| port-completo | 7 | Hero, Navbar, SearchBar, ColoniasBento, ColoniaComparator, PropertyListings, CtaFooter |
| skip-no-fit | 1 | CustomCursor (a11y + perf + mobile + cleaner principle) |

Detalle componente-por-componente vive en `07_FRONTEND_PROTOTYPE_CANONICAL.md` §C1-C17 y `08_PROTOTYPE_TO_MODULES_MAPPING.md`.

### 2.3 Server vs Client classification

Política normativa (extiende ADR-031 §Server vs Client):
- **Default Server Component** salvo señal explícita (state hooks, IntersectionObserver, framer-motion, canvas, browser APIs, scroll listener, matchMedia, rAF).
- **`"use client"` permitido** sólo en hojas (Client islands).
- **CSS-only animations preferred** (LiveTicker marquee, Testimonials marquee, MapOverlay ping, accordion height) — mantienen Server.

### 2.4 i18n

5 locales obligatorios: es-MX (canon copy), es-CO, es-AR, pt-BR, en-US. ~187 keys × 5 = ~935 entries totales. Distribución por componente en `07_FRONTEND_PROTOTYPE_CANONICAL.md` §14.

### 2.5 A11y posture

WCAG 2.1 AA validation obligatoria por componente, 89 ítems concretos enumerados en `07_FRONTEND_PROTOTYPE_CANONICAL.md` §11.

## 3. Consequences

### Positivas

- **Identidad visual única + clara**: zero ambigüedad sobre qué pesa más (canon JSX prototype 100%).
- **Zero hybrid disagreements**: cada componente nuevo se valida directo contra archivos `tmp/product_audit_input/DMX-prototype/` sin lookup ADR-023 vs ADR-031.
- **Anti-slop ya validado**: el prototype tiene checklist anti-slop incluido (`07_FRONTEND_PROTOTYPE_CANONICAL.md` §15) probado por founder.
- **Refresh tokens.css sustancial pero finite**: ~14 tokens nuevos + 31 hybrid = ~45 cambios mecánicos.
- **M3a + M3b unblocked**: la decisión ratifica el plan de port (icons, primitives, then components per RICE).
- **Brand identity moonshot-shape**: indigo→rose + pill universal + dark canon + Outfit/DM Sans alinea con memoria `feedback_arquitectura_escalable_desacoplada.md` (category-creator positioning).

### Negativas / tradeoffs

- **Effort migration NO desestimable**: ~88h CC pace 4x = ~22h wall-clock para portar M19 completo (Wave 1+2+3). + esfuerzo paralelo M3a tokens (4h).
- **Refresh tokens.css impacta utilities Dopamine existentes**: cualquier componente Dopamine que ya use `--gradient-p` directo cambia gradient brand. NO breaking funcional pero VISUAL drift en portales internos. Mitigación: documentar lista de componentes Dopamine que dependen de `--gradient-p` y validar visualmente.
- **Re-evaluar `02_DESIGN_MIGRATION.md`** porque su plan asumía hybrid. Acción: master CC actualiza.
- **Dopamine partial backend**: utility classes Dopamine (cards admin/asesor pro, density compact, sidebar tints) siguen vigentes pero ahora son "secundarias" — riesgo de drift si no se documenta jerarquía clara. Mitigación: ADR-048 dice explícitamente "canon = prototype, Dopamine = utility legacy en portales internos solamente, NO source-of-truth visual frontend".
- **CustomCursor descartado** (correcto, ya estaba en ADR-031 también).
- **Cream-3 contrast marginal AAA** (32% sobre dark, ~6:1) — para cumplimiento AAA estricto considerar incrementar a 0.42 opacity. Founder approval requerido si AAA es objetivo.
- **187 i18n keys nuevas**: cost translation + maintenance. Mitigación: extracción concurrente con M3b por feature, NO batch único.

### Neutras

- **Backend, RLS, tRPC, schemas, ADR-018 E2E**: NO cambian.
- **Roadmap M01-M20 funcional**: NO cambia, sólo el design layer.
- **Dependencies**: zero deps adicionales (verificado en ADR-031 — framer-motion 12.38.0, recharts 3.8.1, mapbox-gl 3.22.0, etc. ya presentes).

## 4. Migration plan (por fases)

Plan ratificado de ADR-031 con ajustes específicos canon-puro:

### M3a — Design System Refresh tokens (bloqueante)

**Effort estimate (CC pace 4x baseline)**: ~4h CC = ~1h wall-clock.

Acciones:
- Refactor `styles/tokens.css` agregar capa `--color-canon-*` (HEX paralela a OKLCH backbone).
- Replace `--gradient-p` valor a `linear-gradient(90deg, #6366F1, #EC4899)`.
- Add cream variants (`--color-text-cream-*`).
- Add fluid display tokens (`--text-fluid-*`).
- Add canon shadows (`--shadow-canon-card`, `--shadow-canon-elev`).
- Add canon durations (`--duration-blur-text`, `--duration-fade-up`, `--duration-bar-fill`, `--duration-marquee-*`, `--duration-ticker`).
- Add `--font-weight-extrabold: 800`.
- Add `--radius-canon-card: 22px`, `--radius-canon-2xl: 28px`.
- Validar visualmente `--gradient-p` swap en componentes Dopamine que ya lo usen (audit `grep --gradient-p`).

Output: tokens.css refreshed, validado visual diff Dopamine + canon.

### M3b — Feature Components port (depende de M3a)

**Effort estimate**: ~88h CC pace 4x = ~22h wall-clock.

Acciones (ver `08_PROTOTYPE_TO_MODULES_MAPPING.md` waves):
- Wave 1: icons + primitives + Navbar + Hero + SearchBar (~32h CC).
- Wave 2: LiveTicker + ColoniasBento + PropertyListings + IE + MapOverlay (~33h CC).
- Wave 3: ColoniaComparator + Stats + Testimonials + Faq + CtaFooter + App.jsx (~26h CC).
- Wave 4: distribuir adapt-pattern para M02/M11/M18/M17 conforme cada módulo se construya.

Output: M19 landing público shippable + componentes shared cross-portal disponibles.

### M3c — i18n keys (paralelo a M3b)

**Effort estimate**: ~10h CC pace 4x = ~2.5h wall-clock para extracción + draft es-MX. + traducciones es-CO/es-AR/pt-BR/en-US ~8h adicional.

Acciones:
- Por componente portado en M3b, extraer keys a `messages/es-MX.json`.
- Rama paralela: traducción es-CO, es-AR, pt-BR, en-US (puede ser MT-assisted con review humano).
- Validar 935 entries totales.

Output: 5 locales × 187 keys completos antes de Wave 4.

### Total agregado

- M3a: ~4h CC ≈ 1h wall-clock.
- M3b: ~88h CC ≈ 22h wall-clock = ~3 días CC.
- M3c: ~18h CC ≈ 4.5h wall-clock paralelo a M3b.
- **TOTAL frontend canon migration**: ~110h CC ≈ ~27.5h wall-clock ≈ **~3.5 días CC** (paralelizando M3b y M3c).

## 5. ADRs afectados

| ADR | Acción | Detalle |
|---|---|---|
| **ADR-023 Dopamine Design System Refinement** | **SUPERSEDED frontend / KEEP partial backend** | Frontend layer (Card3D, ParticleField, density toggle, shadow-wow, accent per portal) deja de ser canon. Utility classes Dopamine (sidebar tints, density compact en portales internos) siguen vigentes como "legacy utility" sin source-of-truth status. |
| **ADR-031 Design System Refresh hybrid-blend** | **SUPERSEDED totalmente** | Reemplazado por ADR-048 prototype puro. Las decisiones específicas de ADR-031 (4 founder approvals tokens, 17 componentes adopt/adapt/port, server/client policy, i18n posture, a11y posture) se **preservan literalmente** en ADR-048 — el cambio es de "hybrid-blend" a "prototype puro" en framing, NO en granularidad. |
| **BIBLIA DECISIÓN 1** | **AMENDED** | Frontend canon definition cambia de "Dopamine refined + hybrid prototype" a "prototype JSX puro". |
| **`docs/08_PRODUCT_AUDIT/02_DESIGN_MIGRATION.md`** | **RE-EVALUAR** | Plan asumía hybrid. Master CC actualiza references hybrid → puro y mantiene tabla componentes adopt/adapt/port (no cambia granular, solo framing). |
| **CLAUDE.md §reglas no negociables** | **NO cambia** | Las 10 reglas siguen vigentes. Frontend canon refuerza reglas 8 (i18n) + 9 (formatters multi-país) + 10 (a11y + reduced-motion). |

## 6. Referencias inputs

Paths exactos consumidos para producir esta decisión:

- `tmp/product_audit_input/DMX-prototype/README.md` (1310 líneas — spec exhaustiva)
- `tmp/product_audit_input/DMX-prototype/styles.css` (1823 líneas — fuente de verdad CSS)
- `tmp/product_audit_input/DMX-prototype/src/App.jsx` (composition root)
- `tmp/product_audit_input/DMX-prototype/src/icons.jsx` (19 íconos inline SVG)
- `tmp/product_audit_input/DMX-prototype/src/primitives.jsx` (5 motion primitives)
- `tmp/product_audit_input/DMX-prototype/src/Navbar.jsx`
- `tmp/product_audit_input/DMX-prototype/src/Hero.jsx`
- `tmp/product_audit_input/DMX-prototype/src/LiveTicker.jsx`
- `tmp/product_audit_input/DMX-prototype/src/SearchBar.jsx`
- `tmp/product_audit_input/DMX-prototype/src/ColoniasBento.jsx`
- `tmp/product_audit_input/DMX-prototype/src/ColoniaComparator.jsx`
- `tmp/product_audit_input/DMX-prototype/src/PropertyListings.jsx`
- `tmp/product_audit_input/DMX-prototype/src/IntelligenceEngine.jsx`
- `tmp/product_audit_input/DMX-prototype/src/Stats.jsx`
- `tmp/product_audit_input/DMX-prototype/src/Testimonials.jsx`
- `tmp/product_audit_input/DMX-prototype/src/Faq.jsx`
- `tmp/product_audit_input/DMX-prototype/src/CtaFooter.jsx`
- `tmp/product_audit_input/DMX-prototype/src/MapOverlay.jsx`
- `tmp/product_audit_input/DMX-prototype/src/CustomCursor.jsx`
- `docs/04_MODULOS/M01-M20.md` (specs funcionales)
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-023_DESIGN_SYSTEM_REFINEMENT.md`
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-031_DESIGN_SYSTEM_REFRESH.md`
- `styles/tokens.css` (DMX actual — para mapping migration)

---

# Fin Sección 3.
