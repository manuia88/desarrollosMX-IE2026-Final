# M16 — Dashboard Admin (17 Pages)

> **Portal:** Admin
> **Ruta principal:** `/admin`
> **Fase donde se construye:** [FASE 19 — Portal Admin](../02_PLAN_MAESTRO/FASE_19_PORTAL_ADMIN.md)
> **Priority:** [H1]

---

## Descripción funcional

Portal interno de administración DMX. **17 pages** para super-admins + staff DMX con responsabilidades operacionales (soporte, moderación, finance, SRE, producto). Incluye AARRR dashboard, gestión participantes (asesores/devs/MBs KYC approval), revenue Stripe, Market Observatory (ver M17 submódulo), macro dashboard, zonas + anomalías, API Metrics, cohort analysis, system health, feature registry, role matrix, audit log reader, Stripe webhooks monitor, config global + feature flags. Super-admin tools: impersonation con audit, bulk ops, emergency flags.

## Páginas (17)

1. **Dashboard AARRR** — `/admin` — métricas AARRR (Acquisition/Activation/Retention/Revenue/Referral) platform-wide.
2. **Projects Management** — `/admin/projects` — moderación proyectos (aprobar/bloquear/unlistr).
3. **Participantes** — `/admin/participantes` — asesores/devs/MBs con KYC approval workflow.
4. **Revenue Stripe** — `/admin/revenue` — MRR, ARR, churn, LTV, CAC.
5. **Market Observatory** — `/admin/observatory` — ver M17 (submódulo).
6. **Macro Dashboard** — `/admin/macro` — indicadores nacionales (PIB, INPC, tasas BANXICO, ventas inmuebles).
7. **Zonas** — `/admin/zonas` — gestión zone_scores + filtros.
8. **Anomalías** — `/admin/anomalies` — feed E04 Anomaly Detector (spikes, outliers, suspicious).
9. **API Metrics** — `/admin/api-metrics` — requests/day, top consumers, revenue API, errors.
10. **Cohort Analysis** — `/admin/cohorts` — cohortes usuarios por mes signup.
11. **Cohort Revenue** — `/admin/cohorts-revenue` — revenue per cohort.
12. **System Health** — `/admin/health` — widget `/api/health` + Supabase connection + Sentry errors + Vercel deploy.
13. **Feature Registry** — `/admin/features` — 108+ features v5 sistema permisos.
14. **Role Features Matrix** — `/admin/roles` — assign features to roles.
15. **Audit Log Reader** — `/admin/audit` — tabla audit_log con filters.
16. **Stripe Webhooks Monitor** — `/admin/stripe-webhooks` — event stream + replays.
17. **Config Global + Feature Flags** — `/admin/config` — flags on/off, env vars read-only.

## Flujos principales

### Flujo 1 — Moderar proyecto
1. `/admin/projects` → lista con status + flags.
2. Click proyecto → review + checks (Quality Score + docs + fotos + legal).
3. Acción: Approve / Reject (con motivo) / Request info / Shadow-ban.
4. Webhook notifica dev.

### Flujo 2 — KYC participante
1. `/admin/participantes` → tab por role (asesor/dev/MB).
2. Pending KYC: lista.
3. Click → review docs (ID, RFC, CFDI sample, proof of address).
4. Approve → crea Stripe Connect account + envía email welcome.
5. Reject con motivo.

### Flujo 3 — Feature flag toggle
1. `/admin/config` → toggle features globales (ej: `discover_weekly_enabled=true`).
2. Guarda en Vercel Edge Config.
3. Cambios propagan en <60s.

### Flujo 4 — Impersonation (super-admin)
1. Botón "Impersonate" en perfil user.
2. Requires 2FA re-auth.
3. Log impersonation_start → `audit_log` con timestamp + reason.
4. Banner persistente "Impersonating Juan Pérez [Stop]".
5. Acciones loggeadas como impersonator.
6. Stop → log impersonation_end.

### Flujo 5 — Emergency flags
1. `/admin/config` sección "Emergency".
2. Toggles: `maintenance_mode`, `disable_new_signups`, `disable_ai`, `disable_payments`.
3. Confirmación extra: "Escribe 'EMERGENCY' para activar".
4. Broadcast a todos los portales.

### Flujo 6 — Audit log reader
1. `/admin/audit` → tabla con filters (user, action, date, entity).
2. Search full-text.
3. Export CSV para compliance.

### Flujo 7 — Stripe webhooks monitor
1. `/admin/stripe-webhooks` → event stream realtime.
2. Failed events → retry button.
3. Event details + payload JSON.

## Wireframe textual

