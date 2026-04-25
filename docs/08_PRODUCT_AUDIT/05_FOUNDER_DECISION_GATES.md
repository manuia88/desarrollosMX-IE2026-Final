# 05 — Founder Decision Gates (FASE 07.6.F)

> Formalización canonical de los 13 founder decision gates extraídos de `docs/08_PRODUCT_AUDIT/04_ROADMAP_INTEGRATION.md` sección 6.
> Cada gate bloquea features downstream hasta que founder responda A/B/C.
> ADR target reservado para emisión post-decisión.
> Generado: 2026-04-25 sub-sesión 07.6.F sub-agent SA-Gates.

## Estado

- **Total gates:** 13
- **Bloque A (pre-FASE 07.7 + 11.W):** 6 gates (Gates 1-6)
- **Bloque B (pre-FASE 11.X + 21.A + 22.A):** 7 gates (Gates 7-13)
- **ADRs reservados:** ADR-033 → ADR-045 (Gates 1-13 mini-fases blocking) + ADR-046/047 referenciados como "adicionales legales" en doc 04 sección 6.3 (post-mini-fase, no bloquean arranque sino prod shipping)
- **Sesiones founder review síncronas estimadas:** 2 (~2h cada una, ~4h founder time total)
- **Mini-fases bloqueadas:** 5 (07.7 CRM, 11.W DISC, 11.X Properties, 21.A WhatsApp, 22.A Banking)

**Notas de mapping ADR:**
- Doc 04 sección 6 mapea Gates 1-13 → ADR-033..ADR-045 (Gates 1-13).
- Doc 04 sección 6.3 menciona ADR-046 (Legal status DMX) y ADR-047 (Lenders coverage) como gates adicionales legales post-mini-fase shipping. Se preservan como Gates 12/13 alineados con su numeración doc 04 (Gate-12 = Templates → ADR-044; Gate-13 = Banking path → ADR-045). Los dos legales adicionales no se reabren acá (siguen como ADR-046/047 trackeados separadamente en sección 6.3 del doc fuente).
- Doc 04 sección 1 (resumen mini-fases) lista "ADR-033 → ADR-047" (13 ADRs). Sección 6 detalla Gates 1-13 → ADR-033..ADR-045. Reconcilio: 13 gates explícitos en sección 6 + 2 adicionales legales en 6.3 = 15 ADRs si se contaran todos, pero el header reportó 13 ADRs nuevos (ADR-033 → ADR-047 inclusive es 15). Inconsistencia menor reportada. Esta formalización canonical respeta los 13 gates explícitos de sección 6 (1-13) con ADR-033..ADR-045.

---

## Bloque A — Gates pre-07.7 + 11.W (sesión sync ~2h)

Gates que deben cerrarse antes de iniciar FASE 07.7 (CRM Foundation) y FASE 11.W (DISC Voice Pipeline).

---

### Gate-1 — Persona-types CRM enum buyer_twins canonical

**Contexto:** Define el enum `persona_type` para la tabla `buyer_twins` en FASE 07.7.A. Decisión bloquea schema deals/leads/twins (11 migrations CRM Foundation). Sin enum cerrado, schema CRM es greenfield y todo asesor portal (FASE 13) queda bloqueado.

**Opciones:**

#### Opción A — Enum canonical 4-valor (recomendado doc 04)
- **Descripción:** `persona_type ENUM('buyer_self', 'asesor_lead', 'investor', 'masterbroker')` cerrado en migration v37.
- **Pros:**
  - Cobertura 100% de personas asesor + comprador + inversionista identificadas en doc 03 RICE
  - Cardinalidad baja → indexable + filtros simples
  - Compatible con C1.10 buyer twin preloaded (FASE 13.B) sin retrofit
- **Contras:**
  - Cerrar a 4 puede excluir family_unit head (resuelto vía tabla `family_units` separada — doc 04 sec 1.1)
  - Migration enum extension futura requiere downtime corto si se necesita 5to valor
- **Costo:** 0h adicional (cubierto en 17h sub-bloque 07.7.A).

#### Opción B — Enum extendido 6-valor (incluye family_head + tenant)
- **Descripción:** Agregar `family_head` y `tenant_referrer` al enum desde v37.
- **Pros:**
  - Anticipa multigen FASE 20.F + STR cross-tenant cases
  - Evita migration extension futura
- **Contras:**
  - Doc 04 sec 1.1 mapea `family_units` como tabla separada normalizada (memoria `feedback_arquitectura_escalable_desacoplada` aplicada) — duplicar en enum es inconsistente
  - Cardinality bloat con valores que tendrán <5% de filas H1
- **Costo:** +2h schema design + tests adicionales.

#### Opción C — Schema-less `persona_type TEXT` con CHECK constraint flexible
- **Descripción:** Columna libre con check de set de valores permitidos validado en app layer.
- **Pros:**
  - Máxima flexibilidad H1, pivot rápido sin migration
  - Permite experimentar con personas emergentes
- **Contras:**
  - Viola memoria "arquitectura escalable desacoplada" (text libre vs enum tipado)
  - Sin enforcement BD, riesgo data-quality issues 18+ meses post-launch
  - Indexes menos eficientes vs enum nativo
- **Costo:** -1h H1, +20h refactor previsible H2.

**Recomendación PM:** Opción A — `buyer_self · asesor_lead · investor · masterbroker`. Doc 04 sec 6.1 lo recomienda explícitamente; cardinality apropiada; family/tenant casos cubiertos vía tablas normalizadas separadas (consistente con memoria arquitectura escalable desacoplada).

**Timing:** pre-FASE 07.7.A (antes migration v37).

**Bloquea:** 11 directos + 15 cascade = 26 features. Top 3: C1.10 Buyer twin preloaded (RICE 5,893), C1.11 Portal-to-CRM auto-capture (RICE 7,700), C1.18 DISC perfil (depende de buyer_twins schema).

**ADR target:** ADR-033.

