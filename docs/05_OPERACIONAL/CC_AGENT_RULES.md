# CC Agent Rules — Canon operacional para prompts CC-A

**Version**: v1.1
**Origen**: Consolidación post-FASE 17 multi-agent incidents (2026-04-29). v1.1 adds N.5 zero huérfanos forward (2026-04-29).
**Audiencia**: PM (chat web) y CC-A (Claude Code terminal Mac mini)
**Estatus**: canon obligatorio. Cualquier prompt CC-A debe referenciar este doc.

> **Cómo aplicar**: cada prompt CC-A abre con `Reference: docs/05_OPERACIONAL/CC_AGENT_RULES.md (v1.0)` + lista de sub-secciones aplicables (ej. `Aplicar: A.1-A.5, B.1-B.7, F.1-F.8, K.1, L.*, O.1`). Prompts multi-agent paralelos inline las secciones críticas (F.* + K.* + O.*) además del reference.

> **Cómo agregar regla N+1**: cada incident detectado en run real → agregar regla nueva con su origen documentado al final de la sección correspondiente. Bump version v1.0 → v1.1. Commit ritual: `chore(canon): add rule X.N — <origin incident>`.

---

## A. Contexto y setup

### A.1 Pre-flight PM 5 min antes de prompt CC
**Origen**: F14-F15 spec changes mid-run, decisiones producto sin resolver causaban A/B/C interruptions a Manu.
**Aplicación**: PM resuelve schema audit + decisiones producto + scope final ANTES de escribir prompt.

### A.2 Schema BD column-by-column inline en prompt
**Origen**: F17 inicial — solo nombré tablas, CC-A iba a regenerar types. Manu detectó gap.
**Aplicación**: cada prompt incluye nombre de columnas + tipos + CHECK constraints + FKs de las tablas que toca.

### A.3 Patterns canon con file paths reales referenciables
**Origen**: F17 inicial — CC-A iba a inventar patterns inconsistentes con resto del repo.
**Aplicación**: cada prompt referencia archivo existente como ejemplo (ej. `features/operaciones/routes/contracts.ts` para auth pattern).

### A.4 Env vars + saldos verificados antes de prompt
**Origen**: AirROI cost empírico (memoria 7 — $0.10/call real vs $0.01 docs). Anthropic saldo $7 USD reportado tarde.
**Aplicación**: PM verifica `curl` probe + dashboard pricing 30s ANTES de hardcodear endpoints/tokens.

### A.5 Decisiones producto resueltas upfront, NO mid-run
**Origen**: PM schema audit pre-prompt (memoria 17). Manu repite 2 veces = fricción.
**Aplicación**: si memorias/canon cubren decisión → tomarla zero preguntas. Si no cubierto → A/B/C con recomendación PM ANTES de prompt.

---

## B. Schema BD

### B.1 Schema canon spanish singular FKs
**Origen**: F15 incident — `proyecto_id` NO `project_id`. `desarrolladora_id` NO `dev_id`. `assigned_asesor_id` NO `asesor_id`. CC-A inventaba inglés.
**Aplicación**: cada prompt explicita la convención + lista FKs exactas de tablas que toca.

### B.2 Tablas separadas, no extender legacy con jsonb inline
**Origen**: arquitectura escalable desacoplada (memoria 9). F17 ejemplo: `document_jobs` separado de `documents` legacy en vez de extender.
**Aplicación**: 1 tabla por función, normalizada. Tablas nuevas nunca borran legacy (BIBLIA decisión 6).

### B.3 RLS ALWAYS ON en migration MISMA fase
**Origen**: 174 partman partitions sin RLS detectadas F15.B.M11 → security fix HOTFIX.
**Aplicación**: cada `CREATE TABLE` incluye `ALTER TABLE ENABLE ROW LEVEL SECURITY` en mismo statement + policies inline.

### B.4 SECDEF helpers con SET search_path = public + STABLE
**Origen**: `audit_rls_violations()` check de pattern.
**Aplicación**: cada SECDEF nuevo incluye `SECURITY DEFINER` + `SET search_path = public` + `STABLE` (o `IMMUTABLE` si aplica).

### B.5 audit_rls_allowlist 1:1 SECDEF↔allowlist en MISMO PR
**Origen**: PR pasa CI verde porque migrations no aplicadas remoto, bug emerge post-merge (memoria 22).
**Aplicación**: cualquier SECDEF nueva requiere update `audit_rls_allowlist v.N+` en mismo PR + verificar `SELECT * FROM audit_rls_violations()` retorna `[]` antes de push.

