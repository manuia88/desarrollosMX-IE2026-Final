# FASE 34 — Creator Economy

> **Duración estimada:** 4 sesiones Claude Code (~16 horas)
> **Dependencias:** [FASE 21 — Portal Público](./FASE_21_PORTAL_PUBLICO.md), [FASE 22 — Marketing + Comms](./FASE_22_MARKETING_COMMS.md)
> **Bloqueantes externos:**
> - Mux account para video hosting + adaptive streaming (`MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`)
> - Cloudflare Stream alternativa evaluada (backup plan)
> - Cuenta ConvertKit/Substack partner o self-host Ghost (decidir 34.C)
> - Stripe Connect para payouts a creators (multi-party settlement)
> - Discord server existente (from FASE 30.I.1) — extender canales creator
> - Cuenta Roblox Studio (H3 pin para experiences)
> - Anthropic API key (content moderation)
> **Horizonte:** H2
> **Resultado esperado:** Plataforma de creator economy (TikTok + Substack pattern) donde asesores, brokers, data scientists y community publican contenido real estate + monetizan. DMX Creator profiles, short-form video feed con algoritmo relevancia (GC-9), Substack-style newsletter per-creator, monetization (tips, subs, affiliate lead shares), Roblox-style real estate experiences como STUB H3 (GC-108), content moderation (Constitutional AI + human review), creator analytics dashboard (GC-96), community Discord (GC-12 Midjourney pattern). Tag `fase-34-complete`.
> **Priority:** [H2]

## Contexto y objetivo

Los diferenciadores clásicos PropTech (listings, tours, scores) se saturan. El próximo moat es **creator economy sobre real estate LATAM** — donde un asesor top-10% construye audiencia propia en DMX, publica insights de su zona, y monetiza (tips del viewer comprador, subs mensuales a su newsletter, lead shares cuando su audiencia cierra operación vía DMX).