**Referencias:** 04_ROADMAP sec 6.1 · sec 1.1 · 03_RICE secciones blockers · feedback_arquitectura_escalable_desacoplada (memoria canonizada)

---

### Gate-2 — Referral engine polymorphic vs split

**Contexto:** Decide si `referrals` es UNA tabla polimórfica (referrer_type + referrer_id) o múltiples tablas separadas (asesor_referrals, comprador_referrals, dev_referrals). Bloquea FASE 07.7.B operaciones + family_units. Cross-capa con FASE 22.B (T.2.4 Referral magic link RICE 8,750 + C3.F11).

**Opciones:**

#### Opción A — Polymorphic única tabla `referrals` (recomendado doc 04)
- **Descripción:** Tabla `referrals (id, referrer_type, referrer_id, referee_id, source, payout_pct, ...)` con polymorphic association.
- **Pros:**
  - Consolidación cross-capa #5 según doc 04 sec 6.1 (un engine sirve T.2.4 + C3.F11 + asesor recruit)
  - Schema único = analytics consistentes + retention logic uniforme
  - Memoria "arquitectura escalable desacoplada" aplica: tabla normalizada con FKs typed
- **Contras:**
  - Polymorphic requiere CHECK constraint validando referrer_type vs FK destino (pero manejable con triggers)
  - Queries complejas requieren CASE en JOIN
- **Costo:** Cubierto en 17h sub-bloque 07.7.B.

#### Opción B — Split engines por persona (3 tablas)
- **Descripción:** `asesor_referrals`, `comprador_referrals`, `developer_referrals` separadas.
- **Pros:**
  - FKs estrictas sin polymorphic gymnastics
  - Queries más simples por dominio
- **Contras:**
  - Triplica engine code (payout calc, tracking, analytics) → contradice memoria arquitectura
  - Imposible cross-persona referrals (asesor refiere comprador → cuál tabla?)
  - +30h estimado vs Opción A
- **Costo:** +30h H1, +alto mantenimiento.

#### Opción C — Hybrid: tabla `referrals` polymorphic + view tipadas por persona
- **Descripción:** Tabla base polymorphic + materialized views por tipo para queries hot-path.
- **Pros:**
  - Mejor performance queries específicas
  - Mantiene single source of truth
- **Contras:**
  - Overkill H1 (volumen referrals < 10k esperado año 1)
  - Views materializadas requieren refresh cron + invalidation logic
- **Costo:** +12h H1 vs Opción A.

**Recomendación PM:** Opción A — Polymorphic única. Doc 04 sec 6.1 lo recomienda como "consolidación cross-capa #5". Doc 03 RICE T.2.4 (8,750) requiere engine único cross-persona. Memoria arquitectura escalable desacoplada satisfecha via tabla normalizada con type discriminator.

**Timing:** pre-FASE 07.7.B (antes migration v38).

**Bloquea:** 4+ features. Top 3: T.2.4 Referral magic link perfil (RICE 8,750), C3.F11 Referral engine asesor, C1.30 Community asesores (FASE 34 H2).

**ADR target:** ADR-034.

**Referencias:** 04_ROADMAP sec 6.1 · sec 8.3 (T.2.4+C3.11 unified) · 03_RICE T.2.4

---

### Gate-3 — Retention CFDI-aware multi-país

**Contexto:** Define política de retención de datos CRM (leads, deals, contactos) por país considerando obligaciones fiscales/legales. MX CFDI requiere 5 años retención fiscal; otros países distintos. Bloquea FASE 07.7.C (audit + behavioral signals).

**Opciones:**

#### Opción A — Retention diferenciada por país (recomendado doc 04)
- **Descripción:** `retention_period` derivado de `country_code`: MX 5y, CO 10y, AR 7y, BR 7y. Job archive automático post-window.
- **Pros:**
  - Compliance estricto LFPDPPP (MX) + Ley 1581 (CO) + LPDP (AR) + LGPD (BR)
  - Memoria "i18n everywhere + multi-country formatters" extendida a retention policy
  - Auditable + defendible en review legal
- **Contras:**
  - Requiere CFDI-aware archival logic (no simplemente delete; CFDI vinculados deben preservarse)
  - Cron job archive complejo (segregar PII vs fiscal)
- **Costo:** Cubierto en 14h sub-bloque 07.7.C.

#### Opción B — Retention única conservadora 10y todos países
- **Descripción:** Política única 10 años todos los países.
- **Pros:**
  - Simple, sin lógica país-específica
  - Cobertura legal máxima
- **Contras:**
  - Viola minimization principle GDPR/LGPD/LFPDPPP (datos PII sin propósito post-5y MX)
  - Aumenta storage costs ~60% vs Opción A
  - Puede generar liability en data breach (más datos = más exposure)
- **Costo:** -8h H1, +costos storage permanentes.

#### Opción C — Retention agresiva 3y todos países con override manual
- **Descripción:** 3 años default, asesor puede flagger casos específicos para extensión.
- **Pros:**
  - Storage mínimo, privacy-first
- **Contras:**
  - Viola CFDI MX 5y obligatorio fiscal
  - Riesgo audit fiscal SAT con datos faltantes
  - Manual overrides crean inconsistencia compliance
- **Costo:** RIESGO ALTO compliance fiscal MX.

**Recomendación PM:** Opción A — Retention diferenciada `MX 5y · CO 10y · AR 7y · BR 7y`. Doc 04 sec 6.1 lo recomienda explícito; alinea con principio multi-country formatters (regla 9 CLAUDE.md); CFDI-aware preserva fiscal sin sobre-retener PII.

**Timing:** pre-FASE 07.7.C (antes migration audit + signals).

**Bloquea:** Audit trail compliance + behavioral signals retention. Top 3: C1.27 Asesor report card (auditable), C2.29 Transparency Index (RICE 6,213, fuente datos retention), C3.18 Social proof (data freshness window).

**ADR target:** ADR-035.

**Referencias:** 04_ROADMAP sec 6.1 · CLAUDE.md regla 9 multi-country · 02_DESIGN sec i18n 16h

