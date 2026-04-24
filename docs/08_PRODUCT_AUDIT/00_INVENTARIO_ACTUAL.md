# 00 — Inventario Actual DMX (FASE 07.6.A)

> Fuente de verdad evidence-based del estado shipped en DMX hasta commit `bf2d9ef` (post-fix dmx canonical).
> Generado: 2026-04-24 · sesión 07.6.A · Input canónico para 07.6.B crosswalk matrix 160+ features prototype.
> Método: 5 sub-agents paralelos + consolidación master CC. MCP Supabase qxfuqwlktmhokwwlvggy + grep/find/Read locales.
> Scope: docs-only, zero código feature, zero migration. Solo FACTS. Zero analysis (viene en 07.6.B-F).

---

## Resumen ejecutivo

| Dimensión | Count | Observación |
|---|---|---|
| Tablas BD públicas (base + parent partitioned, excl. children/views) | 134 | |
| Parent tables | 121 | relkind=r, no partition |
| Partition children | 138 | RLS heredado de parent |
| Partitioned parents | 13 | api_rate_limits, audit_log, geo_snapshots, macro_series, market_prices_secondary, market_pulse, rate_limit_log, score_history, search_trends, str_market_monthly_aggregates, str_monthly_snapshots, str_reviews, zone_price_index |
| Views | 10 | |
| Rows populated totales (approx) | ~184,386 | |
| Tablas con RLS ON | 118 | 0 FORCED |
| Tablas con FK a `zones` | 0 | 85 cols `zone_id` sin enforcement FK (gap crítico referencial) |
| Policies RLS totales | 247 | |
| CHECK constraints | 326 | |
| UNIQUE indexes | 414 | |
| FK constraints distintos | 299 | |
| Storage buckets | 7 | 5 privados + 2 públicos |
| tRPC procedures totales | 84 | 59 queries + 25 mutations |
| Features con `routes/` tRPC | 13 | + 4 routers en `server/trpc/routers/` |
| Features sin `routes/` (UI-only / no-tRPC) | 13 | |
| Features con `components/` UI | 21 | 88 components |
| Features backend-only (sin UI) | 5 | causal-engine, fx, ia-generativa, scian, scorecard-nacional |
| Shared UI primitives (shared/ui/) | 49 | + 3 tests |
| App routes (`page.tsx`) | 60 | + 4 layouts |
| Client components | 110/140 | (78.6%) |
| Components con i18n | 62/140 | 53 feature + 9 shared |
| pg_cron jobs | 3 | 3 active |
| Cron runs last 30d | 12 | 5 succeeded / 7 failed |
| Edge functions | 1 | on-auth-event |
| RPC functions user (public) | 70 | 58 SECURITY DEFINER |
| Triggers rows | 60 | sobre 22 tablas distintas |
| Extensions instaladas | 15 | |
| Migrations aplicadas remote | 124 | local files = 132 (delta 8) |
| ADRs files | 30 | gaps 024 (skipped), 031 (agendado). 32 lógicos |
| Planes maestros fases | 42 | 1 índice + 41 archivos fase |
| Catálogos BD/tRPC/RLS | 16 | |
| L-NEW backlog | 49 | 3 shipped + 46 active |
| Memorias canonizadas | 22 | |
| Git tags totales | 26 | 10 con taggerdate + 16 lightweight |
| Commits all-time | 61 | |
| Tests passing baseline | 3064 | + 2 skipped |

---

## Sección 1 — BD Schema (SA1)

Evidencia: `mcp__supabase__execute_sql` contra proyecto `qxfuqwlktmhokwwlvggy`.

### 1.1 Agrupación por dominio

#### Foundation

| Tabla | Rows | RLS | Policies | CHECKs | Indexes |
|---|---|---|---|---|---|
| `addresses` | 0 | ON | 4 | 2 | 4 |
| `agencies` | 0 | ON | 3 | 0 | 5 |
| `audit_log` | 0 | partitioned | 3 | 0 | 5 |
| `broker_companies` | 0 | ON | 3 | 0 | 5 |
| `countries` | 6 | ON | 1 | 0 | 1 |
| `currencies` | 7 | ON | 1 | 0 | 1 |
| `desarrolladoras` | 0 | ON | 3 | 0 | 6 |
| `fiscal_docs` | 0 | ON | 1 | 3 | 4 |
| `fx_rates` | 0 | ON | 1 | 1 | 2 |
| `locales` | 6 | ON | 1 | 0 | 1 |
| `plans` | 0 | ON | 4 | 1 | 3 |
| `profile_feature_overrides` | 0 | ON | 4 | 0 | 2 |
| `profiles` | 0 | ON | 3 | 0 | 9 |
| `role_features` | 432 | ON | 4 | 0 | 1 |
| `role_requests` | 0 | ON | 3 | 2 | 3 |
| `subscriptions` | 0 | ON | 1 | 3 | 4 |
| `tax_rules` | 0 | ON | 2 | 3 | 3 |
| `tenant_scopes` | 0 | ON | 2 | 0 | 1 |
| `tier_requirements` | 4 | ON | 2 | 1 | 1 |
| `ui_feature_flags` | 120 | ON | 4 | 0 | 1 |

#### Ingesta

| Tabla | Rows | RLS | Policies | CHECKs | Indexes |
|---|---|---|---|---|---|
| `ingest_allowed_sources` | 56 | ON | 1 | 1 | 1 |
| `ingest_dlq` | 0 | ON | 2 | 0 | 3 |
| `ingest_runs` | 28 | ON | 1 | 2 | 4 |
| `ingest_watermarks` | 31 | ON | 1 | 1 | 1 |

#### Zones canonical

| Tabla | Rows | RLS | Policies | CHECKs | Indexes |
|---|---|---|---|---|---|
| `zone_alert_subscriptions` | 0 | ON | 5 | 2 | 3 |
| `zone_alpha_alerts` | 0 | ON | 2 | 2 | 3 |
| `zone_certifications` | 0 | ON | 2 | 0 | 4 |
| `zone_price_index` | 0 | partitioned | 1 | 2 | 4 |
| `zone_slugs` | 0 | ON | 2 | 3 | 6 |
| `zone_streaks` | 0 | ON | 2 | 4 | 4 |
| `zone_tiers` | 0 | ON | 1 | 1 | 2 |
| `zones` | 229 | ON | 2 | 8 | 7 |

#### IE core

| Tabla | Rows | RLS | Policies | CHECKs | Indexes |
|---|---|---|---|---|---|
| `cascade_replay_log` | 0 | ON | 2 | 1 | 2 |
| `causal_explanations` | 0 | ON | 2 | 1 | 3 |
| `confidence_thresholds` | 10 | ON | 1 | 0 | 1 |
| `data_lineage` | 0 | ON | 1 | 1 | 4 |
| `dmx_indices` | 3192 | ON | 2 | 8 | 6 |
| `dmx_indices_audit_log` | 0 | ON | 2 | 0 | 3 |
| `dmx_indices_methodology_versions` | 0 | ON | 2 | 0 | 3 |
| `historical_forensics_reports` | 0 | ON | 2 | 1 | 2 |
| `ie_score_visibility_rules` | 7 | ON | 2 | 1 | 1 |
| `ml_training_snapshots` | 0 | ON | 2 | 2 | 3 |
| `project_scores` | 0 | ON | 2 | 5 | 8 |
| `score_change_deliveries` | 0 | ON | 1 | 2 | 2 |
| `score_change_webhooks` | 0 | ON | 1 | 4 | 3 |
| `score_comparison_matrix` | 0 | ON | 2 | 2 | 4 |
| `score_history` | 42 | partitioned | 2 | 1 | 3 |
| `score_recalculation_queue` | 3206 | ON | 1 | 3 | 4 |
| `score_weights` | 44 | ON | 2 | 1 | 3 |
| `scorecard_national_reports` | 0 | ON | 2 | 1 | 3 |
| `user_scores` | 0 | ON | 2 | 4 | 5 |
| `zone_pulse_scores` | 83,220 | ON | 2 | 3 | 3 |
| `zone_scores` | 5,267 | ON | 2 | 5 | 10 |

