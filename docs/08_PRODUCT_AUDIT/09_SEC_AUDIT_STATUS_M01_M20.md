# 09 — SEC Audit Status M01-M20 (DOCS-ONLY)

> Audit verificable de los 23 hallazgos de seguridad SEC-01 a SEC-23 del BIBLIA v5 §5 contra el estado actual de migrations + DB types + catálogo RLS.
>
> Fuente cruzada: `docs/biblia-v5/17_BIBLIA_DMX_v5_Decisiones_Hallazgos_Plan.md` §5, `supabase/migrations/*.sql`, `shared/types/database.ts`, `docs/06_AUDITORIAS/AUDIT_FASE_0_A_11S_2026-04-24.md`.
>
> **Generado**: 2026-04-25 · Sub-bloque FASE 07.7.A.2 · Sub-agent SA-SEC + Master CC consolidation.

---

## 1. Metodología

Cada SEC-N de la BIBLIA fue clasificado en uno de tres estados:

| Estado | Criterio |
|---|---|
| ✅ **closed** | Migration shipped + artifact verificable (trigger / policy / function / VIEW / RLS / encrypt helper presente con nombre y semántica que matchean el FIX descrito por la BIBLIA) |
| 🟡 **partial** | Mecanismo base existe pero falta enforcement parcial, validación pendiente, o tabla aún no creada (cierre se difiere a fase posterior cuando la tabla exista) |
| 🔴 **pending** | Sin migration ni artifact verificable; queda como L-NEW |

Severidades del BIBLIA:
- **Crítico** (SEC-01..04)
- **Alto** (SEC-05..07, SEC-14..16)
- **Medio** (SEC-08..13, SEC-17..23)

---

## 2. Tabla maestra — 23 SEC

