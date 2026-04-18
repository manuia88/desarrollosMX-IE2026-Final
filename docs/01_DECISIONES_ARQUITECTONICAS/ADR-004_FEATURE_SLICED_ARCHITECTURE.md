# ADR-004 — Arquitectura Feature-Sliced con `shared/` core

**Status:** Accepted
**Date:** 2026-04-17
**Deciders:** Manu Acosta (founder), Claude Opus 4.7 (Senior Review)

## Context

El repositorio viejo (`desarrollosmx-v8final`) usa la estructura clásica de Next.js 13-15 con carpetas **por tipo**:

```
app/         ← Pages + API routes mezcladas por portal
components/  ← Miles de componentes mezclados sin ownership
hooks/       ← Hooks sueltos
lib/         ← Utils + adapters + clientes Supabase
types/       ← Types globales
server/trpc/ ← 15 routers en un solo directorio
```

Con 110 tablas, 15 routers tRPC (9 funcionales + 6 stubs), ~165 LOC por router promedio, 9 JSX Dopamine (M1-M10, ~7,424 LOC de UI) y 20+ dominios transversales (IE, gamification, marketing, ingesta, notificaciones, webhooks), esta estructura:

- Tiene **alto acoplamiento accidental**: mover un componente de `contactos` implica tocar `components/`, `hooks/`, `lib/`, `types/`, `server/trpc/contactos.ts` y las imports del consumer en `app/(asesor)/contactos/page.tsx`.
- **Fricción de navegación en IDE**: un desarrollador que entra a "Contactos" debe abrir 6 directorios distintos. Se pierde el "Locality of Behavior" (Carson Gross).
- **Barreras de ownership difusas**: si hay 15 desarrolladores en paralelo (equivalente Claude Code + agentes), múltiples agentes tocan `components/` al mismo tiempo con riesgo alto de conflictos.
- **Circular imports y barrel import chains**: `lib/` importa de `hooks/` que importa de `components/` que importa de `lib/` — ya visto en el repo viejo.
- **Tests co-locados rotos**: los tests Vitest están mezclados con código productivo en algunos directorios, dispersos en otros.

Al mismo tiempo, existen componentes y utilidades **genuinamente compartidos** (design system Dopamine, clientes Supabase 3-tier, formatters i18n, schemas Zod comunes) que no pertenecen a ninguna feature específica. Mezclarlos con features específicas también es anti-patrón.

El producto tiene **dos ejes organizativos naturales**:
1. **Portales**: asesor, desarrollador, admin, comprador, público.
2. **Features de dominio**: contactos, busquedas, captaciones, operaciones, tareas, desarrollos, marketing, estadisticas, ingesta (IE), scores (IE), ia-generativa, pagos, legal, contabilidad.

Los portales son **rutas** (URL tree); las features son **lógica reutilizable** que puede ser consumida por múltiples portales (ej. `ia-generativa` aparece en los 5 portales; `scores` en asesor+dev+admin+comprador; `marketing` en asesor+dev).

## Decision

Se adopta **Feature-Sliced con `shared/` core**. Estructura oficial (extracto del briefing §5):

```
/
├── app/                           ← Next.js App Router (rutas por portal)
│   ├── (asesor)/
│   ├── (developer)/
│   ├── (admin)/
│   ├── (comprador)/
│   ├── (public)/
│   ├── api/                       ← Route handlers no-tRPC (webhooks, crons, health)
│   └── layout.tsx
│
├── features/                      ← Feature-Sliced (ownership clara)
│   ├── contactos/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── routes/                ← tRPC procedures del feature
│   │   ├── types/
│   │   ├── lib/
│   │   ├── schemas/               ← Zod schemas
│   │   └── tests/
│   ├── busquedas/
│   ├── captaciones/
│   ├── operaciones/
│   ├── tareas/
│   ├── desarrollos/
│   ├── marketing/
│   ├── estadisticas/
│   ├── ingesta/                   ← IE ingestors
│   ├── scores/                    ← IE calculators + registry
│   ├── ia-generativa/             ← Copilot + ⌘K + multi-agent
│   ├── pagos/                     ← Stripe + MercadoPago + Split
│   ├── legal/                     ← Mifiel + DocuSign + adapters per country
│   ├── contabilidad/              ← CFDI + reconcile + payouts
│   ├── document-intel/            ← AI pipeline extractor
│   ├── notificaciones/            ← 20 tipos × 4 canales
│   ├── webhooks/                  ← 12 event types outbound
│   ├── gamification/
│   ├── observatorio/              ← Market Observatory admin
│   └── compliance/                ← LFPDPPP/LGPD/GDPR
│
├── shared/                        ← Cross-feature core
│   ├── ui/
│   │   ├── primitives/            ← Button, Card, Input, Dialog (Radix + shadcn-based)
│   │   ├── dopamine/              ← Card3D, AnimNum, FloatingShapes, GradWarm
│   │   ├── layout/                ← Sidebar, Header, AICopilot, CommandPalette
│   │   └── generative/            ← Components invocables por AI SDK v6 streamUI
│   ├── lib/
│   │   ├── supabase/              ← 3 clientes: client, server, admin
│   │   ├── trpc/                  ← client + providers + context + middleware
│   │   ├── ai/                    ← Vercel AI SDK v6 wrappers + routing
│   │   ├── i18n/                  ← next-intl config + helpers
│   │   ├── currency/              ← FX + formatters multi-country
│   │   ├── legal/                 ← Interface + adapters per country (MX/CO/AR/BR)
│   │   ├── payments/              ← Interface + Stripe + MercadoPago + Wompi
│   │   ├── tax/                   ← IVA/ICMS + retenciones per country
│   │   ├── fiscal/                ← CFDI / DIAN / AFIP / NFS-e adapters
│   │   └── utils/                 ← Pure utils sin side effects
│   ├── hooks/                     ← Cross-feature hooks (useCurrency, useLocale, etc.)
│   ├── constants/
│   ├── schemas/                   ← Zod schemas compartidos
│   └── types/                     ← Database types generated + tRPC inferred
│
├── server/
│   └── trpc/
│       ├── context.ts             ← Archivo protegido
│       ├── middleware.ts          ← Archivo protegido (rate limit, auth, country_code)
│       ├── init.ts
│       └── root.ts                ← Concatena routers de features/<feature>/routes/
│
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── messages/                      ← next-intl dictionaries
├── styles/                        ← tokens.css + globals.css Tailwind v4
├── docs/
├── tests/
│   ├── e2e/                       ← Playwright tests cross-feature
│   └── fixtures/
└── public/
```

