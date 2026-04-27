// F14.F.5 Sprint 4 — new remarketing generated template render test.

import { describe, expect, it } from 'vitest';
import {
  NEW_REMARKETING_GENERATED_SUBJECT,
  renderNewRemarketingGeneratedHtml,
} from '@/features/dmx-studio/lib/resend/templates/new-remarketing-generated';

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{1F900}-\u{1F9FF}]/u;

describe('renderNewRemarketingGeneratedHtml', () => {
  it('subject canon and body includes deep link to new project + angle', () => {
    const html = renderNewRemarketingGeneratedHtml({
      name: 'Carla',
      sourceProjectTitle: 'PH Roma Norte',
      newProjectUrl: 'https://app.desarrollosmx.com/studio-app/projects/xyz789',
      angle: 'Inversionista joven',
    });

    expect(NEW_REMARKETING_GENERATED_SUBJECT).toBe('Nuevo remarketing video generado');
    expect(html).toContain('Hola Carla');
    expect(html).toContain('PH Roma Norte');
    expect(html).toContain('Inversionista joven');
    expect(html).toContain('https://app.desarrollosmx.com/studio-app/projects/xyz789');
    expect(html).toContain('<!doctype html>');
    expect(EMOJI_REGEX.test(html)).toBe(false);
  });
});
