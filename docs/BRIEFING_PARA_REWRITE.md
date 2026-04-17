# BRIEFING MAESTRO — Rewrite DesarrollosMX v5 Final

> **Generado:** 2026-04-17
> **Autor:** Claude Opus 4.7 (chat anterior a punto de saturarse)
> **Destinatario:** Claude Code en terminal (chat nuevo fresco)
> **Objetivo:** Darte todo el contexto operativo que NO está en `CONTEXTO_MAESTRO_DMX_v5.md` para que escribas los ~70 archivos de documentación del rewrite sin volver a levantar 2 chats de contexto.

---

## 🧭 Cómo usar este briefing

1. **Lee primero**: `docs/biblia-v5/17_BIBLIA_DMX_v5_Decisiones_Hallazgos_Plan.md` (visión global, 29KB)
2. **Lee después**: el documento maestro ya consolidado (si existe en `docs/CONTEXTO_MAESTRO_DMX_v5.md`) o las 28 fuentes en `docs/biblia-v5/`
3. **Lee este briefing**: tiene las decisiones del founder y lo que se me pidió construir
4. **Ejecuta**: escribe los 70 archivos con sub-agentes paralelos (ver §8)

---

## 1. DECISIÓN ARQUITECTÓNICA CORE: REWRITE DESDE CERO

**Se decidió NO evolucionar el repo actual. Se reescribe desde cero.**

### Repo nuevo (YA EXISTE)
- **GitHub**: https://github.com/manuia88/desarrollosMX-IE2026-Final
- **Clone URL**: `git@github.com:manuia88/desarrollosMX-IE2026-Final.git`
- Branch: `main`

### Supabase nuevo (YA EXISTE)
- **URL**: https://qxfuqwlktmhokwwlvggy.supabase.co
- **Project ID**: `qxfuqwlktmhokwwlvggy`
- Schema: vacío. Hay que crear desde cero.

### Repo viejo (ARCHIVADO)
- `desarrollosmx-v8final` con 5 commits v5.1-S1..S5 aplicados
- 3 migrations Supabase aplicadas en proyecto viejo `kcxnjdzichxixukfnenm`
- **NO se usa más.** Queda como histórico de aprendizaje únicamente.
- **NO hay usuarios reales, NO hay data real, NO hay IP/licencias/contratos vinculados.**

### Razones del rewrite (para fundamentar ADR-001)
1. Claude Code + agentes paralelos eliminan el tiempo como blocker (rewrite toma ~3-4 semanas vs ~2 semanas refactor — diferencia colapsada).
2. Spec exhaustiva disponible: CONTEXTO_MAESTRO + 28 docs biblia v5 + DOCX Pulppo + JSX v2 landing. No hay Second System Effect porque hay spec rigurosa.
3. 0 usuarios reales = 0 riesgo de migración.
4. AI-native + multi-country + feature-sliced + i18n + testing nativos (desde archivo 1) son mejores que retrofit.
5. Deuda técnica acumulada v3/v4/v5 se elimina. Código 100% limpio.

### Qué se porta del repo viejo (solo como referencia UI/spec, NO código)
- Los 9 módulos JSX Dopamine (M1-M9) como referencia visual
- El JSX v2 landing (`dmx-dopamine-v2.jsx`) como spec del portal público
- Los tokens Dopamine (paleta, gradientes, animaciones)
- Mapeo SCIAN propietario (IP core del IE)
- Arquitectura conceptual del IE (registry + cascades + queue)
- Los 10 DOCX Pulppo como specs de flujos

### Qué NO se porta (se rediseña)
- Schemas BD (las 110 tablas actuales tienen DISC-01..09, bugs)
- Los 15 routers tRPC actuales
- Las 207 RLS policies (varias con SEC-01..23 abiertos)
- La estructura `app/` + `components/` + `lib/` mezclada

---

## 2. DECISIONES DE PRODUCTO DEL FOUNDER

Respuestas del founder a las 10 preguntas estratégicas:

| # | Pregunta | Respuesta del founder |
|---|---|---|
| 1 | Scope MVP público | Incluye TODO. Marketplace va en H1. |
| 2 | Portal desarrollador | Contabilidad full + integraciones en H1. |
| 3 | Revenue streams | Membresía mensual asesores + membresía+fee cierre para devs. No definido 100% aún. |
| 4 | Post-venta | DMX NO es responsable. DMX es infraestructura. |
| 5 | Comunidad | H2/H3 (forums, vecinos). Reviews H1 OK. |
| 6 | International | Multi-country desde día 1. |
| 7 | AI | AI-native (no AI-assisted). |
| 8 | Mobile | PWA en H1 para todos. App nativa iOS/Android en H2 **solo para asesores**. Devs siempre desde web. Compradores PWA. |
| 9 | Marketplace servicios asociados | H2. |
| 10 | Data partnerships | No firmar. Datos públicos. |

