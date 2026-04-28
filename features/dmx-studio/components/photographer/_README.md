# photographer/ — STUB ADR-018 ledger

## STUB activo: custom-domain-h2

**Signal 1 (comment):** Inline comment in `WhiteLabelSettings.tsx` next to the disabled button.
**Signal 2 (throw):** `onClick` throws `NOT_IMPLEMENTED: custom_domain_h2_stub_adr_018`.
**Signal 3 (this file):** documents flip path.
**Signal 4 (UI flag):** `aria-disabled` + `data-stub="adr-018"` + `data-stub-feature="custom-domain-h2"` on the button + tooltip text "(H2)".

### Flip path H2

When founder validates demand:

1. Add migration `studio_photographers.custom_domain text` + `custom_domain_verified_at timestamptz` columns.
2. Add tRPC procedure `setCustomDomain` in `features/dmx-studio/routes/sprint9-photographer.ts` with DNS verification step (CNAME pointing to Vercel).
3. Implement Vercel domain assignment via Vercel API (or marketplace integration).
4. Replace the disabled button onClick handler with an actual flow that triggers `setCustomDomain` + DNS verification UI.
5. Remove all 4 STUB signals from `WhiteLabelSettings.tsx`.
6. Update this README to remove the STUB entry.

### Why H1 ships slug-based only

H1 covers Foto plan launch with `/studio/foto/{slug}` URLs (no DNS friction, ships fast). Custom domain is a power-user feature; deferring until founder confirms ≥10 photographers asking for it.
