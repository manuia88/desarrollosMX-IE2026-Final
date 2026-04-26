# 07 — Frontend Prototype Canonical (DMX 2026-04-25)

> **Doc fuente de verdad** del sistema de presentación frontend DMX desde 2026-04-25.
> Reemplaza Dopamine en el layer frontend (ADR-023 SUPERSEDED frontend, mantiene parcial backend) y el hybrid blend (ADR-031 SUPERSEDED).
> Formalizado en `docs/01_DECISIONES_ARQUITECTONICAS/ADR-048_FRONTEND_PROTOTYPE_CANONICAL_REPLACEMENT.md`.
> Mapping prototype↔M01-M20↔backend en `docs/08_PRODUCT_AUDIT/08_PROTOTYPE_TO_MODULES_MAPPING.md`.
>
> **Inputs evidence-based** (paths exactos consumidos):
> - `tmp/product_audit_input/DMX-prototype/README.md` (1310 líneas — spec)
> - `tmp/product_audit_input/DMX-prototype/styles.css` (1823 líneas — fuente de verdad CSS)
> - `tmp/product_audit_input/DMX-prototype/src/*.jsx` (17 componentes)
>
> Generado en sub-bloque FASE 07.7.A.1.

---

# SECCIÓN 1 — Draft `07_FRONTEND_PROTOTYPE_CANONICAL.md`

> **Frontend canon DMX desde 2026-04-25 — reemplaza Dopamine (ADR-023 deprecated frontend, mantiene parcial backend) y hybrid blend (ADR-031 superseded). Formalizado en ADR-048.**

---

## 1. Visión y principios

### 1.1 Qué es

Frontend canon DMX es un **diseño espacial-data dark** centrado en transmitir certeza analítica con identidad brand indigo→rose, tipografía display Outfit/DM Sans, radii pill universales y motion contenido. La fuente de verdad pixel-perfect vive en `tmp/product_audit_input/DMX-prototype/` (README.md + styles.css + 17 componentes JSX). Cada componente DMX existente o futuro se construye o se migra contra esta spec.

### 1.2 No negociables

Reglas inviolables (extraídas literal de prototype/README.md §3.1 líneas 108-115):

1. **Todo botón con `border-radius: 9999px`** (sin excepciones).
2. **Gradientes solo `#6366F1 → #EC4899`** (no se generan otros gradientes brand).
3. **Cero emoji** en toda la UI.
4. **Transforms solo en eje Y** (translateY, scaleY) — nada lateral ni tilt en mobile.
5. **Duración máxima** de animaciones: 850ms.
6. **`once: true`** en todas las animaciones triggered por viewport.

A las anteriores se suman las reglas DMX existentes que NO se relajan:

7. **`prefers-reduced-motion: reduce`** honored por construcción (regla 10 CLAUDE.md). Todas las animaciones se sustituyen por estado final estático (verificado en prototype/styles.css líneas 882-884).
8. **i18n everywhere** (regla 8 CLAUDE.md): zero strings hardcoded — todos los copy de Hero/CTA/Section pasan por next-intl `useTranslations()` / `getTranslations()`.
9. **Multi-country formatters** (regla 9 CLAUDE.md): `formatCurrency`, `formatDate` enrutados por `country_code` — el "$58k" del prototype se renderiza vía `formatCurrency(58000, locale, currency)`.
10. **A11y AA**: focus visible, contraste ≥ 4.5:1, semantic HTML, keyboard nav, ARIA labels (regla 10 CLAUDE.md).

### 1.3 Stack DMX target (vs stack del prototype)

| Capa | Prototype | DMX canon |
|---|---|---|
| Framework | React 18 UMD CDN + Babel Standalone in-browser | Next.js 16 App Router + React 19 + Turbopack |
| Lenguaje | JSX vanilla | TypeScript 5 strict |
| Estilos | CSS plano `styles.css` con `:root` vars | Tailwind v4 CSS-first + `styles/tokens.css` con `@theme` |
| Motion | rAF + IntersectionObserver fallbacks (`primitives.jsx`) | framer-motion 12 + Motion primitives RSC-friendly |
| Server/Client | 100% client (Babel) | Server Component default + `"use client"` islands en componentes con state/IO/canvas |
| i18n | Hardcoded es-MX | next-intl 5 locales (es-MX, es-CO, es-AR, pt-BR, en-US) |
| Iconos | SVG inline en `icons.jsx` | `shared/ui/icons/` (SVG inline TS) |
| Type system | Ninguno | Zod 4 SSOT + types BD auto-generados |

Esta tabla cierra la pregunta "qué cambia al portar a DMX" y establece el patrón de adaptación Server/Client por componente (ver sección 13 migration plan).

---

## 2. Design tokens completos

### 2.1 Color tokens (extraídos de `styles.css` líneas 2-18)

| Token prototype | Valor literal | Uso prototype | Acción tokens.css DMX |
|---|---|---|---|
| `--bg` | `#06080F` | fondo principal (body) | nuevo `--color-bg-canon-base` |
| `--bg-2` | `#0D1017` | surface cards y secciones (nav, ie-wrap, ticker, cta) | nuevo `--color-bg-canon-surface` |
| `--bg-3` | `#111827` | inputs, panels (search-input, search-select) | nuevo `--color-bg-canon-input` |
| `--cream` | `#F0EBE0` | texto primario sobre dark | mapea a `--color-text-cream-primary` (ya existe en ADR-031 §Decisión cream variants) |
| `--cream-2` | `rgba(240,235,224,0.62)` | texto secundario | `--color-text-cream-secondary` (ya en ADR-031) |
| `--cream-3` | `rgba(240,235,224,0.32)` | texto muted / labels | `--color-text-cream-muted` (ya en ADR-031). NOTA a11y: 32% opacity sobre fondo `#06080F` requiere validar contrast caso por caso (~6:1 marginal, AAA fallaría). |
| `--indigo` | `#6366F1` | primary action, gradient endpoint izquierdo, ping-dot, cursor-dot | `--color-indigo-canon-500` |
| `--indigo-2` | `#818CF8` | hover state primary | `--color-indigo-canon-400` |
| `--indigo-3` | `#a5b4fc` | score pills text, eyebrow, indigo-3 text accents | `--color-indigo-canon-300` |
| `--rose` | `#EC4899` | gradient endpoint derecho, vinyl-pin, prop-save active hover | `--color-rose-canon-500` |
| `--green` | `#22C55E` | momentum positivo, live-dot, bar-fill green | `--color-success-canon` |
| `--amber` | `#F59E0B` | warning (Polanco color, bar-fill amber start) | `--color-warning-canon` |
| `--red` | `#EF4444` | high risk (bar-fill amber end, ticker dn) | `--color-danger-canon` |
| `--border` | `rgba(255,255,255,0.08)` | borders default | `--color-border-canon-subtle` |
| `--border-2` | `rgba(255,255,255,0.14)` | borders más visibles (hero-eyebrow, glass) | `--color-border-canon-strong` |
| `--grad` | `linear-gradient(90deg, #6366F1, #EC4899)` | el ÚNICO gradient permitido | `--gradient-p` (REPLACE valor actual `linear-gradient(135deg, oklch(0.67 0.19 285), oklch(0.72 0.17 230))`) |

Colores derivados que aparecen inline en `styles.css` y deben tokenizarse:

- `#86efac` (líneas 103, 498, 576, 1006, 1394, 1630, 1683, 1743, 2030, etc.) — texto verde sobre fondo verde `rgba(34,197,94,0.12)` (momentum up). Token nuevo `--color-success-canon-text`.
- `#fca5a5` (líneas 274, 1179, 1631, 1744) — texto rojo sobre fondo rojo `rgba(239,68,68,0.12)` (momentum down). Token `--color-danger-canon-text`.
- `#a5b4fc` (mismo que `--indigo-3`) — usado como texto sobre `rgba(129,140,248,0.12)` para momentum flat.
- `#fcd34d` (línea 108) — texto amber sobre `rgba(245,158,11,0.10)` (pill-amber). Token `--color-warning-canon-text`.
- `#f472b6` — usado en prop-save active hover (línea 1609) y dossier accent. Es el rose claro `--color-rose-canon-400` (no usado actualmente pero declarado).

### 2.2 Typography tokens (extraídos de `styles.css` líneas 20, 27 y prototype/README.md §4 líneas 118-134)

| Uso | Font | Weight | Size | Line-height | Letter-spacing | Origen |
|---|---|---|---|---|---|---|
| H1 Hero | Outfit | 800 | `clamp(44px, 6vw, 80px)` | 0.95 | -0.03em | styles.css L273-282 |
| H2 Section | Outfit | 800 | `clamp(32px, 4.2vw, 52px)` | 1.02 | -0.03em | styles.css L152-159 (`.h2`) |
| Score big colonias (Vinyl) | Outfit | 800 | 68px | 0.9 | -0.045em | styles.css L1380-1385 |
| Score big IE panel | Outfit | 800 | 56px | 1 | -0.04em | styles.css L562-566 |
| Score big comparator (Comp old) | Outfit | 800 | 58px | 1 | -0.04em | styles.css L1219-1225 |
| Property price (pcard) | Outfit | 800 | 24px | 1 | -0.03em | styles.css L1670-1674 |
| Property price (premium variant) | Outfit | 800 | 22px | 1 | -0.03em | styles.css L976-983 |
| CTA H2 footer | Outfit italic | 800 | `clamp(38px, 5.5vw, 68px)` | 1.02 | -0.035em | styles.css L739-746 |
| Card title (Vinyl name) | Outfit | 800 | 22px | 1.15 | -0.025em | styles.css L1378 |
| Card title generic | Outfit | 700 | 17px | 1.2 | -0.02em | styles.css L427, 484 |
| Section eyebrow | DM Sans | 600 | 11px | 1.4 | 0.22em uppercase | styles.css L143-151 |
| Hero pill tag | Outfit | 700 | 10.5px | 1 | 0.05em uppercase | styles.css L262-272 |
| Nav link | DM Sans | 500 | 13.5px | 1.4 | 0 | styles.css L216-220 |
| Body / paragraph | DM Sans | 400 | 16px | 1.7 | 0 | styles.css L160-166 (`.sub`) |
| Body small | DM Sans | 400 | 13.5px | 1.6 | 0 | feature-desc styles.css L542 |
| Label uppercase | DM Sans | 600 | 10.5px | 1 | 0.14em | styles.css L167-173 |
| Score chip K | Outfit | 700 | 9.5px | 1 | 0.14em uppercase | styles.css L1693-1696 |
| Mono data (lifeline ends, ui-mono) | ui-monospace | 400 | 10px | 1.3 | 0 | styles.css L1319 |
| FAQ accordion trigger | Outfit | 600 | 15px | normal | 0 | styles.css L704-711 |
| Stat big | Outfit | 800 | `clamp(36px, 4.5vw, 56px)` | 1 | -0.03em | styles.css L630-636 |

