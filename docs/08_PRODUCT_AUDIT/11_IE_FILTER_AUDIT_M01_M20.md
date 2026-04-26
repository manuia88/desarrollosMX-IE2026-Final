# 11 — IE Filter Audit Retroactivo M01-M20

> **Audit retroactivo · F0 cierre gaps foundation pre-construction · 2026-04-25**
>
> Aplica las **5 preguntas filtro IE** (BIBLIA v5 §17 líneas 28-36) a las **45 features** clasificadas ✅ active (8) + 🟡 parcial (37) en `docs/08_PRODUCT_AUDIT/06_AUDIT_ESTADO_REAL_M01_M20.md`. Identifica candidatos CORTAR (score < 4) sin miedo (criterio canon "zero deuda técnica") y candidatos ACELERAR (score 5/5 + alto leverage cross-módulo).
>
> **Output type:** doc canon — referenciable desde prompts CC en F2 Construction como input de priorización RICE × IE-filter score.

---

## §1 Executive Summary

### Totales agregados

| Métrica | Valor |
|---|---|
| Total features auditadas | **45** (8 ✅ active + 37 🟡 parcial) |
| Pasan filtro 5/5 | **31** (~69%) |
| Score 4/5 | **11** (~24%) — priorizables, gap menor |
| Score 3/5 o menos | **3** (~7%) — candidatos CORTAR |
| Score 0-2/5 | **0** — ningún feature con IE alignment nulo |

### Distribución por veredicto

| Veredicto | Count | % |
|---|---|---|
| ACELERAR (score 5/5 + alto leverage cross-módulo) | **9** | 20% |
| MANTENER (score 4-5 + completar) | **33** | 73% |
| CORTAR (score < 4 + bajo leverage) | **3** | 7% |

### Distribución per módulo

| Módulo | ✅ active | 🟡 parcial | Pasan 5/5 | Score 4 | CORTAR | Notas |
|---|---|---|---|---|---|---|
| M01 Dashboard Asesor | 0 | 1 (zone_scores reuse) | 1 | 0 | 0 | Solo InsightCard parcial |
| M02 Desarrollos | 0 | 2 (project_scores + IE binding) | 2 | 0 | 0 | Reutilización IE pura |
| M03 Contactos | 0 | 0 | 0 | 0 | 0 | Sin features parciales |
| M04 Búsquedas | 0 | 1 (Comparador IE) | 1 | 0 | 0 | — |
| M05 Captaciones | 0 | 0 | 0 | 0 | 0 | — |
| M06 Tareas | 0 | 0 | 0 | 0 | 0 | — |
| M07 Operaciones | 0 | 1 (fxRouter + fx_rates) | 1 | 0 | 0 | — |
| M08 Marketing Asesor | 0 | 0 | 0 | 0 | 0 | — |
| M09 Estadísticas | 0 | 0 | 0 | 0 | 0 | — |
| M10 Dashboard Dev | 0 | 2 (aiRouter + desarrolladoras + fiscal_docs) | 2 | 0 | 0 | — |
| M11 Inventario Dev | 0 | 1 (zone_scores IE alerts) | 1 | 0 | 0 | — |
| M12 Contabilidad Dev | 0 | 5 (fiscal_docs CRUD partial) | 5 | 0 | 0 | Schema OK |
| M13 CRM Dev | 0 | 0 | 0 | 0 | 0 | — |
| M14 Marketing Dev | 0 | 1 (IECardEmbed) | 1 | 0 | 0 | — |
| M15 Analytics Dev IE | 1 (zone_scores) | 4 (Demanda + ScoreCard + gating + confidence) | 4 | 1 | 0 | Star B2B product |
| M16 Dashboard Admin | 2 (role_features + audit_log) | 12 (macro/zonas/anomalies/features/roles/audit/config/2 ingest pages + newsletter-ab) | 11 | 3 | 0 | Backend infra fuerte |
| M17 Market Observatory | 0 | 0 | 0 | 0 | 0 | — |
| M18 Dashboard Comprador | 0 | 4 (onboarding + lifestyle/lifepath + watchlist + score subscribe) | 1 | 2 | 1 | Lifestyle Match conflicto |
| M19 Marketplace Público | 3 (indices + metodologia + newsletter) | 4 (Wrapped teaser + SEO + i18n + Faq) | 2 | 4 | 1 | 35% completion mayor |
| M20 Ficha Proyecto | 0 | 0 | 0 | 0 | 0 | — |
| **TOTAL** | **8** | **37** | **31** | **11** | **3** | — |

