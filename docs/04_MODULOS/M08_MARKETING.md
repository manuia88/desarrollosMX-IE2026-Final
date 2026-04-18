# M08 — Marketing (Asesor)

> **Portal:** Asesor
> **Ruta principal:** `/asesores/marketing`
> **Fase donde se construye:** [FASE 14 — Portal Asesor M6-M10](../02_PLAN_MAESTRO/FASE_14_PORTAL_ASESOR_M6_M10.md)
> **Sidebar tint:** bgSlate `#F0F2F7`
> **Priority:** [H1]
> **Referencia visual:** `/docs/referencias-ui/M8_Marketing.tsx`

---

## Descripción funcional

Centro de marketing del asesor. Gestiona landing pages personalizadas, QR codes, WhatsApp templates, client folders (radar compartido con compradores), auto-generación de piezas gráficas (PostCuadrado / PostLargo / Story / VideoStory ≤24h / Video ≤24h) con IA, upload y clasificación de fotos, publicación a portales externos (marketing_portales — Inmuebles24, MercadoLibre, Vivanuncios). Cada pieza tiene status `ready/generating/expired`. IE Cards inline (DMX Score, zone_scores) embebibles en piezas para diferenciación competitiva.

## Flujos principales

### Flujo 1 — Landing pages
1. Tab "Landings" → lista con thumbnails.
2. Botón "+ Nueva landing" → wizard: plantilla → proyecto(s) → personalización (brand colors, CTA, copy).
3. `trpc.marketing.createLanding` → URL short publicada (`/l/asesor-slug/landing-slug`).
4. Analytics integrado (visits, leads, CTR).

### Flujo 2 — QR codes
1. Tab "QR" → lista QRs existentes.
2. Generar nuevo: seleccionar destino (proyecto / landing / microsite) + copy + color brand.
3. `trpc.marketing.createQR` → PNG + SVG + short URL.
4. Tracking con UTM params auto.

### Flujo 3 — WhatsApp templates
1. Tab "WA Templates" → lista plantillas approved por Meta.
2. Crear nueva: nombre, category (marketing/utility), body + placeholders {{1}} {{2}} + header image/video opcional + footer + buttons CTA.
3. `trpc.marketing.createTemplate` → envía a Meta para approval.
4. Estados: pending / approved / rejected.

### Flujo 4 — Client folders (Radar)
1. Tab "Folders" → lista folders (1 folder = 1 comprador target).
2. Add proyecto(s) → genera URL radar compartida `/radar/[slug]`.
3. Compra ve selección curada con IE data.

### Flujo 5 — Auto-generación de piezas
1. En detalle proyecto (M02), botón "Generar assets".
2. Modal con 5 variantes checkboxes: postCuadrado / postLargo / story / videoStory / video.
3. IA genera:
   - **Imágenes**: OpenAI DALL-E o composición templated (photos + overlays + copy generado).
   - **Videos**: Remotion (Hydra/Motion canvas) render server-side.
4. Status progress: `generating` → `ready`.
5. videoStory + video expiran 24h (Supabase Storage TTL + cron cleanup).

### Flujo 6 — Fotos upload + classify
1. En M05 o M02, upload fotos drag&drop.
2. `/api/photos/upload` → Supabase Storage.
3. Trigger AI classify: `/api/photos/classify` → categoría (sala/cocina/recámara/baño/fachada/exterior/plano).
4. UI muestra foto con chip categoría.

### Flujo 7 — Publicar a portales externos
1. En detalle proyecto, tab "Publicación".
2. Toggle portales: Inmuebles24 / MercadoLibre / Vivanuncios / ICasas / Propiedades.com / Facebook Marketplace / EasyBroker MLS.
3. `trpc.marketing.publishToPortal` → mapper + POST a API portal (requiere credentials en `marketing_portal_configs`).
4. Status: pending / published / error.
5. Sync bidireccional: lead recibido → webhook → crea contacto + busqueda.

## Wireframe textual

```
┌───────────────────────────────────────────────────────────────┐
│ Marketing       Landings│QR│WA Templates│Folders│Portales     │
├────┬──────────────────────────────────────────────────────────┤
│ SB │ Landings (5)                          [+ Nueva landing]   │
│    │ ┌──────────────┬──────────────┬──────────────┐            │
│    │ │ Thumbnail    │ Thumbnail    │ Thumbnail    │            │
│    │ │ Torre Nápoles│ Depa Roma    │ Casa Polanco │            │
│    │ │ 248 visits   │ 132 visits   │ 420 visits   │            │
│    │ │ 12 leads     │ 5 leads      │ 28 leads     │            │
│    │ └──────────────┴──────────────┴──────────────┘            │
└────┴──────────────────────────────────────────────────────────┘
```

## Componentes UI requeridos

