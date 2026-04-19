# FASE 04 — Design System Dopamine

> **Duración estimada:** 3.5 sesiones Claude Code (~7 horas con agentes paralelos) — incluye módulo 4.P refinement post-competitive analysis Findperty (ADR-023)
> **Dependencias:** [FASE 00 — Bootstrap](./FASE_00_BOOTSTRAP.md), [FASE 03 — AI-Native Shell](./FASE_03_AI_NATIVE_SHELL.md)
> **Bloqueantes externos:**
> - Fuentes Outfit + DM Sans + JetBrains Mono descargadas y self-hosted en `public/fonts/` (o cargadas via `next/font/google`)
> - Mapbox token (`NEXT_PUBLIC_MAPBOX_TOKEN`) — solo para el componente `MiniMap` del DS (uso ligero; heavy maps en Fase 08+)
> - Revisión visual con Manu del `/design-system` preview page antes de cerrar la fase
> - Referencias: `docs/biblia-v5/dmx-dopamine-v2.jsx` (landing) y módulos Dopamine M1-M9 (en repo viejo archivado)
> - Revisión visual del módulo 4.P en `/design-system` con Manu antes de cerrar (pre-implementación FASE 20)
> **Resultado esperado:** Design System Dopamine completo: tokens CSS-first, primitives (Button/Card/Input/Select/Badge/Dialog/Sheet/Dropdown/Tooltip/Toast), capa Dopamine (Card3D con perspective, AnimNum, FloatingShapes, ParticleField, Btn shimmer, Label pill), layouts (AppShell, Sidebar 60↔240, Header 54, ContentGrid 1100px, AICopilot integrado de Fase 03), dark mode via CSS vars, preview `/design-system` solo dev, a11y baseline con `prefers-reduced-motion` respetado. Tag `fase-04-complete`.
> **Priority:** [H1]

## Contexto y objetivo

El Design System es la identidad visual del producto. "Dopamine" refiere a la capa de delight: Card3D con rotateX/Y ±12° en hover, AnimNum con IntersectionObserver, ParticleField canvas, gradientes OKLCH, sombras glow, animaciones shimmer. La capa de primitives es sobria y accesible. La capa Dopamine se aplica solo en contextos visual-hero (landing, dashboards, cards destacadas). Todo diseño futuro de Fases 13+ consume estos componentes — no se permite rebuild de primitives.

## Bloques

### BLOQUE 4.A — Tokens Dopamine completos

(Ya iniciado en Fase 00 Bloque 0.C — aquí se expande y formaliza.)

#### MÓDULO 4.A.1 — Revisar y expandir `styles/tokens.css`

**Pasos:**
- `[4.A.1.1]` Validar existencia de `@theme { ... }` con los tokens de Fase 00 — si falta algo, agregarlo.
- `[4.A.1.2]` Agregar tokens de animación adicionales:
  - `--motion-enter: 300ms cubic-bezier(0.22, 1, 0.36, 1);`
  - `--motion-exit: 200ms cubic-bezier(0.4, 0, 1, 1);`
  - `--motion-bounce: 600ms cubic-bezier(0.68, -0.55, 0.265, 1.55);`
