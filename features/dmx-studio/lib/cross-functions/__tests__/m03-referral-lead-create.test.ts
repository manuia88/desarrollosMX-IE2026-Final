import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));
vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn() },
}));

import { createAdminClient } from '@/shared/lib/supabase/admin';
import { createLeadFromReferral } from '../m03-referral-lead-create';

function buildClient(opts: {
  asesor?: { country_code?: string; primary_zone_id?: string | null } | null;
  source?: { id: string } | null;
  webSource?: { id: string } | null;
  insertedLead?: { id: string };
  insertError?: Error | null;
}) {
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: opts.asesor ?? null, error: null }) }),
        }),
      };
    }
    if (table === 'lead_sources') {
      return {
        select: () => ({
          eq: (_k: string, value: string) => ({
            maybeSingle: async () => {
              if (value === 'studio_gallery_referral')
                return { data: opts.source ?? null, error: null };
              return { data: opts.webSource ?? null, error: null };
            },
          }),
        }),
      };
    }
    if (table === 'leads') {
      return {
        insert: () => ({
          select: () => ({
            single: async () => ({
              data: opts.insertedLead ?? null,
              error: opts.insertError ?? null,
            }),
          }),
        }),
      };
    }
    return {};
  });
  vi.mocked(createAdminClient).mockReturnValue({ from: fromMock } as unknown as ReturnType<
    typeof createAdminClient
  >);
}

describe('cross-functions/m03-referral-lead-create', () => {
  it('returns leadId null si asesor sin primary_zone_id', async () => {
    buildClient({ asesor: { country_code: 'MX', primary_zone_id: null } });
    const result = await createLeadFromReferral({
      submissionId: 's1',
      asesorUserId: 'u1',
      submittedName: 'Cliente',
      submittedEmail: 'c@x.com',
      submittedPhone: null,
      submittedMessage: null,
    });
    expect(result.leadId).toBeNull();
  });

  it('crea lead exitosamente con source studio_gallery_referral', async () => {
    buildClient({
      asesor: { country_code: 'MX', primary_zone_id: 'zone-1' },
      source: { id: 'src-referral' },
      insertedLead: { id: 'lead-99' },
    });
    const result = await createLeadFromReferral({
      submissionId: 's1',
      asesorUserId: 'u1',
      submittedName: 'Manu',
      submittedEmail: 'manu@x.com',
      submittedPhone: '5512345678',
      submittedMessage: 'Hola',
    });
    expect(result.leadId).toBe('lead-99');
  });

  it('fallback a source web si studio_gallery_referral no existe', async () => {
    buildClient({
      asesor: { country_code: 'MX', primary_zone_id: 'zone-1' },
      source: null,
      webSource: { id: 'src-web' },
      insertedLead: { id: 'lead-100' },
    });
    const result = await createLeadFromReferral({
      submissionId: 's2',
      asesorUserId: 'u2',
      submittedName: 'Test',
      submittedEmail: 't@x.com',
      submittedPhone: null,
      submittedMessage: null,
    });
    expect(result.leadId).toBe('lead-100');
  });

  it('returns null si insert error', async () => {
    buildClient({
      asesor: { country_code: 'MX', primary_zone_id: 'zone-1' },
      source: { id: 'src' },
      insertError: new Error('insert failed'),
    });
    const result = await createLeadFromReferral({
      submissionId: 's3',
      asesorUserId: 'u3',
      submittedName: 'X',
      submittedEmail: 'x@y.com',
      submittedPhone: null,
      submittedMessage: null,
    });
    expect(result.leadId).toBeNull();
  });
});