**Estrategia elegida: MVP FIRST**. H1 incluye TODO el core + diferenciadores. H2/H3 para expansiones.

---

## 3. IMPLICACIONES ARQUITECTÓNICAS DE LAS DECISIONES

### AI-native implica
- **Command Palette ⌘K como UI primary**, no shortcut secundario
- **Copilot sidebar persistente** (tipo Cursor Composer) en todos los portales
- **Voice interaction** default en mobile, teclear en desktop
- **Multi-agent orchestration**: agentes especializados (legal, financiero, match, marketing) con router meta (LangGraph pattern)
- **Memory Layer** con Anthropic Memory API (salió 2026) — recordar cross-session
- **RAG sobre TODO**: inventory + scores + biblia + docs del usuario, con citations verificables
- **Generative components**: AI genera vistas custom on-the-fly
- **Proactive intelligence**: AI inicia conversaciones cuando detecta oportunidad
- **AI-generated insights inline** en cada card

### Multi-country día 1 implica
- **i18n con `next-intl`** desde archivo 1 (es-MX, es-CO, es-AR, pt-BR, en-US)
- **Multi-currency** en todas las tablas con monedas, FX real-time (Open Exchange Rates API)
- **Multi-timezone**: cada user tiene `preferred_timezone`
- **Legal frameworks per country**: MX Mifiel/NOM-151, CO Certicámara, AR ley corretaje, BR CRECI, CL Ley 19.799
- **Payment processors per country**: Stripe MX + MercadoPago LATAM (CO, AR, BR, CL), Wompi CO
- **Tax engines per country**: IVA MX 16%, CO 19%, ARG 21%, BR ICMS, CL 19%
- **Fiscal docs per country**: CFDI 4.0 (MX), Factura DIAN (CO), AFIP CAE (AR), NFS-e (BR), SII (CL)
- **Regional data sources**: INEGI MX, DANE CO, INDEC AR, IBGE BR, INE CL
- **Schema**: cada tabla con `country_code` NOT NULL + índice compuesto

### Contabilidad full H1 implica
- CFDI 4.0 + todos los complementos
- Multi-RFC per developer (holding + operadoras + fideicomisos)
- SAT integration directa (timbrado, cancelación, consulta)
- Chart of accounts SAT catálogo
- Bank reconciliation (parse OFX/CSV BBVA/Santander/Banorte/HSBC)
- Payout programs con schedule automático
- Commission holdback
- Dunning management
- AML/KYC screening para operaciones >$200K USD (UIF MX)
- ESG reporting básico

### Marketplace full H1 con aspectos MX
- Family accounts (wishlist compartida con pareja + padres)
- WhatsApp primary (no email)
- Pre-aprobación crediticia express (partnerships BBVA, Santander, Kueski, Creditas)
- Búsqueda por voz en español MX con modismos
- Apartado con escrow real (Stripe Connect)
- Split payments automáticos al cierre
- Referral system desde día 1

---

## 4. STACK DEFINITIVO

**Confirmado para el rewrite (no cambiar):**
```
Runtime:        Node.js LTS (al momento de empezar)
Framework:      Next.js 16 App Router
Language:       TypeScript 5 strict
Styling:        Tailwind CSS v4 (CSS-first)
API:            tRPC 11 + Zod 4 validation
Database:       Supabase (Postgres 16 + pgvector + pgsodium + pg_partman)
Auth:           Supabase Auth + MFA/2FA + SAML/OIDC (H2)
Realtime:       Supabase Realtime
Storage:        Supabase Storage
Edge:           Vercel Edge Functions + Edge Config
Queue:          Vercel Queues (cuando GA) o BullMQ/Trigger.dev
Maps:           Mapbox GL JS
Charts:         Recharts (evaluar Visx para bundle size)
AI:             Anthropic Claude Sonnet 4 + OpenAI GPT-4o-mini + Vercel AI Gateway
AI routing:     Vercel AI SDK v6 (provider-agnostic, usa "provider/model" strings)
i18n:           next-intl
State mgmt:     React hooks + tRPC useQuery + Zustand para global fine
Forms:          react-hook-form + Zod resolver
Animation:      framer-motion
3D:             Three.js (si requiere para AR H3)
Analytics:      PostHog (product analytics + A/B testing + session replay)
Errors:         Sentry
CMS landing:    None. Hardcoded + Sanity si requiere H2
Email:          Resend (transactional)
SMS:            Twilio backup cuando WA falla
Calendar:       Native integration Google/Outlook/Apple
Docs sign:      Mifiel (MX) + DocuSign fallback (otros países)
Fiscal:         Facturapi.io (CFDI MX) + equivalents per país
Payments:       Stripe + Stripe Connect + MercadoPago
Testing:        Vitest (unit) + Playwright (e2e) + msw (mocking)
CI/CD:          GitHub Actions + Vercel preview deploys
Package mgr:    npm (default) — evaluar pnpm si monorepo
Linting:        Biome (reemplaza ESLint + Prettier — 10x más rápido)
Monorepo:       Turborepo SI se separa landing + B2B + internal (H2 eval)
Bundler:        Turbopack (Next 16 default)
Types:          Supabase gen types + tRPC inferred types
```

