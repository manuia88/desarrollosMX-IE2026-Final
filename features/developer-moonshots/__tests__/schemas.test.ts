import { describe, expect, it } from 'vitest';
import {
  apiKeyCreateInput,
  pipelineListInput,
  radarSubscribeInput,
  simulateProjectInput,
} from '../schemas';

describe('developer-moonshots schemas', () => {
  it('simulateProjectInput parses minimal payload', () => {
    const parsed = simulateProjectInput.parse({
      ubicacion: { ciudad: 'CDMX', colonia: 'Roma Norte' },
      tipologia: { tipo: 'vertical', unidades: 60, m2Promedio: 80 },
      pricing: { precioM2Mxn: 80_000 },
    });
    expect(parsed.ubicacion.countryCode).toBe('MX');
    expect(parsed.pricing.paymentSplit.enganche).toBe(0.2);
  });

  it('simulateProjectInput rejects unidades negativos', () => {
    const result = simulateProjectInput.safeParse({
      ubicacion: { ciudad: 'CDMX', colonia: 'X' },
      tipologia: { tipo: 'vertical', unidades: -1, m2Promedio: 80 },
      pricing: { precioM2Mxn: 50_000 },
    });
    expect(result.success).toBe(false);
  });

  it('radarSubscribeInput defaults channel email + threshold 10', () => {
    const parsed = radarSubscribeInput.parse({
      zoneId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(parsed.channel).toBe('email');
    expect(parsed.thresholdPct).toBe(10);
  });

  it('apiKeyCreateInput defaults scopes', () => {
    const parsed = apiKeyCreateInput.parse({ name: 'Test Key' });
    expect(parsed.scopes).toContain('scores:read');
    expect(parsed.scopes).toContain('alerts:read');
  });

  it('pipelineListInput clamps default range', () => {
    const parsed = pipelineListInput.parse({});
    expect(parsed.rangeFromDays).toBe(30);
  });
});
