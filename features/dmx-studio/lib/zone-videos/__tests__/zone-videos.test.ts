import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));
vi.mock('@/shared/lib/ie-cross-feature', () => ({
  getZoneScores: vi.fn(),
  getZoneMarketData: vi.fn(),
  suggestZonesForAsesor: vi.fn(),
}));

import {
  getZoneMarketData,
  getZoneScores,
  suggestZonesForAsesor as ieSuggest,
} from '@/shared/lib/ie-cross-feature';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { renderHeatmapSvg } from '../heatmap-generator';
import { composeAiSummary, generateZoneVideo } from '../index';
import { suggestZonesForAsesor } from '../smart-selector';

function buildClient(opts: {
  zone?: { id: string; name_es: string } | null;
  insertedProject?: { id: string };
  insertedZoneVideo?: { id: string; project_id: string; zone_name: string };
  zoneVideoError?: Error | null;
}) {
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'zones') {
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: opts.zone ?? null, error: null }) }),
        }),
      };
    }
    if (table === 'studio_video_projects') {
      return {
        insert: () => ({
          select: () => ({
            single: async () => ({ data: opts.insertedProject ?? null, error: null }),
          }),
        }),
      };
    }
    if (table === 'studio_zone_videos') {
      return {
        insert: () => ({
          select: () => ({
            single: async () => ({
              data: opts.insertedZoneVideo ?? null,
              error: opts.zoneVideoError ?? null,
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

describe('zone-videos', () => {
  it('generateZoneVideo lanza NOT_FOUND si zona no existe', async () => {
    buildClient({ zone: null });
    vi.mocked(getZoneScores).mockResolvedValue({
      pulse: null,
      futures: null,
      ghost: null,
      alpha: null,
      capturedAt: '2026-04-27T00:00:00Z',
    });
    vi.mocked(getZoneMarketData).mockResolvedValue({
      precioPromedioM2: null,
      trend30dPct: null,
      amenidadesDestacadas: [],
      occupancyRateStr: null,
      adrStr: null,
      capturedAt: '2026-04-27T00:00:00Z',
    });
    await expect(generateZoneVideo({ userId: 'u', zoneId: 'z-not-found' })).rejects.toThrow(
      /not found/i,
    );
  });

  it('generateZoneVideo crea project + zone video con scores', async () => {
    buildClient({
      zone: { id: 'z1', name_es: 'Roma Norte' },
      insertedProject: { id: 'proj-1' },
      insertedZoneVideo: { id: 'zv-1', project_id: 'proj-1', zone_name: 'Roma Norte' },
    });
    vi.mocked(getZoneScores).mockResolvedValue({
      pulse: 87.5,
      futures: 72,
      ghost: 12,
      alpha: 88,
      capturedAt: '2026-04-27T00:00:00Z',
    });
    vi.mocked(getZoneMarketData).mockResolvedValue({
      precioPromedioM2: 75000,
      trend30dPct: 4.2,
      amenidadesDestacadas: ['parque', 'metro'],
      occupancyRateStr: 0.78,
      adrStr: 1500,
      capturedAt: '2026-04-27T00:00:00Z',
    });
    const result = await generateZoneVideo({ userId: 'u', zoneId: 'z1' });
    expect(result.zoneVideoId).toBe('zv-1');
    expect(result.zoneName).toBe('Roma Norte');
    expect(result.scores.pulse).toBe(87.5);
    expect(result.aiSummary).toContain('Roma Norte');
    expect(result.aiSummary).toContain('Pulse');
  });

  it('composeAiSummary maneja scores null gracefully', () => {
    const summary = composeAiSummary(
      'Polanco',
      { pulse: null, futures: null, ghost: null, alpha: null, capturedAt: '' },
      {
        precioPromedioM2: null,
        trend30dPct: null,
        amenidadesDestacadas: [],
        occupancyRateStr: null,
        adrStr: null,
        capturedAt: '',
      },
    );
    expect(summary).toContain('Polanco');
    expect(summary).toContain('verificados');
  });

  it('composeAiSummary incluye precio si disponible', () => {
    const summary = composeAiSummary(
      'Condesa',
      { pulse: 80, futures: null, ghost: null, alpha: null, capturedAt: '' },
      {
        precioPromedioM2: 80000,
        trend30dPct: 5.5,
        amenidadesDestacadas: ['parques'],
        occupancyRateStr: null,
        adrStr: null,
        capturedAt: '',
      },
    );
    expect(summary).toContain('Pulse Score: 80');
    expect(summary).toContain('Precio promedio');
    expect(summary).toContain('+5.5%');
  });

  it('renderHeatmapSvg genera SVG con scores', () => {
    const svg = renderHeatmapSvg({
      pulse: 85,
      futures: 70,
      ghost: 20,
      alpha: 65,
      capturedAt: '',
    });
    expect(svg).toContain('<svg');
    expect(svg).toContain('Pulse');
    expect(svg).toContain('85');
  });

  it('renderHeatmapSvg colorea low score en rojo', () => {
    const svg = renderHeatmapSvg({
      pulse: 30,
      futures: null,
      ghost: null,
      alpha: null,
      capturedAt: '',
    });
    expect(svg).toContain('#ef4444');
  });

  it('smart-selector delega a ie-cross-feature', async () => {
    vi.mocked(ieSuggest).mockResolvedValue([
      { zoneId: 'z1', zoneName: 'Roma Norte', reason: '3 cierres', score: 9 },
    ]);
    const result = await suggestZonesForAsesor('user-1');
    expect(result.length).toBe(1);
    expect(result[0]?.zoneName).toBe('Roma Norte');
  });
});
