import { describe, expect, it } from 'vitest';
import { recordVideoSaleAsOperacion } from '../index';

describe('photographer-clients-cross-feature', () => {
  describe('recordVideoSaleAsOperacion (STUB ADR-018)', () => {
    it('returns NOT_IMPLEMENTED_H2 reason', async () => {
      const result = await recordVideoSaleAsOperacion({
        photographerId: 'photog-1',
        clientId: 'client-1',
        videoId: 'video-1',
        amount: 100,
        currency: 'USD',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('NOT_IMPLEMENTED_H2');
      }
    });
  });

  it('exports fetchLeadsForPhotographer function', async () => {
    const { fetchLeadsForPhotographer } = await import('../index');
    expect(typeof fetchLeadsForPhotographer).toBe('function');
  });

  it('exports importLeadsAsPhotographerClients function', async () => {
    const { importLeadsAsPhotographerClients } = await import('../index');
    expect(typeof importLeadsAsPhotographerClients).toBe('function');
  });
});
