# AUDITORÍA DE SEGURIDAD v2 — DesarrollosMX v5
## Reporte COMPLETO — Ronda 1 + Ronda 2
## Abril 2026

---

# RESUMEN EJECUTIVO

```
HALLAZGO                                    SEVERIDAD    EXPLOTABLE HOY
SEC-01 Profiles expone PII a todos          🔴 CRÍTICO    SÍ — cualquier autenticado
SEC-02 Escalación de privilegios (rol)      🔴 CRÍTICO    SÍ — un asesor se puede hacer superadmin
SEC-03 Desarrolladoras expone RFC+email     🔴 CRÍTICO    SÍ — policy SELECT true
SEC-04 24 funciones sin validar identidad   🔴 CRÍTICO    SÍ — ver datos de cualquier usuario
SEC-05 Projects expone comisiones a todos   🟠 ALTO       SÍ — compradores ven % de broker
SEC-06 Storage avatars sin restricciones    🟠 ALTO       SÍ — cualquiera sube cualquier archivo
SEC-07 Storage dossier/invoices/op-files    🟠 ALTO       Cualquier autenticado puede INSERT
SEC-08 Webhook secrets en plaintext         🟡 MEDIO      Solo con breach de BD
SEC-09 QR codes visibles para todos         🟡 MEDIO      Filtración de scan analytics
SEC-10 Sin rate limiting verificado en tRPC 🟡 MEDIO      Posible abuso/scraping
SEC-11 RFC/datos fiscales sin encriptar     🟡 MEDIO      Solo con breach de BD
SEC-12 Sin CORS verificado en API routes    🟡 MEDIO      Posible CSRF
SEC-13 Sin 2FA/MFA disponible               🟡 MEDIO      Cuentas vulnerables a phishing
```

---

# 🔴 SEC-01: PROFILES EXPONE PII A CUALQUIER AUTENTICADO

**Policy:** `profiles_select_public_slug` → `SELECT` donde `slug IS NOT NULL AND is_active = true`

**Datos expuestos:**
- email, phone, phone_normalized (contacto personal)
- rfc, inmobiliaria_rfc (dato fiscal — equivalente a SSN en gravedad)
- razon_social, regimen_fiscal (datos fiscales empresariales)
- docs_verificacion_urls (URLs de documentos de identidad)

**Ataque:** Un comprador registrado ejecuta `SELECT email, phone, rfc FROM profiles` y obtiene los datos personales de TODOS los asesores y desarrolladores.

**Fix:**
```sql
-- Opción: Reemplazar policy por una que use una función helper
DROP POLICY profiles_select_public_slug ON profiles;

CREATE OR REPLACE FUNCTION get_public_profile_fields(p_profile profiles)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT jsonb_build_object(
    'id', p_profile.id,
    'first_name', p_profile.first_name,
    'last_name', p_profile.last_name,
    'slug', p_profile.slug,
    'avatar_url', p_profile.avatar_url,
    'foto_url', p_profile.foto_url,
    'bio', p_profile.bio,
    'zona_principal', p_profile.zona_principal,
    'agencia', p_profile.agencia,
    'empresa', p_profile.empresa,
    'especialidad', p_profile.especialidad,
    'anos_experiencia', p_profile.anos_experiencia,
    'operaciones_cerradas', p_profile.operaciones_cerradas,
    'rating_promedio', p_profile.rating_promedio,
    'certificaciones', p_profile.certificaciones,
    'certificaciones_verificadas', p_profile.certificaciones_verificadas,
    'broker_tipo', p_profile.broker_tipo,
    'redes_sociales', p_profile.redes_sociales,
    'microsite_slug', p_profile.microsite_slug
  );
$$;

-- Mejor opción: crear VIEW + policy sobre la view
-- O: la policy sigue pero el tRPC NUNCA hace SELECT * — solo campos públicos
-- La solución definitiva depende de cómo el frontend consulta profiles
```

