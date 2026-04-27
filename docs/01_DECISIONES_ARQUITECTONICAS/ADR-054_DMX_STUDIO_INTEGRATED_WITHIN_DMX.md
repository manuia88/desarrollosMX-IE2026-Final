# ADR-054 — DMX Studio (M21) integrado dentro DMX desde día 1

**Status**: Accepted 2026-04-27 · Founder OK
**Deciders**: Manu (founder) + PM
**Sub-bloque**: FASE 14.C (M08 Marketing portal asesor + lock canon Studio)
**Related ADRs**: ADR-053 (feature module pattern unified), ADR-018 (E2E connectedness + STUBs 4 señales), ADR-008 (monetization tiers)

---

## Context

`tmp/BIBLIA_PROPERTYX_v4.docx` (BIBLIA del proyecto Studio versión 4.0, abril 2026, 32 KB) declara como plan de implementación legacy:

- "Se construye en REPO SEPARADO. Integracion con DMX cuando ambos productos esten estables."
- `Repo: github.com/manuia88/propertyx`
- `Supabase: euiiefpkazvkqylmbhpf` (proyecto separado dedicado)
- Stack mencionado independiente del de DMX en algunos puntos (Next.js 15 vs 16, etc).

Este plan emergió cuando DMX y el producto Studio (entonces "PropertyX") fueron concebidos como dos verticales potencialmente independientes que se integrarían post-launch via SSO + APIs cross-stack.

El founder evaluó la decisión final 2026-04-27 (cierre F14.B + arranque F14.C) y confirmó que Studio debe ser **un módulo nativo de DMX desde día 1**, no un producto externo con integración futura. Razones explícitas del founder:

1. **Distribution coupling.** El asset distintivo de DMX (10K+ asesores piloto + IE backend + scores zona) es exactamente la audiencia y data-source de Studio. Construir Studio en silo separado obliga a duplicar auth, billing, telemetría, audit logs, RLS policies, observability y CI/CD — overhead que neutraliza el moonshot velocity ($200K+ en infra/people-time H1-H2).
2. **Bundle pricing canon.** El plan comercial existente declara DMX Pro $47/mes y DMX Agency $97/mes como **bundles unificados** (DMX core + Studio capabilities). Bundles requieren billing single-tenant, plan_features unificados, y feature gating sobre `subscriptions` table existente — imposible cross-Supabase sin reconciliación batch.
3. **Data-network effects.** Studio consume IE scores (zone_scores, project_scores), unidades, proyectos, photos M02/M05, captaciones — todo vive en DMX. Integration bridge cross-Supabase introduce latencia + drift + auth complexity sin ganancia funcional.
4. **Auditoría regulatoria H3.** CNBV / SBIF / Banxico aprobaciones embedded banking (H3) requieren single source of truth audit_log + privacy boundary mapeable. Two-Supabase split fragmenta la traza.
5. **Founder mental model.** Founder no técnico desarrolla mejor con un solo dashboard, un solo Vercel, un solo Stripe — minimiza overhead de context-switching y reduce risk de configuración divergente entre entornos.

ADR-054 formaliza la decisión y declara que cualquier referencia legacy a "repo separado", "supabase euiiefpkazvkqylmbhpf", "github.com/manuia88/propertyx" o "integración cuando ambos estables" queda **superseded** por este ADR.

---

## Decision

### Regla canónica única — Studio dentro DMX

> **M21 DMX Studio vive 100% dentro DMX desde día 1.** Repo + Supabase + Vercel + Github + Stripe únicos compartidos con el resto de DMX. Cualquier referencia legacy a entornos separados queda superseded.

**Entornos canon únicos:**

- **Repo:** `desarrollosMX-IE2026-Final` (este repositorio).
- **Supabase:** `qxfuqwlktmhokwwlvggy` (mismo proyecto Postgres + Auth + Storage del resto de DMX).
- **Vercel:** `desarrollos-mx-ie-2026-final` (mismo deployment).
- **Github:** este repo, branches feat/fase-NN-* canon.
- **Stripe:** account DMX existente + 3 productos Studio adicionales (DMX Pro $47/mes, DMX Agency $97/mes, DMX Foto $46/mes).

