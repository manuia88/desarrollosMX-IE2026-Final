// Public API del módulo de ingesta. Cada ingestor importa desde aquí.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.B
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-012_SCRAPING_POLICY.md

export type { AllowedSource } from './allowlist';
export {
  ALLOWED_SOURCES,
  assertAllowedSource,
  assertAllowedUrl,
  isAllowedSource,
} from './allowlist';
export {
  checkCircuit,
  recordFailure as recordCircuitFailure,
  recordSuccess as recordCircuitSuccess,
  resetCircuit,
} from './circuit-breaker';
export type { SpanCtx } from './correlation';
export { correlationHeaders, newCorrelationId, startIngestSpan } from './correlation';
export type { BudgetCheckResult } from './cost-tracker';
export { preCheckBudget, recordSpend } from './cost-tracker';
export type { DlqEntry } from './dlq';
export { pushDlq, pushDlqBatch } from './dlq';
export { geomToH3R8, geomToH3R9, pointToH3R8 } from './h3';
export type { LineageEntry } from './lineage';
export { recordLineage } from './lineage';
export type { RunIngestOptions } from './orchestrator';
export { runIngest } from './orchestrator';
export {
  duplicateDetectionGate,
  geoValidityGateMx,
  outlierFlagGate,
  rowCountSanityGate,
  runQualityGates,
} from './quality-gates';
export { loadRawPayload, saveRawPayload } from './replay';
export type { RetryOptions } from './retry';
export { exponentialBackoff, sleep, withRetry } from './retry';
export { applySample, getDefaultSamplePercentage } from './sampler';
export type {
  IngestCtx,
  IngestJob,
  IngestResult,
  IngestSource,
  IngestStatus,
  QualityGate,
  QualityGateResult,
} from './types';
export {
  BudgetExceededError,
  CircuitOpenError,
  SourceNotAllowedError,
} from './types';
export type { Watermark } from './watermarks';
export { bumpWatermark, getWatermark } from './watermarks';