---

# 🔴 SEC-02: ESCALACIÓN DE PRIVILEGIOS — CUALQUIERA SE PUEDE HACER SUPERADMIN

**Policy:** `profiles_update_own` → `UPDATE WHERE id = auth.uid()` sin restricción de columnas

**Ataque:**
```sql
-- Un asesor ejecuta esto via PostgREST:
UPDATE profiles SET rol = 'superadmin' WHERE id = auth.uid();
```

**Resultado:** El asesor ahora es superadmin. Tiene acceso a TODAS las tablas, funciones, datos.

**El trigger `audit_sensitive_changes` solo REGISTRA el cambio, NO lo bloquea.** Hace `RETURN NEW` siempre.

**Fix URGENTE:**
```sql
-- Trigger que BLOQUEA cambio de rol no autorizado
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Solo superadmin puede cambiar roles
  IF OLD.rol IS DISTINCT FROM NEW.rol THEN
    IF NOT is_superadmin() THEN
      RAISE EXCEPTION 'Solo un superadmin puede cambiar roles';
    END IF;
  END IF;
  
  -- Nadie puede cambiar is_approved excepto superadmin
  IF OLD.is_approved IS DISTINCT FROM NEW.is_approved THEN
    IF NOT is_superadmin() THEN
      RAISE EXCEPTION 'Solo un superadmin puede aprobar perfiles';
    END IF;
  END IF;

  -- Nadie puede cambiar employer_type/employer_id excepto superadmin o el employer
  IF OLD.employer_type IS DISTINCT FROM NEW.employer_type 
     OR OLD.employer_id IS DISTINCT FROM NEW.employer_id THEN
    IF NOT is_superadmin() THEN
      RAISE EXCEPTION 'Solo un superadmin puede cambiar el empleador';
    END IF;
  END IF;
  
  RETURN NEW;
END $$;

CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_escalation();
```

---

# 🔴 SEC-03: DESARROLLADORAS EXPONE RFC + CONTACTO A TODOS

**Policy:** `desarrolladoras_select_public` → `SELECT` con `qual = true` (cualquiera lee todo)

**Datos expuestos:**
- rfc (dato fiscal sensible)
- email_contacto, telefono_oficina, whatsapp_contacto (datos de contacto)
- oficina_direccion, oficina_lat, oficina_lng (ubicación física)

**Fix:** Reemplazar `true` por policy que filtre columnas sensibles, o crear VIEW pública.

---

# 🔴 SEC-04: 24 FUNCIONES SECURITY DEFINER SIN VALIDAR IDENTIDAD

(Documentado en detalle en v1 del reporte)

**Las 8 más peligrosas:**
```
get_asesor_dashboard(uuid)         — ve dashboard completo de otro
get_developer_dashboard(uuid)      — ve dashboard de cualquier dev
get_asesor_performance(uuid)       — ve métricas de cualquier asesor
get_master_broker_dashboard(uuid)  — ve dashboard de cualquier MB
get_morning_briefing(uuid)         — ve briefing de cualquier asesor
add_asesor_xp(uuid, int, text)     — MANIPULA gamification de cualquier usuario
calculate_commission_forecast(uuid) — ve proyección de comisiones de otro
match_busqueda_inventario(uuid)    — ve matching de cualquier asesor
```

**Fix:** Agregar `IF p_id != auth.uid() AND NOT is_superadmin() THEN RAISE EXCEPTION` al inicio.

---

# 🟠 SEC-05: PROJECTS EXPONE COMISIONES DE BROKER A COMPRADORES

**Policy:** `projects_select_public` → `SELECT WHERE publicado = true`

**Columnas expuestas a compradores:**
- broker_commission_pct (porcentaje de comisión del broker)
- broker_commission_notes (notas internas de comisión)
- broker_pago_comision (cómo se paga la comisión)
- broker_pago_comision_notas (detalles de pago)
- broker_bono_pct, broker_bono_condicion (estructura de bonos)
- broker_contact_value (teléfono/email del contacto broker)
- verificacion_notas (notas internas de verificación)