| SEC | Severidad | Descripción (resumen BIBLIA) | Migration cierre | Status | Acción requerida |
|----|-----------|------------------------------|------------------|--------|------------------|
| **SEC-01** | Crítico | `profiles_select_public_slug` exponía email/phone/RFC/razon_social/regimen_fiscal/docs_verificacion_urls a cualquier autenticado | `20260418041730_view_public_profiles.sql` | ✅ closed | Ninguna. VIEW `public.public_profiles` con `security_invoker=true` solo expone id/country_code/first_name/last_name/full_name/slug/avatar_url/rol/bio/public_portfolio_url. Policy original drop-eada y reemplazada por `profiles_select_self_or_super`. |
| **SEC-02** | Crítico | `profiles_update_own` permitía cambiar rol → role escalation | `20260418041543_prevent_role_escalation.sql` | ✅ closed | Ninguna. Trigger `trg_prevent_role_escalation` BEFORE UPDATE bloquea cambios en `rol`, `is_approved`, `is_active`, `country_code`, `desarrolladora_id`, `agency_id`, `broker_company_id` excepto si actor es superadmin/mb_admin (errcode 42501). Service_role bypass solo con audit_log RBAC_SERVICE_ROLE_CHANGE. |
| **SEC-03** | Crítico | `desarrolladoras_select_public` exponía rfc/email_contacto/telefono/oficina_direccion/lat/lng | `20260418042002_rls_tenants_public_views.sql` | ✅ closed | Ninguna. VIEW `public.public_desarrolladoras` solo expone id/country_code/name/website/logo_url/slug/is_verified/created_at. Análogo para agencies y broker_companies. Policies originales drop-eadas. |
| **SEC-04** | Crítico | 8 funciones SECURITY DEFINER (`get_asesor_dashboard`, `get_asesor_performance`, `get_developer_dashboard`, `get_master_broker_dashboard`, `get_morning_briefing`, `add_asesor_xp`, `calculate_commission_forecast`, `match_busqueda_inventario`) aceptaban uuid sin validar `auth.uid()` | N/A — funciones aún no existen en BD; previstas FASE 13+ | 🟡 partial | Las funciones citadas NO están creadas todavía. Sin embargo, **el guard CI ya está activo**: `audit_rls_violations()` v2+ detecta SECDEF sin `auth.uid()/is_superadmin/get_user_role/jwt` en categoría `SECDEF_NO_AUTH_CHECK`. Cuando se creen estas funciones en FASE 13 deben incluir `IF p_id != auth.uid() AND NOT is_superadmin() THEN RAISE`. |
| **SEC-05** | Alto | `projects_select_public` exponía `broker_commission_pct`, `broker_commission_notes`, `broker_pago_comision`, `broker_bono_pct` a compradores | N/A — tabla `projects` no existe aún en migrations | 🔴 pending | Crear `public_projects` VIEW security_invoker sin columnas `broker_*`. Tarea: incluir en FASE de creación de tabla `projects` (módulo M02 Desarrollos backend, FASE 09 según roadmap). |
| **SEC-06** | Alto | Bucket `profile-avatars`: `public=true`, `file_size_limit=null`, `allowed_mime_types=null` | `20260418071000_storage_buckets.sql` | ✅ closed | Ninguna. Bucket creado con `file_size_limit=5242880` (5MB) y `allowed_mime_types=['image/png','image/jpeg','image/webp','image/gif']`. Aplica `on conflict do update` para idempotencia. **Nota CRITICAL-009 (post-BIBLIA)**: `20260424210000_fix_public_bucket_listing_and_search_path.sql` removió listing policy pero GET sigue público (intencional). |
| **SEC-07** | Alto | Buckets `dossier-exports`, `commission-invoices`, `operation-files` permitían INSERT solo con `auth.uid() IS NOT NULL` | `20260418071000_storage_buckets.sql` | ✅ closed | Ninguna. `commission-invoices` requiere `get_user_role() IN ('admin_desarrolladora','mb_admin','superadmin')`. `operation-files` requiere `is_operation_participant()` (stub FASE 06: solo superadmin; FASE 07+ JOIN real con `operation_participants`). `dossier-exports` requiere ownership (`storage.foldername(name)[1] = auth.uid()::text` o superadmin). |
| **SEC-08** | Medio | Webhook secrets en plaintext (`webhooks.secret`) | N/A — tabla `webhooks` no existe; helpers de cifrado sí: `20260418072000_secrets_and_api_keys.sql` | 🟡 partial | Helpers `encrypt_secret(text)` / `decrypt_secret(bytea)` con pgsodium AEAD-det listos. Cuando se cree tabla `webhooks` (FASE 12+ Comunicaciones / N8N), columna `secret` debe ser `bytea` cifrada vía estos helpers (no `text`). |
| **SEC-09** | Medio | `qr_codes_read` qual=true visible para todos | N/A — tabla `qr_codes` no existe aún | 🔴 pending | Diferir a creación de tabla `qr_codes` (módulo M14 Marketing/Landing pages, FASE ~16). Cubierto por audit_rls_violations() guard que detectará `qual=true` sin `intentional_public`. |
| **SEC-10** | Medio | Rate limiting sin verificar en tRPC endpoints | `20260418073000_rate_limit_keyed.sql` | 🟡 partial | Infraestructura DB completa: `api_rate_limits` particionado, `check_rate_limit(key,endpoint,window,max)` SECURITY DEFINER, `rate_limit_policies` catálogo con seeds (`auth.signup`, `auth.password-reset`, `ai.copilot`, etc.). **Falta**: invocación desde middleware tRPC (`server/trpc/`) en cada procedure relevante. L-NEW: harness tRPC rate-limit middleware. |
| **SEC-11** | Medio | RFC sin encriptar en reposo (`profiles.rfc`, `desarrolladoras.rfc`) | `20260418072000_secrets_and_api_keys.sql` | ✅ closed | Ninguna. Triggers `trg_profiles_encrypt_pii` y `trg_desarrolladoras_encrypt_tax` cifran `rfc`/`tax_id` con pgsodium AEAD-det a `*_encrypted` y nullifican plaintext en la misma fila. Plaintext jamás persiste at rest. |
| **SEC-12** | Medio | CORS sin verificar en API routes | N/A — middleware/headers level | 🔴 pending | Auditar `next.config.ts` + `middleware.ts` + route handlers en `app/api/*` para confirmar allowlist explícita en `Access-Control-Allow-Origin`. L-NEW candidate FASE 11/12. |
| **SEC-13** | Medio | Sin 2FA/MFA para superadmin | `20260418035830_auth_backup_codes.sql` + `20260418078000_mfa_reminders_cron.sql` | 🟡 partial | Backup codes table + `mfa_reminders_tick()` cron semanal lunes 14:00 UTC que registra `MFA_REMINDER` por cada admin sin MFA >7 días. **Falta**: enforcement bloqueante (admin sin MFA no debe poder hacer acciones privilegiadas). Email Resend stub hasta FASE 22. L-NEW: MFA enforcement policy. |
| **SEC-14** | Alto | 24 tablas con policy ALL (incluyendo DELETE) para owner — un asesor podía borrar su historial | `20260418075000_revoke_delete_historical.sql` | 🟡 partial | DELETE revocado en `audit_log`, `auth_sessions_log`, `rate_limit_log`, `api_rate_limits`, `fx_rates`. **Faltan**: `actividad_timeline`, `captaciones`, `acm_valuaciones`, `visitas_programadas`, `tareas`, `comisiones` y otras 18 tablas históricas/timeline mencionadas por BIBLIA. L-NEW: extender revoke_delete a tablas timeline/historical de M03-M10. |
| **SEC-15** | Alto | `score_subscriptions` policy ALL sin validar plan premium | N/A — tabla `score_subscriptions` no existe en migrations actuales | 🔴 pending | Diferir a creación de score_subscriptions (FASE 11 IE/scores ext). Policy debe `WITH CHECK` cruzar `feature_registry.is_premium=true` ⨯ `subscriptions.status='active'`. Tabla relacionada `score_change_webhooks` sí existe — verificar policy. |
| **SEC-16** | Alto | `project_landing_pages` policy solo valida `created_by=auth.uid()` en INSERT (no broker authorization) | N/A — tabla no existe aún | 🔴 pending | Diferir a creación de project_landing_pages (FASE 16+ Marketing M14). Policy debe agregar `is_authorized_broker(project_id) OR is_project_owner(project_id)`. |
| **SEC-17** | Medio | pgsodium no habilitado | `20260418072000_secrets_and_api_keys.sql` (DO block check) | ✅ closed | Ninguna. Migration falla si `pgsodium.valid_key WHERE name='default_secret_key'` no existe. Key bootstrap se ejecuta fuera del pipeline (`pgsodium.create_key('aead-det','default_secret_key')`). BIBLIA §5.4 ya marca `pgcrypto instalado, supabase_vault disponible`. |
| **SEC-18** | Medio | Supabase Vault vacío (API keys en `.env`) | N/A — vault available pero stub | 🟡 partial | Helpers `encrypt_secret`/`decrypt_secret` listos vía pgsodium (no via Supabase Vault directamente). Tabla `api_keys` con bcrypt hash + RPC `issue_api_key`/`verify_api_key` shipping. **Falta**: Supabase Vault propiamente — actualmente API keys externas (Anthropic, AirROI, INEGI, Mapbox) viven en `.env` + Vercel env vars. L-NEW: migrar selected secrets a vault con superadmin-only `decrypt_secret`. |
| **SEC-19** | Medio (compliance LFPDPPP) | Sin audit log de lecturas de datos sensibles | `20260418032217_audit_log_partitioned.sql` + `20260418043200_audit_row_change.sql` (write-only) | 🔴 pending | Audit_log captura WRITES (RBAC, encrypt, cambios). NO captura READS de PII. Alternativa: forzar acceso solo vía RPC `get_profile_pii(uuid)` con audit. L-NEW critical for LFPDPPP compliance. |
| **SEC-20** | Medio | `demand_queries` INSERT con `with_check=true` (spam posible) | N/A — tabla no existe aún | 🔴 pending | Diferir. Cuando se cree, INSERT debe validar `auth.uid() IS NOT NULL` + rate-limit (`check_rate_limit('user:'||uid, 'demand_queries.insert', 60, 5)`). |
| **SEC-21** | Medio | `admin_actions` INSERT abierto (pollution log) | N/A — tabla no existe aún | 🔴 pending | Diferir. Solo superadmin/system debe poder INSERT (vía SECDEF helper, no policy directa al usuario). |
| **SEC-22** | Medio | `project_views` INSERT inflable (fake views sin dedup) | `20260418076000_view_dedup.sql` | ✅ closed (preventivo) | Migration `view_dedup` creó helper `register_view()` SECDEF + tabla `view_dedup` con dedup window. Cuando se cree `project_views`, el INSERT solo debe ocurrir vía `register_view()` no directo desde el cliente. Verificar uso en M02/M14 frontend. |
| **SEC-23** | Medio | `avance_obra_log` visible para todos (incluso proyectos no publicados) | N/A — tabla no existe aún | 🔴 pending | Diferir. Policy debe filtrar por `project.publicado=true` join + ownership chain. |

