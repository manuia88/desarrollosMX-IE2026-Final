# 04 — Roadmap Integration FASE 07.5.F → 29 + H2/H3 (FASE 07.6.E)

> Asignación 149 features × fases específicas con timelines M1-M4 + 5 mini-fases foundational nuevas + effort total + critical path schedule trimestral 2026-Q2 → 2030-Q1.
> Generado: 2026-04-24 sub-sesión 07.6.E paso 5/6.
> Inputs canónicos:
> - `docs/08_PRODUCT_AUDIT/00_INVENTARIO_ACTUAL.md` (897 líneas evidence shipped)
> - `docs/08_PRODUCT_AUDIT/01_CROSSWALK_MATRIX.md` (632 líneas, 149 features × 15 columnas — header dice 150, capa T tiene 11 reales)
> - `docs/08_PRODUCT_AUDIT/02_DESIGN_MIGRATION.md` (471 líneas, M3a 42h + M3b 144h + i18n 16h + WCAG 12h = 214h design)
> - `docs/08_PRODUCT_AUDIT/03_RICE_PRIORITIES.md` (529 líneas, RICE re-normalized + critical path + 5 blockers + buckets 48/78/23)
> Método: 3 sub-agents paralelos (SA-Foundational + SA-Roadmap + SA-Timeline) + master consolidation cross-validation.
> Drafts intermedios: `tmp/07.6.E-drafts/` (gitignored).
> Output downstream: input para 07.6.F (founder gates formalization + L-NEW canonization + tag `fase-07.6-complete`).

---

## Resumen ejecutivo

| Métrica | Valor |
|---|---|
| Total features mapped a fases | **149** (cobertura 100%, 0 huérfanos) |
| Mini-fases foundational nuevas | **5** (07.7 CRM + 11.W DISC + 11.X Properties + 21.A WhatsApp + 22.A Banking) |
| Fases existentes refreshed | **22** (08, 11.T-Z, 12, 13-29 + H2/H3 30-38) |
| Effort total mini-fases foundational | **420h** (88 + 64 + 132 + 76 + 60) |
| Effort total proyectado H1 (07.6 → 29) | **~8,716h** (incluye 5 mini-fases + 127 features H1) |
| Effort total proyectado H2 (30-34) | **~2,790h** (33 features) |
| Effort total proyectado H3 (35-38) | **~2,650h** (18 features) |
| Effort total H1 + H2 + H3 | **~14,156h** |
| Wall-clock H1 — 1 dev fulltime | **6.05 años** |
| Wall-clock H1 — 3 devs paralelo (8% coordination tax) | **2.19 años realistic** |
| Wall-clock H1+H2+H3 — 3 devs paralelo realistic | **3.56 años** |
| Foundational gates founder pendientes | **13** agrupables en 2 sesiones síncronas (~4h founder time) |
| ADRs nuevos requeridos | **13** (ADR-033 → ADR-047) |
| Migrations nuevas mini-fases | **47** (11 + 8 + 12 + 9 + 7) |
| Critical path schedule end-date H1 | **2028-Q2** (3 devs paralelo, baseline) |
| H2 launch | **2028-Q2 → 2028-Q4** |
| H3 moonshot launch | **2029-Q1 → 2030-Q1** |
| Distribución bucket | 🟢 68 build-now · 🟡 61 build-fase-específica · 🔴 20 H2+ |

**Hallazgos críticos:**
1. **Sequencing obligatorio mini-fases:** 07.7 → 11.W → 11.X → 21.A → 22.A. No paralelizables entre sí.
2. **Top-30 critical path coverage:** los 5 mini-fases elevan critical Y de 11/30 → 26/30 (87%).
3. **Risk-1 más bloqueante:** Gate-7 (DMX inventory model — portal-own vs MLS aggregator vs hybrid). Sin decisión founder, FASE 11.X no arranca — priorizar en 07.6.F.
4. **Sweet spot headcount:** 3-5 devs (H1 con 3, H2/H3 con 5). Costo total estimado ~$800k USD para 3.25 años calendar.

---

## Sección 1 — Foundational Mini-fases (5 nuevas)

Fuente canonical: SA-Foundational (`tmp/07.6.E-drafts/SA-Foundational.md`, 535 líneas, 39.8KB).

### 1.1 — FASE 07.7: CRM Foundation Stack (BLK_DEALS resolution)

