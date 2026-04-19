import { type IngestDriver, registerDriver } from '../driver';
import { runIngest } from '../orchestrator';
import type { IngestCtx, IngestResult } from '../types';
import {
  type IngestAirroiMarketsOptions,
  type IngestAirroiMarketsStats,
  runAirroiMarketsIngest,
} from './airroi-markets';
import { SEED_MARKETS_MX } from './airroi-markets-seed';

// FASE 07b / BLOQUE 7b.A / MÓDULO 7b.A.2 — AirROI driver público.
//
// Sustituye al stub AirDNA original en la interfaz IngestDriver. Mantiene
// market_pulse como source agregador (compatibilidad FASE 07); los datos
// detallados viven en str_market_monthly_aggregates + str_* (7b.A.1).
//
// Refs:
//   docs/02_PLAN_MAESTRO/FASE_07b_STR_INTELLIGENCE_COMPLETE.md §7b.A.2
//   docs/01_DECISIONES_ARQUITECTONICAS/ADR-019_STR_MODULE_COMPLETE.md

export const AIRROI_SOURCE = 'airroi' as const;
export const AIRROI_FEATURE_FLAG = 'ingest.airroi.enabled';

export interface IngestAirroiJob {
  countryCode: string;
  triggeredBy?: string | null;
  markets?: IngestAirroiMarketsOptions['markets'];
  numMonths?: number;
  currency?: 'native' | 'usd';
}

// Runtime estimado del job: 15 markets default × $0.50 = $7.50 per run.
// El orchestrator hará preCheck contra api_budgets.airroi ($500/mo) antes
// de arrancar; cada call individual hará preCheck adicional en el client.
function estimateJobCostUsd(opts: IngestAirroiJob): number {
  const count = opts.markets?.length ?? SEED_MARKETS_MX.length;
  return count * 0.5;
}

export async function ingestAirroi(job: IngestAirroiJob): Promise<IngestResult> {
  const runOptions: IngestAirroiMarketsOptions = {
    ...(job.markets !== undefined ? { markets: job.markets } : {}),
    ...(job.numMonths !== undefined ? { numMonths: job.numMonths } : {}),
    ...(job.currency !== undefined ? { currency: job.currency } : {}),
  };

  return runIngest({
    source: AIRROI_SOURCE,
    countryCode: job.countryCode,
    triggeredBy: job.triggeredBy ?? null,
    estimatedCostUsd: estimateJobCostUsd(job),
    async run(ctx: IngestCtx) {
      return runAirroiMarketsIngest(ctx, runOptions);
    },
  });
}

export const airroiDriver: IngestDriver<IngestAirroiJob, IngestAirroiMarketsStats> = {
  source: AIRROI_SOURCE,
  category: 'market',
  defaultPeriodicity: 'monthly',
  async fetch(ctx, input) {
    const result = await runAirroiMarketsIngest(ctx, {
      ...(input.markets !== undefined ? { markets: input.markets } : {}),
      ...(input.numMonths !== undefined ? { numMonths: input.numMonths } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
    });
    return (
      result.rawPayload ?? {
        markets_upserted: 0,
        market_aggregates_upserted: 0,
        errors: [],
        per_market: [],
      }
    );
  },
  async parse(payload) {
    // runAirroiMarketsIngest ya persistió; el driver.parse devuelve un resumen
    // para compatibilidad con pipelines que esperan rows[]. No se vuelve a insertar.
    return payload.per_market as unknown as unknown[];
  },
  async upsert(_rows, _ctx): Promise<IngestResult> {
    // Noop: upsert ya ocurrió durante fetch(). Devuelve contadores neutros.
    return {
      rows_inserted: 0,
      rows_updated: 0,
      rows_skipped: 0,
      rows_dlq: 0,
      errors: [],
    };
  },
};

registerDriver(airroiDriver);
