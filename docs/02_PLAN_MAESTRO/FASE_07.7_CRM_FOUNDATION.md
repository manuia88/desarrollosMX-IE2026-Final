# FASE 07.7 — CRM Foundation (mini-fase foundational, BLK_DEALS resolution)

## Status
🟢 SHIPPED A.4 schema core (2026-04-25) — sub-bloques A.5 / B / C / D / E / F siguen pendientes pre-tag `fase-07.7-complete`. A.4 resolvió BLK_DEALS schema canonical (leads + buyer_twins + deals + operaciones + family_units + referrals + behavioral_signals + audit_crm_log).

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

---

## Sub-bloque A.4 — SHIPPED 2026-04-25

> Resolución BLK_DEALS schema core CRM. Cierra Gates 1-3 (ADR-033/034/035). Listos para wiring UI M01-M07 portal asesor downstream.

### Migrations creadas (11)

Todas en `supabase/migrations/`:

1. `20260425210000_crm_001_catalogs.sql` — 4 catalogs (`persona_types` 6 seeds · `lead_sources` 8 seeds · `deal_stages` 7 seeds FSM · `retention_policies` 28 seeds multi-país)
2. `20260425210100_crm_002_family_units.sql` — `family_units` + `family_unit_members`
3. `20260425210200_crm_003_leads.sql` — `leads` (schema H1 simple — pre-FASE 13 contactos completo)
4. `20260425210300_crm_004_buyer_twins.sql` — `buyer_twins` + `buyer_twin_traits`
5. `20260425210400_crm_005_deals_operaciones.sql` — `deals` + `operaciones` (canonical ADR-049, schema minimalista)
6. `20260425210500_crm_006_referrals.sql` — `referrals` polymorphic source/target + `referral_rewards`
7. `20260425210600_crm_007_behavioral_signals.sql` — `behavioral_signals` pg_partman monthly, retention 24m
8. `20260425210700_crm_008_audit_crm_log.sql` — `audit_crm_log` pg_partman monthly, retention 84m (7y CFDI-aware)
9. `20260425210800_crm_009_rls_helpers_policies.sql` — 7 SECDEF helpers RLS + policies por tabla
10. `20260425210900_crm_010_domain_triggers.sql` — triggers `tg_audit_crm_log` + cascadas STUB
11. `20260425211000_audit_rls_allowlist_v28.sql` — allowlist incremento v27→v28 cubre 14 tablas + 7 SECDEF nuevos

### Tablas (14)

`persona_types` · `lead_sources` · `deal_stages` · `retention_policies` · `family_units` · `family_unit_members` · `leads` · `buyer_twins` · `buyer_twin_traits` · `deals` · `operaciones` · `referrals` · `referral_rewards` · `behavioral_signals` (partitioned) · `audit_crm_log` (partitioned)

> **Nota:** son 15 tablas si se cuenta `audit_crm_log` aparte. La cuenta canónica del scope de A.4 es **14 tablas de dominio CRM + 1 tabla de auditoría particionada** (= 15 total — `behavioral_signals` también particionada cuenta como tabla de dominio).

Todas con `ENABLE ROW LEVEL SECURITY` en la misma migration (regla #3 CLAUDE.md).

### SECDEF helpers RLS (7)

Pre-FASE 13 (auth/permissions completo) los helpers son STUBs funcionales con lógica básica:

- `rls_is_admin()` — basado en `profiles.rol = 'admin'`
- `rls_is_asesor()` — basado en `profiles.rol = 'asesor'`
- `rls_is_master_broker()` — basado en `profiles.rol = 'master_broker'`
- `rls_is_developer()` — basado en `profiles.rol = 'developer'`
- `rls_owns_lead(lead_id)` — `leads.asesor_id = auth.uid()`
- `rls_is_assigned_lead(lead_id)` — STUB FASE 13 (extiende a manager + co-asesor team)
- `rls_is_brokerage_member(brokerage_id)` — STUB pre-FASE 13 (extiende cuando `brokerage_members` exista)

### tRPC procedures (~25)

Router raíz `crm.*` con 7 sub-routers:

| Sub-router | Procedures | Notas |
|---|---|---|
| `crm.lead.*` | `list`, `getById`, `create`, `update`, `assign`, `convertToBuyerTwin`, `softDelete` | RLS por `asesor_id` + manager visibility |
| `crm.deal.*` | `list`, `getById`, `create`, `updateStage` (FSM), `attachLead`, `closeWon`, `closeLost` | FSM enforcement vía `deal_stages` slugs |
| `crm.operacion.*` | `list`, `getById`, `createFromDeal` | Schema minimalista — parts/commissions FASE 07.7.B |
| `crm.buyerTwin.*` | `list`, `getById`, `upsertTrait`, `recomputeEmbedding` (STUB FASE 13.B.7) | Embeddings cascada pendiente |
| `crm.referral.*` | `create`, `attribute`, `listRewards`, `markRewardPaid` | Polymorphic source/target ADR-034 |
| `crm.familyUnit.*` | `create`, `addMember`, `removeMember`, `list` | Multi-comprador group buying |
| `crm.catalogs.*` | `personaTypes`, `leadSources`, `dealStages`, `retentionPolicies` | Read-only catalogs |

### ADRs cerrados (3)

- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-033_PERSONA_TYPES_CATALOG_EXTENSIBLE.md` — catalog table extensible (no enum) para evolución sin migrations
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-034_REFERRALS_POLYMORPHIC_SOURCE_TARGET.md` — polymorphic source_type/target_type cierra consolidación cross-capa C5.5/T.2.4
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-035_RETENTION_MULTI_COUNTRY_CFDI_AWARE.md` — retention multi-país (5y MX, 10y CO, 7y AR/BR) CFDI-aware

### Métricas A.4

- Tests: **+71** (3088 → 3159 unit + integration)
- audit-dead-ui baseline: **25 mantenido** (zero regression)
- LOC migrations SQL: ~1,800
- LOC tRPC procedures: ~1,200
- LOC types regenerados (`db:types`): ~600
- audit:rls clean v28
- 0 violations audit:e2e
- 0 violations audit:selects

### Próximo: A.5 + cierre FASE

- A.5 — E2E tests retrofit (Playwright happy paths CRM lead→deal→operacion + referral attribution)
- A.5 — `audit-dead-ui:ci` validation extra para nuevas UIs `crm.*` consumidoras
- Tag `fase-07.7-complete` post-A.5 cierra FASE 07.7 (sub-bloques B-F quedan opcionales para FASE 07.7.B detalle ops)

### Handoff downstream

- 26 features RICE downstream desbloqueadas (top 5 ya documentadas arriba)
- M01 Dashboard Asesor (FASE 14+) lee `leads` + `deals` + `operaciones` con disclosure badges H1
- M03 Contactos (FASE 13) extenderá `leads` → `contactos` full schema
- M07 Operaciones (FASE 14) extenderá `operaciones` con `operacion_parts` + `operacion_commissions`

