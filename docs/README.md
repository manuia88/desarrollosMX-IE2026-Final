# DesarrollosMX v5 Final

> **Categoría:** Spatial Decision Intelligence
> **Stack:** Next.js 16 · React 19 · TypeScript 5 · Tailwind v4 · tRPC 11 · Supabase · AI-native
> **Status:** Plan maestro completo. Implementación por fases.
> **Último hito:** Plan v5 rewrite completo (71 archivos docs) — 2026-04-17

---

## Propósito

DesarrollosMX (DMX) es una plataforma multi-país de **Spatial Decision Intelligence** para el sector inmobiliario LATAM. Combina un marketplace de preventa vertical con un motor de inteligencia espacial propietario (IE) que fusiona >50 fuentes públicas (INEGI, DENUE, SCIAN, DOF, bancos centrales…) en 118-125 scores normalizados y 7 índices compuestos DMX. Sirve a cuatro audiencias: asesores inmobiliarios, desarrolladores, compradores finales, y clientes institucionales B2B que consumen el IE vía API. El producto es AI-native desde el primer archivo (Copilot + Command Palette + voz), multi-country desde día 1 (MX/CO/AR/BR/CL), y rigurosamente seguro (RLS + auditoría + compliance LFPDPPP).

> *"El marketplace es el canal. El IE es el producto. Los datos temporales acumulados son el moat."* — **Manu Acosta**, founder

---

## Quick start (local dev)

```bash
# 1. Clonar
git clone git@github.com:manuia88/desarrollosMX-IE2026-Final.git
cd desarrollosMX-IE2026-Final

# 2. Node LTS (nvmrc incluido)
nvm use

# 3. Install
npm install

# 4. Supabase link (proyecto qxfuqwlktmhokwwlvggy)
supabase link --project-ref qxfuqwlktmhokwwlvggy

# 5. Aplicar migrations (vacío al principio; van apareciendo con FASE 01+)
supabase db push

# 6. Generar tipos TypeScript desde el schema
supabase gen types typescript --project-id qxfuqwlktmhokwwlvggy > shared/types/database.ts

# 7. Variables de entorno
cp .env.example .env.local
# (llenar secrets: ANTHROPIC_API_KEY, OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, MAPBOX_ACCESS_TOKEN, RESEND_API_KEY, STRIPE_SECRET_KEY, etc.)

# 8. Dev server
npm run dev
# → http://localhost:3000
```

Ver detalle completo de comandos, lint, type-check, test, build, deploy en [`00.4 Comandos y Workflows`](./00_FOUNDATION/00.4_COMANDOS_Y_WORKFLOWS.md). Para onboarding paso a paso: [`05.4 Onboarding Dev`](./05_OPERACIONAL/05.4_ONBOARDING_DEV.md).

---

## Documentación (este directorio `docs/`)

El plan completo vive aquí. 71 archivos organizados por propósito:

| Carpeta | Contenido | Entry point |
|---|---|---|
| [`00_FOUNDATION/`](./00_FOUNDATION/) | Orientación (4 archivos) | [00.1 Visión](./00_FOUNDATION/00.1_VISION_Y_PRINCIPIOS.md) |
| [`01_DECISIONES_ARQUITECTONICAS/`](./01_DECISIONES_ARQUITECTONICAS/) | 10 ADRs (Nygard) | [ADR-001](./01_DECISIONES_ARQUITECTONICAS/ADR-001_REWRITE_DESDE_CERO.md) |
| [`02_PLAN_MAESTRO/`](./02_PLAN_MAESTRO/) | 30 fases ejecutables | [Índice Maestro](./02_PLAN_MAESTRO/02.0_INDICE_MAESTRO.md) |
| [`03_CATALOGOS/`](./03_CATALOGOS/) | 12 catálogos de referencia | [03.1 Tablas BD](./03_CATALOGOS/03.1_CATALOGO_BD_TABLAS.md) |
| [`04_MODULOS/`](./04_MODULOS/) | 20 specs funcionales | [M01 Dashboard Asesor](./04_MODULOS/M01_DASHBOARD_ASESOR.md) |
| [`05_OPERACIONAL/`](./05_OPERACIONAL/) | 6 runbooks | [05.1 Deployment](./05_OPERACIONAL/05.1_DEPLOYMENT_GUIDE.md) |

