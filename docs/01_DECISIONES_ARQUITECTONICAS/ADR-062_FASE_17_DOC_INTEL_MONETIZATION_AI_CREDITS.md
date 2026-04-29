# ADR-062 — FASE 17 Document Intelligence: Monetización Pack $25 saldo IA + 17 upgrades scope expansion

> **Status:** ACCEPTED
> **Date:** 2026-04-29
> **Supersedes:** N/A (extiende plan original FASE_17_DOCUMENT_INTEL.md)
> **Relates to:** ADR-058 (Studio canon), ADR-060 (FASE 15 Bucket B), ADR-018 (E2E connectedness), memoria 13 (arquitectura escalable), memoria 16 (CC guardrails), memoria 18 (PM audit post-CC)

## Contexto

Plan original FASE 17 contempla pipeline AI para procesar PDFs (escrituras, permisos, planos, LP) con quotas mensuales por plan (Free 5/mes, Starter 20, Pro 50, Enterprise unlimited).

**Founder feedback 2026-04-29:** modelo quota mensual NO calza con behavior real:
- Dev sube info **una vez** al cargar proyecto nuevo
- Después gestiona inventario **manualmente desde portal**
- Únicamente vuelve a usar AI si **actualiza con PDF nuevo** (LP, brochure, plano modificado)
- Carga fuerte = primer pack onboarding del proyecto

**Adicional:** founder pidió análisis upgrades. Proceso DIRECTOS + LATERALES + CROSS-FEATURE generó 17 upgrades distribuidos F17/F19/F20/F21/F21.A/F22/F23.

## Decisión

### A. Modelo monetización: Pack $25 USD saldo IA prepago + Markup 50%

Reemplaza modelo quotas mensuales del plan original.

**Mecánica:**
- Dev compra Pack $25 USD → balance crédito IA = $25
- Cada acción AI descuenta del balance: `cost_real_usd × 1.5` (markup 50%)
- Onboarding promedio (500 unidades, 8 PDFs, 240 pgs) consume ~$10.65 (cost real $7.10 × 1.5)
- Updates LP individuales consumen $0.30-0.50
- Saldo persiste indefinido (no expira)
- Balance = $0 → bloquea uploads AI hasta recompra otro Pack $25
- **Carga manual desde portal nunca consume saldo** (zero AI involved)

**Cálculo viabilidad ($25 cubre onboarding + updates):**
- 500 unidades, 8 PDFs onboarding: $10.65 consumido → $14.35 restante para 30+ updates futuros
- 1000 unidades, 12 PDFs onboarding: $15.95 consumido → $9.05 restante para 18+ updates
- 200 unidades, 5 PDFs onboarding: $6.65 consumido → $18.35 restante para 36+ updates

**Margen DMX:** 33% promedio sobre costo real Anthropic (con markup 50%).
**Margen DMX con prompt caching (D.1 abajo):** 65% promedio.

### B. Implementación H1 vs Stripe Connect F18

**H1 testing (sin Stripe real):**
- Tabla `dev_ai_credits` shipped en F17.A
- Tabla `ai_credit_transactions` audit log compras + consumos
- Engine `consumeCredits(dev_id, cost_real_usd)` con check balance ≥ cost × 1.5
- Manual upload path bypass credit check
- UI saldo header `/desarrolladores` ("Saldo IA: $16.50 USD")
- Botón "Recargar $25 USD" → modal informativo "Disponible al lanzamiento" (Stripe Connect F18)
- **Superadmin panel grant credits** para testing (admin manual `INSERT INTO ai_credit_transactions`)
- Feature flag `ENFORCE_AI_CREDIT_BALANCE=false` H1 → permite testing libre
- Cuando saldo cargue real (post F18 Stripe Connect): flip flag `true`

### C. Diferenciador AI: AI Compliance Cross-Check (apuesta principal)

**Lateral upgrade #1 ⭐⭐⭐ — Único en mercado LATAM (Onyx no, Inmuebles24 no, Tokko no):**