#### Properties + Market

| Tabla | Rows | RLS | Policies | CHECKs | Indexes |
|---|---|---|---|---|---|
| `avm_estimates` | 0 | ON | 2 | 0 | 6 |
| `geo_data_points` | 0 | ON | 1 | 0 | 9 |
| `geo_snapshots` | 0 | partitioned | 1 | 0 | 5 |
| `macro_series` | 880 | partitioned | 1 | 1 | 5 |
| `market_anomalies` | 0 | ON | 2 | 1 | 3 |
| `market_prices_secondary` | 0 | partitioned | 1 | 2 | 8 |
| `market_pulse` | 0 | partitioned | 1 | 0 | 4 |
| `property_comparables` | 0 | ON | 2 | 1 | 5 |
| `search_trends` | 0 | partitioned | 1 | 1 | 4 |
| `zona_snapshots` | 0 | ON | 1 | 0 | 4 |

#### Demographics

| Tabla | Rows | RLS | Policies | CHECKs | Indexes |
|---|---|---|---|---|---|
| `enigh_zone_income` | 210 | ON | 2 | 0 | 2 |
| `inegi_census_zone_stats` | 210 | ON | 2 | 0 | 2 |

#### Pulse + Forecasts

| Tabla | Rows | RLS | Policies | CHECKs | Indexes |
|---|---|---|---|---|---|
| `pulse_forecasts` | 6,840 | ON | 2 | 3 | 4 |

#### Colonia DNA + Wiki

| Tabla | Rows | RLS | Policies | CHECKs | Indexes |
|---|---|---|---|---|---|
| `colonia_dna_vectors` | 210 | ON | 2 | 0 | 3 |
| `colonia_vibe_tags` | 0 | ON | 2 | 1 | 3 |
| `colonia_wiki_entries` | 210 | ON | 2 | 0 | 4 |
| `dmx_wrapped_snapshots` | 0 | ON | 2 | 1 | 3 |
| `dna_migration_matches` | 0 | ON | 2 | 3 | 3 |

#### Climate

| Tabla | Rows | RLS | Policies | CHECKs | Indexes |
|---|---|---|---|---|---|
| `climate_annual_summaries` | 3,648 | ON | 2 | 2 | 3 |
| `climate_future_projections` | 0 | ON | 2 | 3 | 3 |
| `climate_monthly_aggregates` | 43,776 | ON | 2 | 2 | 3 |
| `climate_twin_matches` | 1,140 | ON | 2 | 2 | 2 |
| `climate_zone_signatures` | 228 | ON | 2 | 0 | 2 |

#### Constellations + Topology

| Tabla | Rows | RLS | Policies | CHECKs | Indexes |
|---|---|---|---|---|---|
| `zone_constellation_clusters` | 210 | ON | 2 | 0 | 4 |
| `zone_constellations_edges` | 21,945 | ON | 2 | 2 | 6 |
| `zone_migration_flows` | 0 | ON | 2 | 6 | 4 |
| `zone_topology_metrics` | 210 | ON | 2 | 3 | 4 |

#### Ghost zones

| Tabla | Rows | RLS | Policies | CHECKs | Indexes |
|---|---|---|---|---|---|
| `ghost_zones_ranking` | 210 | ON | 2 | 2 | 3 |

#### Auth + Security

| Tabla | Rows | RLS | Policies | CHECKs | Indexes |
|---|---|---|---|---|---|
| `ai_memory_store` | 0 | ON | 4 | 1 | 5 |
| `api_keys` | 0 | ON | 3 | 0 | 3 |
| `auth_backup_codes` | 0 | ON | 1 | 0 | 2 |
| `auth_sessions_log` | 0 | ON | 1 | 1 | 3 |
| `embeddings` | 0 | ON | 1 | 0 | 5 |

#### Rate limiting + Budgets

| Tabla | Rows | RLS | Policies | CHECKs | Indexes |
|---|---|---|---|---|---|
| `airroi_spend_ledger` | 0 | ON | 1 | 1 | 4 |
| `api_budgets` | 10 | ON | 1 | 3 | 1 |
| `api_rate_limits` | 0 | partitioned | 0 | 0 | 2 |
| `rate_limit_log` | 0 | partitioned | 0 | 0 | 2 |
| `rate_limit_policies` | 7 | ON | 2 | 3 | 1 |

#### Legal + Privacy

| Tabla | Rows | RLS | Policies | CHECKs | Indexes |
|---|---|---|---|---|---|
| `legal_documents_template` | 0 | ON | 2 | 0 | 3 |
| `privacy_exports` | 0 | ON | 2 | 0 | 2 |

#### STR (short-term rentals)

| Tabla | Rows | RLS | Policies | CHECKs | Indexes |
|---|---|---|---|---|---|
| `str_cost_assumptions` | 4 | ON | 2 | 6 | 1 |
| `str_events_calendar` | 7 | ON | 2 | 3 | 4 |
| `str_host_migrations` | 0 | ON | 2 | 4 | 5 |
| `str_hosts` | 0 | ON | 2 | 4 | 4 |
| `str_invisible_hotels` | 0 | ON | 2 | 5 | 6 |
| `str_listings` | 0 | ON | 2 | 2 | 8 |
| `str_market_monthly_aggregates` | 0 | partitioned | 2 | 0 | 5 |
| `str_markets` | 0 | ON | 2 | 0 | 4 |
| `str_monthly_snapshots` | 0 | partitioned | 2 | 1 | 6 |
| `str_photos_metadata` | 0 | ON | 2 | 2 | 4 |
| `str_pricing_overrides` | 0 | ON | 2 | 2 | 3 |
| `str_reports` | 0 | ON | 3 | 2 | 4 |
| `str_reviews` | 0 | partitioned | 2 | 4 | 6 |
| `str_reviews_labels` | 0 | ON | 2 | 1 | 3 |
| `str_zone_regulations` | 1 | ON | 2 | 1 | 4 |

#### Vibe Tags + Futures + Lifepath

| Tabla | Rows | RLS | Policies | CHECKs | Indexes |
|---|---|---|---|---|---|
| `futures_curve_projections` | 0 | ON | 2 | 2 | 3 |
| `lifepath_user_profiles` | 0 | ON | 5 | 0 | 1 |
| `vibe_tags` | 10 | ON | 2 | 0 | 1 |

#### Newsletter + Embeds + Influencer

| Tabla | Rows | RLS | Policies | CHECKs | Indexes |
|---|---|---|---|---|---|
| `influencer_heat_zones` | 0 | ON | 2 | 2 | 3 |
| `newsletter_ab_tests` | 0 | ON | 2 | 5 | 3 |
| `newsletter_deliveries` | 0 | ON | 2 | 2 | 4 |
| `newsletter_subscribers` | 0 | ON | 5 | 3 | 6 |
| `sticker_templates` | 0 | ON | 2 | 0 | 3 |
| `widget_embed_registry` | 0 | ON | 4 | 1 | 4 |

