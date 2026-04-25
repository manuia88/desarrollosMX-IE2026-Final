# ADR-031: Design System Refresh post-prototype audit

**Status:** Aprobado 2026-04-24 · Founder OK máxima opción
**Fecha:** 2026-04-24
**Sub-sesión origen:** FASE 07.6.C (sesión 3/6)
**Deciders:** Manu Acosta (founder) + PM
**Supersedes:** ninguno (extiende ADR-023)
**Amends:** ADR-023 (Dopamine Design System Refinement) — secciones específicas listadas en §Consecuencias.
**Referenced by:** FASE 07.6.C `02_DESIGN_MIGRATION.md`, FASE 11.T-Z (consumidores M3a/M3b), FASE 12-22 (consumidores M3b distribuidos).

## Contexto

FASE 07.6 Product Audit Comprehensive (ADR-032) insertó una fase PM-heavy entre 07.5 (canonical foundational) y 11.T-Z (feature blocks restantes) para resolver tres patrones de riesgo: features prototype sin asignación de fase, design system drift entre ADR-023 y el prototype actual, y L-NEW backlog disperso. La sub-sesión **07.6.A — Inventario Actual** confirmó superficie shipped del DS Dopamine (`shared/ui/dopamine/*`, `styles/tokens.css` con tokens OKLCH, ~30 primitives Card3D / ParticleField / IntelligenceCard). La sub-sesión **07.6.B — Crosswalk Matrix** mapeó 150 features prototype × DMX shipped y reveló gaps grandes en la capa pública (landing greenfield, Vinyl Tile, Comparator, Property Listings sin equivalente).

La sub-sesión actual **07.6.C — Design Migration Plan** ejecutó dos sub-agents en paralelo: SA-Tokens (82 tokens analizados, 6 categorías) y SA-Componentes (17 componentes JSX × 1709 LOC del prototype `tmp/product_audit_input/DMX-prototype/`). Ambos análisis coinciden en un patrón: el prototype valida visualmente cuatro elementos brand fuertes (gradient indigo→rose, pill 9999 universal, typography Outfit/DM Sans, cream text variants) que no existen en Dopamine actual y que requieren amendment formal a ADR-023, no adopción silenciosa.

El founder evaluó tres opciones (full-migrate prototype / reject / hybrid-blend) y aprobó **hybrid-blend máxima opción** el 2026-04-24, alineado con la memoria canonizada `feedback_arquitectura_escalable_desacoplada.md` ("default: opción más escalable/desacoplada/versionable aunque tome más trabajo, contexto moonshot"). Este ADR formaliza esa decisión, lista los amendments a ADR-023, declara M3a Design System Refresh como prerequisito bloqueante para M3b feature components y registra 5 candidatos L-NEW para canonization en 07.6.F.

## Decisión

Refresh del Design System Dopamine bajo estrategia **hybrid-blend**: backbone ADR-023 preservado (OKLCH, light/dark, density toggle, shadow-wow, Card3D restringido) más adopción selectiva de elementos prototype validados por founder. La entrega se organiza en dos milestones coordinados: **M3a Design System Refresh** (tokens.css refactor + primitives motion + componentes base) bloqueante a **M3b Feature Components** (17 componentes prototype × adopción/adaptación/port).

### Tokens — hybrid-blend approved

Análisis 82 tokens en 6 categorías (color, typography, radii, shadows, spacing, animations) produce cuatro buckets de decisión:

| Bucket | Count tokens |
|---|---|
| keep-dopamine | 28 |
| adopt-prototype | 14 |
| hybrid-blend | 31 |
| propose-new | 9 |
| **Total tokens analizados** | **82** |

Los cuatro founder approvals capturados literalmente:

1. **Gradient indigo→rose universal** — `--gradient-p` migra de `linear-gradient(135deg, oklch(0.67 0.19 285), oklch(0.72 0.17 230))` (indigo→teal-blue Dopamine) a `linear-gradient(90deg, #6366F1, #EC4899)` (indigo→rose 90deg). Effort 4h. Repercute en Button primary, GradientText, score values, bar-fill, ie-big number, stat .v, comp-big, vinyl-score-big, ie-cta, search-btn, vinyl-cta, logo-mark bg, hero-eyebrow .tag.
2. **Pill 9999 universal** — `--radius-pill: 9999px` se vuelve default para Input, Chip, Badge, Save button, Nav link, Tab, Search input/select; `rounded-xl` mantiene default sólo para Cards y secondary buttons. Effort 4h. ADR-023 §2.1 era más conservadora ("pill solo CTAs primary marketing"); este punto es amendment material explícito.
3. **Typography pair Outfit / DM Sans** — `--font-display: 'Outfit'` y `--font-body: 'DM Sans'` confirmados con fallbacks Dopamine. Adicional: nueva escala fluida (`--text-fluid-display: clamp(44px, 6vw, 80px)`, `--text-fluid-h2: clamp(32px, 4.2vw, 52px)`, `--text-fluid-cta: clamp(38px, 5.5vw, 68px)`) y `--font-weight-extrabold: 800` para display.
4. **Cream text variants** — adopción dark-only opt-in para hero/marketing surfaces. Tres tokens nuevos: `--color-text-cream-primary: #F0EBE0`, `--color-text-cream-secondary: rgba(240,235,224,0.62)`, `--color-text-cream-muted: rgba(240,235,224,0.32)`. Toggle vía `data-surface="cream-on-dark"` attribute; resto de dark mode mantiene OKLCH puro.

### Componentes — adopt/adapt/port plan

17 archivos JSX (1709 LOC) categorizados por adopción:

| Decisión | Count |
|---|---|
| adopt-as-is | 2 |
| adapt-pattern | 7 |
| port-completo | 7 |
| skip-no-fit | 1 |
| **Total** | **17** |

- **adopt-as-is (2):** `icons.jsx` → `shared/ui/icons/index.tsx`; `primitives.jsx` (BlurText, FadeUp, StaggerContainer, AnimatedBar) → `shared/ui/motion/*` (CountUp se mapea a `AnimNum` existing).
- **adapt-pattern (7):** LiveTicker, IntelligenceEngine, Stats, Testimonials, Faq, MapOverlay, App.jsx — preservan pattern visual del prototype pero reusan primitives existing y adaptan stack DMX (Server Component shells, next-intl, formatCurrency multi-país).
- **port-completo (7):** Hero, Navbar, SearchBar, ColoniasBento, ColoniaComparator, PropertyListings, CtaFooter — copy ABI exacto de spec con i18n + a11y + Server/Client classification per componente.
- **skip-no-fit (1):** CustomCursor — descartado por conflicto con principio Dopamine cleaner ADR-023, costo a11y/perf y mobile-first México.

El detalle component-por-componente (gap analysis, equivalente DMX existing, archivo destino, i18n keys, a11y items, dependencies, effort) vive en `docs/08_PRODUCT_AUDIT/02_DESIGN_MIGRATION.md` que ADR-031 consume.

### Server vs Client classification

Política normativa para los 17 componentes y descendientes M3b:

- **Default Server Component** salvo señal explícita que requiera Client.
- **`"use client"` se permite** sólo cuando el componente requiere uno de: Intersection Observer (entrada en viewport), framer-motion (transitions/variants), state hooks (`useState` / `useRef` / `useEffect`), browser-only APIs (canvas, mapbox-gl, scroll listeners, matchMedia, requestAnimationFrame).
- **No imponer `"use client"` arriba en el árbol**: Server shell hace fetch + composición; Client islands son hojas (e.g. `colonias-bento.tsx` Server + `vinyl-tile.tsx` Client; `property-listings.tsx` Server + `property-card.tsx` Client).
- **CSS-only animations preferred sobre JS-driven** (LiveTicker marquee, Testimonials marquee, MapOverlay ping) — mantienen el componente Server siempre que sea posible.

### i18n posture

