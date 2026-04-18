# FASE 02 — Auth y Permisos

> **Duración estimada:** 3 sesiones Claude Code (~6 horas con agentes paralelos)
> **Dependencias:** [FASE 00 — Bootstrap](./FASE_00_BOOTSTRAP.md), [FASE 01 — BD Fundación](./FASE_01_BD_FUNDACION.md)
> **Bloqueantes externos:**
> - Supabase Auth habilitado en `qxfuqwlktmhokwwlvggy` (default en Supabase, verificar)
> - Twilio SMS como fallback para MFA cuando usuario no tiene authenticator (Manu debe crear cuenta Twilio + verificar número origen para cada país objetivo)
> - Cuenta Resend para emails transaccionales (signup confirmation, password reset)
> - Dominio + SPF/DKIM/DMARC configurado para `desarrollosmx.com` (evitar bounces en confirmación)
> - (Opcional H2) Credenciales OAuth Google + Apple si se quiere activar en H1 (pin para H2 por default)
> **Resultado esperado:** Sistema de autenticación completo con email+password + MFA TOTP obligatorio para roles sensibles, flow signup → verify → onboarding → role assignment, trigger `prevent_role_escalation` activo bloqueando auto-escalación, VIEW `public_profiles` sin PII, RLS policies canónicas aplicadas a todas las tablas de Fase 01, middleware Next.js enforcing sesión válida, tRPC `authenticatedProcedure` con rate limit, feature gating runtime vía `resolve_features`, session security endurecido, audit log automático en tablas sensibles. Tag `fase-02-complete`.
> **Priority:** [H1]

## Contexto y objetivo

Esta fase cierra la primera capa de seguridad. Implementa los 4 hallazgos SEC críticos del audit (SEC-01 PII, SEC-02 escalación, SEC-03 RFC expuesto, SEC-04 funciones sin auth.uid() — todos previstos por patrón desde Fase 01). Deja MFA obligatorio para roles administrativos. Introduce el patrón arquitectónico de VIEW `public_profiles` para todo consumo público, eliminando la clase de bug "filtrar PII vía SELECT directo". Los módulos de negocio (Fases 13+) solo pueden asumir usuario autenticado y rol validado tras esta fase.

## Bloques

### BLOQUE 2.A — Supabase Auth setup

#### MÓDULO 2.A.1 — Configuración Auth provider

**Pasos:**
- `[2.A.1.1]` En `supabase/config.toml`: asegurar `[auth] enable_signup = true`, `jwt_expiry = 3600`, `refresh_token_rotation_enabled = true`, `refresh_token_reuse_interval = 10`, `[auth.email] enable_confirmations = true, double_confirm_changes = true, secure_password_change = true`, `[auth.sms] enable_signup = false` (SMS solo como MFA backup).
- `[2.A.1.2]` Configurar SMTP en Supabase dashboard (o `config.toml`): host Resend (smtp.resend.com, 587, user resend, pass API key), sender `noreply@desarrollosmx.com`, templates customizados.
- `[2.A.1.3]` Templates email (edit en dashboard): confirm signup, magic link, recovery — i18n básico ES (en Fase 05 se completan los 5 locales).
- `[2.A.1.4]` OAuth Google/Apple: dejar stubbed (set `enable = false` en config) — activación H2 pin.
- `[2.A.1.5]` Password policy: `[auth.email] password_min_length = 12`, requerir uppercase + lowercase + digit + symbol (validar en client via Zod + server en trigger).

**Criterio de done del módulo:**
- [ ] `supabase status` muestra Auth corriendo.
- [ ] Signup manual via `supabase.auth.signUp` dispara email de confirmación que llega a inbox.
- [ ] Password débil (< 12 chars) es rechazado por Zod client + trigger server.

#### MÓDULO 2.A.2 — Clientes cookie-based SSR

**Pasos:**
- `[2.A.2.1]` Actualizar `shared/lib/supabase/server.ts` para usar cookies con `httpOnly: true, secure: true (prod), sameSite: 'lax', path: '/'` — heredar política de `@supabase/ssr`.
- `[2.A.2.2]` Crear helper `getUser()` en `server/trpc/context.ts`: `const { data: { user } } = await supabase.auth.getUser();` — NUNCA usar `getSession()` en server (inseguro, no verifica firma JWT).
- `[2.A.2.3]` En context tRPC: cargar `profile` completo tras validar user, para evitar queries repetidas.