**Posición:** insertada entre FASE 07.6 y FASE 08.
**Trigger inicio:** tag `fase-07.6-complete`. **Trigger cierre:** tag `fase-07.7-crm-foundation-complete`.
**Justificación:** 11 directos (top critical path #3) + cascade C1/C5.5/C2.F1/C5.3.6. Sin schema deals/leads/twins, FASE 13 Asesor Portal es greenfield bloqueado y FASE 11.J (AVM data CRM cierres) requiere retrofit costoso.

**Sub-bloques:**
- 07.7.A Schema core leads + buyer_twins + deals (3 migrations · 17h)
- 07.7.B Operaciones + family_units + referrals polimórfico (3 migrations · 17h)
- 07.7.C Pipeline stages + behavioral signals + audit (2 migrations · 14h)
- 07.7.D RPCs + tRPC router base (1 migration · 26h)
- 07.7.E Tests + types + audit_rls_allowlist v36 (1 migration · 12h)
- 07.7.F Seed data dev + verificación (sin migration · 2h)

**Total:** 11 migrations · 88h · 11 días serial (1 dev) / 5 días paralelo (3 devs) · 26 features unblocked (11 directos top-30 + 15 cascade).

**Gates founder:** Gate-1 ADR-033 persona_type enum · Gate-2 ADR-034 referrals polymorphic · Gate-3 ADR-035 retention CFDI-aware.

**Personas:** asesor (primary 24/26) · comprador (8/26) · inversionista (3/26) · admin · desarrollador.

### 1.2 — FASE 11.W: DISC Voice Pipeline (BLK_DISC resolution)

**Posición:** dentro slot FASE 11.W (sustituye al "Historical Forensics" original moviéndolo a 11.W1).
**Trigger inicio:** tag `fase-07.7-crm-foundation-complete`. **Trigger cierre:** tag `fase-11.W-disc-voice-pipeline-complete`.
**Justificación:** 6 features C3 + 1 cross-capa requieren `disc_profile` columna habilitada. Sin DISC, C3.F1 Agente WhatsApp + C3.F3 Objection playbook + C1.18 DISC auto-detectado + T.2.1 Gemelo digital 6D quedan greenfield.

**Sub-bloques:**
- 11.W.A DISC framework canonization + privacy ADR (2 migrations · 8h)
- 11.W.B Self-assessment manual stub H1 (1 migration · 17h)
- 11.W.C Whisper integration audio pipeline (3 migrations · 23h)
- 11.W.D LLM DISC classifier (1 migration · 14h)
- 11.W.E Wire buyer_twins + tests + smoke (1 migration · 2h)

**Total:** 8 migrations · 64h · 8 días serial / 4 días paralelo · 7 features directos + 4 cascade = 11.

**Gates founder:** Gate-4 ADR-036 DISC vs Big-Five vs MBTI · Gate-5 ADR-037 Whisper provider · Gate-6 ADR-038 Privacy LFPDPPP/GDPR/LGPD voice biométrico.

**Personas:** asesor (6/7 primary) · comprador (consent) · admin (privacy enforcement).

### 1.3 — FASE 11.X: Properties Inventory Model (BLK_PROPS resolution)

**Posición:** dentro slot FASE 11.X (extiende "Living Metropolitan Networks" a 11.X1, agrega Properties Inventory como 11.X2 — pero referenciado consolidado como "FASE 11.X" en este roadmap).
**Trigger inicio:** Gate-7 founder cerrado (ADR-039) + tag `fase-11.W-disc-voice-pipeline-complete`. **Trigger cierre:** tag `fase-11.X-properties-inventory-complete`.
**Justificación:** 9 features directos + cascade dependen de tabla properties. Es el blocker más estructural por scope (BD + storage + ingestion + AVM data).

**Sub-bloques:**
- 11.X.A Schema core properties + property_units + amenities (3 migrations · 26h)
- 11.X.B Listing states machine + history (2 migrations · 19h)
- 11.X.C Property media + verified pipeline (2 migrations · 21h)
- 11.X.D Wire AVM + zone_pulse data foundation (2 migrations · 26h)
- 11.X.E Ingestion adapter asesor manual + future MLS (2 migrations · 37h)
- 11.X.F Tests + types + seed verificación (sin migration · 3h)

**Total:** 12 migrations · 132h · 17 días serial / 7 días paralelo · 11 directos + 5 cascade = 16.

**Gates founder:** Gate-7 ADR-039 inventory model BLOQUEANTE (portal-own vs MLS aggregator vs hybrid) · Gate-8 ADR-040 asset_class scope H1 · Gate-9 ADR-041 STR collision split vs merge.

**Personas:** comprador (primary listings) · asesor (CRUD) · desarrollador (project listings) · inversionista (portfolio) · admin (compliance).

### 1.4 — FASE 21.A: WhatsApp Business Integration (BLK_WA resolution)

**Posición:** insertada inmediatamente antes de FASE 22 Marketing+Comms.
**Trigger inicio:** Gate-2 founder cerrado (ADR-042) + tag `fase-21-portal-publico-complete`. **Trigger cierre:** tag `fase-21.A-whatsapp-integration-complete`.
**Justificación:** 8 directos (C3.F1, C3.F17, C3.F11, C3.F9, C6.F9, C6.F5, C6.F6, T.1.5) + cascade 12 WA notifs. Sin esto, FASE 22 incompleta.

**Sub-bloques:**
- 21.A.A Provider abstraction + ADR-042 (2 migrations · 20h)
- 21.A.B Templates + WABA approval flow (2 migrations · 18h)
- 21.A.C Sender service + opt-in consent (3 migrations · 23h)
- 21.A.D Webhooks inbound + alerts engine wire (1 migration · 14h)
- 21.A.E Cost cap + observability + tests (1 migration · 1h)

**Total:** 9 migrations · 76h · 10 días serial / 4 días paralelo · 8 directos + 12 cascade WA notifs = 20.

**Gates founder:** Gate-2 ADR-042 Twilio vs Meta WA Cloud BLOQUEANTE · Gate-10 ADR-043 WABA verification path · Gate-11 ADR-044 Templates initial scope 12 vs 25.

**Personas:** comprador (primary 80% destino) · asesor (origen + receptor inbound) · desarrollador · inversionista · admin.

### 1.5 — FASE 22.A: Banking APIs Financing (BLK_BANK resolution)

**Posición:** paralelo con FASE 22 (mismo timeline) feature-flagged hasta tag completo.
**Trigger inicio:** Gate-6 founder cerrado (ADR-045) + tag `fase-21.A-whatsapp-integration-complete`. **Trigger cierre:** tag `fase-22.A-banking-financing-complete`.
**Justificación:** 4 directos (C3.F19, T.1.2 Critical tier, T.1.5, T.1.4) + cascade alto. Sin Banking APIs, T.1.2 Financial clarity (RICE 14,167 — top-4) imposible.

**Sub-bloques:**
- 22.A.A Mortgage rates static stubs MX (2 migrations · 18h)
- 22.A.B Mortgage simulator engine (1 migration · 19h)
- 22.A.C Affordability + safety net deepening (1 migration · 13h)
- 22.A.D INFONAVIT/FOVISSSTE rules engine (2 migrations · 13h)
- 22.A.E Future API negotiation track + tests (1 migration · 2h ajustado)

**Total:** 7 migrations · 60h · 8 días serial / 4 días paralelo · 4 directos + 7 cascade = 11.

**Gates founder:** Gate-6 ADR-045 Banking integration path BLOQUEANTE (static-rates vs partner-broker vs INFONAVIT-API) · Gate-12 ADR-046 Legal status DMX simulador-only vs broker-regulado · Gate-13 ADR-047 Lenders coverage initial.

**Personas:** comprador (primary) · asesor (cierre weapon) · inversionista (leverage) · admin (compliance).

### 1.6 — Tabla resumen 5 mini-fases

| Mini-fase | Trigger inicio | Trigger cierre | Migrations | Gates founder | Effort h | Wall-clock 1 dev | Unblocks |
|---|---|---|---|---|---|---|---|
| **FASE 07.7** CRM Foundation | tag `fase-07.6-complete` | tag `fase-07.7-crm-foundation-complete` | 11 | 1, 2, 3 (ADR-033/034/035) | 88 | 11 días | 26 |
| **FASE 11.W** DISC Voice Pipeline | tag 07.7 complete | tag `fase-11.W-disc-voice-pipeline-complete` | 8 | 4, 5, 6 (ADR-036/037/038) | 64 | 8 días | 11 |
| **FASE 11.X** Properties Inventory | Gate-7 + tag 11.W complete | tag `fase-11.X-properties-inventory-complete` | 12 | 7, 8, 9 (ADR-039/040/041) | 132 | 17 días | 16 |
| **FASE 21.A** WhatsApp Integration | Gate-2 + tag 21 complete | tag `fase-21.A-whatsapp-integration-complete` | 9 | 2-rexp, 10, 11 (ADR-042/043/044) | 76 | 10 días | 20 |
| **FASE 22.A** Banking Financing | Gate-6 + tag 21.A complete | tag `fase-22.A-banking-financing-complete` | 7 | 6-rexp, 12, 13 (ADR-045/046/047) | 60 | 8 días | 11 |
| **TOTAL** | — | — | **47** | **13 ADRs nuevos** | **420h** | **54 días serial / 24 días 3 devs** | **84 (cruda) / 56 únicas** |

---

## Sección 2 — Roadmap completo FASE 07.5.F → 38

Fuente canonical: SA-Roadmap (`tmp/07.6.E-drafts/SA-Roadmap.md`, 1121 líneas, 49.3KB).

### 2.1 — Convenciones de asignación

- **Fase target dominante:** un feature vive en EXACTAMENTE 1 fase. Cross-fase surfacing se anota pero no duplica.
- **Bucket emoji:** 🟢 build-now (07.7-15 apalanca shipped) · 🟡 build-fase-específica (16-29 dep blocker) · 🔴 build-H2+ (30-38 moonshot).
- **RICE letter:** C >10k · H 5k-10k · M 1k-5k · L <1k.
- **Persona dominante:** asesor → 13-14 · comprador → 20 · desarrollador → 15 · inversionista → 23 · admin → 19.

### 2.2 — Distribución resumen por fase

| Fase | Features count | Bucket dominante | Effort h aprox | Dependencies upstream |
|---|---|---|---|---|
| FASE 07.5.F (cerrada) | 0 | — | 0 | ninguna |
| FASE 07.6.A-F (en curso) | 0 (meta) | — | 60 | ninguna |
| **FASE 07.7 NUEVA (BLK_DEALS)** | 0 (infra) | — | 88 | tag 07.6-complete |
| FASE 08 (shipped) | 0 | — | 0 | ninguna |
| FASE 09 (shipped) | 0 | — | 0 | ninguna |
| FASE 10 (shipped) | 0 | — | 0 | ninguna |
| FASE 11 (T+V+W+X+Y+Z, 5 mini-fases) | **22** | 🟢 (19) | ~600 (incluye 11.W+11.X) | 08-10 shipped + 07.7 + 11.W gates |
| FASE 12 N5 + Atlas UX | 5 | 🟢/🟡 | ~140 | 11 N5 |
| FASE 13 Asesor M1-M5 | 13 | 🟢 (12) | ~520 | 07.7 + 11.W + 11.Z |
| FASE 14 Asesor M6-M10 | 17 | 🟢 (14) | ~480 | 13 |
| FASE 15 Desarrollador | 16 | 🟡 (15) | ~620 | 11.X + 14 |
| FASE 16 Contabilidad Dev | 1 | 🟡 | ~80 | 14 |
| FASE 17 DocIntel | 2 | 🟡 | ~160 | 13-14 + 11.X |
| FASE 18 Legal/Pagos/Escrow | 2 | 🟢/🟡 | ~120 | 17 + 11.X |
| FASE 19 Portal Admin | 0 (infra) | — | ~120 | 13-15 |
| FASE 20 Comprador (T-capa) | 11 | 🟢 (7) | ~700 | 11 IE + 11.X + 22.A |
| **FASE 21.A NUEVA (BLK_WA)** | 1 (C6.9) | 🟡 | 76 | Gate-2 + tag 21 complete |
| FASE 21 Portal Público + SEO | 7 | 🟢 (7) | ~280 | 11.X + 11.Z |
| **FASE 22.A NUEVA (BLK_BANK)** | 0 (infra) | — | 60 | Gate-6 + tag 21.A complete |
| FASE 22 Marketing automation | 20 | 🟡 (16) | ~700 | 21.A + 22.A + 11.X + 13-14 |
| FASE 23 Inversor + Monetización | 12 | 🟡 (11) | ~600 | 11.X + 14 + STR shipped |
| FASE 24 Observability SRE | 1 | 🔴 | ~80 | 14 + observability |
| FASE 25 Performance Mobile | 0 (infra) | — | ~60 | — |
| FASE 26 Compliance/Auditoría | 1 | 🔴 | ~120 | 24 + sentiment |
| FASE 27 Testing QA | 0 (meta) | — | ~80 | — |
| FASE 28 Launch Soft | 0 (meta) | — | ~60 | — |
| FASE 29 H2/H3 Scaffold | 0 (meta) | — | ~100 | — |
| **H1 SUBTOTAL** | **131 features** | — | **~5,800h roll-up roadmap (~8,716h timeline detallado)** | — |
| FASE 30 Platform API | 2 | 🟢/🟡 | ~360 | 11.X AVM + 23 |
| FASE 31 Agentic Marketplace | 12 | 🔴 | ~600 | 22 corpus + 13-14 |
| FASE 32 Digital Twin | 1 | 🔴 | ~360 | 11.X + ADR-016 |
| FASE 33 Data Ecosystem | 0 (infra) | — | ~540 | 23.E + 30 |
| FASE 34 Creator Economy | 1 | 🔴 | ~540 | 14 mature + 22 |
| **H2 SUBTOTAL** | **16 features** | — | **~2,790h** | — |
| FASE 35 DMX Terminal | 0 (surfaces) | — | ~540 | H2 mature |
| FASE 36 Fractional Investing | 0 (no crosswalk) | — | ~540 | embedded banking |
| FASE 37 Embedded Banking | 0 (no crosswalk) | — | ~540 | 22.A scaling |
| FASE 38 International + Multigen | 2 | 🔴 | ~720 | 15y data + Partner ecosystem |
| **H3 SUBTOTAL** | **2 features** | — | **~2,650h** | — |
| **TOTAL** | **149** | — | **~14,156h** | 0 huérfanos ✓ |

### 2.3 — Distribución bucket × horizonte

| Horizonte | Fases | Features | 🟢 | 🟡 | 🔴 | % total |
|---|---|---|---|---|---|---|
| H1 (07.5-29) | 07.7, 11-29 | 131 | 67 | 60 | 4 | 88% |
| H2 (30-34) | 30-34 | 16 | 1 | 1 | 14 | 11% |
| H3 (35-38) | 35-38 | 2 | 0 | 0 | 2 | 1% |
| **TOTAL** | — | **149** | **68** | **61** | **20** | **100%** |

### 2.4 — Distribución por persona dominante

| Persona | Features | Fases dominantes |
|---|---|---|
| comprador | 35 | 20 + 21 + 22 |
| asesor | 38 | 13 + 14 + 22 |
| desarrollador | 18 | 15 |
| inversionista | 13 | 23 |
| dev (tech B2B) | 5 | 30 |
| admin/interno | 2 | 19 + 24 |
| multi-persona (cross) | 38 | 11 IE shipped + 22 |
| **TOTAL** | **149** | — |

---

## Sección 3 — Timeline M1-M4 top-30 features

Fuente canonical: SA-Timeline (`tmp/07.6.E-drafts/SA-Timeline.md`, 594 líneas, 31.6KB).

### 3.1 — Heurística scale → effort horas (M1+M2+M3a+M3b+M4+i18n+WCAG)

| Scale | M1 BD | M2 BE | M3a | M3b | M4 E2E | i18n | WCAG | **Total** |
|---|---|---|---|---|---|---|---|---|
| S Small | 2 | 4 | 0.5 | 2 | 2 | 0.5 | 0.3 | **11h** |
| M Medium | 4 | 8 | 1 | 4 | 4 | 1 | 0.5 | **22h** |
| L Large | 8 | 16 | 2 | 8 | 8 | 2 | 1 | **45h** |
| XL Extra-large | 16 | 32 | 4 | 16 | 16 | 4 | 2 | **90h** |

Nota: M3a per-feature es amortización del bloque global 42h (one-shot pre-FASE 11.T). M3a global se contabiliza una sola vez en roll-up.

### 3.2 — Tabla top-30 features (M1-M4 detallado)

| # | Feature | Persona | RICE | Scale | M1 | M2 | M3a | M3b | M4 | i18n | WCAG | **Total** | Fase target |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | C2.4 Oráculo precio AGEB 6/12/24m CI | comp+inv+ase+dev | 22,958 | M | 4 | 8 | 1 | 4 | 4 | 1 | 0.5 | **22** | 11.Z + 13 escalar |
| 2 | C2.8 Micro-zone DNA profiling 50+ vars | comp+ase+inv+dev | 22,958 | M | 4 | 8 | 1 | 4 | 4 | 1 | 0.5 | **22** | 11.V + L-NEW14 |
| 3 | C2.13 Zone discovery gemelas DNA | comp+inv+ase | 22,760 | M | 4 | 8 | 1 | 4 | 4 | 1 | 0.5 | **22** | 11.Z + L-NEW25 |
| 4 | T.1.2 Financial clarity completa | comprador | 14,167 | L | 8 | 16 | 2 | 8 | 8 | 2 | 1 | **45** | 20.C (post-22.A) |
| 5 | C2.22 Market timing signals | comp+inv+ase | 12,578 | M | 4 | 8 | 1 | 4 | 4 | 1 | 0.5 | **22** | 11.Z + L-NEW26 |
| 6 | T.1.1 Decision engine veredicto | comprador | 10,000 | L | 8 | 16 | 2 | 8 | 8 | 2 | 1 | **45** | 20.B |
| 7 | T.2.6 Post-compra alertas | comprador | 10,000 | M | 4 | 8 | 1 | 4 | 4 | 1 | 0.5 | **22** | 22 (post-11.X+21.A) |
| 8 | C4.1.5 Waiting List por zona | comprador | 10,000 | S | 2 | 4 | 0.5 | 2 | 2 | 0.5 | 0.3 | **11** | 21 (UI+cron) |
| 9 | C2.2 Price truth meter listing | ase+comp | 9,625 | M | 4 | 8 | 1 | 4 | 4 | 1 | 0.5 | **22** | 11.X.2 + 21 |
| 10 | C2.9 Livability personalizado | comp+ase | 9,625 | M | 4 | 8 | 1 | 4 | 4 | 1 | 0.5 | **22** | 11.Z + 20 |
| 11 | T.1.5 GPS financiero enganche | comprador | 8,750 | M | 4 | 8 | 1 | 4 | 4 | 1 | 0.5 | **22** | 22.F (post-22.A) |
| 12 | T.2.4 Referral magic link perfil | comprador | 8,750 | M | 4 | 8 | 1 | 4 | 4 | 1 | 0.5 | **22** | 22.B (consolidación C3.F11) |
| 13 | C3.18 Social proof "5 vieron 24h" | comprador | 8,750 | S | 2 | 4 | 0.5 | 2 | 2 | 0.5 | 0.3 | **11** | 21.B + 22 |
| 14 | C4.1.3 Zone Discovery DNA cosine | comprador | 8,750 | M | 4 | 8 | 1 | 4 | 4 | 1 | 0.5 | **22** | 12 N5 |
| 15 | C5.2.5 Auto-valuation updater AVM | comp+desa | 8,794 | M | 4 | 8 | 1 | 4 | 4 | 1 | 0.5 | **22** | 11.X.2 / 24 cron |
| 16 | C2.1 AVM con spread listado vs cierre | ase+comp+inv | 8,385 | L | 8 | 16 | 2 | 8 | 8 | 2 | 1 | **45** | 11.X.2 (post 07.7 data) |
| 17 | T.2.1 Gemelo digital persistente | comprador | 8,000 | L | 8 | 16 | 2 | 8 | 8 | 2 | 1 | **45** | 20.A |
| 18 | T.2.5 Portfolio personal Mint-style | comprador | 7,969 | L | 8 | 16 | 2 | 8 | 8 | 2 | 1 | **45** | 20.D (wire A11) |
| 19 | C1.11 Portal-to-CRM auto-capture | ase+comp | 7,700 | M | 4 | 8 | 1 | 4 | 4 | 1 | 0.5 | **22** | 13.A |
| 20 | C5.4.8 Investment calculator 5y | inv+comp | 7,350 | L | 8 | 16 | 2 | 8 | 8 | 2 | 1 | **45** | 21.C lead magnet |
| 21 | T.1.4 Safety net post-compra | comprador | 7,000 | M | 4 | 8 | 1 | 4 | 4 | 1 | 0.5 | **22** | 18.B (post-Legal) |
| 22 | C3.17 Reporte personalizado WA | comp+ase | 6,600 | M | 4 | 8 | 1 | 4 | 4 | 1 | 0.5 | **22** | 22.C (post-21.A) |
| 23 | C3.19 Financing simulator | comprador | 6,250 | L | 8 | 16 | 2 | 8 | 8 | 2 | 1 | **45** | 20.H + 21 (post-22.A) |
| 24 | C2.29 Transparency Index público | comprador | 6,213 | M | 4 | 8 | 1 | 4 | 4 | 1 | 0.5 | **22** | 21 Portal Público |
| 25 | C3.21 Comparador objetivo | comprador | 6,000 | M | 4 | 8 | 1 | 4 | 4 | 1 | 0.5 | **22** | 21.B + L-NEW74 |
| 26 | C1.10 Buyer twin preloaded gemelo | ase+comp | 5,893 | L | 8 | 16 | 2 | 8 | 8 | 2 | 1 | **45** | 13.B (post-07.7+11.W) |
| 27 | C4.3.1 Widget Embebible Devs | desarrollador | 5,500 | S | 2 | 4 | 0.5 | 2 | 2 | 0.5 | 0.3 | **11** | 15.E + 23 tier |
| 28 | C5.5.5 Developer ratings preventa | desa+comp | 5,250 | M | 4 | 8 | 1 | 4 | 4 | 1 | 0.5 | **22** | 23.D + 26 |
| 29 | C5.5.3 Streaks asesor diarios | asesor | 1,167 | S | 2 | 4 | 0.5 | 2 | 2 | 0.5 | 0.3 | **11** | 14.D (post-07.7) |
| 30 | C5.4.1 Portfolio dashboard inv | inversionista | 292 | L | 8 | 16 | 2 | 8 | 8 | 2 | 1 | **45** | 23.A (post-11.X) |

**Subtotales top-30:** M1=152h · M2=304h · M3a=38h · M3b=152h · M4=152h · i18n=38h · WCAG=19h · **Total = 965h** · Promedio 32.2h/feature.

**Distribución scale:** XL 0 · L 9 (405h) · M 17 (374h) · S 4 (44h).

### 3.3 — Wall-clock top-30

- 1 dev fulltime (6h efectivos/día) → 161 días ≈ 8 meses
- 3 devs paralelo → 54 días ≈ 2.7 meses

---

## Sección 4 — Effort total por fase (Gantt simplificado)

Fuente: SA-Timeline sección 2.

### 4.1 — Roll-up por fase (todas 149 features)

| Fase | Features | Effort h | Wall-clock 1 dev (días) | Wall-clock 3 devs (días) |
|---|---|---|---|---|
| 07.6 (current) | 0 (meta) | 60 | 10 | 4 |
| **07.7 NUEVA** | 1 meta | 80 | 14 | 5 |
| 08-10 (shipped extends) | 13 | 260 | 45 | 16 |
| 11 (T+V+W+X+Y+Z + 5 mini-fases) | 22 | 600 (incl 11.W 64 + 11.X 132) | 100 | 33 |
| 12 N5 Atlas | 5 | 132 | 22 | 8 |
| 13 Asesor M1-M5 | 13 | 320 | 54 | 18 |
| 14 Asesor M6-M10 | 17 | 400 | 67 | 22 |
| 15 Desarrollador | 16 | 280 | 47 | 16 |
| 16 Contabilidad | 1 | 132 | 22 | 8 |
| 17 DocIntel | 2 | 200 | 34 | 12 |
| 18 Legal/Escrow | 2 | 140 | 24 | 8 |
| 19 Admin | 0 | 80 | 14 | 5 |
| 20 Comprador | 11 | 360 | 60 | 20 |
| 21 Portal Público | 7 | 180 | 30 | 10 |
| **21.A NUEVA** | 1 meta | 80 | 14 | 5 |
| 22 Marketing | 20 | 360 | 60 | 20 |
| **22.A NUEVA** | 1 meta | 60 | 10 | 4 |
| 23 Inversor/Monetización | 12 | 320 | 54 | 18 |
| 24 Observability | 1 | 80 | 14 | 5 |
| 25 Performance | 0 | 60 | 10 | 4 |
| 26 Compliance | 1 | 120 | 20 | 7 |
| 26b Listing Intel Platform | 4 | 120 | 20 | 7 |
| 27 Testing | 0 | 80 | 14 | 5 |
| 28 Launch Soft | 0 | 60 | 10 | 4 |
| 29 H2/H3 Scaffold | 0 | 100 | 17 | 6 |
| **H1 SUBTOTAL** | **127** | **8,716** | **1,453 (6.05 años)** | **484 (2.02 años ideal)** |
| 30 Platform API | 6 | 360 | 60 | 20 |
| 31 Agentic | 12 | 540 | 90 | 30 |
| 32 Digital Twin | 1 | 360 | 60 | 20 |
| 33 Data Ecosystem | 0 | 540 | 90 | 30 |
| 34 Creator | 1 | 540 | 90 | 30 |
| 34b Backlog H2 | varios | 450 | 75 | 25 |
| **H2 SUBTOTAL** | **20** | **2,790** | **465 (1.94 años)** | **155 (0.65 años)** |
| 35 DMX Terminal | 0 (surfaces) | 540 | 90 | 30 |
| 36 Fractional | 0 | 540 | 90 | 30 |
| 37 Embedded Banking | 0 | 540 | 90 | 30 |
| 38 International + Multigen | 2 | 720 | 120 | 40 |
| 38b Backlog H3 | varios | 310 | 52 | 17 |
| **H3 SUBTOTAL** | **2** | **2,650** | **442 (1.84 años)** | **147 (0.61 años)** |
| **TOTAL H1+H2+H3** | **149** | **14,156** | **9.83 años (1 dev)** | **3.27 años (3 devs ideal)** |

### 4.2 — Math base capacity

- 1 dev fulltime = 6h efectivos × 240 días/año = **1,440h/año**
- 3 devs paralelo ideal = **4,320h/año** (asumiendo 0% tax)
- 3 devs realistic 8% coordination tax = **3,974h/año**
- Manu PM no cuenta en dev capacity (audits + gates + ADRs)

### 4.3 — Comparación dev-headcount escalation

| Headcount | H1 wall-clock | H2 | H3 | Total | $/año estimado |
|---|---|---|---|---|---|
| 1 dev | 6.05 años | 1.94 | 1.84 | **9.83 años** | $80k = $786k total |
| 2 devs | 3.10 | 1.00 | 0.95 | **5.05 años** | $160k = $808k total |
| **3 devs (recomendado H1)** | **2.02** | **0.65** | **0.61** | **3.27 años** | $240k = $785k total |
| 4 devs | 1.55 | 0.50 | 0.47 | **2.51 años** | $320k = $804k total |
| **5 devs (recomendado H2/H3)** | **1.27** | **0.42** | **0.40** | **2.09 años** | $400k = $836k total |
| 8 devs | 0.85 | 0.27 | 0.26 | 1.38 años | $640k = $886k total |

**Sweet spot:** 3 devs H1 → 5 devs H2/H3. Total ~$800k USD para 3.25 años calendar.

---

## Sección 5 — Critical path schedule trimestral (2026-Q2 → 2030-Q1)

Asumiendo **3 devs paralelo + Manu PM** baseline. Capacity 1,080h/trimestre × 0.85 buffer = **~918h efectivo/trimestre**.

| Trimestre | Fases activas | Features | Effort h | Notas |
|---|---|---|---|---|
| **2026-Q2** Apr-Jun | 07.6 cierre + 07.7 BLK_DEALS + 11.W BLK_DISC + 11.T M3a refresh + 11.U/V/W + 11.Z IE start + 11.X.2 AVM start | 27 + 3 meta | ~931 | tight pero achievable; AVM puede deslizarse Q3 |
| **2026-Q3** Jul-Sep | 12 N5 Atlas + 13 Asesor M1-M5 + C5.5.3 streaks + C1.10 buyer twin (post-DISC) + 14 start | 26+ | ~896 | clean pacing post-DEALS |
| **2026-Q4** Oct-Dec | 14 cierre + 15 Desarrollador + C4.3.1 widget extend + 17 DocIntel start + 11.X Living Networks | 22 | ~827 | spare 90h holiday slowdown |
| **2027-Q1** Jan-Mar | 16 Contabilidad + 17 DocIntel cierre + 18 Legal/Pagos + 19 Admin + 11.Y/Z + BLK_PROPS start | 20+ | ~846 | conservative cierre 11/16/17/18 pre-FASE 20 |
| **2027-Q2** Apr-Jun | 20 Comprador (T-capa hot: T.2.1+T.1.1+T.1.2+T.1.5+T.1.4+T.2.5+C2.9) + BLK_BANK resolve + 21 start + 21.A WA setup | 12 + 2 meta | ~888 | dense T-capa ROI altísimo |
| **2027-Q3** Jul-Sep | 21 cierre + 22 Marketing/WA (post-21.A) + C3.F1+F17+F19+F11+T.2.4 + BLK_PROPS cierre | 23 + 1 meta | ~900 | tight WA + properties |
| **2027-Q4** Oct-Dec | 23 Monetización Inversor + 24 Observability + 25 Performance + 26 Compliance + 26b Listing Intel | 24+ | ~916 | dense pre-launch |
| **2028-Q1** Jan-Mar | 27 Testing + 28 Launch Soft + 29 H2/H3 Scaffold + L-NEW backlog catch-up | 0 features new | ~720 | intentional slowdown launch buffer |
| **2028-Q2** Apr-Jun | H1 cleanup tag fase-29-complete + 30 Platform API start + 31 Agentic start | 10+ | ~900 | H1 done → H2 launch |
| **2028-Q3** Jul-Sep | 31 Agentic cierre + 32 Digital Twin | 7+ | ~900 | H2 progress |
| **2028-Q4** Oct-Dec | 33 Data Ecosystem + 34 Creator start | 6+ | ~900 | H2 cierre |
| **2029-Q1** Jan-Mar | 34 Creator cierre + 34b Backlog H2 + 35 DMX Terminal start | 12 | ~1,060 | slight overage Q2 |
| **2029-Q2** Apr-Jun | 35 cierre + 36 Fractional start | 3+ | ~900 | H3 launch |
| **2029-Q3** Jul-Sep | 36 cierre + 37 Embedded Banking | 4+ | ~900 | |
| **2029-Q4** Oct-Dec | 38 International (CO/AR/BR seed) + 38b Backlog H3 | 10 | ~900 | H3 first pass |
| **2030-Q1+** Jan-Mar | 38 cierre + steady-state | — | — | mantenimiento + L-NEW emergent |

### 5.1 — Calendar projection escenarios

- **Escenario A (3 devs H1+H2+H3):** 2026-Q2 → 2029-Q4 = **3.5 años calendar** (incluye transitions)
- **Escenario B (1 dev solo):** 2026-Q2 → 2036-Q2 = **10 años calendar** — no viable
- **Escenario C (3 devs H1, escalar 5 devs H2/H3):** 2026-Q2 → 2029-Q3 = **3.25 años calendar** — fastest viable

### 5.2 — Compresion opportunities (acelerar wall-clock)

1. Outsource M3a + M3b a contractor frontend specialist Q2-Q4 2026: −42h core team
2. AI codegen para boilerplate M1+M2: −15% effort H1 (~1,300h)
3. Reusable templates feature scaffolding: −10% H1 (~870h)
4. Skip H2 FASE 33 Data Ecosystem hasta 2029-Q1+: −540h H2
5. Defer FASE 34 Creator a H3: −540h H2

**Compound 5 compressions:** H1 8,716 → 6,946h (~20% reduction). Wall-clock 3 devs realistic: **1.75 años** (vs 2.19 baseline).

---

## Sección 6 — Foundational gates founder a cerrar

13 decisiones bloqueantes ordenadas por timing. Agrupables en 2 sesiones founder review síncronas (~4h founder time total).

### 6.1 — Bloque A (pre-FASE 07.7 + 11.W) — sesión sync ~2h

| # | Gate | ADR | Mini-fase blocked | Decisión | Recomendación PM |
|---|---|---|---|---|---|
| 1 | Persona-types CRM | ADR-033 | 07.7.A | `persona_type` enum buyer_twins canonical | `buyer_self · asesor_lead · investor · masterbroker` |
| 2 | Referral engine | ADR-034 | 07.7.B | polymorphic vs split engines | polymorphic (consolidación cross-capa #5) |
| 3 | Retention CFDI-aware | ADR-035 | 07.7.C | 5y MX vs 7 vs 10 | 5y MX, 10y CO, 7y AR/BR |
| 4 | DISC framework | ADR-036 | 11.W.A | DISC vs Big-Five vs MBTI | DISC 4-axis (psicómetro consult validar H1) |
| 5 | Whisper provider | ADR-037 | 11.W.C | OpenAI vs self-hosted vs Deepgram | OpenAI H1, pivot post-1000 samples |
| 6 | Privacy voice biométrico | ADR-038 | 11.W.C | LFPDPPP/GDPR/LGPD opt-in flow | Opt-in explícito + retention 90d audio |

### 6.2 — Bloque B (pre-FASE 11.X + 21.A + 22.A) — sesión sync ~2h

| # | Gate | ADR | Mini-fase blocked | Decisión | Recomendación PM |
|---|---|---|---|---|---|
| 7 | **DMX inventory model** (BLOQUEANTE más crítico) | ADR-039 | 11.X.A | portal-own vs MLS aggregator vs hybrid | hybrid (own + EBI/Easy Broker MX) |
| 8 | Asset_class scope H1 | ADR-040 | 11.X.A | residential-only vs full | residential + comercial + terreno |
| 9 | STR collision | ADR-041 | 11.X.A | merge en `properties` vs split | split H1 (str_listings AirROI distinto), unify H2 |
| 10 | WhatsApp provider (BLOQUEANTE) | ADR-042 | 21.A.A | Twilio vs Meta WA Cloud | Twilio H1 (multi-channel revertible) |
| 11 | WABA verification path | ADR-043 | 21.A.B | Twilio Embedded vs Meta direct | Twilio Embedded (1-3 días) |
| 12 | Templates initial scope | ADR-044 | 21.A.B | 12 vs 25 templates H1 | 12 (utility 8 + marketing 4) |
| 13 | Banking integration path (BLOQUEANTE) | ADR-045 | 22.A.A | static-rates-only vs partner-broker vs INFONAVIT-API | static-rates H1 + partner track parallel |

### 6.3 — Adicionales gates legales (post-mini-fases)

- ADR-046 Legal status DMX (simulador-only vs broker-regulado CONDUSEF) — pre-FASE 22.A.B shipping prod
- ADR-047 Lenders coverage initial — pre-FASE 22.A.A seed (top-5 + INFONAVIT + FOVISSSTE)

---

## Sección 7 — Cross-fase dependencies (DAG enforcement)

```
FASE 08-10 IE N0-N3 (✅ shipped)
       │
       ▼
FASE 11.T-Z (en curso · 19/27 shipped 70%)
       │   ┌──── FASE 07.7 (BLK_DEALS) ──┐
       │   │                              │
       │   └────────► FASE 11.W (BLK_DISC) ─┐
       │                                     │
       └─► FASE 12 N5 + Atlas ──► FASE 13 Asesor M1-M5 ──┐
                                                          │
                                FASE 14 Asesor M6-M10 ◄───┘
                                       │
                              FASE 11.X (BLK_PROPS) ◄── Gate-7 founder
                                       │
                                FASE 15 Desarrollador
                                       │
                            FASE 16 Contabilidad
                                       │
                                FASE 17 DocIntel
                                       │
                            FASE 18 Legal/Pagos/Escrow
                                       │
                                FASE 19 Admin (paralelo)
                                       │
                            FASE 20 Comprador (T-capa)
                                       │
                                       ├── FASE 22.A (BLK_BANK) ◄── Gate-6
                                       │
                                FASE 21 Portal Público
                                       │
                                FASE 21.A (BLK_WA) ◄── Gate-2
                                       │
                                FASE 22 Marketing/Comms
                                       │
                            FASE 23 Inversionista
                                       │
                            FASE 24 Observability
                                       │
                            FASE 25-29 (cierre H1)
                                       │
                            ──────────────────
                                       │
                              H2 (30-34) launch
                                       │
                              H3 (35-38) moonshot
```

### 7.1 — Cross-fase features con dep no obvia

| Feature | Fase target | Dep cross-fase | Razón |
|---|---|---|---|
| C2.F1 AVM spread | 11.X.2 | 07.7 (data CRM cierres) | Spread requiere historial deals |
| C2.F2 Price truth meter | 11.X.2 | 11.X.A (properties schema) | Listings necesarias para sample comparable |
| T.1.2 Financial clarity | 20.C | 22.A (Banking APIs) | Mortgage rates + simulator engine |
| T.1.5 GPS enganche | 22.F | 21.A (WA milestones) + 22.A (savings rules) | Notifs WA + mortgage product link |
| C3.F19 Financing simulator | 20.H + 21 | 22.A (rates schedules + INFONAVIT rules) | Simulator depende rates + buyer eligibility |
| C5.4.1 Portfolio inversor | 23.A | 11.X (properties + listings) | Portfolio agg requiere properties owned |
| T.2.6 Post-compra alertas | 22 | 11.X (properties tracked) + 21.A (WA delivery) | Alertas plusvalía/rent WA channel |
| C1.10 Buyer twin preloaded | 13.B | 07.7 (buyer_twins table) + 11.W (disc_profile col) | Twin pre-poblado requiere DISC + DEALS schema |
| C1.18 DISC perfil | 11.W | 07.7 (buyer_twins) | `disc_profile` jsonb col attach |

---

## Sección 8 — L-NEW propuestos por 07.6.E

> Detectados durante mapping. NO editar pipeline aquí — consolidación 07.6.F.

### 8.1 — L-NEW emergentes durante asignación

| ID propuesto | Descripción | Detectado por | Fase target | Justificación |
|---|---|---|---|---|
| L-NEW-ROADMAP-1 | Properties Inventory ADR | SA-Roadmap | pre-11.X | Gate founder Gate-7 BLOQUEANTE |
| L-NEW-ROADMAP-2 | Persona-types CRM gate | SA-Roadmap | pre-07.7 | ADR enum lead/contact/buyer/family cardinalities |
| L-NEW-ROADMAP-3 | Banking partnership negotiation track | SA-Roadmap | pre-22.A | Track work paralelo Gate-6 founder |
| L-NEW-ROADMAP-4 | DISC framework choice ADR | SA-Roadmap | pre-11.W | Gate-4 DISC vs Big-Five vs MBTI |
| L-NEW-ROADMAP-5 | WhatsApp provider abstract layer | SA-Roadmap | pre-21.A | Twilio vs Meta gate revertible adapter |
| L-NEW-ROADMAP-6 | Mini-fase 11.W vs 11.W2 nomenclature reconciliation | Master | 07.6.F | SA-Foundational usa "11.W2/11.X2" sufijo, SA-Roadmap usa "11.W/11.X" — alinear con CONTRATO_EJECUCION.md |
| L-NEW-ROADMAP-7 | Effort delta SA-Roadmap (~8,800h) vs SA-Timeline (14,156h) reconciliation | Master | 07.6.F | SA-Roadmap roll-up parcial, SA-Timeline full incluye meta + cross-cutting + design |
| L-NEW-ROADMAP-8 | i18n vendor decision para 5 locales (es-CO/AR/pt-BR/en-US) | SA-Timeline | pre-FASE 08 | Sin vendor nativo, locale rollout slip Q4 2026 |

### 8.2 — Sorpresas heredadas del crosswalk (anomalías no resueltas)

1. `zone_streaks` 0 rows pese calculator shipped — fix incremental FASE 14.D al implementar streaks asesor.
2. `avm_estimates` 0 rows — FASE 11.X.D weekly recompute resolverá post properties seed.
3. 22 calculators `category: 'comprador'` infrautilizados — UI buyer FASE 20 desbloquea base. NO acción adicional.
4. Mock `preview-ux` badges hardcoded vs prototype nomenclatura — reconciliación FASE 14.D al implementar C5.5.2 badges canonical.
5. STR shipped no investor-surfaced — C5.4.3 wire-only en FASE 23.A surface-only.

### 8.3 — Features ambiguas resueltas

| Feature | Conflicto | Resolución |
|---|---|---|
| C3.22 Decision engine ML maduro | overlap T.1.1 | T.1.1 = engine público shallow (20.B); C3.22 = ML maduro narrative (20.B mismo bloque, bucket 🔴) |
| C2.30 Certificación asesor | C2 vs C1.5 canonical | FASE 14.C junto C1.27 report card |
| T.2.4 + C3.11 Referral | unified engine | ambos FASE 22.B mismo sub-bloque, schema único `referrals` polymorphic |
| C1.30 Community asesores | FASE 22 vs 34 | FASE 34 (post-cohort 2y+ runtime) |
| C2.27 + C4.2.3 Verified photos | engine vs surface | C2.27 → FASE 11.Y (engine) · C4.2.3 → FASE 15.B (surface developer) |
| C1.16 + C1.17 + C1.20 | family/emotion/lifecycle 13-14 vs H2 | family → 20.F (multigen partial); emotion → 26 (sentiment); lifecycle → 20.E (retention) |

---

## Sección 9 — Recommendations 07.6.F

### 9.1 — Acciones obligatorias 07.6.F (sub-sesión 6/6 cierre FASE 07.6)

1. **Formalizar 13 founder gates** en nuevo doc `docs/08_PRODUCT_AUDIT/05_FOUNDER_DECISION_GATES.md` con ADR template + recommendation PM + decision pending.
2. **Pipeline backlog refresh** consolidando ~74 candidatos pendientes (69 de 07.6.B + 5 de 07.6.C + 8 nuevos de 07.6.E sección 8.1).
3. **Update `CONTRATO_EJECUCION.md`** insertando FASE 07.7 + 11.W + 11.X + 21.A + 22.A en orden canonical con triggers + ADR refs.
4. **Update `02.0_INDICE_MAESTRO.md`** con orden fases refreshed (5 mini-fases nuevas + dep updates).
5. **Crear/actualizar `FASE_07.7_*.md`, `FASE_11.W_*.md`, `FASE_11.X_*.md`, `FASE_21.A_*.md`, `FASE_22.A_*.md`** plan maestro stubs con scope breakdown 07.6.E sección 1.
6. **Tag final `fase-07.6-complete`** consolidando A+B+C+D+E+F sub-sesiones.

### 9.2 — Acciones recomendadas post-07.6 (FASE 08 onwards)

- Resolver Gate-7 (DMX inventory model) PRE-Q1 2027 para no slipear FASE 11.X
- Iniciar Banking partnership negotiation track (paralelo a static-rates H1) Q2 2026
- Validar DISC framework con psicólogo organizational consult Q2 2026 (ADR-036)
- WABA Twilio Embedded Signup arrancar Q2 2027 (1-3 días approval Meta)
- i18n vendor scouting Q3 2026 (5 locales nativos es-CO/AR/pt-BR/en-US)

### 9.3 — Riesgos high-impact a monitorear

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| BLK_DEALS migration v35 conflict auth_sessions_log RLS | Media | +1 Q | ADR pre-migration + dry-run staging |
| Properties schema gate founder demora | Alta | +2 Q | Resolver Gate-7 antes Q1 2027 |
| WA Twilio vs Meta indecision | Media | +1 Q | ADR-042 pre-Q1 2027 |
| Banking partner INFONAVIT slow | Alta | +1 Q | Stubs static fallback aprobado |
| 1 dev de 3 leaves mid-H1 | Baja-Media | +2 Q | Replace + onboard 1.5 mes |
| Founder pivota visión H2→H3 | Baja | ±2 Q | Plan flexible H2/H3 backlog |
| Q1 2028 launch incident grave | Media | +1 Q | Buffer launch dedicated 200h |
| L-NEW emergente >40h | Alta | +0.5 Q absorbed | Buffer Q4 cada año |

---

## Referencias

- **Inputs canónicos:** `docs/08_PRODUCT_AUDIT/00_INVENTARIO_ACTUAL.md` · `01_CROSSWALK_MATRIX.md` · `02_DESIGN_MIGRATION.md` · `03_RICE_PRIORITIES.md`
- **ADRs activos:** ADR-031 Design System Refresh · ADR-032 FASE 07.6 Insertion
- **Plan maestro:** `docs/02_PLAN_MAESTRO/02.0_INDICE_MAESTRO.md` (FASE 00 → FASE 38, 41 fases)
- **Contrato ejecución:** `docs/05_OPERACIONAL/CONTRATO_EJECUCION.md`
- **L-NEW backlog:** `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md` (51 entries pre-07.6 + ~74 candidatos pendientes 07.6.F + 8 propuestos esta sesión)
- **Drafts intermedios SA:** `tmp/07.6.E-drafts/SA-Foundational.md` (535 líneas) · `SA-Roadmap.md` (1121 líneas) · `SA-Timeline.md` (594 líneas) · gitignored
- **Memoria canonizada relevante:** `feedback_arquitectura_escalable_desacoplada.md` (opción más escalable/desacoplada — schemas normalizados sobre jsonb inline aplicado en 07.7.A leads/buyer_twins/deals split, 11.X.A properties/property_units split, 21.A.A messaging_providers abstracción multi-provider)

---

> Próximo paso: **07.6.F Founder Gates + Canonization final + tag `fase-07.6-complete`** (cierre fase). Consume este doc + 03 RICE + 02 Design Migration + 01 Crosswalk + 00 Inventario para formalizar 13 gates founder + pipeline backlog refresh + plan maestro stubs 5 mini-fases + tag final.