- Cobertura obligatoria en los 5 locales DMX: **es-MX, es-CO, es-AR, pt-BR, en-US** (regla #8 CLAUDE.md, zero strings hardcoded).
- Total estimado: **187 keys nuevas × 5 locales = 935 entries totales** distribuidas: Hero 14 + Navbar 9 + LiveTicker 5 + SearchBar 18 + ColoniasBento 28 + ColoniaComparator 24 + PropertyListings 22 + IntelligenceEngine 16 + Stats 6 + Testimonials 14 + Faq 16 + CtaFooter 12 + MapOverlay 8.
- Multi-country formatters obligatorios (regla #9 CLAUDE.md): `formatCurrency` para precios MXN/COP/ARS/BRL/USD, `formatDate` para timestamps relativos ("hace 6h"), `formatPhone` para CTA contacto, `formatAddress` para colonia/ciudad/país.
- next-intl `useTranslations()` (Client) y `getTranslations()` (Server) por componente.
- Extracción concurrente con M3b por feature (no batch único al final).

### A11y posture

WCAG 2.1 AA validation **obligatoria por componente, no diferida**. Checklist normativo:

- Focus visible (outline indigo 2px o `--shadow-focus-ring`) en cada elemento interactivo.
- ARIA labels en buttons, links, SVG semantic, accordion triggers, tablists, carousels, marquees, meters.
- Keyboard nav: Tab order lógico, ESC close, arrow keys carousel/accordion/tablist, Home/End.
- Contrast ratio ≥ 4.5:1 (normal text) y ≥ 3:1 (large text). Cream-3 (32% opacity) sobre fondo oscuro requiere verificación caso-por-caso (≈ 6:1 marginal).
- `prefers-reduced-motion: reduce` honored: canvas/scroll-scrub omitido, marquee paused, animations sustituidas por static fallback (regla #10 CLAUDE.md).
- Screenreader compatibility: BlurText split en spans NO debe romper texto leído (`<span aria-hidden>` + `<span class="sr-only">{full}</span>`), AnimatedBar con `role="meter"` + `aria-valuenow/aria-valuemax`.
- Skip links a main content (cumplir WCAG 2.4.1).

A11y aggregate: 6 (Hero) + 7 (Navbar) + 4 (LiveTicker) + 7 (SearchBar) + 8 (ColoniasBento) + 9 (ColoniaComparator) + 9 (PropertyListings) + 6 (IntelligenceEngine) + 4 (Stats) + 5 (Testimonials) + 7 (Faq) + 5 (CtaFooter) + 4 (MapOverlay) + 2 (icons) + 6 (primitives) = **89 a11y items concretos** validables Vitest + axe-playwright + Playwright keyboard nav.

## Consecuencias

### Positivas

- **Brand identity shift visual coherente** con prototype validado por founder; el lenguaje indigo→rose + pill universal + cream variants posiciona DMX cerca del moonshot category-creator (memoria `feedback_arquitectura_escalable_desacoplada.md`).
- **Reduce divergencia** entre lo construido (Dopamine actual) y lo presentado (prototype JSX revisado por founder).
- **Establece M3a como prerequisito formal** a M3b feature components — evita rework por construir features sobre tokens viejos.
- **Centraliza primitives reutilizables cross-feature**: BlurText, FadeUp, StaggerContainer, useInView, AnimatedBar, AuroraBackground, Marquee viven en `shared/ui/motion/*` y son consumidos por 12+ componentes M3b.
- **Zero new deps required** (verificado contra `package.json`): framer-motion 12.38.0, recharts 3.8.1, mapbox-gl 3.22.0, react-hook-form 7.72.1, @hookform/resolvers 5.2.2, zod 4.3.6 ya presentes.
- **5 L-NEW candidates registrados** para canonization 07.6.F — no perder ideas categoría-nueva surgidas en audit (Photo Scene Library, Marquee Live-Data, Radar Comparator Engine, Vinyl Tile Layered Display, Disclosure Primitive).
- **A11y mejor por construcción**: WCAG 2.1 AA gate per ship + 89 items concretos auditables.
- **Pattern canonical reutilizable**: hybrid-blend ADR pattern aplicable a futuras refreshs (post-FASE 22 si entra rebrand parcial).

### Negativas / costos

- **M3a effort: 42h** total: tokens.css refactor 14h + primitives framer-motion port 16h + componentes base refresh 12h.
- **M3b effort: 144h** feature components puros (excluyendo skip CustomCursor + icons + primitives + App.jsx orchestration). Distribuidos: Hero 18h + Navbar 10h + LiveTicker 6h + SearchBar 14h + ColoniasBento 24h + ColoniaComparator 22h + PropertyListings 20h + IntelligenceEngine 10h + Stats 4h + Testimonials 6h + Faq 6h + CtaFooter 8h + MapOverlay 6h.
- **i18n extraction**: 935 entries × revisión nativo por locale ≈ **16h** (estimate; concurrente con M3b por feature).
- **WCAG 2.1 AA validation**: ~12h total cross-feature (axe-playwright + manual keyboard sweeps + screenreader smoke).
- **Tests adicionales** (Vitest unit motion + a11y + Playwright E2E smoke landing): ~30h FASE 08 dedicated, fuera del scope effort component.
- **Effort total Design Migration: ~214h** (M3a 42h + M3b 144h + i18n 16h + WCAG 12h).
- **Bloqueante**: M3a debe shipear (tag `m3a-design-refresh-complete`) antes que cualquier componente M3b empiece — evita rework por tokens cambiantes mid-construction.

#### Amendments a ADR-023 (count + summary)

| # | ADR-023 sección | Tipo amendment | Resumen del cambio | Fuente |
|---|---|---|---|---|
| A1 | §2.1 Border radius — pill `rounded-full` (9999px) | Extiende | Pill 9999 default universal para Input, Chip, Badge, Save, Nav link, Tab; ADR-023 limitaba pill a "CTAs primary marketing y conversion" únicamente | SA-Tokens §3 Radii + §"Conflictos relevantes" #4 |
| A2 | §2.2 Gradient strategy — máximo 1 gradient per view | Reemplaza valor canonical `--gradient-p` | `--gradient-p` migra de indigo→teal-blue 135deg a indigo→rose 90deg; regla "1 gradient per view" se mantiene | SA-Tokens §1.7 Gradients |
| A3 | §2.6 Typography — calma | Extiende escala | Añade `--text-fluid-display`, `--text-fluid-h2`, `--text-fluid-cta`, `--font-weight-extrabold: 800`, `--leading-display: 0.98`, `--tracking-display`, `--tracking-display-mega`, `--tracking-eyebrow: 0.22em` | SA-Tokens §2 Typography |
| A4 | §2.4 Shadows — simplificación | Extiende | Añade `--shadow-cta-rest`, `--shadow-cta-hover`, `--shadow-card-hover-indigo`, `--shadow-pin-rose`, `--shadow-pin-indigo`, `--shadow-logo-mark`, `--shadow-focus-ring`. Mantiene shadow-wow celebrations | SA-Tokens §4 Shadows |
| A5 | §3 Tokens nuevos en `styles/tokens.css` | Extiende lista | Añade 9 propose-new tokens: cream-primary/secondary/muted, indigo-3, rose, gradient-surface-card, gradient-aurora-indigo/rose, gradient-fade-bg, density spacing-section/card-y/component-gap (resuelve TODO ADR-023) | SA-Tokens §"Notas / sorpresas" |
| A6 | §4 Componentes nuevos en `shared/ui/dopamine/` | Extiende lista | Añade primitives `shared/ui/motion/*`: BlurText, FadeUp, StaggerContainer, AnimatedBar, useInView; `shared/ui/icons/index.tsx`; AuroraBackground, Marquee | SA-Componentes §16 primitives + §15 icons |
| A7 | §2.7 Cards — less chrome | Extiende variant | Añade `Card variant="surface-card"` con `--gradient-surface-card` + double-layer mask border (pattern `prop-premium::before` del prototype) | SA-Tokens §1.1 + §1.7 |

> Referencia precisa de sección `§X.Y` corresponde a la numeración de ADR-023 §1 Context, §2 Decision (subsecciones 2.1-2.8), §3 Tokens nuevos en tokens.css, §4 Componentes nuevos en `shared/ui/dopamine/`, §5 Refactor de primitives existentes. Siete amendments totales sobre cinco subsecciones distintas. Si la numeración exacta cambia tras review, marcar como "amends ADR-023 (sección a definir en ADR-031 final)" — nunca inventar números.

### Riesgos mitigados

- **Riesgo "construir sobre tokens viejos"**: M3a shipea primero como prerequisito bloqueante; tag `m3a-design-refresh-complete` controla unblock M3b.
- **Riesgo "componentes inconsistentes"**: primitives centralizadas en `shared/ui/motion/` y `shared/ui/dopamine/`; pattern enforcement vía code review M3b.
- **Riesgo "i18n hardcoded"**: next-intl + getTranslations en todos los componentes nuevos; gating per ship verifica zero strings hardcoded (regla #8).
- **Riesgo "menos diferenciador visual"** (heredado ADR-023 §Negativas): mitigado por adoption rose/cream/aurora/marquee — el péndulo no va hacia minimal puro, va hacia hybrid-blend que añade signature visual (gradient indigo→rose) sin sacrificar legibility.
- **Riesgo brand drift silencioso**: este ADR formaliza explícitamente los amendments §A1-A7 a ADR-023 — no hay decisiones implícitas.

### Neutrales

- **Stack intacto**: Tailwind v4 CSS-first, tokens en `styles/tokens.css` `@theme`, OKLCH color space (regla CLAUDE.md respetada).
- **Interfaz pública de primitives no cambia** para componentes ya construidos — variants nuevos son aditivos.
- **Compatible con dark mode**: cream variants son opt-in via `data-surface="cream-on-dark"`, resto de dark mantiene OKLCH puro.
- **Compatible con density toggle** ADR-023 §2.3 (compact|comfortable) — prototype provee valores exactos para set `comfortable` (resuelve TODO ADR-023).

## Alternativas consideradas

| Opción | Resumen | Decisión | Razón |
|---|---|---|---|
| A | **Full-migrate prototype tokens** — reemplazar Dopamine completo (HEX prototype, dark-only, sin OKLCH, descartar shadow-wow + density toggle + Card3D) | RECHAZADO | Rompe consistency cross-portal (Asesor/Admin necesitan light mode), invalida ADR-023 íntegro, descarta validaciones existentes (`feedback_card3d_no_tilt.md`), pierde shadow-wow celebrations tier — sobrecosto rework dashboards densos. |
| B | **Reject — keep-Dopamine intacto** sin amendment | RECHAZADO | Pierde elementos visuales prototype validados por founder (gradient indigo→rose, pill universal, cream variants, Outfit/DM Sans), frena moonshot category-creator positioning, mantiene drift entre lo construido y lo presentado. |
| C | **Hybrid-blend** — backbone Dopamine preservado + indigo→rose + pill 9999 universal + Outfit/DM Sans + cream variants + 9 propose-new tokens + 5 motion primitives + 17 component plan | **APROBADO** | Founder OK máxima opción 2026-04-24. Alineado con `feedback_arquitectura_escalable_desacoplada.md` ("opción más escalable/desacoplada/versionable aunque tome más trabajo"). Preserva inversión ADR-023 + activa elementos brand prototype + zero cascade breakage. |

## Plan de ejecución

### Fase target

- **M3a Design System Refresh** — pre-FASE 11.T (bloqueante absoluto) — **42h**
- **M3b Feature components** — distribuidos FASE 11.T-Z (landing/atlas/listings/comparator) + FASE 12-14 (portal-comprador hooks) + FASE 20-22 (portal público / portal comprador surfaces) según destino — **144h**
- i18n extraction concurrente con M3b por feature — **16h**
- WCAG 2.1 AA validation gate per feature ship — **12h**
- **Total Design Migration: 214h**

### Entregables M3a (no diferibles)

1. **`styles/tokens.css` refactor** con 82 decisiones aplicadas: 28 keep, 14 adopt-prototype, 31 hybrid-blend, 9 propose-new (14h).
2. **`shared/ui/motion/` primitives**: `use-in-view.ts` (hook), `blur-text.tsx`, `fade-up.tsx`, `stagger-container.tsx`, `animated-bar.tsx` framer-motion port + `useReducedMotion()` honored. `AuroraBackground` y `Marquee` también incluidos en primitives (16h).
3. **`shared/ui/dopamine/` base components refreshed**: `Button` (variants pill-glass, pill-ghost, pill-solid + glow shadows), `Card` (variant `surface-card` con `--gradient-surface-card` + double-layer mask border), `Input` (variant pill + search-row composition), `Pill/Chip` (componente unificado nuevo con variants indigo|green|amber|rose|glass|muted, default radius pill), `Select` (variant pill alineado Input), `Badge` (props tone + variant solid/soft/outline) (12h).
4. **`shared/ui/icons/index.tsx`** — 25 SVG icons inline tipados (Lucide-style named exports), `aria-hidden` default (cubierto por componentes M3a o M3b shared, no cuenta double).
5. **WCAG 2.1 AA baseline per primitive** — focus ring token + reduced-motion fallback + ARIA semantic verificado.

### Entregables M3b (per feature, gated)

Cada componente entrega checklist ship-ready:
- TSX componente + Server/Client classification correcta.
- i18n keys integradas en `messages/<locale>.json` × 5 locales con multi-country formatters.
- WCAG 2.1 AA checklist completed (focus, ARIA, keyboard, contrast, reduced-motion).
- Vitest unit (motion + a11y axe) + Playwright E2E smoke.
- Code review pass (Server/Client correcta, zero `any`, zero hardcoded strings, `import type` Biome).

### Gating

- **M3a shipped** (tag `m3a-design-refresh-complete`) → unblock M3b por feature.
- **M3b per-feature shipped** (tag `m3b-<feature>-complete`) → unblock siguiente feature dependent (e.g. ColoniasBento → ColoniaComparator depende de pattern radar establecido; PropertyListings → PropertyDetail downstream FASE 11.X).
- Cada componente M3b entrega checklist a11y + i18n keys + tests.
- Sub-agent over-revert risk (memoria `feedback_subagents_over_revert.md`) mitigado: PM audit exhaustivo post-CC antes de cada push (memoria `feedback_pm_audit_exhaustivo_post_cc.md`).

## i18n extraction plan

### Breakdown 187 keys × 5 locales = 935 entries

| Componente | Keys | Notas |
|---|---|---|
| Hero | 14 | eyebrow, h1 split, sub, 2 CTAs, 5 score pills, location, partners label |
| Navbar | 9 | brand, 4 links, 2 CTAs, mobile menu aria, signin aria |
| LiveTicker | 5 | label, currency_unit, 3 percent_aria (up/down/flat) |
| SearchBar | 18 | 4 tabs, input ph, 2 selects + options, btn, 8 chips |
| ColoniasBento | 28 | eyebrow, h2, sub, 4 layer labels + 4 layer descs, ~12 fact keys, lifeline label, footer labels, CTA aria |
| ColoniaComparator | 24 | eyebrow, h2, sub, 3 howto + descs, slot labels, 6 axis_label + 6 AXIS_HELP |
| PropertyListings | 22 | eyebrow, h2, sub, 7 photo tags, meta labels, plusvalia, 3 scores, asesor role, CTA, save/nav arias |
| IntelligenceEngine | 16 | eyebrow, h2, sub, 3 features × 2 (title+desc), panel meta, score block, CTA |
| Stats | 6 | 4 stat labels + footer + pill template |
| Testimonials | 14 | eyebrow, h2, 6 testimonios × {q, a, r} compactos |
| Faq | 16 | tag, h2, sub, btn, 7 Q+A items + arias |
| CtaFooter | 12 | cta block + footer block (logo, 4 links, copyright) |
| MapOverlay | 8 | preview, 6 score acronyms, link |
| **Total** | **187** | × 5 locales = **935 entries** |

### Locale-aware patterns

- **Currency**: `formatCurrency` enrutado por `country_code` retorna `MXN $58,000`, `COP $4,800,000`, `ARS $25,000`, `BRL R$ 12,000`, `USD $3,400`. Multi-country regla #9.
- **Date**: `formatDate(date, locale)` con date-fns + date-fns-tz (presentes 4.1.0 / 3.2.0).
- **Phone**: `formatPhone(phone, country_code)` E.164 → display nacional.
- **Address**: `formatAddress({ colonia, ciudad, country })` por convención local (es-MX "Del Valle, Benito Juárez, CDMX" / es-CO "Chapinero, Bogotá" / pt-BR "Vila Madalena, São Paulo").

### Gating per ship

- Zero strings hardcoded user-facing (regla #8). Sweep automatizado pre-merge.
- Revisión nativo por locale (es-MX nativo founder; es-CO/AR/pt-BR/en-US async via vendor TBD FASE 08).
- Effort estimate: **16h** total revisión + integración.

## WCAG 2.1 AA checklist (referenced en §Consecuencias)

Items concretos por categoría componente:

### Hero / Marketing surfaces
- `prefers-reduced-motion` → omitir canvas + scroll-scrub, mostrar `hero-fallback` estático.
- BlurText preserva texto leído por screenreader (`aria-hidden` spans + `sr-only` full).
- Contrast cream `#F0EBE0` sobre `#06080F` ≈ 18.4:1 OK.
- Cream-3 (32% opacity) verificar 6:1 marginal (re-validar caso "actualizado hace 6h").
- Skip-to-content link visually hidden, focus visible.
- Focus visible CTAs primary/glass — outline indigo 2px o `--shadow-focus-ring`.
- CTA accessible name explícito ("Explorar mapa CDMX") no solo "Explorar mapa" si icon `aria-hidden`.

### Nav / Header
- `<nav aria-label="Principal">` semantic.
- Hamburger button `aria-expanded` + `aria-controls`.
- Mobile sheet: focus trap + ESC close + restore focus.
- Active link `aria-current="page"`.
- Skip-to-content link visually hidden.
- Keyboard nav Tab order lógico + outline visible.

### Forms (SearchBar, Faq form CTAs)
- `<form>` semantic con submit handler.
- Tabs `role="tablist"` + `role="tab"` + `aria-selected`.
- Input `<label>` asociado (no solo placeholder).
- Selects con `aria-label` + chevron icon `aria-hidden`.
- Chips `aria-pressed` + `role="group" aria-label="Filtros activos"`.
- Submit button con icono → texto explícito.

### Lists (PropertyListings, ColoniasBento)
- `<article>` per card, heading `<h3>` colonia/property name.
- Carousel `role="region" aria-roledescription="carousel" aria-label="..."`.
- Slides anuncian idx ("Foto 2 de 3: Interior").
- Arrows `aria-label` + keyboard arrows ←/→.
- Heart button `aria-pressed` saved/unsaved.
- Dots `role="tablist"` + `role="tab"` `aria-selected`.
- Plusvalía positiva: texto + icono (no solo color verde).

### Maps / Comparator (ColoniaComparator, MapOverlay)
- SVG `<title>` + `<desc>` describiendo radar values.
- Axis pills `role="button"` + `aria-pressed` + keyboard activable.
- Picker buttons `role="radio"` dentro `role="radiogroup"`.
- Help box on highlight `aria-live="polite"` región.
- Color-blind friendly: stroke + texto chip A/B (no solo color).
- Mobile <960: stack vertical + picker fullwidth.
- Reduced-motion: omitir radar polygon transitions + ticker.

### Modal / Disclosure (Faq)
- Accordion WCAG: `<button aria-expanded aria-controls>` + `<div role="region" aria-labelledby>`.
- Keyboard: ESC close + Up/Down nav between triggers + Home/End first/last.
- Single-open vs multi-open: prototype single-open — anuncia con `aria-live="polite"`.
- Chevron `aria-hidden="true"` (decorativo).
- Sticky col izq no oculta trigger en mobile (responsive `position: static <960px`).

### Bars / Meters (IntelligenceEngine)
- Bars `role="meter"` + `aria-valuenow/aria-valuemax` + accessible name (label).
- Reduced-motion → bars render directos sin width transition.
- Score-big como `<output>` o spans con `aria-label` "Score 87 sobre 100".

## L-NEW propuestos por 07.6.C (registro para 07.6.F)

> No editamos `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md` aquí — esa edición la hace 07.6.F canonization. Listamos candidates para registro.

| ID | Nombre | Descripción 1-line | Dependencia |
|---|---|---|---|
| **L-NEW72** | Property Photo Scene Library | Set reutilizable de SVG illustrations (building/interior/view/garden + 6+ variantes) parametrizables por color y mood, alternativa a stock photos — zero CDN cost, brand-coherent, a11y-perfect. | M3b PropertyListings (#7) |
| **L-NEW73** | Marquee Live-Data Component | Pattern reusable para tickers data-driven (LiveTicker + futuros: tasa BANXICO live, AVM movers, INPC delta) con props `{items, speed, direction, pauseOnHover, reducedMotion}`. | M3a primitives + DMX-LIV ticker |
| **L-NEW74** | Radar Comparator Engine | Extender `ColoniaComparator` a comparator universal: 2 colonias, 2 desarrollos, 2 properties. SVG manual con axes parametrizables. | M3b ColoniaComparator (#6) + L-NEW36 multi-comparable |
| **L-NEW75** | Vinyl Tile Layered Display | Pattern dataviz "switch entre N capas en single tile" (`ColoniasBento`) reutilizable: Atlas tile multi-capa LIV/MOV/SEC/ECO, Indices nacional tile estado-level. | M3b ColoniasBento (#5) |
| **L-NEW76** | Disclosure Primitive | Extracción del accordion pattern a `shared/ui/primitives/disclosure.tsx` reutilizable en Settings, Help docs, Onboarding. WCAG-compliant single/multi-open. | M3b Faq (#11) |

Total **L-NEW detectados: 5 nuevos** (L-NEW72-L-NEW76), todos con destino concreto M3b feature components actuales (memoria `feedback_upgrades_destino.md` — prohibido "documentar sin ubicar").

## Memoria canonizada referenciada

- **`feedback_arquitectura_escalable_desacoplada.md`** — "default: opción más escalable/desacoplada/versionable aunque tome más trabajo, contexto moonshot". Soporta decisión hybrid-blend máxima opción.
- **`feedback_zero_deuda_tecnica.md`** — M3a entrega obligatoria, no diferible. Soporta gating bloqueante M3a → M3b.
- **`feedback_upgrades_destino.md`** — cada upgrade con destino concreto. Soporta L-NEW72-76 con dependencia M3a/M3b explícita.
- **`feedback_pm_audit_exhaustivo_post_cc.md`** — PM audit exhaustivo post-CC antes de push. Soporta gating per-component M3b.
- **`feedback_subagents_over_revert.md`** — validar git diff tras Task tool. Soporta protocolo M3a/M3b per-bloque.
- **`feedback_card3d_no_tilt.md`** — Card3D sin tilt confirma Dopamine cleaner. Soporta skip CustomCursor (#14).

## Referencias

- `docs/08_PRODUCT_AUDIT/00_INVENTARIO_ACTUAL.md` — input 07.6.A inventario shipped.
- `docs/08_PRODUCT_AUDIT/01_CROSSWALK_MATRIX.md` — input 07.6.B 150 features × DMX shipped.
- `docs/08_PRODUCT_AUDIT/02_DESIGN_MIGRATION.md` — plan detallado paralelo a este ADR (component-by-component matrix).
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-023_DESIGN_SYSTEM_REFINEMENT.md` — Dopamine DS background, ADR amended por este.
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-021_PROGRESSIVE_PREFERENCE_DISCOVERY.md` — consumidor downstream M3a primitives.
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-022_VIBE_TAGS_HYBRID.md` — consumidor downstream M3a primitives.
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-030_CANONICAL_ZONES_POLYMORPHIC.md` — precedente ADR pattern (auditoría masiva pre-ejecución).
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-032_FASE_07.6_PRODUCT_AUDIT_INSERTION.md` — fase 07.6 insertion context.
- `docs/02_PLAN_MAESTRO/FASE_04_DESIGN_SYSTEM.md` — host del módulo 4.P (M3a refresh extension natural).
- `docs/02_PLAN_MAESTRO/FASE_07.6_PRODUCT_AUDIT.md` — plan maestro 07.6 detallado.
- `docs/05_OPERACIONAL/CONTRATO_EJECUCION.md` — pendiente actualizar sección FASE 07.6.
- `tmp/product_audit_input/DMX-prototype/` — prototype assets analyzed (17 JSX × 1709 LOC).

---

**Autor:** PM + founder | **Fecha:** 2026-04-24 | **Revisión founder:** pendiente sub-sesión 07.6.F gate.
