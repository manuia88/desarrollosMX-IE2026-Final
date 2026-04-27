// F14.F.5 Sprint 4 UPGRADE 5 — DMX Studio iCal export (RFC 5545, pure JS, no deps).
// Serializes ContentCalendar entries into a VCALENDAR file compatible with
// Google Calendar, Outlook, and Apple Calendar. CRLF line endings as required.

import type { ICalEntryInput, ICalUserInfo } from './ical-export-types';

const CRLF = '\r\n';
const PRODID = '-//DMX Studio//ES';
const VERSION = '2.0';
const CALSCALE = 'GREGORIAN';
const METHOD = 'PUBLISH';

/**
 * Escapes a TEXT value per RFC 5545 §3.3.11. Backslash, semicolon, comma,
 * and newlines are escaped.
 */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\n|\r/g, '\\n');
}

/**
 * Formats an ISO 8601 datetime string to RFC 5545 UTC datetime
 * (YYYYMMDDTHHMMSSZ). Always emits UTC by converting via Date.
 */
function formatIcsDateTimeUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`ical-export: invalid datetime value "${iso}"`);
  }
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${day}T${hh}${mm}${ss}Z`;
}

/**
 * Folds a content line per RFC 5545 §3.1: max 75 octets per line, continuation
 * lines start with a single whitespace. We approximate octets as code units
 * (safe for ASCII keys/values; non-ASCII summaries fold conservatively).
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let i = 0;
  parts.push(line.slice(0, 75));
  i = 75;
  while (i < line.length) {
    parts.push(` ${line.slice(i, i + 74)}`);
    i += 74;
  }
  return parts.join(CRLF);
}

function buildVEvent(entry: ICalEntryInput, dtstamp: string): string {
  const lines: string[] = [];
  lines.push('BEGIN:VEVENT');
  lines.push(`UID:${entry.uid}`);
  lines.push(`DTSTAMP:${dtstamp}`);
  lines.push(`DTSTART:${formatIcsDateTimeUtc(entry.start)}`);
  if (entry.end) {
    lines.push(`DTEND:${formatIcsDateTimeUtc(entry.end)}`);
  }
  lines.push(`SUMMARY:${escapeIcsText(entry.summary)}`);
  if (entry.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(entry.description)}`);
  }
  if (entry.location) {
    lines.push(`LOCATION:${escapeIcsText(entry.location)}`);
  }
  if (entry.url) {
    lines.push(`URL:${entry.url}`);
  }
  lines.push('END:VEVENT');
  return lines.map(foldLine).join(CRLF);
}

/**
 * Generates an RFC 5545 VCALENDAR string from the provided entries.
 * Output uses CRLF line endings, UTC datetimes, and the canonical PRODID
 * `-//DMX Studio//ES`.
 */
export function generateICalFile(
  entries: ReadonlyArray<ICalEntryInput>,
  userInfo: ICalUserInfo,
): string {
  const dtstamp = formatIcsDateTimeUtc(new Date().toISOString());
  const calName = `DMX Studio - ${userInfo.name}`;

  const header = [
    'BEGIN:VCALENDAR',
    `VERSION:${VERSION}`,
    `PRODID:${PRODID}`,
    `CALSCALE:${CALSCALE}`,
    `METHOD:${METHOD}`,
    `X-WR-CALNAME:${escapeIcsText(calName)}`,
    `X-WR-CALDESC:${escapeIcsText(`Calendario de contenido de ${userInfo.email}`)}`,
  ]
    .map(foldLine)
    .join(CRLF);

  const events = entries.map((e) => buildVEvent(e, dtstamp)).join(CRLF);
  const footer = 'END:VCALENDAR';

  // Trailing CRLF per RFC 5545 recommendation for line terminator on last line.
  const body =
    entries.length > 0 ? `${header}${CRLF}${events}${CRLF}${footer}` : `${header}${CRLF}${footer}`;
  return `${body}${CRLF}`;
}

export type { ICalEntryInput, ICalUserInfo } from './ical-export-types';
export { ICalEntryInputSchema, ICalUserInfoSchema } from './ical-export-types';