### B.6 MCP apply_migration timestamp drift fix
**Origen**: MCP genera timestamp on-the-fly distinto del filename local (memoria 26).
**Aplicación**: post-MCP `apply_migration`, rename archivo local matchear timestamp remote (`SELECT version FROM supabase_migrations.schema_migrations`).

### B.7 Defensive default visibility para datos sensibles
**Origen**: F17 — escrituras + RFC + datos personales. Default expuesto = riesgo.
**Aplicación**: tablas sensibles (legales, financieras, PII) → `visibility text DEFAULT 'dev_only'`. Acceso a otros roles requiere opt-in explícito.

---

## C. Auth y seguridad

### C.1 Pages redirect target deben existir antes de redirigir
**Origen**: F15 incident — layout developer redirigía a `/profile?reason=role_required_dev`, pero `/profile/page.tsx` NO existía → 404.
**Aplicación**: si introduces redirect a path X, verifica que `app/[locale]/.../X/page.tsx` exista. Si no, créalo en mismo PR.

### C.2 Auth flow respeta redirect= query param + locale prefix
**Origen**: F15 incident — login form ignoraba `?redirect=` y siempre iba a `/`. Locale prefix faltaba.
**Aplicación**: post-signIn, leer `URLSearchParams.get('redirect')` + extraer locale del pathname + redirigir a `${localePrefix}${redirectTo || dashboard_default}`.

### C.3 RLS opt-in explícito para asesor/cliente sobre datos dev
**Origen**: F17 — escrituras dev_only nunca asesor/cliente.
**Aplicación**: policies `OR (visibility='asesor_visible' AND ...)` solo cuando explícitamente marcado. Default niega.

### C.4 MFA opcional, no enforcement default
**Origen**: F15 — `MFA_REQUIRED_ROLES` set en proxy.ts forzaba enrollment al login. Manu canceló.
**Aplicación**: MFA en `/profile/seguridad` settings panel, nunca en proxy/middleware enforcement.

---

## D. Crons

### D.1 Cero crons sub-daily mientras Hobby
**Origen**: F15 incident — `worksheets-expire */30 * * * *` rompió Hobby plan. 7 commits silent failure 4h.
**Aplicación**: vercel.json solo admite `0 X * * *` (daily) o menos frecuente. Frecuencia alta = pg_cron Supabase.

### D.2 pg_cron Supabase para frecuencia alta
**Origen**: D.1 + pg_cron v1.6.4 ya installed.
**Aplicación**: schedule via migration `SELECT cron.schedule('name', '*/15 * * * *', $$ SELECT net.http_get(url, headers) $$);`. Bearer auth via `current_setting('app.cron_secret')`.

### D.3 GUC names canon: app.cron_secret + app.deploy_origin
**Origen**: F17 incident — B branch usó `app.deployment_url`, A.UI branch usó `app.deploy_origin`. Founder hubiera tenido que setear AMBOS GUCs.
**Aplicación**: nombres canon obligatorios en TODA migration pg_cron: `app.cron_secret` (Bearer token) + `app.deploy_origin` (URL base sin path). Cualquier otro nombre debe normalizarse antes de merge.

### D.4 Cron observability INSERT ingest_runs obligatorio
**Origen**: 14 crons F15 BATCH 4 sin ejecución histórica detectada (memoria 18).
**Aplicación**: cada cron handler INSERT row en `ingest_runs` antes del work + UPDATE `status='ok'/'error'` en finally. Bearer `${CRON_SECRET}` auth obligatorio.

### D.5 Sentry per-job no aborta loop
**Origen**: F15 cron canon (competitor-radar pattern).
**Aplicación**: `try/catch` interno per-iteration con `sentry.captureException` + continúa loop. `try/catch` exterior solo para fallos catastróficos.

### D.6 maxDuration explícito
**Origen**: Vercel Hobby default 60s, AI extraction puede exceder.
**Aplicación**: `export const maxDuration = 300` (5 min Hobby+Pro permitido). Para PDFs >100pgs: chunked async.

---

## E. UI / Frontend