---

## Primer paso como dev nuevo

Leer, en este orden exacto:

1. [`00.1 Visión y Principios`](./00_FOUNDATION/00.1_VISION_Y_PRINCIPIOS.md) — qué es DMX y por qué existe
2. [`00.2 Stack y Convenciones`](./00_FOUNDATION/00.2_STACK_Y_CONVENCIONES.md) — stack técnico + reglas de código
3. [`00.3 Glosario y Ontología`](./00_FOUNDATION/00.3_GLOSARIO_Y_ONTOLOGIA.md) — vocabulario compartido (contacto ≠ lead, captación, operación, IE, …)
4. [`00.4 Comandos y Workflows`](./00_FOUNDATION/00.4_COMANDOS_Y_WORKFLOWS.md) — recetas de terminal + git + Claude Code
5. [`02.0 Índice Maestro`](./02_PLAN_MAESTRO/02.0_INDICE_MAESTRO.md) — mapa de las 30 fases + DAG
6. [`05.4 Onboarding Dev`](./05_OPERACIONAL/05.4_ONBOARDING_DEV.md) — setup local detallado + expected first week

Después de esto, consulta el ADR y la FASE relevantes al área que vayas a tocar.

---

## Enlaces rápidos

### ADRs clave
- [`ADR-001 Rewrite desde cero`](./01_DECISIONES_ARQUITECTONICAS/ADR-001_REWRITE_DESDE_CERO.md)
- [`ADR-002 AI-Native Architecture`](./01_DECISIONES_ARQUITECTONICAS/ADR-002_AI_NATIVE_ARCHITECTURE.md)
- [`ADR-003 Multi-country Schema`](./01_DECISIONES_ARQUITECTONICAS/ADR-003_MULTI_COUNTRY_SCHEMA.md)
- [`ADR-008 Monetización + Feature Gating`](./01_DECISIONES_ARQUITECTONICAS/ADR-008_MONETIZATION_FEATURE_GATING.md) (DMX NO post-venta)
- [`ADR-009 Security Model`](./01_DECISIONES_ARQUITECTONICAS/ADR-009_SECURITY_MODEL.md)
- [`ADR-010 IE Pipeline Architecture`](./01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md) (Habi API PROHIBIDA)

### Módulos críticos
- [`M01 Dashboard Asesor`](./04_MODULOS/M01_DASHBOARD_ASESOR.md) — cara visible del portal asesor
- [`M07 Operaciones`](./04_MODULOS/M07_OPERACIONES.md) — pipeline de cierre con escrow
- [`M12 Contabilidad Dev`](./04_MODULOS/M12_CONTABILIDAD_DEV.md) — CFDI + SAT + multi-RFC
- [`M18 Dashboard Comprador`](./04_MODULOS/M18_DASHBOARD_COMPRADOR.md) — Netflix personalization
- [`M19 Marketplace Público`](./04_MODULOS/M19_MARKETPLACE_PUBLICO.md) — canal de captación

### Catálogos de alto impacto
- [`03.8 Catálogo Scores IE`](./03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md) — 118-125 entregables IE (el moat)
- [`03.9 Catálogo Fuentes Datos`](./03_CATALOGOS/03.9_CATALOGO_FUENTES_DATOS.md) — 50+ fuentes (INEGI, DENUE, SCIAN, DOF, bancos…)
- [`03.10 Features Registry`](./03_CATALOGOS/03.10_CATALOGO_FEATURES_REGISTRY.md) — 108+ features con plan gating
- [`03.11 Productos B2B`](./03_CATALOGOS/03.11_CATALOGO_PRODUCTOS_B2B.md) — 7 productos licenciables + DMX Estimate
- [`03.4 RLS Policies`](./03_CATALOGOS/03.4_CATALOGO_BD_RLS.md) — seguridad a nivel BD (`prevent_role_escalation` NO-NEGOCIABLE)