---

### Gate-4 — DISC framework vs Big-Five vs MBTI

**Contexto:** Decide framework psicométrico canonical para `disc_profile` columna en `buyer_twins`. Bloquea FASE 11.W.A (DISC framework canonization + privacy ADR). Sin framework definido, todo el voice pipeline + LLM classifier downstream queda greenfield.

**Opciones:**

#### Opción A — DISC 4-axis (Dominance/Influence/Steadiness/Conscientiousness) (recomendado doc 04)
- **Descripción:** Framework DISC clásico, 4 ejes, validable con consult psicómetro H1.
- **Pros:**
  - Cardinality manejable (4 dim × 0-100 score = persistible jsonb compacto)
  - Workplace/sales context = match natural con asesor coaching (C3.F3 objection playbook)
  - LLM classifier post-Whisper transcripción tiene corpus training público amplio
  - Doc 04 sec 1.2 ya wired buyer_twins col preparada
- **Contras:**
  - Validez científica menor vs Big-Five (consensus académico)
  - Requiere psicómetro consult validar adapter MX/LATAM Q2 2026
- **Costo:** Cubierto 8h sub-bloque 11.W.A + ~$3k consult externo.

#### Opción B — Big-Five (OCEAN)
- **Descripción:** 5 dim (Openness/Conscientiousness/Extraversion/Agreeableness/Neuroticism).
- **Pros:**
  - Validez científica máxima (gold standard psicometría)
  - Datasets training abundantes
- **Contras:**
  - Context académico vs ventas — interpretación menos accionable para asesor coaching
  - Neuroticism dim sensitive en consumer context (privacy concerns LFPDPPP)
  - Requiere re-training LLM classifier vs corpus DISC público
- **Costo:** +30h LLM fine-tune + consult Big-Five MX adapter.

#### Opción C — MBTI 16 tipos
- **Descripción:** 4 dichotomies → 16 personality types categorical.
- **Pros:**
  - Reconocimiento masivo público (familiar para usuarios)
- **Contras:**
  - Validez científica disputada (test-retest reliability baja)
  - Categorical (not continuous) → analytics menos granular
  - Liability legal en hiring/sales contexts (varios países restringen MBTI screening)
- **Costo:** Riesgo legal medio + retraining classifier.

**Recomendación PM:** Opción A — DISC 4-axis con consult psicómetro Q2 2026 validar. Doc 04 sec 6.1 lo recomienda; doc 04 sec 9.2 ya incluye "Validar DISC framework con psicólogo organizational consult Q2 2026". Action items downstream: T.2.1 Gemelo digital 6D + C3.F3 Objection playbook + C1.18 DISC auto-detectado todos asumen DISC en doc 04.

**Timing:** pre-FASE 11.W.A (antes migration v44).

**Bloquea:** 7 directos C3 + 4 cascade. Top 3: C3.F1 Agente WhatsApp DISC-aware, C3.F3 Objection playbook (RICE alto), T.2.1 Gemelo digital persistente (RICE 8,000).

**ADR target:** ADR-036.

**Referencias:** 04_ROADMAP sec 6.1 · sec 1.2 · sec 9.2 · 03_RICE T.2.1

---

### Gate-5 — Whisper provider audio pipeline

**Contexto:** Decide proveedor STT (speech-to-text) para audio asesor → DISC classifier. Bloquea FASE 11.W.C (Whisper integration audio pipeline, 23h, 3 migrations). Cost + latency + privacy directly affected.

**Opciones:**

#### Opción A — OpenAI Whisper API (recomendado doc 04)
- **Descripción:** API Whisper gestionada OpenAI; pay-per-minute audio.
- **Pros:**
  - Time-to-market mínimo (API ready, sin infra)
  - Multilingual nativo (es-MX, es-CO, es-AR, pt-BR, en-US) cubre 5 locales DMX
  - Costo predecible $0.006/min ≈ low risk H1 (estimado <$200/mes con <500 asesores activos)
  - Pivot revertible: Doc 04 sec 6.1 dice "OpenAI H1, pivot post-1000 samples"
- **Contras:**
  - Audio biométrico viaja a US (LFPDPPP MX consent + retention obligaciones)
  - Vendor lock-in mínimo (Whisper open-source disponible si pivot)
- **Costo:** ~$200/mes H1 + cubierto 23h sub-bloque 11.W.C.

#### Opción B — Self-hosted Whisper (open-source en Vercel/Supabase)
- **Descripción:** Whisper open-source en infra propia.
- **Pros:**
  - Zero data leaves stack (privacy max)
  - Costo marginal cero post-infra setup
- **Contras:**
  - Setup infra GPU (Vercel no soporta nativamente, requiere Modal/Replicate ~$300/mes baseline)
  - Latency variable + ops overhead H1
  - Memoria "verify before spend" sugiere validar costo empírico antes
- **Costo:** +60h infra setup + $300/mes baseline.

#### Opción C — Deepgram (managed alternativa)
- **Descripción:** Deepgram Nova STT API.
- **Pros:**
  - Latency menor que Whisper API en algunos benchmarks
  - Spanish LATAM accent claims mejor handling
- **Contras:**
  - Vendor menos consolidado que OpenAI long-term
  - Pricing por enterprise tier ~2x Whisper API
- **Costo:** ~$400/mes H1 estimado.

**Recomendación PM:** Opción A — OpenAI Whisper API H1, pivot post-1000 samples evaluando self-hosted vs Deepgram. Doc 04 sec 6.1 lo recomienda explícito. Memoria "verify before spend" aplica: validar pricing dashboard pre-signup.

**Timing:** pre-FASE 11.W.C (antes migration v46).

**Bloquea:** Voice pipeline completo. Top 3: C1.18 DISC auto-detectado audio asesor, C3.F1 Agente WhatsApp voice-aware, T.2.1 Gemelo digital voice signals.

**ADR target:** ADR-037.

**Referencias:** 04_ROADMAP sec 6.1 · feedback_verify_before_spend (memoria) · feedback_airroi_cost_empirical (lección costos APIs)

