# FASE 22.A — Banking APIs Financing (mini-fase foundational, BLK_BANK resolution)

## Status
🟡 AGENDADA paralelo a FASE 22 (feature-flagged hasta tag completo, resolución blocker BLK_BANK — mortgage rates + simulator + INFONAVIT/FOVISSSTE rules)

## Trigger
- Inicio: founder cerró Gate-13 (ADR-045 banking integration path BLOQUEANTE) + tag `fase-21.A-whatsapp-integration-complete`
- Cierre: tag `fase-22.A-banking-financing-complete`

## Objetivo
Cimentar el motor financiero del comprador: tasas hipotecarias estáticas MX H1 (top-5 lenders + INFONAVIT + FOVISSSTE), simulador de hipoteca, módulo de capacidad de compra (affordability) y safety net post-compra. Sin esta capa, T.1.2 Financial Clarity (RICE 14,167 — top-4 critical path) es imposible, T.1.5 GPS enganche queda greenfield, y C3.F19 Financing Simulator no shipea. Resuelve BLK_BANK con static-rates H1 + partner negotiation track paralelo.

## Sub-bloques propuestos

### 22.A.A — Mortgage rates static stubs MX
- Scope: tabla `mortgage_rates_static` (top-5 lenders + INFONAVIT + FOVISSSTE) + ADR-047 lenders coverage + manual update procedure mensual.
- Migrations: 2 (~18h)

### 22.A.B — Mortgage simulator engine
- Scope: calculator `mortgage_simulator` (engano/CAT/plazo/seguro) puro testeable + tRPC `mortgage.simulate`.
- Migrations: 1 (~19h)

### 22.A.C — Affordability + safety net deepening
- Scope: extender `affordability_calculator` (capacidad de compra DTI-aware) + safety net post-compra (T.1.4) wire 18.B.
- Migrations: 1 (~13h)

### 22.A.D — INFONAVIT/FOVISSSTE rules engine
- Scope: tabla `infonavit_fovissste_rules` (puntaje, montos máximos, antigüedad) + RPC eligibility check.
- Migrations: 2 (~13h)

### 22.A.E — Future API negotiation track + tests
- Scope: stub partner-broker integration (Gate-13 path B) + smoke tests + ADR-046 legal status DMX simulador-only vs broker-regulado.
- Migrations: 1 (~2h)

## Migrations requeridas
- Count: **7**
- Lista tentativa:
  - `bank_001_mortgage_rates_static_schema`
  - `bank_002_mortgage_rates_seed_top5_lenders`
  - `bank_003_mortgage_simulator_runs_log`
  - `bank_004_affordability_dti_extension`
  - `bank_005_infonavit_fovissste_rules_schema`
  - `bank_006_infonavit_eligibility_rpc`
  - `bank_007_audit_rls_allowlist_v38`

## Founder gates requeridos
- Gate-13 ADR-045 — Banking integration path BLOQUEANTE (static-rates-only vs partner-broker vs INFONAVIT-API; rec: static-rates H1 + partner track parallel)
- Gate adicional ADR-046 — Legal status DMX simulador-only vs broker-regulado CONDUSEF (pre-shipping prod 22.A.B)
- Gate adicional ADR-047 — Lenders coverage initial (rec: top-5 + INFONAVIT + FOVISSSTE)

## Effort + Wall-clock
- Effort total: **60h**
- Wall-clock 1 dev fulltime: **8 días**
- Wall-clock 3 devs paralelo: **4 días**

## Features unblocked downstream
- Count: **11** (4 directos + 7 cascade)
- Top 5:
  1. T.1.2 Financial clarity completa (RICE 14,167 — top-4 critical path)
  2. T.1.5 GPS financiero enganche (RICE 8,750)
  3. C3.F19 Financing simulator (RICE 6,250)
  4. T.1.4 Safety net post-compra (RICE 7,000)
  5. C5.4.8 Investment calculator 5y leverage (RICE 7,350)

## Success criteria
- [ ] 7 migrations aplicadas + `audit:rls` clean v38
- [ ] Mortgage simulator output validado vs ejemplos reales top-5 lenders (±2%)
- [ ] INFONAVIT eligibility RPC retorna match con rules oficiales 2026
- [ ] Legal status DMX (Gate ADR-046) reflejado en disclaimers UI multi-locale
- [ ] Partner negotiation track iniciado (paralelo) — registro en pipeline backlog L-NEW
- [ ] Tag `fase-22.A-banking-financing-complete` en main

## Referencias
- `docs/08_PRODUCT_AUDIT/04_ROADMAP_INTEGRATION.md` sec 1.5
- `docs/08_PRODUCT_AUDIT/03_RICE_PRIORITIES.md` sec 7 (BLK_BANK source)
- `docs/08_PRODUCT_AUDIT/01_CROSSWALK_MATRIX.md` (11 features afectadas, capa T + C3 + C5.4)
- ADR-045/046/047 (a crear post-Gate-13 + adicionales)