**Criterio de done del módulo:**
- [ ] Cookies JWT firman httpOnly + secure en prod.
- [ ] `getUser()` valida firma en servidor.

### BLOQUE 2.B — MFA/2FA obligatorio para roles admin/dev/MB

#### MÓDULO 2.B.1 — Enrollment TOTP

**Pasos:**
- `[2.B.1.1]` Crear ruta `app/(public)/auth/mfa-enroll/page.tsx` (post-signup wizard): usa `supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator' })` → muestra QR + secret key.
- `[2.B.1.2]` Step 2: usuario ingresa OTP de 6 dígitos → `supabase.auth.mfa.challenge({ factorId }).then(verify({ factorId, challengeId, code }))`.
- `[2.B.1.3]` On success: `profile.meta.mfa_enabled = true` + generar 10 `backup_codes` hashados bcrypt.
- `[2.B.1.4]` Tabla `auth_backup_codes`:
  ```sql
  CREATE TABLE public.auth_backup_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_bc_profile ON public.auth_backup_codes (profile_id) WHERE used_at IS NULL;
  ```
- `[2.B.1.5]` Enforce: para roles `superadmin`, `admin_desarrolladora`, `mb_admin`, `mb_coordinator` — middleware redirige a `/auth/mfa-enroll` si `profile.meta.mfa_enabled != true`.

**Criterio de done del módulo:**
- [ ] QR se renderiza con `qrcode.react`.
- [ ] Enroll + verify funciona end-to-end.
- [ ] Backup codes generados y visibles una sola vez.

#### MÓDULO 2.B.2 — MFA challenge en login

**Pasos:**
- `[2.B.2.1]` En ruta `app/(public)/auth/login/page.tsx`: tras `signInWithPassword` → check `data.user.factors` — si `totp` factor activo, redirigir a `/auth/mfa-verify?aal=aal2`.
- `[2.B.2.2]` Página `/auth/mfa-verify`: `supabase.auth.mfa.challengeAndVerify({ factorId, code })`. Permitir uso de backup code: match contra `auth_backup_codes.code_hash` → si válido, marcar `used_at = now()`.
- `[2.B.2.3]` Middleware Next.js: para rutas admin/dev — si `session.aal !== 'aal2'` → redirect a `/auth/mfa-verify`.
- `[2.B.2.4]` SMS fallback (Twilio): endpoint `app/api/auth/sms-otp/route.ts` genera código 6 dígitos → `profiles.meta.last_sms_otp_hash` + TTL 5 min. Validar en `/auth/mfa-verify` si user marcó "no tengo authenticator".

**Criterio de done del módulo:**
- [ ] Login con MFA redirige a challenge.
- [ ] AAL2 requerido para admin portals.
- [ ] SMS fallback funciona.

### BLOQUE 2.C — Flow signup → verify → onboarding → role assignment

#### MÓDULO 2.C.1 — Signup wizard

**Pasos:**
- `[2.C.1.1]` `app/(public)/auth/signup/page.tsx`: formulario con email, password (Zod min 12), first_name, last_name, country_code (select), preferred_locale, accept_tos.
- `[2.C.1.2]` On submit: `supabase.auth.signUp({ email, password, options: { data: { first_name, last_name, country_code, preferred_locale } } })`.
- `[2.C.1.3]` Trigger `on_auth_user_created` (SQL) inserta row en `profiles` con defaults:
  ```sql
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
  BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name, country_code, preferred_locale, rol, is_active, is_approved)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'country_code', 'MX'),
      COALESCE(NEW.raw_user_meta_data->>'preferred_locale', 'es-MX'),
      'comprador',                             -- default mínimo privilegio
      true,
      false                                    -- requiere aprobación admin para roles elevados
    );
    RETURN NEW;
  END $$;
  CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  ```
- `[2.C.1.4]` Confirm email → redirect `/auth/onboarding`.

**Criterio de done del módulo:**
- [ ] Signup crea auth.users + profiles row automáticamente.
- [ ] Default role = `comprador` (jamás elevado en signup).

#### MÓDULO 2.C.2 — Onboarding + role request

