import type { SemaforoTier } from '@/features/estadisticas/schemas';

export type KpiKey =
  | 'pendingInquiries'
  | 'firstResponseTime'
  | 'avgResponseTime'
  | 'interactionsVolume'
  | 'avgSuggestions'
  | 'visitRate'
  | 'offerRate'
  | 'inventoryActivePct'
  | 'inventoryTotal'
  | 'acmsGenerated'
  | 'capturesNew';

type ThresholdLowerIsBetter = {
  readonly key: KpiKey;
  readonly direction: 'lower-is-better';
  readonly green: { readonly lt: number };
  readonly yellow: { readonly gte: number; readonly lt: number };
};

type ThresholdHigherIsBetter = {
  readonly key: KpiKey;
  readonly direction: 'higher-is-better';
  readonly green: { readonly gte: number };
  readonly yellow?: { readonly gte: number; readonly lt: number };
};

export type Threshold = ThresholdLowerIsBetter | ThresholdHigherIsBetter;

export const KPI_THRESHOLDS: Readonly<Record<KpiKey, Threshold>> = {
  pendingInquiries: {
    key: 'pendingInquiries',
    direction: 'lower-is-better',
    green: { lt: 15 },
    yellow: { gte: 15, lt: 60 },
  },
  firstResponseTime: {
    key: 'firstResponseTime',
    direction: 'lower-is-better',
    green: { lt: 15 },
    yellow: { gte: 15, lt: 60 },
  },
  avgResponseTime: {
    key: 'avgResponseTime',
    direction: 'lower-is-better',
    green: { lt: 15 },
    yellow: { gte: 15, lt: 60 },
  },
  interactionsVolume: {
    key: 'interactionsVolume',
    direction: 'higher-is-better',
    green: { gte: 3 },
  },
  avgSuggestions: {
    key: 'avgSuggestions',
    direction: 'higher-is-better',
    green: { gte: 15 },
    yellow: { gte: 10, lt: 15 },
  },
  visitRate: {
    key: 'visitRate',
    direction: 'higher-is-better',
    green: { gte: 75 },
    yellow: { gte: 50, lt: 75 },
  },
  offerRate: {
    key: 'offerRate',
    direction: 'higher-is-better',
    green: { gte: 70 },
    yellow: { gte: 50, lt: 70 },
  },
  inventoryActivePct: {
    key: 'inventoryActivePct',
    direction: 'higher-is-better',
    green: { gte: 30 },
    yellow: { gte: 20, lt: 30 },
  },
  inventoryTotal: {
    key: 'inventoryTotal',
    direction: 'higher-is-better',
    green: { gte: 3 },
  },
  acmsGenerated: {
    key: 'acmsGenerated',
    direction: 'higher-is-better',
    green: { gte: 1 },
  },
  capturesNew: {
    key: 'capturesNew',
    direction: 'higher-is-better',
    green: { gte: 1 },
  },
};

export function tierForValue(key: KpiKey, value: number | null): SemaforoTier {
  if (value === null || Number.isNaN(value)) return 'red';
  const t = KPI_THRESHOLDS[key];
  if (t.direction === 'lower-is-better') {
    if (value < t.green.lt) return 'green';
    if (value < t.yellow.lt) return 'yellow';
    return 'red';
  }
  if (value >= t.green.gte) return 'green';
  if (t.yellow && value >= t.yellow.gte) return 'yellow';
  return 'red';
}

export const SLA_FIRST_RESPONSE_MIN = 60;
export const SLA_AVG_RESPONSE_MIN = 120;