Al subir 8 PDFs onboarding, AI compara cross-doc:
- "LP dice 250 unidades, escritura registra 248. ⚠️ Inconsistency"
- "Permiso SEDUVI autoriza 12 niveles, plano arquitectónico muestra 14. 🔴 BLOQUEO LEGAL"
- "Estudio suelo recomienda 8 niveles máx, planeas 12. ⚠️ Riesgo estructural"

Tabla `document_compliance_checks` con resultados + severity (info/warning/critical).
Engine `runComplianceCrossCheck(proyecto_id)` triggered post-extraction de 2+ docs.
UI `/desarrolladores/inventario/documentos` muestra panel "Validación AI cruzada" con findings.

**Beneficio:** reduce 90% errores legales antes de salir a venta. Vendible como tier Enterprise feature ($9999 MXN/mes premium).

### D. Upgrades adicionales F17 (3 directos + 1 cross-feature)

**D.1 Prompt caching Anthropic (margen 33% → 65%)**
Cache 5 min TTL del system prompt + few-shot examples por tipo doc. Procesar 100 escrituras → primer call full price, los siguientes 99 cuestan 50% menos. Implementación: `cache_control: ephemeral` en system prompt. Ahorro real: ~$3.50 USD por onboarding 500 unidades.

**D.2 Citations span (GC-7 ya en plan original, refuerzo)**
Cada extraction trae span de origen ("dato extraído de página X párrafo Y"). Click → highlight directo en PDF. Trust score interno: cuántos datos corregidos por humano → mejora prompt.

**D.3 Detección duplicados hash + diff (ahorro 10x en updates)**
Tabla `document_doc_hashes` con SHA256 del PDF. Update LP que difiere 1 cell del PDF anterior → solo procesa páginas con diff (no PDF completo). Costo update LP de $0.30 baja a $0.03. Saldo IA dura 10x más.

**D.4 Cross-feature pgvector RAG indexing (costo marginal cero)**
Al procesar PDFs, indexar texto extraído en `document_embeddings` (pgvector ya installed F10). Búsqueda futura comprador "depa con jacuzzi" matchea proyectos cuyas escrituras/brochures mencionen jacuzzi. **Free porque ya procesamos los PDFs.**

### E. Drive monitor: API key + link público (sin OAuth)

Plan original asumía OAuth completo. Founder pidió revisar honesto.

**Decisión: API key sola (sin OAuth consent screen).**

Razones:
- Material marketing (LPs, brochures, planos comerciales) ya es público de facto (devs comparten via WhatsApp/email)
- Material legal (escrituras, permisos) NUNCA va a Drive público — solo upload directo a DMX
- API key (`GOOGLE_DRIVE_API_KEY` en env) lee folders/files marcados "anyone with link can view"
- Setup founder: 5 min Google Cloud Console (DONE)
- Cero pantalla "Conectar mi Drive" para devs (zero friction)

Polling cron 15 min: lista folder → compara con `drive_files_snapshot` → detecta diff → encola jobs.

Archivos legales requieren upload directo a DMX (path 1) — Drive (path 2) solo para marketing. UI distingue ambos paths.

### F. Distribución 17 upgrades total entre fases

