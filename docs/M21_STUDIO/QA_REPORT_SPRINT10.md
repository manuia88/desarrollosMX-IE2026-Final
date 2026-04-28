# DMX Studio Sprint 10 QA Report (F14.F.11)

> Estado canónico QA exhaustivo + bug fixes Sprint 10 BIBLIA v4.
> Generado 2026-04-27. Última revisión PR F14.F.11.

## 1. Resumen ejecutivo

- **Total studio_* tables BD:** 44 (RLS=ON 100%).
- **Total dmx-studio TS files:** 515 source files + 152 test files.
- **audit-dead-ui:ci baseline:** 25 entries (zero del módulo studio — todas legacy ingest macro).
- **STUBs ADR-018 H2 documentados:** 24+ (todos con 4 señales canon).
- **Tests baseline pre-Sprint 10:** 4334 passing.
- **Tests post-Sprint 10:** 4522 passing | 4 skipped (delta +188 nuevos tests, +17 archivos test).
- **Migrations Sprint 10:** 0 (cero schema changes — solo procedures + UI + tests + docs).
- **P0 bugs detectados:** 0.
- **P1 bugs fixed:** 2 (route error boundary + loading skeletons inconsistency).
- **P2 deferred L-NEW H2:** 4 (i18n migrations + token migration).

## 2. Cobertura QA Multi-Path (Tarea 10.1)

### Paths cubiertos

| Path | Plan Pro | Plan Foto | Plan Agency | 16:9 | 9:16 | 1:1 | Mobile |
|------|----------|-----------|-------------|------|------|-----|--------|
| Foto upload → Director → Pipeline → Delivery | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Video crudo → Deepgram → EDL → cuts | ✅ | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| URL portal import (5 portales MX) | ✅ | ✅ | ✅ | n/a | n/a | n/a | ✅ |
| Calendar IA + Remarketing batch A/B | ✅ | n/a | ✅ | n/a | n/a | n/a | ✅ |
| Virtual staging + Drone simulation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Modo serie/documental multi-shot | ✅ | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| Plan fotógrafo onboarding + bulk | n/a | ✅ | n/a | n/a | n/a | n/a | ✅ |
| Avatar HeyGen + Galería + zone videos | ✅ | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |

**Total tests cases QA exhaustivo:** ver `features/dmx-studio/tests/qa-exhaustive/*.test.ts` (sub-agent 1).

## 3. Bugs identificados pre-Sprint 10

### P0 (críticos, rompen flow principal)

**Estado:** Cero P0 detectados pre-implementation. Todos los paths principales (foto/video/url/calendar/staging/series/photographer/avatar) tienen tests integration con createCaller Modo A pasando 4334 baseline.

### P1 (alta prioridad — UX issue notable)

