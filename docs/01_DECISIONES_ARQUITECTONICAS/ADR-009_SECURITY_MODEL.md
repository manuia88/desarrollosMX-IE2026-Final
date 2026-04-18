# ADR-009 — Modelo de seguridad defense-in-depth (RLS + MFA + Vault + Rate limit)

**Status:** Accepted
**Date:** 2026-04-17
**Deciders:** Manu Acosta (founder), Claude Opus 4.7 (Senior Review)

## Context

El repositorio viejo (`desarrollosmx-v8final`) acumuló en las iteraciones v3→v5.1 un total de **23 hallazgos de seguridad** documentados en `biblia-v5/14_AUDITORIA_SEGURIDAD_23Hallazgos.md`:

- **4 CRÍTICOS** (explotables sin cuenta especial):
  - **SEC-01**: `profiles_select_public_slug` expone email, phone, rfc, razon_social, regimen_fiscal, docs_verificacion_urls a cualquier usuario autenticado.
  - **SEC-02**: `profiles_update_own` sin restricción de columnas → un asesor ejecuta `UPDATE profiles SET rol='superadmin'` y gana acceso total. El trigger `audit_sensitive_changes` sólo registra, no bloquea.
  - **SEC-03**: `desarrolladoras_select_public` con `qual=true` expone RFC + contacto + ubicación oficina.
  - **SEC-04**: 8 funciones SECURITY DEFINER sin validar `auth.uid()` (`get_asesor_dashboard`, `get_developer_dashboard`, `add_asesor_xp`, etc.) → cualquier usuario ve dashboards ajenos.
- **6 ALTOS**: SEC-05 comisiones broker expuestas a compradores, SEC-06 Storage avatars sin restricciones, SEC-07 Storage buckets abiertos (dossier, invoices, operation-files), SEC-14 policies ALL con DELETE en 24 tablas, SEC-15 score_subscriptions sin plan check, SEC-16 landing pages broker auth insuficiente.
- **13 MEDIOS**: SEC-08 webhook secrets plaintext, SEC-09 QR public, SEC-10 rate limit sin enforce, SEC-11 RFC sin encriptar, SEC-12 CORS sin verificar, SEC-13 sin MFA, SEC-17 pgsodium no habilitado, SEC-18 vault vacío, SEC-19 sin audit lecturas sensibles, SEC-20 demand_queries abierto, SEC-21 admin_actions abierto, SEC-22 project_views inflable, SEC-23 avance_obra_log visible.

Adicionalmente, aplicables:

- **Cumplimiento regulatorio**: LFPDPPP (MX), LPDP (CO), Ley 25.326 (AR), LGPD (BR). Exigen cifrado de datos sensibles, bitácoras de acceso, derechos ARCO, opt-in explícito para datos de contacto.
- **AML/KYC**: UIF MX para operaciones >$200K USD requiere KYC reforzado, reporte de operaciones inusuales, retención de información 5 años.
- **Alcance de MFA**: Supabase Auth soporta TOTP + WebAuthn. Los roles con acceso a datos sensibles (superadmin, dev con contabilidad, MB) deben tenerlo obligatorio.
- **Superficie de API pública**: 7 productos licenciables IE + rutas públicas (`/explorar`, `/indices`, `/metodologia`) exigen rate limiting fuerte para prevenir scraping.

Las 4 críticas no se heredan como bugs al rewrite (schema nuevo desde cero), pero **los patrones que las causaron deben prevenirse por diseño**. Este ADR codifica ese aprendizaje.

## Decision

Se adopta un **modelo de seguridad defense-in-depth de 13 capas**, donde cada capa reduce la superficie de ataque asumiendo que otras capas pueden fallar.

### D1. Supabase Auth + MFA obligatorio para roles sensibles

- Supabase Auth como IdP único. Signup con email/password + OAuth (Google, Apple).
- **MFA/TOTP obligatorio** para: `superadmin`, `desarrollador` (cualquier dev con acceso a contabilidad), `master_broker`. Forzado por trigger + middleware server-side.
- **MFA recomendado opt-in** para asesores y compradores; incentivado con badge "Cuenta verificada".
- **SAML/OIDC enterprise** en H2 para devs grandes que exijan SSO corporativo.

### D2. RLS en 100% de tablas desde Fase 01

