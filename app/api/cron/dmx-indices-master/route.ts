// FASE 11 XL — BLOQUE 11.C Orquestador + cron maestro.
// Dispatcher: según fecha UTC corre monthly|quarterly|annual.
// Invocado por GitHub Actions (.github/workflows/dmx-indices-master.yml).
// Auth via X-Cron-Secret contra env CRON_SECRET (GHA no inyecta x-vercel-cron-secret).
//
// NOTA Next.js 16 cacheComponents: NO export const dynamic/runtime aquí
// (rompe build con cacheComponents:true). `maxDuration` sí es seguro —
// es config de Vercel Functions, no de cache.
//
// TODO Sentry: @sentry/nextjs no está instalado en H1. Usamos console.error
// como fallback. Cuando se adopte Sentry, reemplazar los console.error por
// Sentry.captureException(err, { tags: { cron: 'dmx-indices-master' } }).

import { NextResponse } from 'next/server';
import {
  sendMonthlyNewsletters,
  sendWrappedAnnualNewsletters,
} from '@/features/newsletter/lib/send-orchestrator';
import { computeZoneStreaks } from '@/features/newsletter/lib/streaks-calculator';
import { buildAnonWrapped } from '@/features/newsletter/lib/wrapped-builder';
import {
  type CalculateMigrationFlowsBatchSummary,
  type CalculatePulseBatchSummary,
  type CalculateTrendGenomeBatchSummary,
  type CDMXBatchSummary,
  calculateAllIndicesForCDMXColonias,
  calculateAllMigrationFlowsForCDMXColonias,
  calculateAllPulseForCDMXColonias,
  calculateAllTrendGenomeForCDMXColonias,
} from '@/shared/lib/intelligence-engine/calculators/indices';
import { batchIngestMonthlyCDMX } from '@/shared/lib/intelligence-engine/climate/noaa-ingestion';
import {
  buildAndPersistSignatures,
  refreshTwinsForZone,
} from '@/shared/lib/intelligence-engine/climate/twin-engine';
import { buildAllConstellationEdges } from '@/shared/lib/intelligence-engine/constellations/constellation-engine';
import { buildClusters } from '@/shared/lib/intelligence-engine/constellations/louvain';
import {
  batchCalculateForwardCurvesCDMX,
  batchCalculatePulseForecastsCDMX,
} from '@/shared/lib/intelligence-engine/futures/curve-calculator';
import { batchBuildAllCDMXEmbeddings } from '@/shared/lib/intelligence-engine/genome/embedding-builder';
import { batchComputeVibeTagsCDMX } from '@/shared/lib/intelligence-engine/genome/vibe-tags-heuristic';
import { buildAllCDMXGhostZones } from '@/shared/lib/intelligence-engine/ghost-zones/ghost-engine';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export const maxDuration = 300;

type DispatchMode = 'monthly' | 'quarterly' | 'annual';

function authorize(request: Request): boolean {
  const received = request.headers.get('x-cron-secret');
  const expected = process.env.CRON_SECRET;
  if (!received || !expected) return false;
  // Length-guard to avoid trivial mismatches before full compare.
  if (received.length !== expected.length) return false;
  return received === expected;
}

function resolveDispatch(now: Date): DispatchMode | null {
  const day = now.getUTCDate();
  const month = now.getUTCMonth() + 1; // 1..12
  if (day === 1 && month === 1) return 'annual';
  if (day === 5 && [1, 4, 7, 10].includes(month)) return 'quarterly';
  if (day === 5) return 'monthly';
  return null;
}