### E.1 Cross-feature imports en shared/ desde día 1
**Origen**: F15 incident — `DevHeader` importaba `ProjectSwitcher` de `features/developer/`, audit cross-feature falló.
**Aplicación**: si componente lo consume layout/header shared, vive en `shared/ui/<area>/` desde inicio. Nunca mover post-implementación.

### E.2 Card3D sin tilt rotation
**Origen**: ADR-023 cleaner Dopamine (memoria feedback_card3d_no_tilt).
**Aplicación**: Card3D default sin `rotateX/rotateY/scale`. Solo depth + shadow. Transforms hover SOLO eje Y (`translateY`).

### E.3 Pill buttons obligatorios
**Origen**: ADR-050 regla canon #1.
**Aplicación**: TODO Button con `border-radius: 9999px`. Cero excepciones.

### E.4 Cero emoji en UI
**Origen**: ADR-050 regla canon #3.
**Aplicación**: emoji solo en messaging chat usuario↔asesor. UI elements: cero.

### E.5 Motion ≤ 850ms total
**Origen**: ADR-050 regla canon #5.
**Aplicación**: cualquier transición o animation cap absoluto 850ms.

### E.6 Tokens canon obligatorios
**Origen**: ADR-050 regla canon #7.
**Aplicación**: cero hardcoded colors fuera de `--canon-*` o `--accent-*`. Reusa tokens `@theme` en `styles/tokens.css`.

### E.7 Primitives canon shared/ui/primitives/canon/
**Origen**: cleanup F15 — devs creaban Card/Button ad-hoc.
**Aplicación**: import `Card`, `Button` de `shared/ui/primitives/canon`. Cero re-create.

---

## F. Multi-agent (3 ventanas paralelas)

### F.1 Pre-registros shared upfront ANTES de invocar CC-A paralelo
**Origen**: F15 OLA 2/3 conflicts en `server/trpc/root.ts` + `messages/*.json` simultáneos.
**Aplicación**: PM crea stubs en archivos shared antes de prompt:
- `server/trpc/root.ts` import + registry stub
- `messages/{5 locales}.json` namespace vacío
- `vercel.json` cron stubs (si aplica)
- Stub router file con 1 procedure `ping`
CC-A solo edita SUS archivos feature-scoped, nunca shared.

### F.2 Branch validate antes de cualquier git command
**Origen**: F10 incident — PM hizo `git checkout main` mientras CC-A en branch X → commits cayeron en main accidentalmente.
**Aplicación**: `git branch --show-current` ANTES de cualquier `checkout/switch/commit`. Si CC-A activo en branch X, PM usa `git worktree add` separado o espera checkpoint.

### F.3 Husky pre-commit aware multi-agent
**Origen**: F10 cross-contamination.
**Aplicación**: cada CC-A en branch propio. NO compartir staging area entre ventanas.

### F.4 Sub-agent Task tool over-revert risk
**Origen**: memoria feedback_subagents_over_revert.
**Aplicación**: post Task tool, validar `git diff` ANTES de aceptar. Sub-agent puede revertir fixes legítimos sin contexto.

### F.5 Lockfile manual root.ts/migrations/types
**Origen**: multi-agent canon.
**Aplicación**: solo 1 ventana CC-A modifica `server/trpc/root.ts` o crea migrations en ventana de tiempo dada. PM coordina.

### F.6 Worktree obligatorio multi-agent paralelo
**Origen**: F17 incident — 3 ventanas CC-A compartieron working tree, conflict en `routes/document-intel.ts` + branch-switch incident sin pérdida pero con working tree contaminado.
**Aplicación**: cada prompt CC-A en multi-agent abre con bloque pre-flight literal:
```
git worktree add ../dmx-<branch-name> -b <branch-name> origin/main
cd ../dmx-<branch-name>
git branch --show-current
```
Cero `git checkout` en working tree principal. PM provee el comando exacto en el prompt. Al finalizar PR, CC-A puede `git worktree remove` o dejar para audit.

### F.7 File ownership matrix explícita por CC-A
**Origen**: F17 incident — los 3 CC-A tocaron `features/document-intel/routes/document-intel.ts` (B y A.UI ambos modifican; resoluble pero evitable).
**Aplicación**: PM declara en cada prompt multi-agent una tabla:
```
CC-A.1 owns: features/<feat>/lib/<sub>.ts, features/<feat>/routes/<feat>.<sub>.ts
CC-A.2 owns: features/<feat>/components/<sub>/, features/<feat>/lib/<other>.ts
CC-A.3 owns: shared/ui/<area>/<file>.tsx, features/<feat>/routes/<feat>.<other>.ts
SHARED (PM pre-registra antes): server/trpc/root.ts, messages/*.json, vercel.json, supabase/migrations/
```
Si las 3 ventanas necesitan agregar procedures al mismo router, PM splittea en sub-archivos (`<feat>.pipeline.ts`, `<feat>.validation.ts`, `<feat>.drive.ts`) con barrel `<feat>.ts` re-export, o serializa.

