# M21 DMX Studio — Spec funcional canon

## CANON ADAPTATION (ADR-054, 2026-04-27)

**Este documento (`BIBLIA_DMX_STUDIO_v4.docx`) es la spec funcional canon de M21 DMX Studio.**

Sin embargo, los siguientes puntos del documento original están **superseded** por [ADR-054](../01_DECISIONES_ARQUITECTONICAS/ADR-054_DMX_STUDIO_INTEGRATED_WITHIN_DMX.md):

| BIBLIA v4 dice | Canon DMX leer |
|----------------|----------------|
| "Repo separado" / "github.com/manuia88/propertyx" | DMX repo `desarrollosMX-IE2026-Final` único |
| "Supabase: euiiefpkazvkqylmbhpf" | Supabase DMX `qxfuqwlktmhokwwlvggy` único |
| "Supabase URL: https://euiiefpkazvkqylmbhpf.supabase.co" | URL DMX único |
| "Integracion con DMX cuando ambos productos esten estables" | Integración interna desde día 1 — no aplica plan H2 |
| "Stack Next.js 15" | Stack DMX canon Next.js 16 App Router (ver `docs/00_FOUNDATION/00.2_STACK_Y_CONVENCIONES.md`) |
| Naming "PropertyX" producto | Naming canon producto **DMX Studio** |
| 21 tablas `[nombre]` mencionadas | 21 tablas se crean prefijadas `studio_*` en Supabase DMX |
| Auth / Stripe separados | Auth + Stripe compartidos DMX desde día 1 |

## Status

- **F14.C (2026-04-27):** canon locked vía ADR-054. M21 NO se construye en F14.C — sólo se mueve la spec a este directorio + banner.
- **F14.F (H1 si capacity / H2 default):** construcción M21 inside DMX comienza.

## Spec funcional preservado

Lo que SÍ aplica de BIBLIA v4 sin cambios:

- Pricing: DMX Pro $47/mes (5 videos), DMX Agency $97/mes (20 videos + extras), DMX Foto $46/mes (50 videos sin branding).
- 14 diferenciadores producto (voice clone ElevenLabs, virtual staging, drone simulation, copy pack Instagram + WhatsApp + portales + guion, calendario IA, 3 hook variants, etc).
- Sprint plan 12 sprints producto Studio.
- Stack core elementos: Claude API + Kling 3.0 + Seedance 2.0 + ElevenLabs + fal.ai.
- Wrappers + servicios + routers spec.
- Economía por video (~$3-5 cost / $47 revenue → ~88% margen Pro).

## Cross-references canon

- **ADR-054** — Canon lock Studio inside DMX (este ADR es autoritativo).
- **ADR-053** — Feature module pattern unified (`features/studio/` cuando shipping comience F14.F).
- **ADR-018** — E2E connectedness + STUBs 4 señales (cross-link banner Studio en M08 respeta).
- **ADR-008** — Monetization tiers + bundle pricing.
- **`docs/04_MODULOS/M21_STUDIO.md`** — módulo spec interno DMX (a crear F14.F kickoff con resumen consolidado anotado).

## Originales preservados

- `tmp/BIBLIA_PROPERTYX_v3.docx` (versión 3.0, abril 2026, ~26 KB) — preservado como referencia histórica.
- `tmp/BIBLIA_PROPERTYX_v4.docx` (versión 4.0, abril 2026, ~32 KB) — preservado como referencia histórica.

Estos originales NO se modifican (ADR-054 los supersede formalmente sin tocar bytes).
