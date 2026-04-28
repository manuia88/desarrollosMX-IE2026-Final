# M14 — Marketing Desarrollador

> **Portal:** Desarrollador
> **Ruta principal:** `/desarrolladores/marketing`
> **Fase donde se construye:** [FASE 15 — Portal Desarrollador](../02_PLAN_MAESTRO/FASE_15_PORTAL_DESARROLLADOR.md)
> **Priority:** [H1]

---

## Descripción funcional

Centro de marketing del desarrollador. Campañas (lanzamiento, promociones temporales, eventos presenciales), landings automáticas por proyecto (template + datos proyecto → URL publicada), kit de ventas con IE cards inline (DMX Score + zone_scores embebidos), auto-generación de piezas gráficas, analytics de campañas (CTR, CPL, CAC, conversion por fuente), integración con portales externos (feed XML Inmuebles24, MLS, etc). Diferenciador: IE cards posicionan desarrollos con data rigurosa vs competencia genérica.

## Flujos principales

### Flujo 1 — Campañas
1. Tab "Campañas" → lista con cards.
2. Botón "+ Campaña" → wizard:
   - Paso 1: Tipo (launch / promo / evento / branding).
   - Paso 2: Proyecto(s) asociados.
   - Paso 3: Presupuesto + fechas + canales (Meta Ads / Google Ads / Email / WA / Landing).
   - Paso 4: Creativos (upload + genera con AI).
   - Paso 5: Tracking UTM + pixels.
3. Submit → CREATE campaign + deploys.

### Flujo 2 — Landings auto por proyecto
1. Tab "Landings" → lista landings (auto-generadas + custom).
2. Auto-generate: selecciona proyecto → template → one-click publish.
3. Edit inline: copy, photos, CTA.
4. URL: `/proyectos/[id]` (ficha público M20) o custom domain.

### Flujo 3 — Kit de ventas con IE
1. Tab "Kit Ventas" → genera PDF/keynote con:
   - Fotos HD.
   - Especs técnicas.
   - **IE Cards**: DMX Score + zone_scores + momentum + absorción forecast.
   - Mapa + ecosistema (walkability, safety, transit).
   - Financial model (ROI estimates).
2. Export PDF + PPTX + link web interactivo.

### Flujo 4 — Auto-generación piezas
1. Similar M08 (shared): 5 variantes PostCuadrado / PostLargo / Story / VideoStory / Video.
2. Differencia M14 vs M08: para dev aplica a proyectos del dev, incluye branding corporativo.

### Flujo 5 — Analytics campañas
1. Tab "Analytics" → dashboard por campaña:
   - Impressions, Clicks, CTR.
   - Leads, Cost per Lead (CPL).
   - Conversions, Customer Acquisition Cost (CAC).
   - Funnel: impression → click → lead → visit → offer → close.
2. Breakdown por canal.
3. A/B tests (PostHog).

### Flujo 6 — Feed XML portales
1. Tab "Portales" → config feeds:
   - Inmuebles24 XML feed URL + credentials.
   - MLS EasyBroker sync.
   - MercadoLibre API.
2. Publish/depublish bulk por portal.
3. Stats: cuántas unidades activas por portal, leads recibidos.

## Wireframe textual

```
┌──────────────────────────────────────────────────────────────┐
│ Marketing Dev    Campañas | Landings | Kit | Analytics | Ports│
├────┬─────────────────────────────────────────────────────────┤
│ SB │ Campañas activas (4)                                     │
│    │ ┌─Launch Torre Nápoles──────────────┐                    │
│    │ │ Presup $250K MXN | 15/20 días      │                    │
│    │ │ CTR 3.2% | CPL $420 | 120 leads   │                    │
│    │ │ [Ver analytics] [Pausar]          │                    │
│    │ └───────────────────────────────────┘                    │
└────┴─────────────────────────────────────────────────────────┘
```

## Componentes UI requeridos

- `<CampaignsList />` + `<CampaignCard />`.
- `<CampaignWizard />` — 5 pasos.
- `<CreativeUploader />` + `<AICreativeGenerator />`.
- `<LandingsAutoList />` — per proyecto.
- `<KitVentasBuilder />` — IE cards embedded.
- `<IECardEmbed />` (`features/scores/components/IECardEmbed.tsx`) — DMX Score + zone_scores render.
- `<CampaignAnalytics />` — funnel + breakdown.
- `<PortalesFeedConfig />`.

## Procedures tRPC consumidas

- `devMarketing.listCampaigns`, `createCampaign`, `updateCampaign`, `pauseCampaign`.
- `devMarketing.getCampaignAnalytics`.
- `devMarketing.listLandings`, `autoGenerateLanding`.
- `devMarketing.generateKitVentas` — input: `{ projectId, format: 'pdf'|'pptx'|'web' }`.
- `devMarketing.publishToPortal`, `configPortalFeed`.
- `marketing.generateAssets` (shared M08).

## Tablas BD tocadas

- `campaigns` — campañas dev.
- `campaign_creatives`.
- `campaign_analytics` (daily aggregations).
- `landings` — shared con asesor.
- `kit_ventas_generations`.
- `marketing_portales_dev` — configs dev-level.
- `utm_tracks` — attribution.

## Estados UI

- **Loading**: skeleton.
- **Error**: toast.
- **Empty**: CTA + video tutorial "Tu primera campaña".
- **Success**: cards + charts.

## Validaciones Zod