---

## 3. Counts globales

```
✅ closed:    8   (SEC-01, 02, 03, 06, 07, 11, 17, 22)
🟡 partial:   6   (SEC-04, 08, 10, 13, 14, 18)
🔴 pending:   9   (SEC-05, 09, 12, 15, 16, 19, 20, 21, 23)
TOTAL:       23
```

---

## 4. Top 5 SEC pending priorizar

Criterio combinado: severidad + impacto en flujo M01-M20 + bloqueante para fase próxima.

| # | SEC | Severidad | Por qué priorizar | Fase destino |
|---|-----|-----------|-------------------|--------------|
| 1 | **SEC-04** | Crítico | Cuando FASE 13 (Portal Asesor M01 Dashboard) cree `get_asesor_dashboard` y compañía, sin guard `auth.uid()` cualquiera puede leer dashboard ajeno. CI guard ya detecta — pero hay que escribirlas correctamente. | FASE 13 (M01) |
| 2 | **SEC-19** | Medio (compliance) | Compliance LFPDPPP exige audit de accesos a PII. Sin esto el `decrypt_secret` se llama sin trazabilidad de quién leyó qué RFC. | FASE 11 / 12 (post-Pulse) |
| 3 | **SEC-14** | Alto | Asesor puede DELETE su `tareas`/`captaciones`/`actividad_timeline` y limpiar evidencia. Las tablas ya existen (M03-M07). | FASE 09 (cleanup) |
| 4 | **SEC-10** | Medio | Sin middleware tRPC rate-limit en producción, bots pueden hammering los endpoints públicos (signup, search). Infraestructura ya lista, falta wiring. | FASE 11/12 |
| 5 | **SEC-12** | Medio | CORS abierto en API routes públicas permite browser exploit cross-origin. Audit de `next.config.ts` + middleware. | FASE 11 |