---

### Gate-6 — Privacy voice biométrico LFPDPPP/GDPR/LGPD

**Contexto:** Define flow legal opt-in para grabación voz asesor + retention audio raw. Bloquea FASE 11.W.C (Whisper integration). Voz es PII biométrico → sensitive bajo LFPDPPP MX, GDPR (futuro), LGPD BR (FASE 38).

**Opciones:**

#### Opción A — Opt-in explícito + retention 90d audio raw + transcript permanent (recomendado doc 04)
- **Descripción:** Asesor consent flow explicit pre-recording; audio raw retención 90 días post-procesado; transcript text retención CFDI-aware (Gate-3).
- **Pros:**
  - Compliance LFPDPPP estricto + GDPR-ready + LGPD BR-ready
  - Storage costs minimizados (audio raw es heavyweight)
  - Audit trail consent timestamp + version flow
- **Contras:**
  - Si modelo DISC pivot retroactive, audio borrado = no re-procesable
  - UX requiere explicit consent click (friction)
- **Costo:** Cubierto en 23h sub-bloque 11.W.C + 8h privacy ADR 11.W.A.

#### Opción B — Opt-out con retention indefinida raw audio
- **Descripción:** Default-on grabación, asesor puede desactivar; audio raw permanent.
- **Pros:**
  - Mayor data corpus para fine-tuning ML
  - UX sin friction
- **Contras:**
  - Viola LFPDPPP consent explicit para PII biométrico
  - Liability alta en breach scenarios
  - Storage costs balloon (1h audio = ~50MB × 1000 asesores × diario = ~50GB/día)
- **Costo:** RIESGO COMPLIANCE ALTO + storage $500+/mes.

#### Opción C — Opt-in + zero raw audio retention (transcript only, audio descartado on-the-fly)
- **Descripción:** Audio procesado en memoria, descartado inmediatamente post-transcript.
- **Pros:**
  - Privacy max (zero biométrico storage)
  - Storage zero raw audio
- **Contras:**
  - Imposible re-procesar audio si bug Whisper detecta post-hoc
  - Imposible re-train DISC classifier con corpus interno
  - Debug issues ML sin samples = blind
- **Costo:** Cero costo storage, alto costo blind-debugging downstream.

**Recomendación PM:** Opción A — Opt-in explícito + 90d raw + transcript CFDI-aware. Doc 04 sec 6.1 lo recomienda explícito; balance compliance + ML pivot capability + storage cost.

**Timing:** pre-FASE 11.W.C (antes migration v46) + ADR privacy en 11.W.A.

**Bloquea:** Voice pipeline shipping prod. Top 3: Todo C1.18 + C3.F1 + T.2.1 (mismas que Gate-5) + compliance audit FASE 26.

**ADR target:** ADR-038.

**Referencias:** 04_ROADMAP sec 6.1 · sec 1.2 · CLAUDE.md regla 7 (error handling Sentry) · feedback_audit_rls_allowlist

---

## Bloque B — Gates pre-11.X + 21.A + 22.A (sesión sync ~2h)

Gates que deben cerrarse antes de iniciar FASE 11.X (Properties), 21.A (WhatsApp), 22.A (Banking).

---

### Gate-7 — DMX inventory model (BLOQUEANTE más crítico)

**Contexto:** Decide modelo inventario propiedades DMX: portal-own (DMX dueño exclusivo de listings) vs MLS aggregator (agregador de fuentes externas) vs hybrid. Bloquea FASE 11.X completa (12 migrations, 132h, 9 features directos + cascade). Doc 04 sec sec ejecutivo: "Risk-1 más bloqueante: Gate-7. Sin decisión founder, FASE 11.X no arranca". Resumen ejecutivo punto 3.

**Opciones:**

#### Opción A — Hybrid: own listings + EBI/Easy Broker MX aggregator (recomendado doc 04)
- **Descripción:** Schema properties soporta listings DMX-native + ingest pipeline desde EBI MLS estándar MX (Easy Broker tiene ~80% inventory MX broker activo).
- **Pros:**
  - Cobertura inventory día-1 vía EBI sin esperar adoption asesores DMX
  - Asesor DMX puede listar exclusivo como diferenciador valor
  - Memoria "arquitectura escalable desacoplada" cumplida (provider-agnostic ingestion adapter)
  - Pivot path claro: si EBI relationship sour, swap por Inmuebles24/Vivanuncios scrapers (FASE 11.X.E adapter pattern)
- **Contras:**
  - Schema properties debe soportar `source_type` + dedupe logic (mismo listing en EBI + DMX-native)
  - Negociación EBI partnership Q2-Q3 2026 paralelo a 11.X dev
  - Costos EBI API estimados $500-2000/mes según tier
- **Costo:** Cubierto 132h FASE 11.X + ~$1k/mes EBI estimado + 20h negotiation track Manu.

#### Opción B — Portal-own exclusivo (DMX-native only)
- **Descripción:** Solo listings ingresados por asesor DMX directamente.
- **Pros:**
  - Quality control max (asesor verifica)
  - Diferenciador claro vs Inmuebles24
  - Cero dependencias externas
- **Contras:**
  - Inventory bootstrap H1 lento (chicken-and-egg: comprador no entra sin inventory; asesor no lista sin comprador)
  - Estimado 6-12 meses inventory <500 listings — kills T-capa value prop comprador
  - Doc 03 RICE cascade: T.1.1 + T.1.2 + T.2.5 (combined RICE >29k) sin inventory = imposibles
- **Costo:** -$1k/mes EBI ahorrado, +6 meses time-to-value.

#### Opción C — MLS aggregator puro (sin DMX-native listings)
- **Descripción:** DMX es solo capa search/intel sobre EBI/Inmuebles24 inventory.
- **Pros:**
  - Inventory día-1 garantizado
  - Costo dev mínimo schema (read-only)