- `[4.A.1.3]` Agregar variables semantic layer (propósito UI, no solo color):
  - `--color-surface-base`, `--color-surface-raised`, `--color-surface-sunken`.
  - `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, `--color-text-inverse`.
  - `--color-border-subtle`, `--color-border-strong`, `--color-border-focus`.
  - `--color-state-hover-overlay`, `--color-state-active-overlay`, `--color-state-selected-bg`.
- `[4.A.1.4]` Variante oscura en `:root.dark` con overrides — reduce saturación y ajusta luminosidades OKLCH.
- `[4.A.1.5]` Exportar TypeScript const de tokens en `shared/ui/tokens.ts` con `const tokens = { color: { brandPrimary: 'var(--color-brand-primary)', ... } } as const;` para uso programático (ej: Recharts colors).

**Criterio de done del módulo:**
- [ ] `styles/tokens.css` con ≥ 100 CSS vars.
- [ ] `shared/ui/tokens.ts` en paridad con CSS vars.
- [ ] Dark mode invertido no rompe contrastes.

### BLOQUE 4.B — Primitives `shared/ui/primitives/`

Base accesible, neutral, reutilizable. Inspirada en Radix UI patterns pero con estética Dopamine.

#### MÓDULO 4.B.1 — Button

**Pasos:**
- `[4.B.1.1]` Crear `shared/ui/primitives/Button.tsx` con variantes `'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger' | 'success'`, sizes `'sm' | 'md' | 'lg'`, props `leftIcon`, `rightIcon`, `isLoading`, `isDisabled`, `fullWidth`.
- `[4.B.1.2]` Styles via Tailwind + tokens: `rounded-lg bg-[var(--color-brand-primary)] text-white ...`.
- `[4.B.1.3]` Focus ring visible: `focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2`.
- `[4.B.1.4]` Loading: spinner + disabled state.
- `[4.B.1.5]` `asChild` prop con Radix `Slot` para permitir `<Link>` heredar estilos.

**Criterio de done del módulo:**
- [ ] 6 variantes + 3 sizes × estados (default/hover/active/disabled/loading).
- [ ] Accessible: rol `button`, aria-disabled, aria-busy.

#### MÓDULO 4.B.2 — Card

**Pasos:**
- `[4.B.2.1]` Crear `shared/ui/primitives/Card.tsx` con subcomponentes `Card.Root`, `Card.Header`, `Card.Body`, `Card.Footer`, `Card.Title`, `Card.Description`.
- `[4.B.2.2]` Variantes `'default' | 'elevated' | 'outlined' | 'filled' | 'glass'`.
- `[4.B.2.3]` Glass variant: `backdrop-blur-md bg-white/60 border border-white/40`.

**Criterio de done del módulo:**
- [ ] Composición `<Card.Root><Card.Header>...</Card.Header></Card.Root>` funciona.

#### MÓDULO 4.B.3 — Input + Textarea + NumberInput

**Pasos:**
- `[4.B.3.1]` `Input`: `type='text'|'email'|'password'|'tel'|'url'`, props `label`, `error`, `helperText`, `leftIcon`, `rightAddon`, `size`.
- `[4.B.3.2]` Integración directa con `react-hook-form`: forwardRef + aria-invalid + aria-describedby para error.
- `[4.B.3.3]` `Textarea` con `autoResize` opcional.
- `[4.B.3.4]` `NumberInput` con `currency` prop (usa `Intl.NumberFormat` con currency del user).

**Criterio de done del módulo:**
- [ ] Label above + error below + estados focus/error visibles.
- [ ] RHF integration funciona: `<Controller render={({ field }) => <Input {...field} />} />`.

#### MÓDULO 4.B.4 — Select + Combobox + MultiSelect

**Pasos:**
- `[4.B.4.1]` `Select`: usa `@radix-ui/react-select` con trigger estilizado + items + check marks.
- `[4.B.4.2]` `Combobox`: con `cmdk` (reusar de Fase 03) para búsqueda interna.
- `[4.B.4.3]` `MultiSelect`: combobox + chips de selección.
- `[4.B.4.4]` Props uniformes: `options: Array<{value, label, icon?}>`, `value`, `onChange`, `placeholder`, `emptyState`.

**Criterio de done del módulo:**
- [ ] Keyboard nav completa (arrow up/down, enter, escape, type-ahead).

#### MÓDULO 4.B.5 — Badge + Tag + Chip

**Pasos:**
- `[4.B.5.1]` `Badge`: indicador estado (size xs/sm/md, variants success/warning/danger/info/neutral + gradient).
- `[4.B.5.2]` `Tag`: con icono + texto + optional `onRemove` (×).
- `[4.B.5.3]` `Chip`: pill selector (on/off toggle).

**Criterio de done del módulo:**
- [ ] 3 componentes exportados y documentados.

#### MÓDULO 4.B.6 — Dialog + Sheet + Drawer

**Pasos:**
- `[4.B.6.1]` `Dialog` (modal central) con `@radix-ui/react-dialog`: overlay blur + scale-in animation.
- `[4.B.6.2]` `Sheet` (slide desde lado) con direction `'left'|'right'|'top'|'bottom'`.
- `[4.B.6.3]` `Drawer` (mobile bottom sheet) con drag handle.
- `[4.B.6.4]` Focus trap + escape to close + aria-labelledby/describedby.

**Criterio de done del módulo:**
- [ ] 3 componentes con animaciones Dopamine.

#### MÓDULO 4.B.7 — Dropdown + Popover + Tooltip

**Pasos:**
- `[4.B.7.1]` `Dropdown`: menu contextual con Radix.
- `[4.B.7.2]` `Popover`: container flotante con content libre.
- `[4.B.7.3]` `Tooltip`: con delay 400ms + keyboard dismiss.

**Criterio de done del módulo:**
- [ ] 3 componentes con positioning automático (anti-viewport overflow).

#### MÓDULO 4.B.8 — Toast system

**Pasos:**
- `[4.B.8.1]` Instalar `sonner`: `npm i sonner`.
- `[4.B.8.2]` Wrapper `shared/ui/primitives/Toast.tsx` con API `toast.success(msg, { description, action })`, `toast.error`, `toast.info`, `toast.loading`.
- `[4.B.8.3]` Insertar `<Toaster />` en `app/layout.tsx`.
- `[4.B.8.4]` Estilos alineados a tokens Dopamine.

**Criterio de done del módulo:**
- [ ] `toast.success('Hecho')` aparece bottom-right con animación.

### BLOQUE 4.C — Capa Dopamine `shared/ui/dopamine/`

#### MÓDULO 4.C.1 — Card3D

**Pasos:**
- `[4.C.1.1]` Crear `shared/ui/dopamine/Card3D.tsx`:
  ```typescript
  'use client';
  export function Card3D({ children }: { children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const handleMove = (e: React.MouseEvent) => {
      if (useReducedMotion()) return;
      const rect = ref.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      ref.current!.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) scale(1.02)`;
    };
    const reset = () => { if (ref.current) ref.current.style.transform = ''; };
    return <div ref={ref} onMouseMove={handleMove} onMouseLeave={reset} style={{ transition: 'transform 250ms var(--ease-dopamine)' }}>{children}</div>;
  }
  ```
- `[4.C.1.2]` Respetar `prefers-reduced-motion` (hook `useReducedMotion` via `framer-motion` o CSS query).

**Criterio de done del módulo:**
- [ ] Hover rota el card; fuera de hover resetea.
- [ ] Reduced motion desactiva efecto.

#### MÓDULO 4.C.2 — AnimNum

**Pasos:**
- `[4.C.2.1]` Crear `AnimNum.tsx` que anima de 0 al valor target cuando entra en viewport (IntersectionObserver).
- `[4.C.2.2]` Props: `value`, `format='number'|'currency'|'percent'`, `duration`, `delay`, `decimals`.
- `[4.C.2.3]` Uso: `<AnimNum value={stats.commission} format="currency" />` en dashboard cards.

**Criterio de done del módulo:**
- [ ] Numero cuenta de 0 a target con easing.

#### MÓDULO 4.C.3 — FloatingShapes

**Pasos:**
- `[4.C.3.1]` Crear `FloatingShapes.tsx` con 3-5 SVG blobs posicionados absoluto, animados con `@keyframes float-y` (from Fase 00) con delays desfasados.
- `[4.C.3.2]` Uso: background decoration de hero sections.

**Criterio de done del módulo:**
- [ ] Blobs flotan suavemente.

#### MÓDULO 4.C.4 — ParticleField

**Pasos:**
- `[4.C.4.1]` Crear `ParticleField.tsx` canvas full-width con partículas conectadas por líneas (inspirado en particles.js).
- `[4.C.4.2]` Max 60 partículas, desactivado on reduced-motion o viewport < 768px (performance).

**Criterio de done del módulo:**
- [ ] Canvas renderiza partículas.
- [ ] Desactivado en mobile.

#### MÓDULO 4.C.5 — Btn con shimmer

**Pasos:**
- `[4.C.5.1]` Variante `shimmer` del `Button` primitive: overlay con `@keyframes shimmer` background-position.
- `[4.C.5.2]` Uso: CTAs clave ("Contratar plan", "Hablar con asesor").

**Criterio de done del módulo:**
- [ ] Brillo recorre el botón cada 3s.

#### MÓDULO 4.C.6 — Label pill

**Pasos:**
- `[4.C.6.1]` Crear `LabelPill.tsx`: pill redondeada con gradient background + icono + texto (ej: "AI Match 92%", "Certificado SAT").

**Criterio de done del módulo:**
- [ ] Pill con gradient y shadow-glow.

### BLOQUE 4.D — Layouts `shared/ui/layout/`

#### MÓDULO 4.D.1 — AppShell

**Pasos:**
- `[4.D.1.1]` Crear `AppShell.tsx` con slots: `<Sidebar/>`, `<Header/>`, `<Content/>`, `<AICopilot/>`.
- `[4.D.1.2]` Grid CSS: `grid-template-columns: var(--spacing-sidebar-collapsed) 1fr var(--spacing-copilot-collapsed); grid-template-rows: var(--spacing-header) 1fr;`.
- `[4.D.1.3]` Cuando Sidebar expanded: ajustar col a `var(--spacing-sidebar-expanded)` con transition.
- `[4.D.1.4]` Cuando Copilot expanded: ajustar col a `var(--spacing-copilot-expanded)`.

**Criterio de done del módulo:**
- [ ] Layout responsive: mobile < 768px colapsa sidebar a bottom nav.
- [ ] Transiciones smooth.

#### MÓDULO 4.D.2 — Sidebar 60↔240px glass

**Pasos:**
- `[4.D.2.1]` Crear `Sidebar.tsx` con state `collapsed | expanded` via Zustand.
- `[4.D.2.2]` Glass: `backdrop-blur-xl bg-white/70 dark:bg-neutral-900/70 border-r border-[var(--color-border-subtle)]`.
- `[4.D.2.3]` Items: icon 24px + label (hidden en collapsed) + badge count + indicator activo (bar izquierda gradient).
- `[4.D.2.4]` Hover expand on desktop; click expand en mobile.

**Criterio de done del módulo:**
- [ ] Sidebar transiciona 60↔240 smooth.

#### MÓDULO 4.D.3 — Header 54px glass sticky

**Pasos:**
- `[4.D.3.1]` Crear `Header.tsx` sticky top con altura 54px, glass backdrop.
- `[4.D.3.2]` Slots: `<BreadcrumbSlot/>`, `<SearchSlot/>` (⌘K trigger), `<LocaleSwitcher/>`, `<CurrencySwitcher/>`, `<NotificationsBell/>`, `<ProfileMenu/>`.
- `[4.D.3.3]` `NotificationsBell` muestra count unread (tRPC `notifications.unreadCount.useQuery`).

**Criterio de done del módulo:**
- [ ] Header sticky + sombra al scroll.

#### MÓDULO 4.D.4 — ContentGrid 1100px

**Pasos:**
- `[4.D.4.1]` `ContentGrid.tsx`: wrapper con `max-w-[var(--content-max)] mx-auto px-6` + grid 12-col opcional via prop `cols={3|4|12}`.

**Criterio de done del módulo:**
- [ ] Contenido centrado a 1100px max.

#### MÓDULO 4.D.5 — AICopilot (de Fase 03)

Ya construido en Fase 03. Aquí se verifica integración con AppShell.

**Pasos:**
- `[4.D.5.1]` Importar `<AICopilot/>` de `shared/ui/layout/AICopilot.tsx` (Fase 03).
- `[4.D.5.2]` AppShell incluye como slot derecho fijo.

**Criterio de done del módulo:**
- [ ] Copilot visible en AppShell.

### BLOQUE 4.E — Dark mode

#### MÓDULO 4.E.1 — ThemeProvider + toggle

**Pasos:**
- `[4.E.1.1]` Instalar `next-themes`: `npm i next-themes`.
- `[4.E.1.2]` Wrap `app/layout.tsx` con `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`.
- `[4.E.1.3]` Toggle en `ProfileMenu`: `'system' | 'light' | 'dark'`.
- `[4.E.1.4]` Persistir preferencia en `profiles.meta.theme`.

**Criterio de done del módulo:**
- [ ] Toggle cambia tema sin flicker.
- [ ] System respeta media query.

### BLOQUE 4.F — Storybook-like preview `/design-system`

#### MÓDULO 4.F.1 — Página dev-only

**Pasos:**
- `[4.F.1.1]` Crear `app/(dev)/design-system/page.tsx` con toggle `process.env.NODE_ENV === 'development'` — redirect 404 en prod.
- `[4.F.1.2]` Renderizar secciones:
  - Tokens (palette swatches, gradientes, fuentes).
  - Primitives (todas las variantes side by side).
  - Dopamine (Card3D demo, AnimNum counter, ParticleField canvas, Shimmer button).
  - Layouts (AppShell preview con Sidebar expanded/collapsed).
- `[4.F.1.3]` Toggle dark mode inline para comparar.

**Criterio de done del módulo:**
- [ ] `/design-system` renderiza todos los componentes.
- [ ] Prod devuelve 404.

### BLOQUE 4.G — Accessibility baseline

#### MÓDULO 4.G.1 — Audit a11y

**Pasos:**
- `[4.G.1.1]` Instalar `@axe-core/react` en dev: `npm i -D @axe-core/react`.
- `[4.G.1.2]` Wrap root en dev para logear violaciones en console.
- `[4.G.1.3]` Lighthouse score accessibility ≥ 95 en `/design-system`.
- `[4.G.1.4]` Verificar:
  - Semantic HTML (`<nav>`, `<main>`, `<aside>`, `<article>`).
  - Aria labels en icons-only buttons.
  - Focus ring visible en todos los interactivos.
  - Contrast ≥ 4.5:1 (texto normal), ≥ 3:1 (large text).
  - `prefers-reduced-motion` respetado en Card3D, ParticleField, FloatingShapes, AnimNum.
- `[4.G.1.5]` Playwright test `tests/e2e/a11y.spec.ts` con `@axe-core/playwright` en `/design-system`.

**Criterio de done del módulo:**
- [ ] Axe viola = 0 en `/design-system`.
- [ ] Lighthouse a11y ≥ 95.

### BLOQUE 4.P — Design System Refinement (post-competitive analysis Findperty 2026-04-19)

> Implementa decisiones de [ADR-023 Design System Refinement](../01_DECISIONES_ARQUITECTONICAS/ADR-023_DESIGN_SYSTEM_REFINEMENT.md). Componentes nuevos para soportar Progressive Preference Discovery ([ADR-021](../01_DECISIONES_ARQUITECTONICAS/ADR-021_PROGRESSIVE_PREFERENCE_DISCOVERY.md)) y Vibe Tags Hybrid ([ADR-022](../01_DECISIONES_ARQUITECTONICAS/ADR-022_VIBE_TAGS_HYBRID.md)). Esta extensión es no-breaking sobre tokens y primitives existentes — todo es aditivo.

#### MÓDULO 4.P.1 — Tokens update en `styles/tokens.css`

Pasos:
- [4.P.1.1] Declarar variant `--radius-full: 9999px` (si no existe ya) y `--radius-pill` alias de `--radius-full` para semántica.
- [4.P.1.2] Agregar shadow-wow con acento coral warm:
  ```
  --shadow-wow-inner: 0 0 14px 0 rgba(217, 119, 87, 0.55) inset, 0 0 24px 0 rgba(217, 119, 87, 0.40) inset;
  --shadow-wow-outer: 0 40px 80px 0 rgba(217, 119, 87, 0.20), 0 4px 14px 0 rgba(217, 119, 87, 0.20);
  --shadow-wow: var(--shadow-wow-inner), var(--shadow-wow-outer);
  ```
- [4.P.1.3] Toast tier tokens (info/success/celebration colors + confetti trigger flag):
  ```
  --toast-info-bg / --toast-info-fg / --toast-info-border
  --toast-success-bg (lime/emerald) / --toast-success-fg / --toast-success-icon
  --toast-celebration-bg (gradient) / --toast-celebration-fg / --toast-celebration-emoji-default
  --toast-celebration-confetti: 1; (flag CSS para hook React)
  ```
- [4.P.1.4] Density tokens: `--spacing-density-comfortable` (×1.3 sobre base) y `--spacing-density-compact` (×1.0). Toggle en root con `data-density="comfortable|compact"`.

Criterio de done del módulo:
- [ ] tokens.css con +10 nuevas vars sin romper existing.
- [ ] Dark mode invertido respeta nuevos tokens.

#### MÓDULO 4.P.2 — Componentes nuevos `shared/ui/dopamine/`

Pasos:
- [4.P.2.1] **VibeTagChip** (`shared/ui/dopamine/VibeTagChip.tsx`): icon + label + valor cuantitativo opcional + ConfidenceBadge inline. Props: `code`, `label`, `value?`, `confidence`, `dataSource?`, `onClick?`. Variants: `default | filter-active | edited`.
- [4.P.2.2] **MatchScoreBreakdown** (`shared/ui/dopamine/MatchScoreBreakdown.tsx`): visualiza 6 dimensiones (Emocional/Técnico/Urbano/Financiero/Espacial/Inversión) con barras coloreadas + reasons expandibles per dim + data sources cited. Props: `dimensions: Record<dim, {score, weight, reasons: Array<{source, value}>, confidence}>`.
- [4.P.2.3] **ProgressBarMultiSegment** (`shared/ui/dopamine/ProgressBarMultiSegment.tsx`): para Capa 1 onboarding PPD. Props: `segments: number`, `current: number`, `labels?: string[]`. Soporta micro-onboarding 5 pasos.
- [4.P.2.4] **ToastCelebration** (`shared/ui/dopamine/ToastCelebration.tsx`): variant especial del toast system (`shared/ui/primitives/Toast.tsx`) con confetti opt-in + emoji + auto-dismiss 6s. Respeta `prefers-reduced-motion` (sin confetti).
- [4.P.2.5] **PropertyStory** (`shared/ui/dopamine/PropertyStory.tsx`): narrative block con AI-generated badge + edit button para owner/asesor. Props: `text`, `aiGenerated`, `editable`, `onEdit?`. Soporta markdown limitado.
- [4.P.2.6] **RadarChart6D** (`shared/ui/dopamine/RadarChart6D.tsx`): basado en Recharts. 6 ejes fijos (Emocional/Técnico/Urbano/Financiero/Espacial/Inversión). Props: `values: Record<dim, number>`, `confidenceByDim?: Record<dim, ConfidenceLevel>`, `compareTo?: Record<dim, number>` para co-match.
- [4.P.2.7] **ConfidenceBadge** (`shared/ui/dopamine/ConfidenceBadge.tsx`): visual high/medium/low/insufficient con tooltip explicativo. Reusable en MatchScoreBreakdown, RadarChart6D, VibeTagChip.

Criterio de done del módulo:
- [ ] 7 componentes exportados desde `shared/ui/dopamine/index.ts`.
- [ ] Cada componente con story en `/design-system` preview.
- [ ] Cada componente con `prefers-reduced-motion` respetado donde aplique.

#### MÓDULO 4.P.3 — Refactor primitives existentes

Pasos:
- [4.P.3.1] **Button**: agregar variant `pill` (rounded-full, padding ajustado para hit-target ≥44px). NO descontinuar variants existentes.
- [4.P.3.2] **Input**: agregar variant `pill` (rounded-full) específicamente para search bars y filtros.
- [4.P.3.3] **Card**: agregar prop `lowChrome` (boolean): aplica regla "border subtle OR shadow sutil, nunca ambos". Default `false` (mantiene backward compat).
- [4.P.3.4] **Text** (si existe primitive): default `SolidText`. `GradientText` queda variant explícita reservada para hero principal y display numbers.
- [4.P.3.5] **Modal/Sheet**: simplificar shadow stack a max 2 layers.

Criterio de done del módulo:
- [ ] 5 primitives extendidos sin breaking changes.
- [ ] Tests visuales side-by-side antes/después en `/design-system`.

#### MÓDULO 4.P.4 — E2E mapping en 03.13

Pasos:
- [4.P.4.1] Agregar 7 components nuevos a `docs/03_CATALOGOS/03.13_E2E_CONNECTIONS_MAP.md` bajo "FASE 04 — Design System (módulo 4.P)" — cada row con UI Component, Route (típicamente `/design-system` para preview, consumido en FASE 20-21), Handler (props), tRPC Procedure (— para components puros), DB Op (—), Cascades (—), Audit Log (—), Notifs (—), Permissions (public/auth), Tests (path Playwright a11y), Status (active).

Criterio de done del módulo:
- [ ] 7 rows nuevas en 03.13 con todas las columnas.

#### MÓDULO 4.P.5 — A11y refresh + Lighthouse

Pasos:
- [4.P.5.1] Re-run Lighthouse a11y en `/design-system` con componentes nuevos visibles. Target ≥95.
- [4.P.5.2] Re-run `@axe-core/playwright` test — target 0 violations.
- [4.P.5.3] Verificar contrast ratios: ConfidenceBadge low (color amarillo) ≥3:1 sobre bg cards.

Criterio de done del módulo:
- [ ] Lighthouse a11y ≥95 mantenido.
- [ ] Axe violations = 0.

## Criterio de done de la FASE

- [ ] Tokens Dopamine expandidos (≥ 100 CSS vars) + exportados en TS.
- [ ] 10 primitives exportados desde `shared/ui/primitives/`.
- [ ] 6 componentes Dopamine (Card3D, AnimNum, FloatingShapes, ParticleField, Shimmer Btn, Label pill).
- [ ] 4 layouts (AppShell, Sidebar, Header, ContentGrid) + AICopilot integrado.
- [ ] Dark mode operativo con `next-themes`.
- [ ] Preview `/design-system` renderiza todo (solo dev).
- [ ] Lighthouse a11y ≥ 95 en `/design-system`.
- [ ] `prefers-reduced-motion` respetado.
- [ ] Playwright test a11y verde.
- [ ] BLOQUE 4.P aplicado: tokens nuevos + 7 componentes Dopamine nuevos + refactor primitives + 7 rows en 03.13 + a11y verde post-refinement.
- [ ] Tag git: `fase-04-complete`.

## Features implementadas en esta fase (≈ 22)

1. **F-04-01** Tokens Dopamine expandidos (tipografía, colors, gradients, tints, shadows, radii, spacing, durations, easings, keyframes)
2. **F-04-02** Button primitive (6 variants, 3 sizes, asChild)
3. **F-04-03** Card primitive con subcomponentes + glass variant
4. **F-04-04** Input/Textarea/NumberInput con RHF + Intl
5. **F-04-05** Select/Combobox/MultiSelect con keyboard nav
6. **F-04-06** Badge/Tag/Chip
7. **F-04-07** Dialog/Sheet/Drawer con focus trap
8. **F-04-08** Dropdown/Popover/Tooltip
9. **F-04-09** Toast system (sonner)
10. **F-04-10** Card3D con rotateX/Y ±12° perspective 800
11. **F-04-11** AnimNum con IntersectionObserver
12. **F-04-12** FloatingShapes + ParticleField canvas
13. **F-04-13** AppShell + Sidebar 60↔240 glass + Header 54 + ContentGrid 1100
14. **F-04-14** Dark mode via next-themes + tokens override
15. **F-04-15** Preview `/design-system` dev-only + a11y baseline ≥ 95
16. **F-04-16** Tokens shadow-wow coral + density toggle + toast tier tokens
17. **F-04-17** VibeTagChip component (icon + label + value + confidence)
18. **F-04-18** MatchScoreBreakdown 6D con reasons expandibles + data sources
19. **F-04-19** ProgressBarMultiSegment (PPD onboarding capa 1)
20. **F-04-20** ToastCelebration con confetti opt-in (reduced-motion respect)
21. **F-04-21** PropertyStory + RadarChart6D + ConfidenceBadge
22. **F-04-22** Refactor Button/Input pill variants + Card lowChrome + Modal less chrome

## Próxima fase

[FASE 05 — i18n y Multi-country](./FASE_05_I18N_Y_MULTICOUNTRY.md)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent C) | **Fecha:** 2026-04-17
