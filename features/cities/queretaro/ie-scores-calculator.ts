// ADR-059 — Querétaro city expansion (FASE 14.1) — Paso 3: IE scores synthetic per zone.
// Calcula 4 scores (pulse, futures, ghost, alpha) con provenance.is_synthetic=true
// hasta que ingestion sources reales lleguen H2.
// Determinístico: mismo zone scopeId → mismo score (hash-based) — reproducibility QA.

import { QRO_ZONES_CANON } from './data-loader';
import type { QroIEScore, QroScoreProvenance, QroScoreType, QroZoneScopeId } from './types';

const QRO_RANGES: Record<QroScoreType, { readonly min: number; readonly max: number }> = {
  pulse: { min: 78, max: 93 },
  futures: { min: 70, max: 88 },
  ghost: { min: 5, max: 22 },
  alpha: { min: 62, max: 82 },
};

const QRO_PROVENANCE: QroScoreProvenance = {
  is_synthetic: true,
  adr: 'ADR-059',
  source: 'fase-14.1-expansion',
  note: 'Querétaro emerging hub — synthetic scores until ingestion sources real H2.',
};

export function calculateQueretaroIEScores(): ReadonlyArray<QroIEScore> {
  const scores: QroIEScore[] = [];
  for (const zone of QRO_ZONES_CANON) {
    for (const scoreType of Object.keys(QRO_RANGES) as ReadonlyArray<QroScoreType>) {
      scores.push({
        scopeId: zone.scopeId,
        scoreType,
        scoreValue: deterministicScore(zone.scopeId, scoreType),
        provenance: QRO_PROVENANCE,
      });
    }
  }
  return scores;
}

export function getQueretaroScoreRange(scoreType: QroScoreType): {
  readonly min: number;
  readonly max: number;
} {
  return QRO_RANGES[scoreType];
}

function deterministicScore(scopeId: QroZoneScopeId, scoreType: QroScoreType): number {
  const range = QRO_RANGES[scoreType];
  const seed = hashString(`${scopeId}:${scoreType}`);
  const span = range.max - range.min;
  const value = range.min + (seed % (span + 1));
  return value;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}
