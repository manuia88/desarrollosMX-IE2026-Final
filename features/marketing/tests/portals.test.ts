import { afterEach, describe, expect, it, vi } from 'vitest';
import { easybrokerAdapter } from '../lib/portals/easybroker';
import { getPortalAdapter } from '../lib/portals/index';
import { inmuebles24Adapter } from '../lib/portals/inmuebles24';
import {
  facebookMarketplaceAdapter,
  icasasAdapter,
  mercadolibreAdapter,
  propiedadesComAdapter,
  vivanunciosAdapter,
} from '../lib/portals/stub-adapter';
import type { ProjectData } from '../lib/portals/types';

const sampleProject: ProjectData = {
  id: '11111111-1111-4111-8111-111111111111',
  nombre: 'Torre Nápoles',
  description: 'Departamentos premium en Roma Norte',
  country_code: 'MX',
  ciudad: 'CDMX',
  colonia: 'Roma Norte',
  units_total: 24,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('portal adapter registry', () => {
  it('returns adapter for every PortalName', () => {
    const portals = [
      'inmuebles24',
      'easybroker',
      'mercadolibre',
      'vivanuncios',
      'icasas',
      'propiedades_com',
      'facebook_marketplace',
    ] as const;
    for (const p of portals) {
      const adapter = getPortalAdapter(p);
      expect(adapter.portal).toBe(p);
      expect(['real', 'stub']).toContain(adapter.status);
    }
  });

  it('inmuebles24 + easybroker are status real, others stub', () => {
    expect(inmuebles24Adapter.status).toBe('real');
    expect(easybrokerAdapter.status).toBe('real');
    expect(mercadolibreAdapter.status).toBe('stub');
    expect(vivanunciosAdapter.status).toBe('stub');
    expect(icasasAdapter.status).toBe('stub');
    expect(propiedadesComAdapter.status).toBe('stub');
    expect(facebookMarketplaceAdapter.status).toBe('stub');
  });
});

describe('inmuebles24 adapter', () => {
  it('validateCredentials rejects missing api_key', async () => {
    const r = await inmuebles24Adapter.validateCredentials({});
    expect(r.valid).toBe(false);
  });

  it('validateCredentials accepts non-empty api_key', async () => {
    const r = await inmuebles24Adapter.validateCredentials({ api_key: 'a-very-long-api-key' });
    expect(r.valid).toBe(true);
  });

  it('publish posts to API and returns externalId', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'ext-abc-123',
          url: 'https://www.inmuebles24.com.mx/listing/ext-abc-123',
        }),
        {
          status: 200,
        },
      ),
    );
    const result = await inmuebles24Adapter.publish({
      project: sampleProject,
      credentials: { api_key: 'longapikey1234' },
    });
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(result.externalId).toBe('ext-abc-123');
    expect(result.url).toContain('inmuebles24');
  });

  it('publish throws on non-2xx', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('error', { status: 500 }));
    await expect(
      inmuebles24Adapter.publish({
        project: sampleProject,
        credentials: { api_key: 'longapikey1234' },
      }),
    ).rejects.toThrow(/status=500/);
  });

  it('parseLeadWebhook extracts contact + projectId', () => {
    const lead = inmuebles24Adapter.parseLeadWebhook({
      lead: {
        name: 'Juan Lopez',
        phone: '5555551234',
        email: 'juan@example.com',
        external_id: 'ext-abc-123',
        message: 'Me interesa',
      },
    });
    expect(lead.contactName).toBe('Juan Lopez');
    expect(lead.phone).toBe('5555551234');
    expect(lead.email).toBe('juan@example.com');
    expect(lead.projectId).toBe('ext-abc-123');
    expect(lead.message).toBe('Me interesa');
  });

  it('parseLeadWebhook returns empty for invalid payload', () => {
    expect(inmuebles24Adapter.parseLeadWebhook(null)).toEqual({});
    expect(inmuebles24Adapter.parseLeadWebhook('string')).toEqual({});
  });
});

describe('easybroker adapter', () => {
  it('validateCredentials accepts valid api_key', async () => {
    const r = await easybrokerAdapter.validateCredentials({ api_key: 'mySecretApiKey1234' });
    expect(r.valid).toBe(true);
  });

  it('publish maps fields and returns public_id', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          public_id: 'EB-public-123',
          public_url: 'https://www.easybroker.com/properties/EB-public-123',
        }),
        { status: 200 },
      ),
    );
    const result = await easybrokerAdapter.publish({
      project: sampleProject,
      credentials: { api_key: 'mySecretApiKey1234' },
    });
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(result.externalId).toBe('EB-public-123');
  });

  it('parseLeadWebhook extracts contact + property_id', () => {
    const lead = easybrokerAdapter.parseLeadWebhook({
      contact: { name: 'Maria', phone: '5551112222', email: 'm@x.com' },
      property_id: 'EB-public-123',
      message: 'Quiero info',
    });
    expect(lead.contactName).toBe('Maria');
    expect(lead.projectId).toBe('EB-public-123');
  });
});

describe('stub adapters (5 portales H2)', () => {
  it('publish throws NOT_IMPLEMENTED', async () => {
    for (const adapter of [
      mercadolibreAdapter,
      vivanunciosAdapter,
      icasasAdapter,
      propiedadesComAdapter,
      facebookMarketplaceAdapter,
    ]) {
      await expect(
        adapter.publish({
          project: sampleProject,
          credentials: { api_key: 'whatever' },
        }),
      ).rejects.toThrow();
    }
  });

  it('validateCredentials passes with any non-empty credentials', async () => {
    const r = await mercadolibreAdapter.validateCredentials({ api_key: 'x' });
    expect(r.valid).toBe(true);
  });

  it('parseLeadWebhook returns empty (not yet wired)', () => {
    expect(mercadolibreAdapter.parseLeadWebhook({ name: 'a' })).toEqual({});
  });
});