- Toda tabla `public.*` creada debe tener `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` dentro de la misma migration en que se crea.
- **0 tablas sin policies**: una tabla con RLS enabled pero sin policies no es accesible ni a superadmin. Regla: toda tabla tiene al menos 1 policy explícita (aunque sea `FOR SELECT USING (is_superadmin())`).
- CI check en `supabase/tests/rls_coverage.test.ts`: query `information_schema` + `pg_policies` y falla si alguna tabla no tiene RLS habilitado.

### D3. Prohibiciones firmes (policies banned por diseño)

- **Prohibido**: policies con `qual = true` sin comentario explícito de justificación (p. ej. `'RATIONALE: /explorar pública requiere acceso lectura a zones'`).
- **Prohibido**: funciones `SECURITY DEFINER` sin validación `IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'` al inicio.
- **Prohibido**: policies UPDATE sin `column restriction` cuando hay columnas sensibles. Patrón canónico:
  ```sql
  CREATE POLICY profiles_update_own_safe ON profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (
      id = auth.uid()
      -- columnas sensibles bloqueadas en el trigger prevent_role_escalation
    );
  ```
- **Prohibido**: policies `FOR ALL` en tablas históricas (audit_log, score_history, admin_actions, commission_payments). Estas son append-only + SELECT para roles autorizados.
- **Linter custom**: script `scripts/lint-policies.ts` corre en CI, revisa `pg_policies` y aborta si detecta patrones prohibidos.

### D4. Trigger `prevent_role_escalation` BEFORE UPDATE en `profiles`

Aplicado desde Fase 02 en la creación de `profiles`:

```sql
CREATE FUNCTION prevent_role_escalation() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.rol IS DISTINCT FROM NEW.rol AND NOT is_superadmin() THEN
    RAISE EXCEPTION 'Only superadmin can change rol';
  END IF;
  IF OLD.is_approved IS DISTINCT FROM NEW.is_approved AND NOT is_superadmin() THEN
    RAISE EXCEPTION 'Only superadmin can approve profiles';
  END IF;
  IF (OLD.employer_type IS DISTINCT FROM NEW.employer_type
      OR OLD.employer_id IS DISTINCT FROM NEW.employer_id)
     AND NOT is_superadmin() THEN
    RAISE EXCEPTION 'Only superadmin can change employer';
  END IF;
  IF OLD.country_code IS DISTINCT FROM NEW.country_code AND NOT is_superadmin() THEN
    RAISE EXCEPTION 'Only superadmin can change country_code';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();
```

Extensible a otras tablas con campos de privilegio (p. ej. `api_keys.plan`).

### D5. VIEWs públicas explícitas para datos semi-públicos

Lecciones SEC-01, SEC-03, SEC-05: **nunca exponer la tabla completa, exponer VIEW con columnas safe**.

- `public_profiles` VIEW: id, first_name, last_name, slug, avatar_url, bio, zona_principal, agencia, empresa, especialidad, anos_experiencia, operaciones_cerradas, rating_promedio, certificaciones, certificaciones_verificadas, broker_tipo, redes_sociales, microsite_slug. **Excluye** email, phone, rfc, razon_social, regimen_fiscal, docs_verificacion_urls.
- `public_desarrolladoras` VIEW: id, nombre_comercial, razon_social_public (si campo marcado publicable), descripcion, logo_url, sitio_web, zonas_operacion, proyectos_count. **Excluye** rfc, email_contacto, telefono_oficina, whatsapp_contacto, oficina_lat, oficina_lng.
- `public_projects` VIEW: id, titulo, slug, tipo, estado_proyecto, zona_id, precio_desde, precio_hasta, unidades_total, unidades_disponibles, fotos_principales, amenidades, fecha_entrega. **Excluye** broker_commission_pct, broker_commission_notes, broker_pago_comision*, broker_bono_*, broker_contact_value, verificacion_notas.
- Frontend público consume **sólo** las VIEWs `public_*`. Las tablas base no son accesibles sin auth en rol owner/admin.

### D6. Storage buckets con restricciones por rol + size_limit + MIME allowlist

Lecciones SEC-06, SEC-07: **cada bucket define explícitamente quién puede INSERT, size_limit y mime_types**.

Buckets H1 y restricciones:

| Bucket | public | size_limit | mime_types | INSERT policy |
|---|---|---|---|---|
| `profile-avatars` | true | 5MB | `image/jpeg, image/png, image/webp, image/gif` | `auth.uid() IS NOT NULL AND path LIKE auth.uid()||'/%'` |
| `project-photos` | true | 15MB | `image/jpeg, image/png, image/webp` | rol IN (`desarrollador`, `asesor`, `superadmin`) |
| `dossier-exports` | false | 50MB | `application/pdf` | rol IN (`asesor`, `master_broker`, `superadmin`) |
| `commission-invoices` | false | 10MB | `application/pdf, image/jpeg, image/png` | rol IN (`desarrollador`, `asesor`, `superadmin`) |
| `operation-files` | false | 50MB | `application/pdf, image/jpeg, image/png, image/webp` | rol IN (`asesor`, `desarrollador`, `master_broker`, `superadmin`) |
| `legal-documents` | false | 50MB | `application/pdf` | rol IN (`desarrollador`, `comprador`, `superadmin`) + `operation_id` check |
| `ingest-admin` | false | 100MB | `application/pdf, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | rol = `superadmin` |

Validación adicional en route handlers `/api/upload/*` (sanity check server-side).

### D7. No DELETE en tablas históricas auditables

Lección SEC-14. Tablas con **sólo INSERT + SELECT** (DELETE prohibido incluso a superadmin):

- `audit_log`
- `admin_actions`
- `actividad_timeline`
- `score_history`
- `commission_payments`
- `operation_timeline`
- `unit_change_log`
- `api_request_logs`
- `webhook_logs`
- `ai_usage_tracking`
- `interaction_feedback`

Policies: `FOR DELETE USING (false)` + documentación. Retención > 5 años según LFPDPPP/LGPD (ver FASE 26).

### D8. Secrets en Supabase Vault + pgsodium

Lecciones SEC-08, SEC-17, SEC-18.

- **Supabase Vault** habilitado Fase 02. Secretos webhook (`stripe_webhook_secret`, `mercadopago_webhook_secret`, `mifiel_webhook_secret`, `twilio_auth_token`, `whatsapp_business_token`) en Vault, nunca plaintext.
- **pgsodium** habilitado. Columnas cifradas en AT REST con claves derivadas de Vault:
  - `profiles.rfc_encrypted`
  - `profiles.phone_encrypted` (si se decide por compliance estricto)
  - `desarrolladoras.rfc_encrypted`
  - `operaciones.comprador_documentos_encrypted`
- Triggers de write cifran; VIEWs descifran según rol.

### D9. Rate limiting con `check_rate_limit_db` en middleware tRPC obligatorio

Lección SEC-10.

- Función `check_rate_limit_db(user_id, endpoint, limit, window_seconds)` en Postgres con tabla `api_rate_limits`.
- Middleware tRPC en `server/trpc/middleware.ts` aplica rate limit **obligatorio** en toda procedure. Buckets por defecto:
  - Anon: 60 req/min
  - Authenticated default: 300 req/min
  - AI procedures (Copilot, Document Intel, Generative): 30 req/min + límite mensual por plan (ver `feature_registry` ai.extractions.monthly).
  - API externa `/api/v1/*`: según plan (Free 100/día, Starter 10K/día, Pro 100K/día).
- Procedure que use `publicProcedure` sin rate limit requiere comentario justificativo + CI check.

### D10. Cifrado de PII (pgsodium para RFC + datos sensibles)

Lección SEC-11. Columnas sensibles cifradas:

- `rfc`, `curp` → cifradas at-rest con pgsodium. Accedido vía función `decrypt_rfc(profile_id)` con validación `auth.uid() = profile_id OR is_superadmin() OR has_legitimate_access(...)`.
- `docs_verificacion_urls` → encriptadas + acceso vía signed URL short-lived (60s) generados en tRPC procedure.
- Datos bancarios (CLABE, número de tarjeta): no se almacenan; delegados a Stripe/MercadoPago (PCI-compliant).

### D11. CORS allowlist estricto en Next.js + Supabase

Lección SEC-12.

- `next.config.ts`: `headers()` incluye `Access-Control-Allow-Origin` con allowlist explícita (`desarrollosmx.com`, `app.desarrollosmx.com`, `api.desarrollosmx.com`, `admin.desarrollosmx.com`). No `*`.
- Supabase Auth: CORS configurado en dashboard project con mismo allowlist.
- Route handlers `/api/*` que acepten origen externo (p. ej. webhooks Stripe) validan origen por firma HMAC, no por header `Origin`.

### D12. MFA/2FA habilitado desde Fase 02

Lección SEC-13.

- Supabase Auth MFA enabled en dashboard.
- UI: flow de enrollment TOTP en `/settings/security`.
- Enforcement: trigger + middleware verifican que roles sensibles tienen MFA activo para mantener sesión.

### D13. Audit log en lecturas sensibles

Lección SEC-19.

- Tabla `audit_log (id, user_id, action, resource, resource_id, metadata jsonb, created_at)` append-only.
- Acciones loggeadas (al menos): SELECT profile ajeno, SELECT operation detalle, SELECT commission, descarga de documento legal, cambio de rol intentado (exitoso o bloqueado), generación CFDI, acceso admin dashboard.
- Procedures tRPC añaden log desde middleware `auditMiddleware` disponible como middleware compuesto.

### D14. Anexo: lecciones aprendidas del repo viejo

(Requerido por el prompt de este agente). Patrones preventivos derivados de los 23 hallazgos:

| Patrón | Origen | Regla en rewrite |
|---|---|---|
| PII expuesta por policy select con columnas amplias | SEC-01 | VIEW públicas explícitas (D5) |
| Update policy sin column check permite escalación | SEC-02 | Trigger `prevent_role_escalation` (D4) |
| Policy `qual = true` sin justificación | SEC-03, SEC-09, SEC-20..23 | Linter (D3) + comentario obligatorio |
| SECURITY DEFINER sin validación auth.uid() | SEC-04 | Guard clause obligatoria (D3) |
| Exposición de internals (comisiones, notas) | SEC-05 | VIEW sin columnas internas (D5) |
| Storage sin limit/mime | SEC-06, SEC-07 | Config obligatoria por bucket (D6) |
| Webhook secrets plaintext | SEC-08 | Vault (D8) |
| Falta rate limit en tRPC | SEC-10 | Middleware obligatorio (D9) |
| PII sin cifrar | SEC-11 | pgsodium (D10) |
| CORS wildcard | SEC-12 | Allowlist (D11) |
| Sin MFA | SEC-13 | Obligatorio roles sensibles (D1, D12) |
| Policy ALL con DELETE en history | SEC-14 | DELETE prohibido (D7) |
| Permisos sin validar plan | SEC-15 | `resolve_features` en tRPC (D9 + ADR-008) |
| Lecturas sensibles sin audit | SEC-19 | Audit log (D13) |

### D15. Penetration test pre-launch

- Pentest externo antes de FASE 28 (launch soft). Proveedor a contratar (ej. Cobalt, HackerOne private).
- Bug bounty program opcional H2.
- Auditoría trimestral automatizada (scanner RLS + dependency check + Snyk).

## Rationale

Se adopta defense-in-depth porque:

1. **Una sola capa es insuficiente**: la historia de SEC-01..04 muestra que asumir "RLS cubre todo" falló. Se necesita RLS + triggers + VIEWs + validación en funciones + middleware + Vault simultáneos.
2. **Rewriting da oportunidad única de codificar lecciones**: las 4 críticas + 6 altas se convierten en reglas de CI/linter, no en memoria humana.
3. **Cumplimiento regulatorio (LFPDPPP/LGPD)** exige cifrado, audit y derechos ARCO. Mejor diseñarlo desde inicio que retrofit.
4. **Presupuesto de seguridad contenido**: las capas D1-D13 son mayormente configuración y disciplina, no infraestructura cara. Coste marginal bajo si se diseña desde Fase 01-02.

## Consequences

### Positivas
- **0 hallazgos críticos arrastrados**: SEC-01..04 no pueden reintroducirse por diseño.
- **Compliance LFPDPPP/LGPD desde inicio** facilita expansión multi-country (ADR-003).
- **Audit log completo** para investigación de incidentes.
- **Pentest pre-launch** asegura que launch soft no expone usuarios piloto.
- **MFA obligatorio en roles sensibles** cierra vector phishing contra superadmin.
- **Rate limiting obligatorio** protege AI costs (ADR-002, ADR-007) y scraping de IE scores.
- **Linter custom** previene regresiones: si un PR introduce `qual = true` sin comentario, CI aborta.

### Negativas / tradeoffs
- **Complejidad upfront significativa**: Fase 01 (BD) + Fase 02 (Auth) + Fase 06 (Seguridad Baseline) son densas. Tiempo estimado combinado: ~1 semana de agentes paralelos.
- **pgsodium aumenta latencia queries**: cifrar/descifrar RFC por query es ~3-5ms extra. Mitigación: descifrar sólo en procedures explícitas, cachear resultado en memory cuando el contexto lo permite.
- **MFA obligatorio aumenta fricción de onboarding**: asesores/devs pueden abandonar durante enrollment TOTP. Mitigación: flow guiado + QR code claro + link de ayuda.
- **Rate limit puede bloquear Copilot legítimo**: power users pueden exceder 30 req/min en Copilot. Mitigación: burst allowance (p. ej. 10 requests burst + 30/min sostenido).
- **Audit log crece rápido**: tabla `audit_log` puede tener millones de rows en año 1. Mitigación: pg_partman para particionar por mes + archive a S3 cold storage después de 5 años.
- **Linter custom requiere mantenimiento**: scripts `scripts/lint-policies.ts` deben actualizarse con nuevas excepciones documentadas. Ownership: agente que escribe Fase 06.
- **Pentest es costo externo**: ~$5K-$15K USD según scope. Presupuestar en FASE 28 budget.
- **VIEWs pueden desincronizarse con tablas base**: añadir columna nueva a `projects` no la incluye automáticamente en `public_projects`. Mitigación: documentar checklist de migration + test que valida que VIEW pública no expone columnas fuera de allowlist.

### Neutrales
- **Las VIEWs públicas** son estándar Supabase bien soportado.
- **pgsodium** es oficial de Supabase; no riesgo de dependencia externa.
- **Auditorías trimestrales** son proceso, no infraestructura.

## Alternatives considered

### Alt 1: Zero-trust puro (ningún componente confía en otro, verificación en cada capa)
Modelo estilo Google BeyondCorp con verificación de identidad + device + contexto en cada request. **Descartada** porque:
- Overhead operativo alto (gestión de certificados device, context-aware policies).
- Complejidad desproporcionada para piloto < 100 usuarios.
- Revisable H3 si escala enterprise.

### Alt 2: Encryption at rest solo (sin RLS estricto)
Cifrar toda la BD con pgsodium + relajación de RLS confiando en la aplicación. **Descartada** porque:
- RLS es el pilar de Supabase; relajarlo pierde la ventaja nativa.
- Encryption at rest solo no previene SEC-02 (escalación de privilegios), SEC-04 (funciones definer sin validación).
- Mal fit con el modelo multi-tenant del producto.

### Alt 3: RLS opt-in (habilitar selectivamente en tablas que lo necesiten)
**Descartada** porque:
- Es el patrón que llevó a SEC-01..23 en el repo viejo (policies aparecieron tarde).
- Postgres + Supabase tratan RLS opt-in como anti-pattern.
- Linter sería imposible de mantener sin regla global "toda tabla tiene RLS".

### Alt 4: WAF + Cloudflare + reglas a nivel edge
Trasladar rate limit y mitigación a edge. **Descartada como reemplazo** (sí como complemento H2):
- WAF no reemplaza RLS (que opera a nivel fila), sólo complementa.
- Vercel + Supabase ya ofrecen mitigación básica DDoS.
- Cloudflare WAF evaluable en H2 para rutas públicas de alto tráfico (`/indices`, `/metodologia`, API pública).

## References
- `../biblia-v5/14_AUDITORIA_SEGURIDAD_23Hallazgos.md` (fuente de los 23 SEC)
- `../CONTEXTO_MAESTRO_DMX_v5.md` §14 (estado actual hallazgos)
- `../BRIEFING_PARA_REWRITE.md` §5 (reglas de código — auth, RLS)
- `../02_PLAN_MAESTRO/FASE_02_AUTH_Y_PERMISOS.md` (MFA enrollment)
- `../02_PLAN_MAESTRO/FASE_06_SEGURIDAD_BASELINE.md` (implementación 23 patrones)
- `../02_PLAN_MAESTRO/FASE_26_COMPLIANCE_AUDITORIA.md` (LFPDPPP/LGPD)
- `../02_PLAN_MAESTRO/FASE_28_LAUNCH_SOFT.md` (pentest pre-launch)
- `../03_CATALOGOS/03.4_CATALOGO_BD_RLS.md` (catálogo policies)
- ADR-002 AI-native (rate limit AI)
- ADR-003 Multi-country (compliance per country)
- ADR-007 Observability (audit log + masking PII)
- ADR-008 Monetization (feature gating + AML/KYC)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent B) | **Fecha:** 2026-04-17