### Fases de arranque
- [`FASE 00 Bootstrap`](./02_PLAN_MAESTRO/FASE_00_BOOTSTRAP.md)
- [`FASE 01 BD Fundación`](./02_PLAN_MAESTRO/FASE_01_BD_FUNDACION.md)
- [`FASE 02 Auth y Permisos`](./02_PLAN_MAESTRO/FASE_02_AUTH_Y_PERMISOS.md)
- [`FASE 03 AI-Native Shell`](./02_PLAN_MAESTRO/FASE_03_AI_NATIVE_SHELL.md)

---

## Contribución

Reglas completas en [`00.2 Stack y Convenciones`](./00_FOUNDATION/00.2_STACK_Y_CONVENCIONES.md). Resumen ejecutivo:

- **Cualquier decisión arquitectónica requiere un ADR.** No hay decisiones "informales". Usa el formato Nygard (Context → Decision → Rationale → Consequences → Alternatives → References).
- **Conventional Commits obligatorio**: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- **Branch protection `main`**: PRs requeridos + CI pass + 1 approval.
- **Zod como single source of truth**: un esquema Zod genera el tipo TS, la validación tRPC y el resolver react-hook-form.
- **Ningún query sin RLS**. El cliente público SIEMPRE respeta RLS. El admin client solo en rutas backend con justificación escrita.
- **Zero `any`** — `noImplicitAny: true` rompe el build.
- **i18n everywhere**: cero strings hardcoded en UI.
- **Multi-country everywhere**: todo formateo (fechas, monedas, direcciones) respeta `useLocale()` + `useCurrency()`.
- **Tag por fase**: cada fase cierra con `git tag fase-NN-complete`.

---

## Estado actual

- **Plan maestro v5 Final** completado: 71 archivos docs (4 foundation + 10 ADRs + 30 fases + 12 catálogos + 20 módulos + 6 runbooks + README + Índice Maestro).
- **Implementación:** en espera de arranque de [FASE 00 Bootstrap](./02_PLAN_MAESTRO/FASE_00_BOOTSTRAP.md).
- **Repo Supabase nuevo**: `qxfuqwlktmhokwwlvggy` (schema vacío — se crea desde FASE 01).
- **Repo viejo archivado**: `desarrollosmx-v8final` queda como histórico de aprendizaje, sin usuarios reales ni data vinculada.

### Bloqueantes externos (Manu gestiona en paralelo al dev)
Ver [Briefing §11](./BRIEFING_PARA_REWRITE.md) — resumen: Stripe MX + Connect, MercadoPago, Meta WhatsApp Business API (2-4 semanas), Mifiel, Facturapi.io / Finkok, Sentry, PostHog, Resend, dominio `desarrollosmx.com`, SAT FIEL.

---

## Referencias internas (gitignored, diseño)

Estos archivos viven en `docs/` localmente pero están **gitignored** — contienen IP/spec no pública y se usan solo como referencia interna durante la reescritura:

- `docs/biblia-v5/` — 28 fuentes originales v5 (decisiones consolidadas + audit + specs de módulos + DOCX Pulppo)
- `docs/referencias-ui/` — 10 JSX Dopamine del repo viejo v5.1 (spec visual portada al rewrite)
- [`docs/BRIEFING_PARA_REWRITE.md`](./BRIEFING_PARA_REWRITE.md) — briefing que originó el rewrite (sí commiteado)
- [`docs/CONTEXTO_MAESTRO_DMX_v5.md`](./CONTEXTO_MAESTRO_DMX_v5.md) — síntesis consolidada (sí commiteado)

---

## Licencia

**Propietario.** Código y docs confidenciales. Founder: **Manu Acosta**. Cualquier uso, reproducción o distribución sin autorización escrita está prohibida.

---

**Autor del README:** Claude Opus 4.7 (rewrite BATCH 3 Agent I) | **Fecha:** 2026-04-17
