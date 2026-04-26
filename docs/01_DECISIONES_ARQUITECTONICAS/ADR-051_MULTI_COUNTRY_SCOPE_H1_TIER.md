# ADR-051 — Multi-country scope H1 vs H2 (tier 1 active vs tier 2 prepared)

> **Status:** Aprobado 2026-04-25 (founder canon — Opción B post audit F0)
> **Fase origen:** F1.A Data Reality Foundation (post FASE 07.7 foundation locked)
> **Relacionado:** ADR-003 multi-country desde día 1 · ADR-035 retention multi-país CFDI-aware · ADR-049 country_code char(2) · BIBLIA-§17 DECISIÓN 2 (5 locales)

## Contexto

Founder vision original (ADR-003, BRIEFING §2 pregunta 6) declaró multi-country día 1 con 5 locales (`es-MX`, `es-CO`, `es-AR`, `pt-BR`, `en-US`) y expansión objetivo H2/H3 a CDMX → LATAM full + US Latinx.

Audit F0 (commit 49f773e) ejecutó SA-IE-Filter sobre M01-M20 + 11_IE_FILTER_AUDIT identificando 5 features candidatas para revisión scope H1 (P35 lifepath, P40 multi-país enforcement, P42 faq embed, P54 X, P58 Y). El veredicto SA-IE sobre P40 fue "complejidad multi-país desproporcionada para H1 velocity":

- Testing/QA exhaustivo 5 locales H1 implica ~30-50% wall-clock extra vs 2 locales
- Compliance frameworks 4 países (Mifiel/Certicámara/AFIP/CRECI) requieren PAC/certificador integrations distintas
- 13 sources Tier 2 H2 (DANE CO, INDEC AR, IBGE BR, etc.) fuera de scope ingestion H1
- Sources US-specific para audience Latinx primarily expat/inversionista buscando MX (no US-side data)

Founder dictó **Opción B 2026-04-25** post review F0:

- Tier 1 H1 active = `es-MX` + `en-US` (testing/QA exhaustivo + enforcement compliance + ingestion sources)
- Tier 2 H2 prepared = `es-CO` + `es-AR` + `pt-BR` (config + seeds preserved, NO testing/QA exhaustivo H1)
- Vision multi-country original PRESERVED — solo posterga ejecución 6-9 meses post-launch H1

ADR-003 + ADR-035 + ADR-049 + BIBLIA DECISIÓN 2 NO se eliminan. ADR-051 formaliza la división tier sobre infraestructura multi-país existente.

## Decisión

Adoptar tier scope H1 vs H2 con división explícita:

### Tier 1 H1 active (testing/QA exhaustivo + enforcement)

| Dimensión | Tier 1 H1 |
|---|---|
| Locales testing | `es-MX` (default) + `en-US` |
| Audience focus | MX residential/commercial real estate + US Latinx (expat/inversionista comprando MX) |
| Ingestion sources active | 32 sources (7 macro MX + 17 geo MX + 5 mercado funcional + AirROI LATAM + Mapbox + Trends) |
| Compliance frameworks | SAT/CFDI 4.0 (MX) + IRS W-9/W-8 (US, agregar cuando emerja feature US-specific) |
| Tests/CI gates | typecheck + lint + dead-ui + tests vitest + playwright E2E foco MX + en-US copy |
| Currency presentation | MXN (default MX) + USD (toggle US Latinx audience) |
| Timezone | America/Mexico_City + America/New_York |

### Tier 2 H2 prepared (config + seeds preserved, NO testing/QA exhaustivo H1)

| Dimensión | Tier 2 H2 |
|---|---|
| Locales config | `es-CO` + `es-AR` + `pt-BR` (messages files preserved, fallback `es-MX` H1 si missing keys) |
| Audience defer | Bogotá + Medellín (CO) · CABA + GBA (AR) · São Paulo + Rio (BR) |
| Ingestion sources prepared | 13 sources (DANE CO, Banco República CO, Superfin CO, Catastro Multiprop CO, Policía CO + INDEC AR, BCRA, ARBA + IBGE, BC Brasil, IPTU BR + INE/BC Chile catalogados H3) |
| Compliance frameworks prepared | DIAN (CO), AFIP (AR), Receita Federal (BR) — schemas preserved, enforcement off |
| BD seeds preserved | `retention_policies` 28 rows (4 países × 7 entity_types) intactos · `countries` MX/CO/AR/BR/US activos |
| Tests/CI defer | NO playwright E2E enforcement multi-locale H1 · 5 lint locales fallback OK |
| Activación H2 | FASE 38 expansion (post-launch H1 + 6-9 meses) — activa configs preparados, NO refactor masivo |

### Reglas de evolución

1. **Si emerge feature H1 que requiere CO/AR/BR enforcement → FLAG founder ANTES de implementar.** Override H1 scope decision pending.
2. **Si feature solo afecta MX → no requiere consult, build per canon.**
3. **Si feature solo afecta US Latinx → adapt usando es-MX patterns + en-US copy (mismo patrón asesor MX).**
4. **Sources US-specific** (Census Bureau ACS, Zillow Research, NOAA national) → defer L-NEW-US-LATINX-DATA-SOURCES (FASE 22.A o post-launch H1) si NO crítico H1. Audience US Latinx H1 primarily expat/inversionista comprando MX → data layer MX H1 sirve interface en `en-US` sin requerir sources US-specific.

## Consecuencias

### Positivas

