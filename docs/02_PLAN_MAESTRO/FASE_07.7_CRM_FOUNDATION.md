# FASE 07.7 — CRM Foundation (mini-fase foundational, BLK_DEALS resolution)

## Status
🟡 AGENDADA pre-FASE 11.T (resolución blocker BLK_DEALS — schema deals/leads/buyer_twins canonical)

## Trigger
- Inicio: tag `fase-07.6-complete` + founder cerró Gates 1, 2, 3 (ref `docs/08_PRODUCT_AUDIT/05_FOUNDER_DECISION_GATES.md`)
- Cierre: tag `fase-07.7-crm-foundation-complete`

## Objetivo
Establecer el cimiento de datos del CRM (leads, gemelos digitales del comprador, operaciones de venta y referidos) antes de tocar el portal del asesor. Sin este cimiento, FASE 13 Asesor M1-M5 arranca greenfield con riesgo de retrofit costoso, y FASE 11.J (data CRM cierres alimenta AVM spread) queda bloqueada. El bloque resuelve BLK_DEALS — el blocker #3 más crítico del critical path top-30 RICE.

## Sub-bloques propuestos

### 07.7.A — Schema core leads + buyer_twins + deals
- Scope: tablas `leads`, `buyer_twins`, `deals` con FKs a `auth.users` + `zones` + `properties` (placeholder pre-11.X) + RLS por org/asesor + índices.
- Migrations: 3 (~17h)

### 07.7.B — Operaciones + family_units + referrals polimórfico
- Scope: `operaciones`, `family_units` (multi-comprador group buying), `referrals` (polymorphic source_type/target_type — consolidación cross-capa C5.5/T.2.4).
- Migrations: 3 (~17h)

### 07.7.C — Pipeline stages + behavioral signals + audit
- Scope: enum `pipeline_stage`, tabla `behavioral_signals` particionada por mes (telemetría comprador), `audit_crm_log` triggers.
- Migrations: 2 (~14h)

### 07.7.D — RPCs + tRPC router base
- Scope: `crm` router base con CRUD seguro + RPCs `lead_to_deal`, `deal_to_won`, `referral_attribute`. Tests Zod schemas Single Source of Truth.
- Migrations: 1 (~26h)

### 07.7.E — Tests + types + audit_rls_allowlist v36
- Scope: 100+ unit tests + types regenerados + `audit_rls_allowlist_v36` migration cubriendo nuevas tablas.
- Migrations: 1 (~12h)

### 07.7.F — Seed data dev + verificación
- Scope: seed 50 leads + 20 buyer_twins + 10 deals dev/staging + smoke tests.
- Migrations: 0 (~2h)

## Migrations requeridas
- Count: **11**
- Lista tentativa:
  - `crm_001_leads_schema`
  - `crm_002_buyer_twins_schema`
  - `crm_003_deals_schema`
  - `crm_004_operaciones_schema`
  - `crm_005_family_units_schema`
  - `crm_006_referrals_polymorphic`
  - `crm_007_pipeline_stages_enum`
  - `crm_008_behavioral_signals_partitioned`
  - `crm_009_audit_crm_triggers`
  - `crm_010_rpcs_lead_deal_referral`
  - `audit_rls_allowlist_v36`

## Founder gates requeridos
- Gate-1 ADR-033 — `persona_type` enum buyer_twins canonical (rec: `buyer_self · asesor_lead · investor · masterbroker`)
- Gate-2 ADR-034 — referral engine polymorphic vs split (rec: polymorphic, consolidación cross-capa #5)
- Gate-3 ADR-035 — retention CFDI-aware multi-país (rec: 5y MX, 10y CO, 7y AR/BR)
- Ref: `docs/08_PRODUCT_AUDIT/05_FOUNDER_DECISION_GATES.md`

## Effort + Wall-clock
- Effort total: **88h**
- Wall-clock 1 dev fulltime (6h efectivos/día): **11 días**
- Wall-clock 3 devs paralelo (8% coordination tax): **5 días**

## Features unblocked downstream
- Count: **26** (11 directos top critical path + 15 cascade)
- Top 5:
  1. C1.10 Buyer twin preloaded gemelo (RICE 5,893)
  2. C1.11 Portal-to-CRM auto-capture (RICE 7,700)
  3. C2.1 AVM spread listado vs cierre (RICE 8,385) — depende cierres CRM
  4. C5.5.3 Streaks asesor diarios
  5. T.2.4 Referral magic link perfil (RICE 8,750)

## Success criteria
- [ ] 11 migrations aplicadas en Supabase prod (`db push manual` post-merge — feedback `feedback_supabase_migrations_manual_push`)
- [ ] `audit:rls` clean — todas las nuevas tablas cubiertas por allowlist v36
- [ ] tRPC `crm.*` router con ≥10 procedures testeados
- [ ] Seed dev/staging carga sin errores + smoke tests verde
- [ ] `npm run db:types` sin diff sucio
- [ ] Tag `fase-07.7-crm-foundation-complete` en main

## Referencias
- `docs/08_PRODUCT_AUDIT/04_ROADMAP_INTEGRATION.md` sec 1.1
- `docs/08_PRODUCT_AUDIT/03_RICE_PRIORITIES.md` sec 7 (BLK_DEALS source)
- `docs/08_PRODUCT_AUDIT/01_CROSSWALK_MATRIX.md` (26 features afectadas)
- ADR-033/034/035 (a crear post-Gates 1-3)
