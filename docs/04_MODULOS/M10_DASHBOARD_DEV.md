# M10 — Dashboard Desarrollador

> **Portal:** Desarrollador
> **Ruta principal:** `/desarrolladores/dashboard`
> **Fase donde se construye:** [FASE 15 — Portal Desarrollador](../02_PLAN_MAESTRO/FASE_15_PORTAL_DESARROLLADOR.md)
> **Sidebar tint:** (portal desarrollador usa propia identidad visual, no asesor tints)
> **Priority:** [H1]

---

## Descripción funcional

Dashboard del portal desarrollador (developer). Primera vista tras login de usuario `role='developer'` o `role='dev_admin'`. Muestra: Trust Score H05 propio (reputación), perfil desarrolladora (logo + datos fiscales + años operando), KPIs propios (proyectos activos, unidades vendidas MTD, revenue MTD, conversion rate, tickets abiertos), Morning Briefing AI dev-oriented (absorción vs forecast, alertas inventario crítico, leads nuevos calientes), inventory snapshot (unidades disponibles vs vendidas por proyecto), pendientes (documentos por aprobar, landing pages por publicar, CFDIs pendientes), 5 quick actions (subir doc, crear landing, emitir CFDI, enviar comunicado, iniciar campaña).

## Flujos principales

### Flujo 1 — Carga dashboard
1. Usuario `role='developer'` loguea → landing `/desarrolladores/dashboard`.
2. `trpc.developer.getDashboard` — input: `{ developerId }` / output: todo.
3. Components hidratan con skeletons.

### Flujo 2 — Trust Score H05 (ver detalle)
1. Widget Trust Score card con score 0-100 + nivel (Bronze/Silver/Gold/Platinum).
2. Click → drawer con breakdown: financial health, on-time delivery, doc transparency, post-venta responsiveness, reviews.
3. Citations: cómo se calcula + cómo mejorar.

### Flujo 3 — Morning Briefing Dev
1. Card con streaming text (Anthropic Claude Sonnet 4).
2. Input: datos últimos 7 días (absorción, pricing vs competencia, leads nuevos, alertas).
3. Output: 3 puntos accionables para el día.

### Flujo 4 — Inventory snapshot
1. Bar chart horizontal por proyecto: disponible (verde) vs apartado (amarillo) vs vendido (azul).
2. Click proyecto → navigate M11 Inventario con filtro.

### Flujo 5 — Quick actions
1. Subir doc → drawer upload → trigger Doc Intel Fase 17.
2. Crear landing → M14 Marketing Dev wizard.
3. Emitir CFDI → M12 Contabilidad Dev.
4. Enviar comunicado → bulk email a leads activos.
5. Iniciar campaña → M14 Marketing Dev.

## Wireframe textual

```
┌──────────────────────────────────────────────────────────────┐
│ Logo DMX Dev | [Company name] | ⌘K | 🔔 | Avatar              │
├────┬─────────────────────────────────────────────────────────┤
│ SB │ Buenos días, Desarrolladora Livrada ✨                   │
│    │ ┌────────────────────┬────────────────────┐              │
│    │ │ Trust Score: 87    │ Morning Briefing    │              │
│    │ │ Gold ⭐             │ "Tienes 3 alertas.."│              │
│    │ └────────────────────┴────────────────────┘              │
│    │ ┌───┬───┬───┬───┬───┐                                    │
│    │ │P.a│U.V│Rev│Cnv│Tkt│  (KPIs)                             │
│    │ └───┴───┴───┴───┴───┘                                    │
│    │ Inventory Snapshot (bar horizontal por proyecto)         │
│    │ Pendientes (list)        | Quick Actions (5)             │
└────┴─────────────────────────────────────────────────────────┘
```

## Componentes UI requeridos

- `<DevHeader />` — logo + brand + ⌘K + notifs + user.
- `<DevSidebar />` — Dashboard / Inventario / Contabilidad / CRM / Marketing / Analytics IE.
- `<TrustScoreCard />` — score + level + click drawer.
- `<TrustScoreDrawer />` — breakdown + citations.
- `<DevCompanyHeader />` — logo + nombre + RFC + años operando.
- `<DevKpiGrid />` — 5 KPIs.
- `<MorningBriefingDev />` — streaming text dev-oriented.
- `<InventorySnapshot />` — bar chart Recharts.
- `<PendientesList />` — docs por aprobar + landings pending + CFDIs pending.
- `<DevQuickActions />` — 5 buttons.

## Procedures tRPC consumidas

- `developer.getDashboard` — completo.
- `developer.getTrustScore` — input: `{ developerId }` / output: `{ score, level, breakdown, improvements }`.
- `developer.getInventorySnapshot`.
- `developer.getPendientes`.
- `ai.generateMorningBriefingDev`.
- `developer.getKpis` — MTD.

## Tablas BD tocadas

- `developers` — company data.
- `proyectos` — inventario (counts).
- `unidades` — disponibles/apartadas/vendidas.
- `operaciones` — revenue MTD.
- `leads_dev` — conversion.
- `documents` — docs pending approval.
- `landings` — pending publish.
- `fiscal_documents` — CFDIs pending.
- `dev_trust_scores` — H05 breakdown.
- `ai_generated_content`.

## Estados UI

- **Loading**: skeletons.
- **Error**: banner + retry.
- **Empty** (dev nuevo): CTA onboarding "Sube tu primer proyecto" + video tutorial.
- **Success**: datos hidratados.

## Validaciones Zod

```typescript
const dashboardInput = z.object({
  developerId: z.string().uuid(),
  rangeFrom: z.string().date().optional(),
  rangeTo: z.string().date().optional(),
});
```

## Integraciones externas

- **Anthropic Claude** — morning briefing dev.
- **Supabase Realtime** — inventory updates instant.
- **PostHog** — dev analytics.
- **Sentry** — errors.

## Tests críticos

- [ ] RLS: dev solo ve sus proyectos + KPIs.
- [ ] Trust Score breakdown tiene 5 categorías.
- [ ] Morning briefing genera con dev context (absorción real, no hallucinations).
- [ ] Inventory snapshot realtime update al vender unidad.
- [ ] Quick actions navegan correcto.
- [ ] i18n: `t('dev.dashboard.*')`.

## i18n keys ejemplo

```tsx
<h1>{t('dev.dashboard.greeting', { companyName })}</h1>
<Badge>{t('dev.trustScore.level.' + level)}</Badge>
```

## Cross-references

- ADR-002 AI-Native (briefing dev)
- ADR-003 Multi-Country (dev puede operar multi-país)
- ADR-008 Monetization (plan Free/Starter/Pro/Enterprise limits)
- [FASE 15](../02_PLAN_MAESTRO/FASE_15_PORTAL_DESARROLLADOR.md)
- [03.8 Scores IE](../03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md) — H05 Trust Score
- Módulos relacionados: M11 Inventario Dev, M12 Contabilidad, M13 CRM Dev, M14 Marketing, M15 Analytics IE

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent H) | **Fecha:** 2026-04-17