- **Contras:**
  - Cero diferenciador inventory vs Inmuebles24 (mismo backing)
  - Asesor DMX no puede listar exclusive
  - Modelo monetización débil (no marketplace nativo)
  - Viola tesis DMX como "category creator" (queda como portal más)
- **Costo:** -50h dev (read-only), -alto valor estratégico.

**Recomendación PM:** Opción A — Hybrid own + EBI aggregator. Doc 04 sec 6.2 lo recomienda explícito y resumen ejecutivo lo marca como "sweet spot estructural". Doc 04 sec 9.2 ya incluye "Resolver Gate-7 PRE-Q1 2027 para no slipear FASE 11.X". Memoria "arquitectura escalable desacoplada" cumplida vía adapter pattern.

**Timing:** pre-FASE 11.X.A (BLOQUEANTE más crítico antes Q1 2027).

**Bloquea:** 11 directos + 5 cascade = 16 features. Top 3: C2.F1 AVM con spread (RICE 8,385), C2.F2 Price truth meter (RICE 9,625), C5.4.1 Portfolio inversor (RICE 292 pero T-capa entera depende).

**ADR target:** ADR-039.

**Referencias:** 04_ROADMAP sec 6.2 · sec 1.3 · resumen ejecutivo punto 3 · sec 9.2 · 03_RICE blockers

---

### Gate-8 — Asset class scope H1

**Contexto:** Define qué asset classes soporta FASE 11.X H1: residential-only (casas+depas) vs full (residential + comercial + terreno + industrial). Bloquea schema properties sub-bloque 11.X.A.

**Opciones:**

#### Opción A — Residential + comercial + terreno (recomendado doc 04)
- **Descripción:** 3 asset classes H1: residential, comercial, terreno.
- **Pros:**
  - Cobertura 95% transacciones MX residencial-leaning
  - Inversor (FASE 23) requiere comercial + terreno para portfolio diversification
  - Schema único `properties.asset_class ENUM(...)` no requiere fragmentación
- **Contras:**
  - Comercial + terreno tienen amenities/atributos distintos (resuelto via `property_units` + jsonb attributes)
  - Validators distintos por asset class (overhead +15h)
- **Costo:** Cubierto 26h sub-bloque 11.X.A.

#### Opción B — Residential-only H1
- **Descripción:** Solo casas + depas H1; comercial/terreno H2.
- **Pros:**
  - Schema simple, validation focus
  - Time-to-market faster
- **Contras:**
  - FASE 23 Inversionista (12 features RICE >50k combined) imposible H1 sin comercial/terreno
  - Doc 04 sec 1.3 lista "desarrollador (project listings)" persona — terreno crítico
  - Retrofit asset_class ENUM extension migration H2 = ~40h
- **Costo:** -15h H1, +40h retrofit H2.

#### Opción C — Full incluyendo industrial + agropecuario
- **Descripción:** 5 asset classes H1.
- **Pros:**
  - Cobertura completa día-1
- **Contras:**
  - Industrial + agropecuario son <2% transacciones LATAM consumer-facing
  - Validators + UI surfaces para asset classes con <2% volumen = bajo ROI
  - Bloat schema sin beneficio H1
- **Costo:** +40h sin retorno H1.

**Recomendación PM:** Opción A — Residential + comercial + terreno H1. Doc 04 sec 6.2 lo recomienda explícito. Cobertura suficiente FASE 13-23; industrial/agropecuario diferible H2 si demand emerge.

**Timing:** pre-FASE 11.X.A (antes migration v52).

**Bloquea:** Schema properties + 11.X downstream + FASE 15 Desarrollador (terreno necesario) + FASE 23 Inversionista. Top 3: C5.4.1 Portfolio inversor, FASE 15 Developer onboarding completo, C2.F1 AVM (segmenta por asset_class).

**ADR target:** ADR-040.

**Referencias:** 04_ROADMAP sec 6.2 · sec 1.3 · 02_DESIGN sec property components

---

### Gate-9 — STR collision split vs merge

**Contexto:** Decide si Short-Term Rental listings (Airbnb tipo) viven en `properties` table o tabla separada `str_listings`. Conflict: AirROI data shape ≠ residential data shape (occupancy + ADR vs price + rooms). Bloquea schema sub-bloque 11.X.A.

**Opciones:**

#### Opción A — Split H1 (str_listings tabla separada), unify H2 (recomendado doc 04)
- **Descripción:** `str_listings` tabla separada con AirROI ingest pipeline; FK opcional a `properties`. H2 evaluar merge con vista unificada.
- **Pros:**
  - AirROI data nativo (occupancy, ADR, RevPAR) sin contaminar properties schema
  - Memoria "AirROI cost empírico" aplicable: pipeline aislado optimiza calls $0.10/call
  - Pivot path claro H2: si pattern emerge, merge view materializada
- **Contras:**
  - Cross-join queries (mismo physical property en STR + sale) requieren JOINS extra
  - Duplicación validation logic property-level
- **Costo:** Cubierto 26h sub-bloque 11.X.A + 21h media (foto STR distinta).

#### Opción B — Merge desde día-1 (single properties table)
- **Descripción:** Properties unifica residential + STR vía `listing_intent ENUM('sale', 'rent_long', 'rent_str')`.
- **Pros:**
  - Schema simple, single source of truth
  - Cross-listings nativos
- **Contras:**
  - AirROI fields (occupancy, ADR) son nullable para non-STR → schema bloat
  - Performance queries STR-specific degrades (filter en sparse cols)
  - Memoria "arquitectura escalable desacoplada" aplica negativamente: jsonb inline en properties para STR-only fields = anti-pattern
- **Costo:** -10h H1, +30h refactor probable H1.5.

#### Opción C — Split permanente (nunca unify)
- **Descripción:** STR siempre tabla separada, sin path unify futuro.
- **Pros:**
  - Schemas optimizados independientemente long-term
- **Contras:**
  - Doc 04 sec 6.2 explicit dice "unify H2" — opción C divergente
  - Cross-listings analysis siempre requiere multi-table joins
