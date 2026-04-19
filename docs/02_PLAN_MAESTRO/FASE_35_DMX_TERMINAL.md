# FASE 35 — DMX Terminal (Bloomberg-like)

> **Duración estimada:** 5 sesiones Claude Code (~20 horas)
> **Dependencias:** [FASE 30 — Platform API](./FASE_30_PLATFORM_API.md), [FASE 33 — Data Ecosystem](./FASE_33_DATA_ECOSYSTEM.md)
> **Bloqueantes externos:**
> - Electron forge toolchain con code-signing certs (Apple Developer cert + Windows EV cert)
> - TradingView Charting Library comercial license ($20K+/año) o build custom con uPlot (decidir 35.E)
> - PostgreSQL read replicas para latency <250ms p95 queries enterprise
> - Native notification providers (APNS + FCM) para alerts cross-device
> - Enterprise CS team contratado (3 dedicated reps inicial) — bloqueante operacional no técnico
> - Supabase Realtime compute premium para real-time feeds multi-partitioned
> **Horizonte:** H2
> **Resultado esperado:** DMX Terminal — producto B2B enterprise premium ($50-500K/mes) pattern Bloomberg Terminal. Desktop app (Electron) + web-only fallback keyboard-first, multi-monitor layout (analista abre 10+ panes), command language propio con shortcuts learnable, real-time data feeds (zone prices + transactions + macro), charting library (TradingView o uPlot), alert engine cross-market conditions (triggers email+SMS+push), backtest engine sobre historical zone scores, export PDF/Excel/Parquet, onboarding white-glove con dedicated CS rep por cuenta. Tag `fase-35-complete`.
> **Priority:** [H2]

## Contexto y objetivo

FASE 33 expuso datos a partners via API + bulk. FASE 35 construye la **interfaz premium** para analistas que consumen esos datos todo el día — pattern directo de Bloomberg Terminal (1981), FactSet, Capital IQ, CoStar. Precio alto, audiencia pequeña pero crítica (hedge funds inmobiliarios, REITs, family offices, brokers enterprise top-5), ARR per account $600K-6M.

