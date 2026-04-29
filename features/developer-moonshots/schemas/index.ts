import { z } from 'zod';

// ────────────────────────────────────────────────────────────────────
// 15.X.1 Simulator
// ────────────────────────────────────────────────────────────────────

export const simulatorUbicacionInput = z.object({
  zoneId: z.string().uuid().optional(),
  ciudad: z.string().min(2).max(120),
  colonia: z.string().min(2).max(120),
  countryCode: z.string().length(2).default('MX'),
});
export type SimulatorUbicacionInput = z.infer<typeof simulatorUbicacionInput>;

export const simulatorTipologiaInput = z.object({
  tipo: z.enum(['vertical', 'horizontal', 'mixto']),
  unidades: z.number().int().min(1).max(2000),
  m2Promedio: z.number().min(20).max(2000),
  amenidades: z.array(z.string()).default([]),
});
export type SimulatorTipologiaInput = z.infer<typeof simulatorTipologiaInput>;

export const simulatorPricingInput = z.object({
  precioM2Mxn: z.number().min(1000).max(500_000),
  paymentSplit: z
    .object({
      enganche: z.number().min(0).max(1).default(0.2),
      mensualidades: z.number().int().min(0).max(60).default(24),
      contraEntrega: z.number().min(0).max(1).default(0.6),
    })
    .default({ enganche: 0.2, mensualidades: 24, contraEntrega: 0.6 }),
  costoConstruccionM2Mxn: z.number().min(1000).max(200_000).default(18_000),
  costoTerrenoMxn: z.number().min(0).default(0),
  gastosFijosMxn: z.number().min(0).default(150_000),
});
export type SimulatorPricingInput = z.infer<typeof simulatorPricingInput>;

export const simulateProjectInput = z.object({
  ubicacion: simulatorUbicacionInput,
  tipologia: simulatorTipologiaInput,
  pricing: simulatorPricingInput,
});
export type SimulateProjectInput = z.infer<typeof simulateProjectInput>;

export const listSimulatorRunsInput = z
  .object({
    limit: z.number().int().min(1).max(100).default(20),
  })
  .optional()
  .default({ limit: 20 });
export type ListSimulatorRunsInput = z.infer<typeof listSimulatorRunsInput>;

// ────────────────────────────────────────────────────────────────────
// 15.X.2 Radar Trend Genome (zone alerts)
// ────────────────────────────────────────────────────────────────────

export const radarSubscribeInput = z.object({
  zoneId: z.string().uuid(),
  channel: z.enum(['email', 'webhook', 'sms']).default('email'),
  thresholdPct: z.number().min(0).max(100).default(10),
});
export type RadarSubscribeInput = z.infer<typeof radarSubscribeInput>;

export const radarUnsubscribeInput = z.object({
  subscriptionId: z.string().uuid(),
});
export type RadarUnsubscribeInput = z.infer<typeof radarUnsubscribeInput>;

export const radarListAlertsInput = z
  .object({
    limit: z.number().int().min(1).max(200).default(50),
  })
  .optional()
  .default({ limit: 50 });
export type RadarListAlertsInput = z.infer<typeof radarListAlertsInput>;

// ────────────────────────────────────────────────────────────────────
// 15.X.3 Committee Report
// ────────────────────────────────────────────────────────────────────

export const generateCommitteeReportInput = z.object({
  proyectoId: z.string().uuid().optional(),
  feasibilityId: z.string().uuid().optional(),
  simulatorRunId: z.string().uuid().optional(),
  thesisSummary: z.string().min(10).max(2000),
});
export type GenerateCommitteeReportInput = z.infer<typeof generateCommitteeReportInput>;

export const listCommitteeReportsInput = z
  .object({
    limit: z.number().int().min(1).max(50).default(20),
  })
  .optional()
  .default({ limit: 20 });
export type ListCommitteeReportsInput = z.infer<typeof listCommitteeReportsInput>;

// ────────────────────────────────────────────────────────────────────
// 15.X.4 Pipeline Tracker
// ────────────────────────────────────────────────────────────────────

export const pipelineListInput = z
  .object({
    rangeFromDays: z.number().int().min(7).max(365).default(30),
  })
  .optional()
  .default({ rangeFromDays: 30 });
export type PipelineListInput = z.infer<typeof pipelineListInput>;

// ────────────────────────────────────────────────────────────────────
// 15.X.5 API Keys
// ────────────────────────────────────────────────────────────────────

export const apiKeyCreateInput = z.object({
  name: z.string().min(3).max(80),
  scopes: z
    .array(z.enum(['scores:read', 'pipeline:read', 'simulate:write', 'alerts:read']))
    .default(['scores:read', 'pipeline:read', 'alerts:read']),
  expiresAtIso: z.string().datetime().optional(),
});
export type ApiKeyCreateInput = z.infer<typeof apiKeyCreateInput>;

export const apiKeyRevokeInput = z.object({
  keyId: z.string().uuid(),
});
export type ApiKeyRevokeInput = z.infer<typeof apiKeyRevokeInput>;

export const apiKeyListInput = z.object({}).optional().default({});
export type ApiKeyListInput = z.infer<typeof apiKeyListInput>;

// ────────────────────────────────────────────────────────────────────
// Output shapes
// ────────────────────────────────────────────────────────────────────

export type SimulatorOutput = {
  runId: string;
  outputs: {
    absorcionMeses: number | null;
    revenueMxn: number;
    costMxn: number;
    irr: number | null;
    npvMxn: number;
    breakEvenMonth: number | null;
    pmfScore: number;
    sensitivity: {
      absorcionMinus20: number | null;
      absorcionMinus10: number | null;
      absorcionPlus10: number | null;
      absorcionPlus20: number | null;
      irrMinus20: number | null;
      irrPlus20: number | null;
    };
    riskFlags: ReadonlyArray<string>;
    indicesUsed: ReadonlyArray<{ code: string; value: number; confidence: string }>;
  };
  costUsd: number;
  durationMs: number;
};

export type CommitteeReportOutput = {
  reportId: string;
  pdfUrl: string | null;
  thesisSummary: string;
  sectionsCount: number;
  citationsCount: number;
  costUsd: number;
  durationMs: number;
};

export type PipelineSnapshotRow = {
  proyectoId: string;
  proyectoNombre: string;
  zoneId: string | null;
  status: string | null;
  avanceObraPct: number | null;
  absorcionActual: number | null;
  absorcionBenchmark: number | null;
  absorcionDeltaPct: number | null;
  precioM2Mxn: number | null;
  precioM2ZoneMedian: number | null;
  precioDeltaPct: number | null;
  dmxScore: number | null;
  trustScore: number | null;
  alerts: ReadonlyArray<{
    type: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
  }>;
  snapshotDate: string;
};

export type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ReadonlyArray<string>;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
};

export type ApiKeyCreated = ApiKeyRow & { plaintextKey: string };