**Impacto:** Un comprador puede ver exactamente cuánto le pagan al broker. Esto puede generar conflictos.

**Fix:** Crear VIEW pública de projects que excluya columnas broker_* y notas internas. O policy que filtre por rol.

---

# 🟠 SEC-06: STORAGE AVATARS SIN RESTRICCIONES

**Bucket:** `profile-avatars` → `public: true`, `file_size_limit: null`, `allowed_mime_types: null`
**Policy:** `avatars_insert` → cualquier autenticado puede subir CUALQUIER archivo sin límite

**Ataques posibles:**
- Subir ejecutables maliciosos disfrazados de avatar
- Subir archivos de 100GB para DoS de storage
- Subir contenido ilegal que queda asociado a la plataforma

**Fix:**
```sql
UPDATE storage.buckets SET 
  file_size_limit = 5242880,  -- 5MB max
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
WHERE id = 'profile-avatars';
```

---

# 🟠 SEC-07: STORAGE BUCKETS CON INSERT ABIERTO

**Buckets afectados:**
- `dossier-exports` → INSERT con solo `auth.uid() IS NOT NULL` (sin validar rol)
- `commission-invoices` → INSERT con solo `auth.uid() IS NOT NULL`
- `operation-files` → INSERT con solo `auth.uid() IS NOT NULL`

**Riesgo:** Un comprador (rol sin permisos de operaciones) puede subir archivos a buckets de facturas y expedientes.

**Fix:** Agregar validación de rol en las policies de INSERT:
```sql
-- Ejemplo para commission-invoices
DROP POLICY invoices_insert ON storage.objects;
CREATE POLICY invoices_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'commission-invoices' 
    AND auth.uid() IS NOT NULL
    AND (get_user_role() IN ('asesor','desarrollador','superadmin'))
  );
```

---

# 🟡 SEC-08: WEBHOOK SECRETS EN PLAINTEXT
(Documentado en v1)

---

# 🟡 SEC-09: QR CODES VISIBLES PARA TODOS

**Policy:** `qr_codes_read` → `SELECT true` — cualquiera ve los QR de todos

**Riesgo menor** pero permite ver scan_count y analytics de campañas de otros asesores.

**Fix:** Restringir a `created_by = auth.uid() OR is_superadmin()`

---

# 🟡 SEC-10: SIN RATE LIMITING VERIFICADO EN tRPC

La función `check_rate_limit_db` existe pero hay que verificar que se use en TODOS los endpoints sensibles, especialmente los que hacen queries pesadas o AI calls.

---

# 🟡 SEC-11: RFC SIN ENCRIPTAR
(Documentado en v1)

---

# 🟡 SEC-12: CORS SIN VERIFICAR
Verificar next.config.ts y API routes. Necesario para prevenir que un sitio externo haga requests autenticados a nombre del usuario.

---

# 🟡 SEC-13: SIN 2FA/MFA
Supabase soporta MFA. No está habilitado. Para cuentas de superadmin y desarrolladores con acceso a datos sensibles, es recomendable.

---

# PLAN DE ACCIÓN — ORDEN DE IMPLEMENTACIÓN

## FASE 1: CRÍTICOS (hacer ANTES de cualquier frontend)

```
□ SEC-02: Trigger prevent_role_escalation (PRIMERO — cierra la escalación de privilegios)
□ SEC-01: Reemplazar profiles_select_public_slug (cierra filtración de PII)
□ SEC-03: Reemplazar desarrolladoras_select_public (cierra filtración RFC+contacto)
□ SEC-04: Agregar auth.uid() validation a 8 funciones SECURITY DEFINER
□ SEC-06: Restringir profile-avatars bucket (size + mime types)
```

## FASE 2: ALTOS (hacer durante S0)

