// F14.F.10 Sprint 9 BIBLIA — Tests m03-import-leads cross-function.
// Verifica compose pattern shared/lib/photographer-clients-cross-feature.

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/photographer-clients-cross-feature', () => ({
  fetchLeadsForPhotographer: vi.fn(),
  importLeadsAsPhotographerClients: vi.fn(),
}));

import {
  fetchLeadsForPhotographer,
  importLeadsAsPhotographerClients,
} from '@/shared/lib/photographer-clients-cross-feature';
import { countAvailableLeadsForImport, importLeadsFromM03 } from '../m03-import-leads';

describe('photographer/cross-functions/m03-import-leads', () => {
  beforeEach(() => {
    vi.mocked(fetchLeadsForPhotographer).mockReset();
    vi.mocked(importLeadsAsPhotographerClients).mockReset();
  });

  it('importLeadsFromM03 compone fetchLeadsForPhotographer + importLeadsAsPhotographerClients', async () => {
    const leads = [
      {
        id: 'l-1',
        contactName: 'Cliente 1',
        contactEmail: 'cli1@x.com',
        contactPhone: null,
        status: 'new',
        zoneId: 'z-1',
        createdAt: '2026-04-01',
      },
      {
        id: 'l-2',
        contactName: 'Cliente 2',
        contactEmail: 'cli2@x.com',
        contactPhone: '555',
        status: 'new',
        zoneId: 'z-1',
        createdAt: '2026-04-02',
      },
    ];
    vi.mocked(fetchLeadsForPhotographer).mockResolvedValue(leads);
    vi.mocked(importLeadsAsPhotographerClients).mockResolvedValue({
      imported: 2,
      skipped: 0,
      clientIds: ['c-1', 'c-2'],
    });

    const result = await importLeadsFromM03({
      photographerId: 'ph-1',
      assignedAsesorId: 'asesor-1',
    });

    expect(result.fetched).toBe(2);
    expect(result.imported).toBe(2);
    expect(result.clientIds).toEqual(['c-1', 'c-2']);
    expect(fetchLeadsForPhotographer).toHaveBeenCalledWith({ assignedAsesorId: 'asesor-1' });
    expect(importLeadsAsPhotographerClients).toHaveBeenCalledWith('ph-1', leads);
  });

  it('importLeadsFromM03 batch-insert con filterCriteria zone + status', async () => {
    vi.mocked(fetchLeadsForPhotographer).mockResolvedValue([]);

    const result = await importLeadsFromM03({
      photographerId: 'ph-1',
      assignedAsesorId: 'asesor-1',
      filterCriteria: { zoneId: 'z-roma', status: 'new', limit: 50 },
    });

    expect(result.fetched).toBe(0);
    expect(result.imported).toBe(0);
    expect(fetchLeadsForPhotographer).toHaveBeenCalledWith({
      assignedAsesorId: 'asesor-1',
      filterCriteria: { zoneId: 'z-roma', status: 'new', limit: 50 },
    });
    // Skip importLeadsAsPhotographerClients cuando no hay leads.
    expect(importLeadsAsPhotographerClients).not.toHaveBeenCalled();

    const count = await countAvailableLeadsForImport('asesor-1');
    expect(count).toBe(0);
  });
});