Reglas de boundary estrictas:

1. **`features/<X>/` puede importar de `shared/` libremente.**
2. **`features/<X>/` NO puede importar de `features/<Y>/`** directamente (cross-feature import). Si la dependencia es real, se promueve el módulo a `shared/` o se expone vía tRPC procedure.
3. **`shared/` NO puede importar de `features/`** (hard rule, enforceable con ESLint/Biome rules + tsconfig paths).
4. **`app/<portal>/` importa de `features/` y `shared/`** pero **no contiene lógica de negocio**; sólo composición de componentes + llamadas tRPC.
5. **Tests co-locados**: `features/<X>/tests/` con Vitest para unit, `tests/e2e/` para Playwright global.
6. **tRPC routers compuestos en `server/trpc/root.ts`** desde `features/<X>/routes/<X>.ts`. Cada feature exporta su router parcial con namespace propio (`contactos`, `busquedas`, `operaciones`, etc.).
7. **Barrel imports (`index.ts`) sólo cuando hay >5 exports** y la API pública del feature es estable. Evitar barrel files que fuercen importar todo el feature.
8. **Boundary reviews en PRs**: cada PR que añade un import cross-feature exige justificación escrita en el PR body + tag `needs-boundary-review`.

## Rationale

Se adopta feature-sliced por:

1. **Ownership clara por feature**: múltiples agentes paralelos (Claude Code BATCH 1-3) pueden trabajar sobre `features/contactos/` y `features/operaciones/` sin colisión.
2. **Co-location mejora mantenibilidad**: encontrar "todo lo de contactos" es 1 carpeta, no 6. Un desarrollador nuevo navega el producto por dominio, no por tipo.
3. **Boundary explícito vs implícito**: los imports cruzados son detectables con Biome/ESLint + tsconfig paths, previniendo el "spaghetti de lib/" del repo viejo.
4. **Escalabilidad a H2 modular monolith**: cuando H2 evalúe Turborepo (briefing §4), las features son candidatas naturales a paquetes (`@dmx/feature-contactos`, `@dmx/feature-ie-scores`). El rewrite prepara el terreno sin obligar la fragmentación.
5. **Compatibilidad con AI-native**: el Copilot (ADR-002) puede consumir tRPC procedures sin importar dónde estén definidos; la feature-sliced estructura mantiene el dominio legible para prompts "extraer el router de operaciones" sin acarrear todo el código.

Se descartaron estructura por tipo (status quo del repo viejo), DDD estricto con bounded contexts y modular monolith con barrel imports agresivos (ver § Alternatives).

## Consequences

### Positivas
- **Onboarding más rápido**: un nuevo contribuidor explora `features/operaciones/` y ve components, hooks, routes, schemas, tests co-localizados. Se documenta el patrón en `docs/05_OPERACIONAL/05.4_ONBOARDING_DEV.md`.
- **Paralelización de agentes Claude Code sin merge conflicts**: cada agente puede tomar 1-N features sin bloquear.
- **Refactors focalizados**: renombrar "Contactos" a "Leads" es una operación de `features/contactos/` + sus rutas en `app/`, no un shotgun surgery en 8 carpetas.
- **Barrel imports disciplinados** eliminan los import chains circulares que aparecieron en el repo viejo.
- **Testing co-locado** invita a escribir tests por feature (cobertura objetivo 70% core, ver ADR-006).
- **Preparación para Turborepo H2** sin obligar a fragmentar ahora.