```typescript
const createCampaignInput = z.object({
  tipo: z.enum(['launch', 'promo', 'evento', 'branding']),
  projectIds: z.array(z.string().uuid()).min(1),
  budget: z.number().positive(),
  currency: z.enum(['MXN', 'USD']).default('MXN'),
  startDate: z.string().date(),
  endDate: z.string().date(),
  channels: z.array(z.enum(['meta_ads', 'google_ads', 'email', 'whatsapp', 'landing', 'portales'])).min(1),
  creatives: z.array(z.object({
    variant: z.enum(['postCuadrado', 'postLargo', 'story', 'videoStory', 'video']),
    url: z.string().url(),
  })).min(1),
  utmSource: z.string(),
  utmMedium: z.string(),
  utmCampaign: z.string(),
});
```

## Integraciones externas

- **Meta Ads API** — deploy ads + insights.
- **Google Ads API**.
- **Resend** — email campaigns.
- **WhatsApp Business** — broadcast (previa approval template).
- **Inmuebles24 Feed API**.
- **EasyBroker MLS**.
- **MercadoLibre Publisher API**.
- **PostHog** — A/B tests.
- **Vercel OG** — dynamic images.

## Tests críticos

- [ ] Campaign creación con 3 canales deploys en paralelo.
- [ ] Landing auto-generate < 10s.
- [ ] Kit ventas PDF incluye IE card con DMX Score correcto.
- [ ] Feed Inmuebles24 XML valid schema.
- [ ] Analytics CPL calculation: spend / leads.
- [ ] A/B test crea 2 variantes y trackea.
- [ ] RLS dev.
- [ ] i18n: `t('dev.marketing.*')`.

## i18n keys ejemplo

```tsx
<Tab>{t('dev.marketing.tabs.' + t)}</Tab>
<Badge>{t('dev.marketing.status.' + s)}</Badge>
```

## Cross-references

- ADR-002 AI-Native (creative generation)
- [FASE 15](../02_PLAN_MAESTRO/FASE_15_PORTAL_DESARROLLADOR.md)
- [FASE 22 Marketing Comms](../02_PLAN_MAESTRO/FASE_22_MARKETING_COMMS.md)
- Módulos relacionados: M08 Marketing Asesor (shared components), M15 Analytics IE, M20 Ficha Proyecto Personalizada

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent H) | **Fecha:** 2026-04-17

---

## APPEND v3 onyx-benchmarked (2026-04-28) — B.4 Ad spend multi-touch + CF.2 Studio video auto

**Autoritativo:** [ADR-060](../01_DECISIONES_ARQUITECTONICAS/ADR-060_FASE_15_BUCKET_B_ONYX_BENCHMARKED_INTEGRATION.md).

### B.4 — Ad spend multi-touch attribution + Claude IA pause channels (extiende M14)

**BD existente extendida:** Migration agrega columnas a `campaign_analytics`:
- `attribution_model enum default 'last_touch'` (linear|time_decay|position_based|last_touch)
- `attribution_score jsonb` (multi-touch breakdown)
- `recommended_action enum continue|pause|scale|optimize`
- `ai_recommendation_reasoning text`

**Engines:**
- `lib/marketing/attribution-multi-touch.ts` — 4 modelos (linear/time_decay/position_based/last_touch)
- `lib/marketing/ad-spend-optimizer.ts` — Claude Sonnet evalúa cada campaign vs CPL/ROI media

**Cron `ad_spend_optimizer_daily` 6am:** evalúa todas campañas activas. Si CPL > 2x media + ROI < 1.5x → recomienda `pause`. Si ROI > 3x → recomienda `scale`.

**tRPC extiende `features/marketing/routes/marketing.ts`:**
- `getAttributionReport({campaignId, model})` returns waterfall data
- `getOptimizerRecommendations({range})` returns top 10 actions
- `applyOptimizerAction({campaignId, action})` ejecuta con audit_log

**UI:** tab Marketing > Atribución con waterfall chart + recomendaciones inline + botón "Aplicar".

**Notif type 18:** "Canal X pasado threshold — pausar sugerido" daily digest dev.

**Cross-fn:** alimenta M09 Estadísticas asesor con CPA real (no last-click) + M10 Dashboard dev "ROI canales".

**Esfuerzo:** 10-14h. **Priority:** 🥇 #3.

---

### CF.2 — Studio video auto desde M14 (Marketing Dev → DMX Studio)

**Diferenciador único LATAM** — Onyx no tiene video AI generativo.

**UI:** tab "Video AI" en M14 Marketing Dev. Botones:
- "Generar video proyecto" (1 video hero proyecto, 60-90s)
- "Generar 5 videos prototipos destacados" (1 por prototipo principal, 30-45s c/u)

**Backend:** Reusa `features/dmx-studio/routes` shipped F14.F (Kling video gen + ElevenLabs TTS + Claude director). Crea `studio_video_jobs` con `source='m14_marketing_dev'` + `project_id` + `dev_id`.

**Cost-tracked:** En `studio_usage` per dev (canon F14.F.12 ADR-058). Pricing dev_pro+ tier incluido (Studio Pro bundled — Opción C founder lock-in).

**tRPC nueva:** `devMarketing.requestStudioVideoJob({projectId, type: 'project'|'prototype'})` extiende M14 router.

**Cross-fn:** Studio routes 100% reutilizadas (zero rebuild) + audit_log tracking + notif type 25 nuevo "Video proyecto generado" cuando completa.

**Esfuerzo:** 3-5h (15.D.4 nuevo). **Priority:** 🥈 cross-fn.

---

**Autor v3:** Claude Opus 4.7 PM (canon zero preguntas) | **Fecha:** 2026-04-28
