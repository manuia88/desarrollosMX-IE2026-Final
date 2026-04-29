import { describe, expect, it, vi } from 'vitest';
import { dispatchPendingAlerts, listRecentAlertsForUser, subscribeRadar } from '../radar-dispatch';

describe('radar-dispatch', () => {
  it('subscribeRadar returns subscriptionId on success', async () => {
    const supabase = {
      from: vi.fn().mockImplementation(() => ({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'sub-1' }, error: null }),
          }),
        }),
      })),
    };
    const result = await subscribeRadar(
      supabase as unknown as Parameters<typeof subscribeRadar>[0],
      {
        userId: 'u1',
        zoneId: 'z1',
        channel: 'email',
        thresholdPct: 15,
        countryCode: 'MX',
      },
    );
    expect(result.subscribed).toBe(true);
    if (result.subscribed) expect(result.subscriptionId).toBe('sub-1');
  });

  it('listRecentAlertsForUser returns empty when no subs', async () => {
    const supabase = {
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      })),
    };
    const alerts = await listRecentAlertsForUser(
      supabase as unknown as Parameters<typeof listRecentAlertsForUser>[0],
      'u1',
      50,
    );
    expect(alerts).toEqual([]);
  });

  it('dispatchPendingAlerts returns zero when no alerts', async () => {
    const supabase = {
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      })),
    };
    const result = await dispatchPendingAlerts(
      supabase as unknown as Parameters<typeof dispatchPendingAlerts>[0],
    );
    expect(result.alertsScanned).toBe(0);
    expect(result.notificationsSent).toBe(0);
  });
});