- **Velocity H1 ~30-50% wall-clock reducido** vs 5 locales testing/QA enforcement.
- **Code extensible H2 zero refactor masivo**: formatters factory pattern + retention_policies multi-country + country_code pervasive ADR-049 + i18n 5 locales preserved.
- **Founder vision multi-country PRESERVED**: ADR-003 sigue canon, ADR-035 28 seeds intactos, BIBLIA DECISIÓN 2 (5 locales) respetada.
- **US Latinx high-LTV audience H1 active**: mercado underserved high-LTV justifica tier 1 status sin requerir sources US-specific build out.
- **Activación H2 FASE 38 = config flip, not rebuild**: testing/QA per país adicional + compliance integrations específicas (PAC/certificador per país) + sources tier 2 ingestion enable.

### Negativas

- **Tier 2 H2 timeline 6-9 meses post-launch H1** (vs original ADR-003 día 1). Mitigación: founder vision intact, expansion = activation only.
- **Edge case content holes**: si user CO/AR/BR encuentra messages files con missing keys H1 → fallback `es-MX` cosmético (no blocker, error handling i18n consistent).
- **Compliance enforcement off CO/AR/BR H1**: si user actúa en jurisdicción Tier 2 sin enforcement, riesgo legal. Mitigación: marketing/onboarding H1 declara "MX + US foco H1" + tier 2 disclaimer en signup CO/AR/BR.
- **Backlog L-NEW expansion 4 entries** (CO + AR + BR + US Latinx data) destinos canon FASE 38/22.A.

### Compatibilidad ADRs anteriores

- **ADR-003 multi-country desde día 1**: PRESERVED. Vision intact, posterga ejecución testing/QA tier 2.
- **ADR-035 retention multi-país CFDI-aware**: PRESERVED. 28 seeds 4 países × 7 entity_types intactos. Enforcement cron `crm_retention_cleanup` activo MX H1, CO/AR/BR pasivo (rows preservados, no DELETE).
- **ADR-049 country_code char(2) BD pervasive**: PRESERVED. Schema multi-país intacto.
- **BIBLIA DECISIÓN 2 (5 locales)**: PRESERVED. NO borrar messages files, NO borrar countries seeds.

## Implementación

- ✅ ADR-051 documenta tier scope (este archivo).
- ✅ `docs/03_CATALOGOS/03.9_CATALOGO_FUENTES_DATOS.md` actualizado con banner tier scope + tier tag per source (32 Tier 1 + 13 Tier 2 + 4 N/A).
- ✅ `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md` +4 L-NEW expansion (CO + AR + BR + US Latinx) destinos canon FASE 38/22.A.
- ✅ `docs/02_PLAN_MAESTRO/02.0_INDICE_MAESTRO.md` tier marker per FASE.
- ✅ `docs/biblia-v5/17_BIBLIA_DMX_v5_Decisiones_Hallazgos_Plan.md` DECISIÓN N+1 append.
- ✅ `docs/08_PRODUCT_AUDIT/11_IE_FILTER_AUDIT_M01_M20.md` P40 status RESOLVED (Opción B founder).
- ✅ Memoria canon `project_scope_multipais_h1_opcion_b` (28 entries MEMORY.md).

NO requiere: migrations BD, schema changes, code refactor, messages files cleanup, retention seeds cleanup.

## Alternativas rechazadas

- **Opción A — 5 locales H1 testing/QA exhaustivo**: rechazada — violates velocity H1 (~30-50% wall-clock extra) sin ROI inmediato (audience CO/AR/BR no validada pre-launch).
- **Opción C — `es-MX` only H1 (drop en-US tier 1)**: rechazada — US Latinx audience high LTV expat/inversionista comprando MX justifica tier 1 status; drop en-US descarta segmento underserved sin justificación.
- **Opción D — Eliminar 5 locales config + seeds CO/AR/BR de BD**: rechazada — viola BIBLIA DECISIÓN 2 + ADR-003 + ADR-035; requeriría rebuild masivo H2 (vs activación). Founder vision multi-country PRESERVED.
- **Opción E — Per-country feature flags granular**: rechazada — sobreingeniería H1; tier scope es decisión coarse (active/prepared) suficiente. Refinement granular emerge orgánico FASE 38 expansion según feature.

## Cumplimiento verificable

Test post-implementation F1.A:

```bash
ls messages/ | wc -l                                    # esperado 5 (es-MX, es-CO, es-AR, pt-BR, en-US)
grep -c "Tier 1\|Tier 2" docs/03_CATALOGOS/03.9_CATALOGO_FUENTES_DATOS.md   # esperado >5
grep -c "L-NEW-COUNTRY-EXPANSION\|L-NEW-US-LATINX" docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md   # esperado 4
```

Test post-implementation FASE 38 expansion (futuro):

```sql
select country_code, count(*) from retention_policies where active = true group by country_code;
-- Esperado: MX/CO/AR/BR cada uno 7 rows (28 total).
```

## Referencias

- ADR-003 multi-country desde día 1
- ADR-035 retention multi-país CFDI-aware
- ADR-049 country_code char(2) naming reconciliation
- BIBLIA-§17 DECISIÓN 2 (5 locales)
- F0 audit (commit 49f773e) SA-IE-Filter P40
- Memoria `project_scope_multipais_h1_opcion_b`
- Memoria `feedback_aplicar_criterios_canon_zero_preguntas`
- Memoria `feedback_arquitectura_escalable_desacoplada`
- `docs/05_OPERACIONAL/05.6_DATA_RETENTION_POLICY.md`