---

## 5. L-NEW candidates (SEC pending no agendados todavía)

5 entradas para `L-NEW` que el founder debe ubicar en fase concreta:

1. **L-NEW-SEC-04-DASHBOARD-FUNCTIONS** — Definir las 8 funciones `get_*_dashboard` con guard `auth.uid()` antes de FASE 13. Bloquea M01 Portal Asesor backend. Severidad: Crítico.
2. **L-NEW-SEC-14-EXTEND-DELETE-REVOKE** — Extender `revoke_delete_historical` a tablas timeline/historical de M03-M10. Severidad: Alto.
3. **L-NEW-SEC-19-PII-READ-AUDIT** — Encapsular acceso a PII detrás de RPCs `get_profile_pii(uuid)` que insertan en `audit_log` con `action='READ_PII'`. Compliance LFPDPPP. Severidad: Medio compliance-blocking.
4. **L-NEW-SEC-10-TRPC-RATELIMIT-MIDDLEWARE** — Middleware tRPC en `server/trpc/middleware.ts` que invoque `check_rate_limit()` por procedure usando `rate_limit_policies` lookup. Severidad: Medio.
5. **L-NEW-SEC-13-MFA-ENFORCEMENT** — Trigger/policy adicional que bloquee operaciones privilegiadas cuando `meta->>'mfa_enabled' != true` para superadmin/mb_admin. Severidad: Medio.

Bonus L-NEW del audit posterior 2026-04-24 (post-BIBLIA SEC-23):

6. **L-NEW-CRITICAL-005-SECDEF-VIEWS** — 3 SECURITY DEFINER views sin justificación. Severidad: Alto.
7. **L-NEW-CRITICAL-006-INTENTIONAL-PUBLIC-50** — 50 policies qual=true sin comment `intentional_public`. Severidad: Alto.

---

## 6. Recomendaciones por fase

### 6.1 SEC pending bloqueantes para FASE 13 (Portal Asesor)
- **SEC-04** (Crítico) — Las 8 funciones SECURITY DEFINER deben crearse CON guard `auth.uid()` desde el primer commit de FASE 13. CI ya falla si no se incluye.
- **SEC-14** (parcial — extender revoke DELETE a tablas timeline) — Sin esto, asesor puede manipular su propia historia y romper integridad de comisiones/operaciones.