```
□ SEC-05: Crear VIEW pública de projects sin columnas broker_*
□ SEC-07: Restringir INSERT en storage buckets por rol
□ SEC-09: Restringir QR codes read por owner
□ SEC-10: Verificar rate limiting en todos los endpoints
```

## FASE 3: MEDIOS (hacer antes de launch)

```
□ SEC-08: Hashear webhook secrets
□ SEC-11: Evaluar pgsodium para RFC
□ SEC-12: Verificar CORS config
□ SEC-13: Habilitar MFA para superadmin
□ SEC-14: Penetration test completo
□ SEC-15: Bug bounty program
```

---

# ESTADO ACTUAL vs ESTADO OBJETIVO

```
                           AHORA          OBJETIVO v5-S0
RLS habilitado             ✅ 110/110     ✅ Sin cambio
Policies existentes        ✅ ~207        ✅ ~215 (arreglos + nuevas)
Escalación privilegios     🔴 ABIERTA     ✅ BLOQUEADA (trigger)
PII filtration             🔴 ABIERTA     ✅ CERRADA (views/policies)
SECURITY DEFINER           🔴 SIN VALIDAR ✅ 8 funciones parchadas
Storage sin restricciones  🟠 ABIERTO     ✅ Restringido (size+mime+rol)
Comisiones expuestas       🟠 VISIBLE     ✅ VIEW pública sin broker_*
Rate limiting              🟡 SIN VERIFICAR ✅ Verificado en todos los endpoints
Webhook secrets            🟡 PLAINTEXT   ✅ Hasheado
MFA                        🟡 DESHABILITADO 🟡 Habilitado para admin
```


---

# RONDA 3: LÓGICA DE NEGOCIO + PLATAFORMA COMPLETA

## HALLAZGOS ADICIONALES

### 🟠 SEC-14: ASESOR PUEDE BORRAR SU HISTORIAL COMPLETO

24 tablas tienen policy ALL con `asesor_id = auth.uid()` que incluye DELETE.
Un asesor enojado puede ejecutar:
```sql
DELETE FROM actividad_timeline WHERE asesor_id = 'mi-id';
DELETE FROM captaciones WHERE asesor_id = 'mi-id';
DELETE FROM acm_valuaciones WHERE asesor_id = 'mi-id';
DELETE FROM visitas_programadas WHERE asesor_id = 'mi-id';
DELETE FROM tareas WHERE agent_id = 'mi-id';
DELETE FROM client_folders WHERE asesor_id = 'mi-id';
DELETE FROM comisiones WHERE asesor_id = 'mi-id';
```

Y borrar TODA su actividad, timeline, captaciones, valuaciones, visitas, tareas.

**Tablas afectadas (24):** acm_valuaciones, actividad_timeline, ai_coaching_log,
api_keys, asesor_outcomes, asesor_status, calendario_eventos, captaciones,
client_folders, client_folder_projects, comisiones, commission_payments,
disc_profiles, market_alerts, notificaciones, notificaciones_config,
propiedades_secundarias, propiedades_secundarias_fotos, score_subscriptions,
tareas, visitas, visitas_programadas, whatsapp_templates, wishlist

**Operaciones está PROTEGIDA** — solo superadmin puede DELETE. ✅

**Fix:** Separar las policies ALL en SELECT + INSERT + UPDATE (sin DELETE) para las
tablas donde el historial es importante:
- actividad_timeline (historial de acciones — NUNCA borrar)
- acm_valuaciones (valuaciones históricas)
- asesor_outcomes (métricas mensuales)
- commission_payments (pagos de comisión)
- visitas_programadas (historial de visitas)

Para estas 5 tablas críticas, solo superadmin puede DELETE.

---

### 🟠 SEC-15: SCORE_SUBSCRIPTIONS SIN VALIDACIÓN DE PLAN

La policy `score_subs_own` permite ALL con `user_id = auth.uid()`.
Un usuario free puede INSERT score_subscriptions para CUALQUIER score_type,
incluyendo scores premium que deberían requerir plan pagado.

