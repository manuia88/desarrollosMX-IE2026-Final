# FASE 11.W — DISC Voice Pipeline (mini-fase foundational, BLK_DISC resolution)

## Status
🟡 AGENDADA post-FASE 07.7 (resolución blocker BLK_DISC — perfil DISC del comprador habilitado en `buyer_twins.disc_profile` jsonb)

## Trigger
- Inicio: tag `fase-07.7-crm-foundation-complete` + founder cerró Gates 4, 5, 6
- Cierre: tag `fase-11.W-disc-voice-pipeline-complete`

## Objetivo
Habilitar el pipeline que detecta el perfil DISC (estilo de comunicación: dominante/influyente/sereno/cumplidor) del comprador a partir de audio o auto-evaluación. Sin DISC, el agente WhatsApp (C3.F1), el playbook de objeciones (C3.F3), DISC auto-detectado (C1.18) y el gemelo digital 6D (T.2.1) quedan greenfield. Resuelve BLK_DISC mediante: framework canonizado + self-assessment manual H1 + Whisper transcripción + clasificador LLM ligado a buyer_twins.

## Sub-bloques propuestos

### 11.W.A — DISC framework canonization + privacy ADR
- Scope: ADR-036 elige DISC 4-axis (vs Big-Five vs MBTI) + ADR-038 privacy LFPDPPP/GDPR/LGPD voice biométrico opt-in + tabla `disc_assessments`.
- Migrations: 2 (~8h)

### 11.W.B — Self-assessment manual stub H1
- Scope: 8-10 preguntas form react-hook-form + scoring → `buyer_twins.disc_profile` JSON + i18n 5 locales.
- Migrations: 1 (~17h)

### 11.W.C — Whisper integration audio pipeline
- Scope: edge function `transcribe-audio` (provider abstraction Whisper OpenAI H1, ADR-037), retention 90d audio, signed URLs Supabase Storage.
- Migrations: 3 (~23h)

### 11.W.D — LLM DISC classifier
- Scope: pipeline `transcript → DISC scores 4-axis` con Haiku 4.5 + prompt template versionado + cost cap.
- Migrations: 1 (~14h)

### 11.W.E — Wire buyer_twins + tests + smoke
- Scope: backfill `disc_profile` opcional + smoke E2E + observability (`ingest_runs` cron entry).
- Migrations: 1 (~2h)

## Migrations requeridas
- Count: **8**
- Lista tentativa:
  - `disc_001_assessments_schema`
  - `disc_002_consent_voice_biometrico`
  - `disc_003_self_assessment_responses`
  - `disc_004_audio_transcripts_table`
  - `disc_005_audio_storage_signed_urls_policy`
  - `disc_006_audio_retention_90d_cron`
  - `disc_007_llm_classifier_runs_log`
  - `disc_008_buyer_twins_disc_profile_wire`

## Founder gates requeridos
- Gate-4 ADR-036 — DISC vs Big-Five vs MBTI (rec: DISC 4-axis, validar con consultor psicómetra H1)
- Gate-5 ADR-037 — Whisper provider OpenAI vs self-hosted vs Deepgram (rec: OpenAI H1, pivot post-1000 samples)
- Gate-6 ADR-038 — Privacy voice biométrico LFPDPPP/GDPR/LGPD (rec: opt-in explícito + retention 90d audio)

## Effort + Wall-clock
- Effort total: **64h**
- Wall-clock 1 dev fulltime: **8 días**
- Wall-clock 3 devs paralelo: **4 días**

## Features unblocked downstream
- Count: **11** (7 directos C3 + 4 cascade)
- Top 5:
  1. C3.F1 Agente WhatsApp DISC-aware
  2. C3.F3 Objection playbook DISC-tailored
  3. C1.18 DISC auto-detectado en lead capture
  4. T.2.1 Gemelo digital persistente 6D (incluye DISC axis)
  5. C1.10 Buyer twin preloaded (depende DISC + DEALS schema 07.7)

## Success criteria
- [ ] 8 migrations aplicadas + `audit:rls` clean
- [ ] Self-assessment form vive en 5 locales (es-MX/CO/AR · pt-BR · en-US)
- [ ] Whisper edge function < 5s P95 latency 60s audio sample
- [ ] LLM classifier outputs reproducibles (test fixture 50 transcripts → scores estables ±5%)
- [ ] Consent flow registra opt-in en `audit_log` con timestamp + locale + persona
- [ ] Tag `fase-11.W-disc-voice-pipeline-complete` en main

## Referencias
- `docs/08_PRODUCT_AUDIT/04_ROADMAP_INTEGRATION.md` sec 1.2
- `docs/08_PRODUCT_AUDIT/03_RICE_PRIORITIES.md` sec 7 (BLK_DISC source)
- `docs/08_PRODUCT_AUDIT/01_CROSSWALK_MATRIX.md` (11 features capa C3 + cross)
- ADR-036/037/038 (a crear post-Gates 4-6)