**Pasos:**
- `[2.C.2.1]` `/auth/onboarding`: user elige intención — "Soy asesor" | "Soy desarrolladora" | "Soy comprador" | "Vendedor particular".
- `[2.C.2.2]` Si elige asesor/dev: formulario adicional con tax_id, razon_social, agency_id (si aplica) → status `profile.is_approved = false` + notificación a admins.
- `[2.C.2.3]` Tabla `role_requests`:
  ```sql
  CREATE TABLE public.role_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    requested_role user_role NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    reason TEXT,
    approver_id UUID REFERENCES public.profiles(id),
    decided_at TIMESTAMPTZ,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ```
- `[2.C.2.4]` tRPC procedure `roleRequest.submit` + `roleRequest.approve` (solo superadmin/mb_admin) → al aprobar: UPDATE `profiles.rol` + `profiles.is_approved = true`.

**Criterio de done del módulo:**
- [ ] User comprador puede completar onboarding sin approval.
- [ ] User asesor queda en `pending` hasta aprobación.

### BLOQUE 2.D — Trigger `prevent_role_escalation` (NO-NEGOCIABLE — SEC-02)

#### MÓDULO 2.D.1 — Función + trigger BEFORE UPDATE

**Pasos:**
- `[2.D.1.1]` Migration `prevent_role_escalation.sql`:
  ```sql
  CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
  RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
  DECLARE v_actor_uid UUID; v_actor_role user_role;
  BEGIN
    v_actor_uid := auth.uid();
    -- Permitir operaciones del service_role (crons/seeds) pero auditar
    IF current_setting('role', true) = 'service_role' THEN
      IF OLD.rol IS DISTINCT FROM NEW.rol OR OLD.is_approved IS DISTINCT FROM NEW.is_approved OR OLD.is_active IS DISTINCT FROM NEW.is_active THEN
        INSERT INTO public.audit_log (actor_id, action, table_name, record_id, before, after, meta)
        VALUES (NULL, 'RBAC_SERVICE_ROLE_CHANGE', 'profiles', NEW.id,
                jsonb_build_object('rol', OLD.rol, 'is_approved', OLD.is_approved, 'is_active', OLD.is_active),
                jsonb_build_object('rol', NEW.rol, 'is_approved', NEW.is_approved, 'is_active', NEW.is_active),
                jsonb_build_object('note', 'service_role bypass'));
      END IF;
      RETURN NEW;
    END IF;
    -- Detectar cambios en campos sensibles
    IF OLD.rol IS DISTINCT FROM NEW.rol
       OR OLD.is_approved IS DISTINCT FROM NEW.is_approved
       OR OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      -- Solo superadmin puede cambiar estos campos
      SELECT rol INTO v_actor_role FROM public.profiles WHERE id = v_actor_uid;
      IF v_actor_role IS DISTINCT FROM 'superadmin' THEN
        RAISE EXCEPTION 'role_escalation_blocked: only superadmin can modify rol/is_approved/is_active' USING ERRCODE = '42501';
      END IF;
      -- Auditar cambio legítimo
      INSERT INTO public.audit_log (actor_id, actor_role, action, table_name, record_id, before, after)
      VALUES (v_actor_uid, v_actor_role, 'RBAC_CHANGE', 'profiles', NEW.id,
              jsonb_build_object('rol', OLD.rol, 'is_approved', OLD.is_approved, 'is_active', OLD.is_active),
              jsonb_build_object('rol', NEW.rol, 'is_approved', NEW.is_approved, 'is_active', NEW.is_active));
    END IF;
    RETURN NEW;
  END $$;

  DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
  CREATE TRIGGER trg_prevent_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();
  ```
- `[2.D.1.2]` Test explícito en `tests/security/role_escalation.test.ts` — simular un asesor autenticado que hace `UPDATE profiles SET rol='superadmin' WHERE id=auth.uid()` → debe fallar con error `role_escalation_blocked`.
- `[2.D.1.3]` Test con superadmin debe pasar + generar row en `audit_log`.
- `[2.D.1.4]` Documentar el trigger en `docs/01_DECISIONES_ARQUITECTONICAS/ADR-009_SECURITY_MODEL.md`.

**Criterio de done del módulo:**
- [ ] Trigger activo (`\d+ profiles` lo muestra).
- [ ] Test asesor-escalación falla como se espera.
- [ ] Test superadmin-cambio pasa + audit row insertado.

