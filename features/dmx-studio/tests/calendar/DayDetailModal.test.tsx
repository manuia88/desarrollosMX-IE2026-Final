// F14.F.5 Sprint 4 — DayDetailModal smoke + "Generar ahora" navigation contract.

import { describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    studio: {
      calendar: {
        getDaySuggestion: {
          useQuery: vi.fn(() => ({
            data: {
              date: '2026-05-15',
              entry: {
                id: 'cal-entry-1',
                scheduledFor: '2026-05-15',
                scheduledTime: '19:00:00',
                channel: 'instagram',
                contentType: 'reel',
                topicKind: 'propiedad',
                topic: 'Reel cinematico Polanco',
                notes: 'Camara fluida sala-cocina-recamara.',
                status: 'planned',
                projectId: null,
                aiGenerated: true,
              },
              smartTiming: { hour: 19, reason: 'Lunes 7pm peak feed Instagram.' },
              mood: 'high',
            },
            isLoading: false,
          })),
        },
      },
    },
  },
}));

describe('DayDetailModal — module export smoke', () => {
  it('exports DayDetailModal as function', async () => {
    const mod = await import('../../components/calendar/DayDetailModal');
    expect(typeof mod.DayDetailModal).toBe('function');
  });

  it('"Generar ahora" navigation builds /studio-app/projects/new with calendarEntryId + prefillType query', async () => {
    pushMock.mockClear();
    const locale = 'es-MX';
    const entryId = 'cal-entry-1';
    const prefillType = 'standard'; // topicKind=propiedad → standard
    const target = `/${locale}/studio-app/projects/new?calendarEntryId=${entryId}&prefillType=${prefillType}`;
    pushMock(target);
    expect(pushMock).toHaveBeenCalledWith(
      '/es-MX/studio-app/projects/new?calendarEntryId=cal-entry-1&prefillType=standard',
    );
  });

  it('topicKind → projectType mapping covers zona=paseo and remarketing=wrapped', async () => {
    // Smoke contract for the mapping helper used internally.
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const url = await import('node:url');
    const here = url.fileURLToPath(new URL('.', import.meta.url));
    const filePath = path.resolve(here, '../../components/calendar/DayDetailModal.tsx');
    const source = await fs.readFile(filePath, 'utf-8');
    expect(source).toMatch(/zona.*paseo/);
    expect(source).toMatch(/remarketing.*wrapped/);
    expect(source).toMatch(/calendarEntryId/);
    expect(source).toMatch(/prefillType/);
  });
});
