# DMX Studio v1.0.0-beta — Master Handoff Document

**Status:** SHIPPED 2026-04-28 · Master tag `fase-14-complete`
**Scope:** H1 closed, 12 sub-fases F14.F production-ready
**Repo:** `desarrollosMX-IE2026-Final`
**Supabase:** `qxfuqwlktmhokwwlvggy` (44 tablas `studio_*` con RLS=ON 100%)
**Vercel:** `desarrollos-mx-ie-2026-final`
**ADR canon:** [ADR-054](../01_DECISIONES_ARQUITECTONICAS/ADR-054_DMX_STUDIO_INTEGRATED_WITHIN_DMX.md) (integrated within DMX), [ADR-058](../01_DECISIONES_ARQUITECTONICAS/ADR-058_DMX_IA_ADD_ON_PRICING_TIER.md) (DMX IA add-on separated)

---

## Resumen ejecutivo

DMX Studio = generación automatizada de videos inmobiliarios B2B + B2B2C para asesores LATAM. 12 sub-fases F14.F construidas durante FASE 14 (abril 2026). v1.0.0-beta = scope H1 cerrado funcional, listo para activación de API keys reales cuando primer cliente real suscribe.

Producto vive integrado dentro DMX (un repo, un Supabase, un Stripe, un Vercel) — no se construyó como producto separado. Tres tiers MXN escala masiva (Founder $997 / Pro $2,497 / Agency $5,997) + plan B2B2C fotógrafo USD legacy preservado.

---

## Features shipped per sprint

### F14.F.0 — Sprint 0 Pre-flight (tag `fase-14.F.0-preflight-complete`)

- 9 AI wrappers configurados (Replicate Kling 3.0, fal.ai Seedance 2.0, ElevenLabs TTS Flash, fal.ai virtual staging, Anthropic Claude Director, Anthropic Vision classify, Deepgram Nova-3, HeyGen avatar, Pedra virtual staging).
- Env vars + feature flags base (`features/dmx-studio/lib/feature-flags.ts`).
- Stack canon validation contra ADR-054.

### F14.F.1 — Sprint 0 Fundación (tag `fase-14.F.1-sprint0-fundacion-complete`)

- Migration tablas `studio_*` base (proyectos, copy outputs, video assets, usage logs).
- Auto-import asesor cross-function (`features/dmx-studio/lib/cross-functions/auto-import-asesor.ts`).
- Stripe products canon en `features/dmx-studio/lib/stripe-products.ts`.
- Landing pública `/studio` + onboarding scaffold.

### F14.F.2 — Sprint 1 Foto Path MVP + Voice Clone STUB (tag `fase-14.F.2-sprint1-foto-path-mvp-complete`)

- Onboarding 3 pasos asesor (datos + voz + disclosure).
- Project flow PhotoUploader → Director → Pipeline → ResultPage.
- Voice clone STUB ADR-018 (`ELEVENLABS_VOICE_CLONE_ENABLED=false` canon H1).
- 4 señales STUB documentadas.

### F14.F.3 — Sprint 2 Polish + Branding + Multi-formato

- Branding toggle DMX watermark (Pro/Agency control).
- Multi-formato 9:16 / 1:1 / 16:9 / 4:5.
- Polish UI canon ADR-050 (3 surfaces + score gradients).

### F14.F.4 — Sprint 3 Import Portales + Copy completo

- Adapter resolver portales canon (5 portales LATAM: Inmuebles24, Vivanuncios, Lamudi, MercadoLibre, Casas y Terrenos).
- Copy pack viewer (Instagram caption + WhatsApp share + portales descripción + guion).
- Cross-link M08 con disclosure flag.

### F14.F.5 — Sprint 4 Calendario IA + Remarketing

- Calendar M11 cross-feature (`studio_content_calendar`).
- Remarketing AI agents batch A/B (`studio_remarketing_jobs`).
- Smart timing ML STUB (defer L-NEW H2).

### F14.F.6 — Sprint 5 Video crudo + Subtítulos

- Raw video upload + processing (`studio_raw_videos`).
- Deepgram Nova-3 transcription + subtítulos burn-in.
- EDL cuts auto.

### F14.F.7 — Sprint 6 Seedance + Virtual Staging + Drone

