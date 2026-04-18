# ADR-005 — State management: RSC + tRPC + Zustand + URL + RHF

**Status:** Accepted
**Date:** 2026-04-17
**Deciders:** Manu Acosta (founder), Claude Opus 4.7 (Senior Review)

## Context

Next.js 16 App Router con React 19 y Server Components (RSC) redefine qué es "estado" en una aplicación web:

- **Server state** (datos que viven en Supabase) puede renderizarse directamente en Server Components sin hidratación, o bien consumirse desde Client Components con tRPC + React Query.
- **Client state** (UI state: modales abiertos, filtros locales, tabs seleccionadas) vive sólo en el navegador.
- **URL state** (searchParams, path params) es shareable y bookmarkable.
- **Form state** (valores de inputs, validaciones, errores) tiene su propio ciclo de vida.

El producto DMX tiene múltiples tipos de estado con necesidades distintas:

- **Data-heavy**: lists de contactos, busquedas, captaciones, operaciones (M3-M8), con paginación/filtros/sort.
- **Realtime**: inventario del desarrollador con `useRealtimeUnits` (supabase realtime), notificaciones in-app.
- **Forms complejos**: wizard 6 pasos de Operaciones (M8), editor 6 secciones de Captaciones (M5), formularios Dev con >50 campos.
- **Cross-component state**: Copilot open/closed, Command Palette ⌘K global, sidebar collapsed state, preferences (timezone/currency/locale).
- **URL state**: filtros de `/contactos?temperatura=caliente&tag=inversor`, drawer de métricas `/dashboard?metrics=true`.
- **Client-only ephemeral**: drag-and-drop en Kanban M4/M5, selección múltiple en tablas, hover states.

El repo viejo mezcla inconsistentemente `useState` + Context API + props drilling + tRPC useQuery + algún Zustand puntual. Sin patrón firme, cada agente paralelo podría elegir distinto, generando divergencia rápida.

## Decision

Se adopta un **stack state-management de 5 capas con reglas firmes por tipo de estado**:

### D1. Server state → React Server Components (RSC) + tRPC useQuery

- **Páginas por defecto son Server Components** (Next.js 16 App Router convention). Fetch directo desde Supabase vía helpers en `shared/lib/supabase/server.ts` cuando la página es estática o semi-estática.
- **Client-side server state** vía `@trpc/react-query` (tRPC client 11 con TanStack Query v5 integrado). Patrón: `trpc.contactos.list.useQuery({ ... })`.
- **Prefetch con `trpc.ssrPrefetch()`** en Server Components para hidratar React Query cache en cliente.
- **Cache Components (Next.js 16 `use cache`)** para datos estables per-request (lista de estados, supported_countries, feature_registry): marcar con `cacheLife` y `cacheTag` apropiados.
- **Invalidación**: `utils.<router>.invalidate()` tras mutations. Patrón en `features/<X>/hooks/use<X>Mutation.ts`.

### D2. Client state global (fine-grained) → Zustand

Zustand para stores cross-feature con **slices por dominio**:

```typescript
// shared/stores/ui.ts
interface UIStore {
  copilotOpen: boolean
  setCopilotOpen: (open: boolean) => void
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

// shared/stores/preferences.ts
interface PreferencesStore {
  locale: Locale
  currency: Currency
  timezone: string
  setLocale: (locale: Locale) => void
  setCurrency: (currency: Currency) => void
}
```

- **Un store por concern** (UI state, preferences, auth session cache). Evitar "god store".
- **Persist middleware** para preferences (localStorage) — no para UI state efímero.
- **Devtools** habilitado sólo en development.
- **No Zustand para form state** (que va a react-hook-form) ni para server state (que va a tRPC useQuery).

### D3. Client state local → `useState` / `useReducer`

- **`useState`** para estado simple contenido en un componente (modal abierto, tab seleccionado, hover state).
- **`useReducer`** cuando hay >3 transiciones de estado relacionadas (wizard pasos, Kanban drag logic).
- Evitar Context API excepto para theming y para providers globales (tRPC, next-intl). Context tiene mala performance cuando el valor cambia frecuentemente.

### D4. URL state (shareable) → Next.js `searchParams` + helpers tipados