### BLOQUE 2.E — VIEW `public_profiles` sin PII (SEC-01)

#### MÓDULO 2.E.1 — VIEW + eliminación de SELECT directo

**Pasos:**
- `[2.E.1.1]` Crear VIEW:
  ```sql
  CREATE OR REPLACE VIEW public.public_profiles
  WITH (security_invoker = true)                  -- respeta RLS del invocador
  AS
  SELECT
    id, country_code, first_name, last_name, full_name,
    slug, avatar_url, rol,
    (meta->>'bio')::TEXT AS bio,
    (meta->>'public_portfolio_url')::TEXT AS public_portfolio_url,
    created_at
  FROM public.profiles
  WHERE is_active = true AND is_approved = true;

  GRANT SELECT ON public.public_profiles TO anon, authenticated;
  COMMENT ON VIEW public.public_profiles IS 'VIEW segura sin PII (email/phone/rfc/tax_id/razon_social/docs). Uso obligatorio en cualquier SELECT público.';
  ```
- `[2.E.1.2]` Agregar lint/policy: en `CLAUDE.md` y ADR-009 documentar "Cualquier SELECT de `profiles` desde cliente público debe ir contra `public_profiles`".
- `[2.E.1.3]` Crear RLS policy en `profiles` que bloquee SELECT de PII a no-owners + no-superadmin:
  ```sql
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

  CREATE POLICY profiles_select_self_or_super ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.is_superadmin());

  -- INSERT/UPDATE por self o superadmin (con prevent_role_escalation trigger limitando campos)
  CREATE POLICY profiles_update_self ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_superadmin())
    WITH CHECK (id = auth.uid() OR public.is_superadmin());
  ```

**Criterio de done del módulo:**
- [ ] VIEW `public_profiles` creada.
- [ ] RLS en `profiles` bloquea SELECT cross-user.
- [ ] Consumo público lee de `public_profiles`.

### BLOQUE 2.F — RLS policies canónicas

Patrón global: owner = `auth.uid()`, visibility via `get_visible_asesor_ids()`, broker via `is_authorized_broker`, superadmin override.

#### MÓDULO 2.F.1 — Policies `desarrolladoras`, `agencies`, `broker_companies`

**Pasos:**
- `[2.F.1.1]` Policy `desarrolladoras`:
  ```sql
  ALTER TABLE public.desarrolladoras ENABLE ROW LEVEL SECURITY;

  CREATE POLICY desarrolladoras_select_members ON public.desarrolladoras
    FOR SELECT TO authenticated
    USING (
      public.is_superadmin()
      OR id IN (SELECT desarrolladora_id FROM public.profiles WHERE id = auth.uid())
      OR is_verified = true AND is_active = true    -- listado público de verificadas en marketplace
    );

  -- Crear VIEW pública sin tax_id+contact_phone
  CREATE OR REPLACE VIEW public.public_desarrolladoras WITH (security_invoker = true) AS
    SELECT id, country_code, name, website, logo_url, slug, is_verified, created_at
    FROM public.desarrolladoras WHERE is_verified AND is_active;
  GRANT SELECT ON public.public_desarrolladoras TO anon, authenticated;
  ```
- `[2.F.1.2]` Policies analogas para `agencies`, `broker_companies`, con VIEWs públicas sin tax_id.
- `[2.F.1.3]` UPDATE: solo superadmin + admin_desarrolladora (del mismo `desarrolladora_id`).

**Criterio de done del módulo:**
- [ ] RLS activo en las 3 tablas.
- [ ] VIEWs públicas no exponen tax_id.

#### MÓDULO 2.F.2 — Policies `addresses`

**Pasos:**
- `[2.F.2.1]` RLS:
  ```sql
  ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

  CREATE POLICY addresses_select_owner ON public.addresses
    FOR SELECT TO authenticated
    USING (
      public.is_superadmin()
      OR (owner_type = 'profile' AND owner_id = auth.uid())
      OR (owner_type = 'desarrolladora' AND owner_id IN (SELECT desarrolladora_id FROM public.profiles WHERE id = auth.uid()))
      -- otros owner_types se agregan en Fases 07+ (projects, units)
    );

  CREATE POLICY addresses_insert_owner ON public.addresses
    FOR INSERT TO authenticated
    WITH CHECK (
      (owner_type = 'profile' AND owner_id = auth.uid())
      OR (owner_type = 'desarrolladora' AND owner_id IN (SELECT desarrolladora_id FROM public.profiles WHERE id = auth.uid() AND rol IN ('admin_desarrolladora', 'superadmin')))
    );
  ```