#### Templates + PostGIS + Otros

- 13 `template_public_*` (partition shells pg_partman, todas con 0 rows)
- `part_config` (13 rows) + `part_config_sub` (0 rows) — pg_partman config
- `spatial_ref_sys` (8,500 rows, RLS OFF — PostGIS standard)
- `view_dedup` (0 rows, RLS ON — base table nombrada como view)

### 1.2 Storage buckets

| Bucket | Public | Created |
|---|---|---|
| commission-invoices | false | 2026-04-18 |
| dossier-exports | false | 2026-04-18 |
| ingest-raw | false | 2026-04-19 |
| ingest-uploads | false | 2026-04-19 |
| operation-files | false | 2026-04-18 |
| profile-avatars | true | 2026-04-18 |
| project-photos | true | 2026-04-18 |

### 1.3 Anomalías BD Schema

1. **Zero FK a `zones`** — 85 columnas `zone_id` sin enforcement. Gap crítico referencial.
2. **0 tablas con RLS FORCED** — todas las 118 RLS-enabled son bypassables por table owner/superuser.
3. **`dmx_indices` no tiene `zone_id`** — usa `(scope_type, scope_id text)` canonical post bf2d9ef.
4. **`view_dedup` es base table** pese al nombre (flag anomaly).
5. **94 tablas vacías** (70% unpopulated — scaffolding H1 STR + foundation + partition templates).

---

## Sección 2 — tRPC Procedures (SA2)

Evidencia: grep + Read de `server/trpc/` + `features/*/routes/` + `server/trpc/routers/`.

### 2.1 Infraestructura tRPC

- **`server/trpc/init.ts`** — `initTRPC.context<Context>().create()` con error formatter Zod. Exports: `router`, `publicProcedure`, `middleware`, `mergeRouters`.
- **`server/trpc/context.ts`** — `createContext({req})` → resuelve `supabase` (SSR), `headers`, `user: User | null`, `profile: Profile | null`.
- **`server/trpc/middleware.ts`** — define `authenticatedProcedure` y `adminProcedure`.
- **`server/trpc/feature-procedure.ts`** — `featureProcedure` (gated vía `resolve_features` RPC + `FEATURE_MAP` actualmente vacío, pass-through).
- **`server/trpc/root.ts`** — `appRouter` + `health` publicProcedure root.
- **`server/trpc/routers/`** — 4 sub-routers cross-feature (causal, migration-flow, pulse, trend-genome).

### 2.2 Middleware disponibles

- `publicProcedure` — base sin auth; rate-limit IP-based en routers públicos costosos.
- `authenticatedProcedure` — requiere `ctx.user`; rate-limit DB-side `check_rate_limit_db` (120/60s).
- `adminProcedure` — chequea `profile.rol ∈ {superadmin, mb_admin}`.
- `featureProcedure` — definido, NO usado (FEATURE_MAP vacío).
- `proTierProcedure` (inline en `routers/trend-genome.ts`) — admin OR `subscriptions.status='active'`.

> Anomalía: `protectedProcedure` NO existe en este repo; el equivalente se llama `authenticatedProcedure`.

### 2.3 Inventario por feature (84 procedures, 59 queries + 25 mutations)

| Feature | File | Procedures | Queries | Mutations | Middleware |
|---|---|---|---|---|---|
| `atlas` | routes/atlas.ts | 2 | 2 | 0 | public |
| `auth/me` | routes/me.ts | 5 | 3 | 2 | authenticated |
| `auth/mfa` | routes/mfa.ts | 6 | 0 | 6 | authenticated |
| `auth/role-request` | routes/role-request.ts | 4 | 1 | 3 | authenticated |
| `constellations` | routes/constellations.ts | 4 | 3 | 1 | public (rate-limit IP) |
| `fx` | routes/fx.ts | 2 | 2 | 0 | authenticated |
| `ghost-zones` | routes/ghost-zones.ts | 3 | 3 | 0 | authenticated |
| `ia-generativa/ai` | routes/ai.ts | 1 | 0 | 1 | authenticated |
| `ia-generativa/memory` | routes/memory.ts | 3 | 1 | 2 | authenticated |
| `ie` | routes/scores.ts | 5 | 5 | 0 | authenticated |
| `indices-publicos` | routes/indices-public.ts | 6 | 6 | 0 | public |
| `lifepath` | routes/lifepath.ts | 3 | 1 | 2 | authenticated |
| `market` | routes/market.ts | 1 | 0 | 1 | authenticated |
| `newsletter` | routes/newsletter-public.ts | 4 | 2 | 2 | public (rate-limit IP) |
| `scian` | routes/scian.ts | 1 | 1 | 0 | authenticated |
| `str-intelligence/breakeven` | routes/breakeven.ts | 1 | 1 | 0 | authenticated |
| `str-intelligence/env` | routes/env.ts | 1 | 1 | 0 | authenticated |
| `str-intelligence/host-migrations` | routes/host-migrations.ts | 3 | 2 | 1 | mixed admin/auth |
| `str-intelligence/hosts` | routes/hosts.ts | 2 | 2 | 0 | authenticated |
| `str-intelligence/invisible-hotels` | routes/invisible-hotels.ts | 4 | 2 | 2 | admin |
| `str-intelligence/ltr-connection` | routes/ltr-connection.ts | 2 | 2 | 0 | authenticated |
| `str-intelligence/nomad` | routes/nomad.ts | 1 | 1 | 0 | authenticated |
| `str-intelligence/photo-cv` | routes/photo-cv.ts | 1 | 0 | 1 | admin |
| `str-intelligence/portfolio` | routes/portfolio.ts | 1 | 0 | 1 | authenticated |
| `str-intelligence/pricing` | routes/pricing.ts | 3 | 2 | 1 | authenticated |
| `str-intelligence/reports` | routes/reports.ts | 3 | 2 | 1 | authenticated |
| `str-intelligence/scores` | routes/scores.ts | 2 | 2 | 0 | authenticated |
| `str-intelligence/viability` | routes/viability.ts | 1 | 1 | 0 | authenticated |
| `str-intelligence/watchdog` | routes/watchdog.ts | 1 | 1 | 0 | admin |
| `str-intelligence/zone-investment` | routes/zone-investment.ts | 2 | 1 | 1 | mixed |
| `causal` | server/trpc/routers/causal.ts | 2 | 1 | 1 | public+auth |
| `migration-flow` | server/trpc/routers/migration-flow.ts | 3 | 3 | 0 | public |
| `pulse` | server/trpc/routers/pulse.ts | 2 | 2 | 0 | public |
| `trend-genome` | server/trpc/routers/trend-genome.ts | 5 | 4 | 1 | proTier+public |
| `health` (root) | server/trpc/root.ts | 1 | 1 | 0 | public |

### 2.4 Features sin `routes/` (UI-only / no tRPC backend)

`api-v1`, `causal-engine`, `climate-twin`, `futures-curve`, `genome`, `ingest-admin`, `migration-flow` (router en server/trpc/routers/), `preview-ux`, `pulse-score` (router central), `scorecard-nacional`, `settings`, `trend-genome` (router central), `widget-embed`.

> Anomalía namespacing: `causal-engine`, `migration-flow`, `pulse-score`, `trend-genome` tienen `lib/`+`schemas/`+`types/` en `features/` pero router en `server/trpc/routers/`. Rompe patrón feature-sliced.

### 2.5 Top 5 features con más procedures

