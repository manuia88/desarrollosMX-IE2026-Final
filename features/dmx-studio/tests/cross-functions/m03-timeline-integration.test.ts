// F14.F.5 Sprint 4 — M03 timeline integration tests.
// Verifica INSERT contact_notes con level='sistema' + content_md texto formateado.

import { describe, expect, it, vi } from 'vitest';
import { recordRemarketingInTimeline } from '@/features/dmx-studio/lib/cross-functions/m03-timeline-integration';

const REMARKETING_JOB_ID = 'rrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrr1';
const SOURCE_PROJECT_ID = 'pppppppp-pppp-pppp-pppp-pppppppppppp';
const NEW_PROJECT_ID = 'nnnnnnnn-nnnn-nnnn-nnnn-nnnnnnnnnnnn';
const USER_ID = 'uuuuuuu-uuuu-uuuu-uuuu-uuuuuuuuuuu1';
const LEAD_ID = 'lllllll-llll-llll-llll-llllllllllll1';
const CAPTACION_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

interface BuildOpts {
  jobRow: {
    id: string;
    angle: string;
    user_id: string;
    source_project_id: string;
    new_project_id: string | null;
  } | null;
  projectRow: {
    id: string;
    title: string;
    captacion_id: string | null;
    proyecto_id: string | null;
  } | null;
  captacionLeadId: string | null;
  insertedNoteId: string | null;
}

function buildSupabaseMock(opts: BuildOpts) {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  return {
    inserts,
    client: {
      from(table: string) {
        if (table === 'studio_remarketing_jobs') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: opts.jobRow, error: null })),
              })),
            })),
          };
        }
        if (table === 'studio_video_projects') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: opts.projectRow, error: null })),
              })),
            })),
          };
        }
        if (table === 'captaciones') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: opts.captacionLeadId ? { lead_id: opts.captacionLeadId } : null,
                  error: null,
                })),
              })),
            })),
          };
        }
        if (table === 'contact_notes') {
          return {
            insert: vi.fn((payload: unknown) => {
              inserts.push({ table, payload });
              return {
                select: vi.fn(() => ({
                  single: vi.fn(async () => ({
                    data: opts.insertedNoteId ? { id: opts.insertedNoteId } : null,
                    error: opts.insertedNoteId ? null : { message: 'failed' },
                  })),
                })),
              };
            }),
          };
        }
        return {};
      },
      // biome-ignore lint/suspicious/noExplicitAny: minimal mock
    } as any,
  };
}

describe('recordRemarketingInTimeline', () => {
  it('inserts contact_notes row with level=sistema + body containing angle and link', async () => {
    const { client, inserts } = buildSupabaseMock({
      jobRow: {
        id: REMARKETING_JOB_ID,
        angle: 'price_drop',
        user_id: USER_ID,
        source_project_id: SOURCE_PROJECT_ID,
        new_project_id: NEW_PROJECT_ID,
      },
      projectRow: {
        id: SOURCE_PROJECT_ID,
        title: 'Casa Roma Norte 3 recámaras',
        captacion_id: CAPTACION_ID,
        proyecto_id: null,
      },
      captacionLeadId: LEAD_ID,
      insertedNoteId: 'nnoteid-nnnn-nnnn-nnnn-nnnnnnnnnnn1',
    });
    const result = await recordRemarketingInTimeline(client, REMARKETING_JOB_ID, null);
    expect(result.inserted).toBe(true);
    expect(result.noteId).toBe('nnoteid-nnnn-nnnn-nnnn-nnnnnnnnnnn1');
    expect(result.leadId).toBe(LEAD_ID);
    expect(result.skippedReason).toBeNull();

    const noteInserts = inserts.filter((i) => i.table === 'contact_notes');
    expect(noteInserts).toHaveLength(1);
    const payload = noteInserts[0]?.payload as {
      lead_id: string;
      author_user_id: string;
      content_md: string;
      level: string;
    };
    expect(payload.lead_id).toBe(LEAD_ID);
    expect(payload.author_user_id).toBe(USER_ID);
    expect(payload.level).toBe('sistema');
    expect(payload.content_md).toContain('price_drop');
    expect(payload.content_md).toContain('Casa Roma Norte 3 recámaras');
  });
});
