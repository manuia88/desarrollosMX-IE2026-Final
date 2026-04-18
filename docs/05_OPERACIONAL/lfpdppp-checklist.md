# LFPDPPP MX — Checklist de compliance

> Ley Federal de Protección de Datos Personales en Posesión de los Particulares. Responsable: el titular del negocio (DesarrollosMX). Aplica a usuarios con `country_code = 'MX'` y a cualquier titular que resida en México.

## Derechos ARCO (Acceso, Rectificación, Cancelación, Oposición)

- [x] **Acceso**: `GET /api/privacy/data-export` genera ZIP/JSON con data del titular en 8 tablas, sube a `dossier-exports`, retorna signed URL 24h. Audit en `privacy_exports`.
- [x] **Rectificación**: UI `/settings/account` + `/profile/seguridad` permiten editar datos propios (profile.first_name, last_name, email, phone, avatar, meta).
- [x] **Cancelación**:
  - `POST /api/privacy/data-delete` con `{confirm:"DELETE"}` → `request_account_deletion()` marca pending_deletion_at = now().
  - Ventana de 30d de arrepentimiento (`cancel_account_deletion()`).
  - Cron `scheduled_delete_daily` (03:15 UTC) ejecuta `run_scheduled_deletions()` → anonimiza PII (email, first/last, phone, rfc_encrypted, tax_id_encrypted, avatar, slug, meta) y `is_active = false`. Audit conserva histórico con payload anonimizado.
- [x] **Oposición**: via `POST /api/privacy/data-delete` o contacto al DPO (email definido en aviso de privacidad — FASE 22).

## Aviso de privacidad

- [ ] FASE 21 (landing pública): link `/aviso-de-privacidad` en footer, versión MX (también CO/AR/BR/US según locale).
- [ ] FASE 22: Portal de DPO (nombre, email, dirección postal).

## Retención y bitácoras

- [x] `audit_log` retención >= 7 años (LFPDPPP exige 5; margen safety). Particionamiento mensual con pg_partman; archivo a S3 tras 1 año (FASE 24).
- [x] `auth_sessions_log` append-only (DELETE revocado).
- [x] Operaciones administrativas audit-loggeadas vía triggers.

## Transferencias internacionales

- [ ] FASE 22: DPAs firmados con Supabase (data en us-east-1 por default), Vercel (cache en EU/US), Sentry (us-east-1), PostHog (us-east-1).
- [ ] Cláusulas contractuales estándar (CCS) para usuarios MX.

## Notificación de brecha de seguridad (< 72h)

- [ ] FASE 24: runbook de incidentes + PagerDuty webhook → notificación a INAI + titulares afectados.
- [ ] FASE 22: email template "brecha_detectada" con Resend.

## Medidas de seguridad

- [x] Cifrado at-rest (pgsodium AEAD-det) de `rfc`, `tax_id`.
- [x] Cifrado en tránsito (TLS 1.2+ vía HSTS).
- [x] Access control por RLS + RBAC + MFA obligatorio en roles admin.
- [x] Rate limiting contra abuso.
- [x] Audit log completo.
- [x] pgsodium key bootstrap controlado (solo service_role puede crear).

## Responsable de protección de datos (DPO)

- [ ] FASE 22: designar DPO (interno o externo) + publicar en aviso de privacidad.

## Revisión trimestral

- [ ] Agendar con PM externo. Checklist vigente para FY26Q2.

---

**Autor:** Claude Opus 4.7 (FASE 06) — `docs/02_PLAN_MAESTRO/FASE_06_SEGURIDAD_BASELINE.md §6.G`