- **Filtros, sort, pagination** van a `searchParams` para ser shareable/bookmarkable.
- Helpers en `shared/lib/url/` para leer/escribir con tipo fuerte:
  ```typescript
  const filters = useContactosFilters(searchParams)  // { temperatura, tags, page, sort }
  const { setFilter } = useContactosFiltersActions()
  ```
- **Validación con Zod** al leer searchParams para evitar URL injection.
- **Sincronización Zustand ↔ URL opcional** sólo cuando state debe persistir cross-session (raro).

### D5. Form state → react-hook-form + Zod resolver

- **react-hook-form** como fuente única de forms.
- **Zod schemas** en `features/<X>/schemas/` como Single Source of Truth: un schema genera tipo TS, validación tRPC input, validación react-hook-form.
- **`@hookform/resolvers/zod`** para integración.
- **Server action fallback**: los forms críticos (pagos, legal) tienen versión SSR con Server Actions como backup si JS falla.
- **Wizard forms**: usar `useFieldArray` + `trigger()` para validación paso a paso. Patrón documentado para Operaciones Wizard (M8) y Captaciones Editor (M5).

### D6. Escape hatch: XState para flows realmente complejos

Para máquinas de estado con >5 estados + transiciones condicionales + efectos asíncronos, se reserva la opción de introducir **XState v5**:

- Candidatos H1: flow de Legal+Pagos+Escrow (FASE 18) — estados del escrow (creado, fondeado, liberado, disputa, tribunal, cerrado) + firma electrónica Mifiel + disputa UIF.
- **No se introduce H1 inicial**, se evalúa en FASE 18 si los `useReducer` se saturan.

## Rationale

Se eligió este stack porque:

1. **RSC por default** reduce bundle size cliente dramáticamente. Las páginas iniciales (dashboards) pueden ser 100% server-rendered con hidratación selectiva, minimizando el JS enviado al browser y mejorando LCP/FID en mobile (prioridad PWA).
2. **tRPC + React Query** da type safety end-to-end + cache inteligente + deduplicación de requests + invalidación granular. Es el estándar 2026 para Next.js full-stack.
3. **Zustand sobre Redux** porque el boilerplate de Redux Toolkit no se justifica en un proyecto que ya usa tRPC + RSC (la mayoría del "state management tradicional" ya está resuelto). Zustand: 1.2kB gzipped, API mínima, sin providers.
4. **URL state por default** mejora SEO, UX (back button funciona, links shareables) y reduce reimplementación de "state que sobrevive navigation".
5. **react-hook-form + Zod** es el combo de mayor performance en formularios complejos (wizards de 6 pasos, editores con 50+ campos). Zod como SSoT elimina drift entre types TS / tRPC input / form validation.
6. **XState como escape hatch** permite introducir rigor de state machines sólo donde el payoff lo justifica (Legal+Pagos), sin obligar al resto del código a adoptar ceremonia.

## Consequences

### Positivas
- **Curva de aprendizaje plana** para developers que vienen de Next.js + tRPC + React Query.
- **Devtools excelentes**: Zustand devtools, TanStack Query devtools, React Developer Tools suficientes sin setup extra.
- **Zero boilerplate Redux**: no hay actions, reducers, slices, selectors, thunks. El código se lee como hooks.
- **Type safety end-to-end**: desde Supabase types generados → tRPC inferred types → form Zod types. Un cambio en schema BD se propaga al form y al Zustand store (si aplica).
- **URL state bookmarkable** mejora experiencia usuario: un asesor puede mandarse a sí mismo por WhatsApp un link con filtros preservados.
- **RSC + Cache Components** mejora significativamente métricas Core Web Vitals para landing y dashboards.
- **Tests simples**: mockear Zustand stores es trivial (`create` con initial state), react-hook-form tests usan `@testing-library/react-hooks`.