### Negativas / tradeoffs
- **Riesgo de duplicación si no se promueve a `shared/`**: dos features pueden inventar su propio `useDebounce` o `formatPrice`. Mitigación: review de PR con checklist "¿esto debería vivir en `shared/hooks/`?". Biome no detecta esto; es disciplina humana + IA.
- **Definición ambigua de "qué es feature" vs "qué es shared"**: caso límite: ¿`document-intel` (pipeline AI para PDFs) es feature o shared? Resuelto: es feature porque tiene componentes UI, hooks, procedures tRPC propios (`features/document-intel/`). Los wrappers AI genéricos (AI SDK v6 setup, prompt templates) viven en `shared/lib/ai/`.
- **Routers tRPC fragmentados en múltiples archivos**: `server/trpc/root.ts` debe importar de 20+ `features/<X>/routes/<X>.ts`. Root.ts crece en número de imports pero no en complejidad lógica.
- **Compatibilidad con App Router groups**: las rutas `app/(asesor)/contactos/page.tsx` no deben duplicar lógica de `features/contactos/`. Regla: `app/<portal>/<X>/page.tsx` es un thin layer que importa `<ContactosPage />` desde `features/contactos/components/` + hace SSR wiring + passes locale/country.
- **Boundary rules requieren enforcement técnico**: sin reglas Biome/ESLint que prohíban `features/<X> → features/<Y>` imports, es fácil romperlas. Mitigación: config explícito en Biome + CI check obligatorio en PR.
- **Carpeta `features/` larga**: a 20+ features el diseño de navegación en IDE se satura. Mitigación: naming por dominio claro (ordenados alfabéticamente: `contabilidad`, `contactos`, `desarrollos`, ...) + workspace root en IDE configurado.

### Neutrales
- Los **portales** siguen organizados en `app/<portal>/` con route groups; la correspondencia portal ↔ features no es 1:1 (M9 Marketing es consumido por asesor y dev).
- **Feature registry (`feature_registry` table)** se alinea conceptualmente con la estructura de `features/` pero no es 1:1. El feature registry tiene ~120 entries granulares (feature gating per plan); `features/` tiene ~20 carpetas por dominio.
- **Server code y client code conviven** en un feature. `features/operaciones/routes/operaciones.ts` es server; `features/operaciones/components/OperacionCard.tsx` es client. Next.js 16 maneja server/client boundary con `'use client'`.

## Alternatives considered

### Alt 1: Estructura por tipo (status quo repo viejo)
`components/`, `hooks/`, `lib/`, `app/`, `server/` sin `features/`. **Descartada** porque:
- Reproduce exactamente la fuente de los problemas del repo viejo (spaghetti imports, ownership difusa, shotgun surgery).
- No aprovecha que el dominio DMX tiene 20+ verticales claramente identificables.
- Mala fit con paralelización de agentes Claude Code.

### Alt 2: DDD estricto con Bounded Contexts y Aggregates
Modelado Domain-Driven Design con entidades, value objects, repositories, application services, domain events. **Descartada** porque:
- Overkill para el tamaño del equipo (1 founder + agentes) y el tamaño del producto (monolito Next.js).
- Next.js + tRPC + Supabase favorecen un enfoque pragmático thin-server-function en lugar de agregados + repositories.
- La ceremonia DDD (Repository, UnitOfWork, DomainEvent) genera boilerplate que no compensa en H1.
- Reservamos patrones DDD como opción futura (si features específicas como `features/legal/` crecen complejidad alta, pueden adoptar patterns DDD internamente sin obligar al resto).

### Alt 3: Modular Monolith agresivo con barrel imports
Cada feature expone un `index.ts` que re-exporta toda su API pública, y el resto del código importa desde `@/features/<X>`. **Descartada** (parcialmente) porque:
- Barrel imports amplios rompen tree-shaking en Next.js (Webpack/Turbopack) y aumentan bundle size.
- Force-importar todo un feature cuando sólo se necesita 1 schema Zod es caro.
- Se adopta barrel **selectivo** (sólo cuando hay >5 exports y API estable) en lugar de obligatorio.

### Alt 4: Feature-Sliced Design canónico (layers: `pages`, `widgets`, `features`, `entities`, `shared`)
La especificación canónica de Feature-Sliced Design (feature-sliced.design) define 5 layers. **Descartada** parcialmente porque:
- Es sobre-especificado para Next.js App Router, donde `pages` ya es `app/` y `widgets` se confunde con `components/`.
- Adoptamos **el espíritu** (slicing por dominio + shared core) sin la nomenclatura canónica completa.
- `entities` layer redundante con schemas Zod + Supabase types.

## References
- `../BRIEFING_PARA_REWRITE.md` §5 (estructura de carpetas)
- `../CONTEXTO_MAESTRO_DMX_v5.md` §6 (tRPC routers)
- `../00_FOUNDATION/00.2_STACK_Y_CONVENCIONES.md`
- `../02_PLAN_MAESTRO/FASE_00_BOOTSTRAP.md` (scaffolding de la estructura)
- `../02_PLAN_MAESTRO/FASE_29_H2_H3_SCAFFOLD.md` (evaluación Turborepo H2)
- Feature-Sliced Design: https://feature-sliced.design
- Carson Gross, "Locality of Behavior": https://htmx.org/essays/locality-of-behaviour/

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent B) | **Fecha:** 2026-04-17