**Criterio de done del módulo:**
- [ ] RLS activo.
- [ ] INSERT cross-owner falla.

#### MÓDULO 2.F.3 — Policies `subscriptions`, `plans`, `feature_registry`, `role_features`, `profile_feature_overrides`

**Pasos:**
- `[2.F.3.1]` `plans` + `feature_registry` + `role_features`: SELECT público a todos (is_enabled = true). INSERT/UPDATE solo superadmin.
- `[2.F.3.2]` `subscriptions`: SELECT por subject owner + superadmin. INSERT/UPDATE solo backend (service_role) — clientes no crean subscriptions directamente (via Stripe webhook).
- `[2.F.3.3]` `profile_feature_overrides`: SELECT por profile_id = auth.uid() + superadmin. INSERT/UPDATE solo superadmin/mb_admin.

**Criterio de done del módulo:**
- [ ] Las 5 tablas con RLS habilitado.
- [ ] Tests: user X no puede ver subscriptions de user Y.

#### MÓDULO 2.F.4 — Policies `audit_log`, `role_requests`

**Pasos:**
- `[2.F.4.1]` `audit_log`: SELECT solo superadmin + self (filtrado por actor_id = auth.uid()). INSERT solo via trigger (no directo desde cliente). DELETE → REVOKE ALL (ver Fase 06).
- `[2.F.4.2]` `role_requests`: SELECT por profile_id = auth.uid() + aprobadores (superadmin, mb_admin). INSERT por self (requested_role != 'superadmin' — constraint). UPDATE (approve/reject) solo aprobadores.

**Criterio de done del módulo:**
- [ ] Tests: asesor no puede INSERT en `audit_log` manualmente.
- [ ] Test: self puede leer sus propias entries `audit_log` (filtrado).

### BLOQUE 2.G — Middleware Next.js

#### MÓDULO 2.G.1 — Enforce sesión + is_active + is_approved

**Pasos:**
- `[2.G.1.1]` Crear `middleware.ts` raíz:
  ```typescript
  import { createServerClient } from '@supabase/ssr';
  import { type NextRequest, NextResponse } from 'next/server';

  export async function middleware(req: NextRequest) {
    const res = NextResponse.next();
    const supabase = createServerClient(/* cookies handler */);
    const { data: { user } } = await supabase.auth.getUser();

    const pathname = req.nextUrl.pathname;
    const isPublic = pathname.startsWith('/_next') || pathname.startsWith('/api/public') || pathname === '/' || pathname.startsWith('/auth') || pathname.startsWith('/marketplace');
    if (isPublic) return res;

    if (!user) return NextResponse.redirect(new URL('/auth/login', req.url));

    // Cargar profile para checks
    const { data: profile } = await supabase.from('profiles').select('is_active, is_approved, rol, meta').eq('id', user.id).single();
    if (!profile) return NextResponse.redirect(new URL('/auth/logout', req.url));
    if (!profile.is_active) return NextResponse.redirect(new URL('/auth/inactive', req.url));
    if (!profile.is_approved && ['asesor','admin_desarrolladora','broker_manager'].includes(profile.rol)) {
      return NextResponse.redirect(new URL('/auth/pending-approval', req.url));
    }
    // MFA enforcement para roles sensibles
    if (['superadmin','admin_desarrolladora','mb_admin','mb_coordinator'].includes(profile.rol) && profile.meta?.mfa_enabled !== true) {
      return NextResponse.redirect(new URL('/auth/mfa-enroll', req.url));
    }
    return res;
  }

  export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
  ```

**Criterio de done del módulo:**
- [ ] Rutas privadas redirigen a `/auth/login` si no hay sesión.
- [ ] Admin sin MFA redirige a enroll.

### BLOQUE 2.H — tRPC `authenticatedProcedure` + rate limit

#### MÓDULO 2.H.1 — Middleware auth + rate limit