---

## 5. CONVENCIONES DE CÓDIGO

### Naming
- **Archivos**: kebab-case (`user-profile.tsx`, `get-dashboard.ts`)
- **Componentes**: PascalCase (`UserProfile`, `DashboardCard`)
- **Variables/funciones**: camelCase (`getUserProfile`, `isActive`)
- **Constantes**: SCREAMING_SNAKE_CASE (`MAX_CONTACTS`, `SLA_FIRST_RESPONSE`)
- **Types/Interfaces**: PascalCase (`UserProfile`, `OperacionWithDetails`)
- **BD columnas**: snake_case (`first_name`, `created_at`)
- **BD tablas**: snake_case plural (`contactos`, `operaciones`) — mantener español del dominio
- **Rutas API**: kebab-case (`/api/v1/zone-scores`)
- **Environment vars**: `SCREAMING_SNAKE_CASE` (ej. `ANTHROPIC_API_KEY` — NO `CLAUDE_API_KEY`)

### Estructura de carpetas (Feature-sliced con shared core)
```
/
├── app/                        ← Next.js App Router
│   ├── (asesor)/
│   ├── (developer)/
│   ├── (admin)/
│   ├── (comprador)/
│   ├── (public)/
│   ├── api/
│   └── layout.tsx
│
├── features/                   ← Feature-sliced — cada feature contiene TODO lo suyo
│   ├── contactos/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── routes/            ← tRPC procedures de este feature
│   │   ├── types/
│   │   ├── lib/
│   │   ├── schemas/           ← Zod
│   │   └── tests/
│   ├── busquedas/
│   ├── captaciones/
│   ├── operaciones/
│   ├── tareas/
│   ├── desarrollos/
│   ├── marketing/
│   ├── estadisticas/
│   ├── ingesta/               ← IE ingest
│   ├── scores/                ← IE calculators
│   ├── ia-generativa/         ← AI agents + Copilot + Command Palette
│   └── ...
│
├── shared/                     ← Cross-feature shared
│   ├── ui/                     ← Design system Dopamine
│   │   ├── primitives/         ← Button, Card, Input base
│   │   ├── dopamine/           ← Card3D, AnimNum, FloatingShapes
│   │   └── layout/             ← Sidebar, Header, AICopilot
│   ├── lib/
│   │   ├── supabase/           ← 3 clients (client, server, admin)
│   │   ├── trpc/               ← client + providers
│   │   ├── ai/                 ← Claude/GPT wrappers + Vercel AI SDK
│   │   ├── i18n/               ← next-intl config + dictionaries
│   │   ├── currency/           ← FX + formatters multi-country
│   │   └── utils/
│   ├── hooks/                  ← Shared hooks
│   ├── constants/
│   ├── schemas/                ← Zod schemas compartidos
│   └── types/                  ← Tipos shared (Database, tRPC, etc.)
│
├── server/
│   └── trpc/
│       ├── context.ts
│       ├── middleware.ts
│       ├── init.ts
│       └── root.ts             ← Concatena todos los feature routers
│
├── styles/
│   ├── globals.css             ← Tailwind + CSS vars Dopamine tokens
│   └── tokens.css              ← Dopamine CSS vars (light + dark)
│
├── supabase/
│   ├── migrations/             ← Versionadas con supabase CLI
│   ├── seed.sql
│   └── config.toml
│
├── messages/                   ← i18n dictionaries
│   ├── es-MX.json
│   ├── es-CO.json
│   ├── es-AR.json
│   ├── pt-BR.json
│   └── en-US.json
│
├── public/
│   ├── images/
│   ├── icons/
│   └── manifest.json           ← PWA manifest
│
├── docs/
│   ├── 00_FOUNDATION/
│   ├── 01_DECISIONES_ARQUITECTONICAS/
│   ├── 02_PLAN_MAESTRO/        ← Las 30 fases
│   ├── 03_CATALOGOS/
│   ├── 04_MODULOS/
│   └── 05_OPERACIONAL/
│
├── tests/
│   ├── e2e/                    ← Playwright
│   ├── fixtures/
│   └── setup.ts
│
├── .github/
│   └── workflows/              ← CI/CD
│
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts          ← Si hace falta, pero Tailwind v4 es CSS-first
├── vercel.json                 ← Crons
├── .env.example
├── CLAUDE.md                   ← Instrucciones para Claude Code
└── README.md
```