function isDispatchMode(value: string | null): value is DispatchMode {
  return value === 'monthly' || value === 'quarterly' || value === 'annual';
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const t0 = Date.now();
  const url = new URL(request.url);
  const forcedRaw = url.searchParams.get('mode');
  const forced = isDispatchMode(forcedRaw) ? forcedRaw : null;
  const now = new Date();
  const dispatched: DispatchMode | null = forced ?? resolveDispatch(now);

  if (!dispatched) {
    return NextResponse.json({
      dispatched: null,
      reason: 'no_scheduled_dispatch_today',
      utc_date: now.toISOString().slice(0, 10),
      duration_ms: Date.now() - t0,
    });
  }

  const supabase = createAdminClient();
  const periodDate = now.toISOString().slice(0, 10);
  const errors: Array<{ stage: string; message: string }> = [];
  let scopesProcessed = 0;
  let indicesComputed = 0;
  let failures = 0;
  let pulseScopesProcessed = 0;
  let pulseComputed = 0;
  let pulseFailures = 0;
  let migrationScopesProcessed = 0;
  let migrationFlowsUpserted = 0;
  let migrationFailures = 0;
  let migrationSourcesReal: readonly string[] = [];
  let migrationSourcesStub: readonly string[] = [];
  let alphaZonesProcessed = 0;
  let alphasDetected = 0;
  let alertsTriggered = 0;
  let alphaFailures = 0;
  let alphaSourcesReal: readonly string[] = [];
  let alphaSourcesStub: readonly string[] = [];
  let newsletterSent = 0;
  let newsletterFailed = 0;
  let newsletterSkipped = 0;
  let wrappedSnapshotsGenerated = 0;
  let streaksComputed = 0;
  let streaksFailed = 0;
  let genomeVibeProcessed = 0;
  let genomeEmbeddingsProcessed = 0;
  let genomeEmbeddingsSkipped = 0;
  let genomeFailures = 0;
  let forwardCurvesComputed = 0;
  let forwardCurvesFailed = 0;
  let pulseForecastsComputed = 0;
  let pulseForecastsFailed = 0;
  let climateZonesIngested = 0;
  let climateRowsUpserted = 0;
  let climateSignaturesBuilt = 0;
  let climateTwinsPersisted = 0;
  let climateFailed = 0;
  let ghostZonesProcessed = 0;
  let ghostZonesUpserted = 0;
  let ghostZonesFailed = 0;
  let constellationsProcessed = 0;
  let constellationsEdgesUpserted = 0;
  let constellationsClustersComputed = 0;
  let constellationsFailed = 0;

  try {
    // H1 alcance: monthly/quarterly/annual corren el batch CDMX colonias completo.
    // FASE 11.D: expandir a multi-scope (alcaldía + city) y cuando monthly solo
    // MOM, granularizar. Por ahora 15 índices corren en los tres modos —
    // persistencia idempotente por (score_id, period_date, scope) evita doble conteo.
    const result: CDMXBatchSummary = await calculateAllIndicesForCDMXColonias({
      periodDate,
      supabase,
    });
    scopesProcessed = result.zones_processed;
    indicesComputed = result.indices_computed;
    failures = result.failures;

    // BLOQUE 11.F — Pulse Score también corre en el dispatcher mensual.
    // Usa el mismo batch CDMX colonias. Falla de pulse NO tumba dispatch.
    if (dispatched === 'monthly' || dispatched === 'quarterly' || dispatched === 'annual') {
      try {
        const pulseResult: CalculatePulseBatchSummary = await calculateAllPulseForCDMXColonias({
          periodDate,
          supabase,
        });
        pulseScopesProcessed = pulseResult.zones_processed;
        pulseComputed = pulseResult.pulse_computed;
        pulseFailures = pulseResult.failures;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({ stage: `${dispatched}:pulse`, message });
        console.error('[dmx-indices-master] pulse dispatch failed', {
          dispatched,
          message,
          error: err,
        });
      }
    }

    // BLOQUE 11.G — Migration Flow fan-out.
    // Corre solo en quarterly/annual dispatches (granularidad trimestral,
    // evita ruido estadístico mensual con solo RPP real).
    // Falla de flows NO tumba dispatch (try/catch aislado, mismo patrón que pulse).
    if (dispatched === 'quarterly' || dispatched === 'annual') {
      try {
        const migrationResult: CalculateMigrationFlowsBatchSummary =
          await calculateAllMigrationFlowsForCDMXColonias({
            periodDate,
            supabase,
          });
        migrationScopesProcessed = migrationResult.scopes_processed;
        migrationFlowsUpserted = migrationResult.flows_upserted;
        migrationFailures = migrationResult.failures;
        migrationSourcesReal = migrationResult.sources_real;
        migrationSourcesStub = migrationResult.sources_stub;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({ stage: `${dispatched}:migration_flow`, message });
        console.error('[dmx-indices-master] migration_flow dispatch failed', {
          dispatched,
          message,
          error: err,
        });
      }

      // BLOQUE 11.H — Trend Genome fan-out. Corre en quarterly/annual después
      // de migration_flow (Trend Genome consume zone_migration_flows fresh para
      // migration_inflow signal decile ≥7). Falla NO tumba dispatch (try/catch
      // aislado, mismo patrón que pulse + migration).
      try {
        const alphaResult: CalculateTrendGenomeBatchSummary =
          await calculateAllTrendGenomeForCDMXColonias({
            periodDate,
            supabase,
          });
        alphaZonesProcessed = alphaResult.zones_processed;
        alphasDetected = alphaResult.alphas_detected;
        alertsTriggered = alphaResult.alerts_triggered;
        alphaFailures = alphaResult.failures;
        alphaSourcesReal = alphaResult.sources_real;
        alphaSourcesStub = alphaResult.sources_stub;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({ stage: `${dispatched}:trend_genome`, message });
        console.error('[dmx-indices-master] trend_genome dispatch failed', {
          dispatched,
          message,
          error: err,
        });
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push({ stage: dispatched, message });
    // Fallback logging — reemplazar por Sentry.captureException cuando se adopte.
    console.error('[dmx-indices-master] dispatch failed', {
      dispatched,
      message,
      error: err,
    });
  }

  // BLOQUE 11.M — Genoma Colonias refresh (quarterly/annual).
  // Vibe tags heurísticos H1 + embeddings 64-dim pgvector. Idempotente
  // (skip si computed_at < 7d y features_version coincide). Falla NO
  // tumba dispatch (mismo patrón que pulse/migration/trend/streaks).
  if (dispatched === 'quarterly' || dispatched === 'annual') {
    try {
      const vibeResult = await batchComputeVibeTagsCDMX(supabase);
      genomeVibeProcessed = vibeResult.processed;
      genomeFailures += vibeResult.failed.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ stage: `${dispatched}:genome_vibe_tags`, message });
      console.error('[dmx-indices-master] genome vibe_tags dispatch failed', {
        dispatched,
        message,
        error: err,
      });
    }

    try {
      const embResult = await batchBuildAllCDMXEmbeddings(supabase);
      genomeEmbeddingsProcessed = embResult.processed;
      genomeEmbeddingsSkipped = embResult.skipped;
      genomeFailures += embResult.failed.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ stage: `${dispatched}:genome_embeddings`, message });
      console.error('[dmx-indices-master] genome embeddings dispatch failed', {
        dispatched,
        message,
        error: err,
      });
    }
  }

  // BLOQUE 11.N — Futures Curve refresh (monthly) + Pulse Pronóstico 30d (monthly).
  // Forward curve 3/6/12/24m con banda CI 95% sobre los 15 índices DMX × 200
  // colonias CDMX. Pulse forecast daily 30d por zona. Falla NO tumba dispatch.
  if (dispatched === 'monthly' || dispatched === 'quarterly' || dispatched === 'annual') {
    try {
      const curves = await batchCalculateForwardCurvesCDMX(supabase);
      forwardCurvesComputed = curves.curves_computed;
      forwardCurvesFailed = curves.failed;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ stage: `${dispatched}:forward_curves`, message });
      console.error('[dmx-indices-master] forward curves dispatch failed', {
        dispatched,
        message,
        error: err,
      });
    }

    try {
      const forecasts = await batchCalculatePulseForecastsCDMX(supabase);
      pulseForecastsComputed = forecasts.forecasts_computed;
      pulseForecastsFailed = forecasts.failed;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ stage: `${dispatched}:pulse_forecasts`, message });
      console.error('[dmx-indices-master] pulse forecasts dispatch failed', {
        dispatched,
        message,
        error: err,
      });
    }

    // BLOQUE 11.Q — Ghost Zones refresh (monthly/quarterly/annual).
    // Stub H1 hash-based (FNV-1a) idempotente sobre colonias CDMX con
    // DMX-LIV/INV/IAB disponibles. Falla NO tumba dispatch.
    try {
      const ghost = await buildAllCDMXGhostZones({ supabase, periodDate });
      ghostZonesProcessed = ghost.zones_processed;
      ghostZonesUpserted = ghost.rows_upserted;
      ghostZonesFailed = ghost.failures;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ stage: `${dispatched}:ghost_zones`, message });
      console.error('[dmx-indices-master] ghost zones dispatch failed', {
        dispatched,
        message,
        error: err,
      });
    }

    // BLOQUE 11.R — Zone Constellations edges + Louvain clusters.
    // Depende de migration_flow (11.G) + climate_twin (11.P) + genoma (11.M)
    // + pulse (11.F) del mismo dispatch — corre al final del bucket.
    try {
      const edgesResult = await buildAllConstellationEdges({ supabase, periodDate });
      constellationsProcessed = edgesResult.zones_processed;
      constellationsEdgesUpserted = edgesResult.edges_upserted;
      constellationsFailed = edgesResult.failures;

      try {
        const clustersResult = await buildClusters({ supabase, periodDate });
        constellationsClustersComputed = clustersResult.clusters_computed;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({ stage: `${dispatched}:constellations_clusters`, message });
        console.error('[dmx-indices-master] constellations clusters failed', {
          dispatched,
          message,
          error: err,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ stage: `${dispatched}:constellations`, message });
      console.error('[dmx-indices-master] constellations dispatch failed', {
        dispatched,
        message,
        error: err,
      });
    }

    // BLOQUE 11.P — Climate Twin ingestion + signature + twin refresh.
    // Corre monthly/quarterly/annual. Falla NO tumba dispatch.
    try {
      const ingest = await batchIngestMonthlyCDMX({ supabase, historyYears: 15, maxZones: 200 });
      climateZonesIngested = ingest.total_zones;
      climateRowsUpserted = ingest.total_rows_upserted;

      const { data: zonesWithClimate } = await supabase
        .from('climate_monthly_aggregates')
        .select('zone_id')
        .limit(5000);
      const climateZoneIds = Array.from(
        new Set(
          (zonesWithClimate ?? [])
            .map((r) => r.zone_id)
            .filter((x): x is string => typeof x === 'string'),
        ),
      );
      for (const zid of climateZoneIds) {
        try {
          const sig = await buildAndPersistSignatures({ zoneId: zid, supabase });
          if (sig.years_processed > 0) climateSignaturesBuilt += 1;
          const twins = await refreshTwinsForZone({ zoneId: zid, supabase });
          climateTwinsPersisted += twins.twins_persisted;
        } catch {
          climateFailed += 1;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ stage: `${dispatched}:climate_twin`, message });
      console.error('[dmx-indices-master] climate twin dispatch failed', {
        dispatched,
        message,
        error: err,
      });
    }
  }

  // BLOQUE 11.J.4 — Strava Segments streaks (monthly dispatch).
  // Corre ANTES del newsletter para que streaks_section lea el upsert fresh.
  // Falla NO tumba dispatch (mismo patrón que pulse/migration/trend).
  if (dispatched === 'monthly' || dispatched === 'quarterly' || dispatched === 'annual') {
    try {
      const streaksRows = await computeZoneStreaks({
        countryCode: 'MX',
        periodDate,
        supabase,
      });
      streaksComputed = streaksRows.length;
    } catch (err) {
      streaksFailed += 1;
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ stage: `${dispatched}:streaks`, message });
      console.error('[dmx-indices-master] streaks dispatch failed', {
        dispatched,
        message,
        error: err,
      });
    }
  }

  // BLOQUE 11.J — Newsletter mensual (monthly dispatch only).
  // Falla de newsletter NO tumba dispatch (try/catch aislado, mismo patrón).
  if (dispatched === 'monthly') {
    try {
      const newsletterResult = await sendMonthlyNewsletters({
        periodDate,
        countryCode: 'MX',
        supabase,
      });
      newsletterSent = newsletterResult.sent;
      newsletterFailed = newsletterResult.failed;
      newsletterSkipped = newsletterResult.skipped;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ stage: `${dispatched}:newsletter`, message });
      console.error('[dmx-indices-master] newsletter dispatch failed', {
        dispatched,
        message,
        error: err,
      });
    }
  }

  // BLOQUE 11.J.2 — DMX Wrapped anual (annual dispatch, 1 enero).
  // Genera snapshot anon nacional + envía notificación a subscribers.
  if (dispatched === 'annual') {
    try {
      const year = now.getUTCFullYear() - 1; // Wrapped del año anterior (se envía 1 enero).
      await buildAnonWrapped({ year, countryCode: 'MX', supabase });
      wrappedSnapshotsGenerated += 1;
      const wrappedResult = await sendWrappedAnnualNewsletters({
        year,
        countryCode: 'MX',
        supabase,
      });
      newsletterSent += wrappedResult.sent;
      newsletterFailed += wrappedResult.failed;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ stage: `${dispatched}:wrapped`, message });
      console.error('[dmx-indices-master] wrapped dispatch failed', {
        dispatched,
        message,
        error: err,
      });
    }
  }

  return NextResponse.json({
    dispatched,
    scopes_processed: scopesProcessed,
    indices_computed: indicesComputed,
    failures,
    pulse_scopes_processed: pulseScopesProcessed,
    pulse_computed: pulseComputed,
    pulse_failures: pulseFailures,
    flows_scopes_processed: migrationScopesProcessed,
    flows_upserted: migrationFlowsUpserted,
    flows_failures: migrationFailures,
    flows_sources_real: migrationSourcesReal,
    flows_sources_stub: migrationSourcesStub,
    alpha_zones_processed: alphaZonesProcessed,
    alphas_detected: alphasDetected,
    alerts_triggered: alertsTriggered,
    alpha_failures: alphaFailures,
    alpha_sources_real: alphaSourcesReal,
    alpha_sources_stub: alphaSourcesStub,
    newsletter_sent: newsletterSent,
    newsletter_failed: newsletterFailed,
    newsletter_skipped: newsletterSkipped,
    wrapped_snapshots_generated: wrappedSnapshotsGenerated,
    streaks_computed: streaksComputed,
    streaks_failed: streaksFailed,
    genome_vibe_processed: genomeVibeProcessed,
    genome_embeddings_processed: genomeEmbeddingsProcessed,
    genome_embeddings_skipped: genomeEmbeddingsSkipped,
    genome_failures: genomeFailures,
    forward_curves_computed: forwardCurvesComputed,
    forward_curves_failed: forwardCurvesFailed,
    pulse_forecasts_computed: pulseForecastsComputed,
    pulse_forecasts_failed: pulseForecastsFailed,
    climate_zones_ingested: climateZonesIngested,
    climate_rows_upserted: climateRowsUpserted,
    climate_signatures_built: climateSignaturesBuilt,
    climate_twins_persisted: climateTwinsPersisted,
    climate_failed: climateFailed,
    ghost_zones_processed: ghostZonesProcessed,
    ghost_zones_upserted: ghostZonesUpserted,
    ghost_zones_failed: ghostZonesFailed,
    constellations_processed: constellationsProcessed,
    constellations_edges_upserted: constellationsEdgesUpserted,
    constellations_clusters_computed: constellationsClustersComputed,
    constellations_failed: constellationsFailed,
    duration_ms: Date.now() - t0,
    errors,
    utc_timestamp: now.toISOString(),
  });
}
