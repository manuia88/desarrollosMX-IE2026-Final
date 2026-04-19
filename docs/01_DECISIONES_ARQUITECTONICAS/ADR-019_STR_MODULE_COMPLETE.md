# ADR-019 — STR Module Complete (H1+H2 colapsado vía AirROI pay-as-you-go)

**Status:** Accepted
**Date:** 2026-04-18
**Deciders:** Manu Acosta (founder), PM externo
**Referenced by:** [FASE_07b_STR_INTELLIGENCE_COMPLETE.md](../02_PLAN_MAESTRO/FASE_07b_STR_INTELLIGENCE_COMPLETE.md)
**Supersedes:** —
**References:** [ADR-010 IE Pipeline Architecture](./ADR-010_IE_PIPELINE_ARCHITECTURE.md), [ADR-011 Moonshot 3 Horizontes](./ADR-011_MOONSHOT_3_HORIZONTES.md), [07_GAME_CHANGERS](../07_GAME_CHANGERS/)

## 1. Context

El plan original ([ADR-010 §D2 Mercado](./ADR-010_IE_PIPELINE_ARCHITECTURE.md#d2-ingestores-per-source) y [FASE 07 Bloque 7.E.3](../02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md)) contemplaba:

- **H1**: stub AirDNA (API contratada, plan Enterprise ~$399+/mes); ingesta mínima de occupancy/ADR/RevPAR por zona para alimentar `market_pulse`.
- **H2**: módulo STR Intelligence completo desarrollado sobre AirDNA o sobre modelos propietarios entrenados con nuestro dataset.
- **H3**: entrenamiento de modelos propietarios que reemplacen progresivamente APIs de terceros (AirDNA/AirROI + GPT-4o-mini en BBVA PDF extract, etc.).

En la ronda de revisión 2026-04-18 se validó que **AirROI** ofrece API pay-as-you-go a **~$0.01 USD/call**, sin suscripción mínima, con cobertura equivalente en ciudades MX principales (CDMX, Guadalajara, Monterrey, Playa del Carmen, Puerto Vallarta, Tulum, Mérida, Querétaro) y datos de listings, monthly snapshots, reviews y metadata de fotos.

La restricción económica actualizada es **presupuesto pre-revenue < $500 USD/mes** para toda ingesta STR. Con sampler de 1% en dev/staging y rate limit racional, cubre 50K calls/mes — suficiente para refresh delta de las ciudades listadas.

El pivot tiene impacto downstream relevante en producto (IE Scores N2/N3 obtienen STR inputs desde el inicio) y en monetización (un nuevo producto B2B "STR Intelligence Reports" puede empaquetarse en launch, no en H2).

## 2. Decision

**Se adopta el pivot AirDNA → AirROI como fuente STR H1**, y se **colapsa H1+H2 STR en una fase única FASE 07b** que entrega el módulo completo STR Intelligence. **H3 se mantiene separado** y acotado a training de modelos propietarios.

Decisiones concretas:

1. **Fuente primaria STR H1**: AirROI (pay-as-you-go $0.01/call). AirDNA queda **DEPRECATED** — no se contrata plan enterprise en H1. Documentado en [03.9 Catálogo Fuentes](../03_CATALOGOS/03.9_CATALOGO_FUENTES_DATOS.md#f-mercado-03-airdna-deprecated).
2. **Colapso H1+H2 STR**: la FASE 07b agrupa **14 bloques** (7b.A → 7b.O — nota: sin letra Ñ) que antes estaban distribuidos entre "H1 stub" + "H2 STR completo". Ver detalle en [FASE_07b_STR_INTELLIGENCE_COMPLETE.md](../02_PLAN_MAESTRO/FASE_07b_STR_INTELLIGENCE_COMPLETE.md).
3. **Re-clasificación de upgrades Y/Z/AA/BB de H2 a H1** (dentro de FASE 07b.F, 07b.G, 07b.H, 07b.I respectivamente). Documentado en [07.3 Priorización](../07_GAME_CHANGERS/07.3_PRIORIZACION_H1_H2_H3.md).
4. **Nuevo producto B2B "STR Intelligence Reports"** — 4 tiers (individual owner / alcaldía / gobierno CDMX / API broker) se registra en [03.11 Productos B2B](../03_CATALOGOS/03.11_CATALOGO_PRODUCTOS_B2B.md) como producto launch H1 (no H2).
5. **H3 redefinido**: entrenamiento de modelos propietarios que reemplacen AirROI (y GPT-4o-mini BBVA extract) progresivamente. FASE 07b.O prepara el corpus pero NO entrena. Timeline H3 realista: >6 meses post-launch + >$50K compute.
6. **Cost cap $500 USD/mes** enforced vía `airroi_spend_ledger` + budget guard en orchestrator. Sampler 1% en dev/staging. Alert sub-agente telemetría al 80%.
7. **Sub-agente telemetría (FASE 24)** expone panel `airroi_budget` + `str_pipeline_health` con alertas predefinidas.

## 3. Consequences (trade-offs)

### Positivas

- **Producto 5-10x más potente al launch**: en lugar de un stub con 3 métricas, el launch de DMX incluye scoring STR completo + viability + ZIS + detección de hoteles invisibles + pricing advisor + portfolio optimizer + reports B2B monetizables.
- **Revenue-at-launch**: "STR Intelligence Reports" habilita contratos B2B desde semana 1 post-launch (Tier 2 alcaldías + Tier 3 gobierno CDMX son deals anchor muy probables en LATAM).
- **IE Scores calibrados desde día 1**: FASE 10 (N2/N3) ya no tiene que esperar H2 para obtener STR inputs ricos — se alimenta del output 7b.A/7b.D desde primer deploy.
- **Costo drásticamente menor**: $500 cap vs $399+/mes AirDNA sin conseguir la amplitud analítica que AirROI + nuestros workers permiten.
- **Corpus temporal acumulado más rico**: al incluir 14 bloques desde inicio, el moat (datos temporales acumulados) crece desde día 1, no desde H2.
- **H3 mejor acotado**: H3 se convierte explícitamente en "internalización de APIs" y no en "construir STR module completo", reduciendo su scope y riesgo.

### Negativas / tradeoffs

- **+3-4 semanas timeline adicional** en la ventana H1 (8-10 sesiones nuevas). Mitigación: FASE 07b es paralelizable parcialmente con FASE 08 (N0) y FASE 13-14 (Portal Asesor M1-M10) una vez 7b.A está en verde.
- **Mayor deuda ingestora**: 14 bloques STR requieren monitoring (Sentry tags + sub-agente telemetría). Costo recurrente de SRE ~15% más alto que stub.
- **Dependencia AirROI SLA**: AirROI no ofrece SLA comparable a AirDNA enterprise. Si hay outage >24h, reports Tier 2/3 pueden retrasarse → fallback manual admin upload documentado + cláusula SLA en contratos B2B que referencia "best-effort during third-party provider incidents".
- **Complejidad cost control**: budget cap $500 es ajustado. Si demanda escala (p.ej. Tier 3 gobierno pide refresh semanal), requerirá re-negociar cap o escalar ingesta con lógica sharded. Mitigación: alerting al 80% + freeze automático refresh no-críticos al 95%.
- **Riesgo regulatorio STR en MX**: CDMX endureciendo reglamento alojamiento temporal 2026+. Si regulación adversa afecta cobertura AirROI (e.g. delistings masivos), impacta calidad datos. Mitigación: tabla `str_zone_regulations` + Chrome Ext GC-27 fallback para ingesta alternativa.
- **Consumo LLM mayor**: sentiment + CV + NLP topics añaden ~$100-400 USD/mes en Anthropic API costs sobre baseline FASE 07. Cap separado documentado.

### Neutrales

- **Chrome Extension GC-27 sigue relevante**: no reemplaza a AirROI, pero sirve como fallback + complemento en zonas con cobertura AirROI pobre. Queda disponible FASE 07b.A módulo opcional.
- **AirDNA como opción H3+**: si eventualmente adquirimos enterprise budget, AirDNA puede reactivarse como segunda fuente cross-validation. No hay hostilidad con el proveedor, solo decisión económica H1.

## 4. Alternativas consideradas

### Alt 1 — Mantener stub hasta H2 (plan original)

**Rechazada.** Pierde la oportunidad de monetizar STR Intelligence Reports en launch. Obliga a FASE 10 a esperar H2 para STR inputs. Deja el moat temporal creciendo ~12 meses después. No aprovecha que AirROI está disponible *ahora*.

### Alt 2 — Licenciar AirDNA completo H1

**Rechazada.** Costo ~$399+/mes pre-revenue no se justifica. AirDNA tiene superficie similar de datos a AirROI para uso MX. El overhead de contract + onboarding enterprise no aporta diferencial. Revisable H3 si Series A + revenue proveen budget.

### Alt 3 — Scraping directo Airbnb

**Rechazada por TOS + ADR-012.** Airbnb TOS prohíbe scraping server-side. Riesgo legal + riesgo de blocklist. ADR-012 ya establece política: scraping server-side de portales consumer-facing está prohibido. Chrome Ext GC-27 client-side es el único patrón aceptado (complemento, no sustituto).

### Alt 4 — Licenciar un dataset académico/INEGI

**Rechazada (no existe equivalente).** INEGI no publica dataset STR; reportes Cushman/CBRE/JLL son trimestrales agregados sin granularidad de listing. No alcanzan para los 14 bloques planteados.

### Alt 5 — Desarrollar modelos propietarios desde H1 (saltar AirROI)

**Rechazada.** Sin corpus histórico no hay manera de entrenar modelos con calidad comparable. AirROI en H1/H2 es justamente el mecanismo que *produce* el corpus que habilita H3.

## 5. Impacto downstream

- **IE Scores N2/N3 (FASE 10)**: obtienen inputs STR completos desde inicio (`STR-BASELINE`, `ZIS`, `NOMAD`, `ENV`, `SUPER-HOST`). Score definitions actualizadas en [03.8](../03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md).
- **Monetización (FASE 23)**: registro de "STR Intelligence Reports" como producto con 4 tiers en [03.11 Productos B2B](../03_CATALOGOS/03.11_CATALOGO_PRODUCTOS_B2B.md). Revenue target H1 adicional: $150K-$600K USD/año (mix Tier 1 one-shots + Tier 2-3 contratos anchor).
- **Portal Admin (FASE 19)**: nuevos dashboards STR (invisible hotels, super-hosts, migraciones, pricing calendar, report queue, airroi_budget panel).
- **Portal Comprador / Marketplace Público (FASE 20/21)**: overlays `EnvLayer`, badges `nomad-friendly`, `str-opportunity`.
- **Compliance (FASE 26)**: LFPDPPP data subject rights para property owners en reports. Cláusulas contractuales con gobierno CDMX anonimización agregada.
- **H3 alcance**: se acota a (a) entrenar modelo pricing propietario reemplazando pricing advisor AirROI-based, (b) entrenar NLP sentiment propietario reemplazando llamadas Anthropic Haiku, (c) entrenar AVM-STR fusionado al DMX Estimate (producto estrella I01). Sin estas internalizaciones, H3 NO alcanza targets de margin.
- **ADR-011 revenue breakdown H1**: se actualiza implícitamente con +$30K-$100K MRR stream "STR Intelligence Reports" a partir de mes 6-9 (no afecta matemática del ADR-011, son stretch additional — no reabre ADR-011).

## References

- [ADR-010 — IE Pipeline Architecture](./ADR-010_IE_PIPELINE_ARCHITECTURE.md) §D2 Market ingestors (contexto AirDNA original).
- [ADR-011 — Moonshot 3 Horizontes](./ADR-011_MOONSHOT_3_HORIZONTES.md) (H1/H2/H3 definiciones).
- [ADR-012 — Scraping Policy](./ADR-012_SCRAPING_POLICY.md) (por qué scraping Airbnb directo descartado).
- [FASE 07 — Ingesta Datos](../02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md) Bloque 7.E.3 AirDNA (stub que este ADR deprecia).
- [FASE 07b — STR Intelligence Complete](../02_PLAN_MAESTRO/FASE_07b_STR_INTELLIGENCE_COMPLETE.md).
- [03.9 Catálogo Fuentes Datos](../03_CATALOGOS/03.9_CATALOGO_FUENTES_DATOS.md).
- [03.11 Catálogo Productos B2B](../03_CATALOGOS/03.11_CATALOGO_PRODUCTOS_B2B.md).
- [07.3 Priorización GCs H1/H2/H3](../07_GAME_CHANGERS/07.3_PRIORIZACION_H1_H2_H3.md).

---

**Autor:** Claude Opus 4.7 (biblia v2.1 pivot AirROI) | **Fecha:** 2026-04-18
