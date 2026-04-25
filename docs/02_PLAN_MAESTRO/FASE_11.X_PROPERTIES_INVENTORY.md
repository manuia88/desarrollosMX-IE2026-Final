# FASE 11.X — Properties Inventory Model (mini-fase foundational, BLK_PROPS resolution)

## Status
🟡 AGENDADA post-FASE 11.W (resolución blocker BLK_PROPS — tabla `properties` master + ingesta + AVM data wire)

## Trigger
- Inicio: founder cerró Gate-7 (ADR-039 inventory model — BLOQUEANTE más crítico) + tag `fase-11.W-disc-voice-pipeline-complete`
- Cierre: tag `fase-11.X-properties-inventory-complete`

## Objetivo
Construir el modelo canónico de propiedades (residencial + comercial + terreno) que alimenta listings públicos, AVM, portfolio del inversionista y el motor de matching. Sin esta base, 9 features directos + 5 cascade quedan greenfield (C2.1 AVM spread, C5.4.1 portfolio inversor, C2.2 price truth meter, C5.2.5 auto-valuation updater, T.2.6 post-compra alertas, etc.). Es el blocker más estructural por scope (BD + storage + ingestion + AVM data) y por impacto en FASE 15 Desarrollador, FASE 20 Comprador y FASE 23 Inversionista.

## Sub-bloques propuestos

### 11.X.A — Schema core properties + property_units + amenities
- Scope: tabla `properties` polimórfica por `asset_class` + `property_units` split (departamentos en proyecto) + `amenities` catalog + FKs `zones` + RLS.
- Migrations: 3 (~26h)

### 11.X.B — Listing states machine + history
- Scope: enum `listing_state` (draft/active/under_contract/sold/expired) + transición tabla `listing_state_history` + triggers.
- Migrations: 2 (~19h)

### 11.X.C — Property media + verified pipeline
- Scope: `property_media` (fotos/videos/floorplans) + verified flag (C2.27 verified photos engine) + Supabase Storage policies + signed URLs.
- Migrations: 2 (~21h)

### 11.X.D — Wire AVM + zone_pulse data foundation
- Scope: `avm_estimates` weekly recompute + wire a `zone_pulse_12m` + spread cierre vs listado (C2.1).
- Migrations: 2 (~26h)

### 11.X.E — Ingestion adapter asesor manual + future MLS
- Scope: tRPC `properties.create` para asesor + adapter abstraction futuro MLS (EBI/Easy Broker MX hybrid model — Gate-7).
- Migrations: 2 (~37h)

### 11.X.F — Tests + types + seed verificación
- Scope: 80+ tests + types regen + seed dev 50 properties + smoke E2E.
- Migrations: 0 (~3h)

## Migrations requeridas
- Count: **12**
- Lista tentativa:
  - `props_001_properties_schema_polymorphic`
  - `props_002_property_units_split`
  - `props_003_amenities_catalog`
  - `props_004_listing_states_enum`
  - `props_005_listing_state_history`
  - `props_006_property_media_schema`
  - `props_007_storage_policies_property_media`
  - `props_008_avm_estimates_table`
  - `props_009_avm_weekly_recompute_cron`
  - `props_010_zone_pulse_wire_avm_data`
  - `props_011_properties_ingestion_rpcs`
  - `props_012_audit_rls_allowlist_v37`

## Founder gates requeridos
- Gate-7 ADR-039 — DMX inventory model BLOQUEANTE (portal-own vs MLS aggregator vs hybrid; rec: hybrid own + EBI/Easy Broker MX)
- Gate-8 ADR-040 — `asset_class` scope H1 (rec: residential + comercial + terreno)
- Gate-9 ADR-041 — STR collision merge vs split (rec: split H1 — `str_listings` AirROI distinto, unify H2)

## Effort + Wall-clock
- Effort total: **132h**
- Wall-clock 1 dev fulltime: **17 días**
- Wall-clock 3 devs paralelo: **7 días**

## Features unblocked downstream
- Count: **16** (11 directos + 5 cascade)
- Top 5:
  1. C2.1 AVM spread listado vs cierre (RICE 8,385) — depende también 07.7 deals
  2. C5.4.1 Portfolio inversor (RICE 292, gating)
  3. C2.2 Price truth meter listing (RICE 9,625)
  4. C5.2.5 Auto-valuation updater AVM (RICE 8,794)
  5. T.2.6 Post-compra alertas (RICE 10,000) — depende 11.X + 21.A

## Success criteria
- [ ] 12 migrations aplicadas + `audit:rls` clean v37
- [ ] Asesor puede crear property end-to-end via tRPC con media upload signed URLs
- [ ] AVM weekly recompute cron corre + `ingest_runs` log fail-fast
- [ ] Listings public surface (FASE 21) consumen `properties` sin acoplamiento
- [ ] Inventory model decision (Gate-7) reflejada en código + ADR-039 merged
- [ ] Tag `fase-11.X-properties-inventory-complete` en main

## Referencias
- `docs/08_PRODUCT_AUDIT/04_ROADMAP_INTEGRATION.md` sec 1.3
- `docs/08_PRODUCT_AUDIT/03_RICE_PRIORITIES.md` sec 7 (BLK_PROPS source)
- `docs/08_PRODUCT_AUDIT/01_CROSSWALK_MATRIX.md` (16 features afectadas)
- ADR-039/040/041 (a crear post-Gates 7-9)
- Memoria `feedback_arquitectura_escalable_desacoplada` (split properties/property_units canonized)