### Reglas de código
1. **Zod como Single Source of Truth**: un Zod schema genera tipo TS, validación de inputs tRPC, validación de forms react-hook-form.
2. **tRPC siempre con authenticatedProcedure** cuando requiera auth (nunca `publicProcedure` sin justificación en comentario).
3. **Ningún query a Supabase sin RLS**: el cliente público SIEMPRE respeta RLS. El admin client solo en API routes/crons/trpc backend.
4. **Types generados automáticamente**: `supabase gen types typescript --project-id qxfuqwlktmhokwwlvggy > shared/types/database.ts` en cada migration.
5. **Zero `any`**: `any` rompe el build (`noImplicitAny: true`).
6. **`import type`** cuando es solo tipo (tree-shaking).
7. **Error handling**: TRPCError en procedures, ErrorBoundary en componentes, Sentry capture en todo lo async.
8. **i18n everywhere**: cero strings hardcoded en UI. Todo pasa por `t('namespace.key')`.
9. **Multi-country everywhere**: funciones de formateo de fechas/monedas/direcciones respetan `useLocale()` y `useCurrency()`.
10. **Accessibility**: aria-labels, semantic HTML, keyboard nav, contrast ≥4.5:1, focus visible, prefers-reduced-motion.

### Git workflow
- Branch protection en `main`: PRs requeridos + CI pass + 1 approval.
- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Tags por fase completada: `fase-00-complete`, `fase-01-complete`, etc.
- Squash merge en PRs para main lineal.

---

## 6. LOS 70 ARCHIVOS A ESCRIBIR

Los archivos van en `docs/` del **repo NUEVO** (`desarrollosMX-IE2026-Final`), no del repo viejo.

**Estructura exacta:**

