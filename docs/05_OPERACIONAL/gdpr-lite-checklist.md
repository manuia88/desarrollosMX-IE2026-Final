# GDPR-lite Checklist — Preparación H2 para EU + US

> No se opera en EU aún (H1 = MX/CO/AR/BR). Este checklist prepara la expansión H2 (aplicable si país de usuario es EU) y adopta los principios GDPR donde tiene sentido ya en H1.

## Lawful basis (Art. 6)

- [x] **Consent**: signup exige aceptación de ToS + aviso de privacidad (formulario en FASE 02 onboarding).
- [ ] H2: cookie banner con granular consent (necesarias / analítica / marketing) para visitantes EU.
- [x] **Contract**: procesamiento de datos para prestar el servicio (compraventa inmobiliaria) — base contractual.
- [x] **Legitimate interest**: audit log para seguridad/anti-fraude (balanceado con impacto al titular).

## Derechos del interesado

- [x] **Right to access (Art. 15)**: `GET /api/privacy/data-export` entrega JSON portable.
- [x] **Right to rectification (Art. 16)**: UI de edición de perfil.
- [x] **Right to erasure / to be forgotten (Art. 17)**: `POST /api/privacy/data-delete` + ventana 30d + anonimización.
- [x] **Right to restrict processing (Art. 18)**: stub (marcar profile.is_active=false en anonimización).
- [x] **Right to data portability (Art. 20)**: export en JSON estándar.
- [ ] **Right to object (Art. 21)**: H2, flag `meta.marketing_consent=false` + respetarlo en envíos Resend.
- [x] **Rights related to automated decision making (Art. 22)**: IA copilot no toma decisiones automáticas que afecten legal/materialmente al usuario; recomienda.

## Principios (Art. 5)

- [x] **Lawfulness, fairness, transparency**: aviso de privacidad en FASE 21.
- [x] **Purpose limitation**: data usada solo para prestar servicio inmobiliario + seguridad + analytics agregados.
- [x] **Data minimisation**: sólo PII necesaria (email, phone, rfc para fiscal docs, etc.).
- [x] **Accuracy**: UI de edición + triggers audit_log capturan cambios.
- [x] **Storage limitation**: retención 5-7 años (LFPDPPP align). Profiles anónimos tras anonymize_profile. view_dedup prune en FASE 24.
- [x] **Integrity & confidentiality**: ver pentest-checklist.md A02/A09.
- [x] **Accountability**: ADR-009 + audit log + este checklist.

## DPIA (Data Protection Impact Assessment)

- [ ] H2: DPIA para procesamiento de IE scores (decisiones automatizadas con impacto en valoración inmobiliaria).
- [ ] H2: DPIA para IA Copilot (si expandimos a usuarios EU).

## Data Processing Agreements

- [ ] H2: DPAs con Supabase, Vercel, Sentry, PostHog, Anthropic, OpenAI, Mapbox, Cloudinary, Resend.

## Notificación de brecha (Art. 33-34)

- [ ] Runbook < 72h a autoridad supervisora (H2) + afectados (H1 pending_deletion_at scan).

## Transferencias internacionales (Art. 44-50)

- [ ] H2: SCCs con todos los subprocesadores + Supplementary Measures (TIA).
- [ ] Considerar región `eu-central-1` en Supabase para data de usuarios EU (FASE 29+).

---

**Autor:** Claude Opus 4.7 (FASE 06) — `docs/02_PLAN_MAESTRO/FASE_06_SEGURIDAD_BASELINE.md §6.G`