### F.8 Reporte A.1-A.16 fixed format obligatorio
**Origen**: F17 incident — los 3 reportes asimétricos (uno reportó tests count, otro no; migration files inconsistente; coordination incidents reportados solo por 2/3).
**Aplicación**: cada CC-A cierra con bloque literal:
```
A.1 Branch + commit SHA
A.2 Files modified (list completa con diff stats)
A.3 Files outside scope detectados (untracked / accidental)
A.4 Migrations applied (filename + status MCP)
A.5 RLS policies count + audit_rls_violations count
A.6 i18n keys delta (locale × count)
A.7 Tests count (added/modified/total) + pass/fail
A.8 typecheck status (errors count)
A.9 audit:dead-ui status (violations count)
A.10 Build status (Vercel preview URL)
A.11 Smoke test executed (yes/no + scenarios)
A.12 PR URL + body summary
A.13 Bloqueadores externos (founder action required)
A.14 Branch coordination incidents detectados
A.15 Decisiones autónomas tomadas (con justificación canon)
A.16 Aprendizajes nuevos para memorias
```
Sin paridad reporte, no merge.

---

## G. TypeScript

### G.1 Zero any, zero @ts-ignore
**Origen**: regla canon #5 (CLAUDE.md).
**Aplicación**: usa `unknown` + narrow con Zod. `@ts-expect-error` solo con issue link explícito.

### G.2 TS2589 deep type recursion fix pattern
**Origen**: F15 incident — `PrototiposManager.tsx` + `JourneyBuilderPage.tsx`.
**Aplicación**: cuando tRPC query infiere type "deep":
```ts
type FooRow = Database['public']['Tables']['foo']['Row'];
const data = (query.data as FooRow[]) ?? [];
```
NUNCA usar `any` como escape.

### G.3 import type cuando es solo tipo
**Origen**: Biome `useImportType`.
**Aplicación**: `import type { Foo } from '...'` siempre que se usa solo en type position.

### G.4 Hard validation BD types post-migration
**Origen**: memoria 17.
**Aplicación**: post `mcp apply_migration`, ejecuta `npm run db:types` + `git diff shared/types/database.ts` para confirmar tipos auto-generados.

### G.5 Next.js 16 cacheComponents incompat
**Origen**: memoria feedback_build_cacheComponents.
**Aplicación**: NO `export const dynamic` o `runtime` en API routes con `cacheComponents:true`.

### G.6 NEXT_PUBLIC_* literal only client
**Origen**: memoria feedback_next_public_literal_only.
**Aplicación**: `process.env.NEXT_PUBLIC_X` literal estático. Dynamic rompe bundle.

### G.7 Biome useLiteralKeys para Record<string, unknown>
**Origen**: F17 PR #123 lint failure — `data['key']` flagged como `useLiteralKeys`.
**Aplicación**: cuando accedes a `Record<string, unknown>` con literal: `data.key` no `data['key']`. Excepción: keys con caracteres no válidos como identificador (ej. `data['precio_mxn']` solo si literal con caracteres especiales).

### G.8 Biome noUselessEscapeInString
**Origen**: F17 PR #125 lint failure — `\$8,500,000` en few-shot example flagged.
**Aplicación**: solo escapa quotes que enclose la string + chars especiales reales (`\n`, `\t`, `\\`). NO escapes `$`, `(`, `[` etc.

---

## H. i18n

### H.1 i18n parity 5 locales OBLIGATORIO
**Origen**: F15 OLA 2 incident — 230 keys missing en 4 locales tier 2 post-handoff CC-A.
**Aplicación**: `npm run i18n:validate` debe pasar 5/5 locales antes de PR. Tier 2 (CO/AR/BR) usa fallback es-MX hasta H2.

### H.2 PM pre-registra namespaces vacíos en 5 locales
**Origen**: F1.
**Aplicación**: antes de CC-A paralelo, PM crea `dev.X.*` namespace en `messages/{5}.json` con strings es-MX duplicados a otros 4 locales.