**Fix:** Agregar WITH CHECK que valide plan activo para scores premium:
```sql
-- La validación debe cruzar: feature_registry.is_premium + subscriptions.status
```

---

### 🟠 SEC-16: LANDING PAGES — CUALQUIER ASESOR PUEDE CREAR PARA CUALQUIER PROYECTO

La policy `landing_pages_owner` permite INSERT si `created_by = auth.uid()`.
Pero no valida que el asesor tenga autorización sobre el proyecto.
Un asesor no autorizado puede crear una landing page para un proyecto ajeno.

**Fix:** Agregar validación: `is_authorized_broker(project_id) OR is_project_owner(project_id)`

---

### ✅ VERIFICADOS OK (sin problemas)

- contactos INSERT valida `asesor_id = auth.uid()` ✅
- operaciones INSERT valida asesor_comprador/vendedor = auth.uid() ✅
- operaciones DELETE solo superadmin ✅
- gamification solo SELECT para owner (no puede manipular XP via BD) ✅
- notificaciones solo owner puede ver/modificar ✅
- conversations protegidas por owner ✅
- captaciones.employer SELECT permite solo al employer ver las de su equipo ✅
- pgcrypto y supabase_vault están disponibles (vault vacío pero listo) ✅

---

### 🟡 SEC-17: PGSODIUM NO HABILITADO

pgsodium está disponible pero NO instalado. Esta extensión permite:
- Column-level encryption (para RFC, datos fiscales)
- Authenticated encryption (para webhook secrets)
- Key management integrado con Supabase Vault

**Fix:** Habilitar pgsodium para encriptar columnas sensibles cuando sea necesario.

---

### 🟡 SEC-18: SUPABASE VAULT VACÍO

El vault está instalado pero sin secrets. Los API keys (OpenAI, Anthropic, Mapbox,
Stripe) están en .env.local pero deberían estar en el Vault para producción.

---

### 🟡 SEC-19: SIN AUDIT LOG PARA ACCESOS A DATOS SENSIBLES

`audit_sensitive_changes` registra cambios en profiles/operaciones/projects.
Pero NO registra LECTURAS de datos sensibles. Si alguien consulta RFCs o emails
masivamente, no hay registro.

**Fix futuro:** Implementar pg_audit o custom audit para SELECT en tablas con PII.

---

# RESUMEN FINAL ACTUALIZADO — 19 HALLAZGOS

```
🔴 CRÍTICO (4):
  SEC-01  Profiles expone PII (email/phone/RFC) a todos
  SEC-02  Escalación de privilegios (cambiarse el rol)
  SEC-03  Desarrolladoras expone RFC+email+teléfono a todos
  SEC-04  8 funciones SECURITY DEFINER sin validar identidad

🟠 ALTO (6):
  SEC-05  Projects expone comisiones broker a compradores
  SEC-06  Storage avatars sin restricciones (size/mime)
  SEC-07  Storage buckets con INSERT abierto sin validar rol
  SEC-14  Asesor puede borrar su historial completo (24 tablas)
  SEC-15  Score subscriptions sin validación de plan premium
  SEC-16  Landing pages creables para proyectos no autorizados

🟡 MEDIO (9):
  SEC-08  Webhook secrets en plaintext
  SEC-09  QR codes visibles para todos
  SEC-10  Rate limiting sin verificar en tRPC
  SEC-11  RFC sin encriptar
  SEC-12  CORS sin verificar
  SEC-13  Sin 2FA/MFA
  SEC-17  pgsodium no habilitado
  SEC-18  Vault vacío (API keys en .env)
  SEC-19  Sin audit de lecturas sensibles
```

---

# PLAN DE ACCIÓN ACTUALIZADO

## SPRINT DE SEGURIDAD (dentro de v5-S0, ANTES del frontend)