- Seedance integration (`studio_seedance_clips`).
- Virtual Staging fal.ai + Pedra (`studio_virtual_staging_jobs`).
- Drone simulation (`studio_drone_simulations`).
- Cinema Mode toggle (Agency-only).
- `PlanPaywallCanon` component (gating canon).

### F14.F.8 — Sprint 7 Avatar + Galería + Analytics + Video Zona

- HeyGen avatar (`studio_avatars` + `studio_avatar_variants`, feature flag H2).
- Galería pública asesor (`studio_public_galleries` + `studio_gallery_views_log`).
- Analytics dashboards admin.
- Video zona (`studio_zone_videos`).

### F14.F.9 — Sprint 8 Modo Serie/Documental

- Series mode multi-video orchestration (`studio_series_projects` + `studio_series_episodes` + `studio_series_templates`).
- Cross-feature M02 + M14 + M10.
- Highlight reels (`studio_highlight_reels`).

### F14.F.10 — Sprint 9 Plan Fotógrafo B2B2C

- Photographer flow self-service (`studio_photographers` + `studio_photographer_clients` + `studio_photographer_invites`).
- Pricing calculator B2B2C.
- Stripe foto plan separado USD (legacy preservado).
- Photographer directory + referral form submissions.

### F14.F.11 — Sprint 10 QA Exhaustivo + Bug Fixes + Beta Outreach STUB

- 4 bug fixes P1 (error boundary + loading skeletons + empty states + a11y aria-labels).
- 188 tests nuevos (4334 → 4522 passing baseline).
- Beta outreach materials (5 email templates ES-MX + en-US, onboarding guide, CSV invite list).
- NPS widget post-video + 2-week satisfaction survey STUB.
- Performance baseline + unit economics docs.

### F14.F.12 — Sprint 11+12 Mini-scope cleanup + Master tag (este sprint)

- Pricing migration USD → MXN (Founder $997 / Pro $2,497 / Agency $5,997).
- Premium video ratios per plan (2+3 / 5+10 / 20+30).
- Social Media Publishing STUBs (IG/TikTok/FB) ADR-018.
- UX fix onboarding auto-import (skip Step1 si data complete).
- ADR-058 DMX IA Add-on canon separado.
- Master tag `fase-14-complete`.

---

## Pricing canon final (tiers MXN escala masiva)

| Plan | Precio MXN/mes | Premium videos | Basic videos | Total | Extras |
|---|---:|---:|---:|---:|---|
| Founder | $997 | 2 | 3 | 5 | DMX CRM bundled + cohort 100 grandfathered |
| Pro | $2,497 | 5 | 10 | 15 | DMX CRM bundled + Series mode |
| Agency | $5,997 | 20 | 30 | 50 | DMX CRM + Multi-user 10 + Modo Reseller toggle + DMX IA bundled |

### Stripe price IDs (hardcoded en `features/dmx-studio/lib/stripe-products.ts`)

- Founder MXN: `price_1TR55ACdtMsDaBnLUwlPAeEo`
- Pro MXN: `price_1TR56BCdtMsDaBnLNa7X2WU4`
- Agency MXN: `price_1TR52HCdtMsDaBnLxBiXViKi`

### Legacy preservados (backwards compat suscriptores H0)

- Pro USD $47: `price_1TQl2xCdtMsDaBnL2wzRlICK`
- Agency USD $97: `price_1TQl2zCdtMsDaBnLmq9QoA2v`
- Foto B2B2C USD $67 (photographer standalone): `price_1TQl2yCdtMsDaBnLKVAZbarz`

---

## Stack tecnológico final

