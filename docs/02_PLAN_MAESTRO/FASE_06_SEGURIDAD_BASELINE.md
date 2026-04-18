# FASE 06 — Seguridad Baseline

> **Duración estimada:** 3 sesiones Claude Code (~6 horas con agentes paralelos)
> **Dependencias:** [FASE 01 — BD Fundación](./FASE_01_BD_FUNDACION.md), [FASE 02 — Auth y Permisos](./FASE_02_AUTH_Y_PERMISOS.md), [FASE 05 — Multi-country](./FASE_05_I18N_Y_MULTICOUNTRY.md)
> **Bloqueantes externos:**
> - Supabase Vault habilitado (Enterprise feature — verificar con Manu, en Pro se puede usar pgsodium directo como fallback)
> - Pentest partner externo (opcional H1 — recomendado Bug Bounty program en HackerOne para H2). Documentar checklist OWASP Top 10 aquí.
> - Cuenta Sentry con alerting activo + PagerDuty webhook si existe (Fase 24 completa)
> - Acceso administrativo a DNS (para configurar CSP report-uri + HSTS preload)
> - Acceso al admin dashboard de Vercel para WAF rules + Attack Challenge Mode
> **Resultado esperado:** Audit de patrones preventivos verifica que ninguna RLS tiene `USING (true)` sin comentario justificador, todas las SECURITY DEFINER validan `auth.uid()`, `prevent_role_escalation` activo, VIEWs públicas `public_*` en uso exclusivo para datos sin PII. Storage buckets con size/mime limits + INSERT restringido por rol. Secrets encriptados via pgsodium/Vault. CORS allowlist + CSP + HSTS + X-Frame + X-Content-Type en middleware. Rate limit DB operativo. Audit log completo en tablas sensibles. Checklist OWASP Top 10 + LFPDPPP/GDPR-lite documentado. MFA enrollment + backup codes. DELETE prohibido en tablas históricas. Anti-abuse dedup. Tag `fase-06-complete`.
> **Priority:** [H1]

## Contexto y objetivo

Esta fase es un **checkpoint de auditoría**: verifica que los patrones arquitectónicos preventivos de ADR-009 están realmente en uso (las 23 lecciones SEC y 9 DISC del repo viejo se previenen por construcción, no se heredan bugs). También agrega las capas que no se habían tocado: Storage buckets, CSP, rate limit production-grade, pentest prep, anti-abuse. No se permite avanzar a Fase 07 (ingesta de datos reales externos) sin cerrar esta fase: todos los datos que entren deben aterrizar en tablas con RLS probada.

## Bloques

### BLOQUE 6.A — Auditoría de patrones preventivos

#### MÓDULO 6.A.1 — Script audit RLS

**Pasos:**
- `[6.A.1.1]` Crear `scripts/audit-rls.sql` que corre:
  ```sql
  -- 1. Tablas sin RLS habilitado
  SELECT schemaname, tablename FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename NOT LIKE 'partman_%'
    AND NOT rowsecurity;
  -- Expected: 0 filas (todas las tablas con RLS ON).

  -- 2. Policies con qual = 'true' sin comentario justificador
  SELECT schemaname, tablename, policyname, qual
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (qual IS NULL OR qual::text = 'true')
    AND NOT EXISTS (
      SELECT 1 FROM pg_description d
      JOIN pg_policy p ON p.oid = d.objoid
      WHERE p.polname = policyname AND d.description ILIKE '%intentional_public%'
    );
  -- Expected: 0 filas (si hay alguna intencional, debe llevar COMMENT ON POLICY ... IS 'intentional_public: ...').

  -- 3. Funciones SECURITY DEFINER sin SET search_path
  SELECT n.nspname, p.proname, pg_get_functiondef(p.oid)
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.prosecdef AND n.nspname = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'
    );
  -- Expected: 0 filas.

  -- 4. Funciones SECURITY DEFINER sin validar auth.uid()
  -- Heurística: grep def por 'auth.uid()'; alerta si no aparece.
  SELECT p.proname
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.prosecdef AND n.nspname = 'public'
    AND pg_get_functiondef(p.oid) NOT ILIKE '%auth.uid()%';
  -- Expected: solo funciones que explícitamente no lo requieren (set_updated_at, etc.) — revisar manualmente.

  -- 5. VIEWs que NO son security_invoker (pueden filtrar RLS)
  SELECT n.nspname, c.relname, c.reloptions
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'v' AND n.nspname = 'public'
    AND (c.reloptions IS NULL OR NOT ('security_invoker=true' = ANY(c.reloptions)));
  -- Expected: 0 filas o justificación.
  ```