```
docs/
├── README.md                                             ← Entry point
│
├── 00_FOUNDATION/                                        ← Primero lo que oriente
│   ├── 00.1_VISION_Y_PRINCIPIOS.md
│   ├── 00.2_STACK_Y_CONVENCIONES.md
│   ├── 00.3_GLOSARIO_Y_ONTOLOGIA.md
│   └── 00.4_COMANDOS_Y_WORKFLOWS.md
│
├── 01_DECISIONES_ARQUITECTONICAS/                        ← ADRs
│   ├── ADR-001_REWRITE_DESDE_CERO.md
│   ├── ADR-002_AI_NATIVE_ARCHITECTURE.md
│   ├── ADR-003_MULTI_COUNTRY_SCHEMA.md
│   ├── ADR-004_FEATURE_SLICED_ARCHITECTURE.md
│   ├── ADR-005_STATE_MANAGEMENT.md
│   ├── ADR-006_TESTING_STRATEGY.md
│   ├── ADR-007_OBSERVABILITY_STACK.md
│   ├── ADR-008_MONETIZATION_FEATURE_GATING.md
│   ├── ADR-009_SECURITY_MODEL.md
│   └── ADR-010_IE_PIPELINE_ARCHITECTURE.md
│
├── 02_PLAN_MAESTRO/                                      ← El plan ejecutable
│   ├── 02.0_INDICE_MAESTRO.md                           ← Índice de todas las fases
│   ├── FASE_00_BOOTSTRAP.md
│   ├── FASE_01_BD_FUNDACION.md
│   ├── FASE_02_AUTH_Y_PERMISOS.md
│   ├── FASE_03_AI_NATIVE_SHELL.md
│   ├── FASE_04_DESIGN_SYSTEM.md
│   ├── FASE_05_I18N_Y_MULTICOUNTRY.md
│   ├── FASE_06_SEGURIDAD_BASELINE.md
│   ├── FASE_07_INGESTA_DATOS.md
│   ├── FASE_08_IE_SCORES_N0.md
│   ├── FASE_09_IE_SCORES_N1.md
│   ├── FASE_10_IE_SCORES_N2_N3.md
│   ├── FASE_11_IE_INDICES_DMX.md
│   ├── FASE_12_IE_AI_SCORES_N5.md
│   ├── FASE_13_PORTAL_ASESOR_M1_M5.md
│   ├── FASE_14_PORTAL_ASESOR_M6_M10.md
│   ├── FASE_15_PORTAL_DESARROLLADOR.md
│   ├── FASE_16_CONTABILIDAD_DEV.md
│   ├── FASE_17_DOCUMENT_INTEL.md
│   ├── FASE_18_LEGAL_PAGOS_ESCROW.md
│   ├── FASE_19_PORTAL_ADMIN.md
│   ├── FASE_20_PORTAL_COMPRADOR.md
│   ├── FASE_21_PORTAL_PUBLICO.md
│   ├── FASE_22_MARKETING_COMMS.md
│   ├── FASE_23_MONETIZACION.md
│   ├── FASE_24_OBSERVABILIDAD_SRE.md
│   ├── FASE_25_PERFORMANCE_MOBILE.md
│   ├── FASE_26_COMPLIANCE_AUDITORIA.md
│   ├── FASE_27_TESTING_QA.md
│   ├── FASE_28_LAUNCH_SOFT.md
│   └── FASE_29_H2_H3_SCAFFOLD.md
│
├── 03_CATALOGOS/                                         ← Referencias estáticas
│   ├── 03.1_CATALOGO_BD_TABLAS.md
│   ├── 03.2_CATALOGO_BD_FUNCIONES.md
│   ├── 03.3_CATALOGO_BD_TRIGGERS.md
│   ├── 03.4_CATALOGO_BD_RLS.md
│   ├── 03.5_CATALOGO_TRPC_PROCEDURES.md
│   ├── 03.6_CATALOGO_API_ROUTES.md
│   ├── 03.7_CATALOGO_CRONS.md
│   ├── 03.8_CATALOGO_SCORES_IE.md                       ← Los 118 scores
│   ├── 03.9_CATALOGO_FUENTES_DATOS.md                   ← 50+ fuentes
│   ├── 03.10_CATALOGO_FEATURES_REGISTRY.md              ← 108+ features
│   ├── 03.11_CATALOGO_PRODUCTOS_B2B.md                  ← 7 productos licenciables
│   └── 03.12_CATALOGO_NOTIFS_Y_WEBHOOKS.md              ← 20 notifs + 12 webhooks
│
├── 04_MODULOS/                                           ← Specs por módulo
│   ├── M01_DASHBOARD_ASESOR.md
│   ├── M02_DESARROLLOS.md
│   ├── M03_CONTACTOS.md
│   ├── M04_BUSQUEDAS.md
│   ├── M05_CAPTACIONES.md
│   ├── M06_TAREAS.md
│   ├── M07_OPERACIONES.md
│   ├── M08_MARKETING.md
│   ├── M09_ESTADISTICAS.md
│   ├── M10_DASHBOARD_DEV.md
│   ├── M11_INVENTARIO_DEV.md
│   ├── M12_CONTABILIDAD_DEV.md
│   ├── M13_CRM_DEV.md
│   ├── M14_MARKETING_DEV.md
│   ├── M15_ANALYTICS_DEV_IE.md
│   ├── M16_DASHBOARD_ADMIN.md
│   ├── M17_MARKET_OBSERVATORY.md
│   ├── M18_DASHBOARD_COMPRADOR.md
│   ├── M19_MARKETPLACE_PUBLICO.md
│   └── M20_FICHA_PROYECTO_PERSONALIZADA.md
│
└── 05_OPERACIONAL/                                       ← Runbooks
    ├── 05.1_DEPLOYMENT_GUIDE.md
    ├── 05.2_INCIDENT_RESPONSE.md
    ├── 05.3_DR_RUNBOOK.md
    ├── 05.4_ONBOARDING_DEV.md
    ├── 05.5_FEATURE_FLAG_POLICY.md
    └── 05.6_DATA_RETENTION_POLICY.md
```

**Total: 71 archivos.**

---

## 7. FORMATO DE CADA ARCHIVO

### Archivos FASE (30 archivos en `02_PLAN_MAESTRO/`)
**Granularidad: ALTA (α)** — cada paso debe ser una acción verificable.

**Template obligatorio:**

```markdown
# FASE N — <nombre>

> **Duración estimada:** X sesiones Claude Code (~Y horas con agentes paralelos)
> **Dependencias:** Fases previas que deben completarse antes (ej: FASE 00, FASE 01)
> **Bloqueantes externos:** Accesos/cuentas que Manu debe proveer antes de arrancar
> **Resultado esperado:** Qué queda funcionando al cerrar la fase + criterio de done
> **Priority:** [H1] / [H2] / [H3]

## Contexto y objetivo

Párrafo de 3-5 líneas. Qué es esta fase. Por qué importa.

## Bloques

### BLOQUE N.A — <nombre del bloque>
Descripción breve (2 líneas).

#### MÓDULO N.A.1 — <nombre del módulo>
Descripción breve (1-2 líneas).

**Pasos:**
- `[N.A.1.1]` Acción verificable concreta. Ej: "Ejecutar `gh repo create manuia88/desarrollosmx --private --description 'Spatial Decision Intelligence platform'`"
- `[N.A.1.2]` Siguiente acción. Ej: "Crear `package.json` con scripts dev/build/test/lint/type-check"
- `[N.A.1.3]` Siguiente. Ej: "Configurar `next.config.ts` con typedRoutes: true, experimental.ppr: 'incremental'"
...

**Criterio de done del módulo:**
- [ ] Verificación 1 (ej: "`npm run build` ejecuta sin errores")
- [ ] Verificación 2

#### MÓDULO N.A.2 — ...

### BLOQUE N.B — ...

## Criterio de done de la FASE
- [ ] Todos los bloques cerrados
- [ ] Tag git creado: `fase-NN-complete`
- [ ] Documentación actualizada
- [ ] Tests pasando (si aplica)

## Próxima fase
FASE N+1 — <nombre>
```