### H.3 Zero hardcoded strings user-facing
**Origen**: regla canon #8.
**Aplicación**: `useTranslations()` server-side via `getTranslations()`. Cero literals UI.

### H.4 Multi-país formatters via country_code
**Origen**: regla canon #9.
**Aplicación**: `formatCurrency`, `formatDate`, `formatAddress`, `formatPhone` enrutados por `country_code`. NUNCA assume MX.

---

## I. Tests

### I.1 Modo A createCaller mocks default CI-fast
**Origen**: memoria feedback_integration_tests_modo_a_b_pattern.
**Aplicación**: tests Vitest usan `appRouter.createCaller(mockCtx)` + mocks de Supabase. Cero conexión BD real en CI.

### I.2 Modo B real DB+JWT defer a sub-bloque RLS hardening
**Origen**: misma memoria.
**Aplicación**: integration tests con BD real solo cuando RLS hardening específico requiera. NO default.

### I.3 Coverage ≥ 70% en lib/
**Origen**: estándar canon F15.
**Aplicación**: cada engine en `features/*/lib/` requiere coverage ≥ 70% antes de PR.

---

## J. Commits y merge

### J.1 Zero atribución Claude/Anthropic en commits/PRs/tags/docs
**Origen**: memoria feedback_no_claude_attribution. Branding DMX puro.
**Aplicación**: NUNCA `Co-Authored-By: Claude` o `Generated with Claude Code` en mensajes git, PR descriptions, tags, docs.

### J.2 Conventional Commits canon
**Origen**: estándar canon.
**Aplicación**: `feat:`, `fix:`, `docs:`, `chore:`, etc. Squash merge a `main`. Tags fase: `fase-NN-complete`.

### J.3 Supabase migrations manual push post-merge
**Origen**: F11.J incident oculto 2 semanas (memoria feedback_supabase_migrations_manual_push).
**Aplicación**: GHA NO aplica migrations. Post-merge, `supabase db push` manual + verificar remote = local.

### J.4 MCP apply_migration acceptable pre-merge
**Origen**: memoria feedback_mcp_apply_migration_pre_merge.
**Aplicación**: cuando código del PR consulta tabla nueva + CI typecheck requiere types regen, aplicar via MCP pre-merge para evitar bloqueo.

### J.5 Zsh hash comments NO en bloques copy-paste terminal
**Origen**: memoria feedback_zsh_no_hash_comments_terminal_blocks.
**Aplicación**: bloques copy-paste para Manu solo comandos puros. `#` inline rompe por glob expansion.

### J.6 Branch naming canon
**Origen**: estándar canon.
**Aplicación**: `feat/<fase>-<nombre>`, `fix/<issue>-<nombre>`, `docs/...`, `chore/...`.

### J.7 No force-push a main
**Origen**: regla canon Bash safety.
**Aplicación**: NUNCA `git push --force` a `main`/`master` sin autorización explícita founder.

### J.8 Pre-commit hook husky validar branch
**Origen**: F10 incident.
**Aplicación**: pre-commit hook valida `git branch --show-current` matchea expected.

---

## K. Audit post-CC

### K.1 PM audit exhaustivo post-CC ANTES de push
**Origen**: memoria feedback_pm_audit_exhaustivo_post_cc. "CC audit clean" NO autoriza.
**Aplicación**: PM hace audit independiente:
- Read migrations/engines/UI files
- MCP queries verificando schema
- Grep escéptico para STUBs ocultos
- `audit:dead-ui:ci` local
- `typecheck` local
- `npm run lint` local (Biome)
- 10 min vs 2h rework.

### K.2 Production health check cada 5-6 commits
**Origen**: F15 incident — PR #116 atascado 4h sin detección. 7 commits silent failure.
**Aplicación**: post-merge cada 5-6 commits, verificar `mcp__list_deployments` HEAD main = latest deploy READY.

### K.3 Audit rules detectables
**Origen**: ADR-018.
**Aplicación**: 7 patterns CI fail:
1. Button sin onClick activo
2. `<form>` sin onSubmit/action
3. `useEffect` sin dependency array
4. `<Link>` `href="#"` o `""`
5. tRPC stub sin `// STUB — activar`
6. Hardcoded mock data render path
7. `alert()` o `console.*` en handlers