- **Framework:** Next.js 16 App Router + Turbopack + React 19 (RSC default).
- **Lenguaje:** TypeScript 5 strict (`noImplicitAny`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- **Estilos:** Tailwind v4 CSS-first (tokens en `styles/tokens.css`, sin `tailwind.config.ts`).
- **API:** tRPC 11 + Zod 4 SSoT.
- **DB:** Supabase (Postgres 16 + RLS 100% + pgvector + pgsodium + pg_partman).
- **Pagos:** Stripe (3 productos Studio MXN + 1 producto B2B2C foto USD legacy).
- **APIs IA:** Replicate Kling 3.0, fal.ai Seedance 2.0, ElevenLabs TTS Flash, fal.ai virtual staging, Anthropic Claude Director, Anthropic Vision, Deepgram Nova-3, HeyGen avatar, Pedra.
- **i18n:** next-intl Tier 1 (es-MX + en-US) activo H1; Tier 2 (es-CO/es-AR/pt-BR) preserved code defer H2.
- **Testing:** Vitest + Playwright (4522 tests passing baseline post-Sprint 10).
- **CI/CD:** Vercel preview deploys + GitHub Actions (typecheck + lint + audit:dead-ui + audit:rls).
- **Observability:** Sentry telemetry (free tier H1).

---

## Founder action items pendientes

### Pre-launch primer cliente (bloqueante)

1. **Cargar créditos API reales** cuando primer cliente Founder suscribe:
   - Replicate Kling 3.0: ~$2.25/video render
   - ElevenLabs TTS Flash: ~$0.025/narración
   - Anthropic Claude Director: ~$0.10/proyecto
   - Anthropic Vision: ~$0.003/foto classify
   - Deepgram Nova-3: ~$0.04/transcripción 5min
   - fal.ai Seedance: ~$0.80/clip premium
   - fal.ai / Pedra virtual staging: ~$0.25-$0.30/render
   - HeyGen avatar: ~$0.20/clip (defer activación H2)
2. **Activar Stripe price IDs** en producción Stripe dashboard (3 productos MXN).
3. **Verificar webhooks Stripe** (`/api/webhooks/stripe`) en producción.
4. **Validar primer cliente Founder $997** cohort grandfathered (100 cupos).

### Pre-activación features H2 (bloqueante por API key/proveedor)

5. **Email Reelly Sales** para Dubai API key (cities expansion H2).
6. **Meta + TikTok approval** OAuth apps (Social Publishing activation L-NEW H2).
7. **Calendly link** founder personal (Interview booking CTA STUB activation).
8. **Resend templates 2-week survey** activation cuando 50+ asesores onboarded.

### Decisiones producto pendientes

9. **Decidir DMX IA Add-on pricing** tier (Light / Standard / Pro propuesta TBD post-launch — ADR-058).
10. **Reseller-terms legal** revisión con abogado pre-launch white-label.
11. **Pro plan reprice o limit enforce** (unit economics: 20 videos × $2.475 > $47 USD legacy. Con MXN $2,497 hay margen pero validar steady state).
12. **Photographer custom domain** white-label decision H2.

### Próximo paso producto

13. **Próxima fase:** decidir entre FASE 14.1 Expansion Cities (Playa/GDL/QRO + Dubai + Miami + Colombia) o FASE 15 Portal Developer (M11-M15 multi-agent canon).

---

## Activación checklist pre-launch

### Stripe + Pagos

- [ ] Stripe price IDs MXN activados en producción dashboard
- [ ] Webhooks Stripe verificados endpoint `/api/webhooks/stripe`
- [ ] Test mode → Live mode toggle validado
- [ ] Suscripción de prueba founder propio $997 MXN

### Feature flags activación gradual

- [ ] `ELEVENLABS_VOICE_CLONE_ENABLED = true` cuando primer Pro suscribe
- [ ] `SEEDANCE_ENABLED = true` cuando primer Agency suscribe
- [ ] `VIRTUAL_STAGING_ENABLED = true` cuando primer Agency suscribe
- [ ] `DRONE_SIM_ENABLED = true` cuando primer Agency suscribe
- [ ] `CINEMA_MODE_ENABLED = true` Agency-only
- [ ] `HEYGEN_AVATAR_ENABLED` defer H2 (cost optimization pending)
- [ ] `DEEPGRAM_TRANSCRIPTION_ENABLED` defer H2 (raw video pipeline)
- [ ] `SERIES_MODE_ENABLED` defer H2
- [ ] `PORTAL_SCRAPER_ENABLED` defer H2
- [ ] `SOCIAL_PUBLISHING_ENABLED` defer H2 (Meta + TikTok approval)
- [ ] `DMX_IA_ENABLED` Add-on tier defer H2 (pricing TBD ADR-058)

### Smoke tests producción

- [ ] `/studio` landing pública carga + CTA pricing visible
- [ ] `/studio-app` portal asesor login funciona
- [ ] `/studio-app/onboarding` 3 pasos completables
- [ ] `/studio-app/library` lista vacía con CTA primer-uso
- [ ] Subscribe Founder → webhook procesa → asesor desbloqueado
- [ ] Generación primer video end-to-end en sandbox

---

## L-NEW H2 master list (consolidated post-FASE 14)

### Studio core (24 L-NEW activos)

- `L-NEW-STUDIO-BETA-OUTREACH-ACTIVATE` (cuando 50+ asesores onboarded)
- `L-NEW-STUDIO-CARD-HOVER-NORMALIZE`
- `L-NEW-STUDIO-CHECKOUT-API`
- `L-NEW-STUDIO-COST-OPTIMIZATION-SELFHOST` (PR #103 self-hosted Wan21/XTTS/Whisper shipped infra docs)
- `L-NEW-STUDIO-DEMOS-VIDEO`
- `L-NEW-STUDIO-FACEBOOK-PUBLISH-ACTIVATE`
- `L-NEW-STUDIO-FOCUS-RINGS-CANON`
- `L-NEW-STUDIO-INSTAGRAM-PUBLISH-ACTIVATE`
- `L-NEW-STUDIO-INTERVIEW-CALENDLY-LINK-ACTIVATE`
- `L-NEW-STUDIO-LIGHTHOUSE-BASELINE-ACTIVATE`
- `L-NEW-STUDIO-MATCH-BUSQUEDAS-NOTIFY`
- `L-NEW-STUDIO-MICROCOPY-PASS`
- `L-NEW-STUDIO-NPS-DATA-COLLECTION-ACTIVATE`
- `L-NEW-STUDIO-PERFORMANCE-OPTIMIZATION` (si Lighthouse <90 algún path)
- `L-NEW-STUDIO-PRO-PLAN-REPRICE-OR-LIMIT-ENFORCE`
- `L-NEW-STUDIO-QA-REPORT-ADMIN-DOWNLOAD-ACTIVATE`
- `L-NEW-STUDIO-RECHARTS-LAZY`
- `L-NEW-STUDIO-RESEND-2WEEK-SURVEY`
- `L-NEW-STUDIO-RESEND-2WEEK-SURVEY-TEMPLATE-ACTIVATE`
- `L-NEW-STUDIO-SMART-TIMING-ML`
- `L-NEW-STUDIO-TIKTOK-PUBLISH-ACTIVATE`
- `L-NEW-STUDIO-TRUST-BOOST`
- `L-NEW-STUDIO-VOICE-PREVIEW-SAMPLES`
- `L-NEW-STUDIO-PHOTOGRAPHER-CUSTOM-DOMAIN-H2`

### Cities expansion H2

- Playa del Carmen / Guadalajara / Querétaro nativos LATAM
- Dubai (Reelly API key pending sales contact)
- Miami (US adapter portales)
- Colombia (es-CO Tier 2 activation)

### Social Media H2

- IG / TikTok / FB OAuth activation post-Meta + TikTok approval
- Multi-account routing per asesor

### DMX IA Add-on H2 (ADR-058)

- Add-on pricing tier (Light / Standard / Pro) decisión TBD
- Features bundle scope post-launch

### Portal Developer FASE 15

- M11-M15 multi-agent canon (post-FASE 14.1 expansion)

---

## Costos API estimados per plan (steady state typical usage)

> Tipo de cambio referencial: 17 MXN / USD. Ajustar según cotización spot.

### Founder ($997 MXN ≈ $58 USD/mes · 5 videos)

- Variable: 5 videos × $2.475 base = ~$12.40 USD
- Fijo Studio attribution: ~$15 USD
- **Costo total/usuario:** ~$27 USD
- **Margen $:** +$31 USD/mes (+53%)
- Notas: cohort 100 grandfathered — pricing solo H1 pre-launch.

### Pro ($2,497 MXN ≈ $147 USD/mes · 15 videos)

- Variable: 15 videos × $2.475 = ~$37 USD
- Fijo Studio attribution: ~$15 USD
- **Costo total/usuario:** ~$52 USD
- **Margen $:** +$95 USD/mes (+65%)
- Notas: incluye Series mode + DMX CRM bundled. Margen sano steady state.

### Agency ($5,997 MXN ≈ $353 USD/mes · 50 videos)

- Variable: 50 videos × $2.75 (premium ratio) = ~$138 USD
- Fijo Studio attribution: ~$15 USD
- Multi-user overhead 10 seats: ~$5 USD
- DMX IA bundled: ~$10-30 USD (varía uso)
- **Costo total/usuario:** ~$170-190 USD
- **Margen $:** +$163-183 USD/mes (+46-52%)
- Notas: caballo de batalla rentable. Sweet spot growth = agencias inmobiliarias multi-asesor.

### Break-even (operational fixed $100 USD/mes)

| Plan | Margen contribución/mes | Usuarios break-even | MRR target |
|---|---:|---:|---:|
| Founder | +$31 USD | ~4 usuarios | ~$232 USD |
| Pro | +$95 USD | ~2 usuarios | ~$294 USD |
| Agency | +$163 USD | ~1-2 usuarios | ~$326 USD |

> Detalle completo en [`UNIT_ECONOMICS.md`](./UNIT_ECONOMICS.md).

---

## Métricas baseline post-Sprint 10

- **44 tablas `studio_*`** en Supabase (RLS=ON 100%)
- **515 source files + 152 test files** en `features/dmx-studio/`
- **4522 tests passing** | 4 skipped (delta +188 nuevos Sprint 10)
- **24+ STUBs ADR-018** documentados con 4 señales canon
- **0 P0 bugs** | 0 P1 bugs (post-Sprint 10 fixes)
- **0 migrations** Sprint 11+12 (cleanup mini-scope)

---

## Referencias canon

- [ADR-054 — Studio integrated within DMX](../01_DECISIONES_ARQUITECTONICAS/ADR-054_DMX_STUDIO_INTEGRATED_WITHIN_DMX.md)
- [ADR-058 — DMX IA Add-on pricing tier separado](../01_DECISIONES_ARQUITECTONICAS/ADR-058_DMX_IA_ADD_ON_PRICING_TIER.md)
- [ADR-018 — E2E connectedness + STUBs 4 señales](../01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md)
- [ADR-050 — Design language canon prototype asesor](../01_DECISIONES_ARQUITECTONICAS/ADR-050_DESIGN_LANGUAGE_CANON_PROTOTYPE_ASESOR.md)
- [BIBLIA v5 sec 17 — Decisiones canon Studio](../biblia-v5/17_BIBLIA_DMX_v5_Decisiones_Hallazgos_Plan.md)
- [`README.md`](./README.md) — M21 Studio spec funcional canon
- [`UNIT_ECONOMICS.md`](./UNIT_ECONOMICS.md) — Cost breakdown + break-even
- [`PERFORMANCE_BASELINE.md`](./PERFORMANCE_BASELINE.md) — Lighthouse + Web Vitals baseline
- [`QA_REPORT_SPRINT10.md`](./QA_REPORT_SPRINT10.md) — QA exhaustivo F14.F.11
- [`STRIPE_WEBHOOK_SETUP.md`](./STRIPE_WEBHOOK_SETUP.md) — Stripe activation runbook
- [`beta-outreach/`](./beta-outreach/) — Email templates + onboarding guide + invite list

### Tags fase

- `fase-14.F.0-preflight-complete`
- `fase-14.F.1-sprint0-fundacion-complete`
- `fase-14.F.2-sprint1-foto-path-mvp-complete`
- `fase-14.F.3-sprint2-polish-branding-complete`
- `fase-14.F.4-sprint3-import-portales-copy-complete`
- `fase-14.F.5-sprint4-calendar-remarketing-complete`
- `fase-14.F.6-sprint5-video-crudo-complete`
- `fase-14.F.7-sprint6-seedance-staging-drone-complete`
- `fase-14.F.8-sprint7-avatar-galeria-analytics-complete`
- `fase-14.F.9-sprint8-modo-serie-documental-complete`
- `fase-14.F.10-sprint9-plan-fotografo-complete`
- `fase-14.F.11-sprint10-qa-bug-fixes-complete`
- `fase-14.F.12-sprint11-12-mini-cleanup-complete` (pendiente al cierre F14.F.12)
- `fase-14-complete` (master tag al cierre F14.F.12)
