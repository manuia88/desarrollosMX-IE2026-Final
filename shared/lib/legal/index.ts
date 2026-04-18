import { LEGAL_CONFIG_AR } from './ar';
import { LEGAL_CONFIG_BR } from './br';
import { LEGAL_CONFIG_CL } from './cl';
import { LEGAL_CONFIG_CO } from './co';
import { LEGAL_CONFIG_MX } from './mx';
import { LEGAL_CONFIG_US } from './us';

export const LEGAL_CONFIG = {
  MX: LEGAL_CONFIG_MX,
  CO: LEGAL_CONFIG_CO,
  AR: LEGAL_CONFIG_AR,
  BR: LEGAL_CONFIG_BR,
  CL: LEGAL_CONFIG_CL,
  US: LEGAL_CONFIG_US,
} as const;

export type LegalCountry = keyof typeof LEGAL_CONFIG;
export type LegalConfig = (typeof LEGAL_CONFIG)[LegalCountry];

export function getLegalConfig(country: string): LegalConfig | null {
  return (LEGAL_CONFIG as Record<string, LegalConfig>)[country] ?? null;
}
