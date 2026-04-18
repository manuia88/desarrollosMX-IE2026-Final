# FASE 28 — Launch Soft (checklist + disclaimers + onboarding + rollout gradual + feedback)

> **Duración estimada:** 2 sesiones Claude Code (~8 horas con agentes paralelos) + 4 semanas post-launch monitoring on-call activo.
> **Dependencias:** Todas las fases previas 00-27. Bloqueante duro: tests CI green, compliance legal aprobado, seguridad 23 hallazgos cerrados.
> **Bloqueantes externos:**
> - **Dominios DNS configurados**: `desarrollosmx.com` (landing), `app.desarrollosmx.com` (app asesor/dev/comprador), `api.desarrollosmx.com` (API externa), `status.desarrollosmx.com` (Instatus), `mail.desarrollosmx.com` (Resend). SSL verify.
> - **Todas cuentas prod**: Stripe MX **live mode**, MercadoPago prod, Mifiel prod, Facturapi.io prod, Meta WA Business API **app aprobada prod**, Resend domain verified, Sentry prod project, PostHog prod, Supabase pro plan.
> - **Revisión legal T&Cs + Privacy** firmada por abogado.
> - **SAT FIEL** vigente para timbrado CFDI (si apply — FASE 16).
> - **Pentest externo** completado + findings cerrados (recomendable, no estrictamente bloqueante soft launch).
> - **10 asesores piloto** identificados + 3 desarrolladoras + 50 compradores curados CDMX.
> - **Press release** escrito + lista media contacts (Forbes MX, Expansión, Real Estate Market MX).
> **Resultado esperado:** Soft launch controlado. 100 items pre-launch checklist verified. Disclaimers "DMX no responsable post-venta" en 4+ UI surfaces. Onboarding guiado per rol. Feature flags PostHog controlan rollout gradual (10%→50%→100%). NPS in-app + exit survey + weekly interviews activos. Métricas AARRR trackeadas semanal. On-call rotation 24/7 4 semanas primeras. Press release distributed. Retrospectiva programada. Tag `fase-28-complete` + `launch-v1.0.0`.
> **Priority:** [H1]

## Contexto y objetivo

"Launch soft" NO es "ya está todo y abrimos puertas". Es **piloto controlado** para validar hypotheses, shake out bugs, calibrar mensajes, antes de invertir en adquisición agresiva.

Principios no negociables:
- **Controlled exposure**: 10 asesores + 3 devs + 50 compradores curados. No se hace push marketing antes de validar.
- **Disclaimer "DMX infraestructura, no responsable post-venta"** (ADR-008): REPETIDO en 4+ surfaces + cerrado duro.
- **Feature flags como canary**: todo nuevo sale gradual 10→50→100 por segmento.
- **Feedback loop semanal**: interviews 5/week + NPS continuo + exit survey + PostHog AARRR.
- **On-call 24/7 × 4 semanas**: Manu + backup (si existe). After 4 weeks → business hours + rotation H2.
- **Kill switches**: feature flags + maintenance mode + IP block list listos si algo explota.

Cross-references:
- ADR-008 (disclaimers normativa).
- ADR-007 (observability baseline para launch monitoring).
- FASE 24 (status page + alerts).
- FASE 26 (compliance legal).
- FASE 27 (tests green baseline).
- Runbook 05.1 (deployment), 05.2 (incident response).

## Bloques

### BLOQUE 28.A — Pre-launch checklist (100 items)

#### MÓDULO 28.A.1 — Infraestructura (15 items)