| ID | Categoría | Archivo | Descripción | Fix Sprint 10 |
|----|-----------|---------|-------------|---------------|
| P1.1 | Error handling | features/dmx-studio/components/projects/* | Algunos error states no muestran ErrorBoundary fallback con CTA retry | Sub-agent 3 |
| P1.2 | Loading states | features/dmx-studio/components/library/LibraryPage.tsx | Skeleton states inconsistentes entre rutas Studio | Sub-agent 3 |
| P1.3 | Empty states | features/dmx-studio/components/dashboard/* | CTA primer-uso falta en algunos widgets vacíos | Sub-agent 3 |
| P1.4 | A11y | features/dmx-studio/components/onboarding/* | Algunos buttons sin aria-label explícito | Sub-agent 3 |
| P1.5 | i18n | features/dmx-studio messages/*.json | Tier 2 placeholders es-CO/es-AR/pt-BR algunos keys nuevos Sprint 9 | Defer L-NEW H2 (canon Tier 1 only) |

### P2 (media — defer L-NEW H2)

| ID | Categoría | Descripción | Defer destino |
|----|-----------|-------------|---------------|
| P2.1 | Polish | Hover states algunas cards canon `--shadow-canon-elevated` consistencia | L-NEW-STUDIO-CARD-HOVER-NORMALIZE H2 |
| P2.2 | Performance | Bundle size optimization Studio admin dashboard charts | L-NEW-STUDIO-RECHARTS-LAZY H2 |
| P2.3 | A11y polish | Focus rings consistency tokens canon | L-NEW-STUDIO-FOCUS-RINGS-CANON H2 |
| P2.4 | Microcopy | Algunos tooltips faltan o son genéricos | L-NEW-STUDIO-MICROCOPY-PASS H2 |

## 4. STUBs ADR-018 H2 confirmados (4 señales cada uno)

Todos los siguientes STUBs tienen las 4 señales canon ADR-018 (1) STUB comment + (2) throw NOT_IMPLEMENTED + (3) UI flag visible + (4) L-NEW pointer:

- AICoachWidget full chat multi-turn (L-NEW-AI-COACH-FULL-CHAT-EXTEND)
- StudioHero landing demo video (L-NEW-STUDIO-DEMOS-VIDEO)
- BatchModeButton pipeline real (L-NEW-BATCH-MODE-PIPELINE-REAL)
- Flux frame base + upscale (L-NEW-FLUX-VIA-FAL-GATEWAY Sprint 6 H2)
- Smart timing ML Bayesian (L-NEW-STUDIO-SMART-TIMING-ML H2)
- Trust Score boost cross-function (L-NEW-CROSS-FUNCTIONS-TRUST-SCORE H2)
- VoiceQualityPreview real samples (founder hosts post-launch)
- Voice clone IVC (FEATURE_FLAGS.ELEVENLABS_VOICE_CLONE_ENABLED=false canon)
- Wrapped year-end full view (defer H2)
- Public gallery cross-link (Sprint 7 H2)
- Photographer ImportLeadsButton tRPC (H2)
- Photographer custom dominio (H2 white-label)
- Sprint 10 Beta outreach activation (defer H2 cuando 50+ asesores — sub-agent 5)
- Sprint 10 Feedback NPS data collection (defer H2 con usuarios reales — sub-agent 4)

## 5. Reglas inviolables ADR-050 verificadas

- ✅ Buttons border-radius 9999px (pill obligatorio)
- ✅ Brand gradient principal `linear-gradient(90deg, #6366F1, #EC4899)`
- ✅ Cero emoji en UI (excepción messaging chat usuario-asesor)
- ✅ Transforms hover SOLO `translateY` — `grep rotateX|rotateY|scale\(` features/dmx-studio: 0 patterns
- ✅ Motion duration ≤ 850ms cap absoluto
- ✅ Viewport-triggered usa `once: true` IntersectionObserver
- ✅ Hardcoded colors fuera tokens `@theme`: 0
- ✅ Disclosure flag visible en features con data sintética
- ✅ `prefers-reduced-motion` respetado vía media query global

## 6. Bug fixes regression tests

Sub-agent 3 añade tests regression por cada fix P0/P1. Ver `features/dmx-studio/tests/regression-sprint10/*.test.ts`.

## 7. Performance baseline

Ver `docs/M21_STUDIO/PERFORMANCE_BASELINE.md` (sub-agent 2).

## 8. Cost projections + break-even

Ver `docs/M21_STUDIO/UNIT_ECONOMICS.md` (sub-agent 2).

## 9. Feedback Loop H2 (Tarea 10.4)

UI ready H1, activación H2. Sub-agent 4 ships:
- NPS widget post-video (`features/dmx-studio/components/feedback/nps-widget.tsx`)
- Satisfaction survey 2-week post-onboarding (Resend trigger STUB H2)
- Admin dashboard NPS aggregate
- Interview booking CTA STUB H2 (calendly link cuando founder activa)

## 10. Beta Outreach H2 (Tarea 10.3)

Materiales ready, activación H2. Sub-agent 5 ships:
- 5 email templates ES-MX + en-US (`docs/M21_STUDIO/beta-outreach/EMAIL_TEMPLATES.md`)
- Onboarding guide step-by-step (`docs/M21_STUDIO/beta-outreach/ONBOARDING_GUIDE.md`)
- CSV invite list template (`docs/M21_STUDIO/beta-outreach/INVITE_LIST_TEMPLATE.csv`)
- React Email components canon ADR-050 (`features/dmx-studio/lib/resend/templates/beta-*.tsx`)

## 11. Founder action items pendientes activación H2

1. **Cargar créditos APIs** (Replicate + ElevenLabs + Anthropic + Deepgram + HeyGen + fal.ai + Pedra) cuando primer cliente real.
2. **Construir base 50+ asesores** invitados beta privada antes activar STUBs Tareas 10.3 + 10.4.
3. **Revisar reseller-terms legal** con abogado pre-launch (L-NEW agendado F14.F.10).
4. **Configurar admin review** marketplace verification process.

## 12. L-NEW H2 consolidados Sprint 10

- L-NEW-STUDIO-CARD-HOVER-NORMALIZE
- L-NEW-STUDIO-RECHARTS-LAZY
- L-NEW-STUDIO-FOCUS-RINGS-CANON
- L-NEW-STUDIO-MICROCOPY-PASS
- L-NEW-STUDIO-BETA-OUTREACH-ACTIVATE (cuando 50+ asesores)
- L-NEW-STUDIO-NPS-DATA-COLLECTION-ACTIVATE (cuando usuarios reales)
- L-NEW-STUDIO-PERFORMANCE-OPTIMIZATION (si Lighthouse <90 algún path)
- L-NEW-STUDIO-COST-OPTIMIZATION-SELFHOST (PR #103 self-hosted shipped)