**Pasos:**
- `[2.H.1.1]` Actualizar `server/trpc/middleware.ts`:
  ```typescript
  export const authenticatedProcedure = publicProcedure.use(async ({ ctx, next, path }) => {
    if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });

    // Rate limit: check_rate_limit_db(user_id, path, window_sec, max_calls)
    const { data: allowed } = await ctx.supabase.rpc('check_rate_limit_db', {
      p_user_id: ctx.user.id,
      p_endpoint: path,
      p_window_sec: 60,
      p_max_calls: 120
    });
    if (!allowed) throw new TRPCError({ code: 'TOO_MANY_REQUESTS' });

    return next({ ctx: { ...ctx, user: ctx.user, profile: ctx.profile } });
  });

  export const adminProcedure = authenticatedProcedure.use(async ({ ctx, next }) => {
    if (ctx.profile?.rol !== 'superadmin' && ctx.profile?.rol !== 'mb_admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    return next({ ctx });
  });
  ```
- `[2.H.1.2]` Crear tabla + función `check_rate_limit_db`:
  ```sql
  CREATE TABLE public.rate_limit_log (
    user_id UUID NOT NULL,
    endpoint TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    count INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, endpoint, window_start)
  );
  SELECT partman.create_parent('public.rate_limit_log', 'window_start', 'native', 'daily');

  CREATE OR REPLACE FUNCTION public.check_rate_limit_db(
    p_user_id UUID, p_endpoint TEXT, p_window_sec INT, p_max_calls INT
  ) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
  DECLARE v_window TIMESTAMPTZ; v_count INT;
  BEGIN
    v_window := date_trunc('minute', now()) + (EXTRACT(second FROM now())::INT / p_window_sec) * (p_window_sec || ' seconds')::INTERVAL;
    INSERT INTO public.rate_limit_log (user_id, endpoint, window_start, count)
    VALUES (p_user_id, p_endpoint, v_window, 1)
    ON CONFLICT (user_id, endpoint, window_start) DO UPDATE SET count = rate_limit_log.count + 1
    RETURNING count INTO v_count;
    RETURN v_count <= p_max_calls;
  END $$;
  ```

**Criterio de done del módulo:**
- [ ] `authenticatedProcedure` bloquea sin sesión.
- [ ] Rate limit: 121 calls en 60s → TRPCError 429.

### BLOQUE 2.I — Feature gating runtime via `resolve_features`

#### MÓDULO 2.I.1 — Hook `useFeatures` + HOC `requireFeature`

**Pasos:**
- `[2.I.1.1]` tRPC procedure `me.features.list` → `ctx.supabase.rpc('resolve_features').then(({ data }) => data)`.
- `[2.I.1.2]` Hook `shared/hooks/useFeatures.ts`:
  ```typescript
  export function useFeatures() {
    const { data: features = [] } = trpc.me.features.list.useQuery();
    return {
      has: (code: string) => features.includes(code),
      features
    };
  }
  ```
- `[2.I.1.3]` HOC `requireFeature('asesor.busquedas.advanced_filters')` en Client Component: si no tiene → renderiza `<LockedFeatureCard />` con CTA upgrade.
- `[2.I.1.4]` Server guard para tRPC: `featureProcedure = authenticatedProcedure.use(({ ctx, path, next }) => { const feature = FEATURE_MAP[path]; if (feature && !ctx.features.includes(feature)) throw new TRPCError({ code: 'FORBIDDEN', message: 'feature_locked' }); return next({ ctx }); });`.

**Criterio de done del módulo:**
- [ ] `useFeatures().has('asesor.busquedas.advanced_filters')` responde coherente con `resolve_features`.
- [ ] HOC bloquea UI.
- [ ] Server guard bloquea endpoint aunque cliente intente llamarlo directamente.

### BLOQUE 2.J — Session security hardening

#### MÓDULO 2.J.1 — Cookies + rotación + revocación

**Pasos:**
- `[2.J.1.1]` Cookies JWT: `httpOnly: true, secure: true (prod), sameSite: 'lax', path: '/'` — configurado en Supabase SSR client.
- `[2.J.1.2]` Refresh token rotation activada en `config.toml` (Bloque 2.A).
- `[2.J.1.3]` Endpoint `POST /api/auth/sign-out-all` → `supabase.auth.admin.signOut(userId)` con service_role. UI en `/profile/seguridad` para "Cerrar sesión en todos los dispositivos".
- `[2.J.1.4]` Tabla `auth_sessions_log`:
  ```sql
  CREATE TABLE public.auth_sessions_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('login','logout','refresh','revoke')),
    ip INET, user_agent TEXT, aal TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_asl_profile ON public.auth_sessions_log (profile_id, created_at DESC);
  ```