Text-wrap policy (styles.css L281, L1649, L1785, L745):

- `text-wrap: balance` en H1, H2, card titles, CTA H2.
- `text-wrap: pretty` no se usa en prototype (no hay párrafos largos). Para DMX adoptar `pretty` en `.sub` y body paragraphs >2 líneas.

### 2.3 Radii tokens (prototype/README.md §3 líneas 96-100)

| Token | Valor | Uso | Mapping DMX |
|---|---|---|---|
| `--r-pill` | 9999px | TODO botón, chip, pill, score-pill, search-input, layer pill, picker bp, axis-pill, save button, dot indicator, ie-cta, ticker-label, vinyl-cta, vinyl-mom, footer logo-mark inner | `--radius-pill: 999px` (ya existe). REGLA: pasa a default obligatorio en CSS (Button, Input, Chip, Badge, Pill, Save). |
| `--r-card` | 22px | vinyl-tile, prop-premium, spec-card, battle-grid 28px (variant) | nuevo `--radius-card-canon: 22px` |
| `--r-inner` | 14px | bh-step, dossier inner, vinyl-legend item, glass overlay | nuevo `--radius-inner-canon: 14px` |
| `--r-chip` | 10px | vinyl-fact, score-mini, dossier-item, map-score | nuevo `--radius-chip-canon: 10px` |

Variantes intermedias observadas en styles.css:
- `12px` (mini cards: pcard-meta, battle-stat, score-mini, vl-chip) — token `--radius-md-canon: 12px`
- `16px` (search-card 20px → ajustado, glass overlay 16px, prop-card 20px, vinyl-legend 16px) — token `--radius-lg-canon: 16px`
- `18px` (card default L73) — usar `--radius-md-canon` o nuevo
- `20px` (search-card, pcard) — token `--radius-xl-canon: 20px`
- `28px` (battle-grid container) — token `--radius-2xl-canon: 28px`

### 2.4 Shadow tokens (prototype/README.md §3 líneas 102-104 + styles.css scattered)

| Token | Valor | Uso |
|---|---|---|
| `--sh-card` | `0 24px 60px rgba(99,102,241,0.12)` | hover de vinyl-tile (L1293) |
| `--sh-elev` | `0 24px 80px rgba(0,0,0,0.45)` | search-card (L329) |
| (inline) | `0 8px 24px rgba(99,102,241,0.25)` | btn-primary default (L46) |
| (inline) | `0 12px 32px rgba(236,72,153,0.35)` | btn-primary hover (L48) |
| (inline) | `0 4px 14px rgba(99,102,241,0.35)` | logo-mark (L206) |
| (inline) | `0 0 14px rgba(99,102,241,0.8)` | cursor-dot (L792) |
| (inline) | `0 0 12px rgba(99,102,241,0.7)` | ping-dot (L838) |
| (inline) | `0 0 40px ${color}60` | battle-avatar dynamic (componente) |
| (inline) | `0 20px 50px rgba(99,102,241,0.12)` | pcard hover (L1563) |
| (inline) | `inset 0 2px 8px rgba(255,255,255,0.15)` | eq-fill (L1770) |

Mapping DMX: shadow-canon-card / shadow-canon-elev / shadow-canon-glow-indigo / shadow-canon-glow-rose. NO se mapea a OKLCH para preservar parity exacta del prototype.

### 2.5 Spacing tokens

El prototype usa spacing literal sin tokens nombrados — todos los paddings/margins son números. Los más recurrentes:

- Section padding: `80px 32px` (`.section` L138) → token `--space-section-y: 80px`, `--space-section-x: 32px`
- Section header margin-bottom: `48px` (L141)
- Container max-width: `1200px` (L137); inner max-width: `1280px` (nav L201)
- Card internal padding bands: `22px` (vinyl-top), `16px 22px` (vinyl-facts), `18px 20px` (pcard-body), `24px` (ie-panel)
- Grid gaps: `24px` (vinyl-grid, pcard-grid), `20px` (bento-grid), `4-8-10-14-18-32` (varios)

Para DMX: NO crear 30 tokens. Usar Tailwind v4 spacing scale defaults + 3 tokens custom adicionales (`--space-section-y/x`, `--space-card-pad`).

### 2.6 Animation tokens (extraídos de `styles.css` keyframes y `primitives.jsx`)

| Animation | Duration | Easing | Origen |
|---|---|---|---|
| BlurText word-stagger | 0.7s/word | `cubic-bezier(.22,1,.36,1)` | primitives.jsx L46-47 |
| FadeUp | 0.65s | `cubic-bezier(.22,1,.36,1)` | primitives.jsx L75-76 |
| StaggerContainer child | 0.6s | `cubic-bezier(.22,1,.36,1)` | primitives.jsx L96 |
| AnimatedBar fill | 1.2s | `cubic-bezier(0.4,0,0.2,1)` | primitives.jsx L139 |
| CountUp | 1.8s | easeOutCubic (`1-(1-p)^3`) | primitives.jsx L116-118 |
| Card hover | 0.5s | `cubic-bezier(.22,1,.36,1)` | styles.css L208-209 |
| Pcard hover | 0.4s | `cubic-bezier(.22,1,.36,1)` | styles.css L763-764 |
| Carousel slide | 0.5s | `cubic-bezier(.22,1,.36,1)` | styles.css L1571 |
| Layer pill | 0.25s | linear/default | styles.css L1368 |
| Marquee row 1 | 28s | linear infinite | styles.css L658-659 |
| Marquee row 2 | 34s | linear infinite reverse | styles.css L661 |
| Ticker (LiveTicker) | 60s | linear infinite | styles.css L1167 |
| Pulse (live-dot) | 1.6s | ease-in-out infinite | styles.css L1158-1163 |
| Ping (map pin) | 2s | ease-out infinite | styles.css L847-850 |
| Aurora float-a | 18s | ease-in-out infinite | styles.css L1808 |
| Aurora float-b | 22s | ease-in-out infinite | styles.css L1814 |
| Accordion height | 0.35s | `cubic-bezier(.22,1,.36,1)` | Faq.jsx L32 |