---

## L. Comunicación

### L.1 Founder profile lenguaje natural sin jerga
**Origen**: memoria 1 user_founder_profile.
**Aplicación**: respuestas a Manu sin nombres tablas, funciones, paths archivos. Analogías cotidianas.

### L.2 Upgrades estructura obligatoria 3 categorías
**Origen**: memoria 1.
**Aplicación**: cuando Manu pregunta "algún upgrade?" SIEMPRE: DIRECTOS + LATERALES + CROSS-FUNCTIONS.

### L.3 Comandos con context tag explícito
**Origen**: memoria feedback_formato_prompts_founder.
**Aplicación**: `[Claude Code terminal]` / `[Terminal Mac mini]` / `[Vercel Dashboard]` / `[Supabase Dashboard]` / `[GitHub web]` / `[Browser servicio X]`.

### L.4 Respuestas cortas, una idea por bloque
**Origen**: memoria 1.
**Aplicación**: zero rollos. Bullet points o tabla.

### L.5 Aplicar canon zero preguntas
**Origen**: memoria feedback_aplicar_criterios_canon_zero_preguntas.
**Aplicación**: si memorias/canon cubren decisión → tomarla. Si Manu repite 2 veces = fricción.

### L.6 Brutal honesto cuando Manu pida
**Origen**: F17 — Manu detectó gap en mi prompt.
**Aplicación**: si decisión incompleta o prompt incompleto, decir "NO" y arreglar. NO defender por inercia.

### L.7 Zero gasto sin validación previa
**Origen**: regla inviolable founder + memoria feedback_verify_before_spend.
**Aplicación**: cualquier costo recurring requiere autorización explícita Manu antes de signup/setup.

### L.8 Hard stop 95% context CC-A
**Origen**: memoria feedback_instruction_format.
**Aplicación**: cada prompt CC-A incluye "Si llegas a 95% context, commit + push parcial + reportar status sin completar."

---

## M. Secrets

### M.1 Cero comandos que revelen secrets en outputs
**Origen**: F17 incident — yo usé `grep "GOOGLE_DRIVE_API_KEY" .env.local` y output reveló value en chat.
**Aplicación**: SIEMPRE presence checks: `grep -q "VAR_NAME" .env.local && echo "configured"`. NUNCA output de líneas crudas de archivos con secrets.

### M.2 .env.local gitignored verificable
**Origen**: estándar.
**Aplicación**: `.env.local` siempre en `.gitignore`. Nunca commit accidental.

### M.3 API keys con restricciones API + dominio
**Origen**: F17 Drive API key setup.
**Aplicación**: cualquier API key en Cloud Console debe restringirse a APIs específicas + (opcional) IP/dominio.

### M.4 Rotación preventiva post-leak
**Origen**: F17 — Drive key visible en chat history.
**Aplicación**: si key visible en log/screenshot/chat, rotar preventivamente aunque riesgo bajo.

---

## N. STUBs y deuda técnica

### N.1 STUBs ADR-018 4 señales canon obligatorias
**Origen**: ADR-018.
**Aplicación**: cada STUB requiere:
1. Comentario código `// STUB — activar FASE XX`
2. UI badge visible feature
3. Documentación módulo
4. tRPC `NOT_IMPLEMENTED` o response `{ ok: true, stub: true }`

### N.2 STUBs ADR-018 con migration en MISMA fase
**Origen**: F15 incident — notifications STUB sin BD real, deuda oculta detectada por Manu.
**Aplicación**: si STUB toca BD, migration tabla en MISMA fase. NO diferir.

### N.3 Zero deuda técnica antes de avanzar
**Origen**: memoria feedback_zero_deuda_tecnica.
**Aplicación**: bugs UX/datos/flujos se resuelven SIEMPRE antes del siguiente bloque. Solo deps externas bloqueadas pueden degradar graceful.

### N.4 Upgrades siempre con destino concreto
**Origen**: memoria feedback_upgrades_destino.
**Aplicación**: cada upgrade: O implementa en bloque actual O agenda L-NEW + fase/bloque específico. Prohibido "documentar sin ubicar".