### Implications técnicas inmediatas

**BD (Supabase qxfuqwlktmhokwwlvggy):**

- 21 tablas Studio (definidas en BIBLIA v4 PARTE III) se crean prefijadas `studio_*` en el mismo Supabase DMX para evitar colisión naming con tablas DMX existentes.
- RLS policies Studio aprovechan `auth.uid()` shared con DMX (zero migration auth).
- Audit log unificado `audit_log` + `audit_crm_log` (no tabla separada Studio).
- Storage buckets Studio (e.g. `studio-videos-raw`, `studio-frames`, `studio-output`) viven en mismo bucket pool con RLS policies dedicadas.

**Auth & user model:**

- User DMX = User Studio. No hay merge migration H2.
- Profile `rol` extension: existing roles (asesor / dev / comprador / admin / superadmin) opcionalmente flag `studio_subscription_active` derivado de `subscriptions.product_id`.
- Plan dual-rol: un asesor puede tener acceso DMX core + Studio Pro simultáneo via mismo `subscriptions` row con `feature_set` jsonb.

**Feature flags & gating:**

- Studio capabilities flagged en `ui_feature_flags` table existing (extender categoría con `studio.*` keys). Fields canon: `studio.video_render`, `studio.voice_clone`, `studio.virtual_staging`, etc.
- Tier gating canon ADR-008: `dmx_pro` tier → 5 videos/mes Studio, `dmx_agency` tier → 20 videos/mes + extras.

**CI/CD & infra:**

- Mismo `package.json` + `vercel.json` + `.github/workflows/*` que DMX core.
- Studio routes bajo `/studio/*` namespace en App Router (e.g. `app/[locale]/(asesor)/asesores/studio/page.tsx`).
- tRPC `studioRouter` registrado en `server/trpc/root.ts` cuando F14.F (M21 Studio MVP) shippee.
- Migrations Studio forman parte del flow canon `supabase/migrations/<timestamp>_studio_*.sql`.

**Costos compute (Kling 3.0 + Seedance 2.0 + ElevenLabs + fal.ai):**

- API keys consolidadas en `.env` DMX existing.
- Cost tracking unified en `api_budgets` table existing — extender source enums con `studio_kling`, `studio_seedance`, `studio_elevenlabs`, `studio_fal`.
- Spend ledger compartido (no tabla `studio_spend_ledger` separada).

### Lo que NO cambia funcionalmente

ADR-054 NO modifica:

- Spec funcional de Studio (BIBLIA v4 sigue siendo spec canon — solo se anotan los puntos legacy).
- Pricing $47 / $97 / $46 USD/mes.
- 14 diferenciadores producto (voice clone, virtual staging, drone simulation, copy pack, etc).
- Sprint plan 12 sprints producto Studio.
- Stack core elementos: Claude API + Kling + Seedance + ElevenLabs + fal.ai.

ADR-054 SÍ modifica:

- Lugar de implementación (DMX único vs split).
- Plan de migración H2 ("integration cuando estables") → eliminado, no aplica.
- Repo / Supabase / Vercel referenciados en docs Studio.

---

## Trade-offs

**Pros (canonical inside DMX):**

- Zero infra duplication — un solo Vercel, un solo Supabase, un solo Stripe → -$200K+ overhead H1-H2.
- Bundle pricing $47/$97 trivialmente implementable en `subscriptions` existing.
- Distribution velocity: 10K asesores DMX → Studio cross-sell instantáneo zero-friction.
- Audit + compliance H3 single-source — CNBV diligence simpler.
- Founder operational simplicity — un solo dashboard.
- IE data-network effects — Studio consume scores nativamente sin bridge.

**Cons:**