```
┌──────────────────────────────────────────────────────────────┐
│ DMX Admin Console        [Search ⌘K]  [Impersonate] [Avatar] │
├────┬─────────────────────────────────────────────────────────┤
│ SB │ 📊 Dashboard                                            │
│ 17 │ AARRR: 1.2K Acquired | 680 Active | 420 Retained       │
│ p  │        $85K MRR | 0.08 Churn rate | $150 CAC            │
│    │                                                          │
│    │ ┌─Charts grid─────────────────────────────────┐         │
│    │ │ [Signups/day]  [MRR growth]  [Churn]       │         │
│    │ │ [Cohort heatmap] [Top regions] [Top sources]│         │
│    │ └──────────────────────────────────────────────┘         │
└────┴─────────────────────────────────────────────────────────┘
```

## Componentes UI requeridos

- `<AdminSidebar />` — 17 items.
- `<AARRRDashboard />`.
- `<ProjectsModeration />` — list + detail + actions.
- `<ParticipantesTable />` — per role tabs.
- `<KYCReviewer />`.
- `<RevenueDashboard />` — Stripe connect + charts.
- `<MacroDashboard />`.
- `<ZonasManager />`.
- `<AnomaliasFeed />`.
- `<APIMetricsDashboard />`.
- `<CohortAnalysis />`.
- `<SystemHealthWidget />`.
- `<FeatureRegistryTable />`.
- `<RoleMatrixEditor />`.
- `<AuditLogTable />`.
- `<StripeWebhooksMonitor />`.
- `<ConfigGlobal />` + `<EmergencyFlagsPanel />`.
- `<ImpersonateButton />` + `<ImpersonationBanner />`.

## Procedures tRPC consumidas

- `admin.getAARRR`.
- `admin.moderateProject`.
- `admin.kycApprove`, `kycReject`.
- `admin.getRevenue`.
- `admin.getMacroIndicators`.
- `admin.getAnomalies`.
- `admin.getAPIMetrics`.
- `admin.getCohorts`.
- `admin.getSystemHealth`.
- `admin.listFeatures`, `updateFeature`.
- `admin.updateRoleFeatures`.
- `admin.getAuditLog`.
- `admin.listStripeWebhooks`, `retryStripeWebhook`.
- `admin.updateConfig`, `toggleFeatureFlag`.
- `admin.impersonate`, `stopImpersonation` (super-admin only).

## Tablas BD tocadas

- `asesores`, `developers`, `mbs` (moderación).
- `proyectos` (moderación).
- `kyc_submissions`.
- `stripe_events`.
- `macro_indicators`.
- `zone_scores` (gestión).
- `anomalies`.
- `api_metrics`.
- `cohort_reports`.
- `feature_registry`.
- `role_features`.
- `audit_log`.
- `system_config`.
- `feature_flags`.
- `impersonation_sessions`.

## Estados UI

- **Loading**: skeletons.
- **Error**: banner + Sentry link.
- **Success**: data.

## Validaciones Zod

```typescript
const moderateProjectInput = z.object({
  projectId: z.string().uuid(),
  action: z.enum(['approve', 'reject', 'request_info', 'shadow_ban']),
  motivo: z.string().max(1000).optional(),
});

const impersonateInput = z.object({
  targetUserId: z.string().uuid(),
  reason: z.string().min(20).max(500),
  durationMinutes: z.number().int().min(5).max(120).default(30),
  mfaCode: z.string().length(6),
});

const toggleFeatureFlagInput = z.object({
  flagKey: z.string().max(80),
  value: z.boolean(),
  rollout: z.enum(['0', '10', '25', '50', '100']).default('100'),
  environment: z.enum(['development', 'preview', 'production']).default('production'),
});
```

## Integraciones externas

- **Stripe** — revenue + webhooks.
- **Supabase** — all tables + auth.
- **Vercel Edge Config** — feature flags.
- **Sentry** — errors.
- **PostHog** — cohorts + funnels.
- **Anthropic Claude** — anomaly explanations.

## Tests críticos

- [ ] Super-admin role only accede /admin (RLS + middleware).
- [ ] Impersonation requiere 2FA.
- [ ] Audit log registra impersonation_start y _end.
- [ ] Emergency flag maintenance_mode bloquea rutas public.
- [ ] KYC approve → Stripe Connect account creado.
- [ ] Stripe webhook retry re-envía event.
- [ ] Moderación proyecto reject notifica dev.
- [ ] Feature flag toggle propaga <60s.
- [ ] i18n: admin UI en-US default, es-MX fallback.

## i18n keys ejemplo

```tsx
<Tab>{t('admin.sidebar.' + item)}</Tab>
<Badge>{t('admin.kyc.status.' + s)}</Badge>
```

## Cross-references

- ADR-008 Monetization (revenue dashboard)
- ADR-009 Security (audit + RLS)
- [FASE 19](../02_PLAN_MAESTRO/FASE_19_PORTAL_ADMIN.md)
- M17 Market Observatory (submódulo)
- [03.10 Features Registry](../03_CATALOGOS/03.10_CATALOGO_FEATURES_REGISTRY.md)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent H) | **Fecha:** 2026-04-17