### Negativas / tradeoffs
- **Dispersión de tipos de estado**: un developer nuevo debe internalizar que "depende de qué tipo de estado, usa distinto mecanismo". Mitigación: documento `00_FOUNDATION/00.2_STACK_Y_CONVENCIONES.md` con decision tree "qué state manager usar".
- **Zustand + persist puede desincronizar entre tabs**: si el usuario cambia locale en una tab, otra tab abierta ve el locale anterior hasta refresh. Mitigación: `subscribeWithSelector` + BroadcastChannel para cross-tab sync. No crítico H1 (tabs múltiples es uso avanzado).
- **URL state con searchParams en Next.js 16 RSC** tiene sutilezas (serialización, prefetch): algunas combinaciones de filtros complejos pueden generar URLs largas. Mitigación: comprimir con `nuqs` (TanStack Query + URL sync) cuando se justifique; H1 usa `URLSearchParams` nativo.
- **Wizard forms en react-hook-form**: el patrón multi-step es bien documentado pero requiere disciplina (`trigger()`, `useFormContext`, validación parcial). Documentar patrón canónico en `features/operaciones/` como referencia.
- **No hay store global único** ⇒ algunos developers pueden querer meter todo en Zustand. Mitigación: regla de code review "¿este estado necesita ser global, o puede ser local/URL/server?".
- **XState opcional** deja abierta la posibilidad de que nunca se introduzca y se parche con useReducer subótimos. Mitigación: reevaluar en FASE 18 y FASE 23 (Monetización, que tiene flows de suscripción).

### Neutrales
- **RSC + tRPC + Zustand** es el stack de moda 2026 (Linear, Cal.com, Trigger.dev). Decisión alineada con comunidad, bajo riesgo de obsolescencia corta.
- **No Redux**: quienes vienen de Redux pueden extrañar los devtools; TanStack Query + Zustand devtools cubren ~90% del valor.
- **No Jotai**: modelo atómico de Jotai es elegante pero convive mal con React Query (que ya gestiona cache granular). Se prefirió Zustand por simplicidad.

## Alternatives considered

### Alt 1: Redux Toolkit + RTK Query
Stack clásico con slices, RTK Query como capa data-fetching, createSelector, Redux DevTools. **Descartada** porque:
- Boilerplate significativo en features pequeñas.
- RTK Query duplica trabajo con tRPC (type inference manual vs automática).
- Combinado con RSC, el beneficio de un store global centralizado es bajo (la mayoría de datos ya están en server state).
- Mayor bundle size (~15kB gzipped).

### Alt 2: Jotai atoms + TanStack Query
Jotai: estado atómico y granular con subscripción fina. **Descartada** porque:
- Jotai atoms + React Query requiere coordinación manual (invalidar atom cuando query cambia).
- La composición de atoms puede explotar en complejidad cuando hay muchos derived atoms.
- No hay ganancia material sobre Zustand para el uso esperado (DMX no tiene tantos estados compartidos granulares como p.ej. un IDE).

### Alt 3: XState para todo desde el inicio
State machines en todos los features (forms, lists, flows). **Descartada** porque:
- Curva de aprendizaje alta para agentes paralelos Claude Code.
- Sobre-modela cuando el estado es simple (una lista con filtros no necesita una máquina de estados).
- Incrementa LOC en 2-3x para cada componente con estado simple.
- Se reserva como escape hatch en FASE 18 legal+pagos (caso donde sí lo justifica).

### Alt 4: Context API + useReducer (sin librería de state global)
Stack "solo React nativo", sin Zustand ni TanStack Query. **Descartada** porque:
- Context re-renders todo el subtree cuando cambia valor; performance mala en stores muy usados (Copilot open/closed).
- Sin React Query, se reinventa cache/invalidación/refetch/dedup ⇒ bugs.
- No aprovecha el ecosistema tRPC.

## References
- `../BRIEFING_PARA_REWRITE.md` §4 (stack), §5 (reglas de código — Zod SSoT)
- `../CONTEXTO_MAESTRO_DMX_v5.md` §6 (tRPC routers), §15 (módulos Dopamine)
- `../02_PLAN_MAESTRO/FASE_04_DESIGN_SYSTEM.md` (primitives + Zustand stores)
- `../02_PLAN_MAESTRO/FASE_18_LEGAL_PAGOS_ESCROW.md` (posible introducción XState)
- `../04_MODULOS/M08_OPERACIONES.md` (wizard 6 pasos con RHF)
- TanStack Query v5 docs: https://tanstack.com/query
- Zustand docs: https://zustand.surge.sh
- react-hook-form docs: https://react-hook-form.com

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent B) | **Fecha:** 2026-04-17