### 6.2 SEC partial requieren tests verificables
- **SEC-04** — Test Vitest: llamar `get_asesor_dashboard(other_user_uuid)` debe lanzar `unauthorized`.
- **SEC-10** — Test Playwright: hammering `/api/trpc/auth.signup` >3 veces en 10 min desde misma IP debe responder 429.
- **SEC-13** — Test: superadmin sin MFA intentando UPDATE en `profiles.rol` debe ser bloqueado (cuando enforcement L-NEW se implemente).
- **SEC-14** — Test: asesor con DELETE en `tareas` debe recibir RLS violation.
- **SEC-18** — Test: API key external rotada en vault, `decrypt_secret` solo retorna a superadmin.

### 6.3 SEC closed con tests recomendados (regression guards)
- **SEC-01/SEC-03** — Test Vitest: `select * from public_profiles where rfc is not null` debe retornar 0 columnas.
- **SEC-02** — Test: asesor intentando UPDATE `profiles.rol` debe recibir `role_escalation_blocked`.
- **SEC-06** — Test: upload >5MB a `profile-avatars` debe fallar.
- **SEC-11** — Test: INSERT en `profiles` con `rfc='RFC123'` debe persistir `rfc_encrypted` no NULL y `rfc` NULL.

---

## 7. Findings y sorpresas

### 7.1 Ya cerrado y puede no estar reflejado en BIBLIA actual
- **SEC-22 (project_views inflable)** — `view_dedup` table + `register_view()` SECDEF helper YA EXISTE. Cuando se cree tabla `project_views`, basta enrutar inserts via `register_view()`. La BIBLIA lo lista como medio pero ya hay infraestructura preventiva.
- **SEC-17 (pgsodium no habilitado)** — Cerrado vía `DO $$` block que falla migration si key no existe. BIBLIA §5.4 confirma `pgcrypto instalado, supabase_vault disponible`.
- **SEC-11 (RFC no cifrado)** — Triggers cifran on INSERT/UPDATE y **nullifican plaintext en la misma fila**. La BIBLIA lo lista como medio pero el cierre es total: plaintext jamás persiste.

### 7.2 Hallazgos no en BIBLIA pero en audit posterior 2026-04-24
El audit `AUDIT_FASE_0_A_11S_2026-04-24.md` agregó 9 CRITICAL nuevos NO listados en BIBLIA SEC-01..23:

- CRITICAL-005: 3 SECURITY DEFINER views sin justificación documentada
- CRITICAL-006: 50 policies qual=true sin `intentional_public`
- CRITICAL-007: 6 funciones con mutable search_path (✅ ya cerrado en `20260424210000_fix_public_bucket_listing_and_search_path.sql`)
- CRITICAL-008: 2 materialized views expuestas vía API
- CRITICAL-009: 2 public storage buckets permitían listing (✅ ya cerrado)

**Implicación:** la lista SEC del BIBLIA es snapshot pre-FASE 11. Documento extendido (§11 futuro) consolida ambas vistas.

### 7.3 SEC referenciados a tablas/funciones que aún no existen
9 SEC son **diferidos** porque el artifact target (tabla/función) no existe en migrations actuales:
- SEC-04 (8 dashboard functions)
- SEC-05 (projects table)
- SEC-08 (webhooks table — solo `score_change_webhooks` existe)
- SEC-09 (qr_codes table)
- SEC-15 (score_subscriptions table)
- SEC-16 (project_landing_pages table)
- SEC-20 (demand_queries table)
- SEC-21 (admin_actions table)
- SEC-23 (avance_obra_log table)

**Mitigación activa:** `audit_rls_violations()` v27 (`20260424230100_audit_rls_allowlist_v27.sql`) detecta automáticamente cualquier nueva tabla sin RLS, policy `qual=true` sin justificación, SECDEF sin search_path, SECDEF sin auth check, VIEW sin security_invoker. CI falla si retorna filas. Los 9 SEC diferidos quedan auto-cubiertos por este guard cuando las tablas se creen.

### 7.4 RLS coverage actual
- BIBLIA §5.4 reporta **110/110 tablas con RLS, 0 sin policies**.
- Migrations totales con `enable row level security`: **159 statements** (algunas tablas tienen >1 enable por re-issue idempotente).
- `audit_rls_allowlist` ha llegado a **v27** (24 versiones desde v3 = una por cada batch de tablas/SECDEF nuevas), confirmando que el ritual `audit:rls allowlist requerido` se mantiene.