- Tabla namespace pollution (21 nuevas tablas `studio_*` en Supabase DMX). Mitigación: prefijo claro + comments + RLS dedicadas.
- BIBLIA v4 doc legacy requiere banner anotaciones (no rewrite total) — 1h overhead documentación.
- Si H3 o H4 emerge un spin-off Studio standalone (B2B SaaS distinto), migration cross-Supabase sería más costosa que si hubiera nacido split. Mitigación: prefijo `studio_*` + tablas semánticamente independientes + RLS por user_id facilitan migración futura si el fork emerge (probabilidad baja, valor de optionality bajo).

**Mitigaciones formalizadas:**

- BIBLIA v4 movida a `docs/M21_STUDIO/BIBLIA_DMX_STUDIO_v4.docx` con banner CANON ADAPTATION explícito (este ADR la sobreescribe en los puntos legacy).
- Originales `tmp/BIBLIA_PROPERTYX_v3.docx` y `tmp/BIBLIA_PROPERTYX_v4.docx` preservados como referencia histórica (no modificar).
- Naming canon producto `DMX Studio` (no "PropertyX") — branding consolidado.

---

## Migration plan

### Inmediato (F14.C C.0)

1. Este ADR (ADR-054) creado.
2. CLAUDE.md actualizado con sección "M21 DMX Studio Canon" referenciando ADR-054.
3. Directorio `docs/M21_STUDIO/` creado.
4. Copia `tmp/BIBLIA_PROPERTYX_v4.docx` → `docs/M21_STUDIO/BIBLIA_DMX_STUDIO_v4.docx` (renombrado, originales tmp preservados).
5. `docs/M21_STUDIO/README.md` con banner CANON ADAPTATION explícito.
6. Cross-link banner en M08 UI (`StudioCrossLinkBanner.tsx`) en lugar donde estaba "Auto-gen piezas" original — placeholder hasta F14.F shippe Studio MVP.

### F14.F (M21 DMX Studio MVP) — H1 si capacity / H2 default

- Migrations Studio (21 tablas prefijadas `studio_*`) en `supabase/migrations/`.
- tRPC `studioRouter` registrado en `server/trpc/root.ts`.
- Routes `app/[locale]/(asesor)/asesores/studio/*`.
- Stripe products (DMX Pro $47, DMX Agency $97, DMX Foto $46).
- Feature flags `studio.*` en `ui_feature_flags`.

---

## Consequences

### Inmediatas (F14.C)

- BIBLIA Studio movida + banner.
- M08 cross-link banner Studio cleanly placed (UI no breaking).
- Docs canon refleja Studio inside DMX (no rewrite extenso, banner explícito).
- Cero migrations BD H1 — Studio no se construye en F14.C, solo se locka el canon.

### Forward H1-H2

- F14.F construye Studio inside DMX zero-friction.
- Marketing & sales DMX bundle Pro/Agency/Foto direct.
- IE data network effects desde día 1 Studio.

### Forward H3+

- Embedded banking + fractional investing: audit log Studio integrado en compliance dossier DMX.
- Si emergiera spin-off Studio standalone (low-prob), `studio_*` prefix + RLS por user_id facilitan migration.

---

## Refs

- `tmp/BIBLIA_PROPERTYX_v4.docx` (legacy spec canon producto Studio, anotada por banner en `docs/M21_STUDIO/`).
- `docs/M21_STUDIO/BIBLIA_DMX_STUDIO_v4.docx` (copia canónica).
- `docs/M21_STUDIO/README.md` (banner CANON ADAPTATION).
- `CLAUDE.md` — sección "M21 DMX Studio Canon".
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-053_FEATURE_MODULE_PATTERN_UNIFIED.md` (`features/studio/` unified canon).
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md` (STUBs ADR-018 4 señales — cross-link banner Studio respeta).
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-008_MONETIZATION.md` (tier gating + bundle pricing).
- `docs/04_MODULOS/M08_MARKETING.md` (M08 spec donde cross-link banner aterriza).

---

**Fin ADR-054** — Aprobado founder 2026-04-27. Implementación canon-lock F14.C.0.