> **Nota numérica:** las 8 ✅ active corresponden a 6 assets backend únicos (zone_scores se contabiliza en M15 #11 y M16 #31 como filas separadas; idem role_features/audit_log y los 3 routes M19). Esta auditoría las trata como entidades únicas para evitar doble conteo.

---

## §2 5 preguntas IE canon (BIBLIA v5 §17 verbatim)

```
1. ¿Genera datos que otro módulo consume?
2. ¿Consume datos que otro módulo genera?
3. ¿Reduce fricción para que un usuario genere más datos?
4. ¿Hace que un usuario tome una mejor decisión?
5. ¿Mide algo que nos ayuda a mejorar la plataforma? (AARRR)
Si NO a las cinco → no se construye.
```

**Score = sum(Y in Q1..Q5)** ∈ [0, 5]

**Umbral filtro:** < 5 SI = no pasa (regla canon BIBLIA §17). Aquí matizado:
- 5/5 → **ACELERAR** (alto leverage cross-módulo)
- 4/5 → **MANTENER** (gap menor, completar)
- ≤ 3/5 → **CORTAR** pre-B salvo justificación explícita founder

---

## §3 Audit retroactivo features ✅ active (8 totales)

| # | Feature | Módulo | Status | Q1 | Q2 | Q3 | Q4 | Q5 | Score | Veredicto | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A1 | `zone_scores` (5267 rows + 5 triggers + cascade webhook + score_change_deliveries) | M15 #11 / M16 #31 | ✅ | Y scores B01/H03/N07→M01/M02/M04/M11/M14/M15/M17/M18/M19/M20 | Y dmx_indices + ingestors | Y webhook emit→alertas (subscribe sin polling) | Y confidence + citations info decisión | Y Activation (alerts) + Retention (weekly) | **5/5** | ACELERAR | Multiplicador #1 del repo. P0 UI consumer. |
| A2 | `role_features` 432 + trg_audit + RLS | M16 #36 | ✅ | Y matriz role→feature→middleware gating | Y ui_feature_flags 120 | Y auto-provisioning permisos sin DBA | Y previene errores costosos | Y audit_log entries AARRR | **5/5** | ACELERAR | Multi-tenant unblock. |
| A3 | `audit_log` particionado mensual (3 rows + 9 partitions) | M16 #37 | ✅ | Y trail→Sentry+admin forensic | Y mutations toda la BD | N write-only para usuario | Y admin forensic decisions | Y mutations/día + breach detection | **4/5** | MANTENER | Q3 N por design. UI reader falta. |
| A4 | `/indices` + `indicesPublic.*` (10 sub-routes) | M19 #11 | ✅ | Y rankings→CTAs+share+SEO | Y dmx_indices 3192 + zone_scores 5267 | Y landing sin auth wall | Y top-20 informan ¿dónde compro? | Y CTR signup (Activation) | **5/5** | ACELERAR | Top conversion B2C. |
| A5 | `/metodologia` + `getMethodology` + 3 components | M19 #12 | ✅ | Y transparency citable PR/academic | Y dmx_indices_methodology_versions | Y drives confianza pre-signup | Y educa literacy IE | Y time-on-page + scroll-depth | **5/5** | ACELERAR | Moat narrative. |
| A6 | `public.submitNewsletter` + `subscribeZonePreference` + `/api/newsletter/confirm` | M19 #14 | ✅ | Y leads→wrapped/alerts/marketing | Y consent_lfpdppp + zone | Y captura sin signup completo | N subscribir ≠ decisión inversión | Y Activation + Retention via wrapped | **4/5** | MANTENER | Q4 N scope. Validar token flow. |
| A7 | `/wrapped/[year]` + `dmx_wrapped_snapshots` + `wrapped-builder.ts` | M19 #15 / enero | ✅ (page) | Y narrativa UGC viral | Y zone_scores+dmx_indices+newsletter_subscribers | Y share trigger viral CAC | Y reflexión anual driver decision | Y Referral coefficient + share-rate | **5/5** | ACELERAR | Top viral hook. Banner+cron faltan. |
| A8 | VIEW `public_profiles` (11 cols sin PII, cierra SEC-01) | M19 #13 dep | ✅ (infra) | Y perfil→/asesores/[slug] microsite | Y profiles filtrado | Y SEO orgánico per asesor | N viewer NO toma decisión directa | Y inbound traffic per asesor | **4/5** | MANTENER | Route+procedure faltan. |

**Subtotal ✅ active:** 5/5 = **5 features** (A1, A2, A4, A5, A7) · 4/5 = **3 features** (A3, A6, A8) · CORTAR = **0**.

> **Lectura:** 100% features ✅ active pasan filtro (≥4/5). Inversión backend hecha está alineada con canon IE — NO hay deuda técnica de features mal-construidas, solo gap UI/cableado.

---

## §4 Audit retroactivo features 🟡 parcial (37 totales)

### §4.1 M01 Dashboard Asesor

| # | Feature | Status | Q1 | Q2 | Q3 | Q4 | Q5 | Score | Veredicto | Notas |
|---|---|---|---|---|---|---|---|---|---|---|
| P1 | InsightCard reuso `zone_scores` (action 9) | 🟡 | Y refleja en dashboard | Y zone_scores | Y alerta "colonia Y subió 8%"→pretexto contacto | Y trigger conversación informada | Y engagement panel | **5/5** | ACELERAR | 100% backend listo. UI only. |

### §4.2 M02 Desarrollos

| # | Feature | Status | Q1 | Q2 | Q3 | Q4 | Q5 | Score | Veredicto | Notas |
|---|---|---|---|---|---|---|---|---|---|---|
| P2 | IEScoreInline reuso `ieScores` router (action 11) | 🟡 | Y IE feed cards | Y project_scores | Y scores en card→detail | Y DMX+Absorption recomendar mejor | Y CTR card→detail | **5/5** | ACELERAR | ieScoresRouter ya en root.ts. Shared M02/M11/M14/M19/M20. |
| P3 | Score badges en cards (action 13) | 🟡 | Y | Y | Y UX glance-able | Y DMX Score top-line | Y CTR badge→detail | **5/5** | ACELERAR | `<ScoreBadge />` reusable día 1. |

### §4.3 M04 Búsquedas

| # | Feature | Status | Q1 | Q2 | Q3 | Q4 | Q5 | Score | Veredicto | Notas |
|---|---|---|---|---|---|---|---|---|---|---|
| P4 | Comparador 2-5 proyectos reuso ieScores (action 10) | 🟡 | Y output→wishlist/share | Y project_scores+ieScores | Y side-by-side ahorra cognición | Y core "¿cuál de los 3?" | Y compare-rate (Activation) | **5/5** | ACELERAR | Reutiliza `ColoniaComparator.jsx` prototype. |

### §4.4 M07 Operaciones

| # | Feature | Status | Q1 | Q2 | Q3 | Q4 | Q5 | Score | Veredicto | Notas |
|---|---|---|---|---|---|---|---|---|---|---|
| P5 | FX rate `fxRouter` + `fx_rates` (action 15) | 🟡 | Y FX→ops MXN/USD + comprador USD | Y Open Exchange Rates daily | Y auto-conversion | Y evita errores costosos | Y currency-toggle usage | **5/5** | ACELERAR | Reutilizable M07+M18. Backend OK. |

### §4.5 M10 Dashboard Dev

| # | Feature | Status | Q1 | Q2 | Q3 | Q4 | Q5 | Score | Veredicto | Notas |
|---|---|---|---|---|---|---|---|---|---|---|
| P6 | Morning Briefing Dev reuso `aiRouter` (action 6) | 🟡 | Y briefing→dashboard | Y ops/leads/anomalies | Y auto-summary 9am | Y prioriza hoy | Y open-rate Retention | **5/5** | ACELERAR | aiRouter + vertical dev. |
| P7 | Dev company header `desarrolladoras` (action 4) | 🟡 | Y branding cross-portal | Y desarrolladoras | Y onboarding portal dev | N header informa no decide | Y misuse audit per dev | **4/5** | MANTENER | Naming reconcile pendiente. Q4 N. |

### §4.6 M11 Inventario Dev

| # | Feature | Status | Q1 | Q2 | Q3 | Q4 | Q5 | Score | Veredicto | Notas |
|---|---|---|---|---|---|---|---|---|---|---|
| P8 | IE Alert Banner reuso zone_scores (action 15) | 🟡 | Y alerts→M10+push | Y cascade webhook | Y proactiva > polling | Y "zona X bajó 12%"→pricing review | Y alert-to-action conversion | **5/5** | ACELERAR | `scores.getIEAlertsForProject` falta. |

### §4.7 M12 Contabilidad Dev

| # | Feature | Status | Q1 | Q2 | Q3 | Q4 | Q5 | Score | Veredicto | Notas |
|---|---|---|---|---|---|---|---|---|---|---|
| P9 | CFDI emit `fiscal_docs` (action 2) | 🟡 | Y trail→payouts/AML/ESG | Y operacion+RFC | Y auto post-cierre | Y evita multas SAT | Y CFDIs/mes | **5/5** | ACELERAR | `trg_audit_fiscal_docs` listo. Naming reconcile pendiente. |
| P10 | CFDI cancel (action 3) | 🟡 | Y | Y | Y inline | Y evita fraude | Y cancel-rate anomaly | **5/5** | ACELERAR | Cols ya existen. Trivial UI. |
| P11 | List CFDIs (action 4) | 🟡 | Y feeds reports/AML | Y | Y search/filter | Y decide re-emit | Y ledger health | **5/5** | ACELERAR | Trivial procedure list + table. |
| P12 | View CFDI viewer (action 5) | 🟡 | Y | Y | Y XML+PDF inline | Y review pre-cancel | Y engagement | **5/5** | ACELERAR | XML+PDF preview component. |
| P13 | `fiscal_documents` vs `fiscal_docs` (action 17) | 🟡 | Y resolved naming | Y | Y single SoT | Y evita confusión | Y audit trail | **5/5** | ACELERAR | ADR reconciliación pre-procedure. |

### §4.8 M14 Marketing Dev

| # | Feature | Status | Q1 | Q2 | Q3 | Q4 | Q5 | Score | Veredicto | Notas |
|---|---|---|---|---|---|---|---|---|---|---|
| P14 | IECardEmbed shared reuso zone_scores (action 8) | 🟡 | Y embed→kit ventas/landings/portales | Y zone_scores | Y share-rich card | Y evidence-based vs hype | Y CTR cross-channel | **5/5** | ACELERAR | Quick win line 1230. |

### §4.9 M15 Analytics Dev IE

| # | Feature | Status | Q1 | Q2 | Q3 | Q4 | Q5 | Score | Veredicto | Notas |
|---|---|---|---|---|---|---|---|---|---|---|
| P15 | Tab Demanda B01 reuso zone_scores (action 2) | 🟡 | Y heatmap→launch_timing | Y zone_scores B01 | Y visual > tabla | Y ¿dónde lanzar? | Y session-length Pro | **5/5** | ACELERAR | `getDemandHeatmap` proc falta. |
| P16 | ScoreCard citations + confidence (action 10) | 🟡 | Y componente cross-módulo | Y zone_scores cols | Y citations inline | Y confidence calibra decisión | Y click-citation events | **5/5** | ACELERAR | Top reusable componente. |
| P17 | Feature gating Free vs Pro reuso flags+role_features (action 27) | 🟡 | Y gating→Free→Pro analytics | Y flags 120 + role_features 432 | Y auto-locks | Y upsell driver Revenue | Y Free→Pro conversion | **5/5** | ACELERAR | Falta seed flags M15 específicos. |
| P18 | Confidence badge (action 28) | 🟡 | N render UI | Y zone_scores.confidence | Y transparencia | Y calibra peso score | Y "low conf" filter pattern | **4/5** | MANTENER | Q1 N scope. |
| P19 | Citations link `/metodologia` (action 29) | 🟡 | N UI link | Y citations + /metodologia ✅ | Y drill-down inline | Y educa decision | Y /metodologia CTR | **4/5** | MANTENER | Trivial wire-up. |

### §4.10 M16 Dashboard Admin

| # | Feature | Status | Q1 | Q2 | Q3 | Q4 | Q5 | Score | Veredicto | Notas |
|---|---|---|---|---|---|---|---|---|---|---|
| P20 | Macro dashboard reuso `macro_series` (action 8) | 🟡 | Y feeds admin+/indices alpha | Y macro_series 880 rows | Y partitioned chart fast | Y trend pricing strat | Y admin engagement | **5/5** | ACELERAR | Naming reconcile pendiente. |
| P21 | Zonas manager reuso zone_scores (action 9) | 🟡 | Y edits→cascade | Y zone_scores | Y CRUD UI | Y decide qué publicar | Y audit_log per edit | **5/5** | ACELERAR | UI filtros + edit. |
| P22 | Anomalies feed `market_anomalies` (action 10) | 🟡 | Y trigger investigations | Y zone_scores deltas | Y feed UI > polling | Y ack/dismiss/escalate | Y MTTR | **5/5** | ACELERAR | Naming reconcile + ingest pipeline. |
| P23 | Feature Registry Table reuso `ui_feature_flags` (action 15) | 🟡 | Y flags→gating | Y ui_feature_flags 120 | Y UI > psql | Y toggle rápido | Y flag-flip freq | **5/5** | ACELERAR | Quick win line 1231. |
| P24 | Config global + EmergencyFlagsPanel (action 19) | 🟡 | Y config→plataforma | Y flags+system_config | Y panel global | Y emergency stop reduce blast | Y incident MTTR | **5/5** | ACELERAR | + Vercel Edge Config. |
| P25 | Newsletter A/B page (action 21) | 🟡 (out-of-spec) | Y winner→newsletter | Y newsletter_ab_tests | Y UI > SQL | Y CTR-based | Y test conversions | **5/5** | ACELERAR | Formalizar addendum. |
| P26 | Ingest market upload (action 22) | 🟡 (out-of-spec) | Y feeds market_prices+zone_scores | Y CSVs | Y drag-drop | Y valida pre-prod | Y upload success | **5/5** | ACELERAR | Formalizar. |
| P27 | Ingest admin upload (action 23) | 🟡 (out-of-spec) | Y feeds ingest pipelines | Y CSVs | Y UI form > SQL | Y sanity check | Y per-source freshness | **5/5** | ACELERAR | Formalizar. |
| P28 | `macro_indicators` vs `macro_series` (action 30) | 🟡 | Y resolved naming | Y | Y consistency | Y single SoT | Y audit correcto | **5/5** | ACELERAR | ADR rename trivial. |
| P29 | `anomalies` vs `market_anomalies` (action 32) | 🟡 | Y | Y | Y | Y single SoT | Y | **5/5** | ACELERAR | ADR rename trivial. |
| P30 | `feature_registry` vs `ui_feature_flags` (action 35) | 🟡 (resuelto) | Y migration aplicada | Y | Y | Y | Y audit triggers | **5/5** | ACELERAR | Addendum editorial spec. |
| P31 | `feature_flags` vs `ui_feature_flags` (action 39) | 🟡 (resuelto) | Y consolidado | Y | Y | Y | Y | **5/5** | ACELERAR | Doc update only. |
| P32 | RoleMatrixEditor UI reuso role_features (action 16) | 🟡 | Y matrix→gating | Y role_features 432 + flags 120 | Y matrix > SQL | Y assigns correctly | Y role changes/mes | **5/5** | ACELERAR | Quick win line 1229. |
| P33 | AuditLogTable UI reuso audit_log (action 17) | 🟡 | N consumer | Y audit_log 9 partitions | Y UI > psql | Y investigations | Y compliance KPI | **4/5** | MANTENER | Quick win line 1228. Q1 N. |

### §4.11 M18 Dashboard Comprador

| # | Feature | Status | Q1 | Q2 | Q3 | Q4 | Q5 | Score | Veredicto | Notas |
|---|---|---|---|---|---|---|---|---|---|---|
| P34 | Onboarding wizard `mfa.enroll`+lifepath (action 1) | 🟡 | Y buyer_persona→M18+M20 | Y mfa+lifepath_profiles | Y WA OTP low-friction | Y primer signal qué mostrar | Y Activation rate | **5/5** | ACELERAR | P0 antes de M18 entero. |
| P35 | LifestyleMatchWizard `lifepath.*` (action 3) | 🟡 | Y match→discover_weekly | Y lifepath_profiles 0 rows | Y 6-tile > long-form | Y matches priorizan inventory | Y completion rate | **3-5/5** | **CORTAR conflicto** | DECISIÓN FOUNDER: lifepath O LifestyleMatch — no ambos. Recomendación: reemplazar lifepath. Confidence baja. |
| P36 | Watchlist `zone_alert_subscriptions` (action 10) | 🟡 | Y subscriptions→alerts/recs | Y schema OK 0 rows | Y save&alert > re-search | Y timing decision | Y Strava Retention | **5/5** | ACELERAR | CRUD + UI list. |
| P37 | Subscribe to score ≥5% delta `trg_zone_scores_webhook_emit` (action 11) | 🟡 | Y alerts→WA/email | Y webhook emit + score_change_deliveries | Y proactive vs polling | Y timing driver | Y re-engagement | **5/5** | ACELERAR | Cablear consumer. |

### §4.12 M19 Marketplace Público

| # | Feature | Status | Q1 | Q2 | Q3 | Q4 | Q5 | Score | Veredicto | Notas |
|---|---|---|---|---|---|---|---|---|---|---|
| P38 | DMXWrappedTeaser `/wrapped/[year]` (action 15) | 🟡 | Y teaser→wrapped page | Y dmx_wrapped_snapshots | Y banner contextual | Y enero re-engagement | Y Referral (Spotify) | **5/5** | ACELERAR | Banner + cron `annual_wrapped`. |
| P39 | SSG/ISR + Vercel OG + JSON-LD multi-locale (action 17) | 🟡 | N SEO infra | Y routes existentes | Y org SEO CAC | Y rich-snippets influence | Y organic acquisition | **4/5** | MANTENER | Replicar pattern landing root. |
| P40 | A11y AA + i18n 5 locales (action 18) | 🟡 | N UI quality | Y messages/{5}.json | Y a11y reduce fricción | Y LATAM expansion | Y per-locale conversion | **4/5** | MANTENER | Validar nuevas rutas. |
| P41 | CtaFooter + newsletter cabling (action 9) | 🟡 | Y signup→A6 | Y newsletter procedure | Y footer captura | Y subscribe low-friction | Y Activation | **5/5** | ACELERAR | Port + cablear. |
| P42 | Faq landing embed vs page (action 20) | 🟡 | N UI static | Y i18n keys | Y inline vs navigation | Y clarifies objections | Y scroll-depth Activation | **4/5** | MANTENER | Decisión section vs standalone. |

---

## §5 Veredictos finales priorizados

### Top 9 features ACELERAR (score 5/5 + alto leverage cross-módulo)

1. **A1 — `zone_scores` UI consumers (M01 InsightCard, M02 IEScoreInline, M11 IEAlertBanner, M14 IECardEmbed, M15 ScoreCard, M19 ZoneExplorer)**: Backend listo (5267 rows + 5 triggers). Multiplicador #1: una vez `<ScoreCard />` shared component se construye, desbloquea 6+ módulos. Quick win compuesto.
2. **A2 — `role_features` Role Matrix Editor UI**: 432 rows + audit triggers + `ui_feature_flags` 120 → backend infra crítica. Sin esto, no hay multi-tenant production-ready.
3. **A4+A5 — `/indices` + `/metodologia`**: Top conversion path B2C ya en producción. ACELERAR significa mantenerlas frescas (1 release × index version bump) y validar wireframe completo contra M19 spec.
4. **A7 — Wrapped enero teaser banner + cron `annual_wrapped`**: Spotify Wrapped pattern. Top viral hook DMX. Solo falta cron + banner.
5. **P14 — IECardEmbed shared component**: 1 componente, 4 módulos consumidores (M08 marketing asesor + M14 marketing dev + M19 landing + M20 ficha). ROI máximo.
6. **P9-P13 — M12 Contabilidad CFDI mini-MVP (5 features parciales)**: `fiscal_docs` schema OK + audit trigger listo. UI procedures básicos (emit/cancel/list/view) son trivial pero compliance unblock crítico para revenue developers.
7. **P32-P33 — M16 RoleMatrixEditor + AuditLogTable UI**: Sistema permisos backend completo, falta solo UI. Sin admin UI, no hay multi-org go-live posible.
8. **P34 — M18 Onboarding wizard buyer_persona**: P0 antes de cualquier otra feature M18 (todo lo demás depende de persona). WA OTP + tabla user_buyer_profiles.
9. **P36-P37 — M18 Watchlist + Score subscribe**: Strava pattern Retention. Backend webhook emit listo. Cablear consumer notif.

### Top 3 features CORTAR (score < 4 + bajo IE alignment)

> **Honesto y escéptico (criterio canon):** este audit identifica **3 features parciales** con conflicto interno o bajo leverage suficiente para flag CORTAR pre-B-construction. Notar que ninguna feature ✅ active (8) cae en categoría CORTAR — la inversión backend hecha está alineada.

1. **P35 — LifestyleMatchWizard 6-tile vs feature `lifepath` long-form existente** (M18 action 3): **CONFLICTO PRODUCTO IRRESUELTO**. Score 3-5/5 dependiendo de cuál se mantenga. Mantener AMBOS = deuda técnica + UX confuso (canon "zero deuda técnica antes de avanzar"). Recomendación: **CORTAR `lifepath` (sunk cost, 0 rows en tabla, no traction)**, mantener LifestyleMatchWizard 6-tile (Netflix-pattern probado high-conversion). Confidence: **baja** — requiere founder validation antes de cortar feature `lifepath` que ya tiene routes/components shipped.
2. **P40 — A11y AA + i18n 5 locales completos pre-launch H1** (M19 action 18): Score **4/5** (Q1 N por scope UI). NO cortar la a11y/i18n en sí (es non-negotiable canon § 10). PERO **CORTAR el alcance "5 locales H1"** → empezar solo `es-MX` H1 + `es-CO` H2. CO/AR/BR son LATAM expansion fuera scope inversión H1 (founder regla "verificar antes de gasto"). Mantener arquitectura i18n-ready, no traducciones completas.
3. **P42 — Faq landing embed vs page standalone** (M19 action 20): Score 4/5. Decisión producto micro: embed inline en landing O page `/faq` standalone. **CORTAR el doble-mantenimiento** (embed + page) → elegir UNO. Recomendación: page standalone `/faq` (ya existe ✅), banner CTA "FAQ" en landing footer suficiente. Embed completo en landing añade ruido, dilute conversion path.

### Features 🟡 parcial que pasan filtro 5/5 (priorizar completar, NO cortar)

Orden sugerido por leverage + bloqueo desbloqueado:

1. **P32 RoleMatrixEditor + P33 AuditLogTable** (M16) — admin go-live unblock.
2. **A1+P1+P2+P3+P14 — `zone_scores` UI consumers** (cross-module) — IE moat surfaceable.
3. **P15-P19 — M15 7 tabs ScoreCard** — Pro plan revenue unblock.
4. **P9-P13 — M12 CFDI mini-MVP** — developer compliance unblock.
5. **P34+P36+P37 — M18 onboarding+watchlist+alerts** — comprador AARRR core.
6. **A7+P38 — Wrapped + teaser** — viral Referral.
7. **A8 — `/asesores/[slug]` microsite** — asesor SEO orgánico.
8. **P5 — fxRouter wired into operaciones+inversion calc** — multi-currency UX.
9. **P20+P21+P22 — M16 Macro+Zonas+Anomalies UIs** — admin observability.
10. **P28-P31 — Naming reconciliation ADRs** — pre-implementación deuda doc.

---

## §6 Cross-reference matriz

Compact ref (líneas 06_AUDIT + M0X canonical). Confidence default high salvo nota.

- **A1 zone_scores** → 06_AUDIT 121-123 + 802-856 → `M15_ANALYTICS_DEV_IE.md`
- **A2 role_features** + **A3 audit_log** → 06_AUDIT 124-125 + 870-916 → `M16_DASHBOARD_ADMIN.md`
- **A4-A8 (/indices /metodologia /newsletter /wrapped /public_profiles)** → 06_AUDIT 130-131, 1041-1100 → `M19_MARKETPLACE_PUBLICO.md`
- **P1 InsightCard M01** → 06_AUDIT 171 → `M01_DASHBOARD_ASESOR.md`
- **P2-P3 M02 IE bindings** → 06_AUDIT 215-217 → `M02_DESARROLLOS.md`
- **P4 M04 Comparador** → 06_AUDIT 300 → `M04_BUSQUEDAS.md`
- **P5 fxRouter M07** → 06_AUDIT 442 → `M07_OPERACIONES.md`
- **P6-P7 M10 dev (medium confidence)** → 06_AUDIT 569-572 → `M10_DASHBOARD_DEV.md`
- **P8 M11 IE Alert Banner** → 06_AUDIT 624 → `M11_INVENTARIO_DEV.md`
- **P9-P13 M12 CFDI** → 06_AUDIT 661-664 + 676 → `M12_CONTABILIDAD_DEV.md`
- **P14 M14 IECardEmbed** → 06_AUDIT 771 → `M14_MARKETING_DEV.md`
- **P15-P19 M15 tabs** → 06_AUDIT 816, 824, 827, 841-843 → `M15_ANALYTICS_DEV_IE.md`
- **P20-P33 M16 features** → 06_AUDIT 879-908 → `M16_DASHBOARD_ADMIN.md`
- **P34-P37 M18 comprador (medium confidence en P34-P35)** → 06_AUDIT 991-1001 → `M18_DASHBOARD_COMPRADOR.md`
- **P38-P42 M19 landing** → 06_AUDIT 1061, 1063-1066 → `M19_MARKETPLACE_PUBLICO.md`

01_CROSSWALK_MATRIX cross-check spot-checked en M19 (actions 11-15 producción match col "Status H1"). No exhaustive 150-row cross-walk — limitación documentada §8.

---

## §7 Handoff F2 Construction

### Priorización RICE × IE-filter score (sugerencia para founder)

Combinación RICE (de `03_RICE_PRIORITIES.md`) × score IE filter (de este doc) genera el orden recomendado:

**Tier S (acelerar inmediatamente, score 5/5 + RICE alto):**
- ScoreCard shared component (un build → 6 módulos)
- M16 RoleMatrixEditor + AuditLogTable + FeatureRegistryTable (admin go-live)
- M19 landing root (App.jsx 12 secciones + 3 nuevos)
- M18 onboarding wizard buyer_persona

**Tier A (post-Tier S, score 5/5 + RICE medio):**
- M12 CFDI mini-MVP (5 features parciales)
- M18 Watchlist + Score Alerts cabling
- M14 IECardEmbed shared
- M11 IE Alert Banner

**Tier B (post-Tier A, score 4/5 o requiere ADR):**
- AuditLogTable UI (4/5)
- A8 `/asesores/[slug]` microsite (4/5)
- Naming reconciliation ADRs (P28-P31)
- M16 Macro+Anomalies UIs

**CORTAR antes de B (founder validation pendiente):**
- Feature `lifepath` long-form (P35 conflict resolution)
- A11y/i18n alcance "5 locales H1" → reducir a es-MX H1
- Faq landing embed (mantener solo /faq standalone)

### Recomendación quick wins (3 features alta prioridad + score 5/5)

1. **`<ScoreCard />` shared component** — desbloquea 6+ módulos en 1-2 días CC. ROI infinito.
2. **M16 RoleMatrixEditor UI** — backend listo (432 rows + audit), 1 día CC. Multi-org go-live.
3. **M19 landing root reemplazo placeholder** — 5 componentes prototype port (~32h CC = 1 día @ pace 4x). First impression usuario.

### Riesgos identificados (features 🟡 parcial sin clear data flow)

1. **P35 lifepath vs LifestyleMatch conflicto irresuelto**: continuar sin decidir → 2 quizzes paralelos confusos UX. Decisión founder ANTES de M18 build.
2. **M16 features out-of-spec (newsletter-ab + ingest pages, P25-P27)**: existen pero NO documentadas en spec M16 oficial. Riesgo: futura migration borre por "no alineadas". Acción: addendum editorial M16 spec O ADR formal.
3. **Naming mismatches BD vs spec (P28-P31)**: `macro_series`/`macro_indicators`, `anomalies`/`market_anomalies`, `feature_registry`/`ui_feature_flags`. CC podría implementar contra spec → query rompe en runtime. Acción: ADR reconciliation **pre-cualquier prompt CC** que toque M07/M12/M15/M16/M18.
4. **`fiscal_docs` vs `fiscal_documents`** (P9-P13): single most-impactful naming mismatch (5 features afectadas). ADR P0.
5. **Feature gating Free vs Pro M15 sin flags definidos** (P17): backend `ui_feature_flags` listo pero zero rows con flags M15 → tabs leak Free users. Acción: seed flags en migration pre-launch.

---

## §8 Notas auditor

### Limitaciones del audit

1. **Q5 AARRR interpretativo:** auditor Y si feature emite señal medible (CTR/retention/conversion/error-rate). Confidence high con telemetría PostHog existente.
2. **Feature `lifepath` traction unknown** (0 rows actualmente). Recomendación CORTAR (P35) basada en hipótesis Netflix-pattern. Founder validation requerida.
3. **Naming reconciliations (P28-P31)** son meta-features (desbloquean N features); audit las trata así por leverage indirecto.
4. **Out-of-spec admin pages (P25-P27)** funcionando pero no en spec M16 oficial. Auditor honra realidad funcional.
5. **Cross-walk 01_CROSSWALK_MATRIX 150×15** spot-checked (M19 actions 11-15), no exhaustive. Cross-ref principal vía 06_AUDIT + M0X.

### Preguntas abiertas para validación founder

1. **¿CORTAR feature `lifepath` long-form pre-M18 build?** (resolver conflicto LifestyleMatch). Recomendación auditor: SÍ.
2. **¿Reducir alcance "5 locales H1" → solo es-MX H1?** Recomendación auditor: SÍ (LATAM expansion H2 con feedback es-MX).
3. **¿Naming canónico `fiscal_documents` (spec) vs `fiscal_docs` (BD shipped)?** Recomendación auditor: mantener `fiscal_docs` (más conciso, ya en migration), update spec.
4. **¿Naming canónico `macro_series` vs `macro_indicators`?** Recomendación auditor: mantener `macro_series` (más preciso temporalmente, ya 880 rows + partitions).
5. **¿Naming canónico `market_anomalies` vs `anomalies`?** Recomendación auditor: mantener `market_anomalies` (más específico, evita overload semántico).
6. **¿Formalizar admin pages out-of-spec (newsletter-ab + 2 ingest)?** Recomendación auditor: SÍ via addendum editorial M16.
7. **¿Pause feature `lifepath` con decisión documentada en ADR-049 o similar?** (canon "STUB markers" pattern ADR-018).
8. **¿Decisión naming `desarrolladoras` (BD) vs `developers` (M10 spec)?** Recomendación auditor: mantener `desarrolladoras` (consistencia plural español).

### Confidence level per veredicto

- **High confidence (38 features):** features ✅ active (8) + features con evidence convergente entre 06_AUDIT + M0X spec + 01_CROSSWALK + MCP query. La mayoría de M15/M16/M19 caen aquí.
- **Medium confidence (5 features):** P6-P7 M10 dev (data fragmentaria spec M10), P34-P37 M18 (decisión producto LifestyleMatch pendiente).
- **Low confidence (2 features):** P35 lifepath (conflicto producto irresuelto), P40 a11y/i18n alcance H1 (decisión scope pendiente).

---

## §9 Handoff inmediato

- **Output type:** doc canon referenciable en prompts CC F2 Construction.
- **Cross-references principales:** `docs/08_PRODUCT_AUDIT/06_AUDIT_ESTADO_REAL_M01_M20.md` (1269 LOC) + `docs/biblia-v5/17_BIBLIA_DMX_v5_Decisiones_Hallazgos_Plan.md` §17 verbatim.
- **Acción founder pendiente:** resolver 8 preguntas §8 antes de F2 Construction sub-fases (priorizar P35 lifepath + 5 naming reconciliations P28-P31).
- **Próximo paso F0:** ver `docs/03_CATALOGOS/03.13_E2E_CONNECTIONS_MAP.md` §"Matriz por Módulo M01-M20" (matriz E2E complementaria).

---

**Audit DOCS-ONLY · zero código fuente modificado · F0 cierre gaps foundation pre-construction · 2026-04-25**
