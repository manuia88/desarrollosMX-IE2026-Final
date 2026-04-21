import { describe, expect, it } from 'vitest';
import {
  periodLabelFromDigest,
  renderScorecardDigestPreviewEmail,
} from '../templates/scorecard-digest-preview';
import type { NewsletterLocale, ScorecardDigestBundle } from '../types';

function buildBundle(overrides: Partial<ScorecardDigestBundle> = {}): ScorecardDigestBundle {
  return {
    report_id: 'MX-2026-Q1',
    period_type: 'quarterly',
    period_date: '2026-01-01',
    preview_paragraph:
      'Roma Norte consolida liderazgo migratorio mientras Juárez sorprende con alpha emergente.',
    headline: '2026 Q1 Scorecard Nacional — Roma Norte lidera migración, Juárez sorpresa alpha',
    release_date: '2026-06-15',
    cta_url: 'https://desarrollosmx.com/es-MX/scorecard-nacional/MX-2026-Q1',
    ...overrides,
  };
}

function buildSubscriber(locale: NewsletterLocale = 'es-MX') {
  return {
    email: 'test@example.com',
    locale,
    unsubscribe_token_hash: 'hash-xyz',
  };
}

describe('periodLabelFromDigest', () => {
  it('labels Q1 correctly', () => {
    const bundle = buildBundle({ period_date: '2026-01-01' });
    expect(periodLabelFromDigest(bundle)).toBe('2026 Q1');
  });

  it('labels Q3 correctly', () => {
    const bundle = buildBundle({ period_date: '2026-07-01' });
    expect(periodLabelFromDigest(bundle)).toBe('2026 Q3');
  });
});

describe('renderScorecardDigestPreviewEmail', () => {
  it('renders HTML with doctype and essential content', () => {
    const result = renderScorecardDigestPreviewEmail(buildBundle(), buildSubscriber());
    expect(result.html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(result.html).toContain('En 2 meses publicamos');
    expect(result.html).toContain('Roma Norte');
    expect(result.html).toContain(
      'href="https://desarrollosmx.com/es-MX/scorecard-nacional/MX-2026-Q1"',
    );
    expect(result.html).toContain('Pre-regístrate para acceso early');
  });

  it('builds subject with quarter label and leading emoji marker', () => {
    const result = renderScorecardDigestPreviewEmail(buildBundle(), buildSubscriber());
    expect(result.subject).toContain('2026 Q1');
    expect(result.subject).toContain('2 meses');
  });

  it('includes plaintext fallback with headline and CTA url', () => {
    const result = renderScorecardDigestPreviewEmail(buildBundle(), buildSubscriber());
    expect(result.text).toContain('Roma Norte');
    expect(result.text).toContain('https://desarrollosmx.com/es-MX/scorecard-nacional/MX-2026-Q1');
    expect(result.text).not.toContain('<html');
  });

  it('localizes to pt-BR', () => {
    const result = renderScorecardDigestPreviewEmail(buildBundle(), buildSubscriber('pt-BR'));
    expect(result.html).toContain('Em 2 meses publicamos');
    expect(result.html).toContain('Pré-cadastre-se');
  });

  it('falls back to es-MX for unknown locale', () => {
    const result = renderScorecardDigestPreviewEmail(
      buildBundle(),
      buildSubscriber('xx-XX' as unknown as NewsletterLocale),
    );
    expect(result.html).toContain('En 2 meses publicamos');
  });

  it('emits lang attribute matching subscriber locale', () => {
    const result = renderScorecardDigestPreviewEmail(buildBundle(), buildSubscriber('en-US'));
    expect(result.html).toContain('lang="en-US"');
  });
});