- `[6.A.1.2]` CI job `security-audit` ejecuta este script en cada PR; falla si cualquier query retorna filas inesperadas.
- `[6.A.1.3]` Documentar resultados en `docs/03_CATALOGOS/03.4_CATALOGO_BD_RLS.md`.

**Criterio de done del módulo:**
- [ ] Script corre limpio en CI (0 violaciones).
- [ ] Job bloquea merge si se introduce policy/función insegura.

#### MÓDULO 6.A.2 — Verificación `prevent_role_escalation`

**Pasos:**
- `[6.A.2.1]` Test automatizado `tests/security/role_escalation.test.ts`:
  ```typescript
  test('asesor no puede auto-escalarse a superadmin', async () => {
    const { supabase } = await signInAs('asesor1@test.com');
    const { error } = await supabase.from('profiles').update({ rol: 'superadmin' }).eq('id', asesor1Id);
    expect(error).toBeTruthy();
    expect(error?.code).toBe('42501');                    // permission denied
    expect(error?.message).toContain('role_escalation_blocked');
  });

  test('superadmin puede cambiar rol y se audita', async () => {
    const { supabase } = await signInAs('super@test.com');
    const { error } = await supabase.from('profiles').update({ rol: 'asesor' }).eq('id', someUserId);
    expect(error).toBeFalsy();
    const { data: audit } = await supabase.from('audit_log').select('*').eq('table_name', 'profiles').eq('record_id', someUserId).order('created_at', { ascending: false }).limit(1);
    expect(audit?.[0].action).toBe('RBAC_CHANGE');
  });
  ```
- `[6.A.2.2]` Integrar en CI `npm run test:security`.

**Criterio de done del módulo:**
- [ ] Tests pasan verde.

#### MÓDULO 6.A.3 — Verificación VIEWs públicas en uso

**Pasos:**
- `[6.A.3.1]` Grep del código: cualquier `supabase.from('profiles').select(...).neq('id', authUid)` desde Client Component es flag rojo. Agregar regla Biome custom o script `scripts/grep-unsafe-selects.mjs` que alerta.
- `[6.A.3.2]` Documentar en CLAUDE.md: "SELECT cross-user de `profiles` / `desarrolladoras` / `agencies` / `broker_companies` SOLO desde `public_*` VIEW".

**Criterio de done del módulo:**
- [ ] Script grep corre en CI y no encuentra violaciones.

### BLOQUE 6.B — Storage buckets security

#### MÓDULO 6.B.1 — Crear buckets con policies

**Pasos:**
- `[6.B.1.1]` Migration `storage_buckets.sql`:
  ```sql
  -- Solo desde SQL admin; buckets via supabase storage API tambien:
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES
    ('profile-avatars', 'profile-avatars', true, 5242880, ARRAY['image/png','image/jpeg','image/webp']),
    ('project-photos', 'project-photos', true, 20971520, ARRAY['image/png','image/jpeg','image/webp','image/avif']),
    ('operation-files', 'operation-files', false, 52428800, ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    ('commission-invoices', 'commission-invoices', false, 52428800, ARRAY['application/pdf','application/xml','text/xml']),
    ('dossier-exports', 'dossier-exports', false, 52428800, ARRAY['application/pdf'])
  ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;
  ```
- `[6.B.1.2]` Storage RLS policies por bucket:
  ```sql
  -- profile-avatars: INSERT solo owner, UPDATE owner, DELETE owner
  CREATE POLICY "avatars_insert_owner" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  CREATE POLICY "avatars_update_owner" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  CREATE POLICY "avatars_delete_owner" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

  -- project-photos: INSERT solo admin_desarrolladora de ese project, SELECT público
  CREATE POLICY "photos_insert_dev" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'project-photos' AND public.get_user_role() IN ('admin_desarrolladora','superadmin'));

  -- operation-files: SELECT/INSERT solo participantes de la operación (función is_operation_participant)
  CREATE POLICY "opfiles_select_participant" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'operation-files' AND public.is_operation_participant((storage.foldername(name))[1]::uuid));
  CREATE POLICY "opfiles_insert_participant" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'operation-files' AND public.is_operation_participant((storage.foldername(name))[1]::uuid));

  -- commission-invoices: SELECT/INSERT solo dev owner + mb_admin + superadmin
  CREATE POLICY "invoices_dev_only" ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'commission-invoices' AND public.get_user_role() IN ('admin_desarrolladora','mb_admin','superadmin'));

  -- dossier-exports: SELECT/INSERT solo creator (generator) + superadmin
  CREATE POLICY "dossier_creator" ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'dossier-exports' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_superadmin()));
  ```
