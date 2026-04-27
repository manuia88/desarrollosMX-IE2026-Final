import { describe, expect, it } from 'vitest';
import {
  contactNoteCreateInput,
  contactNoteDeleteInput,
  contactNoteLevelEnum,
  contactNoteListInput,
  contactNoteUpdateInput,
} from '@/features/crm/schemas/contact-notes';

const validUuid = '00000000-0000-4000-8000-000000000001';

describe('contactNoteLevelEnum', () => {
  it('accepts canonical 3 levels', () => {
    for (const lv of ['personal', 'colaborativo', 'sistema']) {
      expect(contactNoteLevelEnum.parse(lv)).toBe(lv);
    }
  });

  it('rejects invented level', () => {
    expect(() => contactNoteLevelEnum.parse('global')).toThrow();
  });
});

describe('contactNoteCreateInput', () => {
  it('accepts a valid personal note', () => {
    const parsed = contactNoteCreateInput.parse({
      lead_id: validUuid,
      level: 'personal',
      content_md: 'Hola desde Markdown.',
    });
    expect(parsed.level).toBe('personal');
    expect(parsed.content_md).toBe('Hola desde Markdown.');
  });

  it('trims content_md before validating min length', () => {
    expect(() =>
      contactNoteCreateInput.parse({
        lead_id: validUuid,
        level: 'personal',
        content_md: '   ',
      }),
    ).toThrow();
  });

  it('rejects content_md > 8000 chars', () => {
    expect(() =>
      contactNoteCreateInput.parse({
        lead_id: validUuid,
        level: 'personal',
        content_md: 'a'.repeat(8001),
      }),
    ).toThrow();
  });

  it('rejects invalid level', () => {
    expect(() =>
      contactNoteCreateInput.parse({
        lead_id: validUuid,
        level: 'private',
        content_md: 'note',
      }),
    ).toThrow();
  });

  it('rejects malformed lead_id uuid', () => {
    expect(() =>
      contactNoteCreateInput.parse({
        lead_id: 'not-a-uuid',
        level: 'sistema',
        content_md: 'note',
      }),
    ).toThrow();
  });
});

describe('contactNoteUpdateInput', () => {
  it('accepts valid update payload', () => {
    const parsed = contactNoteUpdateInput.parse({
      id: validUuid,
      content_md: 'updated content',
    });
    expect(parsed.content_md).toBe('updated content');
  });

  it('rejects empty content after trim', () => {
    expect(() => contactNoteUpdateInput.parse({ id: validUuid, content_md: '   ' })).toThrow();
  });

  it('rejects oversize content_md', () => {
    expect(() =>
      contactNoteUpdateInput.parse({ id: validUuid, content_md: 'a'.repeat(8001) }),
    ).toThrow();
  });
});

describe('contactNoteListInput', () => {
  it('applies default limit 50', () => {
    const parsed = contactNoteListInput.parse({ lead_id: validUuid });
    expect(parsed.limit).toBe(50);
  });

  it('rejects limit > 200', () => {
    expect(() => contactNoteListInput.parse({ lead_id: validUuid, limit: 500 })).toThrow();
  });
});

describe('contactNoteDeleteInput', () => {
  it('parses valid uuid', () => {
    const parsed = contactNoteDeleteInput.parse({ id: validUuid });
    expect(parsed.id).toBe(validUuid);
  });

  it('rejects malformed uuid', () => {
    expect(() => contactNoteDeleteInput.parse({ id: 'abc' })).toThrow();
  });
});
