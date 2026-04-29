export type UpgDisclosure = 'observed' | 'synthetic' | 'mixed';

export interface UpgEngineEnvelope<T> {
  readonly result: T;
  readonly disclosure: UpgDisclosure;
  readonly confidence: 'high' | 'medium' | 'low' | 'insufficient_data';
  readonly missing: readonly string[];
}
