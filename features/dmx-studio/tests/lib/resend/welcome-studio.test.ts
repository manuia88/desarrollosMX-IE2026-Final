// FASE 14.F.1 — DMX Studio dentro DMX único entorno (ADR-054).
// Welcome email template render test — zero emojis, position rendered.

import { describe, expect, it } from 'vitest';
import {
  renderWelcomeStudioHtml,
  WELCOME_STUDIO_SUBJECT,
} from '@/features/dmx-studio/lib/resend/templates/welcome-studio';

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{1F900}-\u{1F9FF}]/u;

describe('renderWelcomeStudioHtml', () => {
  it('renders OK with name + position and contains zero emojis', () => {
    const html = renderWelcomeStudioHtml({
      name: 'Alice',
      foundersCohortEligible: true,
      position: 7,
    });

    expect(WELCOME_STUDIO_SUBJECT).toBe('Bienvenido a DMX Studio waitlist');
    expect(html).toContain('Hola Alice');
    expect(html).toContain('Founders Cohort confirmado');
    expect(html).toContain('#7');
    expect(html).toContain('DMX Studio');
    expect(html).toContain('<!doctype html>');
    expect(EMOJI_REGEX.test(html)).toBe(false);
  });
});
