import { describe, expect, it } from 'vitest';
import { renderMonthlyMoMEmail } from '../templates/monthly-mom';
import type { NewsletterMonthlyBundle } from '../types';

function sampleBundle(): NewsletterMonthlyBundle {
  return {
    period_date: '2026-03-01',
    country_code: 'MX',
    locale: 'es-MX',
    hero_top_five: [
      {
        rank: 1,
        scope_type: 'colonia',
        scope_id: 'roma-norte',
        zone_label: 'Roma Norte',
        value: 92.5,
        delta_pct: 2.1,
      },
      {
        rank: 2,
        scope_type: 'colonia',
        scope_id: 'condesa',
        zone_label: 'Condesa',
        value: 90.3,
        delta_pct: 1.4,
      },
    ],
    causal_paragraphs: ['Roma Norte subió por aperturas de cafés especialidad.'],
    pulse_section: {
      scope_id: 'roma-norte',
      zone_label: 'Roma Norte',
      current_pulse: 88.1,
      delta_4w: 2.4,
      sparkline_svg: '',
      detail_url: 'https://app.desarrollosmx.com/es-MX/pulse/roma-norte',
    },
    migration_section: {
      scope_id: 'roma-norte',
      zone_label: 'Roma Norte',
      top_origins: [{ scope_id: 'napoles', zone_label: 'Nápoles', volume: 320, share_pct: 45 }],
      top_destinations: [
        { scope_id: 'del-valle', zone_label: 'Del Valle', volume: 120, share_pct: 30 },
      ],
      detail_url: 'https://app.desarrollosmx.com/es-MX/indices/migration-flow/roma-norte',
    },
    streaks_section: null,
    cta: {
      label: 'Ver los 15 índices',
      url: 'https://app.desarrollosmx.com/es-MX/indices',
    },
  };
}

describe('renderMonthlyMoMEmail', () => {
  it('returns html, text, subject with valid doctype + body', () => {
    const { html, text, subject } = renderMonthlyMoMEmail({
      bundle: sampleBundle(),
      subscriber: { email: 'alice@example.com' },
      unsubscribeUrl: 'https://app.desarrollosmx.com/es-MX/newsletter/unsubscribe/tok',
      preferencesUrl: 'https://app.desarrollosmx.com/es-MX/newsletter/preferences',
    });
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain('Roma Norte');
    expect(html).toContain('Condesa');
    expect(html).toContain('alice@example.com');
    expect(html).toContain('/newsletter/unsubscribe/tok');
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain('Roma Norte');
    expect(subject).toMatch(/bienes raíces MX/);
  });

  it('uses subject override when provided (A/B test variant)', () => {
    const { subject } = renderMonthlyMoMEmail({
      bundle: sampleBundle(),
      subscriber: { email: 'alice@example.com' },
      unsubscribeUrl: 'https://example.com/u',
      preferencesUrl: 'https://example.com/p',
      subjectOverride: 'Test variant B subject',
    });
    expect(subject).toBe('Test variant B subject');
  });

  it('unsubscribe + preferences links present in HTML', () => {
    const { html } = renderMonthlyMoMEmail({
      bundle: sampleBundle(),
      subscriber: { email: 'a@b.com' },
      unsubscribeUrl: 'https://example.com/unsub/TKN',
      preferencesUrl: 'https://example.com/prefs/TKN',
    });
    expect(html).toContain('https://example.com/unsub/TKN');
    expect(html).toContain('https://example.com/prefs/TKN');
  });

  it('no raw UUIDs render in html (zone_label resolved)', () => {
    const { html } = renderMonthlyMoMEmail({
      bundle: sampleBundle(),
      subscriber: { email: 'a@b.com' },
      unsubscribeUrl: 'https://u',
      preferencesUrl: 'https://p',
    });
    // No UUID-shaped strings in the rendered HTML.
    expect(html).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
  });
});
