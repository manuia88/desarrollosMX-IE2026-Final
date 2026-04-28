// F14.F.10 Sprint 9 SUB-AGENT 4 — Tests marketplace-application helper.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();
const upsertChainMock = vi.fn();
const photographerSelectMock = vi.fn();

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'studio_photographers') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: photographerSelectMock,
            }),
          }),
        };
      }
      if (table === 'studio_photographer_directory') {
        return {
          upsert: upsertChainMock,
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  }),
}));

vi.mock('@/features/dmx-studio/lib/resend/provider', () => ({
  getStudioEmailProvider: () => ({
    name: 'mock' as const,
    send: sendMock,
  }),
}));

beforeEach(() => {
  sendMock.mockReset();
  upsertChainMock.mockReset();
  photographerSelectMock.mockReset();
});

describe('applyToDirectory', () => {
  it('upserts directory listing with status=pending and returns listing id', async () => {
    photographerSelectMock.mockResolvedValueOnce({
      data: {
        id: 'ph-1',
        business_name: 'Foto Roma',
        email: 'foto@example.com',
      },
      error: null,
    });
    upsertChainMock.mockReturnValueOnce({
      select: () => ({
        single: async () => ({
          data: { id: 'listing-1', listing_status: 'pending' },
          error: null,
        }),
      }),
    });
    sendMock.mockResolvedValueOnce({
      providerMessageId: 'mock-1',
      provider: 'mock',
      accepted: true,
      error: null,
    });

    const { applyToDirectory } = await import('../marketplace-application');
    const result = await applyToDirectory({
      userId: 'user-1',
      tags: ['interiores', 'exteriores'],
    });

    expect(result.listingId).toBe('listing-1');
    expect(result.listingStatus).toBe('pending');
    expect(upsertChainMock).toHaveBeenCalledWith(
      expect.objectContaining({
        photographer_id: 'ph-1',
        listing_status: 'pending',
        tags: ['interiores', 'exteriores'],
      }),
      expect.objectContaining({ onConflict: 'photographer_id' }),
    );
  });

  it('triggers admin notify email with photographer business name in subject', async () => {
    photographerSelectMock.mockResolvedValueOnce({
      data: {
        id: 'ph-1',
        business_name: 'Foto Condesa',
        email: 'condesa@example.com',
      },
      error: null,
    });
    upsertChainMock.mockReturnValueOnce({
      select: () => ({
        single: async () => ({
          data: { id: 'listing-2', listing_status: 'pending' },
          error: null,
        }),
      }),
    });
    sendMock.mockResolvedValueOnce({
      providerMessageId: 'mock-2',
      provider: 'mock',
      accepted: true,
      error: null,
    });

    const { applyToDirectory } = await import('../marketplace-application');
    const result = await applyToDirectory({
      userId: 'user-1',
      tags: [],
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const sendArgs = sendMock.mock.calls[0]?.[0] as
      | { subject: string; html: string; tags: ReadonlyArray<{ name: string; value: string }> }
      | undefined;
    if (!sendArgs) throw new Error('send not called with payload');
    expect(sendArgs.subject).toContain('Foto Condesa');
    expect(sendArgs.html).toContain('Foto Condesa');
    expect(sendArgs.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'studio_template', value: 'marketplace_application' }),
      ]),
    );
    expect(result.notifyAccepted).toBe(true);
  });
});