- `<MarketingTabs />` — 5 tabs navegación.
- `<LandingsList />` con `<LandingCard />`.
- `<LandingWizard />` — plantilla + proyecto + personalización.
- `<QRList />` + `<QRGenerator />`.
- `<WATemplatesList />` + `<WATemplateForm />`.
- `<FoldersList />` + `<FolderEditor />` — radar compartido.
- `<AssetsGenerator />` — 5 variantes checkbox.
- `<AssetCard />` — preview + download + share + status.
- `<PhotosUploader />` (shared con M05) con classify chips.
- `<PortalesPublisher />` — toggle portales + credentials management.
- `<AnalyticsDashboard />` — visits/leads/CTR per landing.

## Procedures tRPC consumidas

- `marketing.listLandings`, `createLanding`, `updateLanding`, `deleteLanding`.
- `marketing.getLandingAnalytics` — input: `{ landingId }` / output: visits, leads, ctr, funnel.
- `marketing.listQRs`, `createQR`.
- `marketing.getTemplates`, `createTemplate`, `submitTemplateToMeta`.
- `marketing.listFolders`, `createFolder`, `addProjectToFolder`, `removeProjectFromFolder`.
- `marketing.generateAssets` — input: `{ projectId, variants }` / output: `{ jobs[] }`.
- `marketing.getAssetsForProject`.
- `marketing.sharePropertyLink`.
- `marketing.publishToPortal`.
- `marketing.getPortalStatus`.
- `photos.upload`, `photos.classify`.

## Tablas BD tocadas

- `landings` — template + personalization + analytics.
- `landing_analytics` (partitioned por mes).
- `qr_codes`.
- `wa_templates`.
- `client_folders`, `folder_projects`.
- `marketing_assets` — 5 variantes + status + expires_at.
- `marketing_portales` — configs credentials.
- `marketing_publications` — log publicaciones.
- `photos` — con categoría clasificada.
- `utm_tracks`.

## Estados UI

- **Loading**: skeleton grid/lists.
- **Error**: toast + retry.
- **Empty**: CTA + tutorial video optional.
- **Success**: grid + counters animados.
- **Generating**: shimmer + progress estimate.
- **Expired** (videoStory+video 24h): overlay "Expirado — Regenerar" CTA.

## Validaciones Zod

```typescript
const createLandingInput = z.object({
  template: z.enum(['hero', 'grid', 'long-form', 'single-project']),
  projectIds: z.array(z.string().uuid()).min(1).max(20),
  brandColors: z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  }),
  copy: z.object({
    headline: z.string().max(120),
    subheadline: z.string().max(240).optional(),
    cta: z.string().max(40),
  }),
  seoMeta: z.object({
    title: z.string().max(70),
    description: z.string().max(160),
  }).optional(),
});

const generateAssetsInput = z.object({
  projectId: z.string().uuid(),
  variants: z.array(z.enum(['postCuadrado', 'postLargo', 'story', 'videoStory', 'video'])).min(1).max(5),
});
```

## Integraciones externas

- **WhatsApp Business API (Meta)** — template approval + send.
- **OpenAI DALL-E 3** — imagen generation.
- **Remotion** — video render server-side.
- **Vercel OG Image** — dynamic OG images.
- **Inmuebles24 / MercadoLibre / Vivanuncios / ICasas / EasyBroker / Propiedades.com / Facebook Marketplace** — publish APIs.
- **Supabase Storage** — assets + photos + videos.
- **PostHog** — landing analytics.
- **Short URL service** (bitly o self-hosted) — URLs cortas trackables.

## Tests críticos

- [ ] Landing create → URL short funciona + SEO meta correctas.
- [ ] QR escanea → redirect + track UTM.
- [ ] WA template submit Meta → status updates via webhook.
- [ ] Folder compartido: comprador ve radar sin login.
- [ ] videoStory genera en <2 min + expira exacto 24h.
- [ ] Photo classify accuracy ≥90% fixtures.
- [ ] Publish Inmuebles24: datos mapeados correctos + ID portal retornado.
- [ ] Webhook lead de portal → crea contacto + busqueda en DMX.
- [ ] Analytics CTR calculado correcto.
- [ ] i18n: `t('marketing.*')`.

## i18n keys ejemplo

```tsx
<Tab>{t('marketing.tabs.' + tab)}</Tab>
<Badge>{t('marketing.assets.status.' + s)}</Badge>
<Button>{t('marketing.actions.regenerate')}</Button>
```

## Referencia visual

Ver `/docs/referencias-ui/M8_Marketing.tsx` (711 LOC). Tint bgSlate, grid cards + preview.

## Cross-references

- ADR-002 AI-Native (asset generation)
- ADR-008 Monetization (tiers feature limits per plan)
- [FASE 22 Marketing Comms](../02_PLAN_MAESTRO/FASE_22_MARKETING_COMMS.md)
- [03.12 Notifs + Webhooks](../03_CATALOGOS/03.12_CATALOGO_NOTIFS_Y_WEBHOOKS.md)
- Módulos relacionados: M02 Desarrollos (assets menu), M05 Captaciones (Radar), M14 Marketing Dev (campañas)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent H) | **Fecha:** 2026-04-17