- `[6.B.1.3]` Convención de path: `bucket/<entity_id>/<file>.ext` — primer folder es el dueño (uuid).
- `[6.B.1.4]` Client upload helper `shared/lib/storage/upload.ts` que valida mime + size antes de upload (defense in depth).

**Criterio de done del módulo:**
- [ ] 5 buckets creados con limits correctos.
- [ ] Policies activas y testeadas.

### BLOQUE 6.C — Secrets management (Vault + pgsodium)

#### MÓDULO 6.C.1 — Encriptar campos sensibles

**Pasos:**
- `[6.C.1.1]` Columnas a encriptar:
  - `profiles.rfc` → `profiles.rfc_encrypted BYTEA` + retire plaintext.
  - `profiles.tax_id` → `profiles.tax_id_encrypted BYTEA`.
  - `desarrolladoras.tax_id` ya tiene `tax_id_encrypted BYTEA` (Fase 01) — ahora poblar + dropear plaintext.
  - `webhook_subscriptions.secret` → nunca en plaintext (hash bcrypt + show solo al crear).
  - `api_keys.key_hash` (en vez de key directo).
- `[6.C.1.2]` Helper `encrypt_secret` / `decrypt_secret` via pgsodium:
  ```sql
  CREATE OR REPLACE FUNCTION public.encrypt_secret(p_plaintext TEXT)
  RETURNS BYTEA LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
  DECLARE v_key UUID;
  BEGIN
    v_key := (SELECT id FROM pgsodium.valid_key WHERE name = 'default_secret_key' LIMIT 1);
    RETURN pgsodium.crypto_aead_det_encrypt(convert_to(p_plaintext, 'utf8'), 'aad', v_key);
  END $$;

  CREATE OR REPLACE FUNCTION public.decrypt_secret(p_ciphertext BYTEA)
  RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
  DECLARE v_key UUID;
  BEGIN
    IF NOT public.is_superadmin() THEN RAISE EXCEPTION 'unauthorized'; END IF;
    v_key := (SELECT id FROM pgsodium.valid_key WHERE name = 'default_secret_key' LIMIT 1);
    RETURN convert_from(pgsodium.crypto_aead_det_decrypt(p_ciphertext, 'aad', v_key), 'utf8');
  END $$;
  ```
- `[6.C.1.3]` Trigger en `desarrolladoras` que encripta `tax_id` automáticamente:
  ```sql
  CREATE OR REPLACE FUNCTION public.desarrolladoras_encrypt_tax()
  RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
  BEGIN
    IF NEW.tax_id IS NOT NULL AND (OLD IS NULL OR OLD.tax_id IS DISTINCT FROM NEW.tax_id) THEN
      NEW.tax_id_encrypted := public.encrypt_secret(NEW.tax_id);
    END IF;
    RETURN NEW;
  END $$;
  CREATE TRIGGER trg_desarrolladoras_encrypt BEFORE INSERT OR UPDATE ON public.desarrolladoras
    FOR EACH ROW EXECUTE FUNCTION public.desarrolladoras_encrypt_tax();
  ```
- `[6.C.1.4]` Agregar tabla `api_keys`:
  ```sql
  CREATE TABLE public.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,                   -- primeros 8 chars visibles ('dmx_abc1')
    key_hash TEXT NOT NULL,                     -- bcrypt del full key
    scopes TEXT[] NOT NULL DEFAULT '{}',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE UNIQUE INDEX idx_apikeys_prefix ON public.api_keys (key_prefix) WHERE revoked_at IS NULL;
  ```

**Criterio de done del módulo:**
- [ ] Trigger encripta auto + decrypt solo para superadmin.
- [ ] `api_keys.key_hash` nunca almacena key plaintext.

### BLOQUE 6.D — CORS allowlist + CSP + HSTS + headers

#### MÓDULO 6.D.1 — Middleware security headers