- `[2.J.1.5]` Trigger en auth events (via edge function `on_auth_event`) registra en `auth_sessions_log`.

**Criterio de done del módulo:**
- [ ] Cookies con flags correctas en devtools.
- [ ] "Sign out all" invalida tokens refresh.

### BLOQUE 2.K — Audit log automático en tablas sensibles

#### MÓDULO 2.K.1 — Función genérica + triggers

**Pasos:**
- `[2.K.1.1]` Función genérica:
  ```sql
  CREATE OR REPLACE FUNCTION public.audit_row_change()
  RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
  BEGIN
    INSERT INTO public.audit_log (
      country_code, actor_id, actor_role, action, table_name, record_id, before, after, diff
    ) VALUES (
      COALESCE(NEW.country_code, OLD.country_code),
      auth.uid(),
      public.get_user_role(),
      TG_OP,
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      to_jsonb(OLD),
      to_jsonb(NEW),
      CASE WHEN TG_OP = 'UPDATE' THEN (to_jsonb(NEW) - (to_jsonb(OLD))) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
  END $$;
  ```
- `[2.K.1.2]` Attach triggers: `profiles`, `desarrolladoras`, `subscriptions`, `role_requests`, `profile_feature_overrides` — `AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();`.

**Criterio de done del módulo:**
- [ ] `UPDATE profiles SET first_name=...` genera row en `audit_log`.
- [ ] `diff` JSONB refleja el campo cambiado.

## Criterio de done de la FASE

- [ ] Supabase Auth + SMTP configurado.
- [ ] MFA TOTP obligatorio para roles admin/dev/mb; SMS fallback operativo.
- [ ] Flow signup → verify email → onboarding → role_request funciona.
- [ ] Trigger `prevent_role_escalation` activo con tests verdes (escalación bloqueada, audit registrado).
- [ ] VIEW `public_profiles` + `public_desarrolladoras` + `public_agencies` + `public_broker_companies` en uso.
- [ ] RLS canónicas aplicadas en todas las tablas de Fase 01.
- [ ] Middleware Next.js enforcing session + is_active + is_approved + MFA.
- [ ] `authenticatedProcedure` + `adminProcedure` + rate limit via `check_rate_limit_db` activos.
- [ ] Feature gating runtime operativo (hook + HOC + server guard).
- [ ] Cookies JWT hardened + sign-out-all endpoint.
- [ ] Audit log trigger genérico en 5+ tablas sensibles.
- [ ] Tag git: `fase-02-complete`.
- [ ] Tests de seguridad en `tests/security/` pasando.

## Features implementadas en esta fase (≈ 15)

1. **F-02-01** Supabase Auth email+password con password policy ≥12 chars
2. **F-02-02** Signup confirmado por email via Resend
3. **F-02-03** Trigger `handle_new_user` crea row profiles con rol=comprador default
4. **F-02-04** Onboarding + `role_requests` con aprobación admin
5. **F-02-05** MFA TOTP enrollment con QR + backup codes (10)
6. **F-02-06** MFA challenge en login con enforcement AAL2
7. **F-02-07** SMS OTP fallback Twilio
8. **F-02-08** Trigger `prevent_role_escalation` bloqueando auto-escalación (SEC-02)
9. **F-02-09** VIEW `public_profiles` sin PII (SEC-01) + policy SELECT restrictiva
10. **F-02-10** VIEWs públicas `desarrolladoras/agencies/broker_companies` (SEC-03)
11. **F-02-11** RLS policies canónicas en 12 tablas fundación
12. **F-02-12** Middleware Next.js enforcing session + MFA + approval
13. **F-02-13** `authenticatedProcedure` + `adminProcedure` + rate limit DB
14. **F-02-14** Feature gating runtime `resolve_features` + hook + HOC + server guard
15. **F-02-15** Audit log trigger genérico en tablas sensibles + sign-out-all

## Próxima fase

[FASE 03 — AI-Native Shell](./FASE_03_AI_NATIVE_SHELL.md)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent C) | **Fecha:** 2026-04-17