| Feature | # procedures |
|---|---|
| auth/mfa | 6 |
| indices-publicos | 6 |
| auth/me | 5 |
| ie | 5 |
| trend-genome | 5 |

### 2.6 Anomalías tRPC

- `featureProcedure` definido pero unused (FEATURE_MAP vacío).
- `proTierProcedure` inline en trend-genome (no reusable).
- Rate-limit dual-mode: DB-side genérico `check_rate_limit_db` + IP-based `checkRateLimit` lib.
- `newsletter-public.ts` usa casts forzados (`as never`) por tablas fuera del typegen Database.
- Nested router único: `me.features.list`.

---

## Sección 3 — UI Components (SA3)

Evidencia: `find` + `grep` + `wc` sobre features/ + shared/ + app/.

### 3.1 Inventario por feature (21 features con `components/`, 88 components totales)

| Feature | # components | # client | # i18n | # framer-motion |
|---|---|---|---|---|
| api-v1 | 1 | 1 | 1 | 0 |
| atlas | 2 | 2 | 0 | 0 |
| auth | 10 | 8 | 0 | 0 |
| climate-twin | 2 | 1 | 1 | 0 |
| constellations | 5 | 5 | 5 | 0 |
| futures-curve | 3 | 3 | 2 | 0 |
| genome | 1 | 1 | 1 | 0 |
| ghost-zones | 3 | 3 | 3 | 0 |
| ie | 1 | 1 | 0 | 0 |
| indices-publicos | 13 | 10 | 9 | 0 |
| ingest-admin | 2 | 2 | 0 | 0 |
| lifepath | 2 | 2 | 2 | 0 |
| market | 1 | 1 | 0 | 0 |
| migration-flow | 3 | 3 | 3 | 0 |
| newsletter | 2 | 2 | 2 | 0 |
| preview-ux | 16 | 6 | 14 | 0 |
| pulse-score | 3 | 3 | 3 | 0 |
| settings | 1 | 1 | 1 | 0 |
| str-intelligence | 10 | 10 | 0 | 0 |
| trend-genome | 3 | 3 | 3 | 0 |
| widget-embed | 4 | 4 | 3 | 0 |

### 3.2 Top 5 features con más UI

| Feature | # components |
|---|---|
| preview-ux | 16 |
| indices-publicos | 13 |
| auth | 10 |
| str-intelligence | 10 |
| constellations | 5 |

### 3.3 Shared UI primitives (shared/ui/ — 49 componentes + 3 tests)

- **primitives/ (16 atoms):** badge, button, card, combobox, dialog, drawer, dropdown, input, multi-select, number-input, popover, select, sheet, textarea, toast, tooltip
- **dopamine/ (11):** anim-num, card-3d, confidence-badge, floating-shapes, fx-pill, intelligence-card, label-pill, particle-field, score-placeholder, score-recommendations-card, score-transparency-panel
- **layout/ (12):** ai-copilot, app-shell, command-palette (+boot), content-grid, currency-switcher, header, locale-switcher, shell-client, sidebar, theme-provider, theme-toggle
- **molecules/ (3):** CausalExplanation, CitationsList, MarkdownContentRenderer
- **generative/ (6):** comparison-table, cta-card, generative-component, mini-map, stat-card, timeline
- **root (1):** locked-feature

### 3.4 App routes map (60 pages + 4 layouts)

**Layouts (4):** root · [locale]/ · preview/ · embed/

**Agrupación por sección:**
- (dev): 2 rutas — design-system, ie-playground
- [locale] root: 1
- (admin): 3 — ingest/market, ingest/upload, newsletter-ab
- (asesor): 2 — dashboard/api-keys, extension/connect
- (public)/atlas: 2
- (public)/auth: 8 — login, signup, logout, onboarding, inactive, mfa-enroll, mfa-verify, pending-approval
- (public)/docs-widget: 1
- (public)/estimate, faq: 2
- (public)/historia: 1
- (public)/indices: 16 — index root, [indexCode], clima-gemelo, futuros, similares, alpha, backtest, constellations (+[coloniaId]), flujos, ghost-zones (+ranking), magnet-exodus, movers, pro, streaks
- (public)/legal: 2 — privacidad, terminos
- (public)/lifepath: 3 — root, quiz, resultados
- (public)/metodologia: 2
- (public)/newsletter: 2 — preferences, unsubscribe/[token]
- (public)/preview: 5 — root, asesor, comprador, developer, masterbroker
- (public)/scorecard-nacional: 2
- (public)/wrapped: 1
- [locale] outside groups: 2 — profile/seguridad, settings/account
- /embed (sin locale): 3 — pulse/[coloniaSlug], pulse/vs/, score/[coloniaSlug]

### 3.5 Features SIN components/ (backend-only, 5)

causal-engine · fx · ia-generativa · scian · scorecard-nacional

### 3.6 Anomalías UI