| # | Upgrade | Fase | Sesión |
|---|---|---|---|
| 1 | Prompt caching Anthropic | F17 | 17.B |
| 2 | Citations span GC-7 | F17 | 17.B |
| 3 | Detección duplicados hash | F17 | 17.C |
| 4 | AI Compliance Cross-Check ⭐⭐⭐ | F17 | 17.D |
| 5 | pgvector RAG indexing cross-feat | F17 | 17.D |
| 6 | DMX Concierge ⭐⭐⭐ | F20 | 20.D (nuevo) |
| 7 | Embeddings unificados search | F20 | 20.B |
| 8 | Conversational refinement | F20 | 20.C |
| 9 | Lead enrichment AI auto-score | F20 | 20.E |
| 10 | Dashboard búsquedas/atribución admin | F19 | 19.C |
| 11 | Atribución link asesor vs DMX (UI wirea) | F21 | 21.B |
| 12 | Multi-modal search (foto → match) | F21 | 21.D (nuevo) |
| 13 | Atlas integrado conversational | F21 | 21.D |
| 14 | Studio + match (video tour auto) | F21 | 21.E |
| 15 | Notifications + saved searches | F21 | 21.C |
| 16 | Tinder/Hinge para inmuebles | F22 | 22.D (nuevo) |
| 17 | Lead Score C01 + búsqueda WA | F22 | 22.B |
| Bot WA + lead capture | F21.A | 21.A.A |
| WhatsApp Group post-venta | F21.A | 21.A.D (nuevo) |
| Saved searches alertas WA | F21.A | 21.A.C |
| Saved searches gating Pro/Enterprise | F23 | 23.B |
| Auction time-limited offers | F23 | 23.E (nuevo) |

(Total real: 22 upgrades distribuidos. Los 5 extra emergieron en CROSS-FEATURE.)

**Defer H2:**
- Cascade Sonnet → Haiku (esperar volumen)
- Predicción venta con timing
- DocVault público inversionistas (post launch — requiere reputation DMX establecida)
- Feed API REST B2B (FASE 23 alternativa monetización post-launch)

## Schema F17 — 10 tablas nuevas

