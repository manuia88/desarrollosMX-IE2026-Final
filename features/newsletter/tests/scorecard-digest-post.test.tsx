import { describe, expect, it } from 'vitest';
import {
  buildLinkedInShareUrl,
  buildMailtoFallback,
  deriveTopFindings,
  renderScorecardDigestPostEmail,
} from '../templates/scorecard-digest-post';
import type { NewsletterLocale, ScorecardDigestBundle } from '../types';

function buildBundle(overrides: Partial<ScorecardDigestBundle> = {}): ScorecardDigestBundle {
  return {
    report_id: 'MX-2026-Q1',
    period_type: 'quarterly',
    period_date: '2026-01-01',
    preview_paragraph:
      'Roma Norte lidera migración con 900 inflow neto.\nJuárez sorprende como alpha emergente.\nPolanco mantiene liderazgo IPV.',
    headline: '2026 Q1 Scorecard Nacional — Roma Norte lidera',
    release_date: '2026-04-15',
    cta_url: 'https://desarrollosmx.com/es-MX/scorecard-nacional/MX-2026-Q1',
    ...overrides,
  };
}

function buildSubscriber(locale: NewsletterLocale = 'es-MX') {
  return {
    email: 'test@example.com',
    locale,
    unsubscribe_token_hash: 'hash',
  };
}

describe('deriveTopFindings', () => {
  it('returns empty array for empty paragraph', () => {
    expect(deriveTopFindings('')).toEqual([]);
  });

  it('extracts bullet list when present', () => {
    const p = '- Primer hallazgo\n- Segundo hallazgo\n- Tercer hallazgo\n- Cuarto hallazgo';
    const f = deriveTopFindings(p);
    expect(f).toEqual(['Primer hallazgo', 'Segundo hallazgo', 'Tercer hallazgo']);
  });

  it('extracts numbered list', () => {
    const p = '1. Primero\n2. Segundo\n3. Tercero';
    const f = deriveTopFindings(p);
    expect(f).toEqual(['Primero', 'Segundo', 'Tercero']);
  });

  it('falls back to first 3 sentences when no bullets', () => {
    const p = 'Roma lidera. Juárez alpha. Polanco estable. Condesa pierde.';
    const f = deriveTopFindings(p);
    expect(f).toHaveLength(3);
    expect(f[0]).toContain('Roma');
  });
});

describe('buildLinkedInShareUrl', () => {
  it('builds a valid LinkedIn share intent URL', () => {
    const url = buildLinkedInShareUrl(
      'https://desarrollosmx.com/es-MX/scorecard-nacional/MX-2026-Q1',
      '2026 Q1 Scorecard',
    );
    expect(url).toContain('https://www.linkedin.com/sharing/share-offsite/');
    expect(url).toContain('url=https');
    expect(url).toContain('title=2026');
    expect(url).toContain('source=DesarrollosMX');
  });
});

describe('buildMailtoFallback', () => {
  it('encodes subject and body', () => {
    const url = buildMailtoFallback('https://x.com/r', 'Q1 Scorecard');
    expect(url.startsWith('mailto:?')).toBe(true);
    expect(url).toContain('subject=Q1%20Scorecard');
    expect(url).toContain('body=');
  });
});

describe('renderScorecardDigestPostEmail', () => {
  it('renders full HTML with recap + findings + CTA + LinkedIn link', () => {
    const result = renderScorecardDigestPostEmail(buildBundle(), buildSubscriber());
    expect(result.html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(result.html).toContain('Publicamos');
    expect(result.html).toContain('Recap del trimestre');
    expect(result.html).toContain('Lee el reporte completo');
    expect(result.html).toContain('linkedin.com/sharing');
    expect(result.html).toContain('Compartir en LinkedIn');
  });

  it('builds subject with emoji + period + ready message', () => {
    const result = renderScorecardDigestPostEmail(buildBundle(), buildSubscriber());
    expect(result.subject).toContain('2026 Q1');
  });

  it('includes top findings in HTML', () => {
    const bundle = buildBundle({
      preview_paragraph: '1. Roma lidera\n2. Juárez alpha\n3. Polanco estable',
    });
    const result = renderScorecardDigestPostEmail(bundle, buildSubscriber());
    expect(result.html).toContain('Roma lidera');
    expect(result.html).toContain('Juárez alpha');
    expect(result.html).toContain('Polanco estable');
  });

  it('localizes to en-US', () => {
    const result = renderScorecardDigestPostEmail(buildBundle(), buildSubscriber('en-US'));
    expect(result.html).toContain('We just published');
    expect(result.html).toContain('Read the full report');
    expect(result.html).toContain('Share on LinkedIn');
  });

  it('plaintext includes findings enumerated', () => {
    const bundle = buildBundle({
      preview_paragraph: '- a\n- b\n- c',
    });
    const result = renderScorecardDigestPostEmail(bundle, buildSubscriber());
    expect(result.text).toContain('1. a');
    expect(result.text).toContain('2. b');
    expect(result.text).toContain('3. c');
  });
});
