import { describe, expect, it, vi } from 'vitest';
import { parseDriveFolderId, pollFolder } from '../lib/drive-monitor';

describe('parseDriveFolderId', () => {
  it('extracts id from /folders/{id}', () => {
    expect(parseDriveFolderId('https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnO')).toBe(
      '1AbCdEfGhIjKlMnO',
    );
  });

  it('extracts id from /folders/{id}?usp=sharing', () => {
    expect(
      parseDriveFolderId('https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnO?usp=sharing'),
    ).toBe('1AbCdEfGhIjKlMnO');
  });

  it('extracts id from /drive/u/0/folders/{id}', () => {
    expect(parseDriveFolderId('https://drive.google.com/drive/u/0/folders/abc-DEF_123')).toBe(
      'abc-DEF_123',
    );
  });

  it('returns null for invalid URL without /folders/', () => {
    expect(parseDriveFolderId('https://drive.google.com/file/d/1AbCdEfGhIjKlMnO/view')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseDriveFolderId('')).toBeNull();
  });
});

describe('pollFolder', () => {
  it('throws when GOOGLE_DRIVE_API_KEY missing', async () => {
    const original = process.env.GOOGLE_DRIVE_API_KEY;
    delete process.env.GOOGLE_DRIVE_API_KEY;
    await expect(pollFolder('folder-123')).rejects.toThrow('GOOGLE_DRIVE_API_KEY missing');
    if (original) process.env.GOOGLE_DRIVE_API_KEY = original;
  });

  it('calls Drive API with correct params and returns files array', async () => {
    process.env.GOOGLE_DRIVE_API_KEY = 'test-key-xyz';
    const fakeFiles = [
      {
        id: 'file-a',
        name: 'a.pdf',
        mimeType: 'application/pdf',
        modifiedTime: '2026-04-29T00:00:00Z',
        size: '1024',
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ files: fakeFiles }),
    } as unknown as Response);

    const files = await pollFolder('FOLDER123', fetchMock as unknown as typeof fetch);
    expect(files).toEqual(fakeFiles);
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain('https://www.googleapis.com/drive/v3/files');
    expect(calledUrl).toContain('key=test-key-xyz');
    expect(calledUrl).toContain('FOLDER123');
    expect(calledUrl).toContain('trashed+%3D+false');
  });

  it('returns empty array when API returns no files property', async () => {
    process.env.GOOGLE_DRIVE_API_KEY = 'test-key';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as unknown as Response);
    const files = await pollFolder('FOLDER', fetchMock as unknown as typeof fetch);
    expect(files).toEqual([]);
  });

  it('throws on non-ok response with status + body', async () => {
    process.env.GOOGLE_DRIVE_API_KEY = 'test-key';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    } as unknown as Response);
    await expect(pollFolder('FOLDER', fetchMock as unknown as typeof fetch)).rejects.toThrow(
      'Drive API 403: Forbidden',
    );
  });
});

describe('documentIntelRouter — module export smoke', () => {
  it('exports the expected drive monitor + pipeline procedures', async () => {
    vi.doMock('@/shared/lib/supabase/admin', () => ({
      createAdminClient: vi.fn(() => ({ from: vi.fn() })),
    }));
    const mod = await import('../routes/document-intel');
    const r = mod.documentIntelRouter as unknown as Record<string, unknown>;
    expect(r.addDriveMonitor).toBeDefined();
    expect(r.listMyDriveMonitors).toBeDefined();
    expect(r.deleteDriveMonitor).toBeDefined();
    expect(r.getMyCreditsBalance).toBeDefined();
    expect(r.createJob).toBeDefined();
    expect(r.getJob).toBeDefined();
    expect(r.listMyJobs).toBeDefined();
    expect(r.requestExtraction).toBeDefined();
    expect(r.getExtractedData).toBeDefined();
    expect(r.processJobNow).toBeDefined();
    expect(r.adminGrantCredits).toBeDefined();
    expect(r.getJobValidations).toBeDefined();
    expect(r.resolveValidation).toBeDefined();
    expect(r.getJobDuplicateInfo).toBeDefined();
    expect(r.uploadDocumentToStorage).toBeDefined();
  });
});
