// Registro + helpers del feature indices-publicos.
// Los contratos cross-feature (INDEX_CODES, IndexCode, SCOPE_TYPES, ScopeType)
// viven en `@/shared/types/scores` desde BATCH 3 pre-Opción D (REFACTOR-001).

import { INDEX_CODES, type IndexCode, SCOPE_TYPES, type ScopeType } from '@/shared/types/scores';

export const PERIOD_TYPES = ['monthly', 'quarterly', 'annual'] as const;
export type PeriodType = (typeof PERIOD_TYPES)[number];

export const COUNTRY_CODES = ['MX', 'CO', 'AR', 'BR', 'US'] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export const CONFIDENCE_LEVELS = ['high', 'medium', 'low', 'insufficient_data'] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const SCORE_BANDS = ['excelente', 'bueno', 'regular', 'bajo'] as const;
export type ScoreBand = (typeof SCORE_BANDS)[number];

export const TREND_DIRECTIONS = ['mejorando', 'estable', 'empeorando'] as const;
export type TrendDirection = (typeof TREND_DIRECTIONS)[number];

export interface IndexDefinition {
  readonly code: IndexCode;
  readonly i18nNameKey: string;
  readonly i18nShortKey: string;
  readonly i18nTaglineKey: string;
  readonly tone: 'primary' | 'warm' | 'cool' | 'fresh' | 'sunset' | 'iridescent';
}

export const INDEX_REGISTRY: Record<IndexCode, IndexDefinition> = {
  IPV: {
    code: 'IPV',
    i18nNameKey: 'indices.IPV.name',
    i18nShortKey: 'indices.IPV.short',
    i18nTaglineKey: 'indices.IPV.tagline',
    tone: 'primary',
  },
  IAB: {
    code: 'IAB',
    i18nNameKey: 'indices.IAB.name',
    i18nShortKey: 'indices.IAB.short',
    i18nTaglineKey: 'indices.IAB.tagline',
    tone: 'cool',
  },
  IDS: {
    code: 'IDS',
    i18nNameKey: 'indices.IDS.name',
    i18nShortKey: 'indices.IDS.short',
    i18nTaglineKey: 'indices.IDS.tagline',
    tone: 'fresh',
  },
  IRE: {
    code: 'IRE',
    i18nNameKey: 'indices.IRE.name',
    i18nShortKey: 'indices.IRE.short',
    i18nTaglineKey: 'indices.IRE.tagline',
    tone: 'warm',
  },
  ICO: {
    code: 'ICO',
    i18nNameKey: 'indices.ICO.name',
    i18nShortKey: 'indices.ICO.short',
    i18nTaglineKey: 'indices.ICO.tagline',
    tone: 'sunset',
  },
  MOM: {
    code: 'MOM',
    i18nNameKey: 'indices.MOM.name',
    i18nShortKey: 'indices.MOM.short',
    i18nTaglineKey: 'indices.MOM.tagline',
    tone: 'iridescent',
  },
  LIV: {
    code: 'LIV',
    i18nNameKey: 'indices.LIV.name',
    i18nShortKey: 'indices.LIV.short',
    i18nTaglineKey: 'indices.LIV.tagline',
    tone: 'fresh',
  },
  FAM: {
    code: 'FAM',
    i18nNameKey: 'indices.FAM.name',
    i18nShortKey: 'indices.FAM.short',
    i18nTaglineKey: 'indices.FAM.tagline',
    tone: 'warm',
  },
  YNG: {
    code: 'YNG',
    i18nNameKey: 'indices.YNG.name',
    i18nShortKey: 'indices.YNG.short',
    i18nTaglineKey: 'indices.YNG.tagline',
    tone: 'iridescent',
  },
  GRN: {
    code: 'GRN',
    i18nNameKey: 'indices.GRN.name',
    i18nShortKey: 'indices.GRN.short',
    i18nTaglineKey: 'indices.GRN.tagline',
    tone: 'fresh',
  },
  STR: {
    code: 'STR',
    i18nNameKey: 'indices.STR.name',
    i18nShortKey: 'indices.STR.short',
    i18nTaglineKey: 'indices.STR.tagline',
    tone: 'sunset',
  },
  INV: {
    code: 'INV',
    i18nNameKey: 'indices.INV.name',
    i18nShortKey: 'indices.INV.short',
    i18nTaglineKey: 'indices.INV.tagline',
    tone: 'primary',
  },
  DEV: {
    code: 'DEV',
    i18nNameKey: 'indices.DEV.name',
    i18nShortKey: 'indices.DEV.short',
    i18nTaglineKey: 'indices.DEV.tagline',
    tone: 'cool',
  },
  GNT: {
    code: 'GNT',
    i18nNameKey: 'indices.GNT.name',
    i18nShortKey: 'indices.GNT.short',
    i18nTaglineKey: 'indices.GNT.tagline',
    tone: 'warm',
  },
  STA: {
    code: 'STA',
    i18nNameKey: 'indices.STA.name',
    i18nShortKey: 'indices.STA.short',
    i18nTaglineKey: 'indices.STA.tagline',
    tone: 'cool',
  },
};

export function isIndexCode(value: string): value is IndexCode {
  return (INDEX_CODES as readonly string[]).includes(value);
}

export function isScopeType(value: string): value is ScopeType {
  return (SCOPE_TYPES as readonly string[]).includes(value);
}

export function isPeriodType(value: string): value is PeriodType {
  return (PERIOD_TYPES as readonly string[]).includes(value);
}

export function isCountryCode(value: string): value is CountryCode {
  return (COUNTRY_CODES as readonly string[]).includes(value);
}

export function resolveScoreBand(value: number): ScoreBand {
  if (value >= 80) return 'excelente';
  if (value >= 60) return 'bueno';
  if (value >= 40) return 'regular';
  return 'bajo';
}

export function bandToLabelPillTone(
  band: ScoreBand,
): 'primary' | 'warm' | 'cool' | 'fresh' | 'sunset' | 'iridescent' {
  switch (band) {
    case 'excelente':
      return 'fresh';
    case 'bueno':
      return 'cool';
    case 'regular':
      return 'warm';
    case 'bajo':
      return 'sunset';
  }
}

export function trendToArrow(direction: TrendDirection | null | undefined): '↑' | '↓' | '→' {
  if (direction === 'mejorando') return '↑';
  if (direction === 'empeorando') return '↓';
  return '→';
}