### Archivos ADR (10 archivos en `01_DECISIONES_ARQUITECTONICAS/`)
**Template (formato Nygard ADR clásico):**

```markdown
# ADR-NNN — <Título de la decisión>

**Status:** Accepted | Proposed | Deprecated | Superseded
**Date:** 2026-04-17
**Deciders:** Manu Acosta (founder), Claude Opus 4.7 (SR)

## Context
¿Qué situación obligó a tomar esta decisión? ¿Qué restricciones existen?

## Decision
La decisión tomada, enunciada clara y concisamente.

## Rationale
Por qué esta decisión vs alternativas consideradas. Mencionar las alternativas.

## Consequences
### Positivas
- …

### Negativas / tradeoffs
- …

### Neutrales
- …

## Alternatives considered
### Alt 1: ...
### Alt 2: ...

## References
Links a docs, papers, discusiones.
```

### Archivos CATÁLOGO (12 archivos en `03_CATALOGOS/`)
Listas exhaustivas con tabla por entidad. Cada entry tiene:
- Nombre/ID
- Propósito (1 línea)
- Schema/signature/endpoint
- Dependencias
- Estado (planeado/implementado/deprecado)
- Fase donde se implementa
- Referencia al módulo que lo consume

### Archivos MÓDULO (20 archivos en `04_MODULOS/`)
Spec completa del módulo con:
- Descripción funcional
- Flujos principales (step by step)
- Wireframe textual (ASCII art si aplica)
- Componentes UI requeridos
- Procedures tRPC que consume
- Tablas BD que toca
- Estados (loading/error/empty/success)
- Validaciones
- Integraciones
- Tests críticos
- Fase donde se construye

### Archivos OPERACIONAL (6 archivos en `05_OPERACIONAL/`)
Runbooks paso a paso con procedimientos concretos.

---

## 8. CÓMO ESCRIBIRLOS CON SUB-AGENTES PARALELOS

Para no saturarte el contexto, usa agentes paralelos:

```
BATCH 1 (paralelo — 4 agentes):
  Agente A: docs/00_FOUNDATION/ (4 archivos)
  Agente B: docs/01_DECISIONES_ARQUITECTONICAS/ (10 ADRs)
  Agente C: docs/02_PLAN_MAESTRO/ FASES 00-07 (Foundation + Security)
  Agente D: docs/02_PLAN_MAESTRO/ FASES 08-14 (IE completo + Portal Asesor)

BATCH 2 (paralelo — 4 agentes):
  Agente E: docs/02_PLAN_MAESTRO/ FASES 15-21 (Dev + Contabilidad + Docs + Legal + Admin + Comprador + Público)
  Agente F: docs/02_PLAN_MAESTRO/ FASES 22-29 (Marketing + Monetización + SRE + Performance + Compliance + Testing + Launch + H2/H3)
  Agente G: docs/03_CATALOGOS/ (12 catálogos)
  Agente H: docs/04_MODULOS/ (20 módulos)

BATCH 3 (solo 1 agente, es poco):
  Agente I: docs/05_OPERACIONAL/ (6 runbooks) + docs/README.md
```

Cada agente debe:
1. Leer este briefing completo primero
2. Leer `CONTEXTO_MAESTRO_DMX_v5.md` si existe, o los 28 docs de biblia
3. Seguir EXACTAMENTE el template de su sección
4. Usar granularidad alta (α)
5. Cross-referenciar otros archivos cuando aplique
6. Commit en chunks coherentes

**Prompts sugeridos para cada agente** (copia-pega al lanzarlos):

### Prompt Agente A (Foundation)
```
Escribe los 4 archivos de docs/00_FOUNDATION/ del repo (leer docs/BRIEFING_PARA_REWRITE.md §6 para lista exacta).

Cada archivo debe:
- Seguir el formato descrito en §7 del briefing
- Cross-referenciar con las decisiones del founder (§2 del briefing)
- Usar el stack definitivo (§4 del briefing)
- Aplicar convenciones (§5 del briefing)

Longitud esperada: 200-500 líneas por archivo. Granularidad alta.

Fuentes a consultar:
- docs/BRIEFING_PARA_REWRITE.md (este documento)
- docs/CONTEXTO_MAESTRO_DMX_v5.md (si existe)
- docs/biblia-v5/17_BIBLIA_DMX_v5_Decisiones_Hallazgos_Plan.md (visión global)

Al terminar, reporta qué escribiste con línea counts.
```

