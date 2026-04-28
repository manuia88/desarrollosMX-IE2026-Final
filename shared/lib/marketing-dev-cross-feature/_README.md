# marketing-dev-cross-feature (STUB ADR-018)

Modulo cross-feature para Studio Sprint 8 export series episodes a campañas Marketing Dev.

Status: **STUB** — activar en FASE 15 cuando M14 Marketing Dev shipped.

## Senales ADR-018

1. Comentario codigo `STUB ADR-018 — activar FASE 15 cuando M14 Marketing Dev shipped`.
2. Throw `NOT_IMPLEMENTED` desde `exportSeriesToMarketingCampaign`.
3. UI Studio gating via `isMarketingDevReady()` flag.
4. TODO list:
   - [ ] FASE 15 ship M14: tabla `marketing_campaigns_dev` shipped.
   - [ ] FASE 15 flip `isMarketingDevReady()` a `true`.
   - [ ] FASE 15 implement real export: insert relacion `series ↔ campaign`.
   - [ ] FASE 15 add tests Modo A real adapter.
   - [ ] FASE 15 update este README marcando feature LIVE.

## Pattern canon

Sigue ADR-056. Read shape definido para que Studio UI compile + tests Modo A pasen
hoy con resultado `NOT_IMPLEMENTED` esperado.
