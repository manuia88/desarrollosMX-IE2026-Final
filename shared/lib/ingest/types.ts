import type { Database } from '@/shared/types/database';

export type IngestSource = string;

export type IngestStatus = Database['public']['Tables']['ingest_runs']['Row']['status'];

export interface IngestCtx {
  runId: string;
  source: IngestSource;
  countryCode: string;
  samplePercentage: number;
  triggeredBy: string | null;
  startedAt: Date;
}

export interface IngestResult {
  rows_inserted: number;
  rows_updated: number;
  rows_skipped: number;
  rows_dlq: number;
  cost_estimated_usd?: number | undefined;
  raw_payload_url?: string | undefined;
  errors: string[];
  meta?: Record<string, unknown> | undefined;
}

export interface IngestJob<T = unknown> {
  source: IngestSource;
  countryCode: string;
  samplePercentage?: number | undefined;
  triggeredBy?: string | null | undefined;
  estimatedCostUsd?: number | undefined;
  run: (ctx: IngestCtx) => Promise<IngestResult & { rawPayload?: T | undefined }>;
}

export interface QualityGateResult {
  ok: boolean;
  reason?: string;
  meta?: Record<string, unknown>;
}

export interface QualityGate<TRow = unknown> {
  name: string;
  check: (rows: TRow[], ctx: IngestCtx) => Promise<QualityGateResult> | QualityGateResult;
}

export class BudgetExceededError extends Error {
  readonly code = 'budget_exceeded' as const;
  constructor(
    public readonly source: string,
    public readonly spentUsd: number,
    public readonly budgetUsd: number,
  ) {
    super(`budget exceeded for ${source}: spent ${spentUsd} of ${budgetUsd} USD/month`);
    this.name = 'BudgetExceededError';
  }
}

export class SourceNotAllowedError extends Error {
  readonly code = 'source_not_allowed' as const;
  constructor(public readonly source: string) {
    super(
      `source_not_allowed: ${source}. Habi y scraping server-side de portales (ADR-010 §D10 + ADR-012) están explícitamente prohibidos.`,
    );
    this.name = 'SourceNotAllowedError';
  }
}

export class CircuitOpenError extends Error {
  readonly code = 'circuit_open' as const;
  constructor(
    public readonly source: string,
    public readonly retryAfterMs: number,
  ) {
    super(`circuit open for ${source}, retry after ${retryAfterMs}ms`);
    this.name = 'CircuitOpenError';
  }
}
