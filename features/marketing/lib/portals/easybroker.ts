import { TRPCError } from '@trpc/server';
import type {
  IPortalAdapter,
  ParsedLead,
  PublishArgs,
  PublishResult,
  ValidationResult,
} from './types';

const API_BASE = 'https://api.easybroker.com/v1';

export const easybrokerAdapter: IPortalAdapter = {
  portal: 'easybroker',
  status: 'real',

  async validateCredentials(credentials): Promise<ValidationResult> {
    const apiKey = credentials.api_key ?? credentials.apiKey;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
      return { valid: false, error: 'EasyBroker requires non-empty api_key.' };
    }
    return { valid: true };
  },

  async publish({ project, credentials }: PublishArgs): Promise<PublishResult> {
    const apiKey = credentials.api_key ?? credentials.apiKey;
    if (!apiKey) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'EasyBroker api_key missing.' });
    }

    const payload = {
      title: project.nombre ?? 'Propiedad sin título',
      description: project.description ?? '',
      property_type: 'Departamento',
      status: 'available',
      operations: [
        {
          type: 'sale',
          amount: 0,
          currency: 'MXN',
        },
      ],
      location: {
        country: project.country_code ?? 'MX',
        city: project.ciudad ?? '',
        colonia: project.colonia ?? '',
      },
      external_id: project.id,
    };

    const res = await fetch(`${API_BASE}/properties`, {
      method: 'POST',
      headers: {
        'X-Authorization': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`easybroker publish failed status=${res.status} ${text.slice(0, 200)}`);
    }

    const json = (await res.json().catch(() => ({}))) as {
      public_id?: string;
      public_url?: string;
    };
    if (!json.public_id) {
      throw new Error('easybroker publish: missing public_id in response');
    }
    return {
      externalId: json.public_id,
      ...(json.public_url ? { url: json.public_url } : {}),
    };
  },

  parseLeadWebhook(payload): ParsedLead {
    const result: ParsedLead = {};
    const p = payload as Record<string, unknown> | null;
    if (!p || typeof p !== 'object') return result;
    const contact = (p.contact as Record<string, unknown> | undefined) ?? p;
    if (typeof contact.name === 'string') result.contactName = contact.name;
    if (typeof contact.phone === 'string') result.phone = contact.phone;
    if (typeof contact.email === 'string') result.email = contact.email;
    if (typeof p.property_id === 'string') result.projectId = p.property_id;
    else if (typeof p.external_id === 'string') result.projectId = p.external_id;
    if (typeof p.message === 'string') result.message = p.message;
    return result;
  },
};