```
BLOQUE 1 — CRÍTICOS (no se avanza sin cerrar estos):
  □ SEC-02: Trigger prevent_role_escalation
  □ SEC-01: Fix profiles_select_public_slug → VIEW pública
  □ SEC-03: Fix desarrolladoras_select_public → VIEW pública
  □ SEC-04: Auth validation en 8 funciones SECURITY DEFINER

BLOQUE 2 — ALTOS (mismo sprint):
  □ SEC-06: Restringir profile-avatars bucket (5MB, image/*)
  □ SEC-07: Restringir storage INSERT por rol
  □ SEC-05: VIEW pública projects sin broker_*
  □ SEC-14: Separar policies ALL → quitar DELETE en 5 tablas históricas
  □ SEC-15: WITH CHECK en score_subscriptions para premium
  □ SEC-16: Validar autorización en landing_pages INSERT

BLOQUE 3 — MEDIOS (antes de producción):
  □ SEC-08 a SEC-19: Lista completa arriba
```


---

# RONDA 4: REVISIÓN EXHAUSTIVA DE 207+ POLICIES

## HALLAZGOS ADICIONALES (4 nuevos)

### 🟡 SEC-20: demand_queries INSERT sin restricción

Policy `demand_queries_insert_any` con `with_check = true`.
Cualquier autenticado puede insertar queries de demanda sin límite.
Riesgo: pollution de datos, spam, sesgar métricas de demanda.

**Fix:** Agregar rate limit o WITH CHECK que valide rol:
```sql
ALTER POLICY demand_queries_insert_any ON demand_queries
  USING (true)
  WITH CHECK (auth.uid() IS NOT NULL AND check_rate_limit_db(auth.uid(), 'demand_queries', 100));
```

---

### 🟡 SEC-21: admin_actions INSERT abierto

Policy `admin_actions_insert_trigger` con `with_check = true`.
Intencional para triggers, pero un atacante podría llenar el log con basura
haciendo INSERT directos via PostgREST.

**Fix:** Cambiar a `with_check = false` y usar solo SECURITY DEFINER functions para insertar.
O agregar: `WITH CHECK (is_superadmin() OR current_setting('role') = 'service_role')`

---

### 🟡 SEC-22: project_views INSERT inflable

Policy `project_views_insert_any` con `with_check = true`.
Cualquier autenticado puede insertar views falsas para inflar métricas.
Un atacante puede hacer 10,000 INSERTs para que un proyecto parezca popular.

**Fix:** Rate limit + deduplicación:
```sql
-- Agregar UNIQUE(user_id, project_id, DATE(viewed_at)) para 1 view por usuario por día
-- O WITH CHECK que limite inserts
```

---

### 🟡 SEC-23: avance_obra_log visible para todos

Policy `avance_obra_read` con `auth.uid() IS NOT NULL`.
Cualquier autenticado ve TODOS los logs de avance de obra de TODOS los proyectos,
incluyendo proyectos NO publicados (información confidencial del desarrollador).

**Fix:** Restringir a proyecto publicado + broker autorizado + owner + admin:
```sql
DROP POLICY avance_obra_read ON avance_obra_log;
CREATE POLICY avance_obra_log_read ON avance_obra_log FOR SELECT USING (
  is_superadmin() 
  OR is_project_owner(project_id)
  OR is_authorized_broker(project_id)
  OR EXISTS (SELECT 1 FROM projects WHERE id = project_id AND publicado = true)
);
```

---

# RESUMEN FINAL DEFINITIVO — 23 HALLAZGOS TOTALES

