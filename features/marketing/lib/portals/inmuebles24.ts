import { TRPCError } from '@trpc/server';
import type {
  IPortalAdapter,
  ParsedLead,
  PublishArgs,
  PublishResult,
  ValidationResult,
} from './types';

const API_BASE = 'https://api.inmuebles24.com.mx/v1';

export const inmuebles24Adapter: IPortalAdapter = {
  portal: 'inmuebles24',
  status: 'real',

  async validateCredentials(credentials): Promise<ValidationResult> {
    const apiKey = credentials.api_key ?? credentials.apiKey;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
      return { valid: false, error: 'Inmuebles24 requires non-empty api_key.' };
    }
    return { valid: true };
  },

  async publish({ project, credentials }: PublishArgs): Promise<PublishResult> {
    const apiKey = credentials.api_key ?? credentials.apiKey;
    if (!apiKey) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Inmuebles24 api_key missing.' });
    }

    const payload = {
      external_id: project.id,
      title: project.nombre ?? 'Propiedad sin título',
      description: project.description ?? '',
      country: project.country_code ?? 'MX',
      city: project.ciudad ?? '',
      colonia: project.colonia ?? '',
      total_units: project.units_total ?? 1,
      type: 'development',
    };

    const res = await fetch(`${API_BASE}/listings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`inmuebles24 publish failed status=${res.status} ${text.slice(0, 200)}`);
    }

    const json = (await res.json().catch(() => ({}))) as { id?: string; url?: string };
    if (!json.id) {
      throw new Error('inmuebles24 publish: missing id in response');
    }
    return {
      externalId: json.id,
      ...(json.url ? { url: json.url } : {}),
    };
  },

  parseLeadWebhook(payload): ParsedLead {
    const result: ParsedLead = {};
    const p = payload as Record<string, unknown> | null;
    if (!p || typeof p !== 'object') return result;
    const lead = (p.lead as Record<string, unknown> | undefined) ?? p;
    if (typeof lead.name === 'string') result.contactName = lead.name;
    if (typeof lead.phone === 'string') result.phone = lead.phone;
    if (typeof lead.email === 'string') result.email = lead.email;
    if (typeof lead.external_id === 'string') result.projectId = lead.external_id;
    else if (typeof lead.project_id === 'string') result.projectId = lead.project_id;
    if (typeof lead.message === 'string') result.message = lead.message;
    return result;
  },
};