DMX tokens existentes a preservar: `--ease-dopamine: cubic-bezier(0.22, 1, 0.36, 1)` (matches prototype's `cubic-bezier(.22,1,.36,1)` exactamente) y `--ease-standard: cubic-bezier(0.4, 0, 0.2, 1)` (matches AnimatedBar).

Tokens faltantes a agregar:
- `--duration-blur-text: 700ms` (per-word)
- `--duration-fade-up: 650ms`
- `--duration-bar-fill: 1200ms`
- `--duration-count-up: 1800ms`
- `--duration-card-hover: 500ms`
- `--duration-marquee-fast: 28s`
- `--duration-marquee-slow: 34s`
- `--duration-ticker: 60s`

---

## 3. Reglas inviolables (resumen ejecutable)

Repetidas aquí como sección stand-alone para uso en code review checklist:

1. `border-radius: 9999px` en TODO botón, pill, chip, save, layer pill, axis pill, ticker-label, ie-cta, vinyl-cta, search-input, search-select, search-btn, search-tab.
2. Único gradient brand: `linear-gradient(90deg, #6366F1, #EC4899)`. Para variantes específicas se permite:
   - `linear-gradient(135deg, #6366F1, #EC4899)` SOLO para `.bh-num` (instructivo battle-howto, L1511) — esta es la única excepción de 135deg en todo el prototype.
   - `linear-gradient(180deg, #0E1220, #0A0D16)` para card backgrounds (NO un gradient brand, es surface).
3. Cero emoji en JSX, copy, props, alt text. Glyphs visuales se hacen con SVG inline (icons.jsx), Outfit chars (`↑`, `↓`, `~`, `→` en código real son texto Outfit, no emoji unicode — ver TICKER_ITEMS LiveTicker.jsx).
4. Transforms eje Y exclusivo: `translateY(-N)` para hover/in-view, `translateX` permitido SOLO en marquee infinito y carousel slide. NO `rotate`, NO `tilt`, NO `skew`. Excepción: `acc-chevron rotate(180deg)` accordion (styles.css L714) — open/close icon.
5. Animation duration cap: 850ms. La única excepción son loops infinitos (marquee 28-60s, aurora 18-22s, pulse 1.6s, ping 2s) — no son durations one-shot.
6. `once: true` en cada `useInView` (primitives.jsx L31, 66, 86, 108).

Reglas-puente con CLAUDE.md:
7. Mobile-first: `<640` 1 col, `640-960` 2 col, `>960` 3 col (regla unificada para grids — ver sección 11).
8. `prefers-reduced-motion` desactiva canvas hero (Hero.jsx L13), pausa marquee, omite scroll scrub (styles.css L882-884).

---

## 4. Sistema de botones

Spec exhaustiva de las 6 variantes del prototype. Cada una con su CSS literal (líneas styles.css), estados, y notas de adaptación DMX.

### 4.1 `.btn` base (styles.css L34-42)

```css
display: inline-flex; align-items: center; gap: 8px;
height: 42px; padding: 0 20px;
border-radius: 9999px;
font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 13.5px;
transition: transform .2s, background .2s, border-color .2s, color .2s;
white-space: nowrap;
```
Hover universal: `transform: translateY(-1px)`.

### 4.2 `.btn-primary` (styles.css L43-48)

```css
background: linear-gradient(90deg, #6366F1, #EC4899);
color: #fff; font-weight: 600;
box-shadow: 0 8px 24px rgba(99,102,241,0.25);
```
Hover: `box-shadow: 0 12px 32px rgba(236,72,153,0.35)`.

Adaptación DMX: usa `Button` shared component con prop `variant="primary"` o `variant="canon-primary"` para distinguir del Dopamine actual. Server Component si no necesita state, Client si maneja submit/loading.

### 4.3 `.btn-glass` (styles.css L49-54)

```css
background: rgba(255,255,255,0.04);
border: 1px solid rgba(255,255,255,0.14);
color: var(--cream);
```
Hover: `background: rgba(255,255,255,0.07)`, `border-color: rgba(255,255,255,0.22)`.

### 4.4 `.btn-ghost` (styles.css L55-60)

```css
background: transparent;
border: 1px solid rgba(99,102,241,0.3);
color: var(--indigo-2);
```
Hover: `background: rgba(99,102,241,0.08)`, `border-color: rgba(99,102,241,0.6)`.

### 4.5 `.btn-solid` (styles.css L61-66)

```css
background: rgba(240,235,224,0.92);
color: var(--bg);
font-weight: 700;
```
Hover: `background: rgba(240,235,224,1)`.

Uso prototype: NO hay instancia visible activa. Definido por completitud.

### 4.6 `.btn-sm` modifier (styles.css L67 + override L1713)

`height: 34px; padding: 0 14px; font-size: 12.5px;` — y override premium card `padding: 8px 14px !important; font-size: 12px !important;`. Resolver inconsistencia adoptando spec original (`34px`).

### 4.7 Icon circle (styles.css L473-481, L1582-1596, L1598-1609)

Tres variantes según contexto:

**Save heart** (`.pcard-save`, L1598-1609):
```css
position: absolute; top: 12px; right: 12px;
width: 32px; height: 32px; border-radius: 9999px;
background: rgba(6,8,15,0.55);
border: 1px solid rgba(255,255,255,0.14);
backdrop-filter: blur(8px);
color: var(--cream);
display: flex; align-items: center; justify-content: center;
```
Active: `color: #f472b6;`.

**Carousel arrow** (`.pcard-arrow`, L1582-1596):
- Mismo shell que save, `30×30`, opacity 0 default → 1 on parent hover.
- Posiciones: `top: 50%; transform: translateY(-50%); left: 10px / right: 10px`.

**Vinyl-cta circle** (styles.css L1401-1407):
```css
margin-left: auto; width: 36px; height: 36px; border-radius: 9999px;
background: var(--grad); color: #fff;
```
Hover: `transform: translateX(3px)` — única excepción translateX en hover (justificada por affordance arrow).

### 4.8 Search submit button (styles.css L375-380)

```css
height: 44px; border-radius: 9999px;
background: var(--grad); color: #fff; font-weight: 600;
padding: 0 20px; display: inline-flex; align-items: center; gap: 8px;
font-size: 13.5px;
```

### 4.9 Estados unified

| Estado | Primary | Glass | Ghost | Solid | Icon-circle | Save active |
|---|---|---|---|---|---|---|
| default | gradient + shadow indigo | bg 4% white | transparent + border indigo 30% | bg cream 92% | bg blur dark | — |
| hover | shadow rose 35% + Y-1 | bg 7% + border 22% | bg indigo 8% + border 60% | bg cream 100% | bg darker (arrow only) | — |
| active | (sin definir explícito) | (sin definir) | (sin definir) | (sin definir) | (sin definir) | color `#f472b6` |
| disabled | (no hay en prototype, propuesta DMX: opacity 40% + cursor not-allowed) | idem | idem | idem | idem | idem |
| focus | (no hay outline visible en prototype — agregar `outline: 2px solid var(--indigo); outline-offset: 2px` por a11y) | idem | idem | idem | idem | idem |

GAP a11y: el prototype no documenta focus states. **DMX canon agrega `:focus-visible` con outline indigo 2px en todos los interactivos** (cumplimiento WCAG 2.1 AA Success Criterion 2.4.7).

---

## 5. Sistema de cards

### 5.1 Card estándar (`.card`, styles.css L70-79)

```css
background: var(--bg-2);
border: 1px solid var(--border);
border-radius: 18px;
transition: transform .4s cubic-bezier(.22,1,.36,1), border-color .3s ease;
```
Hover: `transform: translateY(-4px); border-color: rgba(99,102,241,0.35);`.

Variante alta (`.vinyl-tile`, L1281-1294):
```css
background: linear-gradient(180deg, #0E1220 0%, #0A0D16 100%);
border-radius: 22px;
overflow: hidden;
display: flex; flex-direction: column;
```
Hover: `transform: translateY(-6px); border-color: rgba(99,102,241,0.4); box-shadow: 0 24px 60px rgba(99,102,241,0.12);`.

### 5.2 Score pill (`.pill`, styles.css L82-94)

```css
display: inline-flex; align-items: center; gap: 6px;
background: rgba(99,102,241,0.10);
border: 1px solid rgba(99,102,241,0.24);
border-radius: 9999px;
padding: 3px 12px;
font-family: 'Outfit', sans-serif;
font-weight: 600; font-size: 12px;
color: var(--indigo-3);
letter-spacing: 0.01em; white-space: nowrap;
```
Variantes: `.pill-glass` (L95-99), `.pill-green` (L100-104), `.pill-amber` (L105-109), `.pill-muted` (L110-114).

### 5.3 Momentum pills (`.vinyl-mom`, `.pcard-mom`, `.spec-mom`, etc — 3 colores semánticos)

**Up** (verde):
```css
background: rgba(34,197,94,0.12);
border: 1px solid rgba(34,197,94,0.30);
color: #86efac;
padding: 2px 8px; border-radius: 9999px;
font-family: 'Outfit'; font-weight: 700; font-size: 10.5px;
```

**Flat / neutro** (indigo soft):
```css
background: rgba(129,140,248,0.12);
border: 1px solid rgba(129,140,248,0.30);
color: #a5b4fc;
```

**Down** (rojo):
```css
background: rgba(239,68,68,0.12);
border: 1px solid rgba(239,68,68,0.30);
color: #fca5a5;
```

NOTA: `.pcard-mom` (carousel) usa opacidad 0.20 background y border 0.40 para destacar sobre fotos (styles.css L1630-1631, 1743-1744).

### 5.4 Glass overlay card (`.glass`, styles.css L116-134)

```css
position: relative;
background: rgba(255,255,255,0.05);
border: 1px solid rgba(255,255,255,0.16);
backdrop-filter: blur(24px);
-webkit-backdrop-filter: blur(24px);
border-radius: 16px;
```
Pseudo `::before` con gradient border (top bright → middle transparent → bottom subtle):
```css
content: ""; position: absolute; inset: 0;
border-radius: inherit; padding: 1px;
background: linear-gradient(to bottom,
  rgba(255,255,255,0.35),
  rgba(255,255,255,0.02) 35%,
  rgba(255,255,255,0.10));
-webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
-webkit-mask-composite: xor; mask-composite: exclude;
pointer-events: none;
```

Adaptación DMX: este pseudo-mask compose pattern es compatible con Tailwind v4 + RSC. Puede vivir en `shared/ui/glass-card.tsx` Server Component.

### 5.5 Card3D (Dopamine) — DEPRECATED

ADR-023 §2.7 reclasificó `Card3D` (rotateXY ±12°) a uso restringido. El prototype canon NO tiene tilt 3D — la regla 4 (transforms solo Y) es categórica. **`Card3D` se elimina del frontend canon**. Backend si todavía exporta primitive, se marca `@deprecated` en M3a.

---

## 6. Sistema inputs / forms / search

### 6.1 SearchBar shell (styles.css L317-330, SearchBar.jsx)

Card contenedor:
```css
margin-top: -60px; max-width: 920px;
background: #0D1118;
border: 1px solid rgba(255,255,255,0.14);
border-radius: 20px;
padding: 22px 24px;
box-shadow: 0 24px 80px rgba(0,0,0,0.45);
```
Posición: `relative; z-index: 20` para superponerse al hero.

NOTA: prototype README §7.4 dice `margin: -32px auto 0` y padding `24px 28px` y border-radius `20px` — pero styles.css L319 dice `margin-top: -60px`. **El styles.css es la fuente de verdad** (más restrictivo) — pero hay drift README↔CSS de -28px que master CC debe resolver al canonizar.

### 6.2 Tabs (styles.css L331-342)

4 tabs: `Comprar | Rentar | Invertir | Desarrolladores`.

```css
.search-tab { padding: 8px 16px; border-radius: 9999px; font-size: 13px; color: var(--cream-3); font-weight: 500; transition: all .2s; }
.search-tab.active { background: rgba(99,102,241,0.12); color: var(--indigo-3); font-weight: 600; }
.search-tab:hover:not(.active) { color: var(--cream); background: rgba(255,255,255,0.04); }
```

### 6.3 Input search row (styles.css L343-380)

Grid: `1fr 140px 140px auto`, gap `10px`.

Input shell:
```css
display: flex; align-items: center; gap: 10px;
background: var(--bg-3); border: 1px solid var(--border); border-radius: 9999px;
padding: 0 16px; height: 44px;
```
Inner `<input>`: `background: none; border: none; outline: none; flex: 1; font-size: 13.5px; color: var(--cream);` placeholder `var(--cream-3)`.

Select shell idéntico (con icon Home/Currency a la izquierda).

Submit button: ver §4.8.

Mobile: a `<720px` grid pasa a `1fr` (todos stack vertical).

GAP a11y: `<input>` no tiene `<label>` semantic vinculada — wrapper es `<label>` clase `.search-input` pero el contenido textual solo es el placeholder + icono. Adaptación DMX: agregar `aria-label` y `<label class="sr-only">` con la copy del placeholder.

### 6.4 Filter chips (`.chip`, styles.css L381-394)

```css
.chip { padding: 6px 12px; border-radius: 9999px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  font-size: 12px; color: var(--cream-3); cursor: pointer; transition: all .2s; }
.chip.active { background: rgba(99,102,241,0.12); border-color: rgba(99,102,241,0.35); color: var(--indigo-3); }
.chip:hover { color: var(--cream); }
```
8 chips listados literal en SearchBar.jsx L4: `['Benito Juárez','Del Valle','Nápoles','Condesa','Roma Norte','Polanco','2+ recámaras','DMX-LIV 75+']`. Activos default: `Benito Juárez`, `2+ recámaras`, `DMX-LIV 75+`.

---

## 7. Animation primitives — adaptación a stack DMX

Las 5 primitivas viven en `tmp/product_audit_input/DMX-prototype/src/primitives.jsx` (149 líneas). En DMX se mueven a `shared/ui/motion/` (decisión ADR-031 §Componentes adopt-as-is) PERO con dos cambios obligatorios:

1. **Reescritura TypeScript** con tipos explícitos.
2. **Compatible con Server Components**: las primitives son Client (`"use client"`) porque usan `useState`/`useRef`/`useEffect`/`IntersectionObserver`. Los CONSUMIDORES (Hero shell, ColoniasBento shell) son Server Components que importan estas Client islands para wrap children.

### 7.1 `useInView(ref, { once, amount })`

Hook que devuelve boolean usando IntersectionObserver. Source: primitives.jsx L7-26.
- Default `once: false`, `amount: 0.2`.
- En el prototype todos los usos pasan `once: true`. Mantener regla.
- Tipos DMX: `useInView<T extends HTMLElement>(ref: React.RefObject<T>, opts?: { once?: boolean; amount?: number }): boolean`.

### 7.2 `<BlurText as="h1" gradientWords={["antes"]}>texto</BlurText>` (primitives.jsx L28-61)

Split por `String(children).split(' ')`, cada palabra en `<span>` con:
- `display: inline-block; whiteSpace: pre`
- `marginRight: 0.28em` excepto última
- Default: `filter: blur(10px); opacity: 0; transform: translateY(24px)`
- In-view: `filter: blur(0px); opacity: 1; transform: translateY(0)`
- Transition: `.7s cubic-bezier(.22,1,.36,1)` con `delay = baseDelay + i*0.07s`
- `gradientWords`: las palabras en este array se renderizan con `var(--grad)` background-clip text + italic.

GAP a11y: cada palabra es un `<span>` independiente — screen readers pueden leer palabra por palabra con pausa. **Adaptación DMX**: wrap todo el texto en `<span aria-hidden>` (los span animados) más un `<span class="sr-only">{children}</span>` con el texto completo para SR. Documentado en ADR-031 §A11y posture.

Adaptación framer-motion (opcional, no requerida — el approach CSS transitions es válido y RSC-compatible si se emite desde Client island):
```tsx
<motion.span initial={{ filter: 'blur(10px)', opacity: 0, y: 24 }}
             animate={inView ? { filter: 'blur(0px)', opacity: 1, y: 0 } : undefined}
             transition={{ duration: 0.7, delay: baseDelay + i*0.07, ease: [0.22,1,0.36,1] }} />
```

### 7.3 `<FadeUp delay={0.1}>` (primitives.jsx L63-82)

- Default: `opacity: 0; transform: translateY(20px); filter: blur(6px)`.
- In-view: `opacity: 1; transform: translateY(0); filter: blur(0px)`.
- Transition: `.65s cubic-bezier(.22,1,.36,1) {delay}s`.
- Tag override prop `as`.

### 7.4 `<StaggerContainer stagger={0.08}>` (primitives.jsx L84-104)

- Wraps cada child en `<div>` con `style.opacity` + `style.transform` controlado por `inView`.
- Transition delay: `delay + i*stagger`.
- En el prototype se usa con stagger `0.1` (IE features), `0.12` (Vinyl tiles, Property cards).

### 7.5 `<CountUp to={97} duration={1800} suffix="+" prefix="">` (primitives.jsx L106-126)

- rAF loop con easing `1 - (1-p)^3` (easeOutCubic).
- Display: si `to % 1 === 0` redondea a Math.round, else `toFixed(1)`.
- En DMX existe equivalente `AnimNum` (decisión ADR-031 §Componentes adopt-as-is: "CountUp se mapea a `AnimNum` existing"). **CC debe verificar paridad firma + easing antes de adoptar el alias**.

### 7.6 `<AnimatedBar value={91} max={100} delay={0.1} variant='grad' display="91">` (primitives.jsx L128-146)

- Fill width `(value/max)*100%` interpolando `0% → N%` con `transition: width 1.2s cubic-bezier(0.4,0,0.2,1) {delay}s`.
- Variantes: `grad` (indigo→rose), `green` (verde), `amber` (amber→red).
- Accesibilidad DMX: agregar `role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={display||value}` (ADR-031 §A11y posture).

### 7.7 Marquee (CSS-only, styles.css L647-662)

```css
@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
.marquee { mask-image: linear-gradient(to right, transparent, black 7%, black 93%, transparent); overflow: hidden; }
.marquee-track { display: flex; gap: 20px; width: max-content; animation: marquee 28s linear infinite; }
.marquee-track.slow { animation-duration: 34s; animation-direction: reverse; }
.marquee:hover .marquee-track { animation-play-state: paused; }
```

CSS-only → puede vivir en Server Component (no necesita `"use client"`).

### 7.8 Aurora background (styles.css L1793-1822) — opcional

Dos blobs absolutos con `border-radius: 50%`, `filter: blur(80px)`, `opacity: 0.5`, animados con `float-a` (18s) y `float-b` (22s). No usado en App.jsx pero disponible. Adopción opcional para hero blocks de páginas internas.

---

## 8. Iconografía completa

Source: `src/icons.jsx` (67 líneas). 19 íconos custom inline SVG, sin dependencia externa, accept `{size, color, ...}` y devuelven SVG.

| Nombre | Viewbox | Default size | Stroke | Uso prototype |
|---|---|---|---|---|
| MapPin | 24 24 | 16 | 2 | Nav logo, hero CTA, property loc, map overlay |
| Play | 24 24 | 14 | (fill) | Hero "Ver el demo" |
| Search | 24 24 | 15 | 2 | SearchBar input + submit |
| Home | 24 24 | 14 | 2 | SearchBar Tipología |
| Currency | 24 24 | 14 | 2 | SearchBar Precio |
| ArrowRight | 24 24 | 14 | 2 | CTAs, cards (vinyl-cta, pcard footer), header-link |
| ArrowSide | 24 24 | 12 | 2.5 | Momentum flat |
| TrendUp | 24 24 | 12 | 2.5 | Momentum up, hero pill |
| Database | 24 24 | 20 | 1.8 | IE feature, axis-help head |
| Clock | 24 24 | 20 | 1.8 | IE feature |
| Lock | 24 24 | 20 | 1.8 | IE feature |
| Heart | 24 24 | 14 | 2 (fill toggle) | Property save |
| MessageSquare | 24 24 | 14 | 2 | FAQ "Hablar con asesor" |
| ChevronDown | 24 24 | 18 | 2 | FAQ accordion |
| ChevronLeft | 24 24 | 14 | 2 | Carousel arrow left |
| ChevronRight | 24 24 | 14 | 2 | Carousel arrow right, map-link |
| Menu | 24 24 | 18 | 2 | Mobile nav (no implementado en Navbar.jsx — declarado en icons) |
| Bed | 24 24 | 12 | 2 | Property meta beds |
| Bath | 24 24 | 12 | 2 | Property meta baths |
| Car | 24 24 | 12 | 2 | Property meta parking |
| Ruler | 24 24 | 12 | 2 | Property meta area |

GAP: el prototype declara Menu pero Navbar.jsx no lo implementa (línea 18-29 muestra nav-links sin hamburger). En mobile (<880px) los nav-links solo se ocultan vía `display: none` (styles.css L222-224). **Migración DMX debe AGREGAR mobile sheet con Menu icon** (declarado en spec README §7.1 mobile detail L304-308 con sheet full-screen).

Adaptación DMX: estos 19 SVGs se reescriben TS-typed en `shared/ui/icons/` cada uno como named export. NO usar lucide-react (icons del prototype son custom y diferentes — Currency por ejemplo no es lucide DollarSign). Mantener icons.jsx como source-of-truth visual.

---

## 9. Estados / interacciones — matriz completa

Re-derivada de prototype/README.md §10 + verificación contra styles.css. Default | Hover | Active | Focus | Disabled.

| Componente | Default | Hover | Active | Focus (a agregar) | Disabled (a agregar) |
|---|---|---|---|---|---|
| Nav link | `cream-3` | `cream` + bg 5% white + Y-1 | (— ; underline implicito visit) | outline 2px indigo | (n/a) |
| Btn primary | gradient + sh indigo | sh rose 35% + Y-1 | Y-0 | outline 2px indigo offset 2px | opacity 40% + cursor not-allowed |
| Btn glass | bg 4% white | bg 7% + border 22% | (—) | idem | idem |
| Btn ghost | border indigo 30% + color indigo-2 | bg indigo 8% + border 60% | (—) | idem | idem |
| Card / Vinyl tile | sh 0 | translateY(-6) + border indigo 40% + sh-card | (—) | (none — wrap link inside if needed) | (n/a) |
| Property card | sh 0 | translateY(-4) + border accent oklab + sh 20px 50px | (—) | idem | (n/a) |
| Layer pill (vinyl) | gris transparent | color cream + border 16% white | bg indigo 14% + border indigo 45% + color indigo-3 | outline | (n/a) |
| Filter chip | bg 3% | color cream | bg indigo 12% + border 35% + color indigo-3 | outline | (n/a) |
| Heart save | stroke cream | (no hover state explícito) | filled rose `#f472b6` + border rose 45% | outline | (n/a) |
| Carousel arrow | opacity 0 | opacity 1 + bg darker (`rgba(6,8,15,0.8)`) | (—) | outline | (n/a) |
| Radar axis pill | gris | color cream | bg gradient + border transparent + color white | outline | (n/a) |
| Radar picker (`.bp`) | bg 2% + border 6% + color cream-3 | color cream + border 18% white | bg indigo 8% + border `var(--c)` colonia color + color cream | outline | (n/a) |
| FAQ trigger | cream | indigo-3 | indigo-3 + chevron rotate(180) | outline | (n/a) |
| Search tab | cream-3 | bg 4% white + cream | bg indigo 12% + color indigo-3 + weight 600 | outline | (n/a) |
| Search input wrapper | bg-3 + border subtle | (no hover state) | (focus-within border indigo — propuesta DMX) | focus-within outline | aria-disabled |
| Ie-cta full-width | gradient | (no hover explicit — heredar btn-primary hover) | (—) | outline | opacity 40% |
| Ticker item delta | colored pill | (—) | (—) | (—) | (—) |
| Acc-trigger / chevron | cream-3 | rotate transition .3s | open ↔ rotate(180) + indigo-3 | outline focus-visible | (n/a) |

GAPs explícitos a cubrir en DMX migration:
1. Focus visible style — el prototype no define `:focus-visible`. DMX agrega `outline: 2px solid var(--indigo); outline-offset: 2px` global en interactivos.
2. Disabled state — el prototype no tiene controles disabled. DMX define `[disabled] { opacity: 0.4; cursor: not-allowed; pointer-events: none; }`.
3. Hover heart save — falta estado hover (solo active definido). DMX agrega `:hover { color: rgba(244,114,182,0.6); }`.

---

## 10. Responsive — breakpoints y comportamiento

Source: prototype/README.md §11 + verificación contra media queries en styles.css.

| Breakpoint | Cambios documentados (CSS literal) |
|---|---|
| `<640px` | `bento-grid 1 col` (L399). search-row 1 col también pero ese breakpoint es `720px` (L349-351). Custom cursor desactivado por `@media (pointer: fine)` (L778). Reduced motion default (apenas pointer coarse). |
| `640-720px` | search-row 1 col (L349-351). vinyl-legend 2 col (L1261). |
| `<820px` | comp-grid 1 col (L1196). spec-grid 1 col (L1732). battle-howto 1 col (L1499). vinyl-legend 2 col (L1261). stats-grid 2 col (L614). |
| `<880px` | nav-links display:none (L222-224). |
| `<900px` | ie-grid 1 col (L530). faq-grid 1 col (L688). |
| `<960px` | bento-grid 2 col (L398). vinyl-grid 1 col (L1280). pcard-grid 1 col (L1550). battle-grid 1 col (L1425). |
| `<1100px` | map-overlay-wrap display:none (L815) — el overlay hero se oculta. |
| `<760px` | footer-inner 1 col + text-align center (L772-775). |

**Inconsistencia detectada**: el README §11 dice `<640 → grids → 1 col` pero styles.css aplica diferentes breakpoints por componente (640/820/960). **Master CC debe definir breakpoint canónico DMX** (recomendación: adoptar Tailwind v4 defaults `sm: 640, md: 768, lg: 1024, xl: 1280` y mapear cada media query del prototype al breakpoint Tailwind más cercano, documentando override).

GAP responsive H1: `clamp(44px, 6vw, 80px)` ya escala fluido. El prototype mobile NO baja a 44px hard — el clamp lo hace automático.

---

## 11. Accesibilidad WCAG 2.1 AA — checklist por componente

Lista de gaps a11y por componente, alineada con ADR-031 §A11y posture (89 ítems concretos). Aquí los más críticos por componente:

### Hero (Hero.jsx)
1. Canvas decorativo: agregar `aria-hidden="true"` (L127).
2. Eyebrow pill: convertir a `<span role="img" aria-label="IE versión 1, Ciudad de México">`.
3. BlurText H1: a11y wrap (ver §7.2).
4. CTAs: keyboard nav natural (button), focus-visible outline.
5. Score pills: agregar `aria-label="DMX LIV score 87 sobre 100"` etc.
6. Partners row: convertir a `<ul>` semantic.

### Navbar (Navbar.jsx)
1. `<nav role="navigation" aria-label="Principal">`.
2. Brand `<a>` con `aria-label="DesarrollosMX, ir a inicio"`.
3. Mobile sheet con `aria-expanded`, focus trap, ESC close (faltante en prototype).
4. Hamburger button con `aria-controls="mobile-nav"`.
5. Scroll behavior `nav.scrolled` no rompe contrast (verificar que rgba(6,8,15,0.92) sigue ≥4.5:1 con cream-3).

### LiveTicker (LiveTicker.jsx)
1. `<div role="marquee" aria-live="off" aria-label="Precio por metro cuadrado en vivo">`.
2. Items individuales: `aria-label="Del Valle Centro, 58 mil pesos por metro cuadrado, subió 6 por ciento"`.
3. Pause on hover ya implementado (CSS).
4. `prefers-reduced-motion` debe pausar el ticker (agregar a CSS).

### SearchBar (SearchBar.jsx)
1. Tabs: pattern `role="tablist"` + `role="tab"` + `aria-selected`.
2. Input: `<label>` semantic (sr-only) + placeholder.
3. Selects: convertir `<div>` a `<button>` con menu listbox o usar `<select>` real.
4. Chips: `role="checkbox" aria-checked` para multi-select.
5. Submit: `<button type="submit">`.
6. Form wrapper: `<form role="search" aria-label="Búsqueda de propiedades">`.
7. Filter chips: keyboard navigable (Tab + Space).

### ColoniasBento / VinylTile (ColoniasBento.jsx)
1. Section: `<section aria-labelledby="colonias-heading">`.
2. Layer switcher: `role="tablist"` + tab pattern + `aria-controls` apuntando al fact panel.
3. Score big: `<div role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label="DMX LIV ${score}">`.
4. Lifeline SVG: `aria-label="Tendencia de precio últimos 24 meses, ${trend[0]} a ${trend[n-1]} mil"`.
5. CTA circle: `aria-label="Ver reporte completo de ${name}"`.
6. Vinyl-mom pill: `aria-label="Momentum positivo 6 por ciento año contra año"`.
7. Legend chips: `<dl>` con `<dt>LIV</dt><dd>Calidad de vida</dd>`.
8. Fact rows: semantic `<dl>` instead of `<div>`.

### ColoniaComparator (ColoniaComparator.jsx)
1. Side panels: `<aside aria-labelledby="colonia-a-label">`.
2. Picker: `role="radiogroup"` + radios para selección exclusiva.
3. Radar SVG: title + desc + per-axis text alternative.
4. Axis pills: `role="tablist"` con `aria-pressed` para toggle.
5. Avatar: `aria-hidden` (decorativo) + nombre visible.
6. Stats: semantic `<dl>`.
7. Narrative: `<p role="status" aria-live="polite">` (cambia con A/B/highlight).
8. Howto: `<ol>` semantic.
9. Battle-axis-help: `aria-live="polite"` para anunciar contexto al activar eje.

### PropertyListings / PropertyCard (PropertyListings.jsx)
1. Card: `<article aria-labelledby="prop-${id}-title">`.
2. Carousel: `role="region" aria-roledescription="carousel" aria-label="Fotos de la propiedad"`.
3. Slides: `role="group" aria-roledescription="slide" aria-label="${idx} de ${n}"`.
4. Arrows: `aria-label="Foto anterior"` / `"Foto siguiente"`.
5. Save button: `aria-pressed={saved} aria-label="Guardar propiedad"`.
6. Tag pill: `aria-hidden` (decorativo, info ya en aria-label slide).
7. Dots: `<button role="tab" aria-selected aria-label="Ir a foto ${i+1}">`.
8. Meta icons: `aria-label="${beds} recámaras"` etc; iconos `aria-hidden`.
9. Scores grid: semantic `<dl>`.

### IntelligenceEngine (IntelligenceEngine.jsx)
1. Section: `<section aria-labelledby="ie-heading">`.
2. Feature rows: `<ul>` semantic.
3. Score panel: `<aside aria-label="Panel de score Del Valle Centro">`.
4. Bars: `role="meter"` con aria-values.
5. Delta pill: `aria-label="3 puntos más que mes anterior"`.
6. CTA: descriptive label.

### Stats (Stats.jsx)
1. `<dl>` semantic.
2. CountUp: `aria-label="${final value}"` para no animar el valor leído por SR.
3. Dividers `::before` decorativos `aria-hidden`.
4. Footer pill: `<time datetime="...">` para hora.

### Testimonials (Testimonials.jsx)
1. `<section aria-labelledby="testimonials-heading">`.
2. Marquee: `aria-live="off"` (no spam SR).
3. Cards: `<blockquote>` + `<cite>`.
4. Reduced motion: marquee paused.
5. Avatar: `aria-hidden` + nombre visible cite.

### Faq (Faq.jsx)
1. Accordion: pattern `aria-expanded` + `aria-controls` (hace falta en prototype L28 — el button no tiene aria-controls).
2. Each item: `<dt>` (trigger) + `<dd>` (content) wrapped en `<dl>`.
3. Chevron `aria-hidden` (rotate visual ya redundante con aria-expanded).
4. Sticky col left: `aria-labelledby` para H2.
5. Tag-chip "FAQ": role decorative.
6. Content max-height transition NO debe quedar visible cuando `aria-expanded="false"` (verificar `display: none` o `visibility: hidden` post-transition).
7. Keyboard: ESC, Up/Down arrow opcional.

### CtaFooter (CtaFooter.jsx)
1. CTA section: `<section aria-labelledby="cta-heading">`.
2. CTAs: descriptive labels.
3. Footer: `<footer role="contentinfo">`.
4. Link list: `<ul>` semantic.
5. Copyright: `<p>` con `<small>`.

### MapOverlay (MapOverlay.jsx)
1. `<aside aria-label="Vista previa de mapa, Del Valle Centro">`.
2. Score grid: `<dl>` semantic.
3. Map background: decorativo `aria-hidden`.
4. Ping ring: decorativo + reduced-motion paused.

### CustomCursor (CustomCursor.jsx) — DECISIÓN
Recomendación DMX: **NO portar**. ADR-031 §Componentes lista CustomCursor como **skip-no-fit** por:
- Conflicto con accesibilidad (esconder cursor nativo perjudica usuarios con baja visión).
- Performance overhead (3 layers + rAF + IntersectionObserver de cada interactivo).
- Mobile-first MX (descalificado por `@media (pointer: fine)`).
- Conflicto con Dopamine cleaner principle (ADR-023).

**Decisión confirmada para canon: skip CustomCursor. No documentar adopción.**

---

## 12. Mapping tokens prototype → tokens.css DMX

Tabla detallada qué cambia en `styles/tokens.css`:

| Token actual DMX | Acción | Token canon nuevo / ajustado | Razón |
|---|---|---|---|
| `--gradient-p` (`linear-gradient(135deg, oklch(0.67 0.19 285), oklch(0.72 0.17 230))`) | **REPLACE** | `linear-gradient(90deg, #6366F1, #EC4899)` | Match prototype gradient único. Decisión ADR-031 §Tokens punto 1, ratificada en frontend canon. |
| `--font-display` (`'Outfit', ui-sans-serif, system-ui`) | KEEP | (mismo) | Match prototype. |
| `--font-body` (`'DM Sans', ui-sans-serif`) | KEEP | (mismo) | Match prototype. |
| `--font-weight-bold: 700` | ADD | `--font-weight-extrabold: 800` | Display H1/H2/score-big requieren 800 (no presente actualmente). Decisión ADR-031 §Tokens punto 3. |
| `--text-*` (rem-based scale) | KEEP for compact density | ADD `--text-fluid-display: clamp(44px, 6vw, 80px)`, `--text-fluid-h2: clamp(32px, 4.2vw, 52px)`, `--text-fluid-cta: clamp(38px, 5.5vw, 68px)` | Display fluid requerido para hero/section/cta canon. |
| Color OKLCH (light + dark mode) | KEEP for backbone | ADD HEX canon parallel: `--color-canon-bg-base: #06080F`, `--color-canon-bg-surface: #0D1017`, `--color-canon-bg-input: #111827` | Canon prototype usa HEX dark exactos, no OKLCH equivalencias. |
| (—) | ADD | `--color-text-cream-primary: #F0EBE0`, `--color-text-cream-secondary: rgba(240,235,224,0.62)`, `--color-text-cream-muted: rgba(240,235,224,0.32)` | Decisión ADR-031 §Tokens punto 4 (cream variants). Activar via `data-surface="cream-on-dark"`. |
| (—) | ADD | `--color-indigo-canon-{500,400,300}: #6366F1, #818CF8, #a5b4fc` | Indigo trio canon. |
| (—) | ADD | `--color-rose-canon-500: #EC4899` | Rose canon. |
| `--color-success`, `--color-warning`, `--color-danger` (oklch) | KEEP for backbone | ADD `--color-success-canon-bg: rgba(34,197,94,0.12)` + `--color-success-canon-text: #86efac` + idem warning/danger | Canon usa colores semánticos HEX en surface dark. |
| `--color-border-subtle` (oklch) | KEEP | ADD `--color-border-canon-subtle: rgba(255,255,255,0.08)`, `--color-border-canon-strong: rgba(255,255,255,0.14)` | Borders dark surface. |
| `--radius-pill: 999px` | KEEP | (mismo, validar `9999px` vs `999px` — funcionalmente equivalente >9999) | Match prototype default obligatorio. |
| `--radius-md: 0.75rem` (12px) | KEEP | + `--radius-canon-card: 22px`, `--radius-canon-2xl: 28px` | Cards canon usan 22px y battle-grid 28px. |
| `--shadow-md`, `--shadow-lg`, `--shadow-xl` (OKLCH) | KEEP for backbone | ADD `--shadow-canon-card: 0 24px 60px rgba(99,102,241,0.12)`, `--shadow-canon-elev: 0 24px 80px rgba(0,0,0,0.45)` | Shadows canon hero/cards. |
| `--ease-dopamine` | KEEP | (mismo) | Match prototype `cubic-bezier(.22,1,.36,1)`. |
| `--ease-standard` | KEEP | (mismo) | Match prototype `cubic-bezier(0.4,0,0.2,1)` (AnimatedBar). |
| `--duration-fast/base/slow/slower` | KEEP | ADD canon-specific: `--duration-blur-text: 700ms`, `--duration-fade-up: 650ms`, `--duration-bar-fill: 1200ms`, `--duration-count-up: 1800ms`, `--duration-card-hover: 500ms` | Canon timings exactos. |
| (—) | ADD | `--duration-marquee-fast: 28s`, `--duration-marquee-slow: 34s`, `--duration-ticker: 60s` | Loops infinitos. |
| Tints `--color-bg-{lavender,mint,peach,slate,rose}` | KEEP | (sin cambio) | Tints siguen vigentes para portales internos (asesor, comprador, dev) — canon prototype es para superficies públicas dark. |

**Conteo agregado tokens.css refresh** (estimado para master CC):
- 28 tokens KEEP sin cambio.
- 14 tokens REPLACE (mayoritariamente ADD parallel HEX para no romper backbone OKLCH).
- 31 hybrid (mantener nombre, parametrizar por surface).
- 9 propose-new (cream variants, fluid display, marquee durations, 2 shadows canon).
- TOTAL ~82 tokens revisados (consistente con conteo SA-Tokens citado en ADR-031).

---

## 13. Migration plan componentes Dopamine actuales → equivalents prototype

Plan de port. La lista de 17 componentes prototype mapea contra qué primitives Dopamine existen y qué hace falta.

| Componente prototype | Equivalente Dopamine actual | Acción | Effort estimado (CC pace 4x) | Bloqueante para |
|---|---|---|---|---|
| App.jsx (composición) | `app/page.tsx` (TBD M19) | Crear page composition | 0.5h | M19 build |
| icons.jsx (19 íconos) | `shared/ui/icons/*` (parcial) | Port adopt-as-is + reescribir TS | 2h | Cualquier feature canon |
| primitives.jsx (5 primitives) | `shared/ui/motion/*` (parcial: AnimNum) | Port adopt-as-is BlurText/FadeUp/Stagger/AnimatedBar; alias CountUp→AnimNum | 4h | TODO componente canon que use motion |
| Navbar.jsx | `shared/ui/navbar` (Dopamine) | Port-completo (refactor a canon: pill nav-link, glass + gradient logo) + ADD mobile sheet con Menu icon | 6h | M01-M20 (header global) |
| Hero.jsx | (no hay equivalente Dopamine — landing greenfield) | Port-completo: canvas scrub Client island + content Server | 8h | M19 |
| LiveTicker.jsx | (no hay) | Adapt-pattern: marquee CSS-only Server Component | 2h | M19 |
| SearchBar.jsx | `shared/ui/search` (TBD) o `features/marketplace/search` | Port-completo: tabs role tablist + chips + form RHF + Zod schema | 8h | M19 |
| ColoniasBento.jsx + VinylTile | `features/zonas/*` Dopamine actual | Port-completo: shell Server fetch zone scores + VinylTile Client (layer state) | 12h | M17 / M19 |
| ColoniaComparator.jsx + RadarChart | `features/comparator/radar-chart-6d.tsx` Dopamine | Port-completo: SVG inline + state Client + data fetch Server | 12h | M19 / M18 |
| PropertyListings.jsx + PropertyCard | `features/marketplace/property-card.tsx` Dopamine | Port-completo: carousel Client + body Server-renderable + i18n + formatCurrency | 10h | M19 / M20 |
| IntelligenceEngine.jsx | (no hay equivalente directo) | Adapt-pattern: panel + bars + features list. Reusar AnimatedBar, StaggerContainer | 6h | M19 |
| Stats.jsx | (no hay) | Adapt-pattern: stats grid + CountUp/AnimNum + footer pill | 3h | M19 |
| Testimonials.jsx | (no hay) | Adapt-pattern: marquee CSS Server + cards | 3h | M19 |
| Faq.jsx | `shared/ui/accordion` (Dopamine?) | Adapt-pattern: accordion semantic con `<dl>` + sticky col + a11y | 4h | M19 |
| CtaFooter.jsx | `shared/ui/footer` (Dopamine) | Adapt-pattern: CTA + Footer split, gradient line top | 4h | M19 (global footer) |
| MapOverlay.jsx | (no hay) | Adapt-pattern: glass card + score grid + ping animado | 3h | Hero M19 |
| CustomCursor.jsx | (no hay) | **SKIP — no portar** (decisión §11) | 0h | — |

**Total effort M3b feature components**: ~88h CC pace 4x = ~22h wall-clock real ≈ 3 días CC.

Componentes Dopamine a deprecar / refactorizar paralelos:
- `Card3D` → marcar `@deprecated`, no usar en canon (regla 4 transforms Y).
- `ParticleField` → revisar uso; si no necesario en canon, deprecar.
- `IntelligenceCard` (Dopamine) → review si redundante con IE panel canon.

---

## 14. i18n estimate

Origen: ADR-031 §i18n posture documenta **187 keys × 5 locales = 935 entries**. Ratificado en este draft con verificación literal copy.

Distribución by componente (extraída de prototype/README.md §15 + componentes JSX):

| Componente | Keys aproximados | Ejemplos |
|---|---|---|
| Hero | 14 | hero.eyebrow.tag, hero.eyebrow.text, hero.h1, hero.sub, hero.cta.map, hero.cta.demo, hero.location, hero.partners.label, 6 partners names |
| Navbar | 9 | nav.colonias, nav.propiedades, nav.inteligencia, nav.asesores, nav.signin, nav.exploreMap, brand, mobile.open, mobile.close |
| LiveTicker | 5 | ticker.label, ticker.live, ticker.up, ticker.down, ticker.flat (nombres colonias dinámicos) |
| SearchBar | 18 | searchbar.tab.{comprar,rentar,invertir,desarrolladores}, searchbar.placeholder, searchbar.tipologia, searchbar.precio, searchbar.submit, searchbar.chips.* (8) |
| ColoniasBento | 28 | section.eyebrow, section.h2, section.sub, section.link, layers.{liv,mov,sec,eco}.{label,desc}, vinyl.score.label, vinyl.score.desc, vinyl.layer.help, vinyl.facts.k.* (12), vinyl.lifeline.label, vinyl.foot.{precio,inventario,cta} |
| ColoniaComparator | 24 | section.eyebrow, section.h2, section.sub, howto.{1,2,3}.{title,desc}, side.{a,b}.label, axes.* (6), axis.help.* (6), narrative.template, stats.{precio,momentum} |
| PropertyListings | 22 | section.eyebrow, section.h2, section.sub, link, photo.tag.* (7: Fachada, Interior, Vista, Terraza, Jardín, Sala, Cocina), prop.meta.{rec,baths,parking,m2}, prop.plusvalia.label, prop.scores.k, asesor.label, prop.cta |
| IntelligenceEngine | 16 | section.eyebrow, section.h2, section.sub, features.{1,2,3}.{title,desc}, panel.head.timestamp, score.label, score.desc, score.delta, bars.* (6 labels), cta |
| Stats | 6 | items.* (4 labels), footer.label, footer.timestamp |
| Testimonials | 14 | eyebrow, h2, 6 testimonials (roles dinámicos pero quote/role keys) |
| Faq | 16 | eyebrow, h2, sub, cta, 7 q+a pairs (×2 = 14) — agrupable como `faq.items[i].{q,a}` |
| CtaFooter | 12 | cta.tag, cta.h2, cta.sub, cta.cta1, cta.cta2, footer.links.* (4), copyright |
| MapOverlay | 8 | label, name, alc, scores.k.* (6) |

Total ~187 keys (verificado).

5 locales × 187 = **935 entries en `messages/{locale}.json`** (es-MX, es-CO, es-AR, pt-BR, en-US).

formatCurrency obligatorio: precio por m² (`$58k`, `$72k`...) → `formatCurrency(58000, locale, currency)` enrutado por `country_code`. Hardcode prototype `'$' + n.toLocaleString('es-MX')` (PropertyListings.jsx L60) NO se porta — usa shared formatter.

formatDate obligatorio: "actualizado hace 6h" → `formatDistanceToNow` localized (date-fns o Intl.RelativeTimeFormat).

---

## 15. Checklist anti-slop (cumplimiento obligatorio en cada componente nuevo / portado)

Source: prototype/README.md §12 líneas 1112-1122 + extensiones DMX:

- [ ] Zero emoji en JSX, copy, alt, aria-label.
- [ ] Gradientes solo `linear-gradient(90deg, #6366F1, #EC4899)`. Excepción registrada: `135deg` SOLO para `.bh-num`.
- [ ] No `text-center` en párrafos body fuera de hero/CTA/section-header.
- [ ] Sin `shadow-2xl` (ni equivalente Tailwind exagerado). Profundidad vía border + backdrop-blur o tokens shadow-canon-card / shadow-canon-elev.
- [ ] Zero lorem ipsum. Copy desde i18n keys, validado contra prototype/README.md §15 para canon es-MX.
- [ ] Buttons 100% `rounded-full` (`--radius-pill`).
- [ ] Motion `duration ≤ 0.85s` (excepto loops infinitos documentados).
- [ ] No `console.log` en output final.
- [ ] Copy es-MX exacta para canon (otros locales son traducciones).
- [ ] Sin parallax lateral ni tilt en mobile (ni desktop — regla 4).
- [ ] `prefers-reduced-motion: reduce` honrado por construcción.
- [ ] `:focus-visible` outline indigo 2px en TODOS los interactivos.
- [ ] Contrast ratio ≥ 4.5:1 verificado (axe-playwright o manual).
- [ ] Semantic HTML obligatorio (`<nav>`, `<section>`, `<article>`, `<aside>`, `<footer>`, `<dl>`, `<ul>`, `<button>`, `<form role="search">`).
- [ ] ARIA labels en SVG + buttons + roles avanzados (tablist, meter, marquee).
- [ ] `i18n everywhere` — zero strings hardcoded user-facing.
- [ ] formatCurrency / formatDate / formatPhone enrutados por `country_code`.
- [ ] Server Component default; `"use client"` solo cuando hay state/IO/canvas/scroll.
- [ ] Zero `any`, zero `@ts-ignore`, Zod SSOT.
- [ ] Tests: Vitest unitarios + Playwright keyboard nav + axe-playwright a11y.

---

## 16. Out of scope (qué NO incluye este canon frontend)

- **Backend / RLS / tRPC routers**: el canon es solo presentación. ADR-018 E2E sigue activo.
- **Schemas BD**: `colonias`, `colonia_scores`, `properties`, etc. NO se documentan aquí — viven en migrations DMX.
- **Endpoints REST**: la sección 14 del prototype/README propone Fastify, **no aplica DMX** (DMX usa tRPC 11).
- **Auth / Stripe / Multi-tenant**: viven en módulos M01-M20 backend.
- **Mapbox config**: integración Mapbox GL es M17 backend; canon UI solo expone `MapOverlay` decorativo.
- **Score computer / pipeline IE**: backend.
- **Connectivity / API contracts**: definidos en módulos.
- **Database migrations**: regla 3 RLS / regla 4 types BD son backend.
- **Pricing / billing UI**: M16 admin.
- **Email / WhatsApp templates**: M07 / M08.

---

# Componente-por-componente — spec extendida

(Sub-sección de §3-§16 — entregable extra para uso directo en code review por componente.)

## C1 — App.jsx

**Estructura JSX (alto nivel) — App.jsx L1-19**:
```jsx
<>
  <CustomCursor />
  <Navbar />
  <Hero />
  <SearchBar />
  <LiveTicker />
  <ColoniasBento />
  <ColoniaComparator />
  <PropertyListings />
  <IntelligenceEngine />
  <Stats />
  <Testimonials />
  <Faq />
  <CtaFooter />
</>
```

NOTA: El orden en App.jsx (SearchBar → LiveTicker) difiere del README §13 (LiveTicker → SearchBar L1133-1134). **App.jsx es la fuente de verdad** (código real). Master CC documenta esta decisión.

**Props**: ninguno.
**Estados**: ninguno (root).
**Animaciones**: ninguna directa (las gestiona cada child).
**Token deps**: `--bg`, `--cream`, `--font-body` (vía body global en styles.css L20).
**Adaptación DMX**: Server Component `app/page.tsx` para landing M19. Cada child wrap independiente (Server donde posible, Client donde necesario). CustomCursor no se incluye (skip).

## C2 — icons.jsx

**Estructura**: 19 íconos como métodos de objeto `I`. Cada uno SVG inline.
**Props**: `{size, color, ...rest}`.
**Estados**: ninguno (puro).
**Animaciones**: ninguna.
**Token deps**: `currentColor` (heredan color del padre).
**Adaptación DMX**: reescribir TS named exports en `shared/ui/icons/index.ts`. `Heart` con prop adicional `filled: boolean` (controlado por padre). Adoptar regla "NO añadir lucide-react" — los íconos canon son específicos.

## C3 — primitives.jsx

Ya cubierto exhaustivo en §7 de este draft.

## C4 — Navbar.jsx

**Estructura**:
```jsx
<nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
  <div className="nav-inner">
    <a className="brand"><span className="logo-mark"><MapPin/></span> DesarrollosMX</a>
    <div className="nav-links">{links.map(l => <a className="nav-link">{l}</a>)}</div>
    <div style={{display:'flex',gap:8}}>
      <button className="btn btn-glass btn-sm hide-mobile">Iniciar sesión</button>
      <button className="btn btn-primary btn-sm"><MapPin/> Explorar mapa</button>
    </div>
  </div>
</nav>
```

**Props**: ninguno.
**Estados**: `scrolled: boolean` (Y > 40), `open: boolean` (mobile sheet — declarado pero NO implementado en JSX).
**Animaciones**: scrolled toggle (background opacity, blur), CSS transitions on nav.
**Token deps**: `--bg`, `--bg-2`, `--cream`, `--cream-3`, `--grad`, `--border`, `--indigo`.
**A11y items**: 7 (ver §11 Navbar).
**Adaptación DMX**: Client component (`scroll listener`). Mobile sheet IMPLEMENTAR (gap actual). Considerar `next/link` para navegación interna.

## C5 — Hero.jsx

**Estructura**: `<section ref hero-wrap>` → `<div hero-sticky>` → canvas + fallback + grid + vignette + gradient-fade + MapOverlay + content (eyebrow, BlurText H1, sub, CTAs, pills, location) + partners absolute bottom.

**Props**: ninguno.
**Estados**: `reduced: boolean` (matchMedia prefers-reduced-motion).
**Animaciones**:
- Canvas scrub: rAF loop draws radial blooms + grid drift + floating dots, modulado por scroll progress (0→1 over 250vh).
- BlurText H1 word stagger (0.07s/word).
- FadeUp eyebrow (0.1s), sub (0.9s), CTAs (1.1s), pills (1.4s), partners (1.7s).
- MapOverlay ping (CSS).
**Token deps**: `--bg`, `--cream-2`, `--cream-3`, `--indigo`, `--rose`, `--grad`, fonts.
**A11y items**: 6 (canvas aria-hidden, eyebrow role img, BlurText sr wrap, CTAs focus, pills aria-label, partners ul).
**Adaptación DMX**:
- Outer shell: Server Component (renders content + meta SEO).
- Canvas + scroll listener: Client island (`<HeroScrubCanvas>`).
- BlurText / FadeUp: Client primitives.
- Hero-h1 con i18n key + gradientWords passing palabra "antes" (es-MX). Para otros locales: definir cuál palabra es gradient (ej en-US "Know your neighborhood **before** deciding" → "before").

## C6 — LiveTicker.jsx

**Estructura**: `<div ticker-wrap>` con `ticker-label` absoluto izq + `ticker-track` que mapea TICKER_ITEMS×2 con clase `ticker-item` (k, v, d.label).

**Props**: ninguno (data hardcoded en `TICKER_ITEMS` array L2-15).
**Estados**: ninguno.
**Animaciones**: marquee 60s linear infinite (CSS).
**Token deps**: `--bg-2`, `--cream`, `--cream-3`, `--indigo-3`, success/danger semantic.
**A11y items**: 4.
**Adaptación DMX**:
- Server Component (CSS-only animation).
- Data: futuro lectura de `price_timeseries` table vía tRPC; por ahora hardcoded en spec.
- pause on `prefers-reduced-motion` agregar a CSS.

## C7 — SearchBar.jsx

**Estructura**: `<div search-wrap>` → `FadeUp` → `<div search-card>` con tabs + search-row (input, 2 selects, submit) + chip-row.

**Props**: ninguno.
**Estados**: `tab: string` ("Comprar"), `active: Set<string>` (chips).
**Animaciones**: FadeUp entrance.
**Token deps**: `--bg-3`, `--border`, `--cream`, `--cream-3`, `--indigo-3`, `--grad`.
**A11y items**: 7 (form role search, tablist, label sr-only, chip role checkbox, etc).
**Adaptación DMX**:
- Client component (state).
- Form react-hook-form + Zod schema (regla 1 SSOT).
- Selects: convertir a `<select>` real o `<Combobox>` accesible.
- onSubmit: tRPC query (publicProcedure si pre-auth, authenticated si dashboard).

## C8 — ColoniasBento.jsx (incluye VinylTile + Lifeline)

**Estructura outer**: `<section>` → header (eyebrow + BlurText H2 + sub + link) + FadeUp legend (4 items LIV/MOV/SEC/ECO) + StaggerContainer.vinyl-grid > VinylTile×N.

**VinylTile estructura**: `<div vinyl-tile>` → `vinyl-top` (alc + name + mom + score-row + layer-help) + `vinyl-layers` (4 pills) + `vinyl-facts` (3 rows) + `vinyl-lifeline` (label + Lifeline SVG + ends) + `vinyl-foot` (2 stats + cta circle).

**Props VinylTile**: `{c: Colonia, index: number}`.
**Estados**: `layerK: 'LIV' | 'MOV' | 'SEC' | 'ECO'` (default 'LIV').
**Animaciones**: hover translateY(-6) + sh-card. Layer switcher pill transitions. Lifeline static SVG (no animation; CountUp NO usado aquí).
**Token deps**: gradient, indigo trio, border, cream, success.
**A11y items**: 8.
**Adaptación DMX**:
- Outer shell: Server Component fetch zone scores tRPC.
- VinylTile: Client (layer state).
- Lifeline SVG: puro funcional, puede ser Server.
- LAYERS hardcoded por ahora; idealmente desde catalog `score_taxonomy` table.

## C9 — ColoniaComparator.jsx (Radar Battle)

**Estructura outer**: `<section battle-wrap>` → header + FadeUp howto (3 steps) + FadeUp battle-grid (side A | center radar | side B).

**RadarChart**: SVG 340×340 con 5 polygon rings + 6 spokes + scale text (50, 100) + axis labels + 2 polygons (A, B) en `<g style={{mixBlendMode:'plus-lighter'}}>` + dots per vertex + center dot.

**Props RadarChart**: `{slotA, slotB, highlight, color1, color2, animKey}`.
**Estados ColoniaComparator**: `aKey, bKey, highlight: string|null`.
**Animaciones**: BlurText H2, FadeUp howto + battle-grid, polygon transition .8s, axis-help fade, picker active transition, Ticker (price interpolation 600ms).
**Token deps**: `--cream`, `--cream-3`, `--cream-2`, `--indigo`, `--rose`, `--grad`, success/danger text, dynamic per-colonia color (`#6366F1, #EC4899, #22C55E, #F59E0B, #818CF8, #F472B6, #34D399, #FB923C`).
**A11y items**: 9.
**Adaptación DMX**:
- Outer Server Component (fetch RADAR_DATA tRPC).
- Inner Client (selección state + Ticker animation).
- Radar SVG accessible (title + desc + axis text alternatives).
- AXIS_HELP literals → i18n keys.

## C10 — PropertyListings.jsx (incluye PropertyCard + PhotoScene)

**Estructura outer**: `<section>` → header + StaggerContainer.pcard-grid > PropertyCard×N.

**PropertyCard estructura**: `<div pcard>` → `pcard-photo` (track con slides + 4 overlays: arrows, save, tag, momentum, dots) + `pcard-body` (loc, title, meta-grid 4 items, price-row, scores-grid 3, footer asesor + CTA).

**PhotoScene**: SVG estilizado por scene type (building, interior, view, garden) — placeholder visual hasta tener fotos reales.

**Props PropertyCard**: `{p: Property, index: number}`.
**Estados**: `idx: number` (carousel), `saved: boolean` (heart toggle).
**Animaciones**: hover translateY(-4) + border accent + shadow. Carousel slide transition .5s. Save heart toggle. Dots width transition.
**Token deps**: gradient, indigo trio, success-text, cream variants, dynamic accent per card.
**A11y items**: 9.
**Adaptación DMX**:
- Outer Server Component (fetch propiedades tRPC + i18n).
- PropertyCard Client (state carousel + save).
- PhotoScene SVG → reemplazar por `<Image>` next/image cuando hay fotos reales (M19 backend).
- formatCurrency `fmtMXN` → shared formatter por locale.

## C11 — IntelligenceEngine.jsx

**Estructura**: `<section ie-wrap>` → ie-grid 2 col → left (eyebrow + BlurText H2 + sub + StaggerContainer features 3 rows) + right (ie-panel: head + score-big + bars 6 + cta).

**Props**: ninguno.
**Estados**: ninguno (data hardcoded IE_BARS).
**Animaciones**: BlurText H2, FadeUp eyebrow + sub + panel, StaggerContainer features (0.1s), AnimatedBar staggered (0.1s × i, duration 1.2s).
**Token deps**: indigo trio, success, gradient, success-text, danger-text.
**A11y items**: 6.
**Adaptación DMX**:
- Outer Server (fetch demo zone scores).
- AnimatedBar Client (intersection observer + width transition).
- Bars data → desde `colonia_scores` table real.

## C12 — Stats.jsx

**Estructura**: `<section>` → FadeUp → stats-card (radial glow ::before + stats-grid 4 cols + stats-footer).

**Props**: ninguno.
**Estados**: ninguno (CountUp internal).
**Animaciones**: FadeUp wrap, CountUp 1.8s easeOut, dividers static.
**Token deps**: `--bg`, `--border`, `--cream-2`, `--cream-3`, gradient.
**A11y items**: 4.
**Adaptación DMX**: Server shell + CountUp Client (per stat). Datos dinámicos desde tRPC (count of variables, sources, colonias, processing time).

## C13 — Testimonials.jsx

**Estructura**: `<section>` → eyebrow + BlurText H2 + 2 marquee rows (track normal 28s + track slow reverse 34s) con TCard×N×2.

**Props TCard**: `{t: Testimonial}`.
**Estados**: ninguno.
**Animaciones**: BlurText H2, marquee CSS infinite, pause on hover.
**Token deps**: glass card vars, `--cream`, `--cream-3`, dynamic avatar gradient.
**A11y items**: 5.
**Adaptación DMX**: Server Component (CSS-only). `<blockquote>` + `<cite>` semantic. `prefers-reduced-motion` paused.

## C14 — Faq.jsx

**Estructura**: `<section>` → faq-grid 2 col (sticky left tag + BlurText H2 + sub + cta button | right accordion 7 items).

**AccItem**: button trigger + content-wrap con max-height transition.

**Props AccItem**: `{q, a, open, onToggle}`.
**Estados Faq**: `open: number` (index abierto).
**Animaciones**: BlurText H2, FadeUp left col, accordion height transition .35s, chevron rotate.
**Token deps**: indigo-3, cream variants, border subtle.
**A11y items**: 7.
**Adaptación DMX**:
- Outer Server, accordion Client (state + height calc).
- Pattern accessible: `aria-expanded`, `aria-controls`, semantic `<dl>`.
- Keyboard: Up/Down navigation entre triggers, ESC.

## C15 — CtaFooter.jsx

**Estructura**: `<>` → cta-section (FadeUp tag + BlurText H2 + FadeUp sub + FadeUp ctas) + footer (gradient line top + footer-inner: brand | links | copyright).

**Props**: ninguno.
**Estados**: ninguno.
**Animaciones**: FadeUp staggered (0.3s, 0.5s).
**Token deps**: gradient, `--bg`, `--bg-2`, `--cream-3`.
**A11y items**: 5.
**Adaptación DMX**: Server. CTA H2 italic. Footer global cross-portal (apps/portal-publico/footer.tsx).

## C16 — MapOverlay.jsx

**Estructura**: `<div map-overlay-wrap>` (absolute bottom-left hero) → map-bg (grid + radial zones + decorative) + glass map-card (ping + head + 6-score grid + link).

**Props**: ninguno (data hardcoded).
**Estados**: ninguno.
**Animaciones**: ping CSS infinite 2s.
**Token deps**: glass vars, indigo, rose, success, cream variants.
**A11y items**: 4.
**Adaptación DMX**: Server. Para landing M19, datos demo. Real Mapbox integration vive en M17.

## C17 — CustomCursor.jsx — SKIP

Ver §11 (no portar).

---

# Fin Sección 1.
