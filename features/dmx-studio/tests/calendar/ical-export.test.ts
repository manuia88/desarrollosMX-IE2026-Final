// F14.F.5 Sprint 4 UPGRADE 5 — iCal export RFC 5545 shape tests.

import { describe, expect, it } from 'vitest';
import { generateICalFile } from '@/features/dmx-studio/lib/calendar/ical-export';

const CRLF = '\r\n';

describe('generateICalFile — VEVENT shape valid (RFC 5545 minimal)', () => {
  it('emits BEGIN/END VCALENDAR + VERSION:2.0 + PRODID + a single VEVENT block', () => {
    const ics = generateICalFile(
      [
        {
          uid: 'cal-001@dmx-studio',
          start: '2026-04-27T15:30:00Z',
          end: '2026-04-27T16:30:00Z',
          summary: 'Reel Polanco terraza',
          description: 'Publicar a 18:00 hora CDMX',
          url: 'https://app.desarrollosmx.com/studio-app/calendar/cal-001',
        },
      ],
      { name: 'Manu Acosta', email: 'manu@desarrollosmx.com' },
    );

    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics.endsWith(`END:VCALENDAR${CRLF}`)).toBe(true);
    expect(ics).toContain(`VERSION:2.0${CRLF}`);
    expect(ics).toContain(`PRODID:-//DMX Studio//ES${CRLF}`);
    expect(ics).toContain(`CALSCALE:GREGORIAN${CRLF}`);
    expect(ics).toContain(`BEGIN:VEVENT${CRLF}`);
    expect(ics).toContain(`END:VEVENT${CRLF}`);
    expect(ics).toContain('UID:cal-001@dmx-studio');
    expect(ics).toContain('DTSTART:20260427T153000Z');
    expect(ics).toContain('DTEND:20260427T163000Z');
    expect(ics).toContain('SUMMARY:Reel Polanco terraza');
    expect(ics).toContain('DESCRIPTION:Publicar a 18:00 hora CDMX');
    expect(ics).toContain('URL:https://app.desarrollosmx.com/studio-app/calendar/cal-001');
    // CRLF line endings throughout (no bare LF outside of CRLF pairs).
    const lfOnly = ics.replace(/\r\n/g, '');
    expect(lfOnly.includes('\n')).toBe(false);
  });
});

describe('generateICalFile — multiple entries serialized', () => {
  it('serializes 3 entries, each with its own VEVENT block, in order', () => {
    const ics = generateICalFile(
      [
        { uid: 'a@dmx', start: '2026-04-27T10:00:00Z', summary: 'Evento A' },
        { uid: 'b@dmx', start: '2026-04-28T10:00:00Z', summary: 'Evento B; con punto y coma' },
        { uid: 'c@dmx', start: '2026-04-29T10:00:00Z', summary: 'Evento C\nmultilinea' },
      ],
      { name: 'Carla', email: 'carla@desarrollosmx.com' },
    );

    const beginCount = ics.match(/BEGIN:VEVENT/g)?.length ?? 0;
    const endCount = ics.match(/END:VEVENT/g)?.length ?? 0;
    expect(beginCount).toBe(3);
    expect(endCount).toBe(3);
    expect(ics).toContain('UID:a@dmx');
    expect(ics).toContain('UID:b@dmx');
    expect(ics).toContain('UID:c@dmx');
    // semicolon escaped per RFC 5545 §3.3.11
    expect(ics).toContain('SUMMARY:Evento B\\; con punto y coma');
    // newline escaped to \n literal
    expect(ics).toContain('SUMMARY:Evento C\\nmultilinea');
    // entries appear in input order
    const idxA = ics.indexOf('UID:a@dmx');
    const idxB = ics.indexOf('UID:b@dmx');
    const idxC = ics.indexOf('UID:c@dmx');
    expect(idxA).toBeGreaterThan(0);
    expect(idxB).toBeGreaterThan(idxA);
    expect(idxC).toBeGreaterThan(idxB);
  });
});
