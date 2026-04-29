import type {
  QualityScoreResult,
  ValidationRecord,
  ValidationSeverity,
} from '../schemas/validation';

export interface QualityScoreInput {
  readonly severity: ValidationSeverity;
  readonly resolved_at: string | null;
}

function isUnresolved(v: QualityScoreInput): boolean {
  return v.resolved_at === null;
}

export function computeQualityScore(
  validations: ReadonlyArray<QualityScoreInput>,
): QualityScoreResult {
  const unresolved = validations.filter(isUnresolved);
  const critical = unresolved.filter((v) => v.severity === 'critical').length;
  const error = unresolved.filter((v) => v.severity === 'error').length;
  const warning = unresolved.filter((v) => v.severity === 'warning').length;

  if (critical > 0) return { score: 'red', numeric: 0 };
  if (error > 0) return { score: 'amber', numeric: Math.max(40, 60 - error * 5) };
  if (warning > 0) return { score: 'amber', numeric: Math.max(70, 90 - warning * 2) };
  return { score: 'green', numeric: 100 };
}

export function computeQualityScoreFromRecords(
  validations: ReadonlyArray<ValidationRecord>,
): QualityScoreResult {
  return computeQualityScore(
    validations.map((v) => ({ severity: v.severity, resolved_at: v.resolved_at })),
  );
}