**Pasos:**
- `[6.D.1.1]` Extender `middleware.ts` (Fase 02) para agregar headers security:
  ```typescript
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'nonce-${nonce}' https://*.posthog.com https://*.sentry.io",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://qxfuqwlktmhokwwlvggy.supabase.co https://*.mapbox.com https://*.cloudinary.com",
    "connect-src 'self' https://qxfuqwlktmhokwwlvggy.supabase.co wss://qxfuqwlktmhokwwlvggy.supabase.co https://*.posthog.com https://*.sentry.io https://api.mapbox.com https://openexchangerates.org https://api.anthropic.com https://api.openai.com https://ai-gateway.vercel.sh",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
    "report-uri /api/security/csp-report"
  ].join('; ');

  res.headers.set('Content-Security-Policy', csp);
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(self), payment=(self)');
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  res.headers.set('Cross-Origin-Resource-Policy', 'same-site');
  ```
- `[6.D.1.2]` CORS: `next.config.ts` no usa CORS global por default; para API routes que necesitan cross-origin (ej: `/api/public/*`), explicit allowlist:
  ```typescript
  const ALLOWED_ORIGINS = ['https://desarrollosmx.com', 'https://app.desarrollosmx.com', 'https://api.desarrollosmx.com'];
  ```
- `[6.D.1.3]` Endpoint `app/api/security/csp-report/route.ts` que captura violaciones y las manda a Sentry.
- `[6.D.1.4]` Configurar HSTS preload en hstspreload.org cuando dominio esté verificado.

**Criterio de done del módulo:**
- [ ] Chrome devtools Security tab muestra CSP + HSTS.
- [ ] CSP violations aparecen en Sentry.

### BLOQUE 6.E — Rate limit DB production-grade

#### MÓDULO 6.E.1 — Rate limit por endpoint + por IP + global

**Pasos:**
- `[6.E.1.1]` Extender `check_rate_limit_db` de Fase 02 con IP fallback (para rutas no autenticadas):
  ```sql
  CREATE OR REPLACE FUNCTION public.check_rate_limit_db(
    p_key TEXT,                                 -- 'user:<uuid>' | 'ip:<ip>' | 'global:<endpoint>'
    p_endpoint TEXT,
    p_window_sec INT,
    p_max_calls INT
  ) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
  ...
  $$;
  ```
- `[6.E.1.2]` Políticas por endpoint:
  - `auth.signup`: 3 calls / 10 min per IP.
  - `auth.password-reset`: 5 / 1 hora per IP.
  - `ai.*`: 60 / min per user.
  - `public.*`: 100 / min per IP.
  - Global: 10000 / min.
- `[6.E.1.3]` Edge Config duplicate rule table (para expresividad) + sync con DB.

**Criterio de done del módulo:**
- [ ] 401/403/429 correcto según caso.
- [ ] Endpoint signup blocked al 4to intento en 10 min.

### BLOQUE 6.F — Audit log completo

#### MÓDULO 6.F.1 — Trigger en más tablas críticas

**Pasos:**
- `[6.F.1.1]` Extender `audit_row_change` (Fase 02) a:
  - `desarrolladoras` (cambios razon_social, tax_id).
  - `subscriptions` (status change).
  - `plans` (price change).
  - `feature_registry` (enable/disable).
  - `role_features`.
  - `profile_feature_overrides`.
  - `api_keys` (create, revoke).
  - `fiscal_docs` (issue, cancel).
  - `storage.objects` (delete flagged) — trigger en bucket sensibles.
- `[6.F.1.2]` Retención `audit_log`: 7 años (LFPDPPP MX requiere 5; SAT MX 5; margen safety). Particionamiento pg_partman monthly (Fase 01) + política de archivo S3 tras 1 año.

**Criterio de done del módulo:**
- [ ] Audit log se llena en todos los cambios.

### BLOQUE 6.G — Pentest preparation + checklist OWASP

#### MÓDULO 6.G.1 — Checklist OWASP Top 10