- **Costo:** Igual a Opción A H1, +tech-debt H2+ permanente.

**Recomendación PM:** Opción A — Split H1, unify H2. Doc 04 sec 6.2 lo recomienda explícito. AirROI data shape diferente justifica split inicial; H2 cuando volumen permita evaluar merge.

**Timing:** pre-FASE 11.X.A (antes migration v52).

**Bloquea:** STR features ya shipped pero unwired. Top 3: C5.4.3 STR investor surface (ya shipped no investor-surfaced, doc 04 sec 8.2#5), AirROI cost optimization, C2.F2 Price truth meter (excluye STR de comparable sale).

**ADR target:** ADR-041.

**Referencias:** 04_ROADMAP sec 6.2 · sec 1.3 · sec 8.2#5 · feedback_airroi_cost_empirical (memoria)

---

### Gate-10 — WhatsApp provider Twilio vs Meta WA Cloud (BLOQUEANTE)

**Contexto:** Decide proveedor WhatsApp Business API: Twilio vs Meta WA Cloud Direct. Bloquea FASE 21.A.A (Provider abstraction). Doc 04 lista como BLOQUEANTE. 8 directos + 12 cascade WA notifs.

**Opciones:**

#### Opción A — Twilio Programmable Messaging H1 (recomendado doc 04)
- **Descripción:** Twilio como provider H1 con abstraction layer (memoria arquitectura escalable desacoplada).
- **Pros:**
  - Time-to-market: WABA Embedded Signup Twilio = 1-3 días aprobación Meta
  - Multi-channel revertible (Twilio soporta SMS/Voice si pivot)
  - Pricing predecible $0.005/msg utility + $0.025-0.10 marketing tiers
  - Doc 04 sec 1.4 ya wired adapter pattern
- **Contras:**
  - Margen Twilio sobre Meta directo (+15-20% costo)
  - Vendor dependency (mitigado vía abstraction)
- **Costo:** Cubierto 76h FASE 21.A + ~$200-500/mes H1 estimado.

#### Opción B — Meta WA Cloud Direct
- **Descripción:** Integración directa con Meta WhatsApp Cloud API.
- **Pros:**
  - Costo más bajo (sin Twilio markup)
  - Latency menor (1 hop menos)
- **Contras:**
  - WABA verification path Meta direct = 2-6 semanas (vs 1-3 días Twilio Embedded)
  - Setup Business Manager + verification documentation Meta heavy lift Manu
  - Sin SMS/Voice fallback nativo
- **Costo:** -$100/mes ahorro pero +2-6 semanas time-to-launch FASE 21.A.

#### Opción C — Hybrid Twilio H1 + Meta direct migration H2
- **Descripción:** Start Twilio, migrar Meta direct cuando volumen >100k msg/mes.
- **Pros:**
  - Best of both: speed H1 + cost H2
- **Contras:**
  - Doble integración + migration cost ~40h
  - Templates re-approval Meta required al switch
- **Costo:** +40h H2 migration vs Opción A baseline.

**Recomendación PM:** Opción A — Twilio H1 con abstraction layer revertible. Doc 04 sec 6.2 lo recomienda explícito; doc 04 sec 9.2 incluye "WABA Twilio Embedded Signup arrancar Q2 2027". Abstraction permite Opción C tarde sin compromisos H1.

**Timing:** pre-FASE 21.A.A (antes Q2 2027).

**Bloquea:** 8 directos + 12 cascade WA notifs = 20 features. Top 3: C3.F1 Agente WhatsApp DISC-aware, T.2.6 Post-compra alertas WA channel (RICE 10,000), C3.F17 WA broadcasts asesor.

**ADR target:** ADR-042.

**Referencias:** 04_ROADMAP sec 6.2 · sec 1.4 · sec 9.2 · feedback_arquitectura_escalable_desacoplada (abstraction)

---

### Gate-11 — WABA verification path

**Contexto:** Define ruta verification WhatsApp Business Account. Bloquea FASE 21.A.B (Templates + WABA approval flow).

**Opciones:**

#### Opción A — Twilio Embedded Signup (recomendado doc 04)
- **Descripción:** Twilio Embedded Signup wizard guía Meta verification 1-3 días.
- **Pros:**
  - Time-to-approval mínimo (1-3 días vs 2-6 semanas direct)
  - Twilio handles edge cases verification documentation
  - Asume Gate-10 Opción A (Twilio provider) — consistente
- **Contras:**
  - Tied to Twilio (mitigado por Gate-10 ya commits Twilio H1)
- **Costo:** Cubierto 18h sub-bloque 21.A.B.

#### Opción B — Meta direct via Business Manager
- **Descripción:** Verification self-service Meta directo.
- **Pros:**
  - Independent de Twilio path
- **Contras:**
  - 2-6 semanas con back-and-forth documentation Meta
  - Manu tiempo non-trivial gestionando docs corporativos
- **Costo:** +20-40h Manu time, +5 semanas wall-clock estimado.

#### Opción C — 360dialog / Vonage / otro BSP
- **Descripción:** Otro Business Solution Provider.
- **Pros:**
  - Pricing alternativo si Twilio cambia tier
- **Contras:**
  - Inconsistent con Gate-10 Twilio decision
  - Sin lock-in compelling reason
- **Costo:** Similar Twilio path, sin valor delta H1.

**Recomendación PM:** Opción A — Twilio Embedded Signup. Doc 04 sec 6.2 lo recomienda explícito; consistente con Gate-10 A; minimiza Manu time gestión Meta direct.

**Timing:** pre-FASE 21.A.B (post Gate-10 cerrado, Q2 2027).

**Bloquea:** Template approval + send pipeline. Top 3: Templates utility (12 H1) + marketing (initial 4) — see Gate-12.

**ADR target:** ADR-043.

**Referencias:** 04_ROADMAP sec 6.2 · sec 1.4

---

### Gate-12 — Templates initial scope (12 vs 25)

**Contexto:** Define cuántos templates WA aprobados Meta inicial H1. Cada template requiere review Meta separado (1-3 días each).

**Opciones:**

#### Opción A — 12 templates H1 (8 utility + 4 marketing) (recomendado doc 04)
- **Descripción:** 8 utility (transactional: appointment confirmed, lead replied, doc uploaded, payment received, deal closed, milestone reached, alert plusvalía, opt-in welcome) + 4 marketing (broadcast asesor, newsletter, promo, referral).
- **Pros:**
  - Cobertura 80% use cases C3 + T.2.6 + C3.F17
  - Approval batch 12 = ~2 semanas Meta sequential
  - Iteration room (extender 12 → 25 H1.5 sin block)
- **Contras:**
  - Algunos casos edge requieren template improvisado (delay each ~1-3 días)
- **Costo:** Cubierto 18h sub-bloque 21.A.B.

#### Opción B — 25 templates H1 (15 utility + 10 marketing)
- **Descripción:** Cobertura amplia día-1.
- **Pros:**
  - Zero block templates downstream Q3-Q4 2027
- **Contras:**
  - Approval batch 25 = ~6 semanas Meta (sequential review)
  - Bloquea start FASE 21.A.B 4 semanas adicionales
- **Costo:** +20h template authoring + 4 semanas wall-clock.

#### Opción C — 6 templates mínimo viable
- **Descripción:** Solo 6 utility críticos H1.
- **Pros:**
  - Approval rápido <1 semana
- **Contras:**
  - Marketing broadcasts (C3.F17, RICE alta) bloqueado H1
  - C3.F1 Agente WhatsApp con templates insuficientes
- **Costo:** Bloquea features alta-RICE.

**Recomendación PM:** Opción A — 12 H1 (8 utility + 4 marketing). Doc 04 sec 6.2 lo recomienda explícito. Sweet spot cobertura vs approval timeline.

**Timing:** pre-FASE 21.A.B (post Gate-10 + Gate-11).

**Bloquea:** WA send capabilities. Top 3: C3.F17 WA broadcasts, T.2.6 Post-compra alertas (templates utility), C3.F11 Referral magic link (template utility).

**ADR target:** ADR-044.

**Referencias:** 04_ROADMAP sec 6.2 · sec 1.4

---

### Gate-13 — Banking integration path (BLOQUEANTE)

**Contexto:** Define ruta integración bancaria/financiera para mortgage simulator + INFONAVIT/FOVISSSTE rules. Bloquea FASE 22.A completa (60h, 7 migrations). Doc 04 lista como BLOQUEANTE. T.1.2 Financial clarity (RICE 14,167 — top-4 H1) imposible sin esto.

**Opciones:**

#### Opción A — Static-rates + partner-broker negotiation track parallel (recomendado doc 04)
- **Descripción:** H1: Static rate sheets MX (BBVA/Santander/HSBC top-5 + INFONAVIT + FOVISSSTE) updated cuarterly manualmente; partner-broker negotiation track Q2-Q4 2026 paralelo.
- **Pros:**
  - Time-to-market H1 garantizado (no depende negociación partner)
  - Memoria "verify before spend" cumplida (zero gasto signup APIs sin validar)
  - Static stubs permiten wirear T.1.2 + C3.F19 + T.1.5 H1
  - Pivot path: partner-broker H2 si negotiation success
- **Contras:**
  - Rates manualmente quarterly = staleness 0-3 meses (mitigable con flag "última actualización")
  - Sin live API = no instant pre-approval H1 (deferible H2)
- **Costo:** Cubierto 60h FASE 22.A + 30h Manu negotiation track Q2-Q4 2026.

#### Opción B — Partner-broker direct H1 (negotiation pre-launch)
- **Descripción:** Negociar partner broker (e.g., Sofiex, Crédito Justo) integration ANTES launch FASE 22.A.
- **Pros:**
  - Live rates día-1 + instant pre-approval value prop
- **Contras:**
  - Negotiation ciclos LATAM banking ~6-12 meses unpredictable
  - Bloquea FASE 22.A si negotiation falla → cascade entire H1 buyer T-capa
  - Memoria "verify before spend" violated (signup pre-validation imposible)
- **Costo:** RIESGO ALTO timeline.

#### Opción C — INFONAVIT API only H1, banks H2
- **Descripción:** Solo INFONAVIT + FOVISSSTE rules H1, banking comercial H2.
- **Pros:**
  - INFONAVIT/FOVISSSTE cubre 60% mortgages MX
- **Contras:**
  - Excluye 40% buyers comercial banking
  - C3.F19 Financing simulator (RICE 6,250) incompleto
  - INFONAVIT API public + free pero requiere registration enterprise (timeline ~2 meses)
- **Costo:** -30h dev, -40% buyer coverage.

**Recomendación PM:** Opción A — Static-rates H1 + partner-broker negotiation track parallel. Doc 04 sec 6.2 lo recomienda explícito; resumen ejecutivo "Sin Banking APIs, T.1.2 imposible" mitigado vía static stubs day-1; doc 04 sec 9.2 incluye "Iniciar Banking partnership negotiation track Q2 2026 paralelo". Memoria "stubs permanentes H1" aplica.

**Timing:** pre-FASE 22.A.A (antes Q2 2027 + Manu inicia negotiation Q2 2026).

**Bloquea:** 4 directos + 7 cascade = 11 features. Top 3: T.1.2 Financial clarity (RICE 14,167), C3.F19 Financing simulator (RICE 6,250), T.1.5 GPS financiero enganche (RICE 8,750).

**ADR target:** ADR-045.

**Referencias:** 04_ROADMAP sec 6.2 · sec 1.5 · resumen ejecutivo punto 4 · sec 9.2 · feedback_verify_before_spend (memoria) · reference_credentials_status (stubs permanentes H1)

---

## Adicionales gates legales (post-mini-fases, no bloquean arranque)

Doc 04 sec 6.3 menciona 2 gates adicionales legales post-mini-fase shipping. Trackeados pero NO bloquean arranque mini-fase ni listados como Gates 1-13 canonical (bloquean shipping prod específico, no scope dev).

- **ADR-046 Legal status DMX** (simulador-only vs broker-regulado CONDUSEF) — pre-FASE 22.A.B shipping prod
- **ADR-047 Lenders coverage initial** (top-5 + INFONAVIT + FOVISSSTE) — pre-FASE 22.A.A seed

Estos serán formalizados en sub-sesión 07.6.F separada o en ADR drafts post-formalización Gates 1-13.

---

## Resumen ejecutivo

| Gate | Título | Bloque | Mini-fase | Bloquea features | Timing | Recomendación PM | ADR |
|------|--------|--------|-----------|------------------|--------|------------------|-----|
| 1 | Persona-types CRM enum buyer_twins | A | 07.7.A | 26 (11 dir + 15 cascade) | pre-07.7.A | A — 4-valor canonical | 033 |
| 2 | Referral engine polymorphic vs split | A | 07.7.B | 4+ | pre-07.7.B | A — Polymorphic única | 034 |
| 3 | Retention CFDI-aware multi-país | A | 07.7.C | Audit + signals retention | pre-07.7.C | A — Diferenciada por país | 035 |
| 4 | DISC framework vs Big-Five vs MBTI | A | 11.W.A | 11 (7 dir + 4 cascade) | pre-11.W.A | A — DISC 4-axis + consult | 036 |
| 5 | Whisper provider audio pipeline | A | 11.W.C | Voice pipeline | pre-11.W.C | A — OpenAI H1 pivot post-1000 | 037 |
| 6 | Privacy voice biométrico | A | 11.W.C | Voice prod shipping | pre-11.W.C | A — Opt-in + 90d raw + transcript CFDI | 038 |
| 7 | DMX inventory model (BLOQUEANTE) | B | 11.X.A | 16 (11 dir + 5 cascade) | pre-11.X.A | A — Hybrid own + EBI | 039 |
| 8 | Asset class scope H1 | B | 11.X.A | Schema + 15 + 23 | pre-11.X.A | A — Residential + comercial + terreno | 040 |
| 9 | STR collision split vs merge | B | 11.X.A | STR features wire | pre-11.X.A | A — Split H1, unify H2 | 041 |
| 10 | WA provider Twilio vs Meta (BLOQ) | B | 21.A.A | 20 (8 dir + 12 cascade) | pre-21.A.A | A — Twilio H1 abstraction | 042 |
| 11 | WABA verification path | B | 21.A.B | Template send pipeline | pre-21.A.B | A — Twilio Embedded Signup | 043 |
| 12 | Templates initial scope 12 vs 25 | B | 21.A.B | WA send capabilities | pre-21.A.B | A — 12 (8 utility + 4 marketing) | 044 |
| 13 | Banking integration path (BLOQ) | B | 22.A.A | 11 (4 dir + 7 cascade) | pre-22.A.A | A — Static-rates + partner track | 045 |

**Distribución:** Bloque A 6 gates · Bloque B 7 gates · Total 13 gates.
**ADR range:** ADR-033 → ADR-045 (13 ADRs nuevos para Gates 1-13).
**ADR adicionales legales (sec 6.3):** ADR-046, ADR-047 (no bloquean arranque).
**Bloqueos críticos marcados (BLOQUEANTE):** Gate-7 (inventory), Gate-10 (WA provider), Gate-13 (Banking).
**Sesiones founder review estimadas:** 2 × ~2h síncronas = ~4h founder time total.
**Recomendación uniforme:** Opción A en los 13 gates (alineado con doc 04 sec 6 explicit).

---

## Sorpresas e inconsistencias detectadas

1. **Inconsistencia ADR count en doc 04:** Resumen ejecutivo y sec 1.6 reportan "13 ADRs nuevos (ADR-033 → ADR-047)", pero rango ADR-033..ADR-047 inclusive son 15 ADRs. Reconciliación: 13 gates explícitos sec 6 + 2 adicionales legales sec 6.3 = 15 ADRs total. El "13 nuevos" del resumen ejecutivo se refiere a Gates 1-13, no incluye ADR-046/047 legales adicionales. Documenté en sección "Estado" arriba.

2. **Gates 2 y 6 tienen dual mapping en doc 04 sec 1.4 + 1.5:** Sec 1.4 dice "Gate-2 ADR-042 Twilio vs Meta WA Cloud BLOQUEANTE" (re-expresión de Gate-2 referral en contexto WA). Sec 1.5 dice "Gate-6 ADR-045 Banking integration path BLOQUEANTE" (re-expresión Gate-6 privacy en contexto Banking). Esto es notación "Gate-X-rexp" en tabla resumen 1.6 — el doc reusa números 2 y 6 dual-purpose para mini-fase 21.A y 22.A respectivamente. **Resolución canonical:** Cada gate tiene UN número único (1-13) en sec 6.1/6.2; la dual-mapping de sec 1.4/1.5 era atajo del autor — formalización canonical aquí asigna ADR único por gate (Gate-2 = ADR-034 referral; Gate-10 = ADR-042 WA provider; Gate-6 = ADR-038 privacy; Gate-13 = ADR-045 Banking). Sin esta clarificación, sub-fases 21.A y 22.A leerían inconsistencia gate-numbering.

3. **Gate-7 listado como "Risk-1 más bloqueante" en resumen ejecutivo punto 3 y "BLOQUEANTE" en sec 6.2, pero doc 04 sec 9.3 tabla riesgos lo marca probabilidad "Alta" impacto "+2 Q":** Consistente — pero sub-fase 11.X tiene trigger "Gate-7 founder cerrado + tag 11.W complete" por sec 1.3, lo cual implica que si Gate-7 NO se cierra Q2 2026, FASE 11.X NO arranca y todo el critical path post-FASE 14 (FASE 15 + 17 + 18 + 20 + 23) cascade a delay. Recomendación: priorizar Gate-7 en sesión Bloque B founder review síncrona y considerar moverlo a Bloque A si timeline lo permite.

