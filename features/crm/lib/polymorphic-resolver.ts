import type { ReferralSourceType, ReferralTargetType } from '@/features/crm/schemas';

const VALID_SOURCE_TYPES: ReadonlyArray<ReferralSourceType> = ['user', 'developer', 'deal'];
const VALID_TARGET_TYPES: ReadonlyArray<ReferralTargetType> = ['user', 'deal', 'operacion'];

export function isValidSourceType(value: string): value is ReferralSourceType {
  return (VALID_SOURCE_TYPES as ReadonlyArray<string>).includes(value);
}

export function isValidTargetType(value: string): value is ReferralTargetType {
  return (VALID_TARGET_TYPES as ReadonlyArray<string>).includes(value);
}

export function isSelfReferral(args: {
  source_type: ReferralSourceType;
  source_id: string;
  target_type: ReferralTargetType;
  target_id: string;
}): boolean {
  return args.source_type === args.target_type && args.source_id === args.target_id;
}