### N.5 Cero huérfanos forward — todo export requiere caller en MISMA fase
**Origen**: F17 incident — `runValidation()` + `computeQualityScoreFromRecords()` + `checkDuplicate()`/`recordDocumentHash()` (engines) + `ValidationFindings` + `DedupeIndicator` (UI components) shipped sin callers/consumers, deuda técnica detectada por founder post-merge OLA 1.
**Aplicación**:
- Cada `export function`, `export const Component`, tRPC procedure nuevo, hook custom, tabla BD nueva, migration, **debe tener al menos un caller/consumer en el MISMO PR/fase**.
- Si caller es deferred (legítimo bloqueador externo), debe agendarse explícitamente como `L-NEW-FX-Y-WIRE-XXX` con fase + bloque destino + razón del defer.
- Audit obligatorio al cierre cada PR/fase: `grep -r "export function <name>" / "export const <Component>" / "<procedureName>:" + grep callers/consumers`. Si grep retorna `0 callers`, es huérfano y bloquea merge.
- Engines lib + UI components + tRPC procedures + BD tables son los principales focos de regresión. Verificar especialmente cuando multi-agent paralelo (ventana A define export, ventana B se asume va a wirearlo, NADIE wirea).
- "Pipeline funcional pero sin validation/dedupe wireado" NO es feature complete. Feature complete = E2E conectado (UI → tRPC → engine → BD), todos los componentes shipped en uso.

---

## O. Producción

### O.1 Smoke test E2E user real al cierre fase
**Origen**: F15 incident — auth bugs descubiertos hasta post-tag por Manu.
**Aplicación**: PM o CC-A hace login con user real (asesor@test.com / dev@test.com / admin@test.com) → recorre 5 rutas críticas → mismo en producción Vercel. 30 min máximo. Antes de tag.

### O.2 Verificar Vercel post-merge
**Origen**: F15 incident PR #116.
**Aplicación**: post cada merge, `mcp__list_deployments` validar HEAD main = latest deploy `state=READY` `target=production`.

### O.3 Pre-flight Vercel cron rule
**Origen**: F15 worksheets-expire incident.
**Aplicación**: antes de mergear PR que toque `vercel.json`, validar ningún cron sub-daily mientras Hobby. Script local pre-commit.

### O.4 Production health check cron auto
**Origen**: F15 incident detección manual tarde.
**Aplicación**: agendar cron Supabase pg_cron auto-verifica HEAD main = último deploy production cada 30 min. Alerta si drift > 2 commits.

---

## Total: 76 reglas activas (v1.1)

Distribución por sección:
- A. Contexto (5) — pre-flight + decisiones
- B. Schema BD (7) — RLS + naming + audit
- C. Auth (4) — redirects + RLS + MFA
- D. Crons (6) — Hobby + pg_cron + GUC + observability
- E. UI (7) — primitives + canon + tokens
- F. Multi-agent (8) — pre-registros + worktree + ownership + reporte
- G. TypeScript (8) — strict + types + Biome
- H. i18n (4) — parity + namespaces
- I. Tests (3) — Modo A + coverage
- J. Commits/merge (8) — canon + zero attribution + manual push
- K. Audit (3) — exhaustivo + production
- L. Comunicación (8) — founder + canon + brutal honesto
- M. Secrets (4) — presence checks + rotación
- N. STUBs (5) — 4 señales + migration MISMA fase + cero huérfanos forward
- O. Producción (4) — smoke + health check

---

## Template prompt CC-A (single window)

```
Reference: docs/05_OPERACIONAL/CC_AGENT_RULES.md (v1.0)
Aplicar: A.1-A.5, B.1-B.7, C.*, G.*, H.1-H.4, I.1-I.3, J.*, K.1, L.*, N.*, O.1

[Resto del prompt...]
```

## Template prompt CC-A (multi-agent paralelo, 3 ventanas)

```
Reference: docs/05_OPERACIONAL/CC_AGENT_RULES.md (v1.0)
Aplicar todas + INLINE CRÍTICO:

PRE-FLIGHT WORKTREE (F.6):
git worktree add ../dmx-<branch-name> -b <branch-name> origin/main
cd ../dmx-<branch-name>
git branch --show-current

FILE OWNERSHIP MATRIX (F.7):
CC-A.1 owns: <files>
CC-A.2 owns: <files>
CC-A.3 owns: <files>
SHARED (PM pre-registró): server/trpc/root.ts, messages/*.json, vercel.json, supabase/migrations/

REPORTE A.1-A.16 OBLIGATORIO AL CIERRE (F.8):
[bloque literal A.1-A.16]

[Resto del prompt scope-specific...]
```