**Pasos:**
- `[6.G.1.1]` Crear `docs/05_OPERACIONAL/pentest-checklist.md` con OWASP Top 10 2021:
  - [x] A01 Broken Access Control → RLS + trigger `prevent_role_escalation`.
  - [x] A02 Cryptographic Failures → pgsodium + HSTS + httpOnly cookies.
  - [x] A03 Injection → Zod validation + parametrized queries (Supabase default).
  - [x] A04 Insecure Design → review de diseño por Claude Code + ADR-009.
  - [x] A05 Security Misconfiguration → CSP + default deny RLS.
  - [x] A06 Vulnerable Components → `npm audit` + Dependabot en CI.
  - [x] A07 Auth Failures → MFA obligatorio + password policy + rate limit.
  - [x] A08 Software/Data Integrity → CI `db-types-check` + signed migrations.
  - [x] A09 Logging Failures → audit_log + Sentry + PostHog.
  - [x] A10 SSRF → allowlist para fetches internos, no user-controlled URLs sin validar.
- `[6.G.1.2]` LFPDPPP MX checklist:
  - Aviso de privacidad en landing (link footer).
  - Derechos ARCO endpoint (`/api/privacy/data-export`, `/api/privacy/data-delete`).
  - DPA con vendors (Supabase, Vercel, Sentry, PostHog).
  - Notificación de brecha < 72h.
- `[6.G.1.3]` GDPR-lite (preparación para US + EU H2): cookie banner, consent management, right to be forgotten.

**Criterio de done del módulo:**
- [ ] Checklist marcado con evidencias.

### BLOQUE 6.H — 2FA enrollment + backup codes flow

#### MÓDULO 6.H.1 — Verificación flow completo

(Ya construido en Fase 02 bloque 2.B; aquí checkpoint.)

**Pasos:**
- `[6.H.1.1]` UI `/profile/seguridad` muestra: MFA status, factors activos, backup codes (regenerar con confirmación), sessions activas (desde `auth_sessions_log`), sign-out-all button.
- `[6.H.1.2]` Endpoint `POST /profile/backup-codes/regenerate` invalida códigos anteriores y genera 10 nuevos.
- `[6.H.1.3]` Recordatorios por email si user tiene rol admin y MFA off > 7 días (cron `mfa_reminders`).

**Criterio de done del módulo:**
- [ ] UI completa funcional.
- [ ] Backup codes regenerados correctamente.

### BLOQUE 6.I — Prohibido DELETE en tablas históricas

#### MÓDULO 6.I.1 — REVOKE DELETE en tablas append-only

**Pasos:**
- `[6.I.1.1]` Migration `no_delete_historical.sql`:
  ```sql
  REVOKE DELETE ON public.audit_log FROM authenticated, anon, service_role;
  REVOKE DELETE ON public.auth_sessions_log FROM authenticated, anon, service_role;
  REVOKE DELETE ON public.rate_limit_log FROM authenticated, anon;      -- service_role sí puede para prune
  REVOKE DELETE ON public.fx_rates FROM authenticated, anon;

  -- Futuras (referencia Fase 07+):
  -- actividad_timeline, interaction_feedback, project_views
  ```
- `[6.I.1.2]` Documentar política en ADR-009 + SECURITY.md.

**Criterio de done del módulo:**
- [ ] DELETE desde service_role sobre `audit_log` falla.

### BLOQUE 6.J — Anti-abuse + dedup

#### MÓDULO 6.J.1 — Dedup `project_views` + rate demand_queries

(Tablas no existen aún; los patrones se preparan para que Fase 07+ los consuma.)

**Pasos:**
- `[6.J.1.1]` Helper tabla genérico `view_dedup`:
  ```sql
  CREATE TABLE public.view_dedup (
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    dedup_key TEXT NOT NULL,                    -- hash(session_id + user_id)
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (entity_type, entity_id, dedup_key, viewed_at)
  );
  CREATE INDEX idx_view_dedup_recent ON public.view_dedup (entity_type, entity_id, dedup_key, viewed_at DESC);
  ```
- `[6.J.1.2]` Función `register_view(entity_type, entity_id, session_id)` que solo inserta si no hubo view en últimos 30 min con misma dedup_key.
- `[6.J.1.3]` `demand_queries` rate limit: en Fase 17+ al construir feature, usar `check_rate_limit_db` con key `demand:<country>:<zone>` límite 20/min por IP.

**Criterio de done del módulo:**
- [ ] Función `register_view` no duplica en 30 min.

### BLOQUE 6.K — Privacy endpoints (ARCO / GDPR-lite)

#### MÓDULO 6.K.1 — Export + delete user data

