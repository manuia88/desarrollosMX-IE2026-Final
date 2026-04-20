import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hashUserIdForTelemetry } from '../hash-user-id';

describe('hashUserIdForTelemetry', () => {
  const originalSalt = process.env.TELEMETRY_SALT;

  beforeEach(() => {
    process.env.TELEMETRY_SALT = 'test-salt-fixed';
  });

  afterEach(() => {
    if (originalSalt === undefined) delete process.env.TELEMETRY_SALT;
    else process.env.TELEMETRY_SALT = originalSalt;
  });

  it('retorna 12 chars hex', () => {
    const hash = hashUserIdForTelemetry('user-abc-123');
    expect(hash).toMatch(/^[0-9a-f]{12}$/);
  });

  it('mismo user_id + mismo salt → mismo hash (determinismo)', () => {
    const h1 = hashUserIdForTelemetry('user-xyz');
    const h2 = hashUserIdForTelemetry('user-xyz');
    expect(h1).toBe(h2);
  });

  it('diferentes user_ids → diferentes hashes', () => {
    const h1 = hashUserIdForTelemetry('user-a');
    const h2 = hashUserIdForTelemetry('user-b');
    const h3 = hashUserIdForTelemetry('user-c');
    expect(h1).not.toBe(h2);
    expect(h2).not.toBe(h3);
    expect(h1).not.toBe(h3);
  });

  it('mismo user_id + salt diferente → hash diferente', () => {
    process.env.TELEMETRY_SALT = 'salt-alpha';
    const h1 = hashUserIdForTelemetry('user-test');
    process.env.TELEMETRY_SALT = 'salt-beta';
    const h2 = hashUserIdForTelemetry('user-test');
    expect(h1).not.toBe(h2);
  });

  it('usa fallback si TELEMETRY_SALT no está set', () => {
    delete process.env.TELEMETRY_SALT;
    const hash = hashUserIdForTelemetry('user-no-salt');
    expect(hash).toMatch(/^[0-9a-f]{12}$/);
    // Debe ser diferente al hash con salt de test.
    process.env.TELEMETRY_SALT = 'test-salt-fixed';
    const hashWithSalt = hashUserIdForTelemetry('user-no-salt');
    expect(hash).not.toBe(hashWithSalt);
  });
});