**Pasos:**
- `[28.A.1.1]` Dominio `desarrollosmx.com` + subdominios DNS configurados + SSL válido (Let's Encrypt via Vercel).
- `[28.A.1.2]` Env vars PROD en Vercel con `STRIPE_LIVE`, `ANTHROPIC_PROD`, etc. NO test keys.
- `[28.A.1.3]` Migraciones Supabase prod aplicadas + seed productivo (catálogos, features, roles).
- `[28.A.1.4]` Crons activos `vercel.json` (19 H1 crons desde `weekly_briefing` a `purge_*`).
- `[28.A.1.5]` Webhooks signing secrets rotados a prod keys (Stripe, Meta WA, Resend).
- `[28.A.1.6]` CSP + HSTS + X-Frame-Options + X-Content-Type-Options headers activos (FASE 06).
- `[28.A.1.7]` Rate limits en Edge Config prod values (más estrictos que dev).
- `[28.A.1.8]` MFA obligatorio para admins + superadmins.
- `[28.A.1.9]` Audit log activo y cron integrity check.
- `[28.A.1.10]` Backup Supabase PITR activo + daily dump off-site test restore pasado.
- `[28.A.1.11]` DR runbook validado via ejercicio GameDay reciente.
- `[28.A.1.12]` Pentest externo passed (findings cerrados o tracked con plan).
- `[28.A.1.13]` Compliance LFPDPPP: aviso publicado + submit INAI.
- `[28.A.1.14]` T&Cs, Privacy, Cookies aprobados legal + publicados + versionados.
- `[28.A.1.15]` AML/KYC activo para ops >$200K USD.

#### MÓDULO 28.A.2 — Pagos + Legal (15 items)

**Pasos:**
- `[28.A.2.1]` Stripe Live keys swap + Connect platform account verified.
- `[28.A.2.2]` MercadoPago prod active.
- `[28.A.2.3]` Facturapi.io CFDI prod environment.
- `[28.A.2.4]` Mifiel prod keys + signing flow tested end-to-end con doc real.
- `[28.A.2.5]` Fee 0.5% application_fee probado con operación test real.
- `[28.A.2.6]` Stripe Tax activo con IVA 16% MX correcto.
- `[28.A.2.7]` Webhook endpoints reachable desde Stripe/Meta/Resend (test events OK).
- `[28.A.2.8]` Dunning flow configurado (Smart Retries Stripe + custom cron).
- `[28.A.2.9]` Customer Portal URLs whitelisted Stripe dashboard.
- `[28.A.2.10]` Tax forms (W-9/W-8) collection si aplica payouts devs.
- `[28.A.2.11]` CFDI timbrado test real + sellado PAC OK.
- `[28.A.2.12]` Razón social + RFC DMX validados + registrados Hacienda.
- `[28.A.2.13]` Banking: cuenta receptora DMX para fees habilitada Stripe Connect.
- `[28.A.2.14]` Payout schedule Stripe Connect configured (weekly MX).
- `[28.A.2.15]` Escrow disclaimers email templates aprobados legal.

#### MÓDULO 28.A.3 — Communications (15 items)

**Pasos:**
- `[28.A.3.1]` Resend domain `mail.desarrollosmx.com` verified con SPF+DKIM+DMARC.
- `[28.A.3.2]` Meta WA Business API **app aprobada prod** + 5 templates aprobados.
- `[28.A.3.3]` Twilio account con número MX verified.
- `[28.A.3.4]` VAPID keys Web Push production.
- `[28.A.3.5]` Support email `soporte@desarrollosmx.com` configurado + routing.
- `[28.A.3.6]` ARCO email `privacidad@desarrollosmx.com` configurado.
- `[28.A.3.7]` DPO contact published + responsive.
- `[28.A.3.8]` Status page `status.desarrollosmx.com` live.
- `[28.A.3.9]` Email templates unsubscribe links signed correct.
- `[28.A.3.10]` WA STOP opt-out tested.
- `[28.A.3.11]` Cookie banner shown pre-analytics.
- `[28.A.3.12]` Sentry alerts → Slack `#ops-launch` + `#sentry-critical`.
- `[28.A.3.13]` PostHog dashboards AARRR + Monetization + Funnels activos.
- `[28.A.3.14]` On-call PagerDuty/OpsGenie rotation + escalation policies.
- `[28.A.3.15]` War room Slack channel `#launch-dmx-week1` activo.

#### MÓDULO 28.A.4 — Seguridad (15 items)

**Pasos:**
- `[28.A.4.1]` SEC-01 SELECT public_profiles VIEW verified (no directo sobre tabla).
- `[28.A.4.2]` SEC-02 trigger `prevent_role_escalation` activo + tested.
- `[28.A.4.3]` SEC-03 desarrolladoras public policy restricted.
- `[28.A.4.4]` SEC-04 8 funciones SECURITY DEFINER validan auth.uid().
- `[28.A.4.5]` SEC-05..23 cerrados + tests covering.
- `[28.A.4.6]` pgsodium vault encrypted secrets (webhook_secrets, RFC, credit bureau tokens).
- `[28.A.4.7]` CORS restrictive (allowlist + methods + credentials controlled).
- `[28.A.4.8]` Secrets rotation schedule documented.
- `[28.A.4.9]` Admin accounts: 2FA on + strong passwords + invite-only.
- `[28.A.4.10]` Session timeout: 30 días asesores, 7 días admin, 1 día api_keys.
- `[28.A.4.11]` Failed login attempts → lockout + audit.
- `[28.A.4.12]` Supabase Storage buckets policies reviewed (no public unrestricted).
- `[28.A.4.13]` Service role key NOT exposed client (server-only).
- `[28.A.4.14]` Env vars scanning via TruffleHog in CI.
- `[28.A.4.15]` Incident response runbook 05.2 live.

#### MÓDULO 28.A.5 — Producto + UX (20 items)

**Pasos:**
- `[28.A.5.1]` Dashboard asesor load <2s LCP.
- `[28.A.5.2]` Pricing page responsive + multi-currency.
- `[28.A.5.3]` Onboarding tours per rol (ver 28.D).
- `[28.A.5.4]` Empty states bonitos (no "no hay data" seco).
- `[28.A.5.5]` Error boundaries con mensajes actionables.
- `[28.A.5.6]` 404 / 500 / maintenance pages branded.
- `[28.A.5.7]` i18n 100% (cero strings hardcoded en production).
- `[28.A.5.8]` PWA installable + push notifs OK.
- `[28.A.5.9]` ⌘K Search funcional cross-feature.
- `[28.A.5.10]` AI Copilot sidebar responde en <3s.
- `[28.A.5.11]` Marketplace search con scores inline.
- `[28.A.5.12]` Landing hero dashboard mock funcional (JSX v2).
- `[28.A.5.13]` /indices public scroll + sort + filters.
- `[28.A.5.14]` /metodologia transparent + shareable.
- `[28.A.5.15]` Sidebar asesor 9+1 items + tints correct.
- `[28.A.5.16]` Captaciones requiere mínimo dirección+tipo+precio (anti-phantom).
- `[28.A.5.17]` Tareas con date picker absoluto + prioridad.
- `[28.A.5.18]` Operaciones wizard IVA auto + checkbox declaración jurada.
- `[28.A.5.19]` Accessibility axe 0 critical en producción.
- `[28.A.5.20]` prefers-reduced-motion respetado.

#### MÓDULO 28.A.6 — Testing + Quality (10 items)

**Pasos:**
- `[28.A.6.1]` Unit tests green coverage 70%+ shared/lib.
- `[28.A.6.2]` E2E green 20+ specs 3 browsers.
- `[28.A.6.3]` Visual regression baseline vigente.
- `[28.A.6.4]` RLS tests green 300+ cases.
- `[28.A.6.5]` Lighthouse CI green en 6 URLs críticas.
- `[28.A.6.6]` k6 load test API externa p99 <1s @ 5K req/min.
- `[28.A.6.7]` Smoke test post-deploy: 20 critical paths auto-verified.
- `[28.A.6.8]` Chaos test: DB down 30s → graceful degradation.
- `[28.A.6.9]` Manual QA: 10 flows tested by humans (Manu + 1 más).
- `[28.A.6.10]` Soak test 24h staging: no leaks, no perf regression.

#### MÓDULO 28.A.7 — Checklist trackeable

**Pasos:**
- `[28.A.7.1]` Publicar en `docs/05_OPERACIONAL/05.1_DEPLOYMENT_GUIDE.md` checklist 100 items como tabla.
- `[28.A.7.2]` Linear/Notion board "Launch checklist" con owner + status per item.
- `[28.A.7.3]` Weekly review T-3 semanas, T-2, T-1, T-0.
- `[28.A.7.4]` T-0 final review 24h antes launch: "go / no-go" decision.

**Criterio de done del módulo:**
- [ ] 100 items marcados ✅ antes go-live.

### BLOQUE 28.B — Disclaimers DMX infraestructura (post-venta)

#### MÓDULO 28.B.1 — UI surfaces

**Pasos:**
- `[28.B.1.1]` **Proyecto page** (`/proyectos/[id]`): badge visible "Infraestructura DMX · Este proyecto es responsabilidad del desarrollador [NombreDev]". Click abre modal explicando qué cubre DMX y qué no.
- `[28.B.1.2]` **Checkout operación** (apartado unidad): modal obligatorio pre-confirm con texto legal + checkbox "Entiendo que DMX no es responsable por vicios ocultos, retrasos, cancelaciones, o calidad construcción. Mi relación de compraventa es con el Desarrollador."
- `[28.B.1.3]` **Escrow release email**: template incluye párrafo "DMX liberó los fondos al desarrollador según términos contractuales. **DMX ha cumplido su función de infraestructura de pago.** Cualquier incidencia post-venta se atenderá directamente con [NombreDev]."
- `[28.B.1.4]` **Footer global**: link "Nuestro rol · Infraestructura" con disclaimers.
- `[28.B.1.5]` **T&Cs cláusula 4**: texto completo legal reviewed.
- `[28.B.1.6]` **Signup flow**: checkbox específico "Entiendo el rol de DMX como infraestructura" (adicional al checkbox T&Cs).

**Criterio de done del módulo:**
- [ ] Disclaimer visible en 6 surfaces + legalmente binding (checkbox + tracking consent).
- [ ] Audit log tracking `disclaimer_acknowledged` per user.

### BLOQUE 28.C — Soft launch strategy

#### MÓDULO 28.C.1 — 10 asesores + 3 devs + 50 compradores curados

**Pasos:**
- `[28.C.1.1]` Lista 10 asesores CDMX identificados — acordar piloto 4 semanas + feedback semanal + descuento 50% primeros 6 meses.
- `[28.C.1.2]` 3 desarrolladoras: Quiero Casa / GFA / Abilia or similar; acordar 3 proyectos cada una cargados.
- `[28.C.1.3]` 50 compradores curados: leads calificados network Manu (amigos/family/referrals) con perfil comprador real.
- `[28.C.1.4]` Tabla `soft_launch_cohort` (user_id, cohort_tag, joined_at, source, referrer, status) para tracking.
- `[28.C.1.5]` Invitaciones personales manuales (no mass email) + código invite exclusivo.
- `[28.C.1.6]` Acuerdo verbal/documento: feedback 4 semanas (15min/semana interview).

**Criterio de done del módulo:**
- [ ] 63 users invitados confirmados antes go-live.

#### MÓDULO 28.C.2 — Rollout geográfico

**Pasos:**
- `[28.C.2.1]` Inicialmente solo CDMX (datos IE más completos).
- `[28.C.2.2]` Feature flag `region_cdmx_only=true` en Edge Config → users con `country_code=MX AND state_code=CDMX` ven todas features; otros ven "próximamente tu ciudad" waitlist.
- `[28.C.2.3]` Semana 5-8: expand Guadalajara + Monterrey (pins Fase 29 H2).

**Criterio de done del módulo:**
- [ ] Non-CDMX users ven waitlist + no pueden transact.

### BLOQUE 28.D — Onboarding guiado per rol

#### MÓDULO 28.D.1 — Asesor onboarding (6 pasos)

**Pasos:**
- `[28.D.1.1]` Paso 1: bienvenida + video 2min (grabado Manu) + CTA "Empezar".
- `[28.D.1.2]` Paso 2: completar perfil (avatar, zonas_ventas[], tipos_propiedad[], idiomas).
- `[28.D.1.3]` Paso 3: conectar WhatsApp (opt-in + verify phone).
- `[28.D.1.4]` Paso 4: importar contactos CSV o Google Contacts (optional).
- `[28.D.1.5]` Paso 5: crear 1era búsqueda con contacto test.
- `[28.D.1.6]` Paso 6: tour Dashboard (interactive coachmarks 5 items).
- `[28.D.1.7]` Completion tracked in `onboarding_progress` (user_id, steps_completed[], completed_at).

**Criterio de done del módulo:**
- [ ] Asesor completa onboarding <10min.

#### MÓDULO 28.D.2 — Desarrollador onboarding

**Pasos:**
- `[28.D.2.1]` Setup empresa (razón social, RFC, logo, colores brand).
- `[28.D.2.2]` Stripe Connect Express onboarding (KYC).
- `[28.D.2.3]` Crear 1er proyecto (subir PDF o manual wizard).
- `[28.D.2.4]` Document AI extract → revisar tabla extraída → aprobar publish.
- `[28.D.2.5]` Analytics tour (7 tabs).

**Criterio de done del módulo:**
- [ ] Dev publica 1er proyecto <30min.

#### MÓDULO 28.D.3 — Comprador onboarding

**Pasos:**
- `[28.D.3.1]` Lifestyle Match quiz (A10: 6 perfiles — quiet/nightlife/family/fitness/remote_worker/investor).
- `[28.D.3.2]` Affordability quick calc (A01) — budget range.
- `[28.D.3.3]` Zonas preferidas (map interactive con 5 zonas sugeridas).
- `[28.D.3.4]` Homepage personalizada (Netflix pattern, §18.2).

**Criterio de done del módulo:**
- [ ] Comprador ve homepage relevant en primera visita.

### BLOQUE 28.E — Feature flags rollout gradual

#### MÓDULO 28.E.1 — Canary rollout via PostHog

**Pasos:**
- `[28.E.1.1]` Flags gradient rollout: `new_onboarding_v2` 10% día 1 → 50% día 4 → 100% día 8 si métricas ok.
- `[28.E.1.2]` Flags reversibles via PostHog toggle (instant rollback).
- `[28.E.1.3]` Automated rollback: si error rate > 2% en cohort feature on → auto-disable + alert.
- `[28.E.1.4]` A/B tests arranca semana 2: copilot proactive on vs manual.

**Criterio de done del módulo:**
- [ ] 3 flags rollout gradual tracked PostHog.

### BLOQUE 28.F — Feedback loop

#### MÓDULO 28.F.1 — NPS in-app

**Pasos:**
- `[28.F.1.1]` Widget NPS PostHog Surveys activado random 10% users post 7 días de uso.
- `[28.F.1.2]` Pregunta "¿Qué tan probable recomiendas DMX (0-10)?" + follow-up texto libre.
- `[28.F.1.3]` Dashboard `/admin/nps` agregando scores + NPS = promoters - detractors.

**Criterio de done del módulo:**
- [ ] NPS data colectada desde semana 2.

#### MÓDULO 28.F.2 — Exit survey

**Pasos:**
- `[28.F.2.1]` User cancela subscription o deletes account → survey 3 preguntas obligatorias: razón cancelación (multi-select), qué mejorarías, volverías si (texto libre).
- `[28.F.2.2]` Response persisted en `exit_surveys` + analizado semanal.

**Criterio de done del módulo:**
- [ ] Todo cancel/delete flow captura reason.

#### MÓDULO 28.F.3 — Weekly user interviews

**Pasos:**
- `[28.F.3.1]` Semana 1-4: 5 interviews/semana (15min). Mix asesor/dev/comprador.
- `[28.F.3.2]` Template preguntas: primera impresión, friction points, features muy usados, features no descubiertos, willingness to pay.
- `[28.F.3.3]` Notas centralizadas Notion + quotes relevantes PostHog annotations.

**Criterio de done del módulo:**
- [ ] 20 interviews completadas primer mes.

### BLOQUE 28.G — AARRR metrics weekly

#### MÓDULO 28.G.1 — Dashboard KPIs

**Pasos:**
- `[28.G.1.1]` PostHog dashboard `AARRR v1` con 5 secciones:
  - **Acquisition**: signups by source (organic, referral, invite, press); CAC (si pago ads).
  - **Activation**: onboarding completion rate per rol.
  - **Retention**: D7, D30 retention; WAU/MAU ratio.
  - **Revenue**: MRR, ARPU, paid conversion rate (free→paid), churn monthly.
  - **Referral**: referral rate (invite sent per user), viral K factor.
- `[28.G.1.2]` Weekly email cohort report (asinal Monday 9am).
- `[28.G.1.3]` Benchmarks vs expected: target D7 retention asesor >50%, dev >70%, comprador >30%.

**Criterio de done del módulo:**
- [ ] Dashboard con datos semana 1 → tomar acciones semana 2.

### BLOQUE 28.H — Incident response 24/7

#### MÓDULO 28.H.1 — On-call 4 semanas

**Pasos:**
- `[28.H.1.1]` Manu on-call primary + (backup si existe — sino Manu solo con alertas strictas).
- `[28.H.1.2]` PagerDuty schedule 24/7 (o OpsGenie). Escalation 15min ack → SMS → phone.
- `[28.H.1.3]` Runbook 05.2 detalla 10 escenarios frecuentes + pasos primera hora.
- `[28.H.1.4]` Incident severity matrix: SEV1 down prod → 15min ack / 60min fix, SEV2 degradation → 1h ack / 4h fix, SEV3 bug non-critical → 24h ack.
- `[28.H.1.5]` Post-mortem template obligatorio SEV1+SEV2 within 48h resolution.

**Criterio de done del módulo:**
- [ ] 2 ejercicios GameDay semana -1 para validar on-call response.

### BLOQUE 28.I — Comms plan press + social

#### MÓDULO 28.I.1 — Press release

**Pasos:**
- `[28.I.1.1]` Redactar press release 300-500 palabras con quotes Manu + key differentiators (7 productos B2B, 108+ scores, IE MX único).
- `[28.I.1.2]` Distribution: Forbes MX, Expansión, El Economista, Real Estate Market MX, Inmuebles24 blog, LinkedIn News, Hackernoon LATAM, Contxto.
- `[28.I.1.3]` Embargoed send -3 días launch; public noon local launch day.
- `[28.I.1.4]` Spokesperson briefing Manu + talking points Q&A prep.

**Criterio de done del módulo:**
- [ ] PR distribuido day 0 + 3 coberturas logradas week 1.

#### MÓDULO 28.I.2 — Social + launch post

**Pasos:**
- `[28.I.2.1]` LinkedIn long-form post Manu (story founder + why DMX + invitation early users).
- `[28.I.2.2]` Launch post blog dmx `/blog/launch-2026`.
- `[28.I.2.3]` Twitter/X thread 10 tweets principales features.
- `[28.I.2.4]` Newsletter launch email a newsletter_subscribers (seed pre-launch campaigns).
- `[28.I.2.5]` Community: Product Hunt launch (optional H2), IndieHackers, Reddit r/mexico, Discord proptech LATAM.

**Criterio de done del módulo:**
- [ ] Posts publicados + 50+ interactions week 1.

### BLOQUE 28.J — Post-launch retrospectiva

#### MÓDULO 28.J.1 — Review 4 semanas

**Pasos:**
- `[28.J.1.1]` Agendar retro session semana +4 (Manu + asesores piloto key).
- `[28.J.1.2]` Agenda: what went well, what broke, what surprised, top 5 learnings, top 5 next priorities.
- `[28.J.1.3]` Outputs → linear epics para roadmap H2 (Fase 29 scaffold informa sesión 1 post-launch).
- `[28.J.1.4]` Decisión go/no-go "abrir oficialmente" (public availability, remove invite gate) basado en retention+NPS metrics.

**Criterio de done del módulo:**
- [ ] Retro documented + next quarter plan published internal.

### BLOQUE 28.K — Comms público launch

#### MÓDULO 28.K.1 — Status page + comms

**Pasos:**
- `[28.K.1.1]` Status page `status.desarrollosmx.com` live + subscribers.
- `[28.K.1.2]` Maintenance window calendar: domingo 03:00-05:00 MX para deploys rutinarios.
- `[28.K.1.3]` Incident communication template + playbook.

**Criterio de done del módulo:**
- [ ] Status page live + 5+ subscribers.

### BLOQUE 28.L — Launch day checklist T-0

#### MÓDULO 28.L.1 — Go/No-go meeting

**Pasos:**
- `[28.L.1.1]` Meeting T-24h con Manu + counsel legal + backup on-call:
  - Revisar 100 items checklist: 100% green.
  - Verificar incidents últimas 72h.
  - Validar data prod crítica (60+ users seeded, 10 proyectos, 20+ scores).
  - Go/No-go vote.
- `[28.L.1.2]` Go → schedule final deployment T-4h.
- `[28.L.1.3]` T-0: Deploy v1.0.0 tag. Smoke test paths. Announce Slack + press distribution.
- `[28.L.1.4]` T+1h: verify metrics baseline + first user signup.
- `[28.L.1.5]` T+24h: daily checkpoint con team.

**Criterio de done del módulo:**
- [ ] Launch T-0 ejecutado sin incidents SEV1.

## Criterio de done de la FASE

- [ ] 100 items pre-launch checklist verificados ✅.
- [ ] Disclaimers DMX infraestructura en 6 UI surfaces + T&Cs + audit consent.
- [ ] 63 users piloto (10 asesores + 3 devs + 50 compradores) onboarded.
- [ ] Rollout CDMX-only con feature flag region lock.
- [ ] Onboarding guiado per rol con completion tracking.
- [ ] Feature flags canary rollout PostHog 3+ flags.
- [ ] NPS + exit survey + weekly interviews (20 completadas month 1).
- [ ] AARRR dashboard + weekly email reports.
- [ ] On-call 24/7 × 4 semanas con runbooks + escalation.
- [ ] Press release distribuido + 3+ coberturas week 1.
- [ ] Launch post + LinkedIn + Twitter + newsletter.
- [ ] Status page live + subscribers + maintenance policy.
- [ ] Go/No-go meeting T-24h documentado + launch T-0 ejecutado.
- [ ] Retro semana +4 documentada + plan H2 derivado.
- [ ] Tag git `fase-28-complete` + `launch-v1.0.0`.

## Próxima fase

FASE 29 — H2/H3 Scaffold (pins + decisiones roadmap post-launch, CERO implementación).

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent F) | **Fecha:** 2026-04-17