### 7.5 Severidad ajustada vs BIBLIA
- **SEC-19** se sube de Medio → Medio compliance-blocking (LFPDPPP). Sin audit de READ de PII, el cifrado SEC-11 pierde valor regulatorio.
- **SEC-04** se mantiene Crítico aunque el target functions no existan, porque el momento de creación (FASE 13) es ya, no es hipotético lejano.
- **SEC-10** sube prácticamente a Alto en producción si Portal Público (FASE 11+) tiene endpoint signup sin rate-limit middleware.

---

## 8. Coverage del audit_rls_violations() guard

Función SECDEF `public.audit_rls_violations()` (v1 → v27 evolutiva) detecta 5 categorías por introspección de `pg_catalog`:

| Categoría | Detecta SEC |
|-----------|-------------|
| `RLS_DISABLED` | Cubre cualquier nueva tabla sin RLS (auto-protege SEC-09, SEC-15, SEC-16, SEC-20, SEC-21, SEC-23 cuando se creen) |
| `POLICY_QUAL_TRUE_UNJUSTIFIED` | SEC-09, SEC-23 (qual=true sin intentional_public) |
| `SECDEF_NO_SEARCH_PATH` | CRITICAL-007 ya cerrado |
| `SECDEF_NO_AUTH_CHECK` | SEC-04 (cuando se creen las 8 funciones) |
| `VIEW_NO_SECURITY_INVOKER` | SEC-01, SEC-03, SEC-05 (auto-protege futuras VIEWs) |

CI job `security-audit` (GitHub Actions) ejecuta `select * from audit_rls_violations()` y falla build si retorna ≥1 fila. Esta es la **defensa primaria automatizada** para los 9 SEC pending que dependen de tablas futuras.

---

## 9. Verificados OK (BIBLIA §5.4 confirmados)

- ✅ 110/110 tablas con RLS habilitado
- ✅ 0 tablas sin policies
- ✅ `contactos.INSERT` valida `asesor_id=auth.uid()`
- ✅ `operaciones.INSERT` valida `asesor=auth.uid()`
- ✅ `operaciones.DELETE` solo superadmin
- ✅ Gamification: SOLO SELECT para owner (no manipula XP via BD)
- ✅ API keys guardadas como hash (`api_keys.key_hash` bcrypt)
- ✅ Security headers Next.js (CSP, HSTS, X-Frame, Referrer-Policy, Permissions-Policy)
- ✅ Anti-duplicados `normalize_phone()` + unique index
- ✅ Audit triggers en `profiles`, `operaciones`, `projects` (cuando exista)
- ✅ Multi-tenancy con `get_visible_asesor_ids()`
- ✅ Broker authorization con `is_authorized_broker()`
- ✅ pgcrypto + supabase_vault + pgsodium instalados

---

## 10. Próximos pasos recomendados

1. **Inmediato (pre-FASE 09):** documentar L-NEW-SEC-14-EXTEND-DELETE-REVOKE en roadmap (extender DELETE revoke a 24 tablas timeline restantes).
2. **FASE 11/12:** L-NEW-SEC-10 (rate-limit tRPC middleware) + L-NEW-SEC-12 (CORS audit) + L-NEW-SEC-19 (PII READ audit RPCs).
3. **FASE 13 (M01 Portal Asesor):** SEC-04 mandatory — incluir guard `auth.uid()` en cada SECDEF dashboard function. Test Vitest obligatorio.
4. **FASE 16 (M14 Marketing):** SEC-09, SEC-16 cubiertos al crear `qr_codes` y `project_landing_pages` con policies correctas.
5. **FASE 22 (Comunicaciones):** SEC-08 cubierto al crear `webhooks` con `secret bytea` cifrado vía `encrypt_secret()`.
6. **Continuous:** mantener ritual `audit:rls allowlist vN+1` por cada batch de tablas/SECDEF nuevas (CLAUDE.md memory `feedback_audit_rls_allowlist`).

---

> **Nota cierre audit:** este documento cubre los 23 SEC del BIBLIA. Para vista única consolidada de seguridad activa al 2026-04-25 ver también `docs/06_AUDITORIAS/AUDIT_FASE_0_A_11S_2026-04-24.md` (CRITICAL-005..009 adicionales).