**Pasos:**
- `[6.K.1.1]` Endpoint `GET /api/privacy/data-export` (authenticated): genera ZIP con JSON de todas las tablas donde user es owner + lo manda por email Resend con link temporal (24h) en Supabase Storage bucket `dossier-exports`.
- `[6.K.1.2]` Endpoint `POST /api/privacy/data-delete` (authenticated + confirmación via email double opt-in): marca `profile.deleted_at` + anonimiza PII (email → `deleted-<id>@anon.local`, first_name → 'Deleted', last_name → 'User') + DELETE cascada en datos no-históricos. Audit log conserva registro anonimizado.
- `[6.K.1.3]` Job `scheduled_delete` cron diario: hard delete de `profile.deleted_at + 30 días` (ventana de arrepentimiento).

**Criterio de done del módulo:**
- [ ] Export funciona end-to-end.
- [ ] Delete respeta ventana 30 días.

## Criterio de done de la FASE

- [ ] Script `audit-rls.sql` corre verde en CI.
- [ ] Tests de seguridad (`role_escalation`, PII leak, storage) pasan.
- [ ] 5 Storage buckets con size/mime limits + RLS por rol.
- [ ] pgsodium encriptando `rfc`, `tax_id` via trigger.
- [ ] `api_keys` con key_hash (bcrypt), nunca plaintext.
- [ ] CSP + HSTS + X-Frame + X-Content + Permissions-Policy en middleware.
- [ ] Report endpoint CSP funciona.
- [ ] Rate limit DB con 3 tipos (user/IP/global) operativo.
- [ ] Audit log extendido a 10+ tablas.
- [ ] Checklist OWASP Top 10 + LFPDPPP + GDPR-lite documentado.
- [ ] MFA enrollment UI completa con backup codes regenerables.
- [ ] REVOKE DELETE en tablas históricas aplicado.
- [ ] View dedup anti-abuse listo.
- [ ] Privacy endpoints ARCO (export + delete).
- [ ] Tag git: `fase-06-complete`.
- [ ] Sign-off de Manu tras review del checklist.

## Features implementadas en esta fase (≈ 25)

1. **F-06-01** Script `audit-rls.sql` + CI job `security-audit`
2. **F-06-02** Test `prevent_role_escalation` en CI
3. **F-06-03** Verificación VIEWs `public_*` (grep SELECT directo)
4. **F-06-04** Bucket `profile-avatars` (5MB, image/*) + RLS owner
5. **F-06-05** Bucket `project-photos` (20MB, image/*) + RLS dev
6. **F-06-06** Bucket `operation-files` (50MB, pdf/doc) + RLS participant
7. **F-06-07** Bucket `commission-invoices` (50MB, pdf/xml) + RLS dev+mb
8. **F-06-08** Bucket `dossier-exports` (50MB, pdf) + RLS creator
9. **F-06-09** pgsodium encryption `rfc`, `tax_id` via trigger
10. **F-06-10** Tabla `api_keys` con key_hash bcrypt + prefix visible
11. **F-06-11** CSP strict con nonce + report-uri
12. **F-06-12** HSTS + X-Frame + X-Content + Referrer-Policy + Permissions-Policy
13. **F-06-13** CORS allowlist para rutas cross-origin
14. **F-06-14** Endpoint `/api/security/csp-report` → Sentry
15. **F-06-15** Rate limit DB con user/IP/global + políticas per endpoint
16. **F-06-16** Audit log trigger en 10+ tablas críticas (incl subscriptions, plans, feature_registry, api_keys, fiscal_docs)
17. **F-06-17** Pentest checklist OWASP Top 10 documentado
18. **F-06-18** LFPDPPP MX + GDPR-lite compliance doc
19. **F-06-19** UI `/profile/seguridad` con MFA status + sessions + sign-out-all
20. **F-06-20** Backup codes regenerables
21. **F-06-21** Cron `mfa_reminders` para admins sin MFA > 7 días
22. **F-06-22** REVOKE DELETE en tablas append-only (audit_log, sessions_log, fx_rates)
23. **F-06-23** Tabla genérica `view_dedup` + función `register_view`
24. **F-06-24** Privacy endpoint `/api/privacy/data-export` (ARCO access)
25. **F-06-25** Privacy endpoint `/api/privacy/data-delete` con ventana 30 días

## Próxima fase

[FASE 07 — Ingesta de Datos](./FASE_07_INGESTA_DATOS.md)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent C) | **Fecha:** 2026-04-17