Rationale: [ADR-011](../01_DECISIONES_ARQUITECTONICAS/ADR-011_MOONSHOT_3_HORIZONTES.md), [ADR-014](../01_DECISIONES_ARQUITECTONICAS/ADR-014_AGENTIC_ARCHITECTURE.md), [ADR-015](../01_DECISIONES_ARQUITECTONICAS/ADR-015_PLATFORM_PLAY_H2.md). Pattern references:
- [GC-9 TikTok real estate](../07_GAME_CHANGERS/07.5_SOCIAL_CLUSTER.md#gc-9) — short-form video + discovery algorithm.
- [GC-11 Substack](../07_GAME_CHANGERS/07.5_SOCIAL_CLUSTER.md#gc-11) — newsletter nicho + paid subs.
- [GC-12 Midjourney Discord](../07_GAME_CHANGERS/07.5_SOCIAL_CLUSTER.md#gc-12) — comunidad como engine retention.
- [GC-96 Creator analytics](../07_GAME_CHANGERS/07.5_SOCIAL_CLUSTER.md#gc-96) — dashboard impact driven.
- [GC-108 Roblox experiences](../07_GAME_CHANGERS/07.5_SOCIAL_CLUSTER.md#gc-108) — gamified real estate H3.

Meta H2: 1000+ creators activos, 50K+ followers agregados, $500K+ GMV entre tips+subs+affiliates.

## Bloques

### BLOQUE 34.A — DMX Creator profiles

#### MÓDULO 34.A.1 — Profile + verification + public page

**Pasos:**
- `[34.A.1.1]` Migration `creators.sql`:
  ```sql
  CREATE TABLE public.creators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
    handle TEXT NOT NULL UNIQUE,                -- '@rossana_polanco'
    display_name TEXT NOT NULL,
    bio TEXT,
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    verification_tier TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_tier IN ('unverified','verified','top_creator')),
    specialties TEXT[],                         -- ['Polanco','Roma','Condesa','Luxury','First-time buyer']
    avatar_url TEXT,
    cover_url TEXT,
    links JSONB,                                -- {instagram, tiktok, linkedin, website}
    followers_count INT DEFAULT 0,
    monthly_earnings_usd_minor BIGINT DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE INDEX idx_creators_country ON public.creators (country_code, verification_tier);
  CREATE TABLE public.creator_follows (
    follower_user_id UUID NOT NULL REFERENCES auth.users(id),
    creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    followed_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (follower_user_id, creator_id)
  );
  ```
- `[34.A.1.2]` Public page `/@{handle}` con:
  - Header (avatar, cover, bio, verified badge, specialties, follow button)
  - Tabs: Videos, Newsletter, Products (affiliate), About
  - Social proof (followers count, monthly earnings hidden default)
- `[34.A.1.3]` Verification — `verified` requiere asesor licenciado + cédula verified via document intel (FASE 17) + 30 días activity. `top_creator` automático al top 5% by engagement trimestral.
- `[34.A.1.4]` Onboarding flow `/creator/setup` disponible a cualquier user DMX → 3 pasos (profile, specialties, link socials).

**Criterio de done del módulo:**
- [ ] Creator page live.
- [ ] Verification pipeline funcional.

### BLOQUE 34.B — Short-form video feed (GC-9)

#### MÓDULO 34.B.1 — Upload + processing + feed

**Pasos:**
- `[34.B.1.1]` Upload UI `/creator/videos/new` soporta MP4/MOV máx 3 minutos + 500MB. Upload multipart → Mux Direct Uploads API → asset ID stored.
- `[34.B.1.2]` Migration `creator_videos`:
  ```sql
  CREATE TABLE public.creator_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    mux_asset_id TEXT NOT NULL,
    mux_playback_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    duration_seconds INT,
    tags TEXT[],
    zone_id UUID,                               -- opcional — video about specific zone
    published_at TIMESTAMPTZ,
    views_count INT DEFAULT 0,
    likes_count INT DEFAULT 0,
    tips_received_usd_minor BIGINT DEFAULT 0,
    moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','rejected')),
    moderation_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE INDEX idx_cv_creator ON public.creator_videos (creator_id, published_at DESC);
  CREATE INDEX idx_cv_zone ON public.creator_videos (zone_id) WHERE zone_id IS NOT NULL;
  CREATE TABLE public.creator_video_interactions (
    user_id UUID NOT NULL REFERENCES auth.users(id),
    video_id UUID NOT NULL REFERENCES public.creator_videos(id) ON DELETE CASCADE,
    interaction TEXT NOT NULL CHECK (interaction IN ('view','like','share','save','skip','report')),
    watch_duration_seconds INT,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE INDEX idx_cvi_user ON public.creator_video_interactions (user_id, created_at DESC);
  ```
- `[34.B.1.3]` Feed algorithm `features/creators/lib/feed-algorithm.ts`:
  - Signals: watch_duration_ratio, likes, shares, saves, follows_creator, zone_interest_match (buyer pref), recency decay.
  - Formula: `score = 0.4*watch_ratio + 0.2*likes_rate + 0.15*shares + 0.15*zone_match + 0.1*recency`.
  - Cold start: new users → trending this week por país + si location available top creators local.
- `[34.B.1.4]` UI `/discover` con vertical swipeable feed (mobile) + grid (desktop). React Server Components pre-render primera página + client-side fetch lazy.
- `[34.B.1.5]` Playback adaptive vía Mux Player (`@mux/mux-player-react`).

**Criterio de done del módulo:**
- [ ] Upload → processed → playable <2 min.
- [ ] Feed cargado <1s.

### BLOQUE 34.C — Substack-style newsletters

#### MÓDULO 34.C.1 — Newsletter platform

**Pasos:**
- `[34.C.1.1]` Decisión: self-host con Resend + React Email (consistencia stack DMX + no extra vendor). Alternativa rechazada: Substack partner (revenue share 10% eat DMX margin).
- `[34.C.1.2]` Migration:
  ```sql
  CREATE TABLE public.creator_newsletters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL UNIQUE REFERENCES public.creators(id) ON DELETE CASCADE,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    custom_domain TEXT,                         -- ej: polanco-real.desarrollosmx.com
    pricing_monthly_usd_minor BIGINT DEFAULT 0,
    pricing_yearly_usd_minor BIGINT,
    subscribers_count INT DEFAULT 0,
    stripe_product_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE TABLE public.creator_newsletter_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    newsletter_id UUID NOT NULL REFERENCES public.creator_newsletters(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    body_markdown TEXT NOT NULL,
    body_html TEXT,                             -- rendered cached
    is_paywalled BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    opens_count INT DEFAULT 0,
    clicks_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE TABLE public.creator_newsletter_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    newsletter_id UUID NOT NULL REFERENCES public.creator_newsletters(id),
    subscriber_user_id UUID NOT NULL REFERENCES auth.users(id),
    plan TEXT NOT NULL CHECK (plan IN ('free','paid_monthly','paid_yearly')),
    stripe_subscription_id TEXT,
    started_at TIMESTAMPTZ DEFAULT now(),
    canceled_at TIMESTAMPTZ,
    UNIQUE(newsletter_id, subscriber_user_id)
  );
  ```
- `[34.C.1.3]` Editor UI `/creator/newsletter/compose` — Tiptap markdown editor + preview + schedule send.
- `[34.C.1.4]` Send pipeline: issue marked `published_at` → worker batches subscribers → Resend broadcast. Paid-only issues check subscription status first.
- `[34.C.1.5]` Public archive `/creator/{handle}/newsletter/{issue_slug}` — paywall if `is_paywalled = true` AND not subscriber.

**Criterio de done del módulo:**
- [ ] Creator publica issue end-to-end.
- [ ] Paywall enforced.

### BLOQUE 34.D — Monetization: tips, subs, affiliate

#### MÓDULO 34.D.1 — Tips (one-time)

**Pasos:**
- `[34.D.1.1]` Cada video/issue tiene botón "Tip" con amounts preset $20/$50/$100/$200 MXN + custom. Payments via Stripe Payment Intents con `application_fee_percent: 15` (DMX fee) + payout a creator Stripe Connect account.
- `[34.D.1.2]` Tabla:
  ```sql
  CREATE TABLE public.creator_tips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES public.creators(id),
    tipper_user_id UUID REFERENCES auth.users(id),
    amount_usd_minor BIGINT NOT NULL,
    currency CHAR(3) NOT NULL,
    context_type TEXT CHECK (context_type IN ('video','newsletter_issue','profile')),
    context_id UUID,
    stripe_payment_intent_id TEXT,
    dmx_fee_usd_minor BIGINT NOT NULL,
    creator_payout_usd_minor BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```

#### MÓDULO 34.D.2 — Subscriptions (recurring)

**Pasos:**
- `[34.D.2.1]` Creator set pricing newsletter (ej: $99 MXN/mes). Stripe Products created automáticos + revenue share 85% creator / 15% DMX.
- `[34.D.2.2]` Stripe Connect Express accounts para creators simplified KYC (integrado FASE 18 Stripe Connect setup).
- `[34.D.2.3]` Dashboard `/creator/earnings` — breakdown por source + próximo payout date.

#### MÓDULO 34.D.3 — Affiliate lead shares

**Pasos:**
- `[34.D.3.1]` Creator genera short link `dmx.co/r/{handle}/{property_id}` → tracked with UTM + attribution (cookie 30 días o logged-in follower attribution).
- `[34.D.3.2]` Si referral cierra operación, creator recibe 1% del ticket total (max $2K USD) — configurable en admin.
- `[34.D.3.3]` Tabla `creator_affiliate_attributions` + función trigger `on_operation_closed` que atribuye credit.

**Criterio de done del módulo:**
- [ ] 3 monetization streams funcionales.
- [ ] Payouts Stripe Connect exitosos.

### BLOQUE 34.E — Roblox-style real estate experiences (H3 pin — GC-108)

#### MÓDULO 34.E.1 — STUB

**Pasos:**
- `[34.E.1.1]` STUB — activar FASE 38+. Pattern: creators build interactive 3D showrooms en Roblox Studio, embed en DMX via iframe + Roblox Web API.
- `[34.E.1.2]` Badge `[H3 próximamente]` en UI creator dashboard con link a waitlist.
- `[34.E.1.3]` Cross-reference [GC-108](../07_GAME_CHANGERS/07.5_SOCIAL_CLUSTER.md#gc-108).

**Criterio de done del módulo:**
- [ ] STUB marcado.

### BLOQUE 34.F — Content moderation

#### MÓDULO 34.F.1 — Constitutional AI + human review

**Pasos:**
- `[34.F.1.1]` Pipeline pre-publish:
  1. Auto classifier (Claude Haiku) con prompt de policy (no deceptive claims, no protected class discrimination per Fair Housing LATAM, no scam, no impersonation).
  2. Si score risk > 0.3, flag for human review queue `/admin/creators/moderation`.
  3. Human reviewer approve/reject con reason.
- `[34.F.1.2]` Reports de usuarios via botón "Report" → entran a misma queue.
- `[34.F.1.3]` Strike system: 3 strikes → temp suspend 7 días; 5 strikes → permanent ban.
- `[34.F.1.4]` Appeal process via email a `appeals@desarrollosmx.com` + 14 días SLA.

**Criterio de done del módulo:**
- [ ] Classifier integrado pre-publish.
- [ ] Queue admin funcional.

### BLOQUE 34.G — Creator analytics dashboard (GC-96)

#### MÓDULO 34.G.1 — Impact metrics

**Pasos:**
- `[34.G.1.1]` Dashboard `/creator/analytics` con:
  - Overview: followers, growth %, views total, engagement rate, earnings
  - Per-video: views, avg watch time, likes, shares, tips, zone breakdown audience
  - Per-issue: opens, clicks, subscribes from issue, unsubscribes
  - Audience: demographics aggregated (country, zone interest), active times
- `[34.G.1.2]` Export CSV + PDF de reports mensuales.
- `[34.G.1.3]` Benchmarks: comparativa vs top_creator tier average (anonymized).

**Criterio de done del módulo:**
- [ ] Dashboard en vivo con métricas reales.

### BLOQUE 34.H — Community Discord (GC-12)

#### MÓDULO 34.H.1 — Extender FASE 30 Discord

**Pasos:**
- `[34.H.1.1]` Canales nuevos en Discord server:
  - `#creator-help` — help técnico plataforma
  - `#creator-showcase` — creators comparten nuevos videos/issues
  - `#creator-collabs` — matching para collabs
  - `#zone-channels` (dinámicos — top 20 zonas con canal dedicado)
- `[34.H.1.2]` Bot DMX extendido — `/creator-stats @handle` responde con top-line metrics public.
- `[34.H.1.3]` Monthly office hours "Creator School" — webinar Zoom recorded.

**Criterio de done del módulo:**
- [ ] Canales live.
- [ ] Bot responde creator-stats.

## Criterio de done de la FASE

- [ ] Tabla `creators` + `creator_follows` + public page `/@{handle}`.
- [ ] Verification pipeline unverified/verified/top_creator.
- [ ] Short-form video upload + Mux + feed algorithm.
- [ ] Newsletter platform con Resend + paywall.
- [ ] Tips, subs, affiliate funcionales vía Stripe Connect.
- [ ] Roblox experiences STUB H3.
- [ ] Content moderation Constitutional AI + human review.
- [ ] Creator analytics dashboard.
- [ ] Discord canales creator extendidos + bot.
- [ ] RLS: creators own data, public read profiles, tips visible to creator only.
- [ ] Tag git: `fase-34-complete`.

## E2E VERIFICATION CHECKLIST

### Conectividad
- [ ] Todos los botones UI mapeados en [03.13_E2E_CONNECTIONS_MAP](../03_CATALOGOS/03.13_E2E_CONNECTIONS_MAP.md)
- [ ] Todos los tRPC procedures implementados (no stubs sin marcar)
- [ ] Todas las migrations aplicadas y `db:types` regenerado
- [ ] Todos los triggers/cascades testeados (on_operation_closed → affiliate credit)
- [ ] Permission enforcement validado (creator / follower / admin / moderator)

### States
- [ ] Loading states: video upload progress, feed skeleton, newsletter publish
- [ ] Error states: upload fail, moderation rejected, payment failed
- [ ] Empty states: no videos yet, no subscribers yet
- [ ] Success states: video live, issue sent, payout scheduled

### Quality
- [ ] Mobile responsive (vertical feed optimized mobile)
- [ ] Accessibility WCAG 2.1 AA (captions auto via Mux, ARIA, keyboard)
- [ ] `prefers-reduced-motion` respeta
- [ ] i18n — zero strings hardcoded
- [ ] Core Web Vitals green

### Automation
- [ ] `npm run audit:dead-ui` pasa
- [ ] Playwright smoke tests (upload → publish → view → tip)
- [ ] PostHog events tracked (creator_onboarded, video_uploaded, tip_sent, sub_created, affiliate_clicked)
- [ ] Sentry captures errors
- [ ] Moderation pipeline accuracy ≥95% validated periodically

### Stubs (si aplica)
- [ ] Roblox H3 STUB marcado `// STUB — activar FASE 38+`
- [ ] STUB visible al user con badge `[H3 próximamente]`
- [ ] STUBs documentados en §5.B

### Sign-off
- [ ] Reviewer manual: @____ firmó este checklist
- [ ] PR link: #___
- [ ] Tag fase-34-complete aplicado post-merge

## tRPC procedures nuevos (features/creators/routes/)

- `creators.profile.create`, `creators.profile.update`, `creators.profile.get(handle)`
- `creators.follow.toggle`, `creators.follow.listFollowing`, `creators.follow.listFollowers`
- `creators.videos.upload.initUpload` (returns Mux signed upload URL), `creators.videos.finalizePublish(video_id)`, `creators.videos.list`, `creators.videos.record(interaction)`
- `creators.feed.getPersonalized(user_id)` — aplica algoritmo BLOQUE 34.B
- `creators.newsletter.create`, `creators.newsletter.issue.save`, `creators.newsletter.issue.publish`, `creators.newsletter.subscribe`
- `creators.tips.send(creator_id, amount, context)` — crea Stripe PaymentIntent con application_fee
- `creators.subscriptions.start` (Stripe Subscription), `creators.subscriptions.cancel`
- `creators.affiliate.generateLink(creator_id, property_id)`, `creators.affiliate.trackClick`
- `creators.analytics.getOverview(creator_id, period)`, `creators.analytics.getVideoMetrics(video_id)`
- `creators.moderation.listQueue(admin)`, `creators.moderation.decide(item_id, approve|reject, reason)`

## Crons nuevos

- `creators_affiliate_attribution_sweep` — diario 03:00 UTC. Recorre `operaciones` cerradas últimos 30d, busca attributions pendientes, calcula credit, inserta en ledger DMX Pay (integra con FASE 37).
- `creators_tier_recompute` — semanal Lunes 02:00 UTC. Top 5% engagement → marca `top_creator`; drop si cae >6 semanas consecutive.
- `creators_newsletter_dispatch` — trigger-based cuando issue published_at hit; batches 500 subscribers × delivery window 2h.
- `creators_moderation_auto_approve_lowrisk` — trigger on upload; si classifier score < 0.1, auto-approve sin human queue.

## Archivos feature-sliced

```
features/creators/
├── components/
│   ├── creator-profile-card.tsx
│   ├── creator-public-page.tsx
│   ├── video-uploader.tsx
│   ├── feed-vertical.tsx              (mobile swipeable)
│   ├── feed-grid.tsx                  (desktop)
│   ├── newsletter-editor.tsx          (Tiptap)
│   ├── newsletter-issue-reader.tsx
│   ├── tip-button.tsx
│   ├── subscribe-dialog.tsx
│   ├── affiliate-link-generator.tsx
│   ├── moderation-queue.tsx           (admin)
│   └── creator-analytics-dashboard.tsx
├── hooks/
│   ├── use-feed-algorithm.ts
│   ├── use-creator-earnings.ts
│   └── use-mux-upload.ts
├── lib/
│   ├── feed-algorithm.ts              (scoring function)
│   ├── moderation-classifier.ts       (Claude Haiku call)
│   ├── attribution-tracker.ts
│   └── stripe-connect-payouts.ts
├── routes/
│   └── creators-router.ts
├── schemas/
│   └── creators.schema.ts
└── tests/
    ├── feed-algorithm.test.ts
    ├── moderation.test.ts
    └── creators-e2e.spec.ts
```

## Features implementadas en esta fase (≈ 18)

1. **F-34-01** Tabla `creators` + `creator_follows`
2. **F-34-02** Public page `/@{handle}` con profile completo
3. **F-34-03** Verification unverified/verified/top_creator tiers
4. **F-34-04** Onboarding creator 3 pasos
5. **F-34-05** Video upload Mux Direct Uploads
6. **F-34-06** Feed algorithm con 5 signals + zone match
7. **F-34-07** UI `/discover` vertical swipeable mobile + grid desktop
8. **F-34-08** Newsletter platform self-host Resend + React Email
9. **F-34-09** Tiptap editor + schedule send + paywall
10. **F-34-10** Tips Stripe Payment Intents + Connect 15% fee
11. **F-34-11** Subscriptions Stripe Products revenue share 85/15
12. **F-34-12** Affiliate links + attribution 30d + 1% share max $2K
13. **F-34-13** Roblox experiences STUB H3 (GC-108)
14. **F-34-14** Content moderation Claude Haiku classifier + human queue
15. **F-34-15** Strike system + appeal process
16. **F-34-16** Creator analytics dashboard completo + export
17. **F-34-17** Discord canales creator + bot extendido
18. **F-34-18** Monthly Creator School webinar

## Próxima fase

[FASE 35 — DMX Terminal](./FASE_35_DMX_TERMINAL.md)

---
**Autor:** Claude Opus 4.7 (biblia v2 moonshot) | **Fecha:** 2026-04-18