### Prompt Agente B (ADRs)
```
Escribe los 10 ADRs de docs/01_DECISIONES_ARQUITECTONICAS/ del repo (ver lista en §6 del briefing).

Formato Nygard (§7 del briefing):
- Context → Decision → Rationale → Consequences → Alternatives considered → References

Cada ADR debe tener alternatives considered reales (2-3) y consequences balanceadas (no solo positivas).

Base tus decisiones en:
- Decisiones del founder (§2 del briefing)
- Implicaciones arquitectónicas (§3 del briefing)
- Stack definitivo (§4 del briefing)

Longitud: 150-300 líneas por ADR. Específico y profesional.
```

### Prompts Agentes C, D, E, F (Plan Maestro fases)
```
Escribe las fases X a Y del plan maestro (docs/02_PLAN_MAESTRO/FASE_XX_*.md).

Template obligatorio en §7 del briefing:
- Frontmatter con duración, dependencias, bloqueantes, resultado, priority
- Contexto y objetivo
- Bloques → Módulos → Pasos
- Granularidad alta (α): cada paso es acción verificable
- Criterios de done por módulo Y por fase

Para cada paso, escribir comando/acción exacta cuando aplique:
  - Bash command (ej: `gh repo create...`)
  - Archivo a crear con path exacto
  - Schema SQL exacto
  - Nombre de función exacto
  - Endpoint exacto

Longitud: 300-600 líneas por fase. Denso pero navegable.

Fuentes:
- docs/BRIEFING_PARA_REWRITE.md
- docs/biblia-v5/11_INSTRUCCIONES_MAESTRAS_20Sesiones_245Upgrades.md (roadmap detalle)
- docs/biblia-v5/15_CONEXIONES_E2E_Dopamine_Backend.md (mapeo UI→BD)
- Específicos por fase según el dominio (ej: Fase IE → biblia-v5/06-10)
```

### Prompt Agente G (Catálogos)
```
Escribe los 12 catálogos de docs/03_CATALOGOS/.

Cada catálogo es una referencia exhaustiva (tabla por entidad).
Ver §6 del briefing para lista exacta.
Ver §7 del briefing para estructura por entry.

Base de datos fuente:
- 03.1 BD tablas: del schema a diseñar (no copiar las 110 viejas, es REWRITE — diseñar óptimo)
- 03.5 tRPC procedures: de los módulos (04_MODULOS)
- 03.7 Crons: los 19 activos + 12 stubs mencionados en biblia
- 03.8 Scores: los 118 de IE2+IE3+IE4+IE5
- 03.9 Fuentes datos: las 50+ de IE1 §3
- 03.10 Features registry: los 108+ con flags de plan
- 03.11 Productos B2B: los 7 de IE5 §12
- 03.12 Notifs+webhooks: 20 notifs de BE3 §6.2, 12 webhooks de BE3 §6.3

Longitud: 200-600 líneas por catálogo.
```

### Prompt Agente H (Módulos)
```
Escribe los 20 specs de módulos de docs/04_MODULOS/.

Cada módulo (M01-M20) tiene spec completa con:
- Descripción funcional
- Wireframe textual (ASCII si aplica)
- Flujos principales paso a paso
- Componentes UI
- tRPC procedures
- Tablas BD tocadas
- Estados (loading/error/empty/success)
- Validaciones Zod
- Integraciones externas
- Tests críticos
- Fase donde se construye

Fuentes:
- DOCX Pulppo: docs/biblia-v5/Pulppo_Modulo*.docx (specs Pulppo tropicalizados)
- JSX Dopamine: docs/biblia-v5/02-05 (referencias UI)
- JSX v2: docs/biblia-v5/dmx-dopamine-v2.jsx (portal público)
- E2E: docs/biblia-v5/15_CONEXIONES_E2E (mapeo UI→BD)

Longitud: 200-400 líneas por módulo.
```

---

## 9. FEATURES PRIORIZADOS POR FASE (H1)

**MVP FIRST. H1 incluye TODO lo core.** Distribución orientativa:

