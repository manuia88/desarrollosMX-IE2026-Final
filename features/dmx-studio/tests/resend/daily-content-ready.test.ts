// F14.F.5 Sprint 4 — daily content ready template render test.

import { describe, expect, it } from 'vitest';
import {
  DAILY_CONTENT_READY_SUBJECT,
  renderDailyContentReadyHtml,
} from '@/features/dmx-studio/lib/resend/templates/daily-content-ready';

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{1F900}-\u{1F9FF}]/u;

describe('renderDailyContentReadyHtml', () => {
  it('subject matches canon and body contains type, title, and deep link URL', () => {
    const html = renderDailyContentReadyHtml({
      name: 'Manu',
      calendarEntryType: 'reel',
      calendarEntryTitle: 'Recorrido nuevo en Polanco',
      calendarEntryUrl: 'https://app.desarrollosmx.com/studio-app/calendar/abc123',
    });

    expect(DAILY_CONTENT_READY_SUBJECT).toBe('Tu contenido de hoy esta listo');
    expect(html).toContain('Hola Manu');
    expect(html).toContain('reel');
    expect(html).toContain('Recorrido nuevo en Polanco');
    expect(html).toContain('https://app.desarrollosmx.com/studio-app/calendar/abc123');
    expect(html).toContain('<!doctype html>');
    expect(EMOJI_REGEX.test(html)).toBe(false);
  });
});