- framer-motion ZERO en features/*/components/; solo en 4 shared/ui (anim-num, particle-field, card-3d, ai-copilot) y 4 vi.mock tests.
- i18n ausente en `auth` (10 componentes / 0 i18n), `str-intelligence` (10/0), `atlas` (2/0), `ingest-admin` (2/0), `ie` (1/0). Posible deuda i18n.
- `shared/components/` NO existe (toda UI compartida en `shared/ui/`).
- Zero `import 'zod'` en componentes (Zod vive en `features/*/schemas/`, coherente con SSoT).

---

## Sección 4 — Backend Infra (SA4)

Evidencia: MCP Supabase + ls scripts/.

### 4.1 pg_cron jobs (3 active)

| jobid | jobname | schedule | active | command |
|---|---|---|---|---|
| 2 | mfa_reminders_weekly | `0 14 * * 1` | true | `select public.mfa_reminders_tick();` |
| 1 | scheduled_delete_daily | `15 3 * * *` | true | `select public.run_scheduled_deletions();` |
| 3 | zone_tier_recompute_nightly | `30 4 * * *` | true | `select public.recompute_all_zone_tiers();` |

### 4.2 Cron activity last 30d

| jobname | status | runs | last_run |
|---|---|---|---|
| mfa_reminders_weekly | failed | 1 | 2026-04-20 14:00 UTC |
| scheduled_delete_daily | failed | 6 | 2026-04-24 03:15 UTC |
| zone_tier_recompute_nightly | succeeded | 5 | 2026-04-24 04:30 UTC |

> Anomalía: 2/3 crons en estado ZOMBIE (fallando sistemáticamente).

### 4.3 Edge functions (1)

| Slug | Name | Status | Version | Verify JWT |
|---|---|---|---|---|
| on-auth-event | on-auth-event | ACTIVE | 1 | false |

### 4.4 RPC functions (70 user functions, 58 SECURITY DEFINER)

Categorías principales:
- **Auth/MFA:** `mfa_consume_backup_code`, `mfa_mark_enabled`, `mfa_regenerate_backup_codes`, `mfa_reminders_tick`, `handle_new_user`, `prevent_role_escalation`, `anonymize_profile`, `request_account_deletion`, `cancel_account_deletion`, `run_scheduled_deletions`.
- **Role requests:** `approve_role_request`, `reject_role_request`, `get_user_role`, `is_superadmin`, `get_visible_asesor_ids`, `is_operation_participant`.
- **API keys:** `issue_api_key`, `issue_extension_token`, `verify_api_key`, `verify_extension_api_key`.
- **Rate limits:** `check_rate_limit`, `check_rate_limit_db`, `increment_api_budget_spend`, `reset_api_budgets_monthly`, `monthly_airroi_spend_by_endpoint`, `monthly_anthropic_spend`.
- **Score cascades:** `enqueue_score_recalc`, `finalize_score_job`, `claim_pending_score_jobs`, `fn_cascade_geo_data_updated`, `fn_cascade_macro_updated`, `fn_cascade_score_updated`, `fn_enqueue_indices_for_zone`, `purge_expired_score_history`, `queue_metrics_summary`.
- **Score triggers:** `archive_score_before_update`, `fn_trg_{geo_data_points,macro_series,project_scores,user_scores,zone_scores}_cascade*`, `fn_emit_score_change_webhook`.
- **Zones tiers:** `recompute_zone_tier`, `recompute_all_zone_tiers`, `recompute_zone_tiers`.
- **STR:** `detect_invisible_hotel_candidates`, `market_migration_alert_pct`, `zone_aqi_summary`, `aggregate_zone_sentiment`, `ml_deterministic_split`.
- **Climate:** `find_climate_twins`.
- **IE features:** `resolve_features`, `confidence_level_for`.
- **PII/Vault:** `desarrolladoras_encrypt_tax`, `profiles_encrypt_pii`, `encrypt_secret`, `decrypt_secret`.
- **Atlas ops:** `register_view`, `record_extension_capture`, `exec_refresh_heatmap_cache`, `exec_refresh_zone_demographics_cache`.
- **Audit/RLS:** `audit_rls_violations`, `audit_row_change`.
- **Utilities:** `set_updated_at`, `validate_postal_code`, `jsonb_diff`, `match_ai_memory`, `match_embeddings`.

### 4.5 Triggers (60 rows, 22 tables)

Tablas con triggers: addresses, agencies, ai_memory_store, api_keys, broker_companies, desarrolladoras, fiscal_docs, geo_data_points, macro_series, newsletter_subscribers, plans, profile_feature_overrides, profiles, project_scores, rate_limit_policies, role_features, role_requests, subscriptions, ui_feature_flags, user_scores, zone_scores, zones.

Tipos de triggers:
- **Audit** (`trg_audit_*`): 13 tablas sensitivas (AFTER INSERT/UPDATE/DELETE → `audit_row_change`).
- **Timestamps** (`trg_*_updated_at`): BEFORE UPDATE → `set_updated_at`.
- **Cascades** (`trg_*_cascade*`): AFTER INSERT/UPDATE en geo_data_points, macro_series, project_scores, user_scores, zone_scores.
- **PII encryption** (`trg_*_encrypt_*`): BEFORE INSERT/UPDATE en desarrolladoras (tax) y profiles (PII).
- **Role guard:** `trg_prevent_role_escalation` en profiles.
- **Score archival** (`trg_*_archive`): BEFORE UPDATE → archive to score_history.
- **Webhook emit:** `trg_zone_scores_webhook_emit` AFTER UPDATE.

### 4.6 Extensions instaladas (15)

postgis 3.3.7 · pgvector 0.8.0 · pg_cron 1.6.4 · pg_partman 5.3.1 · pgsodium 3.1.8 · supabase_vault 0.3.1 · pg_graphql 1.5.11 · pg_stat_statements 1.11 · pgcrypto 1.3 · uuid-ossp 1.1 · pg_trgm 1.6 · btree_gin 1.3 · btree_gist 1.7 · plpgsql 1.0 · unaccent 1.1.

### 4.7 Migrations (124 remote / 132 local)

Últimas 20 migrations aplicadas:
```
20260423130000  fase11_xl_climate_pgvector_refactor
20260423130100  fase11_xl_climate_source_heuristic
20260423130200  audit_rls_allowlist_v23
20260424100000  fase11_xl_constellations_gin_index
20260424100100  fase11_xl_constellation_clusters
20260424100200  audit_rls_allowlist_v24
20260424200000  fase11_xl_zone_slugs
20260424200100  audit_rls_allowlist_v25
20260424210000  fix_public_bucket_listing_and_search_path
20260424220000  rename_feature_registry_to_ui_feature_flags
20260424220100  audit_rls_allowlist_v26
20260424230000  create_zones_master_polymorphic
20260424230100  audit_rls_allowlist_v27
20260425000000  add_ingesta_foundational_sources
20260425010000  add_compute_sources
20260427000000  add_compute_pulse_forecasts_dna_sources
20260428100000  add_compute_sources_session_d
20260429000000  add_compute_atlas_wiki_source
20260430000000  add_validation_audit_sources
20260501000000  dmx_indices_canonical_scope_id_backfill
```

> Anomalía: delta 8 archivos local vs remote (feedback_supabase_migrations_manual_push patrón conocido).

### 4.8 ingest_runs activity (28 runs, 22 sources)

Successful compute pipelines (single-run 2026-04-24):
- compute_ie_n0 (2x), compute_ie_n1, compute_n2, compute_n3, compute_n4
- compute_dmx_indices, compute_zone_pulse, compute_pulse_forecasts, compute_colonia_dna
- compute_climate_signatures, compute_constellations, compute_ghost_zones
- compute_atlas_wiki (succeeded despite Haiku variant failing earlier)
- zones_canonical (2x), inegi, inegi_census, inegi_enigh, inegi_inpc, inegi_mgn (2x), banxico
- validation_e2e_fase_07.5 (2x)

Failed: audit_fk_zones (2026-04-24 21:19) · compute_atlas_wiki_haiku (2026-04-24 19:42).
Stuck running: banxico (started 2026-04-24 06:05, no completion).

### 4.9 scripts/ directory

- **scripts/ top-level:** 9 mjs/ts + 1 sql (audit-cross-feature-imports, audit-dead-ui, audit-forbidden-habi, audit-rls, cascades-export, grep-unsafe-selects, registry-snapshot, score-comparison-matrix-rebuild, scores-lineage-export, seed-living-atlas-wiki, validate-i18n)
- **scripts/audit/:** 2
- **scripts/compute/:** 16 (13 numbered pipelines + 3 helpers) + 12 tests
- **scripts/ingest/:** 6 + 5 tests
- **scripts/validation/:** 2 + 2 tests

**Compute pipelines (13 numbered):** 01_n0 · 02_n1 · 03_n2 · 04_n3 · 05_n4 · 06_dmx-indices · 07_zone-pulse · 08_colonia-dna · 09_zone-pulse-forecasts · 10_climate-signatures · 11_constellations-edges · 12_ghost-zones · 13_atlas-wiki-haiku · run-full-ingesta (orchestrator).

**Ingest pipelines (4 numbered):** 00_seed-zones-canonical · 01_ingest-geo-boundaries · 02_ingest-macro-banxico-inegi · 03_ingest-demographics · lib helpers.

### 4.10 Anomalías Backend Infra

1. Zombie cron `mfa_reminders_weekly` (1 failed, 0 succeeded, 30d).
2. Zombie cron `scheduled_delete_daily` (6 failed, 0 succeeded, 30d).
3. `compute_atlas_wiki_haiku` ingest failed (fallback `compute_atlas_wiki` succeeded).
4. `audit_fk_zones` ingest failed (2026-04-24 21:19).
5. `banxico` ingest stuck running (sin completion record).
6. Migration drift 132 local / 124 remote (delta 8).
7. Solo 1 edge function; compute en Node TS `scripts/compute/` (no edge runtime).

---

## Sección 5 — Docs + ADRs + L-NEW + Memoria (SA5)

Evidencia: ls + grep + Read + git.

### 5.1 ADRs activos (30 files, 32 lógicos — 024 skipped, 031 agendado)

| # | Título | Status |
|---|---|---|
| 001 | Rewrite desde cero | Accepted |
| 002 | AI-native architecture | Accepted |
| 003 | Multi-country desde día 1 | Accepted |
| 004 | Feature-sliced + shared/ core | Accepted |
| 005 | State management (RSC + tRPC + Zustand + URL + RHF) | Accepted |
| 006 | Testing strategy (Vitest + Playwright + msw) | Accepted |
| 007 | Observability stack (Sentry + PostHog) | Accepted |
| 008 | Monetization 3 fases + feature gating | Accepted |
| 009 | Security defense-in-depth (RLS + MFA + Vault + Rate limit) | Accepted |
| 010 | IE pipeline architecture | Accepted |
| 011 | Moonshot 3 horizontes (39 fases) | Accepted |
| 012 | Scraping policy | Accepted |
| 013 | API as Product (FASE 30) | Accepted |
| 014 | Agentic architecture | Accepted |
| 015 | Platform Play H2 | Accepted |
| 016 | Digital Twin 4D (FASE 32) | Accepted |
| 017 | Data ecosystem revenue (FASE 33) | Accepted |
| 018 | E2E Connectedness (founder mandate) | Accepted |
| 019 | STR Module Complete (AirROI pay-as-you-go) | Accepted |
| 020 | MCP-first integrations | Accepted |
| 021 | Progressive Preference Discovery | Accepted |
| 022 | Vibe Tags hybrid | Accepted |
| 023 | Design System Refinement (Dopamine cleaner) | Accepted |
| 025 | Social + Listing Intelligence Layer | Accepted 2026-04-20 |
| 026 | Global PropTech Benchmarks | Reference |
| 027 | FASE 11 XL metodología índices | Accepted 2026-04-21 |
| 028 | Living Atlas markdown stack | Accepted 2026-04-24 |
| 029 | Canonical catalog naming | Accepted 2026-04-24 |
| 030 | Canonical Zones Polymorphic schema | Accepted 2026-04-24 |
| 032 | FASE 07.6 Product Audit insertion | Accepted 2026-04-24 |

### 5.2 Planes maestros (42 archivos)

- Índice: `02.0_INDICE_MAESTRO.md`
- **Pre-H1:** FASE 00-07, 07.5 (no file, solo tags), 07.6 (este audit), 07b (STR).
- **H1 IE:** FASE 08 N0 · 09 N1 · 10 N2+N3+N4 · 11 XL (DMX Indices + Moonshots + Preview UX) · 12 N5+Mapa 7 capas.
- **H1 Portales:** FASE 13-14 Asesor · 15 Desarrollador · 16-17 Contabilidad+DocIntel · 18 Legal+Pagos · 19 Admin · 20 Comprador · 21 Público.
- **H1 Ops:** FASE 22 Marketing · 23 Monetización · 24 Observability · 25 Performance · 26 Compliance (+ 26 Listing Intelligence stub H2) · 27 QA · 28 Launch · 29 H2/H3 scaffold.
- **H2+:** FASE 30 Platform API · 31 Agentic · 32 Digital Twin · 33 Data Ecosystem · 34 Creator · 35 Terminal · 36 Fractional · 37 Banking · 38 International.

> Anomalía: colisión `FASE_26_*` (Compliance vs Listing Intelligence stub H2).

### 5.3 Catálogos (docs/03_CATALOGOS/, 16 archivos)

03.1 BD Tablas · 03.2 BD Funciones · 03.3 BD Triggers · 03.4 BD RLS · 03.5 tRPC Procedures · 03.6 API Routes · 03.7 Crons · 03.8 Scores IE (md + json) · 03.9 Fuentes Datos · 03.10 UI Feature Flags · 03.11 Productos B2B · 03.12 Notifs + Webhooks · 03.13 E2E Connections Map · 03.14 Cascade Graph · 03.15 Score Lineage.

### 5.4 Docs structure (docs/*)

| Carpeta | # archivos | Notas |
|---|---|---|
| 00_FOUNDATION/ | 4 | Visión + Stack + Glosario + Comandos |
| 01_DECISIONES_ARQUITECTONICAS/ | 30 | ADRs |
| 02_PLAN_MAESTRO/ | 42 | Índice + 41 fases |
| 03_CATALOGOS/ | 16 | |
| 04_MODULOS/ | 20 | M01-M20 |
| 05_OPERACIONAL/ | 12 | CONTRATO + checklists |
| 06_AUDITORIAS/ | 1 | AUDIT_FASE_0_A_11S |
| 06_REFERENCIAS_LEGADO/ | 1 | competitive_intel_findperty |
| 07_GAME_CHANGERS/ | 6 | LATERAL_UPGRADES_PIPELINE + 5 G-CHANGERS |
| 08_PRODUCT_AUDIT/ | 0 | staging FASE 07.6 (este audit lo puebla) |
| 08_PRODUCTOS/ | 5 | COMPETITIVE + FEATURE + GTM + PERSONA + PRODUCT_CATALOG |
| biblia-v5/ | 28 | legacy |
| referencias-ui/ | 10 | Landing_v2 + M1-M9 |
| (root) | 3 | BRIEFING + CONTEXTO_MAESTRO_v5 + README |

### 5.5 L-NEW backlog (49 entries — 3 shipped + 46 active)

| # | Título | Status | Fase target |
|---|---|---|---|
| 1 | Climate pgvector nacional scale | 🟢 implementado | FASE 13 |
| 2 | createAdminClient typed generic | 🟡 deuda parcial | FASE 12 N5 |
| 3 | Sentry wiring reemplaza console.error | 🟡 deuda | FASE 24 |
| 4 | U4 Alert Ghost transition | 🟢 agendado | FASE 11.T |
| 5 | U9 Overrated/Underrated blog autogen | 🟢 agendado | FASE 22 |
| 6 | U10 Six Degrees viral game | 🟢 agendado | FASE 22 |
| 7 | U11 Discover Weekly email | 🟢 agendado | FASE 12 + 11.J |
| 8 | Editor rico Tiptap/Lexical wiki | 🟢 agendado | FASE 12 N5 |
| 9 | Sections normalizadas per-row | 🟢 agendado | FASE 13 |
| 10 | Retirar cast transitional admin-ext | ✅ SHIPPED PR #32 | 11.S |
| 11 | Canonical catalog naming (ADR-029) | ✅ SHIPPED BATCH 5 | pre-Opción D |
| 12 | Vercel Pro upgrade pre-launch | 🟢 agendado | pre-launch |
| 13 | FK enforcement zones master | 🟢 agendado | FASE 08 post-Opción D |
| 14 | Seed expansión nacional MX (31 estados) | 🟢 agendado | FASE 13 |
| 15 | Seed Colombia canonical | 🟢 agendado | FASE 38 |
| 16 | Seed Argentina/Brasil/USA canonical | 🟢 agendado | FASE 38+ |
| 17 | OpenStreetMap bulk import | 🟢 agendado | H2 |
| 18 | APIs oficiales INEGI/DANE/IBGE/Census | 🟢 agendado | H2+ |
| 19 | Zones aliases + fuzzy + Stripe/Google | 🟢 agendado | FASE 12 N5 + 22 |
| 20 | Boundaries reales CDMX | 🟡 agendado, no bloqueante H1 | FASE 13 |
| 21 | Demographics real AGEB | 🟡 agendado, no bloqueante H1 | FASE 13 |
| 22 | Fix INEGI BIE API (token + IDs 2026) | 🔴 bug runtime | pre-FASE 11 |
| 23 | Fix registry gap N1-N4 calculators | 🔴 bug estructural | pre-FASE 11 bloqueante |
| 24 | Cleanup Node loader hack | 🟡 deuda técnica | FASE 13 |
| 25 | DNA similarity pgvector cosine top-k | 🟢 agendado | FASE 11 N5 |
| 26 | Pulse streaks detection | 🟢 agendado | FASE 11 pulse |
| 27 | Zone Year in Review Wrapped-style | 🟢 agendado | FASE 22 |
| 28 | Pulse-triggered IE cascade webhook | 🟢 agendado | FASE 11 cascade |
| 29 | DMX 15th index reconciliation | 🟡 gap docs | pre-FASE 11 |
| 30 | Zone Transit Map interactive | 🟢 agendado | FASE 12 Atlas |
| 31 | Ghost Zones Revival Engine | 🟢 agendado moat | FASE 11 R-type |
| 32 | Climate Twin cross-country | 🟢 agendado H2 | FASE 38+ |
| 33 | Constellation Sentiment Alerts | 🟢 agendado | FASE 22 + 11 alerts |
| 34 | Ghost Zone Index per alcaldía (B2G) | 🟢 agendado B2G | FASE 22+ enterprise |
| 35 | Climate signatures feed IE N1 weather | 🟢 cross-function | FASE 11 IE N1 |
| 36 | Constellations edges feed IE N3 comparables | 🟢 cross-function | FASE 11 IE N3 |
| 37 | Ghost+climate feed Living Atlas narrative | 🟢 cross-function | FASE 11 Living Atlas |
| 38 | Climate data real ingestion | 🟡 deuda 07.5.D | FASE 13 |
| 39 | Wiki Infobox Wikipedia-style | 🟢 agendado | FASE 12 Atlas + SEO |
| 40 | Wiki audio narration TTS | 🟢 agendado | FASE 22 multimedia |
| 41 | Wiki citizen editable + AI pre-review | 🟢 agendado | FASE 22+ community |
| 42 | Wiki embeddings semantic search | 🟢 agendado | FASE 11 N5 |
| 43 | Wiki Q&A chat (RAG) | 🟢 agendado | FASE 22+ chat |
| 44 | Wiki → IE narrative explainer | 🟢 cross-function | FASE 11 IE UX |
| 45 | Wiki multi-locale translations | 🟢 agendado H2 | FASE 38+ |
| 46 | Fix Haiku prompt caching TTL | 🟡 deuda 07.5.E | FASE 22 |
| 47 | FASE 07.6 Product Audit (ADR-032) | 🔷 AGENDADA formal | FASE 07.6 dedicada |
| 48 | Smoke test E2E integrity pattern | 🟢 canonizable | FASE 24 Observability |
| 49 | Fix Haiku ephemeral TTL (cross-ref 46) | 🔴 investigación | pre-FASE 22 |
| 50 | dmx_indices canonical scope_id backfill | ✅ SHIPPED 2026-04-24 | pre-FASE 07.6 |

### 5.6 CLAUDE.md top-level secciones

| Línea | Sección |
|---|---|
| 5 | Stack (H1 cerrado) |
| 20 | Estructura feature-sliced |
| 33 | Las 10 reglas no negociables |
| 46 | Convenciones |
| 53 | Prohibiciones al escribir código |
| 62 | Workflow de ejecución |
| 68 | Comunicación con founder (Manu) |

### 5.7 Memoria MEMORY.md (22 pointers)

| # | Archivo | Hook |
|---|---|---|
| 1 | user_founder_profile.md | Manu founder profile |
| 2 | project_phase_workflow.md | Phase workflow + 92% stop + tag ritual |
| 3 | feedback_build_cacheComponents.md | NO dynamic/runtime con cacheComponents |
| 4 | feedback_audit_rls_allowlist.md | audit_rls_allowlist_vN requerido pre-tag |
| 5 | reference_key_paths.md | Key paths DMX |
| 6 | reference_credentials_status.md | Credentials/env vars status |
| 7 | feedback_verify_before_spend.md | Curl probe 30s antes de hardcodear |
| 8 | feedback_airroi_cost_empirical.md | $0.10/call AirROI real |
| 9 | feedback_next_public_literal_only.md | NEXT_PUBLIC_* literal only |
| 10 | feedback_card3d_no_tilt.md | Card3D sin rotateY Dopamine cleaner |
| 11 | feedback_subagents_over_revert.md | Validar git diff tras Task |
| 12 | feedback_instruction_format.md | Sub-módulos numerados + hard stop 95% |
| 13 | feedback_upgrades_destino.md | Upgrades con destino concreto L-NN |
| 14 | feedback_zero_deuda_tecnica.md | Auditoría pre-commit obligatoria |
| 15 | feedback_supabase_migrations_manual_push.md | GHA no aplica; db push manual |
| 16 | feedback_arquitectura_escalable_desacoplada.md | Opción escalable por default |
| 17 | feedback_pm_schema_audit_pre_prompt.md | Ritual 5 min pre-prompt CC |
| 18 | feedback_cc_guardrails_exhaustivos.md | PROHIBIDO + AUDIT + REPORTAR |
| 19 | feedback_pm_audit_exhaustivo_post_cc.md | PM audit independiente pre-push |
| 20 | feedback_formato_prompts_founder.md | UN bloque + destino explícito |
| 21 | feedback_cron_observability_obligatorio.md | ingest_runs + CRON_SECRET |
| 22 | feedback_no_claude_attribution.md | Zero Claude/Anthropic attribution |

### 5.8 Git tags history (26 totales)

Con taggerdate (10):
- fase-00-complete (2026-04-17)
- fase-08-complete (2026-04-20)
- fase-10-complete (2026-04-20)
- fase-07.5.A-complete / B / C / D / E (2026-04-24)
- fase-07.5-ingesta-canonical-complete (2026-04-24)
- fix-dmx-canonical-scope (2026-04-24)

Lightweight sin taggerdate (16): biblia-v2, biblia-v5-source, fase-01..09-complete, fase-07b-complete, fase-09-complete, fase-11-xl-pre-reset-2026-04-21, housekeeping-audit-reconciliation, housekeeping-post-05, housekeeping-post-07b-findperty-ppd, pre-optionD-complete.

> Anomalía: NO existen tags `fase-07.5.F-complete` ni `fase-07.5.0-complete` aunque shippearon (umbrella tag cubre).

### 5.9 Anomalías Docs

- ADR gaps: 024 (skipped) y 031 (agendado).
- Plan maestro colisión: dos archivos `FASE_26_*`.
- Tags lightweight 16/26 (sin taggerdate, orden cronológico exacto imposible para mitad anterior).
- Carpetas duplicadas prefix: `06_` (AUDITORIAS + REFERENCIAS_LEGADO), `08_` (PRODUCT_AUDIT + PRODUCTOS).
- Catálogo 03.8 duplicado en formatos (.md + .json).

---

## Sección 6 — FASE progress map

Timeline fases shipped hasta 2026-04-24 (derivado de tags + commits + planes):

| FASE | Estado | Evidencia | Commits/Tags |
|---|---|---|---|
| 00 Bootstrap | ✅ Complete | tag `fase-00-complete` (2026-04-17) | 8500b5c |
| 01 BD Fundación | ✅ Complete | tag `fase-01-complete` | 0580b4d |
| 02 Auth + Permisos | ✅ Complete | tag `fase-02-complete` | aee24db |
| 03 AI-Native Shell | ✅ Complete | tag `fase-03-complete` | 38b2c53 |
| 04 Design System Dopamine | ✅ Complete | tag `fase-04-complete` | f855606 |
| 05 i18n + Multi-country | ✅ Complete | tag `fase-05-complete` | 57e3703 |
| 06 Seguridad Baseline | ✅ Complete | tag `fase-06-complete` | 505bc8c |
| 07 Ingesta 50+ fuentes | ✅ Complete | tag `fase-07-complete` | 7517470 |
| 07b STR Intelligence | ✅ Complete | tag `fase-07b-complete` | dd171ea |
| 07.5 Ingesta Canonical (7/7) | ✅ Complete | tag `fase-07.5-ingesta-canonical-complete` | 105a148 — A/B/C/D/E/F + fix dmx |
| 07.5.A Foundational scripts | ✅ Shipped | tag `fase-07.5.A-complete` | c578f50 |
| 07.5.B IE compute N0-N4 + DMX 15 | ✅ Shipped | tag `fase-07.5.B-complete` | d671c34 |
| 07.5.C Pulse + Forecasts + DNA | ✅ Shipped | tag `fase-07.5.C-complete` | 62946b8 |
| 07.5.D Climate + Constellations + Ghost | ✅ Shipped | tag `fase-07.5.D-complete` | 6e7ed2f |
| 07.5.E Atlas wiki Haiku | ✅ Shipped | tag `fase-07.5.E-complete` | 78f174b |
| 07.5.F E2E validation + FK audit | ✅ Shipped | commit d0a2390 (sin tag granular) | d0a2390 |
| fix dmx canonical scope | ✅ Shipped | tag `fix-dmx-canonical-scope` | 5d3c4b1 + bf2d9ef |
| **07.6 Product Audit** | 🔷 INICIADA | **07.6.A este inventario** | (a tagear) |
| 08 IE Scores N0 + AVM | ✅ Complete | tag `fase-08-complete` | a7b608d |
| 09 IE Scores N1 | ✅ Complete | tag `fase-09-complete` | 1ce030a |
| 10 IE Scores N2+N3+N4 | ✅ Complete | tag `fase-10-complete` | 8bb60ae |
| 11 XL DMX Indices + Moonshots | 🟡 19/27 bloques (70%) | commits 11.A-S; restan 11.T-Z + tag umbrella | múltiples |
| 12-38 | 📋 Planes maestros disponibles | docs/02_PLAN_MAESTRO/FASE_*.md | n/a |

---

## Sección 7 — Rows populated detail (data layer actual)

| Tabla | Rows | Dominio |
|---|---|---|
| zone_pulse_scores | 83,220 | pulse |
| climate_monthly_aggregates | 43,776 | climate |
| zone_constellations_edges | 21,945 | constellations |
| spatial_ref_sys | 8,500 | PostGIS |
| pulse_forecasts | 6,840 | forecasts |
| zone_scores | 5,267 | IE core |
| climate_annual_summaries | 3,648 | climate |
| score_recalculation_queue | 3,206 | IE queue |
| dmx_indices | 3,192 | IE core (canonical post-fix) |
| climate_twin_matches | 1,140 | climate |
| macro_series | 880 | ingesta macro |
| role_features | 432 | foundation |
| climate_zone_signatures | 228 | climate |
| zones | 229 | canonical |
| ui_feature_flags | 120 | foundation |
| score_history | 42 | IE (partitioned) |
| ingest_watermarks | 31 | ingesta |
| ingest_runs | 28 | ingesta |
| ingest_allowed_sources | 56 | ingesta |
| score_weights | 44 | IE |
| zone_constellation_clusters | 210 | constellations |
| zone_topology_metrics | 210 | topology |
| ghost_zones_ranking | 210 | ghost |
| colonia_wiki_entries | 210 | wiki |
| colonia_dna_vectors | 210 | DNA |
| inegi_census_zone_stats | 210 | demographics |
| enigh_zone_income | 210 | demographics |
| part_config | 13 | pg_partman |
| confidence_thresholds | 10 | IE |
| api_budgets | 10 | budgets |
| vibe_tags | 10 | vibe |
| str_events_calendar | 7 | STR |
| ie_score_visibility_rules | 7 | IE |
| rate_limit_policies | 7 | rate limit |
| countries | 6 | foundation |
| currencies | 7 | foundation |
| locales | 6 | foundation |
| tier_requirements | 4 | foundation |
| str_cost_assumptions | 4 | STR |
| str_zone_regulations | 1 | STR |
| ... | ~184,386 total approx | |

---

## Sección 8 — L-NEW backlog top 20 (prioridad + fase target proximidad)

| Prio | # | Título | Status | Fase target |
|---|---|---|---|---|
| 1 | 23 | Fix registry gap N1-N4 calculators | 🔴 bloqueante | pre-FASE 11 |
| 2 | 22 | Fix INEGI BIE API token + IDs | 🔴 bug runtime | pre-FASE 11 |
| 3 | 49 | Fix Haiku ephemeral TTL | 🔴 investigación | pre-FASE 22 |
| 4 | 47 | FASE 07.6 Product Audit (ADR-032) | 🔷 AGENDADA | FASE 07.6 (in progress) |
| 5 | 50 | dmx_indices canonical backfill | ✅ SHIPPED | pre-07.6 |
| 6 | 11 | Canonical catalog naming (ADR-029) | ✅ SHIPPED | BATCH 5 |
| 7 | 10 | Retirar cast transitional admin-ext | ✅ SHIPPED | 11.S |
| 8 | 1 | Climate pgvector nacional scale | 🟢 implementado | FASE 13 |
| 9 | 29 | DMX 15th index reconciliation | 🟡 gap docs | pre-FASE 11 |
| 10 | 46 | Fix Haiku prompt caching TTL | 🟡 deuda 07.5.E | FASE 22 |
| 11 | 38 | Climate data real ingestion | 🟡 deuda 07.5.D | FASE 13 |
| 12 | 20 | Boundaries reales CDMX | 🟡 no bloqueante H1 | FASE 13 |
| 13 | 21 | Demographics real AGEB | 🟡 no bloqueante H1 | FASE 13 |
| 14 | 2 | createAdminClient typed generic | 🟡 deuda parcial | FASE 12 N5 |
| 15 | 3 | Sentry wiring reemplaza console.error | 🟡 deuda | FASE 24 |
| 16 | 24 | Cleanup Node loader hack | 🟡 deuda técnica | FASE 13 |
| 17 | 13 | FK enforcement zones master | 🟢 agendado | FASE 08 post-Opción D |
| 18 | 48 | Smoke test E2E integrity pattern | 🟢 canonizable | FASE 24 |
| 19 | 12 | Vercel Pro upgrade pre-launch | 🟢 agendado | pre-launch |
| 20 | 28 | Pulse-triggered IE cascade webhook | 🟢 agendado | FASE 11 cascade |

---

Este inventario es INPUT canónico para **07.6.B crosswalk matrix** 160+ features prototype × "qué tenemos". Zero analysis aquí — solo FACTS.

> **Ref commits:** bf2d9ef (fix dmx canonical), d0a2390 (07.5.F), 105a148 (07.5 umbrella).
> **Ref tags:** fase-07.5-ingesta-canonical-complete, fix-dmx-canonical-scope.
> **Generated by:** master CC consolidación 5 sub-agents paralelos (SA1 BD / SA2 tRPC / SA3 UI / SA4 Infra / SA5 Docs). Drafts en `tmp/07.6.A-drafts/` (gitignored, local only).