| Fase | Features H1 aprox | Notas |
|---|---|---|
| 00 Bootstrap | 10 | Setup base |
| 01 BD Fundación | 25 | Schema limpio multi-country |
| 02 Auth + Permisos | 15 | RLS + feature registry |
| 03 AI-Native Shell | 20 | Copilot + ⌘K + Voice |
| 04 Design System | 15 | Dopamine DS fresh |
| 05 i18n + Multi-country | 20 | FX + legal + payment processors |
| 06 Seguridad Baseline | 25 | 23 hallazgos cerrados + 2FA |
| 07 Ingesta Datos | 20 | 50+ fuentes ingestors |
| 08-12 IE Scores + Índices | 75 | 118 scores + 7 índices |
| 13-14 Portal Asesor | 55 | 9 módulos |
| 15 Portal Desarrollador | 30 | 13 sub-módulos |
| 16 Contabilidad Dev | 35 | CFDI + integraciones |
| 17 Document Intel | 15 | AI pipeline |
| 18 Legal + Pagos + Escrow | 20 | Mifiel + Stripe Connect |
| 19 Portal Admin | 30 | 17 pages + Observatory |
| 20 Portal Comprador | 40 | 10 pages + Netflix personalización |
| 21 Portal Público | 30 | Marketplace + /indices + /metodologia |
| 22 Marketing + Comms | 25 | Notifs + WhatsApp + webhooks |
| 23 Monetización | 20 | Stripe + API B2B + 7 productos |
| 24 Observabilidad + SRE | 15 | Sentry + PostHog + DR |
| 25 Performance + Mobile | 10 | PWA optimizado |
| 26 Compliance | 10 | LFPDPPP + audit |
| 27 Testing + QA | 10 | Vitest + Playwright |
| 28 Launch Soft | 10 | Soft launch controlado |
| 29 H2/H3 Scaffold | 15 | Preparación roadmap |
| **TOTAL H1** | **~600** | Features individuales trackeables |

---

## 10. CHECKLIST ANTES DE EMPEZAR

Antes de escribir cualquier archivo:

- [ ] Clonar repo nuevo: `git clone git@github.com:manuia88/desarrollosMX-IE2026-Final.git`
- [ ] Crear rama: `git checkout -b docs/plan-maestro-inicial`
- [ ] Crear estructura de carpetas: `mkdir -p docs/{00_FOUNDATION,01_DECISIONES_ARQUITECTONICAS,02_PLAN_MAESTRO,03_CATALOGOS,04_MODULOS,05_OPERACIONAL}`
- [ ] Copiar este briefing al repo nuevo: `cp desarrollosmx-v8final/docs/BRIEFING_PARA_REWRITE.md desarrollosMX-IE2026-Final/docs/`
- [ ] Copiar CONTEXTO_MAESTRO si existe: `cp desarrollosmx-v8final/docs/CONTEXTO_MAESTRO_DMX_v5.md desarrollosMX-IE2026-Final/docs/` (opcional, solo si ya fue generado)
- [ ] Copiar biblia-v5 de referencia: `cp -r desarrollosmx-v8final/docs/biblia-v5 desarrollosMX-IE2026-Final/docs/`
- [ ] Agregar `docs/biblia-v5/` a `.gitignore` del nuevo repo (docs internos)
- [ ] Agregar `docs/BRIEFING_PARA_REWRITE.md` a versión control (SÍ commitear)
- [ ] Agregar `docs/CONTEXTO_MAESTRO_DMX_v5.md` a versión control (SÍ commitear)

---

## 11. CONSIDERACIONES FINALES DEL AUTOR (yo, Claude anterior)

### Cosas que el founder NO quiere (para evitar over-engineering)
- No microservicios (monolito Next.js es suficiente)
- No GraphQL (tRPC es mejor)
- No Kubernetes (Vercel basta)
- No rewrite parciales H2/H3 sin razón
- No data partnerships formales (datos públicos)

### Cosas que el founder sí quiere ENFÁTICAMENTE
- AI-native (no AI-assisted)
- Multi-country día 1
- Contabilidad full H1 (no MVP contabilidad)
- Marketplace full H1
- Stack limpio desde archivo 1
- Documentación como spec viva (no planning de un solo uso)

### Blockers externos que Manu debe gestionar (agendar en paralelo al dev)
- Cuenta Stripe MX activa (Fase 18)
- Cuenta Stripe Connect (Fase 18)
- Cuenta MercadoPago (Fase 18, multi-country)
- Meta WhatsApp Business API approval (Fase 22 — 2-4 semanas)
- Cuenta Mifiel (Fase 18 — firma electrónica MX)
- Cuenta Facturapi.io o Finkok (Fase 16 — CFDI MX)
- Cuenta Sentry + PostHog (Fase 24)
- Dominio + subdominios (desarrollosmx.com, api.desarrollosmx.com, app.desarrollosmx.com)
- Cuentas de email transaccional (Resend)
- Bancos para integración (BBVA, Santander — solo si Manu tiene contactos)
- SAT API access (Fase 16 — requiere FIEL)

### Cosas que aprenderemos durante ejecución
Este plan es una guía sólida pero el producto va a evolucionar. Cada fase cierra con un git tag y checkpoint. Si algo cambia radicalmente, refactorizar el plan ANTES de seguir, no después.

### Cita final del founder (para anclar el alma del producto)
> *"El marketplace es el canal. El IE es el producto. Los datos temporales acumulados son el moat."*

---

**FIN DEL BRIEFING.**

Última actualización: 2026-04-17 por Claude Opus 4.7 (chat v5.1 completion + rewrite decision).