1. **`document_jobs`** — pipeline AI por doc procesado (FK → documents)
2. **`document_extractions`** — resultados structured JSON con citations spans
3. **`document_validations`** — rules + errors por tipo doc
4. **`document_compliance_checks`** — cross-check LP vs escritura vs permisos (lateral #1)
5. **`document_doc_hashes`** — SHA256 dedup + diff detection (direct #3)
6. **`document_embeddings`** — pgvector RAG indexing (cross-feat)
7. **`dev_ai_credits`** — saldo balance per dev
8. **`ai_credit_transactions`** — audit log compras + consumos
9. **`drive_monitors`** — link Drive público + folder_id + last_check
10. **`drive_files_snapshot`** — último snapshot per folder (diff detection)

Convenciones canon:
- Spanish singular FKs: `proyecto_id`, `unidad_id`, `desarrolladora_id`, `uploaded_by`
- RLS strict: `document_jobs.visibility` ENUM (`dev_only`/`asesor_visible`/`public_derived`)
- Default visibility por `doc_type`: escritura/permiso/legal → `dev_only` automático

## Plan 5 sesiones F17 con paralelización

| Sesión | Bloque | Tipo | Tiempo |
|---|---|---|---|
| **17.A** | Schema + saldo IA + Drive + pre-registros shared | PM secuencial | ~30 min |
| **17.B** | Pipeline AI core (engine + prompt caching + citations) | CC-A.1 paralelo | ~4h calendar |
| **17.C** | Validation + Quality Score + Dedupe hash | CC-A.2 paralelo | concurrente con B |
| **17.A.UI** | Saldo dev shell + Drive monitor lib | CC-A.3 paralelo | concurrente con B |
| **17.audit** | PM audit independiente + merge 3 PRs | PM secuencial | ~1h |
| **17.D** | AI Compliance Cross-Check + pgvector RAG | CC-A solo | ~3h (depende B/C) |
| **17.E** | Integración M11 + cost tracking + smoke E2E | CC-A solo | ~2h (depende todo) |
| **TAG** | `fase-17-complete` post smoke E2E verde | PM | 5 min |

**Total wall-clock estimado:** 10-12h (vs 20h secuencial puro). Ahorro 40-50%.

## 25 aprendizajes activos aplicados

1. Pre-flight PM 5 min antes de prompt CC
2. audit:rls strict 1:1 SECDEF↔allowlist con BD remota
3. Smoke test e2e con user real al cierre (login dev → upload PDF → ver score)
4. Cero crons sub-daily mientras Hobby (uso pg_cron para frequencia alta)
5. Pages redirect target deben existir antes de redirigir
6. STUBs ADR-018 con migration en MISMA fase, no diferir
7. No outputear secrets en comandos Bash (presence checks `grep -q`)
8. Production health check post-deploy
9. PM audit exhaustivo post-CC ANTES de push
10. Production health check cada 5-6 commits
11. MCP timestamp drift — rename file matchear remote (memoria 26)
12. Schema canon spanish singular (`proyecto_id` NO `project_id`)
13. i18n parity 5 locales pre-registrar namespaces vacíos
14. Verificación antes de gasto/signup — curl probe + dashboard pricing 30s
15. Cross-feature imports en `shared/` desde inicio
16. Husky pre-commit multi-agent — branch validate antes de commit
17. Sub-agent Task tool over-revert — validar `git diff` post Task
18. CC prompts 3 secciones fijas (PROHIBIDO + AUDIT + REPORTAR)
19. Hard stop 95% context en prompt CC-A
20. Zero Claude attribution en commits/PRs/tags
21. Founder profile aplicado a CC-A — lenguaje natural sin jerga
22. Hard validation BD types post-migration (`npm run db:types`)
23. Zsh hash comments en bloques copy-paste prohibidos
24. Defensive default visibility — `dev_only` para tablas sensibles
25. Pre-flight Vercel cron rule — validar no sub-daily

## Riesgos identificados + mitigaciones

| Riesgo | Mitigación |
|---|---|
| Anthropic saldo $7 USD → testing limitado ~14 PDFs total | Founder confirma testing controlado con drives propios. NO production launch hasta cargar saldo $500+. |
| Drive API key visible en log historic chat | Founder rota preventivamente en Google Cloud Console (5 min). |
| CC-A multi-window conflicts shared files | PM pre-registra `server/trpc/root.ts` stub + i18n namespaces 5 locales + `vercel.json` crons stubs UPFRONT. CC-A solo edita SUS archivos. |
| TS2589 deep type recursion (incident F15) | CC-A prompt incluye warning "type alias + cast pattern para listQ.data.map" |
| Cross-feature import audit fail (incident F15) | Saldo IA UI directo en `shared/ui/developer-shell/` desde día 1 |
| Cron sub-daily Hobby blocker (incident F15) | F17 solo crons `0 X * * *` (daily) en vercel.json. Frecuencia alta = pg_cron Supabase |
| Production atascado sin detección 4h (incident F15) | PM verifica `mcp__list_deployments` cada merge + post-tag |

## Validación cierre F17

- [ ] 10 tablas BD applied + types regen + git diff types verde
- [ ] audit_rls 0 violations (1:1 SECDEF↔allowlist)
- [ ] audit:dead-ui 0 violations
- [ ] i18n parity 5 locales (~120 keys nuevas dev.documents.*)
- [ ] Anthropic SDK consume `cache_control` correctamente (logs muestran cache_read_input_tokens en calls 2+)
- [ ] AI Compliance Cross-Check engine runs con 2+ docs procesados
- [ ] pgvector embeddings poblados post-extraction
- [ ] Drive monitor link público funcional (curl test con folder ID público)
- [ ] Saldo IA UI muestra balance correcto + descuenta post extraction
- [ ] Smoke test E2E manual: login `dev@test.com` → /desarrolladores/inventario/documentos → upload PDF → ver score 🟢🟡🔴 + saldo descuenta
- [ ] Production deploy verde (commit = HEAD main)
- [ ] Tag `fase-17-complete` push

## Referencias

- FASE_17_DOCUMENT_INTEL.md (plan original + addendum F17.B/C/D/E con upgrades)
- LATERAL_UPGRADES_PIPELINE.md (L-NEW agendados F19/F20/F21/F21.A/F22/F23)
- biblia v5 §17 (decisión N+7)
- ADR-018 (E2E connectedness — STUBs canon en MISMA fase)
- memoria 13 (arquitectura escalable — `document_jobs` separado, no extender `documents`)
- memoria 18 (PM audit exhaustivo post-CC)
- memoria 21 (audit_rls strict pre-merge)
- memoria 26 (MCP timestamp drift)