Rationale: ver [GC-21 Bloomberg Terminal](../07_GAME_CHANGERS/07.3_PROPTECH_CLUSTER.md#gc-21), [ADR-011](../01_DECISIONES_ARQUITECTONICAS/ADR-011_MOONSHOT_3_HORIZONTES.md), [ADR-013](../01_DECISIONES_ARQUITECTONICAS/ADR-013_API_AS_PRODUCT.md), [ADR-017](../01_DECISIONES_ARQUITECTONICAS/ADR-017_DATA_ECOSYSTEM_REVENUE.md). Diferenciadores vs. competidores (Reonomy, Cherre, Real Capital Analytics):
1. **Keyboard-first** — power users odian click-first, ganan productividad con commands propios (e.g. `ZONE POLANCO GO` → zone dashboard).
2. **Multi-monitor layout** — analista abre 10+ panes simultaneous; state guardado per-user per-workspace.
3. **Real-time feeds** — deltas push via WebSocket, no polling. Precios, transacciones, macro.
4. **Cross-market alerts** — "alert me si zone X price_per_m2 cae >5% W-o-W AND interest_rate Banxico sube 50bps".
5. **Backtest native** — analista puede correr strategies hipotéticas sobre historical (e.g., "compré toda Roma en 2020, ROI al 2026").

Terminal no está en sitemap público — solo invitación. Sales-led acquisition.

## Bloques

### BLOQUE 35.A — Terminal desktop app (Electron)

#### MÓDULO 35.A.1 — Electron shell + auth + updater

**Pasos:**
- `[35.A.1.1]` Proyecto `apps/terminal/` con Electron Forge template TS + Vite. Target: macOS (universal), Windows x64, Linux deb/rpm.
- `[35.A.1.2]` Auth flow: terminal abre browser SSO (Supabase Auth magic link o corporate SAML via WorkOS) → redirige a `dmx-terminal://auth/callback` → token guardado OS keychain (`keytar`).
- `[35.A.1.3]` Auto-updater vía `electron-updater` con feed `updates.desarrollosmx.com/terminal/{platform}/{arch}/releases.yml`.
- `[35.A.1.4]` Notification tray: badge count de alerts; click → focus app en pane correspondiente.
- `[35.A.1.5]` Fallback web `terminal.desarrollosmx.com` — misma UI pero sin multi-monitor control nativo; degradación graceful.

**Criterio de done del módulo:**
- [ ] Builds signed producidos para 3 platforms.
- [ ] SSO funciona.
- [ ] Updater recibe update en staging.

### BLOQUE 35.B — Multi-monitor layout

#### MÓDULO 35.B.1 — Tiling + workspaces

**Pasos:**
- `[35.B.1.1]` Layout system custom basado en `react-mosaic-component` o `react-grid-layout` — panes son "views" drag-drop, resize, split horizontal/vertical.
- `[35.B.1.2]` Views disponibles (plugin architecture):
  - **Zone Detail** — scores N0-N5, trends, transactions recent
  - **Chart** — price/m² vs tiempo
  - **Watchlist** — user-curated zones con updates live
  - **Market Screener** — filtros tabla estilo Excel
  - **News Feed** — DMX Insights + partner contributions
  - **Macro Monitor** — Banxico/INEGI/IPV
  - **Opportunities** — deals on-market matching watchlist criteria
  - **Chat** — team chat (Slack embed vía API) + AI copilot
  - **Terminal (CLI)** — command input
  - **Backtest Runner**
  - **Alert Center**
- `[35.B.1.3]` Multi-monitor: Electron `screen.getAllDisplays()` permite spawn windows separate per monitor. Workspace saved JSON `{ monitors: [{id, layout, views}] }` en tabla `terminal_workspaces`:
  ```sql
  CREATE TABLE public.terminal_workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    layout_json JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- `[35.B.1.4]` Workspaces shareable dentro de la misma cuenta enterprise — admin publica "Team Workspace" todos heredan.

**Criterio de done del módulo:**
- [ ] 3 monitores con 10 panes.
- [ ] Workspaces save/load funciona.

### BLOQUE 35.C — Command language (keyboard shortcuts)

#### MÓDULO 35.C.1 — CLI custom

**Pasos:**
- `[35.C.1.1]` Bloomberg-style input bar siempre visible top. Syntax: `<SUBJECT> <FUNCTION> <ARGS> <GO>`:
  - `ZONE POLANCO GO` → abre Zone Detail
  - `MACRO BANXICO TIIE28 GO` → Macro Monitor filter
  - `ALERT SET zone.polanco.price_m2 lt -5% period 7d` → crea alerta
  - `BT RUN zones=POLANCO,ROMA since=2022-01-01 strategy=buy_and_hold` → backtest
  - `/help` o `?` → dropdown contextual
- `[35.C.1.2]` Autocomplete: fuzzy search sobre catálogo commands + recent history + favorites.
- `[35.C.1.3]` Keyboard shortcuts globales:
  - `Cmd+K` abre command bar focused
  - `Cmd+1-9` jump a pane N
  - `Cmd+Shift+N` new pane
  - `Cmd+Shift+L` lock layout
  - `Cmd+B` sidebar toggle
- `[35.C.1.4]` Command parser con Zod schema per command type — validation + type safety end-to-end.

**Criterio de done del módulo:**
- [ ] 20 commands implementados.
- [ ] Autocomplete responde <50ms.

### BLOQUE 35.D — Real-time data feeds

#### MÓDULO 35.D.1 — WebSocket architecture

**Pasos:**
- `[35.D.1.1]` Supabase Realtime para subscripciones a canales:
  - `zone:{zone_id}:prices` — price_per_m2 updates
  - `macro:{country}:series:{series_id}` — Banxico/INEGI
  - `transactions:{country}:recent` — nuevas operaciones cerradas (aggregated)
- `[35.D.1.2]` Client hook `useTerminalSubscription(channel)` gestiona reconnect, backpressure, rate limiting client-side (descarta frames antiguos si lag >5s).
- `[35.D.1.3]` Server-side: triggers BD emit events a Realtime cuando nuevas rows llegan en `zone_price_index`, `macro_series`, `operaciones`.
- `[35.D.1.4]` Fallback polling: si WebSocket disconnects >30s, fallback a poll `GET /v1/delta?since=<timestamp>` cada 5s hasta reconnect.

**Criterio de done del módulo:**
- [ ] Subscripción a 10 canales simultaneous.
- [ ] Latencia feed <300ms p95 end-to-end.

### BLOQUE 35.E — Charting library

#### MÓDULO 35.E.1 — TradingView vs uPlot decision

**Pasos:**
- `[35.E.1.1]` Decisión: **TradingView Charting Library** (commercial) para H2 — pattern recognition existing, candlestick pro, technical indicators. Costo $20K+/año, justificado por ticket $50-500K/mes.
- `[35.E.1.2]` Integration: carga vía CDN firmado + data adapter custom que consume DMX API. Charts types:
  - Line: zone_price_index over time
  - Area: volume transactions
  - Candlestick: monthly high/low/avg per zone
  - Heatmap: correlations cross-zones
- `[35.E.1.3]` Fallback uPlot para views que no requieren features pro (sparklines en watchlist, sparklines alerts).
- `[35.E.1.4]` Export charts PNG/SVG/PDF con watermark "DMX Terminal" + data provenance timestamp.

**Criterio de done del módulo:**
- [ ] Candlestick funcional.
- [ ] Export PNG OK.

### BLOQUE 35.F — Alert engine

#### MÓDULO 35.F.1 — Cross-market conditions

**Pasos:**
- `[35.F.1.1]` Alert definition DSL:
  ```
  WHEN zone.polanco.price_per_m2 ROC(7d) < -5%
    AND macro.MX.TIIE28.value > 11.5
  THEN NOTIFY email,sms,push
  COOLDOWN 24h
  ```
- `[35.F.1.2]` Parser DSL → AST → evaluator corre cada tick de data. Storage:
  ```sql
  CREATE TABLE public.terminal_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    dsl_source TEXT NOT NULL,
    ast_json JSONB NOT NULL,
    notify_channels TEXT[] NOT NULL,
    cooldown_seconds INT DEFAULT 3600,
    enabled BOOLEAN DEFAULT true,
    last_fired_at TIMESTAMPTZ,
    fired_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE TABLE public.terminal_alert_firings (
    id BIGSERIAL PRIMARY KEY,
    alert_id UUID NOT NULL REFERENCES public.terminal_alerts(id) ON DELETE CASCADE,
    context JSONB NOT NULL,
    fired_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- `[35.F.1.3]` Evaluator runs continuously via Postgres LISTEN/NOTIFY + TypeScript worker. Horizontal scaling via partitioning by `owner_id`.
- `[35.F.1.4]` Notification delivery: Resend email, Twilio SMS, APNS/FCM push. Rate limited per user.

**Criterio de done del módulo:**
- [ ] 5 DSL examples evaluate correctly.
- [ ] Notification delivery <5s p95.

### BLOQUE 35.G — Backtest engine

#### MÓDULO 35.G.1 — Historical simulation

**Pasos:**
- `[35.G.1.1]` Backtest API:
  ```ts
  input BacktestInput {
    zones: string[]
    since: date
    until: date
    strategy: 'buy_and_hold' | 'rebalance_monthly' | 'momentum' | 'custom_dsl'
    initial_capital_usd: number
    assumptions: { tax_pct: number, transaction_cost_pct: number, rental_yield_pct: number }
  }
  output BacktestResult {
    total_return_pct: number
    cagr_pct: number
    max_drawdown_pct: number
    sharpe: number
    timeseries: { period, equity, drawdown }[]
    trades: Trade[]
  }
  ```
- `[35.G.1.2]` Engine in TypeScript worker (Vercel Queues o Trigger.dev) — reads `zone_price_index` historic, simula compras/ventas, aplica costs, computa métricas.
- `[35.G.1.3]` Results cached por (hash de input) durante 24h para evitar recomputo.
- `[35.G.1.4]` UI Backtest Runner pane: form + progress + charts + trades table. Compare hasta 5 strategies side-by-side.

**Criterio de done del módulo:**
- [ ] Backtest simple corre en <10s.
- [ ] Compare 5 strategies.

### BLOQUE 35.H — Export reports

#### MÓDULO 35.H.1 — PDF + Excel + Parquet

**Pasos:**
- `[35.H.1.1]` PDF: Remotion (ya en FASE 32.H) renderiza reports con template branding DMX + firmas data provenance.
- `[35.H.1.2]` Excel: `exceljs` builds multi-sheet workbook (Summary, Raw Data, Charts embed).
- `[35.H.1.3]` Parquet: DuckDB embeds in worker, exporta subset via `COPY TO`.
- `[35.H.1.4]` All exports tracked in `partner_access_log` (FASE 33) con `endpoint='terminal.export'`.

**Criterio de done del módulo:**
- [ ] 3 formatos funcionales.

### BLOQUE 35.I — Onboarding white-glove

#### MÓDULO 35.I.1 — Dedicated CS per account

**Pasos:**
- `[35.I.1.1]` Cada cuenta enterprise tiene Customer Success Manager asignado en tabla `partner_csm`:
  ```sql
  CREATE TABLE public.partner_csm (
    partner_id UUID PRIMARY KEY REFERENCES public.partners(id),
    csm_user_id UUID NOT NULL REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- `[35.I.1.2]` Onboarding flow 6 semanas:
  - Semana 1: Kickoff call + workspace setup + initial watchlists
  - Semana 2: Training 1-on-1 commands + shortcuts
  - Semana 3: Custom reports templated per use case
  - Semana 4: Alerts tuning
  - Semana 5: Backtest workshop
  - Semana 6: QBR (quarterly business review) schedule
- `[35.I.1.3]` CS dashboard `/admin/csm` — assigned accounts, health scores (usage + NPS + renewal date).
- `[35.I.1.4]` Playbook interno documentado en Notion/Coda referenced here; tech just stores assignment.

**Criterio de done del módulo:**
- [ ] Assignment funcional.
- [ ] CS dashboard muestra accounts.

## Criterio de done de la FASE

- [ ] Electron app builds signed 3 platforms + auto-update.
- [ ] Web fallback `terminal.desarrollosmx.com`.
- [ ] Multi-monitor layout con 11 view types + workspaces save/load.
- [ ] Command language con 20 commands + keyboard shortcuts.
- [ ] Real-time feeds WebSocket + fallback polling.
- [ ] Charting TradingView integrado.
- [ ] Alert engine DSL + evaluator + notification delivery.
- [ ] Backtest engine + 4 strategies predefined + custom DSL.
- [ ] Export PDF/Excel/Parquet.
- [ ] Onboarding white-glove flow + CSM assignment.
- [ ] RLS sobre terminal_* + partner_csm.
- [ ] Tag git: `fase-35-complete`.

## E2E VERIFICATION CHECKLIST

### Conectividad
- [ ] Todos los botones UI mapeados en [03.13_E2E_CONNECTIONS_MAP](../03_CATALOGOS/03.13_E2E_CONNECTIONS_MAP.md)
- [ ] Todos los tRPC procedures implementados (no stubs sin marcar)
- [ ] Todas las migrations aplicadas y `db:types` regenerado
- [ ] Todos los triggers/cascades testeados
- [ ] Permission enforcement validado (enterprise_user / partner_admin / csm / dmx_admin)

### States
- [ ] Loading states: feed connecting, backtest running, chart loading, export generating
- [ ] Error states: WebSocket disconnect, alert parser error, backtest fail
- [ ] Empty states: no workspaces yet, no alerts yet
- [ ] Success states: alert fired, export ready, backtest complete

### Quality
- [ ] Responsive: web fallback mobile-adaptive (not primary but usable)
- [ ] Accessibility WCAG 2.1 AA — full keyboard nav (mandatory for terminal), ARIA, contrast
- [ ] `prefers-reduced-motion` respeta
- [ ] i18n — zero strings hardcoded (en/es primary)
- [ ] Performance: 60fps sustained during data streaming

### Automation
- [ ] `npm run audit:dead-ui` pasa (0 violations)
- [ ] Playwright E2E (web fallback): login → layout → command → alert
- [ ] Electron tests via Spectron/Playwright Electron adapter
- [ ] PostHog events tracked (terminal_launched, command_executed, alert_fired, backtest_run, export_created)
- [ ] Sentry captures errors incl Electron native crashes

### Stubs (si aplica)
- [ ] Terminal Web3 module STUB marcado `// STUB — activar FASE 36+`
- [ ] STUBs documentados en §5.B

### Sign-off
- [ ] Reviewer manual: @____ firmó este checklist
- [ ] Enterprise pilot customer: @____ firmó validación UX
- [ ] PR link: #___
- [ ] Tag fase-35-complete aplicado post-merge

## tRPC procedures nuevos (features/terminal/routes/)

- `terminal.workspaces.list`, `terminal.workspaces.save`, `terminal.workspaces.load(id)`, `terminal.workspaces.shareWithTeam`
- `terminal.views.getZoneDetail`, `terminal.views.getMarketScreener(filters)`, `terminal.views.getWatchlist`
- `terminal.commands.execute(cmd_string)` — parser + dispatcher
- `terminal.alerts.create(dsl)`, `terminal.alerts.update(id, dsl)`, `terminal.alerts.list`, `terminal.alerts.testFire(id)` (dry-run)
- `terminal.backtest.run(input)` — devuelve job_id; `terminal.backtest.status(job_id)`, `terminal.backtest.listResults`
- `terminal.charts.getSeries(series_spec)` — adapter para TradingView datafeed
- `terminal.export.pdf|excel|parquet(view_id, filters)`
- `terminal.realtime.getAuthToken` — firma JWT Supabase Realtime con allowed channels
- `terminal.csm.getHealthScore(partner_id)` — admin only

## Crons nuevos

- `terminal_alert_evaluator` — continuous (LISTEN/NOTIFY Postgres). Worker TS suscrito a channels `zone_price_updated`, `macro_series_updated`, `transactions_inserted`; evalúa todas las alerts activas con dependency en ese signal. Throttle evaluation to ≤100/sec por worker.
- `terminal_backtest_cache_cleanup` — diario 04:00 UTC. Purge cache >24h.
- `terminal_workspace_metrics_aggregate` — nightly. Calcula health scores CS (usage + NPS signals proxy + renewal date proximity) → `partner_csm_health` view.

## Electron app specifics

- Main process: `apps/terminal/main.ts` — window management, tray icon, auto-updater, keychain integration (`keytar`).
- Renderer: `apps/terminal/renderer/` — React app compartido 95% código con `terminal.desarrollosmx.com` fallback web.
- IPC: `apps/terminal/ipc/` — channels para notification deliver, workspace save, native drag-drop.
- Build: `electron-builder` config outputs `.dmg`, `.msi`, `.deb`, `.rpm` + signed con code-signing certs stored en GitHub Actions secrets.

## Archivos feature-sliced (web + Electron shared)

```
features/terminal/
├── components/
│   ├── layout/                       (react-mosaic panels)
│   ├── command-bar.tsx
│   ├── views/
│   │   ├── zone-detail-view.tsx
│   │   ├── chart-view.tsx
│   │   ├── watchlist-view.tsx
│   │   ├── screener-view.tsx
│   │   ├── news-feed-view.tsx
│   │   ├── macro-monitor-view.tsx
│   │   ├── opportunities-view.tsx
│   │   ├── chat-view.tsx
│   │   ├── terminal-cli-view.tsx
│   │   ├── backtest-runner-view.tsx
│   │   └── alert-center-view.tsx
│   └── alert-composer.tsx
├── hooks/
│   ├── use-workspace.ts
│   ├── use-realtime-subscription.ts
│   └── use-keyboard-shortcuts.ts
├── lib/
│   ├── command-parser.ts             (Zod-validated DSL)
│   ├── alert-dsl-parser.ts           (DSL → AST)
│   ├── alert-evaluator.ts            (AST runtime)
│   ├── backtest-engine.ts
│   ├── tradingview-datafeed.ts
│   └── export-workers/               (pdf, excel, parquet)
├── routes/
│   └── terminal-router.ts
├── schemas/
│   └── terminal.schema.ts
└── tests/
    ├── command-parser.test.ts
    ├── alert-evaluator.test.ts
    ├── backtest-engine.test.ts
    └── terminal-e2e.spec.ts
```

## Features implementadas en esta fase (≈ 22)

1. **F-35-01** Electron app macOS/Windows/Linux signed
2. **F-35-02** Auto-updater via `electron-updater`
3. **F-35-03** SSO auth Supabase + WorkOS SAML
4. **F-35-04** Web fallback `terminal.desarrollosmx.com`
5. **F-35-05** Tiling layout 11 view types
6. **F-35-06** Multi-monitor spawn windows
7. **F-35-07** Workspaces save/load + team sharing
8. **F-35-08** Command bar Bloomberg-style CLI
9. **F-35-09** 20 commands + autocomplete fuzzy
10. **F-35-10** 10 keyboard shortcuts globales
11. **F-35-11** WebSocket feeds Supabase Realtime 3 canales base
12. **F-35-12** Fallback polling automático
13. **F-35-13** TradingView Charting integrated
14. **F-35-14** uPlot sparklines lightweight
15. **F-35-15** Alert DSL parser + evaluator
16. **F-35-16** Alert firing notifications email/SMS/push
17. **F-35-17** Backtest engine 4 strategies + DSL custom
18. **F-35-18** Export PDF (Remotion) + Excel (exceljs) + Parquet (DuckDB)
19. **F-35-19** Onboarding white-glove 6 semanas playbook
20. **F-35-20** Partner_csm assignment + health scores
21. **F-35-21** CS dashboard `/admin/csm`
22. **F-35-22** QBR scheduling integration

## Próxima fase

[FASE 36 — Fractional Investing](./FASE_36_FRACTIONAL_INVESTING.md)

---
**Autor:** Claude Opus 4.7 (biblia v2 moonshot) | **Fecha:** 2026-04-18