```
🔴 CRÍTICO (4):
  SEC-01  Profiles expone PII (email/phone/RFC) a todos
  SEC-02  Escalación de privilegios (cambiarse el rol a superadmin)
  SEC-03  Desarrolladoras expone RFC+email+teléfono a todos
  SEC-04  8 funciones SECURITY DEFINER sin validar identidad

🟠 ALTO (6):
  SEC-05  Projects expone comisiones broker a compradores
  SEC-06  Storage avatars sin restricciones (size/mime)
  SEC-07  Storage buckets con INSERT abierto sin validar rol
  SEC-14  Asesor puede borrar su historial completo (24 tablas con DELETE)
  SEC-15  Score subscriptions sin validación de plan premium
  SEC-16  Landing pages creables para proyectos no autorizados

🟡 MEDIO (13):
  SEC-08  Webhook secrets en plaintext
  SEC-09  QR codes analytics visibles para todos
  SEC-10  Rate limiting sin verificar en tRPC
  SEC-11  RFC sin encriptar en reposo
  SEC-12  CORS sin verificar en API routes
  SEC-13  Sin 2FA/MFA para superadmin
  SEC-17  pgsodium no habilitado
  SEC-18  Vault vacío (API keys en .env)
  SEC-19  Sin audit de lecturas de datos sensibles
  SEC-20  demand_queries INSERT sin restricción
  SEC-21  admin_actions INSERT abierto
  SEC-22  project_views INSERT inflable (fake views)
  SEC-23  avance_obra_log visible para todos (incluye no publicados)
```

---

# VERIFICADOS OK — SIN PROBLEMAS (después de 4 rondas)

```
✅ 110/110 tablas con RLS habilitado
✅ 0 tablas sin policies
✅ contactos INSERT valida asesor_id = auth.uid()
✅ operaciones INSERT valida asesor = auth.uid()
✅ busquedas INSERT valida asesor_id = auth.uid()
✅ leads INSERT valida asesor_id = auth.uid()
✅ projects INSERT valida desarrolladora_id
✅ captaciones policies correctas (own + employer SELECT + admin)
✅ gamification SOLO SELECT para owner (no puede manipular XP via BD)
✅ operaciones DELETE solo superadmin
✅ conversations protegidas por owner + superadmin
✅ subscriptions protegidas por owner + superadmin
✅ notificaciones protegidas por recipient_id
✅ API keys guardadas como hash (key_hash)
✅ Security headers en Next.js configurados (CSP, HSTS, etc.)
✅ Anti-duplicados con normalize_phone() + unique index
✅ Audit triggers en profiles, operaciones, projects
✅ pgcrypto instalado, supabase_vault disponible
✅ Multi-tenancy con get_visible_asesor_ids() funcional
✅ Broker authorization con is_authorized_broker() funcional
✅ Storage documents restringido por rol (solo dev + admin)
✅ Storage project-photos INSERT solo dev + admin
✅ rate_limits tabla con policy false (solo service_role)
```

---

# PLAN DE ACCIÓN DEFINITIVO

## SPRINT DE SEGURIDAD (14 tareas, dentro de v5-S0)

```
BLOQUE 1 — CRÍTICOS (sin esto NO se avanza):
  □ SEC-02: Trigger prevent_role_escalation
  □ SEC-01: VIEW/policy para profiles sin PII
  □ SEC-03: VIEW/policy para desarrolladoras sin PII
  □ SEC-04: Auth validation en 8 funciones SECURITY DEFINER

BLOQUE 2 — ALTOS:
  □ SEC-06: Restringir profile-avatars (5MB, image/*)
  □ SEC-07: Restringir storage INSERT por rol
  □ SEC-05: VIEW pública projects sin broker_*
  □ SEC-14: Quitar DELETE en 5 tablas históricas (timeline, acm, outcomes, payments, visitas)
  □ SEC-15: WITH CHECK en score_subscriptions para premium
  □ SEC-16: Validar autorización en landing_pages INSERT

BLOQUE 3 — MEDIOS PRIORITARIOS:
  □ SEC-22: Deduplicar project_views (1 por user/día)
  □ SEC-23: Restringir avance_obra_log a autorizados
  □ SEC-09: Restringir qr_codes a owner
  □ SEC-20: Rate limit en demand_queries INSERT
```
